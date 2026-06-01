import 'dotenv/config';
import { AlipaySdk } from 'alipay-sdk';

const formatPem = (raw, type) => {
  const key = raw.trim().replace(/\\n/g, '\n');
  if (key.includes('BEGIN')) return key;
  const wrapped = key.match(/.{1,64}/g)?.join('\n') ?? key;
  if (type === 'private') {
    return `-----BEGIN RSA PRIVATE KEY-----\n${wrapped}\n-----END RSA PRIVATE KEY-----`;
  }
  return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
};

const gateway = process.env.ALIPAY_GATEWAY;
const sdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID,
  privateKey: formatPem(process.env.ALIPAY_PRIVATE_KEY, 'private'),
  alipayPublicKey: formatPem(process.env.ALIPAY_PUBLIC_KEY, 'public'),
  keyType: process.env.ALIPAY_KEY_TYPE || 'PKCS1',
  gateway,
  endpoint: gateway.replace(/\/gateway\.do$/, ''),
});

const candidates = [
  process.env.ALIPAY_SANDBOX_NOTIFY_URL || 'https://www.taobao.com/notify',
  'https://example.com/api/v1/payment/callback',
];

for (const notifyUrl of candidates) {
  const payUrl = sdk.pageExecute('alipay.trade.wap.pay', 'GET', {
    notifyUrl,
    returnUrl: 'https://www.taobao.com',
    bizContent: {
      out_trade_no: `test${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      product_code: 'QUICK_WAP_WAY',
      total_amount: '0.01',
      subject: 'test',
    },
  });
  const res = await fetch(payUrl, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  const loc = res.headers.get('location') || '';
  const ok = loc.includes('mobilepay') || loc.includes('cashier');
  console.log(ok ? '✅' : '❌', notifyUrl, res.status, loc.slice(0, 70));
}
