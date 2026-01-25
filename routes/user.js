const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
  getCustomerWithMetafields,
  updateCustomer,
  addCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultAddress,
  formatCustomerResponse,
  formatAddress,
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

// ==================== ADDRESS MANAGEMENT ====================

/**
 * POST /user/:userId/address
 * Add a new address for the user
 */
router.post("/:userId/address", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, company, address1, address2, city, province, country, zip, phone, isDefault } = req.body;

    // Validate userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    // Validate required fields
    if (!address1 || !city || !country) {
      return res.status(400).json({
        success: false,
        message: "address1, city, and country are required fields",
      });
    }

    const addressData = {
      firstName,
      lastName,
      company,
      address1,
      address2,
      city,
      province,
      country,
      zip,
      phone,
      isDefault,
    };

    const newAddress = await addCustomerAddress(userId, addressData);
    const formattedAddress = formatAddress(newAddress);

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: formattedAddress,
    });
  } catch (error) {
    console.error("Error adding address:", error.message);

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (error.response?.status === 422) {
      return res.status(422).json({
        success: false,
        message: "Invalid address data provided",
        errors: error.response?.data?.errors || null,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to add address",
      error: error.message,
    });
  }
});

/**
 * PUT /user/:userId/address/:addressId
 * Update an existing address
 */
router.put("/:userId/address/:addressId", verifyToken, async (req, res) => {
  try {
    const { userId, addressId } = req.params;
    const { firstName, lastName, company, address1, address2, city, province, country, zip, phone, isDefault } = req.body;

    // Validate userId and addressId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    if (!addressId || isNaN(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID provided",
      });
    }

    // Check if at least one field is provided
    const hasFields = firstName !== undefined || lastName !== undefined || company !== undefined ||
                      address1 !== undefined || address2 !== undefined || city !== undefined ||
                      province !== undefined || country !== undefined || zip !== undefined ||
                      phone !== undefined || isDefault !== undefined;

    if (!hasFields) {
      return res.status(400).json({
        success: false,
        message: "At least one address field is required for update",
      });
    }

    const addressData = {
      firstName,
      lastName,
      company,
      address1,
      address2,
      city,
      province,
      country,
      zip,
      phone,
      isDefault,
    };

    const updatedAddress = await updateCustomerAddress(userId, addressId, addressData);
    const formattedAddress = formatAddress(updatedAddress);

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: formattedAddress,
    });
  } catch (error) {
    console.error("Error updating address:", error.message);

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "User or address not found",
      });
    }

    if (error.response?.status === 422) {
      return res.status(422).json({
        success: false,
        message: "Invalid address data provided",
        errors: error.response?.data?.errors || null,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update address",
      error: error.message,
    });
  }
});

/**
 * DELETE /user/:userId/address/:addressId
 * Delete an address
 */
router.delete("/:userId/address/:addressId", verifyToken, async (req, res) => {
  try {
    const { userId, addressId } = req.params;

    // Validate userId and addressId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    if (!addressId || isNaN(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID provided",
      });
    }

    await deleteCustomerAddress(userId, addressId);

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting address:", error.message);

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "User or address not found",
      });
    }

    if (error.response?.status === 422) {
      return res.status(422).json({
        success: false,
        message: "Cannot delete the default address",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete address",
      error: error.message,
    });
  }
});

/**
 * PUT /user/:userId/address/:addressId/default
 * Set an address as the default address
 */
router.put("/:userId/address/:addressId/default", verifyToken, async (req, res) => {
  try {
    const { userId, addressId } = req.params;

    // Validate userId and addressId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID provided",
      });
    }

    if (!addressId || isNaN(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID provided",
      });
    }

    const updatedAddress = await setDefaultAddress(userId, addressId);
    const formattedAddress = formatAddress(updatedAddress);

    return res.status(200).json({
      success: true,
      message: "Default address updated successfully",
      data: formattedAddress,
    });
  } catch (error) {
    console.error("Error setting default address:", error.message);

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "User or address not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to set default address",
      error: error.message,
    });
  }
});

module.exports = router;
