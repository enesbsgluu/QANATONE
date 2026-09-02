#!/usr/bin/env node
/* TASARIM KONTAGI (TUR 9, 2 Eyl 2026) — iki dist agacini AYNI sayfa, AYNI
   kaydirma konumu, AYNI genislikte cekip piksel farki yuzdesi verir ve yan
   yana kontak karesi uretir (sadakat kurali: yan yana kare + fark listesi).
   NEDEN VAR: "ayni gorunuyor" hukmu goz karariyla verilmez; ONCE (dunku
   dist) ile SONRA (guncel dist) arasindaki fark olculur, kare kare gosterilir.
   Hukum burada verilmez — fark listesi ve yan yana kare Enes'e gider.
   KULLANIM:
     MSYS_NO_PATHCONV=1 ONCE=http://127.0.0.1:8791 SONRA=http://127.0.0.1:8790 \
       SAYFA=/yeni/hizmet/seo/ KONUM=0,30,80 GENISLIK=1440 AD=deneme \
       node yeni/film/kontak-tasarim.cjs
     (once iki sunucu ayakta olmali: yerel-sun.cjs — 8790 guncel, 8791 dunku)
   ENV KOLLARI:
     ONCE / SONRA  : iki agacin kok adresi (varsayilan 8791 / 8790)
     SAYFA         : /yeni/ onekli sayfa yolu (varsayilan /yeni/)
     KONUM         : yuzde kaydirma konumlari, virgulle (scrollHeight-innerHeight
                     orani; 0=ust, 100=alt). En az iki konum verilmeli — oz-kontrol
                     bunlarin md5'ini kiyaslar.
     GENISLIK      : 1440 (yukseklik 900) ya da 390 (mobil, 844); baska deger
                     verilirse yukseklik YUKSEKLIK env'inden, yoksa 900.
     AD            : cikti on adi (varsayilan 'kontak')
     BOZ=1         : SINAMA kolu — SONRA tarafina '.dugme{padding:14px 26px}'
                     enjekte eder; fark > %0 cikmali (duzenegin farki gordugunun
                     kaniti). Uretim kosumunda VERILMEZ.
     ESIK          : kanal basina |delta| esigi (varsayilan 16)
     TARAYICI      : brave|chrome (varsayilan brave — Chrome'da donanim
                     hizlandirma kapali, rAF/IO olu olabiliyor, yanlis kirmizi)
   CIKTI:
     yeni/film/kontak-tur9/<AD>-<once|sonra>-<konum>.png  (tek kare, viewport)
     yeni/film/kontak-tur9/<AD>-yanyana-<konum>.png       (44 px etiket bandi)
     yeni/film/kontak-tasarim-<AD>.json                   (fark listesi)
   TUZAKLAR (kayit duzenegi dersleri, hepsi kodda):
     (a) Perde (#perde) sessionStorage 'qanat-splash-seen'=1 ile ATLANIR;
         bayrak goto'dan ONCE evaluateOnNewDocument ile konur (Perde.astro
         satir 78 bayragi parse aninda senkron okur) — reload gerekmez.
     (b) Yukleme: networkidle0 + document.fonts.ready + 2 rAF. rAF 1,5 sn'de
         donmezse (Chrome'da rAF olu olabiliyor) zamanlayiciyla gecilir ve
         JSON'a 'rafOlu' yazilir.
     (c) Hareket dondurulur: document.getAnimations().pause() + CSS
         animation-play-state:paused / transition:none; video'lar pause.
         SONSUZ animasyonlar (temel.css sus-gaspin: .dugme.sus-isik donen
         kenar, 3 s) faz 0'a alinir — yoksa iki agac farkli fazda durur ve
         kosumdan kosuma degisen %0,03'luk sahte fark cikar (ilk kosumda
         goruldu). Sonlu (dogus) animasyonlar yalniz duraklatilir.
     (h) HTTP durumu 200 degilse betik DURUR (exit 1): dist yeniden
         kurulurken 8790 404 sayfasi dondu, 900 px bos yuzey kiyaslandi ve
         oz-kontrol yanlis sebeple kirmiziya dustu.
         Yildiz/imlec/grain tuvalleri (#stars,#noise,.kb-bit,.kb-tip) gurultu
         uretir — display:none ile gizlenir, JSON'da 'gizlenen' olarak yazilir.
     (d) Kaydirma: scrollTo sonrasi scrollY okunur; hedeften ±2 px sapiyorsa
         JSON'a 'sapma' yazilir ve uyarilir. scroll-behavior:auto zorlanir.
     (e) KIRMIZI-ONCE oz-kontrol: ayni agacin iki konumu md5 olarak FARKLI
         olmali — aynysa 'bayat yuzey' hatasiyla exit 2 (tur2-harita'da alti
         kare byte-ayni cikmisti ve %0,00 fark yanlis yesildi). KONUM=0,0 ile
         kasten kirmizi gorulur.
     (f) Brave, headless 'new' → true → false sirasiyla denenir; deviceScaleFactor 1.
     (g) MSYS/Git Bash '/yeni/...' degerli env'leri Windows yoluna cevirir —
         kosumda MSYS_NO_PATHCONV=1 verilmezse SAYFA bozuk gelir; betik bunu
         yakalayip durur. */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const sharp = require(path.join(__dirname, '..', 'node_modules', 'sharp'));
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'brave';
const ONCE = (process.env.ONCE || 'http://127.0.0.1:8791').replace(/\/$/, '');
const SONRA = (process.env.SONRA || 'http://127.0.0.1:8790').replace(/\/$/, '');
const SAYFA = process.env.SAYFA || '/yeni/';
const KONUMLAR = (process.env.KONUM || '0,50').split(',').map((s) => s.trim()).filter(Boolean).map(Number);
const GENISLIK = +(process.env.GENISLIK || 1440);
const YUKSEKLIK = +(process.env.YUKSEKLIK || (GENISLIK === 390 ? 844 : 900));
const AD = process.env.AD || 'kontak';
const BOZ = process.env.BOZ === '1';
const ESIK = +(process.env.ESIK || 16);
const BASLIK = 44;
/* #tubes: hero'nun three.js tuvali (js/tubes.min.js, dinamik import) —
   WebGL karesi CSS animasyonu degildir, pause() etkilemez; yukleme anina
   gore iki agacta farkli kare cikar (3 Eyl: /yeni/ konum 0'da %17 "fark",
   kaynagi tamamen bu tuvaldi). Gizlenir; tup katmani kiyasa girmez. */
