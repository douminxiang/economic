import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Props {
  active: boolean;
  color?: string;
  size?: number;
}

/**
 * An animated status dot that pulses when the status is active (e.g., delivering).
 */
export function RealtimeStatusIndicator({ active, color = '#4CAF50', size = 10 }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!active) {
      pulseAnim.setValue(1);
      opacityAnim.setValue(0.8);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.8,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.8,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    pulse.start();

    return () => {
      pulse.stop();
      pulseAnim.setValue(1);
      opacityAnim.setValue(0.8);
    };
  }, [active, pulseAnim, opacityAnim]);

  return (
    <View style={[styles.container, { width: size * 2, height: size * 2 }]}>
      {active && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: size * 2,
              height: size * 2,
              borderRadius: size,
              backgroundColor: color,
              transform: [{ scale: pulseAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
  },
  dot: {
    position: 'absolute',
  },
});
