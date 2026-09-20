const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY sort_order ASC, id ASC');
  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const { name, icon, description, price, sort_order } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const { rows } = await pool.query(
    'INSERT INTO products (name, icon, description, price, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [name, icon || '🌿', description || '', price || 0, sort_order || 0]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, icon, description, price, sort_order } = req.body || {};
  const { rows } = await pool.query(
    `UPDATE products SET name = COALESCE($1,name), icon = COALESCE($2,icon),
     description = COALESCE($3,description), price = COALESCE($4,price), sort_order = COALESCE($5,sort_order)
     WHERE id = $6 RETURNING *`,
    [name, icon, description, price, sort_order, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
