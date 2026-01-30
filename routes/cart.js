const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
  createCart,
  getCart,
  addToCart,
  updateCartItems,
  removeFromCart,
  getOrCreateUserCart,
  saveUserCartId,
  mergeCartsOnLogin,
  clearUserCart,
  updateCartBuyerIdentity
} = require("../utils/cartService");

// ==================== CART MERGE ENDPOINT (Call after login) ====================

/**
 * POST /cart/merge
 * Merge guest cart with user's cart after login
 * Call this endpoint immediately after user logs in
 */
router.post("/merge", verifyToken, async (req, res) => {
  try {
    const { userId, guestCartId } = req.body;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    // Get user's email from the token if available
    const userEmail = req.user?.email || null;

    const result = await mergeCartsOnLogin(userId, guestCartId, userEmail);

    return res.status(200).json({
      success: true,
      message: result.message,
      merged: result.merged,
      itemsMerged: result.itemsMerged || 0,
      data: result.cart,
    });
  } catch (error) {
    console.error("Error merging carts:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to merge carts",
      error: error.message,
    });
  }
});

// ==================== USER-SPECIFIC CART ENDPOINTS ====================

/**
 * GET /cart/user/:userId
 * Get or create a cart for a specific user (user-specific, persistent)
 */
router.get("/user/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    // Get user's email from the token if available
    const userEmail = req.user?.email || null;

    const cart = await getOrCreateUserCart(userId, userEmail);

    return res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error("Error getting user cart:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to get user cart",
      error: error.message,
    });
  }
});

/**
 * POST /cart/user/:userId/items
 * Add items to user's cart
 */
router.post("/user/:userId/items", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { items } = req.body;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required and must not be empty",
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.variantId) {
        return res.status(400).json({
          success: false,
          message: "Each item must have a variantId",
        });
      }
    }

    // Get or create user's cart
    const userEmail = req.user?.email || null;
    const userCart = await getOrCreateUserCart(userId, userEmail);

    // Add items to the cart
    const updatedCart = await addToCart(userCart.cartId, items);

    return res.status(200).json({
      success: true,
      message: "Items added to cart successfully",
      data: updatedCart,
    });
  } catch (error) {
    console.error("Error adding to user cart:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to add items to cart",
      error: error.message,
    });
  }
});

/**
 * PUT /cart/user/:userId/items
 * Update items in user's cart
 */
router.put("/user/:userId/items", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { items } = req.body;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required and must not be empty",
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.lineId) {
        return res.status(400).json({
          success: false,
          message: "Each item must have a lineId",
        });
      }
      if (item.quantity === undefined || isNaN(item.quantity) || item.quantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity is required and must be a non-negative number",
        });
      }
    }

    // Get user's cart
    const userEmail = req.user?.email || null;
    const userCart = await getOrCreateUserCart(userId, userEmail);

    // Update items in the cart
    const updatedCart = await updateCartItems(userCart.cartId, items);

    return res.status(200).json({
      success: true,
      message: "Cart items updated successfully",
      data: updatedCart,
    });
  } catch (error) {
    console.error("Error updating user cart items:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update cart items",
      error: error.message,
    });
  }
});

/**
 * DELETE /cart/user/:userId/items
 * Remove items from user's cart
 */
router.delete("/user/:userId/items", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { lineIds } = req.body;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    if (!lineIds || !Array.isArray(lineIds) || lineIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "lineIds array is required and must not be empty",
      });
    }

    // Get user's cart
    const userEmail = req.user?.email || null;
    const userCart = await getOrCreateUserCart(userId, userEmail);

    // Remove items from the cart
    const updatedCart = await removeFromCart(userCart.cartId, lineIds);

    return res.status(200).json({
      success: true,
      message: "Items removed from cart successfully",
      data: updatedCart,
    });
  } catch (error) {
    console.error("Error removing from user cart:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to remove items from cart",
      error: error.message,
    });
  }
});

// ==================== GENERIC CART ENDPOINTS (by cartId) ====================

/**
 * POST /cart
 * Create a new cart
 */
router.post("/", async (req, res) => {
  try {
    const { email, customerAccessToken } = req.body;

    let buyerIdentity = null;
    if (email || customerAccessToken) {
      buyerIdentity = { email, customerAccessToken };
    }

    const cart = await createCart(buyerIdentity);

    return res.status(201).json({
      success: true,
      message: "Cart created successfully",
      data: cart,
    });
  } catch (error) {
    console.error("Error creating cart:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create cart",
      error: error.message,
    });
  }
});

