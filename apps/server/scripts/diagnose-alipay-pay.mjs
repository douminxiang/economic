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

function getNotifyUrl() {
  const configured = (process.env.ALIPAY_NOTIFY_URL || '').trim();
  const isLocal =
    !configured || /localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\./i.test(configured);
  return isLocal ? 'https://example.com/api/v1/payment/callback' : configured;
}

const gateway = process.env.ALIPAY_GATEWAY;
const sdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID,
  privateKey: formatPem(process.env.ALIPAY_PRIVATE_KEY, 'private'),
  alipayPublicKey: formatPem(process.env.ALIPAY_PUBLIC_KEY, 'public'),
  keyType: process.env.ALIPAY_KEY_TYPE || 'PKCS1',
  gateway,
  endpoint: gateway.replace(/\/gateway\.do$/, ''),
});

const notifyUrl = getNotifyUrl();
const outTradeNo = `diag-${Date.now()}`;

const params = {
  notifyUrl,
  returnUrl: 'https://www.taobao.com',
  bizContent: {
    out_trade_no: outTradeNo,
    product_code: 'QUICK_WAP_WAY',
    total_amount: '0.01',
    subject: 'diagnose',
  },
};

const payUrl = sdk.pageExecute('alipay.trade.wap.pay', 'GET', params);
const payForm = sdk.pageExecute('alipay.trade.wap.pay', 'POST', params);

console.log('NOTIFY', notifyUrl);
console.log('OUT_TRADE_NO', outTradeNo);
console.log('POST_FORM_LEN', typeof payForm === 'string' ? payForm.length : 0);
console.log('POST_HAS_FORM', typeof payForm === 'string' && payForm.includes('<form'));

try {
  const res = await fetch(payUrl, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  console.log('STATUS', res.status);
  const loc = res.headers.get('location') || '';
  console.log('LOCATION', loc.slice(0, 250));
  if (loc.includes('error')) {
    console.log('RESULT', 'ALIPAY_ERROR_REDIRECT');
  } else if (loc) {
    console.log('RESULT', 'OK_REDIRECT_TO_PAY_PAGE');
  }
} catch (e) {
  console.log('FETCH_ERROR', e.message);
}

try {
  const q = await sdk.exec('alipay.trade.query', {
    bizContent: { out_trade_no: outTradeNo },
  });
  console.log('QUERY_OK', JSON.stringify(q).slice(0, 300));
} catch (e) {
  console.log('QUERY_ERR', e.message);
  if (e.responseData) console.log('QUERY_RESP', JSON.stringify(e.responseData).slice(0, 500));
}

await prisma.$disconnect();
