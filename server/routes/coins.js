import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// Constants
const DAILY_BONUS = 5;
const WEEKLY_BONUS = 20;
const REFERRAL_BONUS = 25;
const REFEREE_BONUS = 3;
const STREAK_BONUSES = { 3: 5, 5: 10, 10: 25 };
const BADGE_REWARDS = {
  closer: 15,
  bigmouth: 20,
  underdog: 15,
  streak: 10,
  social: 10,
  referee: 10,
  undefeated: 50,
  trailblazer: 25,
  speed_demon: 15,
  phoenix: 20,
  coin_sharer: 30,
  jack_of_all: 20,
  whale: 15,
  day_streak: 40,
  fan_favorite: 15,
  certified_ref: 30,
  all_in: 20,
  shutterbug: 15,
};

function addCoins(userId, amount, type, description) {
  db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(amount, userId);
  db.prepare('INSERT INTO coin_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)').run(userId, amount, type, description);
  return db.prepare('SELECT coins FROM users WHERE id = ?').get(userId).coins;
}

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function getMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

// Claim daily login bonus
router.post('/daily', authenticateToken, (req, res) => {
  const today = todayDate();
  const user = req.user;

  if (user.last_login_bonus === today) {
    return res.status(400).json({ error: 'Already claimed today', alreadyClaimed: true });
  }

  db.prepare('UPDATE users SET last_login_bonus = ? WHERE id = ?').run(today, user.id);
  const newBalance = addCoins(user.id, DAILY_BONUS, 'daily_bonus', `Daily login bonus: +${DAILY_BONUS} coins`);

  const io = req.app.get('io');
  if (io) io.to(`user:${user.id}`).emit('wallet:updated', { userId: user.id, newBalance });

  res.json({ coins: DAILY_BONUS, newBalance, message: `+${DAILY_BONUS} coins daily bonus!` });
});

// Check & claim weekly allowance
router.post('/weekly', authenticateToken, (req, res) => {
  const monday = getMonday();
  const user = req.user;

  if (user.last_weekly_bonus === monday) {
    return res.status(400).json({ error: 'Already claimed this week', alreadyClaimed: true });
  }

  db.prepare('UPDATE users SET last_weekly_bonus = ? WHERE id = ?').run(monday, user.id);
  const newBalance = addCoins(user.id, WEEKLY_BONUS, 'weekly_bonus', `Weekly allowance: +${WEEKLY_BONUS} coins`);

  const io = req.app.get('io');
  if (io) io.to(`user:${user.id}`).emit('wallet:updated', { userId: user.id, newBalance });

  res.json({ coins: WEEKLY_BONUS, newBalance, message: `+${WEEKLY_BONUS} coins weekly allowance!` });
});

// Get referral code
router.get('/referral', authenticateToken, (req, res) => {
  let code = req.user.referral_code;
  if (!code) {
    code = req.user.username + '-' + uuidv4().slice(0, 6);
    db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(code, req.user.id);
  }
  const referralCount = db.prepare('SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?').get(req.user.id).count;
  const totalEarned = referralCount * REFERRAL_BONUS;
  res.json({ code, referralCount, totalEarned, bonusPerReferral: REFERRAL_BONUS });
});

// Apply referral code (called during signup or later)
router.post('/referral/apply', authenticateToken, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Referral code required' });

  // Check if user already used a referral
  const existing = db.prepare('SELECT 1 FROM referrals WHERE referred_id = ?').get(req.user.id);
  if (existing) return res.status(400).json({ error: 'You already used a referral code' });

  // Find referrer by code
  const referrer = db.prepare('SELECT id, username FROM users WHERE referral_code = ?').get(code);
  if (!referrer) return res.status(404).json({ error: 'Invalid referral code' });
  if (referrer.id === req.user.id) return res.status(400).json({ error: 'Cannot use your own code' });

  const applyTx = db.transaction(() => {
    db.prepare('INSERT INTO referrals (referrer_id, referred_id, rewarded) VALUES (?, ?, 1)').run(referrer.id, req.user.id);
    addCoins(referrer.id, REFERRAL_BONUS, 'referral', `Referral bonus: ${req.user.name} joined with your code`);
    addCoins(req.user.id, REFERRAL_BONUS, 'referral', `Welcome bonus: used ${referrer.username}'s referral code`);
  });

  applyTx();

  const io = req.app.get('io');
  if (io) {
    const referrerCoins = db.prepare('SELECT coins FROM users WHERE id = ?').get(referrer.id).coins;
    io.to(`user:${referrer.id}`).emit('wallet:updated', { userId: referrer.id, newBalance: referrerCoins });
  }

  const newBalance = db.prepare('SELECT coins FROM users WHERE id = ?').get(req.user.id).coins;
  res.json({ coins: REFERRAL_BONUS, newBalance, message: `+${REFERRAL_BONUS} coins referral bonus!` });
});

// Get coin status (what can be claimed)
router.get('/status', authenticateToken, (req, res) => {
  const user = req.user;
  const today = todayDate();
  const monday = getMonday();

  const canClaimDaily = user.last_login_bonus !== today;
  const canClaimWeekly = user.last_weekly_bonus !== monday;

  const recentTransactions = db.prepare(`
    SELECT * FROM coin_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(user.id);

  const hasUsedReferral = !!db.prepare('SELECT 1 FROM referrals WHERE referred_id = ?').get(user.id);

  res.json({
    coins: user.coins,
    canClaimDaily,
    dailyBonus: DAILY_BONUS,
    canClaimWeekly,
    weeklyBonus: WEEKLY_BONUS,
    hasUsedReferral,
    referralBonus: REFERRAL_BONUS,
    recentTransactions,
    streakBonuses: STREAK_BONUSES,
    badgeRewards: BADGE_REWARDS,
  });
});

// Get transaction history
router.get('/history', authenticateToken, (req, res) => {
  const transactions = db.prepare(`
    SELECT * FROM coin_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(req.user.id);

  res.json(transactions);
});

export { addCoins, STREAK_BONUSES, REFEREE_BONUS, BADGE_REWARDS };
export default router;
