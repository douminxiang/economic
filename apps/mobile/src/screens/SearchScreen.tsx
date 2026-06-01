import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useShopList } from '../hooks';
import { spacing, fontSize, borderRadius, shadows } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { getStorage } from '../utils/storage';

const HISTORY_KEY = 'search_history';
const MAX_HISTORY = 10;

const HOT_WORDS = ['辣椒炒肉', '奶茶', '火锅', '汉堡', '咖啡', '面包', '水果', '寿司'];

export default function SearchScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backIcon: { fontSize: 20, color: colors.text },
    inputRow: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md },
    input: { flex: 1, height: 44, fontSize: fontSize.md },
    searchBtn: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600', paddingLeft: spacing.md },
    suggestions: { padding: spacing.md },
    section: { marginBottom: spacing.lg },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
    clearBtn: { fontSize: fontSize.sm, color: colors.textSecondary },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    tag: { backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
    tagText: { fontSize: fontSize.sm, color: colors.textSecondary },
    resultCard: { backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, ...shadows.sm },
    resultName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
    resultMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
    empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
  });

  const [keyword, setKeyword] = useState('');
  const [searchText, setSearchText] = useState('');
  const { data: shopsData } = useShopList({ keyword: searchText || undefined });
  const shops = shopsData?.pages?.flatMap((p: any) => p.data.items) || [];

  const getHistory = (): string[] => {
    try { return JSON.parse(getStorage().getString(HISTORY_KEY) || '[]'); } catch { return []; }
  };
  const [history, setHistory] = useState<string[]>(getHistory());

  const doSearch = (text: string) => {
    setSearchText(text);
    setKeyword(text);
    const newHistory = [text, ...history.filter((h) => h !== text)].slice(0, MAX_HISTORY);
    setHistory(newHistory);
    getStorage().set(HISTORY_KEY, JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    getStorage().remove(HISTORY_KEY);
  };

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder={t('search.placeholder')} value={keyword} onChangeText={setKeyword} onSubmitEditing={() => doSearch(keyword)} autoFocus />
          <TouchableOpacity onPress={() => doSearch(keyword)}><Text style={styles.searchBtn}>{t('common.search')}</Text></TouchableOpacity>
        </View>
      </View>

      {!searchText ? (
        <View style={styles.suggestions}>
          {history.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('search.searchHistory')}</Text>
                <TouchableOpacity onPress={clearHistory}><Text style={styles.clearBtn}>{t('search.clear')}</Text></TouchableOpacity>
              </View>
              <View style={styles.tagRow}>
                {history.map((h) => (
                  <TouchableOpacity key={h} style={styles.tag} onPress={() => doSearch(h)}>
                    <Text style={styles.tagText}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('search.hotSearch')}</Text>
            <View style={styles.tagRow}>
              {HOT_WORDS.map((w) => (
                <TouchableOpacity key={w} style={styles.tag} onPress={() => doSearch(w)}>
                  <Text style={styles.tagText}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={styles.resultCard}
              onPress={() => navigation.navigate('ShopDetail', { id: item.id })}
            >
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultMeta}>月售{item.monthlySales} · ⭐{Number(item.rating).toFixed(1)}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{t('search.noResults')}</Text>}
        />
      )}
    </View>
  );
}
