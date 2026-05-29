# Phase 2: AI 能力增强 — 实施计划

**日期：** 2026-05-29
**范围：** 深度思考、RAG 向量升级、多模态图片理解、联网搜索

---

## 当前状态

| 方面 | 状态 |
|------|------|
| AI 模型 | DeepSeek V3.2 via SiliconFlow |
| 流式响应 | SSE，XHR 实现 |
| RAG | 关键词数据库检索（Prisma contains） |
| 多模态 | 不支持 |
| 联网搜索 | 不支持 |
| 深度思考 | 不支持 |

---

## 实施顺序（依赖图）

```
Feature 2 (RAG 向量升级)    -- 独立，优先做
    ↓
Feature 1 (深度思考模式)    -- 独立，其次做
    ↓
Feature 3 (多模态图片)      -- 独立，第三做
    ↓
Feature 4 (联网搜索)        -- 依赖 tool calling 基础设施
```

**推荐执行顺序：** 2 → 1 → 3 → 4

---

## FEATURE 1: AI 深度思考模式

### 1.1 架构与数据流

```
用户发送消息
  → 后端: ai.service.ts 检查 thinkingEnabled 标志
  → 如果启用思考: 使用 DeepSeek-R1 模型，发送 enable_thinking 参数
  → SSE 流现在发射两种事件类型:
       { type: "thinking", thinkingChunk: "...推理 tokens..." }
       { type: "chunk", chunk: "...最终回答 tokens..." }
  → Controller 解析 reasoning_content 和 content
  → 前端: aiStore 新增 thinkingContent 字段
  → ChatBubble 渲染可折叠的思考过程区域
  → 后端保存思考+回答到 AIMessage（新增 thinking 字段）
```

### 1.2 文件清单

| 文件 | 操作 | 用途 |
|------|------|------|
| `apps/server/prisma/schema.prisma` | 修改 | AIMessage 新增 `thinking Text?` 字段 |
| `apps/server/src/modules/ai/dto/chat.dto.ts` | 修改 | 新增 `thinkingEnabled?: boolean` |
| `apps/server/src/modules/ai/ai.service.ts` | 修改 | 支持 DeepSeek-R1 模型，解析 reasoning_content |
| `apps/server/src/modules/ai/ai.controller.ts` | 修改 | SSE 流解析 thinking 和 chunk 两种事件 |
| `apps/mobile/src/stores/aiStore.ts` | 修改 | 新增 thinkingContent 字段和 updateLastAssistantThinking |
| `apps/mobile/src/components/ai/ChatBubble.tsx` | 修改 | 可折叠思考区域渲染 |
| `apps/mobile/src/services/api.ts` | 修改 | 处理 thinking SSE 事件 |
| `apps/mobile/src/screens/AIScreen.tsx` | 修改 | 传递 thinkingEnabled 参数 |

### 1.3 依赖

无需安装新依赖。

### 1.4 数据库变更

```prisma
model AIMessage {
  id             Int      @id @default(autoincrement())
  conversationId Int
  role           String   @db.VarChar(20)
  content        String   @db.Text
  thinking       String?  @db.Text    // 新增：DeepSeek 推理内容
  createdAt      DateTime @default(now())
  conversation   AIConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  @@index([conversationId])
  @@map("ai_messages")
}
```

### 1.5 API 合约

**请求 — POST /api/v1/ai/chat**
```json
{
  "message": "哪家川菜馆最辣？",
  "conversationId": 42,
  "thinkingEnabled": true
}
```

**SSE 响应（思考模式开启）：**
```
data: {"type":"thinking","thinkingChunk":"让我分析一下...","conversationId":42}
data: {"type":"thinking","thinkingChunk":"用户问的是川菜...","conversationId":42}
data: {"type":"chunk","chunk":"根据平台数据...","conversationId":42}
data: {"type":"chunk","chunk":"推荐以下川菜馆...","conversationId":42}
data: {"done":true,"conversationId":42}
```

### 1.6 UI Mockup — 思考区域

```
+-----------------------------------------------+
| [AI 头像]                                      |
|                                                |
|  [▾ Deep Thinking]          ← 可折叠          |
|  +-------------------------------------------+ |
|  | 我来分析一下用户的需求...                    | |
|  | 平台上的川菜馆有：                          | |
|  | 1. 蜀大侠 - 评分4.8，招牌水煮鱼            | |
|  | 2. 巴蜀风 - 评分4.5，毛血旺很辣            | |
|  +-------------------------------------------+ |
|                                                |
|  根据平台数据，为你推荐以下川菜馆：            |
|  🍽️ **蜀大侠**                                |
|  📍 地址：xxx                                  |
+-----------------------------------------------+
```

思考区域样式：浅灰背景 `#F5F5F5`，小字体 12px，左边框强调色 `#FF6B35`，圆角，内边距。

---

## FEATURE 2: RAG 向量升级

### 2.1 架构与数据流

