const express = require("express");
const router = express.Router();
const shopify = require("../config/shopify");

// GET all products
router.get("/", async (req, res) => {
  try {
    const response = await shopify.get("/products.json");

    res.status(200).json({
      success: true,
      count: response.data.products.length,
      products: response.data.products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;
