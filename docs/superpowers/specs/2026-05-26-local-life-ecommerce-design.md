# 本地生活服务电商 App - 设计规格说明

> 日期：2026-05-26
> 项目类型：个人学习项目
> 目标：构建一个类似美团/饿了么的本地生活服务跨平台 App

---

## 1. 项目概述

### 1.1 项目定位

本地生活服务电商 App，聚焦用户端，涵盖浏览搜索、下单支付、订单评价、用户中心、AI 智能对话助手和高德地图等核心功能。

### 1.2 项目范围

- **前端**：React Native (Bare) 用户 App，覆盖 Android 平台
- **后端**：NestJS API 服务
- **数据库**：MySQL 8.0 (已安装，via phpstudy_pro)
- **不包含**：商家端 App、骑手端 App、Web 管理后台（可后续扩展）

### 1.3 开发环境

| 组件 | 版本 |
|------|------|
| OS | Windows 11 Home China (Build 26200) |
| CPU | AMD Ryzen 7 5800H (8核16线程) |
| RAM | 16GB |
| Storage | 1TB + 512GB SSD |
| Node.js | v24.13.0 |
| npm | 11.12.1 |
| pnpm | 10.33.3 |
| Java | OpenJDK 17.0.19 (Temurin) |
| Python | 3.13.7 |
| Git | 2.53.0 |
| Android SDK | API 36/37, Build Tools 35-37 |
| NDK | 27.0, 27.1, 30.0 |
| Android Emulator | Pixel 7 AVD |
| MySQL | 8.0.12 (phpstudy_pro) |
| Redis | 5.0.14.1 |
| Docker | 29.4.3 |
| TypeScript | 5.9.3 |

---

## 2. 技术架构

### 2.1 整体架构

```
┌──────────────────────────────────────────────┐
│                React Native App              │
│  (Bare RN 0.76+ / React Navigation 7)       │
│  状态管理: Zustand / TanStack Query          │
│  地图: react-native-amap3d                   │
└──────────────┬───────────────────────────────┘
               │ HTTP / SSE
               ▼
┌──────────────────────────────────────────────┐
│              NestJS API Server               │
│  认证: JWT (access + refresh token)          │
│  AI: @anthropic-ai/sdk (Claude API)          │
│  ORM: Prisma                                 │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│            MySQL 8.0 + Redis 5.0            │
│  主存储: MySQL (结构化数据 + 空间索引)        │
│  缓存/会话: Redis (可选)                     │
└──────────────────────────────────────────────┘
```

### 2.2 项目结构 (Monorepo)

```
economic/
├── apps/
│   ├── mobile/              # React Native App
│   │   ├── src/
│   │   │   ├── app/         # 页面（按功能模块划分）
│   │   │   ├── components/  # 通用组件
│   │   │   ├── hooks/       # 自定义 Hooks
│   │   │   ├── services/    # API 请求层
│   │   │   ├── stores/      # Zustand 状态管理
│   │   │   ├── utils/       # 工具函数
│   │   │   ├── navigation/  # React Navigation 配置
│   │   │   └── theme/       # 主题/样式系统
│   │   └── android/
│   └── server/              # NestJS 后端
│       ├── src/
│       │   ├── modules/     # 业务模块
│       │   ├── common/      # 公共模块
│       │   ├── config/      # 配置
│       │   └── prisma/      # Prisma schema & migrations
│       └── test/
├── packages/
│   └── shared/              # 前后端共享类型定义
│       └── types/
├── docs/
└── package.json             # pnpm workspace 根配置
```

### 2.3 包管理

- **pnpm workspace**：monorepo 管理
- 根 `package.json` 配置 `workspaces: ["apps/*", "packages/*"]`
- 共享 `packages/shared/types` 中的 TypeScript 接口

---

## 3. 前端设计 (React Native)

### 3.1 技术栈

