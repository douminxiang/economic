import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useShopDetail } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';

export default function ShopDetailScreen({ navigation, route }: any) {
  const { id } = route.params;
  const { data, isLoading } = useShopDetail(id);
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews' | 'info'>('menu');
  const shop = data?.data;

  if (isLoading || !shop) {
    return <View style={styles.loading}><Text>加载中...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header Image */}
        <View style={styles.headerImage}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerPlaceholder}>商家图片</Text>
        </View>

        {/* Shop Info */}
        <View style={styles.infoCard}>
          <View style={styles.nameRow}>
            <Text style={styles.shopName}>{shop.name}</Text>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {Number(shop.rating).toFixed(1)}</Text>
            </View>
          </View>
          <Text style={styles.meta}>月售{shop.monthlySales} · {shop.address}</Text>
          <Text style={styles.meta}>配送费¥{shop.deliveryFee} · ¥{shop.minOrder}起送</Text>
          <Text style={styles.meta}>📍 {shop.businessHours || '09:00-22:00'}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['menu', 'reviews', 'info'] as const).map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'menu' ? '菜单' : tab === 'reviews' ? '评价' : '商家'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'menu' && shop.products?.map((group: any) => (
          <View key={group.categoryName}>
            <Text style={styles.menuCategory}>{group.categoryName}</Text>
            {group.products.map((product: any) => (
              <TouchableOpacity key={product.id} style={styles.productRow} onPress={() => navigation.navigate('ProductDetail', { id: product.id })}>
                <View style={styles.productImage}><Text style={styles.productImgText}>{product.name[0]}</Text></View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productMeta}>月售{product.sales}</Text>
                </View>
                <Text style={styles.productPrice}>¥{Number(product.price).toFixed(0)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {activeTab === 'reviews' && <Text style={styles.emptyTab}>暂无评价</Text>}
        {activeTab === 'info' && (
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>商家名称</Text>
            <Text style={styles.infoValue}>{shop.name}</Text>
            <Text style={styles.infoLabel}>地址</Text>
            <Text style={styles.infoValue}>{shop.address}</Text>
            <Text style={styles.infoLabel}>营业时间</Text>
            <Text style={styles.infoValue}>{shop.businessHours || '09:00-22:00'}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.cartIcon}>
          <Text style={styles.cartIconText}>🛒</Text>
        </View>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomPrice}>¥0.00</Text>
          <Text style={styles.bottomMeta}>另需配送费¥{shop.deliveryFee}</Text>
        </View>
        <View style={styles.bottomBtn}>
          <Text style={styles.bottomBtnText}>¥{Number(shop.minOrder).toFixed(0)}起送</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerImage: { height: 200, backgroundColor: '#444', justifyContent: 'center', alignItems: 'center' },
  headerPlaceholder: { color: '#FFFFFF99', fontSize: fontSize.md },
  backBtn: { position: 'absolute', top: 50, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: '#00000066', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  backText: { color: '#FFF', fontSize: fontSize.lg },
  infoCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  shopName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  ratingBadge: { backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  ratingText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: fontSize.md, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  menuCategory: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, padding: spacing.md, backgroundColor: colors.background },
  productRow: { flexDirection: 'row', backgroundColor: colors.surface, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, alignItems: 'center' },
  productImage: { width: 72, height: 72, borderRadius: borderRadius.sm, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  productImgText: { fontSize: fontSize.lg, color: colors.textSecondary },
  productInfo: { flex: 1, marginLeft: spacing.md },
  productName: { fontSize: fontSize.md, fontWeight: '500', color: colors.text },
  productMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  productPrice: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary },
  emptyTab: { textAlign: 'center', color: colors.textSecondary, padding: spacing.xl },
  infoSection: { padding: spacing.lg, backgroundColor: colors.surface },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.md },
  infoValue: { fontSize: fontSize.md, color: colors.text, marginTop: spacing.xs },
  bottomBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.text, height: 56, paddingHorizontal: spacing.md },
  cartIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  cartIconText: { fontSize: 20 },
  bottomInfo: { flex: 1, marginLeft: spacing.md },
  bottomPrice: { color: '#FFF', fontSize: fontSize.lg, fontWeight: '700' },
  bottomMeta: { color: '#FFFFFF99', fontSize: fontSize.xs },
  bottomBtn: { backgroundColor: colors.textLight, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md },
  bottomBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
});
