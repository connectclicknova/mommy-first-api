const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

// Generate authentication token
router.post("/token", (req, res) => {
  const { clientId, clientSecret } = req.body;

  // Debug logging
  console.log("Received clientId:", clientId);
  console.log("Expected clientId:", process.env.CLIENT_ID);
  console.log("Received clientSecret:", clientSecret);
  console.log("Expected clientSecret:", process.env.CLIENT_SECRET);

  // Validate credentials against environment variables
  if (
    clientId === process.env.CLIENT_ID &&
    clientSecret === process.env.CLIENT_SECRET
  ) {
    // Generate JWT token
    const token = jwt.sign(
      {
        clientId: clientId,
        authorized: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" } // Token expires in 24 hours
    );

    return res.status(200).json({
      success: true,
      token: token,
      expiresIn: "24h",
    });
  } else {
    return res.status(401).json({
      success: false,
      message: "Invalid client credentials",
    });
  }
});

module.exports = router;
