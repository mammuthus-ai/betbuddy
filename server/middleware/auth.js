import jwt from 'jsonwebtoken';
import config from '../config.js';
import db from '../db.js';

export function authenticateToken(req, res, next) {
  const token = req.cookies?.bb_token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function generateToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });
}

export function getUserFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').reduce((acc, c) => {
    const [key, val] = c.trim().split('=');
    acc[key] = val;
    return acc;
  }, {});
  const token = cookies.bb_token;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
  } catch {
    return null;
  }
}
