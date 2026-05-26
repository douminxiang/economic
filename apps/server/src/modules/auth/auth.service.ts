import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
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
}
