var express = require('express');
var router = express.Router();
var user=undefined;

exports.configure=function(params){
	notes=params;
}

exports.index=router.get('/', function(req, res, next) {
  res.render('index',{title:'Chat', user:req.user});
});

