#!/usr/bin/env node
/* `devicePixelRatio` DONMASI — TESHIS VE BEDEL OLCUMU (8 Eyl 2026).

   BULGU: `kabuk/tup.js` hero tup alanini kurarken dpr'yi 1,25 tavanina
   kilitliyor (GPU ayagi, olculmus gerekce), sonra "geri veriyor":
     const d = window.devicePixelRatio || 1;
     ... kurulum ...
     Object.defineProperty(window,'devicePixelRatio',{get:()=>d});
   Ikinci satir native davranisi GERI VERMEZ — dpr'yi kurulum anindaki
   SABIT degere kalici olarak dondurur. Olculdu (8 Eyl): prologu atlamis
   ziyaretcide ana sayfada `devicePixelRatio` 1,25'te donuyor, gercek
   cozunurluk 2'ye ciksa bile. Ayni kalip Film.astro 544'te de var.
   Yan etkisi olcum tarafinda da goruldu: rig "zoom uygulanmadi" hukmu
   verip kademeleri HUKUMSUZ sayiyordu.

   AMA DUZELTMENIN BEDELI VAR: kilit kalkinca tubes'un kendi yeniden
   boyutlandirmasi GERCEK dpr'yi gorur ve cizim tamponu buyur —
     donuk dpr : tampon = CSS_en x 1,25          (zoom'da KUCULUR)
     dogru dpr : tampon = CSS_en x gercek_dpr    (fiziksel piksel, SABIT)
   Masaustu donmasi raster tarafinda oldugu icin bu fark onemli. Bu arac
   iki kolu AYNI DERLEMEDE olcer: kol B'de ozgun ozellik tanimi geri
   konur. `delete window.devicePixelRatio` DENENDI VE OLMADI — `devicePixelRatio`
   Chrome'da window'un KENDI ozelligidir, prototipte bir yedegi yoktur;
   silince ad tamamen kayboluyor (ReferenceError). Yani bugunku "geri alma"
   satirinin dogru sekli de budur: kilitten ONCE ozgun tanim saklanacak,
   sonra `defineProperty` ile aynen geri konacak.

   OLCUT: her zoom kademesinde tuval tamponu (MP) ve rAF p95. dpr MEDYA
   SORGUSUNDAN okunur — `window.devicePixelRatio` olculecek seyin ta
   kendisi, olcerin dayanagi olamaz.                                    */
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
const KADEMELER = (process.env.KADEMELER || '1,1.5,2').split(',').map(Number);
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-dpr-donmasi.json');

const DPR_OKU = `(() => { let lo = 0.4, hi = 5;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (matchMedia('(min-resolution: ' + m + 'dppx)').matches) lo = m; else hi = m; }
  return Number(((lo + hi) / 2).toFixed(3)); })()`;

