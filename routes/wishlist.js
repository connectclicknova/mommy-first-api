const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const { getCustomerMetafields, updateCustomerMetafield } = require("../utils/customerService");
const storefrontAPI = require("../config/shopify");

/**
 * Fetch product details by handle from Shopify Storefront API
 * @param {string} handle - Product handle
 * @returns {Promise<object|null>} - Product data or null if not found
 */
async function getProductByHandle(handle) {
  try {
    const query = `
      query getProductByHandle($handle: String!) {
        product(handle: $handle) {
          id
          title
          handle
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
          }
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
          availableForSale
        }
      }
    `;

    const variables = { handle };
    const response = await storefrontAPI.post("", { query, variables });

    if (response.data.errors) {
      console.error(`Error fetching product ${handle}:`, response.data.errors[0].message);
      return null;
    }

    const product = response.data.data.product;
    if (!product) {
      return null;
    }

    // Extract the numeric ID from the Shopify GraphQL ID
    const numericId = product.id.split('/').pop();

    return {
      id: numericId,
      graphql_id: product.id,
      title: product.title,
      handle: product.handle,
      price: product.priceRange.minVariantPrice.amount,
      currency: product.priceRange.minVariantPrice.currencyCode,
      compare_at_price: product.compareAtPriceRange?.minVariantPrice?.amount || null,
      image: product.images.edges[0]?.node.url || null,
      available_for_sale: product.availableForSale,
    };
  } catch (error) {
    console.error(`Error fetching product by handle ${handle}:`, error.message);
    return null;
  }
}

/**
 * GET /wishlist/:userId
 * Get wishlist metafield details for a specific user with product details
 */
router.get("/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    // Get customer metafields
    const metafields = await getCustomerMetafields(userId);

    console.log(`Total metafields found for user ${userId}:`, metafields.length);

    // Find wishlist metafield - check multiple possible keys and namespaces
    const wishlistMetafield = metafields.find(
      (metafield) => 
        metafield.key === "wishlist" || 
        metafield.key === "wishlist_items" ||
        metafield.key === "favorite_products" ||
        metafield.namespace === "wishlist" ||
        metafield.namespace === "custom" && (metafield.key === "wishlist" || metafield.key === "wishlist_items")
    );

    console.log("Wishlist metafield found:", wishlistMetafield ? "YES" : "NO");
    if (wishlistMetafield) {
      console.log("Wishlist metafield details:", {
        id: wishlistMetafield.id,
        namespace: wishlistMetafield.namespace,
        key: wishlistMetafield.key,
        type: wishlistMetafield.type,
        value: wishlistMetafield.value,
      });
    }

    // If no wishlist metafield found, return empty array
    if (!wishlistMetafield) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No wishlist metafield found",
      });
    }

    // Parse the wishlist value
    let wishlistData = [];
    try {
      const rawValue = wishlistMetafield.value;
      
      // If value is empty or null, return empty array
      if (!rawValue || rawValue === "" || rawValue === "[]" || rawValue === "null") {
        return res.status(200).json({
          success: true,
          data: [],
          metafield: {
            id: wishlistMetafield.id,
            namespace: wishlistMetafield.namespace,
            key: wishlistMetafield.key,
            type: wishlistMetafield.type,
          },
        });
      }

      // If the value is a JSON string, parse it
      if (typeof rawValue === "string") {
        try {
          wishlistData = JSON.parse(rawValue);
        } catch {
          // If JSON parse fails, treat as comma-separated or single value
          if (rawValue.includes(",")) {
            wishlistData = rawValue.split(",").map(item => item.trim()).filter(item => item);
          } else {
            wishlistData = [rawValue];
          }
        }
      } else {
        wishlistData = rawValue;
      }

      // Ensure it's an array
      if (!Array.isArray(wishlistData)) {
        wishlistData = [wishlistData];
      }

      // Filter out any null, undefined, or empty values
      wishlistData = wishlistData.filter(item => item !== null && item !== undefined && item !== "");
    } catch (parseError) {
      console.error("Error parsing wishlist value:", parseError.message);
      // If parsing fails, return the raw value in an array
      wishlistData = [wishlistMetafield.value];
    }

    // Fetch product details for each handle
    const productsWithDetails = await Promise.all(
      wishlistData.map(async (handle) => {
        const productDetails = await getProductByHandle(handle);
        if (productDetails) {
          return productDetails;
        }
        // If product not found, return handle only
        return {
          handle,
          error: "Product not found",
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: productsWithDetails.length,
      data: productsWithDetails,
      metafield: {
        id: wishlistMetafield.id,
        namespace: wishlistMetafield.namespace,
        key: wishlistMetafield.key,
        type: wishlistMetafield.type,
        raw_value: wishlistMetafield.value,
      },
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error.message);

    // Handle Shopify API errors
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist",
      error: error.message,
    });
  }
});

