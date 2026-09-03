#!/usr/bin/env node
/* KAPI B — SOGUK GIRIS (Enes, 5 Eyl 2026: "IKI KAPI").
   KAPI A (olc-sayfa.cjs) 59 sayfayi TEK tarayicida arka arkaya olcer ve
   gerilemeyi yakalamanin en duyarli yoludur — ama olctugu sey 59 sayfalik
   gezinti SONRASI hal, yani EN IYI durum. Gercek ziyaretci soguk tarayicida
   TEK sayfa acar ve o durum hic olculmuyordu. 4 Eyl'de olculdu: ayni sayfa
   (/hizmetler/finans/) tam taramada 16,7 ms (2,01 tik), tek basina 25,0 ms
   (3,01 tik) — BIR TAM KARE fark, yuk yok, taban temiz.

   BU ARAC O DURUMU OLCER. Kapi A'nin yerine gecmez, YANINA gelir.

   ESIK YOK — BILEREK. Once dagilim olculur, esik VERIYE gore ONERILIR,
   karari Enes verir. Bugun esik koymak tahminle kapi yazmak olurdu; o hata
   iki kez yapildi (once 20 ms, sonra kapinin kuantali olduguna dikkat
   edilmemesi). Bu yuzden cikis kodu HER ZAMAN 0'dir: bu bir OLCUM araci,
   kapi degil. Kapi olunca bu blok degisir ve esik buraya yazilir.

   ISINMA DIZISI v1 — SABIT, KOSUMDAN KOSUMA DEGISMEZ:
     1. HER OLCUM ICIN AYRI TARAYICI ACILIR (taze profil: puppeteer her
        acilista yeni gecici user-data-dir uretir; onbellek, golgelendirici
        onbellegi, font atlasi sifirdan). Uc kosum = uc ayri tarayici.
     2. about:blank acilir.
     3. Tazeleme olculur (200 rAF araligi, ilk 5 isinma atilir) — hem tik
        hesabi hem de kompozitorun ayaga kalkmasi.
     4. 1500 ms bosta beklenir (kompozitor durulsun).
     5. about:blank kapatilir.
     6. Olculecek sayfa acilir. SITE SAYFASI ISINMAYA GIRMEZ — kapinin
        anlami bu: ziyaretci bizim baska sayfamizi gormedi.
     7. Boyama sonrasi 1200 ms beklenir, fare bir kez oynatilir (kabuk
        efektleri kurulsun), taban 3 sn, sonra tur.
   Adim 6'daki sayfa disinda HICBIR site adresi ziyaret edilmez.

   PROLOG BAYRAKLARI KAPI A ILE AYNI (bilincli): oturumda "prolog goruldu"
   isaretlenir. Sebep (a) A ile B ayni sayfa halini olcsun, fark yalnizca
   SOGUKLUKTAN gelsin; (b) film onde dururken networkidle0 hic gelmez ve
   olcum zaman asimina duser; (c) filmin kendi kapilari ayri (FM1, olc-devir,
   olc-efekt). GERCEKTEN soguk ziyaretci prologu GORUR — o yol bu araca
   degil filmin kapilarina aittir; burada olculen SITE GOVDESIDIR.

   SINYAL ve esikler KAPI A ILE BIREBIR AYNI (rAF araligi; takilma > 50 ms;
   p95 uc kosum medyani; kacirilan kare = round(p95/tik) - 1). Ikisi ayni
   kalmali: yeni/test/olc-esik.test.mjs iki dosyadaki sabitleri karsilastirir.

   Kullanim: node yeni/film/olc-soguk.cjs        (once: node yerel-sun.cjs)
   Cevre   : TEKRAR=3 · SAYFA=/yeni/ (tek sayfa) · TARAYICI=brave
             LISTE=a,b,c (varsayilan listeyi degistirir)
   KIRMIZI-ONCE: BOZ=1 (ya da BOZ_MS=<ms>) tabandan SONRA her karede yakma
   dongusu enjekte eder; kacirilan kare gorunur sekilde artmali. Duzenek
   bozulmus sayfayi ayirt edemiyorsa yesili anlamsizdir. */
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
const DIST = path.join(__dirname, '..', '..', 'dist', 'yeni');
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-soguk.json');
const TEKRAR = Number(process.env.TEKRAR || 3);
/* KAPI A ILE AYNI OLMALI (olc-esik.test.mjs bunu sinar) */
const TAKILMA_ESIK = 50, TEK_TAKILMA_MS = 250, TOPLAM_ORAN = 0.03;
const BOZ = process.env.BOZ === '1' || !!process.env.BOZ_MS;

/* KAPSAM — DAR TUTULUYOR (Enes): 59 sayfa degil. Kapi A'nin 4 Eyl tam
   taramasinda BIR KARE kaciran 8 sayfa (iki ana sayfa dahil) + bir KONTROL
   sayfasi. Kontrol, A'da SIFIR kare kaciran banttan secildi: soguk girisin
   yalnizca agir sayfalari mi yoksa her sayfayi mi bir tik oynattigini ancak
   o ayirir. Ana sayfa zaten sekizin icinde oldugu icin dokuzuncu sira
   kopyaya degil kontrole verildi. */
