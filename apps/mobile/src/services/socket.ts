import { io, Socket } from 'socket.io-client';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();
let socket: Socket | null = null;

export const getSocket = (): Socket | null => socket;

export const connectSocket = () => {
  const token = storage.getString('accessToken');
  if (!token || socket?.connected) return;

  socket = io('http://10.0.2.2:3000', {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
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
