import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { SmsLoginDto } from './dto/sms-login.dto';
import { SmsService } from '../sms/sms.service';
import { AuthSessionService, DeviceInfo } from './auth-session.service';
import { EventsGateway } from '../events/events.gateway';
import { DeviceInfoDto } from './dto/device-info.dto';

interface SmsRecord {
  code: string;
  expiresAt: number;
}

interface TokenPayload {
  sub: number;
  phone: string;
  sid: string;
}

@Injectable()
export class AuthService {
  private smsCodes = new Map<string, SmsRecord>();
  private smsCooldowns = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private smsService: SmsService,
    private authSessionService: AuthSessionService,
    private eventsGateway: EventsGateway,
  ) {}

  private get refreshSecret() {
    return this.configService.get('JWT_REFRESH_SECRET', this.configService.get('JWT_SECRET') + '_refresh');
  }

  private get refreshExpiresIn() {
    return this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  private isSingleSessionMode() {
    return this.configService.get('SSO_SINGLE_SESSION', 'true') !== 'false';
  }

  private deviceFromDto(dto: DeviceInfoDto, ip?: string): DeviceInfo {
    return {
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      ip,
    };
  }

  async register(dto: RegisterDto, ip?: string) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException('手机号已注册');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        password: hashedPassword,
        nickname: dto.nickname || `用户${dto.phone.slice(-4)}`,
      },
    });

    const tokens = await this.issueTokens(user.id, user.phone, this.deviceFromDto(dto, ip));
    const { password, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const tokens = await this.issueTokens(user.id, user.phone, this.deviceFromDto(dto, ip));
    const { password, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }

  async refresh(refreshToken: string) {
    let payload: TokenPayload;
    try {
      payload = this.jwtService.verify(refreshToken, { secret: this.refreshSecret });
    } catch {
      throw new UnauthorizedException('refresh token 无效或已过期');
    }

    if (!payload.sid) {
      throw new UnauthorizedException('登录已失效，请重新登录');
    }

    await this.authSessionService.verifyRefreshToken(payload.sid, refreshToken);

    const accessToken = this.jwtService.sign(
      { sub: payload.sub, phone: payload.phone, sid: payload.sid },
      { expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m') },
    );
    const newRefreshToken = this.jwtService.sign(
      { sub: payload.sub, phone: payload.phone, sid: payload.sid },
      { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn },
    );

    await this.authSessionService.rotateRefreshToken(payload.sid, newRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(sessionId?: string, refreshToken?: string) {
    if (sessionId) {
      await this.authSessionService.revokeSession(sessionId);
      return { message: '已退出登录' };
    }

    if (refreshToken) {
      try {
        const payload = this.jwtService.verify(refreshToken, { secret: this.refreshSecret }) as TokenPayload;
        if (payload.sid) {
          await this.authSessionService.revokeSession(payload.sid);
        }
      } catch {
        // ignore invalid token on logout
      }
    }

    return { message: '已退出登录' };
  }

  async logoutOthers(userId: number, currentSessionId: string) {
    await this.authSessionService.revokeAllSessions(userId, currentSessionId);
    this.eventsGateway.emitSessionRevoked(userId, {
      reason: 'logged_out_elsewhere',
      exceptSessionId: currentSessionId,
    });
    return { message: '已退出其他设备' };
  }

  async listSessions(userId: number, currentSessionId?: string) {
    return this.authSessionService.listActiveSessions(userId, currentSessionId);
  }

  private async issueTokens(userId: number, phone: string, device?: DeviceInfo) {
    if (this.isSingleSessionMode()) {
      await this.authSessionService.revokeAllSessions(userId);
      this.eventsGateway.emitSessionRevoked(userId, { reason: 'logged_in_elsewhere' });
    }

    const sessionId = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: userId, phone, sid: sessionId },
      { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn },
    );
    const expiresAt = this.getRefreshExpiryDate(refreshToken);
    await this.authSessionService.createSession(userId, refreshToken, expiresAt, device, sessionId);

    const accessToken = this.jwtService.sign(
      { sub: userId, phone, sid: sessionId },
      { expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m') },
    );

    return { accessToken, refreshToken, sessionId };
  }

  private getRefreshExpiryDate(refreshToken: string): Date {
    const decoded = this.jwtService.decode(refreshToken) as { exp?: number } | null;
    if (decoded?.exp) {
      return new Date(decoded.exp * 1000);
    }
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  async sendCode(dto: SendCodeDto) {
    const { phone } = dto;

    const lastSent = this.smsCooldowns.get(phone);
    if (lastSent && Date.now() - lastSent < 60000) {
      const remaining = Math.ceil((60000 - (Date.now() - lastSent)) / 1000);
      throw new BadRequestException(`请在 ${remaining} 秒后再试`);
    }

    const code = Math.random().toString().slice(2, 8).padEnd(6, '0');

    this.smsCodes.set(phone, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    this.smsCooldowns.set(phone, Date.now());

    await this.smsService.sendVerificationCode(phone, code);

    return {
      message: this.smsService.isMockMode
        ? '验证码已发送（开发模式）'
        : '验证码已发送',
      phone,
      mockMode: this.smsService.isMockMode,
      ...(this.smsService.isMockMode ? { code } : {}),
    };
  }

  async smsLogin(dto: SmsLoginDto, ip?: string) {
    const { phone, code } = dto;

    const record = this.smsCodes.get(phone);
    if (!record) {
      throw new BadRequestException('请先获取验证码');
    }
    if (Date.now() > record.expiresAt) {
      this.smsCodes.delete(phone);
      throw new BadRequestException('验证码已过期，请重新获取');
    }
    if (record.code !== code) {
      throw new BadRequestException('验证码错误');
    }

    this.smsCodes.delete(phone);

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
          password: '',
          nickname: `用户${phone.slice(-4)}`,
        },
      });
    }

    const tokens = await this.issueTokens(user.id, user.phone, this.deviceFromDto(dto, ip));
    const { password, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }
}
