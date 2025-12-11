const express=require("express");
const userRouter=express.Router();
const path = require("path");
const {register,verifyOTP,profile,login,forgotPassword,verifyResetOTP,resetPassword,logout,updateData} = require("../controllers/user");

const {authUser,forgotPassMiddleware}=require("../middlewares/middleware")


userRouter.post("/register",register);
userRouter.post("/verify-otp",verifyOTP);
userRouter.get("/profile",authUser,profile);
userRouter.post("/login",login);
userRouter.post("/forgot-password",forgotPassword);
userRouter.post("/verify-reset-otp",forgotPassMiddleware,verifyResetOTP)
//userRouter.post("/reset-password",authUser,resetPassword);
userRouter.post("/logout",authUser,logout);
userRouter.put("/updateData",authUser,updateData);


module.exports={userRouter};
