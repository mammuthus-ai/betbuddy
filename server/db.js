import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'flexorfold.db');

const db = new Database(dbPath);

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    username TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    avatar TEXT DEFAULT '😎',
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 100,
    qr_token TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(provider, provider_id)
  );

  CREATE TABLE IF NOT EXISTS friends (
    user_id TEXT NOT NULL REFERENCES users(id),
    friend_id TEXT NOT NULL REFERENCES users(id),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','blocked')),
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, friend_id)
  );

  CREATE TABLE IF NOT EXISTS bets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    creator_id TEXT NOT NULL REFERENCES users(id),
    opponent_id TEXT REFERENCES users(id),
    referee_id TEXT REFERENCES users(id),
    stakes TEXT NOT NULL,
    stake_type TEXT DEFAULT 'money',
    wager_amount REAL NOT NULL CHECK(wager_amount > 0),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','awaiting_funds','active','settled','disputed','cancelled')),
    deadline TEXT NOT NULL,
    is_group INTEGER DEFAULT 0,
    winner TEXT CHECK(winner IN ('for','against') OR winner IS NULL),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bet_sides (
    bet_id TEXT NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    side TEXT NOT NULL CHECK(side IN ('for','against')),
    PRIMARY KEY (bet_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS escrows (
    bet_id TEXT PRIMARY KEY REFERENCES bets(id) ON DELETE CASCADE,
    total_pool REAL DEFAULT 0,
    platform_fee REAL DEFAULT 0,
    net_payout REAL DEFAULT 0,
    status TEXT DEFAULT 'none' CHECK(status IN ('none','partial','funded','held','settled','refunded')),
    funded_at TEXT,
    settled_at TEXT,
    winner_payout REAL,
    per_winner REAL
  );

  CREATE TABLE IF NOT EXISTS escrow_deposits (
    bet_id TEXT NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    deposited_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (bet_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS escrow_payouts (
    bet_id TEXT NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    paid_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (bet_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bet_id TEXT NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bet_proofs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bet_id TEXT NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    caption TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS badges (
    user_id TEXT NOT NULL REFERENCES users(id),
    badge_type TEXT NOT NULL CHECK(badge_type IN ('closer','bigmouth','underdog','streak','social','referee')),
    earned_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, badge_type)
  );

  -- Coin transactions log
  CREATE TABLE IF NOT EXISTS coin_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Referrals
  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id TEXT NOT NULL REFERENCES users(id),
    referred_id TEXT NOT NULL REFERENCES users(id),
    rewarded INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(referred_id)
  );

  CREATE INDEX IF NOT EXISTS idx_coin_tx_user ON coin_transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_coin_tx_type ON coin_transactions(type);
  CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
  CREATE INDEX IF NOT EXISTS idx_bets_creator ON bets(creator_id);
  CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
  CREATE INDEX IF NOT EXISTS idx_bet_sides_user ON bet_sides(user_id);
  CREATE INDEX IF NOT EXISTS idx_comments_bet ON comments(bet_id);
  CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
  CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);
`);

// Add columns if they don't exist (migrations)
const userColumns = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userColumns.includes('last_login_bonus')) {
  db.exec("ALTER TABLE users ADD COLUMN last_login_bonus TEXT");
}
if (!userColumns.includes('last_weekly_bonus')) {
  db.exec("ALTER TABLE users ADD COLUMN last_weekly_bonus TEXT");
}
if (!userColumns.includes('referral_code')) {
  db.exec("ALTER TABLE users ADD COLUMN referral_code TEXT");
}

const betColumns = db.prepare("PRAGMA table_info(bets)").all().map(c => c.name);
if (!betColumns.includes('is_private')) {
  db.exec("ALTER TABLE bets ADD COLUMN is_private INTEGER DEFAULT 0");
}

// Purchases / upgrades table
db.exec(`
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    item_id TEXT NOT NULL,
    price_usd REAL NOT NULL,
    purchased_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
`);

// Add custom_name column for paid name change
if (!userColumns.includes('custom_name')) {
  db.exec("ALTER TABLE users ADD COLUMN custom_name TEXT");
}
// Add custom_avatar for paid avatar upload
if (!userColumns.includes('custom_avatar')) {
  db.exec("ALTER TABLE users ADD COLUMN custom_avatar TEXT");
}
// Add phone_number for contacts matching
if (!userColumns.includes('phone_number')) {
  db.exec("ALTER TABLE users ADD COLUMN phone_number TEXT");
}
// Add login_streak for day streak badge
if (!userColumns.includes('login_streak')) {
  db.exec("ALTER TABLE users ADD COLUMN login_streak INTEGER DEFAULT 0");
}
// Add referral_count
if (!userColumns.includes('referral_count')) {
  db.exec("ALTER TABLE users ADD COLUMN referral_count INTEGER DEFAULT 0");
}

export default db;
