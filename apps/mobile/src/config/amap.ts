/**
 * 高德地图 Key 配置（与高德控制台 BeautyGo 应用对应）
 *
 * | 控制台名称 | 平台       | 用途                         |
 * |-----------|------------|------------------------------|
 * | WebKey    | Web 服务   | 后端 .env AMAP_WEB_KEY       |
 * | RunGo     | Android    | 本文件 + AndroidManifest.xml |
 * | ios适配   | iOS        | 未来 iOS 构建时使用          |
 */
export const AMAP_ANDROID_KEY = 'fa9254f9d9fd8e972fdcb6130d7b7cc6';

/** Debug 签名 SHA1，需在 RunGo Key 的「设置」中绑定 */
export const AMAP_ANDROID_DEBUG_SHA1 =
  '5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25';

export const AMAP_ANDROID_PACKAGE = 'com.economic.mobile';
