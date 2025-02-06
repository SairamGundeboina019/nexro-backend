const express = require('express');
const pool = require('../db');
const authenticateToken = require('../utils/auth');

const router = express.Router();

/**
 * GET /api/notification - Get user notification
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});


/**
 * PATCH /api/notifications/mark-read - Mark all notifications as read
 */
router.patch('/mark-read', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.userId]);
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

module.exports = router;
