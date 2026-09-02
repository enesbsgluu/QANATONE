#!/usr/bin/env node
/* CHROME DERIN PERFORMANS DENETIMI (GECE ZINCIRI TUR 4, 2 Eyl 2026) —
   sayfa basina: LCP · CLS · INP (yaklasik) · LoAF (50 ms ustu uzun
   animasyon kareleri, kaynak betikleriyle).
   Kabul (GECE-ZINCIRI-FINAL.md): INP < 200 ms · LCP < 2,5 s · CLS < 0,1 ·
   LoAF olculur ve raporlanir (kapi degil).
   YONTEM: her sayfa taze bir sekmede acilir; PerformanceObserver'lar
   belge basinda kurulur (evaluateOnNewDocument): largest-contentful-paint,
   layout-shift (oturum penceresi: 1 s bosluk / 5 s tavan, CWV tanimi),
   long-animation-frame (scripts: sourceURL/functionName/invoker),
   event (durationThreshold 16 -> etkilesim sureleri; INP = en kotu, az
   etkilesimde CWV'nin de yaptigi). ETKILESIM: gercek girdi (CDP) —
   sayfada 3 tiklama (govde bos alan, ilk dugme/baglantiya hover degil
   tiklama ise engellenir: preventDefault ile navigasyon kapatilir),
   2 tus (Tab, Escape), bir tekerlek kaydirmasi; sonra sayfa sonuna
   gercek kaydirma turu (LoAF kaydirmada da toplansin). Yukleme ag
   kisitsiz (yerel): LCP yerel sunucudan — mutlak deger degil, sayfalar
   arasi siralama icin; rapora boyle yazilir.
   KIRMIZI-ONCE: ilk sayfada 120 ms'lik zorla uzun gorev + 0,3'luk zorla
   duzen kaymasi enjekte edilir; LoAF ve CLS yakalamali.
   Kullanim: node yeni/film/olc-chrome.cjs   (once: node yerel-sun.cjs)
   Cevre  : TARAYICI=brave|chrome · FILTRE=regex · CIKTI=dosya */
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
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-chrome.json');
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const sayfalar = [];
(function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(_astro|font|img|varlik|film|deneme-react)$/.test(e.name)) gez(p); }
    else if (e.name === 'index.html') sayfalar.push('/yeni/' + path.relative(DIST, p).replace(/\\/g, '/').replace(/index\.html$/, ''));
  }
})(DIST);
const secim = process.env.SAYFA ? [process.env.SAYFA] : sayfalar.sort().filter((y) => !process.env.FILTRE || new RegExp(process.env.FILTRE).test(y));

const GOZLEMCI = () => {
  window.__cw = { lcp: null, lcpEl: '', cls: 0, clsMax: 0, clsPencere: [], clsBas: 0, clsSon: 0, loaf: [], olay: [] };
  const w = window.__cw;
  const sec = (el) => !el ? '' : (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''));
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { w.lcp = e.startTime; w.lcpEl = sec(e.element) + (e.url ? ' ' + e.url.split('/').pop() : ''); } }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) {
    if (e.hadRecentInput) continue;
    if (w.clsPencere.length && (e.startTime - w.clsSon > 1000 || e.startTime - w.clsBas > 5000)) { w.clsMax = Math.max(w.clsMax, w.cls); w.cls = 0; w.clsPencere = []; }
    if (!w.clsPencere.length) w.clsBas = e.startTime;
    w.clsSon = e.startTime; w.cls += e.value; w.clsPencere.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), el: sec(e.sources && e.sources[0] && e.sources[0].node) });
  } w.clsMax = Math.max(w.clsMax, w.cls); }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) {
    w.loaf.push({ t: Math.round(e.startTime), sure: Math.round(e.duration), engel: Math.round(e.blockingDuration || 0),
      /* karenin ic dagilimi: betik (renderStart'a kadar) · stil+duzen · boyama/kompozit */
      betik: Math.round((e.renderStart || e.startTime) - e.startTime), stilDuzen: e.styleAndLayoutStart ? Math.round(e.startTime + e.duration - e.styleAndLayoutStart) : null, render: Math.round(e.startTime + e.duration - (e.renderStart || e.startTime)),
      kaynak: (e.scripts || []).slice(0, 3).map((s) => ({ src: (s.sourceURL || '').split('/').slice(-1)[0], fn: s.sourceFunctionName || '', cagiran: s.invoker || s.invokerType || '', sure: Math.round(s.duration) })) });
  } }).observe({ type: 'long-animation-frame', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (e.interactionId) w.olay.push({ ad: e.name, sure: Math.round(e.duration), hedef: sec(e.target) }); } }).observe({ type: 'event', durationThreshold: 16, buffered: true }); } catch (e) {}
};

