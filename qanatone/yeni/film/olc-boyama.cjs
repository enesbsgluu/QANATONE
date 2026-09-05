#!/usr/bin/env node
/* ACILIS BOYAMASININ MUHASEBESI — TESHIS ARACI, KAPI DEGIL (5 Eyl 2026).

   SORU. Acilistaki uzun kareler (mobil FCP ~2028 ms, 18 uzun kare, en uzun
   ~860 ms; masaustunde film KAPALIYKEN de kasiyor) hangi motor asamasindan
   geliyor? LoAF "betiksiz" diyor ve stil/yerlesim 2-8 ms yaziyor — geriye
   BOYAMA/RASTER kaliyor, ama "kaliyor" bir olcum degil, bir cikarim.

   NEDEN ABLASYON DEGIL. 4 Eyl'de aday eleme denendi (`#wmk`, `#bg .grid`,
   `.sus-atmo`, hero gorselleri, uc engelleyici CSS sirayla kaldirilarak) ve
   DUSTU: taban kolu ayni kosumda 3990 <-> 1358 ms saldi, kollar arasi
   farklar gurultunun altinda kaldi. Ablasyon KOSUMLAR ARASI fark olcer;
   soguk acilis kosumlar arasi kararli degil. Bu arac TEK KOSUMUN ICINDE
   muhasebe cikarir: aynı karenin icindeki is asamalara ayrilir, dolayisiyla
   kosum-kosum salinim orani bozmaz. Ablasyon buradan cikan ADI dogrulamak
   icin gelir — once ad, sonra eleme.

   OLCTUKLERI (CDP Tracing, hepsi navigationStart + SURE penceresinde):
     · asama muhasebesi  her is parcaciginin OZ zamani (cocuklarin suresi
                         dusulur), is parcacigi ipligine gore ayrilir:
                         CrRendererMain (stil/yerlesim/boyama/ayristirma),
                         Compositor, raster iscileri (RasterTask),
                         ImageDecodeTask. Iplik adi metadata'dan okunur,
                         sabit yazilmaz.
     · boyama kimin      `Paint` olaylari `args.data.nodeId` tasir; dugum
                         basina toplam sure toplanir ve EN PAHALI dugumler
                         CDP DOM ile gercek secicilere cozulur. "Boyama
                         pahali" degil, "SU dugumun boyamasi pahali".
     · gorsel cozme      ImageDecodeTask'lar + `Decode Image` olaylari, ve
                         indirilen gorsel bayti (Network) — cozme mi indirme
                         mi ayrilsin.
     · isaretler         navigationStart, firstPaint, firstContentfulPaint,
                         largestContentfulPaint::Candidate (trace'ten, sayfa
                         icinden degil).
     · LoAF              sayfa icinden `long-animation-frame` girdileri:
                         blockingDuration, styleAndLayoutDuration, betik
                         payi. Trace ile CAPRAZ KONTROL: ikisi ayni sayiyi
                         soylemiyorsa duzenek suphelidir, kayitta durur.

   YONTEM — HER KOSUM KENDI TAZE TARAYICI SURECINDE. Kapi A'nin kendi
   kunyesi (olc-sayfa.cjs 113-124) tarayicinin ONCEKI SAYFALARDAN isindigini
   ve bunun tam bir tik oynattigini olcmus durumda; acilis olcumu buna daha
   da duyarli. Bu yuzden burada tek tarayicida baglam acilmaz: her kosum
   ayri surec, ayri profil, kapaninca biter.

   5 EYL 2026'DA BU ARACIN OLCTUKLERI (kayit: olc-boyama-ozet.json,
   olc-boyama-mobil-kol.json, olc-boyama-mobil-inv.json — 61 kosum):

   1. HIPOTEZ CURUDU. Acilisin yuku BOYAMA/RASTER DEGIL. Butun Paint
      olaylarinin toplami masaustunde ~18 ms, mobilde ~41 ms; raster
      iscileri 2,6-5,2 ms. Yuk ana ipligin KARE DONGUSUNDE: stil yeniden
      hesabi (UpdateLayoutTree), IntersectionObserver, PrePaint, Layerize,
      Commit — sayfa DURUYORKEN saniyede ~82-100 kare uretiliyor.
   2. SURUCU ADI: `.sus-el` HERO SUSU. Iki 33vw oge, her birinde
      `inset:-14%` iki radyal-gradyan sozde katman (`sh-hale`), ve ustune
      sonsuz `sh-suzulA/B` (13 sn / 17,5 sn) donusum animasyonu.
      MOBIL (390 px, CPU/4, 5 sn penceresi, 3 kosum, yayilimlar AYRIK):
        ana iplik mesgul  4726 ms -> 1982 ms (suzulme durdu) / 1872 ms (hale durdu)
        stil              1132 ms ->  294 ms /  275 ms
        IO                 567 ms ->  126 ms /   91 ms
        Layerize           424 ms ->   87 ms /   69 ms
      Yani mobil acilisin ilk 5 saniyesindeki ana iplik isinin ~%58'i
      BU IKI OGENIN hareketi. Masaustunde ayni kalem stilin %38'i.
   3. ELENEN ADAYLAR (tahmin degil, olculdu — bir daha denenmesin):
      `.st-akis` serit akisi (stil 373,5 <-> 375 kontrol: FARK YOK) ·
      `ste-harf` 29 harflik view() kaskadi (373,1 <-> 382,1: FARK YOK,
      ekran disindaki view() animasyonlari bedava) · `.sus-el img`
      giris animasyonu (400,8 <-> 397,7: FARK YOK) · `#wmk` bit damgasi
      (IO ile doguyor, acilista hic kurulmuyor).
   4. `will-change:transform` COZUM DEGIL (olculdu): `.sus-suzul`
      kompozitore itildiginde stil 370,8 kaldi (kontrol 383) — kol
      kontrolden ayirt edilemedi. Yani "kompozitore cikar" ile kapanmiyor.
   5. `kompozit` tablosu BOS DONUYOR: bu Chrome surumu `Animation` trace
      olayini bu kategorilerde yaymiyor. BOS TABLO "hepsi kompozitore
      cikti" DEMEK DEGILDIR; oraya bakip hukum kurma.
   6. MOBIL KOL DOYMUS OLCER: kontrol kolunda ana iplik pencerenin
      %94'unde mesgul. Doymus kolda EKLENEN is oteki isi DISARI ITER
      (BOZ kirmizi-once kolunda Layout 366 -> 1292 ms cikarken stil
      1140 -> 928 ms DUSTU). Doymus kolda toplamlara degil, asama
      kalemlerine bakilir.

   KAPI YOK: cikis kodu her zaman 0, kayitta `hukum` yok.
   Kullanim: node yeni/film/olc-boyama.cjs        (once: node yerel-sun.cjs)
   Cevre   : SAYFA=/ · TEKRAR=3 · SURE=4000 (navigationStart'tan sonra)
             MOBIL=1 (390x844, dpr 3) · CPU=4 (islemci yavaslatma carpani)
             PERDE=1 (perde GOSTERILIR; varsayilan atlanir, oteki araclarla
             ayni) · TARAYICI=brave|chrome · UST=12 (tabloda kac satir)
             INVALIDASYON=1 (stili KIM bozuyor tablosu; kategori agir)
             KOLLAR=K,SUS,SERIT,IKISI,A1,BOZ (donusumlu kol kiyasi; BOZ
             kirmizi-once koludur, yanit degiskenini yukseltmek ZORUNDA)
             CIKTI=olc-boyama.json */
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
const SAYFA = process.env.SAYFA || '/';
const TEKRAR = +(process.env.TEKRAR || 3);
const SURE = +(process.env.SURE || 4000);
const UST = +(process.env.UST || 12);
const MOBIL = process.env.MOBIL === '1';
const CPU = +(process.env.CPU || 1);
const PERDE = process.env.PERDE === '1';
const INVALIDASYON = process.env.INVALIDASYON === '1';
const CIKTI = process.env.CIKTI || 'olc-boyama.json';

