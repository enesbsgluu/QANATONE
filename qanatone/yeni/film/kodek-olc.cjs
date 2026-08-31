#!/usr/bin/env node
/* FILM · KODEK DECODE OLCUMU — uc kodek ayni savurmayla, GERCEK Chrome'da.
   Ana olcum duzeneginin (olc.cjs) mekanigi birebir: klip Blob olarak
   indirilir (seek aga gitmez), savurma tek rAF'ta tek `currentTime`
   yazimina iner, "sunulan kare" rVFC'den okunur — tahmin yok.
   Fark: burada TEK KLIP var, sahne zinciri/pencere/devralma yok; olculen
   sey yalnizca KODEK DECODE MALIYETI.

   Her kodek TAZE tarayicida, tek basina, TEKRAR kez kosar; medyan alinir.
   Once `video.canPlayType` ile destek sorulur — desteklenmeyen kodek
   "DESTEKLENMIYOR" diye raporlanir, sifir sayiyla degil.

   Savurma: klibin tamami W/3,3 sn'de gecilir (ana olcumdeki `sert` ile
   ayni oran). Butce 16,7 ms (60 Hz).
   Kullanim: node yeni/film/kodek-olc.cjs
   Cikti: film/kodek-olcum.json */
const path = require('path');
const fs = require('fs');
const http = require('http');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const KOK = path.join(__dirname, '..');
const VARLIK = path.join(KOK, 'public', 'varlik', 'film');
const DENEME = JSON.parse(fs.readFileSync(path.join(__dirname, 'kodek-deneme.json'), 'utf8'));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8943;
const TEKRAR = Number(process.env.TEKRAR || 3);
const SURE = DENEME.klip.sure;
const KARE = DENEME.klip.kare;
const FPS = 24;

/* --- sunucu: yalniz kodek klipleri --- */
function sunucu() {
  return new Promise((res) => {
    const s = http.createServer((req, rp) => {
      const [yol, sorgu] = req.url.split('?');
      const u = decodeURIComponent(yol);
      /* test sayfasi AYNI ORIGIN'den servis edilir: klip fetch'i boylece
         ayni kaynak olur (setContent ile about:blank origin'i CORS'a takiliyordu) */
      if (u === '/test') {
        const q = new URLSearchParams(sorgu || '');
        const html = SAYFA('/' + q.get('dosya'), q.get('mime'));
        rp.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return rp.end(html);
      }
      const f = path.join(VARLIK, u.replace(/^\/+/, ''));
      if (!f.startsWith(VARLIK) || !fs.existsSync(f)) { rp.writeHead(404); return rp.end('yok'); }
      const st = fs.statSync(f);
      rp.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': st.size, 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(rp);
    });
    s.listen(PORT, '127.0.0.1', () => res(s));
  });
}

const yuzde = (a, p) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return +b[Math.min(b.length - 1, Math.floor(p * b.length))].toFixed(2); };
const medyan = (a) => { const f = a.filter((x) => x != null); if (!f.length) return null; const s = [...f].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : +((s[s.length / 2 - 1] + s[s.length / 2]) / 2).toFixed(2); };

