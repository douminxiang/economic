import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAddressList, useDeleteAddress } from '../hooks/useAddress';
import { fontSize } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export default function AddressScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data, isLoading } = useAddressList();
  const deleteMutation = useDeleteAddress();
  const addresses = data?.data || [];

  const handleDelete = (id: number) => {
    Alert.alert(t('common.tip'), t('address.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('address.title')}</Text>
      </View>

      {/* Address list */}
      <FlatList
        data={addresses}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactPhone}>{item.phone}</Text>
              {item.isDefault === 1 && <Text style={styles.defaultBadge}>{t('common.default')}</Text>}
            </View>
            <Text style={styles.address}>{item.province}{item.city}{item.district}{item.detail}</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => navigation.navigate('AddressPicker', { address: item })}>
                <Text style={styles.editBtn}>{t('common.edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Text style={styles.deleteBtn}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddressPicker')}
      >
        <Text style={styles.addButtonText}>{t('address.addNew')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 48, padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backIcon: { fontSize: 20, color: colors.text },
  headerTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  contactName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  contactPhone: { fontSize: fontSize.sm, color: colors.textSecondary },
  defaultBadge: { fontSize: fontSize.xs, color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  address: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 12 },
  editBtn: { fontSize: fontSize.sm, color: colors.primary },
  deleteBtn: { fontSize: fontSize.sm, color: colors.error },
  addButton: { margin: 16, padding: 16, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', alignItems: 'center' },
  addButtonText: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
});
