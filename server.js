const express = require("express");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
require("dotenv").config()
const brcypt = require("bcrypt")
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, "data");


if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const filePath = path.join(dataDir, "userdata.json");

app.post("/register", (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "username, email, and password required" });
    }
    let data = { users: [] };
    if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        if (raw.trim()) {
            try {
                data = JSON.parse(raw);
            } catch (err) {
                
                data = { users: [] };
            }
        }
    }

    
    const exists = data.users.find(u => u.email === email);
    if (exists) {
        return res.status(400).json({ message: "Email already exists" });
    }
   
    const nextId = data.users.length ? data.users[data.users.length - 1].id + 1 : 1;
    const sessionId = Date.now();
    const otp = Math.floor(100000 + Math.random() * 900000);
    const token = jwt.sign({ email, sessionId }, "abcde123", { expiresIn: "5m" });

    async function hashed() {
        const pass = await brcypt.hash(password, 10);
        const otpHash = await brcypt.hash(otp.toString(), 10)
        return { pass, otpHash }
    }

    async function user() {
        const { pass, otpHash } = await hashed(password, otp);
        const newUser = { id: nextId, username, email, pass, sessions: [sessionId], otpHash ,token };
        // Add to data and save
        const sendData={ id: nextId, username, email ,token };
        data.users.push(newUser);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        res.json({ message: "User registered successfully", user: sendData });

    }
    user()

});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
