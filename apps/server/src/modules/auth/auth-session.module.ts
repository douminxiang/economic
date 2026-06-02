import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthSessionService } from './auth-session.service';

@Module({
  imports: [PrismaModule],
  providers: [AuthSessionService],
  exports: [AuthSessionService],
})
export class AuthSessionModule {}
