import 'dotenv/config';
import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/economic';
const c = await mysql.createConnection(dbUrl);
await c.query("SET time_zone = '+08:00'");
const [now] = await c.query(
  "SELECT NOW(3) as n, DATE_FORMAT(NOW(3), '%Y-%m-%d %H:%i:%s') as fmt, @@session.time_zone as tz",
);
const [rows] = await c.query('SELECT id, createdAt, DATE_FORMAT(createdAt, "%Y-%m-%d %H:%i:%s") as fmt FROM track_events ORDER BY id DESC LIMIT 5');
console.log('NOW()', now[0]);
console.log('latest rows', rows);
await c.end();
