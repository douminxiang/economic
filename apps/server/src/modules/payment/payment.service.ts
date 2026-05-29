import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly isMockMode: boolean;

  constructor(private configService: ConfigService) {
    this.isMockMode = !this.configService.get('ALIPAY_APP_ID');
  }

  async createPayment(orderNo: string, amount: number, subject: string) {
    if (this.isMockMode) {
      this.logger.log(`[MOCK] Payment created: ${orderNo} ¥${amount}`);
      return { orderNo, payUrl: `mock://pay?orderNo=${orderNo}`, mockMode: true };
    }
    // TODO: Real Alipay SDK integration
    // const AlipaySdk = require('alipay-sdk').default;
    // const alipaySdk = new AlipaySdk({...});
    // const result = await alipaySdk.exec('alipay.trade.app.pay', {...});
    return { orderNo, payUrl: '', mockMode: false };
  }

  async verifyCallback(params: any): Promise<boolean> {
    if (this.isMockMode) return true;
    // TODO: Real signature verification
    return true;
  }

  async queryPayment(orderNo: string) {
    if (this.isMockMode) {
      return { orderNo, status: 'WAIT_BUYER_PAY' };
    }
    // TODO: Real query
    return { orderNo, status: 'WAIT_BUYER_PAY' };
  }
}
