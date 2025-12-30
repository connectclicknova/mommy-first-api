require('dotenv').config();
const express = require("express");
const app = express();
const PORT = 3000;
const productRoutes = require("./routes/products");
const authRoutes = require("./routes/auth");

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Middleware
app.use(express.json());

// Sample route
app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

// Routes
app.use("/auth", authRoutes);
app.use("/products", productRoutes);

// Start server (for local development)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