const VARSAYILAN = [
  '/yeni/',                                  /* ana sayfa TR   · A: 1 kare */
  '/yeni/en/',                               /* ana sayfa EN   · A: 1 kare */
  '/yeni/hizmetler/finans/',                 /*                · A: 1 kare */
  '/yeni/en/hizmetler/finans/',              /*                · A: 1 kare */
  '/yeni/hizmetler/web-sitesi-araclar/',     /*                · A: 1 kare */
  '/yeni/en/hizmetler/web-sitesi-araclar/',  /*                · A: 1 kare */
  '/yeni/otomasyon/',                        /*                · A: 1 kare */
  '/yeni/en/otomasyon/',                     /*                · A: 1 kare */
  '/yeni/projeler/',                         /* KONTROL        · A: 0 kare */
];
const secim = process.env.SAYFA ? [process.env.SAYFA]
  : (process.env.LISTE ? process.env.LISTE.split(',').map((s) => s.trim()) : VARSAYILAN);

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : null; };
const p10 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.10)] : null; };

const KAYITCI = `(() => {
  window.__k = { ara: [], on: false, son: null };
  const f = (t) => { if (__k.son !== null && __k.on) __k.ara.push(+(t - __k.son).toFixed(2)); __k.son = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);
  window.__kBasla = () => { __k.ara.length = 0; __k.on = true; };
  window.__kBitir = () => { __k.on = false; return __k.ara.slice(); };
})()`;

/* ISINMA adim 2-5 + tik olcumu. Kapi A'daki tazelemeOlc ile ayni yontem. */
async function isinVeOlc(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('about:blank');
  await page.bringToFront();
  await bekle(300);
  const ara = await page.evaluate(() => new Promise((coz) => {
    const a = []; let son = null, n = 0;
    const f = (t) => { if (son !== null) a.push(+(t - son).toFixed(3)); son = t; if (++n < 200) requestAnimationFrame(f); else coz(a); };
    requestAnimationFrame(f);
  }));
  await bekle(1500);                                   /* kompozitor durulsun */
  await page.close();
  const ham = ara.slice(5);
  const m0 = medyan(ham);
  const suz = ham.filter((x) => x > m0 * 0.5 && x < m0 * 1.5);
  const sirali = [...ham].sort((a, b) => a - b);
  return {
    tik_ms: +medyan(suz).toFixed(3), hz: +(1000 / medyan(suz)).toFixed(1),
    ornek: ham.length, suzulen: ham.length - suz.length,
    min: sirali[0], p10: p10(ham), p90: sirali[Math.floor(ham.length * 0.9)],
    kararli: suz.length >= ham.length * 0.8,
  };
}

/* TEK OLCUM = TEK TARAYICI. Taze profil her cagrida yeniden dogar. */
async function sogukKosum(yol) {
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 600000,
  });
  try {
    const tz = await isinVeOlc(browser);
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const cdp = await page.target().createCDPSession();
    await page.evaluateOnNewDocument(() => {
      try {
        sessionStorage.setItem('qanat-splash-seen', '1');
        sessionStorage.setItem('qanat-prolog-atlandi', '1');
      } catch (e) {}
    });
    await page.goto(SUNUCU + yol, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.evaluate(KAYITCI);
    await page.bringToFront();
    await page.mouse.move(720, 450);
    await bekle(1200);
    await page.evaluate(() => __kBasla());
    await bekle(3000);
    const tabanAra = await page.evaluate(() => __kBitir());
    const tabanTak = tabanAra.filter((a) => a > TAKILMA_ESIK);
    if (BOZ) {
      const bozMs = Number(process.env.BOZ_MS || (tz.tik_ms * 2.4).toFixed(1));
      await page.evaluate((ms) => {
        window.__bozDur = false;
        const yak = (s) => { const t0 = performance.now(); while (performance.now() - t0 < s) { /* mesgul bekle */ } };
        const g = () => { if (window.__bozDur) return; yak(ms); requestAnimationFrame(g); };
        requestAnimationFrame(g);
      }, bozMs);
    }
    const toplamPx = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
    await page.evaluate(() => __kBasla());
    const t0 = performance.now();
    let y = 0;
    while (y < toplamPx - 4) {
      const adim = Math.min(600, toplamPx - y);
      await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, yDistance: -adim, speed: 900, gestureSourceType: 'mouse' });
      const yeniY = await page.evaluate(() => scrollY);
      if (yeniY <= y) break;
      y = yeniY;
      if (performance.now() - t0 > 90000) break;
    }
    await bekle(300);
    const ara = await page.evaluate(() => __kBitir());
    const turMs = ara.reduce((a, b) => a + b, 0);
    const tak = ara.filter((a) => a > TAKILMA_ESIK);
    return {
      tazeleme: tz,
      kare: ara.length, tur_ms: Math.round(turMs), p95_ms: p95(ara), medyan_ms: medyan(ara),
      kare_p95: +(p95(ara) / tz.tik_ms).toFixed(3),
      kacirilan_kare: Math.max(0, Math.round(p95(ara) / tz.tik_ms) - 1),
      takilma_sayi: tak.length, takilma_toplam_ms: Math.round(tak.reduce((a, b) => a + b, 0)),
      takilma_tek_max_ms: tak.length ? Math.round(Math.max(...tak)) : 0,
      taban: { sure_ms: Math.round(tabanAra.reduce((a, b) => a + b, 0)), takilma_sayi: tabanTak.length, p95_ms: p95(tabanAra), tik_p10: p10(tabanAra) },
      scroll_px: y, toplam_px: toplamPx,
    };
  } finally {
    await browser.close();
  }
}

