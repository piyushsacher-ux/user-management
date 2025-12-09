const express = require("express");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config()
const app = express();
app.use(express.json());
const PORT=process.env.PORT || 3000;
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const filePath = path.join(dataDir, "userdata.json");

// Load users safely
function loadUsers() {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify({ users: [] }, null, 2));
            return { users: [] };
        }

        const raw = fs.readFileSync(filePath, "utf8").trim();
        if (!raw) return { users: [] };

        return JSON.parse(raw);
    } catch {
        return { users: [] };
    }
}

// Save users
function saveUsers(obj) {
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

// Remove expired users
function removeExpiredUsers() {
    const obj = loadUsers();
    const now = new Date();

    obj.users = obj.users.filter(
        u => u.isVerified || (now - new Date(u.createdAt)) < 5 * 60 * 1000
    );

    saveUsers(obj);
}

// Register route
app.post("/register", (req, res) => {
    try {
        const { username, email, password } = req.body || {};

        if (!username || !email || !password) {
            return res.status(400).json({ message: "username, email, and password required" });
        }

        removeExpiredUsers();

        const obj = loadUsers();
        if (obj.users.find(u => u.email === email)) {
            return res.status(400).json({ message: "Email already in use" });
        }

        const nextId = obj.users.length ? obj.users[obj.users.length - 1].id + 1 : 1;
        const sessionId = Date.now();
        const token = jwt.sign({ email, sessionId }, "abcde123", { expiresIn: "5m" });

        const newUser = {
            id: nextId,
            username,
            email,
            password,
            isVerified: false,
            createdAt: new Date(),
            sessions: [sessionId]
        };

        obj.users.push(newUser);
        saveUsers(obj);

        const { isVerified, createdAt, ...safeUser } = newUser;

        res.json({
            message: "User registered. Please verify your email within 5 minutes.",
            user: safeUser,
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