/**
 * GET /cart/:cartId
 * Get cart by ID with all items
 */
router.get("/:cartId", async (req, res) => {
  try {
    const { cartId } = req.params;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "Cart ID is required",
      });
    }

    // Decode the cart ID if it's URL encoded
    const decodedCartId = decodeURIComponent(cartId);

    const cart = await getCart(decodedCartId);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error("Error getting cart:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to get cart",
      error: error.message,
    });
  }
});

/**
 * POST /cart/:cartId/items
 * Add items to cart
 */
router.post("/:cartId/items", async (req, res) => {
  try {
    const { cartId } = req.params;
    const { items } = req.body;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "Cart ID is required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required and must not be empty",
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.variantId) {
        return res.status(400).json({
          success: false,
          message: "Each item must have a variantId",
        });
      }
      if (item.quantity !== undefined && (isNaN(item.quantity) || item.quantity < 1)) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be a positive number",
        });
      }
    }

    // Decode the cart ID if it's URL encoded
    const decodedCartId = decodeURIComponent(cartId);

    const cart = await addToCart(decodedCartId, items);

    return res.status(200).json({
      success: true,
      message: "Items added to cart successfully",
      data: cart,
    });
  } catch (error) {
    console.error("Error adding to cart:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to add items to cart",
      error: error.message,
    });
  }
});

/**
 * PUT /cart/:cartId/items
 * Update cart item quantities
 */
router.put("/:cartId/items", async (req, res) => {
  try {
    const { cartId } = req.params;
    const { items } = req.body;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "Cart ID is required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required and must not be empty",
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.lineId) {
        return res.status(400).json({
          success: false,
          message: "Each item must have a lineId",
        });
      }
      if (item.quantity === undefined || isNaN(item.quantity) || item.quantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity is required and must be a non-negative number",
        });
      }
    }

    // Decode the cart ID if it's URL encoded
    const decodedCartId = decodeURIComponent(cartId);

    const cart = await updateCartItems(decodedCartId, items);

    return res.status(200).json({
      success: true,
      message: "Cart items updated successfully",
      data: cart,
    });
  } catch (error) {
    console.error("Error updating cart items:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update cart items",
      error: error.message,
    });
  }
});

/**
 * DELETE /cart/:cartId/items
 * Remove items from cart
 */
router.delete("/:cartId/items", async (req, res) => {
  try {
    const { cartId } = req.params;
    const { lineIds } = req.body;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "Cart ID is required",
      });
    }

    if (!lineIds || !Array.isArray(lineIds) || lineIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "lineIds array is required and must not be empty",
      });
    }

    // Decode the cart ID if it's URL encoded
    const decodedCartId = decodeURIComponent(cartId);

    const cart = await removeFromCart(decodedCartId, lineIds);

    return res.status(200).json({
      success: true,
      message: "Items removed from cart successfully",
      data: cart,
    });
  } catch (error) {
    console.error("Error removing from cart:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to remove items from cart",
      error: error.message,
    });
  }
});

/**
 * POST /cart/checkout
 * Initiate the shopify checkout and return checkout URL
 */
router.post("/checkout", async (req, res) => {
  try {
    const { cartId, customerAccessToken } = req.body;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "cartId is required",
      });
    }

    let checkoutUrl;
    let buyerIdentity = null;

    if (customerAccessToken) {
      // If customer access token is provided, associate it with the cart
      // This will pre-fill the checkout with customer details
      const result = await updateCartBuyerIdentity(cartId, customerAccessToken);
      checkoutUrl = result.checkoutUrl;
      buyerIdentity = result.buyerIdentity;
    } else {
      // If no customer token, just get the cart to retrieve checkout URL
      // Note: getCart already returns checkoutUrl
      const decodedCartId = decodeURIComponent(cartId);
      const cart = await getCart(decodedCartId);
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: "Cart not found",
        });
      }
      checkoutUrl = cart.checkoutUrl;
    }

    return res.status(200).json({
      success: true,
      message: "Checkout URL generated successfully",
      checkoutUrl,
      buyerIdentity,
    });
  } catch (error) {
    console.error("Error generating checkout URL:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate checkout URL",
      error: error.message,
    });
  }
});

module.exports = router;