/**
 * POST /wishlist/:userId/add
 * Add a product to user's wishlist
 */
router.post("/:userId/add", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { productHandle } = req.body;

    // Validate userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    // Validate productHandle
    if (!productHandle) {
      return res.status(400).json({
        success: false,
        message: "Product handle is required",
      });
    }

    // Get current metafields
    const metafields = await getCustomerMetafields(userId);

    // Find wishlist metafield
    const wishlistMetafield = metafields.find(
      (metafield) => 
        metafield.key === "wishlist" || 
        metafield.key === "wishlist_items" ||
        metafield.namespace === "wishlist" ||
        metafield.namespace === "custom" && (metafield.key === "wishlist" || metafield.key === "wishlist_items")
    );

    let currentWishlist = [];

    // Parse existing wishlist
    if (wishlistMetafield) {
      try {
        const rawValue = wishlistMetafield.value;
        if (rawValue && rawValue !== "" && rawValue !== "[]") {
          if (typeof rawValue === "string") {
            try {
              currentWishlist = JSON.parse(rawValue);
            } catch {
              if (rawValue.includes(",")) {
                currentWishlist = rawValue.split(",").map(item => item.trim()).filter(item => item);
              } else {
                currentWishlist = [rawValue];
              }
            }
          } else {
            currentWishlist = rawValue;
          }
          if (!Array.isArray(currentWishlist)) {
            currentWishlist = [currentWishlist];
          }
        }
      } catch (error) {
        console.error("Error parsing existing wishlist:", error.message);
        currentWishlist = [];
      }
    }

    // Check if product already in wishlist
    if (currentWishlist.includes(productHandle)) {
      return res.status(400).json({
        success: false,
        message: "Product already in wishlist",
      });
    }

    // Add product to wishlist
    currentWishlist.push(productHandle);

    // Update metafield
    await updateCustomerMetafield(userId, {
      namespace: wishlistMetafield?.namespace || "custom",
      key: wishlistMetafield?.key || "wishlist",
      value: JSON.stringify(currentWishlist),
      type: "json",
    });

    // Fetch product details
    const productDetails = await getProductByHandle(productHandle);

    return res.status(200).json({
      success: true,
      message: "Product added to wishlist",
      data: {
        wishlist_count: currentWishlist.length,
        added_product: productDetails,
      },
    });
  } catch (error) {
    console.error("Error adding product to wishlist:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to add product to wishlist",
      error: error.message,
    });
  }
});

/**
 * DELETE /wishlist/:userId/remove
 * Remove a product from user's wishlist
 */
