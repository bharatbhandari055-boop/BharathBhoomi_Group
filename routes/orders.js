const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public: place an order (DUMMY payment — marks paid instantly, no real gateway yet)
router.post('/', async (req, res) => {
  const { customer_name, customer_email, items } = req.body || {};
  if (!customer_name || !customer_email || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Name, email and at least one item are required' });
  }
  const total = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);

  const { rows } = await pool.query(
    `INSERT INTO orders (customer_name, customer_email, items, total, status)
     VALUES ($1,$2,$3,$4,'paid') RETURNING *`,
    [customer_name, customer_email, JSON.stringify(items), total]
  );
  res.status(201).json({ ok: true, order: rows[0] });
});

// Admin only: list orders
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(rows);
});

module.exports = router;
