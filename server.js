// Import dependencies
var express = require("express");
var app = express();
var http = require("http");
var server = http.createServer(app);
var io = require("socket.io")(server);
var path = require("path");

let users = [];
let connections = [];

// ✅ Use Render's assigned port (or 3001 locally)
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ✅ Serve static files (like index.html, CSS, JS)
app.use(express.static(path.join(__dirname)));

// ✅ Serve index.html for root route
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ Handle Socket.IO connections
io.on("connection", function (socket) {
  connections.push(socket);
  console.log("Connected: %s sockets connected", connections.length);

  // When a new user connects
  socket.on("new user", function (data, callback) {
    callback(true);
    socket.username = data;
    users.push(socket.username);
    updateUsernames();

    // Broadcast user joined notification
    socket.broadcast.emit("user joined", {
      user: socket.username,
      timestamp: new Date().toLocaleTimeString(),
    });

    console.log("User joined: " + socket.username);
  });

  // When user disconnects
  socket.on("disconnect", function () {
    if (!socket.username) return;

    socket.broadcast.emit("user left", {
      user: socket.username,
      timestamp: new Date().toLocaleTimeString(),
    });

    users.splice(users.indexOf(socket.username), 1);
    updateUsernames();
    connections.splice(connections.indexOf(socket), 1);
    console.log("User left: " + socket.username);
    console.log("Disconnected: %s sockets connected", connections.length);
  });

  // When server receives a message
  socket.on("send message", function (data) {
    console.log("Message from " + socket.username + ": " + data);

    io.sockets.emit("new message", {
      msg: data,
      user: socket.username,
      timestamp: new Date().toLocaleTimeString(),
    });
  });

  // Typing indicators
  socket.on("typing", function () {
    socket.broadcast.emit("typing", { user: socket.username });
  });

  socket.on("stop typing", function () {
    socket.broadcast.emit("stop typing", { user: socket.username });
  });

  socket.on("message read", function () {
    socket.broadcast.emit("message read", { user: socket.username });
  });

  function updateUsernames() {
    io.sockets.emit("get users", users);
  }
});
