import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';
import db from '../db.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';

const router = Router();

function upsertUser(provider, profile) {
  const existing = db.prepare('SELECT * FROM users WHERE provider = ? AND provider_id = ?').get(provider, profile.id);
  if (existing) return existing;

  const id = uuidv4();
  const name = profile.displayName || profile.username || 'User';
  const email = profile.emails?.[0]?.value || null;
  const avatar = profile.photos?.[0]?.value || '😎';
  const username = (profile.username || name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000));
  const qrToken = uuidv4();

  db.prepare(`
    INSERT INTO users (id, provider, provider_id, username, name, email, avatar, qr_token)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, provider, profile.id, username, name, email, avatar, qrToken);

  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// Google OAuth
if (config.google.clientID && config.google.clientID !== 'your-google-client-id') {
  passport.use(new GoogleStrategy({
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackURL,
  }, (accessToken, refreshToken, profile, done) => {
    try {
      const user = upsertUser('google', profile);
      done(null, user);
    } catch (err) {
      done(err);
    }
  }));

  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

  router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
      const token = generateToken(req.user.id);
      res.cookie('bb_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.redirect(config.clientURL);
    }
  );
}

// GitHub OAuth
if (config.github.clientID && config.github.clientID !== 'your-github-client-id') {
  passport.use(new GitHubStrategy({
    clientID: config.github.clientID,
    clientSecret: config.github.clientSecret,
    callbackURL: config.github.callbackURL,
  }, (accessToken, refreshToken, profile, done) => {
    try {
      const user = upsertUser('github', profile);
      done(null, user);
    } catch (err) {
      done(err);
    }
  }));

  router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));

  router.get('/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: '/login' }),
    (req, res) => {
      const token = generateToken(req.user.id);
      res.cookie('bb_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.redirect(config.clientURL);
    }
  );
}

// Dev login (for testing without OAuth keys)
router.post('/dev-login', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  let user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    const id = uuidv4();
    const qrToken = uuidv4();
    db.prepare(`
      INSERT INTO users (id, provider, provider_id, username, name, qr_token)
      VALUES (?, 'dev', ?, ?, ?, ?)
    `).run(id, id, username, username, qrToken);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  const token = generateToken(user.id);
  res.cookie('bb_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json(user);
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('bb_token');
  res.json({ ok: true });
});

export default router;
