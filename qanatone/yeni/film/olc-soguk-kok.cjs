#!/usr/bin/env node
/* SOGUK GIRIS TAKILMASININ KOKU — TESHIS ARACI, KAPI DEGIL (Enes, 5 Eyl 2026).

   SORU. Kapi B soguk giriste 9 sayfanin 5'inde A'nin %3 takilma esigini asan
   bir oran olctu, en yuksegi %6,89. Bu ziyaretcinin GERCEKTEN gordugu
   sicrama. Nereden geliyor?

   HIPOTEZ (benim, gozlemden): GORSEL YUKU. Siralama destekliyordu —
   /yeni/projeler/ %6,89 ve /yeni/ %6,66 (ikisi gorsel agirlikli),
   /hizmetler/finans/ %2,87 (MotorSahne, az gorsel). Mekanizma: taze
   profilde kaydirma sirasinda tembel gorseller ILK KEZ inip cozuluyor.
   HIPOTEZ SIRALAMADAN IBARET; uc nokta bir egri cizmez. Bu arac onu
   sinar ve YANLIS CIKABILIR — cikarsa oteki kollar kogu gosterir.

   YONTEM — TEK DEGISKEN. Her kol kapi B'nin isinma dizisinin AYNISI (taze
   profil, about:blank, tazeleme, 1500 ms, sonra tek sayfa); kollar arasinda
   YALNIZCA bir sey degisir:

     K   kontrol      Kapi B'nin kendisi. Taban.
     G1  gorsel onbellekli  Sayfaya gitmeden ONCE, bos bir sayfada <img>
                      etiketleriyle sayfanin butun gorselleri cekilir; HTTP
                      onbellegine girerler. Site HTML/CSS/JS'i ISINMAZ —
                      gorseller capraz-kokenli <img> ile ceklidigi icin
                      yalnizca BAYT iner. K'ya gore fark = gorsel INDIRME
                      payi (cozme/raster payi degil, o hala her karede olur).
     G2  gorselsiz    Butun gorsel istekleri engellenir (indirme + cozme +
                      raster hepsi kalkar). K'ya gore fark = gorselin TOPLAM
                      payi. UYARI: yerlesim degisebilir; arac sayfa
                      yuksekligini K ile kiyaslar ve sapma varsa YAZAR —
                      yukseklik degistiyse kol saf degildir.
     A1  hareketsiz   prefers-reduced-motion: reduce. Kaydirmaya bagli
                      animasyonlar durur. K'ya gore fark = ANIMASYON payi.

   OKUMA. G2 buyuk dusus + G1 kucuk dusus  -> kok gorselin COZME/RASTER'i.
          G1 ve G2 birlikte buyuk dusus     -> kok gorselin INDIRILMESI.
          Ikisi de kucuk, A1 buyuk dusus    -> kok animasyon, hipotez YANLIS.
          Hicbiri dusurmez                  -> kok baska yerde; olcum devam.

   AYRICA HER KOLDA: turun ICINDE inen bayt tur/bayt sayisi CDP Network'ten
   toplanir (kaydirma sirasinda ne iniyor, gercekten gorsel mi).

   KAPI YOK: cikis kodu her zaman 0, kayitta `hukum` yok. Kok bulunursa
   duzeltme AYRI TUR.
   Kullanim: node yeni/film/olc-soguk-kok.cjs   (once: node yerel-sun.cjs)
   Cevre   : TEKRAR=3 · LISTE=a,b,c · KOLLAR=K,G1,G2,A1 */
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
const DIST = path.join(__dirname, '..', '..', 'dist');
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-soguk-kok.json');
const TEKRAR = Number(process.env.TEKRAR || 3);
const TAKILMA_ESIK = 50;                    /* kapi A/B ile ayni sinyal */
const KOLLAR = (process.env.KOLLAR || 'K,G1,G2,A1').split(',').map((s) => s.trim());
/* Kapi B'nin en yuksek, orta ve en dusuk takilma oranli ucu */
const VARSAYILAN = ['/yeni/projeler/', '/yeni/', '/yeni/hizmetler/finans/'];
const secim = process.env.LISTE ? process.env.LISTE.split(',').map((s) => s.trim()) : VARSAYILAN;

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : null; };

const KAYITCI = `(() => {
  window.__k = { ara: [], on: false, son: null };
  const f = (t) => { if (__k.son !== null && __k.on) __k.ara.push(+(t - __k.son).toFixed(2)); __k.son = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);
  window.__kBasla = () => { __k.ara.length = 0; __k.on = true; };
  window.__kBitir = () => { __k.on = false; return __k.ara.slice(); };
})()`;

const GORSEL = /\.(webp|avif|png|jpe?g|gif|svg)(\?|$)/i;

/* Sayfanin dist'teki HTML'inden gorsel adresleri — G1 kolu icin.
   src, srcset, source[srcset] ve link[rel=preload][as=image] taranir. */
