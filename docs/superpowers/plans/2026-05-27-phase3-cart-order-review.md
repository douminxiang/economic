# Phase 3：购物车、订单、评价、收藏 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现完整交易闭环（购物车→下单→订单管理→评价）和商家收藏功能

**架构：** 后端 4 个 NestJS 模块（cart/order/review/favorite），前端 5 个新页面 + 4 个 hook 文件 + 1 个 zustand store，共享类型 4 个新文件

**技术栈：** Prisma 7, NestJS 11, class-validator, React Native 0.85, TanStack Query v5, Zustand, Axios

---

## 文件结构总览

### 后端新增
```
apps/server/src/modules/
├── cart/
│   ├── cart.module.ts
│   ├── cart.controller.ts
│   ├── cart.service.ts
│   └── dto/add-cart.dto.ts
├── order/
│   ├── order.module.ts
│   ├── order.controller.ts
│   ├── order.service.ts
│   └── dto/
│       ├── create-order.dto.ts
│       └── query-order.dto.ts
├── review/
│   ├── review.module.ts
│   ├── review.controller.ts
│   ├── review.service.ts
│   └── dto/create-review.dto.ts
└── favorite/
    ├── favorite.module.ts
    ├── favorite.controller.ts
    └── favorite.service.ts
```

### 前端新增/修改
```
apps/mobile/src/
├── screens/
│   ├── CartScreen.tsx           # 新建
│   ├── CheckoutScreen.tsx       # 新建
│   ├── OrderDetailScreen.tsx    # 新建
│   ├── ReviewSubmitScreen.tsx   # 新建
│   └── FavoriteScreen.tsx       # 新建
├── hooks/
│   ├── useCart.ts               # 新建
│   ├── useOrders.ts             # 新建
│   ├── useReviews.ts            # 新建
│   ├── useFavorites.ts          # 新建
│   └── index.ts                 # 修改
├── stores/cartStore.ts          # 新建
├── services/api.ts              # 修改
└── navigation/
    ├── ProfileStack.tsx         # 修改
    └── MainTabs.tsx             # 修改
```

### Shared Types 新增
```
packages/shared/types/
├── cart.ts      # 新建
├── order.ts     # 新建
├── review.ts    # 新建
├── favorite.ts  # 新建
└── index.ts     # 修改
```

---

## 任务 1：Prisma Schema 扩展

**文件：**
- 修改：`apps/server/prisma/schema.prisma`

- [ ] **步骤 1：在 schema.prisma 末尾追加新模型**

在 `@@map("products")` 之后追加：

```prisma
// ============ 购物车 ============

model Cart {
  id        Int      @id @default(autoincrement())
  userId    Int      @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items CartItem[]

  @@map("carts")
}

model CartItem {
  id        Int      @id @default(autoincrement())
  cartId    Int
  productId Int
  quantity  Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  cart    Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product Product  @relation(fields: [productId], references: [id])

  @@unique([cartId, productId])
  @@map("cart_items")
}

// ============ 订单 ============

model Order {
  id             Int      @id @default(autoincrement())
  orderNo        String   @unique @db.VarChar(32)
  userId         Int
  shopId         Int
  status         Int      @default(0)
  totalAmount    Decimal  @db.Decimal(10, 2)
  deliveryFee    Decimal  @default(0) @db.Decimal(10, 2)
  packagingFee   Decimal  @default(0) @db.Decimal(10, 2)
  discountAmount Decimal  @default(0) @db.Decimal(10, 2)
  payAmount      Decimal  @db.Decimal(10, 2)
  payMethod      String?  @db.VarChar(20)
  payTime        DateTime?
  remark         String?  @db.VarChar(200)
  addressSnapshot Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user   User        @relation(fields: [userId], references: [id])
  shop   Shop        @relation(fields: [shopId], references: [id])
  items  OrderItem[]
  review Review?

  @@index([userId])
  @@index([shopId])
  @@index([status])
  @@map("orders")
}

model OrderItem {
  id        Int      @id @default(autoincrement())
  orderId   Int
  productId Int
  name      String   @db.VarChar(100)
  image     String?  @db.VarChar(500)
  price     Decimal  @db.Decimal(10, 2)
  quantity  Int
  specs     String?  @db.VarChar(200)

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@map("order_items")
}

// ============ 评价 ============

model Review {
  id             Int      @id @default(autoincrement())
  orderId        Int      @unique
  userId         Int
  shopId         Int
  rating         Int
  tasteRating    Int?
  packRating     Int?
  deliveryRating Int?
  content        String?  @db.Text
  images         Json?
  tags           Json?
  createdAt      DateTime @default(now())

  order Order @relation(fields: [orderId], references: [id])
  user  User  @relation(fields: [userId], references: [id])
  shop  Shop  @relation(fields: [shopId], references: [id])

  @@index([shopId])
  @@index([userId])
  @@map("reviews")
}

// ============ 收藏 ============

model Favorite {
  id        Int      @id @default(autoincrement())
  userId    Int
  shopId    Int
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  shop Shop @relation(fields: [shopId], references: [id])

  @@unique([userId, shopId])
  @@index([userId])
  @@map("favorites")
}
```

- [ ] **步骤 2：为现有模型添加关系字段**

在 `User` model 的 `addresses Address[]` 后追加：

```prisma
  cart      Cart?
  orders    Order[]
  reviews   Review[]
  favorites Favorite[]
```

在 `Shop` model 的 `products  Product[]` 后追加：

```prisma
  orders    Order[]
  reviews   Review[]
  favorites Favorite[]
```

在 `Product` model 的 `category  Category?  @relation(fields: [categoryId], references: [id])` 后追加：

```prisma
  cartItems CartItem[]
```

- [ ] **步骤 3：运行 prisma generate 和 migrate**

```bash
cd apps/server
npx prisma generate
npx prisma db push
```

预期：无报错，PrismaClient 更新成功

