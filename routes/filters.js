const express = require("express");
const router = express.Router();
const storefrontAPI = require("../config/shopify");
const verifyToken = require("../middleware/auth");
const axios = require("axios");

// Admin API instance for fetching metafields
const adminAPI = axios.create({
  baseURL: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01`,
  headers: {
    "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    "Content-Type": "application/json",
  },
});

/**
 * GET /filter/:collectionHandle
 * Fetch filtered products from a collection
 * Query params for filters:
 *   - price_min: minimum price
 *   - price_max: maximum price
 *   - vendor: product vendor (comma-separated for multiple)
 *   - product_type: product type (comma-separated for multiple)
 *   - tag: product tag (comma-separated for multiple)
 *   - available: true/false for availability
 *   - color: color option filter (comma-separated for multiple)
 *   - size: size option filter (comma-separated for multiple)
 *   - option: custom variant option in format "name:value" (comma-separated for multiple)
 *   - sort: BEST_SELLING, CREATED, CREATED_DESC, PRICE, PRICE_DESC, TITLE, TITLE_DESC, RELEVANCE, MANUAL
 *   - limit: number of products (default 24)
 *   - after: cursor for pagination
 *   - before: cursor for previous page pagination
 * Requires Bearer token
 */
router.get("/:collectionHandle", verifyToken, async (req, res) => {
  try {
    const { collectionHandle } = req.params;
    const {
      price_min,
      price_max,
      vendor,
      product_type,
      tag,
      available,
      color,
      size,
      option,
      sort = "BEST_SELLING",
      limit = 24,
      after,
      before,
    } = req.query;

    // Build filter array for Shopify
    const filters = [];

    // Price filter
    if (price_min || price_max) {
      const priceFilter = { price: {} };
      if (price_min) priceFilter.price.min = parseFloat(price_min);
      if (price_max) priceFilter.price.max = parseFloat(price_max);
      filters.push(priceFilter);
    }

    // Availability filter
    if (available !== undefined) {
      filters.push({ available: available === "true" });
    }

    // Vendor filter (can be multiple comma-separated)
    if (vendor) {
      const vendors = vendor.split(",").map((v) => v.trim());
      vendors.forEach((v) => {
        filters.push({ productVendor: v });
      });
    }

    // Product type filter (can be multiple comma-separated)
    if (product_type) {
      const types = product_type.split(",").map((t) => t.trim());
      types.forEach((t) => {
        filters.push({ productType: t });
      });
    }

    // Tag filter (can be multiple comma-separated)
    if (tag) {
      const tags = tag.split(",").map((t) => t.trim());
      tags.forEach((t) => {
        filters.push({ tag: t });
      });
    }

    // Color variant option filter
    if (color) {
      const colors = color.split(",").map((c) => c.trim());
      colors.forEach((c) => {
        filters.push({ variantOption: { name: "Color", value: c } });
      });
    }

    // Size variant option filter
    if (size) {
      const sizes = size.split(",").map((s) => s.trim());
      sizes.forEach((s) => {
        filters.push({ variantOption: { name: "Size", value: s } });
      });
    }

    // Custom variant option filter (format: "name:value")
    if (option) {
      const options = option.split(",").map((o) => o.trim());
      options.forEach((o) => {
        const [name, value] = o.split(":").map((p) => p.trim());
        if (name && value) {
          filters.push({ variantOption: { name, value } });
        }
      });
    }

    console.log(`Filtering collection "${collectionHandle}" with filters:`, JSON.stringify(filters));
    console.log(`Sort: ${sort}`);

    const query = `
      query getFilteredProducts(
        $handle: String!
        $first: Int!
        $after: String
        $filters: [ProductFilter!]
        $sortKey: ProductCollectionSortKeys!
        $reverse: Boolean
      ) {
        collection(handle: $handle) {
          id
          title
          handle
          description
          image {
            url
            altText
          }
          products(
            first: $first
            after: $after
            filters: $filters
            sortKey: $sortKey
            reverse: $reverse
          ) {
            filters {
              id
              label
              type
              values {
                id
                label
                count
                input
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
                title
                handle
                vendor
                productType
                tags
                availableForSale
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
                  maxVariantPrice {
                    amount
                    currencyCode
                  }
                }
                images(first: 5) {
                  nodes {
                    url
                    altText
                  }
                }
                variants(first: 10) {
                  nodes {
                    id
                    title
                    availableForSale
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    // Determine sort key and direction
    const sortMapping = {
      BEST_SELLING: { key: "BEST_SELLING", reverse: false },
      CREATED: { key: "CREATED", reverse: false },
      CREATED_DESC: { key: "CREATED", reverse: true },
      PRICE: { key: "PRICE", reverse: false },
      PRICE_DESC: { key: "PRICE", reverse: true },
      TITLE: { key: "TITLE", reverse: false },
      TITLE_DESC: { key: "TITLE", reverse: true },
      RELEVANCE: { key: "RELEVANCE", reverse: false },
      MANUAL: { key: "MANUAL", reverse: false },
    };

    const sortConfig = sortMapping[sort.toUpperCase()] || sortMapping.BEST_SELLING;

    const variables = {
      handle: collectionHandle,
      first: parseInt(limit),
      after: after || null,
      filters: filters.length > 0 ? filters : null,
      sortKey: sortConfig.key,
      reverse: sortConfig.reverse,
    };

    const response = await storefrontAPI.post("", { query, variables });

    if (response.data.errors) {
      console.error("GraphQL errors:", response.data.errors);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch filtered products",
        errors: response.data.errors,
      });
    }

    const collection = response.data.data.collection;

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    const products = collection.products.edges.map((edge) => edge.node);
    const availableFilters = collection.products.filters || [];
    const pageInfo = collection.products.pageInfo;

    res.json({
      success: true,
      collection: {
        id: collection.id,
        title: collection.title,
        handle: collection.handle,
        description: collection.description,
        image: collection.image,
      },
      totalProducts: products.length,
      pageInfo: pageInfo,
      availableFilters: availableFilters,
      appliedFilters: {
        price_min: price_min || null,
        price_max: price_max || null,
        vendor: vendor || null,
        product_type: product_type || null,
        tag: tag || null,
        available: available || null,
        color: color || null,
        size: size || null,
        option: option || null,
        sort: sort,
      },
      data: products,
    });
  } catch (error) {
    console.error("Error fetching filtered products:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch filtered products",
      error: error.message,
    });
  }
});

module.exports = router;
