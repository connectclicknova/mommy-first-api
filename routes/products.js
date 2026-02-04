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
 * GET /products/filters
 * Get available filters for all products in the store
 * Returns filter options with counts for building filter UI
 * Requires Bearer token
 */
router.get("/filters", verifyToken, async (req, res) => {
  try {
    // Fetch all products using Admin API
    const allProductsRes = await adminAPI.get(`/products.json?limit=250`);
    const products = allProductsRes.data.products || [];

    console.log(`Analyzing ${products.length} products for filters`);

    // Build filter data
    const productTypes = {};
    const vendors = {};
    const tags = {};
    const variantOptions = {};
    let minPrice = Infinity;
    let maxPrice = 0;
    let availableCount = 0;
    let unavailableCount = 0;

    products.forEach(product => {
      // Product Type
      if (product.product_type) {
        productTypes[product.product_type] = (productTypes[product.product_type] || 0) + 1;
      }

      // Vendor
      if (product.vendor) {
        vendors[product.vendor] = (vendors[product.vendor] || 0) + 1;
      }

      // Tags
      if (product.tags) {
        const productTags = typeof product.tags === 'string' 
          ? product.tags.split(',').map(t => t.trim())
          : product.tags;
        
        productTags.forEach(tag => {
          if (tag) {
            tags[tag] = (tags[tag] || 0) + 1;
          }
        });
      }

      // Variant Options
      if (product.options && Array.isArray(product.options)) {
        product.options.forEach(option => {
          if (!variantOptions[option.name]) {
            variantOptions[option.name] = {};
          }
          if (option.values && Array.isArray(option.values)) {
            option.values.forEach(value => {
              variantOptions[option.name][value] = (variantOptions[option.name][value] || 0) + 1;
            });
          }
        });
      }

      // Price Range & Availability
      if (product.variants && Array.isArray(product.variants)) {
        const prices = product.variants.map(v => parseFloat(v.price)).filter(p => !isNaN(p));
        if (prices.length > 0) {
          const productMinPrice = Math.min(...prices);
          const productMaxPrice = Math.max(...prices);
          minPrice = Math.min(minPrice, productMinPrice);
          maxPrice = Math.max(maxPrice, productMaxPrice);
        }

        // Availability
        const totalInventory = product.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0);
        const allowsBackorder = product.variants.some(v => v.inventory_policy === 'continue');
        const isAvailable = totalInventory > 0 || allowsBackorder;
        
        if (isAvailable) {
          availableCount++;
        } else {
          unavailableCount++;
        }
      }
    });

    // Format response
    const filters = {
      availability: {
        type: "LIST",
        label: "Availability",
        values: [
          {
            label: "In Stock",
            value: true,
            count: availableCount,
            input: { available: true }
          },
          {
            label: "Out of Stock",
            value: false,
            count: unavailableCount,
            input: { available: false }
          }
        ]
      },
      price: {
        type: "PRICE_RANGE",
        label: "Price",
        min: minPrice === Infinity ? 0 : parseFloat(minPrice.toFixed(2)),
        max: parseFloat(maxPrice.toFixed(2)),
        currencyCode: "USD"
      },
      productType: {
        type: "LIST",
        label: "Product Type",
        values: Object.entries(productTypes)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => ({
            label: type,
            value: type,
            count: count,
            input: { productType: type }
          }))
      },
      vendor: {
        type: "LIST",
        label: "Vendor",
        values: Object.entries(vendors)
          .sort((a, b) => b[1] - a[1])
          .map(([vendor, count]) => ({
            label: vendor,
            value: vendor,
            count: count,
            input: { vendor: vendor }
          }))
      },
      tags: {
        type: "LIST",
        label: "Tags",
        values: Object.entries(tags)
          .sort((a, b) => b[1] - a[1])
          .map(([tag, count]) => ({
            label: tag,
            value: tag,
            count: count,
            input: { tags: [tag] }
          }))
      },
      variantOptions: Object.entries(variantOptions).map(([optionName, values]) => ({
        type: "LIST",
        label: optionName,
        name: optionName,
        values: Object.entries(values)
          .sort((a, b) => b[1] - a[1])
          .map(([value, count]) => ({
            label: value,
            value: value,
            count: count,
            input: { variantOption: { name: optionName, value: value } }
          }))
      }))
    };

    res.json({
      success: true,
      totalProducts: products.length,
      filters: filters,
    });
  } catch (error) {
    console.error("Error fetching product filters:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product filters",
      error: error.message,
    });
  }
});

/**
 * POST /products/filter
 * Filter all products in the store based on multiple criteria
 * Supports: price, productType, vendor, availability, tags, variantOption
 * Requires Bearer token
 * 
 * Request body examples:
 * {
 *   "filters": {
 *     "available": true,
 *     "minPrice": 25.0,
 *     "maxPrice": 100.0,
 *     "productType": "Maternity",
 *     "vendor": "Nike",
 *     "tags": ["summer", "sale"],
 *     "variantOption": { "name": "Size", "value": "M" }
 *   },
 *   "page": 1,
 *   "limit": 24,
 *   "sortBy": "price"
 * }
 */
