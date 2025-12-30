const express = require("express");
const router = express.Router();
const TokenManager = require("../utils/tokenManager");

// Generate or retrieve cached authentication token
router.post("/token", (req, res) => {
  const { clientId, clientSecret } = req.body;

  // Validate credentials against environment variables
  if (
    clientId === process.env.CLIENT_ID &&
    clientSecret === process.env.CLIENT_SECRET
  ) {
    // Get token (cached or new)
    const tokenData = TokenManager.getToken(clientId);

    return res.status(200).json({
      success: true,
      token: tokenData.token,
      expiresIn: tokenData.expiresIn,
      cached: tokenData.cached,
      message: tokenData.cached
        ? "Returning existing valid token"
        : "New token generated",
    });
  } else {
    return res.status(401).json({
      success: false,
      message: "Invalid client credentials",
    });
  }
});

// Optional: Endpoint to invalidate token (logout)
router.post("/logout", (req, res) => {
  const { clientId } = req.body;

  if (!clientId) {
    return res.status(400).json({
      success: false,
      message: "clientId is required",
    });
  }

  const invalidated = TokenManager.invalidateToken(clientId);

  if (invalidated) {
    return res.status(200).json({
      success: true,
      message: "Token invalidated successfully",
    });
  } else {
    return res.status(404).json({
      success: false,
      message: "No active token found for this client",
    });
  }
});

module.exports = router;
