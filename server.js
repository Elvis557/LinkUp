var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);

users = [];
connections = [];

server.listen(3001);
console.log("Server running on port 3001");

app.get("/", function(req, resp){
    resp.sendFile(__dirname + "/index.html");
});

io.sockets.on("connection", function(socket){
    connections.push(socket);
    console.log("Connected: %s sockets connected", connections.length);
    
    // When a new user connects and sends their username
    socket.on("new user", function(data, callback){
        callback(true);
        socket.username = data;
        users.push(socket.username);
        updateUsernames();
        console.log("User joined: " + socket.username);
    });
    
    // When user disconnects
    socket.on("disconnect", function(data){
        if(!socket.username) return;
        users.splice(users.indexOf(socket.username), 1);
        updateUsernames();
        connections.splice(connections.indexOf(socket), 1);
        console.log("Disconnected: %s sockets connected", connections.length);
    });
    
    // When server receives a message
    socket.on("send message", function(data){
        console.log("Message from " + socket.username + ": " + data);
        // Send message to ALL clients including sender
        io.sockets.emit("new message", {
            msg: data, 
            user: socket.username
        });
    });
    
    // Update online users for all clients
    function updateUsernames(){
        io.sockets.emit("get users", users);
    }
});