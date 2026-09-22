const express = require('express');
const { pool } = require('../db');
const { requireCustomerAuth } = require('../middleware/customerAuth');

const router = express.Router();

// Customer: list own notifications, most recent first
router.get('/mine', requireCustomerAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM notifications WHERE customer_account_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.customer.id]
  );
  res.json(rows);
});

// Customer: unread count, for the bell badge / polling
router.get('/mine/unread-count', requireCustomerAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS n FROM notifications WHERE customer_account_id = $1 AND is_read = false',
    [req.customer.id]
  );
  res.json({ count: rows[0].n });
});

// Customer: mark all as read (called when the notifications panel is opened)
router.post('/mine/mark-read', requireCustomerAuth, async (req, res) => {
  await pool.query(
    'UPDATE notifications SET is_read = true WHERE customer_account_id = $1 AND is_read = false',
    [req.customer.id]
  );
  res.json({ ok: true });
});

module.exports = router;
