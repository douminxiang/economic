import { CommonActions } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { navigationRef } from '../navigation/navigationRef';

export function navigateToShopDetail(
  shopId: number,
  navigation?: NavigationProp<ParamListBase>,
) {
  // 优先在当前 Tab 栈内跳转（如 AI Tab），避免跨 Tab 切换导致返回异常
  if (navigation?.navigate) {
    navigation.navigate('ShopDetail', { id: shopId });
    return;
  }

  const action = CommonActions.navigate({
    name: 'Home',
    params: {
      screen: 'ShopDetail',
      params: { id: shopId },
    },
  });

  if (navigationRef.isReady()) {
    navigationRef.dispatch(action);
    return;
  }

  navigation?.dispatch(action);
}
