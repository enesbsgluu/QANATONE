/* BOS TEST — kare yakalama duzeneginin KENDI gurultusu.
   6 Eyl 2026. Enes: "masaustu kare kiyasi guvenilmez; #tubes rAF ile
   kosuyor, getAnimations() donduramiyor, gurultu tabani 0-232/255 arasi
   oynuyor ve tubes kapatilinca bile sifirlanmiyor".

   NE OLCER: HICBIR SEY DEGISMEDEN ayni sayfadan iki kare alinir. Ideal
   fark SIFIR. Sifir degilse olculen sey degisiklik degil DUZENEK.

   ================= OLCUMLE ELENENLER (tur kaydi) =================
   · #tubes SUCLU DEGIL. Sokuldu, maxfark 250 -> 250 (hic degismedi) ve
     rAF cagri sayisi bile dusmedi: element DOM'dan gitse de dongu kosuyor.
   · Video currentTime kaymasi BELIRTI, sebep degil. `v.currentTime = 0`
     yazmak TUTMUYOR — motor 160 ms icinde uzerine yaziyor. (Ilk olcumum
     sabitlemeyi YAZDIKTAN HEMEN SONRA okuyup "tuttu" sanmisti; cekim
     aninda okununca 0,063 -> 0,104 ciktigi gorundu.)
   · Kaydirma iki cekim ARASINDA kaymiyor (130 -> 130 sabit) — ama
     kosumlar arasinda 120-162 arasi degisiyor, yani aracin "scrollY=0'da
     zaten sabit" varsayimi YANLIS.

   ================= GERCEK KOK SEBEP =================
   Iki ayri sey ust uste biniyordu:
   1. rAF SURUCULERI. getAnimations() yalniz WAAPI/CSS animasyonlarini
      gorur. Olculen UC rAF kaynagi var — en buyugu #tubes degil FILM
      MOTORU: motor.js 522 cagri · kabuk.js 366 · Film.astro 158.
      requestAnimationFrame'i no-op yapmak ucunu birden durdurur ve
      maxfark 250 -> 1-4'e duser.
   2. BOYANMAMIS YUZEY. rAF'i cok erken dondurmak sayfanin ILK BOYAMASINI
      yarida kesiyordu: ilk kare tamamen SIYAH (24 KB), ikincisi dolu
      (2,3 MB) -> %86-100 "fark". Sebep degisiklik degil, olculen seyin
      henuz var olmamasiydi. Ustelik perde en az ~2,7 sn suruyor, yani
      sabit 2500 ms bekleme perdeyi bazen ACIK yakaliyordu.

   ================= DUZENEK BU YUZDEN KENDINI DOGRULAR =================
   Sira: yukle -> PERDE KALKSIN (durum kapisi, sabit sure degil) ->
   dondur (rAF + WAAPI + video) -> DURULMA DOGRULA (ardisik iki kare
   birebir ayni olana kadar) -> ancak sonra olc.
   Bos kare (tek renk) yakalanirsa hukum HUKUMSUZ olur — 0 dondurmek
   olculememis bir kareyi "gecti" saymak olurdu.

   ENV: TEKRAR (5) · KOK · GORUNUM (masaustu|mobil) · KAPA (#tubes sok)
   Kosum: cd yeni && node film/olc-bos-kare.cjs */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const KOK = process.env.KOK || 'http://127.0.0.1:8790';
const TEKRAR = +(process.env.TEKRAR || 5);
const KAPA = process.env.KAPA === '1';
const GORUNUM = process.env.GORUNUM || 'masaustu';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const GORUNUMLER = { masaustu: [1440, 900, false], mobil: [390, 844, true] };

/* Bos kare esigi: tek renk yuzeyin standart sapmasi ~0'dir. */
const BOS_STDEV = 1.5;
/* Durulma: ardisik iki kare bu esigin altinda farkliysa sayfa durdu. */
const DURGUN_MAX = 0;
const DURULMA_DENEME = 30;
/* ARDISIK sabitlik sarti: TEK esleme yetmiyor — sayfa yavas boyanirken iki
   ardisik kare ayni cikip sonra dolmaya devam ediyordu (olculdu: durulma
   "0 tur" raporlanan kosumda k1 stdev 13, k2 stdev 55). */
const DURGUN_ARDISIK = 3;

