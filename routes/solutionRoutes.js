const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const authenticateToken = require('../utils/auth');
const io = require('../server');

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
            // Check if problem exists
            const problemExists = await pool.query('SELECT id FROM problems WHERE id = $1', [problem_id]);
            if (problemExists.rows.length === 0) {
                return res.status(404).json({ error: 'Problem not found' });
            }

            // Insert Solution
            const result = await pool.query(
                'INSERT INTO solutions (problem_id, user_id, description) VALUES ($1, $2, $3) RETURNING *',
                [problem_id, userId, description]
            );

            // ✅ FIXED: Correctly extract problem owner's user_id
            const problem = await pool.query('SELECT user_id FROM problems WHERE id = $1', [problem_id]);
            const problemOwner = problem.rows[0].user_id;

            // Store notification
            await pool.query(
                'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
                [problemOwner, 'new_solution', 'Your problem received a new solution!']
            );

          // ✅ FIXED: Ensure `io` is correctly used
          if (io && io.emit) {
            io.to(problemOwner.toString()).emit('new_notification', {
                type: 'new_solution',
                message: 'Your problem received a new solution!',
            });
        } else {
            console.warn('Socket.io instance not available');
        }

        res.status(201).json({ message: 'Solution submitted successfully', solution: result.rows[0] });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to submit solution' });
        }
    }
);

/**
 * GET /api/solutions/:problem_id - Get all solutions for a problem
 */
router.get('/:problem_id', async (req, res) => {
    const problemId = parseInt(req.params.problem_id, 10);

    if (isNaN(problemId)) {
        return res.status(400).json({ error: 'Invalid problem ID' });
    }

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
    let solutionId = parseInt(req.params.id, 10);

    if (isNaN(solutionId)) {
        return res.status(400).json({ error: 'Invalid solution ID' });
    }

    try {
        // ✅ FIXED: Correctly extract solver's user_id
        const solution = await pool.query('SELECT user_id FROM solutions WHERE id = $1', [solutionId]);
        if (solution.rows.length === 0) {
            return res.status(404).json({ error: 'Solution not found' });
        }
        const solverId = solution.rows[0].user_id;

        // Update votes
        const result = await pool.query(
            'UPDATE solutions SET votes = votes + 1 WHERE id = $1 RETURNING *',
            [solutionId]
        );

        // Store notification
        await pool.query(
            'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
            [solverId, 'upvote', 'Your solution was upvoted!']
        );

        // Emit real-time notification
        io.to(solverId).emit('new_notification', {
            type: 'upvote',
            message: 'Your solution was upvoted!',
        });

        res.json({ message: 'Solution upvoted successfully', solution: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upvote solution' });
    }
});

/**
 * PATCH /api/solutions/accept/:solutionId - Accept a solution and release bounty
 */
router.patch('/accept/:solutionId', authenticateToken, async (req, res) => {
    let solutionId = parseInt(req.params.solutionId, 10);

    if (isNaN(solutionId)) {
        return res.status(400).json({ error: 'Invalid solution ID' });
    }

    try {
        // Fetch solution and associated problem
        const solutionResult = await pool.query(
            'SELECT solutions.id, solutions.problem_id, solutions.user_id AS solver_id, problems.user_id AS owner_id, problems.bounty FROM solutions JOIN problems ON solutions.problem_id = problems.id WHERE solutions.id = $1',
            [solutionId]
        );

        if (solutionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Solution not found' });
        }

        const { problem_id, solver_id, owner_id, bounty } = solutionResult.rows[0];

        // Check if the requesting user is the problem owner
        if (req.user.userId !== owner_id) {
            return res.status(403).json({ error: 'Only the problem owner can accept a solution' });
        }

        // Transfer bounty to solver
        await pool.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [bounty, solver_id]);

        // Set problem bounty to zero to indicate bounty has been claimed
        await pool.query('UPDATE problems SET bounty = 0 WHERE id = $1', [problem_id]);

        res.json({ message: 'Solution accepted, bounty released', bountyTransferred: bounty });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to accept solution' });
    }
});

module.exports = router;