| 层级 | 选型 | 版本 | 理由 |
|------|------|------|------|
| 框架 | Bare React Native | 0.76+ | 完全控制原生层 |
| 导航 | React Navigation | 7.x | RN 生态标准 |
| 状态管理 | Zustand | 5.x | 轻量、无 boilerplate |
| 数据请求 | TanStack Query | 5.x | 服务端状态管理（缓存、重试） |
| HTTP 客户端 | Axios | 1.x | 拦截器、请求取消 |
| 表单 | React Hook Form | 7.x | 表单性能 |
| 校验 | Zod | 3.x | 类型安全验证 |
| 本地存储 | react-native-mmkv | 3.x | 高性能键值存储 |
| 动画 | react-native-reanimated | 3.x | 原生线程动画 |
| 地图 | react-native-amap3d | - | 高德地图原生 SDK |
| 图标 | react-native-vector-icons | 10.x | 丰富图标库 |

### 3.2 页面结构

#### 底部 Tab 导航 (5 个 Tab)

```
BottomTabs
├── 首页 Tab (HomeStack)
│   ├── HomeScreen              # 首页（搜索栏、轮播、分类入口、推荐商家列表）
│   ├── SearchScreen            # 搜索（搜索历史、热词、实时搜索结果）
│   ├── CategoryScreen          # 分类浏览（左侧分类 + 右侧商家/商品列表）
│   └── ShopDetailScreen        # 商家详情（头部信息、菜单/商品列表、评价 Tab、地图位置）
│       └── ProductDetailScreen # 商品详情（大图、规格、加购）
│
├── 地图 Tab (MapStack)
│   ├── MapScreen               # 全屏地图 + 附近商家 Marker + 底部商家卡片
│   └── ShopDetailScreen        # 复用商家详情页
│
├── 订单 Tab (OrderStack)
│   ├── OrderListScreen         # 订单列表（Tab 切换: 全部/待付款/进行中/已完成）
│   ├── OrderDetailScreen       # 订单详情（状态时间线、商品明细、操作按钮）
│   └── ReviewScreen            # 发表评价（评分、文字、图片）
│
├── AI 助手 Tab (AIStack)
│   ├── AIChatScreen            # AI 对话界面（消息气泡、流式输入、快捷问题）
│   └── AIShopResultScreen      # AI 推荐的商家/商品结果页
│
└── 我的 Tab (ProfileStack)
    ├── ProfileScreen           # 个人中心（头像、昵称、订单快捷入口、功能列表）
    ├── EditProfileScreen       # 编辑资料
    ├── AddressListScreen       # 地址列表
    ├── AddressEditScreen       # 新增/编辑地址（地图选点）
    ├── FavoriteScreen          # 收藏列表
    ├── HistoryScreen           # 浏览历史
    ├── SettingsScreen          # 设置（清除缓存、关于）
    ├── LoginScreen             # 登录
    └── RegisterScreen          # 注册
```

### 3.3 数据流

```
用户操作
    │
    ├── UI 状态（Tab 切换、弹窗、表单）→ Zustand Store
    │
    └── 服务端数据（列表、详情、用户信息）→ TanStack Query
            │
            ▼
        Axios Instance
            │
            ├── 请求拦截器：注入 Authorization header
            ├── 响应拦截器：统一错误处理、401 自动刷新 token
            └── baseURL：http://localhost:3000/api/v1
```

### 3.4 状态管理分层

| 状态类型 | 存储方式 | 示例 |
|----------|----------|------|
| UI 状态 | Zustand | 当前 Tab、弹窗显隐、筛选条件 |
| 服务端状态 | TanStack Query | 商家列表、订单、用户信息 |
| 持久化状态 | MMKV | JWT token、用户偏好、搜索历史 |
| 表单状态 | React Hook Form | 登录表单、地址表单、评价表单 |

### 3.5 设计令牌系统

