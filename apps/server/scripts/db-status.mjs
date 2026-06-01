import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'economic',
  }),
});

const users = await prisma.user.count();
const shops = await prisma.shop.count();
const allShops = await prisma.shop.findMany({ select: { embedding: true } });
const withEmb = allShops.filter((s) => s.embedding != null).length;
const orders = await prisma.order.count();
const aiConv = await prisma.aIConversation.count();
const track = await prisma.trackEvent.count();
const cats = await prisma.category.count();
const products = await prisma.product.count();

console.log(
  JSON.stringify(
    { users, shops, shopsWithEmbedding: withEmb, products, orders, aiConversations: aiConv, trackEvents: track, categories: cats },
    null,
    2,
  ),
);

await prisma.$disconnect();
