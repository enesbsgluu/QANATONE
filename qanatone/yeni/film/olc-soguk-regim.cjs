#!/usr/bin/env node
/* SOGUK GIRISTE IKI REJIM — TESHIS (kapi degil), 5 Eyl 2026 gecesi.

   NEDEN VAR. Ayni sayfa, ayni agac, ayni makine, ayni gun: /yeni/projeler/
   17:30'da tur basina 302-328 kare cizdi (p95 25 ms, 2 kare kaciriyor,
   4-5 takilma, 308 ms), 21:30'da 378-385 kare cizdi (p95 8,5 ms, 0 kare
   kaciriyor, TEK takilma, 100 ms). Bes kosumun besi de kendi icinde
   TUTARLI — yani bu gurultu degil, IKI AYRI REJIM. Ustelik ayni gece
   oteki sekiz sayfanin HEPSI biraz KOTULESTI (fps -0,6 ile -8,7 arasi),
   yalniz bu sayfa +20,2 fps sicradi. Makine geneli bir sebep bunu
   aciklamaz; sebep sayfaya ozgu.

   17:30 rejiminin sayilari, o gun olculen `prefers-reduced-motion: reduce`
   kolunun (A1) sayilariyla ayni yerde durmuyor da degil: A1 o gun bu
   sayfada p95 8,5 / 0 kacirilan vermisti — yani 21:30 rejimi, 17:30'un
   HAREKETSIZ koluna benziyor. Bu bir IPUCU, hukum degil: A1'in takilma
   orani %7,46 iken 21:30 %2,98 verdi, yani birebir ortusmuyor.

   BU ARAC O FARKI ADLANDIRMAK ICIN VAR. Kapi degil, teshis. Cikis kodu
   her zaman 0; hicbir seyi GECTI/KALDI yapmaz.

   OLCTUKLERI (hepsi TURUN ICINDE, ayni soguk giris dizisiyle):
     · animasyon    tur boyunca `document.getAnimations()` ornekleri:
                    toplam, kosan (running), ve kaydirmaya bagli olan
                    (timeline ViewTimeline/ScrollTimeline). Sayfada 7 adet
                    `.mi` karti `animation:mi-gir; animation-timeline:view()`
                    tasiyor — kosuyorlar mi, kosmuyorlar mi, tahmin degil.
     · hareket      matchMedia('(prefers-reduced-motion: reduce)').matches
     · gorsel       tur BASLAMADAN once ve tur ICINDE inen gorsel istekleri
                    (PerformanceResourceTiming), ve her <img> icin
                    complete/naturalWidth/decode suresi.
     · motor        CDP Performance.getMetrics DELTASI: LayoutCount,
                    RecalcStyleCount, LayoutDuration, RecalcStyleDuration,
                    ScriptDuration, TaskDuration. Kare dusuyorsa hangi
                    asamada dustugunu bu ayirir (yerlesim mi, stil mi,
                    betik mi, hicbiri = boyama/kompozitor mu).
     · kare         uzun karelerin scrollY'si: takilma turun neresinde.
     · GPU          CDP SystemInfo.getInfo — hizlandirma durumu ve surucu.
                    (Kayitta durur; iki rejim arasinda degistiyse gorunur.)

   Kullanim: node yeni/film/olc-soguk-regim.cjs
   Cevre   : TEKRAR=5 · SAYFA=/yeni/projeler/ · TARAYICI=brave
             KOL=K (varsayilan) ya da KOL=A1 (hareketsiz) */
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
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-soguk-regim.json');
const TEKRAR = Number(process.env.TEKRAR || 5);
const SAYFA = process.env.SAYFA || '/yeni/projeler/';
const KOL = process.env.KOL || 'K';
/* SINYAL kapi B ile birebir ayni — rakamlar kiyaslanabilsin diye */
const TAKILMA_ESIK = 50;

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : null; };
const p10 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.10)] : null; };

/* KAYITCI — kapi B'nin aynisi, USTUNE her karenin scrollY'si.
   scrollY rAF icinde okunuyor: bu bir DUZEN OKUMASI ve maliyeti var
   (CLAUDE.md: rAF icinde getBoundingClientRect sayfayi kilitler). scrollY
   dokumanin kaydirma konumu ve zaten kompozitorde tutuluyor, yerlesim
   tetiklemez; yine de bu aracin sayilari kapi B'ninkilerle BIREBIR
   kiyaslanmaz, ayni yonde okunur. Kapi B'nin kendi sayilari kapi B'den. */
