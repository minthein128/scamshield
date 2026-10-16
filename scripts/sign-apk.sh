#!/usr/bin/env bash
set -euo pipefail

in_dir="${1:?usage: sign-apk.sh <apk-dir> <output-apk>}"
out="${2:?usage: sign-apk.sh <apk-dir> <output-apk>}"

apk="$(find "$in_dir" -maxdepth 1 -name '*.apk' | head -n 1)"
[ -n "$apk" ] || { echo "no apk found in $in_dir" >&2; exit 1; }

sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
apksigner="$(find "$sdk/build-tools" -name apksigner 2>/dev/null | sort -V | tail -n 1)"
[ -n "$apksigner" ] || { echo "apksigner not found under $sdk/build-tools" >&2; exit 1; }

mkdir -p "$(dirname "$out")"
cp "$apk" "$out"

if [ -n "${ANDROID_KEYSTORE_BASE64:-}" ] && [ -n "${ANDROID_KEYSTORE_PASSWORD:-}" ] \
  && [ -n "${ANDROID_KEY_ALIAS:-}" ] && [ -n "${ANDROID_KEY_PASSWORD:-}" ]; then
  ks="$(mktemp)"
  trap 'rm -f "$ks"' EXIT
  printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$ks"
  "$apksigner" sign \
    --ks "$ks" \
    --ks-pass env:ANDROID_KEYSTORE_PASSWORD \
    --ks-key-alias "$ANDROID_KEY_ALIAS" \
    --key-pass env:ANDROID_KEY_PASSWORD \
    "$out"
  echo "signed with release keystore"
else
  echo "release keystore secrets missing; keeping debug signature"
fi

"$apksigner" verify --print-certs "$out"
