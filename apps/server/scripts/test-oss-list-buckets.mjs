/**
 * 用当前 .env 的 AK 列出可访问的 Bucket（不输出密钥）
 */
import 'dotenv/config';
import OSS from 'ali-oss';

const client = new OSS({
  region: process.env.OSS_REGION?.trim() || 'oss-cn-beijing',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID.trim(),
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET.trim(),
});

try {
  const result = await client.listBuckets();
  const buckets = result.buckets || [];
  if (!buckets.length) {
    console.log('当前 AK 下看不到任何 Bucket（可能无 List 权限或账号下无 Bucket）');
    process.exit(1);
  }
  console.log('当前 AK 可访问的 Bucket：');
  for (const b of buckets) {
    console.log(`  - ${b.name}  地域: ${b.region || b.location}`);
  }
  const target = process.env.OSS_BUCKET?.trim();
  if (target) {
    const hit = buckets.find((b) => b.name === target);
    console.log(
      hit
        ? `\n✅ .env 中 OSS_BUCKET="${target}" 在此 AK 可见`
        : `\n❌ .env 中 OSS_BUCKET="${target}" 不在上述列表中，请改名称或换 AK`,
    );
  }
} catch (e) {
  console.log('❌ 列出 Bucket 失败:', e.message || e);
  console.log('请给 RAM 用户 YouJun 添加 AliyunOSSFullAccess 或对应 Bucket 权限');
  process.exit(1);
}
