const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const storefrontAPI = require("../config/shopify");

/**
 * GET /search/:query or /search/:query/pg-:page
 * Search for products using Shopify Storefront API GraphQL search query
 * Requires Bearer token
 */
router.get("/:query/pg-:page", verifyToken, async (req, res) => {
  req.params.pageNumber = req.params.page;
  return handleSearchRequest(req, res);
});

router.get("/:query", verifyToken, async (req, res) => {
  req.params.pageNumber = "1"; // Default to page 1
  return handleSearchRequest(req, res);
});

async function handleSearchRequest(req, res) {
  try {
    const { query, pageNumber } = req.params;
    const page = parseInt(pageNumber) || 1;
    const productsPerPage = parseInt(req.query.limit) || 24;
    
    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    console.log(`Searching for: "${query}" (page ${page})`);

    // Build the GraphQL search query
    const searchQuery = `
      query searchProducts($query: String!, $first: Int!) {
        search(query: $query, first: $first, types: PRODUCT, sortKey: RELEVANCE) {
          totalCount
          edges {
            cursor
            node {
              ... on Product {
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
                totalInventory
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
                      quantityAvailable
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
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
        }
      }
    `;

    // Calculate how many products to fetch for pagination
    const first = page * productsPerPage;

    const searchResponse = await storefrontAPI.post("", {
      query: searchQuery,
      variables: { 
        query: query,
        first: first
      }
    });

    if (searchResponse.data.errors) {
      console.error("GraphQL errors:", searchResponse.data.errors);
      return res.status(500).json({
        success: false,
        message: "Search failed",
        errors: searchResponse.data.errors,
      });
    }

    const searchData = searchResponse.data.data.search;
    const totalCount = searchData.totalCount;
    const allEdges = searchData.edges || [];

    // Paginate results
    const offset = (page - 1) * productsPerPage;
    const paginatedEdges = allEdges.slice(offset, offset + productsPerPage);

    const totalPages = Math.ceil(totalCount / productsPerPage);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    console.log(`Found ${totalCount} total results, returning ${paginatedEdges.length} for page ${page}`);

    res.json({
      success: true,
      query: query,
      pageInfo: {
        currentPage: page,
        totalPages: totalPages,
        productsPerPage: productsPerPage,
        totalResults: totalCount,
        hasNextPage: hasNextPage,
        hasPreviousPage: hasPreviousPage,
        startCursor: offset + 1,
        endCursor: offset + paginatedEdges.length,
      },
      data: paginatedEdges.map(edge => edge.node),
    });
  } catch (error) {
    console.error("Error searching products:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to search products",
      error: error.message,
    });
  }
}

module.exports = router;
