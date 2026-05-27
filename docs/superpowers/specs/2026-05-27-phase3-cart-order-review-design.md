# Phase 3：购物车、订单、评价、收藏 - 设计规格说明

> 日期：2026-05-27
> 项目类型：个人学习项目
> 范围：购物车、下单流程、订单管理、评价系统、收藏功能

---

## 1. 概述

Phase 3 为 App 实现完整的交易闭环：购物车管理 → 下单结算 → 订单跟踪 → 评价反馈，以及商家收藏功能。

### 1.1 不包含

- 支付网关对接（学习项目使用模拟支付）
- 优惠券/红包系统（YAGNI）
- 骑手实时追踪（超出范围）
- AI 助手（Phase 4）

---

## 2. Prisma Schema 新增

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
  id            Int      @id @default(autoincrement())
  orderNo       String   @unique @db.VarChar(32)
  userId        Int
  shopId        Int
  status        Int      @default(0)  // 0待付款 1已付款/待接单 2制作中 3配送中 4已完成 5已取消
  totalAmount   Decimal  @db.Decimal(10, 2)
  deliveryFee   Decimal  @default(0) @db.Decimal(10, 2)
  packagingFee  Decimal  @default(0) @db.Decimal(10, 2)
  discountAmount Decimal @default(0) @db.Decimal(10, 2)
  payAmount     Decimal  @db.Decimal(10, 2)
  payMethod     String?  @db.VarChar(20)
  payTime       DateTime?
  remark        String?  @db.VarChar(200)
  addressSnapshot Json?  // 下单时地址快照
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user  User        @relation(fields: [userId], references: [id])
  shop  Shop        @relation(fields: [shopId], references: [id])
  items OrderItem[]
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
  id          Int      @id @default(autoincrement())
  orderId     Int      @unique
  userId      Int
  shopId      Int
  rating      Int      // 1-5 总评
  tasteRating Int?     // 口味
  packRating  Int?     // 包装
  deliveryRating Int?  // 配送
  content     String?  @db.Text
  images      Json?
  tags        Json?
  createdAt   DateTime @default(now())

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

**Shop model 新增关系：**

```prisma
model Shop {
  // ... 现有字段 ...
  orders   Order[]
  reviews  Review[]
  favorites Favorite[]
}
```

**User model 新增关系：**

```prisma
model User {
  // ... 现有字段 ...
  cart      Cart?
  orders    Order[]
  reviews   Review[]
  favorites Favorite[]
}
```

**Product model 新增关系：**

```prisma
model Product {
  // ... 现有字段 ...
  cartItems  CartItem[]
}
```

---

## 3. 后端 API

### 3.1 购物车模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/cart` | 获取购物车（含商品详情、商家信息） |
| POST | `/api/v1/cart/items` | 添加商品到购物车 |
| PATCH | `/api/v1/cart/items/:id` | 更新数量 |
| DELETE | `/api/v1/cart/items/:id` | 删除单品 |
| DELETE | `/api/v1/cart/clear` | 清空购物车 |

**添加商品请求体：**

```json
{
  "productId": 1,
  "quantity": 1
}
```

**购物车响应：**

```json
{
  "items": [
    {
      "id": 1,
      "productId": 1,
      "quantity": 2,
      "product": {
        "id": 1,
        "name": "黄焖鸡米饭",
        "price": 25.00,
        "image": "...",
        "shopId": 10,
        "shopName": "张记黄焖鸡"
      }
    }
  ],
  "totalAmount": 50.00,
  "shopId": 10,
  "shopName": "张记黄焖鸡"
}
```

**关键约束：** 购物车只允许同一商家的商品。添加不同商家商品时，提示"已清空购物车中其他商家商品"或拒绝添加。

### 3.2 订单模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/orders` | 创建订单（从购物车结算） |
| GET | `/api/v1/orders` | 订单列表（支持状态筛选） |
| GET | `/api/v1/orders/:id` | 订单详情 |
| PATCH | `/api/v1/orders/:id/pay` | 模拟支付 |
| PATCH | `/api/v1/orders/:id/cancel` | 取消订单 |
| PATCH | `/api/v1/orders/:id/confirm` | 确认收货 |

