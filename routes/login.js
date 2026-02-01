const express = require("express");
const router = express.Router();
const descopeSdk = require("@descope/node-sdk");
const {
  findOrCreateCustomerByEmail,
  findOrCreateCustomerByPhone,
  formatCustomerResponse,
  customerAccessTokenCreateWithMultipass
} = require("../utils/customerService");
const Multipassify = require("multipassify");

// Helper: Login to Shopify Admin (returns session info or token)
async function loginToShopifyAdmin(email, phone) {
  // Example: fetch customer by email or phone, return customer and a mock session token
  try {
    let customer = null;
    if (email) {
      customer = await require("../utils/customerService").findCustomerByEmail(email, false);
    } else if (phone) {
      customer = await require("../utils/customerService").findCustomerByPhone(phone, false);
    }
    // You can add more logic here to generate a session token or fetch metafields, etc.
    return {
      shopifyAdminCustomer: customer,
      shopifyAdminSession: customer ? `shopify-session-for-${customer.id}` : null,
    };
  } catch (err) {
    return {
      shopifyAdminCustomer: null,
      shopifyAdminSession: null,
      shopifyAdminError: err.message,
    };
  }
}

// Initialize Descope client
const descopeClient = descopeSdk({
  projectId: process.env.DESCOPE_PROJECT_ID,
  managementKey: process.env.DESCOPE_MANAGEMENT_KEY,
});

// ==================== EMAIL OTP ====================

// Send OTP to email
router.post("/email/send", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const response = await descopeClient.otp.signUpOrIn.email(email);

    return res.status(200).json({
      success: true,
      message: "OTP sent to email successfully",
      maskedEmail: response.maskedEmail,
    });
  } catch (error) {
    console.error("Email OTP send error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send OTP to email",
    });
  }
});

// Verify email OTP
router.post("/email/verify", async (req, res) => {
  try {
    const { email, code, firstName, lastName } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and code are required",
      });
    }

    const response = await descopeClient.otp.verify.email(email, code);

    // Find or create customer in Shopify
    let customerData = null;
    let isNewCustomer = false;
    try {
      const result = await findOrCreateCustomerByEmail(email, firstName || "", lastName || "");
      customerData = formatCustomerResponse(result.customer);
      isNewCustomer = result.isNewCustomer;
    } catch (customerError) {
      console.error("Customer service error:", customerError.message);
      // Continue with login even if customer service fails
    }

    // Login to Shopify Admin
    const shopifyAdminLogin = await loginToShopifyAdmin(email, null);

    // login to shopify storefront using multipass
    var multipassify = new Multipassify(process.env.SHOPIFY_MULTIPASS_SECRET);
    // Create your customer data hash
    var shopifyCustomerData = { email: email };

    // Encode a Multipass token
    var token = multipassify.encode(shopifyCustomerData);

    const customerAccessToken = await customerAccessTokenCreateWithMultipass(token);

    return res.status(200).json({
      success: true,
      message: isNewCustomer ? "Account created successfully" : "Email verified successfully",
      sessionToken: response.data.sessionJwt,
      refreshToken: response.data.refreshJwt,
      user: response.data.user,
      customer: customerData,
      isNewCustomer,
      shopifyAdmin: shopifyAdminLogin,
      shopifyCustomerAccessToken: customerAccessToken?.accessToken?.accessToken,
    });
  } catch (error) {
    console.error("Email OTP verify error:", error);
    return res.status(401).json({
      success: false,
      message: error.message || "Invalid or expired OTP",
    });
  }
});

// ==================== MOBILE OTP ====================

// Send OTP to mobile
router.post("/mobile/send", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const response = await descopeClient.otp.signUpOrIn.sms(phone);

    return res.status(200).json({
      success: true,
      message: "OTP sent to mobile successfully",
      maskedPhone: response.maskedPhone,
    });
  } catch (error) {
    console.error("Mobile OTP send error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send OTP to mobile",
    });
  }
});

