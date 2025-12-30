const express = require("express");
const app = express();
const PORT = 3000;
const productRoutes = require("./routes/products");

// Middleware
app.use(express.json());

// Sample route
app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

app.use("/products", productRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
