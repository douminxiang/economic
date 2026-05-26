import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { MapView, Marker, Location } from 'react-native-amap3d';
import { useNearbyShops } from '../hooks/useShops';
import { colors, fontSize } from '../theme/tokens';

const { width } = Dimensions.get('window');

export default function MapScreen({ navigation }: any) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedShop, setSelectedShop] = useState<any>(null);

  useEffect(() => {
    Location.getCurrentPosition()
      .then((pos) => setLocation({ latitude: pos.latitude, longitude: pos.longitude }))
      .catch(() => setLocation({ latitude: 30.2741, longitude: 120.1551 })); // Hangzhou default
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
          style={styles.map}
          coordinate={location}
          zoomLevel={14}
          showsLocationButton
        >
          {shops.map((shop: any) => (
            <Marker
              key={shop.id}
              coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
              title={shop.name}
              description={`${shop.distance}m · ${shop.categoryName || ''}`}
              onPress={() => setSelectedShop(shop)}
            />
          ))}
        </MapView>
      )}

      {/* Bottom shop list */}
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
});
