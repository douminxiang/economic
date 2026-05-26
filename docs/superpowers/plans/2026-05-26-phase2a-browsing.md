# Phase 2a：核心浏览体验 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现商家/商品浏览功能，包括后端 API（分类、商家、商品模块）、种子数据、以及前端 5 个页面（首页、分类、搜索、商家详情、商品详情）。

**架构：** NestJS 后端新增 Category/Shop/Product 三个模块，Prisma 新增对应 model。前端使用 TanStack Query 获取数据，Axios 调用 API，FlatList 虚拟化列表。

**技术栈：** NestJS 10, Prisma 7, MySQL 8.0, React Native 0.85, TanStack Query 5, Axios, React Navigation 7

---

## 文件结构

```
apps/server/src/modules/
├── category/
│   ├── category.module.ts
│   ├── category.controller.ts
│   └── category.service.ts
├── shop/
│   ├── shop.module.ts
│   ├── shop.controller.ts
│   ├── shop.service.ts
│   └── dto/query-shop.dto.ts
└── product/
    ├── product.module.ts
    ├── product.controller.ts
    ├── product.service.ts
    └── dto/query-product.dto.ts

apps/server/prisma/
├── schema.prisma                    # 修改：新增 Category, Shop, Product
└── seed.ts                          # 修改：扩展种子数据

packages/shared/types/
├── index.ts                         # 修改：导出新类型
├── shop.ts                          # 创建
├── product.ts                       # 创建
└── category.ts                      # 创建

apps/mobile/src/
├── services/api.ts                  # 修改：添加 shop/category/product API
├── hooks/
│   ├── useCategories.ts             # 创建
│   ├── useShops.ts                  # 创建
│   └── useProducts.ts               # 创建
├── screens/
│   ├── HomeScreen.tsx               # 修改：真实数据
│   ├── CategoryScreen.tsx           # 修改：真实数据
│   ├── SearchScreen.tsx             # 修改：真实数据
│   ├── ShopDetailScreen.tsx         # 创建
│   └── ProductDetailScreen.tsx      # 创建
└── navigation/
    └── HomeStack.tsx                # 修改：添加 ShopDetail, ProductDetail 路由
```

---

## 任务 1：共享类型定义

**文件：**
- 创建：`packages/shared/types/category.ts`
- 创建：`packages/shared/types/shop.ts`
- 创建：`packages/shared/types/product.ts`
- 修改：`packages/shared/types/index.ts`

- [ ] **步骤 1：创建 Category 类型**

`packages/shared/types/category.ts`:
```typescript
export interface Category {
  id: number;
  name: string;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
}
```

- [ ] **步骤 2：创建 Shop 类型**

`packages/shared/types/shop.ts`:
```typescript
export interface Shop {
  id: number;
  name: string;
  description: string | null;
  address: string;
  phone: string | null;
  images: string[] | null;
  rating: number;
  monthlySales: number;
  deliveryFee: number;
  minOrder: number;
  latitude: number;
  longitude: number;
  businessHours: string | null;
  categoryId: number | null;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShopListItem {
  id: number;
  name: string;
  address: string;
  images: string[] | null;
  rating: number;
  monthlySales: number;
  deliveryFee: number;
  minOrder: number;
  businessHours: string | null;
  categoryName: string | null;
}

export interface ShopDetail extends Shop {
  categoryName: string | null;
  products: ProductGroup[];
}

export interface ProductGroup {
  categoryName: string;
  products: ShopProduct[];
}

export interface ShopProduct {
  id: number;
  name: string;
  price: number;
  image: string | null;
  sales: number;
  description: string | null;
}

export interface QueryShopDto {
  page?: number;
  limit?: number;
  categoryId?: number;
  keyword?: string;
  sort?: 'recommended' | 'rating' | 'sales';
}
```

- [ ] **步骤 3：创建 Product 类型**

`packages/shared/types/product.ts`:
```typescript
export interface Product {
  id: number;
  shopId: number;
  categoryId: number | null;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  stock: number;
  sales: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail extends Product {
  shopName: string;
  shopAddress: string;
  shopRating: number;
  shopMonthlySales: number;
}

export interface QueryProductDto {
  shopId?: number;
  categoryId?: number;
  page?: number;
  limit?: number;
}
```

- [ ] **步骤 4：导出新类型**

`packages/shared/types/index.ts`:
```typescript
export * from './user';
export * from './auth';
export * from './address';
export * from './category';
export * from './shop';
export * from './product';
```

- [ ] **步骤 5：Commit**

```bash
git add packages/shared/types/
git commit -m "feat: add shared types for category, shop, product"
```

---

## 任务 2：Prisma Schema 扩展

**文件：**
- 修改：`apps/server/prisma/schema.prisma`
- 修改：`apps/server/prisma/seed.ts`

- [ ] **步骤 1：添加 Category, Shop, Product 模型**

在 `apps/server/prisma/schema.prisma` 的 Address model 之后添加：