// Verify mobile OTP
router.post("/mobile/verify", async (req, res) => {
  try {
    const { phone, code, firstName, lastName } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: "Phone number and code are required",
      });
    }

    const response = await descopeClient.otp.verify.sms(phone, code);

    // Find or create customer in Shopify
    let customerData = null;
    let isNewCustomer = false;
    try {
      const result = await findOrCreateCustomerByPhone(phone, firstName || "", lastName || "");
      customerData = formatCustomerResponse(result.customer);
      isNewCustomer = result.isNewCustomer;
    } catch (customerError) {
      console.error("Customer service error:", customerError.message);
      // Continue with login even if customer service fails
    }

    // Login to Shopify Admin
    const shopifyAdminLogin = await loginToShopifyAdmin(null, phone);

    return res.status(200).json({
      success: true,
      message: isNewCustomer ? "Account created successfully" : "Mobile verified successfully",
      sessionToken: response.data.sessionJwt,
      refreshToken: response.data.refreshJwt,
      user: response.data.user,
      customer: customerData,
      isNewCustomer,
      shopifyAdmin: shopifyAdminLogin
    });
  } catch (error) {
    console.error("Mobile OTP verify error:", error);
    return res.status(401).json({
      success: false,
      message: error.message || "Invalid or expired OTP",
    });
  }
});

// ==================== GOOGLE OAuth ====================

// Start Google OAuth flow
router.post("/google/start", async (req, res) => {
  try {
    const { redirectUrl } = req.body;

    if (!redirectUrl) {
      return res.status(400).json({
        success: false,
        message: "Redirect URL is required",
      });
    }

    const response = await descopeClient.oauth.start.google(redirectUrl);

    return res.status(200).json({
      success: true,
      message: "Google OAuth started",
      authUrl: response.data.url,
    });
  } catch (error) {
    console.error("Google OAuth start error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to start Google OAuth",
    });
  }
});

// Exchange Google OAuth code
router.post("/google/exchange", async (req, res) => {
  try {
    const { code, firstName, lastName } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code is required",
      });
    }

    const response = await descopeClient.oauth.exchange(code);

    // Get email from Descope user data
    const userEmail = response.data.user?.email;

    // Find or create customer in Shopify
    let customerData = null;
    let isNewCustomer = false;
    if (userEmail) {
      try {
        const descopeName = response.data.user?.name || "";
        const [descopeFirstName, ...descopeLastNameParts] = descopeName.split(" ");
        const result = await findOrCreateCustomerByEmail(
          userEmail,
          firstName || descopeFirstName || "",
          lastName || descopeLastNameParts.join(" ") || ""
        );
        customerData = formatCustomerResponse(result.customer);
        isNewCustomer = result.isNewCustomer;
      } catch (customerError) {
        console.error("Customer service error:", customerError.message);
      }
    }

    // Login to Shopify Admin
    const shopifyAdminLogin = await loginToShopifyAdmin(userEmail, null);

    return res.status(200).json({
      success: true,
      message: isNewCustomer ? "Account created successfully" : "Google login successful",
      sessionToken: response.data.sessionJwt,
      refreshToken: response.data.refreshJwt,
      user: response.data.user,
      customer: customerData,
      isNewCustomer,
      shopifyAdmin: shopifyAdminLogin,
    });
  } catch (error) {
    console.error("Google OAuth exchange error:", error);
    return res.status(401).json({
      success: false,
      message: error.message || "Failed to complete Google login",
    });
  }
});

// ==================== FACEBOOK OAuth ====================

// Start Facebook OAuth flow
router.post("/facebook/start", async (req, res) => {
  try {
    const { redirectUrl } = req.body;

    if (!redirectUrl) {
      return res.status(400).json({
        success: false,
        message: "Redirect URL is required",
      });
    }

    const response = await descopeClient.oauth.start.facebook(redirectUrl);

    return res.status(200).json({
      success: true,
      message: "Facebook OAuth started",
      authUrl: response.data.url,
    });
  } catch (error) {
    console.error("Facebook OAuth start error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to start Facebook OAuth",
    });
  }
});

