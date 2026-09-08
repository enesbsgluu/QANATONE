#!/usr/bin/env node
/* SIMGE (favicon) URETECI — 9 Eyl 2026.

   NEDEN: sekmedeki simge QANATONE logosu DEGILDI. Eski kok siteden birebik
   tasinan satir ici SVG jenerik bir isaretti (koyu kare + 45 derece donmus
   kizil kare). Enes: "sitenin her yerde gorunecek logosu bu olacak."

   GIRDI: gorsel-kaynak/prolog/QANAT_LOGO-seffaf-2.png — 3B kabartmali
   render'in SEFFAF hali (1254x1254, RGBA, opak beyaz %0). Ayni dosya R19
   zincirinin de girdisi.

   ICERIK KUTUSU: logo karenin ortasinda DEGIL (logo-kunye.json opak_kutu
   [178.75, 108.75, 1055.324, 1105.594] — 877x997, dikey uzun). Simge kare
   oldugu icin icerik kutusu kirpilip ORTALANIR, yoksa logo kucuk ve sola
   kacik gorunur.

   Bu makinede sharp yok; olcekleme tarayicida yapilir (kayitli yontem).  */
const path = require('path'), fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const KOK = path.join(__dirname, '..', '..');
const GIRDI = path.join(KOK, 'gorsel-kaynak', 'prolog', 'QANAT_LOGO-seffaf-2.png');
const CIKTI = path.join(KOK, 'yeni', 'public', 'img');
const OLCULER = [
  ['simge-32.png', 32],
  ['simge-180.png', 180],     /* apple-touch-icon */
  ['simge-192.png', 192],     /* manifest */
  ['simge-512.png', 512],     /* manifest */
];

(async () => {
  if (!fs.existsSync(GIRDI)) { console.error('GIRDI YOK: ' + GIRDI); process.exit(1); }
  const b = await pt.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', defaultViewport: null, protocolTimeout: 180000, args: ['--no-sandbox'] });
  const s = await b.newPage(); await s.goto('about:blank');
  const b64 = fs.readFileSync(GIRDI).toString('base64');

  const sonuc = await s.evaluate(async (b64, olculer) => {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:image/png;base64,' + b64; });
    /* opak kutuyu GORUNTUDEN olc — kunyeye guvenme, girdi degisebilir */
    const cv0 = new OffscreenCanvas(im.width, im.height), c0 = cv0.getContext('2d', { willReadFrequently: true });
    c0.drawImage(im, 0, 0);
    const d = c0.getImageData(0, 0, im.width, im.height).data;
    let x0 = im.width, y0 = im.height, x1 = 0, y1 = 0;
    for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
      if (d[(y * im.width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    const kw = x1 - x0 + 1, kh = y1 - y0 + 1;
    const cikti = [];
    for (const [ad, n] of olculer) {
      const cv = new OffscreenCanvas(n, n), c = cv.getContext('2d');
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      /* icerigi kareye SIGDIR (en buyuk kenar), ortala, %6 nefes payi */
      const pay = Math.round(n * 0.06), ic = n - pay * 2;
      const o = Math.min(ic / kw, ic / kh);
      const w = Math.round(kw * o), h = Math.round(kh * o);
      c.drawImage(im, x0, y0, kw, kh, Math.round((n - w) / 2), Math.round((n - h) / 2), w, h);
      const bl = await cv.convertToBlob({ type: 'image/png' });
      const u = new Uint8Array(await bl.arrayBuffer()); let t = '';
      for (let i = 0; i < u.length; i += 8192) t += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
      cikti.push({ ad, n, png: btoa(t) });
    }
    return { kutu: [x0, y0, kw, kh], cikti };
  }, b64, OLCULER);

  console.log(`girdi opak kutusu: ${sonuc.kutu[2]}x${sonuc.kutu[3]} @ ${sonuc.kutu[0]},${sonuc.kutu[1]}`);
  for (const c of sonuc.cikti) {
    const y = path.join(CIKTI, c.ad);
    fs.writeFileSync(y, Buffer.from(c.png, 'base64'));
    console.log(`  ${c.ad.padEnd(15)} ${String(c.n + 'x' + c.n).padEnd(9)} ${(fs.statSync(y).size / 1024).toFixed(1)} KB`);
  }
  await b.close();
})().catch((e) => { console.error('HATA', e.message); process.exit(1); });