```typescript
// theme/tokens.ts
export const colors = {
  primary: '#FF6B35',      // 主色调（活力橙）
  secondary: '#004E89',    // 辅助色（深蓝）
  background: '#F5F5F5',   // 页面背景
  surface: '#FFFFFF',       // 卡片背景
  text: '#1A1A1A',          // 主文字
  textSecondary: '#666666', // 次要文字
  border: '#E5E5E5',        // 边框
  success: '#4CAF50',       // 成功
  error: '#F44336',         // 错误
  warning: '#FF9800',       // 警告
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 18, xl: 24, xxl: 32 };
export const borderRadius = { sm: 4, md: 8, lg: 12, xl: 16, full: 999 };
```

---

## 4. 后端设计 (NestJS)

### 4.1 技术栈

| 层级 | 选型 | 版本 |
|------|------|------|
| 框架 | NestJS | 10.x |
| ORM | Prisma | 6.x |
| 数据库 | MySQL | 8.0.12 |
| 认证 | @nestjs/jwt + passport | - |
| 校验 | class-validator + class-transformer | - |
| API 文档 | @nestjs/swagger | - |
| AI SDK | @anthropic-ai/sdk | Claude API 流式响应 |
| 日志 | @nestjs/common Logger | - |

### 4.2 模块划分

```
modules/
├── auth/          # 认证模块
│   ├── auth.controller    # POST /auth/register, /auth/login, /auth/refresh
│   ├── auth.service       # 密码加密(bcrypt)、JWT 签发
│   ├── auth.module
│   ├── dto/               # RegisterDto, LoginDto
│   ├── guards/            # JwtGuard, RolesGuard
│   └── strategies/        # JwtStrategy
│
├── user/          # 用户模块
│   ├── user.controller    # GET /users/me, PATCH /users/me
│   ├── user.service
│   └── dto/               # UpdateUserDto
│
├── shop/          # 商家模块
│   ├── shop.controller    # GET /shops, GET /shops/:id, GET /shops/nearby
│   ├── shop.service       # 列表分页、详情、附近商家(空间查询)、搜索
│   └── dto/               # QueryShopDto, ShopResponseDto
│
├── product/       # 商品模块
│   ├── product.controller # GET /products, GET /products/:id
│   ├── product.service    # 按商家/分类筛选、搜索
│   └── dto/
│
├── order/         # 订单模块
│   ├── order.controller   # POST /orders, GET /orders, GET /orders/:id, PATCH /orders/:id/status
│   ├── order.service      # 创建订单、状态流转、取消
│   └── dto/               # CreateOrderDto, OrderResponseDto
│
├── review/        # 评价模块
│   ├── review.controller  # POST /reviews, GET /reviews?shopId=
│   ├── review.service
│   └── dto/
│
├── address/       # 地址模块
│   ├── address.controller # CRUD /addresses
│   ├── address.service
│   └── dto/
│
├── favorite/      # 收藏模块
│   ├── favorite.controller # POST /favorites, DELETE /favorites/:id, GET /favorites
│   └── favorite.service
│
├── upload/        # 文件上传模块
│   ├── upload.controller  # POST /upload
│   └── upload.service     # 本地文件存储
│
└── ai/            # AI 对话模块
    ├── ai.controller      # POST /ai/chat (SSE), GET /ai/history
    ├── ai.service         # Claude API 调用、System Prompt 构建、上下文管理
    └── dto/               # ChatDto, ChatResponseDto
```

### 4.3 API 设计规范

- 统一前缀：`/api/v1`
- 统一响应格式：

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

- 分页参数：`?page=1&limit=20`
- 分页响应：

```json
{
  "code": 200,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

- 认证：`Authorization: Bearer <accessToken>`
- 错误码：400(参数错误)、401(未认证)、403(无权限)、404(不存在)、500(服务器错误)

### 4.4 认证流程

```
注册流程：
  POST /auth/register { phone, password, nickname }
  → 校验手机号唯一
  → bcrypt 加密密码
  → 创建用户
  → 返回 { accessToken, refreshToken, user }

