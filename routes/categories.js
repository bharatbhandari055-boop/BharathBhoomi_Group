const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const { name, image, sort_order } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const { rows } = await pool.query(
    'INSERT INTO categories (name, image, sort_order) VALUES ($1,$2,$3) RETURNING *',
    [name, image || null, sort_order || 0]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, image, sort_order } = req.body || {};
  const { rows } = await pool.query(
    `UPDATE categories SET name = COALESCE($1,name), image = COALESCE($2,image), sort_order = COALESCE($3,sort_order)
     WHERE id = $4 RETURNING *`,
    [name, image, sort_order, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, async (req, res) => {
  await pool.query('UPDATE products SET category_id = NULL WHERE category_id = $1', [req.params.id]);
  await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
