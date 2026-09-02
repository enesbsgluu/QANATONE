#!/usr/bin/env node
/* TIPOGRAFI/BOSLUK KUNYE OLCUMU (sadakat turu, 3 Eyl 2026)
   Iki sayfada karsilik gelen ogelerin HESAPLANMIS stilini yan yana basar:
   font-size, weight, line-height, letter-spacing, color, padding, margin,
   border, background. Sadakat kurali: sapma goz karariyla degil sayiyla
   yazilir; buradaki sayilar yeni bilesenin kunyesine gider.
   Kullanim:
     MSYS_NO_PATHCONV=1 ONCE=http://127.0.0.1:8888/ SONRA=http://127.0.0.1:8888/yeni/ \
       CIFTLER="#projeler .shead .mono|.sp-sahne .sp-etiket;#projeler h2|.sp-sahne h2" node yeni/film/olc-tipografi.cjs
     CIFTLER: `eskiSecici|yeniSecici` cifleri `;` ile; tek secici verilirse iki tarafta ayni.
   Cevre: GENISLIK (1440) · TARAYICI=brave|chrome */
const path = require('path');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const ONCE = process.env.ONCE || 'http://127.0.0.1:8888/';
const SONRA = process.env.SONRA || 'http://127.0.0.1:8888/yeni/';
const GENISLIK = +(process.env.GENISLIK || 1440);
const CIFTLER = (process.env.CIFTLER || '').split(';').map((s) => s.trim()).filter(Boolean)
  .map((c) => { const [a, b] = c.split('|'); return [a.trim(), (b || a).trim()]; });
if (!CIFTLER.length) { console.error('CIFTLER ver'); process.exit(1); }
const OZ = ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'color', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom', 'borderTopWidth', 'borderTopColor', 'borderRadius', 'backgroundColor', 'maxWidth', 'gap'];

(async () => {
  const b = await pt.launch({ executablePath: TARAYICILAR[process.env.TARAYICI || 'brave'], headless: 'new', args: ['--no-sandbox'] });
  const oku = async (url, secici) => {
    const p = await b.newPage();
    await p.setCacheEnabled(false);
    await p.setViewport({ width: GENISLIK, height: 900 });
    await p.evaluateOnNewDocument(() => { try { sessionStorage.setItem('qanat-splash-seen', '1'); } catch (e) {} });
    await p.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await p.evaluate(() => document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true);
    const r = await p.evaluate((secs, OZ) => secs.map((s) => {
      const e = document.querySelector(s); if (!e) return null;
      const c = getComputedStyle(e), rc = e.getBoundingClientRect();
      const o = { secici: s, w: Math.round(rc.width), h: Math.round(rc.height), metin: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28) };
      for (const k of OZ) o[k] = c[k];
      return o;
    }), secici, OZ);
    await p.close();
    return r;
  };
  const A = await oku(ONCE, CIFTLER.map((c) => c[0]));
  const B = await oku(SONRA, CIFTLER.map((c) => c[1]));
  await b.close();
  const kisa = (v) => String(v).replace(/rgba?\(/, '').replace(/\)$/, '').replace(/, /g, ',');
  for (let i = 0; i < CIFTLER.length; i++) {
    const a = A[i], s = B[i];
    console.log(`\n== ${CIFTLER[i][0]}  <->  ${CIFTLER[i][1]}`);
    if (!a || !s) { console.log(`  ${!a ? 'ESKIDE YOK' : ''} ${!s ? 'YENIDE YOK' : ''}`); continue; }
    console.log(`  metin      ${a.metin.padEnd(30)} ${s.metin}`);
    console.log(`  kutu       ${(a.w + 'x' + a.h).padEnd(30)} ${s.w}x${s.h}`);
    for (const k of OZ) {
      const av = kisa(a[k]), sv = kisa(s[k]);
      if (av === sv) continue;
      console.log(`  ${k.padEnd(10)} ${av.padEnd(30)} ${sv}   <- FARK`);
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
