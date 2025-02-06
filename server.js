const express = require('express'); 
const http = require('http'); // Required to use Socket.io
const socketIo = require('socket.io'); // Real-time notifications 
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db'); //Database connection
const userRoutes = require('./routes/userRoutes'); //  Import user routes
const problemRoutes = require('./routes/problemRoutes');
const solutionRoutes = require('./routes/solutionRoutes');
const bountyRoutes = require('./routes/bountyRoutes');
const { body } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// MIDDLEWARE
app.use(cors());
app.use(bodyParser.json());


//TEST ROUTE
app.get('/', (req, res) => {
  res.send('Welcome to Nexro API!');
});

//USER ROUTES
app.use('/api/users', userRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/solutions', solutionRoutes);
app.use('/api/bounties', bountyRoutes);


// WebSocket Connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


//Start server only if not in test mode
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') { 
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

//Export app for testing
module.exports = app;
