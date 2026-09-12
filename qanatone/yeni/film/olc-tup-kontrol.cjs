#!/usr/bin/env node
/* HERO TUP ALANI — GENEL KONTROL (8 Eyl 2026, Enes: "hero tuplerine de bir
   bak genel olarak, tamamen bir kontrol daha yap").

   NEDEN BU TUR: 8 Eyl'de dpr donmasi olculurken beklenmedik bir sey cikti —
   rAF p95 zoom ARTTIKCA IYILESIYOR (59 -> 39 -> 25 ms), cunku tup tuvalinin
   CSS boyutu kuculuyor ve tampon 4,15 MP'den 1,57 MP'ye iniyor. Yani zoom 1'de,
   HIC ZOOM YOKKEN, hero'da kareler zaten agir. Supheli artik zoom degil TUP
   ALANI.

   ILK KOSUMDA CIKAN IKI SEY (8 Eyl, chrome, 120,5 Hz / tik 8,3 ms):
     · KADRAJDA    p95 51,4 ms -> KACIRILAN KARE 5   (kapi <= 1)
     · KADRAJ DISI p95  8,6 ms -> kacirilan kare 0   (IO durdurmasi CALISIYOR)
   Yani alan yalniz hero ekrandayken pahali, ama orada cok pahali.

   VE KAPAK ETKISIZ CIKTI. `tup.js` kurulumda dpr'yi 1,25'e kilitliyor, ama
   kutuphane (tubes.min.js) kurulumunda `r.minPixelRatio = 2, r.maxPixelRatio = 2`
   yaziyor ve kendi #T() metodunda:
       let e = window.devicePixelRatio;
       if (max && e > max) e = max; else if (min && e < min) e = min;
       renderer.setPixelRatio(e)
   `min = 2` oldugu icin dpr 1,25 olsa bile oran 2'ye YUKSELTILIYOR. Kapak
   bastan beri hicbir sey yapmiyordu (ustelik dpr'yi sayfa genelinde donduruyordu
   — o ayri hata, ayni gun duzeltildi).

   UC KOL, hepsi ayni derleme ve ayni makinede:
     A  bugunku hal                       (piksel orani 2)
     B  `t-notubes` ablasyonu             (alan hic kurulmaz — ust sinir)
     C  kurulumdan sonra oran 1,25        (three.resize ile; tampon -%61)
   Ayrica C icin GORSEL BEDEL: A ve C'den ayni kare alinir.

   KAPI BIRIMI TIK (kayitli kural): kacirilan_kare = round(p95/tik) - 1.
   Tik her kosumda about:blank uzerinde olculur, sabit yazilmaz.

   ABLASYON KENDINI DOGRULAR: B kolu sinifin kokte OLDUGUNU ve __tubes'in
   KURULMADIGINI yazar; C kolu tamponun GERCEKTEN kucultuldugunu yazar.
   Yoksa kol HUKUMSUZ (uygulanmayan ablasyonun "fark yok"u bulgu degil). */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'chrome';
const ADRES = process.env.ADRES || 'http://127.0.0.1:8790/';
const KARE = Number(process.env.KARE || 180);
const ORAN = Number(process.env.ORAN || 1.25);
const DIZIN = process.env.DIZIN || path.join(__dirname, '_kare-tup');
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-tup-kontrol.json');

async function tikOlc(b) {
  const p = await b.newPage();
  await p.goto('about:blank');
  const ham = await p.evaluate(`(async () => {
    const a = []; let son = performance.now();
    await new Promise((res) => { let n = 0;
      const t = () => { const s = performance.now(); a.push(s - son); son = s;
        if (++n < 200) requestAnimationFrame(t); else res(); };
      requestAnimationFrame(t); });
    return a.slice(5);
  })()`);
  await p.close();
  const s = ham.slice().sort((x, y) => x - y);
  const m0 = s[Math.floor(s.length / 2)];
  const suz = ham.filter((x) => x > m0 * 0.5 && x < m0 * 1.5).sort((x, y) => x - y);
  return { tik: Number(suz[Math.floor(suz.length / 2)].toFixed(2)),
    hz: Number((1000 / suz[Math.floor(suz.length / 2)]).toFixed(1)),
    ornek: suz.length, suzulen: ham.length - suz.length };
}

const KARE_OLC = (n) => `(async () => {
  const a = []; let son = performance.now();
  await new Promise((res) => { let k = 0;
    const t = () => { const s = performance.now(); a.push(s - son); son = s;
      if (++k < ${n}) requestAnimationFrame(t); else res(); };
    requestAnimationFrame(t); });
  const b = a.slice(5).sort((x, y) => x - y);
  return { p50: b[Math.floor(b.length * .5)], p95: b[Math.floor(b.length * .95)],
    max: b[b.length - 1], n: b.length };
})()`;

