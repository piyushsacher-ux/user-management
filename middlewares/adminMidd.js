
const cookieParser = require("cookie-parser");
const jwt=require("jsonwebtoken")
// app.use(cookieParser())


const adminAuth = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message:"No token found"});

    try {
        const payload = jwt.verify(token, "abcde123");
        if (payload.role !== "admin" ) return res.status(403).json({ message: "Admin access only" });
        req.admin = payload;
        next();
    } catch (err) {
        return res.status(401).json({ message:"Invalid or expired token"});
    }
};


const superAdminAuth=(req,res,next)=>{
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message:"No token found"});

    try {
        const payload = jwt.verify(token, "abcde123");
        if (payload.role !== "superAdmin") return res.status(403).json({ message: "Super Admin access only" });
        req.superAdmin = payload;
        next();
    } catch (err) {
        return res.status(401).json({ message:"Invalid or expired token"});
    }
}
module.exports={adminAuth,superAdminAuth};