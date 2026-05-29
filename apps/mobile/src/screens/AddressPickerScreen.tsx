import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCreateAddress, useUpdateAddress } from '../hooks/useAddress';
import { RegionPicker } from '../components/RegionPicker';
import { fontSize, spacing, borderRadius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export default function AddressPickerScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const editingAddress = route?.params?.address;
  const [name, setName] = useState(editingAddress?.name || '');
  const [phone, setPhone] = useState(editingAddress?.phone || '');
  const [province, setProvince] = useState(editingAddress?.province || '');
  const [city, setCity] = useState(editingAddress?.city || '');
  const [district, setDistrict] = useState(editingAddress?.district || '');
  const [detail, setDetail] = useState(editingAddress?.detail || '');
  const [isDefault, setIsDefault] = useState(editingAddress?.isDefault === 1 || editingAddress?.isDefault === true);
  const [regionVisible, setRegionVisible] = useState(false);

  const createMutation = useCreateAddress();
  const updateMutation = useUpdateAddress();

  const regionText = [province, city, district].filter(Boolean).join(' ') || t('address.selectRegion');

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('common.tip'), t('address.enterContactName'));
      return;
    }
    if (name.trim().length > 50) {
      Alert.alert(t('common.tip'), t('address.contactNameTooLong'));
      return;
    }
    if (!phone.trim()) {
      Alert.alert(t('common.tip'), t('address.enterPhone'));
      return;
    }
    if (phone.trim().length > 20) {
      Alert.alert(t('common.tip'), t('address.phoneTooLong'));
      return;
    }
    if (!province || !city) {
      Alert.alert(t('common.tip'), t('address.selectProvinceCity'));
      return;
    }
    if (!detail.trim()) {
      Alert.alert(t('common.tip'), t('address.enterDetailAddress'));
      return;
    }

    const data = {
      name: name.trim(),
      phone: phone.trim(),
      province,
      city,
      district,
      detail: detail.trim(),
      latitude: editingAddress?.latitude || 0,
      longitude: editingAddress?.longitude || 0,
      isDefault,
    };

    if (editingAddress) {
      updateMutation.mutate(
        { id: editingAddress.id, data },
        {
          onSuccess: () => navigation.goBack(),
          onError: (e: any) => Alert.alert(t('address.saveFailed'), e?.message || t('address.pleaseRetry')),
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => navigation.goBack(),
        onError: (e: any) => Alert.alert(t('address.saveFailed'), e?.message || t('address.pleaseRetry')),
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editingAddress ? t('address.editAddress') : t('address.addAddress')}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.formRow}>
          <Text style={styles.label}>{t('address.contact')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('address.contactPlaceholder')}
            placeholderTextColor={colors.textLight}
            maxLength={50}
          />
        </View>
        <View style={styles.formRow}>
          <Text style={styles.label}>{t('address.phone')}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('address.phonePlaceholder')}
            placeholderTextColor={colors.textLight}
            keyboardType="phone-pad"
            maxLength={20}
          />
        </View>

        <TouchableOpacity style={styles.formRow} onPress={() => setRegionVisible(true)}>
          <Text style={styles.label}>{t('address.region')}</Text>
          <View style={[styles.input, styles.regionInput]}>
            <Text style={[styles.regionText, !province && { color: colors.textLight }]}>{regionText}</Text>
            <Text style={styles.regionArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.formRow}>
          <Text style={styles.label}>{t('address.detailAddress')}</Text>
          <TextInput
            style={styles.input}
            value={detail}
            onChangeText={setDetail}
            placeholder={t('address.detailPlaceholder')}
            placeholderTextColor={colors.textLight}
            maxLength={200}
          />
        </View>

        <TouchableOpacity style={styles.toggleRow} onPress={() => setIsDefault(!isDefault)}>
          <Text style={styles.toggleLabel}>{t('address.setDefault')}</Text>
          <View style={[styles.toggle, isDefault && styles.toggleActive]}>
            <View style={[styles.toggleDot, isDefault && styles.toggleDotActive]} />
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, (createMutation.isPending || updateMutation.isPending) && { opacity: 0.6 }]}
        disabled={createMutation.isPending || updateMutation.isPending}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>
          {createMutation.isPending || updateMutation.isPending ? t('common.saving') : t('address.saveAddress')}
        </Text>
      </TouchableOpacity>

      <RegionPicker
        visible={regionVisible}
        onClose={() => setRegionVisible(false)}
        onConfirm={(p, c, d) => { setProvince(p); setCity(c); setDistrict(d); }}
        initialProvince={province}
        initialCity={city}
        initialDistrict={district}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backIcon: { fontSize: 22, color: colors.text },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  form: { padding: 16, backgroundColor: colors.surface, gap: 14 },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { width: 70, fontSize: fontSize.sm, color: colors.text },
  input: { flex: 1, height: 44, backgroundColor: colors.background, borderRadius: borderRadius.sm, paddingHorizontal: 12, fontSize: fontSize.sm, borderWidth: 1, borderColor: colors.border, color: colors.text },
  regionInput: { justifyContent: 'space-between', alignItems: 'center' },
  regionText: { fontSize: fontSize.sm, color: colors.text },
  regionArrow: { fontSize: 18, color: colors.textLight },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  toggleLabel: { fontSize: fontSize.sm, color: colors.text },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: colors.border, padding: 2, justifyContent: 'center' },
  toggleActive: { backgroundColor: colors.primary, alignItems: 'flex-end' },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },
  toggleDotActive: {},
  saveButton: { margin: 16, padding: 16, backgroundColor: colors.primary, borderRadius: 24, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