const KAYITCI = `(() => {
  window.__k = { ara: [], y: [], on: false, son: null };
  const f = (t) => {
    if (__k.son !== null && __k.on) { __k.ara.push(+(t - __k.son).toFixed(2)); __k.y.push(scrollY|0); }
    __k.son = t; requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
  window.__kBasla = () => { __k.ara.length = 0; __k.y.length = 0; __k.on = true; };
  window.__kBitir = () => { __k.on = false; return { ara: __k.ara.slice(), y: __k.y.slice() }; };
  window.__anim = () => {
    const a = document.getAnimations();
    let kosan = 0, kaydirmali = 0, kaydirmaliKosan = 0;
    for (const x of a) {
      const zc = x.timeline && x.timeline.constructor ? x.timeline.constructor.name : '';
      const kd = zc === 'ViewTimeline' || zc === 'ScrollTimeline';
      if (x.playState === 'running') kosan++;
      if (kd) { kaydirmali++; if (x.playState === 'running') kaydirmaliKosan++; }
    }
    return { toplam: a.length, kosan, kaydirmali, kaydirmali_kosan: kaydirmaliKosan,
      durumlar: a.slice(0, 40).map((x) => x.playState) };
  };
  window.__dokum = () => {
    /* Kaydirmaya bagli animasyonlarin DOKUMU: hangi kural, hangi ogede, kac
       tane. 149 sayisi tek basina is gormez; hangi seciciden geldigi gorunmeli.
       Hedefin sinifi kisaltilmadan yazilir, astro-cid soneki atilir. */
    const g = {};
    for (const a of document.getAnimations()) {
      const zc = a.timeline && a.timeline.constructor ? a.timeline.constructor.name : '';
      if (zc !== 'ViewTimeline' && zc !== 'ScrollTimeline') continue;
      const h = a.effect && a.effect.target;
      const sinif = h ? (h.className && h.className.baseVal !== undefined ? h.className.baseVal : String(h.className || '')) : '(hedefsiz)';
      const ad = (a.animationName) || (a.effect && a.effect.getKeyframes && a.effect.getKeyframes().length ? '(kesikkare)' : '(adsiz)');
      const anahtar = ad + '  <-  ' + (h ? h.tagName.toLowerCase() : '?') + '.' + String(sinif).replace(/\\s+/g, '.').slice(0, 60);
      g[anahtar] = g[anahtar] || { toplam: 0, kosan: 0, zaman_cizelgesi: zc };
      g[anahtar].toplam++;
      if (a.playState === 'running') g[anahtar].kosan++;
    }
    return g;
  };
  window.__gorsel = () => {
    const r = performance.getEntriesByType('resource').filter((e) => e.initiatorType === 'img' || /\\.(webp|avif|png|jpe?g|svg)(\\?|$)/i.test(e.name));
    const im = [...document.images].map((i) => ({ src: (i.currentSrc || i.src).split('/').pop(), tam: i.complete, gen: i.naturalWidth, lazy: i.loading }));
    return { istek: r.length, istek_ms: r.map((e) => +e.responseEnd.toFixed(1)), img: im };
  };
  window.__hareket = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
})()`;

const OLC = ['LayoutCount', 'RecalcStyleCount', 'LayoutDuration', 'RecalcStyleDuration', 'ScriptDuration', 'TaskDuration', 'JSHeapUsedSize'];
const metrikAl = async (cdp) => {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const o = {};
  for (const m of metrics) if (OLC.includes(m.name)) o[m.name] = m.value;
  return o;
};
const metrikFark = (a, b) => {
  const o = {};
  for (const k of OLC) o[k] = +( (b[k] || 0) - (a[k] || 0) ).toFixed(4);
  return o;
};

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
  await bekle(1500);
  await page.close();
  const ham = ara.slice(5);
  const m0 = medyan(ham);
  const suz = ham.filter((x) => x > m0 * 0.5 && x < m0 * 1.5);
  return { tik_ms: +medyan(suz).toFixed(3), hz: +(1000 / medyan(suz)).toFixed(1), ornek: ham.length, suzulen: ham.length - suz.length, p10: p10(ham) };
}