const DONDUR = () => {
  /* 1) rAF SURUCULERI — yeni kayit kabul edilmez, kuyruktaki son callback
        kosar ve dongu kendini yeniden kaydedemedigi icin OLUR. */
  if (!window.__rafDonduruldu) {
    window.__rafDonduruldu = true;
    window.requestAnimationFrame = function () { return 0; };
  }
  /* 2) WAAPI/CSS */
  let kilit = 0, kalan = 0;
  for (const a of document.getAnimations()) {
    try {
      a.pause();
      if (a.timeline && a.timeline.constructor.name === 'DocumentTimeline') a.currentTime = 0;
      kilit++;
    } catch (_) { kalan++; }
  }
  /* 3) MEDYA — getAnimations() <video>'yu GORMEZ. rAF durduktan SONRA
        yazilir, yoksa motor uzerine yazar. */
  for (const v of document.querySelectorAll('video')) { try { v.pause(); } catch (_) {} }
  document.body.getBoundingClientRect();
  return { kilitlenen: kilit, kilitlenemeyen: kalan, scrollY: window.scrollY,
    video: [...document.querySelectorAll('video')].map((v) => +v.currentTime.toFixed(3)) };
};

async function olcum(buf) {
  const s = await sharp(buf).stats();
  const stdev = Math.max(...s.channels.map((c) => c.stdev));
  return { stdev: +stdev.toFixed(2), bos: stdev < BOS_STDEV };
}

async function fark(a, b) {
  const [ra, rb] = await Promise.all([
    sharp(a).raw().toBuffer({ resolveWithObject: true }),
    sharp(b).raw().toBuffer({ resolveWithObject: true }),
  ]);
  const A = ra.data, B = rb.data;
  if (A.length !== B.length) return { maxfark: 255, farkli_piksel: -1, farkli_oran: 100 };
  let max = 0, farkli = 0;
  const kanal = ra.info.channels;
  for (let i = 0; i < A.length; i += kanal) {
    let d = 0;
    for (let k = 0; k < Math.min(3, kanal); k++) d = Math.max(d, Math.abs(A[i + k] - B[i + k]));
    if (d > 0) { farkli++; if (d > max) max = d; }
  }
  return { maxfark: max, farkli_piksel: farkli, farkli_oran: +(100 * farkli * kanal / A.length).toFixed(4) };
}