const SAYFA = (url, mime) => `<!doctype html><meta charset=utf-8><style>
html,body{margin:0;background:#000;height:100%}video{width:100vw;height:100vh;object-fit:cover}</style>
<video id=v muted playsinline preload=none></video><script>
window.__k = { destek: null, hazir: false, ilkKareMs: null, sunum: [], bayt: 0, hata: null };
const t0 = performance.now();
const v = document.getElementById('v');
__k.destek = v.canPlayType(${JSON.stringify(mime)}) || 'no';
window.__yukle = async () => {
  try {
    const r = await fetch(${JSON.stringify(url)});
    const b = await r.blob();
    __k.bayt = b.size;
    const u = URL.createObjectURL(b);
    if (v.requestVideoFrameCallback) {
      const f = (now, md) => {
        if (__k.ilkKareMs === null) __k.ilkKareMs = Math.round(now - t0);
        __k.sunum.push({ t: now, kare: Math.round(md.mediaTime * ${FPS}) });
        v.requestVideoFrameCallback(f);
      };
      v.requestVideoFrameCallback(f);
    }
    await new Promise((res, rej) => {
      const z = setTimeout(() => rej(new Error('loadeddata zaman asimi')), 30000);
      v.addEventListener('loadeddata', () => { clearTimeout(z); res(); }, { once: true });
      v.addEventListener('error', () => { clearTimeout(z); rej(new Error('decode error ' + (v.error && v.error.code))); }, { once: true });
      v.src = u; v.load();
    });
    await new Promise((res) => { if (Math.abs(v.currentTime) < 0.02) return res(); v.addEventListener('seeked', () => res(), { once: true }); v.currentTime = 0; });
    __k.hazir = true;
  } catch (e) { __k.hata = String(e); }
};
/* savurma: 0 -> SURE, ms surede; ana olcumdeki gibi tek rAF'ta tek yazim */
window.__supur = (sure, ms) => new Promise((res) => {
  const b0 = performance.now(); const raf = []; const istek = [];
  __k.sunum.length = 0;
  const ad = () => {
    const now = performance.now(); raf.push(now);
    const u = Math.min(1, (now - b0) / ms);
    const k = Math.min(${KARE - 1}, Math.max(0, Math.floor(u * sure * ${FPS})));
    const hedef = (k + 0.5) / ${FPS};
    if (Math.abs(v.currentTime - hedef) > 0.5 / ${FPS}) v.currentTime = hedef;
    istek.push(k);
    if (u < 1) requestAnimationFrame(ad); else res({ raf, istek });
  };
  requestAnimationFrame(ad);
});
</script>`;

async function kos(aday, tur) {
  const b = await pt.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  const test = `http://127.0.0.1:${PORT}/test?dosya=${encodeURIComponent(aday.dosya)}&mime=${encodeURIComponent(aday.mime)}`;
  await p.goto(test, { waitUntil: 'load', timeout: 30000 });
  const destek = await p.evaluate(() => __k.destek);
  if (!destek || destek === 'no') { await b.close(); return { destek: destek || 'no', desteklenmiyor: true }; }
  await p.evaluate(() => __yukle());
  await p.waitForFunction('window.__k.hazir || window.__k.hata', { timeout: 60000 }).catch(() => {});
  const hata = await p.evaluate(() => __k.hata);
  if (hata) { await b.close(); return { destek, hata }; }
  const ilk = await p.evaluate(() => ({ ilkKareMs: __k.ilkKareMs, bayt: __k.bayt }));
  const r = await p.evaluate((s, ms) => __supur(s, ms), SURE, (SURE / 3.3) * 1000);
  await new Promise((x) => setTimeout(x, 250));
  const g = await p.evaluate(() => ({ sunum: __k.sunum.slice() }));
  await b.close();

  const arali = []; for (let i = 1; i < r.raf.length; i++) arali.push(r.raf[i] - r.raf[i - 1]);
  const istekK = new Set(r.istek), sunumK = new Set(g.sunum.map((x) => x.kare));
  let kesisim = 0; for (const k of istekK) if (sunumK.has(k)) kesisim++;
  let maxBosluk = 0;
  for (let i = 1; i < g.sunum.length; i++) maxBosluk = Math.max(maxBosluk, Math.abs(g.sunum[i].kare - g.sunum[i - 1].kare));
  return {
    destek, tur,
    ilk_kare_ms: ilk.ilkKareMs, bayt: ilk.bayt,
    atlama_yuzde: istekK.size ? +(100 * (1 - kesisim / istekK.size)).toFixed(1) : null,
    istenen: istekK.size, sunulan: sunumK.size, max_bosluk_kare: maxBosluk,
    kare_p50: yuzde(arali, 0.5), kare_p95: yuzde(arali, 0.95), kare_max: +Math.max(...arali).toFixed(2),
    butce_asan_yuzde: +(100 * arali.filter((x) => x > 16.7).length / arali.length).toFixed(1),
  };
}

