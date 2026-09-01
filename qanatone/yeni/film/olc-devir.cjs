#!/usr/bin/env node
/* DEVIR v3 OLCUMU (31 Agu 2026) — "video ekrana yakinlasir, sayfa olceklenmez".
   KAPILAR (Enes):
     1. devir aninda sayfa olcegi TAM 1,0 (govde transform: none)
     2. kapanan eksende fark < 2 px
     3. tasan eksende tasma OLCULUP YAZILIR; bosluk 0
     4. 1,6 · 1,778 · 2,0 goruntu alani oranlarinda AYRI olculur
     5. devir penceresinde dusen kare 0
     6. devir anindaki olcek hizi ile videonun son kare hizi farki YAZILIR

   DUZENEK KENDINI DOGRULAR (kare-yakalama dersi): surucunun kendi bildirdigi
   sayilara guvenilmez — oturmus halin dortgen kenarlari, uygulanmis CSS
   matrisinden (getComputedStyle) BAGIMSIZ yeniden hesaplanir ve surucununkiyle
   kiyaslanir. Ikisi tutmazsa o kosum GUVENILMEZ.
   Fade ANI kaydi (kapi 2) surucunun anlik dokumu; ayni kod yolu oturmus halde
   matrisle dogrulandigi icin ani dokum da o kadar guvenilir.

   VARIS: son 4 sn 1x hizla rAF-scrollTo (kendini dogrular: sapma sayilir);
   scroll ray sonunda durur, motorun yayi filmi sona oturtur, devir kendi
   tetigiyle baslar — devir SCROLL'DAN DEGIL ZAMANDAN surulur, olcum da oyle.

   Kullanim: node yeni/film/olc-devir.cjs   (TARAYICI=chrome|brave, HEADLESS=0)
   Cikti: yeni/film/olc-devir.json + kontak/olc-devir-*.png */
const path = require('path');
const fs = require('fs');
const http = require('http');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const DIST = path.join(__dirname, '..', '..', 'dist');
const CIKTI = path.join(__dirname, 'olc-devir.json');
const KONTAK = path.join(__dirname, 'kontak');
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'chrome';
const CHROME = TARAYICILAR[TARAYICI] || TARAYICI;
const HEADLESS = process.env.HEADLESS === '0' ? false : 'new';
const PORT = 8944;
const MIME = { '.mp4': 'video/mp4', '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json' };

/* kapi 4: uc goruntu alani orani. 1,6 dortgenin oranindan (1,693) DAR ->
   dikey kapanir; 1,778 ve 2,0 genis -> yatay kapanir. */
const GORUNUMLER = [
  { ad: '1.6', w: 1440, h: 900 },
  { ad: '1.778', w: 1920, h: 1080 },
  { ad: '2.0', w: 1600, h: 800 },
];

function sunucu() {
  return new Promise((res) => {
    const s = http.createServer((req, rp) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      let f = path.join(DIST, u);
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!f.startsWith(DIST) || !fs.existsSync(f)) { rp.writeHead(404); return rp.end('yok'); }
      const st = fs.statSync(f), mime = MIME[path.extname(f)] || 'application/octet-stream', rng = req.headers.range;
      if (rng) {
        const m = /bytes=(\d*)-(\d*)/.exec(rng), a = m[1] ? +m[1] : 0, b = m[2] ? +m[2] : st.size - 1;
        rp.writeHead(206, { 'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1, 'Cache-Control': 'no-store' });
        fs.createReadStream(f, { start: a, end: b }).pipe(rp);
      } else {
        rp.writeHead(200, { 'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Content-Length': st.size, 'Cache-Control': 'no-store' });
        fs.createReadStream(f).pipe(rp);
      }
    });
    s.listen(PORT, '127.0.0.1', () => res(s));
  });
}

/* sayfa ici surucu: son N sn'yi 1x hizla scrollTo ile kat eder, sapmayi sayar */
const SURUCU = `
window.VARIS = (sn) => new Promise((res) => {
  const F = window.__fl; const T1 = F.toplam, T0 = Math.max(0, T1 - sn);
  const ms = sn * 1000; const t0 = performance.now();
  let sapma = 0, adim = 0; const raf = [];
  const ad = () => {
    raf.push(performance.now());
    const u = Math.min(1, (performance.now() - t0) / ms);
    const y = Math.round(F.konum(T0 + (T1 - T0) * u));
    scrollTo(0, y); adim++;
    if (Math.abs(scrollY - y) > 1.5) sapma++;
    if (u < 1) requestAnimationFrame(ad); else res({ sapma, adim, raf });
  };
  requestAnimationFrame(ad);
});`;

