import api from '../services/api';
import { getStorage } from './storage';
import type { ActiveRoute } from '../navigation/navigationRef';

let analyticsEnabled: boolean | null = null;

function readAnalyticsEnabled() {
  if (analyticsEnabled === null) {
    analyticsEnabled = getStorage().getString('analyticsEnabled') !== 'false';
  }
  return analyticsEnabled;
}

function getDeviceId(): string {
  let id = getStorage().getString('analyticsDeviceId');
  if (!id) {
    id = `d_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    getStorage().set('analyticsDeviceId', id);
  }
  return id;
}

export const setAnalyticsEnabled = (enabled: boolean) => {
  analyticsEnabled = enabled;
  getStorage().set('analyticsEnabled', String(enabled));
};

export const isAnalyticsEnabled = () => readAnalyticsEnabled();

export const trackPageView = (route: ActiveRoute | string) => {
  if (!readAnalyticsEnabled()) return;

  if (typeof route === 'string') {
    track('page_view', route, { screen: route });
    return;
  }

  track('page_view', route.name, {
    screen: route.screen,
    ...route.params,
  });
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (!readAnalyticsEnabled()) return;
  track('custom', eventName, properties);
};

const track = async (
  eventType: string,
  eventName: string,
  properties?: Record<string, any>,
) => {
  try {
    await api.post('/events/track', {
      eventType,
      eventName,
      properties,
      platform: 'android',
      appVersion: '1.0.0',
      deviceId: getDeviceId(),
    });
  } catch {
    // Silently fail - analytics should never block the user
  }
};