/* KOLLAR (KOLLAR=K,SUS,SERIT gibi). Kollar SIRAYLA DEGIL DONUSUMLU kosar:
   K,SUS,SERIT,K,SUS,SERIT... — makinenin zaman icindeki savrulmasi butun
   kollara ESIT dagilsin diye. Kol basina blok kosmak, savrulmayi kola mal
   eder (4 Eyl'de dusen olcumun ikinci kusuru buydu).
   Kollar CSS ile animasyonu DURDURUR, ogeyi GIZLEMEZ: yerlesim ayni kalir,
   yalnizca degisken degisir. Saflik kontrolu: her kol sayfa yuksekligini
   yazar, kontrolden sapan kol isaretlenir. */
const KOL_TANIM = {
  K: { ad: 'kontrol', css: '' },
  SUS: { ad: 'hero susleri durdu', css: '.sus-suzul,.sus-suzul::before,.sus-suzul::after{animation:none!important}' },
  SERIT: { ad: 'serit akisi durdu', css: '.st-akis{animation:none!important}' },
  IKISI: { ad: 'sus+serit durdu', css: '.sus-suzul,.sus-suzul::before,.sus-suzul::after,.st-akis{animation:none!important}' },
  HARF: { ad: 'ste-harf (29 harf view()) durdu', css: '.ste-h2 .ste-lt i{animation:none!important}' },
  SUSHARF: { ad: 'sus + ste-harf durdu', css: '.sus-suzul,.sus-suzul::before,.sus-suzul::after,.ste-h2 .ste-lt i{animation:none!important}' },
  HALE: { ad: 'yalniz ::before/::after hale (opaklik) durdu', css: '.sus-suzul::before,.sus-suzul::after{animation:none!important}' },
  SUZUL: { ad: 'yalniz suzulme (transform) durdu', css: '.sus-suzul{animation:none!important}' },
  ELGIRIS: { ad: 'yalniz gorsel girisi durdu', css: '.sus-el img{animation:none!important}' },
  SUSGPU: { ad: 'hero susleri KOMPOZITORE itildi (animasyon DURUYOR)', css: '.sus-suzul{will-change:transform}' },
  /* --- 5 Eyl 2026, ikinci tur: "transform NEDEN pahali" sorusu ---
     SUS kolu animasyonu DURDURUP kazanci olcuyor, ama sebebi adlandirmiyor.
     transform tek basina bilesik katmanda ucuzdur; pahali olmasi icin bir
     CARPAN gerek. Iki aday, ikisi de `.sus-suzul`un USTUNDE duruyor ve
     hicbiri simdiye kadar olculmedi:
       MASKE  — kap `.sus-eller` mask-image tasiyor. Maskeli agacta donen
                cocuk her karede maskeyle yeniden birlestirilir.
       SOZDE  — `.sus-suzul::before/::after` iki buyuk radyal gradyan
                (inset:-14%); donen katmanin icerigi bu ikisi.
     IKISI DE TESHIS KOLU: gorunusu degistirirler, cozum onerisi DEGIL.
     Yerlesimi degistirmezler (ikisi de absolute/boyamalik), yani aracin
     yukseklik saflik kontrolu temiz kalmali. */
  MASKE: { ad: 'kabin maskesi kalkti (animasyon KOSUYOR)',
    css: '.sus-eller{-webkit-mask-image:none!important;mask-image:none!important}' },
  SOZDE: { ad: 'hale/golge sozde katmanlari kalkti (animasyon KOSUYOR)',
    css: '.sus-suzul::before,.sus-suzul::after{display:none!important}' },
  /* --- ADAY KOLLARI (teshis degil, COZUM adaylari) ---
     SOZDE gosterdi ki pahali olan hareket degil, HAREKET ETTIRILEN ICERIK.
     Iki aday, ikisi de gradyanlari KORUR:
       SUSGPU  gorunusu HIC degistirmez (yalniz will-change). Masaustunde
               olculup "kazanc yok" denmisti — ama masaustunde kollarin
               HEPSI 1515-1798 arasinda, yani orada zaten ayirt edilemiyor.
               MOBILDE HIC OLCULMEDI; bosluk burada.
       AYIR    gradyanlari SALINAN cocuktan STATIK ebeveyne tasir: el
               salinir, hale durur. Kaynak sadakati acisindan ADI KONMUS
               SAPMA (gorsel hukum Enes'te) — bu kol o degisikligin
               birebir CSS taklidi, olcum once yapilsin diye. */
  AYIR: { ad: 'ADAY: gradyanlar salinan cocuktan STATIK ebeveyne tasindi',
    css: '.sus-suzul::before,.sus-suzul::after{display:none!important}'
      + '.sus-suzul{z-index:1}'
      + ".sus-el::before{content:'';position:absolute;inset:-14%;z-index:0;pointer-events:none;"
      + 'background:radial-gradient(58% 58% at 50% 52%,rgba(239,35,60,.2),transparent 72%)}'
      + ".sus-el::after{content:'';position:absolute;left:6%;right:6%;top:16%;bottom:-6%;"
      + 'z-index:0;pointer-events:none;'
      + 'background:radial-gradient(52% 46% at 50% 62%,rgba(0,0,0,.55),transparent 74%)}' },
  A1: { ad: 'hareket azaltildi (ust sinir)', css: '', hareket: true },
  BOZ: { ad: 'KIRMIZI-ONCE: pahali animasyon', boz: true,
    css: '@keyframes qboz{from{padding-left:0}to{padding-left:9px}}p,li,h2,h3,a,span{animation:qboz .6s linear infinite!important}' },
};
const KOLLAR = (process.env.KOLLAR || 'K').split(',').map((s) => s.trim()).filter(Boolean);

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const medyan = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const yuvarla = (n, b = 1) => +(+n).toFixed(b);