```prisma
// ============ 分类 ============

model Category {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(50)
  icon      String?  @db.VarChar(500)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())

  shops    Shop[]
  products Product[]

  @@map("categories")
}

// ============ 商家 ============

model Shop {
  id            Int      @id @default(autoincrement())
  name          String   @db.VarChar(100)
  description   String?  @db.Text
  address       String   @db.VarChar(200)
  phone         String?  @db.VarChar(20)
  images        Json?
  rating        Decimal  @default(5.0) @db.Decimal(2, 1)
  monthlySales  Int      @default(0)
  deliveryFee   Decimal  @default(0) @db.Decimal(10, 2)
  minOrder      Decimal  @default(0) @db.Decimal(10, 2)
  latitude      Decimal  @db.Decimal(10, 7)
  longitude     Decimal  @db.Decimal(10, 7)
  businessHours String?  @db.VarChar(50)
  categoryId    Int?
  status        Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  category  Category?  @relation(fields: [categoryId], references: [id])
  products  Product[]
  orders    Order[]
  reviews   Review[]
  favorites Favorite[]

  @@index([categoryId])
  @@index([status])
  @@map("shops")
}

// ============ 商品 ============

model Product {
  id          Int      @id @default(autoincrement())
  shopId      Int
  categoryId  Int?
  name        String   @db.VarChar(100)
  description String?  @db.Text
  price       Decimal  @db.Decimal(10, 2)
  image       String?  @db.VarChar(500)
  stock       Int      @default(999)
  sales       Int      @default(0)
  status      Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  shop      Shop?      @relation(fields: [shopId], references: [id])
  category  Category?  @relation(fields: [categoryId], references: [id])
  orderItems OrderItem[]

  @@index([shopId])
  @@index([categoryId])
  @@map("products")
}
```

注意：Order、OrderItem、Review、Favorite 模型尚未创建，需要先创建空的占位 model 或注释掉关系字段。由于 Phase 3 才添加这些 model，**此处先注释掉** Shop 中的 `orders`, `reviews`, `favorites` 和 Product 中的 `orderItems` 关系字段。

- [ ] **步骤 2：运行 Prisma 迁移**

```bash
cd /e/economic/apps/server
pnpm prisma migrate dev --name add-category-shop-product
```

预期：迁移成功，生成 Prisma Client

- [ ] **步骤 3：Commit**

```bash
git add apps/server/prisma/
git commit -m "feat: add Category, Shop, Product models to Prisma schema"
```

---

## 任务 3：Category 模块

**文件：**
- 创建：`apps/server/src/modules/category/category.module.ts`
- 创建：`apps/server/src/modules/category/category.controller.ts`
- 创建：`apps/server/src/modules/category/category.service.ts`
- 修改：`apps/server/src/app.module.ts`

- [ ] **步骤 1：创建 CategoryService**

`apps/server/src/modules/category/category.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }
}
```

- [ ] **步骤 2：创建 CategoryController**

`apps/server/src/modules/category/category.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';
import { CategoryService } from './category.service';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }
}
```

- [ ] **步骤 3：创建 CategoryModule**

`apps/server/src/modules/category/category.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
```

- [ ] **步骤 4：注册到 AppModule**

修改 `apps/server/src/app.module.ts`：
```typescript
import { CategoryModule } from './modules/category/category.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
    AddressModule,
    CategoryModule,
  ],
})
export class AppModule {}
```

- [ ] **步骤 5：验证 API**

启动后端：`pnpm --filter @economic/server start:dev`

运行：`curl http://localhost:3000/api/v1/categories`
预期：返回空数组 `[]`（种子数据尚未添加）

- [ ] **步骤 6：Commit**

```bash
git add apps/server/src/modules/category/ apps/server/src/app.module.ts
git commit -m "feat: add category module with list endpoint"
```

---

## 任务 4：Shop 模块

**文件：**
- 创建：`apps/server/src/modules/shop/shop.module.ts`
- 创建：`apps/server/src/modules/shop/shop.controller.ts`
- 创建：`apps/server/src/modules/shop/shop.service.ts`
- 创建：`apps/server/src/modules/shop/dto/query-shop.dto.ts`
- 修改：`apps/server/src/app.module.ts`

- [ ] **步骤 1：创建 QueryShopDto**

`apps/server/src/modules/shop/dto/query-shop.dto.ts`:
```typescript
import { IsOptional, IsString, IsNumber, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryShopDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  @IsIn(['recommended', 'rating', 'sales'])
  sort?: string = 'recommended';
}
```

- [ ] **步骤 2：创建 ShopService**

`apps/server/src/modules/shop/shop.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryShopDto } from './dto/query-shop.dto';

@Injectable()
export class ShopService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryShopDto) {
    const { page = 1, limit = 20, categoryId, keyword, sort = 'recommended' } = query;
    const skip = (page - 1) * limit;

    const where: any = { status: 1 };
    if (categoryId) where.categoryId = categoryId;
    if (keyword) where.name = { contains: keyword };

    const orderBy: any =
      sort === 'rating' ? { rating: 'desc' } :
      sort === 'sales' ? { monthlySales: 'desc' } :
      [{ rating: 'desc' }, { monthlySales: 'desc' }];

    const [items, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { category: { select: { name: true } } },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return {
      items: items.map((s) => ({
        ...s,
        categoryName: s.category?.name ?? null,
        category: undefined,
      })),
      total,
      page,
      limit,
    };
  }

  async findRecommended() {
    return this.findAll({ page: 1, limit: 20, sort: 'recommended' });
  }

  async findOne(id: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        category: { select: { name: true } },
        products: {
          where: { status: 1 },
          orderBy: { sales: 'desc' },
        },
      },
    });
    if (!shop) throw new NotFoundException('商家不存在');

    // Group products by category
    const productMap = new Map<string, any[]>();
    for (const p of shop.products) {
      const catName = '商品';
      if (!productMap.has(catName)) productMap.set(catName, []);
      productMap.get(catName)!.push(p);
    }

    return {
      ...shop,
      categoryName: shop.category?.name ?? null,
      category: undefined,
      products: Array.from(productMap.entries()).map(([categoryName, products]) => ({
        categoryName,
        products,
      })),
    };
  }
}
```

