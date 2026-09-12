#!/usr/bin/env node
/* PROLOG SIRASINDA #bg GORUNUYOR MU — SADAKAT OLCUMU (7 Eyl 2026).

   NEDEN: prolog sirasinda `#bg` (sabit konumlu kabuk zemini) belge boyunda
   IKINCI bir kompozit katman doguruyor — olculdu, katman alanini IKIYE
   KATLIYOR (zoom 1: 760,6 -> 388,0 MP · zoom 2: 910,8 -> 454,5 MP).
   Sebep mekanik: `position:fixed` bir eleman icerigin ALTINDA durunca
   butun belge icerigi onun ustunde ayri bir katmana cikar; o katman da
   belge boyu kadar olur (prologda 121.000 px, zoom 2'de 243.000 px).

   ONERI: `html.fl-js` varken `#bg`/`#stars`/`#noise` basilmasin. Kayit
   "film sirasinda zemini `.fl-govde` opak katmani zaten ortuyor" diyor —
   AMA KAYIT OLCUM DEGILDIR. Bu arac onu kareyle sinar: ayni kaydirma
   noktalarinda iki kol (bugun / kalkanli) yan yana yakalanir ve piksel
   farki yazilir. FARK VARSA ONERI DUSER.

   OLCUT: her noktada degisen piksel orani ve en buyuk kanal farki.
   Kabul: gorunur fark YOK (oran ~0). Aksi halde kalkan dar tutulur ya da
   hic uygulanmaz — karar Enes'in gozunde.                              */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const EXE = process.env.TARAYICI_YOL || 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const CIK = process.env.CIK || path.join(process.env.TEMP || '/tmp', 'prolog-zemin');
const NOKTALAR = (process.env.NOKTALAR || '0,8000,30000,60000,90000,118000').split(',').map(Number);
const KALKAN = 'html.fl-js #bg,html.fl-js #stars,html.fl-js #noise{display:none!important}';

async function kolCek(ad, css) {
  const b = await pt.launch({ executablePath: EXE, headless: false,
    args: ['--no-first-run', '--no-default-browser-check'],
    defaultViewport: { width: 1600, height: 900 } });
  const page = await b.newPage();
  if (css) await page.evaluateOnNewDocument(
    `(()=>{const k=()=>{const s=document.createElement('style');s.setAttribute('data-kalkan','1');s.textContent=${JSON.stringify(css)};(document.head||document.documentElement).appendChild(s)};document.head?k():document.addEventListener('DOMContentLoaded',k,{once:true})})()`);
  await page.goto(SUNUCU + '/', { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 3500));
  if (css) {
    const var_ = await page.evaluate(() => !!document.querySelector('style[data-kalkan]'));
    if (!var_) throw new Error('KALKAN UYGULANMADI — kosum hukumsuz');
  }
  const cdp = await page.createCDPSession();
  const dosyalar = [];
  for (const n of NOKTALAR) {
    /* GERCEK GIRDI: prolog akisi ilk girdiyi bekler (4dc97ae), evaluate
       ile scrollTo filmi kendi ritmine sokar (olc-zincir dersi). */
    await cdp.send('Input.synthesizeScrollGesture',
      { x: 800, y: 450, xDistance: 0, yDistance: -600, speed: 4000, gestureSourceType: 'mouse' }).catch(() => {});
    await page.evaluate((y) => scrollTo(0, y), n);
    await new Promise((r) => setTimeout(r, 1400));
    const f = path.join(CIK, `${ad}-${n}.png`);
    await page.screenshot({ path: f });
    dosyalar.push({ nokta: n, dosya: f, y: await page.evaluate(() => Math.round(scrollY)) });
  }
  await b.close();
  return dosyalar;
}

(async () => {
  fs.mkdirSync(CIK, { recursive: true });
  console.log(`SADAKAT OLCUMU · ${NOKTALAR.length} nokta · kareler: ${CIK}`);
  const K = await kolCek('K', '');
  const F = await kolCek('F', KALKAN);
  fs.writeFileSync(path.join(CIK, 'kareler.json'), JSON.stringify({ K, F }, null, 1));
  console.log('\nnokta      scrollY(K/F)   kareler yazildi');
  for (let i = 0; i < K.length; i++) console.log(`${String(K[i].nokta).padStart(7)}   ${K[i].y}/${F[i].y}`);
  console.log('\nfark hesabi ayri adimda (PIL) — kareler yan yana duruyor.');
})();
