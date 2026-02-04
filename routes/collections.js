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

    // Fetch metafields for all collections
    const allCollectionIds = [
      ...customCollections.map(c => c.id),
      ...smartCollections.map(c => c.id)
    ];

    const collectionMetafieldPromises = allCollectionIds.map(id =>
      adminAPI.get(`/collections/${id}/metafields.json?limit=250`)
        .then(res => res.data.metafields || [])
        .catch(err => [])
    );

    const allCollectionMetafields = await Promise.all(collectionMetafieldPromises);

    // Combine and format collections
    const allCollections = [
      ...customCollections.map((col, index) => ({
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
        metafields: allCollectionMetafields[index].length > 0 
          ? allCollectionMetafields[index].map(mf => ({
              id: mf.id,
              namespace: mf.namespace,
              key: mf.key,
              value: mf.value || '',
              type: mf.type || mf.value_type,
              description: mf.description || null,
            }))
          : [],
        type: 'custom',
      })),
      ...smartCollections.map((col, index) => {
        const metafieldIndex = customCollections.length + index;
        return {
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
          metafields: allCollectionMetafields[metafieldIndex].length > 0
            ? allCollectionMetafields[metafieldIndex].map(mf => ({
                id: mf.id,
                namespace: mf.namespace,
                key: mf.key,
                value: mf.value || '',
                type: mf.type || mf.value_type,
                description: mf.description || null,
              }))
            : [],
          type: 'smart',
        };
      }),
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
 * GET /collections/:collectionHandle or /collections/:collectionHandle/pg-:page
 * Fetch products from a specific collection with full details using Admin API
 * Supports pagination with 24 products per page
 * Requires Bearer token
 */
router.get("/:collectionHandle/pg-:page", verifyToken, async (req, res) => {
  req.params.pageNumber = req.params.page;
  return handleCollectionRequest(req, res);
});

router.get("/:collectionHandle", verifyToken, async (req, res) => {
  req.params.pageNumber = "1"; // Default to page 1
  return handleCollectionRequest(req, res);
});

async function handleCollectionRequest(req, res) {
  try {
    const { collectionHandle, pageNumber } = req.params;
    const page = parseInt(pageNumber) || 1;
    const productsPerPage = 24;
    const offset = (page - 1) * productsPerPage;

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

    // Fetch ALL products in the collection first (to get total count)
    const allProductsRes = await adminAPI.get(`/collections/${collectionId}/products.json?limit=250`);
    const allProductIds = allProductsRes.data.products || [];

    console.log(`Found ${allProductIds.length} total products in collection`);

    // Calculate pagination
    const totalProducts = allProductIds.length;
    const totalPages = Math.ceil(totalProducts / productsPerPage);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Slice the products for current page
    const productIds = allProductIds.slice(offset, offset + productsPerPage);

    console.log(`Returning products ${offset + 1} to ${offset + productIds.length} (page ${page} of ${totalPages})`);

    // Fetch full product details with variants for each product
    const productDetailsPromises = productIds.map(p => 
      adminAPI.get(`/products/${p.id}.json`)
    );
    
    const productDetailsResponses = await Promise.all(productDetailsPromises);
    const products = productDetailsResponses.map(res => res.data.product);

    // Fetch metafields for each product (to get bundle components)
    const metafieldPromises = products.map(p =>
      adminAPI.get(`/products/${p.id}/metafields.json?limit=250`).catch(err => ({ data: { metafields: [] } }))
    );
    
    const metafieldResponses = await Promise.all(metafieldPromises);
    const productMetafields = metafieldResponses.map(res => res.data.metafields || []);

    // Format products with full details
    const formattedProducts = await Promise.all(products.map(async (product, index) => {
      // Get metafields for this product
      const metafields = productMetafields[index] || [];
      
      // Find bundle components using GraphQL
      let bundleComponents = null;
      
      // Try to fetch bundle components using Shopify's native bundle structure
      try {
        const storefrontAPI = require("../config/shopify");
        const bundleQuery = `
          query getProductBundle($id: ID!) {
            product(id: $id) {
              id
              title
              hasVariantsThatRequiresComponents
              bundleComponents {
                product {
                  id
                  title
                  handle
                  description
                  productType
                  vendor
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
                  images(first: 5) {
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
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        title
                        price {
                          amount
                          currencyCode
                        }
                        availableForSale
                        sku
                      }
                    }
                  }
                }
                quantity
              }
            }
          }
        `;
        
        const bundleRes = await storefrontAPI.post("", {
          query: bundleQuery,
          variables: { id: `gid://shopify/Product/${product.id}` }
        });
        
        console.log(`Shopify bundle query result for ${product.title}:`, JSON.stringify(bundleRes.data, null, 2));
        
        if (bundleRes.data?.data?.product?.bundleComponents) {
          const components = bundleRes.data.data.product.bundleComponents;
          
          bundleComponents = components.map(component => ({
            id: component.product.id,
            legacyResourceId: component.product.id.split('/').pop(),
            title: component.product.title,
            handle: component.product.handle,
            description: component.product.description,
            productType: component.product.productType,
            vendor: component.product.vendor,
            quantity: component.quantity,
            priceRange: component.product.priceRange,
            images: component.product.images.edges.map(edge => edge.node),
            variants: component.product.variants.edges.map(edge => edge.node),
          }));
          
          console.log(`Found ${bundleComponents.length} bundle components via GraphQL`);
        }
      } catch (err) {
        console.error(`Error fetching bundle components via GraphQL:`, err.message);
      }
      
      console.log(`Final bundle components for ${product.title}:`, bundleComponents);
      
      // Calculate prices properly, handling null values
      const variantPrices = product.variants && product.variants.length > 0
        ? product.variants.map(v => {
            console.log(`Variant price raw: "${v.price}", type: ${typeof v.price}`);
            const parsed = parseFloat(v.price);
            console.log(`Parsed price: ${parsed}`);
            return parsed;
          }).filter(p => !isNaN(p) && p >= 0)
        : [];
      
      const variantCompareAtPrices = product.variants && product.variants.length > 0
        ? product.variants.map(v => {
            const parsed = parseFloat(v.compare_at_price);
            return isNaN(parsed) ? 0 : parsed;
          }).filter(p => p > 0)
        : [];

      console.log(`Variant prices array:`, variantPrices);
      console.log(`Variant compare prices array:`, variantCompareAtPrices);

      const minPrice = variantPrices.length > 0 ? Math.min(...variantPrices).toFixed(2) : "0.00";
      const maxPrice = variantPrices.length > 0 ? Math.max(...variantPrices).toFixed(2) : "0.00";
      const minComparePrice = variantCompareAtPrices.length > 0 ? Math.min(...variantCompareAtPrices).toFixed(2) : minPrice;
      const maxComparePrice = variantCompareAtPrices.length > 0 ? Math.max(...variantCompareAtPrices).toFixed(2) : maxPrice;

      console.log(`Calculated prices - min: ${minPrice}, max: ${maxPrice}`);

      // Calculate total inventory
      const totalInventory = product.variants && product.variants.length > 0
        ? product.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0)
        : 0;

      // Check if any variant allows continue selling when out of stock
      const allowsBackorder = product.variants && product.variants.length > 0
        ? product.variants.some(v => v.inventory_policy === 'continue')
        : false;

      // Determine stock status
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
        bundleComponents: bundleComponents,
        metafields: metafields.length > 0 ? metafields.map(mf => ({
          id: mf.id,
          namespace: mf.namespace,
          key: mf.key,
          value: mf.value || '',
          type: mf.type || mf.value_type,
          description: mf.description || null,
        })) : [],
        seo: {
          title: product.title,
          description: product.body_html ? product.body_html.replace(/<[^>]*>/g, '').substring(0, 160) : null,
        },
      };
    }));

    // Fetch metafields for the collection itself
    let collectionMetafields = [];
    try {
      const collectionMetafieldsRes = await adminAPI.get(`/collections/${collectionId}/metafields.json?limit=250`);
      collectionMetafields = collectionMetafieldsRes.data.metafields || [];
    } catch (metaError) {
      console.error(`Error fetching collection metafields:`, metaError.message);
    }

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
        metafields: collectionMetafields.length > 0 
          ? collectionMetafields.map(mf => ({
              id: mf.id,
              namespace: mf.namespace,
              key: mf.key,
              value: mf.value || '',
              type: mf.type || mf.value_type,
              description: mf.description || null,
            }))
          : [],
        type: collectionType,
        seo: {
          title: collection.title,
          description: collection.body_html ? collection.body_html.replace(/<[^>]*>/g, '').substring(0, 160) : null,
        },
      },
      pageInfo: {
        currentPage: page,
        totalPages: totalPages,
        productsPerPage: productsPerPage,
        totalProducts: totalProducts,
        hasNextPage: hasNextPage,
        hasPreviousPage: hasPreviousPage,
        startCursor: offset + 1,
        endCursor: offset + formattedProducts.length,
      },
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
}

