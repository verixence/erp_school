const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Temporarily disable NativeWind to get the app running
module.exports = config; 