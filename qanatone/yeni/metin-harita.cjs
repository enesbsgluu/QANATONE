#!/usr/bin/env node
/* SABIT METIN HARITASI (GECE ZINCIRI TUR 5, 2 Eyl 2026).
   Yeni sitenin bilesenleri sabit metinleri `m('anahtar', 'TR varsayilan',
   'EN varsayilan')` ile okur: panelin strings.tr/en'i doluysa o, bossa
   koddaki varsayilan. Bu betik kaynagi tarar, anahtar -> {bolum, tr, en}
   haritasini uretir ve admin.html'e METIN-HARITA-BAS ... METIN-HARITA-SON
   yorum isaretleri arasina gomer: panel "Sabit metinler" sekmesi bolum suzgecini
   ve bos alanin yerine gecen varsayilani buradan bilir.
   Eski sitenin data-t sozlugunde olup yeni sitede okunmayan anahtarlar
   "Eski site" bolumune duser (content.json strings.en anahtar kumesi).
   Kullanim: node yeni/metin-harita.cjs        (cikti: admin.html icine + ozet)
             KONTROL=1 node yeni/metin-harita.cjs  (gomulu harita taze mi? cikis kodu) */
const fs = require('fs');
const path = require('path');
const KOK = path.join(__dirname, '..');
/* TUR 9 (3 Eyl 2026): rota etiketleri TEK KAYNAKTAN (src/veri/sayfalar.json
   `parca` alani); Nav/Temel/BultenDizin sayfa degil, etiketleri burada. */
const BOLUM = {
  'parcalar/Nav.astro': 'Menü',
  'layouts/Temel.astro': 'Kabuk (alt bilgi, çerez)',
  'parcalar/BultenDizin.astro': 'Bülten dizini',
  /* TUR 4 (4 Eyl 2026): 80 sabit metin panele acilinca bu bilesenler de
     haritaya girdi. Etiket DOSYA ADI DEGIL, metnin GORUNDUGU YER olmali —
     Enes panelde "AracSahne.astro" degil "Hizmet detayi" arar. */
  'parcalar/HizmetDizin.astro': '/hizmetler',
  'parcalar/HizmetGovde.astro': 'Hizmet detayı',
  'parcalar/ProjeDizin.astro': '/projeler',
  'parcalar/ProjeGovde.astro': 'Proje detayı',
  'parcalar/AracSahne.astro': 'Hizmet detayı · araç sahnesi',
  'parcalar/PlatformSahne.astro': 'Hizmet detayı · platform sahnesi',
  'parcalar/CanliSahne.astro': 'Hizmet detayı · canlı işler sahnesi',
  'parcalar/MotorSahne.astro': 'Hizmet detayı · motor sahnesi',
  'parcalar/SohbetSahne.astro': 'Hizmet detayı · sohbet sahnesi',
};
/* OLU BILESENLER (olculdu 4 Eyl: hicbir sayfa/parca bunlari ithal etmiyor —
   R13 "anlati sahneleri yok" karariyla sokulduler, dosyalari kaldi).
   Anahtarlari panele girerse Enes yazar ve HICBIR SEY DEGISMEZ: tam da bu
   turun kacindigi yanlis yesil. Dosyalarin silinmesi ayri bir karar. */
const OLU = /^sahneler\/(S2Kayip|S3Mekanizma|S5Surec|S6Sektor)\.astro$/;
for (const s of require(path.join(__dirname, 'src', 'veri', 'sayfalar.json')).statik) if (s.parca) BOLUM[s.parca] = s.yol;
const harita = {};
const dize = String.raw`(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|` + '`' + String.raw`((?:[^` + '`' + String.raw`\\]|\\.)*)` + '`' + ')';
/* TUR 4 (4 Eyl 2026): buyuk `M(` de taranir. O gun 80 sabit iki dilli metin
   `M('tr','en')` bicimindeydi ve panelde YUVASI YOKTU; hepsi dosyaya ozgu
   sabit anahtarla `M('anahtar','tr','en')` haline geldi. Kucuk `m(` iki ve
   uc argumanli surumleri tasir, buyuk `M(` uc argumanliyi. */
