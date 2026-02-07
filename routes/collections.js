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

/**
 * GET /collections
 * Fetch list of all collections
 * Requires Bearer token
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const query = `
      query getCollections($first: Int!) {
        collections(first: $first) {
          edges {
            node {
              id
              title
              handle
              description
              descriptionHtml
              updatedAt
              image {
                url
                altText
                width
                height
              }
            }
          }
        }
      }
    `;

    const response = await storefrontAPI.post("", {
      query,
      variables: { first: limit },
    });

    // Fetch metafields for each collection using Admin API
    const collections = response.data?.data?.collections?.edges || [];
    
    const collectionsWithMetafields = await Promise.all(
      collections.map(async (edge) => {
        const collectionId = edge.node.id.split("/").pop();
        try {
          const metafieldsRes = await adminAPI.get(`/collections/${collectionId}/metafields.json?limit=250`);
          const metafields = metafieldsRes.data.metafields || [];
          return {
            ...edge,
            node: {
              ...edge.node,
              metafields: metafields.map((mf) => ({
                namespace: mf.namespace,
                key: mf.key,
                value: mf.value,
                type: mf.type,
              })),
            },
          };
        } catch (err) {
          return {
            ...edge,
            node: {
              ...edge.node,
              metafields: [],
            },
          };
        }
      })
    );

    res.json({
      data: {
        collections: {
          edges: collectionsWithMetafields,
        },
      },
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
 * Fetch products from a collection with pagination (24 per page)
 * Supports filtering and sorting via query params:
 *   - price_min: minimum price
 *   - price_max: maximum price
 *   - vendor: product vendor (comma-separated for multiple)
 *   - product_type: product type (comma-separated for multiple)
 *   - tag: product tag (comma-separated for multiple)
 *   - available: true/false for availability
 *   - color: color option filter (comma-separated for multiple)
 *   - size: size option filter (comma-separated for multiple)
 *   - option: custom variant option in format "name:value" (comma-separated for multiple)
 *   - sort: FEATURED, BEST_SELLING, TITLE_ASC, TITLE_DESC, PRICE_ASC, PRICE_DESC, DATE_ASC, DATE_DESC
 * Returns total count and remaining products count
 * Requires Bearer token
 */
router.get("/:collectionHandle/pg-:page", verifyToken, async (req, res) => {
  req.params.pageNumber = req.params.page;
  return handleCollectionRequest(req, res);
});

router.get("/:collectionHandle", verifyToken, async (req, res) => {
  req.params.pageNumber = "1";
  return handleCollectionRequest(req, res);
});

