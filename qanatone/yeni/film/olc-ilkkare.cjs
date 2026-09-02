#!/usr/bin/env node
/* ILK KARE BISEKSIYONU (GECE ZINCIRI TUR 4, 2 Eyl 2026).
   Soru: yuklemedeki ilk uzun kare (LoAF, stil+duzen 100-200 ms) hangi
   alt agactan geliyor? Yontem: secici listesi <head> dogar dogmaz
   `display:none!important` ile gizlenir (ilk yerlesimden ONCE), sayfa
   TEKRAR kez soguk baglamda yuklenir, t<600 ms icindeki LoAF'larin
   toplami ve en uzunu (stil+duzen payiyla) medyanlanir.
   Kullanim: SAYFA=/yeni/hizmetler/finans/ GIZLE='.mk-kap|.sdsec|nav' node yeni/film/olc-ilkkare.cjs
   Cevre: TEKRAR (3) · GIZLE ('|' ile ayrilmis secici kumeleri; bos = taban;
   'css:' onekiyle ham CSS kurali da verilebilir) */
const path = require('path');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const CHROME = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
const SAYFA = process.env.SAYFA || '/yeni/hizmetler/finans/';
const TEKRAR = +(process.env.TEKRAR || 3);
const KUME = [''].concat((process.env.GIZLE || '').split('|').filter(Boolean));
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

(async () => {
  const browser = await pt.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1460,980', '--no-first-run'], defaultViewport: null, protocolTimeout: 120000 });
  const sonuc = [];
  for (const gizle of KUME) {
    const top = [], uzun = [], sd = [], lcp = [];
    for (let i = 0; i < TEKRAR; i++) {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage(); await page.setViewport({ width: 1440, height: 900 });
      await page.evaluateOnNewDocument((sel) => {
        try { sessionStorage.setItem('qanat-splash-seen', '1'); } catch (e) {}
        window.__lf = []; window.__lcp = 0;
        try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lf.push({ t: Math.round(e.startTime), sure: Math.round(e.duration), sd: Math.round(e.styleAndLayoutStart ? e.renderStart + e.duration - e.styleAndLayoutStart + (e.startTime - e.startTime) : 0), rs: Math.round(e.renderStart || 0), sls: Math.round(e.styleAndLayoutStart || 0), b: (e.scripts || []).slice(0, 3).map((x) => [(x.sourceURL || '').split('/').slice(-1)[0] || (x.invoker || x.invokerType || ''), x.sourceFunctionName || '', x.sourceCharPosition || 0, Math.round(x.duration)].join(':')) }); }).observe({ type: 'long-animation-frame', buffered: true }); } catch (e) {}
        try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
        if (sel) {
          const ekle = () => { if (!document.head) return false; const s = document.createElement('style'); s.textContent = sel.indexOf('css:') === 0 ? sel.slice(4) : sel + '{display:none!important}'; document.head.appendChild(s); return true; };
          if (!ekle()) new MutationObserver((m, o) => { if (ekle()) o.disconnect(); }).observe(document.documentElement || document, { childList: true, subtree: true });
        }
      }, gizle);
      await page.goto(SUNUCU + SAYFA, { waitUntil: 'load', timeout: 60000 }); await bekle(1200);
      const r = await page.evaluate(() => ({ lf: window.__lf, lcp: Math.round(window.__lcp) }));
      const ilk = r.lf.filter((e) => e.t < 600);
      if (process.env.AYRINTI) console.log(`  ${gizle || '(taban)'} #${i + 1}: ` + ilk.map((e) => `t${e.t} ${e.sure}ms sd${e.sls ? Math.round(e.t + e.sure - e.sls) : 0} [${e.b.join(' | ')}]`).join(' · '));
      top.push(ilk.reduce((a, e) => a + e.sure, 0));
      const enu = ilk.reduce((a, e) => (e.sure > a.sure ? e : a), { sure: 0, t: 0, sls: 0, rs: 0 });
      uzun.push(enu.sure); sd.push(enu.sls ? Math.round(enu.t + enu.sure - enu.sls) : 0); lcp.push(r.lcp);
      await ctx.close();
    }
    const s = { gizle: gizle || '(taban)', toplam: medyan(top), enUzun: medyan(uzun), stilDuzen: medyan(sd), lcp: medyan(lcp), kosum: uzun };
    sonuc.push(s);
    console.log(`${s.gizle.padEnd(34)} ilk 600 ms LoAF toplam ${String(s.toplam).padStart(4)} · en uzun ${String(s.enUzun).padStart(4)} (stil+duzen ${String(s.stilDuzen).padStart(4)}) · LCP ${s.lcp} · kosum ${s.kosum.join('/')}`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
