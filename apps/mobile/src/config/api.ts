import { NativeModules, Platform } from 'react-native';

/**
 * 开发环境连接方式
 *
 * - auto：自动识别（模拟器 → 10.0.2.2，真机 → 127.0.0.1 + adb reverse）
 * - emulator：Android 模拟器（10.0.2.2）
 * - usb：真机 USB + adb reverse
 * - lan：真机 WiFi，填 DEV_LAN_HOST
 */
export type DevConnectMode = 'auto' | 'emulator' | 'usb' | 'lan';

export const DEV_CONNECT_MODE: DevConnectMode = 'auto';

/** 电脑 WLAN IP（ipconfig 查看），仅 lan 模式使用 */
export const DEV_LAN_HOST = '10.33.103.251';

const DEV_API_PORT = 3000;

function isAndroidEmulator(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    const c = NativeModules.PlatformConstants ?? {};
    const hint = `${c.Brand ?? ''} ${c.Model ?? ''} ${c.Fingerprint ?? ''}`.toLowerCase();
    return (
      hint.includes('sdk_gphone') ||
      hint.includes('generic') ||
      hint.includes('emulator') ||
      hint.includes('android sdk built for x86') ||
      (hint.includes('google') && hint.includes('sdk'))
    );
  } catch {
    return false;
  }
}

function resolveConnectMode(): Exclude<DevConnectMode, 'auto'> {
  if (DEV_CONNECT_MODE === 'emulator') return 'emulator';
  if (DEV_CONNECT_MODE === 'usb') return 'usb';
  if (DEV_CONNECT_MODE === 'lan') return 'lan';
  return isAndroidEmulator() ? 'emulator' : 'usb';
}

function resolveDevHost(): string {
  const mode = resolveConnectMode();
  if (mode === 'usb') return '127.0.0.1';
  if (mode === 'lan') return DEV_LAN_HOST;
  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
}

export const API_BASE_URL = `http://${resolveDevHost()}:${DEV_API_PORT}/api/v1`;
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, '');

/** 当前实际使用的连接模式（调试用） */
export const ACTIVE_CONNECT_MODE = resolveConnectMode();
