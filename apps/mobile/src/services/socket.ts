import { io, Socket } from 'socket.io-client';
import { getStorage } from '../utils/storage';
import { API_ORIGIN } from '../config/api';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => socket;

export const connectSocket = () => {
  const token = getStorage().getString('accessToken');
  if (!token) return;

  if (socket?.connected) return;

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
    return;
  }

  socket = io(API_ORIGIN, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('[Socket] Connected:', socket?.id));
  socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
  socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const reconnectSocket = () => {
  disconnectSocket();
  connectSocket();
};
