#!/usr/bin/env node
/* GEC DUGMESI YANIT SURESI (TUR 2, 4 Eyl 2026) — "film sirasindaki tek
   gercek etkilesim hizli mi?"

   NEDEN AYRI ARAC VAR. Dun gecenin INP rakami (256/272/304 ms, film
   etkinken) bu soruyu CEVAPLAMIYORDU: olculen olay `video.fl-video`
   uzerindeki keydown'du, yani olcum duzeneginin kendi kaydirma tusu —
   ziyaretcinin bastigi dugme degil. Burada olculen sey dugmenin KENDISI.

   NE OLCULUYOR. Basma anindan GORSEL YANITIN BASLADIGI ana kadar gecen
   sure. Kaynak tahmin degil, tarayicinin kendi Event Timing kaydi:
     startTime       olayin donanim damgasi (parmak dugmeye degdi)
     processingStart dinleyici calismaya BASLADI   -> girdi gecikmesi
     processingEnd   dinleyici bitti               -> isleme
     startTime+duration  olaydan SONRAKI ilk boyama -> sunum gecikmesi
   `duration` = basmadan boyamaya; INP'nin saydigi buyukluk bu. Tarayici
   8 ms'e yuvarlar, o yuzden tek kosum degil UC KOSUM MEDYANI alinir.
   Etkilesim tek olay degil: pointerdown/pointerup/click ayni
   `interactionId` altinda toplanir, RAPORLANAN en uzun olandir (INP'nin
   kendi kurali) ve ucu de dokulur.

   NEREDE OLCULUYOR. Varsayilan `/yeni/` — ana sayfa prologu, gercek
   ziyaretcinin dugmeyi gordugu tek yer; motor + tupler ayni anda ana is
   parcaciginda. SAYFA=/yeni/film/ ile film sayfasi da olculebilir.
   Filmin BASI / ORTASI / SONU ayri olculur, cunku motorun yuku
   ilerlemeyle degisir (klip sayisi, sokulecek blob sayisi).

   KIRMIZI-ONCE. BOZ=1 ile belgeye yakalama fazinda 300 ms mesgul bekleyen
   bir click dinleyicisi takilir. Kapi bunu YAKALAMAK ZORUNDA; yakalamazsa
   duzenegin yesili anlamsizdir ve gercek olcume gecilmez.

   KAPI: uc noktanin her birinde uc kosum medyani <= 200 ms.

   KULLANIM (yerel-sun 8790 ayakta olmali):
     node yeni/film/olc-gec-inp.cjs
     BOZ=1 node yeni/film/olc-gec-inp.cjs        (kirmizi kontrol)
     SAYFA=/yeni/film/ TEKRAR=3 node yeni/film/olc-gec-inp.cjs
   ENV: KOK (varsayilan http://127.0.0.1:8790) · SAYFA · TEKRAR (3) ·
        TARAYICI (brave|chrome) · HEADLESS=0 · KAPI (200) */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const KOK = (process.env.KOK || 'http://127.0.0.1:8790').replace(/\/$/, '');
const SAYFA = process.env.SAYFA || '/yeni/';
const TEKRAR = Number(process.env.TEKRAR || 3);
const KAPI = Number(process.env.KAPI || 200);
const BOZ = process.env.BOZ === '1';
const TETIK = process.env.TETIK || 'tikla';   /* tikla | klavye | kaydir */
/* ISINMA: basmadan once beklenen ms. Varsayilan 1200 (gercek ziyaretci ilk
   yarim saniyede basmaz + motor modulu bosta iniyor). ISINMA=0 filmin SOGUK
   ACILIS anini olcer — dun kirmizi cikan kosul bu. */
const ISINMA = Number(process.env.ISINMA === undefined ? 1200 : process.env.ISINMA);
const CIKTI = path.join(__dirname, `olc-gec-inp${(process.env.TETIK && process.env.TETIK !== 'tikla') ? '-' + process.env.TETIK : ''}.json`);
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'brave';
const EXE = TARAYICILAR[TARAYICI] || TARAYICI;
const HEADLESS = process.env.HEADLESS === '0' ? false : 'new';

const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[(s.length - 1) >> 1] : null; };

/* Sayfa acilmadan once kurulur: Event Timing gozlemcisi (durationThreshold 0
   — varsayilan 104 ms, altindaki etkilesimler HIC gorunmez) + prolog
   bayraklarinin temizligi. */
