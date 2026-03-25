import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import passport from 'passport';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from './config.js';
import { setupSocket } from './socket.js';
import authRoutes from './routes/auth.js';
import betRoutes from './routes/bets.js';
import commentRoutes from './routes/comments.js';
import proofRoutes from './routes/proof.js';
import userRoutes from './routes/users.js';
import friendRoutes from './routes/friends.js';
import coinRoutes from './routes/coins.js';
import shopRoutes from './routes/shop.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

// Socket.io
const io = setupSocket(httpServer);
app.set('io', io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, same-origin, curl)
    if (!origin) return callback(null, true);
    const allowed = [config.clientURL, 'https://putuporshutup.app', 'capacitor://localhost', 'http://localhost'].filter(Boolean);
    if (allowed.some(a => origin.startsWith(a))) return callback(null, true);
    callback(null, true); // Allow all in dev; tighten for production
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

// Static files for uploads
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Routes
app.use('/auth', authRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/bets', commentRoutes);
app.use('/api/bets', proofRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/shop', shopRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve frontend in production
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/auth') && !req.path.startsWith('/uploads') && !req.path.startsWith('/socket.io')) {
    res.sendFile(join(distPath, 'index.html'));
  } else {
    next();
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

httpServer.listen(config.port, '0.0.0.0', () => {
  console.log(`Put Up or Shut Up server running on port ${config.port}`);
});
