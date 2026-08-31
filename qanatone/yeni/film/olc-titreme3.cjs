#!/usr/bin/env node
/* TUR 9 / 3. duzenek — EKRAN KATMANI.
 * scrollY ve gosterilenT temiz cikti; o halde soru su: deger duzgunken
 * EKRAN oynuyor mu? Olcum sayfanin ic degerlerinden degil, GERCEK
 * PIKSELLERDEN yapilir.
 *
 * Yontem: girdi YOKKEN ~2,5 sn boyunca N ekran goruntusu alinir, ardisik
 * kareler mpdecimate ile karsilastirilir (Tur 8'deki teknik). Ekran gercekten
 * duruyorsa gorsel olarak farkli kare sayisi 1-2 olmali. Ayni pencerede
 * motorun KAC video karesi sundugu (__fl.sunum) ayrica sayilir; ikisi
 * ayrisirsa titreme filmin degil sunum/ciziim katmaninin isidir.
 *
 * Iki bolge ayri olculur: SAHNE (kaydirma cubugu haric orta alan) ve
 * TUM PENCERE (cubuk dahil).
 *
 * Kullanim: node yeni/film/olc-titreme3.cjs "<sorgu>" [kare]
 */
const path = require('path'), fs = require('fs'), { spawnSync } = require('child_process');
const pt = require(process.env.PUPPETEER_CORE || path.join(process.env.USERPROFILE, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const BRAVE = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const SORGU = process.argv[2] || '?kodek=h264';
const KARE = +(process.argv[3] || 24);
const KOK = path.join(require('os').tmpdir(), 'titreme-kare');

const mpdec = (giris, vf) => {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'info', '-framerate', '20', '-i', giris,
    '-vf', vf ? vf + ',mpdecimate' : 'mpdecimate', '-fps_mode', 'vfr', '-f', 'null', '-'],
    { encoding: 'utf8' });
  return (r.stderr || '') + (r.stdout || '');
};
const sonKare = (log) => { const m = [...log.matchAll(/frame=\s*(\d+)/g)]; return m.length ? +m[m.length - 1][1] : null; };

(async () => {
  fs.rmSync(KOK, { recursive: true, force: true }); fs.mkdirSync(KOK, { recursive: true });
  const b = await pt.launch({
    executablePath: BRAVE, headless: false,
    args: ['--window-size=1460,980', '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 120000,
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(SUNUCU + '/yeni/film/' + SORGU, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForFunction('window.__fl && window.__fl.sahne()[0].durum === "hazir"', { timeout: 90000 });
  await p.bringToFront();
  /* filmi ortalara getir: gercek girdi, sonra 1,5 sn dinlen */
  const cdp = await p.createCDPSession();
  await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, yDistance: -1200, speed: 1200, gestureSourceType: 'mouse' });
  await new Promise((r) => setTimeout(r, 1500));

  await p.evaluate(() => { window.__fl.sifirla(); window.__fl.kayit = true; });
  const bas = await p.evaluate(() => ({ t: performance.now(), sY: scrollY, g: window.__fl.gosterilenT }));
  for (let i = 0; i < KARE; i++) {
    const png = await p.screenshot({ captureBeyondViewport: false });
    fs.writeFileSync(path.join(KOK, String(i).padStart(3, '0') + '.png'), png);
  }
  const son = await p.evaluate(() => ({ t: performance.now(), sY: scrollY, g: window.__fl.gosterilenT,
    sunum: window.__fl.sunum.length, kare: [...new Set(window.__fl.sunum.filter((x) => x.g).map((x) => x.kare))].length }));
  await p.evaluate(() => { window.__fl.kayit = false; });
  await b.close();

  const sure = (son.t - bas.t) / 1000;
  console.log('SORGU: ' + SORGU);
  console.log('  pencere            : ' + sure.toFixed(2) + ' sn · ' + KARE + ' ekran goruntusu');
  console.log('  scrollY            : ' + bas.sY.toFixed(1) + ' -> ' + son.sY.toFixed(1) + '  (fark ' + (son.sY - bas.sY).toFixed(1) + ' px)');
  console.log('  gosterilenT        : ' + bas.g.toFixed(4) + ' -> ' + son.g.toFixed(4) + '  (fark ' + (son.g - bas.g).toFixed(4) + ' film-sn)');
  console.log('  motorun sundugu FARKLI video karesi: ' + son.kare + ' (toplam sunum ' + son.sunum + ')');
  const giris = path.join(KOK, '%03d.png');
  const sahne = sonKare(mpdec(giris, 'crop=1200:700:120:100'));
  const tum = sonKare(mpdec(giris, null));
  console.log('  EKRAN gorsel olarak farkli kare — sahne alani (1200x700): ' + sahne + ' / ' + KARE);
  console.log('  EKRAN gorsel olarak farkli kare — tum pencere          : ' + tum + ' / ' + KARE);
})();
