const jwt = require("jsonwebtoken");
const fs=require("fs")
const path=require("path");
const userPath = path.join(__dirname, "..", "data", "userdata.json");
const authUser = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ message: "No token found" });

        const payload = jwt.verify(token, "abcde123");

        const {id}=payload;
        const data=fs.readFileSync(userPath,"utf-8");
        const realData=JSON.parse(data);
        const user=realData.users.find(u=>u.id==id); 

        if(!user) return res.status(403).json({message:"User does not exist"});

        if(user.isDisabled) return res.status(402).json({message:"Sorry your account is being disaled"})
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
