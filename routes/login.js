const express = require("express");
const router = express.Router();
const descopeSdk = require("@descope/node-sdk");
const {
  findOrCreateCustomerByEmail,
  findOrCreateCustomerByPhone,
  formatCustomerResponse,
} = require("../utils/customerService");

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

    return res.status(200).json({
      success: true,
      message: isNewCustomer ? "Account created successfully" : "Email verified successfully",
      sessionToken: response.data.sessionJwt,
      refreshToken: response.data.refreshJwt,
      user: response.data.user,
      customer: customerData,
      isNewCustomer,
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

    return res.status(200).json({
      success: true,
      message: isNewCustomer ? "Account created successfully" : "Mobile verified successfully",
      sessionToken: response.data.sessionJwt,
      refreshToken: response.data.refreshJwt,
      user: response.data.user,
      customer: customerData,
      isNewCustomer,
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

    return res.status(200).json({
      success: true,
      message: isNewCustomer ? "Account created successfully" : "Google login successful",
      sessionToken: response.data.sessionJwt,
      refreshToken: response.data.refreshJwt,
      user: response.data.user,
      customer: customerData,
      isNewCustomer,
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

    return res.status(200).json({
      success: true,
      message: isNewCustomer ? "Account created successfully" : "Facebook login successful",
      sessionToken: response.data.sessionJwt,
      refreshToken: response.data.refreshJwt,
      user: response.data.user,
      customer: customerData,
      isNewCustomer,
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

    return res.status(200).json({
      success: true,
      message: isNewCustomer ? "Account created successfully" : "Apple login successful",
      sessionToken: response.data.sessionJwt,
      refreshToken: response.data.refreshJwt,
      user: response.data.user,
      customer: customerData,
      isNewCustomer,
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

module.exports = router;
