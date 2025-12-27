// test-server.js
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("✅ Backend is working!");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Test server running at http://localhost:${PORT}`);
});
