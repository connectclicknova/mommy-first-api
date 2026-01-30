require('dotenv').config();
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3000;
const productRoutes = require("./routes/products");
const authRoutes = require("./routes/auth");
const loginRoutes = require("./routes/login");
const userRoutes = require("./routes/user");
const cartRoutes = require("./routes/cart");
const blogsRoutes = require("./routes/blogs");
const collectionsRoutes = require("./routes/collections");

// CORS Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(express.json());

// Sample route
app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

// Routes
app.use("/auth", authRoutes);
app.use("/login", loginRoutes);
app.use("/products", productRoutes);
app.use("/user", userRoutes);
app.use("/cart", cartRoutes);
app.use("/blogs", blogsRoutes);
app.use("/collections", collectionsRoutes);

// Start server (for local development)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