/**
 * GET /collections/:collectionHandle/filters
 * Get available filters for products in a collection
 * Returns filter options with counts for building filter UI
 * Requires Bearer token
 */
router.get("/:collectionHandle/filters", verifyToken, async (req, res) => {
  try {
    const { collectionHandle } = req.params;
    const storefrontAPI = require("../config/shopify");

    const filtersQuery = `
      query getCollectionFilters($handle: String!) {
        collection(handle: $handle) {
          handle
          title
          products(first: 250) {
            filters {
              id
              label
              type
              values {
                id
                label
                count
                input
              }
            }
          }
        }
      }
    `;

    const response = await storefrontAPI.post("", {
      query: filtersQuery,
      variables: { handle: collectionHandle }
    });

    if (!response.data?.data?.collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    res.json({
      success: true,
      collection: {
        handle: response.data.data.collection.handle,
        title: response.data.data.collection.title,
      },
      filters: response.data.data.collection.products.filters || [],
    });
  } catch (error) {
    console.error("Error fetching collection filters:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch collection filters",
      error: error.message,
    });
  }
});

/**
 * POST /collections/:collectionHandle/filter
 * Filter products in a collection based on multiple criteria using Admin API
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
 *   "sortBy": "price" // Options: "price", "title", "created", "updated", "best_selling"
 * }
 */
