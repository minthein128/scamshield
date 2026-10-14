# Release keystore

The Android workflow signs the APK with a release keystore when four secrets exist. Without them it keeps the debug signature, so the APK still installs but cannot update a release-signed install.

## Create the keystore

```bash
keytool -genkeypair -v \
  -keystore saferoute-release.jks \
  -alias saferoute \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storetype PKCS12
```

Keep `saferoute-release.jks` and its passwords in a password manager. Never commit the file. Losing it means users must uninstall to update.

## Load it into GitHub

```bash
base64 -w0 saferoute-release.jks | gh secret set ANDROID_KEYSTORE_BASE64 --repo OWNER/REPO
gh secret set ANDROID_KEYSTORE_PASSWORD --repo OWNER/REPO
gh secret set ANDROID_KEY_ALIAS --repo OWNER/REPO --body saferoute
gh secret set ANDROID_KEY_PASSWORD --repo OWNER/REPO
```

On macOS use `base64 -i saferoute-release.jks | tr -d '\n'`. For a PKCS12 keystore the key password equals the store password.

## Check a built APK

```bash
$ANDROID_HOME/build-tools/<version>/apksigner verify --print-certs saferoute.apk
```