- [ ] **步骤 4：Commit**

```bash
git add apps/server/prisma/schema.prisma
git commit -m "feat: add Cart/Order/Review/Favorite models to Prisma schema"
```

---

## 任务 2：Shared Types

**文件：**
- 创建：`packages/shared/types/cart.ts`
- 创建：`packages/shared/types/order.ts`
- 创建：`packages/shared/types/review.ts`
- 创建：`packages/shared/types/favorite.ts`
- 修改：`packages/shared/types/index.ts`

- [ ] **步骤 1：创建 cart.ts**

```typescript
export interface CartItemProduct {
  id: number;
  name: string;
  price: number;
  image: string | null;
  shopId: number;
  shopName: string;
}

export interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  product: CartItemProduct;
}

export interface CartData {
  items: CartItem[];
  totalAmount: number;
  shopId: number | null;
  shopName: string | null;
}
```

- [ ] **步骤 2：创建 order.ts**

```typescript
export type OrderStatus = 0 | 1 | 2 | 3 | 4 | 5;

export interface OrderItem {
  id: number;
  productId: number;
  name: string;
  image: string | null;
  price: number;
  quantity: number;
  specs: string | null;
}

export interface Order {
  id: number;
  orderNo: string;
  shopId: number;
  shopName: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryFee: number;
  packagingFee: number;
  discountAmount: number;
  payAmount: number;
  payMethod: string | null;
  payTime: string | null;
  remark: string | null;
  addressSnapshot: any;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderListItem {
  id: number;
  orderNo: string;
  shopName: string;
  status: OrderStatus;
  payAmount: number;
  items: Pick<OrderItem, 'name' | 'image' | 'quantity'>[];
  createdAt: string;
}
```

- [ ] **步骤 3：创建 review.ts**

```typescript
export interface Review {
  id: number;
  orderId: number;
  userId: number;
  userNickname: string;
  userAvatar: string | null;
  rating: number;
  tasteRating: number | null;
  packRating: number | null;
  deliveryRating: number | null;
  content: string | null;
  images: string[] | null;
  tags: string[] | null;
  createdAt: string;
}
```

- [ ] **步骤 4：创建 favorite.ts**

```typescript
export interface FavoriteShop {
  id: number;
  shopId: number;
  shopName: string;
  shopImage: string | null;
  rating: number;
  monthlySales: number;
  minOrder: number;
  createdAt: string;
}
```

- [ ] **步骤 5：修改 index.ts 导出**

在 `packages/shared/types/index.ts` 末尾追加：

```typescript
export * from './cart';
export * from './order';
export * from './review';
export * from './favorite';
```

- [ ] **步骤 6：Commit**

```bash
git add packages/shared/types/
git commit -m "feat: add shared types for cart, order, review, favorite"
```

---

## 任务 3：后端 - 购物车模块

**文件：**
- 创建：`apps/server/src/modules/cart/dto/add-cart.dto.ts`
- 创建：`apps/server/src/modules/cart/cart.service.ts`
- 创建：`apps/server/src/modules/cart/cart.controller.ts`
- 创建：`apps/server/src/modules/cart/cart.module.ts`
- 修改：`apps/server/src/app.module.ts`

- [ ] **步骤 1：创建 add-cart.dto.ts**

```typescript
import { IsNumber, IsPositive, Min } from 'class-validator';

export class AddCartDto {
  @IsNumber()
  @IsPositive()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number = 1;
}

export class UpdateCartDto {
  @IsNumber()
  @Min(1)
  quantity: number;
}
```

- [ ] **步骤 2：创建 cart.service.ts**

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
                shopId: true,
                shop: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return { items: [], totalAmount: 0, shopId: null, shopName: null };
    }

    const items = cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        price: Number(item.product.price),
        image: item.product.image,
        shopId: item.product.shopId,
        shopName: item.product.shop.name,
      },
    }));

    const totalAmount = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );

    const firstItem = items[0];

    return {
      items,
      totalAmount: Math.round(totalAmount * 100) / 100,
      shopId: firstItem?.product.shopId ?? null,
      shopName: firstItem?.product.shopName ?? null,
    };
  }

  async addItem(userId: number, productId: number, quantity: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { shop: { select: { id: true, name: true } } },
    });
    if (!product) throw new BadRequestException('商品不存在');

    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: { select: { shopId: true } } } } },
    });

    // 如果购物车有其他商家的商品，清空后重新添加
    if (cart && cart.items.length > 0) {
      const existingShopId = cart.items[0].product.shopId;
      if (existingShopId !== product.shopId) {
        await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      }
    }

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: { items: true },
      });
    }

    const existingItem = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: number, itemId: number, quantity: number) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new BadRequestException('购物车为空');

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new BadRequestException('商品不存在');

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new BadRequestException('购物车为空');

    await this.prisma.cartItem.deleteMany({
      where: { id: itemId, cartId: cart.id },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return { items: [], totalAmount: 0, shopId: null, shopName: null };
  }
}
```

- [ ] **步骤 3：创建 cart.controller.ts**

```typescript
import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { CartService } from './cart.service';
import { AddCartDto, UpdateCartDto } from './dto/add-cart.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser('id') userId: number) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  addItem(@CurrentUser('id') userId: number, @Body() dto: AddCartDto) {
    return this.cartService.addItem(userId, dto.productId, dto.quantity);
  }

  @Patch('items/:id')
  updateItem(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.updateItem(userId, id, dto.quantity);
  }

  @Delete('items/:id')
  removeItem(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cartService.removeItem(userId, id);
  }

  @Delete('clear')
  clearCart(@CurrentUser('id') userId: number) {
    return this.cartService.clearCart(userId);
  }
}
```

- [ ] **步骤 4：创建 cart.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
```

- [ ] **步骤 5：注册到 app.module.ts**

