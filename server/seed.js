import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

console.log('🌱 Seeding database...');

// Clear existing data
db.exec(`
  DELETE FROM badges;
  DELETE FROM bet_proofs;
  DELETE FROM comments;
  DELETE FROM escrow_payouts;
  DELETE FROM escrow_deposits;
  DELETE FROM escrows;
  DELETE FROM bet_sides;
  DELETE FROM bets;
  DELETE FROM friends;
  DELETE FROM users;
`);

// Create users
const users = [
  { id: 'u1', username: 'you', name: 'You', avatar: '😎', wins: 12, losses: 5, streak: 3, coins: 250 },
  { id: 'u2', username: 'jake', name: 'Jake', avatar: '🏌️', wins: 9, losses: 8, streak: 0, coins: 180 },
  { id: 'u3', username: 'sarah', name: 'Sarah', avatar: '🔥', wins: 15, losses: 3, streak: 7, coins: 420 },
  { id: 'u4', username: 'mike', name: 'Mike', avatar: '💪', wins: 6, losses: 10, streak: 0, coins: 95 },
  { id: 'u5', username: 'emma', name: 'Emma', avatar: '🎯', wins: 11, losses: 4, streak: 2, coins: 310 },
  { id: 'u6', username: 'chris', name: 'Chris', avatar: '🏀', wins: 8, losses: 7, streak: 1, coins: 155 },
];

