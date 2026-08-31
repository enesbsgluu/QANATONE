#!/usr/bin/env node
/* FILM · UC TUR YAN YANA — ayni kosullarda (ayni viewport, ag/CPU kisiti,
   supurme penceresi, 3 tekrar, medyan) alinmis uc olcum.
     Tur 1  olcum/sonuc-oncesi.json — CRF20 native · mobil 1284x716 ·
            sabit on yukleme sirasi · blob hic birakilmiyor
     Tur 2  olcum/sonuc-tur2.json   — CRF28 native · mobil 968x540 ·
            sahne1 kirpildi · yon/hiz duyarli sira · kayan pencere +-3
     Tur 3  olcum/sonuc.json        — + sahne1 acilis kopyasi (185 KB) ·
            devralma: klip gercek konuma oturmadan ekrani almaz
   OLCUT DEGISIKLIGI (tur 3, acikca): "hazir varis" artik GOSTERILEN degil
   SCRUB KONUMUNUN sahnesi uzerinden; "sunulan kare" yalniz EKRANDA olan
   kare. Devralma geldikten sonra eski tanim her zaman 'hazir' derdi ve
   yerlesik ama gorunmez komsularin rVFC kareleri bosluğu kirletirdi —
   ikisi de yanlis yesil. Tur 1-2 kayitlarinda gorunurluk alani yok, o
   yuzden onlarda tum kareler sayilir; bu, tur 3 lehine DEGIL aleyhine
   calisir (tur 3 daha kati olculuyor). Satirlarda isaretli.
   Kullanim: node yeni/film/kiyas3.cjs */
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, 'olcum');
const oku = (f) => {
  const y = path.join(D, f);
  if (!fs.existsSync(y)) return null;
  return new Map(JSON.parse(fs.readFileSync(y, 'utf8')).map(({ ozet: o }) => [o.ad, o]));
};
const T = [
  { ad: 'tur 1', h: oku('sonuc-oncesi.json') },
  { ad: 'tur 2', h: oku('sonuc-tur2.json') },
  { ad: 'tur 3', h: oku('sonuc.json') },
].filter((x) => x.h);

const g = (o, yol) => { try { return yol.split('.').reduce((a, k) => a[k], o); } catch { return null; } };
const v = (x) => (x === null || x === undefined ? '—' : x);

console.log('## İlk kare (medyan, 3 tekrar)\n');
console.log('| küme | ağ | ' + T.map((t) => t.ad).join(' | ') + ' | kapı <1500 ms |');
console.log('|---|---|' + T.map(() => '---:').join('|') + '|---|');
for (const ad of T[T.length - 1].h.keys()) {
  const son = T[T.length - 1].h.get(ad);
  const hucre = T.map((t) => {
    const o = t.h.get(ad);
    if (!o) return '—';
    if (o.ag !== son.ag) return 'KIYASLANAMAZ';
    return `${o.ilk_kare_ms.medyan} ms`;
  });
  const dortG = son.ag !== 'wifi';
  const sonV = son.ilk_kare_ms.medyan;
  console.log(`| ${ad} | ${son.ag} | ${hucre.join(' | ')} | ${dortG ? (sonV < 1500 ? '**GEÇTİ**' : '**KALDI**') : '(4G değil)'} |`);
}

const OLC = [
  ['atlama_yuzde', 'atlama %'],
  ['max_bosluk_kare', 'max boşluk (kare)'],
  ['varis_hazir', 'hazır varış'],
  ['takilma_toplam_ms', 'takılma ms'],
  ['kare_suresi_p95', 'kare p95 ms'],
  ['bellek_mib', 'bellek MiB'],
];
console.log('\n## Süpürme\n');
console.log('| küme | süpürme | ölçü | ' + T.map((t) => t.ad).join(' | ') + ' |');
console.log('|---|---|---|' + T.map(() => '---:').join('|') + '|');
for (const ad of T[T.length - 1].h.keys()) {
  const son = T[T.length - 1].h.get(ad);
  for (const s of son.supur) {
    for (const [alan, etiket] of OLC) {
      const hucre = T.map((t) => {
        const o = t.h.get(ad);
        if (!o) return '—';
        const x = o.supur.find((q) => q.ad === s.ad);
        if (!x) return '—';
        if (x.film_sn !== s.film_sn) return 'KIYASLANAMAZ';
        if (alan === 'varis_hazir') return `${v(x.varis_hazir)}/${v(x.varis)}`;
        return v(x[alan]);
      });
      console.log(`| ${ad} | ${s.ad} | ${etiket} | ${hucre.join(' | ')} |`);
    }
  }
}

console.log('\n## Uzun görev / CLS (üç turda da)\n');
for (const t of T) {
  const u = [...t.h.values()].flatMap((o) => o.supur.map((s) => s.uzun_gorev_adet));
  const c = [...t.h.values()].flatMap((o) => o.supur.map((s) => s.cls));
  console.log(`- ${t.ad}: uzun görev toplam ${u.reduce((a, b) => a + b, 0)} · CLS en yüksek ${Math.max(...c)}`);
}

console.log('\n## Kapı — tur 3\n');
const son = T[T.length - 1].h;
let ilk = null, sinir = null, tavan = 0, birak = 0, devir = 0;
for (const [, o] of son) {
  if (o.ag !== 'wifi') { const x = o.ilk_kare_ms.medyan; ilk = ilk === null ? x : Math.max(ilk, x); }
  for (const s of o.supur) {
    if (s.ad.startsWith('sert')) { const t = s.varis_hazir >= s.varis; sinir = sinir === null ? t : (sinir && t); }
    if (s.bellek_mib != null) tavan = Math.max(tavan, s.bellek_mib);
    if (s.birakilan != null) birak = Math.max(birak, s.birakilan);
    if (s.devir != null) devir = Math.max(devir, s.devir);
  }
}
console.log('| ölçü | eşik | sonuç |');
console.log('|---|---|---|');
console.log(`| 4G ilk kare | < 1500 ms | en kötü 4G kümesi **${ilk} ms** — ${ilk !== null && ilk < 1500 ? '**GEÇTİ**' : '**KALDI**'} |`);
console.log(`| savurmada sınır hazırlığı | tam | ${sinir ? '**GEÇTİ**' : '**KALDI**'} |`);
console.log(`| bellek tavanı | pencere ±3 | tepe **${tavan} MiB** · bırakılan ${birak} |`);
const maxB = Math.max(...[...son.values()].filter((o) => o.hat === 'masaustu').flatMap((o) => o.supur.map((s) => s.max_bosluk_kare)));
console.log(`| masaüstü max boşluk | < 10 kare | **${maxB} kare** — ${maxB < 10 ? '**GEÇTİ**' : '**KALDI**'} |`);

console.log('\n## Açılış kopyası (sahne1)\n');
console.log('| küme | açılış ilk kare | tam kopyaya takas | fark |');
console.log('|---|---:|---:|---:|');
for (const [ad, o] of son) {
  const a = o.acilis_ms, k = o.acilis_takas_ms;
  console.log(`| ${ad} | ${v(a)} ms | ${v(k)} ms | ${a != null && k != null ? (k - a) + ' ms' : '—'} |`);
}
