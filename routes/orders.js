const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { optionalCustomerAuth } = require('../middleware/customerAuth');

const router = express.Router();

// Public: place an order (DUMMY payment — marks paid instantly, no real gateway yet)
// If the customer is signed in, the order is linked to their account automatically.
router.post('/', optionalCustomerAuth, async (req, res) => {
  const { customer_name, customer_email, address, pincode, landmark, preferred_time, items } = req.body || {};
  if (!customer_name || !customer_email || !address || !pincode || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Name, email, address, pincode and at least one item are required' });
  }
  const total = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
  const accountId = req.customer ? req.customer.id : null;

  const { rows } = await pool.query(
    `INSERT INTO orders (customer_name, customer_email, address, pincode, landmark, preferred_time, items, total, status, customer_account_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'paid',$9) RETURNING *`,
    [customer_name, customer_email, address, pincode, landmark || '', preferred_time || '', JSON.stringify(items), total, accountId]
  );
  res.status(201).json({ ok: true, order: rows[0] });
});

// Admin only: list orders
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(rows);
});

module.exports = router;
