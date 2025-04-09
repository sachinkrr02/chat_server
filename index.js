const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods : ["GET", "POST"]
  },
});

// Store users and message logs
const users = {}; 
const messages = []; 

// Root endpoint
app.get('/', (req, res) => {
  res.send("Socket.IO server is running.");
});

// Endpoint to check connected users and messages
app.get('/users', (req, res) => {
  res.json({
    connectedUsers: Object.keys(users),
    messageLog: messages,
  });
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Register a new user
  socket.on('register', (userId) => {
   
    for (const uid in users) {
      if (users[uid] === socket.id) {
        delete users[uid]; 
      }
    }

    users[userId] = socket.id;
    console.log(`User registered: ${userId}`);
    io.emit('userListUpdate', Object.keys(users));
  });

  // Handle private messages
  socket.on('sendPrivateMessage', ({ to, message, from }) => {
    const toSocketId = users[to];
    if (toSocketId) {
      io.to(toSocketId).emit('receivePrivateMessage', { from, message });
      messages.push({ from, to, message });
      console.log(`Message from ${from} to ${to}: ${message}`);
    } else {
      console.log(`User ${to} not connected`);
      socket.emit('errorMessage', `User ${to} is not online.`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const disconnectedUser = Object.keys(users).find(
      (userId) => users[userId] === socket.id
    );

    if (disconnectedUser) {
      delete users[disconnectedUser];
      console.log(`User disconnected: ${disconnectedUser}`);
      io.emit('userListUpdate', Object.keys(users));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
