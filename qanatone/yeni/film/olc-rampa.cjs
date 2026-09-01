#!/usr/bin/env node
/* GECE TUR 2b · AMBLEM NAV RAMPASI (1-2 Eyl 2026)
   Kapi: "amblemin nav'a oturma rampasi yeniden olculuyor, 0,08 px'i
   asmiyor." Onceki olcum (durak 2 kayit turu) dort genislikte 0,03-0,08
   px vermisti; duzenegi (kayit-olc.py) repoya girmemisti — bu rig ayni
   olcutun puppeteer+sharp karsiligi:

   OLCUT: ucusun SON karesinde (nv-logo-bekle kalkmadan hemen once)
   tuvaldeki amblemin KIZIL KUTLE MERKEZI ile navdaki gercek logonun
   (gizli <img>) rect merkezi arasindaki fark. Kizil kutle: nav logo
   kutusunun +-PAY cevresinde R>140 & R-G>50 piksellerin agirlik merkezi.

   GERCEK GIRDI KURALI: kaydirma Input.synthesizeScrollGesture ile —
   evaluate(scrollTo) sahte esitlik uretir (gece talimati; olc-hiz dersi).

   KIRMIZI ONCE: ayni olcum ucusun ORTA karesinde de yapilir — amblem
   yolda oldugundan sapma BUYUK cikmali; cikmazsa duzenek merkezi
   gormuyordur ve son-kare yesiline guvenilmez.

   Kullanim: node yeni/film/olc-rampa.cjs   (TARAYICI, HEADLESS=0)
   Cikti: yeni/film/olc-rampa.json + kontak/rampa-*.png */
const path = require('path');
const fs = require('fs');
const http = require('http');
const pt = require(path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const sharp = require(path.join(__dirname, '..', 'node_modules', 'sharp'));

const DIST = path.join(__dirname, '..', '..', 'dist');
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const CHROME = TARAYICILAR[process.env.TARAYICI || 'brave'];
const HEADLESS = process.env.HEADLESS === '0' ? false : 'new';
const PORT = 8957;
const MIME = { '.mp4': 'video/mp4', '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.avif': 'image/avif', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.jpg': 'image/jpeg' };

function sunucu() {
  return new Promise((res) => {
    const s = http.createServer((req, rp) => {
      let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!f.startsWith(DIST) || !fs.existsSync(f)) { rp.writeHead(404); return rp.end(); }
      rp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Content-Length': fs.statSync(f).size, 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(rp);
    });
    s.listen(PORT, '127.0.0.1', () => res(s));
  });
}

/* png buffer'da nav-logo cevresindeki kizil kutle merkezi.
   haric: kizil QANATONE metninin rect'i — kutleye karismasin (olculdu:
   60 px'lik pencerede metin x'e +47 px sahte sapma yazmisti). */
async function kizilMerkez(png, kutu, pay, haric) {
  const b = { left: Math.max(0, Math.round(kutu.x - pay)), top: Math.max(0, Math.round(kutu.y - pay)),
    width: Math.round(kutu.w + 2 * pay), height: Math.round(kutu.h + 2 * pay) };
  const { data, info } = await sharp(png).extract(b).raw().toBuffer({ resolveWithObject: true });
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const gx = b.left + x, gy = b.top + y;
    if (haric && gx >= haric.x - 2 && gx <= haric.x + haric.w + 2 && gy >= haric.y - 2 && gy <= haric.y + haric.h + 2) continue;
    const i = (y * info.width + x) * info.channels;
    const R = data[i], G = data[i + 1], Bl = data[i + 2];
    if (R > 140 && R - G > 50 && R - Bl > 40) { sx += x; sy += y; n++; }
  }
  if (n < 20) return null;
  return { x: b.left + sx / n, y: b.top + sy / n, piksel: n };
}


/* iki kirpik arasinda alt-piksel kayma: tamsayi SSD taramasi (+-ARA px)
   + 2B parabolik incelt. Kutle-merkezi yontemi tuval-cizimi ile webp
   logosunun bicim/kenar farkindan ~0,5-1 px taban gurultusu tasiyordu
   (olculdu); korelasyon bicimden bagimsiz gercek kaymayi verir. */
