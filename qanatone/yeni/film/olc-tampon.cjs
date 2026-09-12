#!/usr/bin/env node
/* ============================================================
   YUKLEME TAMPONU OLCUMU v2 (2 Eyl 2026, Enes tavsiyesi).
   v1 sarti (kilit klip + komsu TAM) yavas-4G'de ~50 sn statik ekran
   bekletiyordu — olculdu ve Enes'e yazildi; karar geldi:
     "sahne1 tam, sahne2 kismi yeterli · 6 sn sert ust sinir: sure
      dolarsa hareket baslar, kalani akarken iner · sayac/yuzde/perde YOK"

   KAPILAR (talimattan):
   1. Uc ag icin uc deger YAN YANA: hareketin baslama ani + o andaki
      takilma sayisi (hareketten sonraki 10 sn penceresi).
   2. Ust sinir devreye girdiginde takilma oluyorsa SAYISI ve TOPLAM
      SURESI yazilir (rapor — kapi degil, Enes bilerek kabul etti).
   3. Dolu hatta ust sinir HIC devreye girmiyor — gosterilir (KAPI).
   4. atla ve isinlanma tamponu DELMEYE devam ediyor (KAPI, ayri kosum).
   5. Tampon her agda <= SINIR+tolerans aciliyor (KAPI). KIRMIZI-ONCE:
      bu rig motor v2'den ONCE kosuldu — eski motor 4G 9,1 s /
      yavas-4G ~50 s ile adiyla kirmizi yandi; motor degisince yesil.
   + v1'den kalan kapilar: hareket hazirliktan (tampon acilisindan) once
     baslayamaz; BAGIMSIZ rAF ornekleyicisinde tampon kapaliyken sifir
     kimildama (duzenek kendini dogrular, motor izine guvenilmez).

   TAKILMA SAYIMI: sunum kaydi (rVFC, GERCEKTEN boyanan kare) —
   hareket aninda + 10 sn penceresinde 100 ms'den uzun sunumsuz bosluk,
   yalniz FILM ILERLERKEN (bagimsiz ornekleyicinin T'siyle bakilir;
   bosluk boyunca gosterilen degismediyse film oturmus, sayilmaz).

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
const SINIR_MS = 6000;          /* motorun sert ust siniri (Enes) */
const SINIR_TOLERANS_MS = 700;  /* kare + zamanlayici gecikmesi payi */
const BOSLUK_ESIK_MS = 100;     /* olc-hiz ile ayni ev tanimi */
const PENCERE_MS = 10000;       /* hareket sonrasi takilma penceresi */

const AGLAR = {
  'dolu-hat': null,
  '4g': { downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8, latency: 60 },
  'yavas-4g': { downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (0.75 * 1024 * 1024) / 8, latency: 150 },
};

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const jest = (cdp, mesafe, hiz) => cdp.send('Input.synthesizeScrollGesture', {
  x: 720, y: 450, xDistance: 0, yDistance: -mesafe, speed: hiz, gestureSourceType: 'mouse', repeatCount: 0 });

/* Bagimsiz ornekleyici + sunum kaydi (motor izinden ayri). */
const ORNEKLEYICI = `(() => {
  window.__t = []; window.__sun = [];
  const dongu = () => {
    const f = window.__fl;
    if (f) __t.push({ t: +performance.now().toFixed(1), T: +f.gosterilenT.toFixed(4), acik: f.tamponMs !== null });
    requestAnimationFrame(dongu);
  };
  requestAnimationFrame(dongu);
  const bagla = () => {
    for (const v of document.querySelectorAll('video')) {
      if (v.__bagli || !v.requestVideoFrameCallback) continue;
      v.__bagli = true;
      const f = (now) => { __sun.push(+now.toFixed(1)); v.requestVideoFrameCallback(f); };
      v.requestVideoFrameCallback(f);
    }
  };
  bagla(); setInterval(bagla, 500);
})()`;

