# Phase 2b：高德地图集成 - 设计规格说明

> 日期：2026-05-26
> 项目类型：个人学习项目
> 范围：地图显示、商家标记、路线规划、地址管理（选点/搜索/手动输入）

---

## 1. 概述

Phase 2b 为 App 集成高德地图，实现地图浏览、商家标记、路线规划和完整的地址管理功能。

### 1.1 不包含

- 购物车/下单/支付（Phase 3）
- AI 助手（Phase 4）
- 骑手实时位置追踪（超出学习项目范围）

---

## 2. 技术方案

### 2.1 SDK 选型

**前端：**

| SDK | 用途 |
|-----|------|
| `react-native-amap3d` | 地图显示、标记、覆盖物、路线绘制 |
| `@amap/amap-react-native-location` | 定位服务 |

**后端：**

| SDK | 用途 |
|-----|------|
| `@nestjs/axios` | NestJS HTTP 客户端模块 |
| `axios` | 调用高德 Web API（逆地理编码、POI 搜索、路线规划） |

### 2.2 API Keys

| 平台 | Key |
|------|-----|
| Android | `fa9254f9d9fd8e972fdcb6130d7b7cc6` |
| iOS | `ffea3a3068e0a55b06dbe43c24cf8260` |

### 2.3 配置

Android: `android/app/src/main/AndroidManifest.xml` 添加 meta-data
iOS: `ios/Podfile` 添加高德 SDK 依赖

---

## 3. 后端扩展

### 3.1 Address 模块扩展

现有 Address 模型已包含 `latitude`, `longitude` 字段，无需修改 schema。

**新增 API：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/shops/nearby` | 附近商家（基于经纬度） |

**附近商家查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| latitude | number | 是 | 纬度 |
| longitude | number | 是 | 经度 |
| radius | number | 否 | 搜索半径（米），默认 3000 |
| limit | number | 否 | 返回数量，默认 20 |

**实现：** 使用 MySQL ST_Distance_Sphere 或手动计算距离，按距离排序。

注意：MySQL 8.0 支持 `ST_Distance_Sphere`，可精确计算球面距离。但为了简单起见，使用 Haversine 公式手动计算（学习项目够用）。

---

## 4. 前端页面

### 4.1 地图主界面 (MapScreen)

**布局：** 参考 Pencil 设计 `06-map.png`

```
┌─────────────────────────┐
│  状态栏                  │
├─────────────────────────┤
│  🔍 搜索附近商家    📍  │
│  ┌─────────────────┐    │
│  │                  │    │
│  │    高德地图       │    │
│  │                  │    │
│  │  📍 📍           │    │
│  │     📍    +/-   │    │
│  │  📍             │    │
│  │     📍          │    │
│  └─────────────────┘    │
├─────────────────────────┤
│  附近 N 家商家           │
│  ┌────┬──────────────┐  │
│  │ 图 │ 商家名 | 距离 │  │
│  │ 片 │ 月售 | 评分   │  │
│  └────┴──────────────┘  │
├─────────────────────────┤
│  [首页] [地图] [订单]...│
└─────────────────────────┘
```

**功能：**
- 地图默认显示当前位置
- 加载附近商家并显示标记点（Marker）
- 点击标记点弹出信息窗（Callout）或底部卡片
- 点击商家卡片 → 跳转 ShopDetailScreen
- 点击搜索栏 → 跳转搜索（复用 SearchScreen）
- 定位按钮 → 回到当前位置
- 缩放控件

**数据获取：**
- 附近商家：`GET /api/v1/shops/nearby?latitude=X&longitude=Y`
- 使用 `react-native-amap3d` 的 `MapView` + `Marker` 组件

### 4.2 路线规划 (RouteScreen)

**布局：**
```
┌─────────────────────────┐
│  状态栏                  │
├─────────────────────────┤
│  ← 湘菜馆·辣椒炒肉      │
├─────────────────────────┤
│                          │
│    高德地图 + 路线绘制    │
│    (起点 → 终点)          │
│                          │
├─────────────────────────┤
│  🚗 驾车 15分钟 5.2km    │
│  🚶 步行 45分钟 3.1km    │
│  🚲 骑行 12分钟 4.8km    │
├─────────────────────────┤
│  [开始导航]              │
└─────────────────────────┘
```

**功能：**
- 显示从当前位置到商家的路线
- 支持驾车/步行/骑行三种模式
- 路线绘制在地图上
- 显示预估时间和距离
- "开始导航"调用高德 APP 进行导航

**实现：**
- 使用高德 Web API 路线规划：`https://restapi.amap.com/v3/direction/driving`
- 地图上使用 `Polyline` 绘制路线

### 4.3 地址管理 (AddressScreen)