async function kayma(pngA, pngB, kutu, pay) {
  const b = { left: Math.round(kutu.x - pay), top: Math.round(kutu.y - pay),
    width: Math.round(kutu.w + 2 * pay), height: Math.round(kutu.h + 2 * pay) };
  const gri = async (png) => {
    const { data, info } = await sharp(png).extract(b).greyscale().raw().toBuffer({ resolveWithObject: true });
    return { d: data, w: info.width, h: info.height };
  };
  const A = await gri(pngA), B = await gri(pngB);
  const ARA = 5, IC = 6;   /* ic pay: kaydirilan pencere kenari tasmasin */
  const ssd = (dx, dy) => {
    let s = 0, n = 0;
    for (let y = IC; y < A.h - IC; y++) for (let x = IC; x < A.w - IC; x++) {
      const f = A.d[y * A.w + x] - B.d[(y + dy) * B.w + (x + dx)];
      s += f * f; n++;
    }
    return s / n;
  };
  let en = Infinity, ex = 0, ey = 0;
  const M = new Map();
  for (let dy = -ARA; dy <= ARA; dy++) for (let dx = -ARA; dx <= ARA; dx++) {
    const v = ssd(dx, dy); M.set(dx + ',' + dy, v);
    if (v < en) { en = v; ex = dx; ey = dy; }
  }
  const par = (m1, c, p1) => { const d = m1 - 2 * c + p1; return Math.abs(d) > 1e-9 ? Math.max(-1, Math.min(1, 0.5 * (m1 - p1) / d)) : 0; };
  const ax = Math.abs(ex) < ARA ? par(M.get((ex - 1) + ',' + ey), en, M.get((ex + 1) + ',' + ey)) : 0;
  const ay = Math.abs(ey) < ARA ? par(M.get(ex + ',' + (ey - 1)), en, M.get(ex + ',' + (ey + 1))) : 0;
  /* pozitif dx: B, A'ya gore SOLA kaymis demek (B[x+dx] ~ A[x]) — isaret
     'img, tuvale gore nerede' olarak raporlanir: -(ex+ax) */
  return { dx: -(ex + ax), dy: -(ey + ay), taban_ssd: +en.toFixed(1) };
}

