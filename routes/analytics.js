const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public: log a visit (called once per page load / session)
router.post('/visit', async (req, res) => {
  await pool.query(
    `INSERT INTO visits (day, count) VALUES (CURRENT_DATE, 1)
     ON CONFLICT (day) DO UPDATE SET count = visits.count + 1`
  );
  res.status(204).end();
});

// Admin only: last 30 days of visitor counts
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT day, count FROM visits WHERE day >= CURRENT_DATE - INTERVAL '30 days' ORDER BY day ASC`
  );
  res.json(rows);
});

module.exports = router;
