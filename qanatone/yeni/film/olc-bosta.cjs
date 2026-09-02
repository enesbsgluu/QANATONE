#!/usr/bin/env node
/* BOSTA MALIYET (GECE ZINCIRI TUR 4, 2 Eyl 2026).
   Soru: sayfa dururken (kaydirma yok, etkilesim yok) ana is parcacigi ne
   yapiyor? Yontem: CDP Tracing (devtools.timeline), yuklemeden 2 s sonra
   2 s iz: UpdateLayoutTree / Layout / Paint / Animation olay sayisi ve
   toplam suresi; iki konum: tepe (scroll 0) ve KONUM px (ornegin motor
   sahnesi kadrajda).
   Kullanim: SAYFA=/yeni/hizmet/finans/ KONUM=2600 node yeni/film/olc-bosta.cjs */
const path = require('path');
const pt = require(process.env.PUPPETEER_CORE || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const CHROME = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
const SAYFA = process.env.SAYFA || '/yeni/hizmet/finans/';
const KONUM = +(process.env.KONUM || 0);
const IZ = +(process.env.IZ || 2000);
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
async function iz(page, cdp, etiket) {
  const olay = [];
  cdp.on('Tracing.dataCollected', (e) => olay.push(...e.value));
  await cdp.send('Tracing.start', { categories: 'disabled-by-default-devtools.timeline,devtools.timeline', transferMode: 'ReportEvents' });
  await bekle(IZ);
  const bitti = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end'); await bitti;
  const top = {};
  for (const e of olay) {
    if (!/^(UpdateLayoutTree|Layout|Paint|Animation|UpdateLayerTree|PrePaint|HitTest|FunctionCall|RunTask)$/.test(e.name) || e.ph !== 'X') continue;
    const k = e.name; top[k] = top[k] || { n: 0, ms: 0 }; top[k].n++; top[k].ms += (e.dur || 0) / 1000;
  }
  const s = Object.entries(top).map(([k, v]) => `${k} ${v.n}x/${(v.ms / (IZ / 1000)).toFixed(1)} ms/sn`).join(' · ');
  console.log(`${etiket.padEnd(22)} ${s || '(olay yok)'}`);
  cdp.removeAllListeners('Tracing.dataCollected');
}
(async () => {
  const browser = await pt.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1460,980', '--no-first-run'], defaultViewport: null, protocolTimeout: 120000 });
  const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem('qanat-splash-seen', '1'); } catch (e) {} });
  const cdp = await page.target().createCDPSession();
  await page.goto(SUNUCU + SAYFA, { waitUntil: 'load', timeout: 60000 }); await bekle(2000);
  console.log(SAYFA);
  await iz(page, cdp, '  tepe (scroll 0)');
  if (KONUM) { await page.evaluate((y) => window.scrollTo(0, y), KONUM); await bekle(1500); await iz(page, cdp, `  konum ${KONUM} px`); }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