**创建订单请求体：**

```json
{
  "addressId": 1,
  "remark": "不要辣",
  "couponId": null
}
```

**订单状态流转：**

```
待付款(0) → 已付款(1) → 制作中(2) → 配送中(3) → 已完成(4)
    ↓
  已取消(5)
```

**订单列表查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| status | number | 状态筛选：0待付款/1进行中/2已完成/不传=全部 |
| page | number | 页码 |
| limit | number | 每页数量 |

### 3.3 评价模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/reviews` | 提交评价 |
| GET | `/api/v1/shops/:id/reviews` | 商家评价列表 |

**提交评价请求体：**

```json
{
  "orderId": 1,
  "rating": 5,
  "tasteRating": 4,
  "packRating": 5,
  "deliveryRating": 4,
  "content": "味道不错",
  "images": [],
  "tags": ["味道好", "分量足"]
}
```

**约束：** 一个订单只能评价一次，评价后更新商家平均评分。

### 3.4 收藏模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/favorites/:shopId` | 收藏/取消收藏（toggle） |
| GET | `/api/v1/favorites` | 收藏列表 |

---

## 4. 前端页面

### 4.1 购物车 (CartScreen)

**布局：** 参考 Pencil 设计 `Screen/Cart`

```
┌─────────────────────────┐
│  状态栏                  │
├─────────────────────────┤
│       购物车             │
├─────────────────────────┤
│  🏪 张记黄焖鸡           │
│  ☑ 🖼 黄焖鸡米饭  ¥25   │
│              [- 2 +]    │
│  ☑ 🖼 可乐       ¥8     │
│              [- 1 +]    │
├─────────────────────────┤
│  ☑全选  合计：¥58  去结算 │
└─────────────────────────┘
```

**功能：**
- 按商家分组显示
- 单选/全选
- 数量加减（最小1，最大库存）
- 左滑删除
- 底部结算栏：全选、合计金额、去结算按钮
- 空购物车状态

### 4.2 确认订单 (CheckoutScreen)

**布局：** 参考 Pencil 设计 `Screen/Checkout`

```
┌─────────────────────────┐
│  状态栏                  │
├─────────────────────────┤
│  ← 确认订单              │
├─────────────────────────┤
│  📍 张三 138****8888     │
│     北京市朝阳区...  >    │
├─────────────────────────┤
│  🏪 张记黄焖鸡           │
│  🖼 黄焖鸡米饭 x2  ¥50   │
│  🖼 可乐 x1        ¥8    │
├─────────────────────────┤
│  商品合计     ¥58.00     │
│  配送费       ¥5.00      │
│  包装费       ¥2.00      │
│  ─────────────────       │
│  备注   不要辣 | 少放盐   │
├─────────────────────────┤
│  合计：¥65.00  [提交订单] │
│  已优惠 ¥3.00            │
└─────────────────────────┘
```

**功能：**
- 显示收货地址（默认地址，可点击切换）
- 显示订单商品明细
- 费用明细（商品合计、配送费、包装费、优惠）
- 备注输入
- 提交订单 → 跳转支付（模拟）
- 支付成功 → 跳转订单详情

### 4.3 订单详情 (OrderDetailScreen)

**布局：** 参考 Pencil 设计 `Screen/OrderDetail`

```
┌─────────────────────────┐
│  状态栏                  │
├─────────────────────────┤
│  ← 订单详情              │
├─────────────────────────┤
│  ┌─────────────────┐    │
│  │ 🕐 配送中        │    │
│  │ 预计 12:30 送达   │    │
│  │ ████████░░ 60%   │    │
│  └─────────────────┘    │
├─────────────────────────┤
│  📍 张三 138****8888     │
│     北京市朝阳区...       │
├─────────────────────────┤
│  🏪 张记黄焖鸡           │
│  🖼 黄焖鸡米饭 x2  ¥50   │
│  🖼 可乐 x1        ¥8    │
├─────────────────────────┤
│  订单编号  20260527...   │
│  下单时间  2026-05-27    │
│  支付方式  微信支付       │
│  ─────────────────       │
│  实付金额      ¥65.00    │
├─────────────────────────┤
│  [联系商家]  [确认收货]   │
└─────────────────────────┘
```

