const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireCustomerAuth } = require('../middleware/customerAuth');

const router = express.Router();

// ---- Customer side ----
router.get('/mine', requireCustomerAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM messages WHERE customer_account_id = $1 ORDER BY created_at ASC',
    [req.customer.id]
  );
  await pool.query(
    `UPDATE messages SET read_by_customer = true WHERE customer_account_id = $1 AND sender = 'admin'`,
    [req.customer.id]
  );
  res.json(rows);
});

router.post('/mine', requireCustomerAuth, async (req, res) => {
  const { body } = req.body || {};
  if (!body) return res.status(400).json({ error: 'Message cannot be empty' });
  const { rows } = await pool.query(
    `INSERT INTO messages (customer_account_id, sender, body, read_by_customer) VALUES ($1,'customer',$2,true) RETURNING *`,
    [req.customer.id, body]
  );
  res.status(201).json(rows[0]);
});

router.get('/mine/unread-count', requireCustomerAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM messages WHERE customer_account_id = $1 AND sender = 'admin' AND read_by_customer = false`,
    [req.customer.id]
  );
  res.json({ count: rows[0].n });
});

// ---- Admin side ----
router.get('/threads', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT ca.id AS customer_account_id, ca.name, ca.email,
      MAX(m.created_at) AS last_message_at,
      COUNT(*) FILTER (WHERE m.sender = 'customer') AS message_count
    FROM customer_accounts ca
    JOIN messages m ON m.customer_account_id = ca.id
    GROUP BY ca.id, ca.name, ca.email
    ORDER BY last_message_at DESC
  `);
  res.json(rows);
});

router.get('/thread/:customerId', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM messages WHERE customer_account_id = $1 ORDER BY created_at ASC',
    [req.params.customerId]
  );
  res.json(rows);
});

router.post('/thread/:customerId/reply', requireAuth, async (req, res) => {
  const { body } = req.body || {};
  if (!body) return res.status(400).json({ error: 'Reply cannot be empty' });
  const { rows } = await pool.query(
    `INSERT INTO messages (customer_account_id, sender, body, read_by_customer) VALUES ($1,'admin',$2,false) RETURNING *`,
    [req.params.customerId, body]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;