const GIZLENEN = ['#stars', '#noise', '.kb-bit', '.kb-tip', '#tubes'];
const KONTAK = path.join(__dirname, 'kontak-tur9');
const CIKTI = path.join(__dirname, `kontak-tasarim-${AD}.json`);
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

if (!/^\//.test(SAYFA) || /^[A-Za-z]:/.test(SAYFA)) { console.error(`SAYFA '${SAYFA}' bir URL yolu degil — Git Bash yol donusumu: MSYS_NO_PATHCONV=1 ver.`); process.exit(1); }
if (KONUMLAR.some((k) => !Number.isFinite(k) || k < 0 || k > 100)) { console.error(`KONUM '${process.env.KONUM}' — 0..100 arasi yuzdeler, virgulle.`); process.exit(1); }
fs.mkdirSync(KONTAK, { recursive: true });

const kacis = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const etiket = (gen, yuk, sol, sag) => Buffer.from(`<svg width="${gen}" height="${yuk}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0b0b0c"/>
  <text x="14" y="${Math.round(yuk * 0.66)}" font-family="Consolas,monospace" font-size="${Math.round(yuk * 0.4)}" fill="#e8e6e3">${kacis(sol)}</text>
  <text x="${gen - 14}" y="${Math.round(yuk * 0.66)}" text-anchor="end" font-family="Consolas,monospace" font-size="${Math.round(yuk * 0.4)}" fill="#ff4d63">${kacis(sag)}</text>
</svg>`);

/* sayfada 2 rAF bekle; 1,5 sn'de donmezse zamanlayici (rAF olu → 'zaman') */
const ikiKare = (page) => page.evaluate(() => new Promise((r) => {
  let n = 0; const f = () => { if (++n >= 2) r('raf'); else requestAnimationFrame(f); };
  requestAnimationFrame(f); setTimeout(() => r('zaman'), 1500);
}));
/* animasyonlari durdur; SONSUZ olanlari (sus-gaspin donen kenar gibi) faz 0'a al
   — iki agacta farkli anda durursa her kosumda degisen sahte fark uretir
   (ilk kosumda %0,03: WhatsApp dugmesinin donen kizil kenari). Sonlu olanlar
   (dogus/reveal) yalniz duraklatilir: 0'a alinsa gorunmez baslangic karesine
   doner, sona alinsa fill'siz olanlar taban stile duser. */
const dondur = (page) => page.evaluate(() => {
  let a = 0, s = 0;
  /* 3 Eyl duzeltmesi: SONLU animasyonlar finish() ile YERLESIK son haline
     alinir — duraklatilan kare yukleme hizina bagliydi, iki agacta giris
     animasyonu farkli anlarda donmus cikiyordu (%17 sahte fark). Sonlu
     animasyonun bittigi hal, gercek kullanicinin bir saniye sonra gordugu
     haldir; fill'siz olanin taban stile dusmesi de o gercegin parcasidir.
     SONSUZ olanlar (halka, huzme) duraklatilip 0'a alinir. */
  let f = 0;
  try { document.getAnimations().forEach((x) => { try {
    const t = x.effect && x.effect.getComputedTiming ? x.effect.getComputedTiming() : null;
    if (t && t.iterations === Infinity) { x.pause(); x.currentTime = 0; s++; }
    else { x.finish(); f++; }
    a++;
  } catch (e) { try { x.pause(); } catch (e2) {} } }); } catch (e) {}
  let v = 0; document.querySelectorAll('video').forEach((x) => { try { x.pause(); v++; } catch (e) {} });
  /* saat metni dakikaya bagli — iki cekim farkli dakikaya duserse sahte fark */
  document.querySelectorAll('#shSaat').forEach((e) => { e.textContent = '--:--'; });
  return { animasyon: a, sonsuzSifirlanan: s, sonluBitirilen: f, video: v };
});

async function agacCek(browser, kok, etiketAd, boz) {
  const page = await browser.newPage();
  await page.setViewport({ width: GENISLIK, height: YUKSEKLIK, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem('qanat-splash-seen', '1'); } catch (e) {} });
  const url = kok + SAYFA;
  let yukleme = 'networkidle0', yanit = null;
  try { yanit = await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 }); }
  catch (e) { yukleme = 'load (networkidle0 60 sn dolmadi: ' + String(e.message).slice(0, 60) + ')'; yanit = await page.goto(url, { waitUntil: 'load', timeout: 60000 }); }
  /* HTTP durumu 200 degilse kiyas anlamsiz (ikinci kosumda dist yeniden kurulurken
     8790 404 'yok:' sayfasi dondu ve 900 px bos yuzey kiyaslandi) — dur. */
  const durum = yanit ? yanit.status() : 0;
  if (durum !== 200) throw new Error(`${etiketAd} ${url} HTTP ${durum} — sunucu ayakta mi, dist'te sayfa var mi?`);
  await page.evaluate(() => document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true);
  const raf1 = await ikiKare(page);
  await page.addStyleTag({ content: `*{animation-play-state:paused!important;transition:none!important}html{scroll-behavior:auto!important}${GIZLENEN.join(',')}{display:none!important}` });
  if (boz) await page.addStyleTag({ content: '.dugme{padding:14px 26px}' });
  const dondurulan = await dondur(page);
  await ikiKare(page);
  const olcek = await page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight, innerWidth, dugme: document.querySelectorAll('.dugme').length }));
  const kareler = [];
  for (const konum of KONUMLAR) {
    const hedef = Math.round((konum / 100) * Math.max(0, olcek.scrollHeight - olcek.innerHeight));
    await page.evaluate((y) => window.scrollTo(0, y), hedef);
    await ikiKare(page);
    const d2 = await dondur(page); /* kaydirmayla dogan animasyonlar (IO tetigi) */
    const raf2 = await ikiKare(page);
    const gercek = await page.evaluate(() => Math.round(scrollY));
    const sapma = Math.abs(gercek - hedef) > 2 ? gercek - hedef : 0;
    if (sapma) console.warn(`  UYARI ${etiketAd} konum ${konum}: scrollY hedef ${hedef} gercek ${gercek} (sapma ${sapma} px)`);
    const dosya = path.join(KONTAK, `${AD}-${etiketAd}-${konum}.png`);
    const png = await page.screenshot({ type: 'png' });
    fs.writeFileSync(dosya, png);
    const ham = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const md5 = crypto.createHash('md5').update(ham.data).digest('hex');
    kareler.push({ konum, hedef, gercek, sapma, md5, png: path.relative(path.join(__dirname, '..', '..'), dosya).replace(/\\/g, '/'), ham, raf: raf2, animasyonSonradan: d2.animasyon });
    console.log(`  ${etiketAd.padEnd(5)} konum ${String(konum).padStart(3)}% → scrollY ${gercek}/${hedef}${sapma ? ' SAPMA ' + sapma : ''} · md5 ${md5.slice(0, 10)} · ${path.basename(dosya)}`);
  }
  await page.close();
  return { url, durum, yukleme, rafOlu: raf1 === 'zaman', dondurulan, olcek, kareler };
}

