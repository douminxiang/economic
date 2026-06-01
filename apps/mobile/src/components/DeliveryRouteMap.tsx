import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { MapView, Marker, Polyline } from 'react-native-amap3d';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { fontSize, spacing, borderRadius } from '../theme/tokens';
import { RealtimeStatusIndicator } from './RealtimeStatusIndicator';
import { initAmapGeolocation } from '../utils/amapInit';

const MAP_HEIGHT = 220;
const SIM_START = { latitude: 30.2741, longitude: 120.1551 };
const SIM_END = { latitude: 30.2941, longitude: 120.1451 };
const MAX_ETA_MINUTES = 30;

const LABELS = {
  deliveryRoute: '配送路线',
  routeShop: '商家',
  routeDestination: '收货地址',
  routeRider: '骑手',
  routeTraveled: '已走路线',
  routeRemaining: '剩余路线',
  routeProgress: '配送进度',
  liveTrack: '实时追踪',
  connecting: '连接中…',
  riderMoving: '骑手移动中',
  updateCount: '位置更新',
  minutes: '分钟',
  mapLoading: '地图加载中…',
};

interface RiderLocation {
  latitude: number;
  longitude: number;
  estimatedMinutes: number;
}

interface Props {
  shopLatitude?: number | null;
  shopLongitude?: number | null;
  riderLocation: RiderLocation | null;
  isConnected: boolean;
  addressName?: string;
  addressDetail?: string;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function buildRoutePoints(
  shop: { latitude: number; longitude: number },
  dest: { latitude: number; longitude: number },
  steps = 16,
) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      latitude: lerp(shop.latitude, dest.latitude, t),
      longitude: lerp(shop.longitude, dest.longitude, t),
    });
  }
  return points;
}

