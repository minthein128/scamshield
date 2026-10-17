const { withAndroidManifest } = require("expo/config-plugins");

const REMOVED = [
  "android.permission.CAMERA",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.WRITE_CONTACTS",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
];

module.exports = function withMinimalPermissions(config, { remove = REMOVED } = {}) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    const perms = (manifest["uses-permission"] ??= []);
    for (const name of remove) {
      const hit = perms.find((p) => p.$["android:name"] === name);
      if (hit) hit.$["tools:node"] = "remove";
      else perms.push({ $: { "android:name": name, "tools:node": "remove" } });
    }
    return cfg;
  });
};