```
种子脚本 / 店铺 CRUD:
  店铺数据 → EmbeddingService.generateEmbedding(text)
    → SiliconFlow POST /v1/embeddings (BAAI/bge-large-zh-v1.5)
    → 返回 float[1024] 向量
    → 存储为 JSON 到 Shop.embedding 字段

查询时:
  用户消息 → EmbeddingService.generateEmbedding(message)
    → 获取查询向量
    → 加载所有店铺向量（或关键词预过滤）
    → 应用层余弦相似度计算
    → 关键词分数（现有 Prisma contains）
    → 混合分数 = 向量分数 × 0.7 + 关键词分数 × 0.3
    → 取 top 10 店铺
    → 注入系统提示词
```

### 2.2 文件清单

| 文件 | 操作 | 用途 |
|------|------|------|
| `apps/server/prisma/schema.prisma` | 修改 | Shop 新增 `embedding Json?` |
| `apps/server/src/modules/ai/embedding.service.ts` | **新建** | 生成 embedding、余弦相似度、混合搜索 |
| `apps/server/src/modules/ai/ai.service.ts` | 修改 | 用 EmbeddingService 替换 buildDbContext |
| `apps/server/src/modules/ai/ai.module.ts` | 修改 | 注册 EmbeddingService |
| `apps/server/prisma/seed-embeddings.ts` | **新建** | 为所有店铺生成 embedding 的脚本 |

### 2.3 依赖

无需安装新依赖。Cosine similarity 在应用层计算（数据集 <1000 家店铺）。

### 2.4 数据库变更

```prisma
model Shop {
  // ... 现有字段 ...
  embedding   Json?    // 新增：float[1024] 向量
  // ...
}
```

### 2.5 核心代码

**embedding.service.ts:**
```typescript
const EMBEDDING_URL = 'https://api.siliconflow.cn/v1/embeddings';
const EMBEDDING_MODEL = 'BAAI/bge-large-zh-v1.5';

async generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float',
    }),
  });
  const data = await response.json();
  return data.data[0].embedding; // float[1024]
}

cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### 2.6 无 UI 变更

纯后端功能。聊天界面不变，响应质量因更精确的上下文检索而提升。

---

## FEATURE 3: 多模态图片理解

### 3.1 架构与数据流

```
用户点击 ChatInput 中的图片图标
  → React Native Image Picker 打开
  → 用户选择/拍摄照片
  → 图片上传到 POST /api/v1/upload/image（已有接口）
  → 服务端返回图片 URL
  → 前端发送带 imageUrl 的聊天请求
  → 后端构建多模态消息格式:
       { role: "user", content: [
         { type: "text", text: "这是什么菜？" },
         { type: "image_url", image_url: { url: "http://..." } }
       ]}
  → SiliconFlow 接收多模态内容
  → 响应正常流式返回文本
  → ChatBubble 渲染用户上传的图片
```

### 3.2 文件清单

| 文件 | 操作 | 用途 |
|------|------|------|
| `apps/server/src/modules/ai/dto/chat.dto.ts` | 修改 | 新增 `imageUrl?: string` |
| `apps/server/src/modules/ai/ai.service.ts` | 修改 | 构建多模态消息格式 |
| `apps/mobile/src/components/ai/ChatInput.tsx` | 修改 | 新增图片选择按钮和预览 |
| `apps/mobile/src/components/ai/ChatBubble.tsx` | 修改 | 渲染用户上传的图片 |
| `apps/mobile/src/stores/aiStore.ts` | 修改 | AIMessage 新增 imageUrl |
| `apps/mobile/src/services/api.ts` | 修改 | 请求中传递 imageUrl |

### 3.3 依赖

**Mobile:**
```bash
cd apps/mobile
npm install react-native-image-picker
```

### 3.4 数据库变更

```prisma
model AIMessage {
  // ... 现有字段 ...
  imageUrl    String?  @db.VarChar(500)  // 新增：用户上传的图片 URL
  // ...
}
```

### 3.5 UI Mockup — 聊天图片选择

```
+-----------------------------------------------+
| [📷] [输入消息...]                      [↑]   |  ← 输入栏
+-----------------------------------------------+

选择图片后:

+-----------------------------------------------+
| ┌──────────────┐                              |
| │ [预览图片]    │  ✕                           |  ← 图片预览
| └──────────────┘                              |
| [📷] [这是什么菜？]                      [↑]   |
+-----------------------------------------------+

发送的消息:

+-----------------------------------------------+
|                  ┌──────────────┐              |
|                  │ [用户的      │              |  ← 用户气泡
|                  │  照片]       │              |
|                  └──────────────┘              |
|                  这是什么菜？                   |
+-----------------------------------------------+
```

---

## FEATURE 4: 联网搜索 / Tool Calling

### 4.1 架构与数据流

```
用户问需要网络信息的问题
  → 后端: 发送消息 + web_search tool 定义给 DeepSeek V3.2
  → 模型决定是否调用 web_search 工具
  → 如果有 tool_call:
       a. 解析 tool_calls
       b. 通过 SearchService 执行搜索
       c. 将搜索结果注入上下文
       d. 重新调用模型
       e. 流式返回最终回答
  → 如果无 tool_call: 正常响应
  → 前端: 搜索结果显示为卡片
