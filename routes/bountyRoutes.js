const express = require('express');
const router = express.Router();
const pool = require('../db');
const stripe = require('../utils/stripe'); // ✅ Using separate Stripe utility file

/**
 * POST /api/bounties/pay - Fund a bounty
 */
router.post('/pay', async (req, res) => {
    const authenticateToken = require('../utils/auth'); // ✅ Fix circular dependency by requiring inside route
    authenticateToken(req, res, async () => {
        const { problem_id, amount, payment_method_id } = req.body;
        const userId = req.user.userId;

        try {
            // Check if problem exists
            const problem = await pool.query('SELECT * FROM problems WHERE id = $1', [problem_id]);
            if (problem.rows.length === 0) {
                return res.status(404).json({ error: 'Problem not found' });
            }

            // Create Stripe Payment Intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount * 100, // Convert to cents
                currency: 'usd',
                payment_method: payment_method_id,
                confirm: true,
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never' // Prevents Stripe from using 3D Secure redirection
                }
            });

            // Store bounty in database
            const result = await pool.query(
                'INSERT INTO bounties (problem_id, user_id, amount, status, payment_intent_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [problem_id, userId, amount, 'pending', paymentIntent.id]
            );

            res.status(201).json({
                message: 'Bounty funded successfully',
                bounty: result.rows[0],
                payment_intent: paymentIntent.id,
            });
        } catch (error) {
            console.error('Stripe Payment Failed:', error);
            res.status(500).json({ error: 'Payment failed', details: error.message });
        }
    });
});

/**
 * POST /api/bounties/release/:bounty_id - Release bounty to solver
 */
router.post('/release/:bounty_id', async (req, res) => {
    const authenticateToken = require('../utils/auth'); // ✅ Fix circular dependency by requiring inside route
    authenticateToken(req, res, async () => {
        const bountyId = req.params.bounty_id;
        const { solver_id } = req.body;
        const userId = req.user.userId;

        try {
            // Verify bounty exists and is pending
            const bounty = await pool.query('SELECT * FROM bounties WHERE id = $1 AND status = $2', [bountyId, 'pending']);
            if (bounty.rows.length === 0) {
                return res.status(404).json({ error: 'Bounty not found or already released' });
            }

            // Fetch solver's Stripe account ID
            const solver = await pool.query('SELECT stripe_account_id FROM users WHERE id = $1', [solver_id]);
            if (solver.rows.length === 0 || !solver.rows[0].stripe_account_id) {
                return res.status(400).json({ error: 'Solver does not have a connected Stripe account' });
            }

            // Transfer bounty amount to solver's Stripe account
            const payout = await stripe.transfers.create({
                amount: bounty.rows[0].amount * 100, // Convert to cents
                currency: 'usd',
                destination: solver.rows[0].stripe_account_id,
            });

            // Update bounty status
            await pool.query('UPDATE bounties SET status = $1 WHERE id = $2', ['released', bountyId]);

            res.json({ message: 'Bounty released successfully', payout });
        } catch (error) {
            console.error('Stripe Payout Failed:', error);
            res.status(500).json({ error: 'Failed to release bounty', details: error.message });
        }
    });
});

/**
 * POST /api/bounties/refund/:bounty_id - Refund bounty
 */
router.post('/refund/:bounty_id', async (req, res) => {
    const authenticateToken = require('../utils/auth'); // ✅ Fix circular dependency by requiring inside route
    authenticateToken(req, res, async () => {
        const bountyId = req.params.bounty_id;
        const userId = req.user.userId;

        try {
            // Verify bounty exists and is pending
            const bounty = await pool.query(
                'SELECT * FROM bounties WHERE id = $1 AND user_id = $2 AND status = $3',
                [bountyId, userId, 'pending']
            );

            if (bounty.rows.length === 0) {
                return res.status(404).json({ error: 'Bounty not found or already processed' });
            }

            // Refund via Stripe
            const paymentIntentId = bounty.rows[0].payment_intent_id;
            if (!paymentIntentId) {
                return res.status(400).json({ error: 'No payment intent found for this bounty' });
            }

            const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
            });

            // Update bounty status
            await pool.query('UPDATE bounties SET status = $1 WHERE id = $2', ['refunded', bountyId]);

            res.json({ message: 'Bounty refunded successfully', refund });
        } catch (error) {
            console.error('Stripe Refund Failed:', error);
            res.status(500).json({ error: 'Failed to refund bounty', details: error.message });
        }
    });
});

module.exports = router;
