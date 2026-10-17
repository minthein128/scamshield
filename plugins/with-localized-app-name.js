const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "\\'").replace(/"/g, '\\"');

module.exports = function withLocalizedAppName(config, { names = {} } = {}) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const res = path.join(cfg.modRequest.platformProjectRoot, "app", "src", "main", "res");
      for (const [locale, name] of Object.entries(names)) {
        const dir = path.join(res, `values-${locale}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          path.join(dir, "strings.xml"),
          `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <string name="app_name">${escape(name)}</string>\n</resources>\n`
        );
      }
      return cfg;
    },
  ]);
};
