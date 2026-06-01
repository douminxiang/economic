import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { SmsLoginDto } from './dto/sms-login.dto';
import { SmsService } from '../sms/sms.service';

// In-memory SMS code storage (mock mode, use Redis in production)
interface SmsRecord {
  code: string;
  expiresAt: number;
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
  ) {}

  async register(dto: RegisterDto) {
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

    const tokens = this.generateTokens(user.id, user.phone);
    const { password, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const tokens = this.generateTokens(user.id, user.phone);
    const { password, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET', this.configService.get('JWT_SECRET') + '_refresh'),
      });
      const tokens = this.generateTokens(payload.sub, payload.phone);
      return { accessToken: tokens.accessToken };
    } catch {
      throw new UnauthorizedException('refresh token 无效或已过期');
    }
  }

  private generateTokens(userId: number, phone: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId, phone },
      { expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m') },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, phone },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET', this.configService.get('JWT_SECRET') + '_refresh'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );
    return { accessToken, refreshToken };
  }

  async sendCode(dto: SendCodeDto) {
    const { phone } = dto;

    // 60-second cooldown check
    const lastSent = this.smsCooldowns.get(phone);
    if (lastSent && Date.now() - lastSent < 60000) {
      const remaining = Math.ceil((60000 - (Date.now() - lastSent)) / 1000);
      throw new BadRequestException(`请在 ${remaining} 秒后再试`);
    }

    // Generate 6-digit code
    const code = Math.random().toString().slice(2, 8).padEnd(6, '0');

    // Store code with 5-minute expiry
    this.smsCodes.set(phone, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    this.smsCooldowns.set(phone, Date.now());

    await this.smsService.sendVerificationCode(phone, code);

    return {
      message: this.smsService.isMockMode
        ? '验证码已发送（开发模式：请查看服务端控制台）'
        : '验证码已发送',
      phone,
      mockMode: this.smsService.isMockMode,
    };
  }

  async smsLogin(dto: SmsLoginDto) {
    const { phone, code } = dto;

    // Verify code
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

    // Code verified, clean up
    this.smsCodes.delete(phone);

    // Find or create user
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      // Auto-register on first SMS login (no password)
      user = await this.prisma.user.create({
        data: {
          phone,
          password: '', // SMS login users have no password
          nickname: `用户${phone.slice(-4)}`,
        },
      });
    }

    const tokens = this.generateTokens(user.id, user.phone);
    const { password, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }
}
