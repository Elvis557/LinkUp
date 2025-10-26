var express = require("express");
var app = express();
var server = require("http").createServer(app);

// CORS configuration for Socket.IO
var io = require("socket.io")(server, {
    cors: {
        origin: "*", // Allow all origins (or specify your Vercel URL)
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Data structures
var users = [];
var connections = [];
var rooms = {
    'general': { users: [], messages: [], pinnedMessages: {} },
    'tech': { users: [], messages: [], pinnedMessages: {} },
    'random': { users: [], messages: [], pinnedMessages: {} },
    'gaming': { users: [], messages: [], pinnedMessages: {} }
};

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
        rooms: Object.keys(rooms).map(name => ({
            name: name,
            users: rooms[name].users.length,
            messages: rooms[name].messages.length
        })),
        timestamp: new Date().toISOString()
    });
});

app.get("/", function(req, resp){
    resp.json({
        message: "Enhanced Chat Server is running!",
        users: users.length,
        connections: connections.length,
        availableRooms: Object.keys(rooms)
    });
});

// Start server
server.listen(PORT, function(){
    console.log("Enhanced server running on port " + PORT);
});

io.sockets.on("connection", function(socket){
    connections.push(socket);
    console.log("Connected: %s sockets connected", connections.length);
    
    // Default room
    socket.currentRoom = 'general';
    socket.join('general');
   
    // When a new user connects and sends their username
    socket.on("new user", function(data, callback){
        callback(true);
        socket.username = data;
        users.push(socket.username);
        
        // Add user to default room
        if (!rooms[socket.currentRoom].users.includes(socket.username)) {
            rooms[socket.currentRoom].users.push(socket.username);
        }
        
        updateUsernames();
       
        // Broadcast user joined notification to everyone in the room
        socket.broadcast.to(socket.currentRoom).emit("user joined", {
            user: socket.username,
            timestamp: Date.now(),
            room: socket.currentRoom
        });
       
        console.log("User joined: " + socket.username + " in room: " + socket.currentRoom);
        
        // Send room history to the new user
        sendRoomHistory(socket, socket.currentRoom);
    });
    
    // Switch rooms
    socket.on("switch room", function(newRoom){
        if (!socket.username || !rooms[newRoom]) return;
        
        var oldRoom = socket.currentRoom;
        
        // Leave old room
        socket.leave(oldRoom);
        var userIndex = rooms[oldRoom].users.indexOf(socket.username);
        if (userIndex !== -1) {
            rooms[oldRoom].users.splice(userIndex, 1);
        }
        
        // Join new room
        socket.join(newRoom);
        socket.currentRoom = newRoom;
        if (!rooms[newRoom].users.includes(socket.username)) {
            rooms[newRoom].users.push(socket.username);
        }
        
        console.log(socket.username + " switched from " + oldRoom + " to " + newRoom);
        
        // Notify rooms
        socket.broadcast.to(oldRoom).emit("user left", {
            user: socket.username,
            timestamp: Date.now(),
            room: oldRoom
        });
        
        socket.broadcast.to(newRoom).emit("user joined", {
            user: socket.username,
            timestamp: Date.now(),
            room: newRoom
        });
        
        // Send room history
        sendRoomHistory(socket, newRoom);
    });
   
    // When user disconnects
    socket.on("disconnect", function(data){
        if(!socket.username) return;
       
        users.splice(users.indexOf(socket.username), 1);
        
        // Remove from current room
        if (socket.currentRoom && rooms[socket.currentRoom]) {
            var userIndex = rooms[socket.currentRoom].users.indexOf(socket.username);
            if (userIndex !== -1) {
                rooms[socket.currentRoom].users.splice(userIndex, 1);
            }
        }
        
        updateUsernames();
       
        // Broadcast user left notification
        socket.broadcast.to(socket.currentRoom).emit("user left", {
            user: socket.username,
            timestamp: Date.now(),
            room: socket.currentRoom
        });
       
        connections.splice(connections.indexOf(socket), 1);
        console.log("User left: " + socket.username);
        console.log("Disconnected: %s sockets connected", connections.length);
    });
   
    // When server receives a message
    socket.on("send message", function(data){
        if (!socket.username || !socket.currentRoom) return;
        
        var messageData = {
            msg: data.msg || data,
            user: socket.username,
            timestamp: Date.now(),
            room: socket.currentRoom,
            id: generateMessageId(),
            reactions: {},
            voiceData: data.voiceData || null,
            duration: data.duration || null
        };
        
        // Store message in room history
        rooms[socket.currentRoom].messages.push(messageData);
        
        // Limit stored messages to last 100 per room
        if (rooms[socket.currentRoom].messages.length > 100) {
            rooms[socket.currentRoom].messages.shift();
        }
        
        console.log("Message from " + socket.username + " in " + socket.currentRoom);
       
        // Send message to ALL clients in the same room
        io.to(socket.currentRoom).emit("new message", messageData);
    });
    
    // Voice message
    socket.on("send voice message", function(data){
        if (!socket.username || !socket.currentRoom) return;
        
        var messageData = {
            user: socket.username,
            timestamp: Date.now(),
            room: socket.currentRoom,
            id: generateMessageId(),
            reactions: {},
            voiceData: data.audio,
            duration: data.duration
        };
        
        // Store message in room history
        rooms[socket.currentRoom].messages.push(messageData);
        
        console.log("Voice message from " + socket.username + " in " + socket.currentRoom);
       
        // Send to all clients in the room
        io.to(socket.currentRoom).emit("new message", messageData);
    });
    
    // Reaction to message
    socket.on("toggle reaction", function(data){
        if (!socket.username || !socket.currentRoom) return;
        
        var messageId = data.messageId;
        var emoji = data.emoji;
        
        // Find message in room history
        var message = rooms[socket.currentRoom].messages.find(m => m.id === messageId);
        if (!message) return;
        
        if (!message.reactions[emoji]) {
            message.reactions[emoji] = [];
        }
        
        var userIndex = message.reactions[emoji].indexOf(socket.username);
        if (userIndex === -1) {
            // Add reaction
            message.reactions[emoji].push(socket.username);
        } else {
            // Remove reaction
            message.reactions[emoji].splice(userIndex, 1);
            if (message.reactions[emoji].length === 0) {
                delete message.reactions[emoji];
            }
        }
        
        // Broadcast reaction update to room
        io.to(socket.currentRoom).emit("reaction updated", {
            messageId: messageId,
            emoji: emoji,
            reactions: message.reactions,
            user: socket.username
        });
    });
    
    // Pin/unpin message
    socket.on("toggle pin", function(data){
        if (!socket.username || !socket.currentRoom) return;
        
        var messageId = data.messageId;
        var message = rooms[socket.currentRoom].messages.find(m => m.id === messageId);
        if (!message) return;
        
        if (rooms[socket.currentRoom].pinnedMessages[messageId]) {
            // Unpin
            delete rooms[socket.currentRoom].pinnedMessages[messageId];
            console.log("Message unpinned by " + socket.username);
        } else {
            // Pin
            rooms[socket.currentRoom].pinnedMessages[messageId] = {
                msg: message.msg,
                user: message.user,
                timestamp: message.timestamp
            };
            console.log("Message pinned by " + socket.username);
        }
        
        // Broadcast pin update to room
        io.to(socket.currentRoom).emit("pin updated", {
            messageId: messageId,
            isPinned: !!rooms[socket.currentRoom].pinnedMessages[messageId],
            pinnedBy: socket.username
        });
    });
   
    // When user is typing
    socket.on("typing", function(){
        socket.broadcast.to(socket.currentRoom).emit("typing", {
            user: socket.username,
            room: socket.currentRoom
        });
    });
   
    // When user stops typing
    socket.on("stop typing", function(){
        socket.broadcast.to(socket.currentRoom).emit("stop typing", {
            room: socket.currentRoom
        });
    });
    
    // Request room history
    socket.on("request room history", function(room){
        sendRoomHistory(socket, room);
    });
   
    // Update online users for all clients
    function updateUsernames(){
        io.sockets.emit("get users", users);
    }
    
    // Send room history to a socket
    function sendRoomHistory(socket, room){
        if (!rooms[room]) return;
        
        socket.emit("room history", {
            room: room,
            messages: rooms[room].messages,
            pinnedMessages: rooms[room].pinnedMessages
        });
    }
    
    // Generate unique message ID
    function generateMessageId(){
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
});