#!/usr/bin/env node
/* KARE HIZI TURU · SEEK DOGRULUGU (1 Eyl 2026) — seek-3klip.cjs'in fps'li
   turevi. Dusuk fps + uzun GOP seek davranisini degistirebilir (kapi:
   "her adayda kare dogru seek korunuyor"); her aday KENDI fps'i ve GOP
   kalintilarini kapsayan listeyle sinanir.
   KIRMIZI ONCE: 12 fps klibe BILEREK 24 fps zaman listesiyle sarilir —
   istenen karelerin yarisi klipte yok, duzenek farki YAKALAMALI;
   yakalamazsa yesiline guvenilmez.
   Kullanim:
     node yeni/film/karehizi-seek.cjs            (kirmizi + iki aday + referans)
   Cikti: yeni/film/karehizi-seek.json */
const path = require('path');
const fs = require('fs');
const http = require('http');
const pt = require(path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const CHROME = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const PORT = 8953;
const KOKD = path.join(__dirname, 'karehizi');
const REFD = path.join(__dirname, '..', 'public', 'varlik', 'film');

const KARELER12 = [0, 1, 2, 3, 4, 5, 6, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55, 57, 59];
const KARELER24 = [0, 1, 2, 3, 5, 7, 9, 11, 13, 15, 17, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59, 63, 67, 71, 79, 87, 95, 103, 111, 119];

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
      const f = path.resolve(u.startsWith('/ref/') ? path.join(REFD, u.slice(5)) : path.join(KOKD, u.replace(/^\/+/, '')));
      if (!fs.existsSync(f)) { rp.writeHead(404); return rp.end(); }
      rp.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': fs.statSync(f).size });
      fs.createReadStream(f).pipe(rp);
    });
    s.listen(PORT, '127.0.0.1', () => res(s));
  });
}

async function test(p, dosya, fps, kareler) {
  await p.goto(`http://127.0.0.1:${PORT}/test/${dosya}`, { waitUntil: 'load' });
  await p.waitForFunction('window.__hazir', { timeout: 60000 });
  const satir = [];
  for (const k of kareler) {
    const t = (k + 0.5) / fps;
    const r = await p.evaluate((tt) => __sar(tt), t);
    const sk = r.sunulan == null ? null : Math.round(r.sunulan * fps);
    satir.push({ istenen: k, sunulan: sk, fark: sk == null ? null : sk - k, ms: r.ms });
  }
  const dogru = satir.filter((x) => x.fark === 0).length;
  const msler = satir.map((x) => x.ms).sort((a, b) => a - b);
  return { dogru: `${dogru}/${satir.length}`, tam: dogru === satir.length,
    seek_ms_medyan: msler[Math.floor(msler.length / 2)], seek_ms_p95: msler[Math.floor(msler.length * 0.95)],
    yapisma: satir.filter((x) => x.fark !== 0).map((x) => `${x.istenen}→${x.sunulan}`).slice(0, 10) };
}

(async () => {
  const srv = await sunucu();
  const b = await pt.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  const S = { _: 'yeni/film/karehizi-seek.cjs — aday setlerde kare dogru seek; kirmizi once', olcum: new Date().toISOString(), sonuc: {} };

  /* KIRMIZI: 12 fps klibi 24 fps listesiyle sina — yakalanmali */
  const kirmizi = await test(p, 'set-12g8/sahne34.mp4', 24, KARELER24);
  S.kirmizi = { ...kirmizi, yakalandi: !kirmizi.tam };
  console.log(`KIRMIZI (12fps klibe 24fps liste): dogru ${kirmizi.dogru} — ${S.kirmizi.yakalandi ? 'YAKALANDI (beklenen)' : 'YAKALANAMADI!'}`);

  const isler = [
    ['referans 24-g8', 'ref/sahne34.mp4', 24, KARELER24], ['referans 24-g8 s3', 'ref/sahne3.mp4', 24, KARELER24],
    ['24g16 s34', 'set-24g16/sahne34.mp4', 24, KARELER24], ['24g16 s3', 'set-24g16/sahne3.mp4', 24, KARELER24], ['24g16 s16', 'set-24g16/sahne16.mp4', 24, KARELER24],
    ['12g8 s34', 'set-12g8/sahne34.mp4', 12, KARELER12], ['12g8 s3', 'set-12g8/sahne3.mp4', 12, KARELER12], ['12g8 s16', 'set-12g8/sahne16.mp4', 12, KARELER12],
  ];
  for (const [ad, dosya, fps, kareler] of isler) {
    const r = await test(p, dosya, fps, kareler);
    S.sonuc[ad] = r;
    console.log(`${ad}: dogru ${r.dogru} · seek medyan ${r.seek_ms_medyan} ms · p95 ${r.seek_ms_p95} ms${r.yapisma.length ? ' · yapisma ' + r.yapisma.join(' ') : ''}`);
  }
  await b.close(); srv.close();
  S.hukum = S.kirmizi.yakalandi && Object.values(S.sonuc).every((x) => x.tam) ? 'GECTI' : 'KALDI';
  fs.writeFileSync(path.join(__dirname, 'karehizi-seek.json'), JSON.stringify(S, null, 1));
  console.log(`=> ${S.hukum}\n→ yeni/film/karehizi-seek.json`);
})().catch((e) => { console.error(e); process.exit(1); });
