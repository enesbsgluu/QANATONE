#!/usr/bin/env node
/* YUKLEME CPU PROFILI (GECE ZINCIRI TUR 4, 2 Eyl 2026).
   Soru: tazeden acilmis tarayicida ilk sayfanin yuklemesindeki uzun
   kareler (kabuk import.then 580-600 ms, satir ici betik 80-180 ms) hangi
   islevden geliyor? Yontem: CDP Profiler (1 ms ornekleme) yukleme boyunca
   acik; islev basina OZ zaman (self time) toplanir; ayni tarayicida ikinci
   kosum (sicak) ayni tabloyla yan yana.
   Kullanim: SAYFA=/yeni/projeler/ node yeni/film/olc-profil.cjs   (once: node yerel-sun.cjs)
   Cevre: SAYFA · UST (12) · SURE (yuklemeden sonra beklenen ms, 1500) */
const path = require('path');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const CHROME = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
const SAYFA = process.env.SAYFA || '/yeni/projeler/';
const UST = +(process.env.UST || 12);
const SURE = +(process.env.SURE || 1500);
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function kosum(browser, etiket) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage(); await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem('qanat-splash-seen', '1'); } catch (e) {} });
  const cdp = await page.target().createCDPSession();
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); await cdp.send('Profiler.start');
  const t0 = Date.now();
  await page.goto(SUNUCU + SAYFA, { waitUntil: 'load', timeout: 60000 }); await bekle(SURE);
  const { profile } = await cdp.send('Profiler.stop');
  /* oz zaman: ornek sayisi x aralik */
  const say = new Map(); const dt = profile.timeDeltas; const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  for (let i = 0; i < profile.samples.length; i++) {
    const n = nodes.get(profile.samples[i]); if (!n) continue;
    const f = n.callFrame; const ad = `${f.functionName || '(anon)'} @ ${(f.url || '').split('/').slice(-1)[0] || '(satir ici)'}:${f.lineNumber + 1}:${f.columnNumber + 1}`;
    say.set(ad, (say.get(ad) || 0) + (dt[i] || 0) / 1000);
  }
  const toplam = [...say.values()].reduce((a, b) => a + b, 0);
  const liste = [...say.entries()].filter(([k]) => !/^\((program|idle|garbage collector|root)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, UST);
  console.log(`\n${etiket} ${SAYFA} — ornek toplami ${Math.round(toplam)} ms (yukleme + ${SURE} ms), duvar ${Date.now() - t0} ms`);
  for (const [k, v] of liste) console.log(`  ${String(Math.round(v)).padStart(5)} ms  ${k}`);
  await ctx.close();
}
(async () => {
  const browser = await pt.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1460,980', '--no-first-run'], defaultViewport: null, protocolTimeout: 120000 });
  await kosum(browser, 'SOGUK (tarayici yeni acildi)');
  await kosum(browser, 'SICAK (ayni tarayici, 2. kosum)');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
