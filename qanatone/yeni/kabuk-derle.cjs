#!/usr/bin/env node
/* KABUK MODULU DERLEME (4 Eyl 2026) — kabuk/efekt.js -> public/varlik/kabuk.js
   Astro'nun sayfa betigi zincirine SOKULMADI: her sayfaya hoisted modul +
   __vitePreload yardimcisi (~0,8 KB) binerdi ve J1'e girerdi. Film
   motoruyla ayni desen: satir ici tetik `import('/yeni/varlik/kabuk.js')`,
   dosya statik varlik (1 gun onbellek, _headers /yeni/varlik/*).

   TUR 9 (3 Eyl 2026) — TEK AYAR, IKI TUKETICI: derleme ayarlari `derle()`
   icinde bir kez durur; bu betik (CLI) ciktilari public/varlik'a yazar,
   yeni/denetim.cjs K2 kurali ayni fonksiyonu bellekte kosturup dist'teki
   dosyayla BAYT-BIREBIR kiyaslar. Ayar iki yerde elle tekrarlansaydi bir
   gun ayrisir ve kural yanlis kirmizi verirdi. esbuild deterministiktir:
   ayni girdi + ayni surum (lock: 0.27.7) + ayni ayar = ayni bayt; ciktiya
   zaman damgasi, mutlak yol ya da makine adi girmez.
   Kosum: yeni/package.json "build" = node kabuk-derle.cjs && astro build
   (astro build'den ONCE — Astro public/'i dist'e oldugu gibi kopyalar). */
const path = require('path');
const fs = require('fs');
const { buildSync } = require(path.join(__dirname, 'node_modules', 'esbuild'));

const KABUK = path.join(__dirname, 'kabuk');
const VARLIK = path.join(__dirname, 'public', 'varlik');
const AYAR = { bundle: true, minify: true, format: 'esm', target: ['es2019'], legalComments: 'none', write: false };
/* cikti adi -> giris dosyasi. pano.js src/hesap.mjs'i, digerleri hicbir
   seyi ithal etmez; efekt.js icindeki import('/js/tubes.min.js') calisma
   zamani yoludur, pakete girmez. */
const GIRISLER = { 'kabuk.js': 'efekt.js', 'pano.js': 'pano.js', 'sizinti.js': 'sizinti.js' };

/* -> { 'kabuk.js': Buffer, 'pano.js': Buffer, 'sizinti.js': Buffer,
        'tespit-fix.tr.json': Buffer, 'tespit-fix.en.json': Buffer } */
function derle() {
  const out = {};
  for (const [cikti, giris] of Object.entries(GIRISLER)) {
    const r = buildSync({ ...AYAR, entryPoints: [path.join(KABUK, giris)], outfile: path.join(VARLIK, cikti) });
    out[cikti] = Buffer.from(r.outputFiles[0].contents);
  }
  /* teshis duzeltme sozlugu -> JSON (gonderimde iner; HTML'e girmez).
     tespit-fix.mjs ESM; senkron kalmak icin esbuild ile CJS'e cevrilip
     bellekte degerlendirilir (import() asenkron olurdu, denetimin ol()
     akisi senkron). */
  const m = buildSync({ entryPoints: [path.join(KABUK, 'tespit-fix.mjs')], bundle: true, format: 'cjs', platform: 'node', write: false, logLevel: 'silent' });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', m.outputFiles[0].text)(mod, mod.exports, require);
  const { PRIO, FIX } = mod.exports;
  for (const dil of ['tr', 'en']) {
    const d = FIX[dil];
    const dizi = [...PRIO.filter((k) => d[k]).map((k) => [k, ...d[k]]), ['yok', ...d.yok]];
    out[`tespit-fix.${dil}.json`] = Buffer.from(JSON.stringify(dizi));
  }
  return out;
}

module.exports = { derle, VARLIK, GIRISLER };

/* ---- PROLOG YUVASI (Enes, 6 Eyl 2026 — "panelde tek tus") ----
   `theme.motion.prolog` = 0 ise ana sayfalar prologu HIC ITHAL ETMEZ.
   Neden URETILEN DOSYA, neden sayfada kosul: uc yol olculdu, ucu de
   `film.<hash>.css` (8.011 B) baglantisini KALDIRAMADI — statik ithal +
   kosullu render · dinamik ithal + kosullu render · derleme sabitiyle olu
   dal. Astro sayfanin CSS'ini modul grafiginden topluyor; grafikte duran
   ithal, render edilmese de CSS'i sayfaya baglatiyor. Ithal METNI uretilince
   grafikte de kalmiyor.
   Dosya HER DERLEMEDE yeniden yazilir (astro build'den ONCE kosar). */
const YUVA_YOL = path.join(__dirname, 'src', 'parcalar', 'PrologYuvasi.astro');
function prologAcikMi() {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
    return ((c.theme || {}).motion || {}).prolog !== 0;
  } catch (e) { return true; }   /* okunamazsa ACIK — sessizce dusmesin */
}
function yuvaYaz() {
  const acik = prologAcikMi();
  const bas = '---\n/* URETILEN DOSYA — yeni/kabuk-derle.cjs yazar, ELLE DUZENLEME.\n'
    + '   Kaynak: content.json theme.motion.prolog (panelin anahtari).\n';
  const govde = acik
    ? bas + '   Prolog ACIK: Film ithal edilir. */\n'
      + "import Film from './Film.astro';\n"
      + "interface Props { dil?: 'tr' | 'en' }\n"
      + "const { dil = 'tr' } = Astro.props;\n---\n"
      + '<Film dil={dil} sayfa="ana" />\n'
    : bas + '   Prolog KAPALI: Film ITHAL EDILMEZ — boylece film.css de\n'
      + '   sayfanin modul grafigine ve <link> zincirine girmez. */\n'
      + "interface Props { dil?: 'tr' | 'en' }\n---\n";
  const eski = fs.existsSync(YUVA_YOL) ? fs.readFileSync(YUVA_YOL, 'utf8') : '';
  if (eski !== govde) fs.writeFileSync(YUVA_YOL, govde);
  return { acik, degisti: eski !== govde };
}
module.exports.yuvaYaz = yuvaYaz;
module.exports.prologAcikMi = prologAcikMi;

if (require.main === module) {
  const y = yuvaYaz();
  console.log(`PrologYuvasi.astro  prolog ${y.acik ? 'ACIK' : 'KAPALI'}${y.degisti ? ' (yeniden yazildi)' : ''}`);
  fs.mkdirSync(VARLIK, { recursive: true });
  const kaynakBoy = (ad) => { const g = GIRISLER[ad]; return g ? ` (kaynak ${fs.statSync(path.join(KABUK, g)).size} B)` : ''; };
  for (const [ad, buf] of Object.entries(derle())) {
    fs.writeFileSync(path.join(VARLIK, ad), buf);
    console.log(`${ad} ${buf.length} B${kaynakBoy(ad)}`);
  }
}
