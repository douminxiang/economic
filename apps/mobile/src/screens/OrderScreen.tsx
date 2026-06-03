import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useOrderList } from '../hooks';
import { useSocketEvent } from '../hooks/useSocket';
import { spacing, fontSize, borderRadius, shadows } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Loading } from '../components/Loading';
import { EmptyView } from '../components';
import { ErrorView } from '../components/ErrorView';

type TabKey = 'all' | 'pending' | 'inProgress' | 'completed';

const TAB_STATUS: Record<Exclude<TabKey, 'all'>, number> = {
  pending: 0,
  inProgress: 1,
  completed: 2,
};

export default function OrderScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const statusFilter = activeTab === 'all' ? undefined : TAB_STATUS[activeTab];
  const { data, isLoading, isError, refetch, isRefetching, error } = useOrderList({
    status: statusFilter,
    limit: 20,
  });

  const orders = data?.data?.items ?? [];

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: t('order.tabAll') },
    { key: 'pending', label: t('order.tabPending') },
    { key: 'inProgress', label: t('order.tabInProgress') },
    { key: 'completed', label: t('order.tabCompleted') },
  ];

  const statusMap = useMemo(
    () => ({
      0: { text: t('order.status.pending'), color: colors.warning },
      1: { text: t('order.status.paid'), color: colors.primary },
      2: { text: t('order.status.preparing'), color: colors.primary },
      3: { text: t('order.status.delivering'), color: colors.primary },
      4: { text: t('order.status.completed'), color: colors.success },
      5: { text: t('order.status.cancelled'), color: colors.textSecondary },
    }),
    [colors, t],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        header: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
        tabRow: { flexDirection: 'row', gap: spacing.sm },
        tab: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          backgroundColor: colors.background,
        },
        tabActive: { backgroundColor: colors.primaryLight },
        tabText: { fontSize: fontSize.sm, color: colors.textSecondary },
        tabTextActive: { color: colors.primary, fontWeight: '600' },
        list: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
        card: {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
          ...shadows.sm,
        },
        cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        shopName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, flex: 1, marginRight: spacing.sm },
        statusBadge: {
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          borderRadius: borderRadius.sm,
        },
        statusText: { fontSize: fontSize.xs, fontWeight: '600' },
        itemPreview: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm },
        cardFooter: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: spacing.md,
          paddingTop: spacing.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
        amount: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
        time: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 2 },
        actionBtn: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          borderWidth: 1,
          borderColor: colors.primary,
        },
        actionBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
        actionBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
        actionBtnTextPrimary: { color: colors.white },
      }),
    [colors],
  );

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  useSocketEvent('order:statusChanged', () => {
    qc.invalidateQueries({ queryKey: ['orders'] });
  });

  const formatItemPreview = (items: { name: string; quantity: number }[]) => {
    if (!items?.length) return '';
    const first = items[0];
    const extra = items.length > 1 ? t('order.moreItems', { count: items.length - 1 }) : '';
    return `${first.name} x${first.quantity}${extra}`;
  };

  const renderOrder = ({ item }: { item: any }) => {
    const statusInfo = statusMap[item.status as keyof typeof statusMap] ?? statusMap[0];
    const openDetail = () => navigation.navigate('OrderDetail', { id: item.id });

    return (
      <TouchableOpacity style={styles.card} onPress={openDetail} activeOpacity={0.85}>
        <View style={styles.cardHeader}>
          <Text style={styles.shopName} numberOfLines={1}>
            {item.shopName}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}22` }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
          </View>
        </View>
        <Text style={styles.itemPreview} numberOfLines={2}>
          {formatItemPreview(item.items)}
        </Text>
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.amount}>¥{Number(item.payAmount).toFixed(2)}</Text>
            <Text style={styles.time}>{item.createdAt?.slice(0, 16).replace('T', ' ')}</Text>
          </View>
          {item.status === 0 ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={(e) => {
                e.stopPropagation?.();
                navigation.navigate('Payment', { orderId: item.id, amount: item.payAmount });
              }}
            >
              <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>{t('order.goPay')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionBtn} onPress={openDetail}>
              <Text style={styles.actionBtnText}>{t('order.viewDetail')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('order.title')}</Text>
        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading && orders.length === 0 ? (
        <Loading fullScreen message={t('common.loading')} />
      ) : isError ? (
        <ErrorView message={(error as any)?.message || t('order.loadFailed')} onRetry={refetch} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyView
              icon="📋"
              message={t('order.empty')}
              hint={t('order.emptyHint')}
            />
          }
        />
      )}
    </View>
  );
}
