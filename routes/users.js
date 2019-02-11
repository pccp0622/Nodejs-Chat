var LocalStrategy = require('passport-local').Strategy;
var users = undefined;
var passport = undefined;

exports.configure=function(params){
	users=params.usersModels;
	passport=params.passport;
}

module.exports.serialize = function(user, done) {
    done(null, user.username);
}
 
module.exports.deserialize = function(username, done) {
    users.findByUsername(username, function(err, user) {
        done(err, user);
    });
}
 
module.exports.strategy = new LocalStrategy(
    function(username, password, done) {
        process.nextTick(function() {
            users.findByUsername(username, function(err, user) {
                if(!user) {
                    return done(null, false, {
                        message: 'Unknown user ' + username
                    });
                }
                if(user.password !== password) {
                    return done(null, false, {
                        message: 'Invalid password'
                    });
                }
                return done(null, user);
            });
        });
    }
);
 
module.exports.ensureAuthenticated = function(req, res, next) {
    if(req.isAuthenticated())
        return next();
    return res.redirect('/login');
}
 
module.exports.doAccount = function(req, res) {
    res.render('account', {
        title: 'Account information for ' + req.user.username,
        user: req.user
     });
}
 
module.exports.doLogin = function(req, res) {
    res.render('login', {
        title: 'Login to Chat',
        user: req.user,
        message: req.flash('error')
    });
}
 
module.exports.postLogin = function(req, res) {
     res.redirect('/');
}

module.exports.doRegister = function(req, res) {
    res.render('register', {
        title: 'Register to Chat',
        user: req.user,
        message: req.flash('error')
    });
}

module.exports.postRegister = function(req, res) {
     //Form Validation
     req.checkBody('fullname', "Name field is required").notEmpty();
     req.checkBody('email', "Email field is required").notEmpty();
     req.checkBody('email', "Email not valid").isEmail();
     req.checkBody('username', "Username field is required").notEmpty();
     req.checkBody('password', "Password field is required").notEmpty();
     req.checkBody('password2', "Passwords do not match").equals(req.body.password);
     //Check for errors
     var errors = req.validationErrors();
     if (errors){
        var err=[];
        for (each in errors) 
            err.push(errors[each].msg);
        req.flash('error',err.join(" | "));
        res.redirect('/register');
     }else{
     users.create(req.body.fullname, req.body.email, req.body.username, req.body.password,
        function(err){
            if (err){
                req.flash('error',err);
                res.redirect('/register');
            }else{
            	req.flash('error','Congratulation! You are now registered and may login :)');
                res.redirect('/login');
            }
        });
     }
}

module.exports.doLogout = function(req, res) {
     req.logout();
     res.redirect('/');
}

module.exports.doMessage = function(req, res) {
    users.allUsers(function(err, userList) {
       res.render('message', {
           title: "Message",
           user: req.user,
           users: userList,
           toUser: null,
           idTo: null,
           message: req.flash('error')
       });
    });
}

module.exports.messageTo=function(req,res){
    users.allUsers(function(err, userList) {
        users.findById(req.params.id,function(err, user){
        res.render('message',{
            title: "Message",
            user: req.user,
            users: userList,
            toUser: user.name,
            idTo: user.id,
            message: req.flash('error')
        });
    });
    });
}
 module.exports.messageDel=function(req,res){
    users.delMessages(req.params.id, req.user.id, function(){
        res.redirect('/message');
    });
 }