**功能：**
- 顶部状态卡片（颜色随状态变化）
- 配送进度条
- 收货地址
- 商品明细
- 订单信息（编号、时间、支付方式）
- 底部操作按钮（根据状态显示不同操作）

**状态对应操作：**

| 状态 | 底部按钮 |
|------|---------|
| 待付款(0) | [取消订单] [去支付] |
| 已付款/制作中(1,2) | [联系商家] |
| 配送中(3) | [联系商家] [确认收货] |
| 已完成(4) | [再次购买] [评价] |
| 已取消(5) | [删除订单] |

### 4.4 评价提交 (ReviewSubmitScreen)

**布局：** 参考 Pencil 设计 `Screen/ReviewSubmit`

```
┌─────────────────────────┐
│  状态栏                  │
├─────────────────────────┤
│  ← 评价订单              │
├─────────────────────────┤
│  🖼 张记黄焖鸡           │
│     黄焖鸡米饭x2·可乐x1  │
├─────────────────────────┤
│  请为本次服务打分         │
│  ⭐⭐⭐⭐☆ 满意           │
├─────────────────────────┤
│  口味  ⭐⭐⭐⭐☆          │
│  包装  ⭐⭐⭐⭐⭐          │
│  配送  ⭐⭐⭐☆☆          │
├─────────────────────────┤
│  评价内容                 │
│  ┌─────────────────┐    │
│  │ 味道不错...      │    │
│  └─────────────────┘    │
│  📷                     │
├─────────────────────────┤
│  快速标签                │
│  [味道好] [分量足]       │
│  [配送快] [包装好]       │
├─────────────────────────┤
│  [提交评价]              │
└─────────────────────────┘
```

**功能：**
- 总评星级（1-5）
- 分项评分（口味、包装、配送）
- 文字输入
- 图片上传（最多9张）
- 快速标签选择
- 提交后跳转订单详情

### 4.5 收藏 (FavoriteScreen)

**布局：** 参考 Pencil 设计 `Screen/Favorite`

```
┌─────────────────────────┐
│  状态栏                  │
├─────────────────────────┤
│       我的收藏           │
├─────────────────────────┤
│  ┌────┬──────────────┐  │
│  │ 图 │ 商家名       │  │
│  │ 片 │ ⭐4.8 月售999│  │
│  │    │ ¥15起送      │  │
│  └────┴──────────────┘  │
│  ┌────┬──────────────┐  │
│  │ 图 │ 商家名       │  │
│  │ 片 │ ⭐4.6 月售500│  │
│  │    │ ¥20起送      │  │
│  └────┴──────────────┘  │
└─────────────────────────┘
```

**功能：**
- 收藏商家列表
- 点击跳转商家详情
- 左滑取消收藏
- 空状态提示

---

## 5. Shared Types 新增

```typescript
// packages/shared/types/cart.ts

export interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: number;
    image: string | null;
    shopId: number;
    shopName: string;
  };
}

export interface CartData {
  items: CartItem[];
  totalAmount: number;
  shopId: number | null;
  shopName: string | null;
}
```

```typescript
// packages/shared/types/order.ts

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

```typescript
// packages/shared/types/review.ts

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

```typescript
// packages/shared/types/favorite.ts

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

---

## 6. 前端 Hooks & Stores

### 6.1 Hooks 新增

```typescript
// hooks/useCart.ts
useCart()           // 获取购物车
useAddToCart()      // 添加商品（mutation）
useUpdateCartItem() // 更新数量（mutation）
useRemoveCartItem() // 删除单品（mutation）
useClearCart()      // 清空购物车（mutation）

