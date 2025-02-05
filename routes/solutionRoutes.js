const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const authenticateToken = require('../utils/auth');

const router = express.Router();

/**
 * POST /api/solutions - Submit a solution to a problem
 */
router.post(
  '/',
  authenticateToken,
  [body('description').notEmpty().withMessage('Description is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { problem_id, description } = req.body;
    const userId = req.user.userId;

    try {
      //Check if problem exists
      const problemExists = await pool.query('SELECT id FROM problems WHERE id = $1', [problem_id]);
      if (problemExists.rows.length === 0) {
        return res.status(404).json({ error: 'Problem not found' });
      }

      // Insert Solution
      const result = await pool.query(
        'INSERT INTO solutions (problem_id, user_id, description) VALUES ($1, $2, $3) RETURNING *',
        [problem_id, userId, description]
      );

      res.status(201).json({ message: 'Solution submitted successfully', solution: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to submit solution' });
    }
  }
);

/**
 * GET /api/solutions/:problem_id - Get all solutions for a problems
 */
router.get('/:problem_id', async (req, res) => {
  const problemId = req.params.problem_id;

  try {
    const result = await pool.query(
      'SELECT * FROM solutions WHERE problem_id = $1 ORDER BY votes DESC, created_at ASC',
      [problemId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch solutions' });
  }
});

/**
 * PATCH /api/solutions/upvote/:id - Upvote a solution
 */
router.patch('/upvote/:id', authenticateToken, async (req, res) => {
  const solutionId = req.params.id;

  try {
      const result = await pool.query(
          'UPDATE solutions SET votes = votes + 1 WHERE id = $1 RETURNING *',
          [solutionId]
      );

      if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Solution not found' });
      }

      res.json({ message: 'Solution upvoted successfully', solution: result.rows[0] });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to upvote solution' });
  }
});


module.exports = router;