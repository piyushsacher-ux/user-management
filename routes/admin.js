const express=require("express");
const appRouter=express.Router();
//const path = require("path");
const { adminLogin, adminRegister,adminLogout,adminUpdate,profile,getAllUsers,getUserById,disableUser,forceLogOut, role,updatePermissions,adminUpdateUserData,getUserActivity} = require("../controllers/admin");
const {adminAuth,superAdminAuth}=require("../middlewares/adminMidd")

//const filePath = path.join(__dirname, "data/admin.json");

appRouter.post("/login",adminLogin)
appRouter.post("/register",superAdminAuth,adminRegister)
appRouter.post("/logout",adminAuth,adminLogout)
appRouter.put("/updateData",adminAuth,adminUpdate)
appRouter.get("/profile",adminAuth,profile)
appRouter.get("/getAllUsers",adminAuth,getAllUsers)
appRouter.get("/getUserById/:id",adminAuth,getUserById)
appRouter.post("/disableUser/:uid",adminAuth,disableUser)
appRouter.post("/forceLogOut/:uid",adminAuth,forceLogOut)
appRouter.post("/roles",superAdminAuth,role)
appRouter.put("/updateRoles/:rid",superAdminAuth,updatePermissions)
appRouter.put("/adminUpdateuserInfo/:uid",adminAuth,adminUpdateUserData)
appRouter.get("/getUserActivity/:uid",adminAuth,getUserActivity)



module.exports={appRouter};