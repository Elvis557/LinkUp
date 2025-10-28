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

// Data structures
var users = [];
var connections = [];
var messages = [];
var pinnedMessages = {};
var socketMap = {}; // Map username to socket.id for DMs
var dmHistory = {}; // Store DM history: {user1-user2: [messages]}

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
        message: "LinkUp Chat Server with DMs is running!",
        users: users.length,
        connections: connections.length
    });
});

// Start server
server.listen(PORT, function(){
    console.log("=".repeat(50));
    console.log("LinkUp server with DM support running on port " + PORT);
    console.log("=".repeat(50));
});

io.sockets.on("connection", function(socket){
    connections.push(socket);
    console.log("Connected: %s sockets connected", connections.length);
   
    // When a new user connects and sends their username
    socket.on("new user", function(data, callback){
        callback(true);
        socket.username = data;
        users.push(socket.username);
        
        // Map username to socket ID for DMs
        socketMap[socket.username] = socket.id;
        
        console.log("✓ User joined: " + socket.username + " (ID: " + socket.id + ")");
        
        updateUsernames();
       
        // Broadcast user joined notification to everyone
        socket.broadcast.emit("user joined", {
            user: socket.username,
            timestamp: Date.now()
        });
        
        // Send chat history to the new user
        sendChatHistory(socket);
    });
   
    // When user disconnects
    socket.on("disconnect", function(data){
        if(!socket.username) return;
       
        users.splice(users.indexOf(socket.username), 1);
        delete socketMap[socket.username]; // Remove from socket map
        updateUsernames();
       
        // Broadcast user left notification
        socket.broadcast.emit("user left", {
            user: socket.username,
            timestamp: Date.now()
        });
       
        connections.splice(connections.indexOf(socket), 1);
        console.log("✗ User left: " + socket.username);
        console.log("Disconnected: %s sockets connected", connections.length);
    });
   
    // When server receives a PUBLIC message
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
        
        console.log("📢 Public message from " + socket.username + ": " + messageData.msg);
       
        // Send message to ALL clients
        io.emit("new message", messageData);
    });
    
    // When server receives a DIRECT MESSAGE
    socket.on("direct message", function(data){
        if (!socket.username) {
            console.log("⚠️ DM attempt without username");
            return;
        }
        
        var fromUser = socket.username;
        var toUser = data.to;
        var message = data.msg;
        var messageId = data.id || generateMessageId();
        
        console.log("💬 DM REQUEST:");
        console.log("  From:", fromUser);
        console.log("  To:", toUser);
        console.log("  Message:", message);
        console.log("  ID:", messageId);
        
        // Check if recipient is online
        if (!socketMap[toUser]) {
            console.log("⚠️ DM failed: " + toUser + " is not online");
            socket.emit("dm error", {
                error: "User is not online",
                user: toUser
            });
            return;
        }
        
        var messageData = {
            from: fromUser,
            to: toUser,
            msg: message,
            timestamp: Date.now(),
            id: messageId
        };
        
        // Store DM in history (optional - for persistence)
        var conversationKey = getConversationKey(fromUser, toUser);
        if (!dmHistory[conversationKey]) {
            dmHistory[conversationKey] = [];
        }
        dmHistory[conversationKey].push(messageData);
        
        // Limit stored DMs per conversation to last 50
        if (dmHistory[conversationKey].length > 50) {
            dmHistory[conversationKey].shift();
        }
        
        console.log("  ✓ Stored in history under key:", conversationKey);
        
        // Get recipient socket ID
        var recipientSocketId = socketMap[toUser];
        console.log("  → Sending to recipient (Socket ID: " + recipientSocketId + ")");
        
        // Send to RECIPIENT
        io.to(recipientSocketId).emit("direct message", messageData);
        
        // CRITICAL: Also send back to SENDER so they see their own message
        console.log("  → Echoing back to sender (Socket ID: " + socket.id + ")");
        socket.emit("direct message", messageData);
        
        console.log("  ✓ DM delivered successfully!");
    });
    
    // Request DM history between two users
    socket.on("request dm history", function(data){
        if (!socket.username) return;
        
        var otherUser = data.user;
        var conversationKey = getConversationKey(socket.username, otherUser);
        
        console.log("📜 DM history requested:");
        console.log("  User:", socket.username);
        console.log("  Other:", otherUser);
        console.log("  Key:", conversationKey);
        console.log("  Messages:", dmHistory[conversationKey] ? dmHistory[conversationKey].length : 0);
        
        socket.emit("dm history", {
            user: otherUser,
            messages: dmHistory[conversationKey] || []
        });
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
            console.log("📌 Message unpinned by " + socket.username);
        } else {
            // Pin
            pinnedMessages[messageId] = {
                msg: message.msg,
                user: message.user,
                timestamp: message.timestamp
            };
            console.log("📌 Message pinned by " + socket.username);
        }
        
        // Broadcast pin update to everyone
        io.emit("pin updated", {
            messageId: messageId,
            isPinned: !!pinnedMessages[messageId],
            pinnedBy: socket.username
        });
    });
   
    // When user is typing (public chat)
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
        console.log("👥 Online users updated:", users.join(", "));
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
    
    // Get conversation key for DM history (sorted to ensure consistency)
    function getConversationKey(user1, user2){
        return [user1, user2].sort().join('-');
    }
});