在 `apps/server/src/app.module.ts` 的 `imports` 数组中追加 `CartModule`：

```typescript
import { CartModule } from './modules/cart/cart.module';

// 在 imports 数组中追加：
CartModule,
```

- [ ] **步骤 6：验证编译**

```bash
cd apps/server
npx nest build
```

预期：无 TypeScript 错误

- [ ] **步骤 7：Commit**

```bash
git add apps/server/src/modules/cart/ apps/server/src/app.module.ts
git commit -m "feat: add cart module with CRUD API"
```

---

## 任务 4：后端 - 订单模块

**文件：**
- 创建：`apps/server/src/modules/order/dto/create-order.dto.ts`
- 创建：`apps/server/src/modules/order/dto/query-order.dto.ts`
- 创建：`apps/server/src/modules/order/order.service.ts`
- 创建：`apps/server/src/modules/order/order.controller.ts`
- 创建：`apps/server/src/modules/order/order.module.ts`
- 修改：`apps/server/src/app.module.ts`

- [ ] **步骤 1：创建 create-order.dto.ts**

```typescript
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  addressId: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class PayOrderDto {
  @IsString()
  payMethod: string = '微信支付';
}
```

- [ ] **步骤 2：创建 query-order.dto.ts**

```typescript
import { IsOptional, IsIn, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryOrderDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1, 2])
  status?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit: number = 10;
}
```

