import { Router } from 'express';
import Stripe from 'stripe';
import { authenticateToken } from '../middleware/auth.js';
import { moderateImage } from '../middleware/moderation.js';
import config from '../config.js';
import db from '../db.js';

const router = Router();
const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;

// Shop items catalog
const SHOP_ITEMS = [
  {
    id: 'custom_avatar',
    name: 'Custom Avatar',
    description: 'Upload a custom profile picture instead of the default emoji',
    price: 1.99,
    icon: '\u{1F5BC}\uFE0F',
    category: 'profile',
    oneTime: true,
  },
  {
    id: 'custom_name',
    name: 'Custom Display Name',
    description: 'Change your display name to anything you want',
    price: 1.99,
    icon: '\u270F\uFE0F',
    category: 'profile',
    oneTime: true,
  },
  {
    id: 'extended_trash_talk',
    name: 'Extended Trash Talk',
    description: 'Send GIFs, reactions, and voice notes in bet comments',
    price: 1.99,
    icon: '\u{1F3A4}',
    category: 'social',
    oneTime: true,
  },
  {
    id: 'unlimited_group',
    name: 'Unlimited Group Size',
    description: 'Remove the 5-person limit for 1 game \u2014 invite as many friends as you want',
    price: 0.99,
    icon: '\u{1F465}',
    category: 'betting',
    oneTime: false,
  },
];

// Get Stripe publishable key
router.get('/stripe-key', authenticateToken, (req, res) => {
  res.json({ publishableKey: config.stripe.publishableKey || null });
});

// Get shop catalog with user's purchase status
router.get('/', authenticateToken, (req, res) => {
  const userPurchases = db.prepare('SELECT item_id FROM purchases WHERE user_id = ?').all(req.user.id);
  const purchasedIds = new Set(userPurchases.map(p => p.item_id));

  const items = SHOP_ITEMS.map(item => ({
    ...item,
    purchased: purchasedIds.has(item.id),
  }));

  res.json({ items });
});

