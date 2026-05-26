import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapView, Marker, Polyline } from 'react-native-amap3d';
import { Geolocation } from 'react-native-amap-geolocation';
import { useDirection } from '../hooks/useAmap';
import { colors, fontSize } from '../theme/tokens';

const MODES = [
  { key: 'driving', label: '驾车', icon: '🚗' },
  { key: 'walking', label: '步行', icon: '🚶' },
  { key: 'bicycling', label: '骑行', icon: '🚲' },
];

export default function RouteScreen({ route, navigation }: any) {
  const { shop } = route.params;
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mode, setMode] = useState('driving');

  useEffect(() => {
    Geolocation.getCurrentPosition(
      (position) => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setLocation({ latitude: 30.2741, longitude: 120.1551 }),
    );
  }, []);

  const origin = location ? `${location.longitude},${location.latitude}` : '';
  const destination = `${shop.longitude},${shop.latitude}`;
  const { data: routeData } = useDirection(origin, destination, mode);

  const routeInfo = routeData?.data?.route?.paths?.[0];
  const distance = routeInfo ? (parseInt(routeInfo.distance) / 1000).toFixed(1) : '--';
  const duration = routeInfo ? Math.ceil(parseInt(routeInfo.duration) / 60) : '--';

  const polylinePoints = routeData?.data?.route?.paths?.[0]?.steps
    ?.flatMap((step: any) =>
      step.polyline.split(';').map((point: string) => {
        const [lng, lat] = point.split(',').map(Number);
        return { latitude: lat, longitude: lng };
      }),
    ) || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{shop.name}</Text>
      </View>

      {/* Map */}
      {location && (
        <MapView style={styles.map} initialCameraPosition={{ target: location, zoom: 13 }}>
          <Marker position={location} />
          <Marker
            position={{ latitude: shop.latitude, longitude: shop.longitude }}
          />
          {polylinePoints.length > 0 && (
            <Polyline
              points={polylinePoints}
              color={colors.primary}
              width={6}
            />
          )}
        </MapView>
      )}

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.modeTab, mode === m.key && styles.modeTabActive]}
              onPress={() => setMode(m.key)}
            >
              <Text style={styles.modeIcon}>{m.icon}</Text>
              <Text style={[styles.modeLabel, mode === m.key && styles.modeLabelActive]}>
                {m.label} {duration}分钟
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.routeInfo}>全程 {distance}公里</Text>

        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navButtonText}>开始导航</Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, flex: 1 },
  map: { flex: 1 },
  bottomPanel: {
    backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 16,
  },
  modeTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeTab: {
    flex: 1, alignItems: 'center', padding: 8, borderRadius: 8,
    backgroundColor: colors.background,
  },
  modeTabActive: { backgroundColor: colors.primaryLight },
  modeIcon: { fontSize: 20 },
  modeLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4 },
  modeLabelActive: { color: colors.primary, fontWeight: '600' },
  routeInfo: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 },
  navButton: {
    backgroundColor: colors.primary, borderRadius: 24, height: 48,
    justifyContent: 'center', alignItems: 'center',
  },
  navButtonText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '600' },
});