**布局：**
```
┌─────────────────────────┐
│  状态栏                  │
├─────────────────────────┤
│  ← 收货地址              │
├─────────────────────────┤
│  📍 张三 13800138000     │
│     浙江省杭州市西湖区... │
│     [默认]        [编辑] │
├─────────────────────────┤
│  📍 李四 13900139000     │
│     北京市朝阳区三里屯... │
│               [删除][编辑]│
├─────────────────────────┤
│  [+ 新增地址]            │
└─────────────────────────┘
```

**功能：**
- 显示用户所有收货地址
- 新增/编辑/删除地址
- 设为默认地址
- 点击新增 → 跳转 AddressPickerScreen

### 4.4 地址选择 (AddressPickerScreen)

**布局：**
```
┌─────────────────────────┐
│  状态栏                  │
├─────────────────────────┤
│  ← 选择地址              │
├─────────────────────────┤
│  🔍 搜索地点             │
├─────────────────────────┤
│                          │
│    高德地图               │
│         📍 (选中位置)     │
│                          │
├─────────────────────────┤
│  📍 浙江省杭州市西湖区    │
│     文三路398号           │
├─────────────────────────┤
│  联系人: [________]      │
│  电话:   [________]      │
│  门牌号: [________]      │
│  设为默认 [开关]          │
├─────────────────────────┤
│  [保存地址]              │
└─────────────────────────┘
```

**三种地址输入方式：**

1. **地图选点：** 点击地图任意位置，自动获取地址名称（逆地理编码）
2. **搜索地点：** 输入关键词搜索 POI，选择后定位到该点
3. **手动输入：** 手动填写省/市/区/详细地址

**实现：**
- 逆地理编码：高德 Web API `https://restapi.amap.com/v3/geocode/regeo`
- POI 搜索：高德 Web API `https://restapi.amap.com/v3/place/text`

---

## 5. 高德 Web API

Phase 2b 需要使用以下高德 Web API（服务端调用，需后端代理）：

| API | 用途 | 路径 |
|-----|------|------|
| 逆地理编码 | 经纬度 → 地址 | `/v3/geocode/regeo` |
| POI 搜索 | 关键词 → 地点列表 | `/v3/place/text` |
| 路线规划 | 驾车/步行路线 | `/v3/direction/driving` |
| 地理编码 | 地址 → 经纬度 | `/v3/geocode/geo` |

**后端代理：** 在 NestJS 中新增 `amap` 模块，代理高德 API 请求，避免前端暴露 API Key。

---

## 6. API 总结

### 后端新增

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/shops/nearby` | 附近商家 |
| GET | `/api/v1/amap/reverse-geocode` | 逆地理编码代理 |
| GET | `/api/v1/amap/poi-search` | POI 搜索代理 |
| GET | `/api/v1/amap/direction` | 路线规划代理 |

### 前端复用

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/address` | 地址列表（已有） |
| POST | `/api/v1/address` | 新增地址（已有） |
| PUT | `/api/v1/address/:id` | 编辑地址（已有） |
| DELETE | `/api/v1/address/:id` | 删除地址（已有） |

---

## 7. 文件结构

### 后端新增

```
apps/server/src/modules/
├── shop/
│   └── dto/query-nearby.dto.ts    # 新增
├── amap/
│   ├── amap.module.ts              # 新建
│   ├── amap.controller.ts          # 新建
│   └── amap.service.ts             # 新建
```

### 前端新增/修改

```
apps/mobile/src/
├── screens/
│   ├── MapScreen.tsx               # 修改：真实地图
│   ├── AddressScreen.tsx           # 新建
│   ├── AddressPickerScreen.tsx     # 新建
│   └── RouteScreen.tsx             # 新建
├── services/
│   └── api.ts                      # 修改：添加 amap/nearby API
├── hooks/
│   ├── useShops.ts                 # 修改：添加 useNearbyShops
│   └── useAddress.ts               # 新建
└── navigation/
    └── MainTabs.tsx                # 修改：Map tab 使用新组件
```

---

## 8. Prisma Schema

无新增 model。Address 模型已包含 latitude/longitude 字段。

---

## 9. Pencil 设计对照

| 页面 | Pencil 设计文件 | 状态 |
|------|----------------|------|
| MapScreen | 06-map.png | ✅ 已有 |
| RouteScreen | 18-route.png | ✅ 已创建 |
| AddressScreen | 12-address-list.png | ✅ 已有 |
| AddressPickerScreen | 19-address-picker.png | ✅ 已创建 |

---

## 10. 实现顺序

1. 后端：Amap 代理模块 + nearby 接口
3. 前端：SDK 配置 + MapScreen 真实地图
4. 前端：商家标记 + 点击交互
5. 前端：路线规划
6. 前端：地址管理 + 地图选点
7. 前端：POI 搜索 + 手动输入
