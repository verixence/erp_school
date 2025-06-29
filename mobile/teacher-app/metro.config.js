const path = require('path');

module.exports = {
  projectRoot: __dirname,
  watchFolders: [],
  
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
    resolverMainFields: ['react-native', 'browser', 'main'],
  },
  
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
}; 