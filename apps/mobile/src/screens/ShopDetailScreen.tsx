import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { MapView, Marker } from 'react-native-amap3d';
import { useShopDetail, useCart } from '../hooks';
import { useCartStore } from '../stores/cartStore';
import { colors, spacing, fontSize, borderRadius } from '../theme/tokens';
import { Skeleton } from '../components/Skeleton';
import { ErrorView } from '../components/ErrorView';
import { EmptyView } from '../components';

const ShopDetailSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.headerImage} />
    <View style={styles.infoCard}>
      <View style={styles.nameRow}>
        <Skeleton width={160} height={22} />
        <Skeleton width={60} height={22} borderRadius={borderRadius.sm} />
      </View>
      <Skeleton width="80%" height={14} />
      <Skeleton width="60%" height={14} />
      <Skeleton width="50%" height={14} />
    </View>
    <View style={styles.tabs}>
      <Skeleton width="33%" height={40} />
      <Skeleton width="33%" height={40} />
      <Skeleton width="33%" height={40} />
    </View>
    {[1, 2, 3, 4].map((i) => (
      <View key={i} style={styles.productRow}>
        <Skeleton width={72} height={72} borderRadius={borderRadius.sm} />
        <View style={styles.productInfo}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="40%" height={12} />
        </View>
        <Skeleton width={40} height={20} />
      </View>
    ))}
  </View>
);

export default function ShopDetailScreen({ navigation, route }: any) {
  const { id } = route.params;
  const { data, isLoading, refetch, isRefetching } = useShopDetail(id);
  const { data: cartData } = useCart();
  const cartItemCount = useCartStore((s) => s.itemCount);
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews' | 'info'>('menu');
  const [error, setError] = useState<string | null>(null);
  const shop = data?.data;

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorView message={error} onRetry={() => { setError(null); refetch(); }} />
      </View>
    );
  }

  if (isLoading || !shop) {
    return <ShopDetailSkeleton />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
      >
        <View style={styles.headerImage}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerPlaceholder}>商家图片</Text>
        </View>

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

        <View style={styles.tabs}>
          {(['menu', 'reviews', 'info'] as const).map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'menu' ? '菜单' : tab === 'reviews' ? '评价' : '商家'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'menu' && (
          <View style={styles.mapSection}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>商家位置</Text>
              <TouchableOpacity
                style={styles.routeButton}
                onPress={() => navigation.navigate('Route', { shop })}
              >
                <Text style={styles.routeButtonText}>查看路线</Text>
              </TouchableOpacity>
            </View>
            <MapView
              key={`shop-${shop.id}`}
              style={styles.map}
              initialCameraPosition={{
                target: { latitude: Number(shop.latitude), longitude: Number(shop.longitude) },
                zoom: 15,
              }}
            >
              <Marker
                position={{ latitude: Number(shop.latitude), longitude: Number(shop.longitude) }}
              />
            </MapView>
            <View style={styles.mapAddress}>
              <Text style={styles.mapAddressIcon}>📍</Text>
              <Text style={styles.mapAddressText}>{shop.address}</Text>
            </View>
          </View>
        )}

        {activeTab === 'menu' && shop.products?.map((group: any, groupIdx: number) => (
          <View key={`${group.categoryName}-${groupIdx}`}>
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

        {activeTab === 'reviews' && <EmptyView message="暂无评价" />}
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

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cartIcon} onPress={() => navigation.navigate('Home', { screen: 'Cart' })}>
          <Text style={styles.cartIconText}>🛒</Text>
          {cartItemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
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
  headerImage: { height: 200, backgroundColor: colors.headerDark, justifyContent: 'center', alignItems: 'center' },
  headerPlaceholder: { color: '#FFFFFF99', fontSize: fontSize.md },
  backBtn: { position: 'absolute', top: 50, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.overlayDark, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  backText: { color: colors.white, fontSize: fontSize.lg },
  infoCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg, gap: spacing.xs },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  shopName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  ratingBadge: { backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  ratingText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: fontSize.md, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  menuCategory: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, padding: spacing.md, backgroundColor: colors.background },
  productRow: { flexDirection: 'row', backgroundColor: colors.surface, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, alignItems: 'center', gap: spacing.md },
  productImage: { width: 72, height: 72, borderRadius: borderRadius.sm, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  productImgText: { fontSize: fontSize.lg, color: colors.textSecondary },
  productInfo: { flex: 1, gap: spacing.xs },
  productName: { fontSize: fontSize.md, fontWeight: '500', color: colors.text },
  productMeta: { fontSize: fontSize.xs, color: colors.textSecondary },
  productPrice: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary },
  infoSection: { padding: spacing.lg, backgroundColor: colors.surface },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.md },
  infoValue: { fontSize: fontSize.md, color: colors.text, marginTop: spacing.xs },
  bottomBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.text, height: 56, paddingHorizontal: spacing.md },
  cartIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  cartIconText: { fontSize: 20 },
  cartBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#FF3B30', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  bottomInfo: { flex: 1, marginLeft: spacing.md },
  bottomPrice: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  bottomMeta: { color: '#FFFFFF99', fontSize: fontSize.xs },
  bottomBtn: { backgroundColor: colors.textLight, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md },
  bottomBtnText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
  mapSection: { backgroundColor: colors.surface, marginBottom: spacing.sm },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  mapTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  routeButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  routeButtonText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
  map: { width: '100%', height: 180 },
  mapAddress: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  mapAddressIcon: { fontSize: fontSize.md },
  mapAddressText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
});
