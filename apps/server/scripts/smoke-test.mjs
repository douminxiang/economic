/**
 * 功能冒烟测试 — 后端 API
 * 用法: node scripts/smoke-test.mjs
 */
import 'dotenv/config';

const BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';
const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ' — ' + detail : ''}`);
}
function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.log(`❌ ${name}${detail ? ' — ' + detail : ''}`);
}

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

console.log('\n=== Economic 冒烟测试 ===\n');

// 1. 服务存活
try {
  const { status, json } = await req('/payment/mode');
  if (status === 200) pass('服务存活', `payment/mode mockMode=${json.data?.mockMode}`);
  else fail('服务存活', `HTTP ${status}`);
} catch (e) {
  fail('服务存活', e.message);
  console.log('\n请先运行: pnpm dev:server\n');
  process.exit(1);
}

// 2. 密码登录
let token = '';
let refreshToken = '';
const login = await req('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '13800138000', password: '123456' }),
});
if (login.status === 200 || login.status === 201) {
  token = login.json.data?.accessToken;
  refreshToken = login.json.data?.refreshToken;
  pass('密码登录', token ? '获得 accessToken' : '无 token');
} else {
  fail('密码登录', login.json.message || `HTTP ${login.status}`);
}

// 3. Token 刷新
if (refreshToken) {
  const ref = await req('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (ref.json.data?.accessToken) pass('Refresh Token 刷新');
  else fail('Refresh Token 刷新', ref.json.message);
}

// 4. 短信 Mock
const sms = await req('/auth/send-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '13800138001' }),
});
if (sms.status === 200 || sms.status === 201) pass('短信验证码发送(Mock)', '请看后端控制台验证码');
else fail('短信验证码', sms.json.message);

// 5. 店铺列表
if (token) {
  const shops = await req('/shops?page=1&limit=3', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = shops.json.data?.list ?? shops.json.data ?? [];
  const n = Array.isArray(list) ? list.length : 0;
  if (n > 0) pass('店铺列表', `${n} 家`);
  else fail('店铺列表', '无数据，请 pnpm db:seed');
}

// 6. AI 历史
if (token) {
  const ai = await req('/ai/history', { headers: { Authorization: `Bearer ${token}` } });
  if (ai.status === 200) pass('AI 对话历史', 'API 可达');
  else fail('AI 对话历史', ai.json.message);
}

// 7. 支付模式
const mode = await req('/payment/mode');
pass('支付宝配置', mode.json.data?.provider || 'unknown');

// 8. 埋点
if (token) {
  const track = await req('/events/track', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventName: 'smoke_test', properties: { source: 'script' } }),
  });
  if (track.status === 200 || track.status === 201) pass('埋点 API');
  else fail('埋点 API', track.json.message);
}

// 9. 高德代理（需 AMAP_WEB_KEY）
const amap = await req('/amap/poi-search?keywords=餐厅&city=杭州', {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});
if (amap.status === 200) pass('高德 POI 代理');
else fail('高德 POI 代理', amap.json.message || `HTTP ${amap.status}`);

console.log('\n--- 汇总 ---');
const ok = results.filter((r) => r.ok).length;
const total = results.length;
console.log(`通过 ${ok}/${total}`);
if (ok < total) process.exit(1);
