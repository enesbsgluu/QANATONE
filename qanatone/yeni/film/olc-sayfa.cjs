#!/usr/bin/env node
/* EK KAPI — BUTUN SAYFALAR (Enes, 4 Eyl 2026): "Site kasmiyor" hukmu ancak
   butun sayfalar olculunce kurulabilir. Her sayfa icin AYRI AYRI:
     1. p95'te KACIRILAN KARE <= 1 — UC KOSUM MEDYANI (TIK cinsinden, ms degil)
     2. kaydirma boyunca takilma: toplam <= turun %3'u · tek takilma <= 250 ms
     3. TABAN DAMGASI her olcumde (sayfa yuklu, kaydirmasiz 3 sn: ayni
        sinyal, ayni esik — olc-efekt ilkesi; kapi taban-goreceli DEGIL,
        talimattaki mutlak esikler; taban yalniz ortamin gurultusunu yazar)
     4. sayfa JS butcesi (J1'in olctugu ayni bayt: satir ici + src)
   Bir sayfa gecmiyorsa ADIYLA yazilir ve DURULUR (cikis kodu 2).

   KAPI TIK CINSINDEN (Enes, 4 Eyl 2026 — YENIDEN TANIM). Eski kapi "p95 <=
   20 ms" idi ve IKI KUSURU vardi: (1) p95 KUANTALI, ~tikin katlarina
   oturuyor — 8,5 / 16,7 / 25,0 — yani 20 ms iki tikle uc tik ARASINDA duran
   ikili bir kapiydi, arada deger yok; (2) degeri ekrana bagliydi: 120 Hz'de
   iki tik 16,7 ms (gecer), 60 Hz'de iki tik 33,3 ms (ayni site hic gecemez).
   Yeni kapi: p95'te KACIRILAN KARE = round(p95 / tik) - 1, kapi <= 1.
   TIK SABIT YAZILMAZ, HER KOSUMDA OLCULUR: tarayici acilisinda bos sayfada
   (about:blank) rAF araliklari toplanir, aykiri degerler atilir, medyan tik
   olur; Hz = 1000/tik. Kayitta `tazeleme` bloğu bunu yazar. Her sayfanin
   TABANINDAN da capraz kontrol cikar (taban.tik_p10); acilis tikiyle %20'den
   fazla ayrilirsa `tik_sapma` bayragi kalkar — ekran hizi kosum ortasinda
   degismis olabilir.
   TAKILMA ESIGI MS KALIYOR (50 ms, degistirilmedi): o perceptual bir esik,
   ekran hizindan bagimsiz olarak kullanicinin gordugu sicrama. Kayitta tik
   cinsinden karsiligi da yazilir ki tutarsizlik gorunur olsun.
   SINYAL: rAF araligi (ms). Takilma = ardisik iki rAF arasi > 50 ms;
   takilma suresi o aralik.
   Tur: sayfa basindan sonuna GERCEK girdi (Input.synthesizeScrollGesture,
   900 px/s, 600 px'lik adimlar) — evaluate(scrollTo) surucuyu kendi
   ritmine sokar (olc-zincir dersi). Kabuk efektleri (yildiz/imlec/damga)
   yuklu: boyama sonrasi 1,2 sn beklenir, fare bir kez oynatilir (imlec
   dongusu kurulsun). Film/deneme-react sayfalari ATLANIR: filmin kendi
   kapanis tablosu var, deneme gecici.
   Kullanim: node yeni/film/olc-sayfa.cjs   (once: node yerel-sun.cjs)
   Cevre  : TEKRAR=3 · SAYFA=/yeni/otomasyon/ (tek sayfa) · TARAYICI=brave
   KIRMIZI-ONCE: BOZ=1 olculen sayfaya, TABANDAN SONRA, her karede ~2,4 tik
   yakan bir dongu enjekte eder; BOZ_MS=<ms> ile yakma suresi verilebilir.
   Kural KIRMIZI yanmalidir; yanmiyorsa duzenegin yesili anlamsizdir.
   4 Eyl 2026'da 120,5 Hz'de olculen iki kol (/hizmetler/geo/, tek kosum):
     BOZ=1     (yakma 19,9 ms) p95 41,6 ms = 5,01 tik -> KACIRILAN 4 · KALDI
     BOZ_MS=8  (yakma  8,0 ms) p95 25,0 ms = 3,01 tik -> KACIRILAN 2 · KALDI
   Ikincisi SINIR kolu: eski "25 ms bandi" yeni tanimla da kirmizidir.
   Taban BILEREK temiz birakilir (yakma tabandan sonra girer): kirmizi
   yalnizca tik kuralindan gelsin, taban gurultusunden degil. */
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
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-sayfa.json');
const TEKRAR = Number(process.env.TEKRAR || 3);
const KACIRILAN_KAPI = Number(process.env.KACIRILAN_KAPI || 1);   /* p95'te kacirilan kare */
const P95_ESKI_MS = 20;                    /* KAPI DEGIL: eski ms esigi, kayitta kiyas icin */
const TAKILMA_ESIK = 50, TEK_TAKILMA_MS = 250, TOPLAM_ORAN = 0.03;
const BOZ = process.env.BOZ === '1' || !!process.env.BOZ_MS;      /* kirmizi-once kolu */
const TAVAN = { ana: 12.5 * 1024, film: 11 * 1024, obur: 10 * 1024 };

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : null; };
/* p10 — tazeleme capraz kontrolu icin: tabanda gorulen en kisa MAKUL aralik.
   min DEGIL: rAF nadiren iki kez ust uste atesleyip sahte kisa aralik uretir,
   p10 buna dayaniklidir. */