/* hareket penceresindeki takilmalar: sunum bosluklari, film ilerlerken */
function takilma(sun, iz, basMs, sonMs) {
  /* rig ornekleri performance.now saatinde; motor Ms'leri motor dogumuna
     gore — dogum ani rig tarafinda bilinmez, iz'deki ILK acik=true ani
     tampon acilisiyla esler ve kaydirma yapilir. */
  const s = sun.filter((t) => t >= basMs && t <= sonMs).sort((a, b) => a - b);
  /* YANLIS YESIL SUSMASI (2 Eyl, yavas-4g'de yakalandi): pencere boyunca
     hic sunum yoksa (klip inmemis, poster duruyor) bosluk da olmaz ve
     takilma 0 gorunur — o "0" temizlik degil korluktur. Ornek sayisi
     yazilir; okuyan sunum_ornek'e bakmadan 0'a inanmasin. */
  let sayi = 0, toplam = 0, enUzun = 0;
  const filmT = (t) => {
    let lo = 0, hi = iz.length - 1;
    if (!iz.length) return null;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (iz[m].t <= t) lo = m; else hi = m; }
    return iz[lo].T;
  };
  for (let i = 1; i < s.length; i++) {
    const d = s[i] - s[i - 1];
    if (d <= BOSLUK_ESIK_MS) continue;
    const T0 = filmT(s[i - 1]), T1 = filmT(s[i]);
    if (T0 === null || T1 === null || Math.abs(T1 - T0) < 0.02) continue;  /* film oturmus/duruk */
    sayi++; toplam += d; if (d > enUzun) enUzun = d;
  }
  return { sayi, toplam_ms: +toplam.toFixed(0), en_uzun_ms: +enUzun.toFixed(0),
    sunum_ornek: s.length, ...(s.length < 24 ? { not: 'sunum kit — klip inmemis olabilir, 0 koru sayilmasin' } : {}) };
}

async function sayfaAc(browser, agAdi) {
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
  await page.waitForFunction('!!window.__fl', { timeout: 60000 });
  return { page, cdp };
}

/* SABIRSIZ ziyaretci: yuklenirken kaydirir; hareket basladiktan sonra
   PENCERE_MS boyunca kaydirmayi surdurur (takilma penceresi). */
async function kosum(browser, agAdi) {
  const { page, cdp } = await sayfaAc(browser, agAdi);
  const t0 = Date.now();
  let d = null, hareketAn = null;
  while (Date.now() - t0 < 120000) {
    await jest(cdp, 900, 1400);
    d = await page.evaluate(() => ({
      tampon: window.__fl.tamponMs, hareket: window.__fl.ilkHareketMs,
      yol: window.__fl.tamponYolu, sahne: window.__fl.sahne().slice(0, 3).map((s) => s.durum),
    }));
    if (d.hareket !== null) { hareketAn = Date.now(); break; }
  }
  while (hareketAn !== null && Date.now() - hareketAn < PENCERE_MS) await jest(cdp, 900, 1400);
  await bekle(300);
  const kayit = await page.evaluate(() => ({ t: window.__t, sun: window.__sun }));
  await page.close();

  const kapaliOrn = kayit.t.filter((o) => !o.acik);
  const kilitT = kapaliOrn.length ? kapaliOrn[0].T : null;
  const kacak = kilitT === null ? 0
    : kapaliOrn.filter((o) => Math.abs(o.T - kilitT) > 0.5 / 24).length;
  /* rig saatinde hareket ani: ilk acik=true ornegi + motorun
     (ilkHareket - tampon) farki */
  const ilkAcik = kayit.t.find((o) => o.acik);
  const hareketRigMs = ilkAcik && d.tampon !== null && d.hareket !== null
    ? ilkAcik.t + (d.hareket - d.tampon) : null;
  const tak = hareketRigMs === null ? { sayi: null, toplam_ms: null, en_uzun_ms: null }
    : takilma(kayit.sun, kayit.t, hareketRigMs, hareketRigMs + PENCERE_MS);

  return {
    ag: agAdi, tampon_ms: d.tampon, ilk_hareket_ms: d.hareket, yol: d.yol,
    bosluk_ms: d.tampon !== null && d.hareket !== null ? d.hareket - d.tampon : null,
    hareket_hazirliktan_once: d.hareket !== null && d.tampon !== null && d.hareket < d.tampon,
    bagimsiz_kacak_ornek: kacak, kapali_ornek_sayisi: kapaliOrn.length,
    hareket_ani_takilma: tak, ilk3_sahne: d.sahne,
    zaman_asimi: d.hareket === null,
  };
}