const re = new RegExp(String.raw`\b[mM]\(\s*'([a-zA-Z0-9_]+)'\s*,\s*` + dize + String.raw`\s*(?:,\s*` + dize + ')?', 'g');
(function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) gez(p);
    else if (/\.(astro|ts)$/.test(e.name)) {
      const rel = path.relative(path.join(__dirname, 'src'), p).replace(/\\/g, '/');
      if (OLU.test(rel)) continue;              /* olu bilesen: panele girmez */
      const kaynak = fs.readFileSync(p, 'utf8');
      let m;
      while ((m = re.exec(kaynak))) {
        const k = m[1], tr = m[2] ?? m[3] ?? m[4] ?? '', en = m[5] ?? m[6] ?? m[7] ?? '';
        const b = BOLUM[rel] || rel;
        if (!harita[k]) harita[k] = { b, tr, en };
        else if (harita[k].b !== b && !harita[k].b.includes(b)) harita[k].b += ' · ' + b;
      }
    }
  }
})(path.join(__dirname, 'src'));
/* TUR 9 (3 Eyl 2026): nav/footer anahtarlari (nav0-nav6) artik m() LITERALI
   degil, src/veri/sayfalar.json'dan m(s.anahtar, s.tr, s.en) ile geliyor —
   metin tarayicisi onlari goremez (3 anahtar "eski site"ye dusmustu).
   Tek kaynaktan kaydedilir; bolum etiketi footer/mobil menu kullanimina gore. */
for (const s of require(path.join(__dirname, 'src', 'veri', 'sayfalar.json')).statik) {
  if (!s.anahtar) continue;
  const b = [s.footer != null ? BOLUM['layouts/Temel.astro'] : null, s.mobil != null ? BOLUM['parcalar/Nav.astro'] : null]
    .filter(Boolean).join(' · ');
  if (!harita[s.anahtar]) harita[s.anahtar] = { b, tr: s.tr, en: s.en };
}
/* eski site: content.json'daki strings.en anahtarlari (data-t sozlugu) */
const icerik = JSON.parse(fs.readFileSync(path.join(KOK, 'content.json'), 'utf8'));
const eski = Object.keys((icerik.strings || {}).en || {}).concat(Object.keys((icerik.strings || {}).tr || {}));
let eskiSayi = 0;
for (const k of eski) if (!harita[k]) { harita[k] = { b: 'Eski site', tr: '', en: '' }; eskiSayi++; }
const sirali = Object.fromEntries(Object.keys(harita).sort((a, b) => harita[a].b.localeCompare(harita[b].b, 'tr') || a.localeCompare(b)).map((k) => [k, harita[k]]));
const gomu = 'const METIN_HARITA=' + JSON.stringify(sirali) + ';';
const A = path.join(KOK, 'admin.html');
const admin = fs.readFileSync(A, 'utf8');
const BAS = '/*METIN-HARITA-BAS*/', SON = '/*METIN-HARITA-SON*/';
const i = admin.indexOf(BAS), j = admin.indexOf(SON);
if (i < 0 || j < 0) { console.error('admin.html isaretleri yok: ' + BAS + ' ... ' + SON); process.exit(2); }
const mevcut = admin.slice(i + BAS.length, j);
const yeniSayi = Object.keys(sirali).length - eskiSayi;
if (process.env.KONTROL) {
  const taze = mevcut === gomu;
  console.log(`METIN HARITASI ${taze ? 'TAZE' : 'BAYAT'}: ${Object.keys(sirali).length} anahtar (yeni site ${yeniSayi}, eski site ${eskiSayi})`);
  process.exit(taze ? 0 : 1);
}
fs.writeFileSync(A, admin.slice(0, i + BAS.length) + gomu + admin.slice(j));
const bolumler = {}; for (const k in sirali) bolumler[sirali[k].b] = (bolumler[sirali[k].b] || 0) + 1;
console.log(`METIN HARITASI: ${Object.keys(sirali).length} anahtar (yeni site ${yeniSayi}, yalniz eski site ${eskiSayi}) · gomu ${gomu.length} B -> admin.html`);
for (const b in bolumler) console.log(`  ${String(bolumler[b]).padStart(4)}  ${b}`);