async function kosum(yol) {
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 600000,
  });
  try {
    const tz = await isinVeOlc(browser);
    let gpu = null;
    try {
      const bcdp = await browser.target().createCDPSession();
      const bilgi = await bcdp.send('SystemInfo.getInfo');
      gpu = {
        hizlandirma: (bilgi.gpu?.featureStatus) || null,
        surucu: (bilgi.gpu?.devices || []).map((d) => `${d.vendorString || d.vendorId} ${d.deviceString || d.deviceId} ${d.driverVersion || ''}`.trim()),
      };
      await bcdp.detach();
    } catch (e) { gpu = { hata: String(e).slice(0, 120) }; }

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const cdp = await page.target().createCDPSession();
    await cdp.send('Performance.enable');
    await page.evaluateOnNewDocument(() => {
      try {
        sessionStorage.setItem('qanat-splash-seen', '1');
        sessionStorage.setItem('qanat-prolog-atlandi', '1');
      } catch (e) {}
    });
    if (KOL === 'A1') await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(SUNUCU + yol, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.evaluate(KAYITCI);
    await page.bringToFront();
    await page.mouse.move(720, 450);
    await bekle(1200);

    const hareket = await page.evaluate(() => __hareket());
    const animOnce = await page.evaluate(() => __anim());
    const gorselOnce = await page.evaluate(() => __gorsel());

    await page.evaluate(() => __kBasla());
    await bekle(3000);
    const tabanK = await page.evaluate(() => __kBitir());
    const tabanTak = tabanK.ara.filter((a) => a > TAKILMA_ESIK);

    let toplamPx = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
    const m0 = await metrikAl(cdp);
    await page.evaluate(() => __kBasla());
    const t0 = performance.now();
    let y = 0, zamanAsimi = false;
    const animOrnek = [];
    while (y < toplamPx - 4) {
      const adim = Math.min(600, toplamPx - y);
      await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, yDistance: -adim, speed: 900, gestureSourceType: 'mouse' });
      const d = await page.evaluate(() => ({ y: scrollY, max: Math.max(0, document.documentElement.scrollHeight - innerHeight), a: __anim() }));
      animOrnek.push({ y: Math.round(d.y), ...d.a, durumlar: undefined });
      toplamPx = d.max;
      if (d.y <= y) break;
      y = d.y;
      if (performance.now() - t0 > 90000) { zamanAsimi = true; break; }
    }
    const turTam = !zamanAsimi && y >= toplamPx - 4;
    /* DOKUM turun SONUNDA alinir — tur bittiginde butun kaydirmali
       animasyonlar dogmus olur; ortada alinsa henuz dogmamis olanlar eksik
       sayilir. Kosan sayisi burada dusuk cikar (tur bitti), o yuzden
       "kosan" tepe degeri turun ICINDEKI orneklerden okunuyor. */
    const dokum = await page.evaluate(() => __dokum());
    await bekle(300);
    const K = await page.evaluate(() => __kBitir());
    const m1 = await metrikAl(cdp);
    const gorselSonra = await page.evaluate(() => __gorsel());

    const turMs = K.ara.reduce((a, b) => a + b, 0);
    const tak = [];
    for (let i = 0; i < K.ara.length; i++) if (K.ara[i] > TAKILMA_ESIK) tak.push({ ms: +K.ara[i].toFixed(1), y: K.y[i] });

    return {
      tazeleme: tz, gpu, hareket_azalt: hareket,
      kare: K.ara.length, tur_ms: Math.round(turMs), p95_ms: p95(K.ara), medyan_ms: medyan(K.ara),
      kare_saniye: +(K.ara.length / (turMs / 1000)).toFixed(1),
      kacirilan_kare: Math.max(0, Math.round(p95(K.ara) / tz.tik_ms) - 1),
      takilma_sayi: tak.length, takilma_toplam_ms: Math.round(tak.reduce((a, b) => a + b.ms, 0)),
      takilma_tek_max_ms: tak.length ? Math.round(Math.max(...tak.map((t) => t.ms))) : 0,
      takilmalar: tak,
      animasyon_once: animOnce, animasyon_tur: animOrnek, animasyon_dokumu: dokum,
      animasyon_tur_ozet: {
        toplam_en_yuksek: Math.max(0, ...animOrnek.map((a) => a.toplam)),
        kosan_en_yuksek: Math.max(0, ...animOrnek.map((a) => a.kosan)),
        kaydirmali_en_yuksek: Math.max(0, ...animOrnek.map((a) => a.kaydirmali)),
        kaydirmali_kosan_en_yuksek: Math.max(0, ...animOrnek.map((a) => a.kaydirmali_kosan)),
      },
      gorsel_once: gorselOnce, gorsel_sonra: { istek: gorselSonra.istek, img: gorselSonra.img },
      gorsel_tur_icinde_inen: gorselSonra.istek - gorselOnce.istek,
      motor: metrikFark(m0, m1),
      taban: { sure_ms: Math.round(tabanK.ara.reduce((a, b) => a + b, 0)), takilma_sayi: tabanTak.length, p95_ms: p95(tabanK.ara) },
      scroll_px: y, toplam_px: toplamPx, tur_tam: turTam,
    };
  } finally {
    await browser.close();
  }
}

