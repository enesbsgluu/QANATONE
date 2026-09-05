/* HERO SUSU — SADAKAT KARELERI.
   Salinim 13 / 17,5 sn'lik sonsuz animasyon; kare almak icin FAZ SABITLENIR
   (getAnimations().currentTime elle yazilir), yoksa iki cekim ayni ani
   yakalamaz ve fark listesi anlamsiz olur.
   ENV: ETIKET (dosya oneki) · KOK */
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

(async () => {
  const b = await pt.launch({ executablePath: EXE, headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'] });
  const rapor = {};
  for (const [ad, w, h, mob] of [['mobil', 390, 844, true], ['masaustu', 1440, 900, false]]) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: mob, hasTouch: mob });
    await p.goto(KOK + '/', { waitUntil: 'networkidle0', timeout: 60000 });
    await bekle(2500);           /* giris animasyonlari bitsin */
    rapor[ad] = [];
    for (const faz of FAZLAR) {
      /* SALINIMI O FAZA SABITLE — ve gercekten sabitlendigini DOGRULA */
      /* ILK YAZIMIM YANLISTI: yalniz `.sus-suzul` sabitlenmisti, sayfanin
         OTEKI animasyonlari (hero arka planinin giris hareketi) iki cekimde
         farkli anda yakalandi ve masaustunde %21-33 "fark" uretti — o fark
         degisiklikten degil DUZENEKTEN geliyordu.
         Simdi SAYFADAKI HER animasyon durdurulur; zaman cizelgesi olanlar
         ayni ana kilitlenir. Kaydirma surucululer scrollY=0'da zaten sabit.
         DUZENEK KENDINI DOGRULAR: kilitlenemeyen animasyon SAYILIR ve
         raporlanir; sifir degilse fark listesi supheli demektir. */
      const d = await p.evaluate((t) => {
        let kilit = 0, kalan = 0;
        for (const a of document.getAnimations()) {
          try {
            a.pause();
            if (a.timeline && a.timeline.constructor.name === 'DocumentTimeline') {
              a.currentTime = t; kilit++;
            } else { kilit++; }            /* scroll surucusu: scrollY sabit */
          } catch (_) { kalan++; }
        }
        document.body.getBoundingClientRect();
        const bilgi = [...document.querySelectorAll('.sus-suzul')]
          .map((el) => ({ transform: getComputedStyle(el).transform }));
        return { kilitlenen: kilit, kilitlenemeyen: kalan, transformlar: bilgi };
      }, faz);
      await bekle(160);
      const dosya = path.join(DIZIN, `hero-${ETIKET}-${ad}-${faz}.png`);
      await p.screenshot({ path: dosya, clip: { x: 0, y: 0, width: w, height: Math.min(h, 900) } });
      rapor[ad].push({ faz, ...d, dosya: path.basename(dosya) });
    }
    await p.close();
  }
  fs.writeFileSync(path.join(DIZIN, `hero-${ETIKET}.json`), JSON.stringify(rapor, null, 1));
  console.log(JSON.stringify(rapor, null, 1));
})().catch((e) => { console.error('HATA', e && e.message); process.exit(1); });
