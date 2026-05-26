import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAddressList, useDeleteAddress } from '../hooks/useAddress';
import { colors, fontSize } from '../theme/tokens';

export default function AddressScreen({ navigation }: any) {
  const { data, isLoading } = useAddressList();
  const deleteMutation = useDeleteAddress();
  const addresses = data?.data || [];

  const handleDelete = (id: number) => {
    Alert.alert('确认删除', '确定要删除这个地址吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>收货地址</Text>
      </View>

      {/* Address list */}
      <FlatList
        data={addresses}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.contactName}>{item.contactName}</Text>
              <Text style={styles.contactPhone}>{item.contactPhone}</Text>
              {item.isDefault === 1 && <Text style={styles.defaultBadge}>默认</Text>}
            </View>
            <Text style={styles.address}>{item.province}{item.city}{item.district}{item.detail}</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => navigation.navigate('AddressPicker', { address: item })}>
                <Text style={styles.editBtn}>编辑</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Text style={styles.deleteBtn}>删除</Text>
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
        <Text style={styles.addButtonText}>+ 新增收货地址</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    height: 48, padding: 16, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backIcon: { fontSize: 20, color: colors.text },
  headerTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  contactName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  contactPhone: { fontSize: fontSize.sm, color: colors.textSecondary },
  defaultBadge: {
    fontSize: fontSize.xs, color: colors.primary, backgroundColor: colors.primaryLight,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },
  address: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 12 },
  editBtn: { fontSize: fontSize.sm, color: colors.primary },
  deleteBtn: { fontSize: fontSize.sm, color: colors.error },
  addButton: {
    margin: 16, padding: 16, backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', alignItems: 'center',
  },
  addButtonText: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
});
