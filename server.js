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
        
        // Broadcast user joined notification to everyone
        socket.broadcast.emit("user joined", {
            user: socket.username,
            timestamp: new Date().toLocaleTimeString()
        });
        
        console.log("User joined: " + socket.username);
    });
    
    // When user disconnects
    socket.on("disconnect", function(data){
        if(!socket.username) return;
        
        // Broadcast user left notification
        socket.broadcast.emit("user left", {
            user: socket.username,
            timestamp: new Date().toLocaleTimeString()
        });
        
        users.splice(users.indexOf(socket.username), 1);
        updateUsernames();
        connections.splice(connections.indexOf(socket), 1);
        console.log("User left: " + socket.username);
        console.log("Disconnected: %s sockets connected", connections.length);
    });
    
    // When server receives a message
    socket.on("send message", function(data){
        console.log("Message from " + socket.username + ": " + data);
        
        // Send message to ALL clients with timestamp
        io.sockets.emit("new message", {
            msg: data, 
            user: socket.username,
            timestamp: new Date().toLocaleTimeString()
        });
    });
    
    // When user is typing
    socket.on("typing", function(data){
        socket.broadcast.emit("typing", {
            user: socket.username
        });
    });
    
    // When user stops typing
    socket.on("stop typing", function(data){
        socket.broadcast.emit("stop typing", {
            user: socket.username
        });
    });
    
    // When user reads messages
    socket.on("message read", function(data){
        socket.broadcast.emit("message read", {
            user: socket.username
        });
    });
    
    // Update online users for all clients
    function updateUsernames(){
        io.sockets.emit("get users", users);
    }
});