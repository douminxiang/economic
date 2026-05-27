import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderService } from './order.service';
import { CreateOrderDto, PayOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@CurrentUser('id') userId: number, @Body() dto: CreateOrderDto) {
    return this.orderService.create(userId, dto.addressId, dto.remark);
  }

  @Get()
  findAll(@CurrentUser('id') userId: number, @Query() query: QueryOrderDto) {
    return this.orderService.findAll(userId, query.status, query.page, query.limit);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOne(userId, id);
  }

  @Patch(':id/pay')
  pay(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayOrderDto,
  ) {
    return this.orderService.pay(userId, id, dto.payMethod);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.cancel(userId, id);
  }

  @Patch(':id/confirm')
  confirm(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.confirm(userId, id);
  }
}