- [ ] **步骤 3：创建 order.service.ts**

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  private generateOrderNo(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${date}${rand}`;
  }

  async create(userId: number, addressId: number, remark?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true, name: true, price: true, image: true,
                shopId: true, stock: true,
                shop: { select: { name: true, deliveryFee: true } },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('购物车为空');
    }

    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new BadRequestException('地址不存在');

    const shopId = cart.items[0].product.shopId;
    const shop = cart.items[0].product.shop;

    // 计算金额
    let totalAmount = 0;
    const orderItems = cart.items.map((item) => {
      const price = Number(item.product.price);
      totalAmount += price * item.quantity;
      return {
        productId: item.productId,
        name: item.product.name,
        image: item.product.image,
        price: item.product.price,
        quantity: item.quantity,
      };
    });

    const deliveryFee = Number(shop.deliveryFee);
    const packagingFee = 2; // 固定包装费
    const payAmount = totalAmount + deliveryFee + packagingFee;

    const order = await this.prisma.order.create({
      data: {
        orderNo: this.generateOrderNo(),
        userId,
        shopId,
        status: 0,
        totalAmount,
        deliveryFee,
        packagingFee,
        payAmount,
        remark,
        addressSnapshot: {
          name: address.name,
          phone: address.phone,
          address: `${address.province}${address.city}${address.district}${address.detail}`,
        },
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // 清空购物车
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  }

  async findAll(userId: number, status?: number, page = 1, limit = 10) {
    const where: any = { userId };
    if (status !== undefined) {
      // status 0=待付款, 1=进行中(1,2,3), 2=已完成(4), 5=已取消
      if (status === 1) {
        where.status = { in: [1, 2, 3] };
      } else if (status === 2) {
        where.status = 4;
      } else {
        where.status = status;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: { select: { name: true, image: true, quantity: true } },
          shop: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    const mapped = items.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      shopName: o.shop.name,
      status: o.status,
      payAmount: Number(o.payAmount),
      items: o.items,
      createdAt: o.createdAt.toISOString(),
    }));

    return { items: mapped, total, page, limit };
  }

  async findOne(userId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: true,
        shop: { select: { name: true } },
      },
    });
    if (!order) throw new NotFoundException('订单不存在');

    return {
      ...order,
      shopName: order.shop.name,
      payAmount: Number(order.payAmount),
      totalAmount: Number(order.totalAmount),
      deliveryFee: Number(order.deliveryFee),
      packagingFee: Number(order.packagingFee),
      discountAmount: Number(order.discountAmount),
      items: order.items.map((i) => ({
        ...i,
        price: Number(i.price),
      })),
      createdAt: order.createdAt.toISOString(),
      payTime: order.payTime?.toISOString() ?? null,
    };
  }

  async pay(userId: number, id: number, payMethod: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId, status: 0 },
    });
    if (!order) throw new NotFoundException('订单不存在或状态异常');

    return this.prisma.order.update({
      where: { id },
      data: { status: 1, payMethod, payTime: new Date() },
    });
  }

  async cancel(userId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId, status: 0 },
    });
    if (!order) throw new NotFoundException('订单不存在或状态异常');

    return this.prisma.order.update({
      where: { id },
      data: { status: 5 },
    });
  }

  async confirm(userId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId, status: 3 },
    });
    if (!order) throw new NotFoundException('订单不存在或状态异常');

    return this.prisma.order.update({
      where: { id },
      data: { status: 4 },
    });
  }
}
```

- [ ] **步骤 4：创建 order.controller.ts**

```typescript
import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { OrderService } from './order.service';
import { CreateOrderDto, PayOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@CurrentUser('id') userId: number, @Body() dto: CreateOrderDto) {
    return this.orderService.create(userId, dto.addressId, dto.remark);
  }

  @Get()
  findAll(@CurrentUser('id') userId: number, @Query() query: QueryOrderDto) {
    return this.orderService.findAll(userId, query.status, query.page, query.limit);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOne(userId, id);
  }

  @Patch(':id/pay')
  pay(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayOrderDto,
  ) {
    return this.orderService.pay(userId, id, dto.payMethod);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.cancel(userId, id);
  }

  @Patch(':id/confirm')
  confirm(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.confirm(userId, id);
  }
}
```

- [ ] **步骤 5：创建 order.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
```

- [ ] **步骤 6：注册到 app.module.ts**

在 `app.module.ts` 的 `imports` 数组中追加 `OrderModule`。

- [ ] **步骤 7：验证编译**

```bash
cd apps/server && npx nest build
```

- [ ] **步骤 8：Commit**

```bash
git add apps/server/src/modules/order/ apps/server/src/app.module.ts
git commit -m "feat: add order module with create/list/detail/pay/cancel/confirm APIs"
```

---

## 任务 5：后端 - 评价模块

**文件：**
- 创建：`apps/server/src/modules/review/dto/create-review.dto.ts`
- 创建：`apps/server/src/modules/review/review.service.ts`
- 创建：`apps/server/src/modules/review/review.controller.ts`
- 创建：`apps/server/src/modules/review/review.module.ts`
- 修改：`apps/server/src/app.module.ts`

- [ ] **步骤 1：创建 create-review.dto.ts**

```typescript
import { IsNumber, IsOptional, IsString, IsArray, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsNumber()
  orderId: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  tasteRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  packRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  deliveryRating?: number;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsArray()
  tags?: string[];
}
```

- [ ] **步骤 2：创建 review.service.ts**

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: {
    orderId: number;
    rating: number;
    tasteRating?: number;
    packRating?: number;
    deliveryRating?: number;
    content?: string;
    images?: string[];
    tags?: string[];
  }) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId, status: 4 },
      include: { review: true },
    });
    if (!order) throw new NotFoundException('订单不存在或状态异常');
    if (order.review) throw new BadRequestException('该订单已评价');

    const review = await this.prisma.review.create({
      data: {
        orderId: dto.orderId,
        userId,
        shopId: order.shopId,
        rating: dto.rating,
        tasteRating: dto.tasteRating,
        packRating: dto.packRating,
        deliveryRating: dto.deliveryRating,
        content: dto.content,
        images: dto.images ?? [],
        tags: dto.tags ?? [],
      },
    });

    // 更新商家平均评分
    const avgResult = await this.prisma.review.aggregate({
      where: { shopId: order.shopId },
      _avg: { rating: true },
    });
    const avgRating = avgResult._avg.rating ?? 5;

    await this.prisma.shop.update({
      where: { id: order.shopId },
      data: { rating: Math.round(avgRating * 10) / 10 },
    });

    return review;
  }

  async findByShop(shopId: number, page = 1, limit = 10) {
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { shopId },
        include: { user: { select: { nickname: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where: { shopId } }),
    ]);

    const mapped = items.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      userId: r.userId,
      userNickname: r.user.nickname ?? '匿名用户',
      userAvatar: r.user.avatar,
      rating: r.rating,
      tasteRating: r.tasteRating,
      packRating: r.packRating,
      deliveryRating: r.deliveryRating,
      content: r.content,
      images: r.images as string[] | null,
      tags: r.tags as string[] | null,
      createdAt: r.createdAt.toISOString(),
    }));

    return { items: mapped, total, page, limit };
  }
}
```

- [ ] **步骤 3：创建 review.controller.ts**

```typescript
import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('id') userId: number, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(userId, dto);
  }

  @Get('shop/:id')
  findByShop(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewService.findByShop(id, Number(page) || 1, Number(limit) || 10);
  }
}
```

- [ ] **步骤 4：创建 review.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

@Module({
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
```

- [ ] **步骤 5：注册到 app.module.ts，验证编译，Commit**

```bash
cd apps/server && npx nest build
git add apps/server/src/modules/review/ apps/server/src/app.module.ts
git commit -m "feat: add review module with submit and shop reviews APIs"
```

---

## 任务 6：后端 - 收藏模块

**文件：**
- 创建：`apps/server/src/modules/favorite/favorite.service.ts`
- 创建：`apps/server/src/modules/favorite/favorite.controller.ts`
- 创建：`apps/server/src/modules/favorite/favorite.module.ts`
- 修改：`apps/server/src/app.module.ts`

- [ ] **步骤 1：创建 favorite.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class FavoriteService {
  constructor(private prisma: PrismaService) {}

  async toggle(userId: number, shopId: number) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_shopId: { userId, shopId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await this.prisma.favorite.create({ data: { userId, shopId } });
    return { favorited: true };
  }

  async findAll(userId: number) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        shop: {
          select: {
            id: true, name: true, images: true, rating: true,
            monthlySales: true, minOrder: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f) => ({
      id: f.id,
      shopId: f.shop.id,
      shopName: f.shop.name,
      shopImage: Array.isArray(f.shop.images) ? f.shop.images[0] : null,
      rating: Number(f.shop.rating),
      monthlySales: f.shop.monthlySales,
      minOrder: Number(f.shop.minOrder),
      createdAt: f.createdAt.toISOString(),
    }));
  }

  async check(userId: number, shopId: number) {
    const fav = await this.prisma.favorite.findUnique({
      where: { userId_shopId: { userId, shopId } },
    });
    return { favorited: !!fav };
  }
}
```

- [ ] **步骤 2：创建 favorite.controller.ts**

```typescript
import { Controller, Get, Post, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { FavoriteService } from './favorite.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post(':shopId')
  toggle(@CurrentUser('id') userId: number, @Param('shopId', ParseIntPipe) shopId: number) {
    return this.favoriteService.toggle(userId, shopId);
  }

  @Get()
  findAll(@CurrentUser('id') userId: number) {
    return this.favoriteService.findAll(userId);
  }

  @Get('check/:shopId')
  check(@CurrentUser('id') userId: number, @Param('shopId', ParseIntPipe) shopId: number) {
    return this.favoriteService.check(userId, shopId);
  }
}
```

- [ ] **步骤 3：创建 favorite.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';

@Module({
  controllers: [FavoriteController],
  providers: [FavoriteService],
  exports: [FavoriteService],
})
export class FavoriteModule {}
```

- [ ] **步骤 4：注册到 app.module.ts，验证编译，Commit**

```bash
cd apps/server && npx nest build
git add apps/server/src/modules/favorite/ apps/server/src/app.module.ts
git commit -m "feat: add favorite module with toggle/list/check APIs"
```

---

## 任务 7：前端 - API 定义 & Hooks

**文件：**
- 修改：`apps/mobile/src/services/api.ts`
- 创建：`apps/mobile/src/hooks/useCart.ts`
- 创建：`apps/mobile/src/hooks/useOrders.ts`
- 创建：`apps/mobile/src/hooks/useReviews.ts`
- 创建：`apps/mobile/src/hooks/useFavorites.ts`
- 修改：`apps/mobile/src/hooks/index.ts`

- [ ] **步骤 1：在 api.ts 末尾追加新 API 对象**

```typescript
// ============ 购物车 ============
export const cartApi = {
  get: () => api.get('/cart'),
  addItem: (data: { productId: number; quantity: number }) => api.post('/cart/items', data),
  updateItem: (id: number, quantity: number) => api.patch(`/cart/items/${id}`, { quantity }),
  removeItem: (id: number) => api.delete(`/cart/items/${id}`),
  clear: () => api.delete('/cart/clear'),
};

// ============ 订单 ============
export const orderApi = {
  create: (data: { addressId: number; remark?: string }) => api.post('/orders', data),
  list: (params?: { status?: number; page?: number; limit?: number }) => api.get('/orders', { params }),
  detail: (id: number) => api.get(`/orders/${id}`),
  pay: (id: number, payMethod = '微信支付') => api.patch(`/orders/${id}/pay`, { payMethod }),
  cancel: (id: number) => api.patch(`/orders/${id}/cancel`),
  confirm: (id: number) => api.patch(`/orders/${id}/confirm`),
};

// ============ 评价 ============
export const reviewApi = {
  submit: (data: any) => api.post('/reviews', data),
  shopReviews: (shopId: number, params?: { page?: number; limit?: number }) =>
    api.get(`/reviews/shop/${shopId}`, { params }),
};

// ============ 收藏 ============
export const favoriteApi = {
  toggle: (shopId: number) => api.post(`/favorites/${shopId}`),
  list: () => api.get('/favorites'),
  check: (shopId: number) => api.get(`/favorites/check/${shopId}`),
};
```

- [ ] **步骤 2：创建 useCart.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../services/api';

export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get(),
    staleTime: 30 * 1000,
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { productId: number; quantity: number }) => cartApi.addItem(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) => cartApi.updateItem(id, quantity),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cartApi.removeItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useClearCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.clear(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}
```

- [ ] **步骤 3：创建 useOrders.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../services/api';

export function useOrderList(params?: { status?: number; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => orderApi.list(params),
    staleTime: 30 * 1000,
  });
}

export function useOrderDetail(id: number) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => orderApi.detail(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { addressId: number; remark?: string }) => orderApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function usePayOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payMethod }: { id: number; payMethod?: string }) => orderApi.pay(id, payMethod),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => orderApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useConfirmOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => orderApi.confirm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}
```

- [ ] **步骤 4：创建 useReviews.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../services/api';

export function useShopReviews(shopId: number, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['reviews', 'shop', shopId, params],
    queryFn: () => reviewApi.shopReviews(shopId, params),
    enabled: !!shopId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => reviewApi.submit(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
}
```

