const fs = require("fs");
const path = require("path");

const proguardRules = fs.readFileSync(path.join(__dirname, "plugins", "proguard-rules.pro"), "utf8");

const withProguardRules = (plugins = []) =>
  plugins.map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === "expo-build-properties") {
      const options = plugin[1] || {};
      return [
        plugin[0],
        { ...options, android: { ...options.android, extraProguardRules: proguardRules } },
      ];
    }
    return plugin;
  });

module.exports = ({ config }) => {
  const facebookId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim();
  return {
    ...config,
    plugins: withProguardRules(config.plugins),
    scheme: facebookId ? [config.scheme, `fb${facebookId}`] : config.scheme,
  };
};
