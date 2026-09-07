#!/usr/bin/env node
/* PERDE = ESKI OPAKLIK MI? PIKSEL KIYASI (8 Eyl 2026).

   8 Eyl'de destenin sonme mekanizmasi degisti: kartin kendi `opacity`si
   yerine, kartin uzerinde `--bg` renginde bir perde. Iddia: kartin
   ARKASINDA baska kart YOKKEN sonuc BIREBIR ayni piksel —
     opacity .72 : .72*kart + .28*zemin
     perde   .28 : .72*kart + .28*zemin
   Iddia hesapla degil OLCUMLE kapanir.

   DUZENEK — TEK DEGISKEN: ayni derleme, ayni kare, ayni kaydirma. Kart
   animasyonu durdurulur, sonra ayni kart iki kez boyanir:
     A) eski yol : govde opacity .72, perde 0
     B) yeni yol : govde opacity 1,   perde .28
   Kartin kutusu kirpilir, iki PNG piksel piksel karsilastirilir.

   KIRPMA: kartin arkasinda baska kart OLMAMALI — yoksa olcum iki seyi
   birden olcer. Bu yuzden destenin BASI kullanilir (ilk kart tek basina)
   ve kutu, bir sonraki kartin ust kenarinin uzerinde kesilir. Kesisme
   varsa arac HUKUMSUZ yazar.                                          */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const EXE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ADRES = process.env.ADRES || 'http://127.0.0.1:8790/';
const DIZIN = process.env.DIZIN || path.join(__dirname, '_kare-perde');
/* PNG cozumu TARAYICIDA yapilir: bu makinede pngjs/sharp yok ve olcum
   icin yeni bagimlilik kurulmaz. Iki kare base64 olarak AYRI, bos bir
   sekmede cozulup karsilastirilir — olculen sayfaya hic dokunulmaz. */

