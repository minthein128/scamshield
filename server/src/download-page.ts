const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] as string);

export function downloadPage(opts: { version?: string; bytes?: number; href?: string }): string {
  const mb = opts.bytes ? `${(opts.bytes / 1_048_576).toFixed(1)} MB` : '';
  const meta = [opts.version ? `Version ${esc(opts.version)}` : '', mb].filter(Boolean).join(' · ');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SafeRoute for Android</title>
<style>
body{font:18px/1.5 system-ui,sans-serif;max-width:32rem;margin:0 auto;padding:1.5rem;color:#1a1a1a}
h1{margin:0 0 .25rem}
.meta{color:#555;margin:0 0 1.5rem}
a.btn{display:block;background:#0b6b3a;color:#fff;text-align:center;font-weight:700;font-size:1.3rem;padding:1.1rem;border-radius:.75rem;text-decoration:none}
ol{padding-left:1.4rem;margin-top:1.5rem}
li{margin-bottom:.9rem}
small{display:block;color:#555}
</style>
</head>
<body>
<h1>SafeRoute</h1>
<p class="meta">${meta}</p>
<a class="btn" href="${esc(opts.href ?? '/download/saferoute.apk')}">Download SafeRoute (APK)<small style="color:#d6f0e0">SafeRoute ကို ဒေါင်းလုဒ်လုပ်ပါ</small></a>
<ol>
<li>Allow installs from your browser when Android asks.<small>ဖုန်းက တောင်းလာလျှင် ဘရောက်ဇာမှ ထည့်သွင်းခွင့်ပေးပါ။</small></li>
<li>Open the downloaded file.<small>ဒေါင်းလုဒ်လုပ်ပြီးသော ဖိုင်ကို ဖွင့်ပါ။</small></li>
<li>Tap Install.<small>Install ကို နှိပ်ပါ။</small></li>
</ol>
</body>
</html>`;
}
