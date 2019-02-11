var events = require('events');
var async = require('async');
var emitter = module.exports.emitter = new events.EventEmitter();

var util=require('util');
var mongoose=require('mongoose');
var Schema=mongoose.Schema;
var dburl=undefined;

exports.connect=function(thedburl, callback){
	dburl=thedburl;
	mongoose.connect(dburl);
}

exports.disconnect=function(callback){
	mongoose.disconnect(callback);
}

var UserSchema=new Schema({
	name:"String",
	email:"String",
	username:"String",
	password:"String",
	messagesTo:[{
		idTo:String,
		date:Date,
		message:String
	}],
	messagesFrom:[{
		idFrom:String,
		date:Date,
		message:String
	}]
});

mongoose.model('User', UserSchema);
var User=mongoose.model('User');

exports.create=function(name, email, username, password, callback){
	exports.findByUsername(username, function(err, user){
		if (user)
			callback('username already exists !');
		else{
			var newUser=new User();
			newUser.name=name;
			newUser.email=email;
			newUser.username=username;
			newUser.password=password;
			newUser.save(function(err){
				if (err)
					callback(err);
				else
					callback();
			});
		}
	});
}

exports.update=function(id, name, email, username, password, callback){
	exports.findById(id, function(err, user){
		if (err)
			callback(err);
		else{
			user.id=id;
			user.name=name;
			user.email=email;
			user.username=username;
			user.password=password;
			user.save(function(err){
				if (err)
					callback(err);
				else
					callback();
			});
		}
	});
}

exports.findById=function(id, callback){
	User.findOne({_id:id}, function(err, user){
		if (!user)
			callback('User '+id+' does not exist');
		else
			callback(null, user);
	});
}

exports.findByUsername=function(username, callback){
	User.findOne({username:username}, function(err, user){
		if (!user)
			callback('User '+username+' does not exist');
		else
			callback(null, user);
	});
}

module.exports.allUsers = function(callback) {
    User.find().exec(function(err, users) {
        if(users) {
            var userList = [];
            users.forEach(function(user) {
                userList.push({
                    id: user.id,
                    name: user.name
                });
            });
            callback(null, userList);
        } else
            callback();        
    });
}

module.exports.sendMessage=function(idTo, idFrom, message, callback){
	exports.findById(idFrom, function(err, user){
		user.messagesTo.push({
			idTo: idTo,
			date: new Date(),
			message: message
		});
		user.save(function(err){
			if (err)
				callback(err);
			else{
				emitter.emit('newmessage', idTo);
				callback();
			}
		});
	});
	exports.findById(idTo, function(err, user){
		user.messagesFrom.push({
			idFrom: idFrom,
			date: new Date(),
			message: message
		});
		user.save(function(err){
			if (err)
				callback(err);
			else{
				callback();
			}
		});
	});
}

module.exports.getMessages = function(idFrom, idTo, callback){
	User.find({$and:[{_id:idFrom},
					 {$or:[{"messagesTo.idTo":idTo},{"messagesFrom.idFrom":idTo}]}]
			  }).exec(function(err, users){
		if(users) {
            var messageList = [];
            users.forEach(function(user) {
            	user.messagesTo.forEach(function(message){
            		if(message.idTo===idTo){
            			messageList.push({
                    		idTo:message.idTo,
							idFrom:user.id,
							fromName:user.name,
							date: message.date,
							message:message.message
                		});	
            		}            			
            	});
                user.messagesFrom.forEach(function(message){
            		if(message.idFrom===idTo){
            			messageList.push({
                    		idTo:user.id,
							idFrom:message.idFrom,
							date: message.date,
							message:message.message
                		});	
            		}            			
            	});
            });
            callback(null, messageList);
        } else
            callback(); 
	});
}

module.exports.delMessages=function(idTo, idFrom, callback){
	User.findByIdAndUpdate(idFrom,{$pull:{"messagesTo":{idTo:idTo},
										  "messagesFrom":{idFrom:idTo}}},
				{ safe: true, upsert: true }, 
				function(err, obj) {
					if(err){
						console.log(err);
						callback(err);
					}
					else{
						
						callback();
					}
				});
}