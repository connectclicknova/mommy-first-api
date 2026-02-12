const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
  applyDiscountCodes,
  removeDiscountCodes,
  getCartWithDiscounts,
  getAutomaticDiscounts,
  validateDiscountCode,
} = require("../utils/discountService");
const { getOrCreateUserCart } = require("../utils/cartService");

// ==================== DISCOUNT ENDPOINTS ====================

/**
 * POST /discounts/apply
 * Apply discount code(s) to a cart
 */
router.post("/apply", async (req, res) => {
  try {
    const { cartId, discountCodes } = req.body;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "cartId is required",
      });
    }

    if (!discountCodes || !Array.isArray(discountCodes) || discountCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "discountCodes array is required and must not be empty",
      });
    }

    // Validate discount codes format
    for (const code of discountCodes) {
      if (typeof code !== "string" || code.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Each discount code must be a non-empty string",
        });
      }
    }

    // Decode the cart ID if it's URL encoded
    const decodedCartId = decodeURIComponent(cartId);

    const result = await applyDiscountCodes(decodedCartId, discountCodes);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Failed to apply discount code(s)",
        errors: result.errors,
        data: result.cart,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Discount code(s) applied successfully",
      data: result.cart,
    });
  } catch (error) {
    console.error("Error applying discount codes:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to apply discount codes",
      error: error.message,
    });
  }
});

/**
 * POST /discounts/apply-single
 * Apply a single discount code to a cart (convenience endpoint)
 */
router.post("/apply-single", async (req, res) => {
  try {
    const { cartId, discountCode } = req.body;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "cartId is required",
      });
    }

    if (!discountCode || typeof discountCode !== "string" || discountCode.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "discountCode is required and must be a non-empty string",
      });
    }

    // Decode the cart ID if it's URL encoded
    const decodedCartId = decodeURIComponent(cartId);

    // Get current discount codes first to preserve existing ones
    const currentCart = await getCartWithDiscounts(decodedCartId);
    const existingCodes = currentCart?.discounts?.codes?.map(c => c.code) || [];
    
    // Add the new code if it doesn't already exist
    const normalizedNewCode = discountCode.trim().toUpperCase();
    const hasCode = existingCodes.some(c => c.toUpperCase() === normalizedNewCode);
    
    const codesToApply = hasCode ? existingCodes : [...existingCodes, discountCode.trim()];

    const result = await applyDiscountCodes(decodedCartId, codesToApply);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Failed to apply discount code",
        errors: result.errors,
        data: result.cart,
      });
    }

    // Check if the code is applicable
    const appliedCode = result.cart.discounts.codes.find(
      c => c.code.toUpperCase() === normalizedNewCode
    );

    return res.status(200).json({
      success: true,
      message: appliedCode?.applicable 
        ? "Discount code applied successfully" 
        : "Discount code added but not applicable to current cart",
      applicable: appliedCode?.applicable || false,
      data: result.cart,
    });
  } catch (error) {
    console.error("Error applying discount code:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to apply discount code",
      error: error.message,
    });
  }
});

/**
 * DELETE /discounts/remove
 * Remove all discount codes from a cart
 */
router.delete("/remove", async (req, res) => {
  try {
    const { cartId } = req.body;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "cartId is required",
      });
    }

    // Decode the cart ID if it's URL encoded
    const decodedCartId = decodeURIComponent(cartId);

    const result = await removeDiscountCodes(decodedCartId);

    return res.status(200).json({
      success: true,
      message: "Discount codes removed successfully",
      data: result.cart,
    });
  } catch (error) {
    console.error("Error removing discount codes:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to remove discount codes",
      error: error.message,
    });
  }
});

/**
 * DELETE /discounts/remove-single
 * Remove a specific discount code from a cart
 */
