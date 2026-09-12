#!/usr/bin/env node
/* DERLEME BELIRLENIMI (6 Eyl 2026, Enes: "Her yayinda komple siteyi yayina
   gondermeyecegiz. Netlify sadece degisenleri push ediyor").

   NEDEN OLCULUYOR. Netlify yuklemeyi DOSYA OZETINE gore yapar: ayni
   ozetteki dosya yeniden YUKLENMEZ. Yani "sadece degisenler gider"
   ozelligi Netlify'da acilip kapanan bir ayar DEGIL, DERLEMENIN
   BELIRLENIMCI olmasinin sonucudur. Derleme ayni girdiden farkli bayt
   uretiyorsa (zaman damgasi, rastgele ad, sira degisimi) her yayin
   KOMPLE site yuklemesine doner ve bu sessizce olur.

   YONTEM: kaynak DEGISMEDEN iki kez derlenir, iki cikti agacinin dosya
   listesi ve sha256 ozetleri karsilastirilir. Fark varsa dosya adiyla
   raporlanir. Bilerek degisen dosyalar ISTISNA listesinde durur
   (gerekcesiyle) — sessizce atlanmaz.

   Kullanim: node yeni/derleme-belirlenim.cjs
   Cikti   : yeni/derleme-belirlenim.json */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const KOK = path.join(__dirname, '..');
const DIST = path.join(KOK, 'dist');
const CIKTI = path.join(__dirname, 'derleme-belirlenim.json');

/* Bilerek her derlemede degisen dosyalar — gerekce zorunlu. */
const ISTISNA = {
  'surum.json': 'surum-yaz.cjs commit/dal/zaman damgasi yazar (CI gozlemi); icerik degil GOZLEM dosyasi',
};

const ozetle = () => {
  const m = new Map();
  (function gez(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) gez(p);
      else m.set(path.relative(DIST, p).replace(/\\/g, '/'), crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'));
    }
  })(DIST);
  return m;
};

const derle = () => execSync('npm run build', { cwd: __dirname, encoding: 'utf8', timeout: 900000, stdio: 'pipe' });

console.log('DERLEME BELIRLENIMI — kaynak degismeden iki derleme');
derle();
const a = ozetle();
console.log(`  1. derleme: ${a.size} dosya`);
derle();
const b = ozetle();
console.log(`  2. derleme: ${b.size} dosya`);

const eklenen = [...b.keys()].filter((k) => !a.has(k));
const silinen = [...a.keys()].filter((k) => !b.has(k));
const degisen = [...a.keys()].filter((k) => b.has(k) && b.get(k) !== a.get(k));
const gerekceli = degisen.filter((k) => ISTISNA[k]);
const gerekcesiz = degisen.filter((k) => !ISTISNA[k]);

console.log(`\n  eklenen : ${eklenen.length}${eklenen.length ? ' -> ' + eklenen.slice(0, 5).join(', ') : ''}`);
console.log(`  silinen : ${silinen.length}${silinen.length ? ' -> ' + silinen.slice(0, 5).join(', ') : ''}`);
console.log(`  degisen : ${degisen.length} (gerekceli ${gerekceli.length}, GEREKCESIZ ${gerekcesiz.length})`);
for (const k of gerekceli) console.log(`     ok  ${k} — ${ISTISNA[k]}`);
for (const k of gerekcesiz.slice(0, 10)) console.log(`     !!  ${k}`);

const kaldi = eklenen.length + silinen.length + gerekcesiz.length;
const oran = a.size ? ((degisen.length / a.size) * 100).toFixed(1) : '0';
console.log(`\n  AYNI KALAN DOSYA ORANI: ${(100 - Number(oran)).toFixed(1)}%  ->  Netlify bu kadarini YENIDEN YUKLEMEZ`);
fs.writeFileSync(CIKTI, JSON.stringify({
  _: 'yeni/derleme-belirlenim.cjs — kaynak degismeden iki derleme; ayni ozetli dosya Netlify tarafindan yeniden yuklenmez. "Sadece degisenler gider" bir Netlify ayari degil, derlemenin belirlenimci olmasinin sonucudur.',
  olcum: new Date().toISOString(), dosya: a.size, eklenen, silinen, degisen, gerekceli, gerekcesiz, istisna: ISTISNA,
}, null, 1));
console.log(`\nHUKUM: ${kaldi === 0 ? 'GECTI — derleme belirlenimci' : 'KALDI (' + kaldi + ' dosya gerekcesiz degisti)'}\n→ ${CIKTI}`);
process.exit(kaldi === 0 ? 0 : 1);
