async function test() {
  const login = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13800138000', password: '123456' }),
  });
  const lj = await login.json();
  const token = lj.data?.accessToken;
  if (!token) throw new Error('login failed');

  const track = await fetch('http://localhost:3000/api/v1/events/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      eventType: 'page_view',
      eventName: 'Test/TimezoneFix',
      properties: { screen: 'TimezoneFix' },
      platform: 'android',
      appVersion: '1.0.0',
      deviceId: 'tz-test',
    }),
  });
  const body = await track.json();
  console.log('track response', JSON.stringify(body));

  const mysql = await import('mysql2/promise');
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  await c.query("SET time_zone = '+08:00'");
  const [rows] = await c.query(
    'SELECT id, eventName, DATE_FORMAT(createdAt, "%Y-%m-%d %H:%i:%s") as fmt FROM track_events ORDER BY id DESC LIMIT 1',
  );
  const [now] = await c.query('SELECT DATE_FORMAT(NOW(3), "%Y-%m-%d %H:%i:%s") as fmt');
  console.log('latest event', rows[0]);
  console.log('mysql NOW', now[0]);
  await c.end();
}

test().catch((e) => {
  console.error(e);
  process.exit(1);
});
