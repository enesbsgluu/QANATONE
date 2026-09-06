/* HERO SUSU — SADAKAT KARELERI.
   Salinim 13 / 17,5 sn'lik sonsuz animasyon; kare almak icin FAZ SABITLENIR
   (getAnimations().currentTime elle yazilir), yoksa iki cekim ayni ani
   yakalamaz ve fark listesi anlamsiz olur.
   ENV: ETIKET (dosya oneki) · KOK · TEK_GORUNUM (mobil|masaustu)

   ================= DONDURMA YENIDEN YAZILDI (7 Eyl 2026) =================
   Enes: "masaustu kare kiyasi guvenilmez". `olc-bos-kare.cjs` ile olculdu
   (BOS TEST: ayni sayfadan iki kare, ideal fark SIFIR). Eski hali burada
   YALNIZ getAnimations() ile kilitliyordu ve bos test %80-85 fark, maxfark
   250/255 veriyordu — yani bu araciN o gune kadarki MASAUSTU fark
   listeleri suphelidir.

   Olcumle elenenler: #tubes suclu DEGIL (sokuldu, 250 -> 250) · video
   currentTime'i elle sifirlamak TUTMUYOR (motor 160 ms icinde uzerine
   yaziyor) · kaydirma iki cekim ARASINDA kaymiyor.

   Bulunan sebepler ve karsiliklari (sira onemli):
   1. rAF SURUCULERI — getAnimations() yalniz WAAPI/CSS gorur. Uc kaynak
      olculdu, en buyugu #tubes degil FILM MOTORU (motor.js 522 cagri ·
      kabuk.js 366 · Film.astro 158). requestAnimationFrame no-op yapilir.
   2. SONRADAN DOGAN ANIMASYON — dondurma aninda 85 animasyon vardi,
      700 ms sonra 131 oldu ve KOSUYORLARDI (sk-gir/sk-cubuk, Intersection
      Observer ile dogan giris animasyonlari; IO rAF'a bagli degildir).
      Tek seferlik getAnimations() bunlari kaciriyordu -> KALICI CSS kurali
      enjekte edilir, dogani da dogar dogmaz durdurur.
   3. BOYANMAMIS YUZEY — erken dondurma ilk boyamayi yarida kesiyordu
      (kare tamamen SIYAH). -> DURULMA kapisi + bos kare denetimi.
   4. KAYDIRMA — "scrollY=0'da zaten sabit" varsayimi YANLISTI, sayfa
      kendiliginden kayiyor (0-162 arasi). -> scrollTo(0,0) kilidi.
   5. PERDE — gercek perde `#perde.sus-perde`. Ilk yazdigim kapi
      `.fl-perde/#boot/.perde` ariyordu, HICBIRINI tutmuyordu: kapi aninda
      geciyor ve mobilde TAMAMEN SIYAH kare olculuyordu.

   Dogrulama: bos test masaustu ve mobilde 3/3 SESSIZ (maxfark 0).
   Bekcisi `yeni/test/olc-esik.test.mjs` — dondurma sirasi bu iki dosyada
   AYRISIRSA test kirmizi yanar (olc-* araclari kasten kendine yeter,
   ortak modul yok, drift'i test kapatir). */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const KOK = process.env.KOK || 'http://127.0.0.1:8790';
const ETIKET = process.env.ETIKET || 'once';
const DIZIN = __dirname;
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/* salinimin dort fazi: 0 (taban) · 3250 (tepe A) · 6500 (orta) · 8750 */
const FAZLAR = [0, 3250, 6500, 8750];
const BOS_STDEV = 1.5;      /* tek renk yuzeyin stdev'i ~0 */
const DURGUN_ARDISIK = 3;   /* TEK esleme yetmiyor: yavas boyanan sayfa iki
                               ardisik kareyi ayni gosterip sonra doluyordu */
const DURULMA_DENEME = 30;