```

### 4.2 文件清单

| 文件 | 操作 | 用途 |
|------|------|------|
| `apps/server/src/modules/ai/search.service.ts` | **新建** | DuckDuckGo / Serper 网页搜索 |
| `apps/server/src/modules/ai/ai.service.ts` | 修改 | 添加 tool 定义，处理 tool_call 循环 |
| `apps/server/src/modules/ai/ai.controller.ts` | 修改 | 发送搜索结果事件 |
| `apps/server/src/modules/ai/ai.module.ts` | 修改 | 注册 SearchService |
| `apps/mobile/src/stores/aiStore.ts` | 修改 | AIMessage 新增 searchResults |
| `apps/mobile/src/components/ai/ChatBubble.tsx` | 修改 | 渲染搜索结果卡片 |
| `apps/mobile/src/components/ai/SearchResultCard.tsx` | **新建** | 搜索结果卡片组件 |

### 4.3 依赖

**Server（可选）：**
```bash
cd apps/server
npm install cheerio    # 解析 DuckDuckGo HTML 结果
```

DuckDuckGo HTML 端点免费，无需 API Key。

### 4.4 API 合约

**请求 — POST /api/v1/ai/chat**
```json
{
  "message": "最近有什么新开的网红餐厅吗？",
  "conversationId": 42,
  "webSearch": true
}
```

**SSE 响应：**
```
data: {"type":"search","searchResults":[{"title":"xxx","url":"...","snippet":"..."}],"conversationId":42}
data: {"type":"chunk","chunk":"根据网上搜索结果...","conversationId":42}
data: {"done":true,"conversationId":42}
```

### 4.5 UI Mockup — 搜索结果卡片

```
+-----------------------------------------------+
| [AI 头像]                                      |
|                                                |
|  🔍 网络搜索结果                    ← 标题     |
|  +-------------------------------------------+ |
|  | 2024年最火的网红餐厅盘点                   | |
|  | 来自小红书的推荐，包含多家...              | |
|  | www.xiaohongshu.com/...          ← 链接   | |
|  +-------------------------------------------+ |
|  | 本地美食新店开业信息                       | |
|  | www.dianping.com/...              ← 链接  | |
|  +-------------------------------------------+ |
|                                                |
|  根据网上搜索结果，推荐以下餐厅：              |
|  🍽️ **xxx餐厅**                               |
+-----------------------------------------------+
```

---

## 数据库变更汇总

```prisma
// Phase 2 所有迁移后的最终状态：

model AIMessage {
  id             Int      @id @default(autoincrement())
  conversationId Int
  role           String   @db.VarChar(20)
  content        String   @db.Text
  thinking       String?  @db.Text        // Feature 1: 推理内容
  imageUrl       String?  @db.VarChar(500) // Feature 3: 用户上传图片
  createdAt      DateTime @default(now())
  conversation   AIConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  @@index([conversationId])
  @@map("ai_messages")
}

model Shop {
  // ... 所有现有字段 ...
  embedding      Json?    // Feature 2: 向量嵌入 (float[1024])
  // ...
}
```

## 新增/修改文件汇总

| 文件 | Feature | 操作 |
|------|---------|------|
| `apps/server/prisma/schema.prisma` | 1,2,3 | 修改（3 个字段） |
| `apps/server/src/modules/ai/dto/chat.dto.ts` | 1,3,4 | 修改 |
| `apps/server/src/modules/ai/ai.service.ts` | 1,2,3,4 | 修改（重大） |
| `apps/server/src/modules/ai/ai.controller.ts` | 1,4 | 修改（重大） |
| `apps/server/src/modules/ai/ai.module.ts` | 2,4 | 修改 |
| `apps/server/src/modules/ai/embedding.service.ts` | 2 | **新建** |
| `apps/server/src/modules/ai/search.service.ts` | 4 | **新建** |
| `apps/server/prisma/seed-embeddings.ts` | 2 | **新建** |
| `apps/mobile/src/stores/aiStore.ts` | 1,3,4 | 修改 |
| `apps/mobile/src/components/ai/ChatBubble.tsx` | 1,3,4 | 修改（重大） |
| `apps/mobile/src/components/ai/ChatInput.tsx` | 3 | 修改 |
| `apps/mobile/src/components/ai/SearchResultCard.tsx` | 4 | **新建** |
| `apps/mobile/src/services/api.ts` | 1,3,4 | 修改 |
| `apps/mobile/src/screens/AIScreen.tsx` | 1,3,4 | 修改 |

## 依赖汇总

| 包 | 位置 | Feature |
|----|------|---------|
| `react-native-image-picker` | mobile | Feature 3（多模态） |
| `cheerio` | server（可选） | Feature 4（联网搜索） |

## 工时估算

| Feature | 后端 | 前端 | 合计 |
|---------|------|------|------|
| Feature 2: RAG 向量升级 | 2天 | 0.5天 | 2.5天 |
| Feature 1: 深度思考 | 1.5天 | 1.5天 | 3天 |
| Feature 3: 多模态 | 1天 | 1.5天 | 2.5天 |
| Feature 4: 联网搜索 | 2天 | 1.5天 | 3.5天 |
| **合计** | **6.5天** | **5天** | **~11.5天** |
