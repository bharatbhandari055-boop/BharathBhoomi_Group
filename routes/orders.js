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

// Statuses an order can no longer be cancelled from
const NOT_CANCELLABLE_FROM = ['delivered', 'return_requested', 'returned', 'cancelled'];

// Customer-facing copy for each status, used in on-site notifications
const STATUS_MESSAGES = {
  placed: 'has been placed.',
  packed: 'has been packed.',
  picked_up: 'has been picked up for delivery.',
  on_the_way: 'is on the way!',
  delivered: 'has been delivered.',
  cancelled: 'has been cancelled.',
  return_requested: 'return request has been received.',
  returned: 'return has been completed.',
};

const RETURN_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

async function notifyCustomer(order, status) {
  if (!order.customer_account_id) return; // guest checkout — nowhere to deliver the notification
  const copy = STATUS_MESSAGES[status] || `status changed to ${status}`;
  const body = `Order #${order.id} ${copy}`;
  await pool.query(
    `INSERT INTO notifications (customer_account_id, order_id, title, body) VALUES ($1,$2,$3,$4)`,
    [order.customer_account_id, order.id, `Order #${order.id}`, body]
  );
}

// Admin only: move an order to a new status
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const { rows: existingRows } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'Not found' });

  if (status === 'cancelled' && NOT_CANCELLABLE_FROM.includes(existing.status)) {
    return res.status(400).json({ error: `Order cannot be cancelled once it is ${existing.status}` });
  }

  const { rows } = await pool.query(
    `UPDATE orders SET status = $1, status_updated_at = now() WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );
  await notifyCustomer(rows[0], status).catch(err => console.error('notifyCustomer failed:', err.message));
  res.json(rows[0]);
});

// Customer: request a return on their own delivered order
router.post('/:id/return', requireCustomerAuth, async (req, res) => {
  const { reason, photos } = req.body || {};
  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  const order = rows[0];
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.customer_account_id !== req.customer.id) return res.status(403).json({ error: 'Not your order' });
  if (order.status !== 'delivered') return res.status(400).json({ error: 'Only delivered orders can be returned' });

  const deliveredAt = new Date(order.status_updated_at).getTime();
  if (Date.now() - deliveredAt > RETURN_WINDOW_MS) {
    return res.status(400).json({ error: 'The 24-hour return window for this order has passed' });
  }

  const photoList = Array.isArray(photos) ? photos.filter(p => typeof p === 'string') : [];
  if (!photoList.length) {
    return res.status(400).json({ error: 'At least one photo is required to request a return' });
  }

  const { rows: updated } = await pool.query(
    `UPDATE orders SET status = 'return_requested', status_updated_at = now(), return_reason = $1, return_photos = $2 WHERE id = $3 RETURNING *`,
    [reason || '', JSON.stringify(photoList), req.params.id]
  );
  res.json(updated[0]);
});

module.exports = router;