/* t-notubes'u BELGE DOGMADAN once ekler. Ilk yazimda dogrudan
   `document.documentElement.classList.add` yaziliyordu ve `documentElement`
   o anda HENUZ YOKTU — sinif hic girmedi, kol sessizce hukumsuz dondu. */
const NOTUBES_KANCA = `(() => {
  const ek = () => { const R = document.documentElement; if (R) R.classList.add('t-notubes'); };
  ek();
  try { new MutationObserver(ek).observe(document, { childList: true, subtree: true }); } catch (e) {}
  document.addEventListener('DOMContentLoaded', ek);
})()`;

async function kol(b, tik, ad, { notubes = false, oran = null, kareAl = false } = {}) {
  const page = await b.newPage();
  await page.evaluateOnNewDocument("try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}");
  if (notubes) await page.evaluateOnNewDocument(NOTUBES_KANCA);
  const ag = [];
  page.on('response', (r) => {
    const u = r.url();
    if (/kabuk\.[\w.]*js|varlik\/tup\.js|tubes\.min\.js/.test(u)) ag.push({ url: u.split('/').pop(), durum: r.status(), t: Date.now() });
  });
  const t0 = Date.now();
  await page.goto(ADRES, { waitUntil: 'load', timeout: 60000 });
  const kuruldu = await page.waitForFunction('!!window.__tubes', { timeout: notubes ? 8000 : 30000, polling: 150 })
    .then(() => true).catch(() => false);
  await new Promise((r) => setTimeout(r, 1200));

  const oku = () => page.evaluate(`(() => {
    const R = document.documentElement, cv = document.getElementById('tubes');
    const a = window.__tubes || null, t = a && a.three;
    const g = cv ? (cv.getContext('webgl2') || cv.getContext('webgl')) : null;
    return { notubes_sinifi: R.classList.contains('t-notubes'), film_durumu: R.dataset.film || null,
      tuval_var: !!cv, tuval_on: cv ? cv.classList.contains('on') : null, kuruldu: !!a,
      pause_var: !!(a && a.pause && a.resume), setPaused_var: !!(a && a.setPaused),
      dispose_var: !!(a && a.dispose),
      piksel_orani: t ? t.size && t.size.pixelRatio : null,
      min_oran: t ? t.minPixelRatio : null, max_oran: t ? t.maxPixelRatio : null,
      tampon_en: cv ? cv.width : null, tampon_boy: cv ? cv.height : null,
      css_en: cv ? cv.clientWidth : null, css_boy: cv ? cv.clientHeight : null,
      dpr: devicePixelRatio, baglam_kayip: g ? g.isContextLost() : null,
      gorunum: innerWidth + 'x' + innerHeight };
  })()`);

  let durum = await oku();
  if (notubes) {
    if (!durum.notubes_sinifi) { console.log(`  !! ${ad}: t-notubes sinifi YOK — kol HUKUMSUZ`); await page.close(); return null; }
    if (durum.kuruldu) { console.log(`  !! ${ad}: ablasyona ragmen __tubes KURULDU — kol HUKUMSUZ`); await page.close(); return null; }
  } else if (!kuruldu) { console.log(`  !! ${ad}: tup alani KURULMADI — kol HUKUMSUZ`); await page.close(); return null; }

  let oranSonuc = null;
  if (oran) {
    oranSonuc = await page.evaluate(`(async (o) => {
      const t = window.__tubes && window.__tubes.three; if (!t) return { hata: 'three yok' };
      const cv = document.getElementById('tubes');
      const once = cv.width + 'x' + cv.height;
      t.minPixelRatio = o; t.maxPixelRatio = o;
      if (typeof t.resize === 'function') t.resize(); else return { hata: 'resize yok' };
      await new Promise((r) => setTimeout(r, 700));
      return { once, sonra: cv.width + 'x' + cv.height, pr: t.size.pixelRatio };
    })()`, oran);
    if (oranSonuc.hata || oranSonuc.once === oranSonuc.sonra) {
      console.log(`  !! ${ad}: oran DUSURULEMEDI (${JSON.stringify(oranSonuc)}) — kol HUKUMSUZ`);
      await page.close(); return null;
    }
    durum = await oku();
  }

  const mp = durum.tampon_en ? Number(((durum.tampon_en * durum.tampon_boy) / 1e6).toFixed(2)) : null;
  const etkin = durum.tampon_en && durum.css_en ? Number((durum.tampon_en / durum.css_en).toFixed(2)) : null;

  await page.evaluate('scrollTo(0,0)');
  await new Promise((r) => setTimeout(r, 900));
  if (kareAl) {
    fs.mkdirSync(DIZIN, { recursive: true });
    await page.screenshot({ path: path.join(DIZIN, `${ad}.png`), clip: { x: 0, y: 0, width: 900, height: 600 } });
  }
  const kadrajda = await page.evaluate(KARE_OLC(KARE));

  const uzak = await page.evaluate(`(async () => {
    const h = document.querySelector('.sus-tubes, #tubes');
    const s = h ? h.closest('section') : null;
    const alt = s ? s.getBoundingClientRect().bottom + scrollY : innerHeight * 2;
    scrollTo(0, Math.round(alt + innerHeight * 1.5));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const cv = document.getElementById('tubes');
    const r2 = cv ? cv.getBoundingClientRect() : null;
    return { y: Math.round(scrollY), tuval_ekranda: r2 ? (r2.bottom > 0 && r2.top < innerHeight) : null,
      gorunurluk: cv ? getComputedStyle(cv).visibility : null };
  })()`);
  await new Promise((r) => setTimeout(r, 1400));
  const kadrajDisi = await page.evaluate(KARE_OLC(KARE));

  await page.close().catch(() => {});
  const kacan = (p95) => Math.max(0, Math.round(p95 / tik.tik) - 1);
  const cik = { kol: ad, durum, oran_sonuc: oranSonuc, tampon_mp: mp, etkin_dpr: etkin, uzak,
    zincir: ag.map((x) => ({ ...x, ms: x.t - t0 })),
    kadrajda: { ...kadrajda, kacirilan: kacan(kadrajda.p95) },
    kadraj_disi: { ...kadrajDisi, kacirilan: kacan(kadrajDisi.p95) } };
  console.log(`  ${ad}: kuruldu ${durum.kuruldu ? 'E' : 'h'} · tuval ${durum.tampon_en}x${durum.tampon_boy} = ${mp} MP · CSS ${durum.css_en}x${durum.css_boy} · oran ${durum.piksel_orani} (min ${durum.min_oran}/max ${durum.max_oran}) · dpr ${Number(durum.dpr).toFixed(2)} · pause ${durum.pause_var ? 'VAR' : (durum.setPaused_var ? 'setPaused' : 'YOK')}`);
  console.log(`      KADRAJDA    p50 ${kadrajda.p50.toFixed(1)} p95 ${kadrajda.p95.toFixed(1)} max ${kadrajda.max.toFixed(1)} ms · KACIRILAN KARE ${kacan(kadrajda.p95)}`);
  console.log(`      KADRAJ DISI p50 ${kadrajDisi.p50.toFixed(1)} p95 ${kadrajDisi.p95.toFixed(1)} max ${kadrajDisi.max.toFixed(1)} ms · kacirilan ${kacan(kadrajDisi.p95)} (tuval ekranda ${uzak.tuval_ekranda ? 'EVET' : 'hayir'} · gorunurluk ${uzak.gorunurluk})`);
  if (cik.zincir.length) console.log('      zincir: ' + cik.zincir.map((z) => `${z.url} ${z.durum} @${z.ms}ms`).join(' · '));
  return cik;
}

