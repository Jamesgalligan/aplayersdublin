// Runs the studio page in headless Chrome and saves the finished render.
//   STUDIO_URL=http://localhost:8000/premium/studio/shoot.html node shoot.mjs "<query string>" <out.jpg> [quality]
// The page's canvas is read once window.done settles (the path tracer has reached its sample count).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const query = process.argv[2], out = process.argv[3], quality = +(process.argv[4] || 0.92);
// where the studio page is being served: set STUDIO_URL to suit (see premium/README.md)
const url = (process.env.STUDIO_URL || 'http://localhost:4180/dublin-event/premium/studio/shoot.html') + '?' + query;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ap-shoot-'));
const port = 9400 + Math.floor(Math.random() * 60);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--hide-scrollbars', '--no-first-run',
   '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1400,1700', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const waiting = new Map(); const logs = [];
for (let i = 0; i < 60 && !ws; i++) {
  await sleep(200);
  try {
    const tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
    const page = tabs.find((t) => t.type === 'page');
    if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r)); }
  } catch { /* not up yet */ }
}
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Runtime.consoleAPICalled' && /error|warn/.test(m.params.type)) logs.push(m.params.type.toUpperCase() + ' ' + m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 300));
});
const send = (method, params = {}) => new Promise((r) => { const n = ++id; waiting.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
await send('Page.enable'); await send('Runtime.enable');
const t0 = Date.now();
await send('Page.navigate', { url });
let state = null;
for (let i = 0; i < 900; i++) {                         // up to fifteen minutes
  await sleep(1000);
  const r = await send('Runtime.evaluate', { expression: 'window.done ? "running " + document.title : "loading"', returnByValue: true });
  state = r.result?.result?.value;
  if (logs.some((l) => l.startsWith('EXC'))) break;
  const d = await send('Runtime.evaluate', { expression: 'window.done ? Promise.race([window.done, new Promise(r => setTimeout(() => r(0), 50))]) : 0', awaitPromise: true, returnByValue: true });
  if (d.result?.result?.value) break;
}
const shot = await send('Runtime.evaluate', { expression: `document.querySelector('canvas') ? document.querySelector('canvas').toDataURL('image/jpeg', ${quality}) : ''`, returnByValue: true });
const data = shot.result?.result?.value || '';
if (data) { fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64')); console.log('saved', out, Math.round(fs.statSync(out).size / 1024) + ' KB', state, Math.round((Date.now() - t0) / 1000) + 's'); }
else console.log('no picture', state);
if (logs.length) console.log('PAGE LOG:\n' + [...new Set(logs)].slice(0, 12).join('\n'));
ws.close(); chrome.kill(); await sleep(600);
try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* letting go */ }
