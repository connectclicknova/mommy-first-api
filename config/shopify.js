const axios = require("axios");

const shopify = axios.create({
  baseURL: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01`,
  headers: {
    "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
    "Content-Type": "application/json",
  },
});

module.exports = shopify;
