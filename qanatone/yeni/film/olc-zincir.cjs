#!/usr/bin/env node
/* FILM · ZINCIR TURU — PROLOG-ISKELET 3. ve 6. adim (31 Agu 2026)
   Sorular:
     3a) sayfa bastan sona kaydirilinca 39 klip SIRAYLA akiyor mu?
     3b) hizli savurmada hiz tavani ne oluyor — tavana carpinca ne olur?
     3c) geri kaydirmada zincir geriye sariyor mu?
     6)  kaydirirken kare suresi p50 / p95.

   GIRDI HATTI — SERT KURAL: butun kaydirma `Input.synthesizeScrollGesture`
   ile, yani GERCEK girdi olayiyla yapilir. Sayfa icinde `scrollTo`
   CAGRILMAZ. Gerekce (gorev metni): evaluate(scrollTo) surucuyu kendi
   ritmine sokup sahte esitlik uretiyor — bu tuzaga iki kez dusuldu.
   Tek istisna: tur baslamadan once sayfa basina donmek (olcum penceresi
   disinda, kayit kapaliyken).

   TUR HIZI TAVANDAN TURETILIR: gosterilen konum saniyede en cok TAVAN
   film-sn ilerleyebiliyorsa, tam turun ALT SINIRI toplam/TAVAN saniyedir.
   Tur jesti bu hizin biraz ustunde surulur (yakalanabilir olsun ama
   surekli tavana yaslanmasin).

   Cikti: film/olc-zincir.json
   Kullanim: node yeni/film/olc-zincir.cjs      (once: node yerel-sun.cjs)
   Cevre  : TARAYICI=chrome|brave (varsayilan brave — donanim hizlandirma
            Chrome'da bu makinede kapali cikiyordu, fps-olcum-tarayici notu) */
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
const CIKTI = path.join(__dirname, 'olc-zincir.json');

/* Sayfaya enjekte edilen kayitci: rAF araligi + motor durumu. Kare basina
   DUZEN OKUMASI YOK (motorun kendi kuralı); yalnizca __fl alanlari. */
const KAYITCI = `(() => {
  window.__z = { kare: [], iz: [], calisiyor: false, gerideOlay: [] };
  const bolum = document.querySelector('.fl');
  bolum.addEventListener('fl-geride', (e) => __z.gerideOlay.push({ t: performance.now(), geride: e.detail.geride }));
  let son = null;
  const dongu = () => {
    const simdi = performance.now();
    if (son !== null && __z.calisiyor) __z.kare.push(+(simdi - son).toFixed(2));
    son = simdi;
    if (__z.calisiyor) {
      const f = window.__fl;
      __z.iz.push({ t: +simdi.toFixed(1), T: +f.gosterilenT.toFixed(4), h: +f.hedefT.toFixed(4),
        v: +f.hizT.toFixed(4), n: f.etkin(), y: scrollY, ak: f.akiyor ? 1 : 0 });
    }
    requestAnimationFrame(dongu);
  };
  requestAnimationFrame(dongu);
  window.__zBasla = () => { __z.kare.length = 0; __z.iz.length = 0; __z.gerideOlay.length = 0; __z.calisiyor = true; };
  window.__zBitir = () => { __z.calisiyor = false; return { kare: __z.kare, iz: __z.iz, gerideOlay: __z.gerideOlay }; };
  /* GORUNUR = ekranda. hidden olmamasi yetmez: dugmeler eskiden .fl-ray
     icinde bottom:16px ile 115.487 px'lik rayin DIBINE oturuyordu, yani
     film boyunca ekran disindaydi ama hidden de degildi. */
  window.__zEkranda = (sec) => {
    const b = document.querySelector(sec);
    if (!b) return null;
    if (b.hidden) return { gizli: true, ekranda: false };
    const r = b.getBoundingClientRect();
    return { gizli: false, ekranda: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
      ust: Math.round(r.top), sol: Math.round(r.left) };
  };
  window.__zAtlaGorunur = () => { const b = document.querySelector('.fl-atla'); return b ? !b.hidden : null; };
})()`;

const yuzde = (a, p) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return +s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))].toFixed(2);
};
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/* GERCEK GIRDI: yDistance negatif = asagi kaydir (icerik yukari) */
async function jest(cdp, mesafe, hiz) {
  await cdp.send('Input.synthesizeScrollGesture', {
    x: 720, y: 450, xDistance: 0, yDistance: -mesafe,
    speed: hiz, gestureSourceType: 'mouse', repeatCount: 0,
  });
}

