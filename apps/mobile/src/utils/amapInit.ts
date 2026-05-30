import { init } from 'react-native-amap-geolocation';
import { Platform } from 'react-native';
import { AMAP_ANDROID_KEY } from '../config/amap';

let initialized = false;
let initPromise: Promise<void> | null = null;

export function initAmapGeolocation(): Promise<void> {
  if (initialized) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (Platform.OS === 'android') {
        await init(AMAP_ANDROID_KEY);
      }
      initialized = true;
    } catch (e) {
      console.warn('Amap geolocation init failed:', e);
      initialized = true;
    }
  })();

  return initPromise;
}
