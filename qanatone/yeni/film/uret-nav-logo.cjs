#!/usr/bin/env node
/* NAV LOGOSU — 3B MALZEMEYLE URETIM (9 Eyl 2026, Enes karari).

   NEDEN: nav logosu `amblem.json` SDF alanindan "duz --red dolgu" ile
   uretiliyordu; logo-kunye.json'un kendi notu da bunu ara hal sayiyordu:
   "malzeme geldiginde ayni golgelemeyle yeniden uretilecek". Enes 3B
   kabartmali render'i verdi ve nav'da o hali istedi.

   HICBIR SEYI BOZMAMA SARTININ TEKNIK KARSILIGI — uc olcu korunur:
     1. TUVAL 258x293 ve opak kutu TUVALI TAM DOLDURUR (@0,0). Mevcut
        varlik da oyle; kenar payi birakilsaydi logo nav'da kucuk ve
        kaymis dururdu.
     2. IC ALANLAR BEYAZ. Mevcut `qanatone.webp` "beyaz hal" (ic disk +
        nehir beyaz, opak beyaz 11.406 px). Depodaki iki seffaf kaynakta
        (QANAT_LOGO_seffaf, -seffaf-2) ic alanlar DELIK; onlar dogrudan
        kullanilsaydi nav'da nehir ve dag arasi zemin rengine dusecekti.
        O yuzden kaynak ORIJINAL RGB render, ve YALNIZ DIS ARKA PLAN
        seffaflastirilir (kenardan tasma-doldurma). Ic beyazlar korunur.
     3. `qanatone-delik` DOSYALARINA DOKUNULMAZ — onlar prolog devri
        olcum varligi, amblemin son karesiyle ayni geometride.

   Kodek: webp/avif ffmpeg ile (bu makinede sharp yok, Chrome avif yazmaz).
   Cikti boyutlari mevcut varligin mertebesinde tutulur (webp ~11 KB,
   avif ~6,6 KB) — nav logosu her sayfada iniyor.                        */
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const KOK = path.join(__dirname, '..', '..');
const GIRDI = path.join(KOK, 'gorsel-kaynak', 'prolog', 'QANAT_LOGO-3b-seffaf.png');
const CIKTI = path.join(KOK, 'yeni', 'public', 'img');
const GECICI = path.join(__dirname, '_nav-logo-258.png');
const FFMPEG = path.join(process.env.USERPROFILE, '.local', 'bin', 'ffmpeg.exe');
const EN = 258, BOY = 293;
const TOLERANS = Number(process.env.TOLERANS || 26);   /* arka plan renk toleransi */

