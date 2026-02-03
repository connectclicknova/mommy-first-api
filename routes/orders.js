const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
  getCustomerOrders,
  getOrderById,
  formatOrderResponse,
  formatOrdersListResponse,
} = require("../utils/orderService");

/**
 * GET /orders/customer/:customerId
 * Get all orders for a specific customer with metafields
 */
router.get("/customer/:customerId", verifyToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit, status } = req.query;

    // Validate customerId
    if (!customerId || isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID provided",
      });
    }

    // Get customer orders with metafields
    const orders = await getCustomerOrders(customerId, {
      limit: limit ? parseInt(limit) : 50,
      status: status || "any",
    });

    // Format orders list
    const formattedOrders = formatOrdersListResponse(orders);

    return res.status(200).json({
      success: true,
      count: formattedOrders.length,
      data: formattedOrders,
    });
  } catch (error) {
    console.error("Error fetching customer orders:", error.message);

    // Handle Shopify API errors
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer orders",
      error: error.message,
    });
  }
});

/**
 * GET /orders/:orderId
 * Get detailed information of a specific order including all metafields
 */
router.get("/:orderId", verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Validate orderId
    if (!orderId || isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID provided",
      });
    }

    // Get order by ID with all details and metafields
    const order = await getOrderById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Format and return order data
    const formattedOrder = formatOrderResponse(order);

    return res.status(200).json({
      success: true,
      data: formattedOrder,
    });
  } catch (error) {
    console.error("Error fetching order details:", error.message);

    // Handle Shopify API errors
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order details",
      error: error.message,
    });
  }
});

module.exports = router;
