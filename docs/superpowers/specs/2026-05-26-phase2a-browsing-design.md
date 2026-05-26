# Phase 2a：核心浏览体验 - 设计规格说明

> 日期：2026-05-26
> 项目类型：个人学习项目
> 范围：商家/商品模块后端 API + 首页/分类/搜索/商家详情/商品详情前端页面 + 种子数据

---

## 1. 概述

Phase 2a 实现本地生活服务 App 的核心浏览体验：用户可以浏览商家列表、按分类筛选、搜索商家、查看商家详情和商品详情。

### 1.1 不包含

- 高德地图集成（Phase 2b）
- 购物车/下单/支付（Phase 3）
- AI 助手（Phase 4）

---

## 2. 后端模块

### 2.1 分类模块 (Category)

**路由：** `GET /api/v1/categories`

**响应：**
```json
{
  "code": 200,
  "data": [
    { "id": 1, "name": "美食", "icon": "🍜", "sortOrder": 1 },
    { "id": 2, "name": "饮品", "icon": "🧋", "sortOrder": 2 }
  ]
}
```

**实现：** 简单的 findAll 查询，按 sortOrder 排序。

### 2.2 商家模块 (Shop)

**路由：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/shops` | 商家列表（分页 + 筛选） |
| GET | `/api/v1/shops/:id` | 商家详情（含商品列表） |
| GET | `/api/v1/shops/recommended` | 推荐商家 |

**列表查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 20 | 每页数量 |
| categoryId | number | - | 按分类筛选 |
| keyword | string | - | 搜索关键词（LIKE 匹配 name） |
| sort | string | 'recommended' | 排序：recommended / rating / sales |

**商家详情响应包含：**
- 商家基本信息（名称、评分、月销、地址、营业时间等）
- 按分类分组的商品列表

**推荐商家逻辑：** 按 `rating DESC, monthlySales DESC` 排序，取前 20。

**搜索实现：** MySQL `WHERE name LIKE '%keyword%'`，学习项目够用。

### 2.3 商品模块 (Product)

**路由：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/products` | 商品列表（按商家/分类筛选） |
| GET | `/api/v1/products/:id` | 商品详情 |

**商品列表查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| shopId | number | 按商家筛选 |
| categoryId | number | 按分类筛选 |
| page | number | 页码 |
| limit | number | 每页数量 |

商品不支持独立搜索，仅通过商家/分类筛选。

### 2.4 Prisma Schema 扩展

在现有 schema 基础上新增 3 个 model：

```prisma
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
```

注意：Order、OrderItem、Review、Favorite 模型在 Phase 3 中添加，此处 Shop/Product 模型预留了关系字段。

---

## 3. 前端页面

### 3.1 首页 (HomeScreen)

