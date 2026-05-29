import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFavoriteList, useToggleFavorite } from '../hooks';
import { spacing, fontSize, borderRadius, shadows } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { EmptyView } from '../components';

export default function FavoriteScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data } = useFavoriteList();
  const favorites = data?.data || [];
  const toggleMut = useToggleFavorite();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('favorite.title')}</Text>
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
              <Text style={styles.cardMeta}>⭐{item.rating.toFixed(1)}  {t('shop.monthlySales')}{item.monthlySales}</Text>
              <Text style={styles.cardMeta}>¥{item.minOrder}{t('shop.minOrder')}</Text>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => {
                Alert.alert(t('common.tip'), t('favorite.unfollow'), [
                  { text: t('common.no') },
                  { text: t('common.yes'), onPress: () => toggleMut.mutate(item.shopId) },
                ]);
              }}
            >
              <Text style={styles.removeBtnText}>{t('favorite.unfollowAction')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyView message={t('favorite.noFavorites')} hint={t('favorite.favoritesHint')} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backIcon: { fontSize: 20, color: colors.text },
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
