import api from '../services/api';
import { getStorage } from './storage';

let analyticsEnabled: boolean | null = null;

function readAnalyticsEnabled() {
  if (analyticsEnabled === null) {
    analyticsEnabled = getStorage().getString('analyticsEnabled') !== 'false';
  }
  return analyticsEnabled;
}

export const setAnalyticsEnabled = (enabled: boolean) => {
  analyticsEnabled = enabled;
  getStorage().set('analyticsEnabled', String(enabled));
};

export const isAnalyticsEnabled = () => readAnalyticsEnabled();

export const trackPageView = (screenName: string) => {
  if (!readAnalyticsEnabled()) return;
  track('page_view', screenName);
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (!readAnalyticsEnabled()) return;
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
