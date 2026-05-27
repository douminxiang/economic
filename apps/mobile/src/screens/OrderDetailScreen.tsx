import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useOrderDetail, usePayOrder, useCancelOrder, useConfirmOrder } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';

const STATUS_MAP: Record<number, { text: string; color: string }> = {
  0: { text: '待付款', color: '#FF9800' },
  1: { text: '已付款', color: colors.primary },
  2: { text: '制作中', color: colors.primary },
  3: { text: '配送中', color: colors.primary },
  4: { text: '已完成', color: '#4CAF50' },
  5: { text: '已取消', color: colors.textSecondary },
};

export default function OrderDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { data } = useOrderDetail(id);
  const order = data?.data;
  const payMut = usePayOrder();
  const cancelMut = useCancelOrder();
  const confirmMut = useConfirmOrder();

  if (!order) return null;

  const statusInfo = STATUS_MAP[order.status] || STATUS_MAP[0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>订单详情</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: statusInfo.color }]}>
          <Text style={styles.statusText}>{statusInfo.text}</Text>
          {order.status === 3 && <Text style={styles.statusSub}>预计 30 分钟内送达</Text>}
        </View>

        {/* Address */}
        {order.addressSnapshot && (
          <View style={styles.section}>
            <Text style={styles.addressText}>
              📍 {order.addressSnapshot.name} {order.addressSnapshot.phone}
            </Text>
            <Text style={styles.addressDetail}>{order.addressSnapshot.address}</Text>
          </View>
        )}

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>商品明细</Text>
          {order.items.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name} x{item.quantity}</Text>
              <Text style={styles.itemPrice}>¥{(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>订单编号</Text>
            <Text style={styles.infoValue}>{order.orderNo}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>下单时间</Text>
            <Text style={styles.infoValue}>{order.createdAt?.slice(0, 16).replace('T', ' ')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>支付方式</Text>
            <Text style={styles.infoValue}>{order.payMethod || '未支付'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { fontWeight: '600' }]}>实付金额</Text>
            <Text style={styles.payAmount}>¥{order.payAmount?.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        {order.status === 0 && (
          <>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => {
              Alert.alert('提示', '确定取消订单？', [
                { text: '否' }, { text: '是', onPress: () => cancelMut.mutate(order.id) },
              ]);
            }}>
              <Text style={styles.outlineBtnText}>取消订单</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => payMut.mutate({ id: order.id })}>
              <Text style={styles.primaryBtnText}>去支付</Text>
            </TouchableOpacity>
          </>
        )}
        {order.status === 3 && (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => {
            Alert.alert('提示', '确认已收到商品？', [
              { text: '否' }, { text: '是', onPress: () => confirmMut.mutate(order.id) },
            ]);
          }}>
            <Text style={styles.primaryBtnText}>确认收货</Text>
          </TouchableOpacity>
        )}
        {order.status === 4 && (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('ReviewSubmit', { orderId: order.id, order })}>
            <Text style={styles.primaryBtnText}>评价</Text>
          </TouchableOpacity>
        )}
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
  statusCard: {
    borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.md,
  },
  statusText: { fontSize: fontSize.xl, fontWeight: '600', color: '#FFFFFF' },
  statusSub: { fontSize: fontSize.sm, color: '#FFFFFFCC', marginTop: spacing.xs },
  section: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  addressText: { fontSize: fontSize.md, color: colors.text },
  addressDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  itemName: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  itemPrice: { fontSize: fontSize.sm, color: colors.text },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { fontSize: fontSize.sm, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  payAmount: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary },
  bottomBar: {
    flexDirection: 'row', backgroundColor: colors.surface, paddingHorizontal: spacing.md,
    paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm,
  },
  outlineBtn: {
    flex: 1, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  outlineBtnText: { fontSize: fontSize.md, fontWeight: '500', color: colors.primary },
  primaryBtn: {
    flex: 1, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: fontSize.md, fontWeight: '500', color: '#FFFFFF' },
});