// Exchange Facebook OAuth code
router.post("/facebook/exchange", async (req, res) => {
  try {
    const { code, firstName, lastName } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code is required",
      });
    }

    const response = await descopeClient.oauth.exchange(code);

    // Get email and phone from Descope user data
    const userEmail = response.data.user?.email;
    const userPhone = response.data.user?.phone;

    // Find or create customer in Shopify
    let customerData = null;
    let isNewCustomer = false;

    // Get name from Descope response
    const descopeName = response.data.user?.name || "";
    const [descopeFirstName, ...descopeLastNameParts] = descopeName.split(" ");
    const finalFirstName = firstName || descopeFirstName || "";
    const finalLastName = lastName || descopeLastNameParts.join(" ") || "";

    try {
      if (userEmail) {
        // If email is available, use email to find/create customer
        const result = await findOrCreateCustomerByEmail(
          userEmail,
          finalFirstName,
          finalLastName
        );
        customerData = formatCustomerResponse(result.customer);
        isNewCustomer = result.isNewCustomer;
      } else if (userPhone) {
        // If no email but phone is available, use phone to find/create customer
        const result = await findOrCreateCustomerByPhone(
          userPhone,
          finalFirstName,
          finalLastName
        );
        customerData = formatCustomerResponse(result.customer);
        isNewCustomer = result.isNewCustomer;
      } else {
        // No email or phone from Facebook - log warning
        console.warn("Facebook login: No email or phone available from user data. User ID:", response.data.user?.userId);
      }
    } catch (customerError) {
      console.error("Customer service error:", customerError.message);
    }

    // Login to Shopify Admin
    const shopifyAdminLogin = await loginToShopifyAdmin(userEmail, userPhone);

    return res.status(200).json({
      success: true,
      message: isNewCustomer ? "Account created successfully" : "Facebook login successful",
      sessionToken: response.data.sessionJwt,
      refreshToken: response.data.refreshJwt,
      user: response.data.user,
      customer: customerData,
      isNewCustomer,
      shopifyAdmin: shopifyAdminLogin,
    });
  } catch (error) {
    console.error("Facebook OAuth exchange error:", error);
    return res.status(401).json({
      success: false,
      message: error.message || "Failed to complete Facebook login",
    });
  }
});

// ==================== APPLE OAuth ====================

// Start Apple OAuth flow
router.post("/apple/start", async (req, res) => {
  try {
    const { redirectUrl } = req.body;

    if (!redirectUrl) {
      return res.status(400).json({
        success: false,
        message: "Redirect URL is required",
      });
    }

    const response = await descopeClient.oauth.start.apple(redirectUrl);

    return res.status(200).json({
      success: true,
      message: "Apple OAuth started",
      authUrl: response.data.url,
    });
  } catch (error) {
    console.error("Apple OAuth start error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to start Apple OAuth",
    });
  }
});

// Exchange Apple OAuth code
router.post("/apple/exchange", async (req, res) => {
  try {
    const { code, firstName, lastName } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code is required",
      });
    }

    const response = await descopeClient.oauth.exchange(code);

    // Get email from Descope user data
    const userEmail = response.data.user?.email;

    // Find or create customer in Shopify
    let customerData = null;
    let isNewCustomer = false;
    if (userEmail) {
      try {
        const descopeName = response.data.user?.name || "";
        const [descopeFirstName, ...descopeLastNameParts] = descopeName.split(" ");
        const result = await findOrCreateCustomerByEmail(
          userEmail,
          firstName || descopeFirstName || "",
          lastName || descopeLastNameParts.join(" ") || ""
        );
        customerData = formatCustomerResponse(result.customer);
        isNewCustomer = result.isNewCustomer;
      } catch (customerError) {
        console.error("Customer service error:", customerError.message);
      }
    }

    // Login to Shopify Admin
    const shopifyAdminLogin = await loginToShopifyAdmin(userEmail, null);

    return res.status(200).json({
      success: true,
      message: isNewCustomer ? "Account created successfully" : "Apple login successful",
      sessionToken: response.data.sessionJwt,
      refreshToken: response.data.refreshJwt,
      user: response.data.user,
      customer: customerData,
      isNewCustomer,
      shopifyAdmin: shopifyAdminLogin,
    });
  } catch (error) {
    console.error("Apple OAuth exchange error:", error);
    return res.status(401).json({
      success: false,
      message: error.message || "Failed to complete Apple login",
    });
  }
});

