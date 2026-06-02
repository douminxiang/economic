const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules');

const blockList = [
  // Gradle / CMake 构建产物会在编译时被删除，监听会导致 Metro 崩溃或卡死
  /node_modules[\\/].*[\\/]android[\\/]\.cxx[\\/].*/,
  /node_modules[\\/].*[\\/]android[\\/]build[\\/].*/,
  /node_modules[\\/].*[\\/]android[\\/]\.gradle[\\/].*/,
  /apps[\\/]mobile[\\/]android[\\/]\.cxx[\\/].*/,
  /apps[\\/]mobile[\\/]android[\\/]build[\\/].*/,
  /apps[\\/]mobile[\\/]android[\\/]\.gradle[\\/].*/,
  /apps[\\/]server[\\/].*/,
  /\.git[\\/].*/,
];

const config = {
  projectRoot,
  // pnpm 将依赖提升到仓库根 node_modules，必须纳入 watchFolders 才能解析模块
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      workspaceNodeModules,
    ],
    disableHierarchicalLookup: true,
    blockList,
  },
  watcher: {
    healthCheck: {
      enabled: true,
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