(async () => {
  console.log(`SOGUK GIRISTE REJIM — TESHIS (kapi degil) · ${TARAYICI} · ${SAYFA} · kol ${KOL} · ${TEKRAR} kosum`);
  const k = [];
  for (let i = 0; i < TEKRAR; i++) {
    const r = await kosum(SAYFA);
    k.push(r);
    console.log(`  ${i + 1}: ${r.kare} kare / ${r.tur_ms} ms = ${r.kare_saniye} k/sn · p95 ${r.p95_ms} ms (${r.kacirilan_kare} kacirilan) · takilma ${r.takilma_sayi}x${r.takilma_toplam_ms} ms · anim kaydirmali ${r.animasyon_tur_ozet.kaydirmali_en_yuksek} (kosan ${r.animasyon_tur_ozet.kaydirmali_kosan_en_yuksek}) · hareket_azalt ${r.hareket_azalt} · gorsel tur icinde ${r.gorsel_tur_icinde_inen} · Layout ${r.motor.LayoutCount} (${r.motor.LayoutDuration.toFixed(3)} sn) · Stil ${r.motor.RecalcStyleCount} (${r.motor.RecalcStyleDuration.toFixed(3)} sn) · Betik ${r.motor.ScriptDuration.toFixed(3)} sn · Gorev ${r.motor.TaskDuration.toFixed(3)} sn`);
  }
  const oz = {
    kare_saniye_medyan: medyan(k.map((x) => x.kare_saniye)),
    p95_medyan: medyan(k.map((x) => x.p95_ms)),
    kacirilan_medyan: medyan(k.map((x) => x.kacirilan_kare)),
    takilma_toplam_medyan: medyan(k.map((x) => x.takilma_toplam_ms)),
    kaydirmali_anim_medyan: medyan(k.map((x) => x.animasyon_tur_ozet.kaydirmali_en_yuksek)),
    kaydirmali_kosan_medyan: medyan(k.map((x) => x.animasyon_tur_ozet.kaydirmali_kosan_en_yuksek)),
    gorsel_tur_icinde_medyan: medyan(k.map((x) => x.gorsel_tur_icinde_inen)),
    layout_medyan: medyan(k.map((x) => x.motor.LayoutCount)),
    layout_sn_medyan: medyan(k.map((x) => x.motor.LayoutDuration)),
    stil_medyan: medyan(k.map((x) => x.motor.RecalcStyleCount)),
    stil_sn_medyan: medyan(k.map((x) => x.motor.RecalcStyleDuration)),
    betik_sn_medyan: medyan(k.map((x) => x.motor.ScriptDuration)),
    gorev_sn_medyan: medyan(k.map((x) => x.motor.TaskDuration)),
  };
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/olc-soguk-regim.cjs — TESHIS, KAPI DEGIL. Ayni sayfanin ayni gun iki farkli rejimde okunmasinin sebebini adlandirmak icin: animasyon kosuyor mu, gorsel tur icinde iniyor mu, motorun hangi asamasi yiyor.',
    olcum: new Date().toISOString(), tarayici: TARAYICI, sayfa: SAYFA, kol: KOL, tekrar: TEKRAR,
    ozet: oz, kosum: k,
  }, null, 1));
  console.log('\nOZET:', JSON.stringify(oz, null, 1));
  console.log(`→ ${CIKTI}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
