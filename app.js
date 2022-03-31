//jshint esversion:6
require("dotenv").config();
const bodyParser = require("body-parser");
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");//
//const bcrypt = require("bcrypt");
//const md5 = require("md5");
//const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

// const submittedSecret = [];

//console.log(process.env.API_KEY);
//console.log(md5("lutirc"));

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitilized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});//

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL:"http://localhost:3000/auth/google/secrets",
  //userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb){
  console.log(profile);
  User.findOrCreate({googleId: profile.id}, function(err, user){
    return cb(err, user);
  });

}
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", {scope: ["profile"]})
);

app.get("/auth/google/secrets",
  passport.authenticate("google", {failureRedirect:"/login"}),
  function(req, res){
    res.redirect("/secrets")
  }
);

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){

    User.find({"secret": {$ne: null}}, function(err, foundUsers){
      if(err){
        console.log(err);
      } else{
        if(foundUsers){
          res.render("secrets", {userswithSecrets: foundUsers});
        }
      }
    });

  // if(req.isAuthenticated()){
  //   res.render("secrets");
  // } else{
  //   res.redirect("/login");
  // }
});

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  } else{
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;

  // submittedSecret.push(submittedSecret1);

  console.log(req.user.id);
  User.findById(req.user.id, function(err, foundUser){
    if (err){
      console.log(err);
    } else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        console.log(submittedSecret);
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });

});

// app.get("/submit", function(req, res){
//   res.render("secrets.ejs", {
//     first: submittedSecret,
//     // second: submittedSecret.lenght
//   });
// });

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    } else{
      passport.authenticate("local")(req, res , function(){
        res.redirect("/secrets");
      });

    }
  });







// bcrypt.hash(req.body.password, saltRounds,function(err, hash){
//    const newUser = new User({
//    email: req.body.username,
//    password: hash    // md5(req.body.password)
//    });
//    newUser.save(function(err){
//      if(err){
//        console.log(err);
//      } else{
//        res.render("secrets");
//      }
//    });
//  })



});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

req.login(user, function(err){
  if (err){
    console.log(err);
  } else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
});


  //const username = req.body.username;
  //const password = req.body.password        //md5(req.body.password);


  //User.findOne({email: username}, function(err, foundUser){
  //  if(err){
  //    console.log(err);
  //  } else{
  //    if(foundUser){
  //      bcrypt.compare(password, foundUser.password, function(err, result){
  //        if(result === true){
  //          res.render("secrets");
  //        }

  //      });
  //    }
  //  }
  //});
});

app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
