
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const filePath = path.join(__dirname, "..", "data", "admin.json");
const userPath = path.join(__dirname, "..", "data", "userdata.json");

//console.log(filePath)

const adminLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ message: "Enter email and password" });

    if (!fs.existsSync(filePath))
        return res.status(404).json({ message: "Admin data not found" });

    const data = fs.readFileSync(filePath, "utf-8");
    const realData = JSON.parse(data);

    const admin = realData.admins.find(a => a.email === email);
    console.log(admin)

    if (!admin)
        return res.status(404).json({ message: "Admin not found" });

    const superAdmin = (admin.email === process.env.SUPERADMIN_EMAIL)

    const match = await bcrypt.compare(password, admin.password);
    if (!match)
        return res.status(400).json({ message: "Wrong credentials" });

    if (!admin.sessions) admin.sessions = [];
    const sessionId = Date.now();
    admin.sessions.push(sessionId);

    const token = jwt.sign(
        { email: admin.email, id: admin.id, sessionId, role: superAdmin ? "superAdmin" : "admin",permissions:admin.permissions},
        "abcde123",
        { expiresIn: "1h" }
    );
    res.cookie("token", token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60,
    });

    fs.writeFileSync(filePath, JSON.stringify(realData, null, 2));
    res.json({
        message: superAdmin ? "SuperAdmin login successful" : "Admin login successful"
    });
};

