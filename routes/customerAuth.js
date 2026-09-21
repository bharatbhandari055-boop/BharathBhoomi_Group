const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireCustomerAuth } = require('../middleware/customerAuth');

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = await pool.query('SELECT id FROM customer_accounts WHERE email = $1', [email]);
  if (existing.rows.length) return res.status(409).json({ error: 'An account with this email already exists' });

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    'INSERT INTO customer_accounts (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email',
    [name, email, hash]
  );
  const user = rows[0];
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, type: 'customer' }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ token, name: user.name, email: user.email });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { rows } = await pool.query('SELECT * FROM customer_accounts WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, type: 'customer' }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, name: user.name, email: user.email });
});

router.get('/me', requireCustomerAuth, (req, res) => {
  res.json({ name: req.customer.name, email: req.customer.email });
});

router.get('/my-orders', requireCustomerAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM orders WHERE customer_account_id = $1 ORDER BY created_at DESC',
    [req.customer.id]
  );
  res.json(rows);
});

module.exports = router;
