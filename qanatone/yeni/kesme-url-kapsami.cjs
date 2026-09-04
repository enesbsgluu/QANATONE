#!/usr/bin/env node
/* KESME · URL KAPSAMI — SUREKLI BEKCI (6 Eyl 2026).

   ANAYASA SARTI: "hicbir URL olmez".

   KESMEDEN ONCE bu betik iki AGACI karsilastiriyordu: kokteki eski site
   ile dist/yeni. Kesmeden SONRA eski agac artik URETILMIYOR, yani diskte
   kiyaslanacak bir taraf yok — betigin o hali kendi kendini kiyaslayip
   TRIVIAL YESIL verirdi (yanlis yesilin ders kitabi ornegi).
   Bu yuzden kaynak degisti: eski sitenin 60 adresi kesme gunu OLCULUP
   `kesme-url-kapsami.json` icine `eski_adres` olarak yazildi ve betik
   artik O KAYDI okur. Yani bekci gecici degil KALICI: bugunden sonra
   biri bir sayfayi silerse ya da yolunu degistirirse burasi kirmizi yanar.

   Kullanim: node yeni/kesme-url-kapsami.cjs
   Not     : kaydi yenilemek gerekirse `eski_adres` ELLE duzenlenir —
             uretecin kendisi onu bir daha yazmaz (kaynak agac yok). */
const fs = require('fs');
const path = require('path');
const KOK = path.join(__dirname, '..');
const DIST = path.join(KOK, 'dist');
const CIKTI = path.join(__dirname, 'kesme-url-kapsami.json');

const kayit = (() => {
  try { return JSON.parse(fs.readFileSync(CIKTI, 'utf8')); } catch (e) { return null; }
})();
if (!kayit || !Array.isArray(kayit.eski_adres) || !kayit.eski_adres.length) {
  console.error('KAYIT YOK: kesme-url-kapsami.json icinde `eski_adres` listesi bulunamadi.');
  console.error('Bu liste kesme gunu olculdu ve KORUNMALI — bekcinin tek gercek kaynagi o.');
  process.exit(2);
}
const eski = new Set(kayit.eski_adres);

const adresler = (dizin) => {
  const out = new Set();
  if (!fs.existsSync(dizin)) return out;
  (function gez(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { gez(p); continue; }
      if (!e.name.endsWith('.html')) continue;
      let r = '/' + path.relative(dizin, p).replace(/\\/g, '/');
      r = r.replace(/\/index\.html$/, '').replace(/\.html$/, '');
      out.add(r === '' ? '/' : r);
    }
  })(dizin);
  return out;
};
const yeni = adresler(DIST);

/* _redirects kurallari — kesmede kok dosya olur */
const yon = [];
for (const rp of [path.join(__dirname, 'public', '_redirects'), path.join(DIST, '_redirects')]) {
  if (!fs.existsSync(rp)) continue;
  for (const sat of fs.readFileSync(rp, 'utf8').split('\n')) {
    const t = sat.trim();
    if (!t || t.startsWith('#')) continue;
    const [from, to] = t.split(/\s+/);
    if (from && to && from !== '/*') yon.push({ from, to });
  }
  break;
}
const yonluMu = (u) => yon.some((r) => {
  if (r.from === u) return true;
  if (r.from.endsWith('/*')) return u.startsWith(r.from.slice(0, -1));
  if (r.from.includes('/:')) return u.startsWith(r.from.split('/:')[0] + '/');
  return false;
});

const bosluk = [...eski].filter((u) => !yeni.has(u) && !yonluMu(u)).sort();

console.log('KESME · URL KAPSAMI (surekli bekci)');
console.log(`  kayitli eski adres : ${eski.size}`);
console.log(`  bugunku sayfa      : ${yeni.size}`);
console.log(`  yonlendirme kurali : ${yon.length}`);
console.log(`\n  KARSILIGI OLMAYAN  : ${bosluk.length}`);
for (const u of bosluk.slice(0, 40)) console.log(`    ${u}`);

const g = { ...kayit, son_kontrol: new Date().toISOString(), bugunku_sayfa: [...yeni].sort(), karsiligi_olmayan: bosluk, yonlendirme: yon };
fs.writeFileSync(CIKTI, JSON.stringify(g, null, 1));
console.log(`\nHUKUM: ${bosluk.length === 0 ? 'GECTI — kayitli adreslerin hicbiri olmuyor' : 'KALDI (' + bosluk.length + ' adres karsiliksiz)'}\n→ ${CIKTI}`);
process.exit(bosluk.length === 0 ? 0 : 1);