const adminRegister = async (req, res) => {
    try {
        const { email, password, username } = req.body;
        if (!email || !password || !username)
            return res.status(400).json({ message: "Email, username and password required" });

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify({ admins: [] }, null, 2));
        }
        const data = fs.readFileSync(filePath, "utf-8");
        const realData = JSON.parse(data);

        if (!realData.admins) realData.admins = [];

        const exists = realData.admins.find(a => a.email === email);
        if (exists) return res.status(400).json({ message: "Email already exists" });

        let nextId = 1;
        if (realData.admins && realData.admins.length > 0) {
            const lastAdmin = realData.admins[realData.admins.length - 1];
            nextId = Number(lastAdmin.id) + 1;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = {
            id: nextId,
            username,
            email,
            password: hashedPassword,
            sessions: [],
            permissions:{
                canDisableUser:false,
                canUpdateUser:false,
                canDeleteUser:false,
                canForceLogOutUser:false,
            }
        };

        realData.admins.push(newAdmin);
        fs.writeFileSync(filePath, JSON.stringify(realData, null, 2));

        res.status(201).json({ message: "Admin registered successfully", admin: { id: nextId, email, username } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

const adminLogout = async (req, res) => {
    const data = req.cookies;
    const token = data.token;
    if (!token) return res.status(400).json({ message: "No token found" });
    const payload = jwt.verify(token, "abcde123");
    const id = payload.id;
    const sessionId = payload.sessionId;

    const stringData = fs.readFileSync(filePath);
    const realData = JSON.parse(stringData);

    const admin = realData.admins.find((u) => u.id === id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (admin.sessions) {
        admin.sessions = admin.sessions.filter(sid => sid !== sessionId);
    }
    fs.writeFileSync(filePath, JSON.stringify(realData, null, 2));
    res.clearCookie("token");
    res.json({ message: "Logout successful" });
}

const adminUpdate = async (req, res) => {
    try {
        const { updateUsername, emailId } = req.body;
        if (!updateUsername || !emailId) {
            return res.status(400).json({ message: "New username and new Email is required" });
        }
        const payload = req.admin;
        const { id } = payload;
        const data = fs.readFileSync(filePath, "utf-8");
        const realData = JSON.parse(data);

        const upduser = realData.admins.find((a) => a.id === id);
        if (!upduser) {
            return res.status(404).json({ message: "User not found" });
        }
        upduser.username = updateUsername;
        upduser.email = emailId;


        fs.writeFileSync(filePath, JSON.stringify(realData, null, 2));

        return res.json({
            message: "Username and email for admin updated successfully",
            user: {
                id: upduser.id,
                username: upduser.username,
                email: upduser.email,
            }
        })
    } catch (err) {
        return res.status(500).json({ message: "Some error occurred" })
    }
}

const profile = async (req, res) => {
    try {
        const payload = req.admin;
        const { id } = payload;

        const data = fs.readFileSync(filePath, "utf-8");
        const realData = JSON.parse(data);

        const admin = realData.admins.find((a) => a.id === id);
        if (!admin) {
            return res.status(400).json({ message: "Admin cant be found" })
        }
        const { id: aid, email, username } = admin;
        const details = { id: aid, email, username }

        res.json({
            message: "Here is your profile",
            admin: details
        })
    } catch (err) {
        return res.status(500).json({ message: "Some error occurred" })
    }
}

const getUserById = async (req, res) => {
    try {
        const id = req.params.id;
        console.log(id);
        if (!id) return res.status(404).json({ message: "Please provide the id whose data you want to find" });
        const data = fs.readFileSync(userPath, "utf-8");
        const realData = JSON.parse(data);

        const particularUser = realData.users.find((u) => u.id == id);
        if (!particularUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const { id: uid, username, email } = particularUser;
        const user = { id: uid, username, email }
        return res.json({
            message: "User found",
            user: user
        });
    } catch (err) {
        return res.status(500).json({ message: "Some error occurred" })
    }
}

const getAllUsers = async (req, res) => {
    try {
        const data = fs.readFileSync(userPath, "utf-8");
        const realData = JSON.parse(data);

        let allUsers=[];
        realData.users.forEach((user)=>{
            if(!user.isDeleted){
                allUsers.push({
                    id: user.id,
                    email: user.email,
                    username: user.username
                })
            }
        })
             
        return res.json({
            message: "Here are all the users",
            users: allUsers
        })
    } catch (err) {
        return res.status(500).json({ message: "Some error occurred" })
    }
}

const disableUser = async (req, res) => {
    try {
        const uid = req.params.uid;
        if (!uid) {
            return res.status(400).json({ message: "Please provide a user ID to disable" });
        }
        const data = fs.readFileSync(userPath, "utf-8");
        const realData = JSON.parse(data);
        const payload=req.admin;

        if(!payload.permissions.canDisableUser) return res.status(401).json({message:"You cannot disable any user as you dont have permissions"})

        const disableUser = realData.users.find(user => user.id == uid);
        if (!disableUser) {
            return res.status(404).json({ message: "User not found" });
        }
        disableUser.isDisabled = true;

        fs.writeFileSync(userPath, JSON.stringify(realData, null, 2));

        return res.json({
            message: "User disabled successfully",
            user: {
                id: disableUser.id,
                username: disableUser.username,
                email: disableUser.email,
                disabled: disableUser.isDisabled
            }
        });
    }
    catch (err) {
        return res.status(500).json({ message: "Some error occurred" })
    }
}

const forceLogOut = async (req, res) => {
    try {
        const uid = req.params.uid;
        if (!uid) {
            return res.status(400).json({ message: "Please provide a user ID to force Log Out" });
        }
        const data = fs.readFileSync(userPath, "utf-8");
        const realData = JSON.parse(data);

        const payload=req.admin;

        if(!payload.permissions.canForceLogOutUser) return res.status(401).json({message:"You cannot forceLogOut any user as you dont have permissions"})
        const forceLogOutUser = realData.users.find(user => user.id == uid);
        if (!forceLogOutUser) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!forceLogOutUser.sessions || forceLogOutUser.sessions.length === 0) {
            return res.status(200).json({
                message: "User has no active sessions"
            });
        }

        forceLogOutUser.sessions = [];

        fs.writeFileSync(userPath, JSON.stringify(realData, null, 2));

        return res.json({
            message: "User forcefully loggedout successfully",
        });

    } catch (err) {
        return res.status(500).json({ message: "Some error occurred" })
    }
}

const role = async (req, res) => {
    try {
      const { email, permissions } = req.body;
  
      if (!email || !permissions) {
        return res.status(400).json({ message: "email and permission object required" });
      }
    
      const data = fs.readFileSync(filePath, "utf-8");
      const realData = JSON.parse(data);
  
      const admin = realData.admins.find(a => a.email === email);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      if (typeof permissions !== "object") {
        return res.status(400).json({ message: "permission must be an object or array" });
      }

      admin.permissions = permissions;
      fs.writeFileSync(filePath, JSON.stringify(realData, null, 2));
  
      return res.json({
        message: "User Permission updated successfully",
        admin: {
          email: admin.email,
          permission: admin.permissions
        }
      });
  
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Server error" });
    }
  };


const updatePermissions=async(req,res)=>{
    try{
        const {permissions}=req.body;
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "Role data not found" });
        }
        const rid=req.params.rid;
        const data=fs.readFileSync(pathOfFile,"utf-8");
        const realData=JSON.parse(data);

        if (!realData.roles) realData.roles = [];

        const dataRole=realData.admins.find(r=>r.id==rid)
        if(!dataRole) return res.status(401).json({message:"Sorry this id does not exist"})

        dataRole.permissions=permissions

        fs.writeFileSync(filePath, JSON.stringify(realData, null, 2));
        res.status(200).json({ message: "Role updated successfully", role: dataRole });
    }catch(err){
        res.status(500).json({ message: "Server error" });
    }
}

const adminUpdateUserData=async(req,res)=>{
    try {
        const {username,emailId}=req.body;
        const uid = req.params.uid;
        if (!uid) {
            return res.status(400).json({ message: "Please provide a user ID to force Log Out" });
        }
        const data = fs.readFileSync(userPath, "utf-8");
        const realData = JSON.parse(data);

        const payload=req.admin;

        if(!payload.permissions.canUpdateUser) return res.status(401).json({message:"You cannot Update any user as you dont have permissions"})
        const UpdateUser = realData.users.find(user => user.id == uid);
        if (!UpdateUser) {
            return res.status(404).json({ message: "User not found" });
        }

        UpdateUser.username=username;
        UpdateUser.email=emailId

        fs.writeFileSync(userPath, JSON.stringify(realData, null, 2));

        return res.json({
            message: "User Updated successfully",
        });

    } catch (err) {
        return res.status(500).json({ message: "Some error occurred" })
    }
}

const getUserActivity=async(req,res)=>{
    try{
        const uid=req.params.uid;
        const data=fs.readFileSync(userPath,"utf-8");
        const realData=JSON.parse(data);

        const user = realData.users.find(u => u.id == uid);
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            activity: user.activity || []
        });

    }catch(err){
        return res.status(500).json({ message: "Some error occurred" })
    }
}

const adminDeleteUser = async (req, res) => {
    try {
        const uid = req.params.uid;
        if (!uid) {
            return res.status(400).json({ message: "Please provide a user ID" });
        }

        const data = fs.readFileSync(userPath, "utf-8");
        const realData = JSON.parse(data);

        const payload=req.admin;

        if(!payload.permissions.canDeleteUser) return res.status(401).json({message:"You cannot Delete any user as you dont have permissions"})

        const user = realData.users.find(u => u.id == uid);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.isDeleted) {
            return res.status(400).json({ message: "User is already deleted" });
        }

        user.isDeleted = true;

        user.isDisabled = true;
        if (user.sessions) user.sessions = [];

        fs.writeFileSync(userPath, JSON.stringify(realData, null, 2));

        res.status(200).json({ message: "User deleted successfully (soft delete)" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};


module.exports = { adminLogin, adminRegister, adminLogout, adminUpdate, profile, getAllUsers, getUserById, disableUser, forceLogOut, role,updatePermissions, adminUpdateUserData,getUserActivity,adminDeleteUser};