const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo web modules register under their class name; minified names collide and hand back the wrong module.
config.transformer.minifierConfig = { ...config.transformer.minifierConfig, keep_classnames: true };

module.exports = config;
