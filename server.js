const express = require('express'); 
const http = require('http'); // Required for Socket.io
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db'); // Database connection
const userRoutes = require('./routes/userRoutes');
const problemRoutes = require('./routes/problemRoutes');
const solutionRoutes = require('./routes/solutionRoutes');
const bountyRoutes = require('./routes/bountyRoutes');
const { initSocket, getIo, getUsers } = require("./socket");



const app = express();
const server = http.createServer(app); // Create HTTP server
const io = initSocket(server); // Initialize WebSocket

// MIDDLEWARE
app.use(cors());
app.use(bodyParser.json());

// TEST ROUTE
app.get('/', (req, res) => {
  res.send('🚀 Welcome to Nexro API!');
});

// API ROUTES
app.use('/api/users', userRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/solutions', solutionRoutes);
app.use('/api/bounties', bountyRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server only if not in test mode
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') { 
  server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
}

// Export for testing
module.exports = { app, server, io, getUsers };
