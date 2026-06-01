import { io, Socket } from 'socket.io-client';
import { getStorage } from '../utils/storage';
import { API_ORIGIN } from '../config/api';

let socket: Socket | null = null;
let lastConnectErrorLog = 0;

export const getSocket = (): Socket | null => socket;

export const isSocketConnected = () => Boolean(socket?.connected);

function attachSocketListeners(instance: Socket) {
  instance.off('connect');
  instance.off('disconnect');
  instance.off('connect_error');

  instance.on('connect', () => {
    if (__DEV__) console.log('[Socket] Connected:', instance.id);
  });
  instance.on('disconnect', (reason) => {
    if (__DEV__) console.log('[Socket] Disconnected:', reason);
  });
  instance.on('connect_error', (err) => {
    // Avoid console.error — React Native LogBox shows it as a blocking snackbar.
    const now = Date.now();
    if (__DEV__ && now - lastConnectErrorLog > 15000) {
      lastConnectErrorLog = now;
      console.warn('[Socket] Connect failed (order realtime may be delayed):', err.message);
    }
  });
}

/** Connect for order/map realtime. Safe to call multiple times; uses polling-first for Android emulator. */
export const connectSocket = () => {
  const token = getStorage().getString('accessToken');
  if (!token) return;

  if (socket?.connected) return;

  if (socket) {
    socket.auth = { token };
    attachSocketListeners(socket);
    if (!socket.connected) {
      socket.connect();
    }
    return;
  }

  socket = io(API_ORIGIN, {
    auth: { token },
    path: '/socket.io',
    // Polling first: WebSocket often fails on Android emulator / some networks.
    transports: ['polling', 'websocket'],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 2000,
    timeout: 15000,
  });

  attachSocketListeners(socket);
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const reconnectSocket = () => {
  disconnectSocket();
  connectSocket();
};