登录流程：
  POST /auth/login { phone, password }
  → 校验手机号和密码
  → 签发 accessToken (15min) + refreshToken (7d)
  → 返回 { accessToken, refreshToken, user }

Token 刷新：
  POST /auth/refresh { refreshToken }
  → 验证 refreshToken 有效性
  → 签发新的 accessToken
  → 返回 { accessToken }

请求认证：
  GET /api/v1/xxx
  Header: Authorization: Bearer <accessToken>
  → JwtGuard 验证 token
  → 注入 @CurrentUser() 到 controller
```

### 4.5 AI 对话模块

**接口：**

```
POST /api/v1/ai/chat
Body: { message: string, conversationId?: string }
Response: SSE stream

GET /api/v1/ai/history?conversationId=
Response: { messages: ChatMessage[] }
```

**System Prompt 模板：**

```
你是一个本地生活服务助手，帮助用户发现附近的美食和生活服务。

用户当前信息：
- 位置：{latitude}, {longitude}（{address}）
- 偏好：{userPreferences}
- 历史收藏：{favoriteShops}

你可以：
1. 推荐附近的商家和美食
2. 根据用户的口味偏好做个性化推荐
3. 回答关于商家评价、价格、营业时间等问题
4. 帮助用户规划用餐选择

你不可以：
- 回答与本地生活服务无关的问题
- 提供医疗、法律等专业建议

当前平台商家数据摘要：
{shopSummary}
```

**流式响应实现：**

```typescript
// NestJS SSE 端点
@Post('chat')
@Sse('chat/stream')
async chatStream(@Body() dto: ChatDto, @Req() req) {
  const stream = await this.aiService.chat(dto.message, req.user.id);
  return stream; // Observable<MessageEvent>
}
```

---

## 5. 数据库设计 (MySQL 8.0)

### 5.1 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ============ 用户 ============

model User {
  id        Int      @id @default(autoincrement())
  phone     String   @unique @db.VarChar(20)
  password  String   @db.VarChar(255)
  nickname  String?  @db.VarChar(50)
  avatar    String?  @db.VarChar(500)
  gender    Int      @default(0) // 0:未知 1:男 2:女
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  addresses  Address[]
  orders     Order[]
  reviews    Review[]
  favorites  Favorite[]
  histories  History[]
  conversations AIConversation[]

  @@map("users")
}

// ============ 地址 ============

model Address {
  id        Int      @id @default(autoincrement())
  userId    Int
  name      String   @db.VarChar(50)      // 联系人
  phone     String   @db.VarChar(20)      // 联系电话
  province  String   @db.VarChar(50)
  city      String   @db.VarChar(50)
  district  String   @db.VarChar(50)
  detail    String   @db.VarChar(200)     // 详细地址
  latitude  Decimal  @db.Decimal(10, 7)
  longitude Decimal  @db.Decimal(10, 7)
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders Order[]

  @@index([userId])
  @@map("addresses")
}

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
  images        Json?    // ["url1", "url2"]
  rating        Decimal  @default(5.0) @db.Decimal(2, 1)
  monthlySales  Int      @default(0)
  deliveryFee   Decimal  @default(0) @db.Decimal(10, 2)
  minOrder      Decimal  @default(0) @db.Decimal(10, 2)
  latitude      Decimal  @db.Decimal(10, 7)
  longitude     Decimal  @db.Decimal(10, 7)
  businessHours String?  @db.VarChar(50) // "09:00-22:00"
  categoryId    Int?
  status        Int      @default(1) // 0:休息 1:营业
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
  status      Int      @default(1) // 0:下架 1:上架
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  shop      Shop?      @relation(fields: [shopId], references: [id])
  category  Category?  @relation(fields: [categoryId], references: [id])
  orderItems OrderItem[]

  @@index([shopId])
  @@index([categoryId])
  @@map("products")
}

// ============ 订单 ============

model Order {
  id           Int      @id @default(autoincrement())
  orderNo      String   @unique @db.VarChar(32)
  userId       Int
  shopId       Int
  addressId    Int?
  totalAmount  Decimal  @db.Decimal(10, 2)
  deliveryFee  Decimal  @default(0) @db.Decimal(10, 2)
  status       String   @db.VarChar(20) // PENDING_PAYMENT, PAID, PREPARING, DELIVERING, COMPLETED, CANCELLED
  addressSnapshot Json? // 下单时快照地址
  remark       String?  @db.VarChar(200)
  paidAt       DateTime?
  completedAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user      User       @relation(fields: [userId], references: [id])
  shop      Shop       @relation(fields: [shopId], references: [id])
  address   Address?   @relation(fields: [addressId], references: [id])
  items     OrderItem[]
  review    Review?

  @@index([userId])
  @@index([shopId])
  @@index([orderNo])
  @@map("orders")
}

// ============ 订单项 ============

model OrderItem {
  id        Int      @id @default(autoincrement())
  orderId   Int
  productId Int
  name      String   @db.VarChar(100)  // 下单时快照
  price     Decimal  @db.Decimal(10, 2) // 下单时快照
  quantity  Int
  image     String?  @db.VarChar(500)

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@index([orderId])
  @@map("order_items")
}

// ============ 评价 ============

model Review {
  id        Int      @id @default(autoincrement())
  userId    Int
  shopId    Int
  orderId   Int      @unique
  rating    Int      // 1-5
  content   String?  @db.Text
  images    Json?    // ["url1", "url2"]
  createdAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id])
  shop  Shop  @relation(fields: [shopId], references: [id])
  order Order @relation(fields: [orderId], references: [id])

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
  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@unique([userId, shopId])
  @@index([userId])
  @@map("favorites")
}

// ============ 浏览历史 ============

model History {
  id        Int      @id @default(autoincrement())
  userId    Int
  shopId    Int
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("histories")
}

// ============ AI 对话 ============

model AIConversation {
  id        Int      @id @default(autoincrement())
  userId    Int
  title     String?  @db.VarChar(100)
  messages  Json     // [{role: "user"|"assistant", content: string, timestamp: string}]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("ai_conversations")
}
```

