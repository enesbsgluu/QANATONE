#!/usr/bin/env node
/* ZEMIN TASIMASI — SITE GENELI REGRESYON (9 Eyl 2026).

   Enes: "baska bir bolgeyi bozmadigindan, mimariye zarar vermediginden emin ol".
   Bu arac uc soruyu ayri ayri yanitlar:
     1. MOBILDE gorsel fark ne? (yama vs yamanin geri alinmis hali, yan yana)
     2. MASAUSTU DOKUNULMADI mi? (fark SIFIR olmali — kapsam mobil)
     3. KATMAN kazanci her sayfada gerceklesti mi? (belge boyu Overlap gitti mi)

   Kol, uygulanan yamayi GERI ALIR (taban = bugunku dist'in yamasiz hali):
     #bg{display:block!important} body:has(#bg){background-image:none!important}

   Olcum disiplini olc-bg-koke.cjs ile ayni: clip'siz kare + canvas'ta kirpma,
   sahne dondurulur (nabiz haric), bos test once, her konumda isitma turu.   */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const DIZIN = path.join(__dirname, process.env.DIZIN || '_kare-zemin-reg');
const SAYFALAR = (process.env.SAYFALAR || '/,/hizmetler/,/projeler/,/iletisim/,/film/,/en/').split(',');
const GERI = '#bg{display:block!important}body:has(#bg){background-image:none!important}';

