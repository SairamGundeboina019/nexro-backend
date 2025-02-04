const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const authenticateToken = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * POST /API/PROBLEMS - Create a new problem
 */

router.post(
  '/',
  authenticateToken,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, location } = req.body;
    const userId = req.user.userId;

    try {
      const result = await pool.query(
        'INSERT INTO problems (user_id, title, description, location) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, title, description, location]
      );

      res.status(201).json({ message: 'Problem posted successfully', problems: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Faile to post problem' });
    }
  }
);

/**
 * GET /api/problems - Get all problems
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM problems ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch problem'})
  }
});

/**
 * GET /api/problems/:id- Get a problem by ID 
 */

router.get('/:id', async (req, res) => {
  const problemId = req.params.id;

  try {
    const result = await pool.query('SELECT * FROM problems WHERE id = $1', [problemId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
});

module.exports = router;
