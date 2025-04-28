const express = require('express');
const app = express();
const path = require('path');
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { redirect } = require('statuses');
const post = require('./models/post');
const user = require('./models/user');



app.set("view engine", "ejs");
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.render("Home");
});
app.get('/register', (req, res) => {
    res.render("register");
});
app.post('/register', async (req, res) => {
        try {
            let { name, username, age, email, password } = req.body;
            
            // Input validation
            if (!name || !username || !age || !email || !password) {
                return res.status(400).send("All fields are required");
            }
            if (password.length < 8) {
                return res.status(400).send("Password should be at least 8 characters long");
            }
            if (!email.includes("@")) {
                return res.status(400).send("Email is not valid");
            }
    
            // Check if user exists
            let existingUser = await userModel.findOne({ email });  
            if (existingUser) {
                return res.status(400).send("User already registered").redirect("/login");
            }
    
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
    
            // Create user
            let user = await userModel.create({
                username,
                email,
                age,
                name,
                password: hash
            });
    
            // Generate token
            let token = jwt.sign({ email: user.email, userid: user._id }, "secret");
            res.cookie("token", token);
            res.status(201).send("Registered successfully!");
            
        } catch (error) {
            console.error("Registration error:", error);
            res.status(500).send("Internal server error during registration");
        }
    });
app.get('/login', (req, res) => {
        res.render("login");
    });

app.post('/login', async (req, res) => {
    try {
        let { email, password } = req.body;
        
        // Input validation
        if (!email || !password) {
            return res.status(400).send("All fields are required");
        }
    
        // Check if user exists
        let user = await userModel.findOne({ email });
        if (!user) {
            return res.status(200).send("User not found");
        }
    
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(200).send("Invalid password");
        }
    
        // Generate token
        let token = jwt.sign({ email: user.email, userid: user._id }, "secret");
        res.cookie("token", token);
        // res.redirect("/");
        res.redirect("/feed");
        
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send("Internal server error during login");
    }
});

app.get('/logout', (req,res) => {
    res.cookie("token","");
    res.redirect("/login");
});

function isLoggedin(req, res, next) {
    let token = req.cookies.token;
    if (token) {
        jwt.verify(token, "secret", (err, decoded) => {
            if (err) {
                return res.status(401).send("Unauthorized access");
            }
            req.user = decoded;
            next();
        });
    } else {
        res.redirect("/login");
    }
};

app.get('/createpost', isLoggedin, (req, res) => {
    res.redirect("/profile");
});

app.get('/profile', isLoggedin,async (req, res) => {
    let user = await userModel.findOne({email:req.user.email}).populate("posts")
    res.render("profile",{user});
    // console.log(user);
});

app.post('/post', isLoggedin, async (req, res) => {
    let user = await userModel.findOne({email:req.user.email});
    let {content} = req.body;
    let post = await postModel.create({
        user:user._id,
        content
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
});

app.get('/like/:id', isLoggedin,async (req, res) => {
    let post = await postModel.findOne({_id:req.params.id}).populate("user")

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);}
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1);
    }
    await post.save();

    res.redirect(req.get('referer'));
});

app.get('/edit/:id', isLoggedin,async (req, res) => {
    let post = await postModel.findOne({_id:req.params.id}).populate("user")
    res.render("edit",{post});
});

app.post('/update/:id', isLoggedin,async (req, res) => {
    let post = await postModel.findOneAndUpdate({_id:req.params.id},{content: req.body.content})
    res.redirect("/profile");
});

app.get('/feed', isLoggedin, async (req, res) => {
    let allPosts = await postModel.find()
    .populate("user")
    .sort({ date: -1 });

    let postss = allPosts.map(post => ({
    id: post._id,
    content: post.content,
    date: post.date,
    user: post.user?.username, // Safe navigation in case user is not populated
    name: post.user?.name,
    likes: post.likes.length,
    liked: post.likes.includes(req.user.userid)
    }));
    res.render("feed",{postss});
    // console.log(postss);
});

app.get('/delete/:id', isLoggedin, async (req, res) => {
    await postModel.findOneAndDelete({_id:req.params.id});
    res.redirect(req.get('referer'));

});

app.listen(3000);