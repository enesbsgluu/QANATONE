#!/usr/bin/env node
/* ============================================================
   YUKLEME TAMPONU OLCUMU (2 Eyl 2026, giris sokumu kapisi).
   Talimat: "yavas ag kosulunda filmin ilk hareketi ile ilk kliplerin
   hazir olma ani YAN YANA olculur, bosluk varsa yazilir."

   Tampon (motor.ts basligindaki blok): film ilk karesinde SABIT durur,
   kilit klip + yondeki komsu tamamen inene kadar hedef ilerlemez.
   Perde/sayac/yuzde yok. Motor iki ani yazar:
     __fl.tamponMs     = kilidin acildigi an (hazirlik)
     __fl.ilkHareketMs = gosterilenin kilitten ilk ayrildigi an
   KAPI: ilkHareket >= tampon (hareket hazirliktan ONCE baslayamaz).
   BOSLUK = ilkHareket - tampon; rapor edilir, kapi degil (sabirsiz
   senaryoda kullanici zaten kaydiriyor, bosluk ~1 kare beklenir).

   DUZENEK KENDINI DOGRULAR (kayit-duzenegi dersleri): motorun kendi
   izine guvenilmez — rig sayfaya BAGIMSIZ bir rAF ornekleyicisi koyar
   (gosterilenT + o anki tamponMs), ve tampon acilmadan gosterilenin
   kimildamadigini kendi orneklerinden de teyit eder (yarim kare
   toleransi, motor OTUR esigiyle ayni tanim).

   SENARYO: SABIRSIZ ZIYARETCI — sayfa daha yuklenirken kaydirmaya
   baslar (tampon icin en zorlayici hal; sabirli halde bosluk zaten
   akis kadar kucuk). Uc ag kosulu: dolu hat · 4g · yavas-4g.
   HER KOSUM SOGUK (onbellek temizlenir) — ilk ziyaretcinin kosulu.

   Kullanim: node yeni/film/olc-tampon.cjs   (once: node yerel-sun.cjs)
   Cevre   : TARAYICI=brave|chrome · TEKRAR=3 · SUNUCU=...
   NOT: tarayici olcumleri AYNI ANDA KOSULMAZ (cekisme kaydi oldurur). */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'brave';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const CIKTI = path.join(__dirname, 'olc-tampon.json');
const TEKRAR = Number(process.env.TEKRAR || 3);

/* Ag kosullari. yavas-4g FM1/motor olcumlerindeki "yavas 4G" ile ayni
   buyukluk sinifi (1,6 Mbit/s, 150 ms RTT). */
const AGLAR = {
  'dolu-hat': null,
  '4g': { downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8, latency: 60 },
  'yavas-4g': { downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (0.75 * 1024 * 1024) / 8, latency: 150 },
};

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const jest = (cdp, mesafe, hiz) => cdp.send('Input.synthesizeScrollGesture', {
  x: 720, y: 450, xDistance: 0, yDistance: -mesafe, speed: hiz, gestureSourceType: 'mouse', repeatCount: 0 });

/* Bagimsiz ornekleyici: motorun izinden ayri, kendi rAF donsusuyle
   gosterilenT + tamponMs cifti. Motor yalan soyluyorsa burada gorunur. */
const ORNEKLEYICI = `(() => {
  window.__t = [];
  const dongu = () => {
    const f = window.__fl;
    if (f) __t.push({ t: +performance.now().toFixed(1), T: +f.gosterilenT.toFixed(4), acik: f.tamponMs !== null });
    requestAnimationFrame(dongu);
  };
  requestAnimationFrame(dongu);
})()`;

