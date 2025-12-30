const express = require("express");
const router = express.Router();
const storefrontAPI = require("../config/shopify");
const verifyToken = require("../middleware/auth");

// Helper function to get total product count
async function getTotalProductCount() {
  try {
    const countQuery = `
      {
        products(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
    `;
    const response = await storefrontAPI.post("", { query: countQuery });
    // Note: Shopify doesn't provide direct count, so we estimate based on available data
    // For accurate count, you may need to implement caching or use Shopify Admin API
    return null; // Will be calculated differently per route
  } catch (error) {
    console.error("Error getting product count:", error.message);
    return null;
  }
}

// GET products with pagination and collection filtering (Protected)
// Supports: /products, /products/pg-1, /products/pg-2?cid=collection-name
router.get(["/", "/pg-:page"], verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.params.page) || 1; // Default to page 1
    const productsPerPage = 16;
    const { cid } = req.query; // Collection ID from query params

    let query;

    if (cid) {
      // Fetch products from a specific collection with pagination
      const collectionQuery = `
        {
          collection(handle: "${cid}") {
            id
            title
            handle
            products(first: 250) {
              edges {
                cursor
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
              pageInfo {
                hasNextPage
                hasPreviousPage
              }
            }
          }
        }
      `;

      // For page > 1, we need to fetch all products and slice
      // Note: In production, you'd want to use cursor-based pagination
      const response = await storefrontAPI.post("", { query: collectionQuery });
      
      if (!response.data.data.collection) {
        return res.status(404).json({
          success: false,
          message: `Collection '${cid}' not found`,
        });
      }

      const allProducts = response.data.data.collection.products.edges.map(edge => edge.node);
      const startIndex = (page - 1) * productsPerPage;
      const endIndex = startIndex + productsPerPage;
      const products = allProducts.slice(startIndex, endIndex);
      const hasNextPage = endIndex < allProducts.length;

      return res.status(200).json({
        success: true,
        page: page,
        productsPerPage: productsPerPage,
        count: products.length,
        totalProductCount: allProducts.length,
        totalCount: allProducts.length,
        hasNextPage: hasNextPage,
        collectionId: cid,
        collectionTitle: response.data.data.collection.title,
        products: products,
      });
    } else {
      // Fetch all products with pagination
      query = `
        {
          products(first: 250) {
            edges {
              cursor
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
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `;

      const response = await storefrontAPI.post("", { query });
      const allProducts = response.data.data.products.edges.map(edge => edge.node);
      
      // Slice products for the requested page
      const startIndex = (page - 1) * productsPerPage;
      const endIndex = startIndex + productsPerPage;
      const products = allProducts.slice(startIndex, endIndex);
      const hasNextPage = response.data.data.products.pageInfo.hasNextPage || endIndex < allProducts.length;

      return res.status(200).json({
        success: true,
        page: page,
        productsPerPage: productsPerPage,
        count: products.length,
        totalProductCount: allProducts.length,
        hasNextPage: hasNextPage,
        products: products,
      });
    }
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
        products(first: 250, query: "${q}") {
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
      totalProductCount: products.length,
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