/* KATEGORILER. `disabled-by-default-devtools.timeline` RasterTask ve
   ImageDecodeTask'i getirir (boyamanin isciler tarafi); `...frame` kare
   sinirlarini; `loading` ve `blink.user_timing` isaretleri. */
const KATEGORI = [
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'blink.user_timing',
  'loading',
  'blink.animations',
].concat(INVALIDASYON ? ['disabled-by-default-devtools.timeline.invalidationTracking'] : []);

/* ---- trace cozumleme -------------------------------------------------- */

/* B/E ciftlerini X'e cevirir, X'leri oldugu gibi alir. Iplik basina. */
function araliklar(olaylar) {
  const cikti = [];
  const yigin = new Map();                                  /* iplik -> [olay] */
  for (const e of olaylar) {
    const ip = e.pid + ':' + e.tid;
    if (e.ph === 'X') { if (typeof e.dur === 'number') cikti.push({ ip, ad: e.name, ts: e.ts, dur: e.dur, args: e.args }); continue; }
    if (e.ph === 'B') { if (!yigin.has(ip)) yigin.set(ip, []); yigin.get(ip).push(e); continue; }
    if (e.ph === 'E') {
      const y = yigin.get(ip); if (!y || !y.length) continue;
      const b = y.pop();
      cikti.push({ ip, ad: b.name, ts: b.ts, dur: e.ts - b.ts, args: Object.assign({}, b.args, e.args) });
    }
  }
  return cikti;
}

