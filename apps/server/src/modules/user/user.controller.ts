import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getMe(@CurrentUser('id') userId: number) {
    return this.userService.findById(userId);
  }

  @Patch('me')
  updateMe(@CurrentUser('id') userId: number, @Body() dto: UpdateUserDto) {
    return this.userService.update(userId, dto);
  }
}
