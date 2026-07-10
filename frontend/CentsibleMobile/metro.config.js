const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'wasm' to the asset extensions so Metro knows how to handle them
config.resolver.assetExts.push('wasm');

module.exports = config;
