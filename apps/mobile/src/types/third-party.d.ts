declare module 'supercluster' {
  const Supercluster: any;
  export default Supercluster;
}

// react-native-amap3d ships .tsx source instead of compiled .d.ts, causing type errors
// The library works correctly at runtime; these suppress type-checking for its internals
declare module 'react-native-amap3d' {
  export const MapView: any;
  export const Marker: any;
  export const Polyline: any;
  export const Polygon: any;
  export const Circle: any;
}

declare module 'react-native-amap3d/*' {
  const content: any;
  export default content;
}