const SURUCU = (bozMu) => {
  try { sessionStorage.removeItem('qanat-prolog-atlandi'); } catch (e) {}
  window.__olay = [];
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__olay.push({
      ad: e.name, id: e.interactionId || 0, bas: e.startTime, isBas: e.processingStart,
      isSon: e.processingEnd, sure: e.duration, hedef: e.target ? (e.target.className || e.target.tagName) : '',
    }); }).observe({ type: 'event', durationThreshold: 0, buffered: true });
  } catch (e) { window.__olayHata = String(e); }
  if (bozMu) {
    /* KIRMIZI-ONCE: yakalama fazinda 300 ms mesgul bekle — girdi gecikmesi
       degil ISLEME suresi sisecek, kapi kirmiziya donmeli */
    document.addEventListener('click', () => { const t = performance.now(); while (performance.now() - t < 300) { /* kasti */ } }, true);
  }
};

async function birKosum(browser, nokta) {
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await p.setCacheEnabled(false);
  await p.evaluateOnNewDocument(SURUCU, BOZ);
  const r = await p.goto(KOK + SAYFA, { waitUntil: 'load', timeout: 120000 });
  if (!r || r.status() !== 200) { await p.close(); throw new Error(`${SAYFA} durum ${r && r.status()}`); }
  await p.waitForFunction('window.__fl && __fl.hazir', { timeout: 180000 });
  /* isitma payi (olc-efekt dersi): modul bosta iniyor, sayfa hazir olur
     olmaz tiklanirsa yaris sade yola dusuyor. Gercek ziyaretci de ilk
     yarim saniyede basmaz. */
  await new Promise((r2) => setTimeout(r2, ISINMA));
  if (nokta === 'orta') { await p.evaluate(() => { scrollTo(0, __fl.konum(__fl.toplam / 2)); __fl.atla(); }); await new Promise((r2) => setTimeout(r2, 600)); }
  if (nokta === 'son') { await p.evaluate(() => { scrollTo(0, __fl.konum(__fl.toplam) - innerHeight * 2.2); __fl.atla(); }); await new Promise((r2) => setTimeout(r2, 600)); }
  const gorunur = await p.evaluate(() => { const g = document.querySelector('.fl-gec'); if (!g) return null; const b = g.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), y: Math.round(b.top) }; });
  if (!gorunur || gorunur.w < 8) { await p.close(); throw new Error(`gec dugmesi yok/gorunmez: ${JSON.stringify(gorunur)}`); }
  await p.evaluate(() => { window.__olay.length = 0; });   /* acilis olaylari sayilmasin */
  /* TETIK YOLLARI. `tikla` ziyaretcinin dugmeye basmasi (TUR 2'nin sorusu).
     `klavye` ayni dugmenin erisilebilir yolu (FM2: gec klavyeyle erisilir).
     `kaydir` ise DUN KIRMIZI CIKAN olay: ok tusuyla film icinde kaydirma —
     olculen `video.fl-video` keydown'u buydu, dugme degildi. Ucu de GERCEK
     girdi olayi (CDP Input), sentetik dispatchEvent degil. */
  if (TETIK === 'klavye') {
    await p.evaluate(() => (document.querySelector('.fl-gec')).focus());
    await p.keyboard.press('Enter');
  } else if (TETIK === 'kaydir') {
    await p.evaluate(() => { const v = document.querySelector('video.fl-video') || document.body; if (v.focus) v.focus(); });
    await p.keyboard.press('ArrowDown');
  } else if (TETIK === 'tab' || TETIK === 'esc') {
    /* olc-chrome'un dizisinin AYNISI: once bos alana tiklanir (odak videoya
       duser), sonra Tab/Escape. Dun 256-304 ms veren olay `video.fl-video`
       keydown'uydu ve o dizinin urunuydu. */
    const cdp = await p.target().createCDPSession();
    for (const [x, y] of [[1380, 620], [720, 450]]) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      await new Promise((r3) => setTimeout(r3, 250));
    }
    await p.evaluate(() => { window.__olay.length = 0; });
    await p.keyboard.press(TETIK === 'tab' ? 'Tab' : 'Escape');
  } else {
    await p.click('.fl-gec');
  }
  /* efektin ve sonraki boyamanin gecmesini bekle; Event Timing girdisi
     boyamadan SONRA dusuyor */
  await new Promise((r2) => setTimeout(r2, /kaydir|tab|esc/.test(TETIK) ? 1200 : 2500));
  const d = await p.evaluate(() => ({
    olaylar: window.__olay, hata: window.__olayHata || null,
    film: document.documentElement.dataset.film || null,
    gec: window.__devir && __devir.kayit && __devir.kayit.gec
      ? { yol: __devir.kayit.gec.yol, sure: __devir.kayit.gec.sonMs && Math.round(__devir.kayit.gec.sonMs - __devir.kayit.gec.basMs) } : null,
  }));
  await p.close();
  /* Etkilesimin en uzun olayi = INP'nin saydigi buyukluk. Etkilesim
     grubu interactionId ile toplanir; id 0 olanlar (etkilesim sayilmayan)
     ayrica dokulur ama hukum vermez. */
  const grup = d.olaylar.filter((e) => e.id > 0);
  /* tab/esc/kaydir olcumunde TUS olayi araniyor; tikla yolunda isaretleyici
     olaylar. Yanlis olayi raporlamak kokun adini yanlis koydurur. */
  const DESEN = TETIK === 'tikla' ? /pointerdown|pointerup|click|mousedown|mouseup/
    : (/tab|esc|kaydir/.test(TETIK) ? /^key/ : /keydown|keyup|keypress|click/);
  const aday = (grup.length ? grup : d.olaylar).filter((e) => DESEN.test(e.ad));
  if (!aday.length) throw new Error('Event Timing girdisi yok — gozlemci kurulmadi mi? ' + JSON.stringify(d.hata));
  const enUzun = aday.reduce((a, b) => (b.sure > a.sure ? b : a));
  return {
    nokta, sure: Math.round(enUzun.sure), olay: enUzun.ad,
    girdi_gecikmesi: Math.round(enUzun.isBas - enUzun.bas),
    isleme: Math.round(enUzun.isSon - enUzun.isBas),
    sunum: Math.round(enUzun.bas + enUzun.sure - enUzun.isSon),
    hepsi: aday.map((e) => `${e.ad}:${Math.round(e.sure)}`).join(' '),
    film: d.film, gecYolu: d.gec && d.gec.yol, efektSuresi: d.gec && d.gec.sure,
  };
}