/* OZ ZAMAN: cocuklarin suresi dusulur. Ayni iplikte ts'e gore sirali gezilir,
   yigin tutulur; her olayin suresi ATASINDAN dusulur. */
function ozZaman(list) {
  const perIp = new Map();
  for (const a of list) { if (!perIp.has(a.ip)) perIp.set(a.ip, []); perIp.get(a.ip).push(a); }
  for (const [, arr] of perIp) {
    arr.sort((x, y) => x.ts - y.ts || y.dur - x.dur);
    const yigin = [];
    for (const ev of arr) {
      ev.oz = ev.dur;
      while (yigin.length && yigin[yigin.length - 1].ts + yigin[yigin.length - 1].dur <= ev.ts) yigin.pop();
      const ust = yigin[yigin.length - 1];
      if (ust) ust.oz -= ev.dur;
      ev.ust = !ust;                                        /* ust duzey mi */
      yigin.push(ev);
    }
  }
  return list;
}

function iplikAdlari(olaylar) {
  const ad = new Map();
  for (const e of olaylar) if (e.ph === 'M' && e.name === 'thread_name') ad.set(e.pid + ':' + e.tid, e.args && e.args.name);
  return ad;
}

/* ---- tek kosum -------------------------------------------------------- */

async function kosum(no, kolAdi) {
  const kol = KOL_TANIM[kolAdi] || KOL_TANIM.K;
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980', '--no-first-run', '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 600000,
  });
  try {
    const page = await browser.newPage();
    await page.setViewport(MOBIL
      ? { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
      : { width: 1440, height: 900, deviceScaleFactor: 1 });
    if (!PERDE) await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem('qanat-splash-seen', '1'); } catch (e) {} });
    if (kol.hareket) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    if (kol.css) await page.evaluateOnNewDocument((css) => {
      const ekle = () => { if (!document.head) return false; const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); return true; };
      if (!ekle()) new MutationObserver((m, o) => { if (ekle()) o.disconnect(); }).observe(document.documentElement || document, { childList: true, subtree: true });
    }, kol.css);
    /* LoAF gozcusu: sayfanin kendi olcumu, trace ile capraz kontrol icin */
    await page.evaluateOnNewDocument(() => {
      window.__loaf = [];
      try {
        new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__loaf.push({
          baslangic: e.startTime, sure: e.duration, engelleyici: e.blockingDuration,
          stil_yerlesim: e.styleAndLayoutDuration, oncesi: e.renderStart - e.startTime,
          betik: (e.scripts || []).reduce((a, s) => a + s.duration, 0),
        }); }).observe({ type: 'long-animation-frame', buffered: true });
      } catch (e) { window.__loaf_yok = String(e); }
      /* IntersectionObserver sayimi: trace "computeIntersections" diyor ama
         HANGI gozcu demiyor. Yapici sarilir; her gozcu kendi dogum yigini,
         gozledigi hedef sayisi ve geri cagri sayisiyla kayda gecer. */
      try {
        window.__io = [];
        const Ger = window.IntersectionObserver;
        if (Ger) {
          const Sarma = function (cb, opt) {
            const kayit = {
              dogum: String((new Error()).stack || '').split('\n').slice(2, 5).map((s) => s.trim()).join(' <- '),
              secenek: JSON.stringify(opt || {}), hedef: 0, cagri: 0, girdi: 0,
            };
            window.__io.push(kayit);
            const o = new Ger(function (girdiler, gozcu) { kayit.cagri++; kayit.girdi += girdiler.length; return cb.call(this, girdiler, gozcu); }, opt);
            const asil = o.observe.bind(o);
            o.observe = (el) => { kayit.hedef++; return asil(el); };
            return o;
          };
          Sarma.prototype = Ger.prototype;
          window.IntersectionObserver = Sarma;
        }
      } catch (e) { window.__io_yok = String(e); }
    });

    const cdp = await page.target().createCDPSession();
    if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    await cdp.send('Network.enable');
    /* isteklerin baytini requestId ile eslestir */
    const bayt = new Map();
    cdp.on('Network.responseReceived', (p) => bayt.set(p.requestId, { tur: p.type, url: p.response.url, bayt: 0 }));
    cdp.on('Network.loadingFinished', (p) => { const b = bayt.get(p.requestId); if (b) b.bayt = p.encodedDataLength; });

    const olaylar = [];
    cdp.on('Tracing.dataCollected', ({ value }) => { for (const v of value) olaylar.push(v); });
    const bitti = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.start', {
      transferMode: 'ReportEvents',
      traceConfig: { includedCategories: KATEGORI, recordMode: 'recordAsMuchAsPossible' },
    });

    await page.goto(SUNUCU + SAYFA, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await bekle(SURE);
    await cdp.send('Tracing.end'); await bitti;

    const loaf = await page.evaluate(() => window.__loaf || []).catch(() => []);
    const zaman = await page.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0] || {};
      const p = {}; for (const e of performance.getEntriesByType('paint')) p[e.name] = e.startTime;
      return { yuklendi: n.loadEventEnd || 0, dom: n.domContentLoadedEventEnd || 0, boya: p };
    }).catch(() => ({}));
    const gozcu = await page.evaluate(() => (window.__io || []).slice()).catch(() => []);
    /* SAFLIK: kol yerlesimi degistirdiyse kiyas kirlenir — yukseklik yazilir */
    const yukseklik = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 0);
    /* animasyon sayimi: stil yeniden hesabinin bilinen surucusu (5 Eyl dersi) */
    const animasyon = await page.evaluate(() => {
      if (!document.getAnimations) return { yok: true };
      const a = document.getAnimations();
      const zamanCizgi = (x) => { try { return (x.timeline && x.timeline.constructor && x.timeline.constructor.name) || '?'; } catch (e) { return '?'; } };
      const say = {};
      for (const x of a) { const k = zamanCizgi(x) + '/' + x.playState; say[k] = (say[k] || 0) + 1; }
      /* HANGI animasyon, HANGI ogede, EKRANDA MI. Ekran disinda kosan
         animasyon her karede stil yeniden hesabi dogurur ama kimse gormez;
         bu listenin amaci o israfi ADLANDIRMAK. */
      const gorunur = (el) => { try { const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; } catch (e) { return null; } };
      const secici = (el) => { try {
        return (el.localName || '?') + (el.id ? '#' + el.id : '') + (el.className && el.className.baseVal === undefined && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''); } catch (e) { return '?'; } };
      const kalem = {};
      for (const x of a) {
        const t = x.effect && x.effect.target; if (!t) continue;
        const el = t.pseudoElement ? t.element || t : t;
        const ad = secici(el) + (x.effect.pseudoElement || '') + ' « ' + (x.animationName || (x.effect.getKeyframes && '?') || '?');
        const k = kalem[ad] || (kalem[ad] = { ad, say: 0, kosan: 0, ekranda: 0, disarida: 0, zaman: zamanCizgi(x) });
        k.say++; if (x.playState === 'running') k.kosan++;
        const g = gorunur(el); if (g === true) k.ekranda++; else if (g === false) k.disarida++;
      }
      return { toplam: a.length, kosan: a.filter((x) => x.playState === 'running').length,
        kaydirmali: a.filter((x) => /ViewTimeline|ScrollTimeline/.test(zamanCizgi(x))).length, dagilim: say,
        kalemler: Object.values(kalem).sort((p, q) => q.say - p.say) };
    }).catch(() => ({}));

    /* --- trace muhasebesi --- */
    const adlar = iplikAdlari(olaylar);
    const isaret = {};
    for (const e of olaylar) {
      if (e.ph === 'M') continue;
      if (e.name === 'navigationStart' && isaret.nav == null) isaret.nav = e.ts;
      if (e.name === 'firstPaint') isaret.fp = e.ts;
      if (e.name === 'firstContentfulPaint') isaret.fcp = e.ts;
      if (e.name === 'largestContentfulPaint::Candidate') isaret.lcp = e.ts;
    }
    const t0 = isaret.nav != null ? isaret.nav : Math.min(...olaylar.filter((e) => e.ts).map((e) => e.ts));
    const t1 = t0 + SURE * 1000;

    const list = ozZaman(araliklar(olaylar.filter((e) => e.ts >= t0 - 1e6 && e.ts <= t1)));
    const pencere = list.filter((a) => a.ts >= t0 && a.ts <= t1 && a.dur > 0);

    /* iplik gruplama: renderer ana, kompozitor, raster iscileri, digerleri */
    const grupAd = (ip) => {
      const a = adlar.get(ip) || '(bilinmiyor)';
      if (a === 'CrRendererMain') return 'ana';
      if (a === 'Compositor') return 'kompozitor';
      if (/CompositorTileWorker/.test(a)) return 'raster iscisi';
      if (a === 'CrBrowserMain') return 'tarayici';
      return a;
    };
    const asama = {};                                        /* grup -> ad -> {oz, say} */
    for (const a of pencere) {
      const g = grupAd(a.ip);
      if (!asama[g]) asama[g] = {};
      const s = asama[g][a.ad] || (asama[g][a.ad] = { oz_ms: 0, sure_ms: 0, say: 0 });
      s.oz_ms += a.oz / 1000; s.sure_ms += a.dur / 1000; s.say++;
    }
    const anaMesgul = pencere.filter((a) => grupAd(a.ip) === 'ana' && a.ust).reduce((s, a) => s + a.dur, 0) / 1000;

    /* Paint dugum muhasebesi */
    const dugum = new Map();
    for (const a of pencere) {
      if (a.ad !== 'Paint') continue;
      const d = a.args && a.args.data; if (!d) continue;
      const id = d.nodeId; if (id == null) continue;
      const k = dugum.get(id) || { nodeId: id, ms: 0, say: 0, en_buyuk_ms: 0 };
      k.ms += a.dur / 1000; k.say++; k.en_buyuk_ms = Math.max(k.en_buyuk_ms, a.dur / 1000);
      dugum.set(id, k);
    }
    const dugumler = [...dugum.values()].sort((x, y) => y.ms - x.ms).slice(0, UST);

    /* stil yeniden hesabinin BOYU: UpdateLayoutTree kac ogeyi yeniden
       hesapliyor (args.elementCount) — sure kadar bu da sorulur. */
    let ogeToplam = 0, ogeEnBuyuk = 0;
    for (const a of pencere) {
      if (a.ad !== 'UpdateLayoutTree') continue;
      const n = (a.args && (a.args.elementCount ?? (a.args.beginData && a.args.beginData.elementCount))) || 0;
      ogeToplam += n; ogeEnBuyuk = Math.max(ogeEnBuyuk, n);
    }
    /* KOMPOZITORE CIKABILDI MI. Trace'teki `Animation` olaylari
       `compositeFailed` (bit maskesi) ve `unsupportedProperties` tasir.
       Kompozitore cikan transform animasyonu ana ipligi mesgul etmez;
       cikamayan HER KARE stil yeniden hesabi dogurur. Bu ayrim, "animasyonu
       kaldir" ile "animasyonu kompozitore cikar" arasindaki farktir. */
    const kompozit = {};
    for (const a of pencere) {
      if (a.ad !== 'Animation') continue;
      const d = a.args && (a.args.data || a.args.beginData); if (!d) continue;
      const k = `${d.displayName || d.name || d.id || '?'} · compositeFailed ${d.compositeFailed ?? '-'} · ${(d.unsupportedProperties || []).join(',') || '-'}`;
      kompozit[k] = (kompozit[k] || 0) + 1;
    }

    /* GECERSIZ KILMA (yalniz INVALIDASYON=1): stili KIM bozuyor. */
    const gecersiz = {};
    if (INVALIDASYON) {
      for (const a of olaylar) {
        if (!/InvalidationTracking/.test(a.name || '')) continue;
        if (a.ts < t0 || a.ts > t1) continue;
        const d = a.args && a.args.data; if (!d) continue;
        const k = `${a.name} · ${d.reason || d.changedAttribute || d.changedClass || '?'} · ${d.nodeName || ''}`.slice(0, 160);
        gecersiz[k] = (gecersiz[k] || 0) + 1;
      }
    }
    /* nodeId -> gercek secici (sayfa hala acik) */
    try {
      await cdp.send('DOM.enable'); await cdp.send('DOM.getDocument', { depth: -1 });
      for (const d of dugumler) {
        try {
          const { nodeIds } = await cdp.send('DOM.pushNodesByBackendIdsToFrontend', { backendNodeIds: [d.nodeId] });
          const nid = nodeIds && nodeIds[0]; if (!nid) continue;
          const { node } = await cdp.send('DOM.describeNode', { nodeId: nid });
          const oz = node.attributes || []; const at = {};
          for (let i = 0; i < oz.length; i += 2) at[oz[i]] = oz[i + 1];
          d.dugum = (node.localName || node.nodeName || '?').toLowerCase()
            + (at.id ? '#' + at.id : '') + (at.class ? '.' + String(at.class).trim().split(/\s+/).slice(0, 3).join('.') : '');
        } catch (e) { d.dugum = '(cozulemedi)'; }
      }
    } catch (e) { /* DOM alani yoksa sayilar yine de durur */ }

    /* gorsel bayti */
    const gorsel = [...bayt.values()].filter((b) => b.tur === 'Image');
    const gorselBayt = gorsel.reduce((s, b) => s + (b.bayt || 0), 0);

    await browser.close();
    return {
      kosum: no, kol: kolAdi, yukseklik,
      isaret: {
        fp_ms: isaret.fp != null ? yuvarla((isaret.fp - t0) / 1000) : null,
        fcp_ms: isaret.fcp != null ? yuvarla((isaret.fcp - t0) / 1000) : null,
        lcp_ms: isaret.lcp != null ? yuvarla((isaret.lcp - t0) / 1000) : null,
        yuklendi_ms: yuvarla(zaman.yuklendi || 0), dom_ms: yuvarla(zaman.dom || 0),
      },
      ana_mesgul_ms: yuvarla(anaMesgul),
      asama, dugumler, gecersiz, kompozit,
      stil: { oge_toplam: ogeToplam, oge_en_buyuk: ogeEnBuyuk },
      animasyon,
      gozcu: gozcu.sort((a, b) => b.cagri - a.cagri),
      gorsel: { istek: gorsel.length, bayt: gorselBayt },
      loaf: {
        say: loaf.length,
        toplam_ms: yuvarla(loaf.reduce((s, l) => s + l.sure, 0)),
        engelleyici_ms: yuvarla(loaf.reduce((s, l) => s + (l.engelleyici || 0), 0)),
        stil_yerlesim_ms: yuvarla(loaf.reduce((s, l) => s + (l.stil_yerlesim || 0), 0)),
        betik_ms: yuvarla(loaf.reduce((s, l) => s + (l.betik || 0), 0)),
        en_uzun: loaf.slice().sort((a, b) => b.sure - a.sure).slice(0, 5)
          .map((l) => ({ t_ms: yuvarla(l.baslangic), sure_ms: yuvarla(l.sure), stil_yerlesim_ms: yuvarla(l.stil_yerlesim || 0), betik_ms: yuvarla(l.betik || 0) })),
      },
    };
  } catch (e) { try { await browser.close(); } catch (x) {} throw e; }
}

