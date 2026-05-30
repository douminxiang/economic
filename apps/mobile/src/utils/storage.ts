import { createMMKV, type MMKV } from 'react-native-mmkv';

let storage: MMKV | null = null;

/** 延迟创建 MMKV，避免 Nitro 在 JS runtime 就绪前初始化 */
export function getStorage(): MMKV {
  if (!storage) {
    storage = createMMKV();
  }
  return storage;
}