const p10 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.10)] : null; };

/* EKRAN TAZELEME OLCUMU — TIK SABIT YAZILMAZ, HER KOSUMDA OLCULUR.
   Bos sayfada (site isi yok, kacirilacak kare yok) rAF araliklari toplanir;
   medyanin %50-150 bandi disi atilir — kacirilmis kare UZUN, cift atesleme
   KISA aralik uretir — kalanin medyani TIK olur. Hz = 1000/tik. */
async function tazelemeOlc(browser) {
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
  await page.close();
  const ham = ara.slice(5);                                  /* ilk kareler isinma */
  const m0 = medyan(ham);
  const suz = ham.filter((x) => x > m0 * 0.5 && x < m0 * 1.5);
  const tik = +medyan(suz).toFixed(3);
  const sirali = [...ham].sort((a, b) => a - b);
  return {
    tik_ms: tik, hz: +(1000 / tik).toFixed(1),
    ornek: ham.length, suzulen: ham.length - suz.length,
    min: sirali[0], p10: p10(ham), p90: sirali[Math.floor(ham.length * 0.9)],
    kararli: suz.length >= ham.length * 0.8,
  };
}

/* sayfa listesi dist'ten (film + deneme haric) */
const sayfalar = [];
(function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(_astro|font|img|varlik|film|deneme-react)$/.test(e.name)) gez(p); }
    else if (e.name === 'index.html') sayfalar.push('/yeni/' + path.relative(DIST, p).replace(/\\/g, '/').replace(/index\.html$/, ''));
  }
})(DIST);
/* FILTRE=regex: sayfa alt kumesi (10 dakikalik parcalar halinde kosmak icin) · CIKTI=dosya adi */
const secim = process.env.SAYFA ? [process.env.SAYFA] : sayfalar.sort().filter((y) => !process.env.FILTRE || new RegExp(process.env.FILTRE).test(y));
/* KISMI KOSUM HUKUM DEGILDIR (4 Eyl 2026 — olculdu, asagida). Ayni sayfa,
   ayni makine, ayni agac: /hizmetler/finans/ TAM TARAMA icinde 16,7 ms
   (2,01 tik · kacirilan 1 · GECER), tek basina ya da uc sayfalik kesitte
   24,9-25,0 ms (3,01 tik · kacirilan 2 · KALIR). Uc kez ayri ayri olculdu,
   yuk yok, taban 0/0/0, BOZ kapali. Tarayici kendinden onceki sayfalarin
   isinmasindan faydalaniyor; TEKRAR=3 bunu KAPATMIYOR (ayni sayfayi ucuncu
   kez yuklemek yetmiyor, fayda BASKA sayfalardan geliyor). Bu yuzden kismi
   kosumun ciktisi hukum diye etiketlenmez: `kismi: true` yazilir, hukmun
   basina KISMI konur ve cikis kodu 0 olur — kirmizi bile olsa kapiyi
   dusurmez, cunku o kirmizinin sayfadan mi kosum boyundan mi geldigi
   ayrilamaz. Tam tarama (59 sayfa) tek kanonik hukumdur. */
const KISMI = secim.length < sayfalar.length;

/* J1 ile ayni bayt sayimi (denetim.cjs). IKI KALEM J1 ILE AYNI SEBEPLE
   DISARIDA (Enes onayi, 3/4 Eyl gece zinciri — "prologlu butce tavanlari
   onaylandi, sarti her tavanin gerekcesi rakamiyla dosyada dursun"):
     · LEAD FORMU BETIGI (~2,3 KB): kaynakta da her rotanin sonundaydi,
       kabuk kalemi — sayfa tavanindan dusulur, ayrica raporlanir.
     · PROLOG: ana sayfa film bolumunu tasiyorsa tavan ana + film
       (12,5 + 11 = 23,5 KB); filmin kendi kapilari ayri (FM1). */
