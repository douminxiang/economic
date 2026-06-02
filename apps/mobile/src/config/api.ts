import { Platform } from 'react-native';

/**
 * 开发环境连接方式（真机测试前改这里）
 *
 * - emulator：Android 模拟器（默认 10.0.2.2）
 * - usb：真机 USB + `adb reverse`（见 scripts/dev-real-device.ps1）
 * - lan：真机 WiFi，与电脑同一局域网，填 DEV_LAN_HOST
 */
export type DevConnectMode = 'emulator' | 'usb' | 'lan';

/** 真机测试时改为 'usb' 或 'lan' */
export const DEV_CONNECT_MODE: DevConnectMode = 'usb';

/** 电脑 WLAN IP（ipconfig 查看），仅 lan 模式使用 */
export const DEV_LAN_HOST = '10.33.103.251';

const DEV_API_PORT = 3000;

function resolveDevHost(): string {
  if (DEV_CONNECT_MODE === 'usb') return '127.0.0.1';
  if (DEV_CONNECT_MODE === 'lan') return DEV_LAN_HOST;
  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
}

export const API_BASE_URL = `http://${resolveDevHost()}:${DEV_API_PORT}/api/v1`;
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, '');
