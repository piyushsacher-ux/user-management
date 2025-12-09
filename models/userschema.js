const fs=require("fs")
const path=require("path")

console.log(__dirname)
const filedata=path.join(__dirname,);
class user{
    constructor(username,email,password,role){
        this.username=username,
        this.email=email,
        this.password=password,
        this.role=role
    }

    datatofile(){
        fs.appendFile()
    }
}