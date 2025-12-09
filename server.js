const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const filePath = path.join(__dirname, "data", "userdata.json");

// 1) SAFE JSON LOADER -----------------------
function loadJSON() {
    try {
        let raw = fs.readFileSync(filePath, "utf8").trim();

        // If file is empty → repair it
        if (!raw) {
            const fixed = { users: [] };
            fs.writeFileSync(filePath, JSON.stringify(fixed, null, 2));
            return fixed;
        }

        return JSON.parse(raw);

    } catch (err) {
        // If file is invalid/corrupt → reset
        const fixed = { users: [] };
        fs.writeFileSync(filePath, JSON.stringify(fixed, null, 2));
        return fixed;
    }
}


function removeExpiredUsers() {
    let obj = loadJSON(); 
    let users = obj.users;
    const now = new Date();

    users = users.filter(u =>
        u.isVerified || (now - new Date(u.createdAt)) < 5 * 60 * 1000
    );

    fs.writeFileSync(filePath, JSON.stringify({ users }, null, 2));
}
app.post("/register", (req, res) => {
    removeExpiredUsers();

    const { username, email, password } = req.body;
    const obj = loadJSON();


    if (obj.users.find(u => u.email === email)) {
        return res.status(400).json({ message: "Email already in use" });
    }

    const nextId = obj.users.length
        ? obj.users[obj.users.length - 1].id + 1
        : 1;

    const newUser = {
        id: nextId,
        username,
        email,
        password,
        isVerified: false,
        createdAt: new Date()
    };

    obj.users.push(newUser);
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));

    const { isVerified, createdAt, ...safeUser } = newUser;

    res.json({
        message: "User registered. Please verify your email within 5 minutes.",
        user: safeUser
    });
});


app.listen(3000, () => console.log("Server running on port 3000"));
