#!/usr/bin/env node
/* TUP ZINCIRI — TESHIS ARACI, KAPI DEGIL (7 Eyl 2026, Enes: "tupler gec
   aciliyor her tarayicida. Bu bir mimari yerlestirme hatasi.").

   SORU. `#tubes` ilk kareyi ne zaman ciziyor ve o sureyi HANGI HALKA
   yiyor? Kod okumasi bir zincir gosteriyor ama okuma olcum degildir:
     belge sonu → requestIdleCallback(f,{timeout:2500}) → import kabuk.js
     → baslat() → tubes() → import tup.js → IO (hero yaklasmasi)
     → setTimeout → requestIdleCallback(kurulum,{timeout:4000})
     → WebGL baglami + shader derlemesi → ilk drawArrays
   Bu arac o halkalarin HER BIRINE damga basar; boylece "gec aciliyor"
   bir hisse degil, halkalara bolunmus bir sayiya doner.

   NEDEN AG SEKMESI YETMEZ: iki import da DINAMIKTIR, yani belgede yazmaz
   ve on yukleyici goremez; istegin ne zaman BASLADIGI zincirin kendi
   gecikmesidir, agin degil. O yuzden istek basi/sonu AYRI yazilir —
   "gec indi" ile "gec ISTENDI" ayni sey degil.

   OLCTUKLERI (hepsi navigationStart'a gore ms):
     · fcp                ilk icerik boyamasi
     · kabuk_istek/inis   /varlik/kabuk.js istegi basi ve sonu
     · tup_istek/inis     /varlik/tup.js istegi basi ve sonu
     · baglam             ilk WebGL getContext cagrisi
     · ilk_kare           ilk drawArrays/drawElements cagrisi
   Damgalar sayfanin ICINDEN, gercek cagrilara kanca takilarak alinir
   (getContext ve draw*), CDP tahmininden degil.

   BILINEN KOR NOKTA — OLCULEREK BULUNDU (7 Eyl 2026): `baglam` ve
   `ilk_kare` damgalari `HTMLCanvasElement.prototype.getContext` ve
   `WebGL*RenderingContext.prototype.drawArrays/drawElements` sarilarak
   alinir, ama tubes.min.js bu yollari kullanmiyor — kutuphane KURULMUS
   ve tuval `on` sinifini almisken ikisi de null kaldi. Yani bu iki alan
   "tup acilmadi" ANLAMINA GELMEZ; en fazla "kancanin gordugu yoldan
   cizilmedi" der. HUKUM VERILECEK SINYALLER SUNLAR:
     · kutuphane   /js/tubes.min.js kaynak zamanlamasi (istek/inis/bayt)
     · kuruldu     window.__tubes — kurulumun kendi imzasi
   Damgalar ikincildir, bilgi icin durur.

   NOT: TEK KOSUM HUKUM DEGILDIR — TEKRAR ile medyan alinir. Bu arac bir
   kapi degil, adlandirma aracidir; cikis kodu her zaman 0.            */
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
const YOL = process.env.SAYFA_YOL || '/';
const TEKRAR = Number(process.env.TEKRAR || 3);
const BEKLE = Number(process.env.BEKLE || 12000);
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-tup-zinciri.json');

/* Sayfanin icine, HERHANGI bir betikten once giren kanca. Gercek
   cagrilari sarar; tahmin yok. `performance.now()` navigationStart
   tabanlidir, yani butun damgalar ayni sifirdan sayilir. */
const KANCA = `(() => {
  const D = (globalThis.__tupDamga = { baglam: null, ilk_kare: null, ric_kuruldu: [], ric_kostu: [] });
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (tip, ...k) {
    const c = gc.call(this, tip, ...k);
    if (D.baglam === null && /webgl/i.test(String(tip))) D.baglam = performance.now();
    return c;
  };
  for (const ad of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
    const P = globalThis[ad] && globalThis[ad].prototype;
    if (!P) continue;
    for (const ci of ['drawArrays', 'drawElements']) {
      const e = P[ci];
      if (!e) continue;
      P[ci] = function (...k) {
        if (D.ilk_kare === null) D.ilk_kare = performance.now();
        return e.apply(this, k);
      };
    }
  }
  /* FILMIN BITIS DAMGASI. Tup adasinin kapisi html'in data-film
     ozniteligidir (tup.js: filmBitti). O oznitelik ne zaman yazildi —
     kapinin ne zaman acildigini yalniz bu soyler.
     NOT: bu blok bir sablon dizesinin ICINDE, ters tirnak kullanilmaz. */
  D.data_film = null; D.data_film_deger = null;
  new MutationObserver(() => {
    if (D.data_film === null && document.documentElement.dataset.film) {
      D.data_film = performance.now();
      D.data_film_deger = document.documentElement.dataset.film;
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-film'] });

  /* requestIdleCallback: kuruldugu an ve GERCEKTEN kostugu an. Aradaki
     fark "bosta beklemek" halkasinin bedelidir; timeout'a dusup dusmedigi
     ancak boyle gorunur. */
  const ric = globalThis.requestIdleCallback;
  if (ric) globalThis.requestIdleCallback = function (fn, se) {
    const t0 = performance.now();
    D.ric_kuruldu.push({ t: t0, timeout: se && se.timeout });
    return ric.call(this, (dl) => {
      D.ric_kostu.push({ kuruldu: t0, kostu: performance.now(), zaman_asimi: !!(dl && dl.didTimeout) });
      return fn(dl);
    }, se);
  };
})()`;

