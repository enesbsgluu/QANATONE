#!/usr/bin/env node
/* #bg -> KOK ZEMIN: gorsel esdegerlik + katman kazanci (9 Eyl 2026).

   NEDEN: `#bg` (position:fixed, z-index:-1) durdugu surece ustundeki
   KONUMLANDIRILMIS ne varsa belge boyu bir Overlap katmani devraliyor
   (516x14242 = 7,35 MP). Zincir olculdu: `body{isolation:isolate}` kirmiyor,
   sensor kaldirilinca `main#icerik` devraliyor. Tek etkili kol `#bg`in
   kendisi: -7,98 MP, sayfanin %35'i.

   TASIMA: `.fade` + `.orb` + `.grid` html'in `background-image`ina gecer,
   `#bg` silinir. Kok zeminin boyamasi ayri katman DOGURMAZ.
   BEDELI (bilinerek secildi, Enes 9 Eyl): `.orb`un blur(130px)'i radial
   gradient ile YAKLASIK, `.grid`in radial maskesi tasinamiyor (background
   katmanlari carpilamaz).

   Bu arac HUKUM VERMEZ, kare uretir + katman sayar.
   Olcum tuzaklari icin bkz. olc-halka-esdeger.cjs (ayni disiplin):
   clip'siz kare + canvas'ta kirpma, bos test once, karenin kendini
   dogrulamasi, sahne oturmadan kare alinmamasi.                          */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ADRES = process.env.ADRES || 'http://127.0.0.1:8790/?tani=1&sessiz=1';
const DIZIN = path.join(__dirname, process.env.DIZIN || '_kare-bg-koke');
const EN = Number(process.env.EN || 428), BOY = Number(process.env.BOY || 900);
const KONUMLAR = (process.env.KONUMLAR || '0,1400,3200').split(',').map(Number);

/* KOK ZEMIN — #bg'nin uc sozde katmani, ayni sirayla (ustten alta):
   grid noktalari · grid ince desen · grid dikey kizil · orb · fade.

   ORB GEOMETRISI: kaynak dolu bir daire, cap min(900px,120vw) (mobilde
   428x1,2 = 514, yani R=257), uzerine blur(130px). CSS blur(r)'de sigma=r/2,
   yani sigma=65. Blurlanmis dolu dairenin profili: merkezde tam deger,
   YARICAPTA YARI deger, R+2*sigma'da ~0. Gradient yaricapi bu yuzden
   R+2sigma = R+130 olmali ve YARI DEGER durgusu R/(R+130) = %66'ya
   dusmeli. Ilk denemede yaricap R+260 verilip yari deger %63'e konmustu —
   ikisi de yanlisti, orb sonuk cikti (fark 35/255, %47 piksel).            */
const ORB = process.env.ORB || 'd';
const ORBLAR = {
  /* a: ilk deneme (yaricap R+260, yari deger %63) — kayitta dursun */
  a: `radial-gradient(circle calc(min(450px,60vw) + 260px) at 50% 44%,
      rgba(239,35,60,.055) 0%,rgba(239,35,60,.0525) 46%,rgba(239,35,60,.0275) 63%,
      rgba(239,35,60,.008) 80%,rgba(239,35,60,0) 100%)`,
  /* d: duzeltilmis — yaricap R+130, yari deger %66, Gauss kuyrugu */
  d: `radial-gradient(circle calc(min(450px,60vw) + 130px) at 50% 44%,
      rgba(239,35,60,.055) 0%,rgba(239,35,60,.0535) 40%,rgba(239,35,60,.0275) 66%,
      rgba(239,35,60,.0075) 84%,rgba(239,35,60,0) 100%)`,
  /* e: d'nin daha yumusak kuyruklusu */
  e: `radial-gradient(circle calc(min(450px,60vw) + 160px) at 50% 44%,
      rgba(239,35,60,.055) 0%,rgba(239,35,60,.052) 38%,rgba(239,35,60,.0275) 62%,
      rgba(239,35,60,.010) 80%,rgba(239,35,60,0) 100%)`,
  /* k: KAYNAKTAN BIREBIR. Mobilde orb'un blur'u 4 Eyl'de zaten kaldirilmis ve
     yerine radial-gradient yazilmis (kabuk.css:94). Yani a/d/e adaylarinin
     hepsi YANLIS TEMELE oturuyordu: blurlu diski taklit etmeye calisiyorlardi,
     oysa mobilde blur YOK. Kaynak: `circle closest-side` — kare elemanda
     yaricap yarim kenar = min(450px,60vw). Duraklar aynen.
     [[qanatone-animasyon-referans-kunyeden]]: yaklasikla kurulmaz, eski
     koddan okunur. */
  k: `radial-gradient(circle min(450px,60vw) at 50% 44%,
      rgba(239,35,60,.13) 0%,rgba(239,35,60,.075) 42%,rgba(239,35,60,0) 86%)`,
};
/* GRID MASKESI tasinamiyor (background katmanlari carpilamaz). Kaynakta
   maske merkezde tam, %76'da sifir; ortalama gecirgenlik ~%45. `m` kolu
   noktalarin opakligini o oranda dusurur — merkez zayiflar, kenar guclenir. */
