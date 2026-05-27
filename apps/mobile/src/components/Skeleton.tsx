import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 20, borderRadius: br = 4 }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[{ width: width as any, height, borderRadius: br, backgroundColor: colors.border }, { opacity }]} />;
};

export const ShopCardSkeleton = () => (
  <View style={s.card}>
    <Skeleton height={100} borderRadius={8} />
    <View style={s.info}>
      <Skeleton width={120} height={16} />
      <Skeleton width={80} height={12} />
    </View>
  </View>
);

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: colors.border },
  info: { gap: 6 },
});
