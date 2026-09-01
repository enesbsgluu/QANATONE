#!/usr/bin/env node
/* EK KAPI — BUTUN SAYFALAR (Enes, 4 Eyl 2026): "Site kasmiyor" hukmu ancak
   butun sayfalar olculunce kurulabilir. Her sayfa icin AYRI AYRI:
     1. kare suresi p95 <= 20 ms — UC KOSUM MEDYANI
     2. kaydirma boyunca takilma: toplam <= turun %3'u · tek takilma <= 250 ms
     3. TABAN DAMGASI her olcumde (sayfa yuklu, kaydirmasiz 3 sn: ayni
        sinyal, ayni esik — olc-efekt ilkesi; kapi taban-goreceli DEGIL,
        talimattaki mutlak esikler; taban yalniz ortamin gurultusunu yazar)
     4. sayfa JS butcesi (J1'in olctugu ayni bayt: satir ici + src)
   Bir sayfa gecmiyorsa ADIYLA yazilir ve DURULUR (cikis kodu 2).

   SINYAL: rAF araligi (ms). Takilma = ardisik iki rAF arasi > 50 ms
   (bir kareden fazla kacirilmis: 16,7 x 3); takilma suresi o aralik.
   Tur: sayfa basindan sonuna GERCEK girdi (Input.synthesizeScrollGesture,
   900 px/s, 600 px'lik adimlar) — evaluate(scrollTo) surucuyu kendi
   ritmine sokar (olc-zincir dersi). Kabuk efektleri (yildiz/imlec/damga)
   yuklu: boyama sonrasi 1,2 sn beklenir, fare bir kez oynatilir (imlec
   dongusu kurulsun). Film/deneme-react sayfalari ATLANIR: filmin kendi
   kapanis tablosu var, deneme gecici.
   Kullanim: node yeni/film/olc-sayfa.cjs   (once: node yerel-sun.cjs)
   Cevre  : TEKRAR=3 · SAYFA=/yeni/otomasyon/ (tek sayfa) · TARAYICI=brave */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'brave';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const DIST = path.join(__dirname, '..', '..', 'dist', 'yeni');
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-sayfa.json');
const TEKRAR = Number(process.env.TEKRAR || 3);
const P95_MS = 20, TAKILMA_ESIK = 50, TEK_TAKILMA_MS = 250, TOPLAM_ORAN = 0.03;
const TAVAN = { ana: 12.5 * 1024, film: 11 * 1024, obur: 10 * 1024 };

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : null; };

/* sayfa listesi dist'ten (film + deneme haric) */
const sayfalar = [];
(function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(_astro|font|img|varlik|film|deneme-react)$/.test(e.name)) gez(p); }
    else if (e.name === 'index.html') sayfalar.push('/yeni/' + path.relative(DIST, p).replace(/\\/g, '/').replace(/index\.html$/, ''));
  }
})(DIST);
/* FILTRE=regex: sayfa alt kumesi (10 dakikalik parcalar halinde kosmak icin) · CIKTI=dosya adi */
const secim = process.env.SAYFA ? [process.env.SAYFA] : sayfalar.sort().filter((y) => !process.env.FILTRE || new RegExp(process.env.FILTRE).test(y));

