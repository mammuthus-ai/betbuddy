import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateComment } from '../middleware/validate.js';
import db from '../db.js';

const router = Router();

// DB migration: add comment_type and extra_data columns
const commentCols = db.prepare("PRAGMA table_info(comments)").all().map(c => c.name);
if (!commentCols.includes('comment_type')) {
  db.exec("ALTER TABLE comments ADD COLUMN comment_type TEXT DEFAULT 'text'");
}
if (!commentCols.includes('extra_data')) {
  db.exec("ALTER TABLE comments ADD COLUMN extra_data TEXT");
}

// Reactions table
db.exec(`
  CREATE TABLE IF NOT EXISTS comment_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    emoji TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(comment_id, user_id, emoji)
  );
  CREATE INDEX IF NOT EXISTS idx_reactions_comment ON comment_reactions(comment_id);
`);

// Get comments for a bet (with reactions)
router.get('/:betId/comments', authenticateToken, (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.username,
           c.comment_type, c.extra_data
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.bet_id = ? ORDER BY c.created_at ASC
  `).all(req.params.betId);

  // Attach reactions to each comment
  const getReactions = db.prepare(`
    SELECT cr.emoji, cr.user_id, u.name as user_name
    FROM comment_reactions cr JOIN users u ON u.id = cr.user_id
    WHERE cr.comment_id = ?
  `);

  const result = comments.map(c => ({
    ...c,
    extra_data: c.extra_data ? JSON.parse(c.extra_data) : null,
    reactions: getReactions.all(c.id),
  }));

  res.json(result);
});

// Add comment (text, gif, or voice)
router.post('/:betId/comments', authenticateToken, (req, res) => {
  const { text, commentType, extraData } = req.body;
  const betId = req.params.betId;
  const type = commentType || 'text';

  // Validate based on type
  if (type === 'text' && (!text || !text.trim())) {
    return res.status(400).json({ error: 'Comment text required' });
  }

  if (type === 'gif' && (!extraData || !extraData.gifUrl)) {
    return res.status(400).json({ error: 'GIF URL required' });
  }

  if (type === 'voice' && (!extraData || !extraData.audioData)) {
    return res.status(400).json({ error: 'Audio data required' });
  }

  // Check extended trash talk purchase for GIF/voice types
  if (type !== 'text') {
    const hasPurchase = db.prepare("SELECT 1 FROM purchases WHERE user_id = ? AND item_id = 'extended_trash_talk'").get(req.user.id);
    if (!hasPurchase) {
      return res.status(403).json({ error: 'Purchase "Extended Trash Talk" to send GIFs and voice notes' });
    }
  }

  const bet = db.prepare('SELECT id FROM bets WHERE id = ?').get(betId);
  if (!bet) return res.status(404).json({ error: 'Bet not found' });

  const result = db.prepare(`
    INSERT INTO comments (bet_id, user_id, text, comment_type, extra_data)
    VALUES (?, ?, ?, ?, ?)
  `).run(betId, req.user.id, text || '', type, extraData ? JSON.stringify(extraData) : null);

  const comment = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.username
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  const enriched = {
    ...comment,
    extra_data: comment.extra_data ? JSON.parse(comment.extra_data) : null,
    reactions: [],
  };

  const io = req.app.get('io');
  if (io) io.to(`bet:${betId}`).emit('comment:new', enriched);

  res.status(201).json(enriched);
});

// Toggle reaction on a comment
router.post('/:betId/comments/:commentId/react', authenticateToken, (req, res) => {
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: 'Emoji required' });

  const commentId = parseInt(req.params.commentId);
  const comment = db.prepare('SELECT id, bet_id FROM comments WHERE id = ?').get(commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  // Check if user has extended trash talk
  const hasPurchase = db.prepare("SELECT 1 FROM purchases WHERE user_id = ? AND item_id = 'extended_trash_talk'").get(req.user.id);
  if (!hasPurchase) {
    return res.status(403).json({ error: 'Purchase "Extended Trash Talk" to react' });
  }

  // Toggle: remove if exists, add if not
  const existing = db.prepare('SELECT 1 FROM comment_reactions WHERE comment_id = ? AND user_id = ? AND emoji = ?').get(commentId, req.user.id, emoji);

  if (existing) {
    db.prepare('DELETE FROM comment_reactions WHERE comment_id = ? AND user_id = ? AND emoji = ?').run(commentId, req.user.id, emoji);
  } else {
    db.prepare('INSERT OR IGNORE INTO comment_reactions (comment_id, user_id, emoji) VALUES (?, ?, ?)').run(commentId, req.user.id, emoji);
  }

  // Get updated reactions
  const reactions = db.prepare(`
    SELECT cr.emoji, cr.user_id, u.name as user_name
    FROM comment_reactions cr JOIN users u ON u.id = cr.user_id
    WHERE cr.comment_id = ?
  `).all(commentId);

  const io = req.app.get('io');
  if (io) io.to(`bet:${comment.bet_id}`).emit('comment:reaction', { commentId, reactions });

  res.json({ reactions });
});

export default router;
