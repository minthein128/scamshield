# Release keystore

Release APKs are signed with a private key. `main` and `feat/production` builds fail when the four signing secrets are missing. Other branches fall back to the public debug key.

## Where the key lives

| Item | Location |
|---|---|
| Keystore (PKCS12, RSA 4096, alias `saferoute`, valid to 2056) | `~/work/scamshield-secrets/saferoute-release.jks` on the build host |
| Passwords | `~/work/scamshield-secrets/release-passwords.txt` (mode 600) |
| CI copy | GitHub secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` on `minthein128/scamshield` |

The key password equals the store password. Never commit the keystore.

## Fingerprints

| Type | Value |
|---|---|
| SHA-1 | `11:83:B3:E6:42:7D:B4:60:31:B7:52:59:4D:DB:0E:CA:DA:A0:D0:43` |
| SHA-256 | `41:84:B5:DA:38:EC:BA:4A:CA:F2:5E:58:22:CC:79:72:49:D2:F5:E5:42:A1:61:33:9F:BC:47:D4:51:94:60:05` |
| Facebook key hash | `EYOz5kJ9tGAxt1JZTdsOytqg0EM=` |

Both fingerprints are registered on the Firebase Android app `com.saferoute.antifraud`, next to the debug fingerprints. Google sign-in needs them. Remove the debug fingerprints once no tester uses a debug-signed build.

## Back it up

Copy `saferoute-release.jks` and `release-passwords.txt` to a password manager or an encrypted vault off the build host. Keep two copies. Losing the key means no future update can install over a release-signed build.

## Rotate the GitHub secrets

```bash
base64 -w0 saferoute-release.jks | gh secret set ANDROID_KEYSTORE_BASE64 --repo minthein128/scamshield
gh secret set ANDROID_KEYSTORE_PASSWORD --repo minthein128/scamshield < pw.txt
gh secret set ANDROID_KEY_PASSWORD --repo minthein128/scamshield < pw.txt
gh secret set ANDROID_KEY_ALIAS --repo minthein128/scamshield --body saferoute
```

Here `pw.txt` holds only the password, with no newline.

## One-time tester migration

Android refuses to update an app signed with a different key. Every tester must uninstall the old SafeRoute once before installing the first release-signed build. Local history is lost. Synced data returns after sign-in.

Message for testers:

> The next SafeRoute build uses a new, private signing key. Please uninstall the current SafeRoute app first, then install the new build.
> Your local history will be cleared, and your synced data comes back when you sign in.

## Check a built APK

```bash
$ANDROID_HOME/build-tools/<version>/apksigner verify --print-certs saferoute.apk
```

The SHA-256 digest must match the table above.