async function olc(browser, yol, boz) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(GOZLEMCI);
  if (boz) await page.evaluateOnNewDocument(() => {
    /* KIRMIZI KONTROL: yuklemeden 2 s sonra 120 ms zorla uzun gorev + 300 px
       duzen kaymasi (perde suprulmus, sayfa boyanmis — ilk denemede load
       aninda eklenen kayma perde altinda kaldi ve API onu saymadi) */
    try { sessionStorage.setItem('qanat-splash-seen', '1'); } catch (e) {}
    addEventListener('load', () => setTimeout(() => { const t = performance.now(); while (performance.now() - t < 120) {} const d = document.createElement('div'); d.style.height = '300px'; document.querySelector('main').prepend(d); }, 2000));
  });
  const cdp = await page.target().createCDPSession();
  const t0 = Date.now();
  await page.goto(SUNUCU + yol, { waitUntil: 'load', timeout: 60000 });
  await bekle(boz ? 3200 : 1800);
  /* ETKILESIMLER: gercek girdi (CDP Input) — bos alana tiklama, Tab, Escape, tekerlek */
  await page.evaluate(() => { document.addEventListener('click', (e) => { const a = e.target.closest('a'); if (a) e.preventDefault(); }, true); });
  const tikla = async (x, y) => { await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); await bekle(250); };
  await tikla(1380, 620); await tikla(720, 450);
  const dugme = await page.evaluate(() => { const b = document.querySelector('main button, main summary, main label, main a.dugme'); if (!b) return null; const r = b.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; });
  if (dugme && dugme.y > 0 && dugme.y < 900) await tikla(dugme.x, dugme.y);
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); await bekle(200);
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await bekle(200);
  /* kaydirma turu (LoAF kaydirmada) */
  const toplamPx = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
  let y = 0;
  while (y < toplamPx - 4) {
    await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, yDistance: -Math.min(900, toplamPx - y), speed: 1400, gestureSourceType: 'mouse' });
    const ny = await page.evaluate(() => scrollY); if (ny <= y) break; y = ny;
    if (Date.now() - t0 > 60000) break;
  }
  await bekle(600);
  const r = await page.evaluate(() => {
    const w = window.__cw;
    const olaylar = w.olay.slice().sort((a, b) => b.sure - a.sure);
    return { lcp: w.lcp === null ? null : Math.round(w.lcp), lcpEl: w.lcpEl, cls: +Math.max(w.clsMax, w.cls).toFixed(4), clsKaynak: w.clsPencere.slice(0, 3),
      inp: olaylar.length ? olaylar[0].sure : 0, inpHedef: olaylar.length ? olaylar[0].hedef + ' ' + olaylar[0].ad : '', etkilesim: w.olay.length,
      loaf: w.loaf.length, loafToplam: w.loaf.reduce((a, b) => a + b.sure, 0), loafEnUzun: w.loaf.length ? Math.max(...w.loaf.map((l) => l.sure)) : 0,
      loafKaynak: w.loaf.slice().sort((a, b) => b.sure - a.sure).slice(0, 3) };
  });
  await page.close();
  return r;
}

(async () => {
  const browser = await pt.launch({ executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 600000 });
  const surum = await browser.version();
  console.log(`TARAYICI : ${TARAYICI} · ${surum} · ${secim.length} sayfa`);
  const kr = await olc(browser, secim[0], true);
  const yakalandi = kr.loaf > 0 && kr.loafEnUzun >= 100 && kr.cls >= 0.2;
  console.log(`KIRMIZI KONTROL (${secim[0]} + 120 ms gorev + 300 px kayma): LoAF en uzun ${kr.loafEnUzun} ms · CLS ${kr.cls} → ${yakalandi ? 'YAKALANDI' : 'YAKALANAMADI'}`);
  const sonuc = [];
  for (const yol of secim) {
    const r = await olc(browser, yol, false);
    r.yol = yol;
    r.kapi = { lcp: r.lcp !== null && r.lcp < 2500, cls: r.cls < 0.1, inp: r.inp < 200 };
    r.gecti = Object.values(r.kapi).every(Boolean);
    sonuc.push(r);
    console.log(`${r.gecti ? 'ok   ' : 'KALDI'} ${yol.padEnd(34)} LCP ${String(r.lcp).padStart(5)} ms (${r.lcpEl.slice(0, 22)}) · CLS ${r.cls} · INP ${r.inp} ms (${r.inpHedef.slice(0, 20)}) · LoAF ${r.loaf} adet / ${r.loafToplam} ms, en uzun ${r.loafEnUzun}${r.loafKaynak[0] ? ' [' + (r.loafKaynak[0].kaynak[0] ? r.loafKaynak[0].kaynak[0].src + ':' + r.loafKaynak[0].kaynak[0].fn : 'betiksiz') + ']' : ''}`);
  }
  await browser.close();
  fs.writeFileSync(CIKTI, JSON.stringify({ _: 'yeni/film/olc-chrome.cjs — LCP/CLS/INP/LoAF sayfa sayfa (yerel sunucu, gercek girdi). LCP yerelden: mutlak degil siralama.', olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, kirmizi_kontrol: { yakalandi, ...kr }, sayfa: sonuc }, null, 1));
  const k = sonuc.filter((s) => !s.gecti);
  console.log(`\nESIK DISI: ${k.length} sayfa${k.length ? ' — ' + k.map((s) => s.yol).join(' ') : ''}\n→ ${CIKTI}`);
})().catch((e) => { console.error(e); process.exit(1); });
