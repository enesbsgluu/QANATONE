#!/usr/bin/env node
/* HIZ TAVANI + SONUMLEME OLCUMU (30 Agu 2026, TUR 2) — GERCEK GIRDI.
 *
 * olc-birakma.cjs'ten FARKI: orada sayfa rAF icinde `scrollTo` ile
 * suruluyordu (enjeksiyon). Burada kaydirma CDP `Input.synthesizeScrollGesture`
 * ile TARAYICININ GERCEK GIRDI HATTINDAN gecer: motorun wheel/pointer
 * dinleyicileri de tetiklenir (durusta akis girdi gorunce durur — scrollTo
 * ile o yol hic calismiyordu).
 *
 * Sayfaya ENJEKTE EDILEN tek sey OKUYUCU: her rAF'ta window.__fl'den
 * (hedefT, gosterilenT, hizT) okunur. Yazma yok, cagri yok, ayar yok —
 * ayarlarin hepsi URL'den (?tavan= ?sert= ?akis=).
 *
 * OLCULEN:
 *   tepe hiz  = max d(gosterilenT)/d(gercek zaman), kare kare (film-sn/sn)
 *   hedef tepe= ayni turev HEDEF uzerinde — "savurma yeterince sert miydi"
 *               sorusunun cevabi; duzenegin olctugunun kaniti.
 *   oturma    = birakistan, motorun KENDI oturma sartina kadar gecen sure
 *               (motor.ts: |x-hedef| < 0,5/fps VE |v| < 0,02)
 *
 * Kullanim: node yeni/film/olc-tavan-sonum.cjs [tekrar]
 * TARAYICI=brave|chrome (varsayilan brave) · SUNUCU=http://127.0.0.1:8790
 */
