/**
 * Seed embeddings for all active shops.
 * Run: npx ts-node prisma/seed-embeddings.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const EMBEDDING_URL = 'https://api.siliconflow.cn/v1/embeddings';
const EMBEDDING_MODEL = 'BAAI/bge-large-zh-v1.5';

const dbUrl = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/economic';
const url = new URL(dbUrl);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.replace('/', ''),
});
const prisma = new PrismaClient({ adapter });

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const response = await fetch(EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float',
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error: ${response.status} ${err}`);
  }
  const data = await response.json();
  return data.data[0].embedding;
}

async function main() {
  const shops = await prisma.shop.findMany({
    where: { status: 1 },
    include: { category: true },
  });

  console.log(`Found ${shops.length} active shops. Generating embeddings...`);

  let count = 0;
  for (const shop of shops) {
    const textToEmbed = [
      shop.name,
      shop.description || '',
      shop.address,
      shop.category?.name || '',
    ].join(' ');

    try {
      const embedding = await generateEmbedding(textToEmbed);
      await prisma.shop.update({
        where: { id: shop.id },
        data: { embedding: JSON.stringify(embedding) },
      });
      count++;
      console.log(`[${count}/${shops.length}] Embedded: ${shop.name}`);
    } catch (err) {
      console.error(`Failed to embed shop ${shop.name}:`, err);
    }

    // Rate limit: small delay between requests
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`Done. Embedded ${count}/${shops.length} shops.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
