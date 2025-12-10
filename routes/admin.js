const express=require("express");
const appRouter=express.Router();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { adminLogin, adminRegister,adminLogout} = require("../controllers/admin");
const {adminAuth}=require("../middlewares/adminMidd")

const filePath = path.join(__dirname, "data/admin.json");

appRouter.post("/login",adminLogin)
appRouter.post("/register",adminAuth,adminRegister)
appRouter.post("/logout",adminAuth,adminLogout)

module.exports={appRouter};