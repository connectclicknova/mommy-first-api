const jwt = require("jsonwebtoken");

// In-memory token storage
const tokenCache = new Map();

// Clean up expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenCache.entries()) {
    if (value.expiresAt < now) {
      tokenCache.delete(key);
      console.log(`Token expired and removed for client: ${key}`);
    }
  }
}, 60 * 60 * 1000); // Run every hour

const TokenManager = {
  // Generate or retrieve existing token
  getToken: (clientId) => {
    const cached = tokenCache.get(clientId);
    
    // Check if valid token exists
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`Returning cached token for client: ${clientId}`);
      return {
        token: cached.token,
        expiresIn: "12h",
        cached: true,
      };
    }

    // Generate new token
    const token = jwt.sign(
      {
        clientId: clientId,
        authorized: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Cache token for 12 hours
    tokenCache.set(clientId, {
      token: token,
      expiresAt: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
    });

    console.log(`New token generated and cached for client: ${clientId}`);
    return {
      token: token,
      expiresIn: "12h",
      cached: false,
    };
  },

  // Manually invalidate a token
  invalidateToken: (clientId) => {
    const deleted = tokenCache.delete(clientId);
    if (deleted) {
      console.log(`Token invalidated for client: ${clientId}`);
    }
    return deleted;
  },

  // Get all active tokens count
  getActiveTokensCount: () => {
    return tokenCache.size;
  },
};

module.exports = TokenManager;
