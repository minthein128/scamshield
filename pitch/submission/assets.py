"""Renders the image assets for the submission deck into build/ with headless Chrome and Pillow."""
import glob
import os
import subprocess
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
PITCH = HERE.parent
REPO = PITCH.parent
OUT = HERE / 'build'
OUT.mkdir(exist_ok=True)
CHROME = os.environ.get('CHROME') or sorted(glob.glob(os.path.expanduser('~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome')))[-1]
FONT = (Path.home() / '.local/share/fonts/GoogleSansFlex.ttf').as_uri()

HEAD = f"""<!doctype html><meta charset="utf-8"><style>
@font-face {{ font-family: 'Google Sans Flex'; src: url('{FONT}'); font-weight: 100 1000; }}
html, body {{ margin: 0; background: transparent; }}
.phone {{ background: #1F1A17; border-radius: 52px; padding: 13px; display: inline-block; }}
.screen {{ border-radius: 40px; overflow: hidden; position: relative; background: #F7F3EE; }}
.screen img {{ display: block; width: 100%; }}
.crop img {{ position: absolute; left: 0; top: 0; }}
.schem {{ background: #EDE6DC; }}
.bar {{ position: absolute; height: 18px; border-radius: 9px; background: #D6CCBF; }}
.msg {{ position: absolute; border-radius: 22px; background: #fff; }}
.msg.me {{ background: #DDEBD3; }}
.sprite {{ position: absolute; background-image: url('{(PITCH / 'e2e/bubble-doll-states.png').as_uri()}'); background-repeat: no-repeat; }}
</style>"""


def shot(name, body, w, h, scale=2):
    html = OUT / f'{name}.html'
    html.write_text(HEAD + f'<body style="width:{w}px;height:{h}px">{body}</body>')
    subprocess.run([CHROME, '--headless', '--no-sandbox', '--disable-gpu', '--allow-file-access-from-files', '--hide-scrollbars',
                    '--default-background-color=00000000', f'--force-device-scale-factor={scale}', f'--window-size={w},{h}',
                    f'--screenshot={OUT / (name + ".png")}', html.as_uri()], check=True, stderr=subprocess.DEVNULL)
    html.unlink()


def e2e(f):
    return (PITCH / 'e2e' / f).as_uri()


def phone(name, src, screen_h=None, top=0, width=330):
    full_h = round(width * 844 / 390)
    h = screen_h or full_h
    inner = f'<img src="{src}" style="top:{top}px">' if screen_h else f'<img src="{src}">'
    cls = 'screen crop' if screen_h else 'screen'
    body = f'<div class="phone"><div class="{cls}" style="width:{width}px;height:{h}px">{inner}</div></div>'
    shot(name, body, width + 26, h + 26)


phone('ph-danger-en', e2e('verdict-report-danger-390x844-en.png'), 694)
phone('ph-danger-my', e2e('verdict-report-danger-390x844-my.png'), 694)
phone('ph-jobshield', e2e('jobshield-result-conflicts-pause-en-390x844.png'), 694, -20)
phone('ph-check', e2e('kakwe-check-en.png'), 694, -20)
phone('ph-report-my', e2e('kakwe-report-my.png'), 694, -20)
phone('ph-settings', e2e('kakwe-settings-en.png'), 640, -262)
bubble = """<div class="phone"><div class="screen schem" style="width:330px;height:694px;position:relative">
<div class="bar" style="left:28px;top:34px;width:150px;height:22px;background:#CFC5B9"></div>
<div class="msg" style="left:22px;top:92px;width:230px;height:96px"></div>
<div class="bar" style="left:44px;top:114px;width:180px"></div>
<div class="bar" style="left:44px;top:146px;width:140px"></div>
<div class="msg me" style="right:22px;top:208px;width:170px;height:58px"></div>
<div class="msg" style="left:22px;top:286px;width:250px;height:58px"></div>
<div class="sprite" style="right:8px;top:232px;width:92px;height:92px;border-radius:50%;background-size:590px auto;background-position:-403px -30px"></div>
<div class="sprite" style="left:4px;top:356px;width:322px;height:340px;background-size:370px auto;background-position:-16px -673px"></div>
</div></div>"""
shot('ph-bubble', bubble, 356, 720)

for svg in ['medallion', 'doll-calm', 'doll-concerned', 'doll-worried']:
    shot(svg, f'<img src="{(PITCH / "deck/img" / (svg + ".svg")).as_uri()}" style="width:400px;height:400px;display:block">', 400, 400, 1)

shot('arch', (HERE / 'arch.svg').read_text(), 1680, 560)

MOCK = Path(os.environ.get('MOCK_DIR', Path.home() / 'work/home-check-v2-handoff'))
crops = {
    'mock-home-off': ('home/home-shield-off-en.png', (0, 150, 780, 1500)),
    'mock-home-on': ('home/home-shield-on-en.png', (0, 150, 780, 1500)),
    'mock-check-message': ('check/c3-mode-message-en.png', (0, 150, 780, 1470)),
    'mock-check-job': ('check/c3-job-filled-full-en.png', (0, 150, 780, 1555)),
}
for name, (f, box) in crops.items():
    Image.open(MOCK / f).convert('RGB').crop(box).save(OUT / f'{name}.png')
print('assets in', OUT)
