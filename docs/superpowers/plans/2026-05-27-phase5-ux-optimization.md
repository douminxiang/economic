# Phase 5: 体验优化 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development 或 superpowers:executing-plans 逐任务实现此计划。

**目标：** 提升用户体验，包括浏览历史、下拉刷新、页面动画、骨架屏、错误处理和丰富种子数据。

**架构：** 后端添加浏览历史 API，前端增强列表交互和加载体验，填充 50+ 商家、500+ 商品种子数据。

**技术栈：** NestJS, Prisma, React Native, react-native-reanimated, FlatList

---

## 文件结构

### 后端

| 文件 | 职责 |
|------|------|
| `apps/server/prisma/schema.prisma` | 添加 BrowseHistory 模型 |
| `apps/server/src/modules/browse-history/browse-history.module.ts` | 浏览历史模块 |
| `apps/server/src/modules/browse-history/browse-history.controller.ts` | API 接口 |
| `apps/server/src/modules/browse-history/browse-history.service.ts` | 业务逻辑 |
| `apps/server/prisma/seed.ts` | 种子数据（重写） |

### 前端

| 文件 | 职责 |
|------|------|
| `apps/mobile/src/screens/HistoryScreen.tsx` | 浏览历史页面 |
| `apps/mobile/src/screens/HomeScreen.tsx` | 添加下拉刷新+骨架屏 |
| `apps/mobile/src/screens/ShopDetailScreen.tsx` | 添加下拉刷新+骨架屏 |
| `apps/mobile/src/components/Skeleton.tsx` | 骨架屏通用组件 |
| `apps/mobile/src/components/ErrorView.tsx` | 错误状态通用组件 |
| `apps/mobile/src/hooks/usePullRefresh.ts` | 下拉刷新+无限滚动 Hook |
| `apps/mobile/src/navigation/HomeStack.tsx` | 注册 HistoryScreen |
| `apps/mobile/src/services/api.ts` | 添加浏览历史 API |

---

## 任务 1: 浏览历史 - 后端

**文件：**
- 修改：`apps/server/prisma/schema.prisma`
- 创建：`apps/server/src/modules/browse-history/` (module, controller, service)

- [ ] **步骤 1: 添加 Prisma 模型**

```prisma
model BrowseHistory {
  id        Int      @id @default(autoincrement())
  userId    Int
  shopId    Int
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@unique([userId, shopId])
  @@index([userId])
  @@map("browse_histories")
}
```

User 模型添加：`browseHistories BrowseHistory[]`
Shop 模型添加：`browseHistories BrowseHistory[]`

- [ ] **步骤 2: 创建 BrowseHistory Service**

```typescript
@Injectable()
export class BrowseHistoryService {
  constructor(private prisma: PrismaService) {}

  async record(userId: number, shopId: number) {
    await this.prisma.browseHistory.upsert({
      where: { userId_shopId: { userId, shopId } },
      update: { createdAt: new Date() },
      create: { userId, shopId },
    });
  }

  async getHistory(userId: number, group: 'today' | 'week' | 'older') {
    const now = new Date();
    let startDate: Date;
    if (group === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (group === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(0);
    }

    return this.prisma.browseHistory.findMany({
      where: { userId, createdAt: { gte: startDate } },
      include: { shop: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAll(userId: number) {
    await this.prisma.browseHistory.deleteMany({ where: { userId } });
  }
}
```

- [ ] **步骤 3: 创建 Controller + Module**

```typescript
@Controller('browse-history')
export class BrowseHistoryController {
  constructor(private service: BrowseHistoryService) {}

  @Post('record')
  async record(@CurrentUser() user: any, @Body() body: { shopId: number }) {
    return this.service.record(user.id, body.shopId);
  }

  @Get()
  async getHistory(@CurrentUser() user: any, @Query('group') group: string) {
    return this.service.getHistory(user.id, group as any);
  }

  @Delete()
  async deleteAll(@CurrentUser() user: any) {
    return this.service.deleteAll(user.id);
  }
}
```

