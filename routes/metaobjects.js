const express = require("express");
const router = express.Router();
const axios = require("axios");
const verifyToken = require("../middleware/auth");

// Admin API instance (REST)
const adminAPI = axios.create({
  baseURL: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01`,
  headers: {
    "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    "Content-Type": "application/json",
  },
});

// Admin GraphQL API instance
const adminGraphQL = axios.create({
  baseURL: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01/graphql.json`,
  headers: {
    "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    "Content-Type": "application/json",
  },
});

// Storefront API for GraphQL queries
const storefrontAPI = require("../config/shopify");

/**
 * GET /metaobjects
 * Get list of all metaobject definitions (types)
 * Requires Bearer token
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const query = `
      query {
        metaobjectDefinitions(first: 50) {
          edges {
            node {
              id
              name
              type
              description
              fieldDefinitions {
                key
                name
                type {
                  name
                }
                required
                description
              }
            }
          }
        }
      }
    `;

    const response = await adminGraphQL.post("", { query });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const definitions = response.data.data.metaobjectDefinitions.edges.map(edge => edge.node);

    res.json({
      success: true,
      count: definitions.length,
      data: definitions,
    });
  } catch (error) {
    console.error("Error fetching metaobject definitions:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch metaobject definitions",
      error: error.message,
    });
  }
});

/**
 * GET /metaobjects/:type
 * Get all metaobjects of a specific type
 * Requires Bearer token
 * 
 * Example: GET /metaobjects/testimonials
 */
router.get("/:type", verifyToken, async (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const query = `
      query getMetaobjects($type: String!, $first: Int!) {
        metaobjects(type: $type, first: $first) {
          edges {
            node {
              id
              handle
              type
              updatedAt
              fields {
                key
                value
                type
                reference {
                  ... on MediaImage {
                    id
                    image {
                      url
                      altText
                      width
                      height
                    }
                  }
                  ... on Product {
                    id
                    title
                    handle
                  }
                  ... on Collection {
                    id
                    title
                    handle
                  }
                  ... on Page {
                    id
                    title
                    handle
                  }
                }
                references(first: 10) {
                  edges {
                    node {
                      ... on MediaImage {
                        id
                        image {
                          url
                          altText
                          width
                          height
                        }
                      }
                      ... on Product {
                        id
                        title
                        handle
                        featuredImage {
                          url
                          altText
                        }
                      }
                      ... on Collection {
                        id
                        title
                        handle
                      }
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
        }
      }
    `;

    const variables = {
      type: type,
      first: limit
    };

    const response = await storefrontAPI.post("", { query, variables });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const metaobjects = response.data.data.metaobjects.edges.map(edge => {
      const node = edge.node;
      
      // Transform fields into a more usable format
      const fields = {};
      node.fields.forEach(field => {
        if (field.reference) {
          // Single reference field
          fields[field.key] = {
            type: field.type,
            value: field.value,
            reference: field.reference
          };
        } else if (field.references && field.references.edges.length > 0) {
          // Multiple references field
          fields[field.key] = {
            type: field.type,
            value: field.value,
            references: field.references.edges.map(e => e.node)
          };
        } else {
          // Regular field
          fields[field.key] = {
            type: field.type,
            value: field.value
          };
        }
      });

      return {
        id: node.id,
        handle: node.handle,
        type: node.type,
        updatedAt: node.updatedAt,
        fields: fields
      };
    });

    res.json({
      success: true,
      type: type,
      count: metaobjects.length,
      pageInfo: response.data.data.metaobjects.pageInfo,
      data: metaobjects,
    });
  } catch (error) {
    console.error(`Error fetching metaobjects of type ${req.params.type}:`, error.message);
    if (error.response?.data) {
      console.error("GraphQL errors:", JSON.stringify(error.response.data, null, 2));
    }
    res.status(500).json({
      success: false,
      message: `Failed to fetch metaobjects of type ${req.params.type}`,
      error: error.message,
    });
  }
});

/**
 * GET /metaobjects/:type/:handle
 * Get a specific metaobject by type and handle
 * Requires Bearer token
 * 
 * Example: GET /metaobjects/testimonials/customer-review-1
 */
router.get("/:type/:handle", verifyToken, async (req, res) => {
  try {
    const { type, handle } = req.params;

    const query = `
      query getMetaobject($handle: MetaobjectHandleInput!) {
        metaobject(handle: $handle) {
          id
          handle
          type
          updatedAt
          displayName
          fields {
            key
            value
            type
            reference {
              ... on MediaImage {
                id
                image {
                  url
                  altText
                  width
                  height
                }
              }
              ... on Video {
                id
                sources {
                  url
                  mimeType
                  format
                  height
                  width
                }
              }
              ... on Product {
                id
                title
                handle
                description
                featuredImage {
                  url
                  altText
                  width
                  height
                }
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
              }
              ... on ProductVariant {
                id
                title
                price {
                  amount
                  currencyCode
                }
                product {
                  id
                  title
                  handle
                }
              }
              ... on Collection {
                id
                title
                handle
                description
                image {
                  url
                  altText
                }
              }
              ... on Page {
                id
                title
                handle
                body
              }
              ... on Metaobject {
                id
                handle
                type
                fields {
                  key
                  value
                  type
                }
              }
            }
            references(first: 20) {
              edges {
                node {
                  ... on MediaImage {
                    id
                    image {
                      url
                      altText
                      width
                      height
                    }
                  }
                  ... on Product {
                    id
                    title
                    handle
                    description
                    featuredImage {
                      url
                      altText
                      width
                      height
                    }
                    priceRange {
                      minVariantPrice {
                        amount
                        currencyCode
                      }
                    }
                  }
                  ... on Collection {
                    id
                    title
                    handle
                    description
                    image {
                      url
                      altText
                    }
                  }
                  ... on Page {
                    id
                    title
                    handle
                  }
                  ... on Metaobject {
                    id
                    handle
                    type
                    fields {
                      key
                      value
                      type
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      handle: {
        type: type,
        handle: handle
      }
    };

    const response = await storefrontAPI.post("", { query, variables });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const metaobject = response.data.data.metaobject;

    if (!metaobject) {
      return res.status(404).json({
        success: false,
        message: `Metaobject '${handle}' of type '${type}' not found`,
      });
    }

    // Transform fields into a more usable format
    const fields = {};
    metaobject.fields.forEach(field => {
      if (field.reference) {
        // Single reference field
        fields[field.key] = {
          type: field.type,
          value: field.value,
          reference: field.reference
        };
      } else if (field.references && field.references.edges.length > 0) {
        // Multiple references field (list)
        fields[field.key] = {
          type: field.type,
          value: field.value,
          references: field.references.edges.map(e => e.node)
        };
      } else {
        // Regular field (text, number, date, etc.)
        fields[field.key] = {
          type: field.type,
          value: field.value
        };
      }
    });

    const formattedMetaobject = {
      id: metaobject.id,
      handle: metaobject.handle,
      type: metaobject.type,
      displayName: metaobject.displayName,
      updatedAt: metaobject.updatedAt,
      fields: fields
    };

    res.json({
      success: true,
      data: formattedMetaobject,
    });
  } catch (error) {
    console.error(`Error fetching metaobject ${req.params.type}/${req.params.handle}:`, error.message);
    if (error.response?.data) {
      console.error("GraphQL errors:", JSON.stringify(error.response.data, null, 2));
    }
    res.status(500).json({
      success: false,
      message: `Failed to fetch metaobject`,
      error: error.message,
    });
  }
});

module.exports = router;
