#!/usr/bin/env node
/* DESTE GECISI — ZOOM'DAN BAGIMSIZ MI? EGRI KIYASI (8 Eyl 2026).

   DUNKU OLCUMUN ACIGI: `olc-deste-aralik.cjs` her zoom kademesinde
   `scrollTo(deste.top + innerHeight*1.2)` yapiyordu. `innerHeight` zoom'da
   KUCULDUGU icin kademeler FARKLI kaydirma konumlarinda okundu — zoom 2'de
   deste daha az ilerlemisti. "Zoom 1: 0,72/0,72/0,82 · zoom 2: 0,72/0,98/1,00"
   farkinin ne kadari arizadan, ne kadari rig'in kendi kaymasindan bilinmiyordu.
   Bu arac o acigi kapatir: kademeler AYNI MANTIKSAL noktada okunur.

   MANTIKSAL NOKTA = zaman cizelgesinin kendi ilerlemesi p.
   `exit-crossing 0%`  : destenin ust kenari gorunum ustunu gecer  -> scrollY = ust
   `exit-crossing 100%`: destenin alt kenari gorunum ustunu gecer  -> scrollY = ust + H
   Yani scrollY = ust + p*H. p, tanimi geregi zoom'dan bagimsiz. Sistem
   dogruysa ayni p'de ayni opaklik deseni okunur.

   IKINCI OLCUT — BEKLENEN EGRI. Kaynagin formulu (kok deck(), 12488):
     t = (H_gorunum - sonraki_kartin_DUZEN_ustu) / (H_gorunum * .82), 0..1
     opacity = 1 - .28*t     (1,00 -> 0,72)
   Sonraki kartin duzen ustunu sticky kart TASIYAMAZ; bu yuzden olcum
   sirasinda her kartin onune sifir yukseklikli isaret konur (yedek yoldaki
   `.sus-iz`in aynisi) ve konum ondan okunur. CSS'in urettigi opaklik ile bu
   beklenen deger arasindaki fark SAPMA'dir. Kunye zoom 1 icin 0,011 diyor;
   sapma zoom ile buyuyorsa `animation-range`teki yuzde/vh karisimi
   dogrulanir, buyumuyorsa hipotez duser.

   RIG KENDINI DOGRULAR: deste yoksa, isaret duzeni degistiriyorsa, dpr
   istenen kademeye gecmiyorsa ya da animasyon hic kosmuyorsa HUKUMSUZ.   */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'chrome';
const ADRES = process.env.ADRES || 'http://127.0.0.1:8790/';
const KADEMELER = (process.env.KADEMELER || '1,1.5,2').split(',').map(Number);
const ADIM = Number(process.env.ADIM || 0.02);
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-deste-egri.json');

