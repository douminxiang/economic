import { Platform } from 'react-native';
import { getStorage } from './storage';

export function getDeviceId(): string {
  let id = getStorage().getString('deviceId');
  if (!id) {
    id = getStorage().getString('analyticsDeviceId');
  }
  if (!id) {
    id = `d_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    getStorage().set('deviceId', id);
  }
  return id;
}

export function getDeviceName(): string {
  return `${Platform.OS} device`;
}

export function getAuthDevicePayload() {
  return {
    deviceId: getDeviceId(),
    deviceName: getDeviceName(),
  };
}
