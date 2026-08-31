#!/usr/bin/env node
/* TUR 8 — KARE HIZI DENEMESI OLCUMU (30 Agu 2026).
 * Tek klip (sahne34), uc-bes kare hizi surumu, ayni duzenek.
 * Sayfalar: dist/deneme-fps/<ad>.html — GERCEK motor parcasi, tek sahnelik
 * timeline. Savurma Tur 3/4'teki CDP jesti (gercek girdi hatti).
 *
 * IKI UYARAN:
 *   A) SAVURMA — hiz tavanina dayali (1,5 film-sn/sn). Arz sinirli bolge:
 *      boru hatti ne verebiliyorsa o gorunur.
 *   B) SABIT YAVAS — 225 px/sn = 0,5 film-sn/sn. Arz bol bolge: filmin
 *      kendi kare hizi burada gorunur ("kare kare ilerliyor" sikayeti).
 *
 * KARE vs GORUNTU: kopya surumlerde iki farkli `kare` numarasi AYNI
 * goruntu olabilir (kaynak 24 fps). Bu yuzden hem farkli KARE hem farkli
 * GORUNTU (kare / kat) ayri ayri sayilir.
 *
 * Kullanim: node yeni/film/olc-karehizi.cjs [tekrar]
 */
const path = require('path'), fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE || path.join(process.env.USERPROFILE, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const BRAVE = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const TEKRAR = +(process.argv[2] || 2);
const KLIP = path.join(__dirname, 'deneme-fps');
const CIKTI = path.join(__dirname, 'olcum'); fs.mkdirSync(CIKTI, { recursive: true });

const OKUYUCU = `
window.OLC = (surMs) => new Promise((res) => {
  const F = window.__fl; F.sifirla(); F.kayit = true;
  const t0 = performance.now(); const S = [];
  const ad = () => {
    const t = performance.now();
    S.push([+(t - t0).toFixed(1), F.hedefT, F.gosterilenT, F.hizT]);
    if (t - t0 < surMs) requestAnimationFrame(ad);
    else { F.kayit = false;
      res({ S, sunum: F.sunum.map((x) => [+(x.t - t0).toFixed(1), x.kare, x.g ? 1 : 0]) }); }
  };
  requestAnimationFrame(ad);
});`;

/* pencere icindeki sunumlardan: arz, atlama, farkli kare, farkli goruntu.
   FARKLI GORUNTU: kopya surumlerde iki kare numarasi ayni KAYNAK karesine
   duser (kaynak 24 fps) — esleme floor(kare * 24 / fps), 60 fps'te bolen
   2,5'tir (round(60/24)=3 YANLIS olur). Ara-kare surumlerinde her kare
   gercekten yeni goruntudur, esleme birim. */
function say(sunum, t0, t1, fps, ara) {
  const A = sunum.filter((x) => x[2] === 1 && x[0] >= t0 && x[0] <= t1);
  let gecis = 0, atlanan = 0, katedilen = 0;
  for (let i = 1; i < A.length; i++) {
    const d = A[i][1] - A[i - 1][1];
    if (d < 0) continue;
    gecis++; katedilen += d;
    if (d > 1) atlanan += d - 1;
  }
  const kare = new Set(A.map((x) => x[1]));
  const goruntu = new Set(A.map((x) => (ara ? x[1] : Math.floor((x[1] * 24) / fps))));
  const sn = (t1 - t0) / 1000;
  return {
    sunum: A.length, sunumHizi: +(A.length / sn).toFixed(1),
    atlamaOrani: katedilen > 0 ? +(atlanan / katedilen).toFixed(4) : null,
    farkliKare: kare.size, farkliKareSn: +(kare.size / sn).toFixed(1),
    farkliGoruntu: goruntu.size, farkliGoruntuSn: +(goruntu.size / sn).toFixed(1),
  };
}

async function kos(b, ad, sayfa, fps, uyaran) {
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  const cdp = await p.createCDPSession();
  await p.goto(SUNUCU + '/deneme-fps/' + sayfa + '?hizala=0', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForFunction('window.__fl && window.__fl.sahne()[0].durum === "hazir"', { timeout: 90000 });
  await p.evaluate(OKUYUCU);
  await p.bringToFront();
  await new Promise((r) => setTimeout(r, 400));
  const sur = uyaran === 'savurma' ? 4500 : 6000;
  const bekle = p.evaluate((ms) => window.OLC(ms), sur);
  await new Promise((r) => setTimeout(r, 250));
  const jest = uyaran === 'savurma'
    ? { yDistance: -3000, speed: 8000 }        /* tavana dayali */
    : { yDistance: -900, speed: 225 };         /* 0,5 film-sn/sn, ~4 sn */
  await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, ...jest, gestureSourceType: 'mouse' });
  const { S, sunum } = await bekle;
  await p.close();

  const ara = /-ara/.test(sayfa);
  if (uyaran === 'savurma') {
    /* pencere: birakis -> borcun yarim kareye indigi an */
    let tB = null;
    for (let i = 5; i < S.length; i++) {
      const dt = (S[i][0] - S[i - 5][0]) / 1000;
      if (dt > 0.004 && (S[i][1] - S[i - 5][1]) / dt > 0.5) tB = S[i][0];
    }
    let t1 = S[S.length - 1][0];
    if (tB !== null) for (const s of S) if (s[0] > tB && Math.abs(s[1] - s[2]) < 0.5 / fps) { t1 = s[0]; break; }
    return { ad, uyaran, ...say(sunum, tB === null ? 0 : tB, t1, fps, ara), pencereMs: +(t1 - (tB || 0)).toFixed(0), ham: S, hamSunum: sunum };
  }
  /* SABIT YAVAS penceresi (duzeltildi): anlik hiz suzgeci kosum basina
     1,2-6,0 sn arasi degisen pencereler uretiyordu — oranlar kiyaslanamaz
     hale geliyordu. Simdi: hedefin KAYAN PENCEREDE (5 ornek) hizi 0,25'in
     ustunde oldugu EN UZUN kesintisiz aralik alinir, oradan sabit 3000 ms.
     Boylece her surum ayni uzunlukta ve ayni tempodaki pencereden olculur. */
  let bas = null, enBas = null, enUz = 0;
  for (let i = 5; i < S.length; i++) {
    const dt = (S[i][0] - S[i - 5][0]) / 1000;
    const v = dt > 0.004 ? (S[i][1] - S[i - 5][1]) / dt : 0;
    if (v > 0.25) { if (bas === null) bas = S[i][0]; const uz = S[i][0] - bas; if (uz > enUz) { enUz = uz; enBas = bas; } }
    else bas = null;
  }
  const t0 = enBas === null ? 0 : enBas;
  const t1 = Math.min(t0 + 3000, S[S.length - 1][0]);
  return { ad, uyaran, ...say(sunum, t0, t1, fps, ara), pencereMs: +(t1 - t0).toFixed(0), ham: S, hamSunum: sunum };
}