(async () => {
  console.log(`KAPI B — SOGUK GIRIS · ${TARAYICI} · ${secim.length} sayfa · ${TEKRAR} kosum · HER KOSUM AYRI TARAYICI${BOZ ? '  [BOZ KIRMIZI-ONCE]' : ''}`);
  console.log('ESIK YOK: bu bir olcum araci, kapi degil. Dagilim olculur, esik veriye gore onerilir, karar Enes\'te.');
  const sonuc = [];
  for (const yol of secim) {
    const k = [];
    for (let i = 0; i < TEKRAR; i++) k.push(await sogukKosum(yol));
    const oz = {
      yol, kosum: k,
      p95_medyan: medyan(k.map((x) => x.p95_ms)),
      kacirilan_medyan: medyan(k.map((x) => x.kacirilan_kare)),
      kacirilan_kosumlar: k.map((x) => x.kacirilan_kare),
      kacirilan_en_yuksek: Math.max(...k.map((x) => x.kacirilan_kare)),
      kare_p95_medyan: +medyan(k.map((x) => x.kare_p95)).toFixed(3),
      takilma_oran_medyan: +medyan(k.map((x) => x.tur_ms ? x.takilma_toplam_ms / x.tur_ms : 0)).toFixed(4),
      takilma_tek_max: Math.max(...k.map((x) => x.takilma_tek_max_ms)),
      taban_takilma: k.map((x) => x.taban.takilma_sayi),
      tik_kosumlar: k.map((x) => x.tazeleme.tik_ms),
    };
    sonuc.push(oz);
    console.log(`  ${yol.padEnd(38)} p95 ${k.map((x) => x.p95_ms).join('/')} → ${oz.p95_medyan} ms = ${oz.kare_p95_medyan.toFixed(2)} tik · KACIRILAN ${oz.kacirilan_kosumlar.join('/')} → ${oz.kacirilan_medyan} · takilma oran ${(oz.takilma_oran_medyan * 100).toFixed(2)}% tek ${oz.takilma_tek_max} ms · taban ${oz.taban_takilma.join('/')}`);
  }
  const dagilim = {};
  for (const s of sonuc) dagilim[s.kacirilan_medyan] = (dagilim[s.kacirilan_medyan] || 0) + 1;
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/olc-soguk.cjs — KAPI B SOGUK GIRIS: taze tarayici profili + sabit isinma dizisi + TEK sayfa. Kapi A (olc-sayfa.cjs) gerileme kapisi, bu ziyaretci kapisi. ESIK YOK: dagilim olculur, esik veriye gore onerilir, karar Enes\'te.',
    kapi: 'B — SOGUK GIRIS (olcum araci, kapi degil)',
    isinma_dizisi: [
      'her olcum icin AYRI TARAYICI (taze gecici profil)',
      'about:blank acilir',
      'tazeleme olculur (200 rAF araligi, ilk 5 atilir)',
      '1500 ms bosta beklenir',
      'about:blank kapatilir',
      'olculecek sayfa acilir — SITE SAYFASI ISINMAYA GIRMEZ',
      '1200 ms + fare hareketi + taban 3 sn + tur (900 px/s gercek girdi)',
    ],
    olcum: new Date().toISOString(), tarayici: TARAYICI, tekrar: TEKRAR,
    boz: BOZ ? { ms: Number(process.env.BOZ_MS || 0) || 'tik x 2,4', _: 'KIRMIZI-ONCE kolu acikti: bu kayit olcum degil, duzenegin bozulmayi ayirt edebildiginin kanitidir' } : false,
    esik: null,
    esik_notu: 'ESIK BILEREK KONULMADI (Enes, 5 Eyl). Once dagilim, sonra veriye dayali oneri, karari Enes verir.',
    sinyal: { takilma_esik_ms: TAKILMA_ESIK, tek_takilma_ms: TEK_TAKILMA_MS, toplam_oran: TOPLAM_ORAN, _: 'Kapi A ile birebir ayni olmali — olc-esik.test.mjs sinar' },
    hukum: 'OLCUM — esik yok, hukum verilmez',
    dagilim, sayfa: sonuc,
  }, null, 1));
  console.log('\nDAGILIM (kacirilan kare medyani):');
  for (const k of Object.keys(dagilim).sort()) console.log(`  ${k} kare  x${dagilim[k]}`);
  console.log(`\nOLCUM BITTI (esik yok, hukum verilmez)\n→ ${CIKTI}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
