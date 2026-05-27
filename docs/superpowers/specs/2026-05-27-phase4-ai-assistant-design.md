# Phase 4：AI 智能助手 - 设计规格说明

> 日期：2026-05-27
> 项目：本地生活服务电商 App
> 模块：AI 对话助手

---

## 1. 概述

Phase 4 实现 AI 智能对话助手功能，通过 Claude API 为用户提供本地生活服务推荐、订单查询等智能交互体验。

---

## 2. 功能模块

### 2.1 AI 对话界面 (AIChatScreen)

**布局结构：**
- 状态栏 (44px)
- 顶部导航栏 (56px)：返回按钮 + 标题 "AI 智能助手" + 历史记录图标
- 聊天区域 (自适应)：消息气泡列表
- 底部输入栏 (60px)：输入框 + 发送按钮
- 底部 Tab 导航 (80px)

**消息类型：**
1. **AI 消息气泡**：白色背景，左侧对齐，带边框
2. **用户消息气泡**：蓝色背景 (#3B82F6)，右侧对齐
3. **快捷问题标签**：蓝色背景标签，点击直接发送

**快捷问题：**
- "附近有什么好吃的？"
- "人均 50 以内推荐"
- "评分最高的商家"
- "适合聚餐的地方"

### 2.2 AI 推荐结果页 (AIShopResultScreen)

**布局结构：**
- 状态栏
- 顶部导航栏：返回按钮 + 标题 "AI 推荐" + 筛选图标
- AI 回复消息气泡
- 分类筛选标签栏（全部、美食、小吃、饮品、甜点）
- 商家卡片列表

**商家卡片：**
- 渐变背景图片区域 (120px)
- 商家信息：名称、评分、分类、人均消费、距离
- 卡片圆角：12px，带边框

---

## 3. 设计规范

### 3.1 颜色系统

| 用途 | 颜色值 | 说明 |
|------|--------|------|
| 主色 | #3B82F6 | 蓝色，按钮、链接、用户气泡 |
| 背景色 | #F8F9FA | 页面背景 |
| 卡片背景 | #FFFFFF | 白色 |
| 主文本 | #1A1A1A | 深色 |
| 次要文本 | #666666 | 灰色 |
| 辅助文本 | #999999 | 浅灰 |
| 边框色 | #E5E7EB | 浅灰 |
| 评分色 | #F59E0B | 金色 |
| 价格色 | #10B981 | 绿色 |
| 距离色 | #3B82F6 | 蓝色 |

### 3.2 间距系统

- 页面内边距：16px
- 卡片内边距：12px
- 元素间距：8px / 12px / 16px
- 圆角：12px (卡片) / 16px (气泡) / 20px (输入框)

### 3.3 字体规范

| 元素 | 字号 | 字重 |
|------|------|------|
| 标题 | 18px | 600 |
| 正文 | 14px | 400 |
| 辅助文本 | 12-13px | 400 |
| 标签 | 12px | 400 |
| 导航 | 10px | 400 |

---

## 4. 交互流程

```
用户打开 AI 助手 Tab
    ↓
显示欢迎消息 + 快捷问题
    ↓
用户输入问题 或 点击快捷问题
    ↓
显示用户消息气泡
    ↓
AI 流式返回响应 (SSE)
    ↓
显示 AI 消息气泡 (逐字渲染)
    ↓
如涉及商家推荐 → 显示推荐结果卡片
    ↓
用户可点击卡片进入商家详情
```

---

## 5. 数据结构

### 5.1 消息对象

```typescript
interface AIMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}
```

### 5.2 对话对象

```typescript
interface AIConversation {
  id: number;
  userId: number;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 6. API 接口

### 6.1 发送消息 (SSE)

```
POST /api/v1/ai/chat
Body: { message: string, conversationId?: number }
Response: SSE Stream
```

### 6.2 获取对话历史

```
GET /api/v1/ai/history
Response: AIConversation[]
```

### 6.3 获取对话消息

```
GET /api/v1/ai/conversation/:id
Response: AIMessage[]
```

---

## 7. Pencil 设计文件

设计文件已保存至：`pencil-new.pen`

包含两个界面：
1. AI Chat Screen - 对话主界面
2. AI Recommendation Screen - 推荐结果界面

---

## 8. 后续步骤

1. 编写实现计划
2. 后端开发：AI 模块、Claude API 集成、SSE 流式响应
3. 前端开发：对话界面、消息组件、流式渲染
4. 测试与优化