/* TABAN GECERLILIK DAMGASI (2 Eyl 2026, Enes talimati; ayrintili
   gerekce olc-hiz.cjs'te). Bu rigde kosum-basina oynatma her agda
   mumkun degil (yavas hatta klip gec iner); RIG BASINA TEK pencere:
   dolu hatta sahne1 hazir olunca TABAN_SN sn SENTETIK SCRUB (sinus
   deseniyle currentTime — duz oynatma kirmizi-once kosumunda elendi,
   %100 CPU'yu gormedi; gerekce olc-hiz.cjs), ayni sayac (sunumsuz
   bosluk > esik). Taban asarsa TUM kosum ORTAM-GURULTULU damgasi
   tasir, hukum verilmez. */
const TABAN_SN = Number(process.env.TABAN_SN ?? 10);
const TABAN_TAVAN = Number(process.env.TABAN_TAVAN ?? 1);
async function tabanPenceresi(browser) {
  const { page } = await sayfaAc(browser, 'dolu-hat');
  await page.waitForFunction('window.__fl.sahne()[0].durum === "hazir"', { timeout: 60000 });
  const sun = await page.evaluate(async (ms) => {
    const v = document.querySelector('.fl-sahne video');
    if (!v || !v.src) return null;
    const eskiAkis = window.__fl.akis; window.__fl.akis = 0;
    const sure = Math.max(1, v.duration - 0.2);
    window.__sun.length = 0;
    await new Promise((res) => {
      /* ucgen dalga, sabit 1x tempo — sinusun tepe/dip duraklamasi
         yapisal bosluk uretiyordu (gerekce olc-hiz.cjs taban blogu) */
      const t0 = performance.now();
      const adim = () => {
        const gecen = performance.now() - t0;
        if (gecen >= ms) return res();
        const faz = (gecen / 1000) % (2 * sure);
        const hedef = faz < sure ? faz : 2 * sure - faz;
        if (Math.abs(v.currentTime - hedef) > 1 / 48) v.currentTime = hedef;
        requestAnimationFrame(adim);
      };
      requestAnimationFrame(adim);
    });
    window.__fl.akis = eskiAkis;
    return window.__sun.slice();
  }, TABAN_SN * 1000);
  await page.close();
  if (!sun || sun.length < 2) return { sayi: null, toplam_ms: null, sure_sn: TABAN_SN, gecerli: false, not: 'oynatma/sunum alinamadi' };
  let sayi = 0, toplam = 0;
  const s = [...sun].sort((a, b) => a - b);
  for (let i = 1; i < s.length; i++) { const d = s[i] - s[i - 1]; if (d > BOSLUK_ESIK_MS) { sayi++; toplam += d; } }
  return { sayi, toplam_ms: +toplam.toFixed(0), sure_sn: TABAN_SN, gecerli: sayi <= TABAN_TAVAN };
}

/* ATLA / ISINLANMA DELME KONTROLU (dolu hat, tek kosum yeter):
   sayfa acilir acilmaz sona yakina scrollTo + atla — tampon delinmeli,
   hareket 3 sn icinde baslamali, yol atla|teleport olmali. */
