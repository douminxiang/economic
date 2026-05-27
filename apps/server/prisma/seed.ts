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

const categories = [
  { name: '美食', icon: '🍜', sortOrder: 1 },
  { name: '饮品', icon: '🧋', sortOrder: 2 },
  { name: '超市', icon: '🛒', sortOrder: 3 },
  { name: '生鲜', icon: '🥬', sortOrder: 4 },
  { name: '甜点', icon: '🍰', sortOrder: 5 },
  { name: '快餐', icon: '🍔', sortOrder: 6 },
  { name: '火锅', icon: '🍲', sortOrder: 7 },
  { name: '面食', icon: '🍝', sortOrder: 8 },
  { name: '小吃', icon: '🍢', sortOrder: 9 },
  { name: '水果', icon: '🍎', sortOrder: 10 },
];

const shopNames: Record<string, string[]> = {
  '美食': ['湘菜馆·辣椒炒肉', '川味坊·水煮鱼', '粤式茶餐厅', '东北饺子馆', '西北羊肉馆', '云南过桥米线', '湖北热干面', '江浙菜馆'],
  '饮品': ['一点点奶茶', '喜茶', '瑞幸咖啡', '蜜雪冰城', '茶百道', '古茗', 'COCO都可', '星巴克'],
  '超市': ['盒马鲜生', '永辉超市', '叮咚买菜', '美团买菜', '朴朴超市'],
  '生鲜': ['每日鲜语', '鲜丰水果', '百果园', '果琳', '果蔬好'],
  '甜点': ['好利来', '鲍师傅', '奈雪烘焙', '85度C', '面包新语'],
  '快餐': ['麦当劳', '肯德基', '汉堡王', '赛百味', '德克士'],
  '火锅': ['海底捞', '呷哺呷哺', '小龙坎', '蜀大侠', '谭鸭血'],
  '面食': ['兰州拉面', '山西刀削面', '重庆小面', '武汉热干面', '陕西油泼面'],
  '小吃': ['绝味鸭脖', '周黑鸭', '正新鸡排', '沈大成', '南翔小笼'],
  '水果': ['鲜丰水果', '百果园', '果琳', '每日鲜语', '果蔬好'],
};

