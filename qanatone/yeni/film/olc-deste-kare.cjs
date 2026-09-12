#!/usr/bin/env node
/* DESTE — ZOOM KADEMESI BASINA KARE (8 Eyl 2026).

   Sayi hipotezi (yuzde/vh karisimi) `olc-deste-egri.cjs` ile OLCULDU ve
   DUSTU: sapma zoom 1'de 0,0139 · 1,5'te 0,0086 · 2'de 0,0113 — buyumuyor.
   Demek ki Enes'in gordugu "onceki kartin filigrani" opaklik egrisinden
   gelmiyor. Bu arac goze bakar: ayni MANTIKSAL noktada (zaman cizelgesi
   ilerlemesi p) her zoom kademesinin karesi alinir, yan yana konur.

   AYRICA KAPI DURUMU YAZILIR: zoom CSS gorunum genisligini KUCULTUR, yani
   `@media (min-width:901px)` kapisi zoom 1,5'ten itibaren KAPANIR — deste
   masaustu iki sutunlu duzenden mobil tek sutunlu duzene gecer, gorsel
   kaynagi degisir, sticky ust 96+13i'den 72+10i'ye duser. Kare bunu
   gostermezse fark okunamaz.                                          */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const TARAYICI = process.env.TARAYICI || 'chrome';
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const ADRES = process.env.ADRES || 'http://127.0.0.1:8790/';
const KADEMELER = (process.env.KADEMELER || '1,1.5,2').split(',').map(Number);
const NOKTALAR = (process.env.NOKTALAR || '0.30,0.45,0.60,0.75').split(',').map(Number);
const DIZIN = process.env.DIZIN || path.join(__dirname, '_kare-deste');

(async () => {
  const exe = TARAYICILAR[TARAYICI];
  if (!fs.existsSync(exe)) { console.error(`TARAYICI YOK: ${exe}`); process.exit(1); }
  fs.mkdirSync(DIZIN, { recursive: true });
  const b = await pt.launch({ executablePath: exe, headless: false,
    args: ['--no-first-run', '--no-default-browser-check'], defaultViewport: null });
  const page = await b.newPage();
  await page.evaluateOnNewDocument("try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}");
  const cdp = await page.createCDPSession();
  await page.goto(ADRES, { waitUntil: 'load', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const taban = await page.evaluate(() => ({
    aygit_en: Math.round(innerWidth * devicePixelRatio),
    aygit_boy: Math.round(innerHeight * devicePixelRatio),
    deste: !!document.querySelector('.sp-deste'),
  }));
  if (!taban.deste) { console.error('!! DESTE YOK — HUKUMSUZ'); await b.close(); process.exit(2); }

  const rapor = [];
  for (const z of KADEMELER) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: Math.round(taban.aygit_en / z), height: Math.round(taban.aygit_boy / z),
      deviceScaleFactor: z, mobile: false });
    await new Promise((r) => setTimeout(r, 1200));
    const dpr = await page.evaluate(() => {
      let lo = 0.4, hi = 5;
      for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (matchMedia(`(min-resolution: ${m}dppx)`).matches) lo = m; else hi = m; }
      return Number(((lo + hi) / 2).toFixed(3));
    });
    if (Math.abs(dpr - z) > 0.02) { console.error(`!! dpr ${dpr} != ${z} — kademe HUKUMSUZ`); continue; }

    const durum = await page.evaluate(() => {
      const d = document.querySelector('.sp-deste');
      const r = d.getBoundingClientRect();
      const k0 = document.querySelector('.sp-kart');
      const g0 = k0.querySelector('.sp-govde');
      const img = k0.querySelector('.sp-gorsel img');
      return {
        ust: Math.round(r.top + scrollY), boy: Math.round(r.height),
        gorunum: innerHeight, css_en: innerWidth,
        masaustu_kapi: matchMedia('(min-width:901px)').matches,
        sutun: getComputedStyle(g0).gridTemplateColumns,
        sticky_ust: getComputedStyle(k0).top,
        kart_boy: Math.round(g0.getBoundingClientRect().height),
        gorsel_kaynak: img ? img.currentSrc.split('/').pop() : null,
        filtre: img ? getComputedStyle(img).filter : null,
      };
    });
    console.log(`zoom ${z} · css ${durum.css_en}x${durum.gorunum} · masaustu kapi ${durum.masaustu_kapi ? 'ACIK' : 'KAPALI'} · sutun ${durum.sutun} · sticky ${durum.sticky_ust} · kart boy ${durum.kart_boy} (gorunum ${durum.gorunum}) · gorsel ${durum.gorsel_kaynak} · filtre ${durum.filtre}`);
    if (durum.kart_boy > durum.gorunum - parseFloat(durum.sticky_ust)) {
      console.log(`        !! KART GORUNUME SIGMIYOR: ${durum.kart_boy} px kart, ${Math.round(durum.gorunum - parseFloat(durum.sticky_ust))} px yer`);
    }

    for (const p of NOKTALAR) {
      const hedef = Math.round(durum.ust + p * durum.boy);
      await page.evaluate(async (h) => {
        scrollTo(0, h);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }, hedef);
      await new Promise((r) => setTimeout(r, 350));
      const ad = path.join(DIZIN, `z${String(z).replace('.', '_')}-p${String(p).replace('.', '_')}.png`);
      await page.screenshot({ path: ad });
      rapor.push({ zoom: z, p, dosya: path.basename(ad) });
    }
    rapor.push({ zoom: z, durum });
  }
  fs.writeFileSync(path.join(DIZIN, 'kunye.json'), JSON.stringify({ olcum: new Date().toISOString(), tarayici: TARAYICI, rapor }, null, 1));
  console.log(`\n→ ${DIZIN}`);
  await b.close().catch(() => {});
})();
