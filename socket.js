const { Server } = require("socket.io");

let io;
const users = new Map(); // Store users in a Map for easy access

function initSocket(server) {
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    // Register user with their ID
    socket.on("registerUser", (userId) => {
      users.set(userId, socket.id);
      console.log(`✅ User ${userId} registered with Socket ID: ${socket.id}`);
      console.log("📢 Active Users List:", users);
    });

    // Remove user from list when they disconnect
    socket.on("disconnect", () => {
      console.log(`🔴 User disconnected: ${socket.id}`);
      for (let [userId, socketId] of users.entries()) {
        if (socketId === socket.id) {
          users.delete(userId);
          console.log(`❌ Removed user ${userId} from Socket.io users list`);
          break;
        }
      }
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error("Socket.io has not been initialized!");
  }
  return io;
}

function getUsers() {
  return users;
}

module.exports = { initSocket, getIo, getUsers };
