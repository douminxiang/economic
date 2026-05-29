import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapView, Marker, Polyline } from 'react-native-amap3d';
import { Geolocation } from 'react-native-amap-geolocation';
import { useDirection } from '../hooks/useAmap';
import { initAmapGeolocation } from '../utils/amapInit';
import { fontSize, spacing, borderRadius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

const DEFAULT_LOCATION = { latitude: 30.2741, longitude: 120.1551 };

export default function RouteScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { shop } = route.params;
  const [location, setLocation] = useState<{ latitude: number; longitude: number }>(DEFAULT_LOCATION);
  const [mode, setMode] = useState('driving');

  const MODES = [
    { key: 'driving', label: t('route.driving'), icon: '🚗' },
    { key: 'walking', label: t('route.walking'), icon: '🚶' },
    { key: 'bicycling', label: t('route.cycling'), icon: '🚲' },
  ];

  useEffect(() => {
    let mounted = true;
    async function initLocation() {
      try {
        await initAmapGeolocation();
        if (!mounted) return;
        Geolocation.getCurrentPosition(
          (position) => {
            if (mounted) setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          },
          () => {},
        );
      } catch (e) {
        console.warn('Location error:', e);
      }
    }
    initLocation();
    return () => { mounted = false; };
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
      {/* Floating back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{shop.name}</Text>

      {/* Map */}
      {location && (
        <MapView style={styles.map} initialCameraPosition={{ target: location, zoom: 13 }}>
          <Marker position={location} />
          <Marker
            position={{ latitude: Number(shop.latitude), longitude: Number(shop.longitude) }}
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
                {m.label} {duration}{t('route.minutes')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.routeInfo}>{t('route.wholeRoute')} {distance}{t('route.km')}</Text>

        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navButtonText}>{t('route.startNav')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backBtn: { position: 'absolute', top: 50, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.overlayDark, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  backText: { color: colors.white, fontSize: fontSize.lg },
  headerTitle: { position: 'absolute', top: 54, left: 60, right: 16, zIndex: 10, fontSize: fontSize.md, fontWeight: '600', color: colors.white, backgroundColor: colors.overlayDark, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, overflow: 'hidden' },
  map: { flex: 1 },
  bottomPanel: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  modeTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeTab: { flex: 1, alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: colors.background },
  modeTabActive: { backgroundColor: colors.primaryLight },
  modeIcon: { fontSize: 20 },
  modeLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4 },
  modeLabelActive: { color: colors.primary, fontWeight: '600' },
  routeInfo: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 },
  navButton: { backgroundColor: colors.primary, borderRadius: 24, height: 48, justifyContent: 'center', alignItems: 'center' },
  navButtonText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '600' },
});
