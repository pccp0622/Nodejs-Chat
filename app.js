var http = require('http');
var flash=require("connect-flash");
var passport=require("passport");
var LocalStrategy=require("passport-local").Strategy;
var expressSession=require("express-session");
var expressValidator=require('express-validator');
var bodyParser=require('body-parser');
var multer=require('multer');

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var app = express();
var routes = require('./routes/index');
var users = require('./routes/users');
var usersModels = require('./models/users');
usersModels.connect("mongodb://localhost/users", function(err) {
    if(err)
    throw err;
});
users.configure({
	usersModels:usersModels,
	passport:passport
});
routes.configure(usersModels);

passport.serializeUser(users.serialize);
passport.deserializeUser(users.deserialize);
passport.use(users.strategy);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//Handle file Uploads
var upload = multer({ dest: './uploads' });
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(expressSession({secret: 'keyboard cat'}));
app.use(flash());
app.use(function(req, res, next){
  res.locals.messages = require('express-messages')(req, res);
  next();
});
app.use(passport.initialize());
app.use(passport.session());

//Validator
app.use(expressValidator({
  errorFormatter:function(param, msg, value){
    var namespace = param.split('.'),
    root = namespace.shift(),
    formParam = root;
    while (namespace.length){
      formParam += '[' + namespace.shift()+']';
    }
    return {
      param : formParam,
      msg : msg,
      value : value
    };
  }
}));

app.use('/', routes.index);
app.use('/login', users.doLogin);
app.use('/account', users.ensureAuthenticated, users.doAccount);
app.use('/login', users.doLogin);
app.post('/doLogin', passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
}), users.postLogin);
app.use('/logout', users.doLogout);
app.use('/register', users.doRegister);
app.post('/doRegister', users.postRegister);
app.use('/message/:id/delete', users.messageDel);
app.use('/message/:id', users.messageTo);
app.use('/message', users.ensureAuthenticated, users.doMessage);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
 var server = http.Server(app);
 var io = require('socket.io').listen(server);
 app.set('port', 3000);

 server.listen(app.get('port'), function(){
  console.log("Express server listening on port "+ app.get('port'));
 });

 io.sockets.on('connection', function(socket){
  socket.on('getmessages', function(idFrom,idTo,fn){
    usersModels.getMessages(idFrom, idTo, function(err, messages){
      if(err){
        util.log('getmessages ERROR '+err);
      }else
        fn(messages);
    });
  });
  socket.on('sendmessage', function(idTo, idFrom, message, fn){
    usersModels.sendMessage(idTo, idFrom, message, function(err, messages){
      if(err){
        util.log('sendmessage ERROR '+err);
      }else
        fn();
    });
  });
  var broadcastNewMessage = function(id){
    socket.emit('newmessage', id);
  }
  usersModels.emitter.on('newmessage', broadcastNewMessage);

  var broadcastDelMessage=function(){
    socket.emit('delmessage');
  }
  usersModels.emitter.on('delmessage', broadcastDelMessage);

  socket.on('disconnect', function(){
    usersModels.emitter.removeListener('newmessage', broadcastNewMessage);
    usersModels.emitter.removeListener('delmessage', broadcastDelMessage);
  });
});
