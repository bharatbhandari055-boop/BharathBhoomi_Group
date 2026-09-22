const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { optionalCustomerAuth, requireCustomerAuth } = require('../middleware/customerAuth');

const router = express.Router();

const VALID_STATUSES = ['placed', 'packed', 'picked_up', 'on_the_way', 'delivered', 'cancelled', 'return_requested', 'returned'];

// Public: place an order (DUMMY payment — marks placed instantly, no real gateway yet)
router.post('/', optionalCustomerAuth, async (req, res) => {
  const { customer_name, customer_email, address, pincode, landmark, preferred_time, items } = req.body || {};
  if (!customer_name || !customer_email || !address || !pincode || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Name, email, address, pincode and at least one item are required' });
  }
  const total = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
  const accountId = req.customer ? req.customer.id : null;

  const { rows } = await pool.query(
    `INSERT INTO orders (customer_name, customer_email, address, pincode, landmark, preferred_time, items, total, status, delivery_date, customer_account_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'placed', now() + interval '4 days', $9) RETURNING *`,
    [customer_name, customer_email, address, pincode, landmark || '', preferred_time || '', JSON.stringify(items), total, accountId]
  );
  res.status(201).json({ ok: true, order: rows[0] });
});

// Admin only: list all orders
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(rows);
});

// Admin only: move an order to a new status
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const { rows } = await pool.query(
    `UPDATE orders SET status = $1, status_updated_at = now() WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// Customer: request a return on their own delivered order
router.post('/:id/return', requireCustomerAuth, async (req, res) => {
  const { reason } = req.body || {};
  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  const order = rows[0];
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.customer_account_id !== req.customer.id) return res.status(403).json({ error: 'Not your order' });
  if (order.status !== 'delivered') return res.status(400).json({ error: 'Only delivered orders can be returned' });

  const { rows: updated } = await pool.query(
    `UPDATE orders SET status = 'return_requested', status_updated_at = now(), return_reason = $1 WHERE id = $2 RETURNING *`,
    [reason || '', req.params.id]
  );
  res.json(updated[0]);
});

module.exports = router;
