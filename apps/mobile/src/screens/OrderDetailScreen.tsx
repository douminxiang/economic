import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOrderDetail, usePayOrder, useCancelOrder, useConfirmOrder, useOrderRealtime } from '../hooks';
import { spacing, fontSize, borderRadius, shadows } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { RealtimeStatusIndicator } from '../components/RealtimeStatusIndicator';

export default function OrderDetailScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const STATUS_MAP: Record<number, { text: string; color: string }> = {
    0: { text: t('order.status.pending'), color: colors.warning },
    1: { text: t('order.status.paid'), color: colors.primary },
    2: { text: t('order.status.preparing'), color: colors.primary },
    3: { text: t('order.status.delivering'), color: colors.primary },
    4: { text: t('order.status.completed'), color: colors.success },
    5: { text: t('order.status.cancelled'), color: colors.textSecondary },
  };

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
    statusText: { fontSize: fontSize.xl, fontWeight: '600', color: colors.white },
    statusSub: { fontSize: fontSize.sm, color: '#FFFFFFCC', marginTop: spacing.xs },
    statusLive: { fontSize: fontSize.xs, color: '#FFFFFFAA', marginTop: spacing.xs },
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
    primaryBtnText: { fontSize: fontSize.md, fontWeight: '500', color: colors.white },
  });

  const { id } = route.params;
  const { data } = useOrderDetail(id);
  const order = data?.data;
  const payMut = usePayOrder();
  const cancelMut = useCancelOrder();
  const confirmMut = useConfirmOrder();

  const { status: realtimeStatus, statusText: realtimeStatusText, riderLocation, isConnected } = useOrderRealtime(id);

  if (!order) return null;

  // Use realtime status if available, otherwise fall back to order data
  const currentStatus = realtimeStatus !== null ? realtimeStatus : order.status;
  const statusInfo = STATUS_MAP[currentStatus] || STATUS_MAP[0];
  const isDelivering = currentStatus === 3;
  const statusCardColor = isDelivering ? colors.primary : statusInfo.color;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('order.orderDetail')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: statusCardColor }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isDelivering ? (
              <RealtimeStatusIndicator active={isConnected} color={colors.success} size={12} />
            ) : null}
            <Text style={styles.statusText}>{realtimeStatusText || statusInfo.text}</Text>
          </View>
          {isDelivering ? (
            <>
              <Text style={styles.statusSub}>
                {riderLocation
                  ? `${t('order.estimatedDelivery')} (${riderLocation.estimatedMinutes}${t('order.minutes')})`
                  : t('order.estimatedDelivery')}
              </Text>
              {isConnected ? (
                <Text style={styles.statusLive}>{t('order.realtimeUpdating')}</Text>
              ) : null}
            </>
          ) : null}
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
          <Text style={styles.sectionTitle}>{t('order.orderItems')}</Text>
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
            <Text style={styles.infoLabel}>{t('order.orderNo')}</Text>
            <Text style={styles.infoValue}>{order.orderNo}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('order.orderTime')}</Text>
            <Text style={styles.infoValue}>{order.createdAt?.slice(0, 16).replace('T', ' ')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('order.payMethod')}</Text>
            <Text style={styles.infoValue}>{order.payMethod || t('order.unpaid')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { fontWeight: '600' }]}>{t('order.payAmount')}</Text>
            <Text style={styles.payAmount}>¥{order.payAmount?.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        {currentStatus === 0 && (
          <>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => {
              Alert.alert(t('common.tip'), t('order.cancelConfirm'), [
                { text: t('common.no') }, { text: t('common.yes'), onPress: () => cancelMut.mutate(order.id) },
              ]);
            }}>
              <Text style={styles.outlineBtnText}>{t('order.cancelOrder')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => payMut.mutate({ id: order.id })}>
              <Text style={styles.primaryBtnText}>{t('order.goPay')}</Text>
            </TouchableOpacity>
          </>
        )}
        {currentStatus === 3 && (
          <>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => {
                Alert.alert(t('common.tip'), t('order.cancelConfirm'), [
                  { text: t('common.no') },
                  { text: t('common.yes'), onPress: () => cancelMut.mutate(order.id) },
                ]);
              }}
            >
              <Text style={styles.outlineBtnText}>{t('order.cancelOrder')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                Alert.alert(t('common.tip'), t('order.confirmReceiveMessage'), [
                  { text: t('common.no') },
                  { text: t('common.yes'), onPress: () => confirmMut.mutate(order.id) },
                ]);
              }}
            >
              <Text style={styles.primaryBtnText}>{t('order.confirmReceived')}</Text>
            </TouchableOpacity>
          </>
        )}
        {currentStatus === 4 && (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('ReviewSubmit', { orderId: order.id, order })}>
            <Text style={styles.primaryBtnText}>{t('order.review')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
