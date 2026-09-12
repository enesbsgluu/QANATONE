#!/usr/bin/env node
/* DIS SITELER HAREKET AZALTMAYA UYUYOR MU (11 Eyl 2026).
   Enes: "arkadasimin bilgisayarinda Alche ve diger awwwards siteleri
   calisiyor, bizde farkli bir problem olabilir." Hipotezle celisir mi?
   Sinama: ayni site normal ve prefers-reduced-motion:reduce ile acilir;
   (1) saniyedeki rAF geri cagrisi (WebGL/tuval animasyonu CSS sayiminda
   gorunmez), (2) kosan CSS/WAAPI animasyon sayisi, (3) 1,5 sn arayla iki
   ekran goruntusu AYNI mi (gozle gorulen hareket). QANATONE de ayni
   duzenekte olculur — kiyas ayni cetvelle.
   Kullanim: node yeni/film/olc-dis-site-hareket.cjs   (SITELER=url1,url2) */
const path = require('path');
const pt = require(path.join(process.env.USERPROFILE, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const SITELER = (process.env.SITELER || 'https://alche.studio/,https://lusion.co/,https://www.qanatone.com/hizmetler/').split(',');
const EXE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await pt.launch({ executablePath: EXE, headless: 'new', args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
  console.log(await browser.version());
  for (const url of SITELER) {
    console.log('\n' + url);
    for (const azalt of [false, true]) {
      const ctx = await browser.createBrowserContext();
      const p = await ctx.newPage();
      await p.setViewport({ width: 1440, height: 900 });
      if (azalt) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await p.evaluateOnNewDocument(() => {
        window.__raf = 0;
        const o = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); });
      });
      let d = { hata: null };
      try {
        await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await new Promise((r) => setTimeout(r, 7000));
        const r0 = await p.evaluate(() => window.__raf);
        const g1 = await p.screenshot({ type: 'png' });
        await new Promise((r) => setTimeout(r, 1500));
        const g2 = await p.screenshot({ type: 'png' });
        const r1 = await p.evaluate(() => window.__raf);
        const x = await p.evaluate(() => ({
          kosan: document.getAnimations().filter((a) => a.playState === 'running').length,
          tuval: document.querySelectorAll('canvas').length,
          azaltMi: matchMedia('(prefers-reduced-motion: reduce)').matches,
        }));
        d = { rafSn: Math.round((r1 - r0) / (1.5 + 0.35)), ekranDegisti: !g1.equals(g2), ...x };
      } catch (e) { d.hata = e.message.slice(0, 80); }
      await ctx.close();
      console.log('  ' + (azalt ? 'hareket-azaltma' : 'normal         ') + '  '
        + (d.hata ? 'HATA ' + d.hata : `rAF ~${String(d.rafSn).padStart(4)}/sn · kosan anim ${String(d.kosan).padStart(3)} · tuval ${d.tuval} · ekran ${d.ekranDegisti ? 'DEGISIYOR' : 'donuk'} · sorgu=${d.azaltMi}`));
    }
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(3); });
