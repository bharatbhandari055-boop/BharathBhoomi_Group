const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// List all customer entries (admin only)
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM customers ORDER BY created_at DESC'
  );
  res.json(rows);
});
// Public contact form (no auth required)
router.post('/contact', async (req, res) => {
  const { name, contact, message } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const { rows } = await pool.query(
    `INSERT INTO customers (name, contact, message, source) VALUES ($1,$2,$3,'contact-form') RETURNING *`,
    [name, contact || '', message || '']
  );
  res.status(201).json(rows[0]);
});
// Add a new customer entry (admin only)
router.post('/', requireAuth, async (req, res) => {
  const { name, contact, message } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const { rows } = await pool.query(
    `INSERT INTO customers (name, contact, message, source) VALUES ($1,$2,$3,'manual') RETURNING *`,
    [name, contact || '', message || '']
  );
  res.status(201).json(rows[0]);
});

// Delete a customer entry (admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
