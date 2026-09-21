const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public: anyone can read the site content
router.get('/', async (req, res) => {
  const { rows } = await pool.query("SELECT value FROM content WHERE key = 'site'");
  res.json(rows[0] ? rows[0].value : {});
});

// Admin only: update site content (partial merge)
router.put('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT value FROM content WHERE key = 'site'");
  const current = rows[0] ? rows[0].value : {};
  const updated = Object.assign({}, current, req.body || {});
  await pool.query(
    "INSERT INTO content (key, value) VALUES ('site', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
    [JSON.stringify(updated)]
  );
  res.json(updated);
});

module.exports = router;
