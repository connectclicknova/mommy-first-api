const storefrontAPI = require("../config/shopify");

/**
 * Create a customer access token (Login)
 * @param {string} email - Customer email
 * @param {string} password - Customer password
 * @returns {Object} - Result containing token or errors
 */
async function createCustomerAccessToken(email, password) {
    const mutation = `
    mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `;

    try {
        const response = await storefrontAPI.post("", {
            query: mutation,
            variables: {
                input: {
                    email,
                    password,
                },
            },
        });

        const result = response.data.data.customerAccessTokenCreate;

        if (result.customerUserErrors && result.customerUserErrors.length > 0) {
            return {
                success: false,
                errors: result.customerUserErrors,
            };
        }

        return {
            success: true,
            accessToken: result.customerAccessToken,
        };
    } catch (error) {
        console.error("Error creating customer access token:", error.message);
        throw error;
    }
}

/**
 * Create a customer access token using multipass token (Login)
 * @param {string} multipassToken - Multipass token
 * @returns {Object} - Result containing token or errors
 */
async function customerAccessTokenCreateWithMultipass(multipassToken) {
    const mutation = `
    mutation customerAccessTokenCreateWithMultipass($multipassToken: String!) {
  customerAccessTokenCreateWithMultipass(multipassToken: $multipassToken) {
    customerAccessToken {
      accessToken
      expiresAt
    }
    customerUserErrors {
      code
      field
      message
    }
  }
}

  `;

    try {
        const response = await storefrontAPI.post("", {
            query: mutation,
            variables: {
                multipassToken: multipassToken,
            },
        });
        const result = response.data.data.customerAccessTokenCreateWithMultipass;

        if (result.customerUserErrors && result.customerUserErrors.length > 0) {
            return {
                success: false,
                errors: result.customerUserErrors,
            };
        }

        return {
            success: true,
            accessToken: result.customerAccessToken,
        };
    } catch (error) {
        console.error("Error creating customer access token:", error.message);
        throw error;
    }
}

/**
 * Get customer data from a customer access token
 * @param {string} customerAccessToken - CustomerAccessToken
 * @returns {Object} - Result containing customer data or errors
 */
async function GetCustomerDataFromAccessToken(customerAccessToken) {
    const query = `{
        customer(customerAccessToken: "${customerAccessToken}") {
          id
          firstName
          lastName
          acceptsMarketing
          email
          phone
        }
    }
  `;

    try {
        const response = await storefrontAPI.post("", {
            query: query,
        });

        const result = response.data.data;

        if (result.customerUserErrors && result.customerUserErrors.length > 0) {
            return {
                success: false,
                errors: result.customerUserErrors,
            };
        }

        return result;
    } catch (error) {
        console.error("Error creating customer access token:", error.message);
        throw error;
    }
}

/**
 * Create a new customer (Register)
 * @param {Object} customerData - Customer data
 * @param {string} customerData.email - Customer email
 * @param {string} customerData.password - Customer password
 * @param {string} customerData.firstName - Customer first name
 * @param {string} customerData.lastName - Customer last name
 * @returns {Object} - Result containing customer or errors
 */
async function createCustomer(customerData) {
    const mutation = `
    mutation customerCreate($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
          firstName
          lastName
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `;

    try {
        const response = await storefrontAPI.post("", {
            query: mutation,
            variables: {
                input: {
                    email: customerData.email,
                    password: customerData.password,
                    firstName: customerData.firstName,
                    lastName: customerData.lastName,
                },
            },
        });

        const result = response.data.data.customerCreate;

        if (result.customerUserErrors && result.customerUserErrors.length > 0) {
            return {
                success: false,
                errors: result.customerUserErrors,
            };
        }

        return {
            success: true,
            customer: result.customer,
        };
    } catch (error) {
        console.error("Error creating customer:", error.message);
        throw error;
    }
}

module.exports = {
    createCustomerAccessToken,
    customerAccessTokenCreateWithMultipass,
    createCustomer,
    GetCustomerDataFromAccessToken
};
