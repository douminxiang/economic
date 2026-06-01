/**
 * Quick WebSocket + order status flow test.
 * Usage: node scripts/test-websocket.mjs
 */
import { io } from 'socket.io-client';

const BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';
const ORIGIN = BASE.replace(/\/api\/v1$/, '');

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13800138000', password: '123456' }),
  });
  const json = await res.json();
  if (!json.data?.accessToken) throw new Error('Login failed: ' + JSON.stringify(json));
  return json.data.accessToken;
}

async function mockPay(token, orderNo) {
  const res = await fetch(`${BASE}/payment/mock-pay/${orderNo}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function createAndPay(token) {
  const addrRes = await fetch(`${BASE}/addresses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const addrJson = await addrRes.json();
  const addressId = addrJson.data?.[0]?.id;
  if (!addressId) throw new Error('No address');

  const shopsRes = await fetch(`${BASE}/shops?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const shopsJson = await shopsRes.json();
  const shopId = shopsJson.data?.items?.[0]?.id;
  if (!shopId) throw new Error('No shop');

  const productsRes = await fetch(`${BASE}/products?shopId=${shopId}&page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const productsJson = await productsRes.json();
  const productId = productsJson.data?.items?.[0]?.id;
  if (!productId) throw new Error('No product');

  await fetch(`${BASE}/cart/items`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity: 1 }),
  });

  const orderRes = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ addressId }),
  });
  const orderJson = await orderRes.json();
  const orderId = orderJson.data?.id;
  const orderNo = orderJson.data?.orderNo;
  if (!orderId) throw new Error('Create order failed');

  await mockPay(token, orderNo);
  return orderId;
}

const token = await login();
console.log('✅ Login OK');

const events = [];
const socket = io(ORIGIN, {
  auth: { token },
  transports: ['websocket', 'polling'],
});

socket.on('order:statusChanged', (data) => {
  events.push({ type: 'status', ...data });
  console.log('📦 statusChanged:', data.status, data.statusText);
});

socket.on('order:riderLocation', (data) => {
  events.push({ type: 'rider', orderId: data.orderId });
  console.log('🛵 riderLocation:', data.latitude?.toFixed(4), data.longitude?.toFixed(4));
});

await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Socket connect timeout')), 8000);
  socket.on('connect', () => {
    clearTimeout(timeout);
    console.log('✅ Socket connected:', socket.id);
    resolve();
  });
  socket.on('connect_error', (err) => {
    clearTimeout(timeout);
    reject(err);
  });
});

const orderId = await createAndPay(token);
console.log('✅ Order created & mock paid, id=', orderId);

socket.emit('trackOrder', { orderId });

await new Promise((r) => setTimeout(r, 12000));

const statuses = events.filter((e) => e.type === 'status').map((e) => e.status);
const hasPreparing = statuses.includes(2);
const hasDelivering = statuses.includes(3);
const hasRider = events.some((e) => e.type === 'rider');

console.log('\n--- Summary ---');
console.log('Status events:', statuses.join(' -> ') || '(none)');
console.log('Preparing (2):', hasPreparing ? '✅' : '❌');
console.log('Delivering (3):', hasDelivering ? '✅' : '❌');
console.log('Rider location:', hasRider ? '✅' : '❌');

socket.disconnect();
process.exit(hasPreparing && hasDelivering && hasRider ? 0 : 1);
