import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useProductDetail } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';

export default function ProductDetailScreen({ navigation, route }: any) {
  const { id } = route.params;
  const { data, isLoading } = useProductDetail(id);
  const [quantity, setQuantity] = useState(1);
  const product = data?.data;

  if (isLoading || !product) {
    return <View style={styles.loading}><Text>加载中...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Image */}
        <View style={styles.imageArea}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.imagePlaceholder}>商品图片</Text>
        </View>

        {/* Product Info */}
        <View style={styles.infoCard}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>¥{Number(product.price).toFixed(0)}</Text>
            <View style={styles.salesTag}>
              <Text style={styles.salesText}>已售{product.sales}</Text>
            </View>
          </View>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        {/* Shop Info */}
        <TouchableOpacity style={styles.shopCard} onPress={() => navigation.navigate('ShopDetail', { id: product.shopId })}>
          <View style={styles.shopIcon}><Text style={styles.shopIconText}>🏪</Text></View>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{product.shopName}</Text>
            <Text style={styles.shopMeta}>月售{product.shopMonthlySales} · ⭐{Number(product.shopRating).toFixed(1)}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.qtyControl}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
            <Text style={styles.qtyBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnPlus]} onPress={() => setQuantity(quantity + 1)}>
            <Text style={[styles.qtyBtnText, styles.qtyBtnPlusText]}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.addCartBtn}>
          <Text style={styles.addCartText}>🛒 加入购物车</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageArea: { height: 300, backgroundColor: '#555', justifyContent: 'center', alignItems: 'center' },
  imagePlaceholder: { color: '#FFFFFF99', fontSize: fontSize.md },
  backBtn: { position: 'absolute', top: 50, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: '#00000066', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  backText: { color: '#FFF', fontSize: fontSize.lg },
  infoCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  price: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.primary },
  salesTag: { backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
  salesText: { color: '#FFF', fontSize: fontSize.xs },
  productName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  description: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },
  shopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginTop: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  shopIcon: { width: 40, height: 40, borderRadius: borderRadius.sm, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  shopIconText: { fontSize: 20 },
  shopInfo: { flex: 1, marginLeft: spacing.md },
  shopName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  shopMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  arrow: { fontSize: fontSize.xl, color: colors.textLight },
  bottomBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, height: 64, paddingHorizontal: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  qtyBtnPlus: { backgroundColor: colors.primary },
  qtyBtnText: { fontSize: fontSize.lg, color: colors.textSecondary },
  qtyBtnPlusText: { color: '#FFF' },
  qtyText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  addCartBtn: { flex: 1, marginLeft: spacing.lg, backgroundColor: colors.primary, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  addCartText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
