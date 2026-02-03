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
 * GET /products or /products/pg-1, /products/pg-2, etc.
 * Fetch paginated list of products (24 per page)
 * Requires Bearer token
 */
router.get(["/", "/pg-:page"], verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.params.page) || 1;
    const perPage = 24;

    // Calculate cursor position for pagination
    // Note: GraphQL uses cursor-based pagination, not offset
    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              ${PRODUCT_FRAGMENT}
            }
          }
        }
      }
    `;

    // For simplicity, we'll fetch all and slice
    // In production, you'd want to implement proper cursor-based pagination
    const variables = {
      first: page * perPage,
    };

    const response = await storefrontAPI.post("", { query, variables });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const allProducts = response.data.data.products.edges;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedProducts = allProducts.slice(startIndex, endIndex);

    // Fetch metafields for each product using Admin API
    const metafieldPromises = paginatedProducts.map(edge => {
      const productId = edge.node.id.split('/').pop();
      return adminAPI.get(`/products/${productId}/metafields.json?limit=250`)
        .then(res => res.data.metafields || [])
        .catch(err => []);
    });
    
    const allMetafields = await Promise.all(metafieldPromises);

    // Transform products to include metafields
    const products = paginatedProducts.map((edge, index) => {
      const product = edge.node;
      const metafields = allMetafields[index] || [];
      
      return {
        ...product,
        metafields: metafields.length > 0 ? metafields.map(mf => ({
          id: mf.id,
          namespace: mf.namespace,
          key: mf.key,
          value: mf.value || '',
          type: mf.type || mf.value_type,
          description: mf.description || null,
        })) : [],
        images: product.images.edges.map(img => img.node),
        variants: product.variants.edges.map(v => v.node),
      };
    });

    res.json({
      success: true,
      page: page,
      perPage: perPage,
      totalProducts: allProducts.length,
      hasNextPage: endIndex < allProducts.length,
      hasPreviousPage: page > 1,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
});

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

    // Fetch metafields using Admin API
    let metafields = [];
    try {
      const productId = product.id.split('/').pop();
      const metafieldsResponse = await adminAPI.get(`/products/${productId}/metafields.json?limit=250`);
      metafields = metafieldsResponse.data.metafields || [];
    } catch (metaError) {
      console.error(`Error fetching metafields:`, metaError.message);
    }

    // Transform product data with metafields
    const productData = {
      ...product,
      metafields: metafields.length > 0 ? metafields.map(mf => ({
        id: mf.id,
        namespace: mf.namespace,
        key: mf.key,
        value: mf.value || '',
        type: mf.type || mf.value_type,
        description: mf.description || null,
      })) : [],
      images: product.images.edges.map(img => img.node),
      variants: product.variants.edges.map(v => v.node),
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
