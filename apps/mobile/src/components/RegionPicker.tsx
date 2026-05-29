import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { REGIONS } from '../data/regions';
import { colors, fontSize, spacing } from '../theme/tokens';

interface RegionPickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (province: string, city: string, district: string) => void;
  initialProvince?: string;
  initialCity?: string;
  initialDistrict?: string;
}

export function RegionPicker({ visible, onClose, onConfirm, initialProvince, initialCity, initialDistrict }: RegionPickerProps) {
  const [step, setStep] = useState<'province' | 'city' | 'district'>('province');
  const [selectedProvince, setSelectedProvince] = useState(initialProvince || '');
  const [selectedCity, setSelectedCity] = useState(initialCity || '');
  const [selectedDistrict, setSelectedDistrict] = useState(initialDistrict || '');

  const cities = useMemo(() => {
    if (!selectedProvince) return [];
    return REGIONS.find((p) => p.name === selectedProvince)?.cities || [];
  }, [selectedProvince]);

  const districts = useMemo(() => {
    if (!selectedProvince || !selectedCity) return [];
    const province = REGIONS.find((p) => p.name === selectedProvince);
    return province?.cities.find((c) => c.name === selectedCity)?.districts || [];
  }, [selectedProvince, selectedCity]);

  const canConfirm = selectedProvince && selectedCity;

  const resetAndClose = () => {
    setStep('province');
    setSelectedProvince('');
    setSelectedCity('');
    setSelectedDistrict('');
    onClose();
  };

  const handleConfirm = () => {
    onConfirm(selectedProvince, selectedCity, selectedDistrict);
    resetAndClose();
  };

  const headerTitle = step === 'province' ? '选择省份' : step === 'city' ? '选择城市' : '选择区县';

  const listData = step === 'province'
    ? REGIONS.map((p) => p.name)
    : step === 'city'
      ? cities.map((c) => c.name)
      : districts;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={resetAndClose}>
              <Text style={styles.closeText}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            {canConfirm && (
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={styles.doneText}>确定</Text>
              </TouchableOpacity>
            )}
            {!canConfirm && <View style={{ width: 40 }} />}
          </View>

          {/* Breadcrumb */}
          <View style={styles.breadcrumb}>
            <TouchableOpacity onPress={() => { setStep('province'); setSelectedCity(''); setSelectedDistrict(''); }}>
              <Text style={[styles.breadItem, step === 'province' && styles.breadActive, !selectedProvince && styles.breadPlaceholder]}>
                {selectedProvince || '选择省份'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.breadSep}> / </Text>
            <TouchableOpacity onPress={() => { setStep('city'); setSelectedDistrict(''); }}>
              <Text style={[styles.breadItem, step === 'city' && styles.breadActive, !selectedCity && styles.breadPlaceholder]}>
                {selectedCity || '选择城市'}
              </Text>
            </TouchableOpacity>
            {districts.length > 0 && (
              <>
                <Text style={styles.breadSep}> / </Text>
                <Text style={[styles.breadItem, step === 'district' && styles.breadActive, !selectedDistrict && styles.breadPlaceholder]}>
                  {selectedDistrict || '选择区县'}
                </Text>
              </>
            )}
          </View>

          {/* List */}
          <FlatList
            data={listData}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected =
                (step === 'province' && item === selectedProvince) ||
                (step === 'city' && item === selectedCity) ||
                (step === 'district' && item === selectedDistrict);
              return (
                <TouchableOpacity
                  style={[styles.item, isSelected && styles.itemActive]}
                  onPress={() => {
                    if (step === 'province') {
                      setSelectedProvince(item);
                      setSelectedCity('');
                      setSelectedDistrict('');
                      setStep('city');
                    } else if (step === 'city') {
                      setSelectedCity(item);
                      setSelectedDistrict('');
                      // Check districts for the newly selected city
                      const province = REGIONS.find((p) => p.name === selectedProvince);
                      const cityDistricts = province?.cities.find((c) => c.name === item)?.districts || [];
                      if (cityDistricts.length > 0) {
                        setStep('district');
                      }
                      // Stay on city step so user can see selection and confirm
                    } else {
                      setSelectedDistrict(item);
                    }
                  }}
                >
                  <Text style={[styles.itemText, isSelected && styles.itemTextActive]}>{item}</Text>
                  {isSelected && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  container: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  closeText: { fontSize: fontSize.sm, color: colors.textSecondary, width: 40 },
  doneText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600', width: 40, textAlign: 'right' },
  breadcrumb: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  breadItem: { fontSize: fontSize.sm, color: colors.text },
  breadActive: { color: colors.primary, fontWeight: '600' },
  breadPlaceholder: { color: colors.textLight },
  breadSep: { fontSize: fontSize.sm, color: colors.textLight, marginHorizontal: 2 },
  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
  },
  itemActive: { backgroundColor: colors.primaryLight + '33' },
  itemText: { fontSize: fontSize.md, color: colors.text },
  itemTextActive: { color: colors.primary, fontWeight: '600' },
  check: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg },
});
