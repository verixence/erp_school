const { getDefaultConfig } = require('expo/metro-config');

// Get the default config
const config = getDefaultConfig(__dirname);

// Remove all serializer customizations that cause conflicts
config.serializer = {};

// Remove all transformer customizations
config.transformer = {};

// Keep only basic resolver settings
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [require('path').resolve(__dirname, 'node_modules')],
};

// Clear problematic configurations
config.watchFolders = [];

module.exports = config; 