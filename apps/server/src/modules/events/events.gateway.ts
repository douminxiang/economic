import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { OrderService } from '../order/order.service';

@WebSocketGateway({ cors: true })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private userSockets = new Map<number, Set<string>>(); // userId -> socketIds

  constructor(
    private jwtService: JwtService,
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token as string);
      const userId = payload.sub;
      client.data.userId = userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      const sockets = this.userSockets.get(userId)!;
      sockets.add(client.id);

      client.join(`user:${userId}`);
      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.error('Connection auth failed', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId)!;
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('trackOrder')
  handleTrackOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ) {
    client.join(`order:${data.orderId}`);
    this.orderService.ensureRiderSimulation(data.orderId);
    return { event: 'tracking', data: { orderId: data.orderId, tracking: true } };
  }

  @SubscribeMessage('untrackOrder')
  handleUntrackOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ) {
    client.leave(`order:${data.orderId}`);
    return { event: 'tracking', data: { orderId: data.orderId, tracking: false } };
  }

  emitOrderStatusChanged(
    userId: number,
    payload: { orderId: number; orderNo: string; status: number; statusText: string },
  ) {
    this.server.to(`user:${userId}`).emit('order:statusChanged', payload);
  }

  emitRiderLocation(
    orderId: number,
    payload: { latitude: number; longitude: number; estimatedMinutes: number },
  ) {
    this.server.to(`order:${orderId}`).emit('order:riderLocation', { orderId, ...payload });
  }
}
