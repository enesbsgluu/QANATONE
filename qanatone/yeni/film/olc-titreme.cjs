#!/usr/bin/env node
/* TUR 9 — TITREME AVI (30 Agu 2026). Duzeltme yok, teshis.
 * Enes: "ekran surekli titriyor, film goruntusunde degil SAYFADA — scrollY oynuyor."
 *
 * Kare kare kaydedilen: scrollY, sayfa yuksekligi (scrollHeight), rayin
 * olculen yuksekligi, hedefT, gosterilenT, hizT, akiyor, hizalama sayaci.
 * Uc evre: (A) yuklendikten sonra GIRDI YOK · (B) savurma · (C) birakis sonrasi.
 *
 * TITREME OLCUTU: girdi olmayan evrelerde scrollY'nin ILERI-GERI salinimi —
 * ardisik adimlarda isaret degisimi. Akis tek yonlu (ileri) oldugu icin
 * saglikli halde isaret degisimi SIFIR beklenir.
 *
 * Kullanim: node yeni/film/olc-titreme.cjs "<sorgu>" [tekrar]
 *   ornek: node yeni/film/olc-titreme.cjs "?kodek=h264&hizala=0"
 */
const path = require('path'), fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE || path.join(process.env.USERPROFILE, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const BRAVE = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const SORGU = process.argv[2] || '?kodek=h264';
const TEKRAR = +(process.argv[3] || 2);
const CIKTI = path.join(__dirname, 'olcum'); fs.mkdirSync(CIKTI, { recursive: true });

const OKUYUCU = `
window.TIT = (surMs) => new Promise((res) => {
  const F = window.__fl, ray = document.querySelector('.fl-ray');
  F.sifirla(); F.kayit = true;
  const t0 = performance.now(); const S = [];
  /* stil yazimi sayaci: --fl-pxsn kare basina yeniden yaziliyor mu? */
  let stilYazim = 0;
  const bolum = document.querySelector('.fl');
  const asilSet = bolum.style.setProperty.bind(bolum.style);
  bolum.style.setProperty = function (...a) { if (a[0] === '--fl-pxsn') stilYazim++; return asilSet(...a); };
  const ad = () => {
    const t = performance.now();
    S.push([+(t - t0).toFixed(1), scrollY, document.documentElement.scrollHeight,
      +ray.getBoundingClientRect().height.toFixed(1), F.hedefT, F.gosterilenT, F.hizT,
      F.akiyor ? 1 : 0, F.hizalama]);
    if (t - t0 < surMs) requestAnimationFrame(ad);
    else { F.kayit = false; res({ S, stilYazim, sunum: F.sunum.map((x) => [+(x.t - t0).toFixed(1), x.n, x.kare, x.g ? 1 : 0]) }); }
  };
  requestAnimationFrame(ad);
});`;

/* bir evrede scrollY salinimi: ardisik farklarin isaret degisimi + geri adim */
function salinim(S, t0, t1) {
  const A = S.filter((s) => s[0] >= t0 && s[0] <= t1);
  let isaret = 0, geri = 0, enGeri = 0, ileri = 0, yukDegis = 0;
  let oncekiD = 0;
  for (let i = 1; i < A.length; i++) {
    const d = A[i][1] - A[i - 1][1];
    if (A[i][2] !== A[i - 1][2]) yukDegis++;
    if (d === 0) continue;
    if (d < 0) { geri++; enGeri = Math.min(enGeri, d); } else ileri++;
    if (oncekiD !== 0 && Math.sign(d) !== Math.sign(oncekiD)) isaret++;
    oncekiD = d;
  }
  return {
    ornek: A.length, ileriAdim: ileri, geriAdim: geri, enGeriPx: enGeri,
    isaretDegisimi: isaret, sayfaYuksekligiDegisti: yukDegis,
    scrollBas: A.length ? A[0][1] : null, scrollSon: A.length ? A[A.length - 1][1] : null,
  };
}

(async () => {
  const b = await pt.launch({
    executablePath: BRAVE, headless: false,
    args: ['--window-size=1460,980', '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 120000,
  });
  console.log('TARAYICI : brave · ' + (await b.version()));
  console.log('SORGU    : ' + SORGU + '\n');
  const hepsi = [];
  for (let t = 1; t <= TEKRAR; t++) {
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    const cdp = await p.createCDPSession();
    await p.goto(SUNUCU + '/yeni/film/' + SORGU, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForFunction('window.__fl && window.__fl.sahne()[0].durum === "hazir"', { timeout: 90000 });
    await p.evaluate(OKUYUCU);
    await p.bringToFront();
    await new Promise((r) => setTimeout(r, 300));
    const bekle = p.evaluate((ms) => window.TIT(ms), 11000);
    /* A: 3,5 sn GIRDI YOK */
    await new Promise((r) => setTimeout(r, 3500));
    /* B: savurma */
    await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, yDistance: -3000, speed: 8000, gestureSourceType: 'mouse' });
    /* C: kalan sure girdi yok */
    const { S, stilYazim, sunum } = await bekle;
    await p.close();

    const A = salinim(S, 0, 3400);            /* acilis, girdi yok */
    const C = salinim(S, 5200, 10900);        /* birakis sonrasi, girdi yok */
    hepsi.push({ tekrar: t, stilYazim, A, C, S, sunum });
    const yaz = (ad, o) => console.log('  #' + t + ' ' + ad.padEnd(22)
      + ' ornek ' + String(o.ornek).padStart(4)
      + ' | ileri ' + String(o.ileriAdim).padStart(4)
      + ' | GERI ' + String(o.geriAdim).padStart(4)
      + ' (en geri ' + String(o.enGeriPx).padStart(6) + ' px)'
      + ' | ISARET DEGISIMI ' + String(o.isaretDegisimi).padStart(4)
      + ' | sayfa yuksekligi degisti ' + o.sayfaYuksekligiDegisti
      + ' | scroll ' + o.scrollBas + '->' + o.scrollSon);
    yaz('A acilis (girdi yok)', A);
    yaz('C birakis sonrasi', C);
    console.log('     --fl-pxsn yeniden yazimi (kayit boyunca): ' + stilYazim);
  }
  await b.close();
  const dosya = path.join(CIKTI, 'titreme-' + SORGU.replace(/[^a-z0-9]+/gi, '_') + '.json');
  fs.writeFileSync(dosya, JSON.stringify(hepsi));
  console.log('\nyazildi: ' + dosya);
})();
