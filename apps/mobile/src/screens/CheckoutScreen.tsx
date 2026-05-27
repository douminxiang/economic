import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useCart, useCreateOrder, usePayOrder, useAddressList } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';

export default function CheckoutScreen({ navigation }: any) {
  const { data: cartData } = useCart();
  const cart = cartData?.data;
  const { data: addrData } = useAddressList();
  const addresses = addrData?.data || [];
  const defaultAddr = addresses.find((a: any) => a.isDefault) || addresses[0];
  const createMut = useCreateOrder();
  const payMut = usePayOrder();
  const [remark, setRemark] = useState('');

  const handleSubmit = () => {
    if (!defaultAddr) {
      Alert.alert('提示', '请先添加收货地址');
      return;
    }
    createMut.mutate(
      { addressId: defaultAddr.id, remark: remark || undefined },
      {
        onSuccess: (res: any) => {
          const order = res.data;
          payMut.mutate(
            { id: order.id },
            {
              onSuccess: () => {
                Alert.alert('提示', '支付成功', [
                  { text: '查看订单', onPress: () => navigation.replace('OrderDetail', { id: order.id }) },
                ]);
              },
            },
          );
        },
      },
    );
  };

  const items = cart?.items || [];
  const totalAmount = cart?.totalAmount || 0;
  const deliveryFee = 5;
  const packagingFee = 2;
  const payAmount = totalAmount + deliveryFee + packagingFee;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>确认订单</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Address */}
        <TouchableOpacity style={styles.addressCard} onPress={() => navigation.navigate('Address')}>
          <Text style={styles.addressIcon}>📍</Text>
          {defaultAddr ? (
            <View style={styles.addressInfo}>
              <Text style={styles.addressName}>{defaultAddr.name}  {defaultAddr.phone}</Text>
              <Text style={styles.addressDetail}>{defaultAddr.province}{defaultAddr.city}{defaultAddr.district}{defaultAddr.detail}</Text>
            </View>
          ) : (
            <Text style={styles.addressEmpty}>请选择收货地址</Text>
          )}
          <Text style={styles.addressArrow}>›</Text>
        </TouchableOpacity>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>商品明细</Text>
          {items.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.product.name} x{item.quantity}</Text>
              <Text style={styles.itemPrice}>¥{(item.product.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Fees */}
        <View style={styles.section}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>商品合计</Text>
            <Text style={styles.feeValue}>¥{totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>配送费</Text>
            <Text style={styles.feeValue}>¥{deliveryFee.toFixed(2)}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>包装费</Text>
            <Text style={styles.feeValue}>¥{packagingFee.toFixed(2)}</Text>
          </View>
        </View>

        {/* Remark */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>备注</Text>
          <TextInput
            style={styles.remarkInput}
            placeholder="如：不要辣、少放盐等"
            value={remark}
            onChangeText={setRemark}
            maxLength={200}
          />
        </View>
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottomBar}>
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>合计：</Text>
          <Text style={styles.totalAmount}>¥{payAmount.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>提交订单</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, height: 56, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backText: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  content: { flex: 1, padding: spacing.md },
  addressCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  addressIcon: { fontSize: 20, marginRight: spacing.sm },
  addressInfo: { flex: 1 },
  addressName: { fontSize: fontSize.md, fontWeight: '500', color: colors.text },
  addressDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  addressEmpty: { flex: 1, fontSize: fontSize.md, color: colors.textSecondary },
  addressArrow: { fontSize: 24, color: colors.textLight },
  section: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs,
  },
  itemName: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  itemPrice: { fontSize: fontSize.sm, color: colors.text },
  feeRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs,
  },
  feeLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  feeValue: { fontSize: fontSize.sm, color: colors.text },
  remarkInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    padding: spacing.sm, fontSize: fontSize.sm, minHeight: 60,
  },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border, ...shadows.sm,
  },
  totalSection: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  totalLabel: { fontSize: fontSize.md, color: colors.text },
  totalAmount: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
  submitBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md, borderRadius: borderRadius.full,
  },
  submitText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '600' },
});
