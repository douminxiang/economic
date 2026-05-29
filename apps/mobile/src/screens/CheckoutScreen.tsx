import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCart, useCreateOrder, useAddressList } from '../hooks';
import { spacing, fontSize, borderRadius, shadows } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export default function CheckoutScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();

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

  const { data: cartData } = useCart();
  const cart = cartData?.data;
  const { data: addrData } = useAddressList();
  const addresses = addrData?.data || [];
  const defaultAddr = addresses.find((a: any) => a.isDefault) || addresses[0];
  const createMut = useCreateOrder();
  const [remark, setRemark] = useState('');

  const handleSubmit = () => {
    if (!defaultAddr) {
      Alert.alert(t('common.tip'), t('order.addAddressFirst'));
      return;
    }
    createMut.mutate(
      { addressId: defaultAddr.id, remark: remark || undefined },
      {
        onSuccess: (res: any) => {
          const order = res.data;
          navigation.navigate('Payment', { orderId: order.id, amount: order.payAmount });
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
        <Text style={styles.headerTitle}>{t('order.confirmOrder')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Address */}
        <TouchableOpacity
          style={styles.addressCard}
          onPress={() => defaultAddr ? navigation.navigate('Address') : navigation.navigate('AddressPicker')}
        >
          <Text style={styles.addressIcon}>📍</Text>
          {defaultAddr ? (
            <View style={styles.addressInfo}>
              <Text style={styles.addressName}>{defaultAddr.name}  {defaultAddr.phone}</Text>
              <Text style={styles.addressDetail}>{defaultAddr.province}{defaultAddr.city}{defaultAddr.district}{defaultAddr.detail}</Text>
            </View>
          ) : (
            <Text style={styles.addressEmpty}>{t('order.selectAddress')}</Text>
          )}
          <Text style={styles.addressArrow}>›</Text>
        </TouchableOpacity>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('order.orderItems')}</Text>
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
            <Text style={styles.feeLabel}>{t('order.productTotal')}</Text>
            <Text style={styles.feeValue}>¥{totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>{t('order.deliveryFee')}</Text>
            <Text style={styles.feeValue}>¥{deliveryFee.toFixed(2)}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>{t('order.packagingFee')}</Text>
            <Text style={styles.feeValue}>¥{packagingFee.toFixed(2)}</Text>
          </View>
        </View>

        {/* Remark */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('order.remark')}</Text>
          <TextInput
            style={styles.remarkInput}
            placeholder={t('order.remarkPlaceholder')}
            value={remark}
            onChangeText={setRemark}
            maxLength={200}
          />
        </View>
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottomBar}>
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>{t('cart.total')}</Text>
          <Text style={styles.totalAmount}>¥{payAmount.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>{t('order.submitOrder')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
