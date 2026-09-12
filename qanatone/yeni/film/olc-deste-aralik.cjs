#!/usr/bin/env node
/* DESTE ARALIGI ZOOM'DA BOZULUYOR MU — TESHIS (7 Eyl 2026).

   Enes: "projeler kismindaki karta zoom attigimda bir onceki projenin
   aciklamalari soluk olarak beliriyor, arka planda hala onceki karti
   filigran seklinde gosteriyor."

   SUPHE (kaynaktan okundu, deste.css 208-211):
     .sp-kart:not(:last-child) .sp-govde{
       animation: sp-cek linear both;
       animation-timeline: --sp-deste;
       animation-range: exit-crossing calc((var(--i)+1)/var(--n)*100% - 100vh)
                        exit-crossing calc((var(--i)+1)/var(--n)*100% -  18vh) }
     @keyframes sp-cek{from{opacity:1} to{opacity:.72}}
   Aralik, zaman cizelgesinin YUZDESI ile VH'yi karistiriyor. Zoom'da CSS
   gorunum penceresi kuculur -> `100vh` kuculur; yuzde tarafi ise duzenle
   belirlenir. Iki uc birbirinden bagimsiz kayar. Aralik bozulur/ters
   donerse `fill: both` karti "to" degerinde BIRAKIR: opacity .72 +
   scale(.94) — yani onceki kart arkada asili kalir.

   OLCULEN, TAHMIN YOK: her zoom kademesinde her `.sp-govde` icin
     · computed opacity ve transform
     · animasyonun cozulmus rangeStart/rangeEnd degerleri
     · overallProgress ve playState
   Kart gorunur olmamasi gerekirken opacity 1'den kucuk AMA 0.72'ye de
   oturmamissa ya da birden fazla kart ayni anda gorunurse ARIZA yazilir.

   Rig kendini dogrular: deste bulunamazsa ya da dpr istenen degere
   gecmezse kosum HUKUMSUZ.                                             */
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
const KADEMELER = (process.env.KADEMELER || '1,1.25,1.5,1.75,2').split(',').map(Number);
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-deste-aralik.json');

(async () => {
  const exe = TARAYICILAR[TARAYICI];
  if (!fs.existsSync(exe)) { console.error(`TARAYICI YOK: ${exe}`); process.exit(1); }
  console.log(`TARAYICI : ${TARAYICI} · ${ADRES} · kademeler ${KADEMELER.join(' · ')}`);

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
  }));
  if (!taban.deste) { console.error('!! DESTE YOK — kosum hukumsuz'); await b.close(); process.exit(0); }
  console.log(`  deste bulundu · ${taban.kart} kart · pencere ${taban.aygit_en}x${taban.aygit_boy}`);

  const kayit = [];
  for (const z of KADEMELER) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: Math.round(taban.aygit_en / z), height: Math.round(taban.aygit_boy / z),
      deviceScaleFactor: z, mobile: false,
    });
    await new Promise((r) => setTimeout(r, 900));
    /* desteyi ekrana getir: ikinci kartin ustune kadar kaydir */
    await page.evaluate(() => {
      const d = document.querySelector('.sp-deste');
      if (d) scrollTo(0, d.getBoundingClientRect().top + scrollY + innerHeight * 1.2);
    });
    await new Promise((r) => setTimeout(r, 1200));

    const d = await page.evaluate(() => {
      const dpr = devicePixelRatio;
      const kartlar = [...document.querySelectorAll('.sp-kart')].map((k, i) => {
        const g = k.querySelector('.sp-govde');
        if (!g) return null;
        const cs = getComputedStyle(g);
        const an = g.getAnimations()[0];
        let ar = null;
        if (an) {
          const oz = (v) => (v && typeof v === 'object' ? `${v.rangeName || ''} ${v.offset ? v.offset.value + v.offset.unit : ''}`.trim() : String(v));
          ar = { durum: an.playState, ilerleme: an.overallProgress === null || an.overallProgress === undefined ? null : Number(an.overallProgress.toFixed(3)),
            bas: oz(an.rangeStart), son: oz(an.rangeEnd) };
        }
        const r = g.getBoundingClientRect();
        return { i, opacity: Number(cs.opacity), gorunur_alan: r.bottom > 0 && r.top < innerHeight,
          transform: cs.transform === 'none' ? 'none' : cs.transform.slice(0, 28), animasyon: ar };
      }).filter(Boolean);
      return { dpr: Number(dpr.toFixed(2)), css_en: innerWidth, css_boy: innerHeight, y: Math.round(scrollY), kartlar };
    });

    /* ARIZA OLCUTU: ekranda ayni anda 1'den fazla kart GORUNUR ve
       ikisinin de opaklığı 0'dan buyukse, onceki kart "filigran" olarak
       duruyordur. Bir de opaklığı ne 1 ne .72 olan kart ARADA TAKILMIS
       demektir. */
    const gorunur = d.kartlar.filter((k) => k.gorunur_alan && k.opacity > 0.05);
    const arada = d.kartlar.filter((k) => k.opacity > 0.05 && Math.abs(k.opacity - 1) > 0.01 && Math.abs(k.opacity - 0.72) > 0.01);
    const s = { zoom: z, ...d, gorunur_kart: gorunur.length, arada_takilan: arada.length,
      arada_ornek: arada.slice(0, 4).map((k) => ({ i: k.i, opacity: k.opacity })) };
    kayit.push(s);
    console.log(`zoom ${String(z).padEnd(5)} · dpr ${String(d.dpr).padEnd(5)} · css ${d.css_en}x${d.css_boy} · y ${d.y} · GORUNUR KART ${gorunur.length} · arada takilan ${arada.length}${arada.length ? ' -> ' + JSON.stringify(s.arada_ornek) : ''}`);
    console.log('        opaklıklar: ' + d.kartlar.map((k) => `${k.i}:${k.opacity.toFixed(2)}${k.gorunur_alan ? '*' : ''}`).join(' '));
  }
  fs.writeFileSync(CIKTI, JSON.stringify({ _: 'olc-deste-aralik.cjs — TESHIS, kapi degil. * = ekranda gorunur alanda.', olcum: new Date().toISOString(), tarayici: TARAYICI, adres: ADRES, kademeler: kayit }, null, 1));
  console.log(`\n→ ${CIKTI}`);
  await b.close().catch(() => {});
})();
