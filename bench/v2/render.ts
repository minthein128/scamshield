import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { parseArgs } from '../lib.js';
import { CASES_DIR, type CaseFile, loadCases, parseCaseText, type Scene } from './cases.js';
import { screenshot } from './chrome.js';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');

const CSS = `
*{box-sizing:border-box;margin:0}
body{width:390px;height:844px;font-family:'Noto Sans','Noto Sans Myanmar','Noto Sans Thai','DejaVu Sans',sans-serif;overflow:hidden;background:#fff;color:#111}
.status{height:34px;display:flex;justify-content:space-between;align-items:center;padding:0 22px;font-size:13px;font-weight:600}
.hdr{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #e3e3e3}
.av{width:36px;height:36px;border-radius:50%;background:#7a8bb5;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px}
.nm{font-weight:600;font-size:16px}.sub{font-size:12px;color:#777}
.msgs{padding:14px;display:flex;flex-direction:column;gap:8px}
.b{max-width:82%;padding:9px 12px;border-radius:16px;font-size:14.5px;line-height:1.45}
.my .b,.my .card{line-height:1.75}
.them{background:#eef0f4;align-self:flex-start;border-bottom-left-radius:4px}
.me{background:#2b6cf0;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.sms .me{background:#34c759}
.t{align-self:center;font-size:11px;color:#888;margin:4px 0}
.card{margin:12px;border:1px solid #e3e3e3;border-radius:12px;padding:14px;font-size:14.5px;line-height:1.45}
.post-h{display:flex;gap:10px;align-items:center;margin-bottom:10px}
.act{display:flex;justify-content:space-around;border-top:1px solid #eee;margin-top:12px;padding-top:10px;font-size:13px;color:#666}
`;

export function sceneHtml(scene: Scene, lang: string): string {
  const msgs = scene.messages
    .map((m) => (m.from === 'time' ? `<div class=t>${esc(m.text)}</div>` : `<div class="b ${m.from}">${esc(m.text)}</div>`))
    .join('');
  const initial = esc([...scene.sender][0] ?? '?');
  let inner: string;
  if (scene.layout === 'post') {
    const body = scene.messages.map((m) => esc(m.text)).join('<br><br>');
    inner = `<div class=hdr><b style="font-size:18px;color:#2b6cf0">feed</b></div><div class=card><div class=post-h><div class=av>${initial}</div><div><div class=nm style="font-size:15px">${esc(scene.sender)}</div><div class=sub>${esc(scene.subtitle ?? 'Sponsored')}</div></div></div>${body}<div class=act><span>Like</span><span>Comment</span><span>Share</span></div></div>`;
  } else if (scene.layout === 'sms') {
    inner = `<div class=hdr style="justify-content:center;flex-direction:column;gap:2px"><div class=nm>${esc(scene.sender)}</div><div class=sub>${esc(scene.subtitle ?? 'Text message')}</div></div><div class=msgs>${msgs}</div>`;
  } else {
    inner = `<div class=hdr><div class=av>${initial}</div><div><div class=nm>${esc(scene.sender)}</div><div class=sub>${esc(scene.subtitle ?? 'online')}</div></div></div><div class=msgs>${msgs}</div>`;
  }
  return `<!doctype html><meta charset=utf-8><style>${CSS}</style><body class="${scene.layout} ${lang}"><div class=status><span>9:41</span><span>5G 87%</span></div>${inner}</body>`;
}

/** Renders every case (and translation) that carries a synthetic scene to its image path. */
export function renderCases(dir = CASES_DIR, only?: string[]): string[] {
  const written: string[] = [];
  const { cases } = loadCases(dir, { allowDrafts: true, requireImage: false });
  for (const c of cases) {
    if (only && !only.includes(c.id)) continue;
    const raw = parseCaseText(readFileSync(c.path as string, 'utf8'), c.path as string) as CaseFile;
    const jobs: [Scene, string, string][] = [];
    if (raw.synthetic) jobs.push([raw.synthetic, resolve(dirname(c.path as string), raw.file), raw.content_language ?? raw.language]);
    for (const t of raw.translations ?? []) {
      if (t.synthetic && t.file) jobs.push([t.synthetic, resolve(dirname(c.path as string), t.file), t.language]);
    }
    for (const [scene, out, lang] of jobs) {
      mkdirSync(dirname(out), { recursive: true });
      screenshot(sceneHtml(scene, lang), out, 390, 844);
      written.push(out);
      console.log(`rendered ${relative(process.cwd(), out)}`);
    }
  }
  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const flags = parseArgs(process.argv.slice(2));
  const only = typeof flags.only === 'string' ? flags.only.split(',') : undefined;
  renderCases(typeof flags.cases === 'string' ? resolve(flags.cases) : CASES_DIR, only);
}