async function kol(b, ad, sil) {
  const page = await b.newPage();
  await page.evaluateOnNewDocument("try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}" +
    ";globalThis.__dprAsil = Object.getOwnPropertyDescriptor(window,'devicePixelRatio');");
  const cdp = await page.createCDPSession();
  await page.goto(ADRES, { waitUntil: 'load', timeout: 60000 });
  /* tup adasi: IO + data-film + 800 ms + bosta + 210 KB indirme */
  const kuruldu = await page.waitForFunction('!!window.__tubes', { timeout: 30000, polling: 200 })
    .then(() => true).catch(() => false);
  if (!kuruldu) { console.log(`  !! ${ad}: tup alani KURULMADI — kol HUKUMSUZ`); await page.close(); return null; }
  await new Promise((r) => setTimeout(r, 1500));

  const once = await page.evaluate(`({ yamali: !!Object.getOwnPropertyDescriptor(window,'devicePixelRatio'), js: devicePixelRatio, mm: ${DPR_OKU} })`);
  if (!once.yamali) { console.log(`  !! ${ad}: dpr yamasi YOK (tup kurulmadi mi?) — kol HUKUMSUZ`); await page.close(); return null; }
  if (sil) {
    const geri = await page.evaluate(`(() => {
      const a = globalThis.__dprAsil; if (!a) return 'ozgun tanim saklanmamis';
      Object.defineProperty(window, 'devicePixelRatio', a);
      const s = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
      return (s && s.get && /native code/.test(String(s.get))) ? 'ok' : 'geri konan tanim native degil';
    })()`);
    if (geri !== 'ok') { console.log(`  !! ${ad}: ozgun tanim GERI KONAMADI (${geri}) — kol HUKUMSUZ`); await page.close(); return null; }
  }
  console.log(`  ${ad}: kuruldu · yama ${sil ? 'GERI ALINDI (ozgun tanim)' : 'DURUYOR'} · dpr js ${once.js} / medya ${once.mm}`);

  const taban = await page.evaluate(() => ({ en: Math.round(innerWidth * 1.25), boy: Math.round(innerHeight * 1.25) }));
  const kayit = [];
  for (const z of KADEMELER) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: Math.round(taban.en / z), height: Math.round(taban.boy / z), deviceScaleFactor: z, mobile: false });
    await new Promise((r) => setTimeout(r, 2000));
    const d = await page.evaluate(`(async () => {
      const cv = document.getElementById('tubes');
      const kareler = [];
      await new Promise((res) => {
        let n = 0, son = performance.now();
        const t = () => { const s = performance.now(); kareler.push(s - son); son = s;
          if (++n < 90) requestAnimationFrame(t); else res(); };
        requestAnimationFrame(t);
      });
      kareler.sort((a, b) => a - b);
      return { tampon_en: cv ? cv.width : null, tampon_boy: cv ? cv.height : null,
        css_en: cv ? cv.clientWidth : null, css_boy: cv ? cv.clientHeight : null,
        js_dpr: devicePixelRatio, mm_dpr: ${DPR_OKU}, gorunum: innerWidth + 'x' + innerHeight,
        raf_p50: Number(kareler[Math.floor(kareler.length * 0.5)].toFixed(1)),
        raf_p95: Number(kareler[Math.floor(kareler.length * 0.95)].toFixed(1)),
        raf_max: Number(kareler[kareler.length - 1].toFixed(1)) };
    })()`);
    const mp = d.tampon_en ? Number(((d.tampon_en * d.tampon_boy) / 1e6).toFixed(2)) : null;
    const etkin = d.tampon_en && d.css_en ? Number((d.tampon_en / d.css_en).toFixed(2)) : null;
    kayit.push({ zoom: z, ...d, tampon_mp: mp, etkin_dpr: etkin });
    console.log(`    zoom ${String(z).padEnd(4)} · medya dpr ${d.mm_dpr} · js dpr ${Number(d.js_dpr).toFixed(2)} · gorunum ${d.gorunum} · TAMPON ${d.tampon_en}x${d.tampon_boy} = ${mp} MP (etkin ${etkin}) · rAF p50 ${d.raf_p50} p95 ${d.raf_p95} max ${d.raf_max} ms`);
  }
  await page.close().catch(() => {});
  return kayit;
}

(async () => {
  const exe = TARAYICILAR[TARAYICI];
  if (!fs.existsSync(exe)) { console.error(`TARAYICI YOK: ${exe}`); process.exit(1); }
  console.log(`TARAYICI : ${TARAYICI} · ${ADRES} · kademeler ${KADEMELER.join(' · ')}`);
  const b = await pt.launch({ executablePath: exe, headless: false,
    args: ['--no-first-run', '--no-default-browser-check'], defaultViewport: null });
  console.log('KOL A — bugunku hal (dpr donuk)');
  const A = await kol(b, 'A', false);
  console.log('KOL B — ozgun tanim geri konmus (dpr native, canli)');
  const B = await kol(b, 'B', true);
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'olc-dpr-donmasi.cjs — TESHIS. A: bugunku hal (tup.js dpr yamasi duruyor). B: ozgun tanim geri konmus (native, canli dpr).',
    olcum: new Date().toISOString(), tarayici: TARAYICI, adres: ADRES, kol_a: A, kol_b: B }, null, 1));
  console.log(`\n→ ${CIKTI}`);
  await b.close().catch(() => {});
})();
