import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthSessionService } from '../auth-session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private authSessionService: AuthSessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: { sub: number; phone: string; sid?: string }) {
    if (!payload.sid) {
      throw new UnauthorizedException('登录已失效，请重新登录');
    }

    await this.authSessionService.assertSessionActive(payload.sid);

    return { id: payload.sub, phone: payload.phone, sid: payload.sid };
  }
}
