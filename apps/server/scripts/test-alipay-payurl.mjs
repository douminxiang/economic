import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { AlipaySdk } from 'alipay-sdk';

const adapter = new PrismaMariaDb({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'root',
  database: 'economic',
});
const prisma = new PrismaClient({ adapter });

const formatPem = (raw, type) => {
  const key = raw.trim().replace(/\\n/g, '\n');
  if (key.includes('BEGIN')) return key;
  const wrapped = key.match(/.{1,64}/g)?.join('\n') ?? key;
  if (type === 'private') {
    return `-----BEGIN RSA PRIVATE KEY-----\n${wrapped}\n-----END RSA PRIVATE KEY-----`;
  }
  return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
};

const order = await prisma.order.findFirst({
  where: { status: 0 },
  orderBy: { id: 'desc' },
});

if (!order) {
  console.log('NO_PENDING_ORDER');
  await prisma.$disconnect();
  process.exit(0);
}

const gateway =
  process.env.ALIPAY_GATEWAY || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do';
const sdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID,
  privateKey: formatPem(process.env.ALIPAY_PRIVATE_KEY, 'private'),
  alipayPublicKey: formatPem(process.env.ALIPAY_PUBLIC_KEY, 'public'),
  keyType: process.env.ALIPAY_KEY_TYPE || 'PKCS1',
  gateway,
  endpoint: gateway.replace(/\/gateway\.do$/, ''),
});

try {
  const payUrl = sdk.pageExecute('alipay.trade.wap.pay', 'GET', {
    notifyUrl: process.env.ALIPAY_NOTIFY_URL,
    returnUrl: process.env.ALIPAY_RETURN_URL,
    bizContent: {
      out_trade_no: order.orderNo,
      product_code: 'QUICK_WAP_WAY',
      total_amount: Number(order.payAmount).toFixed(2),
      subject: 'test',
    },
  });
  console.log('ORDER_NO', order.orderNo);
  console.log('PAY_URL_LEN', payUrl.length);
  console.log('IS_HTTP', payUrl.startsWith('http'));
  console.log('PAY_URL_PREFIX', payUrl.slice(0, 100));
} catch (e) {
  console.log('ERROR', e.message);
  if (e.responseData) console.log('RESPONSE', JSON.stringify(e.responseData).slice(0, 500));
}

await prisma.$disconnect();
