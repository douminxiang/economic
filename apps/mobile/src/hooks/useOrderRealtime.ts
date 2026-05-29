import { useState, useEffect, useRef } from 'react';
import { getSocket, connectSocket } from '../services/socket';
import { useQueryClient } from '@tanstack/react-query';

interface RiderLocation {
  latitude: number;
  longitude: number;
  estimatedMinutes: number;
}

interface OrderStatusPayload {
  orderId: number;
  orderNo: string;
  status: number;
  statusText: string;
}

interface UseOrderRealtimeResult {
  status: number | null;
  statusText: string | null;
  riderLocation: RiderLocation | null;
  isConnected: boolean;
}

export function useOrderRealtime(orderId: number): UseOrderRealtimeResult {
  const [status, setStatus] = useState<number | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (!orderId) return;

    connectSocket();
    const socket = getSocket();
    if (!socket) return;

    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onOrderStatusChanged = (data: OrderStatusPayload) => {
      if (data.orderId === orderId) {
        setStatus(data.status);
        setStatusText(data.statusText);
        // Invalidate the order detail query so the UI refreshes
        qc.invalidateQueries({ queryKey: ['orders', orderId] });
        qc.invalidateQueries({ queryKey: ['orders'] });
      }
    };
    const onRiderLocation = (data: RiderLocation & { orderId: number }) => {
      if (data.orderId === orderId) {
        setRiderLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          estimatedMinutes: data.estimatedMinutes,
        });
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('order:statusChanged', onOrderStatusChanged);
    socket.on('order:riderLocation', onRiderLocation);

    // Subscribe to tracking for this order
    socket.emit('trackOrder', { orderId });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('order:statusChanged', onOrderStatusChanged);
      socket.off('order:riderLocation', onRiderLocation);
      socket.emit('untrackOrder', { orderId });
    };
  }, [orderId, qc]);

  return { status, statusText, riderLocation, isConnected };
}
