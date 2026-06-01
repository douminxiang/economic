async function test() {
  const login = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13800138000', password: '123456' }),
  });
  const lj = await login.json();
  const token = lj.data?.accessToken;
  if (!token) {
    console.log('login failed', lj);
    process.exit(1);
  }

  const ai = await fetch('http://localhost:3000/api/v1/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message: '2026年杭州热门餐厅', webSearch: true }),
  });

  const text = await ai.text();
  console.log('status', ai.status);
  console.log('has search', text.includes('"type":"search"'));
  console.log('has chunk', text.includes('"type":"chunk"'));
  console.log('has done', text.includes('"done":true'));
}

test().catch((err) => {
  console.error(err);
  process.exit(1);
});
