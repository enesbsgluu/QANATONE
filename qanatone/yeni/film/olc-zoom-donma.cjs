#!/usr/bin/env node
/* ZOOM DONMASI — masaustunde yakinlastirinca ana iplik ne kadar kilitleniyor?
   (7 Eyl 2026, Enes: "masaustunden herhangi bir yere zoom atinca donuyor
   ve kasiyor" — cokme MOBILDE, masaustunde DONMA.)

   SUPHE: sayfada ayni anda 36 `view()` kaydirma animasyonu kosuyor ve
   aralik uclari VIEWPORT BIRIMI tasiyor (ornek, deste.css 210:
   `calc((var(--i)+1)/var(--n)*100% - 100vh)`). Zoom, CSS gorunum
   penceresini degistirdigi icin BU ARALIKLARIN HEPSI yeniden cozulmek
   zorunda; ustune butun sayfa yeniden yerlesir ve yeniden rasterlenir.
   36 animasyon x her kademe = tek karede biriken is.

   OLCULEN: her zoom degisiminden SONRAKI 2,5 saniyede
     · en uzun gorev (longtask) suresi
     · toplam engelleme (uzun gorevlerin 50 ms ustu kismi)
     · rAF araliklarindan p95 ve kacirilan kare
   Kollar EKCSS ile ayrilir; boylece "36 animasyon" iddiasi elenerek
   sinanir, varsayilmaz.                                                */
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
const EKCSS = process.env.EKCSS || '';
const KADEMELER = (process.env.KADEMELER || '1.25,1.5,1.75,2,1.75,1.5,1.25').split(',').map(Number);
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-zoom-donma.json');

const KANCA = `(() => {
  const S = (globalThis.__don = { uzun: [], raf: [] });
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => S.uzun.push({ t: Math.round(e.startTime), sure: Math.round(e.duration) })))
    .observe({ type: 'longtask', buffered: true }); } catch (e) {}
  let son = performance.now();
  const tik = () => { const n = performance.now(); S.raf.push(n - son); son = n; requestAnimationFrame(tik); };
  requestAnimationFrame(tik);
  globalThis.__sifirla = () => { S.uzun.length = 0; S.raf.length = 0; };
})()`;

const p95 = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return Number(s[Math.floor(s.length * 0.95)].toFixed(1)); };

(async () => {
  const exe = TARAYICILAR[TARAYICI];
  if (!fs.existsSync(exe)) { console.error(`TARAYICI YOK: ${exe}`); process.exit(1); }
  console.log(`TARAYICI : ${TARAYICI} · ${ADRES}${EKCSS ? ' · KOL: ' + EKCSS.slice(0, 60) : ' · KONTROL'}`);

  const b = await pt.launch({ executablePath: exe, headless: false,
    args: ['--no-first-run', '--no-default-browser-check'], defaultViewport: null });
  const page = await b.newPage();
  await page.evaluateOnNewDocument("try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}");
  await page.evaluateOnNewDocument(KANCA);
  if (EKCSS) await page.evaluateOnNewDocument(`(()=>{const k=()=>{const s=document.createElement('style');s.setAttribute('data-ablasyon','1');s.textContent=${JSON.stringify(EKCSS)};(document.head||document.documentElement).appendChild(s)};document.head?k():document.addEventListener('DOMContentLoaded',k,{once:true})})()`);
  const cdp = await page.createCDPSession();
  await page.goto(ADRES, { waitUntil: 'load', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));
  if (EKCSS) {
    const v = await page.evaluate(() => !!document.querySelector('style[data-ablasyon]'));
    if (!v) { console.error('!! EKCSS UYGULANMADI — kosum hukumsuz'); await b.close(); process.exit(0); }
  }
  const taban = await page.evaluate(() => ({
    aygit_en: Math.round(innerWidth * devicePixelRatio),
    aygit_boy: Math.round(innerHeight * devicePixelRatio),
    animasyon: document.getAnimations().filter((a) => a.playState === 'running').length,
  }));
  console.log(`  pencere ${taban.aygit_en}x${taban.aygit_boy} · kosan animasyon ${taban.animasyon}`);

  const kayit = [];
  for (const z of KADEMELER) {
    await page.evaluate(() => globalThis.__sifirla && globalThis.__sifirla());
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: Math.round(taban.aygit_en / z), height: Math.round(taban.aygit_boy / z),
      deviceScaleFactor: z, mobile: false,
    });
    await new Promise((r) => setTimeout(r, 2500));
    const d = await page.evaluate(() => {
      const S = globalThis.__don;
      const uzun = S.uzun.map((u) => u.sure);
      return { en_uzun: uzun.length ? Math.max(...uzun) : 0,
        gorev: uzun.length, engelleme: uzun.reduce((t, s) => t + Math.max(0, s - 50), 0),
        raf: S.raf.slice(2) };
    });
    const kare = d.raf.length;
    const s = { zoom: z, en_uzun_ms: d.en_uzun, uzun_gorev: d.gorev, engelleme_ms: d.engelleme,
      raf_p95: p95(d.raf), kare: kare };
    kayit.push(s);
    console.log(`zoom ${String(z).padEnd(5)} · EN UZUN GOREV ${String(s.en_uzun_ms).padStart(5)} ms · uzun gorev ${String(s.uzun_gorev).padStart(2)} · engelleme ${String(s.engelleme_ms).padStart(5)} ms · rAF p95 ${s.raf_p95} ms · ${kare} kare`);
  }
  const oz = { en_uzun: Math.max(...kayit.map((k) => k.en_uzun_ms)), engelleme: kayit.reduce((t, k) => t + k.engelleme_ms, 0) };
  console.log(`\nOZET: en uzun tek gorev ${oz.en_uzun} ms · toplam engelleme ${oz.engelleme} ms (${KADEMELER.length} zoom degisimi)`);
  fs.writeFileSync(CIKTI, JSON.stringify({ _: 'olc-zoom-donma.cjs — TESHIS, kapi degil.', olcum: new Date().toISOString(), tarayici: TARAYICI, adres: ADRES, kol: EKCSS || null, kosan_animasyon: taban.animasyon, kademeler: kayit, ozet: oz }, null, 1));
  console.log(`→ ${CIKTI}`);
  await b.close().catch(() => {});
})();