const insertUser = db.prepare(`
  INSERT INTO users (id, provider, provider_id, username, name, avatar, wins, losses, streak, coins, qr_token)
  VALUES (?, 'dev', ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const u of users) {
  insertUser.run(u.id, u.id, u.username, u.name, u.avatar, u.wins, u.losses, u.streak, u.coins, uuidv4());
}

// Make all users friends with each other
const insertFriend = db.prepare("INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'accepted')");
for (let i = 0; i < users.length; i++) {
  for (let j = i + 1; j < users.length; j++) {
    insertFriend.run(users[i].id, users[j].id);
  }
}

// Create bets
const bets = [
  {
    id: 'b1', title: 'Jake breaks 90 this Saturday', category: 'golf',
    creator: 'u1', opponent: 'u2', referee: 'u3',
    wager: 50, status: 'active', deadline: '2026-03-22T14:00:00',
    sides: { for: ['u1', 'u5'], against: ['u2', 'u4'] },
    deposits: { u1: 50, u5: 50, u2: 50, u4: 50 },
    escrowStatus: 'funded', isGroup: 1,
    comments: [
      { user: 'u1', text: 'No chance Jake breaks 90 with that slice 😂' },
      { user: 'u2', text: "Watch me. I've been at the range all week" },
      { user: 'u3', text: "I'll believe it when I see the scorecard 📸" },
    ],
  },
  {
    id: 'b2', title: 'Sarah runs a sub-25 min 5K', category: 'fitness',
    creator: 'u3', opponent: 'u1', referee: 'u6',
    wager: 20, status: 'active', deadline: '2026-03-25T08:00:00',
    sides: { for: ['u3', 'u6'], against: ['u1'] },
    deposits: { u3: 20, u6: 20, u1: 20 },
    escrowStatus: 'funded', isGroup: 0,
    comments: [
      { user: 'u3', text: 'Easy money 💰' },
      { user: 'u1', text: 'Your last time was 26:30... just saying' },
    ],
  },
  {
    id: 'b3', title: 'Mike finishes Elden Ring DLC this week', category: 'games',
    creator: 'u4', opponent: 'u6', referee: 'u5',
    wager: 25, status: 'awaiting_funds', deadline: '2026-03-24T23:59:00',
    sides: { for: ['u4'], against: ['u6', 'u1', 'u5'] },
    deposits: { u4: 25, u6: 25 },
    escrowStatus: 'partial', isGroup: 1,
    comments: [
      { user: 'u6', text: "Bro you've been stuck on the same boss for 3 days 💀" },
      { user: 'u4', text: "Tonight's the night. I can feel it." },
    ],
  },
  {
    id: 'b4', title: 'Emma cooks a full Thanksgiving dinner solo', category: 'food',
    creator: 'u5', opponent: 'u1', referee: 'u3',
    wager: 30, status: 'settled', deadline: '2026-03-15T18:00:00',
    winner: 'for',
    sides: { for: ['u5'], against: ['u1', 'u2'] },
    deposits: { u5: 30, u1: 30, u2: 30 },
    escrowStatus: 'settled', isGroup: 1,
    comments: [
      { user: 'u5', text: 'Turkey was PERFECT. Photo proof incoming 🍗' },
      { user: 'u1', text: '...respect. That gravy was insane.' },
    ],
  },
  {
    id: 'b5', title: 'Chris does 100 pushups without stopping', category: 'fitness',
    creator: 'u6', opponent: 'u4', referee: 'u2',
    wager: 15, status: 'disputed', deadline: '2026-03-20T12:00:00',
    sides: { for: ['u6'], against: ['u4', 'u2'] },
    deposits: { u6: 15, u4: 15, u2: 15 },
    escrowStatus: 'held', isGroup: 1,
    comments: [
      { user: 'u6', text: 'Done! Video proof right here 💪' },
      { user: 'u4', text: 'Bro those last 10 were NOT full pushups' },
      { user: 'u2', text: 'As referee... I need to review the tape 🧐' },
    ],
  },
];

const insertBet = db.prepare(`
  INSERT INTO bets (id, title, category, creator_id, opponent_id, referee_id, stakes, wager_amount, status, deadline, is_group, winner)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertSide = db.prepare('INSERT INTO bet_sides (bet_id, user_id, side) VALUES (?, ?, ?)');
const insertEscrow = db.prepare(`
  INSERT INTO escrows (bet_id, total_pool, platform_fee, net_payout, status, funded_at, settled_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const insertDeposit = db.prepare('INSERT INTO escrow_deposits (bet_id, user_id, amount) VALUES (?, ?, ?)');
const insertComment = db.prepare('INSERT INTO comments (bet_id, user_id, text) VALUES (?, ?, ?)');

const seedTx = db.transaction(() => {
  for (const b of bets) {
    const stakes = `${b.wager} coins per person`;
    insertBet.run(b.id, b.title, b.category, b.creator, b.opponent, b.referee, stakes, b.wager, b.status, b.deadline, b.isGroup, b.winner || null);

    // Sides
    for (const uid of b.sides.for) insertSide.run(b.id, uid, 'for');
    for (const uid of b.sides.against) insertSide.run(b.id, uid, 'against');

    // Escrow
    const totalPool = Object.values(b.deposits).reduce((s, v) => s + v, 0);
    const fee = +(totalPool * 0.01).toFixed(2);
    const net = +(totalPool - fee).toFixed(2);
    const fundedAt = b.escrowStatus === 'funded' || b.escrowStatus === 'settled' || b.escrowStatus === 'held' ? '2026-03-18T11:00:00' : null;
    const settledAt = b.escrowStatus === 'settled' ? '2026-03-15T19:00:00' : null;
    insertEscrow.run(b.id, totalPool, fee, net, b.escrowStatus, fundedAt, settledAt);

    // Deposits
    for (const [uid, amount] of Object.entries(b.deposits)) {
      insertDeposit.run(b.id, uid, amount);
    }

    // Comments
    for (const c of b.comments) {
      insertComment.run(b.id, c.user, c.text);
    }
  }
});

seedTx();

// Add some badges
db.prepare("INSERT INTO badges (user_id, badge_type) VALUES (?, ?)").run('u1', 'closer');
db.prepare("INSERT INTO badges (user_id, badge_type) VALUES (?, ?)").run('u1', 'streak');
db.prepare("INSERT INTO badges (user_id, badge_type) VALUES (?, ?)").run('u1', 'social');
db.prepare("INSERT INTO badges (user_id, badge_type) VALUES (?, ?)").run('u3', 'streak');
db.prepare("INSERT INTO badges (user_id, badge_type) VALUES (?, ?)").run('u3', 'closer');
db.prepare("INSERT INTO badges (user_id, badge_type) VALUES (?, ?)").run('u5', 'underdog');

console.log(`✅ Seeded ${users.length} users, ${bets.length} bets, and ${users.length * (users.length - 1) / 2} friend connections`);
process.exit(0);
