module.exports = ({ config }) => {
  const facebookId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim();
  return { ...config, scheme: facebookId ? [config.scheme, `fb${facebookId}`] : config.scheme };
};
