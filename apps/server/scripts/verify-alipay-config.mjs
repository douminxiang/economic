/**
 * 验证支付宝沙箱配置是否完整（不输出密钥内容）
 * 用法: node scripts/verify-alipay-config.mjs
 */
import 'dotenv/config';

const required = ['ALIPAY_APP_ID', 'ALIPAY_PRIVATE_KEY', 'ALIPAY_PUBLIC_KEY', 'ALIPAY_NOTIFY_URL'];
const missing = required.filter((k) => !process.env[k]?.trim());

if (missing.length) {
  console.log('❌ 支付宝未就绪（当前为 Mock 模式）');
  console.log('缺少:', missing.join(', '));
  console.log('\n请按 docs/development-guide.md 第 3 节填写 apps/server/.env');
  process.exit(1);
}

try {
  const { AlipaySdk } = await import('alipay-sdk');

  const formatPem = (raw, type) => {
    const key = raw.trim().replace(/\\n/g, '\n');
    if (key.includes('BEGIN')) return key;
    const wrapped = key.match(/.{1,64}/g)?.join('\n') ?? key;
    if (type === 'private') {
      const keyType = process.env.ALIPAY_KEY_TYPE || 'PKCS1';
      if (keyType === 'PKCS8') {
        return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
      }
      return `-----BEGIN RSA PRIVATE KEY-----\n${wrapped}\n-----END RSA PRIVATE KEY-----`;
    }
    return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
  };

  const gateway =
    process.env.ALIPAY_GATEWAY || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do';

  new AlipaySdk({
    appId: process.env.ALIPAY_APP_ID,
    privateKey: formatPem(process.env.ALIPAY_PRIVATE_KEY, 'private'),
    alipayPublicKey: formatPem(process.env.ALIPAY_PUBLIC_KEY, 'public'),
    keyType: process.env.ALIPAY_KEY_TYPE || 'PKCS1',
    gateway,
    endpoint: gateway.replace(/\/gateway\.do$/, ''),
  });

  console.log('✅ 支付宝 SDK 配置格式正确');
  console.log('   APP_ID:', process.env.ALIPAY_APP_ID);
  console.log('   GATEWAY:', gateway);
  console.log('   KEY_TYPE:', process.env.ALIPAY_KEY_TYPE || 'PKCS1');
  console.log('   NOTIFY_URL:', process.env.ALIPAY_NOTIFY_URL);
} catch (error) {
  console.log('❌ 支付宝 SDK 初始化失败');
  console.log('   ', error.message);
  process.exit(1);
}