router.delete("/remove-single", async (req, res) => {
  try {
    const { cartId, discountCode } = req.body;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "cartId is required",
      });
    }

    if (!discountCode || typeof discountCode !== "string" || discountCode.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "discountCode is required and must be a non-empty string",
      });
    }

    // Decode the cart ID if it's URL encoded
    const decodedCartId = decodeURIComponent(cartId);

    // Get current discount codes
    const currentCart = await getCartWithDiscounts(decodedCartId);
    const existingCodes = currentCart?.discounts?.codes?.map(c => c.code) || [];

    // Remove the specified code (case-insensitive)
    const normalizedCodeToRemove = discountCode.trim().toUpperCase();
    const remainingCodes = existingCodes.filter(
      c => c.toUpperCase() !== normalizedCodeToRemove
    );

    const result = await applyDiscountCodes(decodedCartId, remainingCodes);

    return res.status(200).json({
      success: true,
      message: "Discount code removed successfully",
      data: result.cart,
    });
  } catch (error) {
    console.error("Error removing discount code:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to remove discount code",
      error: error.message,
    });
  }
});

/**
 * POST /discounts/validate
 * Validate a discount code without permanently applying it
 */
router.post("/validate", async (req, res) => {
  try {
    const { cartId, discountCode, applyIfValid } = req.body;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "cartId is required",
      });
    }

    if (!discountCode || typeof discountCode !== "string" || discountCode.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "discountCode is required and must be a non-empty string",
      });
    }

    // Decode the cart ID if it's URL encoded
    const decodedCartId = decodeURIComponent(cartId);

    const result = await validateDiscountCode(
      decodedCartId, 
      discountCode.trim(), 
      applyIfValid === true
    );

    return res.status(200).json({
      success: true,
      valid: result.valid,
      applicable: result.applicable,
      message: result.message,
      data: result.cart,
    });
  } catch (error) {
    console.error("Error validating discount code:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to validate discount code",
      error: error.message,
    });
  }
});

/**
 * GET /discounts/cart/:cartId
 * Get cart with detailed discount information
 */
router.get("/cart/:cartId", async (req, res) => {
  try {
    const { cartId } = req.params;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "cartId is required",
      });
    }

    // Decode the cart ID if it's URL encoded
    const decodedCartId = decodeURIComponent(cartId);

    const cart = await getCartWithDiscounts(decodedCartId);

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
    console.error("Error getting cart with discounts:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to get cart with discounts",
      error: error.message,
    });
  }
});

/**
 * GET /discounts/automatic/:cartId
 * Get automatic discounts applied to a cart
 */
router.get("/automatic/:cartId", async (req, res) => {
  try {
    const { cartId } = req.params;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "cartId is required",
      });
    }

    // Decode the cart ID if it's URL encoded
    const decodedCartId = decodeURIComponent(cartId);

    const result = await getAutomaticDiscounts(decodedCartId);

    return res.status(200).json({
      success: true,
      message: "Automatic discounts retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error getting automatic discounts:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to get automatic discounts",
      error: error.message,
    });
  }
});

// ==================== USER-SPECIFIC DISCOUNT ENDPOINTS ====================

/**
 * POST /discounts/user/:userId/apply
 * Apply discount code(s) to user's cart
 */
router.post("/user/:userId/apply", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { discountCodes } = req.body;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    if (!discountCodes || !Array.isArray(discountCodes) || discountCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "discountCodes array is required and must not be empty",
      });
    }

    // Get user's cart
    const userEmail = req.user?.email || null;
    const userCart = await getOrCreateUserCart(userId, userEmail);

    const result = await applyDiscountCodes(userCart.cartId, discountCodes);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Failed to apply discount code(s)",
        errors: result.errors,
        data: result.cart,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Discount code(s) applied successfully",
      data: result.cart,
    });
  } catch (error) {
    console.error("Error applying discount codes to user cart:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to apply discount codes",
      error: error.message,
    });
  }
});

/**
 * POST /discounts/user/:userId/apply-single
 * Apply a single discount code to user's cart
 */
