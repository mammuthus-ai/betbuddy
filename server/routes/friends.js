import { Router } from 'express';
import QRCode from 'qrcode';
import { authenticateToken } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// List friends
router.get('/', authenticateToken, (req, res) => {
  const friends = db.prepare(`
    SELECT u.id, u.username, u.name, u.avatar, u.wins, u.losses, u.streak, f.status,
      CASE WHEN f.user_id = ? THEN 'sent' ELSE 'received' END as direction
    FROM friends f
    JOIN users u ON (u.id = CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END)
    WHERE f.user_id = ? OR f.friend_id = ?
  `).all(req.user.id, req.user.id, req.user.id, req.user.id);

  const accepted = friends.filter(f => f.status === 'accepted');
  const pendingReceived = friends.filter(f => f.status === 'pending' && f.direction === 'received');
  const pendingSent = friends.filter(f => f.status === 'pending' && f.direction === 'sent');

  res.json({ friends: accepted, pendingReceived, pendingSent });
});

// Send friend request
router.post('/request', authenticateToken, (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (userId === req.user.id) return res.status(400).json({ error: 'Cannot friend yourself' });

  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const existing = db.prepare(`
    SELECT * FROM friends WHERE
    (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `).get(req.user.id, userId, userId, req.user.id);

  if (existing) {
    if (existing.status === 'accepted') return res.status(400).json({ error: 'Already friends' });
    if (existing.status === 'pending') return res.status(400).json({ error: 'Request already pending' });
  }

  db.prepare('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)').run(req.user.id, userId, 'pending');

  const io = req.app.get('io');
  if (io) io.to(`user:${userId}`).emit('friend:request', { from: { id: req.user.id, name: req.user.name, avatar: req.user.avatar } });

  res.json({ ok: true });
});

// Accept friend request
router.post('/accept', authenticateToken, (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const request = db.prepare(`
    SELECT * FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'pending'
  `).get(userId, req.user.id);

  if (!request) return res.status(404).json({ error: 'No pending request found' });

  db.prepare(`UPDATE friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ?`).run(userId, req.user.id);

  const io = req.app.get('io');
  if (io) io.to(`user:${userId}`).emit('friend:accepted', { from: { id: req.user.id, name: req.user.name, avatar: req.user.avatar } });

  res.json({ ok: true });
});

// Remove/decline friend
router.post('/remove', authenticateToken, (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  db.prepare(`
    DELETE FROM friends WHERE
    (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `).run(req.user.id, userId, userId, req.user.id);

  res.json({ ok: true });
});

// Get QR code
router.get('/qr', authenticateToken, (req, res) => {
  const qrData = JSON.stringify({ userId: req.user.id, token: req.user.qr_token });
  QRCode.toDataURL(qrData, { width: 300, margin: 2, color: { dark: '#6c63ff', light: '#0a0a0f' } })
    .then(url => res.json({ qrCode: url, qrData }))
    .catch(err => res.status(500).json({ error: 'Failed to generate QR code' }));
});

// Scan QR code to add friend
router.post('/qr-scan', authenticateToken, (req, res) => {
  const { qrData } = req.body;
  if (!qrData) return res.status(400).json({ error: 'QR data required' });

  let parsed;
  try {
    parsed = JSON.parse(qrData);
  } catch {
    return res.status(400).json({ error: 'Invalid QR code' });
  }

  const { userId, token } = parsed;
  if (!userId || !token) return res.status(400).json({ error: 'Invalid QR code data' });
  if (userId === req.user.id) return res.status(400).json({ error: 'Cannot add yourself' });

  const target = db.prepare('SELECT * FROM users WHERE id = ? AND qr_token = ?').get(userId, token);
  if (!target) return res.status(404).json({ error: 'User not found or invalid QR' });

  const existing = db.prepare(`
    SELECT * FROM friends WHERE
    (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `).get(req.user.id, userId, userId, req.user.id);

  if (existing?.status === 'accepted') return res.status(400).json({ error: 'Already friends' });

  if (existing) {
    db.prepare(`UPDATE friends SET status = 'accepted' WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`).run(req.user.id, userId, userId, req.user.id);
  } else {
    db.prepare('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)').run(req.user.id, userId, 'accepted');
  }

  const io = req.app.get('io');
  if (io) io.to(`user:${userId}`).emit('friend:accepted', { from: { id: req.user.id, name: req.user.name, avatar: req.user.avatar } });

  res.json({ ok: true, friend: { id: target.id, name: target.name, avatar: target.avatar } });
});

// Set phone number
router.post('/set-phone', authenticateToken, (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });
  // Normalize: strip everything except digits
  const normalized = phone.replace(/\D/g, '').slice(-10);
  if (normalized.length < 7) return res.status(400).json({ error: 'Invalid phone number' });
  db.prepare('UPDATE users SET phone_number = ? WHERE id = ?').run(normalized, req.user.id);
  res.json({ ok: true });
});

// Match contacts — send array of phone numbers, get back which users are on the platform
router.post('/match-contacts', authenticateToken, (req, res) => {
  const { phones } = req.body;
  if (!Array.isArray(phones)) return res.status(400).json({ error: 'phones array required' });

  // Normalize all incoming phone numbers
  const normalized = phones.map(p => p.replace(/\D/g, '').slice(-10)).filter(p => p.length >= 7);
  if (normalized.length === 0) return res.json({ matches: [], notOnApp: [] });

  // Find users who have matching phone numbers
  const placeholders = normalized.map(() => '?').join(',');
  const matches = db.prepare(`
    SELECT id, name, username, avatar, custom_name, custom_avatar, phone_number
    FROM users
    WHERE phone_number IN (${placeholders}) AND id != ?
  `).all(...normalized, req.user.id);

  // Get existing friends to mark status
  const friendRows = db.prepare('SELECT friend_id, status FROM friends WHERE user_id = ?').all(req.user.id);
  const friendMap = {};
  friendRows.forEach(f => { friendMap[f.friend_id] = f.status; });

  const matchedPhones = new Set(matches.map(m => m.phone_number));
  const notOnApp = normalized.filter(p => !matchedPhones.has(p));

  res.json({
    matches: matches.map(m => ({
      id: m.id,
      name: m.custom_name || m.name,
      username: m.username,
      avatar: m.custom_avatar || m.avatar,
      friendStatus: friendMap[m.id] || null,
    })),
    notOnApp,
  });
});

export default router;
