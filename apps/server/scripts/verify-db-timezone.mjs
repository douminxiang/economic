import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/economic';
const url = new URL(dbUrl);
const tz = process.env.DB_TIMEZONE || '+08:00';

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.replace('/', ''),
  initSql: `SET time_zone = '${tz}'`,
  timezone: tz,
});

const prisma = new PrismaClient({ adapter });
await prisma.$connect();
const rows = await prisma.$queryRawUnsafe(
  'SELECT NOW() as now_time, @@session.time_zone as tz',
);
console.log('session tz:', rows[0]?.tz);
console.log('NOW():', rows[0]?.now_time);
console.log('node local:', new Date().toString());
await prisma.$disconnect();
