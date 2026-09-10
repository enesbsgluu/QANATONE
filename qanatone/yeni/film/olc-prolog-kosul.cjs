#!/usr/bin/env node
/* PROLOG HANGI KOSULDA KAPANIYOR — canli siteye karsi kosul matrisi.
   Belirti (Enes'in arkadasi, 11 Eyl 2026): siradan bilgisayarda prolog HIC
   gorunmuyor. Her kol: taze baglam (sessionStorage bos), sayfa acilir,
   6 sn beklenir, sonra KARAR (data-film, fl-js) + GORUNEN (ekran ortasindaki
   oge, ilk sunulan video karesi) okunur.
   Hukum: ACIK = film kuruldu ve kare sundu · KAPALI = film katmani yok ·
   DONUK = film kuruldu ama hic video karesi sunulmadi.
   Kullanim: node yeni/film/olc-prolog-kosul.cjs [kol-adi-suzgeci]   (TARAYICI=edge|brave|chrome) */
const path = require('path');
const pt = require(path.join(process.env.USERPROFILE, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const KOK = (process.env.KOK || 'https://www.qanatone.com').replace(/\/$/, '');
const EXE = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
}[process.env.TARAYICI || 'chrome'];
const BEKLE = Number(process.env.BEKLE || 6000);

const KOLLAR = [
  { ad: 'kontrol-1920', vp: { width: 1920, height: 1080 } },
  { ad: 'laptop-1366', vp: { width: 1366, height: 768 } },
  { ad: 'laptop-1536@125', vp: { width: 1536, height: 864, deviceScaleFactor: 1.25 } },
  { ad: 'hareket-azaltma', vp: { width: 1920, height: 1080 }, azalt: true },
  /* 11 Eyl: "Animasyonlari ac" dugmesine basilmis hal — prolog GELMELI */
  { ad: 'azalt+dugme', vp: { width: 1920, height: 1080 }, azalt: true, ac: true },
  { ad: 'dokunmatik-laptop', vp: { width: 1920, height: 1080, hasTouch: true } },
  { ad: 'yarim-pencere@125', vp: { width: 768, height: 864, deviceScaleFactor: 1.25 } },
  { ad: 'zoom175-1366', vp: { width: 780, height: 439, deviceScaleFactor: 1.75 } },
  { ad: 'mp4-engelli', vp: { width: 1920, height: 1080 }, engel: /\.mp4(\?|$)/ },
  { ad: 'film-betigi-engelli', vp: { width: 1920, height: 1080 }, engel: /Film\.astro_astro_type_script/ },
];

(async () => {
  const suz = process.argv[2];
  const browser = await pt.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
  const surum = await browser.version();
  console.log('tarayici ' + surum + ' · ' + KOK + '/');
  const sonuc = [];
  for (const k of KOLLAR) {
    if (suz && !k.ad.includes(suz)) continue;
    const ctx = await browser.createBrowserContext();
    const p = await ctx.newPage();
    await p.setViewport(k.vp);
    if (k.azalt) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    if (k.ac) await p.evaluateOnNewDocument(() => { try { localStorage.setItem('qanat-hareket', '1'); } catch (e) {} });
    const uyari = [];
    p.on('console', (m) => { const t = m.text(); if (/\[(film|prolog)\]/.test(t)) uyari.push(t.slice(0, 120)); });
    if (k.engel) {
      await p.setRequestInterception(true);
      p.on('request', (r) => (k.engel.test(r.url()) ? r.abort() : r.continue()));
    }
    await p.goto(KOK + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, BEKLE));
    const d = await p.evaluate(() => {
      const H = document.documentElement;
      const fl = document.querySelector('section.fl');
      const mm = (q) => matchMedia(q).matches;
      const f = window.__fl;
      /* ekranin ortasinda ne var (perde hariç: perde kalkmis olmali) */
      const o = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      const zincir = [];
      for (let e = o; e && zincir.length < 4; e = e.parentElement) zincir.push(e.tagName.toLowerCase() + (e.classList[0] ? '.' + e.classList[0] : ''));
      return {
        film: H.dataset.film || null, flJs: H.classList.contains('fl-js'),
        flGorunur: fl ? getComputedStyle(fl).display !== 'none' : false,
        motor: !!f, ilkKareMs: f ? f.ilkKareMs : null, acilisMs: f ? f.acilisMs : null,
        s1: f ? f.sahne()[0].durum : null,
        orta: zincir.join(' < '),
        mm: { azalt: mm('(prefers-reduced-motion:reduce)'), kaba: mm('(pointer:coarse)'), dar: mm('(max-width:900px)'), anyKaba: mm('(any-pointer:coarse)') },
        w: innerWidth, dpr: devicePixelRatio,
      };
    });
    await ctx.close();
    const hukum = !d.flGorunur ? 'KAPALI' : (d.motor && d.ilkKareMs !== null ? 'ACIK' : 'DONUK');
    sonuc.push({ kol: k.ad, hukum, ...d, uyari });
    console.log(hukum.padEnd(6) + ' ' + k.ad.padEnd(20) + ' data-film=' + String(d.film).padEnd(15)
      + ' w=' + String(d.w).padStart(4) + ' dpr=' + d.dpr
      + ' · azalt ' + +d.mm.azalt + ' kaba ' + +d.mm.kaba + ' dar ' + +d.mm.dar
      + ' · ilkKare ' + d.ilkKareMs + ' · s1 ' + d.s1
      + '\n       orta: ' + d.orta + (uyari.length ? '\n       konsol: ' + uyari.join(' | ') : ''));
  }
  await browser.close();
  require('fs').writeFileSync(path.join(__dirname, 'olc-prolog-kosul-' + (process.env.TARAYICI || 'chrome') + '.json'), JSON.stringify({ surum, kok: KOK, olcum: new Date().toISOString(), sonuc }, null, 1));
  /* kontrol kolu ACIK degilse duzenek yalan soyler — cik kodu 2 */
  const kontrol = sonuc.find((s) => s.kol === 'kontrol-1920');
  if (kontrol && kontrol.hukum !== 'ACIK') { console.log('\n!! KONTROL KOLU ACIK DEGIL (' + kontrol.hukum + ') — duzenek hukum veremez'); process.exit(2); }
})().catch((e) => { console.error(e); process.exit(3); });
