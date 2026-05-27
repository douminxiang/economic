import { Controller, Get, Post, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FavoriteService } from './favorite.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post(':shopId')
  toggle(
    @CurrentUser('id') userId: number,
    @Param('shopId', ParseIntPipe) shopId: number,
  ) {
    return this.favoriteService.toggle(userId, shopId);
  }

  @Get()
  findAll(@CurrentUser('id') userId: number) {
    return this.favoriteService.findAll(userId);
  }

  @Get('check/:shopId')
  check(
    @CurrentUser('id') userId: number,
    @Param('shopId', ParseIntPipe) shopId: number,
  ) {
    return this.favoriteService.check(userId, shopId);
  }
}