router.post("/filter", verifyToken, async (req, res) => {
  try {
    const { filters = {}, page = 1, limit = 24, sortBy = "best_selling" } = req.body;

    // Fetch ALL products using Admin API
    const allProductsRes = await adminAPI.get(`/products.json?limit=250`);
    let products = allProductsRes.data.products || [];

    console.log(`Found ${products.length} total products before filtering`);
    console.log('Applying filters:', filters);

    // Apply filters manually
    let filteredProducts = products;

    // Filter by availability
    if (typeof filters.available === 'boolean') {
      filteredProducts = filteredProducts.filter(product => {
        if (!product.variants || !Array.isArray(product.variants)) return false;
        const totalInventory = product.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0);
        const allowsBackorder = product.variants.some(v => v.inventory_policy === 'continue');
        const isAvailable = totalInventory > 0 || allowsBackorder;
        return filters.available ? isAvailable : !isAvailable;
      });
      console.log(`After availability filter: ${filteredProducts.length} products`);
    }

    // Filter by price range
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      filteredProducts = filteredProducts.filter(product => {
        if (!product.variants || !Array.isArray(product.variants)) return false;
        const prices = product.variants.map(v => parseFloat(v.price)).filter(p => !isNaN(p));
        if (prices.length === 0) return false;
        
        const minProductPrice = Math.min(...prices);
        const maxProductPrice = Math.max(...prices);
        
        let matchesMin = true;
        let matchesMax = true;
        
        if (filters.minPrice !== undefined) {
          matchesMin = maxProductPrice >= parseFloat(filters.minPrice);
        }
        if (filters.maxPrice !== undefined) {
          matchesMax = minProductPrice <= parseFloat(filters.maxPrice);
        }
        
        return matchesMin && matchesMax;
      });
      console.log(`After price filter: ${filteredProducts.length} products`);
    }

    // Filter by product type (OR logic for multiple types)
    if (filters.productType) {
      const types = Array.isArray(filters.productType) ? filters.productType : [filters.productType];
      filteredProducts = filteredProducts.filter(product => 
        types.some(type => {
          if (!type || typeof type !== 'string') return false;
          return product.product_type && product.product_type.toLowerCase() === type.toLowerCase();
        })
      );
      console.log(`After product type filter: ${filteredProducts.length} products`);
    }

    // Filter by vendor (OR logic for multiple vendors)
    if (filters.vendor) {
      const vendors = Array.isArray(filters.vendor) ? filters.vendor : [filters.vendor];
      filteredProducts = filteredProducts.filter(product =>
        vendors.some(vendor => {
          if (!vendor || typeof vendor !== 'string') return false;
          return product.vendor && product.vendor.toLowerCase() === vendor.toLowerCase();
        })
      );
      console.log(`After vendor filter: ${filteredProducts.length} products`);
    }

    // Filter by tags (OR logic for multiple tags)
    if (filters.tag || filters.tags) {
      const tags = Array.isArray(filters.tag || filters.tags) 
        ? (filters.tag || filters.tags) 
        : [filters.tag || filters.tags];
      
      filteredProducts = filteredProducts.filter(product => {
        if (!product.tags) return false;
        const productTags = typeof product.tags === 'string' 
          ? product.tags.split(',').map(t => t.trim().toLowerCase())
          : (Array.isArray(product.tags) ? product.tags.filter(t => typeof t === 'string').map(t => t.toLowerCase()) : []);
        
        return tags.some(tag => {
          if (!tag || typeof tag !== 'string') return false;
          return productTags.includes(tag.toLowerCase());
        });
      });
      console.log(`After tags filter: ${filteredProducts.length} products`);
    }

    // Filter by variant option
    if (filters.variantOption) {
      const variantOptions = Array.isArray(filters.variantOption) ? filters.variantOption : [filters.variantOption];
      
      filteredProducts = filteredProducts.filter(product => {
        if (!product.variants || !Array.isArray(product.variants)) return false;
        if (!product.options || !Array.isArray(product.options)) return false;
        
        return product.variants.some(variant => {
          return variantOptions.some(optFilter => {
            const optionIndex = product.options.findIndex(opt => 
              opt.name.toLowerCase() === optFilter.name.toLowerCase()
            );
            
            if (optionIndex === -1) return false;
            
            const variantValue = variant[`option${optionIndex + 1}`];
            return variantValue && variantValue.toLowerCase() === optFilter.value.toLowerCase();
          });
        });
      });
      console.log(`After variant option filter: ${filteredProducts.length} products`);
    }

    // Sort products
    if (sortBy === 'price') {
      filteredProducts.sort((a, b) => {
        if (!a.variants || !a.variants.length) return 1;
        if (!b.variants || !b.variants.length) return -1;
        const priceA = Math.min(...a.variants.map(v => parseFloat(v.price || 0)));
        const priceB = Math.min(...b.variants.map(v => parseFloat(v.price || 0)));
        return priceA - priceB;
      });
    } else if (sortBy === 'title') {
      filteredProducts.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'created') {
      filteredProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'updated') {
      filteredProducts.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }

    // Pagination
    const totalProducts = filteredProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const offset = (page - 1) * limit;
    const paginatedProducts = filteredProducts.slice(offset, offset + limit);

    console.log(`Returning ${paginatedProducts.length} products (page ${page} of ${totalPages})`);

    // Fetch metafields for paginated products
    const metafieldPromises = paginatedProducts.map(p =>
      adminAPI.get(`/products/${p.id}/metafields.json?limit=250`).catch(() => ({ data: { metafields: [] } }))
    );
    const metafieldResponses = await Promise.all(metafieldPromises);
    const productMetafields = metafieldResponses.map(res => res.data.metafields || []);

    // Format products
    const formattedProducts = paginatedProducts.map((product, index) => {
      const variants = product.variants || [];
      const images = product.images || [];
      const options = product.options || [];
      
      const variantPrices = variants.map(v => parseFloat(v.price)).filter(p => !isNaN(p));
      const variantComparePrices = variants.map(v => parseFloat(v.compare_at_price)).filter(p => !isNaN(p) && p > 0);

      const minPrice = variantPrices.length > 0 ? Math.min(...variantPrices).toFixed(2) : "0.00";
      const maxPrice = variantPrices.length > 0 ? Math.max(...variantPrices).toFixed(2) : "0.00";
      const minComparePrice = variantComparePrices.length > 0 ? Math.min(...variantComparePrices).toFixed(2) : minPrice;
      const maxComparePrice = variantComparePrices.length > 0 ? Math.max(...variantComparePrices).toFixed(2) : maxPrice;

      const totalInventory = variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0);
      const allowsBackorder = variants.some(v => v.inventory_policy === 'continue');
      const isInStock = totalInventory > 0 || allowsBackorder;

      return {
        id: `gid://shopify/Product/${product.id}`,
        legacyResourceId: product.id,
        title: product.title,
        handle: product.handle,
        description: product.body_html ? product.body_html.replace(/<[^>]*>/g, '') : null,
        descriptionHtml: product.body_html,
        productType: product.product_type,
        vendor: product.vendor,
        tags: product.tags ? (typeof product.tags === 'string' ? product.tags.split(', ') : product.tags) : [],
        availableForSale: isInStock,
        totalInventory: totalInventory,
        priceRange: {
          minVariantPrice: { amount: minPrice, currencyCode: "USD" },
          maxVariantPrice: { amount: maxPrice, currencyCode: "USD" },
        },
        compareAtPriceRange: {
          minVariantPrice: { amount: minComparePrice, currencyCode: "USD" },
          maxVariantPrice: { amount: maxComparePrice, currencyCode: "USD" },
        },
        images: images.map(img => ({
          id: img.id,
          url: img.src,
          altText: img.alt,
          width: img.width,
          height: img.height,
        })),
        variants: variants.map(variant => ({
          id: `gid://shopify/ProductVariant/${variant.id}`,
          legacyResourceId: variant.id,
          title: variant.title,
          sku: variant.sku,
          availableForSale: (variant.inventory_quantity > 0 || variant.inventory_policy === 'continue'),
          price: { amount: parseFloat(variant.price || 0).toFixed(2), currencyCode: "USD" },
          compareAtPrice: variant.compare_at_price ? { 
            amount: parseFloat(variant.compare_at_price).toFixed(2), 
            currencyCode: "USD" 
          } : null,
          selectedOptions: [
            variant.option1 ? { name: options[0]?.name || "Option 1", value: variant.option1 } : null,
            variant.option2 ? { name: options[1]?.name || "Option 2", value: variant.option2 } : null,
            variant.option3 ? { name: options[2]?.name || "Option 3", value: variant.option3 } : null,
          ].filter(Boolean),
        })),
        metafields: productMetafields[index].map(mf => ({
          id: mf.id,
          namespace: mf.namespace,
          key: mf.key,
          value: mf.value || '',
          type: mf.type || mf.value_type,
        })),
      };
    });

    res.json({
      success: true,
      filters: {
        applied: filters,
      },
      pageInfo: {
        currentPage: page,
        totalPages: totalPages,
        productsPerPage: limit,
        totalProducts: totalProducts,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      data: formattedProducts,
    });
  } catch (error) {
    console.error("Error filtering products:", error.message);
    if (error.response?.data) {
      console.error("API errors:", JSON.stringify(error.response.data, null, 2));
    }
    res.status(500).json({
      success: false,
      message: "Failed to filter products",
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
