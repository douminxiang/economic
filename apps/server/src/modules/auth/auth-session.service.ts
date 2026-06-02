import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface DeviceInfo {
  deviceId?: string;
  deviceName?: string;
  ip?: string;
}

@Injectable()
export class AuthSessionService {
  constructor(private prisma: PrismaService) {}

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createSession(
    userId: number,
    refreshToken: string,
    expiresAt: Date,
    device?: DeviceInfo,
    sessionId = randomUUID(),
  ) {
    await this.prisma.authSession.create({
      data: {
        id: sessionId,
        userId,
        deviceId: device?.deviceId,
        deviceName: device?.deviceName,
        ip: device?.ip,
        refreshHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });
    return sessionId;
  }

  async assertSessionActive(sessionId: string) {
    const session = await this.prisma.authSession.findUnique({ where: { id: sessionId } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('登录已失效，请重新登录');
    }
    return session;
  }

  async touchSession(sessionId: string) {
    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });
  }

  async rotateRefreshToken(sessionId: string, refreshToken: string) {
    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: {
        refreshHash: this.hashToken(refreshToken),
        lastActiveAt: new Date(),
      },
    });
  }

  async revokeSession(sessionId: string) {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: number, exceptSessionId?: string) {
    await this.prisma.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }

  async verifyRefreshToken(sessionId: string, refreshToken: string) {
    const session = await this.assertSessionActive(sessionId);
    if (session.refreshHash !== this.hashToken(refreshToken)) {
      await this.revokeSession(sessionId);
      throw new UnauthorizedException('refresh token 无效或已过期');
    }
    return session;
  }

  async listActiveSessions(userId: number, currentSessionId?: string) {
    const sessions = await this.prisma.authSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        ip: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });

    return sessions.map((session) => ({
      ...session,
      isCurrent: session.id === currentSessionId,
    }));
  }
}
