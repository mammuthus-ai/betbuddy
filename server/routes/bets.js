import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import { validateCreateBet, validateJoinSide, validateSettle } from '../middleware/validate.js';
import db from '../db.js';
import { addCoins, STREAK_BONUSES, REFEREE_BONUS, BADGE_REWARDS } from './coins.js';

const router = Router();
const PLATFORM_FEE = 0;

function checkAndAwardBadges(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const existingBadges = new Set(db.prepare('SELECT badge_type FROM badges WHERE user_id = ?').all(userId).map(b => b.badge_type));

  const awards = [];

  // The Closer: 5+ wins
  if (user.wins >= 5 && !existingBadges.has('closer')) {
    awards.push('closer');
  }
  // On Fire: 5+ win streak
  if (user.streak >= 5 && !existingBadges.has('streak')) {
    awards.push('streak');
  }
  // Big Mouth: created 20+ bets
  const created = db.prepare('SELECT COUNT(*) as c FROM bets WHERE creator_id = ?').get(userId).c;
  if (created >= 20 && !existingBadges.has('bigmouth')) {
    awards.push('bigmouth');
  }
  // Social Butterfly: joined 10+ group bets
  const groupBets = db.prepare(`SELECT COUNT(*) as c FROM bet_sides bs JOIN bets b ON b.id = bs.bet_id WHERE bs.user_id = ? AND b.is_group = 1`).get(userId).c;
  if (groupBets >= 10 && !existingBadges.has('social')) {
    awards.push('social');
  }
  // Fair Judge: refereed 5+ games
  const refereed = db.prepare("SELECT COUNT(*) as c FROM bets WHERE referee_id = ? AND status = 'settled'").get(userId).c;
  if (refereed >= 5 && !existingBadges.has('referee')) {
    awards.push('referee');
  }

  // Undefeated: 10 wins, 0 losses
  if (user.wins >= 10 && (user.losses || 0) === 0 && !existingBadges.has('undefeated')) {
    awards.push('undefeated');
  }

  // Trailblazer: created the very first game in the app
  const firstBet = db.prepare('SELECT creator_id FROM bets ORDER BY created_at ASC LIMIT 1').get();
  if (firstBet && firstBet.creator_id === userId && !existingBadges.has('trailblazer')) {
    awards.push('trailblazer');
  }

  // Speed Demon: settled a game within 1 hour of creation
  const fastSettle = db.prepare(`
    SELECT 1 FROM bets b JOIN escrows e ON e.bet_id = b.id
    WHERE (b.creator_id = ? OR b.id IN (SELECT bet_id FROM bet_sides WHERE user_id = ?))
    AND e.status = 'settled' AND (julianday(e.settled_at) - julianday(b.created_at)) * 24 < 1
    LIMIT 1
  `).get(userId, userId);
  if (fastSettle && !existingBadges.has('speed_demon')) {
    awards.push('speed_demon');
  }

  // Phoenix: won after losing 3 in a row (check if user has losses >= 3 and then a win)
  if (user.wins >= 1 && (user.losses || 0) >= 3 && !existingBadges.has('phoenix')) {
    awards.push('phoenix');
  }

  // Coin Sharer: referred 5 friends
  const referrals = db.prepare('SELECT referral_count FROM users WHERE id = ?').get(userId);
  if (referrals && referrals.referral_count >= 5 && !existingBadges.has('coin_sharer')) {
    awards.push('coin_sharer');
  }

  // Jack of All Trades: games in every category
  const categories = db.prepare('SELECT COUNT(DISTINCT category) as c FROM bets WHERE creator_id = ?').get(userId).c;
  if (categories >= 6 && !existingBadges.has('jack_of_all')) {
    awards.push('jack_of_all');
  }

  // Whale: wagered 500+ coins in one game
  const bigWager = db.prepare('SELECT 1 FROM bets WHERE creator_id = ? AND wager_amount >= 500 LIMIT 1').get(userId);
  if (bigWager && !existingBadges.has('whale')) {
    awards.push('whale');
  }

  // Day Streak: logged in 30 days in a row
  if (user.login_streak >= 30 && !existingBadges.has('day_streak')) {
    awards.push('day_streak');
  }

  // Fan Favorite: 10+ comments on a single game
  const popularGame = db.prepare(`
    SELECT 1 FROM comments c JOIN bets b ON c.bet_id = b.id
    WHERE b.creator_id = ? GROUP BY c.bet_id HAVING COUNT(*) >= 10 LIMIT 1
  `).get(userId);
  if (popularGame && !existingBadges.has('fan_favorite')) {
    awards.push('fan_favorite');
  }

  // Certified Ref: refereed 20+ games, no disputes
  const refNoDispute = db.prepare("SELECT COUNT(*) as c FROM bets WHERE referee_id = ? AND status = 'settled'").get(userId).c;
  const disputes = db.prepare("SELECT COUNT(*) as c FROM bets WHERE referee_id = ? AND status = 'disputed'").get(userId).c;
  if (refNoDispute >= 20 && disputes === 0 && !existingBadges.has('certified_ref')) {
    awards.push('certified_ref');
  }

  // All In: wagered entire coin balance
  const allInCheck = db.prepare('SELECT 1 FROM escrow_deposits ed JOIN users u ON u.id = ed.user_id WHERE ed.user_id = ? AND ed.amount >= 100 AND u.coins <= 5 LIMIT 1').get(userId);
  if (allInCheck && !existingBadges.has('all_in')) {
    awards.push('all_in');
  }

  // Shutterbug: uploaded proof for 10+ games
  const proofs = db.prepare('SELECT COUNT(DISTINCT bet_id) as c FROM proof WHERE user_id = ?').get(userId);
  if (proofs && proofs.c >= 10 && !existingBadges.has('shutterbug')) {
    awards.push('shutterbug');
  }

  for (const badge of awards) {
    db.prepare('INSERT OR IGNORE INTO badges (user_id, badge_type) VALUES (?, ?)').run(userId, badge);
    const reward = BADGE_REWARDS[badge] || 10;
    addCoins(userId, reward, 'badge_reward', `Earned badge "${badge}": +${reward} coins`);
  }

  return awards;
}

