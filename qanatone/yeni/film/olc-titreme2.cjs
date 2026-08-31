#!/usr/bin/env node
/* TUR 9 / 2. duzenek — GERCEK OKUMA UYARANI.
 * Tek savurmada scrollY salinimi cikmadi. Insan okurken tek savurma yapmaz:
 * kucuk tekerlek centikleri + kisa duraklar. Hizalama kolu tam da o kisa
 * duraklarda tetiklenebilir (HIZALA_BEKLE_MS = 120 ms).
 *
 * Uyaran: N centik x 120 px, aralarinda BEKLE ms durak. Her centik gercek
 * girdi hattindan (CDP wheel olayi) gider.
 * Olculen: scrollY'nin GERI adimlari (kullanici hep ileri kaydiriyor —
 * geri adim = sayfanin kendi kendine geri sicramasi), hizalama sayaci,
 * ve geri sicramalarin buyuklugu.
 *
 * Kullanim: node yeni/film/olc-titreme2.cjs "<sorgu>" [tekrar] [bekleMs]
 */
const path = require('path'), fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE || path.join(process.env.USERPROFILE, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const BRAVE = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const SORGU = process.argv[2] || '?kodek=h264';
const TEKRAR = +(process.argv[3] || 2);
const BEKLE = +(process.argv[4] || 220);
const CENTIK = 14, PX = 120;
const CIKTI = path.join(__dirname, 'olcum'); fs.mkdirSync(CIKTI, { recursive: true });

const OKUYUCU = `
window.TIT = (surMs) => new Promise((res) => {
  const F = window.__fl; F.sifirla();
  const t0 = performance.now(); const S = [];
  const ad = () => {
    const t = performance.now();
    S.push([+(t - t0).toFixed(1), scrollY, F.hedefT, F.gosterilenT, F.hizT, F.akiyor ? 1 : 0, F.hizalama]);
    if (t - t0 < surMs) requestAnimationFrame(ad); else res(S);
  };
  requestAnimationFrame(ad);
});`;

(async () => {
  const b = await pt.launch({
    executablePath: BRAVE, headless: false,
    args: ['--window-size=1460,980', '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 120000,
  });
  console.log('TARAYICI : brave · ' + (await b.version()));
  console.log('SORGU    : ' + SORGU + '  · uyaran: ' + CENTIK + ' centik x ' + PX + ' px, arasi ' + BEKLE + ' ms\n');
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
    const sur = CENTIK * (BEKLE + 60) + 2500;
    const bekle = p.evaluate((ms) => window.TIT(ms), sur);
    await new Promise((r) => setTimeout(r, 400));
    for (let c = 0; c < CENTIK; c++) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: PX, pointerType: 'mouse' });
      await new Promise((r) => setTimeout(r, BEKLE));
    }
    const S = await bekle;
    await p.close();

    /* GERI SICRAMA: kullanici hep ileri kaydiriyor; scrollY'nin azalmasi
       sayfanin kendi kendine geri gitmesidir. */
    const geri = [];
    for (let i = 1; i < S.length; i++) {
      const d = S[i][1] - S[i - 1][1];
      if (d < -0.5) geri.push({ t: S[i][0], px: +d.toFixed(1), hizalama: S[i][6] !== S[i - 1][6] });
    }
    const hz = S[S.length - 1][6];
    hepsi.push({ tekrar: t, geri, hizalama: hz, S });
    console.log('  #' + t + ' hizalama sayaci ' + String(hz).padStart(2)
      + ' | GERI SICRAMA sayisi ' + String(geri.length).padStart(3)
      + ' | toplam ' + geri.reduce((a, x) => a + x.px, 0).toFixed(0) + ' px'
      + ' | en buyuk ' + (geri.length ? Math.min(...geri.map((x) => x.px)) : 0) + ' px'
      + ' | hizalamayla ortusen ' + geri.filter((x) => x.hizalama).length);
    if (geri.length) console.log('     ilk 6: ' + geri.slice(0, 6).map((x) => 't=' + x.t + ' ' + x.px + 'px' + (x.hizalama ? '*' : '')).join(' · '));
  }
  await b.close();
  fs.writeFileSync(path.join(CIKTI, 'titreme2-' + SORGU.replace(/[^a-z0-9]+/gi, '_') + '.json'), JSON.stringify(hepsi));
})();
