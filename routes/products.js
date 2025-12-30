const express = require("express");
const router = express.Router();
const storefrontAPI = require("../config/shopify");
const verifyToken = require("../middleware/auth");

// GET all products from Shopify Storefront API (Protected)
router.get("/", verifyToken, async (req, res) => {
  try {
    // GraphQL query to fetch products
    const query = `
      {
        products(first: 50) {
          edges {
            node {
              id
              title
              description
              handle
              productType
              vendor
              tags
              createdAt
              updatedAt
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
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                    availableForSale
                    quantityAvailable
                    selectedOptions {
                      name
                      value
                    }
                    image {
                      url
                      altText
                    }
                  }
                }
              }
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
              availableForSale
            }
          }
        }
      }
    `;

    const response = await storefrontAPI.post("", { query });

    const products = response.data.data.products.edges.map(edge => edge.node);

    res.status(200).json({
      success: true,
      count: products.length,
      products: products,
    });
  } catch (error) {
    console.error("Error fetching products:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.response?.data || error.message,
    });
  }
});

// Search products by phrase (Protected)
router.get("/search", verifyToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query parameter 'q' is required",
      });
    }

    // GraphQL query to search products
    const query = `
      {
        products(first: 50, query: "${q}") {
          edges {
            node {
              id
              title
              description
              handle
              productType
              vendor
              tags
              createdAt
              updatedAt
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
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                    availableForSale
                    quantityAvailable
                    selectedOptions {
                      name
                      value
                    }
                    image {
                      url
                      altText
                    }
                  }
                }
              }
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
              availableForSale
            }
          }
        }
      }
    `;

    const response = await storefrontAPI.post("", { query });

    const products = response.data.data.products.edges.map(edge => edge.node);

    res.status(200).json({
      success: true,
      count: products.length,
      searchQuery: q,
      products: products,
    });
  } catch (error) {
    console.error("Error searching products:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to search products",
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;