(async () => {
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980', '--autoplay-policy=no-user-gesture-required',
      '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 300000,
  });
  const bcdp = await browser.target().createCDPSession();
  const bilgi = await bcdp.send('SystemInfo.getInfo').catch(() => null);
  const surum = await browser.version();
  const gpu = bilgi && bilgi.gpu ? bilgi.gpu.featureStatus : null;
  const hizlandirma = gpu ? ['gpu_compositing', 'rasterization', 'video_decode', 'webgl']
    .map((x) => x + '=' + (gpu[x] || '?')).join(' · ') : 'alinamadi';
  console.log(`TARAYICI : ${TARAYICI} · ${surum}`);
  console.log(`HIZLANDIRMA: ${hizlandirma}`);

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  /* AGDAN INEN BAYT: 32 MiB butcesi DISK toplami uzerinden konusuluyor,
     ama motor kayan pencereyle calisiyor — bir oturumda gercekten inen
     bayt bambaska bir sayi. Tur boyunca gelen .mp4 yanitlarini sayariz. */
  const inen = { klip: 0, bayt: 0 };
  page.on('response', (r) => {
    if (!/\.mp4(\?|$)/.test(r.url())) return;
    const u = +(r.headers()['content-length'] || 0);
    if (u > 0) { inen.klip++; inen.bayt += u; }
  });
  /* rAF SAYACI — belge basinda, MOTORDAN ONCE kurulur. "Atlandiginda
     zincir durur ve kare istemez" sartinin olcusu bu: atlamadan once ve
     sonra saniyede kac rAF geri cagrisi kaydediliyor. Kendi kayitcimiz
     kare basina 1 tane ekler; taban budur. */
  await page.evaluateOnNewDocument(() => {
    window.__raf = 0;
    const asil = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (f) => { window.__raf++; return asil(f); };
  });
  const cdp = await page.createCDPSession();
  await page.goto(SUNUCU + '/yeni/film/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__fl && window.__fl.sahne()[0].durum === "hazir"', { timeout: 90000 });
  await page.evaluate(KAYITCI);
  await page.bringToFront();
  await bekle(500);

  const ray = await page.evaluate(() => ({ ...window.__fl.ray(), toplam: window.__fl.toplam, tavan: window.__fl.tavan, akis: window.__fl.akis, fps: window.__fl.fps }));
  console.log(`RAY      : ${Math.round(ray.rayPx)} px · toplam ${ray.toplam} sn · pxSn ${ray.pxSn} · tavan ${ray.tavan} film-sn/sn`);
  const altSinirSn = ray.toplam / ray.tavan;
  console.log(`TUR ALT SINIRI: ${altSinirSn.toFixed(0)} sn (toplam/tavan) — tavan bu turu bundan hizli bitirtmez`);

  const sonuc = { _: 'yeni/film/olc-zincir.cjs — 39 klip zincir turu, GERCEK girdi (Input.synthesizeScrollGesture). Sayfa ici scrollTo YOK.', olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, hizlandirma, ray, tur_alt_siniri_sn: +altSinirSn.toFixed(1) };

  /* SADECE=gec: faz 1-3 atlanir, dogrudan 5. adim olcumune gidilir.
     Kirmizi-once kontrolu icin var (motorun `durdu` kapisi kaldirilinca
     sizinti gercekten gorunuyor mu diye); tam tur 172 sn suruyor. */
  const SADECE = process.env.SADECE || '';
  if (SADECE !== 'gec') {
  /* ---------- 3a + 6: TAM TUR, ILERI ---------- */
  console.log('\n[1/3] tam tur (ileri) — gercek jest...');
  await page.evaluate(() => window.__zBasla());
  const turHiz = Math.round(ray.tavan * ray.pxSn * 1.15);   /* tavanin biraz ustu */
  const t0 = Date.now();
  let guvenlik = 0;
  /* CIKIS SARTI FILM KONUMU (31 Agu, duzeltme): ilk surum `scrollY` rayin
     sonuna varinca duruyordu ve tur 35/39 sahnede bitti — cunku `hizala`
     kolu birakista kalan BORCU yol kat ederek degil SAYFAYI GERI CEKEREK
     kapatiyor. Yani rayin sonuna varmak filmin sonuna varmak DEGIL; olcut
     gosterilen film konumu olmali. (Bu, rig hatasiydi; ayni zamanda
     surucunun gercek davranisi — rapora oyle yazildi.) */
  while (guvenlik++ < 900) {
    const d = await page.evaluate(() => ({ y: scrollY, T: window.__fl.gosterilenT }));
    if (d.T >= ray.toplam - 0.15) break;
    await jest(cdp, turHiz, turHiz);
    if (guvenlik % 40 === 0) {
      const d = await page.evaluate(() => ({ T: window.__fl.gosterilenT, n: window.__fl.etkin() }));
      process.stdout.write(`  ${Math.round((Date.now() - t0) / 1000)} sn · sahne ${d.n} · T ${d.T.toFixed(1)}/${ray.toplam}\n`);
    }
  }
  /* gosterilen konumun hedefe yetismesini bekle (tavan borcu kapansin) */
  const kapanmaT0 = Date.now();
  while (Date.now() - kapanmaT0 < 90000) {
    const g = await page.evaluate(() => window.__fl.geride());
    if (Math.abs(g) < 0.05) break;
    await bekle(500);
  }
  const tur = await page.evaluate(() => window.__zBitir());
  const turSn = (Date.now() - t0) / 1000;

  /* sahne sirasi: ardisik tekrarlar tekillestirilir */
  const dizi = [];
  for (const k of tur.iz) if (dizi[dizi.length - 1] !== k.n) dizi.push(k.n);
  const gorulen = [...new Set(dizi)].sort((a, b) => a - b);
  const eksik = Array.from({ length: 39 }, (_, i) => i + 1).filter((n) => !gorulen.includes(n));
  /* siralilik: dizide geri donus var mi (ileri turda olmamali) */
  const geriAdim = [];
  for (let i = 1; i < dizi.length; i++) if (dizi[i] < dizi[i - 1]) geriAdim.push(`${dizi[i - 1]}→${dizi[i]}`);

  sonuc.tur_ileri = {
    sure_sn: +turSn.toFixed(1),
    jest_hizi_px_sn: turHiz,
    gorulen_sahne_sayisi: gorulen.length,
    eksik_sahneler: eksik,
    sahne_sirasi_bozulmasi: geriAdim,
    sirali_mi: eksik.length === 0 && geriAdim.length === 0,
    kare_p50: yuzde(tur.kare, 50), kare_p95: yuzde(tur.kare, 95),
    kare_sayisi: tur.kare.length,
    ort_fps: +(1000 / (tur.kare.reduce((a, b) => a + b, 0) / tur.kare.length)).toFixed(1),
    en_yuksek_gosterilen_hiz: +Math.max(...tur.iz.map((k) => Math.abs(k.v))).toFixed(3),
    son_T: tur.iz.length ? tur.iz[tur.iz.length - 1].T : null,
  };
  console.log(`  tur ${turSn.toFixed(0)} sn · gorulen ${gorulen.length}/39 · eksik [${eksik.join(',')}] · sira bozulmasi ${geriAdim.length}`);
  sonuc.tur_ileri.agdan_inen = { klip: inen.klip, bayt: inen.bayt, mib: +(inen.bayt / 1048576).toFixed(1) };
  console.log(`  kare p50 ${sonuc.tur_ileri.kare_p50} ms · p95 ${sonuc.tur_ileri.kare_p95} ms · ort ${sonuc.tur_ileri.ort_fps} fps`);
  console.log(`  agdan inen: ${inen.klip} istek · ${(inen.bayt / 1048576).toFixed(1)} MiB (disk toplami 238,3 MiB)`);

  /* ---------- 3c: GERI KAYDIRMA ---------- */
  console.log('\n[2/3] geri kaydirma...');
  const oncekiT = await page.evaluate(() => window.__fl.gosterilenT);
  const oncekiN = await page.evaluate(() => window.__fl.etkin());
  await page.evaluate(() => window.__zBasla());
  for (let i = 0; i < 12; i++) await jest(cdp, -3000, 4000);   /* negatif mesafe = yukari */
  await bekle(2500);
  const geri = await page.evaluate(() => window.__zBitir());
  const geriDizi = [];
  for (const k of geri.iz) if (geriDizi[geriDizi.length - 1] !== k.n) geriDizi.push(k.n);
  const sonrakiT = await page.evaluate(() => window.__fl.gosterilenT);
  const sonrakiN = await page.evaluate(() => window.__fl.etkin());
  sonuc.geri = {
    T_once: +oncekiT.toFixed(3), T_sonra: +sonrakiT.toFixed(3), T_farki: +(sonrakiT - oncekiT).toFixed(3),
    sahne_once: oncekiN, sahne_sonra: sonrakiN,
    sahne_sirasi: geriDizi,
    geriye_sardi_mi: sonrakiT < oncekiT && sonrakiN <= oncekiN,
    kare_p50: yuzde(geri.kare, 50), kare_p95: yuzde(geri.kare, 95),
  };
  console.log(`  T ${oncekiT.toFixed(1)} → ${sonrakiT.toFixed(1)} · sahne ${oncekiN} → ${sonrakiN} · geriye sardi: ${sonuc.geri.geriye_sardi_mi}`);

  /* ---------- 3b: HIZ TAVANI (sert savurma) ---------- */
  console.log('\n[3/3] hiz tavani — sert savurma...');
  await page.evaluate(() => window.__zBasla());
  const savurT0 = await page.evaluate(() => ({ T: window.__fl.gosterilenT, h: window.__fl.hedefT, y: scrollY }));
  await jest(cdp, 40000, 60000);            /* cok sert: hedef firlar, gosterilen tavana yaslanir */
  await bekle(1200);
  const tepe = await page.evaluate(() => ({ T: window.__fl.gosterilenT, h: window.__fl.hedefT, v: window.__fl.hizT, geride: window.__fl.geride(), atla: window.__zAtlaGorunur() }));
  await bekle(3000);
  const savur = await page.evaluate(() => window.__zBitir());
  const enHizli = Math.max(...savur.iz.map((k) => Math.abs(k.v)));
  const enGeride = Math.max(...savur.iz.map((k) => Math.abs(k.h - k.T)));
  sonuc.tavan = {
    tavan_ayari: ray.tavan,
    olculen_en_yuksek_gosterilen_hiz: +enHizli.toFixed(3),
    tavani_asti_mi: enHizli > ray.tavan * 1.02,
    hedef_firladi_mi: Math.abs(savurT0.h - tepe.h) > 5,
    en_buyuk_borc_sn: +enGeride.toFixed(2),
    savurma_aninda: { T: +tepe.T.toFixed(2), hedef: +tepe.h.toFixed(2), geride_sn: +tepe.geride.toFixed(2), atla_dugmesi_gorunur: tepe.atla },
    geride_olayi_sayisi: savur.gerideOlay.length,
    kare_p50: yuzde(savur.kare, 50), kare_p95: yuzde(savur.kare, 95),
  };
  console.log(`  en yuksek gosterilen hiz ${enHizli.toFixed(3)} film-sn/sn (tavan ${ray.tavan}) · asti mi: ${sonuc.tavan.tavani_asti_mi}`);
  console.log(`  en buyuk borc ${enGeride.toFixed(1)} sn · atla dugmesi gorunur: ${tepe.atla} · fl-geride olayi ${savur.gerideOlay.length}`);
  }   /* SADECE=gec sonu */


  /* ---------- 5. ADIM: PROLOGU GEC — KLAVYE + ZINCIR DURDU MU ----------
     Uc sart ayri ayri olculur:
       a) dugmeye KLAVYEYLE varilir  -> Tab ile odaklanir mi (fare yok)
       b) atlaninca ZINCIR DURUR     -> rAF cagri hizi tabana iner,
          __fl kalkar, yeni klip istegi gelmez
       c) OTURUMDA BIR KEZ           -> sayfa yeniden yuklenince motor hic
          inmez (sifir video istegi), data-film="atlandi" yazar
     (b) icin taban: kendi kayitcimiz kare basina 1 rAF ekler. Motor
     calisirken oran bunun uzerinde olmali, durunca bu tabana inmeli. */
  console.log('\n[4/4] prologu gec — klavye + zincir durdu mu...');
  /* once ekranda mi (hidden degil, GERCEKTEN gorunur alanda mi) */
  const gecYer = await page.evaluate(() => window.__zEkranda('.fl-gec'));
  const atlaYer = await page.evaluate(() => window.__zEkranda('.fl-atla'));

  /* (a) KLAVYE: sayfanin basindan Tab'la dolas, .fl-gec odaga geliyor mu */
  await page.evaluate(() => { document.body.focus(); document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
  let tabAdim = null;
  for (let i = 1; i <= 25; i++) {
    await page.keyboard.press('Tab');
    const o = await page.evaluate(() => {
      const a = document.activeElement;
      return a ? { sinif: a.className || '', etiket: a.tagName } : null;
    });
    if (o && /\bfl-gec\b/.test(o.sinif)) { tabAdim = i; break; }
  }

  /* MOTORU UYANDIR: olcum anlamli olsun diye atlamadan hemen once gercek
     bir savurma yapilir. Aksi halde sayfa basinda motor zaten bostadir
     (rAF tabanda), "durdu" ile "durmadi" ayirt edilemez — ilk kirmizi
     kontrol tam bu yuzden sonucsuz kaldi. */
  await jest(cdp, 9000, 14000);
  await bekle(150);

  /* (b) rAF hizi: atlamadan ONCE */
  const rafOnce = await page.evaluate(async () => {
    const a = window.__raf; await new Promise((r) => setTimeout(r, 2000));
    return (window.__raf - a) / 2;
  });
  const inenOnce = inen.klip;

  /* KLAVYEYLE tetikle: odak .fl-gec'teyse Enter. Fare tiklamasi yok. */
  let klavyeIleAtlandi = false;
  if (tabAdim !== null) {
    await page.keyboard.press('Enter');
    await bekle(1500);
    klavyeIleAtlandi = true;
  } else {
    await page.evaluate(() => document.querySelector('.fl-gec').click());
    await bekle(1500);
  }

  /* (b) rAF hizi: atlamadan SONRA */
  const rafSonra = await page.evaluate(async () => {
    const a = window.__raf; await new Promise((r) => setTimeout(r, 3000));
    return (window.__raf - a) / 3;
  });
  const durum = await page.evaluate(() => ({
    fl: typeof window.__fl,
    film: document.documentElement.dataset.film,
    flJs: document.documentElement.classList.contains('fl-js'),
    oturum: (() => { try { return sessionStorage.getItem('qanat-prolog-atlandi'); } catch { return null; } })(),
    gorunur: getComputedStyle(document.querySelector('.fl')).display,
  }));
  const inenSonra = inen.klip;

  /* (c) AYNI OTURUMDA yeniden yukle: motor hic inmemeli */
  const inenYeniden0 = inen.klip;
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await bekle(2500);
  const ikinci = await page.evaluate(() => ({
    fl: typeof window.__fl,
    film: document.documentElement.dataset.film,
    gorunur: (() => { const e = document.querySelector('.fl'); return e ? getComputedStyle(e).display : null; })(),
  }));
  const ikinciIstek = inen.klip - inenYeniden0;

  sonuc.prologu_gec = {
    ekranda: { gec: gecYer, atla: atlaYer },
    klavye: { tab_adimi: tabAdim, klavyeyle_tetiklendi: klavyeIleAtlandi,
      erisilebilir: tabAdim !== null },
    zincir_durdu: {
      raf_cagri_sn_once: +rafOnce.toFixed(1),
      raf_cagri_sn_sonra: +rafSonra.toFixed(1),
      kayitci_tabani_sn: '~ekran tazeleme hizi (kendi kayitcimiz kare basina 1)',
      dustu_mu: rafSonra < rafOnce * 0.75,
      fl_yuzeyi: durum.fl,
      yeni_klip_istegi: inenSonra - inenOnce,
      data_film: durum.film, fl_js_sinifi: durum.flJs, film_display: durum.gorunur,
    },
    oturumda_bir_kez: {
      oturum_bayragi: durum.oturum,
      yeniden_yukleme_klip_istegi: ikinciIstek,
      ikinci_yukleme: ikinci,
      motor_inmedi_mi: ikinci.fl === 'undefined' && ikinciIstek === 0,
    },
  };
  console.log(`  ekranda: gec ${JSON.stringify(gecYer)} · atla ${JSON.stringify(atlaYer)}`);
  console.log(`  klavye: ${tabAdim !== null ? tabAdim + '. Tab\'da odakta' : 'TAB ILE VARILAMADI'} · Enter ile tetiklendi: ${klavyeIleAtlandi}`);
  console.log(`  rAF/sn ${rafOnce.toFixed(1)} -> ${rafSonra.toFixed(1)} · __fl: ${durum.fl} · yeni klip istegi: ${inenSonra - inenOnce}`);
  console.log(`  oturumda bir kez: bayrak ${durum.oturum} · yeniden yuklemede klip istegi ${ikinciIstek} · __fl ${ikinci.fl} · .fl display ${ikinci.gorunur}`);

  await page.close();
  await browser.close();
  fs.writeFileSync(CIKTI, JSON.stringify(sonuc, null, 1));
  console.log(`\nyazildi: ${CIKTI}`);
})().catch((e) => { console.error(e); process.exit(1); });
