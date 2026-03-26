import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import { moderateFile } from '../middleware/moderation.js';
import db from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|mp4|mov|webm)$/i;
    if (allowed.test(extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  },
});

const router = Router();

// Upload proof
router.post('/:betId/proof', authenticateToken, upload.single('file'), async (req, res) => {
  const betId = req.params.betId;

  const bet = db.prepare('SELECT id FROM bets WHERE id = ?').get(betId);
  if (!bet) return res.status(404).json({ error: 'Bet not found' });

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const isParticipant = db.prepare('SELECT 1 FROM bet_sides WHERE bet_id = ? AND user_id = ?').get(betId, req.user.id);
  if (!isParticipant) return res.status(403).json({ error: 'Only participants can upload proof' });

  // Moderate uploaded images for inappropriate content
  const fileType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
  if (fileType === 'image') {
    try {
      const modResult = await moderateFile(req.file.path);
      if (!modResult.safe) {
        // Delete the uploaded file
        const fs = await import('fs');
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: `Image rejected: ${modResult.reason}. Please upload an appropriate image.` });
      }
    } catch (err) {
      console.error('Proof moderation failed:', err.message);
    }
  }

  const filePath = `/uploads/${req.file.filename}`;

  const result = db.prepare(`
    INSERT INTO bet_proofs (bet_id, user_id, file_path, file_type, caption)
    VALUES (?, ?, ?, ?, ?)
  `).run(betId, req.user.id, filePath, fileType, req.body.caption || null);

  const proof = db.prepare(`
    SELECT p.*, u.name as user_name, u.avatar as user_avatar
    FROM bet_proofs p JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
  `).get(result.lastInsertRowid);

  const io = req.app.get('io');
  if (io) io.to(`bet:${betId}`).emit('proof:uploaded', proof);

  res.status(201).json(proof);
});

// Get proofs for a bet
router.get('/:betId/proof', authenticateToken, (req, res) => {
  const proofs = db.prepare(`
    SELECT p.*, u.name as user_name, u.avatar as user_avatar
    FROM bet_proofs p JOIN users u ON u.id = p.user_id
    WHERE p.bet_id = ? ORDER BY p.created_at ASC
  `).all(req.params.betId);

  res.json(proofs);
});

export default router;
