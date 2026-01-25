const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
  getCustomerWithMetafields,
  updateCustomer,
  formatCustomerResponse,
} = require("../utils/customerService");

/**
 * GET /user/:userId
 * Get all details of a user by their ID
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

    // Get customer from Shopify with metafields
    const customer = await getCustomerWithMetafields(userId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Format and return customer data
    const formattedCustomer = formatCustomerResponse(customer);

    return res.status(200).json({
      success: true,
      data: formattedCustomer,
    });
  } catch (error) {
    console.error("Error fetching user details:", error.message);

    // Handle Shopify API errors
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
      error: error.message,
    });
  }
});

/**
 * PUT /user/:userId
 * Update user details by their ID
 */
router.put("/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, phone, metafields } = req.body;

    // Validate userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    // Check if at least one field is provided for update
    const hasBasicFields = firstName || lastName || email || phone;
    const hasMetafields = metafields && Array.isArray(metafields) && metafields.length > 0;

    if (!hasBasicFields && !hasMetafields) {
      return res.status(400).json({
        success: false,
        message: "At least one field (firstName, lastName, email, phone) or metafields is required for update",
      });
    }

    // Validate metafields format if provided
    if (hasMetafields) {
      for (const metafield of metafields) {
        if (!metafield.key || metafield.value === undefined) {
          return res.status(400).json({
            success: false,
            message: "Each metafield must have 'key' and 'value' properties",
          });
        }
      }
    }

    // Build update data object
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (hasMetafields) updateData.metafields = metafields;

    // Update customer in Shopify
    const updatedCustomer = await updateCustomer(userId, updateData);

    // Format and return updated customer data
    const formattedCustomer = formatCustomerResponse(updatedCustomer);

    return res.status(200).json({
      success: true,
      message: "User details updated successfully",
      data: formattedCustomer,
    });
  } catch (error) {
    console.error("Error updating user details:", error.message);

    // Handle Shopify API errors
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (error.response?.status === 422) {
      return res.status(422).json({
        success: false,
        message: "Invalid data provided",
        errors: error.response?.data?.errors || null,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update user details",
      error: error.message,
    });
  }
});

module.exports = router;
