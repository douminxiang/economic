import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Dysmsapi20170525, { SendSmsRequest } from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  readonly isMockMode: boolean;
  private readonly client: Dysmsapi20170525 | null = null;
  private readonly signName: string;
  private readonly templateCode: string;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('SMS_ACCESS_KEY_ID', '').trim();
    const accessKeySecret = this.configService.get<string>('SMS_ACCESS_KEY_SECRET', '').trim();
    this.signName = this.configService.get<string>('SMS_SIGN_NAME', '').trim();
    this.templateCode = this.configService.get<string>('SMS_TEMPLATE_CODE', '').trim();

    this.isMockMode =
      !accessKeyId || !accessKeySecret || !this.signName || !this.templateCode;

    if (!this.isMockMode) {
      const config = new $OpenApi.Config({
        accessKeyId,
        accessKeySecret,
      });
      config.endpoint = 'dysmsapi.aliyuncs.com';
      this.client = new Dysmsapi20170525(config);
      this.logger.log('Aliyun SMS initialized');
    } else {
      this.logger.log('SMS mock mode (configure SMS_* in .env to enable real SMS)');
    }
  }

  async sendVerificationCode(phone: string, code: string): Promise<void> {
    if (this.isMockMode) {
      this.logger.warn(`📱 [SMS MOCK] 验证码 ${phone}: ${code}`);
      return;
    }

    try {
      const request = new SendSmsRequest({
        phoneNumbers: phone,
        signName: this.signName,
        templateCode: this.templateCode,
        templateParam: JSON.stringify({ code }),
      });
      const response = await this.client!.sendSms(request);
      const body = response.body;

      if (body?.code !== 'OK') {
        this.logger.error(`SMS API error: ${body?.code} ${body?.message}`);
        throw new InternalServerErrorException(body?.message || '短信发送失败');
      }

      this.logger.log(`SMS sent to ${phone}, BizId=${body.bizId ?? 'n/a'}`);
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error('SMS send failed', error);
      throw new InternalServerErrorException('短信服务暂时不可用');
    }
  }
}
