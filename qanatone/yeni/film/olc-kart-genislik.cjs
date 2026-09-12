#!/usr/bin/env node
/* Tek seferlik olcum kolu (TUR 1, 4 Eyl 2026): iki agacta AYNI ogelerin
   kutu olculerini yan yana yazar. "Kart dar duruyor" gibi bir hukum goz
   karariyla verilmez — kap, kart ve sutun genislikleri okunur.
   KULLANIM:
     MSYS_NO_PATHCONV=1 node yeni/film/olc-kart-genislik.cjs \
       "/otomasyon#hsSec,.hsbox,.hsinputs,.hsout,.hspara,.wrap" \
       "/yeni/otomasyon#huni,.hsbox,.hsinputs,.hsout,.hspara,.kap"
   Her arguman: <yol>#<virgullu secici listesi>. Kok adres KOK env'i
   (varsayilan http://127.0.0.1:8790). */
const path = require('path');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const KOK = (process.env.KOK || 'http://127.0.0.1:8790').replace(/\/$/, '');
const GENISLIK = +(process.env.GENISLIK || 1440);
const YUKSEKLIK = +(process.env.YUKSEKLIK || 900);
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const EXE = TARAYICILAR[process.env.TARAYICI || 'brave'];

(async () => {
  const isler = process.argv.slice(2).map((a) => {
    const i = a.indexOf('#');
    return { yol: a.slice(0, i), sec: a.slice(i + 1).split(',').map((s) => s.trim()).filter(Boolean) };
  });
  if (isler.length < 2) { console.error('en az iki <yol>#<secici,...> argumani ver'); process.exit(1); }
  const browser = await pt.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] });
  const cikti = [];
  for (const is of isler) {
    const page = await browser.newPage();
    await page.setViewport({ width: GENISLIK, height: YUKSEKLIK, deviceScaleFactor: 1 });
    await page.setCacheEnabled(false);   /* 304 gelirse durum kontrolu yanlis kirmizi verir */
    await page.evaluateOnNewDocument(() => {
      try { sessionStorage.setItem('qanat-splash-seen', '1'); sessionStorage.setItem('qanat-prolog-atlandi', '1'); } catch {}
    });
    const r = await page.goto(KOK + is.yol, { waitUntil: 'networkidle0', timeout: 60000 });
    if (!r || r.status() !== 200) { console.error(`${is.yol} durum ${r && r.status()}`); process.exit(1); }
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const olcu = await page.evaluate((secler) => {
      const govde = document.documentElement.clientWidth;
      return { govde, kalem: secler.map((s) => {
        const e = document.querySelector(s);
        if (!e) return { s, yok: true };
        const r = e.getBoundingClientRect();
        const c = getComputedStyle(e);
        return { s, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
          x: Math.round(r.left * 10) / 10,
          pad: c.padding, maxw: c.maxWidth, disp: c.display, kol: c.gridTemplateColumns };
      }) };
    }, is.sec);
    cikti.push({ yol: is.yol, ...olcu });
    await page.close();
  }
  await browser.close();
  for (const c of cikti) {
    console.log(`\n${c.yol}  (govde ${c.govde} px)`);
    for (const k of c.kalem) {
      if (k.yok) { console.log(`  ${k.s.padEnd(12)} YOK`); continue; }
      console.log(`  ${k.s.padEnd(12)} w ${String(k.w).padStart(7)}  h ${String(k.h).padStart(7)}  x ${String(k.x).padStart(6)}  disp ${k.disp}  maxw ${k.maxw}  pad ${k.pad}${k.kol && k.kol !== 'none' ? '  kol ' + k.kol : ''}`);
    }
  }
})();
