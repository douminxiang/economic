import { Controller, Post, Body, Get, Delete, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { SmsLoginDto } from './dto/sms-login.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.ip);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(OptionalJwtAuthGuard)
  logout(@Body() dto: LogoutDto, @CurrentUser() user?: { sid?: string }) {
    return this.authService.logout(user?.sid, dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  listSessions(@CurrentUser() user: { id: number; sid: string }) {
    return this.authService.listSessions(user.id, user.sid);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/others')
  logoutOthers(@CurrentUser() user: { id: number; sid: string }) {
    return this.authService.logoutOthers(user.id, user.sid);
  }

  @Post('send-code')
  sendCode(@Body() dto: SendCodeDto) {
    return this.authService.sendCode(dto);
  }

  @Post('sms-login')
  smsLogin(@Body() dto: SmsLoginDto, @Req() req: Request) {
    return this.authService.smsLogin(dto, req.ip);
  }
}
