import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, PermissionsAndroid, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapView, Marker } from 'react-native-amap3d';
import { Geolocation } from 'react-native-amap-geolocation';
import { useQueryClient } from '@tanstack/react-query';
import { useNearbyShops } from '../hooks/useShops';
import { useOrderList } from '../hooks/useOrders';
import { useSocketEvent } from '../hooks/useSocket';
import { connectSocket, getSocket } from '../services/socket';
import { initAmapGeolocation } from '../utils/amapInit';
import { fontSize, spacing, borderRadius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

async function requestLocationPermission(title: string, message: string, buttonPositive: string) {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        { title, message, buttonPositive }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }
  return true;
}

const DEFAULT_LOCATION = { latitude: 30.2741, longitude: 120.1551 };

interface RiderLocation {
  orderId: number;
  latitude: number;
  longitude: number;
  estimatedMinutes: number;
}

export default function MapScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const selectedShopFromSearch = route?.params?.selectedShop;
  const [location, setLocation] = useState<{ latitude: number; longitude: number }>(DEFAULT_LOCATION);
  const [selectedShop, setSelectedShop] = useState<any>(selectedShopFromSearch || null);
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const mapRef = useRef<any>(null);

  // Find active delivery orders (status 3)
  const { data: ordersData } = useOrderList({ status: 3, limit: 1 });
  const activeDeliveryOrder = ordersData?.data?.items?.[0];

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

        const hasPermission = await requestLocationPermission(
          t('map.locationPermission'), t('map.locationMessage'), t('map.allow')
        );
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

  // Subscribe to rider location events for active delivery order
  useSocketEvent<RiderLocation>('order:riderLocation', (data) => {
    if (activeDeliveryOrder && data.orderId === activeDeliveryOrder.id) {
      setRiderLocation(data);
    }
  });

  useSocketEvent<{ orderId: number; status: number }>('order:statusChanged', () => {
    qc.invalidateQueries({ queryKey: ['orders'] });
  });

  // Join order room so rider location events are received
  useEffect(() => {
    if (!activeDeliveryOrder?.id) return;

    connectSocket();
    const socket = getSocket();
    if (!socket) return;

    const track = () => socket.emit('trackOrder', { orderId: activeDeliveryOrder.id });
    track();
    socket.on('connect', track);

    return () => {
      socket.off('connect', track);
      socket.emit('untrackOrder', { orderId: activeDeliveryOrder.id });
    };
  }, [activeDeliveryOrder?.id]);

  // Clear rider location when order is no longer in delivery
  useEffect(() => {
    if (!activeDeliveryOrder) {
      setRiderLocation(null);
    }
  }, [activeDeliveryOrder]);

  const shops = nearbyData?.data?.items || [];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        searchBar: {
          position: 'absolute',
          top: 50,
          left: 16,
          right: 16,
          zIndex: 10,
          backgroundColor: colors.surface,
          borderRadius: 22,
          padding: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        searchText: { color: colors.textLight, fontSize: fontSize.sm },
        map: { width, height: '100%' },
        riderPanel: {
          position: 'absolute',
          bottom: selectedShop ? 180 : 16,
          left: 16,
          right: 16,
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
          elevation: 4,
        },
        riderTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
        riderSub: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
        riderMeta: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 2 },
        bottomSheet: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: 16,
          maxHeight: '40%',
        },
        sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: 8 },
        shopCard: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        shopInfo: { flex: 1 },
        shopName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
        shopMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
        shopRating: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
        shopDetailPanel: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 5,
        },
        detailContent: { flex: 1 },
        detailInfo: { marginBottom: spacing.sm },
        detailName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
        detailMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
        detailActions: { flexDirection: 'row', gap: spacing.sm },
        routeBtn: {
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
        },
        routeBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
        detailBtn: {
          backgroundColor: colors.background,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          borderWidth: 1,
          borderColor: colors.border,
        },
        detailBtnText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
        closeBtn: { padding: spacing.sm },
        closeBtnText: { fontSize: fontSize.lg, color: colors.textSecondary },
      }),
    [colors, selectedShop],
  );

  const showRiderPanel = activeDeliveryOrder && riderLocation && !selectedShop;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.navigate('Search')}
      >
        <Text style={styles.searchText}>{t('map.searchNearby')}</Text>
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
          {/* Rider marker for active delivery */}
          {riderLocation && (
            <Marker
              key={`rider-${riderLocation.orderId}`}
              position={{
                latitude: riderLocation.latitude,
                longitude: riderLocation.longitude,
              }}
              title={t('map.rider') || '骑手'}
              subtitle={t('map.estimatedArrival', { minutes: riderLocation.estimatedMinutes }) || `${riderLocation.estimatedMinutes}分钟`}
            />
          )}
        </MapView>
      )}

      {showRiderPanel ? (
        <TouchableOpacity
          style={styles.riderPanel}
          onPress={() => navigation.navigate('Order', { screen: 'OrderDetail', params: { id: activeDeliveryOrder.id } })}
        >
          <Text style={styles.riderTitle}>{t('map.riderDelivering')}</Text>
          <Text style={styles.riderSub}>
            {t('order.estimatedDelivery')} ({riderLocation.estimatedMinutes}
            {t('order.minutes')})
          </Text>
          <Text style={styles.riderMeta}>{t('map.riderDistance', { km: '2.3' })}</Text>
        </TouchableOpacity>
      ) : null}

      {/* Selected shop detail panel */}
      {selectedShop && (
        <View style={styles.shopDetailPanel}>
          <View style={styles.detailContent}>
            <View style={styles.detailInfo}>
              <Text style={styles.detailName}>{selectedShop.name}</Text>
              <Text style={styles.detailMeta}>
                {selectedShop.categoryName} · {t('shop.monthlySales')}{selectedShop.monthlySales} · ★{Number(selectedShop.rating).toFixed(1)}
              </Text>
              <Text style={styles.detailMeta}>
                ¥{selectedShop.minOrder}起 · {t('shop.deliveryFee')}¥{selectedShop.deliveryFee}
              </Text>
            </View>
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.routeBtn}
                onPress={() => navigation.navigate('Route', { shop: selectedShop })}
              >
                <Text style={styles.routeBtnText}>{t('map.route')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => navigation.navigate('ShopDetail', { id: selectedShop.id })}
              >
                <Text style={styles.detailBtnText}>{t('map.details')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedShop(null)}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom shop list */}
      {!selectedShop && !showRiderPanel && (
        <View style={styles.bottomSheet}>
          <Text style={styles.sectionTitle}>{t('map.nearbyShops').replace('{{count}}', String(shops.length))}</Text>
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
                    {item.categoryName} · {t('shop.monthlySales')}{item.monthlySales} · {item.distance}m
                  </Text>
                  <Text style={styles.shopMeta}>
                    ¥{item.minOrder}起 · {t('shop.deliveryFee')}¥{item.deliveryFee}
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

