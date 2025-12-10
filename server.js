const express = require("express");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const app = express();
const cookieParser = require("cookie-parser");

require("dotenv").config()
const { authUser } = require("./middlewares/middleware")
const bcrypt = require("bcrypt");
const { appRouter } = require("./routes/admin");
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, "data");


app.use(express.json());
app.use(cookieParser())


if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const filePath = path.join(dataDir, "userdata.json");
app.use("/admin", appRouter)
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
        const pass = await bcrypt.hash(password, 10);
        const otpHash = await bcrypt.hash(otp.toString(), 10)
        return { pass, otpHash }
    }

    async function user() {
        const { pass, otpHash } = await hashed(password, otp);
        const newUser = { id: nextId, username, email, pass, sessions: [sessionId], otpHash, realotp: otp, token, isVerified: false };
        // Add to data and save
        const sendData = { id: nextId, username, email, token };
        data.users.push(newUser);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        res.json({ message: "User registered successfully", user: sendData });

    }
    user()
});


app.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "email and otp required" });

    const data = fs.readFileSync(filePath, "utf-8");
    //console.log(data);
    const realData = JSON.parse(data || '{"users": []}');
    if (!realData.users) realData.users = [];


    const user = realData.users.find((u) => u.email === email)
    if (!user) return res.status(400).json({ message: "User not found" });

    const match = await bcrypt.compare(otp.toString(), user.otpHash);
    if (!match) return res.json({ message: "Please enter correct otp" });

    user.isVerified = true;
    delete user.sessions;

    fs.writeFileSync(filePath, JSON.stringify(realData, null, 2));

    return res.json({
        message: "OTP verified successfully",
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            token: user.token
        }
    })
})

app.get("/profile", authUser, async (req, res) => {
    try {
        const payload = req.user;
        const { id } = payload;

        const data = fs.readFileSync(filePath, "utf-8");
        const realData = JSON.parse(data);

        const user= realData.users.find((a) => a.id === id);
        if (!user) {
            return res.status(400).json({ message: "User cant be found" })
        }
        const { id: aid, email, username } = user;
        const details = { id: aid, email, username }

        res.json({
            message: "Here is the user",
            admin: details 
        })
    } catch (err) {
        return res.status(500).json({ message: "Some error occurred" })
    }

})

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const data = fs.readFileSync(filePath, "utf-8");
    const realData = JSON.parse(data);
    const adminData = JSON.parse(fs.readFileSync("data/admin.json", "utf-8"));

    // Check if email exists in users or admins
    let user = realData.users.find(u => u.email === email);
    let role = "user";


    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isVerified) return res.status(403).json({ message: "User not verified. Verify OTP first." });

    const passMatch = await bcrypt.compare(password, user.pass);
    if (!passMatch) return res.status(400).json({ message: "Wrong crendentials" });

    if (!user.sessions) {
        user.sessions = [];
    }

    const sessionId = Date.now();

    user.sessions.push(sessionId);

    const token = jwt.sign({ email: user.email, id: user.id, sessionId, role }, "abcde123", {
        expiresIn: "1h"
    });
    res.cookie("token", token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60,
    });

    fs.writeFileSync(filePath, JSON.stringify(realData, null, 2));

    res.json({
        message: "Login successful",
        token
    });
})

app.post("/forgot-password", authUser, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const data = fs.readFileSync(filePath, "utf-8");
    const realData = JSON.parse(data);

    const user = realData.users.find(u => u.email === email);
    if (!user) return res.status(404).json({ message: "User not found" });

    //if bychance they exist before
    delete user.canResetPassword;
    delete user.resetOtpHash;
    delete user.resetOtpExpire;

    const otp = Math.floor(100000 + Math.random() * 900000);

    const resetOtpHash = await bcrypt.hash(otp.toString(), 10);

    user.resetOtpHash = resetOtpHash;
    user.resetOtpExpire = Date.now() + 5 * 60 * 1000;
    fs.writeFileSync(filePath, JSON.stringify(realData, null, 2));

    console.log("Reset Password OTP:", otp);

    res.json({
        message: "OTP sent to your email",
    });
});

app.post("/verify-reset-otp", authUser, async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp)
        return res.status(400).json({ message: "Email and OTP required" });

    const data = fs.readFileSync(filePath, "utf-8");
    const realData = JSON.parse(data);

    const user = realData.users.find(u => u.email === email);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (Date.now() > user.resetOtpExpire)
        return res.status(400).json({ message: "OTP expired" });

    const match = await bcrypt.compare(otp.toString(), user.resetOtpHash);
    if (!match) return res.status(400).json({ message: "Invalid OTP" });

    user.canResetPassword = true;
    fs.writeFileSync(filePath, JSON.stringify(realData, null, 2));
    res.json({ message: "OTP verified. You can reset your password now." });
});

app.post("/reset-password", authUser, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });
    const data = fs.readFileSync(filePath, "utf-8");
    const realData = JSON.parse(data);

    const user = realData.users.find(u => u.email === email);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.canResetPassword) return res.status(404).json({ message: "Cannot reset password" });

    user.pass = await bcrypt.hash(password, 10);
    delete user.resetOtpHash;
    delete user.resetOtpExpire;
    delete user.canResetPassword;
    fs.writeFileSync(filePath, JSON.stringify(realData, null, 2));
    res.json({ message: "Password reset successfully" });
})

app.post("/logout", async (req, res) => {
    const data = req.cookies;
    const token = data.token;
    if (!token) return res.status(400).json({ message: "No token found" });
    const payload = jwt.verify(token, "abcde123");
    const id = payload.id;
    const sessionId = payload.sessionId;

    const stringData = fs.readFileSync(filePath);
    const realData = JSON.parse(stringData);

    const user = realData.users.find((u) => u.id === id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.sessions) {
        user.sessions = user.sessions.filter(sid => sid !== sessionId);
    }
    fs.writeFileSync(filePath, JSON.stringify(realData, null, 2));
    res.clearCookie("token");
    res.json({ message: "Logout successful" });
})

app.put("/updateData", authUser, async (req, res) => {
    try {
        const { updateUsername } = req.body;
        if (!updateUsername) {
            return res.status(400).json({ message: "New username is required" });
        }
        const payload = req.user;
        const { id } = payload;
        const data = fs.readFileSync(filePath, "utf-8");
        const realData = JSON.parse(data);

        const upduser = realData.users.find((u) => u.id === id);
        if (!upduser) {
            return res.status(404).json({ message: "User not found" });
        }
        upduser.username = updateUsername;

        fs.writeFileSync(filePath, JSON.stringify(realData, null, 2));

        return res.json({
            message: "Username updated successfully",
            user: {
                id: upduser.id,
                username: upduser.username,
                email: upduser.email,
                token: upduser.token
            }
        })
    } catch (err) {
        return res.status(500).json({ message: "Some error occurred" })
    }
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));