async function handleCollectionRequest(req, res) {
  try {
    const { collectionHandle, pageNumber } = req.params;
    const page = parseInt(pageNumber) || 1;
    const productsPerPage = 24;

    // Get filter and sort params
    const {
      price_min,
      price_max,
      vendor,
      product_type,
      tag,
      available,
      color,
      size,
      option,
      sort = "FEATURED",
    } = req.query;

    // Build filter array for Shopify
    const filters = [];

    // Price filter
    if (price_min || price_max) {
      const priceFilter = { price: {} };
      if (price_min) priceFilter.price.min = parseFloat(price_min);
      if (price_max) priceFilter.price.max = parseFloat(price_max);
      filters.push(priceFilter);
    }

    // Availability filter
    if (available !== undefined) {
      filters.push({ available: available === "true" });
    }

    // Vendor filter (can be multiple comma-separated)
    if (vendor) {
      const vendors = vendor.split(",").map((v) => v.trim());
      vendors.forEach((v) => {
        filters.push({ productVendor: v });
      });
    }

    // Product type filter (can be multiple comma-separated)
    if (product_type) {
      const types = product_type.split(",").map((t) => t.trim());
      types.forEach((t) => {
        filters.push({ productType: t });
      });
    }

    // Tag filter (can be multiple comma-separated)
    if (tag) {
      const tags = tag.split(",").map((t) => t.trim());
      tags.forEach((t) => {
        filters.push({ tag: t });
      });
    }

    // Color variant option filter
    if (color) {
      const colors = color.split(",").map((c) => c.trim());
      colors.forEach((c) => {
        filters.push({ variantOption: { name: "Color", value: c } });
      });
    }

    // Size variant option filter
    if (size) {
      const sizes = size.split(",").map((s) => s.trim());
      sizes.forEach((s) => {
        filters.push({ variantOption: { name: "Size", value: s } });
      });
    }

    // Custom variant option filter (format: "name:value")
    if (option) {
      const options = option.split(",").map((o) => o.trim());
      options.forEach((o) => {
        const [name, value] = o.split(":").map((p) => p.trim());
        if (name && value) {
          filters.push({ variantOption: { name, value } });
        }
      });
    }

    // Determine sort key and direction
    const sortMapping = {
      FEATURED: { key: "MANUAL", reverse: false },
      BEST_SELLING: { key: "BEST_SELLING", reverse: false },
      TITLE_ASC: { key: "TITLE", reverse: false },
      TITLE_DESC: { key: "TITLE", reverse: true },
      PRICE_ASC: { key: "PRICE", reverse: false },
      PRICE_DESC: { key: "PRICE", reverse: true },
      DATE_ASC: { key: "CREATED", reverse: false },
      DATE_DESC: { key: "CREATED", reverse: true },
    };

    const sortConfig = sortMapping[sort.toUpperCase()] || sortMapping.FEATURED;

    const hasFilters = filters.length > 0;
    const hasSort = sort !== "FEATURED";

    console.log(`Collection: ${collectionHandle}, Page: ${page}, Filters: ${JSON.stringify(filters)}, Sort: ${sort}`);

    // Get total count with filters applied
    const countQuery = `
      query getCollectionCount($handle: String!, $filters: [ProductFilter!], $sortKey: ProductCollectionSortKeys!, $reverse: Boolean) {
        collection(handle: $handle) {
          id
          title
          handle
          description
          descriptionHtml
          image {
            url
            altText
          }
          products(first: 250, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
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
            edges {
              cursor
            }
          }
        }
      }
    `;

    const countResponse = await storefrontAPI.post("", {
      query: countQuery,
      variables: {
        handle: collectionHandle,
        filters: hasFilters ? filters : null,
        sortKey: sortConfig.key,
        reverse: sortConfig.reverse,
      },
    });

    if (!countResponse.data?.data?.collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    const totalProducts = countResponse.data.data.collection?.products?.edges?.length || 0;

    // Calculate pagination
    const totalPages = Math.ceil(totalProducts / productsPerPage);
    const displayedSoFar = page * productsPerPage;
    const remainingProducts = Math.max(0, totalProducts - displayedSoFar);

    // Fetch products for current page using cursor-based pagination
    let afterCursor = null;

    if (page > 1) {
      const skipProducts = (page - 1) * productsPerPage;
      const edges = countResponse.data.data.collection?.products?.edges || [];
      if (edges.length >= skipProducts) {
        afterCursor = edges[skipProducts - 1].cursor;
      }
    }

    // Fetch products for current page
    const productsQuery = `
      query getCollectionProducts($handle: String!, $first: Int!, $after: String, $filters: [ProductFilter!], $sortKey: ProductCollectionSortKeys!, $reverse: Boolean) {
        collection(handle: $handle) {
          id
          title
          handle
          description
          descriptionHtml
          image {
            url
            altText
          }
          products(first: $first, after: $after, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
            edges {
              cursor
              node {
                id
                title
                handle
                description
                vendor
                productType
                tags
                availableForSale
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
                images(first: 5) {
                  nodes {
                    url
                    altText
                  }
                }
                variants(first: 10) {
                  nodes {
                    id
                    title
                    availableForSale
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
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      }
    `;

    const productsResponse = await storefrontAPI.post("", {
      query: productsQuery,
      variables: {
        handle: collectionHandle,
        first: productsPerPage,
        after: afterCursor,
        filters: hasFilters ? filters : null,
        sortKey: sortConfig.key,
        reverse: sortConfig.reverse,
      },
    });

    const collection = countResponse.data.data.collection;
    const products = productsResponse.data?.data?.collection?.products || {};
    const pageInfo = products.pageInfo || {};

    // Fetch collection metafields using Admin API
    let collectionMetafields = [];
    try {
      const collectionId = collection.id.split("/").pop();
      const metafieldsRes = await adminAPI.get(`/collections/${collectionId}/metafields.json?limit=250`);
      collectionMetafields = (metafieldsRes.data.metafields || []).map((mf) => ({
        namespace: mf.namespace,
        key: mf.key,
        value: mf.value,
        type: mf.type,
      }));
    } catch (err) {
      console.error("Error fetching collection metafields:", err.message);
    }

    const productsList = products.edges || [];

    // Fetch metafields for each product
    const productsWithMetafields = await Promise.all(
      productsList.map(async (edge) => {
        const productId = edge.node.id.split("/").pop();
        try {
          const metafieldsRes = await adminAPI.get(`/products/${productId}/metafields.json?limit=250`);
          const metafields = (metafieldsRes.data.metafields || []).map((mf) => ({
            namespace: mf.namespace,
            key: mf.key,
            value: mf.value,
            type: mf.type,
          }));
          return {
            ...edge,
            node: {
              ...edge.node,
              metafields: metafields,
            },
          };
        } catch (err) {
          console.error(`Error fetching metafields for product ${productId}:`, err.message);
          return {
            ...edge,
            node: {
              ...edge.node,
              metafields: [],
            },
          };
        }
      })
    );

    res.json({
      data: {
        collection: {
          id: collection.id,
          title: collection.title,
          handle: collection.handle,
          description: collection.description,
          descriptionHtml: collection.descriptionHtml,
          image: collection.image,
          metafields: collectionMetafields,
          filters: collection.products?.filters || [],
          products: productsWithMetafields,
        },
      },
      appliedFilters: {
        price_min: price_min || null,
        price_max: price_max || null,
        vendor: vendor || null,
        product_type: product_type || null,
        tag: tag || null,
        available: available || null,
        color: color || null,
        size: size || null,
        option: option || null,
        sort: sort,
      },
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        productsPerPage: productsPerPage,
        totalProducts: totalProducts,
        currentPageProducts: productsList.length,
        displayedSoFar: Math.min(displayedSoFar, totalProducts),
        remainingProducts: remainingProducts,
        hasNextPage: pageInfo.hasNextPage || page < totalPages,
        hasPreviousPage: pageInfo.hasPreviousPage || page > 1,
        startCursor: pageInfo.startCursor || null,
        endCursor: pageInfo.endCursor || null,
      },
    });
  } catch (error) {
    console.error("Error fetching collection:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch collection",
      error: error.message,
    });
  }
}

module.exports = router;