- [ ] **步骤 5：创建 useFavorites.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoriteApi } from '../services/api';

export function useFavoriteList() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoriteApi.list(),
    staleTime: 60 * 1000,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shopId: number) => favoriteApi.toggle(shopId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });
}

export function useCheckFavorite(shopId: number) {
  return useQuery({
    queryKey: ['favorites', 'check', shopId],
    queryFn: () => favoriteApi.check(shopId),
    enabled: !!shopId,
  });
}
```

- [ ] **步骤 6：修改 hooks/index.ts 追加导出**

```typescript
export * from './useCart';
export * from './useOrders';
export * from './useReviews';
export * from './useFavorites';
```

- [ ] **步骤 7：Commit**

```bash
git add apps/mobile/src/services/api.ts apps/mobile/src/hooks/
git commit -m "feat: add cart/order/review/favorite API definitions and hooks"
```

---

## 任务 8：前端 - CartScreen

**文件：**
- 创建：`apps/mobile/src/stores/cartStore.ts`
- 创建：`apps/mobile/src/screens/CartScreen.tsx`

- [ ] **步骤 1：创建 cartStore.ts**

```typescript
import { create } from 'zustand';

interface CartStore {
  itemCount: number;
  setItemCount: (count: number) => void;
}

export const useCartStore = create<CartStore>((set) => ({
  itemCount: 0,
  setItemCount: (count) => set({ itemCount: count }),
}));
```

- [ ] **步骤 2：创建 CartScreen.tsx**

```tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from '../hooks';
import { useCartStore } from '../stores/cartStore';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';