const productTemplates: Record<string, { name: string; price: number }[]> = {
  '美食': [
    { name: '辣椒炒肉', price: 28 }, { name: '农家小炒肉', price: 32 },
    { name: '水煮鱼', price: 48 }, { name: '宫保鸡丁', price: 26 },
    { name: '红烧排骨', price: 38 }, { name: '清炒时蔬', price: 16 },
    { name: '酸辣土豆丝', price: 12 }, { name: '番茄蛋汤', price: 10 },
    { name: '米饭', price: 2 }, { name: '蛋炒饭', price: 15 },
    { name: '回锅肉', price: 30 }, { name: '麻婆豆腐', price: 18 },
    { name: '糖醋里脊', price: 32 }, { name: '干锅花菜', price: 22 },
    { name: '鱼香肉丝', price: 26 }, { name: '水煮牛肉', price: 45 },
    { name: '酸菜鱼', price: 42 }, { name: '红烧肉', price: 35 },
    { name: '干煸四季豆', price: 18 }, { name: '蒜蓉西兰花', price: 14 },
    { name: '东坡肉', price: 42 }, { name: '铁板牛柳', price: 38 },
    { name: '三杯鸡', price: 32 }, { name: '梅菜扣肉', price: 36 },
  ],
  '饮品': [
    { name: '珍珠奶茶', price: 12 }, { name: '芋泥啵啵', price: 15 },
    { name: '杨枝甘露', price: 18 }, { name: '柠檬茶', price: 10 },
    { name: '美式咖啡', price: 13 }, { name: '拿铁', price: 16 },
    { name: '抹茶拿铁', price: 18 }, { name: '椰椰拿铁', price: 16 },
    { name: '生椰拿铁', price: 15 }, { name: '葡萄果茶', price: 14 },
    { name: '多肉葡萄', price: 17 }, { name: '冰美式', price: 11 },
    { name: '奶盖茶', price: 16 }, { name: '水果茶', price: 14 },
    { name: '冰红茶', price: 8 }, { name: '蜜桃乌龙', price: 13 },
    { name: '百香果茶', price: 12 }, { name: '红豆奶茶', price: 14 },
    { name: '焦糖玛奇朵', price: 22 }, { name: '卡布奇诺', price: 18 },
  ],
  '超市': [
    { name: '新鲜蔬菜套餐', price: 25 }, { name: '水果拼盘', price: 30 },
    { name: '鸡蛋10枚', price: 12 }, { name: '牛奶1L', price: 8 },
    { name: '面包吐司', price: 10 }, { name: '即食鸡胸肉', price: 15 },
    { name: '酸奶2盒', price: 10 }, { name: '速冻水饺', price: 18 },
    { name: '方便面5包', price: 12 }, { name: '火腿肠10根', price: 10 },
    { name: '薯片大包', price: 8 }, { name: '矿泉水6瓶', price: 10 },
    { name: '洗衣液', price: 22 }, { name: '纸巾3包', price: 12 },
    { name: '酱油1瓶', price: 8 }, { name: '醋1瓶', price: 6 },
    { name: '食用油1L', price: 28 }, { name: '大米5斤', price: 25 },
    { name: '挂面', price: 8 }, { name: '饼干礼盒', price: 20 },
  ],
  '生鲜': [
    { name: '苹果1斤', price: 8 }, { name: '香蕉1串', price: 6 },
    { name: '草莓盒装', price: 20 }, { name: '橙子5个', price: 12 },
    { name: '西瓜半个', price: 10 }, { name: '蓝莓盒装', price: 25 },
    { name: '葡萄1斤', price: 12 }, { name: '芒果2个', price: 15 },
    { name: '三文鱼200g', price: 45 }, { name: '大虾500g', price: 58 },
    { name: '五花肉500g', price: 28 }, { name: '排骨500g', price: 38 },
    { name: '鸡翅500g', price: 22 }, { name: '牛肉500g', price: 55 },
    { name: '鲈鱼1条', price: 30 }, { name: '螃蟹2只', price: 68 },
    { name: '猪蹄1个', price: 25 }, { name: '羊肉卷300g', price: 42 },
  ],
  '甜点': [
    { name: '蛋挞4个', price: 15 }, { name: '牛角包', price: 8 },
    { name: '提拉米苏', price: 22 }, { name: '草莓蛋糕', price: 35 },
    { name: '泡芙', price: 12 }, { name: '曲奇饼干', price: 18 },
    { name: '瑞士卷', price: 16 }, { name: '黑森林蛋糕', price: 28 },
    { name: '芝士蛋糕', price: 32 }, { name: '抹茶千层', price: 28 },
    { name: '芒果班戟', price: 18 }, { name: '榴莲酥', price: 15 },
    { name: '老婆饼6个', price: 12 }, { name: '肉松面包', price: 8 },
    { name: '椰蓉面包', price: 6 }, { name: '红豆吐司', price: 10 },
    { name: '拿破仑蛋糕', price: 38 }, { name: '马卡龙6个', price: 25 },
  ],
  '快餐': [
    { name: '巨无霸套餐', price: 35 }, { name: '香辣鸡腿堡', price: 18 },
    { name: '薯条中份', price: 12 }, { name: '可乐中杯', price: 8 },
    { name: '麦辣鸡翅2块', price: 14 }, { name: '圣代', price: 10 },
    { name: '鸡肉卷', price: 16 }, { name: '奥尔良鸡腿', price: 12 },
    { name: '新奥尔良烤翅', price: 15 }, { name: '劲脆鸡腿堡', price: 18 },
    { name: '田园脆鸡堡', price: 16 }, { name: '嫩牛五方', price: 22 },
    { name: '墨西哥鸡肉卷', price: 18 }, { name: '蛋挞2个', price: 8 },
    { name: '玉米杯', price: 8 }, { name: '芙蓉荟蔬汤', price: 10 },
    { name: '全家桶', price: 88 }, { name: '鸡米花', price: 12 },
  ],
  '火锅': [
    { name: '经典牛油锅底', price: 58 }, { name: '番茄锅底', price: 38 },
    { name: '肥牛卷', price: 32 }, { name: '虾滑', price: 28 },
    { name: '毛肚', price: 36 }, { name: '鸭血', price: 12 },
    { name: '土豆片', price: 8 }, { name: '藕片', price: 8 },
    { name: '麻辣锅底', price: 48 }, { name: '菌菇锅底', price: 42 },
    { name: '羊肉卷', price: 35 }, { name: '鸭肠', price: 22 },
    { name: '黄喉', price: 28 }, { name: '冻豆腐', price: 8 },
    { name: '金针菇', price: 10 }, { name: '生菜', price: 6 },
    { name: '宽粉', price: 8 }, { name: '午餐肉', price: 15 },
    { name: '牛肉丸', price: 18 }, { name: '鱼丸', price: 15 },
  ],
  '面食': [
    { name: '牛肉拉面', price: 18 }, { name: '刀削面', price: 16 },
    { name: '小面', price: 12 }, { name: '油泼面', price: 15 },
    { name: '凉皮', price: 10 }, { name: '肉夹馍', price: 12 },
    { name: 'biangbiang面', price: 16 }, { name: '臊子面', price: 14 },
    { name: '炸酱面', price: 14 }, { name: '担担面', price: 15 },
    { name: '阳春面', price: 10 }, { name: '肥肠面', price: 18 },
    { name: '排骨面', price: 20 }, { name: '鸡蛋面', price: 12 },
    { name: '炒河粉', price: 14 }, { name: '炒米粉', price: 12 },
    { name: '馄饨', price: 12 }, { name: '饺子12个', price: 16 },
  ],
  '小吃': [
    { name: '鸭脖', price: 15 }, { name: '鸭翅', price: 12 },
    { name: '鸡排', price: 10 }, { name: '小笼包6个', price: 15 },
    { name: '生煎包4个', price: 12 }, { name: '炸鸡腿', price: 8 },
    { name: '臭豆腐', price: 10 }, { name: '烤串', price: 6 },
    { name: '煎饼果子', price: 10 }, { name: '手抓饼', price: 8 },
    { name: '烤冷面', price: 8 }, { name: '章鱼小丸子', price: 12 },
    { name: '炸春卷', price: 10 }, { name: '糖葫芦', price: 8 },
    { name: '鸡蛋灌饼', price: 8 }, { name: '酱香饼', price: 6 },
    { name: '卤味拼盘', price: 25 }, { name: '铁板豆腐', price: 8 },
  ],
  '水果': [
    { name: '苹果1斤', price: 8 }, { name: '香蕉1串', price: 6 },
    { name: '草莓盒装', price: 20 }, { name: '橙子5个', price: 12 },
    { name: '西瓜半个', price: 10 }, { name: '蓝莓盒装', price: 25 },
    { name: '哈密瓜', price: 15 }, { name: '火龙果', price: 12 },
    { name: '车厘子1斤', price: 45 }, { name: '山竹1斤', price: 28 },
    { name: '荔枝1斤', price: 18 }, { name: '龙眼1斤', price: 15 },
    { name: '猕猴桃6个', price: 18 }, { name: '桃子4个', price: 15 },
    { name: '梨5个', price: 12 }, { name: '柚子1个', price: 15 },
    { name: '菠萝1个', price: 12 }, { name: '木瓜1个', price: 10 },
  ],
};

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomRating() {
  return (Math.random() * 1.5 + 3.5).toFixed(1);
}

