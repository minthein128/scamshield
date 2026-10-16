# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow", "pyyaml"]
# ///
"""Apply redaction_boxes from private case files to the original images.

Usage: uv run bench/real/redact.py --cases DIR --out DIR [--only id,id]
Avatars and faces are pixelated then blurred. Text regions are filled with a solid box.
Boxes are in pixels of the original image. The output keeps the original size.
"""
import argparse
import sys
from pathlib import Path

import yaml
from PIL import Image, ImageDraw, ImageFilter

TEXT_KINDS = {"name", "phone", "handle", "other"}


def fill_color(im: Image.Image, box: tuple[int, int, int, int]) -> tuple[int, int, int]:
    x0, y0, x1, y1 = box
    ring = [
        im.crop((x0, max(0, y0 - 2), x1, y0)) if y0 > 0 else None,
        im.crop((x0, y1, x1, min(im.height, y1 + 2))) if y1 < im.height else None,
    ]
    px = []
    for r in ring:
        if r is not None and r.width and r.height:
            px.append(r.convert("RGB").resize((1, 1), Image.BOX).getpixel((0, 0)))
    if not px:
        return (128, 128, 128)
    return tuple(int(sum(c[i] for c in px) / len(px)) for i in range(3))  # type: ignore[return-value]


def apply(im: Image.Image, boxes: list[dict]) -> Image.Image:
    out = im.convert("RGB")
    draw = ImageDraw.Draw(out)
    for b in boxes:
        x0, y0 = b["x"], b["y"]
        x1, y1 = min(out.width, x0 + b["w"]), min(out.height, y0 + b["h"])
        if x1 <= x0 or y1 <= y0:
            continue
        kind = b.get("kind", "other")
        mode = b.get("mode") or ("blur" if kind in ("avatar", "face") else "box")
        if mode == "blur":
            region = out.crop((x0, y0, x1, y1))
            small = region.resize((max(1, (x1 - x0) // 12), max(1, (y1 - y0) // 12)), Image.BILINEAR)
            region = small.resize(region.size, Image.NEAREST).filter(ImageFilter.GaussianBlur(max(4, min(x1 - x0, y1 - y0) // 6)))
            out.paste(region, (x0, y0))
        else:
            c = fill_color(out, (x0, y0, x1, y1))
            lum = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
            shade = (90, 90, 90) if lum > 128 else (170, 170, 170)
            draw.rectangle((x0, y0, x1 - 1, y1 - 1), fill=shade)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cases", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--only")
    a = ap.parse_args()
    cases = Path(a.cases)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    only = set(a.only.split(",")) if a.only else None
    n = 0
    for f in sorted(cases.glob("*.yaml")):
        doc = yaml.safe_load(f.read_text())
        if only and doc["id"] not in only:
            continue
        src = (f.parent / doc["file"]).resolve()
        im = Image.open(src)
        red = apply(im, doc.get("redaction_boxes") or [])
        red.save(out / f"{doc['id']}.png", optimize=True)
        n += 1
    print(f"redacted {n} images -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
