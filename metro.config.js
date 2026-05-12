const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite/web imports a .wasm; Metro doesn't list it as an asset by default.
config.resolver.assetExts = [...config.resolver.assetExts, 'wasm'];

module.exports = withNativewind(config);
