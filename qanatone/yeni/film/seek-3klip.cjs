#!/usr/bin/env node
/* FILM · SEEK DOGRULUGU — Chrome'da HEVC ile H.264 ara kareye sarabiliyor mu?
   Belirti: H.265 hattinda her hizda ~%75 atlama, mobilde tam 154/600 = 1/4
   (mobil GOP 4). Bu "decode yetisemiyor" degil "seek yalniz anahtar kareye
   oturuyor" desenidir. GOP iki kodekte de ayni (ffprobe ile dogrulandi),
   yani fark kodegin Chrome'daki seek davranisinda.
   Test: ayni klibin h264 ve h265 halinde, 0..15 arasi her kareye TEK TEK
   sarilir (`seeked` beklenir), rVFC'nin bildirdigi mediaTime okunur ->
   istenen kare vs SUNULAN kare. Anahtar kareye yapisma varsa tablo gosterir.
   Kullanim: node yeni/film/seek-test.cjs  ·  cikti: film/seek-test.json */
const path = require('path');
const fs = require('fs');
const http = require('http');
const pt = require(path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const KOK = path.join(__dirname, '..');
/* path.resolve SART: cevreden gelen yol egik cizgili olabilir; sunucudaki
   `startsWith(VARLIK)` guvenlik kapisi ayrac uyusmazliginda her istegi 404
   yapar ve belirti "video hic yuklenmedi" olarak gorunur. */
const VARLIK = path.resolve(process.env.VARLIK || path.join(KOK, 'public', 'varlik', 'film'));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8944;
const FPS = 24;
/* KARE SECIMI (31 Agu): GOP 8 oldugu icin anahtar kareler 0,8,16... —
   asil sinav anahtar kareden UZAK kareler (mod 8 = 3,5,7). Liste 0..119
   arasinda sekiz kalintinin HEPSINI tasir; 5 sn'lik en kisa klipte bile
   (121 kare) tamami gecerli. */
const KARELER = [0, 1, 2, 3, 4, 5, 6, 7, 11, 13, 17, 19, 23, 29, 31, 37,
  41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 115, 119];

const SAYFA = (dosya) => `<!doctype html><meta charset=utf-8><video id=v muted playsinline preload=none style="width:640px"></video><script>
const v = document.getElementById('v'); window.__son = null; window.__hazir = false;
v.requestVideoFrameCallback && (function f(now, md) { __son = md.mediaTime; v.requestVideoFrameCallback(f); })(0, { mediaTime: null });
fetch('/${dosya}').then(r => r.blob()).then(b => { v.src = URL.createObjectURL(b); v.addEventListener('loadeddata', () => { __hazir = true; }, { once: true }); v.load(); });
window.__sar = (t) => new Promise((res) => { const bas = performance.now(); v.addEventListener('seeked', () => setTimeout(() => res({ currentTime: v.currentTime, sunulan: __son, ms: Math.round(performance.now() - bas) }), 60), { once: true }); v.currentTime = t; });
</script>`;

function sunucu() {
  return new Promise((res) => {
    const s = http.createServer((req, rp) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      if (u.startsWith('/test/')) { rp.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return rp.end(SAYFA(u.slice(6))); }
      const f = path.join(VARLIK, u.replace(/^\/+/, ''));
      if (!f.startsWith(VARLIK) || !fs.existsSync(f)) { rp.writeHead(404); return rp.end(); }
      rp.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': fs.statSync(f).size });
      fs.createReadStream(f).pipe(rp);
    });
    s.listen(PORT, '127.0.0.1', () => res(s));
  });
}

async function test(dosya) {
  const b = await pt.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.goto(`http://127.0.0.1:${PORT}/test/${dosya}`, { waitUntil: 'load' });
  await p.waitForFunction('window.__hazir', { timeout: 30000 });
  const satir = [];
  for (const k of KARELER) {
    const t = (k + 0.5) / FPS;
    const r = await p.evaluate((t) => __sar(t), t);
    const sunulanKare = r.sunulan == null ? null : Math.round(r.sunulan * FPS);
    satir.push({ istenen: k, currentTime: +r.currentTime.toFixed(4), sunulan_mediaTime: r.sunulan == null ? null : +r.sunulan.toFixed(4), sunulan_kare: sunulanKare, fark: sunulanKare == null ? null : sunulanKare - k, seek_ms: r.ms });
  }
  await b.close();
  return satir;
}

(async () => {
  const srv = await sunucu();
  const cikti = { _: 'yeni/film/seek-test.cjs — kare kare seek dogrulugu, Chrome headless', olcum: new Date().toISOString(), klip: {} };
  const KLIPLER = process.argv.slice(2);
  if (!KLIPLER.length) { console.error('kullanim: node seek-3klip.cjs <klip.mp4> ...'); process.exit(2); }
  for (const d of KLIPLER) {
    process.stdout.write(`${d} ... `);
    const s = await test(d);
    const dogru = s.filter((x) => x.fark === 0).length;
    const yapisma = s.filter((x) => x.fark !== 0).map((x) => `${x.istenen}→${x.sunulan_kare}`);
    cikti.klip[d] = { dogru: `${dogru}/${s.length}`, yapisma, satir: s };
    console.log(`dogru ${dogru}/${s.length}${yapisma.length ? ' · yapisma: ' + yapisma.join(' ') : ''}`);
  }
  srv.close();
  fs.writeFileSync(path.join(__dirname, process.env.CIKTI || 'seek-3klip.json'), JSON.stringify(cikti, null, 1));
  console.log('→ film/seek-3klip.json');
})().catch((e) => { console.error(e); process.exit(1); });
