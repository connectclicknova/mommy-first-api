const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const storefrontAPI = require("../config/shopify");

/**
 * GET /search/:query or /search/:query/pg-:page
 * Search for products using Shopify Storefront API predictive search
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

/**
 * Build search query variants for better fuzzy matching
 * Handles cases like "peribottle" -> "peri bottle", "peribottl" -> "peri bottl"
 */
function buildSearchVariants(rawQuery) {
  const normalized = rawQuery.trim().toLowerCase();
  const variants = [normalized];

  // If no spaces, try splitting into common word patterns
  if (!normalized.includes(" ") && normalized.length >= 4) {
    // Try splitting at each position (min 2 chars each side)
    for (let i = 2; i <= normalized.length - 2; i++) {
      variants.push(`${normalized.slice(0, i)} ${normalized.slice(i)}`);
    }
  }

  // If has spaces, also try without spaces
  if (normalized.includes(" ")) {
    variants.push(normalized.replace(/\s+/g, ""));
  }

  return variants;
}

async function handleSearchRequest(req, res) {
  try {
    const { query, pageNumber } = req.params;
    const page = parseInt(pageNumber) || 1;
    const productsPerPage = Math.min(parseInt(req.query.limit) || 8, 8);
    
    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // Generate search variants for fuzzy matching
    const searchVariants = buildSearchVariants(query);
    console.log(`Predictive search for: "${query}" variants: ${JSON.stringify(searchVariants)}`);

    const searchQuery = `
      query searchProducts($query: String!) {
        predictiveSearch(
          query: $query
          limit: 10
          types: [PRODUCT, ARTICLE]
        ) {
          products {
            id
            title
            handle
            vendor
            productType
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 1) {
              nodes {
                url
                altText
              }
            }
          }
          articles {
            id
            title
            handle
            content
            excerpt
            publishedAt
            image {
              url
              altText
            }
            blog {
              id
              title
              handle
            }
          }
        }
      }
    `;

    // Try each search variant until we get results
    let searchResponse = null;
    let lastResponse = null;

    for (const variant of searchVariants) {
      const response = await storefrontAPI.post("", {
        query: searchQuery,
        variables: {
          query: variant,
        },
      });

      lastResponse = response;

      if (response.data.errors) {
        continue;
      }

      const products = response.data.data?.predictiveSearch?.products || [];
      const articles = response.data.data?.predictiveSearch?.articles || [];
      if (products.length > 0 || articles.length > 0) {
        searchResponse = response;
        console.log(`Found ${products.length} products and ${articles.length} articles with variant: "${variant}"`);
        break;
      }
    }

    // Use last response if no variant returned results
    if (!searchResponse) {
      searchResponse = lastResponse;
    }

    if (searchResponse.data.errors) {
      console.error("GraphQL errors:", searchResponse.data.errors);
      return res.status(500).json({
        success: false,
        message: "Search failed",
        errors: searchResponse.data.errors,
      });
    }

    const products = searchResponse.data.data?.predictiveSearch?.products || [];
    const articles = searchResponse.data.data?.predictiveSearch?.articles || [];

    // Group articles by blog handle and limit to 8 per blog
    const blogHandles = ["events", "journals", "live-sesions"];
    const articlesByBlog = {};
    
    blogHandles.forEach((handle) => {
      articlesByBlog[handle] = articles
        .filter((article) => article.blog?.handle === handle)
        .slice(0, 8);
    });

    const totalArticlesByBlog = Object.values(articlesByBlog).reduce(
      (sum, arr) => sum + arr.length,
      0
    );

    res.json({
      totalResults: products.length + totalArticlesByBlog,
      totalProducts: products.length,
      totalArticles: totalArticlesByBlog,
      data: {
        predictiveSearch: {
          products: products,
          articles: articlesByBlog,
        },
      },
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
