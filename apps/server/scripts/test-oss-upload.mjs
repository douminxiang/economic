/**
 * 测试向 OSS 上传一个小文件（需 .env 中 OSS 四项已填）
 */
import 'dotenv/config';
import OSS from 'ali-oss';

const region = process.env.OSS_REGION?.trim();
const bucket = process.env.OSS_BUCKET?.trim();
if (!region || !bucket || !process.env.OSS_ACCESS_KEY_ID?.trim()) {
  console.log('❌ .env 中 OSS 配置不完整');
  process.exit(1);
}

const client = new OSS({
  region,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID.trim(),
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET.trim(),
  bucket,
});

const key = `uploads/test-${Date.now()}.txt`;
const body = Buffer.from('economic oss test', 'utf8');

try {
  const result = await client.put(key, body, { headers: { 'Content-Type': 'text/plain' } });
  console.log('✅ OSS 上传成功');
  console.log('   URL:', result.url);
  console.log('   Key:', key);
} catch (e) {
  console.log('❌ OSS 上传失败:', e.code || '', e.message || e);
  if (String(e.message).includes('does not belong')) {
    console.log('\n→ RAM 用户 YouJun 需要权限：AliyunOSSFullAccess');
    console.log('  或在 Bucket 策略里授权该 RAM 用户访问 economic-dev');
  }
  process.exit(1);
}