/* J1 ile ayni bayt sayimi (denetim.cjs) */
function jsBayt(yol) {
  const f = path.join(DIST, yol.replace(/\?.*$/, '').replace(/^\/yeni\//, ''), 'index.html');
  const h = fs.readFileSync(f, 'utf8');
  let t = 0;
  for (const m of h.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/g)) { const d = path.join(DIST, m[1].replace(/^\/yeni\//, '')); if (fs.existsSync(d)) t += fs.statSync(d).size; }
  for (const m of h.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) if (!/ld\+json/.test(m[1])) t += Buffer.byteLength(m[2]);
  return t;
}
const tavan = (yol) => (/^\/yeni\/(en\/)?$/.test(yol.replace(/\?.*$/, '')) ? TAVAN.ana : /film/.test(yol) ? TAVAN.film : TAVAN.obur);

const KAYITCI = `(() => {
  window.__k = { ara: [], on: false, son: null };
  const f = (t) => { if (__k.son !== null && __k.on) __k.ara.push(+(t - __k.son).toFixed(2)); __k.son = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);
  window.__kBasla = () => { __k.ara.length = 0; __k.on = true; };
  window.__kBitir = () => { __k.on = false; return __k.ara.slice(); };
})()`;

async function kosum(browser, yol) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const cdp = await page.target().createCDPSession();
  await page.goto(SUNUCU + yol, { waitUntil: 'networkidle0', timeout: 60000 });
  /* GIZLE=secici — TESHIS KOLU: bolum gizlenip ayni tur olculur (pay atfi) */
  if (process.env.GIZLE) await page.addStyleTag({ content: `${process.env.GIZLE}{display:none!important}` });
  await page.evaluate(KAYITCI);
  await page.bringToFront();
  await page.mouse.move(720, 450);
  await bekle(1200);                                 /* kabuk efektleri kurulsun (bosta ithal) */
  /* taban: kaydirmasiz 3 sn */
  await page.evaluate(() => __kBasla());
  await bekle(3000);
  const tabanAra = await page.evaluate(() => __kBitir());
  const tabanTak = tabanAra.filter((a) => a > TAKILMA_ESIK);
  /* tur: gercek girdi, 900 px/s */
  const toplamPx = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
  await page.evaluate(() => __kBasla());
  const t0 = performance.now();
  let y = 0;
  while (y < toplamPx - 4) {
    const adim = Math.min(600, toplamPx - y);
    await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, yDistance: -adim, speed: 900, gestureSourceType: 'mouse' });
    const yeniY = await page.evaluate(() => scrollY);
    if (yeniY <= y) break;                           /* ilerlemiyorsa (kisa sayfa) cik */
    y = yeniY;
    if (performance.now() - t0 > 90000) break;
  }
  await bekle(300);
  const ara = await page.evaluate(() => __kBitir());
  await page.close();
  const turMs = ara.reduce((a, b) => a + b, 0);
  const tak = ara.filter((a) => a > TAKILMA_ESIK);
  return {
    kare: ara.length, tur_ms: Math.round(turMs), p95_ms: p95(ara), medyan_ms: medyan(ara),
    takilma_sayi: tak.length, takilma_toplam_ms: Math.round(tak.reduce((a, b) => a + b, 0)), takilma_tek_max_ms: tak.length ? Math.round(Math.max(...tak)) : 0,
    taban: { sure_ms: Math.round(tabanAra.reduce((a, b) => a + b, 0)), takilma_sayi: tabanTak.length, p95_ms: p95(tabanAra) },
    scroll_px: y, toplam_px: toplamPx,
  };
}

(async () => {
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 600000,
  });
  const surum = await browser.version();
  console.log(`TARAYICI : ${TARAYICI} · ${surum} · ${secim.length} sayfa · ${TEKRAR} kosum`);
  const sonuc = [];
  let dur = null;
  for (const yol of secim) {
    const k = [];
    for (let i = 0; i < TEKRAR; i++) k.push(await kosum(browser, yol));
    const js = jsBayt(yol), tv = tavan(yol);
    const oz = {
      yol, js_bayt: js, js_tavan: tv, kosum: k,
      p95_medyan: medyan(k.map((x) => x.p95_ms)),
      takilma_oran_medyan: +medyan(k.map((x) => x.tur_ms ? x.takilma_toplam_ms / x.tur_ms : 0)).toFixed(4),
      takilma_tek_max: Math.max(...k.map((x) => x.takilma_tek_max_ms)),
      taban_takilma: k.map((x) => x.taban.takilma_sayi),
    };
    oz.kapi = {
      p95: oz.p95_medyan <= P95_MS, takilma_oran: oz.takilma_oran_medyan <= TOPLAM_ORAN,
      takilma_tek: oz.takilma_tek_max <= TEK_TAKILMA_MS, js: js <= tv,
    };
    oz.gecti = Object.values(oz.kapi).every(Boolean);
    sonuc.push(oz);
    console.log(`${oz.gecti ? 'GECTI' : 'KALDI'}  ${yol.padEnd(34)} p95 ${k.map((x) => x.p95_ms).join('/')} → ${oz.p95_medyan} ms · takilma ${k.map((x) => x.takilma_sayi + 'x' + x.takilma_toplam_ms + 'ms').join(' ')} oran ${(oz.takilma_oran_medyan * 100).toFixed(2)}% tek ${oz.takilma_tek_max} ms · taban ${oz.taban_takilma.join('/')} · JS ${js}/${tv}${oz.gecti ? '' : ' !! ' + Object.entries(oz.kapi).filter(([, v]) => !v).map(([n]) => n).join(',')}`);
    if (!oz.gecti && process.env.DEVAM !== '1') { dur = yol; break; }
  }
  await browser.close();
  const hukum = dur ? `KALDI — DURULDU: ${dur}` : (sonuc.every((s) => s.gecti) ? 'GECTI' : 'KALDI');
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/olc-sayfa.cjs — EK KAPI butun sayfalar: kare p95<=20 (3 kosum medyani) · takilma toplam<=%3 + tek<=250 ms · taban damgali · JS butcesi. Film/deneme-react haric.',
    olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, tekrar: TEKRAR,
    esik: { p95_ms: P95_MS, takilma_esik_ms: TAKILMA_ESIK, tek_takilma_ms: TEK_TAKILMA_MS, toplam_oran: TOPLAM_ORAN },
    hukum, durulan: dur, sayfa: sonuc,
  }, null, 1));
  console.log(`\nHUKUM: ${hukum}\n→ ${CIKTI}`);
  process.exit(dur || !sonuc.every((s) => s.gecti) ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
