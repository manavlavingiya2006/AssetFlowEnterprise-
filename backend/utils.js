const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = 'assetflow_hackathon_secret_key_2026';

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!user || user.status === 'Inactive') return res.status(401).json({ error: 'Invalid session' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function notify(userId, type, message) {
  db.prepare('INSERT INTO notifications (user_id, type, message) VALUES (?,?,?)').run(userId, type, message);
}

function log(userId, action, details) {
  db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?,?,?)').run(userId, action, details || '');
}

module.exports = { JWT_SECRET, authRequired, requireRole, notify, log };
