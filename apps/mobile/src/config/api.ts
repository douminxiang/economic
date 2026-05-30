import { Platform } from 'react-native';

/**
 * Android 模拟器访问宿主机用 10.0.2.2
 * 真机调试时改为电脑局域网 IP，例如 http://192.168.1.100:3000
 */
export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/api/v1'
    : 'http://localhost:3000/api/v1';

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, '');