export default function CartScreen({ navigation }: any) {
  const { data } = useCart();
  const cart = data?.data;
  const updateMut = useUpdateCartItem();
  const removeMut = useRemoveCartItem();
  const clearMut = useClearCart();
  const setItemCount = useCartStore((s) => s.setItemCount);

  useEffect(() => {
    const count = cart?.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) ?? 0;
    setItemCount(count);
  }, [cart, setItemCount]);

  const items = cart?.items || [];
  const totalAmount = cart?.totalAmount || 0;

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>购物车</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>购物车是空的</Text>
          <TouchableOpacity style={styles.goShopBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.goShopText}>去逛逛</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>购物车</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert('提示', '确定清空购物车？', [
            { text: '取消' },
            { text: '确定', onPress: () => clearMut.mutate() },
          ]);
        }}>
          <Text style={styles.clearText}>清空</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }: any) => (
          <View style={styles.itemCard}>
            <View style={styles.itemImagePlaceholder} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <Text style={styles.itemPrice}>¥{item.product.price}</Text>
            </View>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => {
                  if (item.quantity <= 1) {
                    removeMut.mutate(item.id);
                  } else {
                    updateMut.mutate({ id: item.id, quantity: item.quantity - 1 });
                  }
                }}
              >
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, styles.qtyBtnActive]}
                onPress={() => updateMut.mutate({ id: item.id, quantity: item.quantity + 1 })}
              >
                <Text style={[styles.qtyBtnText, styles.qtyBtnTextActive]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <View style={styles.bottomBar}>
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>合计：</Text>
          <Text style={styles.totalAmount}>¥{totalAmount.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text style={styles.checkoutText}>去结算({items.length})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  clearText: { fontSize: fontSize.sm, color: colors.textSecondary },
  listContent: { padding: spacing.md },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm,
  },
  itemImagePlaceholder: { width: 64, height: 64, borderRadius: borderRadius.sm, backgroundColor: '#F0F0F0' },
  itemInfo: { flex: 1, marginLeft: spacing.md },
  itemName: { fontSize: fontSize.md, fontWeight: '500', color: colors.text },
  itemPrice: { fontSize: fontSize.sm, color: colors.primary, marginTop: spacing.xs },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  qtyBtnText: { fontSize: fontSize.md, color: colors.textSecondary },
  qtyBtnTextActive: { color: '#FFFFFF' },
  qtyText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, minWidth: 20, textAlign: 'center' },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border, ...shadows.sm,
  },
  totalSection: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  totalLabel: { fontSize: fontSize.md, color: colors.text },
  totalAmount: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
  checkoutBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm, borderRadius: borderRadius.full,
  },
  checkoutText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.md },
  goShopBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  goShopText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '600' },
});
```

- [ ] **步骤 3：Commit**

```bash
git add apps/mobile/src/stores/cartStore.ts apps/mobile/src/screens/CartScreen.tsx
git commit -m "feat: add CartScreen with quantity controls and checkout"
```

---

## 任务 9：前端 - CheckoutScreen

**文件：**
- 创建：`apps/mobile/src/screens/CheckoutScreen.tsx`

- [ ] **步骤 1：创建 CheckoutScreen.tsx**

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useCart, useCreateOrder, usePayOrder } from '../hooks';
import { useAddressList } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';

export default function CheckoutScreen({ navigation }: any) {
  const { data: cartData } = useCart();
  const cart = cartData?.data;
  const { data: addrData } = useAddressList();
  const addresses = addrData?.data || [];
  const defaultAddr = addresses.find((a: any) => a.isDefault) || addresses[0];
  const createMut = useCreateOrder();
  const payMut = usePayOrder();
  const [remark, setRemark] = useState('');

  const handleSubmit = () => {
    if (!defaultAddr) {
      Alert.alert('提示', '请先添加收货地址');
      return;
    }
    createMut.mutate(
      { addressId: defaultAddr.id, remark: remark || undefined },
      {
        onSuccess: (res: any) => {
          const order = res.data;
          payMut.mutate(
            { id: order.id },
            {
              onSuccess: () => {
                Alert.alert('提示', '支付成功', [
                  { text: '查看订单', onPress: () => navigation.replace('OrderDetail', { id: order.id }) },
                ]);
              },
            },
          );
        },
      },
    );
  };

  const items = cart?.items || [];
  const totalAmount = cart?.totalAmount || 0;
  const deliveryFee = 5;
  const packagingFee = 2;
  const payAmount = totalAmount + deliveryFee + packagingFee;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>确认订单</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Address */}
        <TouchableOpacity style={styles.addressCard} onPress={() => navigation.navigate('Address')}>
          <Text style={styles.addressIcon}>📍</Text>
          {defaultAddr ? (
            <View style={styles.addressInfo}>
              <Text style={styles.addressName}>{defaultAddr.name}  {defaultAddr.phone}</Text>
              <Text style={styles.addressDetail}>{defaultAddr.province}{defaultAddr.city}{defaultAddr.district}{defaultAddr.detail}</Text>
            </View>
          ) : (
            <Text style={styles.addressEmpty}>请选择收货地址</Text>
          )}
          <Text style={styles.addressArrow}>›</Text>
        </TouchableOpacity>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>商品明细</Text>
          {items.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.product.name} x{item.quantity}</Text>
              <Text style={styles.itemPrice}>¥{(item.product.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Fees */}
        <View style={styles.section}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>商品合计</Text>
            <Text style={styles.feeValue}>¥{totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>配送费</Text>
            <Text style={styles.feeValue}>¥{deliveryFee.toFixed(2)}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>包装费</Text>
            <Text style={styles.feeValue}>¥{packagingFee.toFixed(2)}</Text>
          </View>
        </View>

        {/* Remark */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>备注</Text>
          <TextInput
            style={styles.remarkInput}
            placeholder="如：不要辣、少放盐等"
            value={remark}
            onChangeText={setRemark}
            maxLength={200}
          />
        </View>
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottomBar}>
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>合计：</Text>
          <Text style={styles.totalAmount}>¥{payAmount.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>提交订单</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, height: 56, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backText: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  content: { flex: 1, padding: spacing.md },
  addressCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  addressIcon: { fontSize: 20, marginRight: spacing.sm },
  addressInfo: { flex: 1 },
  addressName: { fontSize: fontSize.md, fontWeight: '500', color: colors.text },
  addressDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  addressEmpty: { flex: 1, fontSize: fontSize.md, color: colors.textSecondary },
  addressArrow: { fontSize: 24, color: colors.textLight },
  section: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs,
  },
  itemName: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  itemPrice: { fontSize: fontSize.sm, color: colors.text },
  feeRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs,
  },
  feeLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  feeValue: { fontSize: fontSize.sm, color: colors.text },
  remarkInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    padding: spacing.sm, fontSize: fontSize.sm, minHeight: 60,
  },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border, ...shadows.sm,
  },
  totalSection: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  totalLabel: { fontSize: fontSize.md, color: colors.text },
  totalAmount: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
  submitBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md, borderRadius: borderRadius.full,
  },
  submitText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '600' },
});
```

