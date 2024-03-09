const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const md5 = require('md5');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const path = require('path');
const fs = require('fs');

const app = express();

app.set('view engine' , 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname+'uploads')));

mongoose.connect("mongodb://127.0.0.1:27017/testAppDB").then(function(err){
    console.log("Connected to Database!");
});

const userSchema = new mongoose.Schema({
    fname : String,
    lname : String,
    email : String,
    password : String,
    mobile : Number,
});

const User = mongoose.model("User", userSchema);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads");
    },
    filename: function (req, file, cb) {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    },
});
  
const upload = multer({ storage: storage });

app.get('/', function(req,res){
    res.render('home');
});

app.get("/register", function(req,res){
    res.render("register");
});

app.get('/login', function(req,res){
    res.render('login');
});

app.get('/upload', function(req,res){
    res.render('uploadQues.ejs', {data : ""});
});

app.post("/register", function(req,res){
    const newUser = new User({
        fname : req.body.fname,
        lname : req.body.lname,
        email : req.body.username,
        password : md5(req.body.password),
        mobile : req.body.mobile
    });

    newUser.save()
        .then(function(){
            res.render("account",{fname : newUser.fname});
        })
        .catch(function(err){
            console.log(err);
        });
});

app.post('/login', function(req,res){
    const username = req.body.username;
    const password = md5(req.body.password);

    User.findOne({email : username}).then(function(foundUser){
        if(foundUser){
            if(foundUser.password === password){
                res.render('account', {fname : foundUser.fname});
            }else{
                res.redirect('/login');
            }
        }
    })
    .catch(function(err){
        console.log(err);
    });
});

app.post("/extracttextfromimage", upload.single("file"),async function (req, res) {
    const config = {
      lang: "eng",
      oem: 1,
      psm: 3,
    };
  
    tesseract
      .recognize(req.file.path, config)
      .then((text) => {

const lines = text.split('\n');

const processQuestion = (lines) => {
  const question = lines[0].trim();
  const answers = lines.slice(1).map(line => line.trim().split(') ')[1]);
  return { question, answers };
};

const questionsAndAnswers = [];
let currentQuestionLines = [];
for (const line of lines) {
  if (line.startsWith('Q')) {
    if (currentQuestionLines.length) {
      questionsAndAnswers.push(processQuestion(currentQuestionLines));
    }
    currentQuestionLines = [];
  }
  currentQuestionLines.push(line);
}

if (currentQuestionLines.length) {
  questionsAndAnswers.push(processQuestion(currentQuestionLines));
}

const jsonData = JSON.stringify(questionsAndAnswers);

const jsonObject=JSON.parse(jsonData);
        res.render("exam", {data: jsonObject});
      })
      .catch((error) => {
        console.log(error.message);
      });
      
});

app.listen(3000, function(req,res){
    console.log("Server running on port 3000...");
});