(async () => {
  const [w, h, mob] = GORUNUMLER[GORUNUM];
  const clip = { x: 0, y: 0, width: w, height: Math.min(h, 900) };
  const b = await pt.launch({ executablePath: EXE, headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'] });
  const kosumlar = [];
  let rafKayit = null;

  for (let i = 0; i < TEKRAR; i++) {
    const p = await b.newPage();
    await p.evaluateOnNewDocument(() => {
      const orj = window.requestAnimationFrame.bind(window);
      window.__rafSayac = {};
      window.requestAnimationFrame = function (cb) {
        const yigin = (new Error().stack || '').split('\n').slice(2, 4)
          .map((s) => s.trim().replace(/^at\s+/, '')).join(' <- ') || 'bilinmeyen';
        window.__rafSayac[yigin] = (window.__rafSayac[yigin] || 0) + 1;
        return orj(cb);
      };
    });
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: mob, hasTouch: mob });
    await p.goto(KOK + '/', { waitUntil: 'networkidle0', timeout: 60000 });

    /* PERDE KAPISI — sabit sure DEGIL durum. Perde en az ~2,7 sn suruyor;
       2500 ms'lik sabit bekleme onu bazen ACIK yakaliyordu. */
    let perdeAsimi = false;
    try {
      await p.waitForFunction(() => {
        const e = document.querySelector('.fl-perde, #boot, .perde');
        if (!e) return true;
        const st = getComputedStyle(e);
        return st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0;
      }, { timeout: 15000, polling: 100 });
    } catch (_) { perdeAsimi = true; }
    await bekle(400);

    if (KAPA) { await p.evaluate(() => { const t = document.querySelector('#tubes'); if (t) t.remove(); }); await bekle(200); }

    const d = await p.evaluate(DONDUR);
    await bekle(160);   /* kuyruktaki son rAF callback'i tukensin */

    /* DURULMA KAPISI — ardisik iki kare birebir ayni olana kadar. Bu adim
       hem boyanmamis yuzeyi hem gecis artigini eler; sabit bekleme ikisini
       de garanti etmiyordu. */
    let onceki = await p.screenshot({ clip });
    let durgun = false, deneme = 0, ustuste = 0;
    for (; deneme < DURULMA_DENEME; deneme++) {
      await bekle(120);
      const simdi = await p.screenshot({ clip });
      const f2 = await fark(onceki, simdi);
      onceki = simdi;
      ustuste = f2.maxfark <= DURGUN_MAX ? ustuste + 1 : 0;
      if (ustuste >= DURGUN_ARDISIK) { durgun = true; break; }
    }

    const k1 = onceki;
    await bekle(160);
    const k2 = await p.screenshot({ clip });

    const [o1, o2] = await Promise.all([olcum(k1), olcum(k2)]);
    const f = await fark(k1, k2);
    const sonDurum = await p.evaluate(() => ({ scrollY: window.scrollY,
      video: [...document.querySelectorAll('video')].map((v) => +v.currentTime.toFixed(3)) }));
    rafKayit = await p.evaluate(() => window.__rafSayac || {});

    const hukumsuz = (o1.bos || o2.bos) ? 'BOS KARE' : (!durgun ? 'DURULMADI' : null);
    if (f.maxfark > 8 && !hukumsuz) {
      fs.writeFileSync(path.join(__dirname, `bos-kirmizi-k${i + 1}-a.png`), k1);
      fs.writeFileSync(path.join(__dirname, `bos-kirmizi-k${i + 1}-b.png`), k2);
    }
    kosumlar.push({ kosum: i + 1, ...f, hukumsuz, durgun, durulma_denemesi: deneme,
      stdev: [o1.stdev, o2.stdev], kilitlenen: d.kilitlenen, kilitlenemeyen: d.kilitlenemeyen,
      scrollY: [d.scrollY, sonDurum.scrollY],
      video_kaydi: JSON.stringify(d.video) !== JSON.stringify(sonDurum.video),
      perde_zaman_asimi: perdeAsimi });
    console.log(`  kosum ${i + 1}: maxfark ${f.maxfark}/255 · farkli ${f.farkli_piksel} px (%${f.farkli_oran})`
      + ` · durulma ${deneme} tur${durgun ? '' : ' (DURULMADI)'} · stdev [${o1.stdev},${o2.stdev}]`
      + ` · scrollY ${d.scrollY} · kilitlenen ${d.kilitlenen}${hukumsuz ? ' · HUKUMSUZ: ' + hukumsuz : ''}`);
    await p.close();
  }
  await b.close();

  const gecerli = kosumlar.filter((k) => !k.hukumsuz);
  const temiz = gecerli.filter((k) => k.maxfark === 0).length;
  const raf = Object.entries(rafKayit || {}).sort((a, b2) => b2[1] - a[1]).slice(0, 10);

  console.log(`\n=== BOS TEST (${GORUNUM}${KAPA ? ' · #tubes SOKULDU' : ''}) ===`);
  console.log(`gecerli kosum ${gecerli.length}/${TEKRAR} · maxfark [${gecerli.map((k) => k.maxfark).join(', ')}]`);
  const hukum = gecerli.length === 0 ? 'HUKUM YOK — hicbir kosum olculemedi'
    : temiz === gecerli.length ? 'DUZENEK SESSIZ (bos test 0)'
    : 'DUZENEK GURULTULU — sadakat farklari supheli';
  console.log(`HUKUM: ${hukum}`);
  console.log('\n=== rAF CAGIRANLAR ===');
  for (const [yigin, n] of raf) console.log(`  ${String(n).padStart(6)} × ${yigin}`);

  const cikti = path.join(__dirname, `olc-bos-kare${KAPA ? '-kapali' : ''}-${GORUNUM}.json`);
  fs.writeFileSync(cikti, JSON.stringify({
    _: 'BOS TEST — ayni sayfadan iki kare, ideal fark SIFIR. Sifir degilse olculen duzenektir.',
    olcum: new Date().toISOString(), gorunum: GORUNUM, tubes_sokuldu: KAPA, tekrar: TEKRAR,
    gecerli_kosum: gecerli.length, temiz_kosum: temiz, hukum, kosumlar,
    raf_cagiranlar: Object.fromEntries(raf),
  }, null, 1));
  console.log(`\n→ ${cikti}`);
  process.exit(gecerli.length === 0 ? 3 : temiz === gecerli.length ? 0 : 2);
})().catch((e) => { console.error(e); process.exit(1); });