const GRID = process.env.GRID === 'm'
  ? `radial-gradient(circle at 1px 1px,rgba(255,255,255,.023) 1px,transparent 1.6px),
    radial-gradient(circle at 1px 1px,rgba(255,120,140,.027) 1.4px,transparent 2.2px)`
  : `radial-gradient(circle at 1px 1px,rgba(255,255,255,.05) 1px,transparent 1.6px),
    radial-gradient(circle at 1px 1px,rgba(255,120,140,.06) 1.4px,transparent 2.2px)`;

/* HEDEF `body`, `html` DEGIL: body'nin kendi zemini opak rgb(5,5,5) (olculdu)
   ve html'in arka planini TAMAMEN ORTUYOR. Ilk yazimda kok zemin html'e
   verilmisti — hic gorunmedi, bu yuzden ORB ve GRID kollari sonucu
   degistirmiyordu (y=1400/3200 farki uc kolda da ondalik basamagina kadar
   ayniydi). Degisken degistigi halde sonuc degismiyorsa olculen sey degisken
   degildir; burada olculen tek sey `#bg`in kaldirilmasiydi.               */
/* MOD=sticky: `#bg` GERI ACILIR ve `position:fixed` yerine `position:sticky`
   olur. Kok zemin yolunun iOS'ta duseceginin belirtisi Enes'ten geldi
   ("baslangiclarda var, altlara kayinca yok"): iOS Safari
   `background-attachment:fixed` uygulamiyor, gradyan belge boyuna yayiliyor.
   Chrome'daki olcum bunu goremezdi.
   Sticky, fixed'in Overlap kompozitini DOGURMUYOR (olculdu: 23,11 -> 16,03 MP,
   belge boyu ikinci katman yok) ve `.fade`/`.orb`/`.grid` GERCEK ELEMENT
   olarak kaldigi icin gorsel TAKLIT GEREKTIRMEZ.                          */
const STICKY = `
body:has(#bg){background-image:none!important}
#bg{display:block!important;position:sticky!important;top:0!important;
  inset:auto!important;height:100vh!important;margin-bottom:-100vh!important;
  z-index:-1!important}
/* ORB 120vw -> 100vw: sticky AKISTA oldugu icin icindeki tasma belgeyi
   genisletiyor (scrollWidth 428 -> 471, nav da 471'e cikiyordu; fixed'de
   tasma etkisizdi). overflow:hidden tasmayi keser AMA scroll container
   yaratip Overlap katmanini GERI GETIRIYOR (22,98 MP, olculdu); clip-path
   ise boyamayi kirpar, scrollWidth'i 471'de birakir. Tek calisan yol tasmayi
   KAYNAGINDA kesmek. Isima daralmasin diye eleman kuculurken GRADYAN
   YARICAPI korunuyor: closest-side yerine sabit min(450px,60vw). Gradyan
   %86'da zaten sifirlaniyor (257x0,86 = 221 px), elemanin yarisi 214 px —
   kirpilan bant 214-221 arasi, degeri neredeyse sifir. */
#bg .orb{width:min(900px,100vw)!important;height:min(900px,100vw)!important;
  background:radial-gradient(circle min(450px,60vw) at 50% 50%,
    rgba(239,35,60,.13) 0%,rgba(239,35,60,.075) 42%,rgba(239,35,60,0) 86%)!important}`;

