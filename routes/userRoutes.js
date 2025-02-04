const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authenticateToken = require('../middlewares/authMiddleware');

const router = express.Router();

// USER REGISTRATION ROUTE
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('name').isLength({ min: 3 }).withMessage('Name must be at least 3 characters long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;
    try {
      // Check if user already exists
      const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash the password correctly
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('Storing Hashed Password:', hashedPassword); // Debugging

      // Insert into database
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
        [email, hashedPassword, name]
      );

      res.status(201).json({ message: 'User registered successfully', userId: result.rows[0].id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  }
);

// USER LOGIN ROUTE
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if user exists
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];

      console.log('Entered Password:', password);
      console.log('Stored Hashed Password:', user.password_hash);

      // Ensure the password is correctly compared
      if (!user.password_hash || typeof user.password_hash !== 'string') {
        return res.status(500).json({ error: 'Server error: Invalid password storage' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        console.log('❌ Password does NOT match!');
        return res.status(401).json({ error: 'Invalid Credentials' });
      }
      console.log('✅ Password matches! Logging in...');

      // Generate JWT
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.json({ message: 'Login Successful', token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to log in' });
    }
  }
);

// GET USER PROFILE (PROTECTED)
router.get('/profile', authenticateToken, async (req, res) => {
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

// UPDATE USER PROFILE
router.put(
  '/profile',
  authenticateToken,
  [body('name').isLength({ min: 3 }).withMessage('Name must be at least 3 characters long')],
  async (req, res) => {
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

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'Profile updated successfully', profile: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

module.exports = router;
