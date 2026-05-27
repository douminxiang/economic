import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFavoriteList, useToggleFavorite } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';
import { EmptyView } from '../components';

export default function FavoriteScreen({ navigation }: any) {
  const { data } = useFavoriteList();
  const favorites = data?.data || [];
  const toggleMut = useToggleFavorite();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的收藏</Text>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }: any) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ShopDetail', { id: item.shopId })}
          >
            <View style={styles.cardImage} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.shopName}</Text>
              <Text style={styles.cardMeta}>⭐{item.rating.toFixed(1)}  月售{item.monthlySales}</Text>
              <Text style={styles.cardMeta}>¥{item.minOrder}起送</Text>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => {
                Alert.alert('提示', '取消收藏？', [
                  { text: '否' },
                  { text: '是', onPress: () => toggleMut.mutate(item.shopId) },
                ]);
              }}
            >
              <Text style={styles.removeBtnText}>取消</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyView message="暂无收藏" hint="收藏喜欢的商家" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  listContent: { padding: spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm,
  },
  cardImage: { width: 64, height: 64, borderRadius: borderRadius.sm, backgroundColor: colors.border },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  cardName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  removeBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  removeBtnText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
