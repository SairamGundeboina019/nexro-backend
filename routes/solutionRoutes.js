const express = require('express');
const { body, validationResult, param } = require('express-validator');
const pool = require('../db');
const authenticateToken = require('../utils/auth');
const { getIo, getUsers } = require('../socket'); // Import WebSocket utilities

const router = express.Router();

/**
 * ✅ POST /api/solutions - Submit a solution to a problem
 */
router.post(
    '/',
    authenticateToken,
    [
        body('problem_id').isInt().withMessage('Problem ID must be a number'),
        body('description').notEmpty().withMessage('Description is required'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { problem_id, description } = req.body;
        const userId = req.user.userId;

        try {
            // Fetch the problem owner
            const problemResult = await pool.query('SELECT user_id FROM problems WHERE id = $1', [problem_id]);
            if (problemResult.rows.length === 0) {
                return res.status(404).json({ error: 'Problem not found' });
            }
            const problemOwnerId = problemResult.rows[0].user_id;

            // Insert the solution
            const result = await pool.query(
                'INSERT INTO solutions (problem_id, user_id, description) VALUES ($1, $2, $3) RETURNING *',
                [problem_id, userId, description]
            );

            // Send real-time notification to problem owner
            try {
                const io = getIo();
                const users = getUsers();
                const ownerSocketId = users.get(problemOwnerId); // ✅ Use Map for user storage
                if (ownerSocketId) {
                    console.log(`📢 Notifying problem owner (User ID: ${problemOwnerId}) - Socket ID: ${ownerSocketId}`);
                    io.to(ownerSocketId).emit('newSolution', {
                        message: 'A new solution has been submitted for your problem!',
                        problem_id,
                        solution_id: result.rows[0].id,
                    });
                } else {
                    console.log(`⚠️ Problem owner (User ID: ${problemOwnerId}) is NOT connected to Socket.io`);
                }
            } catch (err) {
                console.error("⚠️ WebSocket Error: Could not notify problem owner.", err);
            }

            res.status(201).json({ message: 'Solution submitted successfully', solution: result.rows[0] });
        } catch (error) {
            console.error("🔥 Database Error:", error);
            res.status(500).json({ error: 'Failed to submit solution' });
        }
    }
);
/**
 * ✅ GET /api/solutions/:problem_id - Get all solutions for a problem
 */
router.get('/:problem_id', param('problem_id').isInt().withMessage('Invalid problem ID'), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const problemId = parseInt(req.params.problem_id, 10);

    try {
        const result = await pool.query(
            'SELECT * FROM solutions WHERE problem_id = $1 ORDER BY votes DESC, created_at ASC',
            [problemId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("🔥 Database Error:", error);
        res.status(500).json({ error: 'Failed to fetch solutions' });
    }
});

/**
 * ✅ PATCH /api/solutions/upvote/:id - Upvote a solution
 */
router.patch('/upvote/:id', authenticateToken, param('id').isInt().withMessage('Invalid solution ID'), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const solutionId = parseInt(req.params.id, 10);

    try {
        // Retrieve the solver's user_id
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

        // Send real-time notification to solver
        try {
            const io = getIo();
            const users = getUsers();
            const solverSocketId = users.get(solverId);
            if (solverSocketId) {
                io.to(solverSocketId).emit('new_notification', {
                    type: 'upvote',
                    message: 'Your solution was upvoted!',
                });
            }
        } catch (err) {
            console.error("⚠️ WebSocket Error: Could not notify solver.", err);
        }

        res.json({ message: 'Solution upvoted successfully', solution: result.rows[0] });
    } catch (error) {
        console.error("🔥 Database Error:", error);
        res.status(500).json({ error: 'Failed to upvote solution' });
    }
});

/**
 * ✅ PATCH /api/solutions/accept/:solutionId - Accept a solution and release bounty
 */
router.patch('/accept/:solutionId', authenticateToken, param('solutionId').isInt().withMessage('Invalid solution ID'), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const solutionId = parseInt(req.params.solutionId, 10);

    try {
        // Fetch solution and associated problem
        const solutionResult = await pool.query(
            `SELECT solutions.id, solutions.problem_id, solutions.user_id AS solver_id, 
                    problems.user_id AS owner_id, problems.bounty 
             FROM solutions 
             JOIN problems ON solutions.problem_id = problems.id 
             WHERE solutions.id = $1`,
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

        // Set problem bounty to zero (mark as awarded)
        await pool.query('UPDATE problems SET bounty = 0 WHERE id = $1', [problem_id]);

        // Send notification to the solver
        try {
            const io = getIo();
            const users = getUsers();
            const solverSocketId = users.get(solver_id);
            if (solverSocketId) {
                console.log(`🏆 Notifying solver (User ID: ${solver_id}) - Socket ID: ${solverSocketId}`);
                io.to(solverSocketId).emit('bountyAwarded', {
                    message: 'Your solution has been accepted! You received the bounty!',
                    bounty: bounty,
                    problem_id: problem_id,
                });
            } else {
                console.log(`⚠️ Solver (User ID: ${solver_id}) is NOT connected to Socket.io`);
            }
        } catch (err) {
            console.error("⚠️ WebSocket Error: Could not notify solver.", err);
        }

        res.json({ message: 'Solution accepted, bounty released', bountyTransferred: bounty });
    } catch (error) {
        console.error("🔥 Database Error:", error);
        res.status(500).json({ error: 'Failed to accept solution' });
    }
});


module.exports = router;
