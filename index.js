require('dotenv').config();
const express = require("express");
const app = express();
const PORT = 3000;
const productRoutes = require("./routes/products");
const authRoutes = require("./routes/auth");

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
