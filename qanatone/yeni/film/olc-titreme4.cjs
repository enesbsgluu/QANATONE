#!/usr/bin/env node
/* TUR 9 / 4. duzenek — CIZIM KATMANINI AYIR.
 * 3. duzenek sunu buldu: ?akis=0 ile motor TAM duruyor (scrollY sabit,
 * gosterilenT sabit, sunulan video karesi 0) ama ekran 20 yakalamanin
 * 18'inde degisiyor. Titreme motorda degil. Peki nerede?
 *
 * Uc aday, teker teker KAPATILIP olculur (sayfaya yalniz TANI amacli CSS
 * enjekte edilir; depoda hicbir sey degismez):
 *   1) OLDUGU GIBI        — taban
 *   2) NEFES KAPALI       — .fl-yapis uzerindeki 7 sn'lik fl-nefes animasyonu
 *                           (28 Agu, %1 olcek + 2-3 px kayma, will-change)
 *   3) VIDEO GIZLI        — video katmani gorunmez; ekran hala oynuyorsa
 *                           sebep video yuzeyi degil
 *   4) IKISI DE KAPALI    — kalan varsa sebep baska yerde
 *
 * Hepsi ?akis=0 ile kosar: motor duruyor, dolayisiyla her piksel degisimi
 * cizim katmanindan gelir.
 *
 * Kullanim: node yeni/film/olc-titreme4.cjs [kare]
 */
const path = require('path'), fs = require('fs'), { spawnSync } = require('child_process');
const pt = require(process.env.PUPPETEER_CORE || path.join(process.env.USERPROFILE, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const BRAVE = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const KARE = +(process.argv[2] || 20);
const KOK = path.join(require('os').tmpdir(), 'titreme4');

const mpdec = (giris, vf) => {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'info', '-framerate', '20', '-i', giris,
    '-vf', vf ? vf + ',mpdecimate' : 'mpdecimate', '-fps_mode', 'vfr', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = [...((r.stderr || '') + (r.stdout || '')).matchAll(/frame=\s*(\d+)/g)];
  return m.length ? +m[m.length - 1][1] : null;
};

const DURUM = (process.env.MATRIS ? [
  { ad: 'akis=0 (taban)', sorgu: '&akis=0', css: '' },
  { ad: 'akis=0 hizala=0', sorgu: '&akis=0&hizala=0', css: '' },
  { ad: 'akis=0 moment=0', sorgu: '&akis=0&moment=0', css: '' },
  { ad: 'akis=0 tavan=0', sorgu: '&akis=0&tavan=0', css: '' },
] : [
  { ad: 'oldugu gibi', css: '' },
  { ad: 'NEFES kapali', css: '.fl-js .fl-yapis{animation:none !important}' },
  { ad: 'VIDEO gizli', css: '.fl-js .fl-video{visibility:hidden !important}' },
  { ad: 'ikisi de kapali', css: '.fl-js .fl-yapis{animation:none !important}.fl-js .fl-video{visibility:hidden !important}' },
]);

(async () => {
  const b = await pt.launch({
    executablePath: BRAVE, headless: false,
    args: ['--window-size=1460,980', '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 120000,
  });
  console.log('TARAYICI: brave · ' + (await b.version()));
  console.log('Hepsi ?akis=0 ile: motor duruyor, her piksel degisimi cizim katmanindan.\n');
  for (const d of DURUM) {
    const dizin = path.join(KOK, d.ad.replace(/[^a-z0-9]+/gi, '_'));
    fs.rmSync(dizin, { recursive: true, force: true }); fs.mkdirSync(dizin, { recursive: true });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto(SUNUCU + '/yeni/film/?kodek=h264' + (d.sorgu || '&akis=0'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForFunction('window.__fl && window.__fl.sahne()[0].durum === "hazir"', { timeout: 90000 });
    if (d.css) await p.addStyleTag({ content: d.css });
    await p.bringToFront();
    const cdp = await p.createCDPSession();
    await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, yDistance: -1200, speed: 1200, gestureSourceType: 'mouse' });
    await new Promise((r) => setTimeout(r, 2000));
    await p.evaluate(() => { window.__fl.sifirla(); window.__fl.kayit = true; });
    const bas = await p.evaluate(() => ({ t: performance.now(), sY: scrollY, g: window.__fl.gosterilenT }));
    for (let i = 0; i < KARE; i++) {
      fs.writeFileSync(path.join(dizin, String(i).padStart(3, '0') + '.png'), await p.screenshot({ captureBeyondViewport: false }));
    }
    const son = await p.evaluate(() => ({ t: performance.now(), sY: scrollY, g: window.__fl.gosterilenT, sunum: window.__fl.sunum.length }));
    await p.close();
    const giris = path.join(dizin, '%03d.png');
    console.log('  ' + d.ad.padEnd(16)
      + ' | motor: scrollY ' + (son.sY - bas.sY).toFixed(1) + ' px · gosterilenT ' + (son.g - bas.g).toFixed(4) + ' · sunum ' + son.sunum
      + ' | EKRAN farkli kare: sahne ' + String(mpdec(giris, 'crop=1200:700:120:100')).padStart(3) + '/' + KARE
      + ' · tum pencere ' + String(mpdec(giris, null)).padStart(3) + '/' + KARE
      + ' | ' + ((son.t - bas.t) / 1000).toFixed(1) + ' sn');
  }
  await b.close();
})();