function getBetFull(betId) {
  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(betId);
  if (!bet) return null;

  const sides = db.prepare('SELECT user_id, side FROM bet_sides WHERE bet_id = ?').all(betId);
  const escrow = db.prepare('SELECT * FROM escrows WHERE bet_id = ?').get(betId);
  const deposits = db.prepare('SELECT user_id, amount FROM escrow_deposits WHERE bet_id = ?').all(betId);
  const payouts = db.prepare('SELECT user_id, amount FROM escrow_payouts WHERE bet_id = ?').all(betId);
  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.bet_id = ? ORDER BY c.created_at ASC
  `).all(betId);
  const proofs = db.prepare(`
    SELECT p.*, u.name as user_name, u.avatar as user_avatar
    FROM bet_proofs p JOIN users u ON u.id = p.user_id
    WHERE p.bet_id = ? ORDER BY p.created_at ASC
  `).all(betId);

  // Get user info for sides
  const sideUsers = {};
  for (const s of sides) {
    const user = db.prepare('SELECT id, name, avatar, username, custom_name, custom_avatar FROM users WHERE id = ?').get(s.user_id);
    if (!sideUsers[s.side]) sideUsers[s.side] = [];
    sideUsers[s.side].push(user);
  }

  const depositsMap = {};
  deposits.forEach(d => { depositsMap[d.user_id] = d.amount; });

  const payoutsArr = payouts.map(p => {
    const user = db.prepare('SELECT id, name, avatar, custom_name, custom_avatar FROM users WHERE id = ?').get(p.user_id);
    return { ...p, user };
  });

  // Creator, opponent, referee info
  const creator = db.prepare('SELECT id, name, avatar, username, custom_name, custom_avatar FROM users WHERE id = ?').get(bet.creator_id);
  const opponent = bet.opponent_id ? db.prepare('SELECT id, name, avatar, username, custom_name, custom_avatar FROM users WHERE id = ?').get(bet.opponent_id) : null;
  const referee = bet.referee_id ? db.prepare('SELECT id, name, avatar, username, custom_name, custom_avatar FROM users WHERE id = ?').get(bet.referee_id) : null;

  return {
    ...bet,
    isGroup: !!bet.is_group,
    isPrivate: !!bet.is_private,
    creator,
    opponent,
    referee,
    sides: {
      for: sideUsers.for || [],
      against: sideUsers.against || [],
    },
    wagerAmount: bet.wager_amount,
    creatorId: bet.creator_id,
    opponentId: bet.opponent_id,
    refereeId: bet.referee_id,
    escrow: escrow ? {
      totalPool: escrow.total_pool,
      platformFee: escrow.platform_fee,
      netPayout: escrow.net_payout,
      status: escrow.status,
      fundedAt: escrow.funded_at,
      settledAt: escrow.settled_at,
      winnerPayout: escrow.winner_payout,
      perWinner: escrow.per_winner,
      deposits: depositsMap,
      payouts: payoutsArr,
      payoutTo: payoutsArr.map(p => p.user_id),
    } : null,
    comments,
    proofs,
  };
}

// Check and cancel expired games, refund coins
function checkExpiredGames() {
  const expiredBets = db.prepare(`
    SELECT b.id, b.title, b.creator_id, b.deadline
    FROM bets b
    WHERE b.status IN ('active', 'pending', 'awaiting_funds')
    AND b.deadline < datetime('now')
  `).all();

  for (const bet of expiredBets) {
    const escrow = db.prepare('SELECT * FROM escrows WHERE bet_id = ?').get(bet.id);
    const deposits = db.prepare('SELECT user_id, amount FROM escrow_deposits WHERE bet_id = ?').all(bet.id);

    const cancelTx = db.transaction(() => {
      // Refund all deposits
      for (const dep of deposits) {
        addCoins(dep.user_id, dep.amount, 'refund', `Game expired: "${bet.title}" — refund of ${dep.amount} coins`);
      }

      // Mark game as cancelled
      db.prepare("UPDATE bets SET status = 'cancelled' WHERE id = ?").run(bet.id);
      if (escrow) {
        db.prepare("UPDATE escrows SET status = 'refunded' WHERE bet_id = ?").run(bet.id);
      }
    });

    cancelTx();
  }

  return expiredBets.length;
}

// List bets
router.get('/', authenticateToken, (req, res) => {
  // Check for expired games on each list request
  checkExpiredGames();
  const { status, mine } = req.query;
  const userId = req.user.id;

  // Get friend IDs
  const friendRows = db.prepare(`
    SELECT CASE WHEN user_id = ? THEN friend_id ELSE user_id END as friend_id
    FROM friends WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
  `).all(userId, userId, userId);
  const friendIds = friendRows.map(f => f.friend_id);
  const visibleUserIds = [userId, ...friendIds];

  let query = 'SELECT DISTINCT b.id FROM bets b';
  const conditions = [];
  const params = [];

  if (mine === 'true') {
    // My bets: show all bets I'm involved in
    conditions.push('(b.creator_id = ? OR b.id IN (SELECT bet_id FROM bet_sides WHERE user_id = ?))');
    params.push(userId, userId);
  } else {
    // Feed: show bets where at least one participant is a friend (or me), excluding private bets from others
    const placeholders = visibleUserIds.map(() => '?').join(',');
    conditions.push(`(
      b.id IN (SELECT bet_id FROM bet_sides WHERE user_id IN (${placeholders}))
      AND (b.is_private = 0 OR b.creator_id = ? OR b.id IN (SELECT bet_id FROM bet_sides WHERE user_id = ?))
    )`);
    params.push(...visibleUserIds, userId, userId);
  }

  if (status) {
    conditions.push('b.status = ?');
    params.push(status);
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY b.created_at DESC';

  const betIds = db.prepare(query).all(...params);
  const bets = betIds.map(b => getBetFull(b.id)).filter(Boolean);

  res.json(bets);
});

// Get single bet
router.get('/:id', authenticateToken, (req, res) => {
  const bet = getBetFull(req.params.id);
  if (!bet) return res.status(404).json({ error: 'Bet not found' });
  res.json(bet);
});

// Create bet
router.post('/', authenticateToken, validateCreateBet, (req, res) => {
  const { title, category, wagerAmount, opponentId, refereeId, deadline, isGroup, isPrivate } = req.body;
  const userId = req.user.id;

  if (opponentId === userId) return res.status(400).json({ error: 'Cannot bet against yourself' });
  if (refereeId && (refereeId === userId || refereeId === opponentId)) return res.status(400).json({ error: 'Referee must be a different person' });
  if (req.user.coins < wagerAmount) return res.status(400).json({ error: 'Not enough coins' });

  const opponent = db.prepare('SELECT id FROM users WHERE id = ?').get(opponentId);
  if (!opponent) return res.status(404).json({ error: 'Opponent not found' });

  if (refereeId) {
    const referee = db.prepare('SELECT id FROM users WHERE id = ?').get(refereeId);
    if (!referee) return res.status(404).json({ error: 'Referee not found' });
  }

  const betId = uuidv4();
  const stakes = `${wagerAmount} coins per person`;

  const createBetTx = db.transaction(() => {
    // Create bet
    db.prepare(`
      INSERT INTO bets (id, title, category, creator_id, opponent_id, referee_id, stakes, wager_amount, status, deadline, is_group, is_private)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_funds', ?, ?, ?)
    `).run(betId, title, category, userId, opponentId, refereeId, stakes, wagerAmount, deadline, isGroup ? 1 : 0, isPrivate ? 1 : 0);

    // Add sides
    db.prepare('INSERT INTO bet_sides (bet_id, user_id, side) VALUES (?, ?, ?)').run(betId, userId, 'for');
    db.prepare('INSERT INTO bet_sides (bet_id, user_id, side) VALUES (?, ?, ?)').run(betId, opponentId, 'against');

    // Create escrow
    db.prepare('INSERT INTO escrows (bet_id, status) VALUES (?, ?)').run(betId, 'partial');

    // Deposit creator's funds
    db.prepare('INSERT INTO escrow_deposits (bet_id, user_id, amount) VALUES (?, ?, ?)').run(betId, userId, wagerAmount);
    db.prepare('UPDATE users SET coins = coins - ? WHERE id = ?').run(wagerAmount, userId);

    // Update escrow totals
    db.prepare('UPDATE escrows SET total_pool = ? WHERE bet_id = ?').run(wagerAmount, betId);
  });

  createBetTx();

  const bet = getBetFull(betId);
  const io = req.app.get('io');
  if (io) io.emit('bet:created', bet);

  const updatedUser = db.prepare('SELECT coins FROM users WHERE id = ?').get(userId);
  if (io) io.to(`user:${userId}`).emit('wallet:updated', { userId, newBalance: updatedUser.coins });

  res.status(201).json(bet);
});

// Join a side
router.post('/:id/join', authenticateToken, validateJoinSide, (req, res) => {
  const { side } = req.body;
  const betId = req.params.id;
  const userId = req.user.id;

  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(betId);
  if (!bet) return res.status(404).json({ error: 'Bet not found' });
  if (bet.status === 'settled') return res.status(400).json({ error: 'Bet is already settled' });

  // Check group size limit (5 standard, unlimited if purchased)
  const alreadyIn = db.prepare('SELECT 1 FROM bet_sides WHERE bet_id = ? AND user_id = ?').get(betId, userId);
  if (!alreadyIn) {
    const currentCount = db.prepare('SELECT COUNT(*) as c FROM bet_sides WHERE bet_id = ?').get(betId).c;
    const MAX_GROUP_SIZE = 5;
    if (currentCount >= MAX_GROUP_SIZE) {
      const hasUnlimited = db.prepare("SELECT 1 FROM purchases WHERE user_id = ? AND item_id = 'unlimited_group'").get(userId);
      if (!hasUnlimited) {
        return res.status(400).json({ error: `Group game limit is ${MAX_GROUP_SIZE} players. Purchase "Unlimited Group Size" in the Shop to remove the limit.` });
      }
    }
  }

  // Prevent original creator/opponent from switching sides
  const isCreator = bet.creator_id === userId;
  const isOpponent = bet.opponent_id === userId;
  if (isCreator || isOpponent) {
    const currentSide = db.prepare('SELECT side FROM bet_sides WHERE bet_id = ? AND user_id = ?').get(betId, userId);
    if (currentSide && currentSide.side !== side) {
      return res.status(400).json({ error: 'Original players cannot switch sides' });
    }
  }

  // Prevent switching sides after depositing
  const hasDeposited = db.prepare('SELECT 1 FROM escrow_deposits WHERE bet_id = ? AND user_id = ?').get(betId, userId);
  if (hasDeposited) {
    const currentSide = db.prepare('SELECT side FROM bet_sides WHERE bet_id = ? AND user_id = ?').get(betId, userId);
    if (currentSide && currentSide.side !== side) {
      return res.status(400).json({ error: 'Cannot switch sides after depositing coins' });
    }
  }

  // Remove from other side, add to this side
  db.prepare('DELETE FROM bet_sides WHERE bet_id = ? AND user_id = ?').run(betId, userId);
  db.prepare('INSERT OR REPLACE INTO bet_sides (bet_id, user_id, side) VALUES (?, ?, ?)').run(betId, userId, side);

  const updatedBet = getBetFull(betId);
  const io = req.app.get('io');
  if (io) io.to(`bet:${betId}`).emit('bet:updated', updatedBet);

  res.json(updatedBet);
});

// Deposit to escrow
router.post('/:id/deposit', authenticateToken, (req, res) => {
  const betId = req.params.id;
  const userId = req.user.id;

  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(betId);
  if (!bet) return res.status(404).json({ error: 'Bet not found' });

  const isParticipant = db.prepare('SELECT 1 FROM bet_sides WHERE bet_id = ? AND user_id = ?').get(betId, userId);
  if (!isParticipant) return res.status(403).json({ error: 'Not a participant' });

  const alreadyDeposited = db.prepare('SELECT 1 FROM escrow_deposits WHERE bet_id = ? AND user_id = ?').get(betId, userId);
  if (alreadyDeposited) return res.status(400).json({ error: 'Already deposited' });

  if (req.user.coins < bet.wager_amount) return res.status(400).json({ error: 'Not enough coins' });

  const depositTx = db.transaction(() => {
    db.prepare('INSERT INTO escrow_deposits (bet_id, user_id, amount) VALUES (?, ?, ?)').run(betId, userId, bet.wager_amount);
    db.prepare('UPDATE users SET coins = coins - ? WHERE id = ?').run(bet.wager_amount, userId);

    // Check if all participants funded
    const allParticipants = db.prepare('SELECT user_id FROM bet_sides WHERE bet_id = ?').all(betId);
    const allDeposits = db.prepare('SELECT user_id FROM escrow_deposits WHERE bet_id = ?').all(betId);
    const depositedIds = new Set(allDeposits.map(d => d.user_id));
    const allFunded = allParticipants.every(p => depositedIds.has(p.user_id));

    const totalDeposited = db.prepare('SELECT SUM(amount) as total FROM escrow_deposits WHERE bet_id = ?').get(betId).total;

    if (allFunded) {
      const fee = +(totalDeposited * PLATFORM_FEE).toFixed(2);
      const net = +(totalDeposited - fee).toFixed(2);
      db.prepare(`
        UPDATE escrows SET total_pool = ?, platform_fee = ?, net_payout = ?,
        status = 'funded', funded_at = datetime('now') WHERE bet_id = ?
      `).run(totalDeposited, fee, net, betId);
      db.prepare("UPDATE bets SET status = 'active' WHERE id = ?").run(betId);
    } else {
      db.prepare('UPDATE escrows SET total_pool = ?, status = ? WHERE bet_id = ?').run(totalDeposited, 'partial', betId);
    }
  });

  depositTx();

  const updatedBet = getBetFull(betId);
  const io = req.app.get('io');
  if (io) {
    io.to(`bet:${betId}`).emit('escrow:deposit', updatedBet);
    io.emit('bet:updated', updatedBet);
    const updatedUser = db.prepare('SELECT coins FROM users WHERE id = ?').get(userId);
    io.to(`user:${userId}`).emit('wallet:updated', { userId, newBalance: updatedUser.coins });
  }

  res.json(updatedBet);
});

// Settle bet (referee only)
router.post('/:id/settle', authenticateToken, validateSettle, (req, res) => {
  const { winningSide } = req.body;
  const betId = req.params.id;
  const userId = req.user.id;

  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(betId);
  if (!bet) return res.status(404).json({ error: 'Bet not found' });
  if (bet.referee_id !== userId) return res.status(403).json({ error: 'Only the referee can settle' });
  if (bet.status !== 'active') return res.status(400).json({ error: 'Bet must be active to settle' });

  const escrow = db.prepare('SELECT * FROM escrows WHERE bet_id = ?').get(betId);
  if (!escrow || escrow.status !== 'funded') return res.status(400).json({ error: 'Escrow must be funded' });

  // Check for proof
  const proofCount = db.prepare('SELECT COUNT(*) as count FROM bet_proofs WHERE bet_id = ?').get(betId).count;
  if (proofCount === 0) return res.status(400).json({ error: 'At least one proof must be uploaded before settling' });

  const winners = db.prepare('SELECT user_id FROM bet_sides WHERE bet_id = ? AND side = ?').all(betId, winningSide);
  const losers = db.prepare('SELECT user_id FROM bet_sides WHERE bet_id = ? AND side != ?').all(betId, winningSide);

  if (winners.length === 0) return res.status(400).json({ error: 'No participants on winning side' });

  const perWinner = +(escrow.net_payout / winners.length).toFixed(2);

  const settleTx = db.transaction(() => {
    // Update escrow
    db.prepare(`
      UPDATE escrows SET status = 'settled', settled_at = datetime('now'),
      winner_payout = ?, per_winner = ? WHERE bet_id = ?
    `).run(escrow.net_payout, perWinner, betId);

    // Update bet
    db.prepare("UPDATE bets SET status = 'settled', winner = ? WHERE id = ?").run(winningSide, betId);

    // Pay winners + streak bonuses
    for (const w of winners) {
      db.prepare('INSERT INTO escrow_payouts (bet_id, user_id, amount) VALUES (?, ?, ?)').run(betId, w.user_id, perWinner);
      db.prepare('UPDATE users SET coins = coins + ?, wins = wins + 1, streak = streak + 1 WHERE id = ?').run(perWinner, w.user_id);
      addCoins(w.user_id, 0, 'bet_win', `Won bet: "${bet.title}"`);

      // Check streak bonuses
      const updatedWinner = db.prepare('SELECT streak FROM users WHERE id = ?').get(w.user_id);
      const streakBonus = STREAK_BONUSES[updatedWinner.streak];
      if (streakBonus) {
        addCoins(w.user_id, streakBonus, 'streak_bonus', `${updatedWinner.streak}-win streak bonus: +${streakBonus} coins`);
      }

      // Check badge achievements
      const newBadges = checkAndAwardBadges(w.user_id);
      if (newBadges.length > 0) {
        const io = req.app.get('io');
        if (io) io.emit('badge:earned', { userId: w.user_id, badges: newBadges });
      }
    }

    // Update losers
    for (const l of losers) {
      db.prepare('UPDATE users SET losses = losses + 1, streak = 0 WHERE id = ?').run(l.user_id);
    }

    // Reward referee
    addCoins(userId, REFEREE_BONUS, 'referee_reward', `Refereed game: "${bet.title}" — +${REFEREE_BONUS} coins`);

    // Check referee badge
    const refBadges = checkAndAwardBadges(userId);
    if (refBadges.length > 0) {
      const io = req.app.get('io');
      if (io) io.emit('badge:earned', { userId, badges: refBadges });
    }
  });

  settleTx();

  const updatedBet = getBetFull(betId);
  const io = req.app.get('io');
  if (io) {
    io.to(`bet:${betId}`).emit('bet:settled', updatedBet);
    io.emit('bet:updated', updatedBet);

    // Notify coin balance updates
    for (const w of winners) {
      const user = db.prepare('SELECT coins FROM users WHERE id = ?').get(w.user_id);
      io.to(`user:${w.user_id}`).emit('wallet:updated', { userId: w.user_id, newBalance: user.coins });
    }
  }

  res.json(updatedBet);
});

export default router;