**布局：**
```
┌─────────────────────────┐
│  搜索栏（点击跳转搜索页） │
├─────────────────────────┤
│  Banner 轮播（3-5 张）   │
├─────────────────────────┤
│  分类入口网格             │
│  (2行 x 5列, 横向滚动)   │
├─────────────────────────┤
│  推荐商家列表             │
│  (FlatList, 无限滚动)    │
│  ┌───────────────────┐  │
│  │ 商家卡片           │  │
│  │ 图片 | 名称 | 评分  │  │
│  │ 月销 | 距离 | 起送价 │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

**数据获取：**
- 分类列表：`GET /api/v1/categories`（TanStack Query, staleTime: 10min）
- 推荐商家：`GET /api/v1/shops/recommended?page=1&limit=10`（TanStack Query, 无限滚动用 useInfiniteQuery）

**交互：**
- 点击搜索栏 → 跳转 SearchScreen
- 点击分类 → 跳转 CategoryScreen（传递 categoryId）
- 点击商家卡片 → 跳转 ShopDetailScreen

### 3.2 分类页 (CategoryScreen)

**布局：**
```
┌────────┬────────────────┐
│ 分类   │  商家/商品列表   │
│ ┌────┐ │  ┌──────────┐  │
│ │美食│→│  │ 商家卡片  │  │
│ │饮品│ │  │          │  │
│ │超市│ │  └──────────┘  │
│ │生鲜│ │  ┌──────────┐  │
│ │... │ │  │ 商家卡片  │  │
│ └────┘ │  └──────────┘  │
└────────┴────────────────┘
```

**交互：**
- 左侧分类列表固定，点击切换
- 右侧列表根据选中分类筛选（`GET /api/v1/shops?categoryId=X`）
- 默认显示第一个分类的商家

### 3.3 搜索页 (SearchScreen)

**布局：**
```
┌─────────────────────────┐
│  搜索输入框（自动聚焦）   │
├─────────────────────────┤
│  搜索历史（最近 10 条）   │
│  [寿司] [奶茶] [火锅]    │
├─────────────────────────┤
│  热门搜索                │
│  [辣椒炒肉] [汉堡] [...] │
├─────────────────────────┤
│  搜索结果列表             │
│  (实时搜索, 防抖 300ms)  │
└─────────────────────────┘
```

**数据获取：**
- 搜索结果：`GET /api/v1/shops?keyword=xxx`（TanStack Query, debounce 300ms）
- 搜索历史：MMKV 本地存储（最近 10 条，去重）
- 热门搜索：硬编码或后端返回

**交互：**
- 输入关键词 → 防抖 300ms → 实时搜索
- 点击历史/热词 → 填入搜索框并搜索
- 点击结果 → 跳转 ShopDetailScreen

### 3.4 商家详情页 (ShopDetailScreen)

**布局：** 参考 Pencil 设计 `05-shop-detail.png`

```
┌─────────────────────────┐
│  商家图片（200px 高）     │
├─────────────────────────┤
│  商家名称        [评分]  │
│  月售328 | 3.2km | ¥20起 │
│  配送费¥3                 │
│  营业中 09:00-22:00       │
├─────────────────────────┤
│  [菜单] [评价(128)] [商家]│
├─────────────────────────┤
│  分类: 招牌菜             │
│  ┌────┬────────┬───────┐ │
│  │ 图 │ 辣椒炒肉│ ¥28  │ │
│  │ 片 │ 月售328 │ [+]  │ │
│  └────┴────────┴───────┘ │
│  ┌────┬────────┬───────┐ │
│  │ 图 │ 农家小碗│ ¥18  │ │
│  │ 片 │ 月售256 │ [+]  │ │
│  └────┴────────┴───────┘ │
├─────────────────────────┤
│  [🛒] ¥0.00   ¥20起送   │
└─────────────────────────┘
```

**数据获取：**
- 商家详情：`GET /api/v1/shops/:id`（TanStack Query）
- 响应包含按分类分组的商品列表

**Tab 切换：**
- 菜单：显示商品列表（默认）
- 评价：显示评价列表（Phase 3 实现，此阶段显示空状态）
- 商家：显示商家详细信息

### 3.5 商品详情页 (ProductDetailScreen)

**布局：** 参考 Pencil 设计 `17-product-detail.png`

```
┌─────────────────────────┐
│  商品图片（大图）         │
├─────────────────────────┤
│  ¥28.00       已售328   │
│  农家小炒肉               │
│  精选五花肉搭配青椒...    │
│  [份量:大份] [辣度:中辣]  │
├─────────────────────────┤
│  🏪 湘菜馆·辣椒炒肉  >   │
│  月售328 · 评分4.8 · 3.2km│
├─────────────────────────┤
│  [-] 1 [+]  [🛒加入购物车]│
└─────────────────────────┘
```

**数据获取：**
- 商品详情：`GET /api/v1/products/:id`（TanStack Query）

**交互：**
- 点击商家信息 → 跳转 ShopDetailScreen
- 数量加减（本地状态）
- 加购按钮（Phase 3 实现购物车，此阶段仅 Toast 提示）

---

## 4. 种子数据

### 4.1 分类（10+）

| 名称 | 图标 | 排序 |
|------|------|------|
| 美食 | 🍜 | 1 |
| 饮品 | 🧋 | 2 |
| 超市 | 🛒 | 3 |
| 生鲜 | 🥬 | 4 |
| 甜点 | 🍰 | 5 |
| 快餐 | 🍔 | 6 |
| 火锅 | 🍲 | 7 |
| 面食 | 🍜 | 8 |
| 小吃 | 🍢 | 9 |
| 水果 | 🍎 | 10 |

### 4.2 商家（50+）

每家商家包含：
- 真实风格的中文名称（如"湘菜馆·辣椒炒肉"、"一点点奶茶"、"盒马鲜生"）
- 地址（某市某区某路）
- 评分（4.0-5.0 随机）
- 月销量（50-1000 随机）
- 配送费（0-8 元）
- 起送价（10-50 元）
- 经纬度（在某城市范围内随机分布）
- 营业时间
- 关联分类

### 4.3 商品（500+）

每家商家 8-15 个商品：
- 真实风格的中文名称
- 价格（8-88 元）
- 图片（占位图 URL）
- 库存（999 默认）
- 销量（随机）
- 关联商家和分类

---

## 5. API 总结

| 模块 | 方法 | 路径 | 说明 |
|------|------|------|------|
| Category | GET | /api/v1/categories | 分类列表 |
| Shop | GET | /api/v1/shops | 商家列表（分页+筛选） |
| Shop | GET | /api/v1/shops/recommended | 推荐商家 |
| Shop | GET | /api/v1/shops/:id | 商家详情 |
| Product | GET | /api/v1/products | 商品列表 |
| Product | GET | /api/v1/products/:id | 商品详情 |

所有接口无需认证（公开访问）。

---

## 6. 文件结构

### 后端新增

```
apps/server/src/modules/
├── category/
│   ├── category.module.ts
│   ├── category.controller.ts
│   ├── category.service.ts
│   └── dto/
├── shop/
│   ├── shop.module.ts
│   ├── shop.controller.ts
│   ├── shop.service.ts
│   └── dto/
├── product/
│   ├── product.module.ts
│   ├── product.controller.ts
│   ├── product.service.ts
│   └── dto/
```

### 前端新增/修改

```
apps/mobile/src/
├── screens/
│   ├── HomeScreen.tsx          # 修改：真实数据
│   ├── CategoryScreen.tsx      # 修改：真实数据
│   ├── SearchScreen.tsx        # 修改：真实数据
│   ├── ShopDetailScreen.tsx    # 新建
│   └── ProductDetailScreen.tsx # 新建
├── services/
│   └── api.ts                  # 修改：添加 shop/category/product API
└── hooks/
    ├── useShops.ts             # 新建：TanStack Query hooks
    ├── useProducts.ts          # 新建
    └── useCategories.ts        # 新建
```

---

## 7. Pencil 设计对照

| 页面 | Pencil 设计文件 | 状态 |
|------|----------------|------|
| HomeScreen | 04-home.png | ✅ 已有 |
| CategoryScreen | 11-category.png | ✅ 已有 |
| SearchScreen | 10-search.png | ✅ 已有 |
| ShopDetailScreen | 05-shop-detail.png | ✅ 已有 |
| ProductDetailScreen | 17-product-detail.png | ✅ 已有 |
