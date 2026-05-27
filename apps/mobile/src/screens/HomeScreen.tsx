import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useCategories, useRecommendedShops } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';
import { Skeleton } from '../components/Skeleton';
import { ErrorView } from '../components/ErrorView';
import { EmptyView } from '../components';

const HomeSkeleton = () => (
  <>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.categorySkeletonItem}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <Skeleton width={40} height={12} borderRadius={6} />
        </View>
      ))}
    </ScrollView>
    <Text style={styles.sectionTitle}>推荐商家</Text>
    {[1, 2, 3, 4, 5].map((i) => (
      <View key={i} style={styles.shopCard}>
        <Skeleton width={64} height={64} borderRadius={borderRadius.md} />
        <View style={styles.shopInfo}>
          <Skeleton width="70%" height={16} borderRadius={4} />
          <View style={{ marginTop: 8 }}>
            <Skeleton width="50%" height={12} borderRadius={4} />
          </View>
          <View style={{ marginTop: 4 }}>
            <Skeleton width="60%" height={12} borderRadius={4} />
          </View>
        </View>
      </View>
    ))}
  </>
);

export default function HomeScreen({ navigation }: any) {
  const { data: categories, isLoading: catsLoading, isError: catsError, error: catsErrorObj, refetch: refetchCats } = useCategories();
  const { data: shopsData, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching, isError: shopsError, error: shopsErrorObj, isLoading: shopsLoading } = useRecommendedShops();
  const shops = shopsData?.pages?.flatMap((page: any) => page.data?.items || []) || [];

  const isLoading = catsLoading && shops.length === 0;
  const hasError = catsError || shopsError;
  const errorMessage = (catsErrorObj as any)?.message || (shopsErrorObj as any)?.message || '网络连接失败';

  const handleRetry = () => {
    refetchCats();
    refetch();
  };

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.searchBar}>
          <Text style={styles.searchPlaceholder}>🔍 搜索商家或美食</Text>
        </TouchableOpacity>
        <ScrollView>
          <HomeSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (hasError && shops.length === 0) {
    return (
      <View style={styles.container}>
        <ErrorView message={errorMessage} onRetry={handleRetry} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        ListEmptyComponent={<EmptyView message="暂无商家" />}
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
  categorySkeletonItem: { alignItems: 'center', marginRight: spacing.lg, marginTop: spacing.sm, gap: 6 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, margin: spacing.md },
  shopCard: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', ...shadows.sm },
  shopImage: { width: 64, height: 64, borderRadius: borderRadius.md, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  shopImageText: { fontSize: fontSize.xl, color: colors.surface, fontWeight: 'bold' },
  shopInfo: { flex: 1, marginLeft: spacing.md },
  shopName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  shopMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  shopRating: { fontSize: fontSize.sm, color: colors.warning, fontWeight: '600' },
  listContent: { paddingBottom: spacing.xl },
});
