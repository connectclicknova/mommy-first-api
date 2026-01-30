const express = require("express");
const router = express.Router();
const axios = require("axios");
const verifyToken = require("../middleware/auth");

// Admin API instance
const adminAPI = axios.create({
  baseURL: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01`,
  headers: {
    "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    "Content-Type": "application/json",
  },
});

/**
 * GET /collections
 * Fetch list of all collections using Admin API
 * Requires Bearer token
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    // Fetch both smart and custom collections
    const [customCollectionsRes, smartCollectionsRes] = await Promise.all([
      adminAPI.get(`/custom_collections.json?limit=${limit}`),
      adminAPI.get(`/smart_collections.json?limit=${limit}`),
    ]);

    const customCollections = customCollectionsRes.data.custom_collections || [];
    const smartCollections = smartCollectionsRes.data.smart_collections || [];

    // Combine and format collections
    const allCollections = [
      ...customCollections.map(col => ({
        id: `gid://shopify/Collection/${col.id}`,
        legacyResourceId: col.id,
        title: col.title,
        handle: col.handle,
        description: col.body_html ? col.body_html.replace(/<[^>]*>/g, '') : null,
        descriptionHtml: col.body_html,
        updatedAt: col.updated_at,
        image: col.image ? {
          id: col.image.id,
          url: col.image.src,
          altText: col.image.alt,
          width: col.image.width,
          height: col.image.height,
        } : null,
        type: 'custom',
      })),
      ...smartCollections.map(col => ({
        id: `gid://shopify/Collection/${col.id}`,
        legacyResourceId: col.id,
        title: col.title,
        handle: col.handle,
        description: col.body_html ? col.body_html.replace(/<[^>]*>/g, '') : null,
        descriptionHtml: col.body_html,
        updatedAt: col.updated_at,
        image: col.image ? {
          id: col.image.id,
          url: col.image.src,
          altText: col.image.alt,
          width: col.image.width,
          height: col.image.height,
        } : null,
        type: 'smart',
      })),
    ];

    res.json({
      success: true,
      totalCollections: allCollections.length,
      data: allCollections,
    });
  } catch (error) {
    console.error("Error fetching collections:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch collections",
      error: error.message,
    });
  }
});

/**
 * GET /collections/:collectionHandle
 * Fetch products from a specific collection with full details using Admin API
 * Requires Bearer token
 */