/* kanal basina |delta|>ESIK olan piksel sayisi / toplam; 8x8 izgarada en yogun hucre */
function fark(a, b) {
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) return { farkYuzde: 100, bolge: `boyut farkli ${a.info.width}x${a.info.height} ↔ ${b.info.width}x${b.info.height}`, farkliPiksel: -1, toplamPiksel: a.info.width * a.info.height };
  const { width: W, height: H, channels: C } = a.info;
  const hucre = new Array(64).fill(0);
  let n = 0;
  const A = a.data, B = b.data;
  for (let y = 0; y < H; y++) {
    const hy = Math.min(7, Math.floor((y * 8) / H));
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C;
      let f = false;
      for (let c = 0; c < 3; c++) { if (Math.abs(A[i + c] - B[i + c]) > ESIK) { f = true; break; } }
      if (f) { n++; hucre[hy * 8 + Math.min(7, Math.floor((x * 8) / W))]++; }
    }
  }
  const toplam = W * H;
  let enb = 0; for (let i = 1; i < 64; i++) if (hucre[i] > hucre[enb]) enb = i;
  const satir = Math.floor(enb / 8), sutun = enb % 8;
  const bolge = n === 0 ? 'fark yok' : `satir ${satir + 1}/8 sutun ${sutun + 1}/8 (x ${Math.round((sutun * W) / 8)}-${Math.round(((sutun + 1) * W) / 8)}, y ${Math.round((satir * H) / 8)}-${Math.round(((satir + 1) * H) / 8)}; hucrede ${hucre[enb]} px, tum farkin %${Math.round((hucre[enb] / n) * 100)})`;
  return { farkYuzde: +((n / toplam) * 100).toFixed(2), bolge, farkliPiksel: n, toplamPiksel: toplam };
}