/* KAPILAR: alan kurulmamasi gereken uc halde gercekten kurulmuyor mu */
async function kapilar(b) {
  const haller = [
    { ad: 'mobil (412x915, coarse)', olcu: { width: 412, height: 915, deviceScaleFactor: 2, mobile: true },
      ek: 'Emulation.setEmitTouchEventsForMouse' },
    { ad: 'dar ekran (860 px, ince imlec)', olcu: { width: 860, height: 800, deviceScaleFactor: 1, mobile: false } },
    { ad: 'hareket azaltma', azalt: true },
  ];
  const cik = [];
  for (const h of haller) {
    const page = await b.newPage();
    await page.evaluateOnNewDocument("try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}");
    const cdp = await page.createCDPSession();
    if (h.olcu) await cdp.send('Emulation.setDeviceMetricsOverride', h.olcu);
    if (h.olcu && h.olcu.mobile) await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }).catch(() => {});
    if (h.azalt) await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await page.goto(ADRES, { waitUntil: 'load', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 6000));
    const d = await page.evaluate(`({ kuruldu: !!window.__tubes, tuval: !!document.getElementById('tubes'),
      coarse: matchMedia('(pointer:coarse)').matches, azalt: matchMedia('(prefers-reduced-motion:reduce)').matches,
      en: innerWidth, film: document.documentElement.dataset.film || null })`);
    /* kutuphane agdan indi mi (indiyse kapi gec kalmis demektir) */
    const indi = await page.evaluate("performance.getEntriesByType('resource').some((r)=>/tubes\\.min\\.js/.test(r.name))");
    cik.push({ hal: h.ad, ...d, kutuphane_indi: indi });
    console.log(`  ${h.ad.padEnd(30)} · kuruldu ${d.kuruldu ? '!! EVET' : 'hayir'} · kutuphane indi ${indi ? '!! EVET' : 'hayir'} · tuval ${d.tuval ? 'var' : 'yok'} · coarse ${d.coarse} · azalt ${d.azalt} · en ${d.en} · film ${d.film}`);
    await page.close().catch(() => {});
  }
  return cik;
}