export function DeliveryRouteMap({
  shopLatitude,
  shopLongitude,
  riderLocation,
  isConnected,
  addressName,
  addressDetail,
}: Props) {
  const { t: _t } = useTranslation();
  const { colors } = useTheme();
  const mapRef = useRef<any>(null);
  const lastCameraMove = useRef(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [mapReady, setMapReady] = useState(false);
  const [trail, setTrail] = useState<{ latitude: number; longitude: number }[]>([]);
  const [simProgress, setSimProgress] = useState(0.08);
  const [updateCount, setUpdateCount] = useState(0);

  const shopPos = useMemo(() => {
    const lat = Number(shopLatitude);
    const lng = Number(shopLongitude);
    if (lat && lng) return { latitude: lat, longitude: lng };
    return SIM_START;
  }, [shopLatitude, shopLongitude]);

  const destPos = useMemo(
    () => ({
      latitude: shopPos.latitude + (SIM_END.latitude - SIM_START.latitude),
      longitude: shopPos.longitude + (SIM_END.longitude - SIM_START.longitude),
    }),
    [shopPos],
  );

  const mapCenter = useMemo(
    () => ({
      latitude: (shopPos.latitude + destPos.latitude) / 2,
      longitude: (shopPos.longitude + destPos.longitude) / 2,
    }),
    [shopPos, destPos],
  );

  const fullRoute = useMemo(() => buildRoutePoints(shopPos, destPos), [shopPos, destPos]);

  const riderPos = useMemo(() => {
    if (riderLocation) {
      return { latitude: riderLocation.latitude, longitude: riderLocation.longitude };
    }
    return {
      latitude: lerp(shopPos.latitude, destPos.latitude, simProgress),
      longitude: lerp(shopPos.longitude, destPos.longitude, simProgress),
    };
  }, [riderLocation, simProgress, shopPos, destPos]);

  const traveledRoute = useMemo(() => [shopPos, ...trail, riderPos], [shopPos, trail, riderPos]);
  const remainingRoute = useMemo(() => [riderPos, destPos], [riderPos, destPos]);

  const progressPercent = useMemo(() => {
    if (riderLocation) {
      return Math.min(100, Math.max(3, ((MAX_ETA_MINUTES - riderLocation.estimatedMinutes) / MAX_ETA_MINUTES) * 100));
    }
    return Math.max(3, Math.round(simProgress * 100));
  }, [riderLocation, simProgress]);

  useEffect(() => {
    let mounted = true;
    initAmapGeolocation().finally(() => {
      if (mounted) {
        setTimeout(() => setMapReady(true), 200);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progressPercent, progressAnim]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (riderLocation) {
      setUpdateCount((c) => c + 1);
      setTrail((prev) => {
        const next = { latitude: riderLocation.latitude, longitude: riderLocation.longitude };
        const last = prev[prev.length - 1];
        if (
          last &&
          Math.abs(last.latitude - next.latitude) < 1e-7 &&
          Math.abs(last.longitude - next.longitude) < 1e-7
        ) {
          return prev;
        }
        return [...prev.slice(-30), next];
      });
      return;
    }

    const timer = setInterval(() => {
      setSimProgress((p) => (p >= 0.95 ? 0.08 : p + 0.06));
      setUpdateCount((c) => c + 1);
    }, 1500);
    return () => clearInterval(timer);
  }, [riderLocation]);

  useEffect(() => {
    if (!mapReady || !mapRef.current?.moveCamera) return;
    const now = Date.now();
    if (now - lastCameraMove.current < 2500) return;
    lastCameraMove.current = now;
    try {
      mapRef.current.moveCamera({ target: riderPos, zoom: 14 }, 500);
    } catch {
      /* ignore */
    }
  }, [mapReady, riderPos.latitude, riderPos.longitude]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const styles = StyleSheet.create({
    wrap: { marginTop: spacing.sm },
    mapBox: {
      height: MAP_HEIGHT,
      width: '100%',
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#EAEAEA',
    },
    map: { width: '100%', height: MAP_HEIGHT },
    mapLoading: {
      width: '100%',
      height: MAP_HEIGHT,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#EAEAEA',
      borderRadius: borderRadius.md,
    },
    mapLoadingText: { marginTop: spacing.sm, fontSize: fontSize.sm, color: colors.textSecondary },
    riderBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      zIndex: 10,
      elevation: 4,
    },
    riderBadgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '600' },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: fontSize.xs, color: colors.textSecondary },
    progressRow: { marginTop: spacing.md },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    progressLabel: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
    progressMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    progressPct: { fontSize: fontSize.md, color: colors.primary, fontWeight: '700' },
    progressTrack: {
      height: 10,
      backgroundColor: colors.border,
      borderRadius: 5,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 5 },
    updateHint: { fontSize: fontSize.xs, color: colors.textLight, marginTop: spacing.xs },
    addressRow: { marginTop: spacing.sm },
    addressName: { fontSize: fontSize.md, color: colors.text },
    addressDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  });

  return (
    <View style={styles.wrap} collapsable={false}>
      <View style={styles.mapBox} collapsable={false} pointerEvents="box-none">
        <Animated.View style={[styles.riderBadge, { transform: [{ scale: pulseAnim }] }]} pointerEvents="none">
          <Text style={styles.riderBadgeText}>🛵 {LABELS.riderMoving}</Text>
        </Animated.View>
        {mapReady ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialCameraPosition={{ target: mapCenter, zoom: 13 }}
            scrollGesturesEnabled={false}
            zoomGesturesEnabled={false}
            rotateGesturesEnabled={false}
            tiltGesturesEnabled={false}
          >
            <Polyline points={fullRoute} color="#CCCCCC" width={5} />
            {traveledRoute.length >= 2 ? (
              <Polyline points={traveledRoute} color={colors.primary} width={8} />
            ) : null}
            {remainingRoute.length >= 2 ? (
              <Polyline points={remainingRoute} color="#BDBDBD" width={5} />
            ) : null}
            <Marker position={shopPos} title={LABELS.routeShop} />
            <Marker position={destPos} title={LABELS.routeDestination} />
            <Marker position={riderPos} title={LABELS.routeRider} />
          </MapView>
        ) : (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.mapLoadingText}>{LABELS.mapLoading}</Text>
          </View>
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>{LABELS.routeTraveled}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#BDBDBD' }]} />
          <Text style={styles.legendText}>{LABELS.routeRemaining}</Text>
        </View>
        <View style={styles.legendItem}>
          <RealtimeStatusIndicator active={isConnected} color={colors.success} size={8} />
          <Text style={styles.legendText}>{isConnected ? LABELS.liveTrack : LABELS.connecting}</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{LABELS.routeProgress}</Text>
          <View style={styles.progressMeta}>
            <Text style={styles.progressPct}>{Math.round(progressPercent)}%</Text>
            {riderLocation ? (
              <Text style={styles.legendText}>
                约{riderLocation.estimatedMinutes}{LABELS.minutes}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.updateHint}>
          {LABELS.updateCount} {updateCount} 次 · {LABELS.deliveryRoute}
        </Text>
      </View>

      {(addressName || addressDetail) ? (
        <View style={styles.addressRow}>
          {addressName ? <Text style={styles.addressName}>📍 {addressName}</Text> : null}
          {addressDetail ? <Text style={styles.addressDetail}>{addressDetail}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
