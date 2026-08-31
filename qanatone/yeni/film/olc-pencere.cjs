#!/usr/bin/env node
/* PENCERE POLITIKASI OLCUMU (1 Eyl 2026, Enes) — once TESHIS.
   Sorular:
     1. Bugunku politika (motor.ts): PENCERE=3 (gecerli +-3 bellekte, yavas
        hatta +-4), ON_PENCERE=2 (+1); atma budaP -> revokeObjectURL ->
        durum 'yok' — atilan blob HICBIR YERE GITMIYOR, geri gelinirse
        fetch ile yeniden iner. Zemin sunuculari no-store; CANLIDA da
        /yeni/varlik/* icin Cache-Control kurali YOK (_headers yalniz
        /varlik/* ve /yeni/_astro/* kapsar) — Netlify varsayilani
        must-revalidate/etag.
     2. Tam turda hangi klip kac kez iniyor? (CDP Network kaydi, tablo)
     3. Takilma zamanlari ile indirme anlari ortusuyor mu?
   Kayitlar: klip basina istek sayisi + bayt + zaman; takilma araliklari
   (hedef sahne 'hazir' degilken gecen sure, olc.cjs tanimiyla ayni);
   bellek tepesi (__fl.bellekMib 500 ms'de bir). Sayfa saati ile CDP
   wallTime, Date.now() koprusuyle eslenir.

   Kullanim:
     SENARYO=ileri|tam|tipik TAVAN=2 HIZ=2 ONBELLEK=0|1 TEKRAR=1 \
       TARAYICI=brave HEADLESS=0 node yeni/film/olc-pencere.cjs
   ONBELLEK=1: sunucu mp4'lere `public, max-age=31536000, immutable` verir
   (HTTP onbellegi adayi); 0 (varsayilan): no-store — bugunku zemin.
   Cikti: yeni/film/olc-pencere.json */
const path = require('path');
const fs = require('fs');
const http = require('http');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const DIST = path.join(__dirname, '..', '..', 'dist');
const CIKTI = path.join(__dirname, 'olc-pencere.json');
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'chrome';
const CHROME = TARAYICILAR[TARAYICI] || TARAYICI;
const HEADLESS = process.env.HEADLESS === '0' ? false : 'new';
const PORT = 8951;
const SENARYO = process.env.SENARYO || 'tam';
const TAVAN = process.env.TAVAN || '2';
const HIZ = Number(process.env.HIZ || 2);          /* kaydirma hizi (film-sn / gercek-sn) */
const ONBELLEK = process.env.ONBELLEK === '1';
const TEKRAR = Number(process.env.TEKRAR || 1);
const AG = process.env.AG || '';
const MOBIL = process.env.MOBIL === '1';   /* 720p hatti: viewport 412x892 */               /* '4g' -> 12 Mbit / 60 ms emulasyonu */
const MIME = { '.mp4': 'video/mp4', '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json' };

function sunucu() {
  return new Promise((res) => {
    const s = http.createServer((req, rp) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      let f = path.join(DIST, u);
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!f.startsWith(DIST) || !fs.existsSync(f)) { rp.writeHead(404); return rp.end('yok'); }
      const st = fs.statSync(f), mime = MIME[path.extname(f)] || 'application/octet-stream';
      const cc = ONBELLEK && f.endsWith('.mp4') ? 'public, max-age=31536000, immutable' : 'no-store';
      const rng = req.headers.range;
      if (rng) {
        const m = /bytes=(\d*)-(\d*)/.exec(rng), a = m[1] ? +m[1] : 0, b = m[2] ? +m[2] : st.size - 1;
        rp.writeHead(206, { 'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1, 'Cache-Control': cc });
        fs.createReadStream(f, { start: a, end: b }).pipe(rp);
      } else {
        rp.writeHead(200, { 'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Content-Length': st.size, 'Cache-Control': cc });
        fs.createReadStream(f).pipe(rp);
      }
    });
    s.listen(PORT, '127.0.0.1', () => res(s));
  });
}

/* surucu: T0 -> T1 filmi HIZ katiyla scrollTo; takilma = hedef sahnenin
   'hazir' olmadigi araliklar (olc.cjs tanimi), zaman damgali */
