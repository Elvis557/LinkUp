var express = require("express");
var app = express();
var server = require("http").createServer(app);

// CORS configuration for Socket.IO (CRITICAL for Vercel + Render)
var io = require("socket.io")(server, {
    cors: {
        origin: "*", // Allow all origins (or specify your Vercel URL)
        methods: ["GET", "POST"],
        credentials: true
    }
});

users = [];
connections = [];

// Use environment variable for port (REQUIRED for Render)
const PORT = process.env.PORT || 3001;

// CORS middleware for Express routes
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Health check endpoint (useful for monitoring)
app.get("/health", function(req, res){
    res.json({ 
        status: "ok", 
        users: users.length, 
        connections: connections.length,
        timestamp: new Date().toISOString()
    });
});

app.get("/", function(req, resp){
    resp.json({ 
        message: "Chat server is running!", 
        users: users.length,
        connections: connections.length
    });
});

// Start server
server.listen(PORT, function(){
    console.log("Server running on port " + PORT);
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
        console.log("User left: " + socket.username);
        console.log("Disconnected: %s sockets connected", connections.length);
    });
   
    // When server receives a message
    socket.on("send message", function(data){
        console.log("Message from " + socket.username + ": " + data);
        // Send message to ALL clients
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