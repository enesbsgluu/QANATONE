// KAPI: gercek Chrome basliyor mu, H.264 cozuyor mu, requestVideoFrameCallback atiyor mu
const pt = require('puppeteer-core');
const http = require('http'), fs = require('fs'), path = require('path');

const KOK = __dirname;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const MIME = { '.mp4': 'video/mp4', '.html': 'text/html', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.js': 'text/javascript', '.json': 'application/json', '.avif': 'image/avif' };

function sunucu(kok, port) {
  return new Promise(res => {
    const s = http.createServer((req, rp) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const f = path.join(kok, u === '/' ? '/index.html' : u);
      if (!f.startsWith(kok) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rp.writeHead(404); return rp.end('yok'); }
      const st = fs.statSync(f), mime = MIME[path.extname(f)] || 'application/octet-stream';
      const rng = req.headers.range;
      if (rng) {
        const m = /bytes=(\d*)-(\d*)/.exec(rng);
        const a = m[1] ? +m[1] : 0, b = m[2] ? +m[2] : st.size - 1;
        rp.writeHead(206, { 'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 });
        fs.createReadStream(f, { start: a, end: b }).pipe(rp);
      } else {
        rp.writeHead(200, { 'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Content-Length': st.size });
        fs.createReadStream(f).pipe(rp);
      }
    });
    s.listen(port, '127.0.0.1', () => res(s));
  });
}

(async () => {
  fs.writeFileSync(path.join(KOK, 'kapi.html'), `<!doctype html><meta charset=utf-8><body style="margin:0;background:#111">
<video id=v src="/ff/t3.mp4" muted playsinline preload=auto style="width:320px"></video>
<script>
window.IZ = { hazir:0, rvfc:'yok', kareler:[], hata:'' };
const v = document.getElementById('v');
v.addEventListener('error', () => IZ.hata = 'video error ' + (v.error && v.error.code));
v.addEventListener('loadeddata', () => IZ.hazir = 1);
IZ.rvfc = ('requestVideoFrameCallback' in HTMLVideoElement.prototype) ? 'var' : 'yok';
if (IZ.rvfc === 'var') {
  const f = (now, md) => { IZ.kareler.push(+md.mediaTime.toFixed(4)); v.requestVideoFrameCallback(f); };
  v.requestVideoFrameCallback(f);
}
window.RAF = [];
let n = 0; const t = (ts) => { RAF.push(ts); if (++n < 400) requestAnimationFrame(t); };
requestAnimationFrame(t);
window.OYNAT = () => v.play().then(()=> 'ok').catch(e => 'red: ' + e.message);
window.SAR = (t) => new Promise(r => { const s = performance.now(); v.addEventListener('seeked', () => r(performance.now() - s), { once: true }); v.currentTime = t; });
</script>`);

  const srv = await sunucu(KOK, 8931);
  const b = await pt.launch({ executablePath: CHROME, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox', '--disable-gpu-vsync'] });
  const p = await b.newPage();
  await p.setViewport({ width: 800, height: 600 });
  const kons = [];
  p.on('console', m => kons.push(m.text().slice(0, 120)));
  await p.goto('http://127.0.0.1:8931/kapi.html', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1500));

  const a = await p.evaluate(() => ({ hazir: IZ.hazir, rvfc: IZ.rvfc, hata: IZ.hata, sure: document.getElementById('v').duration, kod: document.getElementById('v').videoWidth }));
  const oyn = await p.evaluate(() => OYNAT());
  await new Promise(r => setTimeout(r, 1200));
  const kb = await p.evaluate(() => ({ kare: IZ.kareler.length, ilk: IZ.kareler[0], son: IZ.kareler[IZ.kareler.length - 1], raf: RAF.length }));
  const sar = await p.evaluate(async () => { const a = await SAR(0.6); const b = await SAR(0.2); return [Math.round(a), Math.round(b)]; });
  // gercekten boyaniyor mu: ekran goruntusu bos degil mi
  const png = await p.screenshot({ encoding: 'binary' });
  fs.writeFileSync(path.join(KOK, 'kapi.png'), png);

  console.log(JSON.stringify({ ...a, oynat: oyn, ...kb, sarma_ms: sar, png_bayt: png.length, konsol: kons.slice(0, 5) }, null, 1));
  await b.close(); srv.close();
})().catch(e => { console.error('KAPI HATA:', e.message); process.exit(1); });