(async () => {
  const browser = await pt.launch({ executablePath: EXE, headless: HEADLESS, args: ['--no-sandbox'] });
  const surum = await browser.version();
  console.log(`TARAYICI : ${TARAYICI} · ${surum} · headless ${JSON.stringify(HEADLESS)} · ${KOK}${SAYFA} · tetik ${TETIK} · tekrar ${TEKRAR} · kapi ${KAPI} ms${BOZ ? ' · BOZ=1 (300 ms kilit)' : ''}`);
  const S = {
    _: 'yeni/film/olc-gec-inp.cjs — gec dugmesinin basma->boyama suresi (Event Timing), filmin bas/orta/son noktasinda, uc kosum medyani.',
    olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, sayfa: SAYFA, kok: KOK,
    tekrar: TEKRAR, kapi_ms: KAPI, boz: BOZ, tetik: TETIK, nokta: {},
  };
  let kaldi = 0;
  for (const nokta of ['bas', 'orta', 'son']) {
    const kosumlar = [];
    for (let i = 0; i < TEKRAR; i++) {
      const k = await birKosum(browser, nokta);
      kosumlar.push(k);
      console.log(`  ${nokta.padEnd(4)} #${i + 1}  ${String(k.sure).padStart(4)} ms  (girdi ${k.girdi_gecikmesi} · isleme ${k.isleme} · sunum ${k.sunum})  olay ${k.olay} · yol ${k.gecYolu} · efekt ${k.efektSuresi} ms  [${k.hepsi}]`);
    }
    const m = medyan(kosumlar.map((k) => k.sure));
    const gecti = m <= KAPI;
    if (!gecti) kaldi++;
    S.nokta[nokta] = {
      medyan_ms: m, gecti, kosumlar,
      girdi_gecikmesi_medyan: medyan(kosumlar.map((k) => k.girdi_gecikmesi)),
      isleme_medyan: medyan(kosumlar.map((k) => k.isleme)),
      sunum_medyan: medyan(kosumlar.map((k) => k.sunum)),
    };
    console.log(`  ${gecti ? 'GECTI' : 'KALDI'}  ${nokta}: medyan ${m} ms (kapi ${KAPI}) · girdi ${S.nokta[nokta].girdi_gecikmesi_medyan} · isleme ${S.nokta[nokta].isleme_medyan} · sunum ${S.nokta[nokta].sunum_medyan}\n`);
  }
  await browser.close();
  S.kaldi = kaldi;
  fs.writeFileSync(CIKTI, JSON.stringify(S, null, 1));
  console.log(`${kaldi === 0 ? 'HEPSI GECTI' : kaldi + ' NOKTA KALDI'} → ${CIKTI}`);
  if (BOZ) {
    console.log(kaldi > 0 ? 'KIRMIZI KONTROL BASARILI: bozuk kurulum yakalandi.' : 'KIRMIZI KONTROL BASARISIZ: 300 ms kilit YAKALANMADI, duzenek olcmuyor.');
    process.exit(kaldi > 0 ? 0 : 2);
  }
  process.exit(kaldi === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(3); });
