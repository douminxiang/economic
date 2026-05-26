declare module 'supercluster' {
  const Supercluster: any;
  export default Supercluster;
}

// react-native-amap3d internal type issues (ships .tsx source, not .d.ts)
// These are safe to suppress — the library works correctly at runtime
declare module 'react-native-amap3d/lib/src/cluster/index' {
  const Cluster: any;
  export default Cluster;
}

declare module 'react-native-amap3d/lib/src/map-view' {
  const MapView: any;
  export default MapView;
}