(async () => {
  let browser = null, headless = null;
  for (const h of ['new', true, false]) {
    try {
      browser = await pt.launch({ executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: h,
        args: [`--window-size=${GENISLIK + 20},${YUKSEKLIK + 80}`, '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--hide-scrollbars'],
        protocolTimeout: 300000 });
      headless = h; break;
    } catch (e) { console.warn(`headless ${JSON.stringify(h)} olmadi: ${String(e.message).split('\n')[0].slice(0, 90)}`); }
  }
  if (!browser) throw new Error('tarayici acilamadi');
  const surum = await browser.version();
  console.log(`TARAYICI : ${TARAYICI} · ${surum} · headless ${JSON.stringify(headless)} · ${GENISLIK}x${YUKSEKLIK} · esik ${ESIK}${BOZ ? ' · BOZ=1 (SONRA .dugme padding enjekte)' : ''}`);
  console.log(`SAYFA    : ${SAYFA} · konum ${KONUMLAR.join(',')}% · ONCE ${ONCE} · SONRA ${SONRA}`);
  const once = await agacCek(browser, ONCE, 'once', false);
  const sonra = await agacCek(browser, SONRA, 'sonra', BOZ);
  await browser.close();

  /* (e) KIRMIZI-ONCE oz-kontrol: ayni agacta iki karenin md5'i ayniysa yuzey bayat */
  const bayat = [];
  for (const [ad, ag] of [['once', once], ['sonra', sonra]]) {
    const k = ag.kareler;
    for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) if (k[i].md5 === k[j].md5) bayat.push(`${ad}: konum ${k[i].konum}% (scrollY ${k[i].gercek}) ↔ ${k[j].konum}% (scrollY ${k[j].gercek}) md5 ${k[i].md5.slice(0, 10)} AYNI`);
  }
  const ozKontrol = KONUMLAR.length < 2 ? 'atlandi (tek konum — en az iki konum ver)' : bayat.length ? 'KIRMIZI: bayat yuzey' : 'gecti (her agacta konumlar md5 olarak farkli)';
  if (KONUMLAR.length < 2) console.warn('UYARI: oz-kontrol icin en az iki konum gerekir, atlandi.');

  const sonuc = [];
  if (!bayat.length) {
    for (let i = 0; i < KONUMLAR.length; i++) {
      const ko = once.kareler[i], ks = sonra.kareler[i];
      const f = fark(ko.ham, ks.ham);
      const solB = await sharp(ko.ham.data, { raw: ko.ham.info }).png().toBuffer();
      const sagB = await sharp(ks.ham.data, { raw: ks.ham.info }).png().toBuffer();
      const gen = ko.ham.info.width + 6 + ks.ham.info.width, yuk = Math.max(ko.ham.info.height, ks.ham.info.height);
      const yy = path.join(KONTAK, `${AD}-yanyana-${ko.konum}.png`);
      await sharp({ create: { width: gen, height: yuk + BASLIK, channels: 3, background: '#0b0b0c' } })
        .composite([
          { input: etiket(gen, BASLIK, `${SAYFA} · konum ${ko.konum}% (scrollY ${ko.gercek}) · ${GENISLIK}px — SOL: ONCE ${ONCE.replace(/^https?:\/\//, '')}  |  SAG: SONRA ${SONRA.replace(/^https?:\/\//, '')}${BOZ ? '  [BOZ=1]' : ''}`, `fark %${f.farkYuzde.toFixed(2)} · ${f.bolge.split(' (')[0]}`), top: 0, left: 0 },
          { input: solB, top: BASLIK, left: 0 },
          { input: sagB, top: BASLIK, left: ko.ham.info.width + 6 },
        ]).png({ compressionLevel: 9 }).toFile(yy);
      sonuc.push({ konum: ko.konum, farkYuzde: f.farkYuzde, farkliPiksel: f.farkliPiksel, toplamPiksel: f.toplamPiksel, bolge: f.bolge,
        md5: { once: ko.md5, sonra: ks.md5 }, scrollY: { hedef: { once: ko.hedef, sonra: ks.hedef }, gercek: { once: ko.gercek, sonra: ks.gercek } },
        sapma: (ko.sapma || ks.sapma) ? { once: ko.sapma, sonra: ks.sapma } : 0, raf: { once: ko.raf, sonra: ks.raf },
        png: { once: ko.png, sonra: ks.png, yanyana: path.relative(path.join(__dirname, '..', '..'), yy).replace(/\\/g, '/') } });
      console.log(`${f.farkYuzde > 0 ? 'FARK ' : 'ok   '} konum ${String(ko.konum).padStart(3)}% · fark %${f.farkYuzde.toFixed(2)} (${f.farkliPiksel}/${f.toplamPiksel} px) · ${f.bolge} · md5 ${ko.md5 === ks.md5 ? 'AYNI' : 'farkli'} → ${path.basename(yy)}`);
    }
  }
  const temiz = (ag) => ({ url: ag.url, durum: ag.durum, yukleme: ag.yukleme, rafOlu: ag.rafOlu, dondurulan: ag.dondurulan, scrollHeight: ag.olcek.scrollHeight, dugmeSayisi: ag.olcek.dugme, kareler: ag.kareler.map(({ ham, ...k }) => k) });
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/kontak-tasarim.cjs — ONCE/SONRA dist agaclari ayni sayfa+konum+genislikte piksel farki. Hukum verilmez; yan yana kare + fark listesi.',
    olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, headless, sayfa: SAYFA, genislik: GENISLIK, yukseklik: YUKSEKLIK, esik: ESIK, boz: BOZ,
    gizlenen: GIZLENEN, ozKontrol, bayat, konum: sonuc, once: temiz(once), sonra: temiz(sonra),
  }, null, 1));
  if (bayat.length) { console.error(`\nKIRMIZI — bayat yuzey (ayni agacta iki konum byte-ayni):\n  ${bayat.join('\n  ')}\n→ ${CIKTI}`); process.exit(2); }
  const enb = sonuc.reduce((a, b) => Math.max(a, b.farkYuzde), 0);
  console.log(`\nOZ-KONTROL: ${ozKontrol} · en buyuk fark %${enb.toFixed(2)}${sonuc.some((s) => s.sapma) ? ' · SAPMA VAR' : ''}${once.rafOlu || sonra.rafOlu ? ' · rAF OLU (zamanlayiciyla gecildi)' : ''}\n→ ${CIKTI}`);
})().catch((e) => { console.error(e); process.exit(1); });
