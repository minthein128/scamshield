#!/usr/bin/env bash
# Usage: scripts/publish-hf.sh <owner/name> [--dry-run] [--dir FOLDER]
# Creates a private Hugging Face dataset repo and uploads the packaged folder.
set -euo pipefail

REPO="${1:-}"
[ -n "$REPO" ] && shift || true
DRY=0
DIR="$HOME/work/scamshield-datasets/hf/saferoute-scam-screenshots"
TOKEN_FILE="$HOME/work/scamshield-secrets/hf-token"
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1 ;;
    --dir) DIR="$2"; shift ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

if ! printf '%s' "$REPO" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._-]*$'; then
  echo "usage: scripts/publish-hf.sh <owner/name> [--dry-run] [--dir FOLDER]" >&2
  exit 2
fi
[ -d "$DIR" ] || { echo "folder not found: $DIR" >&2; exit 2; }
[ -f "$DIR/README.md" ] || { echo "missing README.md in $DIR" >&2; exit 2; }

# Every real image needs a metadata row with redaction: checked.
uv run --no-project python - "$DIR" <<'PY'
import json, pathlib, sys
root = pathlib.Path(sys.argv[1])
bad = []
for d in sorted(p for p in (root / "data").glob("real_*") if p.is_dir()):
    meta = d / "metadata.jsonl"
    rows = {}
    if meta.exists():
        for line in meta.read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line)
                rows[r["file_name"]] = r
    files = [f for f in d.iterdir() if f.is_file() and f.name != "metadata.jsonl"]
    if not files:
        bad.append(f"{d.name}: no images")
    for f in files:
        r = rows.get(f.name)
        if r is None:
            bad.append(f"{d.name}/{f.name}: no metadata row")
        elif r.get("redaction") != "checked":
            bad.append(f"{d.name}/{f.name}: redaction is {r.get('redaction')!r}")
    for name in rows:
        if not (d / name).exists():
            bad.append(f"{d.name}/{name}: row without image")
if bad:
    print("refusing to publish: redaction is not checked for every real image", file=sys.stderr)
    for b in bad[:20]:
        print("  " + b, file=sys.stderr)
    sys.exit(1)
print("redaction check passed")
PY

if [ "$DRY" = 1 ]; then
  echo "dry run: would create private dataset $REPO and upload $DIR"
  exit 0
fi

[ -r "$TOKEN_FILE" ] || { echo "token file not found: $TOKEN_FILE" >&2; exit 2; }
HF_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")"
export HF_TOKEN
HF="uvx --from huggingface_hub hf"

$HF repos create "$REPO" --repo-type dataset --private --exist-ok
$HF upload "$REPO" "$DIR" . --repo-type dataset --private --commit-message "Upload SafeRoute scam screenshot dataset"
echo "uploaded to https://huggingface.co/datasets/$REPO (private)"
