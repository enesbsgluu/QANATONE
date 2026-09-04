#!/usr/bin/env node
/* KESME · URL KAPSAMI (6 Eyl 2026).

   ANAYASA SARTI: "hicbir URL olmez". Kesmede kok adresteki ESKI site
   yerini YENI kabuga birakiyor; eski sitenin her adresi ya yeni tarafta
   AYNI adresle yasamali ya da 301 ile bir karsiliga gitmeli.

   Bu betik kesmeden ONCE calisir ve uc kumeyi karsilastirir:
     ESKI  dist/ kokundeki .html dosyalarindan cikan adresler
     YENI  dist/yeni/ altindaki adresler (kesmede /yeni oneki duser)
     PLAN  yeni/public/_redirects'teki kurallar (varsa)
   Cikti: eski tarafta olup yeni tarafta KARSILIGI OLMAYAN adresler.
   Bunlar kesmeden once ya sayfa ya yonlendirme ister.

   Kullanim: node yeni/kesme-url-kapsami.cjs */
const fs = require('fs');
const path = require('path');
const KOK = path.join(__dirname, '..');
const ESKI = path.join(KOK, 'dist');
const YENI = path.join(KOK, 'dist', 'yeni');
const CIKTI = path.join(__dirname, 'kesme-url-kapsami.json');

const adresler = (dizin, kokDizin) => {
  const out = new Set();
  if (!fs.existsSync(dizin)) return out;
  (function gez(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      /* eski tarafi tararken yeni kabugu ATLA */
      if (e.isDirectory()) { if (path.resolve(p) !== path.resolve(YENI)) gez(p); continue; }
      if (!e.name.endsWith('.html')) continue;
      let r = '/' + path.relative(kokDizin, p).replace(/\\/g, '/');
      r = r.replace(/\/index\.html$/, '').replace(/\.html$/, '');
      out.add(r === '' ? '/' : r);
    }
  })(dizin);
  return out;
};

const eski = adresler(ESKI, ESKI);
const yeni = adresler(YENI, YENI);

/* _redirects kurallari (yeni taraf; kesmede bu dosya gecerli olacak) */
const yon = [];
const rp = path.join(__dirname, 'public', '_redirects');
if (fs.existsSync(rp)) {
  for (const sat of fs.readFileSync(rp, 'utf8').split('\n')) {
    const t = sat.trim();
    if (!t || t.startsWith('#')) continue;
    const [from, to] = t.split(/\s+/);
    if (from && to) yon.push({ from, to });
  }
}
const yonluMu = (u) => yon.some((r) => {
  if (r.from === u) return true;
  if (r.from.endsWith('/*')) return u.startsWith(r.from.slice(0, -1));
  if (r.from.includes('/:')) {
    const on = r.from.split('/:')[0];
    return u.startsWith(on + '/');
  }
  return false;
});

/* Eski tarafta olup yeni tarafta karsiligi olmayanlar */
const bosluk = [...eski].filter((u) => !yeni.has(u) && !yonluMu(u)).sort();
/* Yeni tarafta olup eskide olmayanlar — yeni sayfalar, kusur degil */
const yeniEklenen = [...yeni].filter((u) => !eski.has(u)).sort();

console.log('KESME · URL KAPSAMI');
console.log(`  eski taraf : ${eski.size} adres`);
console.log(`  yeni taraf : ${yeni.size} adres`);
console.log(`  yonlendirme kurali: ${yon.length}`);
console.log(`\n  KARSILIGI OLMAYAN (kesmede OLUR): ${bosluk.length}`);
for (const u of bosluk.slice(0, 40)) console.log(`    ${u}`);
if (bosluk.length > 40) console.log(`    … +${bosluk.length - 40}`);
console.log(`\n  YENI EKLENEN (kusur degil): ${yeniEklenen.length}`);
for (const u of yeniEklenen.slice(0, 12)) console.log(`    ${u}`);

fs.writeFileSync(CIKTI, JSON.stringify({
  _: 'yeni/kesme-url-kapsami.cjs — Anayasa sarti "hicbir URL olmez". Eski kok adreslerin yeni tarafta karsiligi ya sayfa ya 301 olmali.',
  olcum: new Date().toISOString(),
  eski_adres: [...eski].sort(), yeni_adres: [...yeni].sort(),
  yonlendirme: yon, karsiligi_olmayan: bosluk, yeni_eklenen: yeniEklenen,
}, null, 1));
console.log(`\nHUKUM: ${bosluk.length === 0 ? 'GECTI — hicbir URL olmuyor' : 'KALDI (' + bosluk.length + ' adres karsiliksiz)'}\n→ ${CIKTI}`);
process.exit(bosluk.length === 0 ? 0 : 1);