function gorselAdresleri(yol) {
  const f = path.join(DIST, yol.replace(/^\/yeni\//, ''), 'index.html');
  if (!fs.existsSync(f)) return [];
  const h = fs.readFileSync(f, 'utf8');
  const bul = new Set();
  for (const m of h.matchAll(/\ssrc="([^"]+)"/g)) if (GORSEL.test(m[1])) bul.add(m[1]);
  for (const m of h.matchAll(/\ssrcset="([^"]+)"/g)) {
    for (const par of m[1].split(',')) {
      const u = par.trim().split(/\s+/)[0];
      if (u && GORSEL.test(u)) bul.add(u);
    }
  }
  for (const m of h.matchAll(/<link[^>]+as="image"[^>]*>/g)) {
    const u = (m[0].match(/href="([^"]+)"/) || [])[1];
    if (u) bul.add(u);
  }
  return [...bul].map((u) => (u.startsWith('http') ? u : SUNUCU + (u.startsWith('/') ? u : '/' + u)));
}

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
  await bekle(1500);
  const ham = ara.slice(5), m0 = medyan(ham);
  const suz = ham.filter((x) => x > m0 * 0.5 && x < m0 * 1.5);
  await page.close();
  return +medyan(suz).toFixed(3);
}

/* G1: gorselleri capraz-kokenli <img> ile onbellege al. Site HTML/CSS/JS'i
   ISINMAZ — yalnizca gorsel baytlari iner. */
async function gorselleriIsit(browser, adresler) {
  if (!adresler.length) return 0;
  const page = await browser.newPage();
  /* AYNI KOKENDEN isitilir. Ilk surum about:blank kullaniyordu: opak koken,
     capraz istek dusuyor, 16 gorselin 0'i indi — kol TAM NO-OP'tu ve bunu
     ancak isitilan_gorsel sayaci ele verdi. Isinma sayfasi olarak sitenin
     KENDI gorsellerinden biri acilir (belge olarak bir gorsel; HTML/CSS/JS
     isinmaz), oradan otekiler ayni kokenden cekilir. */
  await page.goto(adresler[0], { timeout: 30000 }).catch(() => {});
  const sayi = await page.evaluate(async (list) => {
    const isler = list.map((u) => new Promise((coz) => {
      const im = new Image();
      im.onload = () => coz(1); im.onerror = () => coz(0);
      im.src = u;
    }));
    const r = await Promise.all(isler);
    return r.reduce((a, b) => a + b, 0);
  }, adresler);
  await page.close();
  return sayi;
}

async function kosum(yol, kol) {
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 600000,
  });
  try {
    const tik = await tazelemeOlc(browser);
    let isitilan = 0;
    if (kol === 'G1') isitilan = await gorselleriIsit(browser, gorselAdresleri(yol));
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const cdp = await page.target().createCDPSession();
    if (kol === 'A1') await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    if (kol === 'G2') {
      await page.setRequestInterception(true);
      page.on('request', (r) => {
        if (r.resourceType() === 'image' || GORSEL.test(r.url())) r.abort().catch(() => {});
        else r.continue().catch(() => {});
      });
    }
    /* TUR ICINDE inen bayt: kaydirma sirasinda ne iniyor? */
    const inen = { gorsel_istek: 0, gorsel_bayt: 0, obur_istek: 0, obur_bayt: 0 };
    let turIcinde = false;
    page.on('response', async (r) => {
      if (!turIcinde) return;
      const gorselMi = r.request().resourceType() === 'image' || GORSEL.test(r.url());
      let bayt = Number(r.headers()['content-length'] || 0);
      if (gorselMi) { inen.gorsel_istek++; inen.gorsel_bayt += bayt; }
      else { inen.obur_istek++; inen.obur_bayt += bayt; }
    });
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
    let toplamPx = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
    const toplamPxBas = toplamPx;
    turIcinde = true;
    await page.evaluate(() => __kBasla());
    const t0 = performance.now();
    let y = 0, zamanAsimi = false;
    while (y < toplamPx - 4) {
      const adim = Math.min(600, toplamPx - y);
      await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, yDistance: -adim, speed: 900, gestureSourceType: 'mouse' });
      const d = await page.evaluate(() => ({ y: scrollY, max: Math.max(0, document.documentElement.scrollHeight - innerHeight) }));
      toplamPx = d.max;
      if (d.y <= y) break;
      y = d.y;
      if (performance.now() - t0 > 90000) { zamanAsimi = true; break; }
    }
    await bekle(300);
    turIcinde = false;
    const ara = await page.evaluate(() => __kBitir());
    const turMs = ara.reduce((a, b) => a + b, 0);
    const tak = ara.filter((a) => a > TAKILMA_ESIK);
    return {
      kol, tik_ms: tik, isitilan_gorsel: isitilan,
      kare: ara.length, tur_ms: Math.round(turMs), p95_ms: p95(ara),
      kacirilan_kare: Math.max(0, Math.round(p95(ara) / tik) - 1),
      takilma_sayi: tak.length, takilma_toplam_ms: Math.round(tak.reduce((a, b) => a + b, 0)),
      takilma_oran: +(turMs ? tak.reduce((a, b) => a + b, 0) / turMs : 0).toFixed(4),
      takilma_tek_max_ms: tak.length ? Math.round(Math.max(...tak)) : 0,
      taban_takilma: tabanAra.filter((a) => a > TAKILMA_ESIK).length,
      tur_icinde_inen: inen,
      scroll_px: Math.round(y), toplam_px: toplamPx, toplam_px_bas: toplamPxBas,
      tur_tam: !zamanAsimi && y >= toplamPx - 4,
    };
  } finally {
    await browser.close();
  }
}

