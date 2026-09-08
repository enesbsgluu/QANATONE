#!/usr/bin/env node
/* HALKA KATMANI — GORSEL ESDEGERLIK (9 Eyl 2026).

   NEDEN: `.sus-halka::before` ebeveyninin genisliginin %260'i kadar bir KARE
   (temel.css:233, `width:260%; aspect-ratio:1`). Hero'da ebeveyn 388x54'luk
   bir kapsul, dolayisiyla sozde oge 1009x1009 oluyor ve SUREKLI DONDUGU icin
   1,02 MP'lik kalici bir kompozit katman tutuyor — hero'daki en buyuk
   animasyonlu yuzey. Donen konik gradyanin ebeveyni kaplamasi icin gereken
   cap ebeveynin KOSEGENI kadardir: sqrt(388^2+54^2) ~ 392 px, yani ~%101.
   %260 bunun iki bucuk kati.

   BU ARAC HUKUM VERMEZ, KARE URETIR. Sadakat kurali: yan yana kare + fark
   listesi, goz karari Enes'in.

   DISIPLIN (kayitli tuzaklardan):
     · BOS TEST ONCE — ayni mod iki kez boyanir; aradaki fark olcum
       gurultusudur, gercek fark bunun uzerine cikmali
     · `clip` BELGE koordinatlarinda; getBoundingClientRect gorunum
       koordinatlarinda verir -> scrollY eklenir
     · kirpma kutusu KENDINI DOGRULAR (elementFromPoint gercekten halkanin
       ustunde mi)
     · halka DONUYOR: kare almadan once animasyon duraklatilir ve currentTime
       sabit bir faza kilitlenir; dort fazda (0 / 0,25 / 0,5 / 0,75 tur)
       ayri ayri kiyaslanir — tek faz yaniltir
     · PNG cozumu tarayicida yapilir (bu makinede sharp/pngjs yok)          */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ADRES = process.env.ADRES || 'http://127.0.0.1:8790/?tani=1&sessiz=1';
const DIZIN = path.join(__dirname, process.env.DIZIN || '_kare-halka');
const YENI_EN = process.env.YENI_EN || '145%';       /* onerilen deger */
const FAZLAR = [0, 0.25, 0.5, 0.75];                 /* tur cinsinden */
const SURE = 3600;                                   /* --halka-spd 3.6s */

