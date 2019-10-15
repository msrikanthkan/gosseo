const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const app = express();
const bodyParser = require('body-parser');

const io = require('socket.io')(serverless);
const Window = require('window');

window = new Window();
var $ = require("jquery")(window);

var usernames = [];
var rooms = [];
var userInRooms = [];
const nsp = io.of('/to-admin');
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

app.get('/admin', function(req, res) {
	res.sendFile(__dirname + '/admin.html');
});

nsp.on('connection', function(socket) {
	var room;
	
	console.log('connected to : to-admin namespace');

	socket.on('disconnect', function() {
		console.log('user disconnected from \'to-admin\' namespace');
	});
	
	socket.on('get online users', function() { 
		nsp.emit('receive users', userInRooms);
		if (userInRooms.length > 0)
		for (var i=0; i<userInRooms.length; i++) { 
			nsp.emit('subscribe admin to the same room', {
				room : userInRooms[i].room,
				username: userInRooms[i].username
			});
		};
		
	});

	socket.on('admin subscribe', function(data) {
		socket.join(data.room);
		nsp.to(data.room).emit("chat message", {
			username : "Prime Bot",
			message : "Prime Bot: Hi",
			room : data.room
		});
		nsp.to(data.room).emit('to admin', {
			username : "Prime Bot",
			message : "Hi",
			room : data.room
		});
	});
	
	socket.on('save message', function(data, message) { 
		if (rooms.length > 0)
			for (var index=0; i<userInRooms.length; index++) { 
				if (rooms[index].userRoom === data.room) {
					if (rooms[index].roomMessages) {
					rooms[index].roomMessages.push(message);
					} else {
						rooms[index].roomMessages = [];
						rooms[index].roomMessages.push(message);
					}
				} else { 
					var room = {};
					room.userRoom = data.room;
					room.roomMessages = [];
					room.roomMessages.push(message);
					rooms.push(room)
				}
			}
		// nsp.to(data.room).emit('save message', data, rooms);
	});

	socket.on('subscribe', function(data) {

		if (usernames.indexOf(data.username) === -1) {
			usernames.push(data.username);
		}

		if (rooms.indexOf(data.room) === -1) {
			rooms.push(data.room);
		}
		
		userInRoom = {};
		userInRoom.username = data.username;
		userInRoom.room = data.room;
		userInRooms.push(userInRoom);
		
		nsp.emit('admin messages', {usernames:usernames, username:data.username, room:data.room});

		socket.join(data.room);
		socket.emit('set room', {
			room : data.room
		});
		// TODO may be setInterval here until admin is ready
		nsp.emit('subscribe admin to the same room', {
			username: data.username,
			room : data.room
		});
	});

	socket.on('chat message', function(msg, username, room) {

		if (usernames.indexOf(username) === -1) {
			usernames.push(username);
			// socket.join(username);
			nsp.emit('admin messages', usernames);
		}
		console.log(usernames.length);

		console.log('message : ' + msg);
		nsp.to(room).emit('chat message', {
			username: username,
			message : (msg),
			room : room
		});
		nsp.to(room).emit('to admin', {
			username : username,
			message : msg,
			room : room
		});
	});

	socket.on('admin message', function(msg, username) {
		nsp.emit('to admin', {
			username : username,
			message : msg,
			id : socket.id
		});
		socket.emit('chat message', username + ': ' + msg);
	});

});

io.on('connection', function(socket) {
	console.log('user connected');
	socket.on('disconnect', function() {
		console.log('user disconnected');
	});

	// socket.join('admin');

	socket.on('chat message', function(msg, username) {

		// var usernamespace = io.of('/'+username)

		socket.join(username);
		if (usernames.indexOf(username) === -1) {
			usernames.push(username);
			io.emit('admin messages', usernames);
		}
		console.log(usernames.length);

		console.log('message : ' + msg);
		socket.emit('chat message', username + ': ' + msg);
		io.emit('to admin', socket, username + ': ' + msg);

	});

	socket.on('from admin', function(msg, userSocket) {
		userSocket.emit('chat message', 'admin: ' + msg);
	});
});

module.exports = app;
module.exports.handler = serverless(app);