(async () => {
  console.log(`SOGUK TAKILMANIN KOKU — TESHIS (kapi degil) · ${secim.length} sayfa · kollar ${KOLLAR.join(',')} · ${TEKRAR} kosum`);
  const sonuc = [];
  for (const yol of secim) {
    const kayit = { yol, gorsel_adres_sayisi: gorselAdresleri(yol).length, kol: {} };
    /* KOLLAR DONUSUMLU KOSAR (5 Eyl dersi). Ilk surumde once K'nin butun
       kosumlari, sonra G1'inkiler... diye kosuyordu; olcum saatler suruyor ve
       makine durumu kayiyor, o yuzden SIRA ile KOL birbirine karisiyordu.
       Kanit: G1 kolu hicbir gorseli isitamamisti (0/16 — about:blank opak
       kokeninden capraz istek dusuyor), yani TAM BIR NO-OP'tu, buna ragmen
       kontrole gore +5,5 puan "etki" gosterdi. Artik tur tur donuluyor:
       kosum 1'de K,G1,G2,A1 · kosum 2'de yine hepsi... Kayma butun kollari
       ayni sekilde etkiler. */
    const kova = {};
    for (const kol of KOLLAR) kova[kol] = [];
    for (let i = 0; i < TEKRAR; i++) {
      for (const kol of KOLLAR) kova[kol].push(await kosum(yol, kol));
    }
    for (const kol of KOLLAR) {
      const k = kova[kol];
      const oz = {
        takilma_oran_medyan: +medyan(k.map((x) => x.takilma_oran)).toFixed(4),
        kacirilan_medyan: medyan(k.map((x) => x.kacirilan_kare)),
        p95_medyan: medyan(k.map((x) => x.p95_ms)),
        toplam_px_medyan: medyan(k.map((x) => x.toplam_px)),
        tur_icinde_gorsel_bayt_medyan: medyan(k.map((x) => x.tur_icinde_inen.gorsel_bayt)),
        tur_icinde_gorsel_istek_medyan: medyan(k.map((x) => x.tur_icinde_inen.gorsel_istek)),
        tur_tam: k.every((x) => x.tur_tam), kosum: k,
      };
      kayit.kol[kol] = oz;
      const K = kayit.kol.K;
      const fark = (K && kol !== 'K') ? `  · K'ya gore takilma ${((oz.takilma_oran_medyan - K.takilma_oran_medyan) * 100).toFixed(2)} puan` : '';
      const yukseklikSapma = (K && kol !== 'K' && K.toplam_px_medyan && Math.abs(oz.toplam_px_medyan - K.toplam_px_medyan) / K.toplam_px_medyan > 0.02)
        ? `  !! YUKSEKLIK SAPTI ${K.toplam_px_medyan} -> ${oz.toplam_px_medyan} px (kol saf degil)` : '';
      console.log(`  ${yol.padEnd(28)} ${kol.padEnd(3)} takilma %${(oz.takilma_oran_medyan * 100).toFixed(2)} · kacirilan ${oz.kacirilan_medyan} · p95 ${oz.p95_medyan} ms · tur ici gorsel ${oz.tur_icinde_gorsel_istek_medyan} istek/${Math.round((oz.tur_icinde_gorsel_bayt_medyan || 0) / 1024)} KB${fark}${yukseklikSapma}`);
    }
    sonuc.push(kayit);
  }
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/olc-soguk-kok.cjs — SOGUK GIRIS TAKILMASININ KOKU. TESHIS ARACI, KAPI DEGIL: hukum yok, cikis kodu her zaman 0. Kollar tek degisken: K kontrol · G1 gorsel onbellekli (yalniz indirme payi kalkar) · G2 gorselsiz (indirme+cozme+raster kalkar) · A1 hareketsiz (prefers-reduced-motion).',
    olcum: new Date().toISOString(), tarayici: TARAYICI, tekrar: TEKRAR, kollar: KOLLAR,
    sinyal: { takilma_esik_ms: TAKILMA_ESIK, _: 'kapi A/B ile ayni' },
    sayfa: sonuc,
  }, null, 1));
  console.log(`\nTESHIS BITTI (kapi degil, hukum verilmez)\n→ ${CIKTI}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