/* ---- ana ------------------------------------------------------------- */

(async () => {
  console.log(`SAYFA    : ${SAYFA} · ${TEKRAR} kosum · pencere ${SURE} ms · ${MOBIL ? 'MOBIL 390x844 dpr3' : 'masaustu 1440x900'}${CPU > 1 ? ` · CPU /${CPU}` : ''}${PERDE ? ' · PERDE ACIK' : ' · perde atlandi'}`);
  console.log(`YONTEM   : her kosum AYRI TARAYICI SURECI (isinma tasinmasin) · asama muhasebesi kosumun ICINDEN\n`);
  if (KOLLAR.length > 1) console.log(`KOLLAR   : ${KOLLAR.map((k) => `${k} (${(KOL_TANIM[k] || {}).ad || '?'})`).join(' · ')} — DONUSUMLU\n`);
  const hepsi = [];
  for (let i = 1; i <= TEKRAR; i++) {
    for (const k of KOLLAR) {
      const r = await kosum(i, k);
      hepsi.push(r);
      console.log(`${k.padEnd(6)} #${i}: FCP ${r.isaret.fcp_ms} ms · LCP ${r.isaret.lcp_ms} ms · ana iplik mesgul ${r.ana_mesgul_ms} ms · stil ${yuvarla((r.asama.ana && r.asama.ana.UpdateLayoutTree || {}).oz_ms || 0)} ms · LoAF ${r.loaf.say} (engelleyici ${r.loaf.engelleyici_ms} ms)`);
    }
  }

  /* KOL KIYASI: yanit degiskeni kosum-ici muhasebe (kosumlar arasi
     duvar saati degil). Her kolun kendi yayilimi da yazilir; fark kolun
     kendi yayiliminin altinda kaliyorsa AYIRT EDILEMEZ denir. */
  if (KOLLAR.length > 1) {
    const olcut = [
      ['ana mesgul', (r) => r.ana_mesgul_ms],
      ['stil (UpdateLayoutTree)', (r) => yuvarla((r.asama.ana && r.asama.ana.UpdateLayoutTree || {}).oz_ms || 0)],
      ['IO computeIntersections', (r) => yuvarla((r.asama.ana && r.asama.ana['IntersectionObserverController::computeIntersections'] || {}).oz_ms || 0)],
      ['Layerize', (r) => yuvarla((r.asama.ana && r.asama.ana.Layerize || {}).oz_ms || 0)],
      ['Layout', (r) => yuvarla((r.asama.ana && r.asama.ana.Layout || {}).oz_ms || 0)],
      ['LCP', (r) => r.isaret.lcp_ms],
    ];
    console.log(`\n=== KOL KIYASI (medyan ms; [min-max] kolun kendi yayilimi) ===`);
    console.log(`   ${'olcut'.padEnd(26)}${KOLLAR.map((k) => k.padStart(20)).join('')}`);
    for (const [ad, f] of olcut) {
      const hucre = KOLLAR.map((k) => {
        const d = hepsi.filter((r) => r.kol === k).map(f);
        return `${yuvarla(medyan(d))} [${Math.min(...d)}-${Math.max(...d)}]`.padStart(20);
      });
      console.log(`   ${ad.padEnd(26)}${hucre.join('')}`);
    }
    const kontrol = hepsi.filter((r) => r.kol === KOLLAR[0]);
    for (const k of KOLLAR.slice(1)) {
      const d = hepsi.filter((r) => r.kol === k);
      const yk = medyan(d.map((r) => r.yukseklik)), y0 = medyan(kontrol.map((r) => r.yukseklik));
      if (Math.abs(yk - y0) > 2) console.log(`   !! ${k} SAF DEGIL: sayfa yuksekligi ${yk} (kontrol ${y0}) — kiyas kirli`);
      const a = d.map((r) => r.ana_mesgul_ms), b = kontrol.map((r) => r.ana_mesgul_ms);
      const ayrik = Math.max(...a) < Math.min(...b) || Math.min(...a) > Math.max(...b);
      console.log(`   ${k}: ana mesgul farki ${yuvarla(medyan(a) - medyan(b))} ms — ${ayrik ? 'yayilimlar AYRIK (fark gercek)' : 'yayilimlar ORTUSUYOR (AYIRT EDILEMEZ)'}`);
    }
  }

  /* medyan kosum: ilk kolun ana iplik mesguliyetine gore ortadaki */
  const sirali = hepsi.filter((r) => r.kol === KOLLAR[0]).sort((a, b) => a.ana_mesgul_ms - b.ana_mesgul_ms);
  const orta = sirali[Math.floor(sirali.length / 2)];

  console.log(`\n=== MEDYAN KOSUM (#${orta.kosum}) — ASAMA MUHASEBESI (oz zaman, ms) ===`);
  for (const g of Object.keys(orta.asama).sort()) {
    const satir = Object.entries(orta.asama[g]).map(([ad, v]) => ({ ad, ...v }))
      .sort((a, b) => b.oz_ms - a.oz_ms).filter((s) => s.oz_ms >= 1).slice(0, UST);
    if (!satir.length) continue;
    const top = Object.values(orta.asama[g]).reduce((s, v) => s + v.oz_ms, 0);
    console.log(`\n-- ${g} (toplam oz ${yuvarla(top)} ms)`);
    for (const s of satir) console.log(`   ${String(yuvarla(s.oz_ms)).padStart(8)} ms  ${String(s.say).padStart(5)}x  ${s.ad}`);
  }

  console.log(`\n=== BOYAMA KIMIN (Paint olaylari, dugum basina) ===`);
  if (!orta.dugumler.length) console.log('   Paint olayi yok (kategori kapali ya da boyama olmadi)');
  for (const d of orta.dugumler) console.log(`   ${String(yuvarla(d.ms)).padStart(8)} ms  ${String(d.say).padStart(4)}x  en buyuk ${yuvarla(d.en_buyuk_ms)} ms  ${d.dugum || 'nodeId ' + d.nodeId}`);

  console.log(`\n=== STIL YENIDEN HESABININ BOYU ===`);
  console.log(`   yeniden hesaplanan oge (toplam) ${orta.stil.oge_toplam} · tek seferde en cok ${orta.stil.oge_en_buyuk}`);
  if (orta.animasyon && !orta.animasyon.yok) {
    console.log(`   animasyon: toplam ${orta.animasyon.toplam} · kosan ${orta.animasyon.kosan} · kaydirmaya bagli ${orta.animasyon.kaydirmali}`);
    const kl = orta.animasyon.kalemler || [];
    const disari = kl.reduce((s, k) => s + k.disarida, 0);
    console.log(`   EKRAN DISINDA kosan animasyon: ${disari} / ${kl.reduce((s, k) => s + k.say, 0)}`);
    for (const k of kl.slice(0, UST))
      console.log(`      ${String(k.say).padStart(3)}x  ekranda ${k.ekranda} · disarida ${k.disarida} · ${k.zaman}  ${k.ad}`);
  }

  console.log(`\n=== INTERSECTIONOBSERVER — KIM, KAC HEDEF, KAC CAGRI ===`);
  if (!orta.gozcu.length) console.log('   gozcu yok (ya da sarma tutmadi)');
  for (const g of orta.gozcu.slice(0, UST))
    console.log(`   cagri ${String(g.cagri).padStart(4)} · girdi ${String(g.girdi).padStart(5)} · hedef ${String(g.hedef).padStart(4)} · ${g.secenek}\n      ${g.dogum}`);

  if (INVALIDASYON) {
    console.log(`\n=== STILI KIM BOZUYOR (gecersiz kilma izleri) ===`);
    const gk = Object.entries(orta.gecersiz).sort((a, b) => b[1] - a[1]).slice(0, UST);
    if (!gk.length) console.log('   iz yok');
    for (const [k, v] of gk) console.log(`   ${String(v).padStart(6)}x  ${k}`);
  }

  console.log(`\n=== KOSUMLAR ARASI YAYILIM (gurultunun boyu) ===`);
  const kol = (f) => hepsi.map(f);
  const yay = (ad, dizi) => console.log(`   ${ad.padEnd(22)} ${dizi.map((x) => String(x).padStart(8)).join(' ')}   medyan ${yuvarla(medyan(dizi))}`);
  yay('FCP ms', kol((r) => r.isaret.fcp_ms));
  yay('LCP ms', kol((r) => r.isaret.lcp_ms));
  yay('ana mesgul ms', kol((r) => r.ana_mesgul_ms));
  yay('LoAF engelleyici ms', kol((r) => r.loaf.engelleyici_ms));

  const kayit = {
    _: 'olc-boyama.cjs — acilis boyamasinin muhasebesi. TESHIS, kapi degil.',
    sayfa: SAYFA, tekrar: TEKRAR, sure_ms: SURE, mobil: MOBIL, cpu: CPU, perde: PERDE,
    tarayici: TARAYICI, kollar: KOLLAR, invalidasyon: INVALIDASYON,
    kosumlar: hepsi, medyan_kosum: orta.kosum,
  };
  const yol = path.join(__dirname, CIKTI);
  fs.writeFileSync(yol, JSON.stringify(kayit, null, 1));
  console.log(`\n-> ${yol}`);
})().catch((e) => { console.error(e); process.exit(1); });
