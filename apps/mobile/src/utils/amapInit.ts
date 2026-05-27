import { init } from 'react-native-amap-geolocation';

const AMAP_ANDROID_KEY = 'fa9254f9d9fd8e972fdcb6130d7b7cc6';

let initialized = false;

export async function initAmapGeolocation() {
  if (initialized) return;
  try {
    await init(AMAP_ANDROID_KEY);
    initialized = true;
  } catch (e) {
    console.warn('Amap geolocation init failed:', e);
  }
}