- [ ] **步骤 4: AppModule 注册 BrowseHistoryModule**

- [ ] **步骤 5: prisma db push + Commit**

```bash
cd apps/server && npx prisma db push
git add -A && git commit -m "feat: add browse history module"
```

---

## 任务 2: 浏览历史 - 前端

**文件：**
- 创建：`apps/mobile/src/screens/HistoryScreen.tsx`
- 修改：`apps/mobile/src/navigation/HomeStack.tsx`
- 修改：`apps/mobile/src/services/api.ts`

- [ ] **步骤 1: 在 api.ts 中添加 browseHistoryApi**

```typescript
export const browseHistoryApi = {
  record: (shopId: number) => api.post('/browse-history/record', { shopId }),
  list: (group: string) => api.get('/browse-history', { params: { group } }),
  clear: () => api.delete('/browse-history'),
};
```

- [ ] **步骤 2: 创建 HistoryScreen**

```tsx
import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../theme/tokens';
import { browseHistoryApi } from '../services/api';
import { useNavigation } from '@react-navigation/native';

export default function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'older'>('today');
  const [items, setItems] = useState<any[]>([]);
  const navigation = useNavigation();

  const loadHistory = async () => {
    try {
      const res = await browseHistoryApi.list(activeTab);
      setItems(res.data || []);
    } catch {}
  };

  useEffect(() => { loadHistory(); }, [activeTab]);

  const handleClear = () => {
    Alert.alert('清空历史', '确定要清空所有浏览历史吗？', [
      { text: '取消' },
      { text: '清空', style: 'destructive', onPress: async () => {
        await browseHistoryApi.clear();
        setItems([]);
      }},
    ]);
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ShopDetail', { id: item.shopId })}>
      <Image source={{ uri: item.shop?.images?.[0] }} style={styles.cardImage} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.shop?.name}</Text>
        <Text style={styles.cardMeta}>{item.shop?.category?.name} | ¥{item.shop?.minOrder}/人 | ⭐ {item.shop?.rating}</Text>
        <Text style={styles.cardTime}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(['today', 'week', 'older'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'today' ? '今天' : tab === 'week' ? '本周' : '更早'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={handleClear}><Text style={styles.clearText}>清空</Text></TouchableOpacity>
      </View>
      <FlatList data={items} renderItem={renderItem} keyExtractor={item => String(item.id)} contentContainerStyle={styles.list} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', padding: spacing.md, gap: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingBottom: spacing.xs },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: fontSize.md, color: colors.textLight },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  clearText: { fontSize: fontSize.sm, color: colors.textLight, marginLeft: 'auto' },
  list: { padding: spacing.md, gap: spacing.sm },
  card: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.sm, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardImage: { width: 60, height: 60, borderRadius: borderRadius.sm },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: fontSize.sm, color: colors.textSecondary },
  cardTime: { fontSize: fontSize.xs, color: colors.textLight },
});
```

- [ ] **步骤 3: HomeStack 注册 HistoryScreen**

- [ ] **步骤 4: Commit**

---

## 任务 3: 骨架屏通用组件

**文件：**
- 创建：`apps/mobile/src/components/Skeleton.tsx`

- [ ] **步骤 1: 创建 Skeleton 组件**

```tsx
import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, borderRadius } from '../theme/tokens';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 20, borderRadius: br = 4 }) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return <Animated.View style={{ width, height, borderRadius: br, backgroundColor: colors.border, opacity }} />;
};

export const ShopCardSkeleton = () => (
  <View style={s.card}>
    <Skeleton height={100} borderRadius={8} />
    <View style={s.info}>
      <Skeleton width={120} height={16} />
      <Skeleton width={80} height={12} />
    </View>
  </View>
);

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: colors.border },
  info: { gap: 6 },
});
```

- [ ] **步骤 2: Commit**

```bash
git add apps/mobile/src/components/Skeleton.tsx
git commit -m "feat: create Skeleton loading component"
```

