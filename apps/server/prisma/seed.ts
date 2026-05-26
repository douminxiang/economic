import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaMariaDb({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'root',
  database: 'economic',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // 清理数据
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  // 创建测试用户
  const hashedPassword = await bcrypt.hash('123456', 10);
  const user = await prisma.user.create({
    data: {
      phone: '13800138000',
      password: hashedPassword,
      nickname: '测试用户',
      gender: 1,
    },
  });

  // 创建测试地址
  await prisma.address.create({
    data: {
      userId: user.id,
      name: '张三',
      phone: '13800138000',
      province: '北京市',
      city: '北京市',
      district: '朝阳区',
      detail: '三里屯太古里北区',
      latitude: 39.9335,
      longitude: 116.4546,
      isDefault: true,
    },
  });

  console.log('Seed data created:', { userId: user.id });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
