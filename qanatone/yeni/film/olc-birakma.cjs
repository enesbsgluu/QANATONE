#!/usr/bin/env node
/* KAYDIRIP BIRAKMA OLCUMU (28 Agu) — yay+sonum sonumlemesi kare kare.
   1) Tarayici: dist sunulur (8790'daki yerel-sun ya da kendi sunucusu), film
      sayfasi acilir; sayfa 1,2 s boyunca 1x hizla kaydirilir (rAF'ta scrollTo),
      sonra BIRAKILIR; birakistan itibaren her rAF'ta (t, hedefT, gosterilenT, hizT)
      kaydedilir. Son 500 ms (oturmadan onceki) icin: kare basi delta dizisi,
      isaret degisimi (salinim), sifir-sonra-artis (basamak), delta sicramasi
      (>2x komsu) sayilir. Ayrica tum egrinin puruzsuzlugu (ikinci fark p95).
   2) Benzetim: ayni integrator node'da 60 Hz ve 120 Hz kare suresiyle kosar,
      ayni birakis senaryosu; iki egrinin ayni GERCEK zamanlardaki fark p95'i.
   Kullanim: node yeni/film/olc-birakma.cjs [sert=120] [tekrar=3]
   TARAYICI=brave|chrome */
const path = require('path'), fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const TARAYICILAR = { chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe' };
const TARAYICI = process.env.TARAYICI || 'brave';
const SERT = +(process.argv[2] || 120), TEKRAR = +(process.argv[3] || 3);
const URL_ = process.env.URL_ || `http://127.0.0.1:8790/yeni/film/?kodek=h264&sert=${SERT}`;
const CIKTI = path.join(__dirname, 'olcum', 'birakma'); fs.mkdirSync(CIKTI, { recursive: true });

const SURUCU = `
window.BIRAK = (hizX, surMs, kayitMs) => new Promise((res) => {
  const F = window.__fl; F.sifirla(); F.kayit = true; const t0 = performance.now(); let faz = 'kaydir'; let tBirak = null;
  const T1 = hizX * surMs / 1000;
  const ad = () => {
    const now = performance.now(), u = now - t0;
    if (faz === 'kaydir') { scrollTo(0, Math.round(F.konum(Math.min(T1, hizX * u / 1000)))); if (u >= surMs) { faz = 'birak'; tBirak = now; } }
    if (u < surMs + kayitMs) requestAnimationFrame(ad);
    else { F.kayit = false;
      /* MOTORUN KENDI KARELERI: istek kaydi (t, T, hedef) — orneklemede sira/cift sorunu yok */
      const K = F.istek.filter((x) => x.T !== undefined).map((x) => ({ t: +(x.t - t0).toFixed(2), faz: x.t >= tBirak ? 'birak' : 'kaydir', hedef: x.hedef, g: x.T, v: null }));
      /* hiz: birakistaki kare hizi (komsu iki kareden) */
      const b0 = K.findIndex((k) => k.faz === 'birak'); if (b0 > 0) K[b0].v = (K[b0].g - K[b0 - 1].g) / ((K[b0].t - K[b0 - 1].t) / 1000);
      res(K); }
  };
  requestAnimationFrame(ad);
});`;

function analiz(kayit, fps) {
  const b0 = kayit.findIndex((k) => k.faz === 'birak'); const B = kayit.slice(b0);
  const hedef = B[B.length - 1].hedef;
  /* oturma ani: |g-hedef| < 0.5/fps ilk kez */
  let otur = B.findIndex((k) => Math.abs(k.g - hedef) < 0.5 / fps); if (otur < 0) otur = B.length - 1;
  const oturMs = +(B[otur].t - B[0].t).toFixed(1);
  /* son 500 ms: oturmadan onceki 500 ms penceresi */
  const son = B.filter((k) => k.t <= B[otur].t && k.t >= B[otur].t - 500);
  /* delta ZAMANA gore (film-sn / gercek-sn): rAF araligi titrer (bir uzun, bir kisa kare);
     kare basi delta o titremeyi tasir, hiz tasimaz. Konum sabit adimli fizikten geldigi
     icin dogru olcek hizdir. */
  /* dt < 4 ms olan ornek ciftleri (ayni rAF anina iki kayit — headless titremesi) atilir */
  const d = []; let atilan = 0; for (let i = 1; i < son.length; i++) { const dt = (son[i].t - son[i - 1].t) / 1000; if (dt < 0.004) { atilan++; continue; } d.push((son[i].g - son[i - 1].g) / dt); }
  let isaret = 0, basamak = 0, sicrama = 0;
  for (let i = 1; i < d.length; i++) {
    if (d[i] * d[i - 1] < 0 && Math.abs(d[i]) > 1e-4) isaret++;
    if (Math.abs(d[i - 1]) < 1e-6 && Math.abs(d[i]) > 1e-4) basamak++;
    if (Math.abs(d[i - 1]) > 1e-4 && Math.abs(d[i]) > 2.2 * Math.abs(d[i - 1]) + 1e-4) sicrama++;
  }
  /* ikinci fark (puruzsuzluk): |d[i]-d[i-1]| p95, delta olcegine gore */
  const dd = []; for (let i = 1; i < d.length; i++) dd.push(Math.abs(d[i] - d[i - 1]));
  const p95 = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(.95 * s.length))]; };
  const maxD = Math.max(...d.map(Math.abs), 1e-9);
  /* monotonluk: son 500 ms'de g hedefe hep yaklasiyor mu (asma yok) */
  let asma = 0; for (const k of son) if ((k.g - hedef) * (son[0].g - hedef) < 0) asma++;
  const gecerli = Math.abs(B[0].g - hedef) > 0.02;   /* birakista gercekten hareket var miydi */
  return { gecerli, birakis_hedef: +hedef.toFixed(3), birakis_g: +B[0].g.toFixed(3), birakis_v: B[0].v, oturma_ms: oturMs, kare_son500: son.length, atilan_cift: atilan,
    isaret_degisimi: isaret, basamak, sicrama, asma_kare: asma, ikinci_fark_p95: +p95(dd).toFixed(5), delta_max: +maxD.toFixed(4),
    duz: gecerli && isaret === 0 && basamak === 0 && sicrama === 0 && asma === 0, deltalar: d.map((x) => +x.toFixed(4)) };
}

