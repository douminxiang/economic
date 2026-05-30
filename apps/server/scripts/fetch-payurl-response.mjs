import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { AlipaySdk } from 'alipay-sdk';

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'economic',
  }),
});

const formatPem = (raw, type) => {
  const key = raw.trim().replace(/\\n/g, '\n');
  if (key.includes('BEGIN')) return key;
  const wrapped = key.match(/.{1,64}/g)?.join('\n') ?? key;
  if (type === 'private') {
    return `-----BEGIN RSA PRIVATE KEY-----\n${wrapped}\n-----END RSA PRIVATE KEY-----`;
  }
  return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
};

const order = await prisma.order.findFirst({ where: { status: 0 }, orderBy: { id: 'desc' } });
const gateway = process.env.ALIPAY_GATEWAY;
const sdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID,
  privateKey: formatPem(process.env.ALIPAY_PRIVATE_KEY, 'private'),
  alipayPublicKey: formatPem(process.env.ALIPAY_PUBLIC_KEY, 'public'),
  keyType: process.env.ALIPAY_KEY_TYPE || 'PKCS1',
  gateway,
  endpoint: gateway.replace(/\/gateway\.do$/, ''),
});

const payUrl = sdk.pageExecute('alipay.trade.wap.pay', 'GET', {
  notifyUrl: process.env.ALIPAY_NOTIFY_URL,
  returnUrl: 'https://www.taobao.com',
  bizContent: {
    out_trade_no: order.orderNo,
    product_code: 'QUICK_WAP_WAY',
    total_amount: Number(order.payAmount).toFixed(2),
    subject: 'test',
  },
});

const res = await fetch(payUrl, { redirect: 'manual' });
console.log('HTTP', res.status);
const loc = res.headers.get('location');
if (loc) console.log('REDIRECT', loc.slice(0, 200));

if (loc) {
  const errRes = await fetch(loc.startsWith('http') ? loc : `https:${loc}`);
  const errHtml = await errRes.text();
  console.log('ERR_PAGE_LEN', errHtml.length);
  const title = errHtml.match(/<title[^>]*>([^<]*)</i)?.[1];
  const msg = errHtml.match(/error[^<]{0,20}|sub_msg|msg["':][^"']{0,80}/gi);
  console.log('ERR_TITLE', title);
  console.log('ERR_SNIPPET', errHtml.slice(0, 800).replace(/\s+/g, ' '));
}

const res2 = await fetch(payUrl, { redirect: 'follow' });
console.log('FOLLOW_FINAL', res2.url.slice(0, 120));
console.log('FOLLOW_STATUS', res2.status);
const html2 = await res2.text();
console.log('FOLLOW_LEN', html2.length);
console.log('FOLLOW_START', html2.slice(0, 400).replace(/\s+/g, ' '));

await prisma.$disconnect();