- [ ] **步骤 2：Commit**

```bash
git add apps/mobile/src/screens/CheckoutScreen.tsx
git commit -m "feat: add CheckoutScreen with address, items, fees, and submit"
```

---

## 任务 10：前端 - OrderDetailScreen

**文件：**
- 创建：`apps/mobile/src/screens/OrderDetailScreen.tsx`

- [ ] **步骤 1：创建 OrderDetailScreen.tsx**

```tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useOrderDetail, usePayOrder, useCancelOrder, useConfirmOrder } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';
import type { OrderStatus } from '@economic/shared';

const STATUS_MAP: Record<OrderStatus, { text: string; color: string }> = {
  0: { text: '待付款', color: '#FF9800' },
  1: { text: '已付款', color: colors.primary },
  2: { text: '制作中', color: colors.primary },
  3: { text: '配送中', color: colors.primary },
  4: { text: '已完成', color: '#4CAF50' },
  5: { text: '已取消', color: colors.textSecondary },
};

export default function OrderDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { data } = useOrderDetail(id);
  const order = data?.data;
  const payMut = usePayOrder();
  const cancelMut = useCancelOrder();
  const confirmMut = useConfirmOrder();

  if (!order) return null;

  const statusInfo = STATUS_MAP[order.status as OrderStatus] || STATUS_MAP[0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>订单详情</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: statusInfo.color }]}>
          <Text style={styles.statusText}>{statusInfo.text}</Text>
          {order.status === 3 && <Text style={styles.statusSub}>预计 30 分钟内送达</Text>}
        </View>

        {/* Address */}
        {order.addressSnapshot && (
          <View style={styles.section}>
            <Text style={styles.addressText}>
              📍 {order.addressSnapshot.name} {order.addressSnapshot.phone}
            </Text>
            <Text style={styles.addressDetail}>{order.addressSnapshot.address}</Text>
          </View>
        )}

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>商品明细</Text>
          {order.items.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name} x{item.quantity}</Text>
              <Text style={styles.itemPrice}>¥{(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>订单编号</Text>
            <Text style={styles.infoValue}>{order.orderNo}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>下单时间</Text>
            <Text style={styles.infoValue}>{order.createdAt?.slice(0, 16).replace('T', ' ')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>支付方式</Text>
            <Text style={styles.infoValue}>{order.payMethod || '未支付'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { fontWeight: '600' }]}>实付金额</Text>
            <Text style={styles.payAmount}>¥{order.payAmount?.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        {order.status === 0 && (
          <>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => {
              Alert.alert('提示', '确定取消订单？', [
                { text: '否' }, { text: '是', onPress: () => cancelMut.mutate(order.id) },
              ]);
            }}>
              <Text style={styles.outlineBtnText}>取消订单</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => payMut.mutate({ id: order.id })}>
              <Text style={styles.primaryBtnText}>去支付</Text>
            </TouchableOpacity>
          </>
        )}
        {order.status === 3 && (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => {
            Alert.alert('提示', '确认已收到商品？', [
              { text: '否' }, { text: '是', onPress: () => confirmMut.mutate(order.id) },
            ]);
          }}>
            <Text style={styles.primaryBtnText}>确认收货</Text>
          </TouchableOpacity>
        )}
        {order.status === 4 && (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('ReviewSubmit', { orderId: order.id, order })}>
            <Text style={styles.primaryBtnText}>评价</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, height: 56, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backText: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  content: { flex: 1, padding: spacing.md },
  statusCard: {
    borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.md,
  },
  statusText: { fontSize: fontSize.xl, fontWeight: '600', color: '#FFFFFF' },
  statusSub: { fontSize: fontSize.sm, color: '#FFFFFFCC', marginTop: spacing.xs },
  section: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  addressText: { fontSize: fontSize.md, color: colors.text },
  addressDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  itemName: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  itemPrice: { fontSize: fontSize.sm, color: colors.text },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { fontSize: fontSize.sm, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  payAmount: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary },
  bottomBar: {
    flexDirection: 'row', backgroundColor: colors.surface, paddingHorizontal: spacing.md,
    paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm,
  },
  outlineBtn: {
    flex: 1, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  outlineBtnText: { fontSize: fontSize.md, fontWeight: '500', color: colors.primary },
  primaryBtn: {
    flex: 1, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: fontSize.md, fontWeight: '500', color: '#FFFFFF' },
});
```

- [ ] **步骤 2：Commit**

```bash
git add apps/mobile/src/screens/OrderDetailScreen.tsx
git commit -m "feat: add OrderDetailScreen with status card and actions"
```

---

## 任务 11：前端 - ReviewSubmitScreen

**文件：**
- 创建：`apps/mobile/src/screens/ReviewSubmitScreen.tsx`

- [ ] **步骤 1：创建 ReviewSubmitScreen.tsx**

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useSubmitReview } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';

const QUICK_TAGS = ['味道好', '分量足', '配送快', '包装好', '性价比高'];

