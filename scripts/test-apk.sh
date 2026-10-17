#!/usr/bin/env bash
set -euo pipefail

branch="${1:-$(git rev-parse --abbrev-ref HEAD)}"
abi="${ABI:-arm64-v8a}"
repo="${REPO:-minthein128/scamshield}"
dest="${DEST_DIR:-/home/ubuntu/.seti/workspace/b1632abd-a2dd-4fa2-b8ff-c415fca04aae}"
expected_sha1="${EXPECTED_SHA1:-11:83:B3:E6:42:7D:B4:60:31:B7:52:59:4D:DB:0E:CA:DA:A0:D0:43}"
bt="${BUILD_TOOLS:-/home/ubuntu/work/android-sdk/build-tools/34.0.0}"
java_bin="${JAVA_BIN:-$HOME/.gradle/jdks/eclipse_adoptium-17-amd64-linux.2/bin/java}"

since="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
gh workflow run android.yml -R "$repo" --ref "$branch" -f force_distribute=false -f "abi=$abi"

run_id=""
for _ in $(seq 1 30); do
  sleep 4
  run_id="$(gh run list -R "$repo" -w android.yml -b "$branch" -e workflow_dispatch -L 5 \
    --json databaseId,createdAt -q "[.[] | select(.createdAt >= \"$since\")][0].databaseId // empty")"
  [ -n "$run_id" ] && break
done
[ -n "$run_id" ] || { echo "dispatched run not found" >&2; exit 1; }
echo "run $run_id: https://github.com/$repo/actions/runs/$run_id"

gh run watch "$run_id" -R "$repo" --exit-status >/dev/null || { echo "build failed" >&2; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
gh run download "$run_id" -R "$repo" -n saferoute-apk -D "$work"
apk="$(find "$work" -name '*.apk' | head -n 1)"
[ -n "$apk" ] || { echo "no apk in artifact" >&2; exit 1; }

certs="$("$java_bin" -jar "$bt/lib/apksigner.jar" verify --print-certs "$apk")"
sha1="$(printf '%s\n' "$certs" | sed -n 's/.*certificate SHA-1 digest: //p' | head -n 1 | tr 'a-f' 'A-F' | sed 's/../&:/g;s/:$//')"
if [ "$sha1" != "$expected_sha1" ]; then
  echo "signing mismatch: got ${sha1:-none}, want $expected_sha1" >&2
  exit 1
fi

version="$("$bt/aapt" dump badging "$apk" | sed -n "s/.*versionName='\([^']*\)'.*/\1/p" | head -n 1)"
[ -n "$version" ] || { echo "versionName not found" >&2; exit 1; }

mkdir -p "$dest"
cp "$apk" "$dest/Kakwe-test-$version.apk"
echo "signing SHA-1 $sha1 ok, versionName $version"
echo "$dest/Kakwe-test-$version.apk"
