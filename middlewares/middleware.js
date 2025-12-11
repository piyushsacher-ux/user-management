const jwt = require("jsonwebtoken");
const fs=require("fs")
const path=require("path");
const userPath = path.join(__dirname, "..", "data", "userdata.json");
const authUser = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token)  return res.status(401).json({ message: "No token found" });

        const payload = jwt.verify(token, "abcde123");

        const {id}=payload;
        if(payload.type!=="login") return res.status(401).json({message:"Please login first"})
        const data=fs.readFileSync(userPath,"utf-8");
        const realData=JSON.parse(data);
        const user=realData.users.find(u=>u.id==id); 

        if(!user) return res.status(403).json({message:"User does not exist"});

        if(user.isDisabled) return res.status(402).json({message:"Sorry your account is being disaled"})

        if(!user.sessions || !user.sessions.includes(payload.sessionId)) return res.status(401).json({message: "No token found"});
        if (payload.role !== "user") {
            return res.status(403).json({ message: "Access denied" });
        }
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

const forgotPassMiddleware=async(req,res,next)=>{
    try {
        const forgotToken = req.cookies.token;
        if (!forgotToken) return res.status(401).json({ message: "No token found" });

        const payload = jwt.verify(forgotToken, "abcde123");

        const {id,type}=payload;
        if(type=="forgotPassword"){
            const data=fs.readFileSync(userPath,"utf-8");
            const realData=JSON.parse(data);
            const user=realData.users.find(u=>u.id==id); 

            if(user.isDisabled) return res.status(401).json({message:"Sorry you are disabled from the website"})
            req.user = payload;
            return next();
        }
        return res.status(401).json({message:"Sorry you cannot access this api"})

    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}


module.exports = { authUser ,forgotPassMiddleware};