### 5.2 订单状态机

```
PENDING_PAYMENT ──→ PAID ──→ PREPARING ──→ DELIVERING ──→ COMPLETED
      │                │          │
      └──→ CANCELLED   └──→ CANCELLED (退款)
```

- `PENDING_PAYMENT`：创建订单后，等待支付
- `PAID`：模拟支付完成（前端弹窗确认，不接入真实支付）
- `PREPARING`：商家接单，开始准备
- `DELIVERING`：配送中
- `COMPLETED`：订单完成，可评价
- `CANCELLED`：取消（未支付可直接取消，已支付需退款逻辑）

### 5.3 地理位置查询

使用 MySQL 空间函数实现附近商家查询：

```sql
-- 创建空间索引
ALTER TABLE shops ADD COLUMN location POINT NOT NULL SRID 4326;
CREATE SPATIAL INDEX idx_shops_location ON shops(location);

-- 查询附近商家（5公里内，按距离排序）
SELECT *,
  ST_Distance_Sphere(
    location,
    ST_GeomFromText('POINT({lng} {lat})', 4326)
  ) AS distance
FROM shops
WHERE status = 1
HAVING distance < 5000
ORDER BY distance
LIMIT 20;
```

---

## 6. AI 对话助手设计

### 6.1 对话流程

```
用户输入消息
    ↓
前端 POST /api/v1/ai/chat { message, conversationId? }
    ↓
后端 AI Module:
  1. 加载/创建 conversation
  2. 查询用户位置、偏好、收藏
  3. 查询附近商家摘要
  4. 构建 System Prompt
  5. 拼接历史消息（最近 10 条）
  6. 调用 Claude API (stream: true)
  7. SSE 流式返回给前端
  8. 完成后保存消息到数据库
    ↓
前端逐字渲染 AI 回复
```

