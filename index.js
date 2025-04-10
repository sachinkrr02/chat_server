const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS config
const io = socketIO(server, {
  cors: {
    origin: '*', // Allow all origins (for development only; specify domain for production)
    methods: ['GET', 'POST'],
  },
});

// Store users and message logs
const users = {}; // Format: { userId: socketId }
const messages = []; // Array of { from, to, message }

// Root endpoint (health check)
app.get('/', (req, res) => {
  res.send('Socket.IO server is running. sachin');
});

// Endpoint to fetch users and messages
app.get('/users', (req, res) => {
  res.json({
    connectedUsers: Object.keys(users),
    messageLog: messages,
  });
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  // Register user to socket
  socket.on('register', (userId) => {
    // Remove any existing mapping with the same socket ID
    for (const uid in users) {
      if (users[uid] === socket.id) {
        delete users[uid];
      }
    }

    // Map new userId to socket.id
    users[userId] = socket.id;
    console.log(`🔐 User registered: ${userId}`);

    // Notify all clients about the updated user list
    io.emit('userListUpdate', Object.keys(users));
  });

  // Private message handler
  socket.on('sendPrivateMessage', ({ to, message, from }) => {
    const toSocketId = users[to];
    if (toSocketId) {
      io.to(toSocketId).emit('receivePrivateMessage', { from, message });
      messages.push({ from, to, message });
      console.log(`📩 Message from ${from} to ${to}: ${message}`);
    } else {
      console.log(`⚠️ User ${to} not connected`);
      socket.emit('errorMessage', `User ${to} is not online.`);
    }
  });

  // On disconnection
  socket.on('disconnect', () => {
    const disconnectedUser = Object.keys(users).find(
      (userId) => users[userId] === socket.id
    );
    if (disconnectedUser) {
      delete users[disconnectedUser];
      console.log(`❌ User disconnected: ${disconnectedUser}`);
      io.emit('userListUpdate', Object.keys(users));
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
