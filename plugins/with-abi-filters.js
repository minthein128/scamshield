const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// saferoute-abi-filters";

module.exports = function withAbiFilters(config, options = {}) {
  const fromEnv = (process.env.SAFEROUTE_ABIS || "").split(",").map((a) => a.trim()).filter(Boolean);
  const abis = fromEnv.length ? fromEnv : options.abis || ["armeabi-v7a", "arm64-v8a"];
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes(MARKER)) return cfg;
    const filters = abis.map((a) => `"${a}"`).join(", ");
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /defaultConfig\s*\{/,
      (m) => `${m}\n        ndk { abiFilters ${filters} } ${MARKER}`
    );
    return cfg;
  });
};