- [ ] **步骤 3：创建 ShopController**

`apps/server/src/modules/shop/shop.controller.ts`:
```typescript
import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ShopService } from './shop.service';
import { QueryShopDto } from './dto/query-shop.dto';

@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get()
  findAll(@Query() query: QueryShopDto) {
    return this.shopService.findAll(query);
  }

  @Get('recommended')
  findRecommended() {
    return this.shopService.findRecommended();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shopService.findOne(id);
  }
}
```

- [ ] **步骤 4：创建 ShopModule**

`apps/server/src/modules/shop/shop.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';

@Module({
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
```

- [ ] **步骤 5：注册到 AppModule**

修改 `apps/server/src/app.module.ts` 添加 `ShopModule`。

- [ ] **步骤 6：验证 API**

启动后端，测试：
```bash
curl "http://localhost:3000/api/v1/shops?page=1&limit=5"
curl "http://localhost:3000/api/v1/shops/recommended"
curl "http://localhost:3000/api/v1/shops/1"
```
预期：返回空数据（种子数据尚未添加），404 for /shops/1

- [ ] **步骤 7：Commit**

```bash
git add apps/server/src/modules/shop/ apps/server/src/app.module.ts
git commit -m "feat: add shop module with list, detail, recommended endpoints"
```

---

## 任务 5：Product 模块

**文件：**
- 创建：`apps/server/src/modules/product/product.module.ts`
- 创建：`apps/server/src/modules/product/product.controller.ts`
- 创建：`apps/server/src/modules/product/product.service.ts`
- 创建：`apps/server/src/modules/product/dto/query-product.dto.ts`
- 修改：`apps/server/src/app.module.ts`

- [ ] **步骤 1：创建 QueryProductDto**

`apps/server/src/modules/product/dto/query-product.dto.ts`:
```typescript
import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProductDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  shopId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
```

- [ ] **步骤 2：创建 ProductService**

`apps/server/src/modules/product/product.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryProductDto) {
    const { shopId, categoryId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { status: 1 };
    if (shopId) where.shopId = shopId;
    if (categoryId) where.categoryId = categoryId;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { sales: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            name: true,
            address: true,
            rating: true,
            monthlySales: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException('商品不存在');

    const { shop, ...productData } = product;
    return {
      ...productData,
      shopName: shop.name,
      shopAddress: shop.address,
      shopRating: shop.rating,
      shopMonthlySales: shop.monthlySales,
    };
  }
}
```

- [ ] **步骤 3：创建 ProductController**

`apps/server/src/modules/product/product.controller.ts`:
```typescript
import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ProductService } from './product.service';
import { QueryProductDto } from './dto/query-product.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll(@Query() query: QueryProductDto) {
    return this.productService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }
}
```

- [ ] **步骤 4：创建 ProductModule**

`apps/server/src/modules/product/product.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';

@Module({
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
```

- [ ] **步骤 5：注册到 AppModule**

修改 `apps/server/src/app.module.ts` 添加 `ProductModule`。

- [ ] **步骤 6：Commit**

```bash
git add apps/server/src/modules/product/ apps/server/src/app.module.ts
git commit -m "feat: add product module with list and detail endpoints"
```

---

## 任务 6：种子数据

**文件：**
- 修改：`apps/server/prisma/seed.ts`

- [ ] **步骤 1：扩展种子数据**

替换 `apps/server/prisma/seed.ts` 内容：

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

const shopNames: Record<number, string[]> = {
  1: ['湘菜馆·辣椒炒肉', '川味坊·水煮鱼', '粤式茶餐厅', '东北饺子馆', '西北羊肉馆', '云南过桥米线', '湖北热干面', '江浙菜馆'],
  2: ['一点点奶茶', '喜茶', '瑞幸咖啡', '蜜雪冰城', '茶百道', '古茗', 'COCO都可', '星巴克'],
  3: ['盒马鲜生', '永辉超市', '叮咚买菜', '美团买菜', '朴朴超市'],
  4: ['每日鲜语', '鲜丰水果', '百果园', '果琳', '果蔬好'],
  5: ['好利来', '鲍师傅', '奈雪烘焙', '85度C', '面包新语'],
  6: ['麦当劳', '肯德基', '汉堡王', '赛百味', '德克士'],
  7: ['海底捞', '呷哺呷哺', '小龙坎', '蜀大侠', '谭鸭血'],
  8: ['兰州拉面', '山西刀削面', '重庆小面', '武汉热干面', '陕西油泼面'],
  9: ['绝味鸭脖', '周黑鸭', '正新鸡排', '沈大成', '南翔小笼'],
  10: ['鲜丰水果', '百果园', '果琳', '每日鲜语', '果蔬好'],
};

