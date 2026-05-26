import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { MapView, Marker } from 'react-native-amap3d';
import { Geolocation } from 'react-native-amap-geolocation';
import { useReverseGeocode, usePoiSearch } from '../hooks/useAmap';
import { useCreateAddress, useUpdateAddress } from '../hooks/useAddress';
import { colors, fontSize } from '../theme/tokens';

export default function AddressPickerScreen({ route, navigation }: any) {
  const editingAddress = route?.params?.address;
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [poiResults, setPoiResults] = useState<any[]>([]);
  const [contactName, setContactName] = useState(editingAddress?.contactName || '');
  const [contactPhone, setContactPhone] = useState(editingAddress?.contactPhone || '');
  const [doorNumber, setDoorNumber] = useState(editingAddress?.detail || '');
  const [isDefault, setIsDefault] = useState(editingAddress?.isDefault === 1);
  const [addressInfo, setAddressInfo] = useState<any>(null);

  const createMutation = useCreateAddress();
  const updateMutation = useUpdateAddress();

  useEffect(() => {
    Geolocation.getCurrentPosition(
      (position) => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setLocation({ latitude: 30.2741, longitude: 120.1551 }),
    );
  }, []);

  const { data: geoData } = useReverseGeocode(location?.latitude ?? null, location?.longitude ?? null);

  useEffect(() => {
    if (geoData?.data?.regeocode) {
      setAddressInfo(geoData.data.regeocode);
    }
  }, [geoData]);

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    try {
      const res = await usePoiSearch(searchText);
    } catch {}
  };

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent;
    setLocation({ latitude, longitude });
  };

  const handleSave = () => {
    const data = {
      contactName,
      contactPhone,
      province: addressInfo?.addressComponent?.province || '',
      city: addressInfo?.addressComponent?.city || '',
      district: addressInfo?.addressComponent?.district || '',
      detail: doorNumber || addressInfo?.formatted_address || '',
      latitude: location?.latitude,
      longitude: location?.longitude,
      isDefault: isDefault ? 1 : 0,
    };

    if (editingAddress) {
      updateMutation.mutate(
        { id: editingAddress.id, data },
        { onSuccess: () => navigation.goBack() },
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => navigation.goBack() });
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>选择地址</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索地点"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
        />
      </View>

      {/* Map */}
      {location && (
        <TouchableOpacity activeOpacity={1} onPress={handleMapPress}>
          <MapView style={styles.map} initialCameraPosition={{ target: location, zoom: 15 }}>
            <Marker position={location} />
          </MapView>
        </TouchableOpacity>
      )}

      {/* Address info */}
      {addressInfo && (
        <View style={styles.addressInfo}>
          <Text style={styles.addressText}>{addressInfo.formatted_address}</Text>
        </View>
      )}

      {/* Form */}
      <View style={styles.form}>
        <View style={styles.formRow}>
          <Text style={styles.label}>联系人</Text>
          <TextInput style={styles.input} value={contactName} onChangeText={setContactName} />
        </View>
        <View style={styles.formRow}>
          <Text style={styles.label}>电话</Text>
          <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
        </View>
        <View style={styles.formRow}>
          <Text style={styles.label}>门牌号</Text>
          <TextInput style={styles.input} value={doorNumber} onChangeText={setDoorNumber} placeholder="楼栋号/门牌号" />
        </View>
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setIsDefault(!isDefault)}
        >
          <Text style={styles.label}>设为默认地址</Text>
          <View style={[styles.toggle, isDefault && styles.toggleActive]}>
            <View style={[styles.toggleDot, isDefault && styles.toggleDotActive]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Save button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>保存地址</Text>
      </TouchableOpacity>
    </ScrollView>
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
  searchBar: { padding: 8, backgroundColor: colors.surface },
  searchInput: {
    height: 40, backgroundColor: colors.background, borderRadius: 8,
    paddingHorizontal: 12, fontSize: fontSize.sm, borderWidth: 1, borderColor: colors.border,
  },
  map: { width: '100%', height: 200 },
  addressInfo: { padding: 12, backgroundColor: colors.surface },
  addressText: { fontSize: fontSize.sm, color: colors.text },
  form: { padding: 16, backgroundColor: colors.surface, gap: 12 },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { width: 60, fontSize: fontSize.sm, color: colors.text },
  input: {
    flex: 1, height: 40, backgroundColor: colors.background, borderRadius: 8,
    paddingHorizontal: 12, fontSize: fontSize.sm, borderWidth: 1, borderColor: colors.border,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  toggle: {
    width: 44, height: 24, borderRadius: 12, backgroundColor: colors.border,
    padding: 2, justifyContent: 'center',
  },
  toggleActive: { backgroundColor: colors.primary, alignItems: 'flex-end' },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },
  toggleDotActive: {},
  saveButton: {
    margin: 16, padding: 16, backgroundColor: colors.primary, borderRadius: 24,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