/* olc-bos-kare.cjs ile BIREBIR AYNI SIRA — ayrisirsa olc-esik testi yanar */
const DONDUR = (t) => {
  if (!window.__rafDonduruldu) {
    window.__rafDonduruldu = true;
    window.requestAnimationFrame = function () { return 0; };
  }
  if (!document.getElementById('__dondurmaKurali')) {
    const st = document.createElement('style');
    st.id = '__dondurmaKurali';
    st.textContent = '*,*::before,*::after{animation-play-state:paused !important;'
      + 'transition:none !important;caret-color:transparent !important}';
    document.head.appendChild(st);
  }
  let kilit = 0, kalan = 0;
  for (const a of document.getAnimations()) {
    try {
      a.pause();
      if (a.timeline && a.timeline.constructor.name === 'DocumentTimeline') { a.currentTime = t; kilit++; }
      else kilit++;
    } catch (_) { kalan++; }
  }
  for (const v of document.querySelectorAll('video')) { try { v.pause(); } catch (_) {} }
  try { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); } catch (_) {}
  document.body.getBoundingClientRect();
  return { kilitlenen: kilit, kilitlenemeyen: kalan, scrollY: window.scrollY,
    transformlar: [...document.querySelectorAll('.sus-suzul')].map((el) => ({ transform: getComputedStyle(el).transform })) };
};

async function ayni(a, b) {
  const sharp = require('sharp');
  const [ra, rb] = await Promise.all([
    sharp(a).raw().toBuffer({ resolveWithObject: true }),
    sharp(b).raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (ra.data.length !== rb.data.length) return false;
  return Buffer.compare(ra.data, rb.data) === 0;
}

async function bosMu(buf) {
  const sharp = require('sharp');
  const s = await sharp(buf).stats();
  return Math.max(...s.channels.map((c) => c.stdev)) < BOS_STDEV;
}

(async () => {
  const b = await pt.launch({ executablePath: EXE, headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'] });
  const rapor = {};
  const tek = process.env.TEK_GORUNUM;
  const gorunumler = [['mobil', 390, 844, true], ['masaustu', 1440, 900, false]]
    .filter(([ad]) => !tek || ad === tek);

  for (const [ad, w, h, mob] of gorunumler) {
    const p = await b.newPage();
    const clip = { x: 0, y: 0, width: w, height: Math.min(h, 900) };
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: mob, hasTouch: mob });
    await p.goto(KOK + '/', { waitUntil: 'networkidle0', timeout: 60000 });

    /* PERDE KAPISI — sabit sure DEGIL DURUM (perde en az ~2,7 sn) */
    let perdeAsimi = false;
    try {
      await p.waitForFunction(() => {
        const e = document.querySelector('#perde, .sus-perde, .fl-perde, #boot');
        if (!e) return true;
        const st = getComputedStyle(e);
        return st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0;
      }, { timeout: 15000, polling: 100 });
    } catch (_) { perdeAsimi = true; }
    await bekle(400);

    rapor[ad] = [];
    for (const faz of FAZLAR) {
      const d = await p.evaluate(DONDUR, faz);
      await bekle(160);

      /* DURULMA KAPISI — ardisik uc kare birebir ayni olana kadar; her
         turda YENIDEN dondurulur ki sonradan dogan animasyon da kilitlensin */
      let onceki = await p.screenshot({ clip });
      let durgun = false, ustuste = 0;
      for (let n = 0; n < DURULMA_DENEME; n++) {
        await bekle(120);
        await p.evaluate(DONDUR, faz);
        const simdi = await p.screenshot({ clip });
        ustuste = (await ayni(onceki, simdi)) ? ustuste + 1 : 0;
        onceki = simdi;
        if (ustuste >= DURGUN_ARDISIK) { durgun = true; break; }
      }

      const bos = await bosMu(onceki);
      const dosya = path.join(DIZIN, `hero-${ETIKET}-${ad}-${faz}.png`);
      fs.writeFileSync(dosya, onceki);
      /* HUKUMSUZ != FARK YOK. Olculememis kareyi "ayni" saymak, bu turun
         kapattigi yanlis yesilin ta kendisi olurdu. */
      const hukumsuz = bos ? 'BOS KARE' : (!durgun ? 'DURULMADI' : (perdeAsimi ? 'PERDE ZAMAN ASIMI' : null));
      rapor[ad].push({ faz, ...d, durgun, bos, hukumsuz, dosya: path.basename(dosya) });
      if (hukumsuz) console.error(`  !! ${ad} faz ${faz}: HUKUMSUZ (${hukumsuz})`);
    }
    await p.close();
  }
  fs.writeFileSync(path.join(DIZIN, `hero-${ETIKET}.json`), JSON.stringify(rapor, null, 1));
  console.log(JSON.stringify(rapor, null, 1));
  const hukumsuzSayi = Object.values(rapor).flat().filter((k) => k.hukumsuz).length;
  if (hukumsuzSayi) { console.error(`\n${hukumsuzSayi} kare HUKUMSUZ — fark listesi bu karelerde kurulamaz.`); process.exit(3); }
})().catch((e) => { console.error('HATA', e && e.message); process.exit(1); });