async function main() {
  console.log('Seeding...');

  // Clear existing data (order matters for foreign keys)
  await prisma.product.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  // Create categories
  const createdCategories = await Promise.all(
    categories.map((c) => prisma.category.create({ data: c })),
  );
  console.log(`Created ${createdCategories.length} categories`);

  // Create shops and products
  let totalShops = 0;
  let totalProducts = 0;

  for (const cat of createdCategories) {
    const names = shopNames[cat.name] || [];
    const products = productTemplates[cat.name] || [];

    for (const shopName of names) {
      const shop = await prisma.shop.create({
        data: {
          name: shopName,
          description: `${shopName}，好吃不贵，欢迎品尝`,
          address: `杭州市西湖区文三路${randomBetween(100, 999)}号`,
          phone: `138${randomBetween(10000000, 99999999)}`,
          rating: randomRating(),
          monthlySales: randomBetween(100, 1000),
          deliveryFee: randomBetween(0, 8),
          minOrder: randomBetween(10, 30),
          latitude: 30.2 + Math.random() * 0.1,
          longitude: 120.1 + Math.random() * 0.1,
          businessHours: '09:00-22:00',
          categoryId: cat.id,
          status: 1,
        },
      });
      totalShops++;

      // Randomly select 8-12 products from templates for each shop
      const shuffledProducts = [...products].sort(() => Math.random() - 0.5);
      const selectedProducts = shuffledProducts.slice(0, randomBetween(8, 12));

      for (const p of selectedProducts) {
        await prisma.product.create({
          data: {
            shopId: shop.id,
            categoryId: cat.id,
            name: p.name,
            description: `${p.name}，新鲜美味`,
            price: p.price,
            image: `https://via.placeholder.com/200x200?text=${encodeURIComponent(p.name)}`,
            stock: 999,
            sales: randomBetween(10, 500),
            status: 1,
          },
        });
        totalProducts++;
      }
    }
  }

  // Ensure test user exists
  const hashedPassword = await bcrypt.hash('123456', 10);
  const testUser = await prisma.user.create({
    data: {
      phone: '13800138000',
      password: hashedPassword,
      nickname: '测试用户',
      gender: 1,
    },
  });

  // Create test address
  await prisma.address.create({
    data: {
      userId: testUser.id,
      name: '张三',
      phone: '13800138000',
      province: '浙江省',
      city: '杭州市',
      district: '西湖区',
      detail: '文三路398号',
      latitude: 30.27,
      longitude: 120.13,
      isDefault: true,
    },
  });

  console.log(`Test user: ${testUser.phone}`);
  console.log(`Seeded: ${totalShops} shops, ${totalProducts} products`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
