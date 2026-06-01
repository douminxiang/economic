/**
 * 验证 OSS 配置（不输出密钥内容，可选探测 Bucket）
 * 用法: node scripts/verify-oss-config.mjs
 */
import 'dotenv/config';
import OSS from 'ali-oss';

const required = ['OSS_REGION', 'OSS_BUCKET', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'];
const missing = required.filter((k) => !process.env[k]?.trim());

if (missing.length) {
  console.log('❌ OSS 未就绪（当前为本地 uploads/ Mock）');
  console.log('缺少:', missing.join(', '));
  console.log('\n请在 apps/server/.env 填写 OSS_REGION、OSS_BUCKET、OSS_ACCESS_KEY_ID、OSS_ACCESS_KEY_SECRET');
  process.exit(1);
}

const region = process.env.OSS_REGION.trim();
const bucket = process.env.OSS_BUCKET.trim();
const endpoint = process.env.OSS_ENDPOINT?.trim();

try {
  const client = new OSS({
    region,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID.trim(),
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET.trim(),
    bucket,
    ...(endpoint ? { endpoint } : {}),
  });

  await client.getBucketInfo(bucket);

  console.log('✅ OSS 配置有效，Bucket 可访问');
  console.log('   REGION:', region);
  console.log('   BUCKET:', bucket);
  if (process.env.OSS_PUBLIC_BASE_URL?.trim()) {
    console.log('   PUBLIC_BASE_URL:', process.env.OSS_PUBLIC_BASE_URL.trim());
  } else {
    console.log('   PUBLIC_BASE_URL: (未设，使用 OSS 默认域名)');
  }
  console.log('\n重启后端后访问 GET /api/v1/upload/mode 应返回 mockMode: false');
} catch (error) {
  console.log('❌ OSS 连接失败');
  console.log('   ', error.message || error);
  console.log('\n常见原因: Region 与 Bucket 地域不一致、AK 无权限、Bucket 名称错误');
  process.exit(1);
}