// ==================== SESSION MANAGEMENT ====================

// Validate session token
router.post("/validate", async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        message: "Session token is required",
      });
    }

    const response = await descopeClient.validateSession(sessionToken);

    return res.status(200).json({
      success: true,
      message: "Session is valid",
      token: response.token,
    });
  } catch (error) {
    console.error("Session validation error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session",
    });
  }
});

// Refresh session token
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const response = await descopeClient.refresh(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Session refreshed successfully",
      sessionToken: response.data.sessionJwt,
      refreshToken: response.data.refreshJwt,
    });
  } catch (error) {
    console.error("Session refresh error:", error);
    return res.status(401).json({
      success: false,
      message: "Failed to refresh session",
    });
  }
});

// Logout
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    await descopeClient.logout(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to logout",
    });
  }
});

/**
 * POST /login/shopify/email
 * Login to Shopify using email and password
 * If user doesn't exist, automatically registers them
 * Returns customerAccessToken for Shopify Storefront API
 */
router.post("/shopify/email", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Validate password length (Shopify requires minimum 5 characters)
    if (password.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 5 characters long",
      });
    }

    const storefrontAPI = require("../config/shopify");

    // Shopify Storefront API mutation for customer login
    const loginMutation = `
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

    const loginVariables = {
      input: {
        email: email,
        password: password,
      },
    };

    // Try to login first
    const loginResponse = await storefrontAPI.post("", { query: loginMutation, variables: loginVariables });

    // Check for GraphQL errors
    if (loginResponse.data.errors) {
      return res.status(400).json({
        success: false,
        message: "Failed to login",
        error: loginResponse.data.errors[0].message,
      });
    }

    const { customerAccessToken, customerUserErrors } = loginResponse.data.data.customerAccessTokenCreate;

    // Check if user doesn't exist (UNIDENTIFIED_CUSTOMER error)
    if (customerUserErrors && customerUserErrors.length > 0) {
      const isUnidentifiedCustomer = customerUserErrors.some(
        (error) => error.code === "UNIDENTIFIED_CUSTOMER"
      );

      if (isUnidentifiedCustomer) {
        // User doesn't exist, register them automatically
        const registerMutation = `
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

        const registerVariables = {
          input: {
            email: email,
            password: password,
            firstName: "-",
            lastName: "-",
            acceptsMarketing: false,
          },
        };

        const registerResponse = await storefrontAPI.post("", {
          query: registerMutation,
          variables: registerVariables
        });

        // Check for registration errors
        if (registerResponse.data.errors) {
          return res.status(400).json({
            success: false,
            message: "Failed to register",
            error: registerResponse.data.errors[0].message,
          });
        }

        const { customer, customerUserErrors: registerErrors } = registerResponse.data.data.customerCreate;

        if (registerErrors && registerErrors.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Registration failed",
            errors: registerErrors,
          });
        }

        if (!customer) {
          return res.status(400).json({
            success: false,
            message: "Failed to create customer account",
          });
        }

        // Now login the newly registered user
        const newLoginResponse = await storefrontAPI.post("", {
          query: loginMutation,
          variables: loginVariables
        });

        if (newLoginResponse.data.errors) {
          return res.status(400).json({
            success: false,
            message: "Registration successful but login failed",
            error: newLoginResponse.data.errors[0].message,
          });
        }

        const { customerAccessToken: newAccessToken } = newLoginResponse.data.data.customerAccessTokenCreate;

        if (!newAccessToken) {
          return res.status(400).json({
            success: false,
            message: "Registration successful but failed to get access token",
          });
        }

        // Return success for new user registration
        return res.status(201).json({
          success: true,
          message: "Account created and logged in successfully",
          isNewUser: true,
          data: {
            customerAccessToken: newAccessToken.accessToken,
            expiresAt: newAccessToken.expiresAt,
          },
        });
      }

      // Other login errors (not UNIDENTIFIED_CUSTOMER)
      return res.status(400).json({
        success: false,
        message: "Login failed",
        errors: customerUserErrors,
      });
    }

    // Check if token was created
    if (!customerAccessToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Return success for existing user login
    return res.status(200).json({
      success: true,
      message: "Login successful",
      isNewUser: false,
      data: {
        customerAccessToken: customerAccessToken.accessToken,
        expiresAt: customerAccessToken.expiresAt,
      },
    });
  } catch (error) {
    console.error("Shopify email login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message,
    });
  }
});

