const express = require("express");
const router = express.Router();
const storefrontAPI = require("../config/shopify");
const verifyToken = require("../middleware/auth");
const axios = require("axios");

// Admin API instance for fetching metafields
const adminAPI = axios.create({
  baseURL: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01`,
  headers: {
    "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    "Content-Type": "application/json",
  },
});

// Product fragment with all fields including metafields
const PRODUCT_FRAGMENT = `
  id
  title
  handle
  description
  descriptionHtml
  productType
  vendor
  tags
  createdAt
  updatedAt
  publishedAt
  availableForSale
  onlineStoreUrl
  priceRange {
    minVariantPrice {
      amount
      currencyCode
    }
    maxVariantPrice {
      amount
      currencyCode
    }
  }
  compareAtPriceRange {
    minVariantPrice {
      amount
      currencyCode
    }
    maxVariantPrice {
      amount
      currencyCode
    }
  }
  images(first: 10) {
    edges {
      node {
        id
        url
        altText
        width
        height
      }
    }
  }
  variants(first: 50) {
    edges {
      node {
        id
        title
        sku
        availableForSale
        requiresShipping
        weight
        weightUnit
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        image {
          id
          url
          altText
        }
      }
    }
  }
  options {
    id
    name
    values
  }
  seo {
    title
    description
  }
`;

/**
 * GET /products/:handle
 * Fetch details of a single product by handle
 * Requires Bearer token
 */
router.get("/:handle", verifyToken, async (req, res) => {
  try {
    const { handle } = req.params;

    const query = `
      query getProductByHandle($handle: String!) {
        product(handle: $handle) {
          ${PRODUCT_FRAGMENT}
        }
      }
    `;

    const variables = { handle };
    const response = await storefrontAPI.post("", { query, variables });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const product = response.data.data.product;

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const productId = product.id.split('/').pop();

    // Fetch metafields and inventory data using Admin API in parallel
    let metafields = [];
    let inventoryData = {};
    let totalAvailableQuantity = 0;

    try {
      const [metafieldsResponse, productAdminResponse] = await Promise.all([
        adminAPI.get(`/products/${productId}/metafields.json?limit=250`),
        adminAPI.get(`/products/${productId}.json`)
      ]);

      metafields = metafieldsResponse.data.metafields || [];
      
      // Get variant inventory info from Admin API
      const adminVariants = productAdminResponse.data.product?.variants || [];
      const inventoryItemIds = adminVariants.map(v => v.inventory_item_id).filter(Boolean);
      
      if (inventoryItemIds.length > 0) {
        // Fetch inventory levels for all inventory items
        const inventoryResponse = await adminAPI.get(`/inventory_levels.json?inventory_item_ids=${inventoryItemIds.join(',')}`);
        const inventoryLevels = inventoryResponse.data.inventory_levels || [];
        
        // Map inventory item id to total available quantity across all locations
        adminVariants.forEach(variant => {
          const variantInventory = inventoryLevels
            .filter(il => il.inventory_item_id === variant.inventory_item_id)
            .reduce((sum, il) => sum + (il.available || 0), 0);
          inventoryData[variant.id] = variantInventory;
          totalAvailableQuantity += variantInventory;
        });
      }
    } catch (metaError) {
      console.error(`Error fetching metafields/inventory:`, metaError.message);
    }

    // Process metafields and fetch bought_together product if exists
    const processedMetafields = [];
    for (const mf of metafields) {
      const metafieldEntry = {
        id: mf.id,
        namespace: mf.namespace,
        key: mf.key,
        value: mf.value || '',
        type: mf.type || mf.value_type,
        description: mf.description || null,
      };

      // If this is the bought_together product reference, fetch product details and metafields
      if (mf.key === 'bought_together' && mf.type === 'product_reference' && mf.value) {
        try {
          const boughtTogetherProductId = mf.value.split('/').pop();
          
          // Fetch product details and metafields in parallel
          const [boughtTogetherResponse, boughtTogetherMetafieldsResponse] = await Promise.all([
            adminAPI.get(`/products/${boughtTogetherProductId}.json?fields=id,title,handle,images,variants`),
            adminAPI.get(`/products/${boughtTogetherProductId}/metafields.json?limit=250`)
          ]);
          
          const boughtProduct = boughtTogetherResponse.data.product;
          const boughtProductMetafields = boughtTogetherMetafieldsResponse.data.metafields || [];
          
          if (boughtProduct) {
            metafieldEntry.productDetails = {
              id: mf.value,
              title: boughtProduct.title,
              handle: boughtProduct.handle,
              variantId: boughtProduct.variants?.[0] ? `gid://shopify/ProductVariant/${boughtProduct.variants[0].id}` : null,
              image: boughtProduct.images?.[0] ? {
                id: boughtProduct.images[0].id,
                url: boughtProduct.images[0].src,
                altText: boughtProduct.images[0].alt || null,
              } : null,
              price: boughtProduct.variants?.[0] ? {
                amount: boughtProduct.variants[0].price,
                currencyCode: "USD",
                compareAtPrice: boughtProduct.variants[0].compare_at_price || null,
              } : null,
              metafields: boughtProductMetafields.map(bmf => ({
                id: bmf.id,
                namespace: bmf.namespace,
                key: bmf.key,
                value: bmf.value || '',
                type: bmf.type || bmf.value_type,
                description: bmf.description || null,
              })),
            };
          }
        } catch (boughtError) {
          console.error(`Error fetching bought_together product:`, boughtError.message);
        }
      }

      processedMetafields.push(metafieldEntry);
    }

    // Transform variants with inventory quantity
    const transformedVariants = product.variants.edges.map(v => {
      const variant = v.node;
      const variantNumericId = parseInt(variant.id.split('/').pop());
      return {
        ...variant,
        availableQuantity: inventoryData[variantNumericId] || 0,
      };
    });

    // Transform product data with metafields and inventory
    const productData = {
      ...product,
      totalAvailableQuantity,
      metafields: processedMetafields,
      images: product.images.edges.map(img => img.node),
      variants: transformedVariants,
    };

    res.json({
      success: true,
      data: productData,
    });
  } catch (error) {
    console.error("Error fetching product details:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product details",
      error: error.message,
    });
  }
});

module.exports = router;
