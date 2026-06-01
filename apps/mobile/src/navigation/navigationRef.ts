import { createNavigationContainerRef, NavigationState } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

const SAFE_PARAM_KEYS = ['id', 'orderId', 'shopId', 'productId', 'categoryId'] as const;

export interface ActiveRoute {
  /** Full path, e.g. Home/ShopDetail */
  name: string;
  /** Leaf screen name */
  screen: string;
  params?: Record<string, string | number>;
}

function pickSafeParams(
  params?: Record<string, unknown>,
): Record<string, string | number> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number> = {};
  for (const key of SAFE_PARAM_KEYS) {
    const value = params[key];
    if (typeof value === 'string' || typeof value === 'number') {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function getActiveRoute(state: NavigationState | undefined): ActiveRoute | undefined {
  if (!state) return undefined;

  const names: string[] = [];
  let leafParams: Record<string, unknown> | undefined;
  let current: NavigationState | undefined = state;

  while (current) {
    const route = current.routes[current.index];
    names.push(route.name);
    leafParams = route.params as Record<string, unknown> | undefined;
    current = route.state as NavigationState | undefined;
  }

  const screen = names[names.length - 1];
  if (!screen) return undefined;

  return {
    name: names.join('/'),
    screen,
    params: pickSafeParams(leafParams),
  };
}

/** @deprecated Use getActiveRoute */
export function getActiveRouteName(state: NavigationState | undefined): string | undefined {
  return getActiveRoute(state)?.name;
}