export default function ReviewSubmitScreen({ route, navigation }: any) {
  const { orderId, order } = route.params;
  const [rating, setRating] = useState(5);
  const [tasteRating, setTasteRating] = useState(4);
  const [packRating, setPackRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(4);
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['味道好']);
  const submitMut = useSubmitReview();

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = () => {
    submitMut.mutate(
      {
        orderId,
        rating,
        tasteRating,
        packRating,
        deliveryRating,
        content,
        tags: selectedTags,
      },
      {
        onSuccess: () => {
          Alert.alert('提示', '评价成功');
          navigation.goBack();
        },
      },
    );
  };

  const StarRow = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)}>
          <Text style={[styles.star, s <= value ? styles.starActive : styles.starInactive]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>评价订单</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Overall Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>请为本次服务打分</Text>
          <StarRow value={rating} onChange={setRating} />
          <Text style={styles.ratingText}>{rating >= 4 ? '满意' : rating >= 3 ? '一般' : '不满意'}</Text>
        </View>

        {/* Dimension Ratings */}
        <View style={styles.section}>
          <View style={styles.dimRow}>
            <Text style={styles.dimLabel}>口味</Text>
            <StarRow value={tasteRating} onChange={setTasteRating} />
          </View>
          <View style={styles.dimRow}>
            <Text style={styles.dimLabel}>包装</Text>
            <StarRow value={packRating} onChange={setPackRating} />
          </View>
          <View style={styles.dimRow}>
            <Text style={styles.dimLabel}>配送</Text>
            <StarRow value={deliveryRating} onChange={setDeliveryRating} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>评价内容</Text>
          <TextInput
            style={styles.textInput}
            placeholder="分享你的用餐体验..."
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={500}
          />
        </View>

        {/* Quick Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>快速标签</Text>
          <View style={styles.tagRow}>
            {QUICK_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>提交评价</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, height: 56, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backText: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  content: { flex: 1, padding: spacing.md },
  section: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  starRow: { flexDirection: 'row', gap: spacing.sm },
  star: { fontSize: 32 },
  starActive: { color: '#FFC107' },
  starInactive: { color: '#E5E5E5' },
  ratingText: { fontSize: fontSize.sm, color: colors.primary, marginTop: spacing.xs },
  dimRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
  dimLabel: { fontSize: fontSize.md, color: colors.text },
  textInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    padding: spacing.md, fontSize: fontSize.sm, minHeight: 100, textAlignVertical: 'top',
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, backgroundColor: '#F5F5F5',
  },
  tagActive: { backgroundColor: '#FFF3E0' },
  tagText: { fontSize: fontSize.sm, color: colors.textSecondary },
  tagTextActive: { color: colors.primary },
  bottomBar: {
    backgroundColor: colors.surface, paddingHorizontal: spacing.md,
    paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  submitBtn: {
    height: 48, borderRadius: 24, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  submitText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '600' },
});
```

- [ ] **步骤 2：Commit**

```bash
git add apps/mobile/src/screens/ReviewSubmitScreen.tsx
git commit -m "feat: add ReviewSubmitScreen with star ratings and quick tags"
```

---

## 任务 12：前端 - FavoriteScreen

**文件：**
- 创建：`apps/mobile/src/screens/FavoriteScreen.tsx`

- [ ] **步骤 1：创建 FavoriteScreen.tsx**

```tsx
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFavoriteList, useToggleFavorite } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';

export default function FavoriteScreen({ navigation }: any) {
  const { data } = useFavoriteList();
  const favorites = data?.data || [];
  const toggleMut = useToggleFavorite();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的收藏</Text>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }: any) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ShopDetail', { id: item.shopId })}
          >
            <View style={styles.cardImage} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.shopName}</Text>
              <Text style={styles.cardMeta}>⭐{item.rating.toFixed(1)}  月售{item.monthlySales}</Text>
              <Text style={styles.cardMeta}>¥{item.minOrder}起送</Text>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => {
                Alert.alert('提示', '取消收藏？', [
                  { text: '否' },
                  { text: '是', onPress: () => toggleMut.mutate(item.shopId) },
                ]);
              }}
            >
              <Text style={styles.removeBtnText}>取消</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无收藏</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  listContent: { padding: spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm,
  },
  cardImage: { width: 64, height: 64, borderRadius: borderRadius.sm, backgroundColor: '#F0F0F0' },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  cardName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  removeBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  removeBtnText: { fontSize: fontSize.sm, color: colors.textSecondary },
  emptyContainer: { alignItems: 'center', marginTop: spacing.xl * 2 },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary },
});
```

- [ ] **步骤 2：Commit**

```bash
git add apps/mobile/src/screens/FavoriteScreen.tsx
git commit -m "feat: add FavoriteScreen with shop list and remove"
```

---

## 任务 13：前端 - 导航整合

**文件：**
- 修改：`apps/mobile/src/navigation/ProfileStack.tsx`
- 修改：`apps/mobile/src/navigation/MainTabs.tsx`

- [ ] **步骤 1：在 ProfileStack.tsx 添加新页面**

在 ProfileStack 中追加以下 Screen：

```tsx
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import ReviewSubmitScreen from '../screens/ReviewSubmitScreen';
import FavoriteScreen from '../screens/FavoriteScreen';

// 在 Stack.Navigator 中追加：
<Stack.Screen name="Cart" component={CartScreen} />
<Stack.Screen name="Checkout" component={CheckoutScreen} />
<Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
<Stack.Screen name="ReviewSubmit" component={ReviewSubmitScreen} />
<Stack.Screen name="Favorite" component={FavoriteScreen} />
```

- [ ] **步骤 2：验证编译**

```bash
cd apps/mobile && npx tsc --noEmit
```

预期：无 TypeScript 错误

- [ ] **步骤 3：Commit**

```bash
git add apps/mobile/src/navigation/
git commit -m "feat: register Cart/Checkout/OrderDetail/ReviewSubmit/Favorite in navigation"
```

---

## 自检完成

所有 13 个任务已定义，覆盖：

- **Prisma Schema** — 6 个新模型 + 3 个模型关系扩展
- **Shared Types** — 4 个新文件 + barrel export
- **后端 4 个模块** — cart/order/review/favorite，每个含 module/controller/service/dto
- **前端 5 个页面** — CartScreen/CheckoutScreen/OrderDetailScreen/ReviewSubmitScreen/FavoriteScreen
- **前端 hooks** — useCart/useOrders/useReviews/useFavorites + cartStore
- **API 定义** — cartApi/orderApi/reviewApi/favoriteApi
- **导航** — ProfileStack 新增 5 个页面