### 6.2 快捷问题

- "附近有什么好吃的？"
- "人均 50 以内的推荐"
- "评分最高的商家"
- "适合聚餐的地方"
- "帮我看看我的订单"

### 6.3 成本控制

- 单次对话最多携带 10 条历史消息
- System Prompt 中的商家数据摘要（非完整数据）
- 对话空闲 30 分钟自动创建新会话
- 前端显示 token 用量提示（可选）

---

## 7. 高德地图设计

### 7.1 使用场景

| 场景 | 功能 | 技术实现 |
|------|------|----------|
| 首页 | 获取用户位置，计算附近商家距离 | Geolocation API |
| 地图 Tab | 全屏地图 + 商家标记 | AMapView + Marker |
| 商家详情 | 显示商家位置 | AMapView (只读) |
| 地址选择 | 地图选点 + 逆地理编码 | AMapView + 点击事件 + 高德 Web API |
| 订单详情 | 配送路线展示 | Polyline |

### 7.2 权限处理

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

运行时权限申请 → 拒绝后降级为手动输入地址。

### 7.3 高德 API Key

需要在高德开放平台申请：
- Android SDK Key（用于原生地图）
- Web API Key（用于逆地理编码等 Web 服务）

---

## 8. 开发阶段

### Phase 1：基础骨架

- [x] Monorepo 搭建（pnpm workspace）
- [ ] NestJS 项目初始化 + Prisma 配置 MySQL
- [ ] React Native 项目初始化 + React Navigation
- [ ] 认证模块（注册/登录/JWT）
- [ ] 用户模块（个人资料 CRUD）
- [ ] 公共组件（Button, Input, Card, Header, Loading）

### Phase 2：核心浏览体验

- [ ] 商家模块（列表、详情、分类、搜索）
- [ ] 商品模块（商品列表、详情）
- [ ] 首页 UI（搜索栏、轮播、分类入口、推荐商家）
- [ ] 分类页（左侧分类 + 右侧列表）
- [ ] 搜索页（历史、热词、实时搜索）
- [ ] 高德地图集成（定位 + 商家标记）
- [ ] 地址管理（CRUD + 地图选点）

### Phase 3：交易闭环

- [ ] 购物车功能（加购、修改数量、删除）
- [ ] 下单流程（选地址 → 确认订单 → 模拟支付）
- [ ] 订单模块（列表、详情、状态追踪）
- [ ] 评价模块（发表评价、查看评价列表）
- [ ] 收藏功能（收藏/取消收藏商家）

### Phase 4：AI 智能助手

- [ ] AI 对话界面（消息气泡、流式渲染、输入框）
- [ ] 后端 AI 模块（Claude API 集成、SSE 流式响应）
- [ ] System Prompt 构建（位置 + 偏好 + 商家数据）
- [ ] 对话历史存储与展示
- [ ] 快捷问题入口

### Phase 5：体验优化

- [ ] 浏览历史记录
- [ ] 下拉刷新 + 无限滚动
- [ ] 页面过渡动画（react-native-reanimated）
- [ ] 骨架屏加载效果
- [ ] 错误处理与重试机制
- [ ] 种子数据完善（50+ 商家、500+ 商品）

---

## 9. 非功能需求

### 9.1 性能

- 商家列表使用 FlatList 虚拟化
- 图片使用 FastImage 缓存
- TanStack Query 缓存策略：staleTime 5min
- API 响应时间目标：< 200ms（不含 AI）

### 9.2 安全

- 密码 bcrypt 加密存储
- JWT accessToken 15 分钟过期
- API 限流（throttle）
- 输入校验（class-validator）
- SQL 注入防护（Prisma ORM 自动处理）

### 9.3 可扩展性

- 模块化设计，后续可添加商家端、骑手端
- OSS 接口预留，可随时切换文件存储
- Redis 已就绪，可用于缓存、会话、限流
- Docker 可用于部署和数据库管理
