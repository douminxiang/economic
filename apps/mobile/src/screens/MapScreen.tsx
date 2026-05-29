import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, PermissionsAndroid, Platform } from 'react-native';
import { MapView, Marker } from 'react-native-amap3d';
import { Geolocation } from 'react-native-amap-geolocation';
import { useNearbyShops } from '../hooks/useShops';
import { initAmapGeolocation } from '../utils/amapInit';
import { colors, fontSize, spacing, borderRadius } from '../theme/tokens';

const { width } = Dimensions.get('window');

async function requestLocationPermission() {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        { title: '位置权限', message: '需要获取您的位置来显示附近商家', buttonPositive: '允许' }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }
  return true;
}

const DEFAULT_LOCATION = { latitude: 30.2741, longitude: 120.1551 };

export default function MapScreen({ navigation, route }: any) {
  const selectedShopFromSearch = route?.params?.selectedShop;
  const [location, setLocation] = useState<{ latitude: number; longitude: number }>(DEFAULT_LOCATION);
  const [selectedShop, setSelectedShop] = useState<any>(selectedShopFromSearch || null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (selectedShopFromSearch) {
      setSelectedShop(selectedShopFromSearch);
      const lat = Number(selectedShopFromSearch.latitude);
      const lng = Number(selectedShopFromSearch.longitude);
      if (lat && lng) {
        setLocation({ latitude: lat, longitude: lng });
      }
    }
  }, [selectedShopFromSearch]);

  useEffect(() => {
    let mounted = true;

    async function initLocation() {
      try {
        await initAmapGeolocation();
        if (!mounted) return;

        const hasPermission = await requestLocationPermission();
        if (!mounted) return;

        if (hasPermission) {
          Geolocation.getCurrentPosition(
            (position) => {
              if (mounted && !selectedShopFromSearch) {
                setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
              }
            },
            () => {},
          );
        }
      } catch (e) {
        console.warn('Location error:', e);
      }
    }
    initLocation();

    return () => { mounted = false; };
  }, []);

  const { data: nearbyData } = useNearbyShops(
    location ? { latitude: location.latitude, longitude: location.longitude } : null,
  );

  const shops = nearbyData?.data?.items || [];

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.navigate('Search')}
      >
        <Text style={styles.searchText}>搜索附近商家</Text>
      </TouchableOpacity>

      {/* Map */}
      {location && (
        <MapView
          key={`${location.latitude}-${location.longitude}`}
          style={styles.map}
          initialCameraPosition={{ target: location, zoom: selectedShopFromSearch ? 16 : 14 }}
          myLocationButtonEnabled
        >
          {shops.map((shop: any) => (
            <Marker
              key={shop.id}
              position={{ latitude: Number(shop.latitude), longitude: Number(shop.longitude) }}
              onPress={() => setSelectedShop(shop)}
            />
          ))}
        </MapView>
      )}

      {/* Selected shop detail panel */}
      {selectedShop && (
        <View style={styles.shopDetailPanel}>
          <View style={styles.detailContent}>
            <View style={styles.detailInfo}>
              <Text style={styles.detailName}>{selectedShop.name}</Text>
              <Text style={styles.detailMeta}>
                {selectedShop.categoryName} · 月售{selectedShop.monthlySales} · ★{Number(selectedShop.rating).toFixed(1)}
              </Text>
              <Text style={styles.detailMeta}>
                ¥{selectedShop.minOrder}起 · 配送费¥{selectedShop.deliveryFee}
              </Text>
            </View>
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.routeBtn}
                onPress={() => navigation.navigate('Route', { shop: selectedShop })}
              >
                <Text style={styles.routeBtnText}>路线</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => navigation.navigate('ShopDetail', { id: selectedShop.id })}
              >
                <Text style={styles.detailBtnText}>详情</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedShop(null)}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom shop list */}
      {!selectedShop && (
        <View style={styles.bottomSheet}>
          <Text style={styles.sectionTitle}>附近 {shops.length} 家商家</Text>
          <FlatList
            data={shops}
            keyExtractor={(item: any) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.shopCard}
                onPress={() => navigation.navigate('ShopDetail', { id: item.id })}
              >
                <View style={styles.shopInfo}>
                  <Text style={styles.shopName}>{item.name}</Text>
                  <Text style={styles.shopMeta}>
                    {item.categoryName} · 月售{item.monthlySales} · {item.distance}m
                  </Text>
                  <Text style={styles.shopMeta}>
                    ¥{item.minOrder}起 · 配送费¥{item.deliveryFee}
                  </Text>
                </View>
                <Text style={styles.shopRating}>★ {item.rating}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    position: 'absolute', top: 50, left: 16, right: 16, zIndex: 10,
    backgroundColor: colors.surface, borderRadius: 22, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  searchText: { color: colors.textLight, fontSize: fontSize.sm },
  map: { width, height: '100%' },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 16, maxHeight: '40%',
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: 8 },
  shopCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  shopInfo: { flex: 1 },
  shopName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  shopMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  shopRating: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
  shopDetailPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5,
  },
  detailContent: { flex: 1 },
  detailInfo: { marginBottom: spacing.sm },
  detailName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  detailMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  detailActions: { flexDirection: 'row', gap: spacing.sm },
  routeBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: borderRadius.full,
  },
  routeBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  detailBtn: {
    backgroundColor: colors.background, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border,
  },
  detailBtnText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  closeBtn: { padding: spacing.sm },
  closeBtnText: { fontSize: fontSize.lg, color: colors.textSecondary },
});