(async () => {
  fs.mkdirSync(DIZIN, { recursive: true });
  /* protocolTimeout: sahne tamamen dondurulunca (tum animasyonlar duraklatilir)
     sayfa yeni kare uretmiyor ve captureScreenshot varsayilan 30 sn'de
     zaman asimina ugruyor — olculdu, ikinci fazda takildi. */
  const b = await pt.launch({ executablePath: CHROME, headless: 'new', defaultViewport: null,
    protocolTimeout: 180000,
    args: ['--window-size=428,900', '--no-sandbox', '--force-device-scale-factor=2'] });
  const page = await b.newPage();
  const cdp = await page.target().createCDPSession();
  await cdp.send('Emulation.setDeviceMetricsOverride',
    { width: 428, height: 900, deviceScaleFactor: 2, mobile: true });
  await page.goto(ADRES, { waitUntil: 'networkidle2', timeout: 60000 });
  /* SAHNE OTURSUN: 2,2 sn yetmiyordu — bos test bir kosumda 0/255, otekinde
     249/255 verdi (olculdu). Sebep sayfanin hala kuruluyor olmasi: perde
     kapanmamis ve IntersectionObserver yeni animasyonlar doguruyor, her
     `boya()` onlari FARKLI fazlarda duraklatiyordu. Once perdenin cekilmesi
     ve animasyon sayisinin sabitlenmesi beklenir. */
  await page.waitForFunction(() => {
    const p = document.querySelector('#perde, .sus-perde');
    if (p && getComputedStyle(p).display !== 'none' && +getComputedStyle(p).opacity > 0.02) return false;
    return true;
  }, { timeout: 30000 }).catch(() => console.log('  (perde kapanisi beklenemedi — surdurulyor)'));
  let onceki = -1, kararli = 0;
  for (let i = 0; i < 40 && kararli < 3; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const n = await page.evaluate(() => document.getAnimations().length);
    kararli = (n === onceki) ? kararli + 1 : 0; onceki = n;
  }
  console.log(`sahne oturdu · animasyon sayisi ${onceki}`);

  /* KOMPOZITORU UYANIK TUT: hero'daki animasyonlar oturunca sayfa yeni kare
     uretmeyi birakiyor ve `Page.captureScreenshot` (fromSurface:true) o kareyi
     bekleyip zaman asimina ugruyor — uc kosumda olculdu. Kutunun DISINDA
     (sol ust, 2x2 px; kutu y=537) surekli boyanan bir isaret bunu onler. */
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.id = 'olc-nabiz';
    d.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;z-index:2147483647;'
      + 'background:#0f0;animation:olc-nabiz 240ms linear infinite';
    const st = document.createElement('style');
    st.textContent = '@keyframes olc-nabiz{from{opacity:.2}to{opacity:1}}';
    document.head.appendChild(st); document.body.appendChild(d);
  });

  /* kirpma kutusu — halkanin ebeveyni + glow payi, kendini dogrular */
  const kutu = await page.evaluate(() => {
    const h = document.querySelector('.sh-void .sus-halka') || document.querySelector('.sus-halka');
    if (!h) return { hukumsuz: 'sayfada .sus-halka yok' };
    const p = h.parentElement, r = p.getBoundingClientRect();
    if (r.width < 40 || r.height < 20) return { hukumsuz: `ebeveyn cok kucuk: ${Math.round(r.width)}x${Math.round(r.height)}` };
    const pay = 22;                                   /* drop-shadow 7px + tasma payi */
    const mx = r.left + r.width / 2, my = r.top + r.height / 2;
    const hedef = document.elementFromPoint(mx, my);
    if (!hedef || !hedef.closest('.sh-void, .sus-halka, a')) {
      return { hukumsuz: `kutu halkanin ustunde degil: ${hedef ? hedef.tagName + '.' + hedef.className : 'yok'}` };
    }
    const sb = getComputedStyle(h, '::before');
    /* kutu sayfanin disina TASMAZ: negatif clip kareyi kaydirir ve fark
       olcumu gurultuye bogulur (ilk kosumda x=-2 cikti, bos test 110/255) */
    const x0 = Math.max(0, Math.round(r.left - pay)), y0 = Math.max(0, Math.round(r.top + scrollY - pay));
    return {
      x: x0, y: y0,
      w: Math.min(Math.round(r.width + pay * 2), innerWidth - x0),
      h: Math.round(r.height + pay * 2),
      ebeveyn: Math.round(r.width) + 'x' + Math.round(r.height),
      once_before: Math.round(parseFloat(sb.width)) + 'x' + Math.round(parseFloat(sb.height)),
      kosegen: Math.round(Math.hypot(r.width, r.height)),
    };
  });
  if (kutu.hukumsuz) { console.error('!! HUKUMSUZ: ' + kutu.hukumsuz); await b.close(); process.exit(2); }
  console.log(`ebeveyn ${kutu.ebeveyn} · kosegen ${kutu.kosegen} px · ::before SIMDI ${kutu.once_before}`);
  console.log(`kutu ${kutu.w}x${kutu.h} @belge ${kutu.x},${kutu.y}\n`);

  /* kiyas/kirpma sayfasi ONCE kurulur: kareler clip'siz alinip BURADA
     kirpilir. `Page.captureScreenshot`in `clip` parametresi bu sayfada
     kararsiz cikti (ayni duzenek bir kosumda calisti, otekinde zaman
     asimina ugradi, ucuncude bos kare verdi). Clip'siz tam kare standart
     yol; kirpma canvas'ta kesin ve tekrarlanabilir. */
  const kiyasSayfa0 = await b.newPage();
  await kiyasSayfa0.goto('about:blank');
  const kirp = async (tamB64, k, dpr) => kiyasSayfa0.evaluate(async (b64, k, dpr) => {
    const im = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
    const cv = new OffscreenCanvas(k.w * dpr, k.h * dpr), c = cv.getContext('2d');
    c.drawImage(im, k.x * dpr, k.y * dpr, k.w * dpr, k.h * dpr, 0, 0, k.w * dpr, k.h * dpr);
    const bl = await cv.convertToBlob({ type: 'image/png' });
    const u = new Uint8Array(await bl.arrayBuffer()); let s = '';
    for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    return btoa(s);
  }, tamB64, k, dpr);

  const boya = async (mod, faz, ad) => {
    await page.evaluate((mod, YENI_EN) => {
      let st = document.getElementById('olc-halka-stil');
      if (!st) { st = document.createElement('style'); st.id = 'olc-halka-stil'; document.head.appendChild(st); }
      st.textContent = mod === 'yeni' ? `.sus-halka::before{width:${YENI_EN}!important}` : '';
    }, mod, YENI_EN);
    /* YALNIZ HALKA duraklatilir, sahnenin geri kalani CANLI kalir.
       Butun animasyonlari duraklatinca sayfa yeni kare uretmiyor ve
       `Page.captureScreenshot` (fromSurface:true) zaman asimina ugruyor —
       iki kosumda olculdu. Kutu (428x98) halkanin cevresi; icine giren baska
       animasyonlu oge yok (`.sh-ic` y=190, `p.sh-meta` y=460, kutu y=537),
       kalan gurultuyu BOS TEST olcer. */
    const kilit = await page.evaluate((t) => {
      let halka = 0;
      for (const a of document.getAnimations()) {
        if (a.animationName === 'sus-halka-don') { try { a.pause(); a.currentTime = t; halka++; } catch (e) {} }
      }
      return { halka };
    }, faz * SURE);
    if (!kilit.halka) throw new Error('halka animasyonu bulunamadi — kosum hukumsuz');
    await new Promise((r) => setTimeout(r, 260));
    const y = path.join(DIZIN, ad + '.png');
    /* `fromSurface:false` BOS KARE URETIYOR — olculdu: dort fazda da 0/255
       fark cikti cunku iki kare de bostu (acik renkli yuzey, oysa site koyu
       temali). Gercek yuzey sart: `fromSurface:true`.
       Donuk sayfada capture takilmasin diye kare oncesi sayfa UYANDIRILIR. */
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const kirpilmis = await kirp(data, kutu, 2);
    fs.writeFileSync(y, Buffer.from(kirpilmis, 'base64'));
    return y;
  };

  const kiyasSayfa = await b.newPage();
  await kiyasSayfa.goto('about:blank');
  const kiyasla = async (A, C) => kiyasSayfa.evaluate(async (A64, C64) => {
    const yukle = (b64) => new Promise((res, rej) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'data:image/png;base64,' + b64;
    });
    const [a, c] = await Promise.all([yukle(A64), yukle(C64)]);
    if (a.width !== c.width || a.height !== c.height) return { hukumsuz: `${a.width}x${a.height} != ${c.width}x${c.height}` };
    const cv = new OffscreenCanvas(a.width, a.height), cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(a, 0, 0); const da = cx.getImageData(0, 0, a.width, a.height).data;
    cx.clearRect(0, 0, a.width, a.height);
    cx.drawImage(c, 0, 0); const dc = cx.getImageData(0, 0, a.width, a.height).data;
    let enBuyuk = 0, toplam = 0, sayi = 0, farkli = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - dc[i]), Math.abs(da[i + 1] - dc[i + 1]), Math.abs(da[i + 2] - dc[i + 2]));
      if (d > enBuyuk) enBuyuk = d;
      if (d > 2) farkli++;
      toplam += d; sayi++;
    }
    return { enBuyuk, ortalama: +(toplam / sayi).toFixed(2), farkliYuzde: +(100 * farkli / sayi).toFixed(2) };
  }, fs.readFileSync(A).toString('base64'), fs.readFileSync(C).toString('base64'));

  /* KARE KENDINI DOGRULAR: kare GERCEKTEN halkayi iceriyor mu? `fromSurface`
     yanlis verildiginde iki kare de BOS geldi ve fark 0/255 cikti — sayi
     dogruydu, olculen sey yanlisti. Halka kizil (rgb ~239,35,60); karede
     kizilimsi piksel yoksa kosum HUKUMSUZDUR. */
  const kareDogrula = async (dosya) => kiyasSayfa.evaluate(async (b64) => {
    const im = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
    const cv = new OffscreenCanvas(im.width, im.height), c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(im, 0, 0);
    const d = c.getImageData(0, 0, im.width, im.height).data;
    let kizil = 0, koyu = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > d[i + 1] + 40 && d[i] > d[i + 2] + 20) kizil++;
      if (d[i] + d[i + 1] + d[i + 2] < 220) koyu++;
      n++;
    }
    return { kizilYuzde: +(100 * kizil / n).toFixed(2), koyuYuzde: +(100 * koyu / n).toFixed(2) };
  }, fs.readFileSync(dosya).toString('base64'));

  /* BOS TEST: ayni mod iki kez — olcum gurultusu tabani */
  const b1 = await boya('eski', 0, 'bos1');
  const b2 = await boya('eski', 0, 'bos2');
  const bos = await kiyasla(b1, b2);
  console.log(`BOS TEST (ayni mod iki kez): en buyuk ${bos.enBuyuk}/255 · ortalama ${bos.ortalama} · farkli %${bos.farkliYuzde}`);

  const d = await kareDogrula(b1);
  console.log(`KARE DOGRULAMASI: kizil %${d.kizilYuzde} · koyu %${d.koyuYuzde}`);
  if (d.kizilYuzde < 0.2) {
    console.error(`!! HUKUMSUZ: karede halka yok (kizil %${d.kizilYuzde}) — bos yuzey yakalanmis, sayi anlamsiz`);
    await b.close(); process.exit(2);
  }
  console.log('');

  const satir = [];
  for (const f of FAZLAR) {
    const A = await boya('eski', f, `faz${f}-eski`);
    const C = await boya('yeni', f, `faz${f}-yeni`);
    const k = await kiyasla(A, C);
    satir.push({ faz: f, ...k });
    console.log(`faz ${String(f).padEnd(5)} tur · en buyuk ${String(k.enBuyuk).padStart(3)}/255 · ortalama ${String(k.ortalama).padStart(5)} · farkli %${k.farkliYuzde}`);
  }

  /* yeni olcu + katman kazanci */
  await page.evaluate((YENI_EN) => {
    document.getElementById('olc-halka-stil').textContent = `.sus-halka::before{width:${YENI_EN}!important}`;
  }, YENI_EN);
  await new Promise((r) => setTimeout(r, 200));
  const sonra = await page.evaluate(() => {
    const h = document.querySelector('.sh-void .sus-halka') || document.querySelector('.sus-halka');
    const s = getComputedStyle(h, '::before');
    return Math.round(parseFloat(s.width)) + 'x' + Math.round(parseFloat(s.height));
  });
  const mp = (o) => { const [x, y] = o.split('x').map(Number); return (x * y) / 1e6; };
  console.log(`\n::before  ${kutu.once_before} (${mp(kutu.once_before).toFixed(2)} MP)  ->  ${sonra} (${mp(sonra).toFixed(2)} MP)`);
  console.log(`kazanc: ${(100 * (1 - mp(sonra) / mp(kutu.once_before))).toFixed(0)}% alan`);
  const enBuyukFark = Math.max(...satir.map((s) => s.enBuyuk));
  console.log(`\nHUKUM: ${enBuyukFark <= bos.enBuyuk ? 'BIREBIR — fark olcum gurultusunun uzerine cikmiyor'
    : `FARK VAR — en buyuk ${enBuyukFark}/255 (gurultu ${bos.enBuyuk}) · KARELERE BAKILACAK`}`);
  fs.writeFileSync(path.join(DIZIN, 'sonuc.json'), JSON.stringify({
    _: 'olc-halka-esdeger.cjs — kare uretir, hukum vermez. Goz karari Enes\'in.',
    olcum: new Date().toISOString(), ebeveyn: kutu.ebeveyn, kosegen: kutu.kosegen,
    once: kutu.once_before, sonra, yeni_en: YENI_EN, bos, fazlar: satir }, null, 1));
  console.log(`\n-> ${DIZIN}`);
  await b.close();
})().catch((e) => { console.error('HATA', e.message); process.exit(1); });