(async () => {
  const exe = TARAYICILAR[TARAYICI];
  if (!fs.existsSync(exe)) { console.error(`TARAYICI YOK: ${exe}`); process.exit(1); }
  console.log(`TARAYICI : ${TARAYICI} · ${ADRES} · kademeler ${KADEMELER.join(' · ')} · adim ${ADIM}`);

  const b = await pt.launch({ executablePath: exe, headless: false,
    args: ['--no-first-run', '--no-default-browser-check'], defaultViewport: null });
  const page = await b.newPage();
  await page.evaluateOnNewDocument("try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}");
  const cdp = await page.createCDPSession();
  await page.goto(ADRES, { waitUntil: 'load', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const taban = await page.evaluate(() => ({
    aygit_en: Math.round(innerWidth * devicePixelRatio),
    aygit_boy: Math.round(innerHeight * devicePixelRatio),
    deste: !!document.querySelector('.sp-deste'),
    kart: document.querySelectorAll('.sp-kart').length,
    destek: CSS.supports('animation-timeline', 'view()'),
  }));
  if (!taban.deste) { console.error('!! DESTE YOK — kosum HUKUMSUZ'); await b.close(); process.exit(2); }
  if (!taban.destek) { console.error('!! animation-timeline DESTEKLENMIYOR — bu arac 1. basamagi olcer, kosum HUKUMSUZ'); await b.close(); process.exit(2); }
  console.log(`  deste bulundu · ${taban.kart} kart · pencere ${taban.aygit_en}x${taban.aygit_boy}`);

  /* olcum isaretleri: her kartin onune sifir yukseklikli oge. Duzeni
     degistirmemeli — deste yuksekligi once/sonra karsilastirilir. */
  const isaret = await page.evaluate(() => {
    const d = document.querySelector('.sp-deste');
    const once = d.getBoundingClientRect().height;
    [...d.querySelectorAll('.sp-kart')].forEach((k, i) => {
      const iz = document.createElement('i');
      iz.className = 'olc-iz'; iz.dataset.i = String(i);
      iz.style.cssText = 'display:block;height:0;margin:0;padding:0;border:0';
      iz.setAttribute('aria-hidden', 'true');
      k.before(iz);
    });
    const sonra = d.getBoundingClientRect().height;
    return { once: Math.round(once), sonra: Math.round(sonra), iz: d.querySelectorAll('.olc-iz').length };
  });
  if (Math.abs(isaret.once - isaret.sonra) > 1) {
    console.error(`!! ISARET DUZENI DEGISTIRDI (${isaret.once} -> ${isaret.sonra}) — kosum HUKUMSUZ`);
    await b.close(); process.exit(2);
  }
  console.log(`  isaret ${isaret.iz} adet · deste boyu degismedi (${isaret.once} px)`);

  const kayit = [];
  for (const z of KADEMELER) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: Math.round(taban.aygit_en / z), height: Math.round(taban.aygit_boy / z),
      deviceScaleFactor: z, mobile: false,
    });
    await new Promise((r) => setTimeout(r, 1200));
    /* dpr MEDYA SORGUSUNDAN okunur, `window.devicePixelRatio`dan DEGIL:
       tup.js kurulumdan sonra o ozelligi sabit degere donduruyor (8 Eyl'de
       bulundu) ve rig sessizce "zoom uygulanmadi" hukmu veriyordu. Medya
       sorgusu tarayicinin kendi cozunurlugunu verir, JS yamasi gormez. */
    const dpr = await page.evaluate(() => {
      let lo = 0.4, hi = 5;
      for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (matchMedia(`(min-resolution: ${m}dppx)`).matches) lo = m; else hi = m; }
      return Number(((lo + hi) / 2).toFixed(3));
    });
    if (Math.abs(dpr - z) > 0.02) {
      console.error(`!! dpr ${dpr} != istenen ${z} — kademe HUKUMSUZ`);
      kayit.push({ zoom: z, hukumsuz: `dpr ${dpr}` });
      continue;
    }

    const olcu = await page.evaluate(() => {
      const d = document.querySelector('.sp-deste');
      const r = d.getBoundingClientRect();
      return { ust: Math.round(r.top + scrollY), boy: Math.round(r.height),
        gorunum: innerHeight, css_en: innerWidth, azami: document.documentElement.scrollHeight - innerHeight };
    });

    const noktalar = [];
    for (let p = 0; p <= 1.0001; p += ADIM) {
      const hedef = Math.round(olcu.ust + p * olcu.boy);
      const d = await page.evaluate(async (hedef) => {
        scrollTo(0, hedef);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const H = innerHeight;
        const izler = [...document.querySelectorAll('.olc-iz')];
        const kartlar = [...document.querySelectorAll('.sp-kart')];
        const son = kartlar.length - 1;
        const cik = kartlar.map((k, i) => {
          const g = k.querySelector('.sp-govde');
          const cs = getComputedStyle(g);
          const gercek = Number(cs.opacity);
          /* beklenen: kaynagin formulu — SONRAKI kartin duzen ustu */
          let beklenen = 1;
          if (i < son && izler[i + 1]) {
            const ust = izler[i + 1].getBoundingClientRect().top;
            const t = Math.min(1, Math.max(0, (H - ust) / (H * 0.82)));
            beklenen = 1 - 0.28 * t;
          }
          const an = g.getAnimations()[0];
          return { i, gercek: Number(gercek.toFixed(4)), beklenen: Number(beklenen.toFixed(4)),
            sapma: Number(Math.abs(gercek - beklenen).toFixed(4)),
            ilerleme: an && an.overallProgress != null ? Number(an.overallProgress.toFixed(4)) : null };
        });
        return { y: Math.round(scrollY), kartlar: cik };
      }, hedef);
      /* kaydirma hedefe oturmadiysa (belge sonu) o nokta atlanir */
      if (Math.abs(d.y - hedef) > 2 && hedef <= olcu.azami) {
        noktalar.push({ p: Number(p.toFixed(3)), atlandi: `y ${d.y} != ${hedef}` });
        continue;
      }
      if (hedef > olcu.azami) break;
      const sapma = Math.max(...d.kartlar.map((k) => k.sapma));
      /* ayni anda ARA DEGERDE (ne 1,00 ne 0,72) kac kart var */
      const arada = d.kartlar.filter((k) => Math.abs(k.gercek - 1) > 0.01 && Math.abs(k.gercek - 0.72) > 0.01).length;
      noktalar.push({ p: Number(p.toFixed(3)), y: d.y, sapma, arada,
        op: d.kartlar.map((k) => k.gercek), bek: d.kartlar.map((k) => k.beklenen) });
    }

    const gecerli = noktalar.filter((n) => n.sapma != null);
    const azamiSapma = gecerli.length ? Math.max(...gecerli.map((n) => n.sapma)) : null;
    const azamiArada = gecerli.length ? Math.max(...gecerli.map((n) => n.arada)) : null;
    const ortSapma = gecerli.length ? Number((gecerli.reduce((a, n) => a + n.sapma, 0) / gecerli.length).toFixed(4)) : null;
    const s = { zoom: z, dpr, ...olcu, nokta: gecerli.length, azami_sapma: azamiSapma,
      ort_sapma: ortSapma, azami_arada: azamiArada, noktalar };
    kayit.push(s);
    console.log(`zoom ${String(z).padEnd(4)} · css ${olcu.css_en}x${olcu.gorunum} · deste ust ${olcu.ust} boy ${olcu.boy}`);
    console.log(`        AZAMI SAPMA ${azamiSapma}  ort ${ortSapma}  ayni anda ara degerde en cok ${azamiArada} kart  (${gecerli.length} nokta)`);
    const enKotu = gecerli.slice().sort((a, b) => b.sapma - a.sapma)[0];
    if (enKotu) console.log(`        en kotu nokta p=${enKotu.p} y=${enKotu.y} gercek [${enKotu.op.join(' ')}] beklenen [${enKotu.bek.join(' ')}]`);
  }

  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'olc-deste-egri.cjs — TESHIS. Kademeler AYNI p (zaman cizelgesi ilerlemesi) noktalarinda okunur; sapma = CSS ciktisi ile kaynagin deck() formulu arasindaki opaklik farki.',
    olcum: new Date().toISOString(), tarayici: TARAYICI, adres: ADRES, adim: ADIM, kademeler: kayit,
  }, null, 1));
  console.log(`\n→ ${CIKTI}`);
  await b.close().catch(() => {});
})();
