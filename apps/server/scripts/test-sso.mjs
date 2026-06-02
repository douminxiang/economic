/**
 * 单点登录（SSO_SINGLE_SESSION）模拟测试
 * 流程：设备 A 登录 → 设备 B 同号登录 → 验证 A 被踢、B 可用
 */
import 'dotenv/config';

const BASE = process.env.API_BASE || 'http://127.0.0.1:3000/api/v1';
const PHONE = process.env.SSO_TEST_PHONE || '13900009999';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function unwrap(res) {
  return res.json?.data ?? res.json;
}

function assert(cond, msg) {
  if (!cond) throw new Error(`❌ ${msg}`);
  console.log(`✅ ${msg}`);
}

async function smsLogin(phone, code, deviceId, deviceName) {
  const res = await request('/auth/sms-login', {
    method: 'POST',
    body: JSON.stringify({ phone, code, deviceId, deviceName }),
  });
  assert(res.status === 200 || res.status === 201, `登录 HTTP ${res.status}`);
  const data = unwrap(res);
  assert(data?.accessToken, '返回 accessToken');
  assert(data?.refreshToken, '返回 refreshToken');
  assert(data?.sessionId, '返回 sessionId');
  return data;
}

async function getSessions(accessToken) {
  return request('/auth/sessions', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function refreshToken(refresh) {
  return request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refresh }),
  });
}

async function main() {
  console.log('=== SSO 单点登录模拟测试 ===');
  console.log(`API: ${BASE}`);
  console.log(`手机号: ${PHONE}\n`);

  const sendRes = await request('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ phone: PHONE }),
  });
  assert(sendRes.status === 200 || sendRes.status === 201, `发送验证码 HTTP ${sendRes.status}`);
  const sendData = unwrap(sendRes);
  const code = sendData?.code;
  assert(code, '开发模式应返回验证码（SMS mock）');
  console.log(`   验证码: ${code}\n`);

  console.log('1) 设备 A 登录…');
  const deviceA = await smsLogin(PHONE, code, 'sso-test-device-a', '模拟器 A');
  const sidA = deviceA.sessionId;
  console.log(`   sessionId(A): ${sidA}\n`);

  const sessionsA1 = await getSessions(deviceA.accessToken);
  assert(sessionsA1.status === 200, '设备 A 可访问 sessions');
  const listA1 = unwrap(sessionsA1) || [];
  assert(Array.isArray(listA1) && listA1.length === 1, `单会话模式仅 1 条活跃会话 (实际 ${listA1.length})`);

  console.log('2) 设备 B 同号登录（应踢掉 A）…');
  const sendRes2 = await request('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ phone: PHONE }),
  });
  const code2 = unwrap(sendRes2)?.code;
  assert(code2, '第二次获取验证码');
  const deviceB = await smsLogin(PHONE, code2, 'sso-test-device-b', '模拟器 B');
  const sidB = deviceB.sessionId;
  console.log(`   sessionId(B): ${sidB}\n`);
  assert(sidA !== sidB, 'B 获得新 sessionId');

  console.log('3) 设备 A accessToken 应失效…');
  const sessionsA2 = await getSessions(deviceA.accessToken);
  assert(sessionsA2.status === 401, `设备 A accessToken 应 401 (实际 ${sessionsA2.status})`);

  console.log('4) 设备 A refreshToken 应失效…');
  const refreshA = await refreshToken(deviceA.refreshToken);
  assert(refreshA.status === 401, `设备 A refresh 应 401 (实际 ${refreshA.status})`);

  console.log('5) 设备 B 仍可用…');
  const sessionsB = await getSessions(deviceB.accessToken);
  assert(sessionsB.status === 200, '设备 B 可访问 sessions');
  const listB = unwrap(sessionsB) || [];
  assert(listB.length === 1, `仅 B 的会话活跃 (实际 ${listB.length})`);
  assert(listB[0]?.isCurrent === true, '当前会话标记正确');
  assert(listB[0]?.deviceId === 'sso-test-device-b', '会话设备为 B');

  const refreshB = await refreshToken(deviceB.refreshToken);
  assert(refreshB.status === 200, '设备 B refresh 成功');
  assert(unwrap(refreshB)?.accessToken, 'B 获得新 accessToken');

  console.log('\n=== 全部通过：单点登录工作正常 ===');
}

main().catch((e) => {
  console.error('\n' + e.message);
  process.exit(1);
});