router.get("/:collectionHandle", verifyToken, async (req, res) => {
  try {
    const { collectionHandle } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // First, find the collection by handle
    let collection = null;
    let collectionId = null;
    let collectionType = null;

    try {
      // Try custom collections first
      const customRes = await adminAPI.get(`/custom_collections.json?handle=${collectionHandle}`);
      if (customRes.data.custom_collections && customRes.data.custom_collections.length > 0) {
        collection = customRes.data.custom_collections[0];
        collectionId = collection.id;
        collectionType = 'custom';
      }
    } catch (err) {
      // Ignore error and try smart collections
    }

    if (!collection) {
      try {
        // Try smart collections
        const smartRes = await adminAPI.get(`/smart_collections.json?handle=${collectionHandle}`);
        if (smartRes.data.smart_collections && smartRes.data.smart_collections.length > 0) {
          collection = smartRes.data.smart_collections[0];
          collectionId = collection.id;
          collectionType = 'smart';
        }
      } catch (err) {
        // Collection not found
      }
    }

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    // Fetch products in the collection
    const productsRes = await adminAPI.get(`/collections/${collectionId}/products.json?limit=${limit}`);
    const products = productsRes.data.products || [];

    // Format products with full details
    const formattedProducts = products.map(product => ({
      id: `gid://shopify/Product/${product.id}`,
      legacyResourceId: product.id,
      title: product.title,
      handle: product.handle,
      description: product.body_html ? product.body_html.replace(/<[^>]*>/g, '') : null,
      descriptionHtml: product.body_html,
      productType: product.product_type,
      vendor: product.vendor,
      tags: product.tags ? product.tags.split(', ') : [],
      createdAt: product.created_at,
      updatedAt: product.updated_at,
      publishedAt: product.published_at,
      status: product.status,
      availableForSale: product.status === 'active',
      priceRange: {
        minVariantPrice: {
          amount: product.variants && product.variants.length > 0 
            ? Math.min(...product.variants.map(v => parseFloat(v.price))).toFixed(2)
            : "0.00",
          currencyCode: "USD",
        },
        maxVariantPrice: {
          amount: product.variants && product.variants.length > 0
            ? Math.max(...product.variants.map(v => parseFloat(v.price))).toFixed(2)
            : "0.00",
          currencyCode: "USD",
        },
      },
      compareAtPriceRange: {
        minVariantPrice: {
          amount: product.variants && product.variants.length > 0
            ? Math.min(...product.variants.map(v => parseFloat(v.compare_at_price || v.price))).toFixed(2)
            : "0.00",
          currencyCode: "USD",
        },
        maxVariantPrice: {
          amount: product.variants && product.variants.length > 0
            ? Math.max(...product.variants.map(v => parseFloat(v.compare_at_price || v.price))).toFixed(2)
            : "0.00",
          currencyCode: "USD",
        },
      },
      images: product.images ? product.images.map(img => ({
        id: img.id,
        url: img.src,
        altText: img.alt,
        width: img.width,
        height: img.height,
      })) : [],
      variants: product.variants ? product.variants.map(variant => ({
        id: `gid://shopify/ProductVariant/${variant.id}`,
        legacyResourceId: variant.id,
        title: variant.title,
        sku: variant.sku,
        availableForSale: variant.inventory_quantity > 0 || variant.inventory_policy === 'continue',
        requiresShipping: variant.requires_shipping,
        weight: variant.weight,
        weightUnit: variant.weight_unit,
        inventoryQuantity: variant.inventory_quantity,
        price: {
          amount: variant.price,
          currencyCode: "USD",
        },
        compareAtPrice: variant.compare_at_price ? {
          amount: variant.compare_at_price,
          currencyCode: "USD",
        } : null,
        selectedOptions: variant.option1 || variant.option2 || variant.option3 ? [
          variant.option1 ? { name: product.options[0]?.name || "Option 1", value: variant.option1 } : null,
          variant.option2 ? { name: product.options[1]?.name || "Option 2", value: variant.option2 } : null,
          variant.option3 ? { name: product.options[2]?.name || "Option 3", value: variant.option3 } : null,
        ].filter(Boolean) : [],
        image: variant.image_id && product.images ? {
          id: variant.image_id,
          url: product.images.find(img => img.id === variant.image_id)?.src,
          altText: product.images.find(img => img.id === variant.image_id)?.alt,
        } : null,
      })) : [],
      options: product.options ? product.options.map(opt => ({
        id: opt.id,
        name: opt.name,
        values: opt.values,
      })) : [],
      metafields: null,
      seo: {
        title: product.title,
        description: product.body_html ? product.body_html.replace(/<[^>]*>/g, '').substring(0, 160) : null,
      },
    }));

    res.json({
      success: true,
      collection: {
        id: `gid://shopify/Collection/${collection.id}`,
        legacyResourceId: collection.id,
        title: collection.title,
        handle: collection.handle,
        description: collection.body_html ? collection.body_html.replace(/<[^>]*>/g, '') : null,
        descriptionHtml: collection.body_html,
        updatedAt: collection.updated_at,
        image: collection.image ? {
          id: collection.image.id,
          url: collection.image.src,
          altText: collection.image.alt,
          width: collection.image.width,
          height: collection.image.height,
        } : null,
        type: collectionType,
        seo: {
          title: collection.title,
          description: collection.body_html ? collection.body_html.replace(/<[^>]*>/g, '').substring(0, 160) : null,
        },
      },
      totalProducts: formattedProducts.length,
      data: formattedProducts,
    });
  } catch (error) {
    console.error("Error fetching collection details:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch collection details",
      error: error.message,
    });
  }
});

module.exports = router;