router.post("/:collectionHandle/filter", verifyToken, async (req, res) => {
  try {
    const { collectionHandle } = req.params;
    const { filters = {}, page = 1, limit = 24, sortBy = "best_selling" } = req.body;

    // First, find the collection by handle using Admin API
    let collection = null;
    let collectionId = null;
    let collectionType = null;

    try {
      const customRes = await adminAPI.get(`/custom_collections.json?handle=${collectionHandle}`);
      if (customRes.data.custom_collections && customRes.data.custom_collections.length > 0) {
        collection = customRes.data.custom_collections[0];
        collectionId = collection.id;
        collectionType = 'custom';
      }
    } catch (err) {
      console.log('Not a custom collection, trying smart collection...');
    }

    if (!collection) {
      try {
        const smartRes = await adminAPI.get(`/smart_collections.json?handle=${collectionHandle}`);
        if (smartRes.data.smart_collections && smartRes.data.smart_collections.length > 0) {
          collection = smartRes.data.smart_collections[0];
          collectionId = collection.id;
          collectionType = 'smart';
        }
      } catch (err) {
        console.log('Collection not found in smart collections either');
      }
    }

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: `Collection '${collectionHandle}' not found`,
      });
    }

    // Fetch ALL products in the collection
    const allProductsRes = await adminAPI.get(`/collections/${collectionId}/products.json?limit=250`);
    let products = allProductsRes.data.products || [];

    console.log(`Found ${products.length} products in collection before filtering`);
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
        types.some(type => product.product_type && product.product_type.toLowerCase() === type.toLowerCase())
      );
      console.log(`After product type filter: ${filteredProducts.length} products`);
    }

    // Filter by vendor (OR logic for multiple vendors)
    if (filters.vendor) {
      const vendors = Array.isArray(filters.vendor) ? filters.vendor : [filters.vendor];
      filteredProducts = filteredProducts.filter(product =>
        vendors.some(vendor => product.vendor && product.vendor.toLowerCase() === vendor.toLowerCase())
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
          : product.tags.map(t => t.toLowerCase());
        
        return tags.some(tag => productTags.includes(tag.toLowerCase()));
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
      collection: {
        id: `gid://shopify/Collection/${collection.id}`,
        legacyResourceId: collection.id,
        handle: collection.handle,
        title: collection.title,
        type: collectionType,
      },
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
    console.error("Error filtering collection products:", error.message);
    if (error.response?.data) {
      console.error("API errors:", JSON.stringify(error.response.data, null, 2));
    }
    res.status(500).json({
      success: false,
      message: "Failed to filter collection products",
      error: error.message,
    });
  }
});

module.exports = router;