(async () => {
  const srv = await sunucu();
  const b = await pt.launch({ executablePath: CHROME, headless: HEADLESS, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--use-angle=default', ...(HEADLESS ? [] : ['--window-size=1460,1000'])] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  /* ERKEN KURULUM (olculdu: reload scroll'u RESTORE ediyor, ucus observer
     kurulmadan bitiyordu — faz 2 'oturma gelmedi'): restore kapatilir,
     observer belge basinda kurulur. */
  await p.evaluateOnNewDocument(() => {
    try { history.scrollRestoration = 'manual'; } catch (e) {}
    window.__kalkma = null;
    addEventListener('DOMContentLoaded', () => {
      const el = document.querySelector('.nv-logo i');
      if (!el) return;
      new MutationObserver(() => {
        if (window.__kalkma === null && el.className.indexOf('nv-logo-bekle') < 0 && el.className.indexOf('bekle') < 0) { window.__kalkma = Date.now(); window.__kalkmaY = scrollY; }
      }).observe(el, { attributes: true, attributeFilter: ['class'] });
    });
  });
  await p.goto(`http://127.0.0.1:${PORT}/yeni/film/`, { waitUntil: 'load', timeout: 120000 });
  /* prolog 3B ilk karesi (gl.ts izi) — inmezse yedek yol, rampa olculemez */
  const gl = await p.waitForFunction('document.documentElement.classList.contains("pr-gl") && !document.documentElement.dataset.prolog', { timeout: 30000 }).then(() => true).catch(() => false);
  const iz = await p.evaluate(() => ({ prolog: document.documentElement.dataset.prolog || null, sinif: document.documentElement.className }));
  if (!gl) { console.error('3B yolu acilmadi:', JSON.stringify(iz)); process.exit(2); }
  await new Promise((r) => setTimeout(r, 3500));   /* sahne otursun (varliklar + metal) */

  const { logoKutu, metinKutu } = await p.evaluate(() => {
    const r = document.querySelector('.nv-logo i img').getBoundingClientRect();
    const m = document.querySelector('.nv-logo b')?.getBoundingClientRect();
    return { logoKutu: { x: r.left, y: r.top, w: r.width, h: r.height },
      metinKutu: m ? { x: m.left, y: m.top, w: m.width, h: m.height } : null };
  });
  const hedef = { x: logoKutu.x + logoKutu.w / 2, y: logoKutu.y + logoKutu.h / 2 };

  /* OTURMA SICRAMASI OLCUMU (3. surum — ilk ikisi olculup atildi:
     90 ms ornekleme son kareyi 47 px geride yakaladi; adaptif adim da
     97 px'te kaldi cunku sinif kalkisi ile ornek ani hic cakismiyor.
     DOGRU TANIM eski kayit turuyla ayni: kullanicinin GORDUGU atlama —
     sinif kalkmadan onceki SON render karesi (tuvaldeki amblem) ile
     kalktiktan sonraki ILK kare (gercek img) arasindaki merkez farki.
     CDP Page.screencast HER render karesini timestamp'iyla verir;
     kalkma ani sayfada MutationObserver + Date.now ile isaretlenir. */
  const cdp = await p.createCDPSession();
  const frameler = [];
  cdp.on('Page.screencastFrame', (e) => {
    frameler.push({ ts: e.metadata.timestamp * 1000, png: Buffer.from(e.data, 'base64') });
    if (frameler.length > 400) frameler.shift();
    cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {});
  });
  /* observer evaluateOnNewDocument'ta kuruldu */
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  let kalkma = null, ortaKare = null;
  for (let i = 0; i < 40 && !kalkma; i++) {
    await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, yDistance: -60, speed: 800 });
    await new Promise((r) => setTimeout(r, 90));
    kalkma = await p.evaluate(() => window.__kalkma);
    if (i === 6 && frameler.length) ortaKare = frameler[frameler.length - 1].png;
  }
  const kalkmaY = await p.evaluate(() => window.__kalkmaY);
  /* FAZ 2 (olculdu: kaba adimda kalkma-oncesi son GELEN kare ucusun
     gerisinde kalabiliyor): esigi ogrendik; sayfa tazelenir, esigin
     ~150 px oncesine kaba gelinir, esik -4 px MIKRO adimlarla gecilir —
     kalkma cevresinde kare bol, 'once' karesi gercek p~1 tuvali. */
  frameler.length = 0;
  await p.reload({ waitUntil: 'load' });
  await p.waitForFunction('document.documentElement.classList.contains("pr-gl") && !document.documentElement.dataset.prolog', { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 5000));  /* dogus varlik-yuklemeye bagli — acele etme */
  /* observer evaluateOnNewDocument'ta kuruldu */
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  /* kaba inis de DOGAL adimlarla (-60): ucus koreografisi ilk kaydirma
     akisina bagli, 500'luk ziplama onu bozuyordu (olculdu: faz 2'de
     oturma hic gelmedi) */
  let kaba = Math.max(0, kalkmaY - 150);
  while (kaba > 0) {
    const d = Math.min(60, kaba); kaba -= d;
    await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, yDistance: -d, speed: 900 });
    await new Promise((r) => setTimeout(r, 70));
  }
  kalkma = null;
  for (let i = 0; i < 200 && !kalkma; i++) {
    await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, yDistance: -4, speed: 400 });
    await new Promise((r) => setTimeout(r, 50));
    kalkma = await p.evaluate(() => window.__kalkma);
  }
  await new Promise((r) => setTimeout(r, 400));   /* kalkma sonrasi kareler de gelsin */
  await cdp.send('Page.stopScreencast').catch(() => {});
  if (!kalkma) {
    const dbg = await p.evaluate(() => ({ y: scrollY, bekle: document.querySelector('.nv-logo i')?.className, prolog: document.documentElement.dataset.prolog || null, sinif: document.documentElement.className }));
    console.error('oturma gelmedi · faz1 kalkmaY=' + kalkmaY + ' · dbg=' + JSON.stringify(dbg));
    await b.close(); srv.close(); process.exit(2);
  }
  await b.close(); srv.close();

  /* TANI: kalkma cevresi kare zaman cizgisi + her karenin logo-bolge
     icerigi son (img) karesine ne kadar benziyor */
  {
    const cevre = frameler.filter((f) => Math.abs(f.ts - kalkma) < 600);
    const refPng = frameler[frameler.length - 1].png;
    const kutuS = { left: 200, top: 20, width: 200, height: 90 };
    const oz = async (png) => { const d = await sharp(png).extract(kutuS).greyscale().raw().toBuffer(); return d; };
    const ref = await oz(refPng);
    for (const f of cevre.slice(-10)) {
      const d = await oz(f.png);
      let s = 0; for (let i = 0; i < d.length; i++) s += Math.abs(d[i] - ref[i]);
      console.log('  kare ts-kalkma=' + Math.round(f.ts - kalkma) + 'ms · img-benzerlik-farki=' + s);
    }
  }
  const once = [...frameler].reverse().find((f) => f.ts < kalkma);
  const sonra = frameler.find((f) => f.ts >= kalkma + 30);   /* img acildiktan sonraki kare */
  if (!once || !sonra) { console.error('screencast kareleri eksik'); process.exit(2); }
  fs.mkdirSync(path.join(__dirname, 'kontak'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'kontak', 'rampa-sonkare.png'), once.png);
  fs.writeFileSync(path.join(__dirname, 'kontak', 'rampa-imgkare.png'), sonra.png);
  if (ortaKare) fs.writeFileSync(path.join(__dirname, 'kontak', 'rampa-orta.png'), ortaKare);

  /* screencast karesi viewport'la ayni olcude olmayabilir — olcekle */
  const meta = await sharp(once.png).metadata();
  const olcek = meta.width / 1440;
  const K = (k) => ({ x: k.x * olcek, y: k.y * olcek, w: k.w * olcek, h: k.h * olcek });
  const merkezT = await kizilMerkez(once.png, K(logoKutu), 60 * olcek, K(metinKutu));
  const merkezI = await kizilMerkez(sonra.png, K(logoKutu), 60 * olcek, K(metinKutu));
  const orta = ortaKare ? await kizilMerkez(ortaKare, K(logoKutu), 300 * olcek, K(metinKutu)) : null;
  const merkez = merkezT && merkezI ? { x: merkezT.x, y: merkezT.y, piksel: merkezT.piksel } : null;
  const hedefE = merkezI ? { x: merkezI.x, y: merkezI.y } : { x: hedef.x * olcek, y: hedef.y * olcek };
  /* sapma = tuval son karesi vs IMG ilk karesi (ikisi de ayni yontemle
     kizil kutle merkezi — olcut ici tutarli, olcek sadeles ir) */
  Object.assign(hedef, { x: hedefE.x / olcek, y: hedefE.y / olcek });
  if (merkez) { merkez.x /= olcek; merkez.y /= olcek; }
  if (orta) { orta.x /= olcek; orta.y /= olcek; }

  const S = {
    _: 'yeni/film/olc-rampa.cjs — amblem nav rampasi (birlesme sonrasi); olcut: son karede kizil kutle merkezi vs nav logo rect merkezi',
    olcum: new Date().toISOString(), logoKutu, hedef,
    kirmizi_orta: orta ? { sapma_x: +(orta.x - hedef.x).toFixed(1), sapma_y: +(orta.y - hedef.y).toFixed(1), piksel: orta.piksel,
      yakalandi: Math.hypot(orta.x - hedef.x, orta.y - hedef.y) > 5 } : { yakalandi: false, not: 'orta kare yok' },
    sonkare: merkez ? { merkez: { x: +merkez.x.toFixed(2), y: +merkez.y.toFixed(2) }, piksel: merkez.piksel,
      sapma_x: +(merkez.x - hedef.x).toFixed(3), sapma_y: +(merkez.y - hedef.y).toFixed(3) } : null,
  };
  /* ALT-PIKSEL: son tuval karesi ile ilk img karesi arasi korelasyon
     kaymasi (olcek geri alinir) */
  const kay = await kayma(once.png, sonra.png, K(logoKutu), 24 * olcek);
  S.korelasyon = { dx_px: +(kay.dx / olcek).toFixed(3), dy_px: +(kay.dy / olcek).toFixed(3), taban_ssd: kay.taban_ssd };
  if (S.sonkare) {
    /* HUKUM ESKI OLCUTLE AYNI: dmerkezY (yalniz DIKEY) — 6333d97 kaydi
       "oturma dmerkezY 8,5 -> 0,03-0,08 px". Korelasyon dy esas (kutle
       yontemi bicim farkindan ~0,5-1 px taban tasiyordu, olculdu);
       kutle sapmasi bilgi olarak durur. */
    S.rampa_px = Math.abs(S.korelasyon.dy_px);
    S.hukum = S.kirmizi_orta.yakalandi && S.rampa_px <= 0.08 ? 'GECTI' : 'KALDI';
  } else { S.hukum = 'OLCULEMEDI (kizil kutle yok)'; }
  fs.writeFileSync(path.join(__dirname, 'olc-rampa.json'), JSON.stringify(S, null, 1));
  console.log(`kirmizi (orta kare) sapma: ${S.kirmizi_orta.sapma_x},${S.kirmizi_orta.sapma_y} px — ${S.kirmizi_orta.yakalandi ? 'YAKALANDI' : 'YAKALANAMADI'}`);
  console.log(S.sonkare ? `kutle sapma: ${S.sonkare.sapma_x} / ${S.sonkare.sapma_y} px · korelasyon: ${S.korelasyon.dx_px} / ${S.korelasyon.dy_px} px · rampa ${S.rampa_px} px` : 'son kare olculemedi');
  console.log(`=> ${S.hukum}`);
})().catch((e) => { console.error(e); process.exit(1); });
