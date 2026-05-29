import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(@Body() body: any) {
    const valid = await this.paymentService.verifyCallback(body);
    if (!valid) return { code: 'FAIL', msg: '签名验证失败' };

    const { out_trade_no, trade_status } = body;
    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      await this.prisma.order.update({
        where: { orderNo: out_trade_no },
        data: { status: 1, payTime: new Date() },
      });
    }
    return { code: 'SUCCESS', msg: 'success' };
  }

  @Get('status/:orderNo')
  @UseGuards(JwtAuthGuard)
  async queryStatus(@Param('orderNo') orderNo: string) {
    return this.paymentService.queryPayment(orderNo);
  }

  @Post('mock-pay/:orderNo')
  @UseGuards(JwtAuthGuard)
  async mockPay(@Param('orderNo') orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
    });
    if (!order || order.status !== 0) {
      return { success: false, message: '订单不存在或状态异常' };
    }

    await this.prisma.order.update({
      where: { orderNo },
      data: { status: 1, payMethod: 'alipay', payTime: new Date() },
    });

    return { success: true, message: '支付成功（模拟）' };
  }
}
