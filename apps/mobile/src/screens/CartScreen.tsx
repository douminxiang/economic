import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from '../hooks';
import { useCartStore } from '../stores/cartStore';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';

export default function CartScreen({ navigation }: any) {
  const { data } = useCart();
  const cart = data?.data;
  const updateMut = useUpdateCartItem();
  const removeMut = useRemoveCartItem();
  const clearMut = useClearCart();
  const setItemCount = useCartStore((s) => s.setItemCount);

  useEffect(() => {
    const count = cart?.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) ?? 0;
    setItemCount(count);
  }, [cart, setItemCount]);

  const items = cart?.items || [];
  const totalAmount = cart?.totalAmount || 0;

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>购物车</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>购物车是空的</Text>
          <TouchableOpacity style={styles.goShopBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.goShopText}>去逛逛</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>购物车</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert('提示', '确定清空购物车？', [
            { text: '取消' },
            { text: '确定', onPress: () => clearMut.mutate() },
          ]);
        }}>
          <Text style={styles.clearText}>清空</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }: any) => (
          <View style={styles.itemCard}>
            <View style={styles.itemImagePlaceholder} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <Text style={styles.itemPrice}>¥{item.product.price}</Text>
            </View>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => {
                  if (item.quantity <= 1) {
                    removeMut.mutate(item.id);
                  } else {
                    updateMut.mutate({ id: item.id, quantity: item.quantity - 1 });
                  }
                }}
              >
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, styles.qtyBtnActive]}
                onPress={() => updateMut.mutate({ id: item.id, quantity: item.quantity + 1 })}
              >
                <Text style={[styles.qtyBtnText, styles.qtyBtnTextActive]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <View style={styles.bottomBar}>
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>合计：</Text>
          <Text style={styles.totalAmount}>¥{totalAmount.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text style={styles.checkoutText}>去结算({items.length})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  clearText: { fontSize: fontSize.sm, color: colors.textSecondary },
  listContent: { padding: spacing.md },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm,
  },
  itemImagePlaceholder: { width: 64, height: 64, borderRadius: borderRadius.sm, backgroundColor: '#F0F0F0' },
  itemInfo: { flex: 1, marginLeft: spacing.md },
  itemName: { fontSize: fontSize.md, fontWeight: '500', color: colors.text },
  itemPrice: { fontSize: fontSize.sm, color: colors.primary, marginTop: spacing.xs },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  qtyBtnText: { fontSize: fontSize.md, color: colors.textSecondary },
  qtyBtnTextActive: { color: '#FFFFFF' },
  qtyText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, minWidth: 20, textAlign: 'center' },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border, ...shadows.sm,
  },
  totalSection: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  totalLabel: { fontSize: fontSize.md, color: colors.text },
  totalAmount: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
  checkoutBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm, borderRadius: borderRadius.full,
  },
  checkoutText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.md },
  goShopBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  goShopText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '600' },
});