(async () => {
  fs.mkdirSync(DIZIN, { recursive: true });
  const b = await pt.launch({ executablePath: EXE, headless: false,
    args: ['--no-first-run', '--no-default-browser-check'], defaultViewport: null });
  const page = await b.newPage();
  await page.evaluateOnNewDocument("try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}");
  await page.goto(ADRES, { waitUntil: 'load', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  /* destenin basina git: ilk kart yapissin, ikinci kart HENUZ ustune
     binmesin — kutu ikinci kartin ust kenarinda kesilir. */
  const kutu = await page.evaluate(async () => {
    const d = document.querySelector('.sp-deste');
    if (!d) return null;
    scrollTo(0, d.getBoundingClientRect().top + scrollY + innerHeight * 0.25);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const kartlar = [...document.querySelectorAll('.sp-kart')];
    const g0 = kartlar[0].querySelector('.sp-govde');
    const g1 = kartlar[1].querySelector('.sp-govde');
    /* animasyonlari IPTAL et: elle deger yazacagiz. `currentTime = 0`
       DENENDI ve hata verdi — ilerleme tabanli (scroll-driven) animasyonda
       mutlak zaman yazilamaz; dogru arac `cancel()`. */
    [...document.querySelectorAll('.sp-govde')].forEach((g) => {
      g.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const r0 = g0.getBoundingClientRect(), r1 = g1.getBoundingClientRect();
    const alt = Math.min(r0.bottom, r1.top);          /* ikinci kartin ustunde kes */
    const ust = Math.max(0, r0.top);
    if (alt - ust < 80) return { hukumsuz: `kutu cok kisa: ${Math.round(alt - ust)} px` };
    /* KENDINI DOGRULAMA (kayitli tuzak): kirpma penceresinin ortasindaki
       piksel GERCEKTEN kartin uzerinde mi? `page.screenshot`in `clip`i
       BELGE koordinatlarinda calisir, gorunum koordinatlarinda degil —
       ilk yazimda `top` dogrudan verilmisti ve arac karesini hero'dan
       aliyordu (kirmizi el), sayi da o yuzden anlamsizdi. */
    const mx = r0.left + r0.width / 2, my = (ust + alt) / 2;
    const hedef = document.elementFromPoint(mx, my);
    if (!hedef || !hedef.closest('.sp-govde')) return { hukumsuz: `kutu kartin uzerinde degil: ${hedef ? hedef.className : 'yok'}` };
    return { x: Math.round(r0.left), y: Math.round(ust + scrollY), w: Math.round(r0.width),
      h: Math.round(alt - ust) - 2, gorunum_ust: Math.round(ust), y_kaydirma: Math.round(scrollY),
      kart0_ust: Math.round(r0.top), kart1_ust: Math.round(r1.top) };
  });
  if (!kutu || kutu.hukumsuz) { console.error('!! HUKUMSUZ: ' + (kutu ? kutu.hukumsuz : 'deste yok')); await b.close(); process.exit(2); }
  console.log(`kutu ${kutu.w}x${kutu.h} @belge ${kutu.x},${kutu.y} (gorunum ust ${kutu.gorunum_ust}, kaydirma ${kutu.y_kaydirma}) · kart0 ust ${kutu.kart0_ust} · kart1 ust ${kutu.kart1_ust}`);

  const boya = async (mod, ad0) => {
    await page.evaluate((mod) => {
      const g = document.querySelector('.sp-kart .sp-govde');
      let st = document.getElementById('olc-perde-stil');
      if (!st) { st = document.createElement('style'); st.id = 'olc-perde-stil'; document.head.appendChild(st); }
      st.textContent = mod === 'eski'
        ? '.sp-deste .sp-kart:first-child .sp-govde{opacity:.72!important}.sp-deste .sp-kart:first-child .sp-govde::after{opacity:0!important}'
        : '.sp-deste .sp-kart:first-child .sp-govde{opacity:1!important}.sp-deste .sp-kart:first-child .sp-govde::after{opacity:.28!important}';
      void g.offsetHeight;
    }, mod);
    await new Promise((r) => setTimeout(r, 450));
    const ad = path.join(DIZIN, `${ad0 || mod}.png`);
    await page.screenshot({ path: ad, clip: { x: kutu.x, y: kutu.y, width: kutu.w, height: kutu.h } });
    return ad;
  };
  /* BOS TEST ONCE (kayitli disiplin): ayni mod iki kez boyanir. Aradaki
     fark olcum GURULTUSUDUR — arka plandaki sus katmanlari, kompozitor
     yuvarlamasi, kare zamanlamasi. Gercek farkin anlamli olmasi icin bu
     tabanin uzerine cikmasi gerekir. */
  const bos1 = await boya('eski', 'bos1');
  const bos2 = await boya('eski', 'bos2');
  const a = await boya('eski');
  const c = await boya('yeni');

  const kiyasSayfa = await b.newPage();
  await kiyasSayfa.goto('about:blank');
  const kiyasla = (x, y) => kiyasSayfa.evaluate(async (A64, C64) => {
    const yukle = (b64) => new Promise((res, rej) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'data:image/png;base64,' + b64;
    });
    const [A, C] = await Promise.all([yukle(A64), yukle(C64)]);
    if (A.width !== C.width || A.height !== C.height) return { hukumsuz: `${A.width}x${A.height} != ${C.width}x${C.height}` };
    const cv = new OffscreenCanvas(A.width, A.height), cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(A, 0, 0); const da = cx.getImageData(0, 0, A.width, A.height).data;
    cx.clearRect(0, 0, A.width, A.height); cx.drawImage(C, 0, 0);
    const dc = cx.getImageData(0, 0, A.width, A.height).data;
    let enBuyuk = 0, toplam = 0, sayi = 0, asan = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - dc[i]), Math.abs(da[i + 1] - dc[i + 1]), Math.abs(da[i + 2] - dc[i + 2]));
      if (d > enBuyuk) enBuyuk = d;
      toplam += d; sayi++; if (d > 2) asan++;
    }
    return { enBuyuk, ort: toplam / sayi, asan, sayi, en: A.width, boy: A.height };
  }, fs.readFileSync(x).toString('base64'), fs.readFileSync(y).toString('base64'));

  const bos = await kiyasla(bos1, bos2);
  const kiyas = await kiyasla(a, c);
  await kiyasSayfa.close().catch(() => {});
  for (const [ad, k] of [['bos test', bos], ['eski/yeni', kiyas]]) {
    if (k.hukumsuz) { console.error(`!! ${ad}: KARE OLCULERI FARKLI (${k.hukumsuz}) — HUKUMSUZ`); await b.close(); process.exit(2); }
    console.log(`${ad.padEnd(9)} · en buyuk ${String(k.enBuyuk).padStart(3)}/255 · ortalama ${k.ort.toFixed(3)} · 2'yi asan %${((k.asan / k.sayi) * 100).toFixed(3)}`);
  }
  const enBuyuk = kiyas.enBuyuk;
  console.log(enBuyuk <= Math.max(2, bos.enBuyuk)
    ? `HUKUM: BIREBIR — fark (${enBuyuk}) olcum gurultusunun (${bos.enBuyuk}) uzerine cikmiyor`
    : `HUKUM: FARK VAR — ${enBuyuk}/255, gurultu tabani ${bos.enBuyuk}/255`);
  fs.writeFileSync(path.join(DIZIN, 'kunye.json'), JSON.stringify({
    _: 'olc-perde-esdeger.cjs — kartin arkasinda baska kart YOKKEN eski opaklik ile yeni perdenin piksel esdegerligi. Bos test = ayni mod iki kez.',
    olcum: new Date().toISOString(), kutu,
    bos_test: { en_buyuk: bos.enBuyuk, ortalama: Number(bos.ort.toFixed(4)), asan_yuzde: Number(((bos.asan / bos.sayi) * 100).toFixed(4)) },
    eski_yeni: { en_buyuk: kiyas.enBuyuk, ortalama: Number(kiyas.ort.toFixed(4)), asan_yuzde: Number(((kiyas.asan / kiyas.sayi) * 100).toFixed(4)) },
  }, null, 1));
  console.log(`\n→ ${DIZIN}`);
  await b.close().catch(() => {});
})();
