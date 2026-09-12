#!/usr/bin/env node
/* HIZMETLER ANIMASYONU HANGI KOSULDA OLUYOR (11 Eyl 2026).
   Belirti (Enes'in arkadasi, Chrome): ana sayfada prolog YOK ve
   hizmetlerdeki HICBIR animasyon calismiyor. Prolog kapisinin uc dali
   (hareket-azaltma / dokunmatik / dar) + kabugun lowfx esigi (bellek<=2,
   cekirdek<=3) ayri ayri kurulur; her kolda sayfanin GERCEKTEN kosan
   animasyonlari (document.getAnimations, playState running) sayilir.
   Kontrol kolu 'normal' animasyon saymazsa duzenek hukum veremez.
   Kullanim: node yeni/film/olc-hizmet-animasyon.cjs   (KOK=, TARAYICI=edge) */
const path = require('path');
const pt = require(path.join(process.env.USERPROFILE, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const KOK = (process.env.KOK || 'https://www.qanatone.com').replace(/\/$/, '');
const EXE = process.env.TARAYICI === 'edge'
  ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SAYFALAR = (process.env.SAYFALAR || '/hizmetler/,/hizmetler/seo/').split(',');
const KOLLAR = [
  { ad: 'normal', vp: { width: 1920, height: 1080 } },
  { ad: 'hareket-azaltma', vp: { width: 1920, height: 1080 }, azalt: true },
  /* 11 Eyl: "Animasyonlari ac" dugmesine basilmis hal (bayrak kayitli) */
  { ad: 'azalt+dugme', vp: { width: 1920, height: 1080 }, azalt: true, ac: true },
  { ad: 'dokunmatik', vp: { width: 1920, height: 1080, hasTouch: true } },
  { ad: 'dar-768', vp: { width: 768, height: 864, deviceScaleFactor: 1.25 } },
  { ad: 'bellek-2GB', vp: { width: 1920, height: 1080 }, bellek: 2 },
  { ad: 'cekirdek-2', vp: { width: 1920, height: 1080 }, cekirdek: 2 },
];

(async () => {
  const browser = await pt.launch({ executablePath: EXE, headless: 'new' });
  console.log((await browser.version()) + ' · ' + KOK);
  let kontrolSayisi = null;
  for (const yol of SAYFALAR) {
    console.log('\n' + yol);
    for (const k of KOLLAR) {
      const ctx = await browser.createBrowserContext();
      const p = await ctx.newPage();
      await p.setViewport(k.vp);
      if (k.azalt) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await p.evaluateOnNewDocument((b, c, a) => {
        try { sessionStorage.setItem('qanat-splash-seen', '1'); } catch (e) {}
        if (a) try { localStorage.setItem('qanat-hareket', '1'); } catch (e) {}
        if (b) Object.defineProperty(Navigator.prototype, 'deviceMemory', { get: () => b });
        if (c) Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => c });
      }, k.bellek || 0, k.cekirdek || 0, !!k.ac);
      await p.goto(KOK + yol, { waitUntil: 'load', timeout: 60000 });
      await new Promise((r) => setTimeout(r, 2500));
      /* kaydirmaya bagli sahneler gorunsun: sayfanin ortasina in, bekle */
      await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.35));
      await new Promise((r) => setTimeout(r, 1500));
      const d = await p.evaluate(() => {
        const a = document.getAnimations();
        const kosan = a.filter((x) => x.playState === 'running');
        const tur = {};
        for (const x of kosan) {
          const t = x.constructor.name + (x.timeline && x.timeline.constructor.name !== 'DocumentTimeline' ? '/' + x.timeline.constructor.name : '');
          tur[t] = (tur[t] || 0) + 1;
        }
        return {
          toplam: a.length, kosan: kosan.length, tur,
          sinif: document.documentElement.className,
          azalt: matchMedia('(prefers-reduced-motion:reduce)').matches,
          kaba: matchMedia('(pointer:coarse)').matches,
          rafSn: null,
        };
      });
      await ctx.close();
      if (yol === SAYFALAR[0] && k.ad === 'normal') kontrolSayisi = d.kosan;
      console.log('  ' + k.ad.padEnd(16) + ' kosan ' + String(d.kosan).padStart(3) + ' / ' + String(d.toplam).padStart(3)
        + '  · html="' + d.sinif + '" · ' + JSON.stringify(d.tur));
    }
  }
  await browser.close();
  if (!kontrolSayisi) { console.log('\n!! KONTROL KOLU ANIMASYON SAYMADI — duzenek hukum veremez'); process.exit(2); }
})().catch((e) => { console.error(e); process.exit(3); });
