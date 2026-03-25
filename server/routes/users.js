import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// Search users
router.get('/', authenticateToken, (req, res) => {
  const { q } = req.query;
  let users;
  if (q) {
    users = db.prepare(`
      SELECT id, username, name, avatar, wins, losses, streak
      FROM users WHERE username LIKE ? OR name LIKE ? LIMIT 20
    `).all(`%${q}%`, `%${q}%`);
  } else {
    users = db.prepare('SELECT id, username, name, avatar, wins, losses, streak FROM users LIMIT 50').all();
  }
  res.json(users);
});

// Leaderboard
router.get('/leaderboard', authenticateToken, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.name, u.avatar, u.wins, u.losses, u.streak,
      GROUP_CONCAT(b.badge_type) as badges
    FROM users u
    LEFT JOIN badges b ON b.user_id = u.id
    GROUP BY u.id
    ORDER BY u.wins DESC
    LIMIT 20
  `).all();

  res.json(users.map(u => ({
    ...u,
    badges: u.badges ? u.badges.split(',') : [],
  })));
});

// Get user profile
router.get('/:id', authenticateToken, (req, res) => {
  const user = db.prepare(`
    SELECT id, username, name, avatar, wins, losses, streak, coins, created_at
    FROM users WHERE id = ?
  `).get(req.params.id);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const badges = db.prepare('SELECT badge_type, earned_at FROM badges WHERE user_id = ?').all(req.params.id);
  const betCount = db.prepare(`
    SELECT COUNT(*) as count FROM bet_sides WHERE user_id = ?
  `).get(req.params.id);

  // Category breakdown
  const categories = db.prepare(`
    SELECT b.category, COUNT(*) as count
    FROM bets b
    JOIN bet_sides bs ON bs.bet_id = b.id
    WHERE bs.user_id = ?
    GROUP BY b.category
  `).all(req.params.id);

  res.json({
    ...user,
    badges: badges.map(b => b.badge_type),
    totalBets: betCount.count,
    categories,
  });
});

export default router;