const med = (a) => {
  const s = a.filter((x) => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return Number((s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2).toFixed(1));
};

(async () => {
  const exe = TARAYICILAR[TARAYICI];
  if (!fs.existsSync(exe)) { console.error(`TARAYICI YOK: ${exe}`); process.exit(1); }
  console.log(`TARAYICI : ${TARAYICI} · ${SUNUCU}${YOL} · ${TEKRAR} kosum · bekleme ${BEKLE} ms`);
  console.log('DAMGALAR : navigationStart = 0. "istek" = istegin BASLADIGI an (zincirin gecikmesi), "inis" = bittigi an (agin payi).');

  const tarayici = await pt.launch({
    executablePath: exe, headless: false,
    args: ['--no-first-run', '--no-default-browser-check', '--disable-features=Translate'],
    defaultViewport: { width: 1536, height: 780 },
  });
  const kosumlar = [];
  try {
    for (let i = 1; i <= TEKRAR; i++) {
      const page = await tarayici.newPage();
      /* ATLA=1 — PROLOGU ATLAMIS ZIYARETCI. Sayfanin kendi satir ici
         betigi sessionStorage'daki `qanat-prolog-atlandi` bayragini okur
         ve data-film'i HEMEN 'atlandi' yazar; yani tup adasinin kapisi
         daha ilk karede aciktir. Bu, ikinci ziyaretin ve atla tusunun
         yoludur — filmi 121.000 px kaydirmadan olcmenin tek durust yolu,
         cunku kapiyi ZORLAMAZ, sitenin kendi yolunu kullanir. */
      await page.evaluateOnNewDocument(KANCA);
      if (process.env.ATLA === '1') await page.evaluateOnNewDocument(
        "try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}");
      await page.goto(`${SUNUCU}${YOL}`, { waitUntil: 'domcontentloaded' });
      /* GIRDI=1 — ZIYARETCININ FILME DOKUNMASI. 7 Eyl'de prolog "ilk
         girdiyi bekler" oldu (4dc97ae), yani dokunulmadan film bitmez;
         tup adasinin kapisi da filmin bitisidir. Girdisiz kosum "acilista
         ne oluyor"u, girdili kosum "ziyaretci kaydirinca ne oluyor"u
         olcer. Gercek girdi kullanilir (CDP scroll jesti), evaluate ile
         scrollTo DEGIL: surucuyu kendi ritmine sokar (olc-zincir dersi). */
      if (process.env.GIRDI === '1') {
        const cdp = await page.createCDPSession();
        const bitis = Date.now() + BEKLE;
        while (Date.now() < bitis) {
          const bitti = await page.evaluate(() => !!document.documentElement.dataset.film).catch(() => false);
          if (bitti) break;
          await cdp.send('Input.synthesizeScrollGesture', {
            x: 760, y: 400, yDistance: -1200, speed: 1800, gestureSourceType: 'mouse',
          }).catch(() => {});
        }
        await cdp.detach().catch(() => {});
      }
      /* ilk kare gelene kadar bekle, gelmezse tavana kadar */
      await page.waitForFunction('globalThis.__tupDamga && globalThis.__tupDamga.ilk_kare !== null',
        { timeout: BEKLE, polling: 50 }).catch(() => {});
      const k = await page.evaluate(() => {
        const D = globalThis.__tupDamga || {};
        const kay = (p) => {
          const e = performance.getEntriesByType('resource').find((x) => x.name.includes(p));
          return e ? { istek: Number(e.startTime.toFixed(1)), inis: Number(e.responseEnd.toFixed(1)), bayt: e.encodedBodySize } : null;
        };
        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        return {
          fcp: fcp ? Number(fcp.startTime.toFixed(1)) : null,
          kabuk: kay('/varlik/kabuk.js'), tup: kay('/varlik/tup.js'),
          /* ASIL SINYALLER — kor noktadan etkilenmez */
          kutuphane: kay('/js/tubes.min.js'),
          kuruldu: !!window.__tubes,
          data_film: D.data_film === null || D.data_film === undefined ? null : Number(D.data_film.toFixed(1)),
          data_film_deger: D.data_film_deger || null,
          baglam: D.baglam === null || D.baglam === undefined ? null : Number(D.baglam.toFixed(1)),
          ilk_kare: D.ilk_kare === null || D.ilk_kare === undefined ? null : Number(D.ilk_kare.toFixed(1)),
          ric: (D.ric_kostu || []).map((r) => ({
            kuruldu: Number(r.kuruldu.toFixed(1)), kostu: Number(r.kostu.toFixed(1)),
            bekleme: Number((r.kostu - r.kuruldu).toFixed(1)), zaman_asimi: r.zaman_asimi,
          })),
          ric_bekleyen: (D.ric_kuruldu || []).length - (D.ric_kostu || []).length,
          tuval: !!document.querySelector('#tubes'),
          /* RIG DOGRULAMASI: kanca kurulmadiysa butun damgalar null gelir
             ve bu "tup acilmadi" gibi OKUNUR. Rig kendini dogrulamali. */
          kanca_kuruldu: !!globalThis.__tupDamga,
          data_film_son: document.documentElement.dataset.film || null,
        };
      });
      if (!k.kanca_kuruldu) throw new Error('KANCA KURULMADI — bu kosumun damgalari hukumsuzdur, rig hatasi');
      kosumlar.push(k);
      const g = (x) => (x === null || x === undefined ? '  —  ' : String(x).padStart(6));
      console.log(`kosum ${i}: fcp ${g(k.fcp)} · kabuk ${g(k.kabuk && k.kabuk.inis)} · tup ${g(k.tup && k.tup.inis)} · KUTUPHANE istek ${g(k.kutuphane && k.kutuphane.istek)} inis ${g(k.kutuphane && k.kutuphane.inis)} · data-film ${g(k.data_film)} (${k.data_film_deger || '—'}) · kuruldu ${k.kuruldu ? 'EVET' : 'hayir'}`);
      for (const r of k.ric) console.log(`         rIC kuruldu ${r.kuruldu} → kostu ${r.kostu} (bekleme ${r.bekleme} ms${r.zaman_asimi ? ', ZAMAN ASIMINA DUSTU' : ''})`);
      await page.close();
    }
  } finally { await tarayici.close(); }

  const al = (f) => med(kosumlar.map(f));
  const oz = {
    _: 'olc-tup-zinciri.cjs — TESHIS, kapi degil. Damgalar navigationStart tabanli ms.',
    olcum: new Date().toISOString(), tarayici: TARAYICI, sunucu: SUNUCU + YOL, tekrar: TEKRAR,
    medyan: {
      fcp: al((k) => k.fcp),
      kabuk_istek: al((k) => k.kabuk && k.kabuk.istek), kabuk_inis: al((k) => k.kabuk && k.kabuk.inis),
      tup_istek: al((k) => k.tup && k.tup.istek), tup_inis: al((k) => k.tup && k.tup.inis),
      kutuphane_istek: al((k) => k.kutuphane && k.kutuphane.istek),
      kutuphane_inis: al((k) => k.kutuphane && k.kutuphane.inis),
      data_film: al((k) => k.data_film), baglam: al((k) => k.baglam), ilk_kare: al((k) => k.ilk_kare),
    },
    kosumlar,
  };
  const m = oz.medyan;
  oz.halkalar = {
    'belge → kabuk istegi (bosta bekleme + ayristirma)': m.kabuk_istek,
    'kabuk istegi → inisi (ag)': m.kabuk_inis !== null && m.kabuk_istek !== null ? Number((m.kabuk_inis - m.kabuk_istek).toFixed(1)) : null,
    'kabuk inisi → tup istegi (baslat+tubes)': m.tup_istek !== null && m.kabuk_inis !== null ? Number((m.tup_istek - m.kabuk_inis).toFixed(1)) : null,
    'tup istegi → inisi (ag)': m.tup_inis !== null && m.tup_istek !== null ? Number((m.tup_inis - m.tup_istek).toFixed(1)) : null,
    'tup inisi → KUTUPHANE istegi (isitma: prefetch)': m.kutuphane_istek !== null && m.tup_inis !== null ? Number((m.kutuphane_istek - m.tup_inis).toFixed(1)) : null,
    'tup inisi → data-film (FILMIN BITMESI BEKLENIR)': m.data_film !== null && m.tup_inis !== null ? Number((m.data_film - m.tup_inis).toFixed(1)) : null,
    'data-film → WebGL baglami (800 ms + rIC + 775 KB indirme)': m.baglam !== null && m.data_film !== null ? Number((m.baglam - m.data_film).toFixed(1)) : null,
    'baglam → ilk kare (shader derlemesi)': m.ilk_kare !== null && m.baglam !== null ? Number((m.ilk_kare - m.baglam).toFixed(1)) : null,
  };
  fs.writeFileSync(CIKTI, JSON.stringify(oz, null, 1));
  console.log('\nHALKALAR (medyan, ms):');
  for (const [ad, v] of Object.entries(oz.halkalar)) console.log(`  ${String(v === null ? '—' : v).padStart(8)}  ${ad}`);
  console.log(`\nFCP ${m.fcp} ms → ILK TUP KARESI ${m.ilk_kare} ms  (fark ${m.ilk_kare !== null && m.fcp !== null ? (m.ilk_kare - m.fcp).toFixed(1) : '—'} ms)`);
  console.log(`→ ${CIKTI}`);
})();