(async () => {
  const VAR = [
    { ad: '24', sayfa: '24.html', fps: 24, dosya: 's34-24.mp4' },
    { ad: '48-kopya', sayfa: '48-kopya.html', fps: 48, dosya: 's34-48-kopya.mp4' },
    { ad: '60-kopya', sayfa: '60-kopya.html', fps: 60, dosya: 's34-60-kopya.mp4' },
    { ad: '48-ara', sayfa: '48-ara.html', fps: 48, dosya: 's34-48-ara.mp4' },
    { ad: '60-ara', sayfa: '60-ara.html', fps: 60, dosya: 's34-60-ara.mp4' },
  ].filter((v) => fs.existsSync(path.join(KLIP, v.dosya)));

  const b = await pt.launch({
    executablePath: BRAVE, headless: false,
    args: ['--window-size=1460,980', '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 120000,
  });
  console.log('TARAYICI : brave · ' + (await b.version()));
  const sonuc = [];
  for (let t = 1; t <= TEKRAR; t++) {
    for (const u of ['savurma', 'yavas']) {
      for (const v of VAR) {
        const r = await kos(b, v.ad + ' #' + t, v.sayfa, v.fps, u);
        r.bayt = fs.statSync(path.join(KLIP, v.dosya)).size;
        const { ham, hamSunum, ...ozet } = r;
        fs.writeFileSync(path.join(CIKTI, "karehizi-ham-" + v.ad + "-" + u + "-" + t + ".json"), JSON.stringify({ S: ham, sunum: hamSunum }));
        sonuc.push(ozet);
        console.log('  ' + (u === 'savurma' ? 'SAVURMA ' : 'YAVAS   ') + r.ad.padEnd(12)
          + ' pencere ' + String(r.pencereMs).padStart(4) + ' ms'
          + ' | arz ' + String(r.sunumHizi).padStart(5) + '/sn'
          + ' | atlama ' + String(r.atlamaOrani === null ? '—' : (r.atlamaOrani * 100).toFixed(1) + '%').padStart(6)
          + ' | farkli kare/sn ' + String(r.farkliKareSn).padStart(5)
          + ' | farkli GORUNTU/sn ' + String(r.farkliGoruntuSn).padStart(5));
      }
    }
  }
  await b.close();
  fs.writeFileSync(path.join(CIKTI, 'karehizi.json'), JSON.stringify(sonuc, null, 1));
  console.log('\nyazildi: ' + path.join(CIKTI, 'karehizi.json'));
})();
