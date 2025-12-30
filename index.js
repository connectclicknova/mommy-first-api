const express = require("express");
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Sample route
app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
