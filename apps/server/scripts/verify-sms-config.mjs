/**
 * 验证短信配置（不发送短信、不输出密钥）
 * 用法: node scripts/verify-sms-config.mjs
 */
import 'dotenv/config';
import Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';

const required = [
  'SMS_ACCESS_KEY_ID',
  'SMS_ACCESS_KEY_SECRET',
  'SMS_SIGN_NAME',
  'SMS_TEMPLATE_CODE',
];
const missing = required.filter((k) => !process.env[k]?.trim());

if (missing.length) {
  console.log('❌ 短信未就绪（当前为 Mock，验证码在后端控制台）');
  console.log('缺少:', missing.join(', '));
  console.log('\n请在 apps/server/.env 填写 SMS_* 四项');
  process.exit(1);
}

try {
  const config = new $OpenApi.Config({
    accessKeyId: process.env.SMS_ACCESS_KEY_ID.trim(),
    accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET.trim(),
  });
  config.endpoint = 'dysmsapi.aliyuncs.com';
  new Dysmsapi20170525(config);

  console.log('✅ 短信 SDK 初始化成功');
  console.log('   SIGN_NAME:', process.env.SMS_SIGN_NAME.trim());
  console.log('   TEMPLATE_CODE:', process.env.SMS_TEMPLATE_CODE.trim());
  console.log('\n模板变量须为 ${code}，与代码 templateParam: {"code":"123456"} 一致');
  console.log('重启后端后，App 验证码登录 → 发码应收到真实短信');
  console.log('（本脚本不发送测试短信，避免扣费）');
} catch (error) {
  console.log('❌ 短信 SDK 初始化失败');
  console.log('   ', error.message || error);
  process.exit(1);
}
