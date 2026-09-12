#!/usr/bin/env node
/* KESME ADIM 6 · GERI ALMA. `git checkout` BURADA YANLIS: Temel.astro ve
   denetim.cjs ayni zamanda ADIM 0-5'in HENUZ COMMITLENMEMIS islerini de
   tasiyor; checkout onlari da silerdi. Bu betik yalniz ADIM 6'yi soker.
   Kontrol icin:  node yeni/geri-al-adim6.cjs --kontrol   (yazmaz, arar) */
const fs = require('fs');
const KONTROL = process.argv.includes('--kontrol');
const D = [
  ['yeni/src/layouts/Temel.astro',
   'const kesmeOncesi = false;', 'const kesmeOncesi = true;'],
  ['yeni/src/pages/404.astro',
   '<Temel dil="tr" indeks={false} baslik="Sayfa bulunamadı', '<Temel dil="tr" baslik="Sayfa bulunamadı'],
  ['yeni/src/pages/film.astro',
   '<Temel dil="tr" indeks={false} perde', '<Temel dil="tr" perde'],
  ['yeni/src/pages/en/film.astro',
   '<Temel dil="en" indeks={false} perde', '<Temel dil="en" perde'],
  ['yeni/src/pages/deneme-react.astro',
   '<Temel dil="tr" indeks={false} baslik="React', '<Temel dil="tr" baslik="React'],
];
let eksik = 0;
for (const [p, a, b] of D) {
  const s = fs.readFileSync(p, 'utf8');
  if (!s.includes(a)) { console.log('  DESEN YOK  ' + p); eksik++; continue; }
  if (!KONTROL) fs.writeFileSync(p, s.replace(a, b));
  console.log('  ' + (KONTROL ? 'bulundu   ' : 'geri alindi') + ' ' + p);
}
/* denetim.cjs N1: ters kural yerine goc-bekcisi hali */
const dp = 'yeni/denetim.cjs';
let d = fs.readFileSync(dp, 'utf8');
const bas = d.indexOf('  /* KESMEDE TERSINE DONDU');
const son = d.indexOf("kapalı');", bas);
if (bas < 0 || son < 0) { console.log('  DESEN YOK  ' + dp + ' (N1)'); eksik++; }
else {
  const geri = [
    "  const kusur = tumSayfalar.filter(p => !/name=\"robots\"[^>]*content=\"[^\"]*noindex/.test(oku(p)));",
    "  ol('N1 · göç bekçisi: her sayfa noindex (Faz 4'te tersine döner)',",
    "     kusur.length === 0, kusur.slice(0, 3).map(rel).join(' '));",
  ].join('\n');
  if (!KONTROL) fs.writeFileSync(dp, d.slice(0, bas) + geri + d.slice(son + 9));
  console.log('  ' + (KONTROL ? 'bulundu   ' : 'geri alindi') + ' ' + dp + ' (N1)');
}
console.log(eksik ? '\nEKSIK DESEN: ' + eksik : '\nhepsi yerinde' + (KONTROL ? ' (yazilmadi)' : '') + ' — sonra: cd yeni && npm run build');
process.exit(eksik ? 1 : 0);