function jsBayt(yol) {
  const f = path.join(DIST, yol.replace(/\?.*$/, '').replace(/^\/yeni\//, ''), 'index.html');
  const h = fs.readFileSync(f, 'utf8');
  let t = 0;
  for (const m of h.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/g)) { const d = path.join(DIST, m[1].replace(/^\/yeni\//, '')); if (fs.existsSync(d)) t += fs.statSync(d).size; }
  for (const m of h.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) if (!/ld\+json/.test(m[1]) && !/getElementById\('silForm'\)/.test(m[2])) t += Buffer.byteLength(m[2]);
  return t;
}
/* prologlu ana sayfa: film bolumu ham HTML'de mi */
const prologlu = (yol) => {
  const f = path.join(DIST, yol.replace(/\?.*$/, '').replace(/^\/yeni\//, ''), 'index.html');
  return fs.existsSync(f) && /<section class="fl"/.test(fs.readFileSync(f, 'utf8'));
};
const tavan = (yol) => (/^\/yeni\/(en\/)?$/.test(yol.replace(/\?.*$/, ''))
  ? TAVAN.ana + (prologlu(yol) ? TAVAN.film : 0)
  : /film/.test(yol) ? TAVAN.film : TAVAN.obur);

const KAYITCI = `(() => {
  window.__k = { ara: [], on: false, son: null };
  const f = (t) => { if (__k.son !== null && __k.on) __k.ara.push(+(t - __k.son).toFixed(2)); __k.son = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);
  window.__kBasla = () => { __k.ara.length = 0; __k.on = true; };
  window.__kBitir = () => { __k.on = false; return __k.ara.slice(); };
})()`;

async function kosum(browser, yol, tik) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const cdp = await page.target().createCDPSession();
  /* PROLOG ATLANMIS OTURUM (3/4 Eyl 2026): ana sayfanin onunde artik film
     var; motor klipleri surekli cektigi icin `networkidle0` HIC gelmiyor ve
     kapi zaman asimina dusuyordu. Bu kapi SITE GOVDESINI olcer — filmin
     kendi kapilari ayri (FM1 bellek/ilk kare/sinir, olc-devir, olc-efekt) ve
     /film sayfasi zaten atlaniyor. Oturum bayragi konunca ana sayfa, prologu
     bir kez gormus ziyaretcinin gordugu sayfadir. Perde bayragi da ayni
     sebeple (kapi kaydirma turunu olcer, acilis selamini degil). */
  await page.evaluateOnNewDocument(() => {
    try {
      sessionStorage.setItem('qanat-splash-seen', '1');
      sessionStorage.setItem('qanat-prolog-atlandi', '1');
    } catch (e) {}
  });
  await page.goto(SUNUCU + yol, { waitUntil: 'networkidle0', timeout: 60000 });
  /* GIZLE=secici — TESHIS KOLU: bolum gizlenip ayni tur olculur (pay atfi) */
  if (process.env.GIZLE) await page.addStyleTag({ content: `${process.env.GIZLE}{display:none!important}` });
  await page.evaluate(KAYITCI);
  await page.bringToFront();
  await page.mouse.move(720, 450);
  await bekle(1200);                                 /* kabuk efektleri kurulsun (bosta ithal) */
  /* taban: kaydirmasiz 3 sn */
  await page.evaluate(() => __kBasla());
  await bekle(3000);
  const tabanAra = await page.evaluate(() => __kBitir());
  const tabanTak = tabanAra.filter((a) => a > TAKILMA_ESIK);
  /* KIRMIZI-ONCE (BOZ): TABANDAN SONRA enjekte edilir — kirmizi yalnizca tik
     kuralindan gelsin, taban gurultusunden degil. Her karede ~2,4 tik yakan
     bir dongu: sayfa IKI kare kacirmaya baslar, kural kirmizi yanmalidir. */
  if (BOZ) {
    const bozMs = Number(process.env.BOZ_MS || (tik * 2.4).toFixed(1));
    await page.evaluate((ms) => {
      window.__bozDur = false;
      const yak = (s) => { const t0 = performance.now(); while (performance.now() - t0 < s) { /* mesgul bekle */ } };
      const g = () => { if (window.__bozDur) return; yak(ms); requestAnimationFrame(g); };
      requestAnimationFrame(g);
    }, bozMs);
  }
  /* tur: gercek girdi, 900 px/s */
  const toplamPx = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
  await page.evaluate(() => __kBasla());
  const t0 = performance.now();
  let y = 0;
  while (y < toplamPx - 4) {
    const adim = Math.min(600, toplamPx - y);
    await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, yDistance: -adim, speed: 900, gestureSourceType: 'mouse' });
    const yeniY = await page.evaluate(() => scrollY);
    if (yeniY <= y) break;                           /* ilerlemiyorsa (kisa sayfa) cik */
    y = yeniY;
    if (performance.now() - t0 > 90000) break;
  }
  await bekle(300);
  const ara = await page.evaluate(() => __kBitir());
  await page.close();
  const turMs = ara.reduce((a, b) => a + b, 0);
  const tak = ara.filter((a) => a > TAKILMA_ESIK);
  return {
    kare: ara.length, tur_ms: Math.round(turMs), p95_ms: p95(ara), medyan_ms: medyan(ara),
    takilma_sayi: tak.length, takilma_toplam_ms: Math.round(tak.reduce((a, b) => a + b, 0)), takilma_tek_max_ms: tak.length ? Math.round(Math.max(...tak)) : 0,
    taban: { sure_ms: Math.round(tabanAra.reduce((a, b) => a + b, 0)), takilma_sayi: tabanTak.length, p95_ms: p95(tabanAra), tik_p10: p10(tabanAra) },
    scroll_px: y, toplam_px: toplamPx,
  };
}

(async () => {
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 600000,
  });
  const surum = await browser.version();
  const tz = await tazelemeOlc(browser);
  console.log(`TARAYICI : ${TARAYICI} · ${surum} · ${secim.length} sayfa · ${TEKRAR} kosum`);
  console.log(`TAZELEME : ${tz.hz} Hz · tik ${tz.tik_ms} ms · ornek ${tz.ornek} (suzulen ${tz.suzulen}) · min ${tz.min} p10 ${tz.p10} p90 ${tz.p90}${tz.kararli ? '' : ' !! KARARSIZ'}`);
  console.log(`KAPI     : p95'te kacirilan kare <= ${KACIRILAN_KAPI} (yani p95 <= ${((KACIRILAN_KAPI + 1) * tz.tik_ms).toFixed(1)} ms bu ekranda) · takilma toplam <= %${TOPLAM_ORAN * 100} · tek <= ${TEK_TAKILMA_MS} ms${BOZ ? '  [BOZ=1 KIRMIZI-ONCE]' : ''}`);
  const sonuc = [];
  let dur = null;
  for (const yol of secim) {
    const k = [];
    for (let i = 0; i < TEKRAR; i++) k.push(await kosum(browser, yol, tz.tik_ms));
    const js = jsBayt(yol), tv = tavan(yol);
    const oz = {
      yol, js_bayt: js, js_tavan: tv, kosum: k,
      p95_medyan: medyan(k.map((x) => x.p95_ms)),
      takilma_oran_medyan: +medyan(k.map((x) => x.tur_ms ? x.takilma_toplam_ms / x.tur_ms : 0)).toFixed(4),
      takilma_tek_max: Math.max(...k.map((x) => x.takilma_tek_max_ms)),
      taban_takilma: k.map((x) => x.taban.takilma_sayi),
    };
    /* TIK CINSINDEN HUKUM. kacirilan kare = round(p95 / tik) - 1: bir kare
       her zaman bir tik surer, kapi USTUNE kac tik bindigini sorar. */
    oz.kare_p95 = +(oz.p95_medyan / tz.tik_ms).toFixed(3);
    oz.kacirilan_kare = Math.max(0, Math.round(oz.kare_p95) - 1);
    /* kuantadan sapma: p95 tikin tam katina oturmuyorsa yazilir (kapi degil,
       gorunurluk — kuantali olmayan bir dagilim baska bir seyin isaretidir) */
    oz.kuanta_sapma = +Math.abs(oz.kare_p95 - Math.round(oz.kare_p95)).toFixed(3);
    oz.p95_eski_ms_kapisi = oz.p95_medyan <= P95_ESKI_MS;      /* KAPI DEGIL: kiyas */
    /* capraz kontrol: sayfanin kendi tabanindan cikan tik acilis tikiyle
       %20'den fazla ayrilirsa ekran hizi kosum ortasinda degismis olabilir */
    const tikCapraz = medyan(k.map((x) => x.taban.tik_p10).filter((x) => x != null));
    oz.tik_sapma = (tikCapraz != null && Math.abs(tikCapraz - tz.tik_ms) / tz.tik_ms > 0.20) ? +tikCapraz.toFixed(3) : false;
    oz.kapi = {
      kacirilan_kare: oz.kacirilan_kare <= KACIRILAN_KAPI, takilma_oran: oz.takilma_oran_medyan <= TOPLAM_ORAN,
      takilma_tek: oz.takilma_tek_max <= TEK_TAKILMA_MS, js: js <= tv,
    };
    oz.gecti = Object.values(oz.kapi).every(Boolean);
    sonuc.push(oz);
    console.log(`${oz.gecti ? 'GECTI' : 'KALDI'}  ${yol.padEnd(34)} p95 ${k.map((x) => x.p95_ms).join('/')} → ${oz.p95_medyan} ms = ${oz.kare_p95.toFixed(2)} tik → KACIRILAN ${oz.kacirilan_kare}/${KACIRILAN_KAPI} · takilma ${k.map((x) => x.takilma_sayi + 'x' + x.takilma_toplam_ms + 'ms').join(' ')} oran ${(oz.takilma_oran_medyan * 100).toFixed(2)}% tek ${oz.takilma_tek_max} ms · taban ${oz.taban_takilma.join('/')} · JS ${js}/${tv}${oz.kuanta_sapma > 0.25 ? ' · kuanta sapma ' + oz.kuanta_sapma : ''}${oz.tik_sapma ? ' · TIK SAPMA taban ' + oz.tik_sapma : ''}${oz.gecti ? '' : ' !! ' + Object.entries(oz.kapi).filter(([, v]) => !v).map(([n]) => n).join(',')}`);
    if (!oz.gecti && process.env.DEVAM !== '1') { dur = yol; break; }
  }
  await browser.close();
  const ham = dur ? `KALDI — DURULDU: ${dur}` : (sonuc.every((s) => s.gecti) ? 'GECTI' : 'KALDI');
  const hukum = KISMI ? `KISMI (${secim.length}/${sayfalar.length} sayfa) — HUKUM DEGIL · ham: ${ham}` : ham;
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/olc-sayfa.cjs — EK KAPI butun sayfalar: p95te KACIRILAN KARE<=1 (TIK cinsinden, tik her kosumda olculur) · takilma toplam<=%3 + tek<=250 ms · taban damgali · JS butcesi. Film/deneme-react haric.',
    kapi: 'A — TAM TARAMA (gerileme kapisi; 59 sayfa tek tarayicida). Ziyaretci olcumu KAPI B: yeni/film/olc-soguk.cjs',
    olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, tekrar: TEKRAR,
    tazeleme: tz,
    boz: BOZ ? { ms: Number(process.env.BOZ_MS || (tz.tik_ms * 2.4).toFixed(1)), _: 'KIRMIZI-ONCE kolu acikti: bu kayit hukum degil, duzenegin kirmizi yanabildiginin kanitidir' } : false,
    esik: {
      kacirilan_kare: KACIRILAN_KAPI,
      p95_esdeger_ms: +((KACIRILAN_KAPI + 1) * tz.tik_ms).toFixed(2),
      takilma_esik_ms: TAKILMA_ESIK, takilma_esik_tik: +(TAKILMA_ESIK / tz.tik_ms).toFixed(2),
      tek_takilma_ms: TEK_TAKILMA_MS, toplam_oran: TOPLAM_ORAN,
      p95_eski_ms: P95_ESKI_MS, _: 'p95_eski_ms KAPI DEGIL — 4 Eyl oncesi ms esigi, kiyas icin yazilir',
    },
    hukum, kismi: KISMI ? { olculen: secim.length, tum: sayfalar.length, _: 'kismi kosum HUKUM DEGIL: tarayici isinmasi sayfa basina bir tik oynatabiliyor (kunyeye bak)' } : false,
    durulan: dur, sayfa: sonuc,
  }, null, 1));
  console.log(`\nHUKUM: ${hukum}\n→ ${CIKTI}`);
  if (KISMI) console.log(`!! KISMI KOSUM — ${secim.length}/${sayfalar.length} sayfa. Bu cikti hukum degildir (kunye: kismi kosum). Kapi icin tam tarama koş.`);
  /* KISMI kosum kirmiziyi ATFEDEMEZ, o yuzden kapiyi dusurmez — TEK ISTISNA
     BOZ: orada kirmiziyi biz urettik, atif bizde; kirmizi-once kolunun cikis
     kodu da kirmizi olmali, yoksa kolun kendisi kanit olmaz. */
  process.exit(KISMI && !BOZ ? 0 : (dur || !sonuc.every((s) => s.gecti) ? 2 : 0));
})().catch((e) => { console.error(e); process.exit(1); });