/* --- node benzetimi: motor.ts ile ayni integrator --- */
function benzet(hz, k, tavan = 1.5) {
  const DT = 0.004, c = 2 * Math.sqrt(k), w = Math.sqrt(k), fps = 24;
  let yx = 0, yv = 0, yxOnce = 0, birikim = 0, hedef = 0, hedefOnce = 0, hedefHiz = 0, durdu = 0;
  const kare = 1 / hz, kayit = []; const hizX = 1.0, sur = 1.2, toplam = 3.0;
  for (let t = 0; t <= toplam + 1e-9; t += kare) {
    hedef = Math.min(hizX * sur, hizX * t);
    const dt = kare; birikim = Math.min(0.1, birikim + dt);
    const hz_ = (hedef - hedefOnce) / dt, hareketli = Math.abs(hedef - hedefOnce) > 1e-9;
    if (hareketli) { hedefHiz = hz_; durdu = 0; } hedefOnce = hedef;
    while (birikim >= DT) {
      birikim -= DT; yxOnce = yx;
      if (!hareketli) { durdu++; if (durdu === 1 && hedefHiz !== 0) { const d = hedef - yx, yon = Math.sign(d); if (yon !== 0 && Math.sign(hedefHiz) === yon) { const aday = Math.min(Math.abs(hedefHiz), w * Math.abs(d)); if (aday > Math.abs(yv)) yv = yon * aday; } hedefHiz = 0; } }
      const a = -k * (yx - hedef) - c * yv; yv += a * DT; if (Math.abs(yv) > tavan) yv = Math.sign(yv) * tavan; yx += yv * DT;
      if (Math.abs(yx - hedef) < 0.5 / fps && Math.abs(yv) < 0.02) { yx = hedef; yv = 0; }
    }
    kayit.push({ t: +t.toFixed(5), g: yxOnce + (yx - yxOnce) * (birikim / DT) });
  }
  return kayit;
}

(async () => {
  const b = await pt.launch({ executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  await p.evaluateOnNewDocument(SURUCU);
  await p.goto(URL_, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction('window.__fl && __fl.hazir', { timeout: 120000 });
  const bilgi = await p.evaluate(() => ({ sert: __fl.sert, sonum: __fl.sonum, tavan: __fl.tavan, kodek: __fl.kodek, fps: __fl.fps, hz: (() => { let n = 0; return null; })() }));
  const ua = await p.evaluate(() => navigator.userAgent);
  /* rAF hizi: 1 s'de kac rAF */
  const rafHz = await p.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); }));
  const sonuc = [];
  await p.evaluate(() => BIRAK(1.0, 600, 400)); await p.evaluate(() => { scrollTo(0, 0); __fl.atla(); }); await new Promise((r) => setTimeout(r, 600));   /* isinma */
  for (let i = 0; i < TEKRAR; i++) {
    await p.evaluate(() => { scrollTo(0, 0); __fl.atla(); });
    await new Promise((r) => setTimeout(r, 600));
    const kayit = await p.evaluate(() => BIRAK(1.0, 1200, 1800));
    sonuc.push({ tekrar: i + 1, analiz: analiz(kayit, bilgi.fps), kayit });
  }
  await b.close();
  const s60 = benzet(60, SERT), s120 = benzet(120, SERT);
  /* ayni gercek zamanlarda kiyas (60 Hz orneklerinde 120'nin ara degeri) */
  const farklar = s60.map((k) => { const j = s120.findIndex((x) => x.t >= k.t - 1e-6); const x = s120[Math.max(0, j)]; return Math.abs(k.g - x.g); });
  const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(.95 * (s.length - 1))]; };
  const benzetim = { fark_p95_sn: +p95(farklar).toFixed(6), fark_max_sn: +Math.max(...farklar).toFixed(6), fark_max_kare: +(Math.max(...farklar) * 24).toFixed(3) };
  const rapor = { tarayici: TARAYICI, ua, raf_hz: rafHz, ...bilgi, tekrar: sonuc.map((s) => s.analiz), benzetim_60_vs_120: benzetim };
  fs.writeFileSync(path.join(CIKTI, `sert-${SERT}.json`), JSON.stringify({ rapor, sonuc }, null, 1));
  console.log(JSON.stringify(rapor, (k, v) => (k === 'deltalar' ? undefined : v), 1));
  for (const s of sonuc) console.log(`tekrar ${s.tekrar} son500 hiz (film-sn/gercek-sn):`, s.analiz.deltalar.map((x) => x.toFixed(3)).join(' '));
})().catch((e) => { console.error('HATA', e); process.exit(1); });