const SURUCU = `
window.SUPUR = (T0, T1, hiz) => new Promise((res) => {
  const F = window.__fl;
  const ms = Math.abs(T1 - T0) / hiz * 1000;
  const t0 = performance.now();
  const takilma = []; let tak = null;
  const bellek = [];
  let sonBellek = 0;
  const ad = () => {
    const now = performance.now();
    const u = Math.min(1, (now - t0) / ms);
    scrollTo(0, Math.round(F.konum(T0 + (T1 - T0) * u)));
    const n = F.hedef();
    const s = F.sahne()[n - 1];
    const hazir = s && s.durum === 'hazir';
    if (!hazir && !tak) tak = { sahne: n, bas: now };
    if (hazir && tak) { tak.ms = Math.round(now - tak.bas); takilma.push(tak); tak = null; }
    if (now - sonBellek > 500) { sonBellek = now; bellek.push([Math.round(now), F.bellekMib()]); }
    if (u < 1) requestAnimationFrame(ad);
    else { if (tak) { tak.ms = Math.round(now - tak.bas); takilma.push(tak); } res({ takilma, bellek, basMs: t0, sonMs: now }); }
  };
  requestAnimationFrame(ad);
});
window.SAAT = () => ({ perf: performance.now(), epoch: Date.now() });`;

const medyan = (a) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };

