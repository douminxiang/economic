import { Platform } from 'react-native';
import {
  init as initAmapSdk,
  setOnceLocation,
  Geolocation,
} from 'react-native-amap-geolocation';
import { AMAP_ANDROID_KEY } from '../config/amap';

let initPromise: Promise<boolean> | null = null;

const INIT_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Amap init timeout')), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

/**
 * 初始化高德定位 SDK。必须在使用 Geolocation 之前完成。
 * init() 需传入 Platform.select 对象，不能直接传字符串。
 */
export function initAmapGeolocation(): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = withTimeout(
    (async () => {
      if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
        return false;
      }

      await initAmapSdk({
        android: AMAP_ANDROID_KEY,
        ios: AMAP_ANDROID_KEY,
      });

      if (Platform.OS === 'android') {
        setOnceLocation(true);
      }

      return true;
    })(),
    INIT_TIMEOUT_MS,
  ).catch((e) => {
    initPromise = null;
    console.warn('Amap geolocation init failed:', e);
    return false;
  });

  return initPromise;
}

type Position = {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number;
    accuracy: number;
    altitudeAccuracy: number;
    heading: number;
    speed: number;
  };
  timestamp: number;
};

/** 确保 SDK 已初始化后再单次定位，避免 AMapLocationClient 为 null 崩溃 */
export async function getAmapCurrentPosition(
  onSuccess: (position: Position) => void,
  onError?: (error: unknown) => void,
): Promise<void> {
  const ready = await initAmapGeolocation();
  if (!ready) {
    onError?.(new Error('高德定位未初始化'));
    return;
  }

  Geolocation.getCurrentPosition(onSuccess, onError);
}