async function kosum(browser, agAdi) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const cdp = await page.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.clearBrowserCache').catch(() => {});
  const ag = AGLAR[agAdi];
  if (ag) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...ag });

  await page.goto(`${SUNUCU}/yeni/film/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(ORNEKLEYICI);
  await page.bringToFront();

  /* SABIRSIZ: motor dogar dogmaz kaydirmaya basla ve ilk hareket
     yazilana kadar surdur (yavas agda dakikalar surebilir). */
  await page.waitForFunction('!!window.__fl', { timeout: 60000 });
  const t0 = Date.now();
  let hazir = null;
  while (Date.now() - t0 < 180000) {
    await jest(cdp, 900, 1400);
    hazir = await page.evaluate(() => ({
      tampon: window.__fl.tamponMs, hareket: window.__fl.ilkHareketMs,
      T: +window.__fl.gosterilenT.toFixed(3),
      sahne: window.__fl.sahne().slice(0, 3).map((s) => s.durum),
      mbit: window.__fl.mbit,
    }));
    if (hazir.hareket !== null) break;
  }
  /* hareket sonrasi yarim saniye daha ornekle, sonra oku */
  await bekle(500);
  const orn = await page.evaluate(() => window.__t);
  await page.close();

  /* BAGIMSIZ TEYIT: tampon acilmadan gosterilen kimildadi mi?
     Kilit konumu ilk orneklerin T'si; tolerans yarim kare (~0,021 sn,
     motor OTUR ile ayni tanim; fps kanondan 24). */
  const kapaliOrn = orn.filter((o) => !o.acik);
  const kilitT = kapaliOrn.length ? kapaliOrn[0].T : null;
  const kacak = kilitT === null ? 0
    : kapaliOrn.filter((o) => Math.abs(o.T - kilitT) > 0.5 / 24).length;

  return {
    ag: agAdi,
    tampon_ms: hazir.tampon, ilk_hareket_ms: hazir.hareket,
    bosluk_ms: hazir.tampon !== null && hazir.hareket !== null ? hazir.hareket - hazir.tampon : null,
    hareket_hazirliktan_once: hazir.hareket !== null && hazir.tampon !== null && hazir.hareket < hazir.tampon,
    bagimsiz_kacak_ornek: kacak,                 /* tampon kapaliyken kimildayan ornek sayisi (0 olmali) */
    kapali_ornek_sayisi: kapaliOrn.length,
    ilk3_sahne: hazir.sahne, olculen_mbit: hazir.mbit,
    zaman_asimi: hazir.hareket === null,
  };
}

(async () => {
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980', '--autoplay-policy=no-user-gesture-required',
      '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 600000,
  });
  const surum = await browser.version();
  const bcdp = await browser.target().createCDPSession();
  const bilgi = await bcdp.send('SystemInfo.getInfo').catch(() => null);
  const gpu = bilgi && bilgi.gpu ? bilgi.gpu.featureStatus : null;
  const hizlandirma = gpu ? ['gpu_compositing', 'rasterization', 'video_decode', 'webgl'].map((x) => x + '=' + (gpu[x] || '?')).join(' · ') : 'alinamadi';
  console.log(`TARAYICI : ${TARAYICI} · ${surum}`);
  console.log(`HIZLANDIRMA: ${hizlandirma}\n`);

  const ortanca = (a) => { const s = [...a].filter((x) => x != null).sort((x, y) => x - y); return s.length ? +s[Math.floor(s.length / 2)].toFixed(0) : null; };
  const sonuc = [];
  for (const agAdi of Object.keys(AGLAR)) {
    console.log(`${agAdi} · ${TEKRAR} kosum ...`);
    const k = [];
    for (let i = 0; i < TEKRAR; i++) {
      const r = await kosum(browser, agAdi);
      k.push(r);
      console.log(`  [${i + 1}/${TEKRAR}] tampon ${r.tampon_ms} ms · ilk hareket ${r.ilk_hareket_ms} ms · bosluk ${r.bosluk_ms} ms · once-hareket ${r.hareket_hazirliktan_once} · kacak ${r.bagimsiz_kacak_ornek}/${r.kapali_ornek_sayisi}`);
    }
    sonuc.push({
      ag: agAdi, kosum: k,
      tampon_ms_ortanca: ortanca(k.map((x) => x.tampon_ms)),
      ilk_hareket_ms_ortanca: ortanca(k.map((x) => x.ilk_hareket_ms)),
      bosluk_ms_ortanca: ortanca(k.map((x) => x.bosluk_ms)),
      kapi_hareket_once: k.some((x) => x.hareket_hazirliktan_once) ? 'KALDI' : 'GECTI',
      kapi_bagimsiz_kacak: k.some((x) => x.bagimsiz_kacak_ornek > 0) ? 'KALDI' : 'GECTI',
    });
  }
  await browser.close();

  const hukum = sonuc.every((s) => s.kapi_hareket_once === 'GECTI' && s.kapi_bagimsiz_kacak === 'GECTI') ? 'GECTI' : 'KALDI';
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/olc-tampon.cjs — yukleme tamponu olcumu. KAPI: ilk hareket hazirliktan once baslayamaz (motor izi + bagimsiz rAF ornekleyicisi, ikisi birden). BOSLUK rapor: hazirlik ile ilk hareket arasi.',
    olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, hizlandirma,
    senaryo: 'sabirsiz ziyaretci (yukleme sirasinda surekli kaydirma)', tekrar: TEKRAR,
    hukum, sonuc,
  }, null, 1));
  console.log(`\nHUKUM: ${hukum}\n→ ${CIKTI}`);
})().catch((e) => { console.error(e); process.exit(1); });