router.delete("/:userId/remove", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { productHandle } = req.body;

    // Validate userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    // Validate productHandle
    if (!productHandle) {
      return res.status(400).json({
        success: false,
        message: "Product handle is required",
      });
    }

    // Get current metafields
    const metafields = await getCustomerMetafields(userId);

    // Find wishlist metafield
    const wishlistMetafield = metafields.find(
      (metafield) => 
        metafield.key === "wishlist" || 
        metafield.key === "wishlist_items" ||
        metafield.namespace === "wishlist" ||
        metafield.namespace === "custom" && (metafield.key === "wishlist" || metafield.key === "wishlist_items")
    );

    if (!wishlistMetafield) {
      return res.status(404).json({
        success: false,
        message: "Wishlist is empty",
      });
    }

    let currentWishlist = [];

    // Parse existing wishlist
    try {
      const rawValue = wishlistMetafield.value;
      if (rawValue && rawValue !== "" && rawValue !== "[]") {
        if (typeof rawValue === "string") {
          try {
            currentWishlist = JSON.parse(rawValue);
          } catch {
            if (rawValue.includes(",")) {
              currentWishlist = rawValue.split(",").map(item => item.trim()).filter(item => item);
            } else {
              currentWishlist = [rawValue];
            }
          }
        } else {
          currentWishlist = rawValue;
        }
        if (!Array.isArray(currentWishlist)) {
          currentWishlist = [currentWishlist];
        }
      }
    } catch (error) {
      console.error("Error parsing existing wishlist:", error.message);
      currentWishlist = [];
    }

    // Check if product exists in wishlist
    if (!currentWishlist.includes(productHandle)) {
      return res.status(404).json({
        success: false,
        message: "Product not found in wishlist",
      });
    }

    // Remove product from wishlist
    currentWishlist = currentWishlist.filter(handle => handle !== productHandle);

    // Update metafield
    await updateCustomerMetafield(userId, {
      namespace: wishlistMetafield.namespace,
      key: wishlistMetafield.key,
      value: JSON.stringify(currentWishlist),
      type: "json",
    });

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      data: {
        wishlist_count: currentWishlist.length,
        removed_product: productHandle,
      },
    });
  } catch (error) {
    console.error("Error removing product from wishlist:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to remove product from wishlist",
      error: error.message,
    });
  }
});

/**
 * PUT /wishlist/:userId
 * Update entire wishlist (replace with new list)
 */
router.put("/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { productHandles } = req.body;

    // Validate userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    // Validate productHandles
    if (!Array.isArray(productHandles)) {
      return res.status(400).json({
        success: false,
        message: "productHandles must be an array",
      });
    }

    // Get current metafields to find existing wishlist namespace/key
    const metafields = await getCustomerMetafields(userId);
    const wishlistMetafield = metafields.find(
      (metafield) => 
        metafield.key === "wishlist" || 
        metafield.key === "wishlist_items" ||
        metafield.namespace === "wishlist" ||
        metafield.namespace === "custom" && (metafield.key === "wishlist" || metafield.key === "wishlist_items")
    );

    // Update metafield with new wishlist
    await updateCustomerMetafield(userId, {
      namespace: wishlistMetafield?.namespace || "custom",
      key: wishlistMetafield?.key || "wishlist",
      value: JSON.stringify(productHandles),
      type: "json",
    });

    // Fetch product details for all handles
    const productsWithDetails = await Promise.all(
      productHandles.map(async (handle) => {
        const productDetails = await getProductByHandle(handle);
        return productDetails || { handle, error: "Product not found" };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Wishlist updated successfully",
      count: productHandles.length,
      data: productsWithDetails,
    });
  } catch (error) {
    console.error("Error updating wishlist:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update wishlist",
      error: error.message,
    });
  }
});

/**
 * DELETE /wishlist/:userId/clear
 * Clear entire wishlist
 */
router.delete("/:userId/clear", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    // Get current metafields
    const metafields = await getCustomerMetafields(userId);

    // Find wishlist metafield
    const wishlistMetafield = metafields.find(
      (metafield) => 
        metafield.key === "wishlist" || 
        metafield.key === "wishlist_items" ||
        metafield.namespace === "wishlist" ||
        metafield.namespace === "custom" && (metafield.key === "wishlist" || metafield.key === "wishlist_items")
    );

    if (!wishlistMetafield) {
      return res.status(200).json({
        success: true,
        message: "Wishlist is already empty",
        data: [],
      });
    }

    // Clear wishlist
    await updateCustomerMetafield(userId, {
      namespace: wishlistMetafield.namespace,
      key: wishlistMetafield.key,
      value: JSON.stringify([]),
      type: "json",
    });

    return res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully",
      data: [],
    });
  } catch (error) {
    console.error("Error clearing wishlist:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to clear wishlist",
      error: error.message,
    });
  }
});

module.exports = router;
