const axios = require("axios");

// Lazy initialization of Shopify Admin API
let adminAPI = null;

const getAdminAPI = () => {
  if (!adminAPI) {
    adminAPI = axios.create({
      baseURL: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01`,
      headers: {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
    });
  }
  return adminAPI;
};

/**
 * Find customer by email
 * @param {string} email - Customer email
 * @param {boolean} includeMetafields - Whether to fetch metafields
 * @returns {Object|null} - Customer object or null if not found
 */
async function findCustomerByEmail(email, includeMetafields = true) {
  try {
    const response = await getAdminAPI().get("/customers/search.json", {
      params: {
        query: `email:${email}`,
      },
    });

    const customers = response.data.customers;
    if (customers && customers.length > 0) {
      const customer = customers[0];
      if (includeMetafields && customer.id) {
        customer.metafields = await getCustomerMetafields(customer.id);
      }
      return customer;
    }
    return null;
  } catch (error) {
    console.error("Error finding customer by email:", error.message);
    throw error;
  }
}

/**
 * Find customer by phone number
 * @param {string} phone - Customer phone number
 * @param {boolean} includeMetafields - Whether to fetch metafields
 * @returns {Object|null} - Customer object or null if not found
 */
async function findCustomerByPhone(phone, includeMetafields = true) {
  try {
    const response = await getAdminAPI().get("/customers/search.json", {
      params: {
        query: `phone:${phone}`,
      },
    });

    const customers = response.data.customers;
    if (customers && customers.length > 0) {
      const customer = customers[0];
      if (includeMetafields && customer.id) {
        customer.metafields = await getCustomerMetafields(customer.id);
      }
      return customer;
    }
    return null;
  } catch (error) {
    console.error("Error finding customer by phone:", error.message);
    throw error;
  }
}

/**
 * Create a new customer in Shopify
 * @param {Object} customerData - Customer data
 * @param {string} customerData.email - Customer email (optional if phone provided)
 * @param {string} customerData.phone - Customer phone (optional if email provided)
 * @param {string} customerData.firstName - Customer first name (optional)
 * @param {string} customerData.lastName - Customer last name (optional)
 * @returns {Object} - Created customer object
 */
async function createCustomer(customerData) {
  try {
    const { email, phone, firstName, lastName } = customerData;

    const customer = {
      customer: {
        email: email || undefined,
        phone: phone || undefined,
        first_name: firstName || "",
        last_name: lastName || "",
        verified_email: !!email,
        send_email_welcome: false,
      },
    };

    // Remove undefined fields
    Object.keys(customer.customer).forEach((key) => {
      if (customer.customer[key] === undefined) {
        delete customer.customer[key];
      }
    });

    const response = await getAdminAPI().post("/customers.json", customer);
    return response.data.customer;
  } catch (error) {
    console.error("Error creating customer:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get customer by ID
 * @param {number} customerId - Shopify customer ID
 * @returns {Object} - Customer object
 */
async function getCustomerById(customerId) {
  try {
    const response = await getAdminAPI().get(`/customers/${customerId}.json`);
    return response.data.customer;
  } catch (error) {
    console.error("Error getting customer by ID:", error.message);
    throw error;
  }
}

/**
 * Get customer metafields
 * @param {number} customerId - Shopify customer ID
 * @returns {Array} - Array of metafield objects
 */
async function getCustomerMetafields(customerId) {
  try {
    const response = await getAdminAPI().get(`/customers/${customerId}/metafields.json`);
    return response.data.metafields || [];
  } catch (error) {
    console.error("Error getting customer metafields:", error.message);
    return [];
  }
}

/**
 * Get customer with metafields
 * @param {number} customerId - Shopify customer ID
 * @returns {Object} - Customer object with metafields
 */
async function getCustomerWithMetafields(customerId) {
  try {
    const [customer, metafields] = await Promise.all([
      getCustomerById(customerId),
      getCustomerMetafields(customerId),
    ]);
    customer.metafields = metafields;
    return customer;
  } catch (error) {
    console.error("Error getting customer with metafields:", error.message);
    throw error;
  }
}

/**
 * Update customer details
 * @param {number} customerId - Shopify customer ID
 * @param {Object} updateData - Data to update
 * @returns {Object} - Updated customer object
 */
async function updateCustomer(customerId, updateData) {
  try {
    const { firstName, lastName, email, phone } = updateData;

    const customer = {
      customer: {
        id: customerId,
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
      },
    };

    // Remove undefined fields
    Object.keys(customer.customer).forEach((key) => {
      if (customer.customer[key] === undefined) {
        delete customer.customer[key];
      }
    });

    const response = await getAdminAPI().put(`/customers/${customerId}.json`, customer);
    return response.data.customer;
  } catch (error) {
    console.error("Error updating customer:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Find or create customer by email
 * @param {string} email - Customer email
 * @param {string} firstName - Customer first name (optional)
 * @param {string} lastName - Customer last name (optional)
 * @returns {Object} - Customer object with isNewCustomer flag
 */
async function findOrCreateCustomerByEmail(email, firstName = "", lastName = "") {
  try {
    // Try to find existing customer
    let customer = await findCustomerByEmail(email);
    let isNewCustomer = false;

    if (!customer) {
      // Create new customer
      customer = await createCustomer({
        email,
        firstName,
        lastName,
      });
      isNewCustomer = true;
    }

    return {
      customer,
      isNewCustomer,
    };
  } catch (error) {
    console.error("Error in findOrCreateCustomerByEmail:", error.message);
    throw error;
  }
}

/**
 * Find or create customer by phone
 * @param {string} phone - Customer phone number
 * @param {string} firstName - Customer first name (optional)
 * @param {string} lastName - Customer last name (optional)
 * @returns {Object} - Customer object with isNewCustomer flag
 */
async function findOrCreateCustomerByPhone(phone, firstName = "", lastName = "") {
  try {
    // Try to find existing customer
    let customer = await findCustomerByPhone(phone);
    let isNewCustomer = false;

    if (!customer) {
      // Create new customer
      customer = await createCustomer({
        phone,
        firstName,
        lastName,
      });
      isNewCustomer = true;
    }

    return {
      customer,
      isNewCustomer,
    };
  } catch (error) {
    console.error("Error in findOrCreateCustomerByPhone:", error.message);
    throw error;
  }
}

/**
 * Format metafields for API response
 * @param {Array} metafields - Array of Shopify metafield objects
 * @returns {Object} - Formatted metafields as key-value pairs grouped by namespace
 */
function formatMetafields(metafields) {
  if (!metafields || metafields.length === 0) {
    return {};
  }

  const formatted = {};
  metafields.forEach((metafield) => {
    const namespace = metafield.namespace || "custom";
    if (!formatted[namespace]) {
      formatted[namespace] = {};
    }
    // Parse JSON values if the type is json or json_string
    let value = metafield.value;
    if (metafield.type === "json" || metafield.type === "json_string") {
      try {
        value = JSON.parse(metafield.value);
      } catch (e) {
        // Keep original value if parsing fails
      }
    }
    formatted[namespace][metafield.key] = {
      value: value,
      type: metafield.type,
      id: metafield.id,
    };
  });

  return formatted;
}

/**
 * Format customer data for API response
 * @param {Object} customer - Shopify customer object
 * @returns {Object} - Formatted customer object
 */
function formatCustomerResponse(customer) {
  return {
    id: customer.id,
    email: customer.email,
    phone: customer.phone,
    firstName: customer.first_name || "",
    lastName: customer.last_name || "",
    fullName: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
    ordersCount: customer.orders_count || 0,
    totalSpent: customer.total_spent || "0.00",
    verifiedEmail: customer.verified_email || false,
    acceptsMarketing: customer.accepts_marketing || false,
    defaultAddress: customer.default_address || null,
    metafields: formatMetafields(customer.metafields),
  };
}

module.exports = {
  findCustomerByEmail,
  findCustomerByPhone,
  createCustomer,
  getCustomerById,
  getCustomerMetafields,
  getCustomerWithMetafields,
  updateCustomer,
  findOrCreateCustomerByEmail,
  findOrCreateCustomerByPhone,
  formatCustomerResponse,
  formatMetafields,
};
