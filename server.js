const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config(); // Load enviornment variables;
const { Pool } = require('pg'); // Correctly import Pool
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator'); //Import express=validator


// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;


//Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'nexro',  
  password: '9885',
  port: 5432, // Default PostgreSql Port
});


// Checking if the database is reachable and logging the results.
pool.connect((err) => {
  if (err) {
    console.error('Failed to connect to the database', err);
  } else {
    console.log('Connected to the database');
  }
});


// Middleware
// ( Making sure the app handle data from other websites and can understand JSON )
app.use(cors()); // Enable Cross-Origin Resource sharing 
app.use(bodyParser.json()); // Automaitcally parses incoming JSON data from requests.


// Test Route
app.get('/', (req, res) => {
    res.send('Welcome to Nexro API!');
});

//User Registration -- This route creates a new user securely by hashing their password and saving their info in the database 
app.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
      [email, hashedPassword, name]
    );
      res.status(201).json({ message: 'User registered succesfully', userId: result.rows[0].id });
    } catch (error) {
      console.error(error);
      res.status(500).json({error: 'Failed to register user'});
    }
});


//User Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    //Check if User exists
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0 ) {
      return res.status(404).json({ error: 'User not found'});
    }
    
    const user = result.rows[0];

    //Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalis Credentials' });
    }

    //Generate JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h'});

     res.json({ message: 'Login Successful', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

  //Middleware Protected Route Example
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access Denied'});
  }
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
      res.status(403).json({ error: 'Invalid token'});
  }
};


// Get User Profile (Protected)
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update User Profile
app.put('/profile', 
  authenticateToken,
   body('name').isLength({ min: 3 }).withMessage('Name must be at least 3 characters long'), 
   async (req, res) => {
    // Validate request 
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }


  const userId = req.user.userId;
  const { name } = req.body;

  try {
    const result = await pool.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, created_at',
      [name, userId]
    );

    if (result.rows.length == 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully', profile: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});



// Protected Route Example
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', userId: req.user.userId});
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
