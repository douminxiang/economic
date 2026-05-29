import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProductDetail, useAddToCart } from '../hooks';
import { useCartStore } from '../stores/cartStore';
import { spacing, fontSize, borderRadius, shadows } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export default function ProductDetailScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    imageArea: { height: 300, backgroundColor: colors.headerDark, justifyContent: 'center', alignItems: 'center' },
    imagePlaceholder: { color: '#FFFFFF99', fontSize: fontSize.md },
    backBtn: { position: 'absolute', top: 50, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.overlayDark, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    backText: { color: colors.white, fontSize: fontSize.lg },
    infoCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    price: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.primary },
    salesTag: { backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
    salesText: { color: colors.white, fontSize: fontSize.xs },
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
    qtyBtnPlusText: { color: colors.white },
    qtyText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
    addCartBtn: { flex: 1, marginLeft: spacing.lg, backgroundColor: colors.primary, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
    addCartText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
  });

  const { id } = route.params;
  const { data, isLoading } = useProductDetail(id);
  const addToCart = useAddToCart();
  const setItemCount = useCartStore((s) => s.setItemCount);
  const [quantity, setQuantity] = useState(1);
  const product = data?.data;

  if (isLoading || !product) {
    return <View style={styles.loading}><Text>{t('common.loading')}</Text></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Image */}
        <View style={styles.imageArea}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.imagePlaceholder}>{t('product.image')}</Text>
        </View>

        {/* Product Info */}
        <View style={styles.infoCard}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>¥{Number(product.price).toFixed(0)}</Text>
            <View style={styles.salesTag}>
              <Text style={styles.salesText}>{t('product.sold')}{product.sales}</Text>
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
            <Text style={styles.shopMeta}>{t('shop.monthlySales')}{product.shopMonthlySales} · ⭐{Number(product.shopRating).toFixed(1)}</Text>
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
        <TouchableOpacity
          style={[styles.addCartBtn, addToCart.isPending && { opacity: 0.6 }]}
          disabled={addToCart.isPending}
          onPress={() => {
            addToCart.mutate(
              { productId: product.id, quantity },
              {
                onSuccess: () => {
                  Alert.alert(t('common.tip'), t('product.addedToCart'));
                  setItemCount(quantity);
                },
                onError: () => Alert.alert(t('common.tip'), t('product.addFailed')),
              },
            );
          }}
        >
          <Text style={styles.addCartText}>
            {addToCart.isPending ? t('product.adding') : t('product.addToCart')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
