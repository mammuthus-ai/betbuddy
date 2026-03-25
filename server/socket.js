import { Server } from 'socket.io';
import { getUserFromCookie } from './middleware/auth.js';

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Auth middleware for socket connections
  io.use((socket, next) => {
    const user = getUserFromCookie(socket.handshake.headers.cookie);
    if (!user) {
      return next(new Error('Authentication required'));
    }
    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.name} (${socket.user.id})`);

    // Join personal room for private events
    socket.join(`user:${socket.user.id}`);

    // Join/leave bet rooms
    socket.on('join_bet', ({ betId }) => {
      socket.join(`bet:${betId}`);
    });

    socket.on('leave_bet', ({ betId }) => {
      socket.leave(`bet:${betId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.name}`);
    });
  });

  return io;
}
