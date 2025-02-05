const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db'); //Database connection
const userRoutes = require('./routes/userRoutes'); //  Import user routes
const problemRoutes = require('./routes/problemRoutes');
const solutionRoutes = require('./routes/solutionRoutes');
const { body } = require('express-validator');


const app = express();
const PORT = process.env.PORT || 5000;

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



if (process.env.NODE_ENV !== 'test') { 
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

//Export app for testing
module.exports = app;