---

## 任务 4: 错误状态通用组件

**文件：**
- 创建：`apps/mobile/src/components/ErrorView.tsx`

- [ ] **步骤 1: 创建 ErrorView 组件**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, spacing, borderRadius } from '../theme/tokens';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export const ErrorView: React.FC<Props> = ({ message = '网络连接失败', onRetry }) => (
  <View style={styles.container}>
    <Icon name="wifi-outline" size={64} color="#D1D5DB" />
    <Text style={styles.title}>{message}</Text>
    <Text style={styles.desc}>请检查网络连接后重试</Text>
    {onRetry && (
      <TouchableOpacity style={styles.btn} onPress={onRetry}>
        <Icon name="refresh" size={16} color={colors.white} />
        <Text style={styles.btnText}>重新加载</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  desc: { fontSize: 14, color: colors.textSecondary },
  btn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: borderRadius.md, marginTop: spacing.md },
  btnText: { fontSize: 14, fontWeight: '600', color: colors.white },
});
```

- [ ] **步骤 2: Commit**

---

## 任务 5: 下拉刷新 + 无限滚动 Hook

**文件：**
- 创建：`apps/mobile/src/hooks/usePullRefresh.ts`

- [ ] **步骤 1: 创建 Hook**

```typescript
import { useState, useCallback } from 'react';

interface UsePullRefreshOptions<T> {
  fetchFn: (page: number) => Promise<{ data: T[]; total: number }>;
  pageSize?: number;
}

export function usePullRefresh<T>({ fetchFn, pageSize = 10 }: UsePullRefreshOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetchFn(1);
      setData(res.data);
      setPage(1);
      setHasMore(res.data.length < res.total);
    } catch {} finally {
      setRefreshing(false);
    }
  }, [fetchFn]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetchFn(nextPage);
      setData(prev => [...prev, ...res.data]);
      setPage(nextPage);
      setHasMore(res.data.length < res.total);
    } catch {} finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore, fetchFn]);

  return { data, refreshing, loadingMore, hasMore, refresh, loadMore };
}
```

- [ ] **步骤 2: Commit**

---

## 任务 6: HomeScreen 下拉刷新 + 骨架屏

**文件：**
- 修改：`apps/mobile/src/screens/HomeScreen.tsx`

- [ ] **步骤 1: 读取 HomeScreen 并集成骨架屏和下拉刷新**

为 HomeScreen 添加：
- `refreshing` 状态控制下拉刷新
- 骨架屏在 `loading` 时显示
- FlatList 添加 `onRefresh` 和 `onEndReached`

- [ ] **步骤 2: Commit**

---

## 任务 7: ShopDetailScreen 下拉刷新 + 骨架屏

**文件：**
- 修改：`apps/mobile/src/screens/ShopDetailScreen.tsx`

- [ ] **步骤 1: 读取 ShopDetailScreen 并集成骨架屏和下拉刷新**

- [ ] **步骤 2: Commit**

---

## 任务 8: 页面过渡动画

**文件：**
- 修改：`apps/mobile/src/navigation/HomeStack.tsx`
- 修改：`apps/mobile/src/navigation/RootNavigator.tsx`

- [ ] **步骤 1: 读取导航配置并添加 react-native-reanimated 过渡动画**

- [ ] **步骤 2: Commit**

---

## 任务 9: 种子数据完善

**文件：**
- 修改：`apps/server/prisma/seed.ts`

- [ ] **步骤 1: 读取现有 seed.ts 并扩展到 50+ 商家、500+ 商品**

使用循环和模板数据生成足够的商家和商品。

- [ ] **步骤 2: 运行 seed**

```bash
cd apps/server && npx ts-node prisma/seed.ts
```

- [ ] **步骤 3: Commit**

---

## 任务 10: 测试与验证

- [ ] **步骤 1: 验证后端编译**
- [ ] **步骤 2: 验证前端编译**
- [ ] **步骤 3: 最终 commit**
