import api from '../services/api';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();
let analyticsEnabled = storage.getString('analyticsEnabled') !== 'false';

export const setAnalyticsEnabled = (enabled: boolean) => {
  analyticsEnabled = enabled;
  storage.set('analyticsEnabled', String(enabled));
};

export const isAnalyticsEnabled = () => analyticsEnabled;

export const trackPageView = (screenName: string) => {
  if (!analyticsEnabled) return;
  track('page_view', screenName);
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (!analyticsEnabled) return;
  track('custom', eventName, properties);
};

const track = async (eventType: string, eventName: string, properties?: Record<string, any>) => {
  try {
    await api.post('/events/track', {
      eventType,
      eventName,
      properties,
      platform: 'android',
      appVersion: '1.0.0',
    });
  } catch {
    // Silently fail - analytics should never block the user
  }
};
