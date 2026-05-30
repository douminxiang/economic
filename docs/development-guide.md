# 项目开发指南 — 后续操作与配置手册

**最后更新：** 2026-05-30
**适用环境：** Cursor IDE + Windows 11

---

## 目录

1. [数据库迁移](#1-数据库迁移)
2. [AI 向量种子数据](#2-ai-向量种子数据)
3. [支付宝沙箱配置](#3-支付宝沙箱配置)
4. [Sentry 监控配置](#4-sentry-监控配置)
5. [OSS 文件存储配置](#5-oss-文件存储配置)
6. [短信验证码配置](#6-短信验证码配置)
7. [Android 打包上架](#7-android-打包上架)
8. [iOS 打包上架](#8-ios-打包上架)
9. [环境变量完整清单](#9-环境变量完整清单)
10. [Cursor 开发注意事项](#10-cursor-开发注意事项)
11. [已知问题与限制](#11-已知问题与限制)
12. [功能验证清单](#12-功能验证清单)
13. [UI 设计稿对齐说明](#13-ui-设计稿对齐说明)

---

## 1. 数据库迁移

项目新增了多个 Prisma 字段和模型，需要运行迁移。

### 步骤

```bash
# 进入 server 目录
cd apps/server

# 运行迁移（会自动创建新表和字段）
npx prisma migrate dev --name add-phase2-phase3-features

# 生成 Prisma Client
npx prisma generate
```

### 迁移内容

本次迁移会创建/修改以下内容：

| 变更类型 | 名称 | 说明 |
|---------|------|------|
| 新增字段 | `Shop.embedding` | JSON 类型，存储向量嵌入 |
| 新增字段 | `AIMessage.thinking` | Text 类型，深度思考推理内容 |
| 新增字段 | `AIMessage.imageUrl` | VarChar(500)，用户上传图片 URL |
| 新增表 | `track_events` | 埋点事件表 |

### 验证

```bash
# 检查迁移状态
npx prisma migrate status

# 打开 Prisma Studio 查看数据
npx prisma studio
```

---

## 2. AI 向量种子数据

RAG 向量搜索需要为所有店铺生成 embedding 向量。

### 前置条件

- 数据库迁移已完成
- SiliconFlow API Key 可用（`.env` 中的 `ANTHROPIC_API_KEY`）

### 步骤

```bash
cd apps/server

# 运行 embedding 种子脚本
# 这会为每家店铺调用 SiliconFlow API 生成 1024 维向量
npx ts-node prisma/seed-embeddings.ts
```

### 注意事项

- 脚本会对每家店铺调用一次 API，约 67 家店铺，耗时约 2-3 分钟
- 如果 API 调用失败，脚本会跳过该店铺继续执行
- 生成的向量存储在 `Shop.embedding` JSON 字段中
- 如果后续新增店铺，需要手动运行此脚本或在店铺创建时自动生成

### 自定义店铺的 embedding

如果新增了店铺，可以单独为某家店铺生成 embedding：

```bash
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// 手动调用 EmbeddingService 生成 embedding
"
```

或在代码中调用 `EmbeddingService.generateEmbedding(text)` 后存入数据库。

---

## 3. 支付宝沙箱配置

当前支付功能使用 mock 模式。接入真实支付宝需要以下配置。

### 申请沙箱账号

1. 访问 [支付宝开放平台](https://open.alipay.com/)
2. 注册开发者账号（需要实名认证）
3. 进入「控制台」→「沙箱环境」
4. 获取以下信息：
   - **APPID**：沙箱应用 ID（2088 开头）
   - **应用私钥**：RSA2 格式
   - **支付宝公钥**：支付宝提供的公钥

### 配置 .env

```env
# 支付宝沙箱配置
ALIPAY_APP_ID="2021000000000000"          # 替换为你的沙箱 APPID
ALIPAY_PRIVATE_KEY="MIIEvQIBADANBg..."    # 替换为你的应用私钥
ALIPAY_PUBLIC_KEY="MIIBIjANBgkq..."       # 替换为支付宝公钥
ALIPAY_NOTIFY_URL="http://10.0.2.2:3000/api/v1/payment/callback"  # 异步通知地址
ALIPAY_GATEWAY="https://openapi-sandbox.dl.alipaydev.com/gateway.do"  # 沙箱网关
ALIPAY_SIGN_TYPE="RSA2"
```

### 安装依赖（可选，mock 模式不需要）

```bash
cd apps/server
npm install alipay-sdk
```

### 注意事项

- 沙箱环境的支付宝 APP 无法在真机使用，需要用沙箱版支付宝 APP 测试
- 沙箱网关地址与正式环境不同
- 支付宝异步回调需要公网可达的地址，本地开发用内网穿透（如 ngrok）
- **Mock 模式下**：`.env` 中不设置 `ALIPAY_APP_ID`，支付会自动使用模拟模式

---

## 4. Sentry 监控配置

### 创建 Sentry 账号

1. 访问 [sentry.io](https://sentry.io/) 注册免费账号
2. 创建两个项目：
   - **React Native** 项目（移动端）
   - **Node.js** 项目（服务端）
3. 获取 DSN（每个项目一个）

### 配置 .env

```env
# Sentry 配置
SENTRY_DSN="https://xxx@sentry.io/xxx"         # 服务端 DSN
SENTRY_DSN_MOBILE="https://xxx@sentry.io/xxx"  # 移动端 DSN（可与服务端相同）
SENTRY_ENVIRONMENT="development"
SENTRY_TRACES_SAMPLE_RATE=0.2
```

### 移动端初始化

在 `apps/mobile/src/App.tsx` 中添加 Sentry 初始化（当前未自动集成，需手动添加）：

```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0.2,
});
```

### 服务端初始化

在 `apps/server/src/main.ts` 中添加：

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
});
```

### 注意事项

- Sentry 免费版每月 5000 个事件
- 生产环境建议设置 `tracesSampleRate: 0.1`（10% 采样）
- 开发环境可以不配置 Sentry

---

## 5. OSS 文件存储配置

当前使用 mock 模式（文件保存到本地 `uploads/` 目录）。接入阿里云 OSS 需要：

### 创建 OSS Bucket

1. 登录 [阿里云 OSS 控制台](https://oss.console.aliyun.com/)
2. 创建 Bucket：
   - 地域：选择离用户最近的区域
   - 存储类型：标准存储
   - 读写权限：公共读（图片需要公开访问）
3. 获取 AccessKey：
   - 进入 RAM 访问控制 → AccessKey 管理
   - 创建 AccessKey（建议创建子用户 AccessKey）

### 配置 .env

```env
# OSS 配置（留空则使用 mock 模式）
OSS_REGION="oss-cn-hangzhou"               # 替换为你的 Bucket 所在区域
OSS_BUCKET="your-bucket-name"              # 替换为你的 Bucket 名称
OSS_ACCESS_KEY_ID="LTAI5t..."             # 替换为 AccessKey ID
OSS_ACCESS_KEY_SECRET="your-secret..."    # 替换为 AccessKey Secret
```

### 安装依赖（可选，mock 模式不需要）

```bash
cd apps/server
npm install ali-oss
```

### 注意事项

- Mock 模式下文件保存在 `apps/server/uploads/` 目录
- 生产环境**必须**配置 OSS，否则重启服务器后文件会丢失
- 建议配置 CDN 加速图片访问
- 图片上传限制：5MB，仅支持 JPG/PNG/WEBP

---

## 6. 短信验证码配置

当前使用 mock 模式（验证码打印到服务端控制台）。接入真实短信需要：

### 申请短信服务

1. 登录 [阿里云短信服务](https://dysms.console.aliyun.com/)
2. 申请短信签名（需要企业资质或个人备案的网站/App）
3. 申请短信模板：
   - 模板名称：验证码
   - 模板内容：`您的验证码是${code}，5分钟内有效。`
4. 获取 AccessKey（可复用 OSS 的 AccessKey）

### 代码修改

需要修改 `apps/server/src/modules/auth/auth.service.ts` 中的 `sendCode` 方法：

```typescript
// 替换 console.log 为真实短信发送
async sendCode(dto: SendCodeDto) {
  // ... 验证码生成逻辑 ...
  
  // 调用阿里云短信 API
  const smsClient = new Core({
    accessKeyId: process.env.SMS_ACCESS_KEY_ID,
    accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET,
    endpoint: 'https://dysmsapi.aliyuncs.com',
  });
  
  const params = {
    PhoneNumbers: phone,
    SignName: '你的签名',
    TemplateCode: 'SMS_XXXXXX',
    TemplateParam: JSON.stringify({ code }),
  };
  
  await smsClient.sendysmsRequest(params);
}
```

### 注意事项

- 短信签名需要审核通过后才能使用
- 个人开发者申请短信签名有一定门槛
- 开发阶段可以继续使用 mock 模式
- 建议添加 Redis 做验证码存储和限流（当前用内存 Map）

---

## 7. Android 打包上架

### 生成 Release Keystore

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore apps/mobile/android/app/release.keystore \
  -alias economic-release \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass YOUR_PASSWORD \
  -keypass YOUR_PASSWORD \
  -dname "CN=Economic, OU=Development, O=Economic, L=Hangzhou, ST=Zhejiang, C=CN"
```

### 配置签名

1. 将生成的 `release.keystore` 放到 `apps/mobile/android/app/` 目录
2. 编辑 `apps/mobile/android/keystore.properties`：

```properties
storeFile=release.keystore
storePassword=你设置的密码
keyAlias=economic-release
keyPassword=你设置的密码
```

### 构建 Release AAB

```bash
cd apps/mobile/android

# 清理之前的构建
./gradlew clean

# 构建 Release AAB
./gradlew bundleRelease
```

AAB 文件位置：`apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`

### Google Play Console

1. 注册 [Google Play Console](https://play.google.com/console)（$25 一次性费用）
2. 创建应用
3. 上传 AAB 文件
4. 填写商店信息：
   - 应用名称
   - 简短描述（80 字以内）
   - 完整描述（4000 字以内）
   - 截图（至少 2 张）
   - 隐私政策 URL
5. 提交审核

### 注意事项

- 首次提交审核可能需要 3-7 天
- 确保 `minSdkVersion 24`（Android 7.0）覆盖足够多的设备
- ProGuard 可能会导致某些库出问题，构建后务必测试
- 签名文件**不要**提交到 Git（已在 .gitignore 中排除）

---

## 8. iOS 打包上架

### 前置条件

- Apple Developer 账号（¥688/年）
- macOS 电脑（Xcode 只能在 macOS 上运行）
- CocoaPods 已安装

### 步骤

1. **打开 Xcode 项目**
   ```bash
   cd apps/mobile/ios
   pod install
   open EconomicMobile.xcworkspace
   ```

2. **配置签名**
   - 在 Xcode 中选择 EconomicMobile 项目
   - Signing & Capabilities → 选择你的 Team
   - Bundle Identifier: `com.economic.mobile`

3. **配置 App Icons**
   - 准备 1024x1024 的 App Icon
   - 在 `Images.xcassets/AppIcon.appiconset` 中添加所有尺寸

4. **配置权限**
   - `Info.plist` 中已添加定位权限描述
   - 确保相机权限（用于图片上传）

5. **Archive & Upload**
   - Product → Archive
   - 选择「Distribute App」→「App Store Connect」
   - 上传到 TestFlight

6. **App Store Connect**
   - 登录 [App Store Connect](https://appstoreconnect.apple.com/)
   - 填写应用信息、截图、描述
   - 提交审核

### 注意事项

- iOS 审核通常比 Android 更严格
- 需要提供隐私政策和数据收集说明
- 支付宝 SDK 需要在 Info.plist 中添加 URL Scheme
- 首次审核可能需要 1-2 周

---

## 9. 环境变量完整清单

### .env 文件（apps/server/.env）

```env
# === 数据库 ===
DATABASE_URL="mysql://root:root@localhost:3306/economic"

# === JWT 认证 ===
JWT_SECRET="your-jwt-secret-here"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="your-refresh-secret-here"

# === 服务配置 ===
PORT=3000

# === 高德地图 ===
AMAP_WEB_KEY="your-amap-web-key"

# === AI (SiliconFlow) ===
ANTHROPIC_API_KEY="sk-your-siliconflow-api-key"

# === OSS 文件存储（留空为 mock 模式）===
OSS_REGION=""
OSS_BUCKET=""
OSS_ACCESS_KEY_ID=""
OSS_ACCESS_KEY_SECRET=""

# === 支付宝（留空为 mock 模式）===
ALIPAY_APP_ID=""
ALIPAY_PRIVATE_KEY=""
ALIPAY_PUBLIC_KEY=""
ALIPAY_NOTIFY_URL="http://10.0.2.2:3000/api/v1/payment/callback"
ALIPAY_GATEWAY="https://openapi-sandbox.dl.alipaydev.com/gateway.do"
ALIPAY_SIGN_TYPE="RSA2"

# === Sentry 监控（可选）===
SENTRY_DSN=""
SENTRY_DSN_MOBILE=""
SENTRY_ENVIRONMENT="development"
SENTRY_TRACES_SAMPLE_RATE=0.2
```

---

## 10. Cursor 开发注意事项

### 项目结构

```
e:\economic\
├── apps/
│   ├── server/           # NestJS 后端
│   │   ├── src/
│   │   │   ├── modules/  # 功能模块（auth, ai, order, payment...）
│   │   │   ├── common/   # 公共组件（guards, interceptors, filters）
│   │   │   └── main.ts   # 入口文件
│   │   ├── prisma/       # 数据库 schema 和 seed
│   │   └── .env          # 环境变量（不要提交到 Git）
│   │
│   └── mobile/           # React Native 移动端
│       ├── src/
│       │   ├── screens/      # 页面组件
│       │   ├── components/   # 通用组件
│       │   ├── hooks/        # 自定义 Hooks
│       │   ├── stores/       # Zustand 状态管理
│       │   ├── services/     # API 服务
│       │   ├── i18n/         # 国际化翻译
│       │   ├── theme/        # 主题系统
│       │   └── navigation/   # 导航配置
│       └── android/      # Android 原生配置
│
├── packages/
│   └── shared/           # 共享 TypeScript 类型
│
└── docs/                 # 文档
```

### Cursor Rules 配置

建议在项目根目录创建 `.cursorrules` 文件：

```
# 项目技术栈
- 后端: NestJS 11 + Prisma 7 + MySQL + TypeScript
- 前端: React Native 0.85.3 + Zustand + React Query
- 状态管理: Zustand (客户端) + React Query (服务端状态)
- 表单: react-hook-form + Zod
- 样式: StyleSheet.create (非 NativeWind)
- 导航: React Navigation 7

# 代码规范
- 使用 TypeScript 严格模式
- 组件使用函数式组件 + hooks
- API 调用通过 services/api.ts 统一管理
- 样式使用 theme/tokens.ts 中的设计 tokens
- 国际化文本使用 useTranslation hook

# 文件命名
- 组件: PascalCase.tsx
- 工具/Hook: camelCase.ts
- 常量: UPPER_SNAKE_CASE
- 页面: PascalCaseScreen.tsx
```

### 常用 Cursor 快捷操作

1. **生成代码**：选中代码后按 `Ctrl+K`，输入指令
2. **聊天模式**：`Ctrl+L` 打开聊天，可以引用文件 `@file`
3. **内联编辑**：`Ctrl+K` 在光标处直接编辑
4. **引用文件**：在聊天中输入 `@` 然后选择文件

### 开发流程

```bash
# 终端 1：启动后端
cd apps/server
npm run start:dev

# 终端 2：启动移动端
cd apps/mobile
npm run android

# 终端 3：数据库管理（可选）
cd apps/server
npx prisma studio
```

### 调试技巧

- **后端调试**：在 VSCode/Cursor 中配置 launch.json，使用 NestJS 调试器
- **移动端调试**：摇一摇手机或 `Ctrl+M` 打开 Dev Menu，选择 Debug
- **API 测试**：使用 curl 或 Postman 测试 API 端点
- **数据库查看**：`npx prisma studio` 打开 Web 界面

---

## 11. 已知问题与限制

### 当前限制

| 问题 | 说明 | 解决方案 |
|------|------|---------|
| 支付为 Mock 模式 | 支付宝 SDK 未接入 | 配置 .env 中的 ALIPAY_* 变量 |
| 短信为 Mock 模式 | 验证码打印到控制台 | 接入阿里云短信 API |
| OSS 为 Mock 模式 | 文件保存到本地 | 配置 .env 中的 OSS_* 变量 |
| 订单号可能重复 | YYYYMMDD + 4位随机数 | 生产环境建议用 UUID |
| RAG 向量未生成 | 需要运行种子脚本 | 执行 `npx ts-node prisma/seed-embeddings.ts` |
| Sentry 未初始化 | 需要手动添加初始化代码 | 参考第 4 节配置 |

### 已知 Bug

- [ ] `api.ts` 中的 `createChatStream` 使用 `http://10.0.2.2:3000` 硬编码，真机部署需要修改
- [ ] `MainTabs.tsx` 中的 `useTranslation` 可能在某些边缘情况下导致重新渲染
- [ ] 支付宝回调地址 `ALIPAY_NOTIFY_URL` 需要公网可达

### 待优化

- [ ] 添加 Redis 做验证码存储和限流
- [ ] 添加请求频率限制（Rate Limiting）
- [ ] 添加 API 文档（Swagger）
- [ ] 添加单元测试
- [ ] 优化 RAG 向量搜索性能（当前全量加载到内存）

---

## 12. 功能验证清单

### Phase 1（已完成）

- [ ] OSS 图片上传（mock 模式）
- [ ] 短信验证码登录（mock 模式，查看控制台）
- [ ] 国际化切换（zh-CN / en-US）
- [ ] 暗黑模式切换

### Phase 2（已完成）

- [ ] AI 深度思考模式（点击 🧠 按钮开启）
- [ ] RAG 向量搜索（需要先运行种子脚本）
- [ ] 多模态图片理解（点击 📷 上传图片）
- [ ] 联网搜索（AI 自动判断是否需要搜索）

### Phase 3（已完成）

- [ ] WebSocket 订单实时推送
- [ ] 骑手位置跟踪（配送中状态）
- [ ] 支付宝支付（mock 模式）
- [ ] 埋点事件追踪
- [ ] 深色模式 + 分析开关

### 验证步骤

```bash
# 1. 启动服务
cd apps/server && npm run start:dev

# 2. 运行迁移
npx prisma migrate dev

# 3. 生成向量
npx ts-node prisma/seed-embeddings.ts

# 4. 启动移动端
cd apps/mobile && npm run android

# 5. 测试各项功能
```

---

## 快速开始（首次运行）

```bash
# 1. 安装依赖
cd e:\economic
pnpm install

# 2. 配置环境变量
cp apps/server/.env.example apps/server/.env
# 编辑 .env 填入配置

# 3. 启动数据库
# 确保 MySQL 已运行，且 economic 数据库已创建

# 4. 运行迁移
cd apps/server
npx prisma migrate dev

# 5. 填充测试数据
npx prisma db seed

# 6. 生成向量嵌入
npx ts-node prisma/seed-embeddings.ts

# 7. 启动服务
npm run start:dev

# 8. 启动移动端（新终端）
cd apps/mobile
npm run android
```

---

## 13. UI 设计稿对齐说明

移动端 UI 已按以下两份设计对齐（2026-05-30 更新）：

| 来源 | 路径 |
|------|------|
| 文字规范 | `docs/superpowers/specs/2026-05-29-ui-mockups.md` |
| Pencil 画板 | 外部 `untitled.pen`（JSON，主色 `#FF6B35`） |

### 已对齐页面/组件

- **AI 助手**：`AIScreen`、`ChatBubble`、`ChatInput`、`SearchResultCard` — 深度思考折叠、网络搜索卡片、图片预览条、餐厅推荐卡片
- **订单详情**：`OrderDetailScreen` — 配送中橙色状态卡、脉冲指示、实时更新文案、双按钮底栏
- **支付**：`PaymentScreen` — 支付宝/微信/银联列表、支付中/验证遮罩、成功页
- **地图**：`MapScreen` — 配送中骑手信息浮层
- **我的**：`SettingsScreen` — 使用分析、深色模式、语言切换
- **Tab 栏**：`MainTabs` — 深色模式背景与主色

### Cursor 继续开发时

1. 样式优先使用 `theme/tokens.ts` 与 `useTheme()`，避免在 `StyleSheet.create` 顶层引用 `colors`（无法响应深色模式）。
2. 文案走 `useTranslation`，键名见 `apps/mobile/src/i18n/locales/`。
3. 改 UI 时同时对照 `2026-05-29-ui-mockups.md` 与 `.pen` 中的尺寸/颜色。

---

## 联系与支持

- 项目文档：`docs/` 目录
- 开发计划：`docs/superpowers/plans/`
- UI 设计稿：`docs/superpowers/specs/2026-05-29-ui-mockups.md`
- Pencil 源文件：可放在项目根或 `docs/design/` 便于版本管理
- 技术亮点分析：`docs/superpowers/plans/2026-05-29-highlights-features-plan.md`