const path = require('path'), fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const TARAYICILAR = { chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe' };
const TARAYICI = process.env.TARAYICI || 'brave';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const TEKRAR = +(process.argv[2] || 2);
const CIKTI = path.join(__dirname, 'olcum'); fs.mkdirSync(CIKTI, { recursive: true });

/* Savurma sertligi: CDP jestinin px/sn hizi ve mesafesi. pxsn=450 oldugu icin
   8000 px/sn ~ 17,8 film-sn/sn hedef hizi demek — tavan 1,5'in cok ustunde. */
const JEST = { hiz: +(process.env.JEST_HIZ || 8000), mesafe: +(process.env.JEST_PX || 3000) };

const OKUYUCU = `
/* SADECE OKUR: her rAF'ta __fl'nin dort alanini kaydeder. */
window.OLC = (surMs) => new Promise((res) => {
  const F = window.__fl, S = [], t0 = performance.now();
  F.sifirla(); F.kayit = true;
  const ad = () => {
    const t = performance.now();
    S.push([+(t - t0).toFixed(2), F.hedefT, F.gosterilenT, F.hizT, F.akiyor ? 1 : 0]);
    if (t - t0 < surMs) requestAnimationFrame(ad);
    else { F.kayit = false;
      /* SUNUM: rVFC ile GERCEKTEN BOYANAN kareler {t,n,kare,g,mt}.
         Kare atlama oranı bundan cikar — istekten degil, sunumdan. */
      const sunum = F.sunum.map((x) => [+(x.t - t0).toFixed(2), x.n, x.kare, x.g ? 1 : 0]);
      res({ S, sunum, ray: F.ray(), fps: F.fps, sert: F.sert, sonum: F.sonum, tavan: F.tavan, akis: F.akis }); }
  };
  requestAnimationFrame(ad);
});`;

/* --- turev ---
   TUZAK (30 Agu, olculdu): OKUYUCUNUN rAF'i ile MOTORUN rAF'i ayri saatler.
   Iki okuma arasina bir motor guncellemesi dusunce konum bir tam motor
   karesi kadar (16,7 ms x hiz) siciyor ama olculen dt 6 ms olabiliyor —
   tek-kare turevi hizi 3-4x abartiyor (tavan 1,5 iken 4,79 "tepe" cikti,
   ayni anda motorun kendi hizT'si sabit 1,500 idi). Yanlis kirmizi.
   COZUM: turev W ornekten olusan kayan pencereden alinir (~5 kare, 60-80 ms);
   takma ad silinir, gercek zirve kalir. Tek-kare turevi de raporlanir ama
   ALIAS olarak isaretlenir. */
function turev(S, sut, W) {
  const d = [];
  for (let i = W; i < S.length; i++) {
    const dt = (S[i][0] - S[i - W][0]) / 1000;
    if (dt < 0.004) continue;
    d.push({ t: S[i][0], v: (S[i][sut] - S[i - W][sut]) / dt });
  }
  return d;
}

const W = 5;   /* kayan pencere (ornek) — ~60-80 ms */

function analiz(S, fps) {
  const dG = turev(S, 2, W), dH = turev(S, 1, W);
  const tepeG = dG.reduce((a, x) => Math.max(a, x.v), 0);
  const tepeH = dH.reduce((a, x) => Math.max(a, x.v), 0);
  const tepeAlias = turev(S, 2, 1).reduce((a, x) => Math.max(a, x.v), 0);
  /* BIRAKIS: hedefin son kez kayda deger hizla ilerledigi an */
  let tBirak = null;
  for (let i = dH.length - 1; i >= 0; i--) if (dH[i].v > 0.5) { tBirak = dH[i].t; break; }
  /* birakis anindaki fark (oturma suresi bu farka baglidir — koşumlar
     arasinda kiyaslanabilmesi icin yazilir) */
  let farkBirak = null;
  if (tBirak !== null) { const s = S.find((x) => x[0] >= tBirak); if (s) farkBirak = +(s[1] - s[2]).toFixed(3); }
  /* OTURMA: motorun KENDI sarti (motor.ts) — |g-hedef| < 0,5/fps VE |hizT| < 0,02 */
  let tOtur = null, tOturKonum = null;
  if (tBirak !== null) {
    for (const s of S) {
      if (s[0] <= tBirak) continue;
      if (tOturKonum === null && Math.abs(s[2] - s[1]) < 0.5 / fps) tOturKonum = s[0];
      if (Math.abs(s[2] - s[1]) < 0.5 / fps && Math.abs(s[3]) < 0.02) { tOtur = s[0]; break; }
    }
  }
  /* ARTIK HIZ (30 Agu, TUR 3): birakistan 2 sn sonra motorun hizi hala
     sifir mi? Donma kusurunda yay hedefe yaklasip duruyor ama hizT
     sifirlanmadan park ediyor — bir sonraki etkilesim o hizla basliyor. */
  const at = (ms) => { const s = S.find((x) => x[0] >= ms); return s ? s[3] : null; };
  const artik2sn = tBirak === null ? null : at(tBirak + 2000);
  const artikSon = S[S.length - 1][3];
  /* DONMA ANI: gosterilenT'nin bir daha hic degismedigi ilk an */
  let donmaMs = null;
  for (let i = S.length - 1; i > 0; i--) {
    if (Math.abs(S[i][2] - S[i - 1][2]) > 1e-9) { donmaMs = tBirak === null ? null : +(S[i][0] - tBirak).toFixed(0); break; }
  }
  return {
    tepeGosterilen: +tepeG.toFixed(3), tepeHedef: +tepeH.toFixed(3),
    tepeAliasTekKare: +tepeAlias.toFixed(3),
    artikHiz2sn: artik2sn === null ? null : +artik2sn.toFixed(4),
    artikHizSon: +artikSon.toFixed(4),
    donmaMs,
    tepeHizT: +S.reduce((a, s) => Math.max(a, Math.abs(s[3])), 0).toFixed(3),
    birakisMs: tBirak === null ? null : +tBirak.toFixed(0),
    farkBirakSn: farkBirak,
    oturmaMs: tOtur === null || tBirak === null ? null : +(tOtur - tBirak).toFixed(0),
    oturmaKonumMs: tOturKonum === null || tBirak === null ? null : +(tOturKonum - tBirak).toFixed(0),
    ornek: S.length,
  };
}

/* KARE ATLAMA (30 Agu 2026, TUR 4) — 28 Agu'da tavan 1,5'te karar
   verilmesinin sebebi "1,5 ustunde kare atlamasi basliyor" idi; bu olcum o
   esigi sinar.
   NASIL: motorun rVFC kaydi (`__fl.sunum`) GERCEKTEN BOYANAN kareyi tasir.
   Ardisik iki sunum AYNI sahnedeyse kare farki bakilir:
     fark 0 -> ayni kare tekrar boyanmis (atlama degil)
     fark 1 -> zincir tam
     fark >1 -> aradaki (fark-1) kare HIC gosterilmemis = ATLANMIS
   Oran, borcun kapandigi pencerede (birakis -> yarim kare) hesaplanir; orada
   hiz tavana dayalidir, yani tavanin sorusu tam orada sorulur. */
function kareAtlama(sunum, t0, t1) {
  const A = sunum.filter((x) => x[3] === 1 && x[0] >= t0 && x[0] <= t1);
  let gecis = 0, atlamali = 0, atlanan = 0, katedilen = 0, tekrar = 0;
  for (let i = 1; i < A.length; i++) {
    if (A[i][1] !== A[i - 1][1]) continue;          /* sahne degisti: kare sayaci sifirlanir */
    const d = A[i][2] - A[i - 1][2];
    if (d < 0) continue;                            /* geri gitme: bu turun konusu degil */
    gecis++; katedilen += d;
    if (d === 0) tekrar++;
    if (d > 1) { atlamali++; atlanan += d - 1; }
  }
  return {
    sunulanKare: A.length, gecis, atlamaliGecis: atlamali, atlananKare: atlanan,
    katedilenKare: katedilen, tekrarBoyama: tekrar,
    atlamaOrani: katedilen > 0 ? +(atlanan / katedilen).toFixed(4) : null,
    atlamaliGecisOrani: gecis > 0 ? +(atlamali / gecis).toFixed(4) : null,
    sunumHizi: t1 > t0 ? +(A.length / ((t1 - t0) / 1000)).toFixed(1) : null,
  };
}

async function kos(browser, ad, sorgu, kayitMs) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const cdp = await page.createCDPSession();
  await page.goto(SUNUCU + '/yeni/film/' + sorgu, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__fl && window.__fl.sahne()[0].durum === "hazir"', { timeout: 60000 });
  await page.evaluate(OKUYUCU);
  await page.bringToFront();
  await new Promise((r) => setTimeout(r, 400));
  const bekle = page.evaluate((ms) => window.OLC(ms), kayitMs);
  await new Promise((r) => setTimeout(r, 250));
  /* GERCEK GIRDI: yDistance negatif = asagi kaydir */
  await cdp.send('Input.synthesizeScrollGesture', {
    x: 720, y: 450, xDistance: 0, yDistance: -JEST.mesafe,
    speed: JEST.hiz, gestureSourceType: 'mouse', repeatCount: 0,
  });
  const { S, sunum, ray, fps, sert, sonum, tavan, akis } = await bekle;
  await page.close();
  const a = analiz(S, fps);
  /* BORC PENCERESI: birakistan, borcun kapandigi ana (yarim kare) kadar.
     Kapanmadiysa kaydin sonuna kadar — o zaman oran da eksik pencereden gelir. */
  const t0 = a.birakisMs, t1 = a.oturmaKonumMs !== null ? a.birakisMs + a.oturmaKonumMs : S[S.length - 1][0];
  const atlama = t0 === null ? null : kareAtlama(sunum, t0, t1);
  return { ad, sorgu, ...a, atlama, sunumSayi: sunum.length, pxSn: ray.pxSn, fps, sert, sonum, tavan, akis, ham: S, hamSunum: sunum };
}

(async () => {
  /* KISILMA KORUMASI (30 Agu, TUR 3): olcum penceresi arkada kalirsa
     (kullanicinin kendi tarayicisi one gelirse) rAF kisiliyor, orneklem
     hic bitmiyor ve CDP 180 sn'de dusuyor. Bu uc bayrak yalniz PENCERE
     YONETIMINI etkiler, motorun davranisini degil. */
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI], headless: false,
    args: ['--window-size=1460,980', '--autoplay-policy=no-user-gesture-required',
      '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 60000,
  });
  const bcdp = await browser.target().createCDPSession();
  const bilgi = await bcdp.send('SystemInfo.getInfo').catch(() => null);
  const surum = await browser.version();
  const gpu = bilgi && bilgi.gpu ? bilgi.gpu.featureStatus : null;
  console.log('TARAYICI : ' + TARAYICI + ' · ' + surum);
  if (gpu) {
    const k = ['gpu_compositing', 'rasterization', 'video_decode', 'webgl'];
    console.log('HIZLANDIRMA: ' + k.map((x) => x + '=' + (gpu[x] || '?')).join(' · '));
  } else console.log('HIZLANDIRMA: SystemInfo.getInfo alinamadi');
  console.log('JEST     : ' + JEST.hiz + ' px/sn · ' + JEST.mesafe + ' px (gercek girdi hatti)');

  /* ADIM 1 — tavan: ayni sert savurma, tavan kapali / varsayilan.
     ADIM 2 — sonumleme: yay YALNIZ basina olculur (?tavan=0&akis=0).
       tavan acikken oturma yayin degil TAVANIN isi olur: 6,7 film-sn'lik
       bosluk 1,5 film-sn/sn ile ~4,5 sn'de kapanir, k'nin etkisi gorunmez.
       Son satir bunu GOSTERMEK icin: ayni sert, tavan acik, uzun pencere. */
  const PLAN = [
    { ad: 'tavan KAPALI', sorgu: '?kodek=h264&tavan=0', ms: 4000 },
    { ad: 'tavan 1,5 (varsayilan)', sorgu: '?kodek=h264', ms: 4000 },
    { ad: 'sert 60', sorgu: '?kodek=h264&sert=60&tavan=0&akis=0', ms: 5000 },
    { ad: 'sert 120', sorgu: '?kodek=h264&sert=120&tavan=0&akis=0', ms: 5000 },
    { ad: 'sert 250', sorgu: '?kodek=h264&sert=250&tavan=0&akis=0', ms: 5000 },
    { ad: 'sert 120 + tavan 1,5', sorgu: '?kodek=h264&sert=120&akis=0', ms: 9000 },
    /* TUR 4 — tavan kiyasi. Urun yapilandirmasi: sert ve akis varsayilan,
       DEGISEN TEK SEY tavan. Ikisi de URL'den veriliyor ki kosumlar simetrik
       olsun (biri DOM'dan biri URL'den gelmesin). Pencere 8 sn: 1,5'te borcun
       kapanmasi ~4,5 sn suruyor, 2,0'da ~3,5. */
    { ad: 'TAVAN 1,5', sorgu: '?kodek=h264&tavan=1.5', ms: 8000 },
    { ad: 'TAVAN 2,0', sorgu: '?kodek=h264&tavan=2', ms: 8000 },
  ];
  /* PLAN_FILTRE=sert  -> yalniz adinda 'sert' gecen satirlar kosar */
  const filtre = process.env.PLAN_FILTRE ? new RegExp(process.env.PLAN_FILTRE, 'i') : null;
  const sonuc = [];
  /* Tekrar DIS dongude: kosumlar sirayla degil DONUSUMLU kosar (A#1, B#1,
     A#2, B#2). Boylece isinma/onbellek egilimi iki yapilandirmaya da esit
     dagilir; art arda iki A kosmak A'yi kayirirdi. */
  for (let t = 1; t <= TEKRAR; t++) {
    for (const p of PLAN.filter((x) => !filtre || filtre.test(x.ad))) {
      const r = await kos(browser, p.ad + ' #' + t, p.sorgu, p.ms);
      const { ham, hamSunum, ...ozet } = r;
      sonuc.push(ozet);
      fs.writeFileSync(path.join(CIKTI, 'tavan-sonum-ham-' + p.ad.replace(/[^a-z0-9]+/gi, '_') + '-' + t + '.json'), JSON.stringify(ham));
      fs.writeFileSync(path.join(CIKTI, 'tavan-sonum-sunum-' + p.ad.replace(/[^a-z0-9]+/gi, '_') + '-' + t + '.json'), JSON.stringify(hamSunum));
      console.log('  ' + (p.ad + ' #' + t).padEnd(24)
        + ' pxSn=' + ozet.pxSn
        + ' | hedef ' + String(ozet.tepeHedef).padStart(6)
        + ' | gost ' + String(ozet.tepeGosterilen).padStart(6)
        + ' | hizT ' + String(ozet.tepeHizT).padStart(6)
        + ' | borc ' + String(ozet.farkBirakSn).padStart(6)
        + ' | kapanma ' + String(ozet.oturmaKonumMs).padStart(5) + ' ms'
        + ' | artik ' + String(ozet.artikHiz2sn).padStart(6)
        + (ozet.atlama ? ' | ATLAMA ' + String((ozet.atlama.atlamaOrani * 100).toFixed(2) + '%').padStart(7)
          + ' (' + ozet.atlama.atlananKare + '/' + ozet.atlama.katedilenKare + ' kare)'
          + ' | sunum ' + String(ozet.atlama.sunumHizi).padStart(5) + '/sn' : ''));
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(CIKTI, 'tavan-sonum.json'), JSON.stringify({
    tarayici: TARAYICI, surum, gpu, jest: JEST, tekrar: TEKRAR, sonuc,
  }, null, 1));
  console.log('\nyazildi: ' + path.join(CIKTI, 'tavan-sonum.json'));
})();