const medyan = (a) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };

async function kos(g) {
  const b = await pt.launch({ executablePath: CHROME, headless: HEADLESS, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist', ...(HEADLESS ? [] : [`--window-size=${g.w + 20},${g.h + 100}`])] });
  const p = await b.newPage();
  const uyari = [];
  p.on('pageerror', (e) => uyari.push(String(e).slice(0, 140)));
  p.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') uyari.push(m.text().slice(0, 140)); });
  await p.setViewport({ width: g.w, height: g.h });
  await p.evaluateOnNewDocument(SURUCU);
  await p.goto(`http://127.0.0.1:${PORT}/yeni/film/`, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction('window.__fl && __fl.hazir', { timeout: 180000 });
  /* AZALT=1 (efekt turu, 31 Agu aksam): kapanis SADE yolda kosulsun —
     TV cokusu son-hal transformunu (scaleY ~ 0) birakiyor, oturmus-hal
     matris dogrulamasi ancak sade yolda anlamli. Geometri kapilari
     kapanis efektinden bagimsizdir; reduce SONRADAN emule edilir ki
     motor yuklensin. */
  if (process.env.AZALT === '1') {
    const cdpA = await p.createCDPSession();
    await cdpA.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  }

  const tarayici = await p.evaluate(() => {
    let gpu = 'yok';
    try { const c = document.createElement('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl');
      const d = gl && gl.getExtension('WEBGL_debug_renderer_info'); gpu = d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : (gl ? 'uzanti yok' : 'webgl yok'); } catch (e) { gpu = 'hata'; }
    return { ua: navigator.userAgent.match(/(Chrome|Brave)[^ ]*/)?.[0] || navigator.userAgent.slice(0, 40), gpu, hizlandirma: /swiftshader|llvmpipe|software/i.test(gpu) ? 'YAZILIM' : 'donanim', dpr: devicePixelRatio };
  });

  /* sona yakin bir noktaya atla, SON klibin inmesini bekle, 1x varis sur */
  await p.evaluate(() => { scrollTo(0, __fl.konum(__fl.toplam - 4)); __fl.atla(); });
  await p.waitForFunction('(() => { const s = __fl.sahne(); return s[s.length - 1].durum === "hazir"; })()', { timeout: 120000 });

  /* ISINMA + GERI YOLU SINAMASI (olculdu: partinin ILK devri soguk boru
     hattinda 43,6 ms'lik tek takilma yedi; gercek kullanici sona 4+ dk
     scrub'la gelir, hatti coktan isinmistir). Ilk devir isinmadir; sonra
     geri sarilir — bu adim ayni zamanda devrin GERI yolunu (cozulme:
     transform '', siniflar kalkti, s=1) sinar — ve OLCUM ikinci devirden
     yapilir. */
  await p.evaluate(() => VARIS(4));
  await p.waitForFunction('window.__devir && __devir.kayit.tamMs !== null', { timeout: 20000 });
  await p.evaluate(() => { scrollTo(0, __fl.konum(__fl.toplam - 3)); __fl.atla(); });
  await p.waitForFunction('window.__devir && !__devir.aktif() && __devir.s() === 1 && !document.documentElement.dataset.devir', { timeout: 15000 });
  const geriYolu = await p.evaluate(() => ({
    transform: document.querySelector('.fl-yapis').style.transform || '(bos)',
    sinif: document.documentElement.className,
    govdeGorunur: getComputedStyle(document.getElementById('fl-govde')).opacity,
  }));

  const varis = await p.evaluate(() => VARIS(3));
  /* devir tetiklenip TAMAMLANANA ve yay oturana kadar bekle */
  await p.waitForFunction('window.__devir && __devir.kayit.tamMs !== null', { timeout: 20000 });
  await p.waitForFunction('Math.abs(__devir.s() - __devir.geo().S) < 5e-4 && Math.abs(__devir.hiz()) < 5e-3', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 200));
  fs.mkdirSync(KONTAK, { recursive: true });
  await p.screenshot({ path: path.join(KONTAK, `olc-devir-${g.ad}.png`) });

  const v = await p.evaluate(() => {
    const D = window.__devir, G = D.geo(), K = D.kayit;
    const yapis = document.querySelector('.fl-yapis');
    const st = getComputedStyle(yapis);
    const govde = document.getElementById('fl-govde');
    return {
      vw: innerWidth, vh: innerHeight, kunye: D.kunye, sert: D.sert, fadeMs: D.fadeMs,
      geo: G, s: D.s(),
      matris: st.transform, orijin: st.transformOrigin,
      sayfaTransform: govde ? getComputedStyle(govde).transform : 'yok',
      sayfaOpaklik: govde ? getComputedStyle(govde).opacity : 'yok',
      devirDurum: document.documentElement.dataset.devir || null,
      v0: K.v0, basMs: K.basMs, fadeBasMs: K.fadeBasMs, tamMs: K.tamMs, eskiYuklendiMs: K.eskiYuklendiMs ?? null,
      fadeGeo: K.fadeGeo, kareler: K.kareler, iz: K.iz,
      tavan: __fl.tavan, akis: __fl.akis, sertMotor: __fl.sert,
    };
  });

  await b.close();

  /* ---- BAGIMSIZ DOGRULAMA: CSS matrisinden dortgen kenarlari ---- */
  const m = /matrix\(([^)]+)\)/.exec(v.matris);
  const [ma, , , md, me, mf] = m ? m[1].split(',').map(Number) : [1, 0, 0, 1, 0, 0];
  const [ox, oy] = v.orijin.split(' ').map(parseFloat);
  const G = v.geo;
  const don = (x, sx, o, t) => o + sx * (x - o) + t;   /* orijinli olcek + kaydirma */
  const ken = {
    sol: don(G.cx - G.qg / 2, ma, ox, me), sag: don(G.cx + G.qg / 2, ma, ox, me),
    ust: don(G.cy - G.qh / 2, md, oy, mf), alt: don(G.cy + G.qh / 2, md, oy, mf),
  };
  const bosluk = { sol: +ken.sol.toFixed(2), sag: +(v.vw - ken.sag).toFixed(2), ust: +ken.ust.toFixed(2), alt: +(v.vh - ken.alt).toFixed(2) };
  const eksen = G.kapanan;                             /* 'yatay' | 'dikey' */
  const kapanan = eksen === 'yatay' ? [bosluk.sol, bosluk.sag] : [bosluk.ust, bosluk.alt];
  const tasan = eksen === 'yatay' ? { ust: -bosluk.ust, alt: -bosluk.alt } : { sol: -bosluk.sol, sag: -bosluk.sag };

  /* dusen kare (kapi 5): devir penceresi = basMs..tamMs rAF araliklari.
     KADANS = en kucuk kararli aralik (10. yuzdelik) — ekran 120/144 Hz
     olabilir, medyan karisik temposta yaniltir. Dusen = kadansin 1,5
     katini asan aralik (bir vsync kacti). TANI: en buyuk araliklarin
     fade/bas anina gore konumu yazilir — kacak BIZIM karemizse (sinif
     degisimi, getComputedStyle) sistematiktir ve kod duzeltir. */
  const pencere = v.kareler.filter((t) => t >= v.basMs && t <= (v.tamMs ?? Infinity));
  const aral = pencere.slice(1).map((t, i) => t - pencere[i]);
  const sirali = [...aral].sort((a, b) => a - b);
  const kadans = sirali.length ? sirali[Math.floor(sirali.length * 0.1)] : 16.7;
  const med = medyan(aral) || 16.7;
  /* DUSEN KARE ESIGI = 60 Hz karesinin 1,5 kati (25 ms), kadanstan BAGIMSIZ.
     Neden: bu panel 144 Hz ve tarayici DVFS ile 144/120/60 arasinda
     geziniyor (kadans 7-8,5 ms, medyan 9-14 ms ayni pencerede) — kadansa
     bagli esik 60 Hz'lik NORMAL kareleri dusen sayiyordu (yanlis kirmizi).
     25 ms ustu ise her kadansta gercek bir takilmadir. Kadans ve dagilim
     yine de yazilir — DVFS salinimi kayitta gorunur kalir, hukum Enes'te. */
  const dusenler = aral.map((d, i) => ({ d: +d.toFixed(1), i, tBas: +(pencere[i + 1] - v.basMs).toFixed(0),
    tFade: v.fadeBasMs ? +(pencere[i + 1] - v.fadeBasMs).toFixed(0) : null,
    exec: v.iz && v.iz[i + 1] ? v.iz[i + 1][2] : null }))
    .filter((x) => x.d > 25);
  const dusen = dusenler.length;
  /* TABAN: devirden onceki duz scrub (VARIS'in son 1,5 sn'si) ayni esikle —
     dusen kareler devire mi ait, makinenin genel gurultusu mu, ayrisir. */
  const varisSon = varis.raf.filter((t) => t >= varis.raf[varis.raf.length - 1] - 1500);
  const tabanAral = varisSon.slice(1).map((t, i) => t - varisSon[i]);
  const tabanDusen = tabanAral.filter((d) => d > 25).length;

  /* ilk kare olcek hizi (bilgi): iz [t,s] ilk iki ornekten */
  const ilkHiz = v.iz.length >= 2 ? (v.iz[1][1] - v.iz[0][1]) / ((v.iz[1][0] - v.iz[0][0]) / 1000) : null;

  /* surucu fade-ani dokumu ile bagimsiz oturmus-hal kiyasi */
  const surucuKen = (() => {   /* surucunun ayni formulle bekledigi oturmus kenarlar */
    const u = 1, mx = G.cx + G.txSon * u, my = G.cy + G.tySon * u, s = v.s;
    return { sol: mx - G.qg * s / 2, sag: mx + G.qg * s / 2, ust: my - G.qh * s / 2, alt: my + G.qh * s / 2 };
  })();
  const tutarlilik = Math.max(...['sol', 'sag', 'ust', 'alt'].map((k) => Math.abs(surucuKen[k] - ken[k])));

  const kapilar = {
    sayfa_olcek_1: { deger: v.sayfaTransform, fadeAninda: v.fadeGeo && v.fadeGeo.sayfa_transform, gecti: v.sayfaTransform === 'none' && !!v.fadeGeo && v.fadeGeo.sayfa_transform === 'none' },
    kapanan_eksen_2px: { eksen, fadeAninda_px: v.fadeGeo ? (eksen === 'yatay' ? [v.fadeGeo.bosluk_px.sol, v.fadeGeo.bosluk_px.sag] : [v.fadeGeo.bosluk_px.ust, v.fadeGeo.bosluk_px.alt]) : null,
      oturmus_px: kapanan.map((x) => +x.toFixed(2)),
      gecti: !!v.fadeGeo && kapanan.every((x) => Math.abs(x) < 2) },
    tasma_ve_bosluk: { tasan_eksen_px: tasan, bosluk_px: bosluk,
      gecti: Math.max(bosluk.sol, bosluk.sag, bosluk.ust, bosluk.alt) <= 0.5 },
    dusen_kare: { pencere_kare: pencere.length, kadans_ms: +kadans.toFixed(1), medyan_ms: +med.toFixed(1), taban_dusen_1500ms: tabanDusen, dusen, dusenler: dusenler.slice(0, 8), gecti: dusen === 0 },
    hiz_farki: { video: v.v0 && v.v0.video, bizim: v.v0 && v.v0.bizim, fark: v.v0 && +(v.v0.bizim - v.v0.video).toFixed(9),
      tempo_varis: v.v0 && v.v0.tempo, ilk_kare_olcek_hizi: ilkHiz && +ilkHiz.toFixed(5), gecti: !!v.v0 && Math.abs(v.v0.bizim - v.v0.video) < 1e-9 },
  };
  const gecti = Object.values(kapilar).every((k) => k.gecti) && tutarlilik < 0.5 && varis.sapma === 0;

  return {
    gorunum: g.ad, olcu: `${g.w}x${g.h}`, tarayici, uyari: uyari.slice(0, 6),
    varis: { sapma: varis.sapma, adim: varis.adim }, geri_yolu: geriYolu, kunye: v.kunye, devir_sert: v.sert, fade_ms: v.fadeMs,
    hedef_olcek: +G.S.toFixed(5), oturan_olcek: +v.s.toFixed(5), kapanan_eksen: eksen,
    devir_suresi_ms: v.tamMs && v.basMs ? Math.round(v.tamMs - v.basMs) : null,
    fade_gecikme_ms: v.fadeBasMs && v.basMs ? Math.round(v.fadeBasMs - v.basMs) : null,
    devir_durum: v.devirDurum, sayfa_opaklik: v.sayfaOpaklik,
    eski_giris_yuklendi: v.eskiYuklendiMs !== null,
    matris: v.matris, bagimsiz_kenar_px: ken, tutarlilik_px: +tutarlilik.toFixed(3),
    kapilar, hukum: gecti ? 'GECTI' : 'KALDI',
  };
}

/* TEKRARLI HUKUM (kayit disiplini: takilma sayisi tek kosumda hukum vermez
   — prolog-kapanis-v2 + Lighthouse medyanli olcum dersleri; olculdu:
   makine DVFS ile kosumdan kosuma 8-18 ms kadans geziyor, ayni kod ayni
   gunde 0 da 14 de verdi). Geometri kapilari deterministik: HER kosumda
   gecmeli. Dusen kare: TEKRAR kosum, hukum MEDYANDAN; taban yaninda. */
const TEKRAR = Number(process.env.TEKRAR || 3);
(async () => {
  const srv = await sunucu();
  const sonuc = { _: 'yeni/film/olc-devir.cjs — devir v3 kapilari: sayfa 1,0 · kapanan <2px · tasma yazildi/bosluk 0 · 3 oran · dusen kare 0 (TEKRAR kosum medyani) · hiz farki. Bagimsiz dogrulama CSS matrisinden.', olcum: new Date().toISOString(), tarayici_istek: TARAYICI, headless: HEADLESS !== false, tekrar: TEKRAR,
    /* AZALT damgasi (2 Eyl): oturmus-hal matris dogrulamasi ANCAK sade
       yolda (AZALT=1) anlamli — TV cokusu scaleY~0 birakir, bosluk
       ust/alt ~yarim ekran cikar ve tasma kapisi YANLIS KIRMIZI olur
       (olculdu, 2 Eyl: 538/398 px bosluk + 565 px tutarlilik). Kosul
       artik ciktiya yazilir ki hangi yolda olculdugu tartisilmasin. */
    azalt: process.env.AZALT === '1', kosum: [] };
  for (const g of GORUNUMLER) {
    process.stdout.write(`\n== ${g.ad} (${g.w}x${g.h}) ==\n`);
    try {
      const tekrarlar = [];
      for (let i = 0; i < TEKRAR; i++) {
        const t = await kos(g);
        tekrarlar.push(t);
        const dk = t.kapilar.dusen_kare;
        console.log(` #${i + 1} dusen ${dk.dusen} (taban ${dk.taban_dusen_1500ms}, kadans ${dk.kadans_ms} ms) · devir ${t.devir_suresi_ms} ms · tutarlilik ${t.tutarlilik_px} px`);
      }
      const r = tekrarlar[0];
      const dusenler = tekrarlar.map((x) => x.kapilar.dusen_kare.dusen);
      const dusenMedyan = medyan(dusenler);
      r.kapilar.dusen_kare = {
        tekrar_dusen: dusenler, tekrar_taban: tekrarlar.map((x) => x.kapilar.dusen_kare.taban_dusen_1500ms),
        medyan_dusen: dusenMedyan, ayrinti: tekrarlar.map((x) => x.kapilar.dusen_kare), gecti: dusenMedyan === 0,
      };
      const geometriHer = tekrarlar.every((x) => x.kapilar.sayfa_olcek_1.gecti && x.kapilar.kapanan_eksen_2px.gecti
        && x.kapilar.tasma_ve_bosluk.gecti && x.kapilar.hiz_farki.gecti && x.tutarlilik_px < 0.5);
      r.hukum = geometriHer && dusenMedyan === 0 ? 'GECTI' : 'KALDI';
      sonuc.kosum.push(r);
      console.log(` hedef olcek ${r.hedef_olcek} · kapanan ${r.kapanan_eksen} · devir ${r.devir_suresi_ms} ms`);
      for (const [ad, k] of Object.entries(r.kapilar)) console.log(`  ${k.gecti ? 'GECTI' : 'KALDI'}  ${ad}  ${JSON.stringify(k).slice(0, 150)}`);
      console.log(` => ${r.hukum}`);
    } catch (e) {
      sonuc.kosum.push({ gorunum: g.ad, hata: String(e).slice(0, 300), hukum: 'KOSUM DUSTU' });
      console.log(' HATA ' + String(e).slice(0, 200));
    }
  }
  srv.close();
  fs.writeFileSync(CIKTI, JSON.stringify(sonuc, null, 1));
  console.log(`\n→ ${CIKTI}`);
  process.exit(sonuc.kosum.every((k) => k.hukum === 'GECTI') ? 0 : 1);
})();
