const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add any custom configuration here if needed
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// Ensure proper handling of react-native modules
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;