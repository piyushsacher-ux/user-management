const express=require("express");
const appRouter=express.Router();
const path = require("path");
const { adminLogin, adminRegister,adminLogout,adminUpdate,profile,getAllUsers,getUserById,disableUser} = require("../controllers/admin");
const {adminAuth}=require("../middlewares/adminMidd")

const filePath = path.join(__dirname, "data/admin.json");

appRouter.post("/login",adminLogin)
appRouter.post("/register",adminAuth,adminRegister)
appRouter.post("/logout",adminAuth,adminLogout)
appRouter.put("/updateData",adminAuth,adminUpdate)
appRouter.get("/profile",adminAuth,profile)
appRouter.get("/getAllUsers",adminAuth,getAllUsers)
appRouter.get("/getUserById/:id",adminAuth,getUserById)
appRouter.post("/disableUser/:uid",adminAuth,disableUser)


module.exports={appRouter};