// Create Stripe Checkout session for an item
router.post('/create-checkout', authenticateToken, (req, res) => {
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'Item ID required' });

  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  if (item.oneTime) {
    const existing = db.prepare('SELECT 1 FROM purchases WHERE user_id = ? AND item_id = ?').get(req.user.id, itemId);
    if (existing) return res.status(400).json({ error: 'Already purchased' });
  }

  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${config.clientURL}?shop_success=${itemId}`,
    cancel_url: `${config.clientURL}?shop_cancel=1`,
    metadata: {
      userId: req.user.id,
      itemId: itemId,
    },
  }).then(session => {
    res.json({ sessionId: session.id, url: session.url });
  }).catch(err => {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  });
});

// Verify and fulfill purchase after Stripe redirect
router.post('/verify-purchase', authenticateToken, (req, res) => {
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'Item ID required' });

  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  // Check if already purchased
  const existing = db.prepare('SELECT 1 FROM purchases WHERE user_id = ? AND item_id = ?').get(req.user.id, itemId);
  if (existing) return res.json({ ok: true, alreadyOwned: true, item: { ...item, purchased: true } });

  // In test mode with Stripe, verify via recent checkout sessions
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  stripe.checkout.sessions.list({
    limit: 10,
  }).then(sessions => {
    const validSession = sessions.data.find(s =>
      s.metadata.userId === req.user.id &&
      s.metadata.itemId === itemId &&
      s.payment_status === 'paid'
    );

    if (validSession) {
      // Record the purchase
      db.prepare('INSERT OR IGNORE INTO purchases (user_id, item_id, price_usd) VALUES (?, ?, ?)').run(req.user.id, itemId, item.price);
      return res.json({ ok: true, item: { ...item, purchased: true } });
    } else {
      return res.status(402).json({ error: 'Payment not confirmed yet. Please complete the checkout.' });
    }
  }).catch(err => {
    console.error('Stripe verify error:', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  });
});

// Legacy purchase endpoint (simulated — fallback if Stripe not configured)
router.post('/purchase', authenticateToken, (req, res) => {
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'Item ID required' });

  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  if (item.oneTime) {
    const existing = db.prepare('SELECT 1 FROM purchases WHERE user_id = ? AND item_id = ?').get(req.user.id, itemId);
    if (existing) return res.status(400).json({ error: 'Already purchased' });
  }

  // If Stripe is configured, redirect to checkout instead
  if (stripe) {
    return res.status(400).json({ error: 'Use /create-checkout for Stripe payments', useStripe: true });
  }

  // Simulated purchase (no Stripe)
  db.prepare('INSERT INTO purchases (user_id, item_id, price_usd) VALUES (?, ?, ?)').run(req.user.id, itemId, item.price);
  res.json({ ok: true, item: { ...item, purchased: true } });
});

// Check if user has a specific upgrade
router.get('/check/:itemId', authenticateToken, (req, res) => {
  const purchased = !!db.prepare('SELECT 1 FROM purchases WHERE user_id = ? AND item_id = ?').get(req.user.id, req.params.itemId);
  res.json({ purchased });
});

// Get user's purchased items
router.get('/my-purchases', authenticateToken, (req, res) => {
  const purchases = db.prepare(`
    SELECT item_id, price_usd, purchased_at FROM purchases WHERE user_id = ? ORDER BY purchased_at DESC
  `).all(req.user.id);
  res.json(purchases);
});

// Change display name (requires custom_name purchase)
router.post('/set-name', authenticateToken, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
  if (name.trim().length > 30) return res.status(400).json({ error: 'Name too long (max 30 characters)' });

  const hasPurchase = db.prepare("SELECT 1 FROM purchases WHERE user_id = ? AND item_id = 'custom_name'").get(req.user.id);
  if (!hasPurchase) return res.status(403).json({ error: 'Purchase "Custom Display Name" upgrade first' });

  db.prepare('UPDATE users SET custom_name = ? WHERE id = ?').run(name.trim(), req.user.id);
  res.json({ ok: true, name: name.trim() });
});

// Change username (requires custom_name purchase)
router.post('/set-username', authenticateToken, (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) return res.status(400).json({ error: 'Username required' });
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (clean.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (clean.length > 20) return res.status(400).json({ error: 'Username too long (max 20 characters)' });

  const hasPurchase = db.prepare("SELECT 1 FROM purchases WHERE user_id = ? AND item_id = 'custom_name'").get(req.user.id);
  if (!hasPurchase) return res.status(403).json({ error: 'Purchase "Custom Display Name" upgrade first' });

  const existing = db.prepare('SELECT 1 FROM users WHERE username = ? AND id != ?').get(clean, req.user.id);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  db.prepare('UPDATE users SET username = ? WHERE id = ?').run(clean, req.user.id);
  res.json({ ok: true, username: clean });
});

// Set custom avatar (requires custom_avatar purchase + NSFW check)
router.post('/set-avatar', authenticateToken, async (req, res) => {
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ error: 'Avatar required' });

  const hasPurchase = db.prepare("SELECT 1 FROM purchases WHERE user_id = ? AND item_id = 'custom_avatar'").get(req.user.id);
  if (!hasPurchase) return res.status(403).json({ error: 'Purchase "Custom Avatar" upgrade first' });

  // Check for inappropriate content
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    try {
      const result = await moderateImage(avatar);
      if (!result.safe) {
        return res.status(400).json({ error: `Avatar rejected: ${result.reason}. Please choose an appropriate image.` });
      }
    } catch (err) {
      console.error('Moderation check failed:', err.message);
      // Allow on error to not block the user
    }
  }

  db.prepare('UPDATE users SET custom_avatar = ? WHERE id = ?').run(avatar, req.user.id);
  res.json({ ok: true, avatar });
});

export { SHOP_ITEMS };
export default router;