async function atlaKontrol(browser) {
  const { page } = await sayfaAc(browser, 'dolu-hat');
  await page.evaluate(() => { scrollTo(0, window.__fl.konum(window.__fl.toplam - 10)); window.__fl.atla(); });
  const basla = Date.now();
  let d = null;
  while (Date.now() - basla < 10000) {
    d = await page.evaluate(() => ({ hareket: window.__fl.ilkHareketMs, yol: window.__fl.tamponYolu }));
    if (d.hareket !== null) break;
    await bekle(100);
  }
  await page.close();
  return { yol: d.yol, hareket_ms: d.hareket,
    gecti: d.hareket !== null && d.hareket < 3000 && (d.yol === 'atla' || d.yol === 'teleport') };
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
  console.log(`HIZLANDIRMA: ${hizlandirma}`);
  console.log(`SINIR    : ${SINIR_MS} ms (+${SINIR_TOLERANS_MS} tolerans) · takilma penceresi ${PENCERE_MS} ms\n`);

  console.log('taban penceresi (dolu hat, sahne1 duz oynatma) ...');
  const taban = await tabanPenceresi(browser);
  console.log(`  taban ${taban.sayi} bosluk (${taban.toplam_ms} ms / ${taban.sure_sn} sn) → ${taban.gecerli ? 'sakin' : 'ORTAM GURULTULU'}\n`);

  const ortanca = (a) => { const s = [...a].filter((x) => x != null).sort((x, y) => x - y); return s.length ? +s[Math.floor(s.length / 2)].toFixed(0) : null; };
  const sonuc = [];
  for (const agAdi of Object.keys(AGLAR)) {
    console.log(`${agAdi} · ${TEKRAR} kosum ...`);
    const k = [];
    for (let i = 0; i < TEKRAR; i++) {
      const r = await kosum(browser, agAdi);
      k.push(r);
      console.log(`  [${i + 1}/${TEKRAR}] tampon ${r.tampon_ms} ms (${r.yol}) · hareket ${r.ilk_hareket_ms} ms · takilma ${r.hareket_ani_takilma.sayi} (${r.hareket_ani_takilma.toplam_ms} ms) · once-hareket ${r.hareket_hazirliktan_once} · kacak ${r.bagimsiz_kacak_ornek}/${r.kapali_ornek_sayisi}`);
    }
    sonuc.push({
      ag: agAdi, kosum: k,
      tampon_ms_ortanca: ortanca(k.map((x) => x.tampon_ms)),
      ilk_hareket_ms_ortanca: ortanca(k.map((x) => x.ilk_hareket_ms)),
      takilma_ortanca: ortanca(k.map((x) => x.hareket_ani_takilma.sayi)),
      takilma_toplam_ms_ortanca: ortanca(k.map((x) => x.hareket_ani_takilma.toplam_ms)),
      yol_hepsi: k.map((x) => x.yol),
      kapi_hareket_once: k.some((x) => x.hareket_hazirliktan_once) ? 'KALDI' : 'GECTI',
      kapi_bagimsiz_kacak: k.some((x) => x.bagimsiz_kacak_ornek > 0) ? 'KALDI' : 'GECTI',
      kapi_sinir: k.every((x) => x.tampon_ms !== null && x.tampon_ms <= SINIR_MS + SINIR_TOLERANS_MS) ? 'GECTI' : 'KALDI',
      /* dolu hatta ust sinir HIC devreye girmemeli (talimat: gosterilir) */
      ...(agAdi === 'dolu-hat'
        ? { kapi_dolu_hatta_sinirsiz: k.every((x) => x.yol !== 'sure-siniri') ? 'GECTI' : 'KALDI' } : {}),
    });
  }
  console.log('atla/isinlanma delme kontrolu ...');
  const atla = await atlaKontrol(browser);
  console.log(`  yol ${atla.yol} · hareket ${atla.hareket_ms} ms · ${atla.gecti ? 'GECTI' : 'KALDI'}`);
  await browser.close();

  const kapilar = sonuc.every((s) =>
    s.kapi_hareket_once === 'GECTI' && s.kapi_bagimsiz_kacak === 'GECTI'
    && s.kapi_sinir === 'GECTI' && (s.kapi_dolu_hatta_sinirsiz === undefined || s.kapi_dolu_hatta_sinirsiz === 'GECTI'))
    && atla.gecti;
  /* taban gurultuluyse hukum VERILMEZ — kapilar gecmis gorunse bile */
  const hukum = !taban.gecerli ? 'ORTAM-GURULTULU (hukum verilmez)' : (kapilar ? 'GECTI' : 'KALDI');
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/olc-tampon.cjs v2 — tampon: sahne1 tam + sahne2 kismi + 6 sn sinir. KAPILAR: hareket hazirliktan once baslamaz (motor izi + bagimsiz ornekleyici) · tampon <= sinir+tolerans her agda · dolu hatta sinir devreye girmez · atla/teleport deler. Takilma sayilari RAPOR (Enes bilerek kabul etti).',
    olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, hizlandirma,
    senaryo: 'sabirsiz ziyaretci (yukleme sirasinda surekli kaydirma) + atla kontrolu', tekrar: TEKRAR,
    sinir_ms: SINIR_MS, pencere_ms: PENCERE_MS,
    taban_tavan: TABAN_TAVAN, taban,
    hukum, sonuc, atla_kontrol: atla,
  }, null, 1));
  console.log(`\nHUKUM: ${hukum}\n→ ${CIKTI}`);
})().catch((e) => { console.error(e); process.exit(1); });
