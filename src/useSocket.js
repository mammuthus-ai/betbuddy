import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useSocket(isAuthenticated) {
  const socketRef = useRef(null);
  const listenersRef = useRef({});

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = io('/', { withCredentials: true, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => console.log('Socket connected'));
    socket.on('disconnect', () => console.log('Socket disconnected'));
    socket.on('connect_error', (err) => console.log('Socket auth error:', err.message));

    // Replay registered listeners
    Object.entries(listenersRef.current).forEach(([event, handlers]) => {
      handlers.forEach(fn => socket.on(event, fn));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  const on = useCallback((event, handler) => {
    if (!listenersRef.current[event]) listenersRef.current[event] = [];
    listenersRef.current[event].push(handler);
    if (socketRef.current) socketRef.current.on(event, handler);

    return () => {
      listenersRef.current[event] = listenersRef.current[event].filter(fn => fn !== handler);
      if (socketRef.current) socketRef.current.off(event, handler);
    };
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current) socketRef.current.emit(event, data);
  }, []);

  const joinBet = useCallback((betId) => emit('join_bet', { betId }), [emit]);
  const leaveBet = useCallback((betId) => emit('leave_bet', { betId }), [emit]);

  return { on, emit, joinBet, leaveBet };
}
