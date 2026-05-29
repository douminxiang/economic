import { useEffect, useRef } from 'react';
import { getSocket, connectSocket } from '../services/socket';

/**
 * Generic hook for subscribing to a socket event with automatic cleanup.
 *
 * @param event - The socket event name to listen on
 * @param handler - Callback invoked with event data
 */
export function useSocketEvent<T = any>(event: string, handler: (data: T) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    // Ensure socket is connected
    connectSocket();
    const socket = getSocket();
    if (!socket) return;

    const listener = (data: T) => handlerRef.current(data);
    socket.on(event, listener);

    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}

/**
 * Hook that returns whether the socket is currently connected.
 */
export function useSocketConnected(): boolean {
  const socket = getSocket();
  return socket?.connected ?? false;
}
