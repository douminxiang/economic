import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CartService } from './cart.service';
import { AddCartDto, UpdateCartDto } from './dto/add-cart.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser('id') userId: number) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  addItem(@CurrentUser('id') userId: number, @Body() dto: AddCartDto) {
    return this.cartService.addItem(userId, dto.productId, dto.quantity);
  }

  @Patch('items/:id')
  updateItem(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.updateItem(userId, id, dto.quantity);
  }

  @Delete('items/:id')
  removeItem(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cartService.removeItem(userId, id);
  }

  @Delete('clear')
  clearCart(@CurrentUser('id') userId: number) {
    return this.cartService.clearCart(userId);
  }
}