(async () => {
  const srv = await sunucu();
  const hepsi = [];
  for (const aday of DENEME.aday) {
    if (aday.hata) { hepsi.push({ ad: aday.ad, etiket: aday.etiket, encode_hatasi: aday.hata }); continue; }
    const turlar = [];
    for (let t = 0; t < TEKRAR; t++) {
      process.stdout.write(`>> ${aday.ad} #${t + 1} ... `);
      try { const r = await kos(aday, t); turlar.push(r); console.log(r.desteklenmiyor ? 'DESTEKLENMIYOR' : (r.hata ? 'HATA ' + r.hata : `p95 ${r.kare_p95} ms · atlama ${r.atlama_yuzde}%`)); }
      catch (e) { console.log('HATA ' + e.message); }
    }
    const iyi = turlar.filter((x) => !x.desteklenmiyor && !x.hata);
    hepsi.push({
      ad: aday.ad, etiket: aday.etiket, mib: aday.mib, mime: aday.mime,
      destek: turlar[0] && turlar[0].destek,
      desteklenmiyor: turlar.length > 0 && turlar.every((x) => x.desteklenmiyor),
      hata: iyi.length ? null : (turlar.find((x) => x.hata) || {}).hata || null,
      ilk_kare_ms: medyan(iyi.map((x) => x.ilk_kare_ms)),
      atlama_yuzde: medyan(iyi.map((x) => x.atlama_yuzde)),
      max_bosluk_kare: medyan(iyi.map((x) => x.max_bosluk_kare)),
      kare_p50: medyan(iyi.map((x) => x.kare_p50)),
      kare_p95: medyan(iyi.map((x) => x.kare_p95)),
      kare_max: medyan(iyi.map((x) => x.kare_max)),
      butce_asan_yuzde: medyan(iyi.map((x) => x.butce_asan_yuzde)),
      tekrar: iyi.length,
    });
  }
  srv.close();
  fs.writeFileSync(path.join(__dirname, 'kodek-olcum.json'), JSON.stringify({
    _: 'yeni/film/kodek-olc.cjs — TEK KLIP decode maliyeti, gercek Chrome, ' + TEKRAR + ' tekrar medyani. Butce 16,7 ms (60 Hz).',
    olcum: new Date().toISOString(), klip: DENEME.klip, savurma: `${SURE} sn film / ${(SURE / 3.3).toFixed(1)} sn (3,3x)`,
    aday: hepsi,
  }, null, 1));

  console.log('\n| kodek | boyut | canPlayType | ilk kare | atlama % | max boşluk | kare p50 | **kare p95** | kare max | 16,7 ms aşan % |');
  console.log('|---|---:|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const x of hepsi) {
    if (x.desteklenmiyor) { console.log(`| ${x.etiket} | ${x.mib} MiB | **DESTEKLENMİYOR** | — | — | — | — | — | — | — |`); continue; }
    if (x.hata) { console.log(`| ${x.etiket} | ${x.mib} MiB | ${x.destek} | HATA: ${String(x.hata).slice(0, 40)} | | | | | | |`); continue; }
    console.log(`| ${x.etiket} | ${x.mib} MiB | ${x.destek} | ${x.ilk_kare_ms} ms | ${x.atlama_yuzde} | ${x.max_bosluk_kare} | ${x.kare_p50} ms | **${x.kare_p95} ms** | ${x.kare_max} ms | ${x.butce_asan_yuzde} |`);
  }
  console.log('→ film/kodek-olcum.json');
})().catch((e) => { console.error('HATA', e); process.exit(1); });