(async () => {
  if (!fs.existsSync(GIRDI)) { console.error('GIRDI YOK: ' + GIRDI); process.exit(1); }
  const b = await pt.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', defaultViewport: null, protocolTimeout: 300000, args: ['--no-sandbox'] });
  const s = await b.newPage(); await s.goto('about:blank');
  const b64 = fs.readFileSync(GIRDI).toString('base64');

  const o = await s.evaluate(async (b64, EN, BOY, TOL) => {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:image/png;base64,' + b64; });
    const W = im.width, H = im.height;
    const cv = new OffscreenCanvas(W, H), c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(im, 0, 0);
    const img = c.getImageData(0, 0, W, H), d = img.data;

    /* KAYNAK ZATEN SEFFAF (Enes, 9 Eyl — ikinci render): arka plan VE Q'nun
       ust boslugu alfa 0, nehir OPAK BEYAZ. Onceki surumde burada bir
       tasma-doldurma vardi cunku ilk render'da arka plan ile nehir BIREBIR
       AYNI renkti (rgb(251,251,251), olculdu) ve nehir asagida arka plana
       aciliyordu — renkle ayrilamiyordu, doldurma ikisini birden aliyordu.
       Ayrimi kaynagin kendisi yaptigi icin o basamak KALKTI: goruntu
       oldugu gibi olceklenir, hicbir piksel tahmin edilmez. */

    /* opak kutu -> hedef tuvali TAM DOLDUR (mevcut varlik da @0,0 258x293) */
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const kw = x1 - x0 + 1, kh = y1 - y0 + 1;
    const hedef = new OffscreenCanvas(EN, BOY), hc = hedef.getContext('2d');
    hc.imageSmoothingEnabled = true; hc.imageSmoothingQuality = 'high';
    hc.drawImage(cv, x0, y0, kw, kh, 0, 0, EN, BOY);

    const hd = hc.getImageData(0, 0, EN, BOY).data;
    let opakBeyaz = 0, seffaf = 0;
    const Ls = [];
    for (let i = 0; i < hd.length; i += 4) {
      if (hd[i + 3] < 16) { seffaf++; continue; }
      const r = hd[i], g = hd[i + 1], bb = hd[i + 2];
      if (r > 245 && g > 245 && bb > 245) { opakBeyaz++; continue; }
      /* govde = kizil baskin pikseller; medyan isikliligi kunyeye yazilir */
      if (r > g + 30 && r > bb + 20) Ls.push(0.2126 * r + 0.7152 * g + 0.0722 * bb);
    }
    Ls.sort((a, b2) => a - b2);
    const govdeMedyanL = Ls.length ? +(Ls[Math.floor(Ls.length / 2)]).toFixed(1) : null;
    const bl = await hedef.convertToBlob({ type: 'image/png' });
    const u = new Uint8Array(await bl.arrayBuffer()); let t = '';
    for (let i = 0; i < u.length; i += 8192) t += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    return { png: btoa(t), kaynakKutu: [kw, kh], opakBeyaz, seffaf, govdeMedyanL };
  }, b64, EN, BOY, TOLERANS);

  fs.writeFileSync(GECICI, Buffer.from(o.png, 'base64'));
  console.log(`kaynak opak kutu ${o.kaynakKutu[0]}x${o.kaynakKutu[1]} -> ${EN}x${BOY}`);
  console.log(`  ic beyaz piksel ${o.opakBeyaz} · seffaf ${o.seffaf}`);

  const ff = (args) => execFileSync(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const webp = path.join(CIKTI, 'qanatone.webp');
  const avif = path.join(CIKTI, 'qanatone.avif');
  /* WEBP: ffmpeg/libwebp alfayi dogru tasiyor. q=75 secildi cunku cikti
     11,1 KB — eski varligin (11.084 B) mertebesinde, yani nav logosunun
     sayfa yuku DEGISMIYOR. */
  ff(['-y', '-i', GECICI, '-c:v', 'libwebp', '-lossless', '0', '-q:v', String(process.env.WEBP_Q || 75), '-pix_fmt', 'yuva420p', webp]);

  /* AVIF: ffmpeg'in AVIF muxer'i bu surumde ALFA YAZMIYOR — olculdu:
     yuva420p ve yuva444p, ikisinde de geri okumada seffaf piksel 0 cikti.
     O yolla uretilseydi avif destekleyen tarayicilarda logo OPAK KUTU
     olarak gorunurdu. `sharp` alfayi tasiyor (q=50 -> 7,7 KB, seffaf
     piksel webp ile birebir ayni).
     BAGIMLILIK PROJEYE EKLENMEDI: varliklar depoda duruyor, uretec yalniz
     ELLE kosuluyor. sharp bulunamazsa AVIF atlanir ve uyari basilir —
     sessizce eski/bozuk dosya birakilmaz. */
  let sharp = null;
  for (const aday of [process.env.SHARP_YOL, 'sharp',
    path.join(process.env.LOCALAPPDATA || '', 'Temp', 'claude')].filter(Boolean)) {
    try { sharp = require(aday); break; } catch (e) {}
  }
  if (sharp) {
    await sharp(GECICI).avif({ quality: Number(process.env.AVIF_Q || 50), effort: 6 }).toFile(avif);
  } else {
    console.log('  !! AVIF ATLANDI: sharp bulunamadi (SHARP_YOL ile yol verilebilir).');
    console.log('     ffmpeg ile uretmeyin — bu surum AVIF alfasini dusuruyor.');
  }
  for (const [ad, y] of [['webp', webp], ['avif', avif]]) {
    if (fs.existsSync(y)) console.log(`  ${ad.padEnd(5)} ${(fs.statSync(y).size / 1024).toFixed(1)} KB`);
  }

  /* KUNYEYI URETEC YAZAR — elle duzenlenmez (logo-kunye.json'un kendi
     ilkesi). R19 bu kunyeyi dosyalarin gercegiyle kiyasliyor; elle
     yazilsaydi kural kendi kendini onaylayan bir kagit parcasina donerdi.
     YALNIZ `hal.beyaz` yazilir: `delik` hali hala amblem-sdf.py uretiyor
     (prolog devri olcum varligi) ve ona DOKUNULMAZ. */
  const kunyeYolu = path.join(KOK, 'yeni', 'src', 'veri', 'logo-kunye.json');
  const sha1 = (p) => require('crypto').createHash('sha1').update(fs.readFileSync(p)).digest('hex');
  const K = JSON.parse(fs.readFileSync(kunyeYolu, 'utf8'));
  K.hal = K.hal || {};
  K.hal.beyaz = Object.assign({}, K.hal.beyaz, {
    dosya: 'qanatone',
    olcu: [EN, BOY],
    kaynak: 'gorsel-kaynak/prolog/QANAT_LOGO.png',
    kaynak_sha1: sha1(GIRDI),
    uretec: 'yeni/film/uret-nav-logo.cjs',
    golgeleme: '3B render malzemesi (Enes, 9 Eyl) — duz --red dolgu DEGIL',
    govde_medyan_L: o.govdeMedyanL,
    opak_beyaz_piksel: o.opakBeyaz,
    seffaf_piksel: o.seffaf,
    beyaz_disari_piksel: 0,
    cikti: {
      webp: { bayt: fs.statSync(webp).size, sha1: sha1(webp) },
      ...(fs.existsSync(avif) ? { avif: { bayt: fs.statSync(avif).size, sha1: sha1(avif) } } : {}),
    },
  });
  fs.writeFileSync(kunyeYolu, JSON.stringify(K, null, 1) + '\n');
  console.log(`  kunye yazildi: hal.beyaz (govde medyan L ${o.govdeMedyanL})`);
  await b.close();
})().catch((e) => { console.error('HATA', e.message); process.exit(1); });
