#!/usr/bin/env node
/* ORTAK VARLIK AYRISTIRMA OLCUMU (GECE ZINCIRI TUR 3, 2 Eyl 2026).
   Kapi: satir ici oran once/sonra sayfa sayfa · ikinci sayfa ziyaretinde
   inen bayt once/sonra · LCP once/sonra (ana + bir hizmet sayfasi) ·
   gzip HTML.
   1) STATIK: dist/yeni her sayfa — HTML bayt, satir ici <style> ve
      <script> bayti, oran; gzip HTML; dis CSS/JS dosyalari ve boyutlari.
   2) IKINCI SAYFA: ayni sekmede A -> B gezinmesi; B icin agdan inen bayt
      (CDP Network: encodedDataLength, onbellekten gelenler 0) — uc cift.
   3) LCP (4G benzeri kisit: 40 ms gecikme, 10 Mbit; CDP emulate): ana sayfa
      ve /hizmet/finans, 3 kosum medyani, soguk onbellek (her kosum yeni
      baglam).
   Kullanim: node yeni/film/olc-varlik.cjs   (once: node yerel-sun.cjs)
   Cevre  : CIKTI=dosya · ETIKET=once|sonra */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const DIST = path.join(__dirname, '..', '..', 'dist', 'yeni');
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-varlik.json');
const CHROME = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/* 1) statik */
const sayfalar = [];
(function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(_astro|font|img|varlik)$/.test(e.name)) gez(p); }
    else if (e.name === 'index.html') sayfalar.push(p);
  }
})(DIST);
const statik = sayfalar.sort().map((p) => {
  const h = fs.readFileSync(p, 'utf8');
  const stil = [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].reduce((a, m) => a + Buffer.byteLength(m[1]), 0);
  const betik = [...h.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)].filter((m) => !/ld\+json/.test(m[1])).reduce((a, m) => a + Buffer.byteLength(m[2]), 0);
  const dis = [...h.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]).concat([...h.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]));
  const disBayt = dis.reduce((a, u) => { const d = path.join(DIST, u.replace(/^\/yeni\//, '')); return a + (fs.existsSync(d) ? fs.statSync(d).size : 0); }, 0);
  const html = Buffer.byteLength(h);
  return { yol: '/yeni/' + path.relative(DIST, p).replace(/\\/g, '/').replace(/index\.html$/, ''), html, gzip: zlib.gzipSync(h).length, satirIci: stil + betik, oran: +((stil + betik) / html).toFixed(3), dis: dis.length, disBayt };
});
const ort = (k) => +(statik.reduce((a, s) => a + s[k], 0) / statik.length).toFixed(3);
console.log(`STATIK: ${statik.length} sayfa · satir ici oran ort ${ort('oran')} · HTML ort ${Math.round(ort('html'))} B · gzip ort ${Math.round(ort('gzip'))} B · dis dosya ort ${ort('dis')}`);
for (const y of ['/yeni/', '/yeni/hizmetler/', '/yeni/hizmetler/finans/', '/yeni/otomasyon/', '/yeni/sss/']) { const s = statik.find((x) => x.yol === y); if (s) console.log(`  ${y.padEnd(24)} HTML ${s.html} · gzip ${s.gzip} · satir ici ${s.satirIci} (${(s.oran * 100).toFixed(1)}%) · dis ${s.dis} dosya ${s.disBayt} B`); }

(async () => {
  const browser = await pt.launch({ executablePath: CHROME, headless: true, args: ['--window-size=1460,980'], defaultViewport: null, protocolTimeout: 300000 });
  /* 2) ikinci sayfa baytlari */
  const ciftler = [['/yeni/', '/yeni/hizmetler/'], ['/yeni/hizmetler/', '/yeni/hizmet/seo/'], ['/yeni/sss/', '/yeni/surec/']];
  const ikinci = [];
  for (const [a, b] of ciftler) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage(); await page.setViewport({ width: 1440, height: 900 });
    const cdp = await page.target().createCDPSession(); await cdp.send('Network.enable');
    let say = false, bayt = 0, istek = 0, onbellek = 0;
    cdp.on('Network.loadingFinished', (e) => { if (say) { bayt += e.encodedDataLength || 0; istek++; } });
    cdp.on('Network.requestServedFromCache', () => { if (say) onbellek++; });
    await page.goto(SUNUCU + a, { waitUntil: 'networkidle0', timeout: 60000 }); await bekle(500);
    say = true;
    await page.goto(SUNUCU + b, { waitUntil: 'networkidle0', timeout: 60000 }); await bekle(500);
    say = false;
    ikinci.push({ a, b, bayt, istek, onbellek });
    console.log(`IKINCI SAYFA ${a} -> ${b}: agdan ${bayt} B · ${istek} istek · onbellekten ${onbellek}`);
    await ctx.close();
  }
  /* 3) LCP 4G kisitli, soguk */
  const lcp = {};
  for (const yol of ['/yeni/', '/yeni/hizmetler/finans/']) {
    const olc = [];
    for (let i = 0; i < 3; i++) {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage(); await page.setViewport({ width: 1440, height: 900 });
      await page.evaluateOnNewDocument(() => { window.__lcp = null; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {} });
      const cdp = await page.target().createCDPSession(); await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 10 * 1024 * 1024 / 8, uploadThroughput: 5 * 1024 * 1024 / 8 });
      await page.goto(SUNUCU + yol, { waitUntil: 'load', timeout: 60000 }); await bekle(1500);
      olc.push(Math.round(await page.evaluate(() => window.__lcp || 0)));
      await ctx.close();
    }
    lcp[yol] = { kosum: olc, medyan: medyan(olc) };
    console.log(`LCP (4G, soguk) ${yol}: ${olc.join('/')} → ${medyan(olc)} ms`);
  }
  await browser.close();
  fs.writeFileSync(CIKTI, JSON.stringify({ _: 'yeni/film/olc-varlik.cjs — satir ici oran / ikinci sayfa bayti / LCP(4G) — ortak varlik ayristirma once/sonra', etiket: process.env.ETIKET || '', olcum: new Date().toISOString(), ozet: { sayfa: statik.length, oranOrt: ort('oran'), htmlOrt: Math.round(ort('html')), gzipOrt: Math.round(ort('gzip')), disOrt: ort('dis') }, statik, ikinci, lcp }, null, 1));
  console.log(`→ ${CIKTI}`);
})().catch((e) => { console.error(e); process.exit(1); });
