import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../theme/tokens';
import { browseHistoryApi } from '../services/api';
import { useNavigation } from '@react-navigation/native';

export default function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'older'>('today');
  const [items, setItems] = useState<any[]>([]);
  const navigation = useNavigation();

  const loadHistory = useCallback(async () => {
    try {
      const res = await browseHistoryApi.list(activeTab);
      setItems(res.data || []);
    } catch {}
  }, [activeTab]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleClear = () => {
    Alert.alert('清空历史', '确定要清空所有浏览历史吗？', [
      { text: '取消' },
      { text: '清空', style: 'destructive', onPress: async () => {
        await browseHistoryApi.clear();
        setItems([]);
      }},
    ]);
  };

  const renderItem = ({ item }: any) => {
    const shop = item.shop || {};
    const images = Array.isArray(shop.images) ? shop.images : [];
    return (
      <TouchableOpacity style={styles.card} onPress={() => (navigation as any).navigate('ShopDetail', { id: shop.id })}>
        {images.length > 0 ? <Image source={{ uri: images[0] }} style={styles.cardImage} /> : <View style={styles.cardImage} />}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{shop.name}</Text>
          <Text style={styles.cardMeta}>{shop.address} | ¥{shop.minOrder}/人 | ⭐ {shop.rating}</Text>
          <Text style={styles.cardTime}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>浏览历史</Text>
        <TouchableOpacity onPress={handleClear}>
          <Text style={styles.clearText}>清空</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabs}>
        {([['today', '今天'], ['week', '本周'], ['older', '更早']] as const).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.tab, activeTab === key && styles.tabActive]} onPress={() => setActiveTab(key)}>
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList data={items} renderItem={renderItem} keyExtractor={item => String(item.id)} contentContainerStyle={styles.list} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.white },
  back: { fontSize: fontSize.md, color: colors.primary },
  title: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  clearText: { fontSize: fontSize.sm, color: colors.textLight },
  tabs: { flexDirection: 'row', padding: spacing.md, gap: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingBottom: spacing.xs },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: fontSize.md, color: colors.textLight },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  list: { padding: spacing.md, gap: spacing.sm },
  card: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.sm, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardImage: { width: 60, height: 60, borderRadius: borderRadius.sm, backgroundColor: colors.border },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: fontSize.sm, color: colors.textSecondary },
  cardTime: { fontSize: fontSize.xs, color: colors.textLight },
});