const productTemplates: Record<number, { name: string; price: number }[]> = {
  1: [
    { name: '辣椒炒肉', price: 28 }, { name: '农家小炒肉', price: 32 },
    { name: '水煮鱼', price: 48 }, { name: '宫保鸡丁', price: 26 },
    { name: '红烧排骨', price: 38 }, { name: '清炒时蔬', price: 16 },
    { name: '酸辣土豆丝', price: 12 }, { name: '番茄蛋汤', price: 10 },
    { name: '米饭', price: 2 }, { name: '蛋炒饭', price: 15 },
  ],
  2: [
    { name: '珍珠奶茶', price: 12 }, { name: '芋泥啵啵', price: 15 },
    { name: '杨枝甘露', price: 18 }, { name: '柠檬茶', price: 10 },
    { name: '美式咖啡', price: 13 }, { name: '拿铁', price: 16 },
    { name: '抹茶拿铁', price: 18 }, { name: '椰椰拿铁', price: 16 },
  ],
  3: [
    { name: '新鲜蔬菜套餐', price: 25 }, { name: '水果拼盘', price: 30 },
    { name: '鸡蛋10枚', price: 12 }, { name: '牛奶1L', price: 8 },
    { name: '面包吐司', price: 10 }, { name: '即食鸡胸肉', price: 15 },
  ],
  4: [
    { name: '苹果1斤', price: 8 }, { name: '香蕉1串', price: 6 },
    { name: '草莓盒装', price: 20 }, { name: '橙子5个', price: 12 },
    { name: '西瓜半个', price: 10 }, { name: '蓝莓盒装', price: 25 },
  ],
  5: [
    { name: '蛋挞4个', price: 15 }, { name: '牛角包', price: 8 },
    { name: '提拉米苏', price: 22 }, { name: '草莓蛋糕', price: 35 },
    { name: '泡芙', price: 12 }, { name: '曲奇饼干', price: 18 },
  ],
  6: [
    { name: '巨无霸套餐', price: 35 }, { name: '香辣鸡腿堡', price: 18 },
    { name: '薯条中份', price: 12 }, { name: '可乐中杯', price: 8 },
    { name: '麦辣鸡翅2块', price: 14 }, { name: '圣代', price: 10 },
  ],
  7: [
    { name: '经典牛油锅底', price: 58 }, { name: '番茄锅底', price: 38 },
    { name: '肥牛卷', price: 32 }, { name: '虾滑', price: 28 },
    { name: '毛肚', price: 36 }, { name: '鸭血', price: 12 },
    { name: '土豆片', price: 8 }, { name: '藕片', price: 8 },
  ],
  8: [
    { name: '牛肉拉面', price: 18 }, { name: '刀削面', price: 16 },
    { name: '小面', price: 12 }, { name: '油泼面', price: 15 },
    { name: '凉皮', price: 10 }, { name: '肉夹馍', price: 12 },
  ],
  9: [
    { name: '鸭脖', price: 15 }, { name: '鸭翅', price: 12 },
    { name: '鸡排', price: 10 }, { name: '小笼包6个', price: 15 },
    { name: '生煎包4个', price: 12 }, { name: '炸鸡腿', price: 8 },
  ],
  10: [
    { name: '苹果1斤', price: 8 }, { name: '香蕉1串', price: 6 },
    { name: '草莓盒装', price: 20 }, { name: '橙子5个', price: 12 },
    { name: '西瓜半个', price: 10 }, { name: '蓝莓盒装', price: 25 },
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

  // Clear existing data
  await prisma.product.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.category.deleteMany();

  // Create categories
  const createdCategories = await Promise.all(
    categories.map((c) => prisma.category.create({ data: c })),
  );
  console.log(`Created ${createdCategories.length} categories`);

  // Create shops and products
  let totalShops = 0;
  let totalProducts = 0;

  for (const cat of createdCategories) {
    const names = shopNames[cat.id] || [];
    const products = productTemplates[cat.id] || [];

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

      // Create products for this shop
      for (const p of products) {
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
  const testUser = await prisma.user.upsert({
    where: { phone: '13800138000' },
    update: {},
    create: {
      phone: '13800138000',
      password: '$2b$10$hashedpassword',
      nickname: '测试用户',
    },
  });
  console.log(`Test user: ${testUser.phone}`);

  console.log(`Seeded: ${totalShops} shops, ${totalProducts} products`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **步骤 2：运行种子数据**

```bash
cd /e/economic/apps/server
npx ts-node prisma/seed.ts
```

预期：成功创建 10 分类、50+ 商家、500+ 商品

- [ ] **步骤 3：验证数据**

```bash
curl "http://localhost:3000/api/v1/categories"
curl "http://localhost:3000/api/v1/shops?page=1&limit=3"
curl "http://localhost:3000/api/v1/shops/1"
```

预期：返回真实数据

- [ ] **步骤 4：Commit**

```bash
git add apps/server/prisma/seed.ts
git commit -m "feat: add seed data with 50+ shops and 500+ products"
```

---

## 任务 7：前端 API 客户端更新

**文件：**
- 修改：`apps/mobile/src/services/api.ts`

- [ ] **步骤 1：添加 shop/category/product API 方法**

在 `apps/mobile/src/services/api.ts` 末尾添加：

```typescript
// Shop API
export const shopApi = {
  list: (params?: { page?: number; limit?: number; categoryId?: number; keyword?: string; sort?: string }) =>
    api.get('/shops', { params }),
  recommended: () => api.get('/shops/recommended'),
  detail: (id: number) => api.get(`/shops/${id}`),
};

// Category API
export const categoryApi = {
  list: () => api.get('/categories'),
};

// Product API
export const productApi = {
  list: (params?: { shopId?: number; categoryId?: number; page?: number; limit?: number }) =>
    api.get('/products', { params }),
  detail: (id: number) => api.get(`/products/${id}`),
};
```

- [ ] **步骤 2：Commit**

```bash
git add apps/mobile/src/services/api.ts
git commit -m "feat: add shop, category, product API clients"
```

---

## 任务 8：TanStack Query Hooks

**文件：**
- 创建：`apps/mobile/src/hooks/useCategories.ts`
- 创建：`apps/mobile/src/hooks/useShops.ts`
- 创建：`apps/mobile/src/hooks/useProducts.ts`

- [ ] **步骤 1：创建 useCategories**

`apps/mobile/src/hooks/useCategories.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '../services/api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list(),
    staleTime: 10 * 60 * 1000,
  });
}
```

- [ ] **步骤 2：创建 useShops**

`apps/mobile/src/hooks/useShops.ts`:
```typescript
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { shopApi } from '../services/api';

export function useShopList(params?: { categoryId?: number; keyword?: string; sort?: string }) {
  return useInfiniteQuery({
    queryKey: ['shops', params],
    queryFn: ({ pageParam = 1 }) => shopApi.list({ ...params, page: pageParam, limit: 10 }),
    getNextPageParam: (lastPage: any) => {
      const { page, limit, total } = lastPage.data;
      return page * limit < total ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecommendedShops() {
  return useQuery({
    queryKey: ['shops', 'recommended'],
    queryFn: () => shopApi.recommended(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useShopDetail(id: number) {
  return useQuery({
    queryKey: ['shops', id],
    queryFn: () => shopApi.detail(id),
    enabled: !!id,
  });
}
```

- [ ] **步骤 3：创建 useProducts**

`apps/mobile/src/hooks/useProducts.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { productApi } from '../services/api';

export function useProductList(params?: { shopId?: number; categoryId?: number }) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productApi.list(params),
    enabled: !!(params?.shopId || params?.categoryId),
  });
}

export function useProductDetail(id: number) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productApi.detail(id),
    enabled: !!id,
  });
}
```

- [ ] **步骤 4：Commit**

```bash
git add apps/mobile/src/hooks/useCategories.ts apps/mobile/src/hooks/useShops.ts apps/mobile/src/hooks/useProducts.ts
git commit -m "feat: add TanStack Query hooks for categories, shops, products"
```

---

## 任务 9：首页 (HomeScreen)

**文件：**
- 修改：`apps/mobile/src/screens/HomeScreen.tsx`
- 修改：`apps/mobile/src/navigation/HomeStack.tsx`（或 MainTabs 中的 Home 配置）

- [ ] **步骤 1：实现 HomeScreen**

替换 `apps/mobile/src/screens/HomeScreen.tsx`：

```tsx
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useCategories, useRecommendedShops } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';

export default function HomeScreen({ navigation }: any) {
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: shopsData, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useRecommendedShops();
  const shops = shopsData?.data?.items || [];

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Search')}>
        <Text style={styles.searchPlaceholder}>🔍 搜索商家或美食</Text>
      </TouchableOpacity>

      <FlatList
        data={shops}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.shopCard} onPress={() => navigation.navigate('ShopDetail', { id: item.id })}>
            <View style={styles.shopImage}>
              <Text style={styles.shopImageText}>{item.name[0]}</Text>
            </View>
            <View style={styles.shopInfo}>
              <Text style={styles.shopName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.shopMeta}>月售{item.monthlySales} · {item.categoryName || ''}</Text>
              <Text style={styles.shopMeta}>配送费¥{item.deliveryFee} · ¥{item.minOrder}起送</Text>
            </View>
            <Text style={styles.shopRating}>⭐ {Number(item.rating).toFixed(1)}</Text>
          </TouchableOpacity>
        )}
        ListHeaderComponent={() => (
          <>
            {/* Categories */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {(categories?.data || []).map((cat: any) => (
                <TouchableOpacity key={cat.id} style={styles.categoryItem} onPress={() => navigation.navigate('Category', { categoryId: cat.id })}>
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.sectionTitle}>推荐商家</Text>
          </>
        )}
        ListEmptyComponent={!catsLoading ? <Text style={styles.empty}>暂无商家</Text> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: { backgroundColor: colors.surface, margin: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, ...shadows.sm },
  searchPlaceholder: { color: colors.textLight, fontSize: fontSize.md },
  categoryScroll: { maxHeight: 90, paddingHorizontal: spacing.md },
  categoryItem: { alignItems: 'center', marginRight: spacing.lg, marginTop: spacing.sm },
  categoryIcon: { fontSize: 32 },
  categoryName: { fontSize: fontSize.xs, color: colors.text, marginTop: spacing.xs },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, margin: spacing.md },
  shopCard: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', ...shadows.sm },
  shopImage: { width: 64, height: 64, borderRadius: borderRadius.md, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  shopImageText: { fontSize: fontSize.xl, color: colors.surface, fontWeight: 'bold' },
  shopInfo: { flex: 1, marginLeft: spacing.md },
  shopName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  shopMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  shopRating: { fontSize: fontSize.sm, color: colors.warning, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
  listContent: { paddingBottom: spacing.xl },
});
```

- [ ] **步骤 2：验证首页**

启动 App，预期：
- 顶部搜索栏
- 分类图标横向滚动
- 推荐商家列表（从 API 获取）
- 下拉刷新 + 无限滚动

- [ ] **步骤 3：Commit**

```bash
git add apps/mobile/src/screens/HomeScreen.tsx
git commit -m "feat: implement HomeScreen with categories and shop list"
```

---

## 任务 10：分类页 (CategoryScreen)

**文件：**
- 修改：`apps/mobile/src/screens/CategoryScreen.tsx`

- [ ] **步骤 1：实现 CategoryScreen**

替换 `apps/mobile/src/screens/CategoryScreen.tsx`：

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useCategories, useShopList } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';

export default function CategoryScreen({ navigation, route }: any) {
  const initialCatId = route?.params?.categoryId;
  const { data: categories } = useCategories();
  const [selectedId, setSelectedId] = useState<number | undefined>(initialCatId);
  const { data: shopsData, fetchNextPage, hasNextPage, isFetchingNextPage } = useShopList({ categoryId: selectedId });
  const shops = shopsData?.pages?.flatMap((p: any) => p.data.items) || [];

  return (
    <View style={styles.container}>
      {/* Left: Category List */}
      <View style={styles.leftPanel}>
        <FlatList
          data={categories?.data || []}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={[styles.catItem, selectedId === item.id && styles.catItemActive]}
              onPress={() => setSelectedId(item.id)}
            >
              <Text style={styles.catIcon}>{item.icon}</Text>
              <Text style={[styles.catName, selectedId === item.id && styles.catNameActive]}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Right: Shop List */}
      <View style={styles.rightPanel}>
        <FlatList
          data={shops}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }: any) => (
            <TouchableOpacity style={styles.shopCard} onPress={() => navigation.navigate('ShopDetail', { id: item.id })}>
              <View style={styles.shopImage}><Text style={styles.shopImgText}>{item.name[0]}</Text></View>
              <View style={styles.shopInfo}>
                <Text style={styles.shopName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.shopMeta}>月售{item.monthlySales} · ⭐{Number(item.rating).toFixed(1)}</Text>
                <Text style={styles.shopMeta}>¥{item.minOrder}起送 · 配送费¥{item.deliveryFee}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>暂无商家</Text>}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  leftPanel: { width: 90, backgroundColor: colors.surface },
  catItem: { paddingVertical: spacing.md, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  catItemActive: { backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary },
  catIcon: { fontSize: 24 },
  catName: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  catNameActive: { color: colors.primary, fontWeight: '600' },
  rightPanel: { flex: 1 },
  shopCard: { flexDirection: 'row', backgroundColor: colors.surface, margin: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, ...shadows.sm },
  shopImage: { width: 56, height: 56, borderRadius: borderRadius.sm, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  shopImgText: { fontSize: fontSize.lg, color: colors.surface, fontWeight: 'bold' },
  shopInfo: { flex: 1, marginLeft: spacing.md, justifyContent: 'center' },
  shopName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  shopMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
});
```

- [ ] **步骤 2：验证分类页**

- [ ] **步骤 3：Commit**

```bash
git add apps/mobile/src/screens/CategoryScreen.tsx
git commit -m "feat: implement CategoryScreen with category filter"
```

---

## 任务 11：搜索页 (SearchScreen)

**文件：**
- 修改：`apps/mobile/src/screens/SearchScreen.tsx`

- [ ] **步骤 1：实现 SearchScreen**

替换 `apps/mobile/src/screens/SearchScreen.tsx`：

```tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { useShopList } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const HISTORY_KEY = 'search_history';
const MAX_HISTORY = 10;

const HOT_WORDS = ['辣椒炒肉', '奶茶', '火锅', '汉堡', '咖啡', '面包', '水果', '寿司'];

export default function SearchScreen({ navigation }: any) {
  const [keyword, setKeyword] = useState('');
  const [searchText, setSearchText] = useState('');
  const { data: shopsData } = useShopList({ keyword: searchText || undefined });
  const shops = shopsData?.pages?.flatMap((p: any) => p.data.items) || [];

  const getHistory = (): string[] => {
    try { return JSON.parse(storage.getString(HISTORY_KEY) || '[]'); } catch { return []; }
  };
  const [history, setHistory] = useState<string[]>(getHistory());

  const doSearch = (text: string) => {
    setSearchText(text);
    setKeyword(text);
    // Save to history
    const newHistory = [text, ...history.filter((h) => h !== text)].slice(0, MAX_HISTORY);
    setHistory(newHistory);
    storage.set(HISTORY_KEY, JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    storage.delete(HISTORY_KEY);
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.inputRow}>
        <TextInput style={styles.input} placeholder="搜索商家或美食" value={keyword} onChangeText={setKeyword} onSubmitEditing={() => doSearch(keyword)} autoFocus />
        <TouchableOpacity onPress={() => doSearch(keyword)}><Text style={styles.searchBtn}>搜索</Text></TouchableOpacity>
      </View>

      {!searchText ? (
        <View style={styles.suggestions}>
          {history.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>搜索历史</Text>
                <TouchableOpacity onPress={clearHistory}><Text style={styles.clearBtn}>清除</Text></TouchableOpacity>
              </View>
              <View style={styles.tagRow}>
                {history.map((h) => (
                  <TouchableOpacity key={h} style={styles.tag} onPress={() => doSearch(h)}>
                    <Text style={styles.tagText}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>热门搜索</Text>
            <View style={styles.tagRow}>
              {HOT_WORDS.map((w) => (
                <TouchableOpacity key={w} style={styles.tag} onPress={() => doSearch(w)}>
                  <Text style={styles.tagText}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }: any) => (
            <TouchableOpacity style={styles.resultCard} onPress={() => navigation.navigate('ShopDetail', { id: item.id })}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultMeta}>月售{item.monthlySales} · ⭐{Number(item.rating).toFixed(1)}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>未找到相关商家</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, margin: spacing.md, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, ...shadows.sm },
  input: { flex: 1, height: 44, fontSize: fontSize.md },
  searchBtn: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600', paddingLeft: spacing.md },
  suggestions: { padding: spacing.md },
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  clearBtn: { fontSize: fontSize.sm, color: colors.textSecondary },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  tagText: { fontSize: fontSize.sm, color: colors.textSecondary },
  resultCard: { backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, ...shadows.sm },
  resultName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  resultMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
});
```

- [ ] **步骤 2：验证搜索页**

- [ ] **步骤 3：Commit**

```bash
git add apps/mobile/src/screens/SearchScreen.tsx
git commit -m "feat: implement SearchScreen with history, hot words, real-time search"
```

---

## 任务 12：商家详情页 (ShopDetailScreen)

**文件：**
- 创建：`apps/mobile/src/screens/ShopDetailScreen.tsx`
- 修改：`apps/mobile/src/navigation/HomeStack.tsx`

- [ ] **步骤 1：创建 ShopDetailScreen**

`apps/mobile/src/screens/ShopDetailScreen.tsx`:
```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useShopDetail } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';

export default function ShopDetailScreen({ navigation, route }: any) {
  const { id } = route.params;
  const { data, isLoading } = useShopDetail(id);
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews' | 'info'>('menu');
  const shop = data?.data;

  if (isLoading || !shop) {
    return <View style={styles.loading}><Text>加载中...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header Image */}
        <View style={styles.headerImage}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerPlaceholder}>商家图片</Text>
        </View>

        {/* Shop Info */}
        <View style={styles.infoCard}>
          <View style={styles.nameRow}>
            <Text style={styles.shopName}>{shop.name}</Text>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {Number(shop.rating).toFixed(1)}</Text>
            </View>
          </View>
          <Text style={styles.meta}>月售{shop.monthlySales} · {shop.address}</Text>
          <Text style={styles.meta}>配送费¥{shop.deliveryFee} · ¥{shop.minOrder}起送</Text>
          <Text style={styles.meta}>📍 {shop.businessHours || '09:00-22:00'}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['menu', 'reviews', 'info'] as const).map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'menu' ? '菜单' : tab === 'reviews' ? '评价' : '商家'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'menu' && shop.products?.map((group: any) => (
          <View key={group.categoryName}>
            <Text style={styles.menuCategory}>{group.categoryName}</Text>
            {group.products.map((product: any) => (
              <TouchableOpacity key={product.id} style={styles.productRow} onPress={() => navigation.navigate('ProductDetail', { id: product.id })}>
                <View style={styles.productImage}><Text style={styles.productImgText}>{product.name[0]}</Text></View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productMeta}>月售{product.sales}</Text>
                </View>
                <Text style={styles.productPrice}>¥{Number(product.price).toFixed(0)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {activeTab === 'reviews' && <Text style={styles.emptyTab}>暂无评价</Text>}
        {activeTab === 'info' && (
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>商家名称</Text>
            <Text style={styles.infoValue}>{shop.name}</Text>
            <Text style={styles.infoLabel}>地址</Text>
            <Text style={styles.infoValue}>{shop.address}</Text>
            <Text style={styles.infoLabel}>营业时间</Text>
            <Text style={styles.infoValue}>{shop.businessHours || '09:00-22:00'}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.cartIcon}>
          <Text style={styles.cartIconText}>🛒</Text>
        </View>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomPrice}>¥0.00</Text>
          <Text style={styles.bottomMeta}>另需配送费¥{shop.deliveryFee}</Text>
        </View>
        <View style={styles.bottomBtn}>
          <Text style={styles.bottomBtnText}>¥{Number(shop.minOrder).toFixed(0)}起送</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerImage: { height: 200, backgroundColor: '#444', justifyContent: 'center', alignItems: 'center' },
  headerPlaceholder: { color: '#FFFFFF99', fontSize: fontSize.md },
  backBtn: { position: 'absolute', top: 50, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: '#00000066', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  backText: { color: '#FFF', fontSize: fontSize.lg },
  infoCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: [borderRadius.lg, borderRadius.lg, 0, 0] as any },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  shopName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  ratingBadge: { backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  ratingText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: fontSize.md, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  menuCategory: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, padding: spacing.md, backgroundColor: colors.background },
  productRow: { flexDirection: 'row', backgroundColor: colors.surface, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, alignItems: 'center' },
  productImage: { width: 72, height: 72, borderRadius: borderRadius.sm, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  productImgText: { fontSize: fontSize.lg, color: colors.textSecondary },
  productInfo: { flex: 1, marginLeft: spacing.md },
  productName: { fontSize: fontSize.md, fontWeight: '500', color: colors.text },
  productMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  productPrice: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary },
  emptyTab: { textAlign: 'center', color: colors.textSecondary, padding: spacing.xl },
  infoSection: { padding: spacing.lg, backgroundColor: colors.surface },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.md },
  infoValue: { fontSize: fontSize.md, color: colors.text, marginTop: spacing.xs },
  bottomBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.text, height: 56, paddingHorizontal: spacing.md },
  cartIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  cartIconText: { fontSize: 20 },
  bottomInfo: { flex: 1, marginLeft: spacing.md },
  bottomPrice: { color: '#FFF', fontSize: fontSize.lg, fontWeight: '700' },
  bottomMeta: { color: '#FFFFFF99', fontSize: fontSize.xs },
  bottomBtn: { backgroundColor: colors.textLight, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md },
  bottomBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
});
```

- [ ] **步骤 2：添加路由**

在 `apps/mobile/src/navigation/HomeStack.tsx`（或对应导航配置）中添加 ShopDetail 和 ProductDetail 路由。

- [ ] **步骤 3：验证商家详情页**

- [ ] **步骤 4：Commit**

```bash
git add apps/mobile/src/screens/ShopDetailScreen.tsx apps/mobile/src/navigation/
git commit -m "feat: implement ShopDetailScreen with menu, reviews, info tabs"
```

---

## 任务 13：商品详情页 (ProductDetailScreen)

**文件：**
- 创建：`apps/mobile/src/screens/ProductDetailScreen.tsx`
- 修改：`apps/mobile/src/navigation/HomeStack.tsx`

- [ ] **步骤 1：创建 ProductDetailScreen**

`apps/mobile/src/screens/ProductDetailScreen.tsx`:
```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useProductDetail } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';

export default function ProductDetailScreen({ navigation, route }: any) {
  const { id } = route.params;
  const { data, isLoading } = useProductDetail(id);
  const [quantity, setQuantity] = useState(1);
  const product = data?.data;

  if (isLoading || !product) {
    return <View style={styles.loading}><Text>加载中...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Image */}
        <View style={styles.imageArea}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.imagePlaceholder}>商品图片</Text>
        </View>

        {/* Product Info */}
        <View style={styles.infoCard}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>¥{Number(product.price).toFixed(0)}</Text>
            <View style={styles.salesTag}>
              <Text style={styles.salesText}>已售{product.sales}</Text>
            </View>
          </View>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        {/* Shop Info */}
        <TouchableOpacity style={styles.shopCard} onPress={() => navigation.navigate('ShopDetail', { id: product.shopId })}>
          <View style={styles.shopIcon}><Text style={styles.shopIconText}>🏪</Text></View>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{product.shopName}</Text>
            <Text style={styles.shopMeta}>月售{product.shopMonthlySales} · ⭐{Number(product.shopRating).toFixed(1)}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.qtyControl}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
            <Text style={styles.qtyBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnPlus]} onPress={() => setQuantity(quantity + 1)}>
            <Text style={[styles.qtyBtnText, styles.qtyBtnPlusText]}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.addCartBtn}>
          <Text style={styles.addCartText}>🛒 加入购物车</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageArea: { height: 300, backgroundColor: '#555', justifyContent: 'center', alignItems: 'center' },
  imagePlaceholder: { color: '#FFFFFF99', fontSize: fontSize.md },
  backBtn: { position: 'absolute', top: 50, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: '#00000066', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  backText: { color: '#FFF', fontSize: fontSize.lg },
  infoCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: [borderRadius.lg, borderRadius.lg, 0, 0] as any },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  price: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.primary },
  salesTag: { backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
  salesText: { color: '#FFF', fontSize: fontSize.xs },
  productName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  description: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },
  shopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginTop: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  shopIcon: { width: 40, height: 40, borderRadius: borderRadius.sm, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  shopIconText: { fontSize: 20 },
  shopInfo: { flex: 1, marginLeft: spacing.md },
  shopName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  shopMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  arrow: { fontSize: fontSize.xl, color: colors.textLight },
  bottomBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, height: 64, paddingHorizontal: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  qtyBtnPlus: { backgroundColor: colors.primary },
  qtyBtnText: { fontSize: fontSize.lg, color: colors.textSecondary },
  qtyBtnPlusText: { color: '#FFF' },
  qtyText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  addCartBtn: { flex: 1, marginLeft: spacing.lg, backgroundColor: colors.primary, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  addCartText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
```

- [ ] **步骤 2：添加路由**

在导航配置中添加 ProductDetail 路由。

- [ ] **步骤 3：验证商品详情页**

- [ ] **步骤 4：Commit**

```bash
git add apps/mobile/src/screens/ProductDetailScreen.tsx apps/mobile/src/navigation/
git commit -m "feat: implement ProductDetailScreen with quantity selector"
```

---

## 任务 14：导航路由补全

**文件：**
- 修改：`apps/mobile/src/navigation/HomeStack.tsx`（或 MainTabs 中 Home 的 Stack 配置）

- [ ] **步骤 1：确保所有路由已注册**

验证 HomeStack 中包含以下路由：
- Home（首页）
- Search（搜索）
- Category（分类）
- ShopDetail（商家详情）
- ProductDetail（商品详情）

如果缺失，添加它们。

- [ ] **步骤 2：验证完整流程**

测试完整用户流程：
1. 启动 App → 首页显示分类 + 推荐商家
2. 点击分类 → 跳转分类页，显示该分类商家
3. 点击搜索 → 跳转搜索页，输入关键词搜索
4. 点击商家 → 跳转商家详情，显示菜单
5. 点击商品 → 跳转商品详情

- [ ] **步骤 3：Commit**

```bash
git add apps/mobile/src/navigation/
git commit -m "feat: complete navigation routes for Phase 2a"
```