async function kos() {
  const b = await pt.launch({ executablePath: CHROME, headless: HEADLESS, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist', ...(HEADLESS ? [] : ['--window-size=1460,1000'])] });
  const p = await b.newPage();
  await p.setViewport(MOBIL ? { width: 412, height: 892, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
  const cdp = await p.createCDPSession();
  await cdp.send('Network.enable');
  if (AG === '4g') await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: 12e6 / 8, uploadThroughput: 3e6 / 8 });
  /* mp4 istek kaydi: responseReceived (wallTime + fromDiskCache) +
     loadingFinished (encodedDataLength) requestId ile eslenir */
  const istekler = new Map();
  cdp.on('Network.responseReceived', (e) => {
    if (!/\.mp4$/.test(e.response.url.split('?')[0])) return;
    istekler.set(e.requestId, { url: e.response.url.replace(/^.*\/varlik\/film\//, ''), wall: e.response.responseTime || (e.wallTime * 1000), diskten: !!e.response.fromDiskCache, bayt: 0 });
  });
  cdp.on('Network.loadingFinished', (e) => { const r = istekler.get(e.requestId); if (r) r.bayt = e.encodedDataLength; });
  await p.evaluateOnNewDocument(SURUCU);
  await p.goto(`http://127.0.0.1:${PORT}/yeni/film/?tavan=${TAVAN}&akis=0`, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction('window.__fl && __fl.hazir', { timeout: 180000 });
  const saat = await p.evaluate(() => SAAT());          /* perf <-> epoch koprusu */

  const toplam = await p.evaluate(() => __fl.toplam);
  const bacaklar = [];
  const sur = async (T0, T1) => { bacaklar.push(await p.evaluate((a, b2, h) => SUPUR(a, b2, h), T0, T1, HIZ)); };
  if (SENARYO === 'ileri' || SENARYO === 'tipik') await sur(0, toplam - 0.1);
  else if (SENARYO === 'tam') { await sur(0, toplam - 0.1); await sur(toplam - 0.1, 0); }
  await new Promise((r) => setTimeout(r, 1500));        /* kuyruktaki indirmeler bitsin */

  const oz = await p.evaluate(() => ({ birakilan: __fl.birakilan, pencere: __fl.pencere, onPencere: __fl.onPencere, mbit: __fl.mbit, tavan: __fl.tavan }));
  await b.close();

  /* --- tablo: klip basina istek --- */
  const tablo = {};
  let toplamB = 0, agdanB = 0;
  const olaylar = [];
  for (const r of istekler.values()) {
    const ad = r.url;
    tablo[ad] = tablo[ad] || { n: 0, bayt: 0, diskten: 0 };
    tablo[ad].n++; tablo[ad].bayt += r.bayt;
    if (r.diskten) tablo[ad].diskten++;
    toplamB += r.bayt; if (!r.diskten) agdanB += r.bayt;
    /* sayfa saatine cevir: perf = wall - (epoch - perf0) */
    olaylar.push({ klip: ad, perfMs: Math.round(r.wall - (saat.epoch - saat.perf)), bayt: r.bayt, diskten: r.diskten });
  }
  olaylar.sort((a, b2) => a.perfMs - b2.perfMs);
  const cokInen = Object.entries(tablo).filter(([, v]) => v.n > 1)
    .map(([k, v]) => ({ klip: k, istek: v.n, bayt_mib: +(v.bayt / 1048576).toFixed(1) }))
    .sort((a, b2) => b2.bayt_mib - a.bayt_mib);
  const takilmalar = bacaklar.flatMap((x, bi) => x.takilma.map((t) => ({ bacak: bi, ...t, bas: Math.round(t.bas) })));
  /* ortusme: her takilma icin ayni sahnenin klibinin indirme baslangicina uzaklik */
  const ortusme = takilmalar.map((t) => {
    const yakin = olaylar.filter((o) => Math.abs(o.perfMs - t.bas) < 4000).map((o) => ({ klip: o.klip, dt: o.perfMs - t.bas, diskten: o.diskten }));
    return { sahne: t.sahne, bas: t.bas, ms: t.ms, yakin_indirmeler: yakin.slice(0, 4) };
  });
  const bellekTepe = Math.max(0, ...bacaklar.flatMap((x) => x.bellek.map(([, m]) => m)));
  return {
    senaryo: SENARYO, tavan: oz.tavan, hiz: HIZ, onbellek: ONBELLEK, ag: AG || 'yerel', hat: MOBIL ? 'mobil-720p' : 'masaustu-1080p',
    toplam_istek: [...istekler.values()].length,
    inen_mib: +(toplamB / 1048576).toFixed(1), agdan_mib: +(agdanB / 1048576).toFixed(1),
    birakilan: oz.birakilan, pencere: oz.pencere, on_pencere: oz.onPencere, mbit: oz.mbit,
    bellek_tepe_mib: bellekTepe,
    takilma: { adet: takilmalar.length, toplam_ms: takilmalar.reduce((a, t) => a + t.ms, 0), liste: takilmalar },
    cok_inen: cokInen, tablo, ortusme,
  };
}

(async () => {
  const srv = await sunucu();
  const S = { _: 'yeni/film/olc-pencere.cjs — pencere politikasi teshisi/olcumu', olcum: new Date().toISOString(), tarayici: TARAYICI, senaryo: SENARYO, hiz: HIZ, onbellek: ONBELLEK, kosum: [] };
  for (let i = 0; i < TEKRAR; i++) {
    const r = await kos();
    S.kosum.push(r);
    console.log(`#${i + 1} ${r.senaryo} tavan=${r.tavan} hiz=${HIZ}x onbellek=${ONBELLEK ? 'immutable' : 'no-store'} ag=${AG || 'yerel'}`);
    console.log(`  istek ${r.toplam_istek} · inen ${r.inen_mib} MiB (agdan ${r.agdan_mib}) · birakilan ${r.birakilan} · bellek tepe ${r.bellek_tepe_mib} MiB`);
    console.log(`  takilma ${r.takilma.adet} adet · ${r.takilma.toplam_ms} ms toplam`);
    console.log(`  birden cok inen klip: ${r.cok_inen.length} — ilk 8: ${r.cok_inen.slice(0, 8).map((x) => `${x.klip}(${x.istek}x ${x.bayt_mib}M)`).join(' ')}`);
  }
  if (TEKRAR > 1) console.log(`medyanlar: inen ${medyan(S.kosum.map((k) => k.inen_mib))} MiB · takilma ${medyan(S.kosum.map((k) => k.takilma.adet))} · bellek ${medyan(S.kosum.map((k) => k.bellek_tepe_mib))} MiB`);
  srv.close();
  fs.writeFileSync(CIKTI, JSON.stringify(S, null, 1));
  console.log(`→ ${CIKTI}`);
})().catch((e) => { console.error(e); process.exit(1); });
