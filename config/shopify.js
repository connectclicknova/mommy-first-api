const axios = require("axios");

// Shopify Storefront API configuration
const storefrontAPI = axios.create({
  baseURL: `https://${process.env.SHOPIFY_STORE_URL}/api/2025-01/graphql.json`,
  headers: {
    "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
    "Content-Type": "application/json",
  },
});

module.exports = storefrontAPI;