/**
 * POST /login/shopify/mobile
 * Login to Shopify using mobile number and password
 * If user doesn't exist, automatically registers them
 * Returns customerAccessToken for Shopify Storefront API
 */
router.post("/shopify/mobile", async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Validate input
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone number and password are required",
      });
    }

    // Validate password length (Shopify requires minimum 5 characters)
    if (password.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 5 characters long",
      });
    }

    const storefrontAPI = require("../config/shopify");
    const adminAPI = require("axios").create({
      baseURL: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01`,
      headers: {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
    });

    // First, try to find customer by phone number using Admin API
    let customerId = null;
    let customerEmail = null;

    try {
      const searchResponse = await adminAPI.get(`/customers/search.json?query=phone:${encodeURIComponent(phone)}`);

      if (searchResponse.data.customers && searchResponse.data.customers.length > 0) {
        const customer = searchResponse.data.customers[0];
        customerId = customer.id;
        customerEmail = customer.email;
      }
    } catch (searchError) {
      console.error("Error searching for customer:", searchError.message);
    }

    // If customer exists, try to login with their email
    if (customerEmail) {
      const loginMutation = `
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

      const loginVariables = {
        input: {
          email: customerEmail,
          password: password,
        },
      };

      const loginResponse = await storefrontAPI.post("", { query: loginMutation, variables: loginVariables });

      if (!loginResponse.data.errors) {
        const { customerAccessToken, customerUserErrors } = loginResponse.data.data.customerAccessTokenCreate;

        // If login successful
        if (customerAccessToken && (!customerUserErrors || customerUserErrors.length === 0)) {
          return res.status(200).json({
            success: true,
            message: "Login successful",
            isNewUser: false,
            data: {
              customerAccessToken: customerAccessToken.accessToken,
              expiresAt: customerAccessToken.expiresAt,
            },
          });
        }
      }
    }

    // Customer doesn't exist or login failed, register new customer
    // Generate a unique email from phone number
    const generatedEmail = `${phone.replace(/[^0-9]/g, '')}@phone.user`;

    // Create customer using Admin API (Storefront API doesn't support phone-only registration)
    const createCustomerPayload = {
      customer: {
        phone: phone,
        email: generatedEmail,
        first_name: "-",
        last_name: "-",
        verified_email: false,
        accepts_marketing: false,
        password: password,
        password_confirmation: password,
      },
    };

    try {
      const createResponse = await adminAPI.post("/customers.json", createCustomerPayload);

      if (createResponse.data.customer) {
        // Now login with the generated email
        const loginMutation = `
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

        const loginVariables = {
          input: {
            email: generatedEmail,
            password: password,
          },
        };

        const loginResponse = await storefrontAPI.post("", { query: loginMutation, variables: loginVariables });

        if (loginResponse.data.errors) {
          return res.status(400).json({
            success: false,
            message: "Registration successful but login failed",
            error: loginResponse.data.errors[0].message,
          });
        }

        const { customerAccessToken } = loginResponse.data.data.customerAccessTokenCreate;

        if (!customerAccessToken) {
          return res.status(400).json({
            success: false,
            message: "Registration successful but failed to get access token",
          });
        }

        return res.status(201).json({
          success: true,
          message: "Account created and logged in successfully",
          isNewUser: true,
          data: {
            customerAccessToken: customerAccessToken.accessToken,
            expiresAt: customerAccessToken.expiresAt,
          },
        });
      }
    } catch (createError) {
      // Check if error is due to duplicate phone or email
      if (createError.response && createError.response.data && createError.response.data.errors) {
        return res.status(400).json({
          success: false,
          message: "Registration failed",
          errors: createError.response.data.errors,
        });
      }
      throw createError;
    }

    return res.status(400).json({
      success: false,
      message: "Failed to create customer account",
    });

  } catch (error) {
    console.error("Shopify mobile login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message,
    });
  }
});

module.exports = router;