const KOK = `
body{
  background-color:#050505;
  background-image:
    ${GRID},
    linear-gradient(180deg,rgba(239,35,60,.05),transparent 34%),
    ${ORBLAR[ORB]},
    linear-gradient(180deg,#170406 0%,#050505 46%);
  background-size:28px 28px,140px 140px,100% 100%,100% 100%,100% 100%;
  background-position:0 0,0 0,0 0,0 0,0 0;
  background-repeat:repeat,repeat,no-repeat,no-repeat,no-repeat;
  background-attachment:fixed,fixed,fixed,fixed,fixed;
}
#bg{display:none!important}`;

(async () => {
  fs.mkdirSync(DIZIN, { recursive: true });
  const b = await pt.launch({ executablePath: CHROME, headless: 'new', defaultViewport: null,
    protocolTimeout: 180000, args: [`--window-size=${EN},${BOY}`, '--no-sandbox'] });
  const page = await b.newPage();
  const cdp = await page.target().createCDPSession();
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: EN, height: BOY, deviceScaleFactor: 2, mobile: true });
  await page.goto(ADRES, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => {
    const p = document.querySelector('#perde, .sus-perde');
    return !(p && getComputedStyle(p).display !== 'none' && +getComputedStyle(p).opacity > 0.02);
  }, { timeout: 30000 }).catch(() => console.log('  (perde beklenemedi)'));
  let onceki = -1, kararli = 0;
  for (let i = 0; i < 40 && kararli < 3; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const n = await page.evaluate(() => document.getAnimations().length);
    kararli = (n === onceki) ? kararli + 1 : 0; onceki = n;
  }
  /* kompozitoru uyanik tut — donuk sayfada capture bekliyor.
     NABIZ SOL UST KOSEDE ve kiyasta o bolge YOK SAYILIR (asagida NABIZ_PX):
     kendisi animasyonlu oldugu icin fark uretirdi. */
  await page.evaluate(() => {
    const d = document.createElement('div'); d.id = 'olc-nabiz'; d.style.cssText =
      'position:fixed;left:0;top:0;width:2px;height:2px;z-index:2147483647;background:#0f0;animation:ub 240ms linear infinite';
    const st = document.createElement('style'); st.textContent = '@keyframes ub{from{opacity:.2}to{opacity:1}}';
    document.head.appendChild(st); document.body.appendChild(d);
  });
  console.log(`sahne oturdu · animasyon ${onceki}`);

  const kiyasSayfa = await b.newPage();
  await kiyasSayfa.goto('about:blank');
  const kirp = async (b64, k, dpr) => kiyasSayfa.evaluate(async (b64, k, dpr) => {
    const im = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
    const cv = new OffscreenCanvas(k.w * dpr, k.h * dpr), c = cv.getContext('2d');
    c.drawImage(im, k.x * dpr, k.y * dpr, k.w * dpr, k.h * dpr, 0, 0, k.w * dpr, k.h * dpr);
    const bl = await cv.convertToBlob({ type: 'image/png' });
    const u = new Uint8Array(await bl.arrayBuffer()); let s = '';
    for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    return btoa(s);
  }, b64, k, dpr);

  const boya = async (mod, y, ad) => {
    await page.evaluate((mod, KOK, STICKY, MOD, GERI) => {
      let st = document.getElementById('olc-bg-stil');
      if (!st) { st = document.createElement('style'); st.id = 'olc-bg-stil'; document.head.appendChild(st); }
      /* taban = YAMASIZ hal (fixed #bg). Dist'te yama zaten uygulandigi icin
         'eski' kolu once onu geri alir. */
      st.textContent = mod === 'yeni' ? (MOD === 'sticky' ? STICKY : KOK) : GERI;
    }, mod, KOK, STICKY, process.env.MOD || 'kok',
    'body:has(#bg){background-image:none!important}#bg{display:block!important}');
    await page.evaluate((y) => scrollTo(0, y), y);
    await new Promise((r) => setTimeout(r, 700));
    /* SAHNEYI DONDUR (nabiz haric): tam sayfa karesinde 49 animasyon kosuyordu
       ve bos test 240/255 · %10,27 cikti — olcum gurultuye bogulmustu. */
    await page.evaluate(() => {
      const nb = document.getElementById('olc-nabiz');
      for (const a of document.getAnimations()) {
        const t = a.effect && a.effect.target;
        if (t === nb) continue;
        try { a.pause(); } catch (e) {}
      }
    });
    await new Promise((r) => setTimeout(r, 260));
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const kutu = { x: 0, y: 0, w: EN, h: BOY };
    const kirpilmis = await kirp(data, kutu, 2);
    const dosya = path.join(DIZIN, ad + '.png');
    fs.writeFileSync(dosya, Buffer.from(kirpilmis, 'base64'));
    return dosya;
  };

  const kiyasla = async (A, C) => kiyasSayfa.evaluate(async (A64, C64) => {
    const yukle = (b64) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
    const [a, c] = await Promise.all([yukle(A64), yukle(C64)]);
    if (a.width !== c.width || a.height !== c.height) return { hukumsuz: `${a.width}x${a.height} != ${c.width}x${c.height}` };
    const cv = new OffscreenCanvas(a.width, a.height), cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(a, 0, 0); const da = cx.getImageData(0, 0, a.width, a.height).data;
    cx.clearRect(0, 0, a.width, a.height);
    cx.drawImage(c, 0, 0); const dc = cx.getImageData(0, 0, a.width, a.height).data;
    const NABIZ = 12;                 /* sol ust kose: uyandirma isareti, kiyas disi */
    let enBuyuk = 0, toplam = 0, sayi = 0, farkli = 0;
    for (let i = 0; i < da.length; i += 4) {
      const px = (i / 4) % a.width, py = Math.floor((i / 4) / a.width);
      if (px < NABIZ && py < NABIZ) continue;
      const d = Math.max(Math.abs(da[i] - dc[i]), Math.abs(da[i + 1] - dc[i + 1]), Math.abs(da[i + 2] - dc[i + 2]));
      if (d > enBuyuk) enBuyuk = d;
      if (d > 2) farkli++;
      toplam += d; sayi++;
    }
    return { enBuyuk, ortalama: +(toplam / sayi).toFixed(2), farkliYuzde: +(100 * farkli / sayi).toFixed(2) };
  }, fs.readFileSync(A).toString('base64'), fs.readFileSync(C).toString('base64'));

  const b1 = await boya('eski', KONUMLAR[0], 'bos1');
  const b2 = await boya('eski', KONUMLAR[0], 'bos2');
  const bos = await kiyasla(b1, b2);
  console.log(`BOS TEST: en buyuk ${bos.enBuyuk}/255 · ortalama ${bos.ortalama} · farkli %${bos.farkliYuzde}\n`);

  const satir = [];
  for (const y of KONUMLAR) {
    /* ISITMA: her konumda ILK kare cekilirken gorseller/lazy icerik daha yeni
       yukleniyordu; `eski` hep ilk, `yeni` hep ikinci oldugu icin aradaki fark
       ARKA PLANDAN DEGIL yuklenmeden geliyordu. Belirti: y=1400 ve y=3200
       farklari ORB ve GRID kollarinin HEPSINDE ondalik basamagina kadar ayni
       cikti (2,29/%11,66 ve 6,55/%37,47) — degisken degistigi halde sonuc
       degismiyorsa olculen sey degisken degildir. */
    await boya('eski', y, `isitma-y${y}`);
    await new Promise((r) => setTimeout(r, 900));
    const A = await boya('eski', y, `y${y}-eski`);
    const C = await boya('yeni', y, `y${y}-yeni`);
    const k = await kiyasla(A, C);
    /* ARKA PLAN BU KONUMDA GORUNUYOR MU? Hero'nun altinda opak govde zemini
       var; goruntulenmeyen bir arka planin "farki" olcmek anlamsizdir. */
    const gorunur = await page.evaluate(() => {
      let acik = 0;
      for (let i = 1; i <= 9; i++) {
        const el = document.elementFromPoint(innerWidth * (i / 10), innerHeight * 0.5);
        if (!el || el === document.documentElement || el === document.body) acik++;
      }
      return acik;
    });
    satir.push({ y, ...k, zeminGorunur: gorunur });
    console.log(`y=${String(y).padEnd(5)} · en buyuk ${String(k.enBuyuk).padStart(3)}/255 · ortalama ${String(k.ortalama).padStart(5)} · farkli %${k.farkliYuzde} · zemin gorunur ${gorunur}/9 nokta`);
  }
  fs.writeFileSync(path.join(DIZIN, 'sonuc.json'), JSON.stringify({
    _: 'olc-bg-koke.cjs — kare uretir, hukum vermez. Goz karari Enes\'in.',
    olcum: new Date().toISOString(), pencere: `${EN}x${BOY}`, bos, konumlar: satir, kok_css: KOK }, null, 1));
  console.log(`\n-> ${DIZIN}`);
  await b.close();
})().catch((e) => { console.error('HATA', e.message); process.exit(1); });
