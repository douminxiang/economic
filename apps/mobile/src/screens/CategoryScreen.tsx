import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useCategories, useShopList } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';
import { EmptyView } from '../components';

export default function CategoryScreen({ navigation, route }: any) {
  const initialCatId = route?.params?.categoryId;
  const { data: categories } = useCategories();
  const [selectedId, setSelectedId] = useState<number | undefined>(initialCatId);
  const { data: shopsData, fetchNextPage, hasNextPage, isFetchingNextPage } = useShopList({ categoryId: selectedId });
  const shops = shopsData?.pages?.flatMap((p: any) => p.data.items) || [];

  return (
    <View style={styles.container}>
      {/* Left: Category List */}
      <View style={styles.leftPanel}>
        <FlatList
          data={categories?.data || []}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={[styles.catItem, selectedId === item.id && styles.catItemActive]}
              onPress={() => setSelectedId(item.id)}
            >
              <Text style={styles.catIcon}>{item.icon}</Text>
              <Text style={[styles.catName, selectedId === item.id && styles.catNameActive]}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Right: Shop List */}
      <View style={styles.rightPanel}>
        <FlatList
          data={shops}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }: any) => (
            <TouchableOpacity style={styles.shopCard} onPress={() => navigation.navigate('ShopDetail', { id: item.id })}>
              <View style={styles.shopImage}><Text style={styles.shopImgText}>{item.name[0]}</Text></View>
              <View style={styles.shopInfo}>
                <Text style={styles.shopName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.shopMeta}>月售{item.monthlySales} · ⭐{Number(item.rating).toFixed(1)}</Text>
                <Text style={styles.shopMeta}>¥{item.minOrder}起送 · 配送费¥{item.deliveryFee}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<EmptyView message="暂无商家" />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  leftPanel: { width: 90, backgroundColor: colors.surface },
  catItem: { paddingVertical: spacing.md, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  catItemActive: { backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary },
  catIcon: { fontSize: 24 },
  catName: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  catNameActive: { color: colors.primary, fontWeight: '600' },
  rightPanel: { flex: 1 },
  shopCard: { flexDirection: 'row', backgroundColor: colors.surface, margin: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, ...shadows.sm },
  shopImage: { width: 56, height: 56, borderRadius: borderRadius.sm, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  shopImgText: { fontSize: fontSize.lg, color: colors.surface, fontWeight: 'bold' },
  shopInfo: { flex: 1, marginLeft: spacing.md, justifyContent: 'center' },
  shopName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  shopMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
});
