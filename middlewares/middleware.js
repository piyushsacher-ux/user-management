const jwt = require("jsonwebtoken");

const authUser = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ message: "No token found" });

        const payload = jwt.verify(token, "abcde123");

        if (payload.role !== "user") {
            return res.status(403).json({ message: "Access denied" });
        }
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = { authUser };