(async () => {
  const exe = TARAYICILAR[TARAYICI];
  if (!fs.existsSync(exe)) { console.error(`TARAYICI YOK: ${exe}`); process.exit(1); }
  const b = await pt.launch({ executablePath: exe, headless: false,
    args: ['--no-first-run', '--no-default-browser-check'], defaultViewport: null });
  const tik = await tikOlc(b);
  /* GPU DURUMU YAZILIR — KALICI KURAL (kayit: fps olcumunde tarayici VE
     hizlandirma durumu yazilir). Chrome bu makinede hizlandirmayi kapali
     acabiliyor; o halde WebGL SwiftShader'da (yazilim) kosar ve olcum
     YANLIS KIRMIZI verir. Brave 114 fps verirken Chrome 14 fps veren
     kosum boyle yakalanmisti. */
  const gpuS = await b.newPage();
  await gpuS.goto('about:blank');
  const gpu = await gpuS.evaluate(`(() => {
    const c = document.createElement('canvas');
    const g = c.getContext('webgl2') || c.getContext('webgl');
    if (!g) return { webgl: 'YOK' };
    const d = g.getExtension('WEBGL_debug_renderer_info');
    const r = d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER);
    const v = d ? g.getParameter(d.UNMASKED_VENDOR_WEBGL) : g.getParameter(g.VENDOR);
    return { renderer: String(r), vendor: String(v),
      yazilim: /swiftshader|software|llvmpipe|basic render/i.test(String(r)) };
  })()`);
  await gpuS.close();
  console.log(`TARAYICI : ${TARAYICI} · ${ADRES}`);
  console.log(`GPU      : ${gpu.renderer || gpu.webgl}${gpu.yazilim ? '  !! YAZILIM CIZIMI — hizlandirma KAPALI, olcum hukumsuz sayilmali' : '  (donanim)'}`);
  console.log(`TAZELEME : ${tik.hz} Hz · tik ${tik.tik} ms · ornek ${tik.ornek} (suzulen ${tik.suzulen})`);
  console.log(`KAPI     : p95'te kacirilan kare <= 1 (bu ekranda p95 <= ${(tik.tik * 2).toFixed(1)} ms)\n`);

  console.log('KOL A — bugunku hal (piksel orani 2)');
  const A = await kol(b, tik, 'A', { kareAl: true });
  console.log('KOL B — t-notubes ablasyonu (alan hic kurulmaz)');
  const B = await kol(b, tik, 'B', { notubes: true });
  console.log(`KOL C — kurulumdan sonra piksel orani ${ORAN}`);
  const C = await kol(b, tik, 'C', { oran: ORAN, kareAl: true });

  console.log('\nKAPILAR (alan bu uc halde kurulmamali)');
  const K = await kapilar(b);

  if (A && B && C) {
    const f = (x, y) => Number((x - y).toFixed(1));
    console.log('\nOZET — hero KADRAJDA p95 / kacirilan kare');
    console.log(`  A bugunku (oran 2)   ${A.kadrajda.p95.toFixed(1)} ms · ${A.kadrajda.kacirilan} · tampon ${A.tampon_mp} MP`);
    console.log(`  C oran ${ORAN}          ${C.kadrajda.p95.toFixed(1)} ms · ${C.kadrajda.kacirilan} · tampon ${C.tampon_mp} MP  (A'ya gore ${f(C.kadrajda.p95, A.kadrajda.p95)} ms)`);
    console.log(`  B alan yok (tavan)   ${B.kadrajda.p95.toFixed(1)} ms · ${B.kadrajda.kacirilan}`);
    const pay = A.kadrajda.p95 - B.kadrajda.p95;
    const kazanc = A.kadrajda.p95 - C.kadrajda.p95;
    console.log(`  alanin payi ${pay.toFixed(1)} ms · oran dusurmenin geri aldigi ${kazanc.toFixed(1)} ms (payin %${pay > 0 ? ((kazanc / pay) * 100).toFixed(0) : '—'}'i)`);
  }
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'olc-tup-kontrol.cjs — hero tup alani genel kontrol. A: bugunku · B: t-notubes ablasyonu · C: piksel orani dusurulmus. Kapi birimi TIK.',
    olcum: new Date().toISOString(), tarayici: TARAYICI, adres: ADRES, oran_denemesi: ORAN,
    gpu, tazeleme: tik, kol_a: A, kol_b: B, kol_c: C, kapilar: K }, null, 1));
  console.log(`\n→ ${CIKTI}`);
  await b.close().catch(() => {});
})();
