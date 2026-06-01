import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlipaySdk } from 'alipay-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { OrderService } from '../order/order.service';

export interface PaymentCreateResult {
  /** 业务订单号（数据库 orderNo） */
  orderNo: string;
  /** 提交给支付宝的商户订单号，每次发起支付会换新，避免沙箱重复单 504 */
  alipayOutTradeNo: string;
  payUrl: string;
  payFormHtml?: string;
  mockMode: boolean;
  /** 服务端探测沙箱网关是否可正常跳转到收银台 */
  sandboxReady?: boolean;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private mockMode: boolean;
  private alipaySdk: AlipaySdk | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
  ) {
    const appId = this.configService.get<string>('ALIPAY_APP_ID', '').trim();
    const privateKey = this.configService.get<string>('ALIPAY_PRIVATE_KEY', '').trim();
    const alipayPublicKey = this.configService.get<string>('ALIPAY_PUBLIC_KEY', '').trim();

    this.mockMode = !appId || !privateKey || !alipayPublicKey;

    if (!this.mockMode) {
      try {
        const gateway =
          this.configService.get<string>('ALIPAY_GATEWAY') ||
          'https://openapi-sandbox.dl.alipaydev.com/gateway.do';
        const endpoint = gateway.replace(/\/gateway\.do$/, '');

        this.alipaySdk = new AlipaySdk({
          appId,
          privateKey: this.formatPemKey(privateKey, 'private'),
          alipayPublicKey: this.formatPemKey(alipayPublicKey, 'public'),
          keyType: this.configService.get('ALIPAY_KEY_TYPE', 'PKCS1'),
          gateway,
          endpoint,
        });
        this.logger.log('Alipay SDK initialized (sandbox/production per ALIPAY_GATEWAY)');
      } catch (error) {
        this.logger.error('Alipay SDK init failed, falling back to mock mode', error);
        this.mockMode = true;
        this.alipaySdk = null;
      }
    } else {
      this.logger.log('Alipay mock mode (set ALIPAY_APP_ID + keys to enable)');
    }
  }

  get isMockMode() {
    return this.mockMode;
  }

  async createPayment(
    businessOrderNo: string,
    amount: number,
    subject: string,
  ): Promise<PaymentCreateResult> {
    if (this.isMockMode || !this.alipaySdk) {
      this.logger.log(`[MOCK] Payment created: ${businessOrderNo} ¥${amount}`);
      return {
        orderNo: businessOrderNo,
        alipayOutTradeNo: businessOrderNo,
        payUrl: `mock://pay?orderNo=${businessOrderNo}`,
        mockMode: true,
      };
    }

    const returnUrl = this.configService.get('ALIPAY_RETURN_URL', 'https://www.taobao.com');
    const notifyCandidates = this.getNotifyUrlCandidates();
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const alipayOutTradeNo = this.buildAlipayOutTradeNo(businessOrderNo, attempt);

      for (const notifyUrl of notifyCandidates) {
        try {
          const wapParams = {
            notifyUrl,
            returnUrl,
            bizContent: {
              out_trade_no: alipayOutTradeNo,
              product_code: 'QUICK_WAP_WAY',
              total_amount: Number(amount).toFixed(2),
              subject: subject.slice(0, 128),
            },
          };

          const payFormHtml = this.alipaySdk.pageExecute('alipay.trade.wap.pay', 'POST', wapParams);
          const payUrl = this.alipaySdk.pageExecute('alipay.trade.wap.pay', 'GET', wapParams);
          const probe = await this.probePayGateway(payUrl);

          if (probe.ok) {
            this.logger.log(
              `Alipay pay ready: trade=${alipayOutTradeNo} notify=${notifyUrl}`,
            );
            return {
              orderNo: businessOrderNo,
              alipayOutTradeNo,
              payUrl,
              payFormHtml,
              mockMode: false,
              sandboxReady: true,
            };
          }

          this.logger.warn(
            `Alipay probe failed (${probe.reason}) attempt=${attempt + 1} notify=${notifyUrl} trade=${alipayOutTradeNo}`,
          );
        } catch (error) {
          this.logger.error(
            `Create Alipay payment failed: ${businessOrderNo} notify=${notifyUrl}`,
            error,
          );
        }
      }
    }

    throw new InternalServerErrorException(
      '支付宝沙箱暂不可用（网关拒绝或超时），请点「模拟完成支付」或稍后重试',
    );
  }

  async verifyCallback(params: Record<string, string>): Promise<boolean> {
    if (this.isMockMode || !this.alipaySdk) return true;
    try {
      return this.alipaySdk.checkNotifySignV2(params);
    } catch (error) {
      this.logger.error('Alipay callback verify failed', error);
      return false;
    }
  }

  async handleCallback(params: Record<string, string>) {
    const valid = await this.verifyCallback(params);
    if (!valid) {
      return { ok: false, message: '签名验证失败' };
    }

    const { out_trade_no: outTradeNo, trade_status: tradeStatus } = params;
    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      const order = await this.resolveOrderByOutTradeNo(outTradeNo);
      if (order) {
        await this.markOrderPaidInternal(order.orderNo, 'alipay');
      }
    }
    return { ok: true, message: 'success' };
  }

  async queryPayment(businessOrderNo: string, alipayOutTradeNo?: string) {
    const order = await this.prisma.order.findUnique({ where: { orderNo: businessOrderNo } });
    if (!order) {
      return { orderNo: businessOrderNo, status: 'NOT_FOUND', paid: false };
    }

    if (order.status >= 1) {
      return { orderNo: businessOrderNo, status: 'TRADE_SUCCESS', paid: true };
    }

    if (this.isMockMode || !this.alipaySdk) {
      return { orderNo: businessOrderNo, status: 'WAIT_BUYER_PAY', paid: false };
    }

    const tradeNo = alipayOutTradeNo?.trim() || businessOrderNo;

    try {
      const result: any = await this.alipaySdk.exec('alipay.trade.query', {
        bizContent: { out_trade_no: tradeNo },
      });

      const tradeStatus =
        result?.tradeStatus ||
        result?.trade_status ||
        result?.alipay_trade_query_response?.trade_status;

      if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
        await this.markOrderPaidInternal(businessOrderNo, 'alipay');
        return { orderNo: businessOrderNo, status: tradeStatus, paid: true };
      }

      return { orderNo: businessOrderNo, status: tradeStatus || 'WAIT_BUYER_PAY', paid: false };
    } catch (error) {
      this.logger.warn(`Query Alipay payment failed: ${tradeNo}`, error);
      return { orderNo: businessOrderNo, status: 'WAIT_BUYER_PAY', paid: false };
    }
  }

  async markOrderPaid(orderNo: string, payMethod: string) {
    await this.markOrderPaidInternal(orderNo, payMethod);
  }

  /** 每次支付生成新商户单号，降低沙箱重复下单导致网关 504 的概率 */
  private buildAlipayOutTradeNo(businessOrderNo: string, attempt: number): string {
    const suffix = `${Date.now().toString(36)}${attempt}`;
    const tradeNo = `${businessOrderNo}T${suffix}`;
    return tradeNo.length > 64 ? tradeNo.slice(0, 64) : tradeNo;
  }

  private async resolveOrderByOutTradeNo(outTradeNo: string) {
    const direct = await this.prisma.order.findUnique({ where: { orderNo: outTradeNo } });
    if (direct) return direct;

    const base = outTradeNo.split('T')[0];
    if (base && base !== outTradeNo) {
      return this.prisma.order.findUnique({ where: { orderNo: base } });
    }
    return null;
  }

  /** 探测 GET 支付链 + 收银台页，避免 App 打开后显示 504 */
  private async probePayGateway(payUrl: string): Promise<{ ok: boolean; reason?: string }> {
    try {
      const res = await fetch(payUrl, {
        redirect: 'manual',
        signal: AbortSignal.timeout(20_000),
      });
      const location = res.headers.get('location') || '';

      if (res.status === 504 || /\/error\b/i.test(location)) {
        return { ok: false, reason: res.status === 504 ? '504' : 'error_redirect' };
      }

      // 沙箱有时返回 http:// 的 error 页
      if (location.startsWith('http://') && location.includes('alipaydev.com/error')) {
        return { ok: false, reason: 'error_redirect' };
      }

      if (location.includes('mobilepay') || location.includes('cashier')) {
        const cashierUrl = location.startsWith('http') ? location : `https:${location.replace(/^\/\//, '')}`;
        const cashierProbe = await this.probeCashierPage(cashierUrl);
        if (!cashierProbe.ok) {
          return cashierProbe;
        }
        return { ok: true };
      }

      if (res.status >= 200 && res.status < 300) {
        return { ok: true };
      }
      if (res.status >= 300 && res.status < 400 && location) {
        return { ok: !location.includes('error') };
      }
      return { ok: false, reason: `http_${res.status}` };
    } catch (error: any) {
      const msg = error?.message || 'network';
      if (/timeout|504/i.test(msg)) {
        return { ok: false, reason: '504' };
      }
      return { ok: false, reason: msg };
    }
  }

  private async probeCashierPage(url: string): Promise<{ ok: boolean; reason?: string }> {
    try {
      const res = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(25_000),
      });
      if (res.status === 504) {
        return { ok: false, reason: 'cashier_504' };
      }
      if (res.status >= 500) {
        return { ok: false, reason: `cashier_${res.status}` };
      }
      return { ok: true };
    } catch (error: any) {
      if (/timeout|504/i.test(error?.message || '')) {
        return { ok: false, reason: 'cashier_504' };
      }
      return { ok: false, reason: 'cashier_network' };
    }
  }

  /** 沙箱 notify_url 必须是支付宝认可的 HTTPS 地址；example.com 会被拒导致 /error */
  private getNotifyUrlCandidates(): string[] {
    const configured = this.configService.get<string>('ALIPAY_NOTIFY_URL', '').trim();
    const isLocal =
      !configured ||
      /localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\./i.test(configured);

    if (!isLocal) {
      return [configured];
    }

    this.logger.warn(
      'ALIPAY_NOTIFY_URL 为本地地址，沙箱下单使用 HTTPS 占位回调（依赖主动查单确认支付）',
    );

    const custom = this.configService.get<string>('ALIPAY_SANDBOX_NOTIFY_URL', '').trim();
    const defaults = [
      'https://www.taobao.com/notify',
      'https://example.com/api/v1/payment/callback',
    ];
    return custom ? [custom, ...defaults.filter((u) => u !== custom)] : defaults;
  }

  private async markOrderPaidInternal(orderNo: string, payMethod: string) {
    await this.orderService.markPaidFromPayment(orderNo, payMethod);
  }

  private formatPemKey(raw: string, type: 'private' | 'public'): string {
    const key = raw.trim().replace(/\\n/g, '\n');
    if (key.includes('BEGIN')) return key;

    const wrapped = key.match(/.{1,64}/g)?.join('\n') ?? key;
    if (type === 'private') {
      const keyType = this.configService.get('ALIPAY_KEY_TYPE', 'PKCS1');
      if (keyType === 'PKCS8') {
        return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
      }
      return `-----BEGIN RSA PRIVATE KEY-----\n${wrapped}\n-----END RSA PRIVATE KEY-----`;
    }
    return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
  }
}