// hooks/useOrders.ts
useOrderList(params) // 订单列表（支持状态筛选）
useOrderDetail(id)   // 订单详情
useCreateOrder()     // 创建订单（mutation）
usePayOrder()        // 模拟支付（mutation）
useCancelOrder()     // 取消订单（mutation）
useConfirmOrder()    // 确认收货（mutation）

// hooks/useReviews.ts
useShopReviews(shopId) // 商家评价列表
useSubmitReview()      // 提交评价（mutation）

// hooks/useFavorites.ts
useFavoriteList()     // 收藏列表
useToggleFavorite()   // 收藏/取消（mutation）
```

### 6.2 Store 新增

```typescript
// stores/cartStore.ts
// 本地购物车状态（可选，用于乐观更新）
interface CartStore {
  itemCount: number;       // 购物车商品数量（Tab 角标）
  updateItemCount: () => void;
}
```

---

## 7. 导航结构变更

```typescript
// navigation/ProfileStack.tsx 新增
ProfileStack.Screen: Favorite      // 收藏列表
ProfileStack.Screen: OrderDetail   // 订单详情（从订单列表跳转）
ProfileStack.Screen: ReviewSubmit  // 评价提交（从订单详情跳转）

// navigation/MainTabs.tsx
// 订单 Tab 角标：显示待付款订单数量
```

---

## 8. 文件结构

### 后端新增

```
apps/server/src/modules/
├── cart/
│   ├── cart.module.ts
│   ├── cart.controller.ts
│   ├── cart.service.ts
│   └── dto/
│       └── add-cart.dto.ts
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
│   └── dto/
│       └── create-review.dto.ts
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
│   └── index.ts                 # 修改：导出新 hooks
├── stores/
│   └── cartStore.ts             # 新建
├── services/
│   └── api.ts                   # 修改：添加 cart/order/review/favorite API
└── navigation/
    ├── ProfileStack.tsx         # 修改：添加收藏、订单详情、评价页
    └── MainTabs.tsx             # 修改：订单 Tab 角标
```

### Shared Types 新增

```
packages/shared/types/
├── cart.ts          # 新建
├── order.ts         # 新建
├── review.ts        # 新建
├── favorite.ts      # 新建
└── index.ts         # 修改：导出新 types
```

---

## 9. Pencil 设计对照

| 页面 | Pencil 节点 | 状态 |
|------|------------|------|
| CartScreen | Screen/Cart (DTINu) | ✅ 已创建 |
| CheckoutScreen | Screen/Checkout (sKYWI) | ✅ 已创建 |
| OrderDetailScreen | Screen/OrderDetail (t6Bqk) | ✅ 已创建 |
| ReviewSubmitScreen | Screen/ReviewSubmit (syL6B) | ✅ 已创建 |
| FavoriteScreen | Screen/Favorite (ctMl9) | ✅ 已有 |
| OrderListScreen | Screen/Order (Waz78) | ✅ 已有 |

---

## 10. 实现顺序

1. **Prisma Schema** — 新增 Cart/CartItem/Order/OrderItem/Review/Favorite 模型
2. **Shared Types** — 新增 cart.ts/order.ts/review.ts/favorite.ts
3. **后端：购物车模块** — CRUD + 单商家约束
4. **后端：订单模块** — 创建/列表/详情/支付/取消/确认
5. **后端：评价模块** — 提交评价 + 商家评分更新
6. **后端：收藏模块** — toggle 收藏 + 列表
7. **前端：API & Hooks** — 所有新 API 和 hooks
8. **前端：购物车页面** — CartScreen + cartStore
9. **前端：下单流程** — CheckoutScreen + 模拟支付
10. **前端：订单管理** — OrderDetailScreen + 状态操作
11. **前端：评价系统** — ReviewSubmitScreen
12. **前端：收藏功能** — FavoriteScreen + Tab 角标
13. **导航整合** — 新页面注册到 Stack Navigator
