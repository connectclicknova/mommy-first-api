const axios = require("axios");

/**
 * Get Shopify Admin API instance
 */
const getAdminAPI = () => {
  return axios.create({
    baseURL: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01`,
    headers: {
      "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
      "Content-Type": "application/json",
    },
  });
};

/**
 * Fetch all orders for a customer with metafields
 * @param {string} customerId - The customer ID
 * @param {object} options - Pagination options
 * @returns {Promise<object>} - Orders data with metafields
 */
async function getCustomerOrders(customerId, options = {}) {
  try {
    const adminAPI = getAdminAPI();
    const { limit = 50, status = "any", fields = "" } = options;

    // Fetch orders for the customer
    const response = await adminAPI.get(`/customers/${customerId}/orders.json`, {
      params: {
        status,
        limit,
        fields,
      },
    });

    const orders = response.data.orders || [];

    // Fetch metafields for each order
    const ordersWithMetafields = await Promise.all(
      orders.map(async (order) => {
        const metafields = await getOrderMetafields(order.id);
        return {
          ...order,
          metafields,
        };
      })
    );

    return ordersWithMetafields;
  } catch (error) {
    console.error("Error fetching customer orders:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fetch a single order by ID with all details including metafields
 * @param {string} orderId - The order ID
 * @returns {Promise<object>} - Order data with metafields
 */
async function getOrderById(orderId) {
  try {
    const adminAPI = getAdminAPI();

    // Fetch order details
    const response = await adminAPI.get(`/orders/${orderId}.json`);
    const order = response.data.order;

    if (!order) {
      return null;
    }

    // Fetch metafields for the order
    const metafields = await getOrderMetafields(orderId);

    // Fetch line item metafields and product details
    const lineItemsWithDetails = await Promise.all(
      (order.line_items || []).map(async (lineItem) => {
        const lineItemMetafields = await getLineItemMetafields(lineItem.id);
        const productDetails = lineItem.product_id 
          ? await getProductDetails(lineItem.product_id) 
          : null;
        
        return {
          ...lineItem,
          metafields: lineItemMetafields,
          product_details: productDetails,
        };
      })
    );

    return {
      ...order,
      metafields,
      line_items: lineItemsWithDetails,
    };
  } catch (error) {
    console.error("Error fetching order by ID:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fetch metafields for an order
 * @param {string} orderId - The order ID
 * @returns {Promise<array>} - Array of metafields
 */
async function getOrderMetafields(orderId) {
  try {
    const adminAPI = getAdminAPI();
    const response = await adminAPI.get(`/orders/${orderId}/metafields.json`);
    return response.data.metafields || [];
  } catch (error) {
    console.error(`Error fetching metafields for order ${orderId}:`, error.response?.data || error.message);
    return [];
  }
}

/**
 * Fetch metafields for a line item
 * @param {string} lineItemId - The line item ID
 * @returns {Promise<array>} - Array of metafields
 */
async function getLineItemMetafields(lineItemId) {
  try {
    const adminAPI = getAdminAPI();
    const response = await adminAPI.get(`/line_items/${lineItemId}/metafields.json`);
    return response.data.metafields || [];
  } catch (error) {
    // Line items might not have metafields, so we just return empty array
    return [];
  }
}

/**
 * Fetch complete product details from Admin API
 * @param {string} productId - The product ID
 * @returns {Promise<object|null>} - Product details with metafields
 */
async function getProductDetails(productId) {
  try {
    const adminAPI = getAdminAPI();
    
    // Fetch product details
    const productResponse = await adminAPI.get(`/products/${productId}.json`);
    const product = productResponse.data.product;

    if (!product) {
      return null;
    }

    // Fetch product metafields
    const productMetafields = await getProductMetafields(productId);

    // Fetch variant metafields for all variants
    const variantsWithMetafields = await Promise.all(
      (product.variants || []).map(async (variant) => {
        const variantMetafields = await getVariantMetafields(variant.id);
        return {
          ...variant,
          metafields: variantMetafields,
        };
      })
    );

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      body_html: product.body_html,
      vendor: product.vendor,
      product_type: product.product_type,
      created_at: product.created_at,
      updated_at: product.updated_at,
      published_at: product.published_at,
      status: product.status,
      tags: product.tags,
      images: product.images || [],
      options: product.options || [],
      variants: variantsWithMetafields,
      metafields: productMetafields,
    };
  } catch (error) {
    console.error(`Error fetching product details for product ${productId}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Fetch metafields for a product
 * @param {string} productId - The product ID
 * @returns {Promise<array>} - Array of metafields
 */
async function getProductMetafields(productId) {
  try {
    const adminAPI = getAdminAPI();
    const response = await adminAPI.get(`/products/${productId}/metafields.json`);
    return response.data.metafields || [];
  } catch (error) {
    console.error(`Error fetching metafields for product ${productId}:`, error.response?.data || error.message);
    return [];
  }
}

/**
 * Fetch metafields for a variant
 * @param {string} variantId - The variant ID
 * @returns {Promise<array>} - Array of metafields
 */
async function getVariantMetafields(variantId) {
  try {
    const adminAPI = getAdminAPI();
    const response = await adminAPI.get(`/variants/${variantId}/metafields.json`);
    return response.data.metafields || [];
  } catch (error) {
    // Variants might not have metafields, so we just return empty array
    return [];
  }
}

/**
 * Format order response
 * @param {object} order - Raw order object
 * @returns {object} - Formatted order object
 */
function formatOrderResponse(order) {
  return {
    id: order.id,
    order_number: order.order_number,
    name: order.name,
    email: order.email,
    created_at: order.created_at,
    updated_at: order.updated_at,
    cancelled_at: order.cancelled_at,
    closed_at: order.closed_at,
    processed_at: order.processed_at,
    currency: order.currency,
    total_price: order.total_price,
    subtotal_price: order.subtotal_price,
    total_tax: order.total_tax,
    total_discounts: order.total_discounts,
    total_shipping: order.total_shipping_price_set?.shop_money?.amount,
    financial_status: order.financial_status,
    fulfillment_status: order.fulfillment_status,
    tags: order.tags,
    note: order.note,
    customer: {
      id: order.customer?.id,
      email: order.customer?.email,
      first_name: order.customer?.first_name,
      last_name: order.customer?.last_name,
      phone: order.customer?.phone,
    },
    billing_address: order.billing_address,
    shipping_address: order.shipping_address,
    line_items: order.line_items?.map((item) => ({
      id: item.id,
      variant_id: item.variant_id,
      product_id: item.product_id,
      title: item.title,
      variant_title: item.variant_title,
      quantity: item.quantity,
      price: item.price,
      sku: item.sku,
      grams: item.grams,
      vendor: item.vendor,
      fulfillment_status: item.fulfillment_status,
      requires_shipping: item.requires_shipping,
      taxable: item.taxable,
      gift_card: item.gift_card,
      name: item.name,
      properties: item.properties,
      metafields: item.metafields || [],
      product_details: item.product_details || null,
    })),
    shipping_lines: order.shipping_lines,
    tax_lines: order.tax_lines,
    discount_codes: order.discount_codes,
    discount_applications: order.discount_applications,
    fulfillments: order.fulfillments,
    refunds: order.refunds,
    metafields: order.metafields || [],
  };
}

/**
 * Format orders list response
 * @param {array} orders - Array of raw order objects
 * @returns {array} - Array of formatted order objects (summary)
 */
function formatOrdersListResponse(orders) {
  return orders.map((order) => ({
    id: order.id,
    order_number: order.order_number,
    name: order.name,
    email: order.email,
    created_at: order.created_at,
    updated_at: order.updated_at,
    currency: order.currency,
    total_price: order.total_price,
    subtotal_price: order.subtotal_price,
    financial_status: order.financial_status,
    fulfillment_status: order.fulfillment_status,
    items_count: order.line_items?.length || 0,
    customer: {
      id: order.customer?.id,
      first_name: order.customer?.first_name,
      last_name: order.customer?.last_name,
    },
    metafields: order.metafields || [],
  }));
}

module.exports = {
  getCustomerOrders,
  getOrderById,
  getOrderMetafields,
  getProductDetails,
  getProductMetafields,
  getVariantMetafields,
  getLineItemMetafields,
  formatOrderResponse,
  formatOrdersListResponse,
};
