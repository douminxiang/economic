import 'dotenv/config';
import { AlipaySdk } from 'alipay-sdk';

const formatPem = (raw, type) => {
  const key = raw.trim().replace(/\\n/g, '\n');
  if (key.includes('BEGIN')) return key;
  const wrapped = key.match(/.{1,64}/g)?.join('\n') ?? key;
  if (type === 'private') {
    const kt = process.env.ALIPAY_KEY_TYPE || 'PKCS1';
    if (kt === 'PKCS8') return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
    return `-----BEGIN RSA PRIVATE KEY-----\n${wrapped}\n-----END RSA PRIVATE KEY-----`;
  }
  return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
};

const gateway = process.env.ALIPAY_GATEWAY || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do';
const sdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID,
  privateKey: formatPem(process.env.ALIPAY_PRIVATE_KEY, 'private'),
  alipayPublicKey: formatPem(process.env.ALIPAY_PUBLIC_KEY, 'public'),
  keyType: process.env.ALIPAY_KEY_TYPE || 'PKCS1',
  gateway,
  endpoint: gateway.replace(/\/gateway\.do$/, ''),
});

const outTradeNo = `diag${Date.now()}`;
const notifyCandidates = [
  'https://example.com/api/v1/payment/callback',
  'https://www.baidu.com/notify',
  'https://www.taobao.com/notify',
  'https://openapi.alipay.com/gateway.do',
];

for (const notifyUrl of notifyCandidates) {
  const payUrl = sdk.pageExecute('alipay.trade.wap.pay', 'GET', {
    notifyUrl,
    returnUrl: 'https://www.taobao.com',
    bizContent: {
      out_trade_no: outTradeNo + notifyUrl.length,
      product_code: 'QUICK_WAP_WAY',
      total_amount: '0.01',
      subject: 'test',
    },
  });

  const res = await fetch(payUrl, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  const loc = res.headers.get('location') || '';
  console.log('notify', notifyUrl.slice(0, 40), 'status', res.status, 'loc', loc.slice(0, 80));
}

// Try exec API for structured error
try {
  const result = await sdk.exec('alipay.trade.wap.pay', {
    notifyUrl: 'https://example.com/api/v1/payment/callback',
    returnUrl: 'https://www.taobao.com',
    bizContent: {
      out_trade_no: outTradeNo + 'exec',
      product_code: 'QUICK_WAP_WAY',
      total_amount: '0.01',
      subject: 'test',
    },
  });
  console.log('EXEC_OK', JSON.stringify(result).slice(0, 300));
} catch (e) {
  console.log('EXEC_ERR', e.message);
  if (e.responseData) console.log('EXEC_RESP', JSON.stringify(e.responseData).slice(0, 500));
}

// Verify sign with check on gateway - try alipay.trade.precreate (face to face) as capability test
try {
  const pre = await sdk.exec('alipay.trade.precreate', {
    bizContent: {
      out_trade_no: outTradeNo + 'pre',
      total_amount: '0.01',
      subject: 'capability test',
    },
  });
  console.log('PRECREATE_OK', JSON.stringify(pre).slice(0, 200));
} catch (e) {
  console.log('PRECREATE_ERR', e.message);
  if (e.responseData) console.log('PRE_RESP', JSON.stringify(e.responseData).slice(0, 500));
}
