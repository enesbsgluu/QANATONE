#!/usr/bin/env node
/* DESTE FILIGRANI — KAYNAK/YENI YAN YANA (8 Eyl 2026, SADAKAT KURALI).

   Enes: "bir onceki projenin aciklamalari soluk olarak beliriyor, arka
   planda hala onceki karti filigran seklinde gosteriyor."
   Bulundu (kare, zoom 1): on kartin opakligi 1'in altina inerken ARKASINDAKI
   kart onun icinden okunuyor. Kart zemini opak (--card #0D0D0D), yani
   sizdiran sey zemin degil KARTIN KENDI opacity'si.

   SORU: bu kaynakta da boyle miydi? Kaynak `deck()` ayni egriyi yaziyor
   (ov = 1 - t*.28) ama `.dkin`e yaziyor ve YALNIZ innerWidth>900 &&
   !pointer:coarse iken bagli. Cevap gozle verilir, tahminle degil:
   ayni mantiksal noktada iki agactan kare alinir.

   ESLEME: iki agacta deste yuksekligi ayni degil (yeni deste 4 kart, eski
   deste 4 kart ama olculer farkli). Bu yuzden kaydirma MUTLAK px ile degil,
   "kac numarali kart ekranin ustune yapismis" ile eslenir: hedef kartin
   DUZEN ustu gorunumun %18'ine gelecek sekilde kaydirilir — iki agacta da
   ayni gorsel an.

   OLCUT (sayi, karenin yaninda): on kartin opacity'si ve o anda arkasinda
   GORUNUR baska kart olup olmadigi. Ikisi de her iki agactan okunur.   */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const EXE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const YENI = process.env.YENI || 'http://127.0.0.1:8790/';
const ESKI = process.env.ESKI || 'http://127.0.0.1:8795/index.html';
const KADEMELER = (process.env.KADEMELER || '1,2').split(',').map(Number);
const DIZIN = process.env.DIZIN || path.join(__dirname, '_kare-sadakat');

/* iki agacin secicileri */
const AGAC = {
  yeni: { deste: '.sp-deste', kart: '.sp-kart', govde: '.sp-govde' },
  eski: { deste: '#prjDeck', kart: '.dk', govde: '.dkin' },
};

async function tur(page, cdp, ad, adres, sec, z, taban, rapor) {
  await page.goto(adres, { waitUntil: 'load', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: Math.round(taban.en / z), height: Math.round(taban.boy / z), deviceScaleFactor: z, mobile: false });
  await new Promise((r) => setTimeout(r, 1500));

  const var_ = await page.evaluate((s) => ({
    deste: !!document.querySelector(s.deste), kart: document.querySelectorAll(s.kart).length }), sec);
  if (!var_.deste || var_.kart < 3) {
    console.log(`  !! ${ad} z${z}: deste ${var_.deste} kart ${var_.kart} — HUKUMSUZ`);
    return;
  }

  /* isaretler: sticky kart duzen konumunu tasimaz */
  await page.evaluate((s) => {
    document.querySelectorAll('.olc-iz').forEach((x) => x.remove());
    document.querySelectorAll(s.kart).forEach((k, i) => {
      const iz = document.createElement('i');
      iz.className = 'olc-iz'; iz.dataset.i = String(i);
      iz.style.cssText = 'display:block;height:0;margin:0;padding:0;border:0';
      k.before(iz);
    });
  }, sec);

  /* HEDEF AN: 3. kartin (index 2) duzen ustu gorunumun %18'inde — yani
     2. kartin gecisi TAM BITMEK uzere, 3. kart ustune biniyor. Filigran
     tam bu anda goruluyor. */
  for (const hedefIdx of [2, 3]) {
    const oturdu = await page.evaluate(async (hedefIdx) => {
      const izler = [...document.querySelectorAll('.olc-iz')];
      const iz = izler[hedefIdx]; if (!iz) return null;
      /* iki adimda yaklas: kaydirma sonrasi duzen degisebilir */
      for (let n = 0; n < 6; n++) {
        const fark = iz.getBoundingClientRect().top - innerHeight * 0.18;
        if (Math.abs(fark) < 2) break;
        scrollTo(0, scrollY + fark);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      return { y: Math.round(scrollY), ust: Math.round(iz.getBoundingClientRect().top), hedef: Math.round(innerHeight * 0.18) };
    }, hedefIdx);
    if (!oturdu) continue;
    await new Promise((r) => setTimeout(r, 400));

    const d = await page.evaluate((s) => {
      const kartlar = [...document.querySelectorAll(s.kart)];
      return { gorunum: innerHeight, css_en: innerWidth, kartlar: kartlar.map((k, i) => {
        const g = k.querySelector(s.govde) || k;
        const cs = getComputedStyle(g);
        const r = g.getBoundingClientRect();
        return { i, opacity: Number(Number(cs.opacity).toFixed(3)),
          transform: cs.transform === 'none' ? '1' : cs.transform.replace(/matrix\(([\d.]+).*/, '$1'),
          gorunur: r.bottom > 0 && r.top < innerHeight,
          ust: Math.round(r.top), boy: Math.round(r.height) };
      }) };
    }, sec);

    /* SIZINTI OLCUTU: opacity'si 1'in altinda (ama 0'dan buyuk) VE ekranda
       gorunur olan bir kartin ARKASINDA baska gorunur kart var mi */
    const gorunur = d.kartlar.filter((k) => k.gorunur);
    const sizdiran = gorunur.filter((k, n) => k.opacity < 0.995 && gorunur.slice(0, n).some((o) => o.gorunur));
    const dosya = `${ad}-z${String(z).replace('.', '_')}-k${hedefIdx}.png`;
    await page.screenshot({ path: path.join(DIZIN, dosya) });
    console.log(`  ${ad} z${z} kart${hedefIdx} · css ${d.css_en}x${d.gorunum} · gorunur ${gorunur.length} · SIZDIRAN ${sizdiran.length} · ` +
      d.kartlar.map((k) => `${k.i}:${k.opacity.toFixed(2)}/${Number(k.transform).toFixed(3)}${k.gorunur ? '*' : ''}`).join(' '));
    rapor.push({ agac: ad, zoom: z, hedef_kart: hedefIdx, dosya, gorunur: gorunur.length,
      sizdiran: sizdiran.length, kartlar: d.kartlar, css_en: d.css_en, gorunum: d.gorunum });
  }
}

(async () => {
  fs.mkdirSync(DIZIN, { recursive: true });
  const b = await pt.launch({ executablePath: EXE, headless: false,
    args: ['--no-first-run', '--no-default-browser-check'], defaultViewport: null });
  const page = await b.newPage();
  await page.evaluateOnNewDocument("try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}");
  const cdp = await page.createCDPSession();
  await page.goto('about:blank');
  const taban = await page.evaluate(() => ({ en: Math.round(innerWidth * devicePixelRatio), boy: Math.round(innerHeight * devicePixelRatio) }));
  console.log(`pencere ${taban.en}x${taban.boy}`);

  const rapor = [];
  for (const z of KADEMELER) {
    console.log(`--- zoom ${z} ---`);
    await tur(page, cdp, 'yeni', YENI, AGAC.yeni, z, taban, rapor);
    await tur(page, cdp, 'eski', ESKI, AGAC.eski, z, taban, rapor);
  }
  fs.writeFileSync(path.join(DIZIN, 'kunye.json'), JSON.stringify({ olcum: new Date().toISOString(), yeni: YENI, eski: ESKI, rapor }, null, 1));
  console.log(`\n→ ${DIZIN}`);
  await b.close().catch(() => {});
})();
