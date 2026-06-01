/**
 * 支付宝 / 支付链路冒烟测试
 * 用法: node scripts/test-payment-flow.mjs
 */
import 'dotenv/config';

const BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';

async function main() {
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13800138000', password: '123456' }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.accessToken;
  if (!token) {
    console.log('FAIL login', loginJson.message || loginJson);
    process.exit(1);
  }

  const modeRes = await fetch(`${BASE}/payment/mode`);
  const mode = (await modeRes.json()).data;
  console.log('MODE', JSON.stringify(mode));

  const ordersRes = await fetch(`${BASE}/orders?status=0&limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const ordersJson = await ordersRes.json();
  const list = ordersJson.data?.list ?? ordersJson.data ?? [];
  const order = Array.isArray(list) ? list[0] : null;

  if (!order) {
    console.log('SKIP no pending order — create one in app first');
    process.exit(0);
  }

  const payRes = await fetch(`${BASE}/orders/${order.id}/pay`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ payMethod: 'alipay' }),
  });
  const payJson = await payRes.json();
  console.log('PAY_HTTP', payRes.status);
  if (payRes.status >= 400) {
    console.log('FAIL pay', payJson.message);
    process.exit(1);
  }
  const d = payJson.data ?? payJson;
  console.log('PAY mockMode=', d.mockMode, 'payUrlLen=', d.payUrl?.length ?? 0, 'outTrade=', d.alipayOutTradeNo);

  const mockRes = await fetch(`${BASE}/payment/mock-pay/${order.orderNo}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const mockJson = await mockRes.json();
  const mockOk = mockJson.data?.success ?? mockJson.success;
  console.log('MOCK_PAY', mockOk);

  const syncRes = await fetch(`${BASE}/payment/sync/${order.orderNo}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ alipayOutTradeNo: d.alipayOutTradeNo }),
  });
  const syncJson = await syncRes.json();
  console.log('SYNC_PAID', (syncJson.data ?? syncJson).paid);
  console.log('OK payment flow smoke test passed');
}

main().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