(async () => {
  fs.mkdirSync(DIZIN, { recursive: true });
  const b = await pt.launch({ executablePath: CHROME, headless: 'new', defaultViewport: null,
    protocolTimeout: 180000, args: ['--no-sandbox'] });
  const kiyasSayfa = await b.newPage();
  await kiyasSayfa.goto('about:blank');
  const kirp = async (b64, w, h, dpr) => kiyasSayfa.evaluate(async (b64, w, h, dpr) => {
    const im = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
    const cv = new OffscreenCanvas(w * dpr, h * dpr), c = cv.getContext('2d');
    c.drawImage(im, 0, 0, w * dpr, h * dpr, 0, 0, w * dpr, h * dpr);
    const bl = await cv.convertToBlob({ type: 'image/png' });
    const u = new Uint8Array(await bl.arrayBuffer()); let s = '';
    for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    return btoa(s);
  }, b64, w, h, dpr);
  const kiyasla = async (A, C) => kiyasSayfa.evaluate(async (A64, C64) => {
    const yukle = (x) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + x; });
    const [a, c] = await Promise.all([yukle(A64), yukle(C64)]);
    if (a.width !== c.width || a.height !== c.height) return { hukumsuz: 'olcu farkli' };
    const cv = new OffscreenCanvas(a.width, a.height), cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(a, 0, 0); const da = cx.getImageData(0, 0, a.width, a.height).data;
    cx.clearRect(0, 0, a.width, a.height);
    cx.drawImage(c, 0, 0); const dc = cx.getImageData(0, 0, a.width, a.height).data;
    const N = 12; let enBuyuk = 0, toplam = 0, sayi = 0, farkli = 0;
    for (let i = 0; i < da.length; i += 4) {
      const px = (i / 4) % a.width, py = Math.floor((i / 4) / a.width);
      if (px < N && py < N) continue;
      const d = Math.max(Math.abs(da[i] - dc[i]), Math.abs(da[i + 1] - dc[i + 1]), Math.abs(da[i + 2] - dc[i + 2]));
      if (d > enBuyuk) enBuyuk = d;
      if (d > 2) farkli++;
      toplam += d; sayi++;
    }
    return { enBuyuk, ortalama: +(toplam / sayi).toFixed(2), farkliYuzde: +(100 * farkli / sayi).toFixed(2) };
  }, fs.readFileSync(A).toString('base64'), fs.readFileSync(C).toString('base64'));

  const olc = async (yol, en, boy, mobil) => {
    const s = await b.newPage();
    const cdp = await s.target().createCDPSession();
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: en, height: boy, deviceScaleFactor: 2, mobile: mobil });
    await s.goto(SUNUCU + yol + '?tani=1&sessiz=1', { waitUntil: 'networkidle2', timeout: 60000 });
    await s.waitForFunction(() => {
      const p = document.querySelector('#perde, .sus-perde');
      return !(p && getComputedStyle(p).display !== 'none' && +getComputedStyle(p).opacity > 0.02);
    }, { timeout: 25000 }).catch(() => {});
    let onceki = -1, kararli = 0;
    for (let i = 0; i < 30 && kararli < 3; i++) {
      await new Promise((r) => setTimeout(r, 350));
      const n = await s.evaluate(() => document.getAnimations().length);
      kararli = (n === onceki) ? kararli + 1 : 0; onceki = n;
    }
    await s.evaluate(() => {
      const d = document.createElement('div'); d.id = 'olc-nabiz'; d.style.cssText =
        'position:fixed;left:0;top:0;width:2px;height:2px;z-index:2147483647;background:#0f0;animation:ub 240ms linear infinite';
      const st = document.createElement('style'); st.textContent = '@keyframes ub{from{opacity:.2}to{opacity:1}}';
      document.head.appendChild(st); document.body.appendChild(d);
    });
    const boya = async (mod, ad) => {
      await s.evaluate((mod, GERI) => {
        let st = document.getElementById('olc-reg-stil');
        if (!st) { st = document.createElement('style'); st.id = 'olc-reg-stil'; document.head.appendChild(st); }
        /* ORTAK: `#tubes` IKI KOLDA DA kapali. Masaustunde hero'nun WebGL
           tuvali rAF ile ciziliyor; `getAnimations()` onu duraklatamaz ve
           bos test 76/255'e cikiyordu (yama masaustunde HIC etkin degil,
           kural @media mobil). Gurultuyu kaynaginda kesmek icin. */
        st.textContent = '#tubes{display:none!important}' + (mod === 'geri' ? GERI : '');
      }, mod, GERI);
      await new Promise((r) => setTimeout(r, 550));
      await s.evaluate(() => {
        const nb = document.getElementById('olc-nabiz');
        for (const a of document.getAnimations()) { if (a.effect && a.effect.target === nb) continue; try { a.pause(); } catch (e) {} }
      });
      await new Promise((r) => setTimeout(r, 220));
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const dosya = path.join(DIZIN, ad + '.png');
      fs.writeFileSync(dosya, Buffer.from(await kirp(data, en, boy, 2), 'base64'));
      return dosya;
    };
    const etiket = yol.replace(/\//g, '_') + (mobil ? '-mob' : '-mas');
    await boya('geri', 'isitma' + etiket);                    /* isitma */
    const b1 = await boya('geri', 'bos1' + etiket);
    const b2 = await boya('geri', 'bos2' + etiket);
    const bos = await kiyasla(b1, b2);
    const A = await boya('geri', 'taban' + etiket);
    const C = await boya('yama', 'yama' + etiket);
    const k = await kiyasla(A, C);
    /* #bg gercekten gizlendi mi + zemin nereden geliyor */
    const durum = await s.evaluate(() => {
      const bg = document.querySelector('#bg');
      return { bgVar: !!bg, bgGizli: bg ? getComputedStyle(bg).display === 'none' : null,
        bodyImg: getComputedStyle(document.body).backgroundImage !== 'none' };
    });
    await s.close();
    return { bos, ...k, ...durum };
  };

  const b2 = (x, n) => String(x).padEnd(n);
  console.log(b2('sayfa', 14) + b2('genislik', 10) + b2('bos', 7) + b2('fark', 8)
    + b2('ort', 7) + b2('%farkli', 9) + b2('#bg', 12) + 'body img');
  const sonuc = [];
  for (const yol of SAYFALAR) {
    for (const [en, boy, mobil, ad] of [[428, 781, true, 'mobil'], [1440, 900, false, 'masaustu']]) {
      const r = await olc(yol, en, boy, mobil);
      sonuc.push({ yol, genislik: ad, ...r });
      console.log(b2(yol, 14) + b2(ad, 10) + b2(r.bos.enBuyuk, 7) + b2(r.enBuyuk, 8)
        + b2(r.ortalama, 7) + b2(r.farkliYuzde, 9)
        + b2(r.bgVar ? (r.bgGizli ? 'gizli' : 'gorunur') : 'YOK', 12) + (r.bodyImg ? 'var' : 'yok'));
    }
  }
  fs.writeFileSync(path.join(DIZIN, 'sonuc.json'), JSON.stringify({
    _: 'olc-zemin-regresyon.cjs — kare uretir, hukum vermez.',
    olcum: new Date().toISOString(), geri_kol: GERI, sonuc }, null, 1));
  console.log(`\n-> ${DIZIN}`);
  await b.close();
})().catch((e) => { console.error('HATA', e.message); process.exit(1); });
