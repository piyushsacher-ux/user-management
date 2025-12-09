const express = require("express");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
require("dotenv").config()
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, "data");

// Make sure data folder exists
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const filePath = path.join(dataDir, "userdata.json");

// POST /register
app.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "username, email, and password required" });
  }

  // Read current data
  let data = { users: [] };
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf8");
    if (raw.trim()) {
      try {
        data = JSON.parse(raw);
      } catch (err) {
        // If JSON is invalid, reset to empty
        data = { users: [] };
      }
    }
  }

  // Check if email already exists
  const exists = data.users.find(u => u.email === email);
  if (exists) {
    return res.status(400).json({ message: "Email already exists" });
  }

  // Create new user
  const nextId = data.users.length ? data.users[data.users.length - 1].id + 1 : 1;
  const sessionId = Date.now();
  const token = jwt.sign({ email, sessionId }, "abcde123", { expiresIn: "5m" });
  const newUser = { id: nextId, username, email, password ,token,sessions: [sessionId]};

  // Add to data and save
  data.users.push(newUser);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  res.json({ message: "User registered successfully", user: newUser });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
