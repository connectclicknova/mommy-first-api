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
 * GET /search/:query
 * Search for products by query string in title, description, tags, SKU, product type
 * Requires Bearer token
 */
router.get("/:query", verifyToken, async (req, res) => {
  try {
    const { query } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    console.log(`Searching for: "${query}"`);

    // Search products using Admin API
    // The query parameter searches in title, product_type, vendor, tag, and variants (sku, barcode)
    const searchResponse = await adminAPI.get(`/products.json`, {
      params: {
        limit: limit,
        // Shopify Admin API supports basic search - it searches in title, vendor, product_type, and variant SKUs
        title: query, // This will search in product title
      }
    });

    let products = searchResponse.data.products || [];

    // Additional filtering: search in description and other fields
    const searchTerm = query.toLowerCase();
    products = products.filter(product => {
      const title = (product.title || "").toLowerCase();
      const description = (product.body_html || "").replace(/<[^>]*>/g, '').toLowerCase();
      const productType = (product.product_type || "").toLowerCase();
      const vendor = (product.vendor || "").toLowerCase();
      const tags = (product.tags || "").toLowerCase();
      const productId = String(product.id);
      
      // Search in SKUs
      const skuMatch = product.variants && product.variants.some(v => 
        (v.sku || "").toLowerCase().includes(searchTerm)
      );

      return title.includes(searchTerm) ||
             description.includes(searchTerm) ||
             productType.includes(searchTerm) ||
             vendor.includes(searchTerm) ||
             tags.includes(searchTerm) ||
             productId.includes(searchTerm) ||
             skuMatch;
    });

    console.log(`Found ${products.length} matching products`);

    // Format products with full details
    const formattedProducts = products.map(product => {
      // Calculate prices properly
      const variantPrices = product.variants && product.variants.length > 0
        ? product.variants.map(v => parseFloat(v.price)).filter(p => !isNaN(p) && p >= 0)
        : [];
      
      const variantCompareAtPrices = product.variants && product.variants.length > 0
        ? product.variants.map(v => {
            const parsed = parseFloat(v.compare_at_price);
            return isNaN(parsed) ? 0 : parsed;
          }).filter(p => p > 0)
        : [];

      const minPrice = variantPrices.length > 0 ? Math.min(...variantPrices).toFixed(2) : "0.00";
      const maxPrice = variantPrices.length > 0 ? Math.max(...variantPrices).toFixed(2) : "0.00";
      const minComparePrice = variantCompareAtPrices.length > 0 ? Math.min(...variantCompareAtPrices).toFixed(2) : minPrice;
      const maxComparePrice = variantCompareAtPrices.length > 0 ? Math.max(...variantCompareAtPrices).toFixed(2) : maxPrice;

      // Calculate total inventory
      const totalInventory = product.variants && product.variants.length > 0
        ? product.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0)
        : 0;

      const allowsBackorder = product.variants && product.variants.length > 0
        ? product.variants.some(v => v.inventory_policy === 'continue')
        : false;

      const isInStock = totalInventory > 0 || allowsBackorder;
      const stockStatus = isInStock 
        ? (totalInventory > 0 ? 'in_stock' : 'orderable') 
        : 'out_of_stock';

      return {
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
        availableForSale: isInStock,
        stockStatus: stockStatus,
        totalInventory: totalInventory,
        priceRange: {
          minVariantPrice: {
            amount: minPrice,
            currencyCode: "USD",
          },
          maxVariantPrice: {
            amount: maxPrice,
            currencyCode: "USD",
          },
        },
        compareAtPriceRange: {
          minVariantPrice: {
            amount: minComparePrice,
            currencyCode: "USD",
          },
          maxVariantPrice: {
            amount: maxComparePrice,
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
        variants: product.variants ? product.variants.map(variant => {
          const variantInventory = variant.inventory_quantity || 0;
          const variantAllowsBackorder = variant.inventory_policy === 'continue';
          const variantInStock = variantInventory > 0 || variantAllowsBackorder;
          const variantStockStatus = variantInStock
            ? (variantInventory > 0 ? 'in_stock' : 'orderable')
            : 'out_of_stock';

          return {
            id: `gid://shopify/ProductVariant/${variant.id}`,
            legacyResourceId: variant.id,
            title: variant.title,
            sku: variant.sku,
            availableForSale: variantInStock,
            stockStatus: variantStockStatus,
            requiresShipping: variant.requires_shipping,
            weight: variant.weight,
            weightUnit: variant.weight_unit,
            inventoryQuantity: variantInventory,
            inventoryPolicy: variant.inventory_policy,
            price: {
              amount: parseFloat(variant.price || 0).toFixed(2),
              currencyCode: "USD",
            },
            compareAtPrice: variant.compare_at_price ? {
              amount: parseFloat(variant.compare_at_price).toFixed(2),
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
          };
        }) : [],
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
      };
    });

    res.json({
      success: true,
      query: query,
      totalResults: formattedProducts.length,
      data: formattedProducts,
    });
  } catch (error) {
    console.error("Error searching products:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to search products",
      error: error.message,
    });
  }
});

module.exports = router;