router.post("/user/:userId/apply-single", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { discountCode } = req.body;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    if (!discountCode || typeof discountCode !== "string" || discountCode.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "discountCode is required and must be a non-empty string",
      });
    }

    // Get user's cart
    const userEmail = req.user?.email || null;
    const userCart = await getOrCreateUserCart(userId, userEmail);

    // Get current discount codes first to preserve existing ones
    const currentCart = await getCartWithDiscounts(userCart.cartId);
    const existingCodes = currentCart?.discounts?.codes?.map(c => c.code) || [];
    
    // Add the new code if it doesn't already exist
    const normalizedNewCode = discountCode.trim().toUpperCase();
    const hasCode = existingCodes.some(c => c.toUpperCase() === normalizedNewCode);
    
    const codesToApply = hasCode ? existingCodes : [...existingCodes, discountCode.trim()];

    const result = await applyDiscountCodes(userCart.cartId, codesToApply);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Failed to apply discount code",
        errors: result.errors,
        data: result.cart,
      });
    }

    // Check if the code is applicable
    const appliedCode = result.cart.discounts.codes.find(
      c => c.code.toUpperCase() === normalizedNewCode
    );

    return res.status(200).json({
      success: true,
      message: appliedCode?.applicable 
        ? "Discount code applied successfully" 
        : "Discount code added but not applicable to current cart",
      applicable: appliedCode?.applicable || false,
      data: result.cart,
    });
  } catch (error) {
    console.error("Error applying discount code to user cart:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to apply discount code",
      error: error.message,
    });
  }
});

/**
 * DELETE /discounts/user/:userId/remove
 * Remove all discount codes from user's cart
 */
router.delete("/user/:userId/remove", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    // Get user's cart
    const userEmail = req.user?.email || null;
    const userCart = await getOrCreateUserCart(userId, userEmail);

    const result = await removeDiscountCodes(userCart.cartId);

    return res.status(200).json({
      success: true,
      message: "Discount codes removed successfully",
      data: result.cart,
    });
  } catch (error) {
    console.error("Error removing discount codes from user cart:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to remove discount codes",
      error: error.message,
    });
  }
});

/**
 * DELETE /discounts/user/:userId/remove-single
 * Remove a specific discount code from user's cart
 */
router.delete("/user/:userId/remove-single", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { discountCode } = req.body;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    if (!discountCode || typeof discountCode !== "string" || discountCode.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "discountCode is required and must be a non-empty string",
      });
    }

    // Get user's cart
    const userEmail = req.user?.email || null;
    const userCart = await getOrCreateUserCart(userId, userEmail);

    // Get current discount codes
    const currentCart = await getCartWithDiscounts(userCart.cartId);
    const existingCodes = currentCart?.discounts?.codes?.map(c => c.code) || [];

    // Remove the specified code (case-insensitive)
    const normalizedCodeToRemove = discountCode.trim().toUpperCase();
    const remainingCodes = existingCodes.filter(
      c => c.toUpperCase() !== normalizedCodeToRemove
    );

    const result = await applyDiscountCodes(userCart.cartId, remainingCodes);

    return res.status(200).json({
      success: true,
      message: "Discount code removed successfully",
      data: result.cart,
    });
  } catch (error) {
    console.error("Error removing discount code from user cart:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to remove discount code",
      error: error.message,
    });
  }
});

/**
 * GET /discounts/user/:userId
 * Get user's cart with detailed discount information
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

    // Get user's cart
    const userEmail = req.user?.email || null;
    const userCart = await getOrCreateUserCart(userId, userEmail);

    const cart = await getCartWithDiscounts(userCart.cartId);

    return res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error("Error getting user cart with discounts:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to get user cart with discounts",
      error: error.message,
    });
  }
});

/**
 * GET /discounts/user/:userId/automatic
 * Get automatic discounts applied to user's cart
 */
router.get("/user/:userId/automatic", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    // Get user's cart
    const userEmail = req.user?.email || null;
    const userCart = await getOrCreateUserCart(userId, userEmail);

    const result = await getAutomaticDiscounts(userCart.cartId);

    return res.status(200).json({
      success: true,
      message: "Automatic discounts retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error getting automatic discounts for user cart:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to get automatic discounts",
      error: error.message,
    });
  }
});

module.exports = router;
