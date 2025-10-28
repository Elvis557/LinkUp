var express = require("express");
var app = express();
var server = require("http").createServer(app);

// CORS configuration for Socket.IO
var io = require("socket.io")(server, {
    cors: {
        origin: "*", // Allow all origins (or specify your frontend URL)
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Data structures - Single room since we removed multiple rooms
var users = [];
var connections = [];
var messages = [];
var pinnedMessages = {};

// Use environment variable for port
const PORT = process.env.PORT || 3001;

// CORS middleware for Express routes
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Health check endpoint
app.get("/health", function(req, res){
    res.json({
        status: "ok",
        users: users.length,
        connections: connections.length,
        messages: messages.length,
        pinnedMessages: Object.keys(pinnedMessages).length,
        timestamp: new Date().toISOString()
    });
});

app.get("/", function(req, resp){
    resp.json({
        message: "LinkUp Chat Server is running!",
        users: users.length,
        connections: connections.length
    });
});

// Start server
server.listen(PORT, function(){
    console.log("LinkUp server running on port " + PORT);
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
            timestamp: Date.now()
        });
       
        console.log("User joined: " + socket.username);
        
        // Send chat history to the new user
        sendChatHistory(socket);
    });
   
    // When user disconnects
    socket.on("disconnect", function(data){
        if(!socket.username) return;
       
        users.splice(users.indexOf(socket.username), 1);
        updateUsernames();
       
        // Broadcast user left notification
        socket.broadcast.emit("user left", {
            user: socket.username,
            timestamp: Date.now()
        });
       
        connections.splice(connections.indexOf(socket), 1);
        console.log("User left: " + socket.username);
        console.log("Disconnected: %s sockets connected", connections.length);
    });
   
    // When server receives a message
    socket.on("send message", function(data){
        if (!socket.username) return;
        
        var messageData = {
            msg: data.msg || data,
            user: socket.username,
            timestamp: Date.now(),
            id: generateMessageId()
        };
        
        // Store message in history
        messages.push(messageData);
        
        // Limit stored messages to last 100
        if (messages.length > 100) {
            messages.shift();
        }
        
        console.log("Message from " + socket.username + ": " + messageData.msg);
       
        // Send message to ALL clients
        io.emit("new message", messageData);
    });
    
    // Pin/unpin message
    socket.on("toggle pin", function(data){
        if (!socket.username) return;
        
        var messageId = data.messageId;
        var message = messages.find(m => m.id === messageId);
        if (!message) return;
        
        if (pinnedMessages[messageId]) {
            // Unpin
            delete pinnedMessages[messageId];
            console.log("Message unpinned by " + socket.username);
        } else {
            // Pin
            pinnedMessages[messageId] = {
                msg: message.msg,
                user: message.user,
                timestamp: message.timestamp
            };
            console.log("Message pinned by " + socket.username);
        }
        
        // Broadcast pin update to everyone
        io.emit("pin updated", {
            messageId: messageId,
            isPinned: !!pinnedMessages[messageId],
            pinnedBy: socket.username
        });
    });
   
    // When user is typing
    socket.on("typing", function(){
        socket.broadcast.emit("typing", {
            user: socket.username
        });
    });
   
    // When user stops typing
    socket.on("stop typing", function(){
        socket.broadcast.emit("stop typing");
    });
    
    // Request chat history
    socket.on("request chat history", function(){
        sendChatHistory(socket);
    });
   
    // Update online users for all clients
    function updateUsernames(){
        io.sockets.emit("get users", users);
    }
    
    // Send chat history to a socket
    function sendChatHistory(socket){
        socket.emit("room history", {
            messages: messages,
            pinnedMessages: pinnedMessages
        });
    }
    
    // Generate unique message ID
    function generateMessageId(){
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
});