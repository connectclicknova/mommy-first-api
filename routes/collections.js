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

    // First get total count
    const countQuery = `
      query getCollectionCount($handle: String!) {
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
          products(first: 1) {
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
        collectionByHandle: collection(handle: $handle) {
          productsCount: products(first: 250) {
            edges {
              cursor
            }
          }
        }
      }
    `;

    const countResponse = await storefrontAPI.post("", {
      query: countQuery,
      variables: { handle: collectionHandle },
    });

    if (!countResponse.data?.data?.collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    const totalProducts = countResponse.data.data.collectionByHandle?.productsCount?.edges?.length || 0;

    // Calculate pagination
    const totalPages = Math.ceil(totalProducts / productsPerPage);
    const displayedSoFar = page * productsPerPage;
    const remainingProducts = Math.max(0, totalProducts - displayedSoFar);

    // Fetch products for current page using cursor-based pagination
    let afterCursor = null;
    
    if (page > 1) {
      // Get cursor for the page
      const skipProducts = (page - 1) * productsPerPage;
      const cursorQuery = `
        query getCursors($handle: String!, $first: Int!) {
          collection(handle: $handle) {
            products(first: $first) {
              edges {
                cursor
              }
            }
          }
        }
      `;
      
      const cursorResponse = await storefrontAPI.post("", {
        query: cursorQuery,
        variables: { handle: collectionHandle, first: skipProducts },
      });
      
      const edges = cursorResponse.data?.data?.collection?.products?.edges || [];
      if (edges.length > 0) {
        afterCursor = edges[edges.length - 1].cursor;
      }
    }

    // Fetch products for current page
    const productsQuery = `
      query getCollectionProducts($handle: String!, $first: Int!, $after: String) {
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
          products(first: $first, after: $after) {
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
      },
    });

    const collection = countResponse.data.data.collection;
    const products = productsResponse.data?.data?.collection?.products || {};

    res.json({
      data: {
        collection: {
          id: collection.id,
          title: collection.title,
          handle: collection.handle,
          description: collection.description,
          descriptionHtml: collection.descriptionHtml,
          image: collection.image,
          filters: collection.products?.filters || [],
          products: products,
        },
      },
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        productsPerPage: productsPerPage,
        totalProducts: totalProducts,
        displayedSoFar: Math.min(displayedSoFar, totalProducts),
        remainingProducts: remainingProducts,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
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
