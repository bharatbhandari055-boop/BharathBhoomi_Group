const jwt = require('jsonwebtoken');

function requireCustomerAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please sign in' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'customer') return res.status(401).json({ error: 'Please sign in' });
    req.customer = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session expired, please sign in again' });
  }
}

// Doesn't fail if missing — just attaches req.customer when a valid token is present
function optionalCustomerAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.type === 'customer') req.customer = payload;
    } catch (e) { /* ignore invalid token for optional auth */ }
  }
  next();
}

module.exports = { requireCustomerAuth, optionalCustomerAuth };
