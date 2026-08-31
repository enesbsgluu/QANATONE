#!/usr/bin/env node
/* FILM · ONCE/SONRA KIYASI — iki olcum kosumunu yan yana koyar.
   Kiyas ancak AYNI KOSULLARDA anlamli: ayni viewport, ayni ag/CPU
   kisitlamasi, ayni supurme penceresi, ayni tekrar sayisi. Betik bunu
   varsaymaz, DOGRULAR: kume adi/ag/film penceresi tutmayan satir
   "kiyaslanamaz" diye isaretlenir, sessizce hizalanmaz.

   Once  : film/olcum/sonuc-oncesi.json  (CRF20 native · mobil 1284x716 ·
           sabit on yukleme sirasi · blob birakilmiyor)
   Sonra : film/olcum/sonuc.json         (CRF28 native · mobil 968x540 ·
           yon/hiz duyarli sira · kayan pencere +-3)
   Kullanim: node yeni/film/kiyas.cjs */
const fs = require('fs');
const path = require('path');

const D = path.join(__dirname, 'olcum');
const oku = (f) => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'));
const A = oku('sonuc-oncesi.json');
const B = oku('sonuc.json');

const harita = (X) => new Map(X.map(({ ozet: o }) => [o.ad, o]));
const ha = harita(A), hb = harita(B);

const ok = (v) => (v === null || v === undefined ? '—' : v);
const fark = (a, b, tersIyi) => {
  if (a === null || b === null || a === undefined || b === undefined) return '—';
  const d = b - a;
  if (d === 0) return '=';
  const iyi = tersIyi ? d > 0 : d < 0;
  const yuzde = a !== 0 ? ` (${d > 0 ? '+' : ''}${((d / a) * 100).toFixed(0)}%)` : '';
  return `${d > 0 ? '+' : ''}${+d.toFixed(1)}${yuzde} ${iyi ? '↓iyi' : '↑kötü'}`;
};

console.log('## İlk kare (medyan, 3 tekrar)\n');
console.log('| küme | ağ | önce | sonra | fark | kapı <1500 ms |');
console.log('|---|---|---:|---:|---|---|');
for (const [ad, b] of hb) {
  const a = ha.get(ad);
  if (!a) { console.log(`| ${ad} | ${b.ag} | (önce yok) | ${b.ilk_kare_ms.medyan} | — | — |`); continue; }
  if (a.ag !== b.ag) { console.log(`| ${ad} | KIYASLANAMAZ ağ ${a.ag}→${b.ag} | | | | |`); continue; }
  const dortG = b.ag !== 'wifi';
  const v = b.ilk_kare_ms.medyan;
  console.log(`| ${ad} | ${b.ag} | ${a.ilk_kare_ms.medyan} ms | **${v} ms** | ${fark(a.ilk_kare_ms.medyan, v)} | ${dortG ? (v < 1500 ? `**GEÇTİ**` : `KALDI`) : '(4G değil)'} |`);
}

console.log('\n## Süpürme\n');
console.log('| küme | süpürme | atlama % ö→s | max boşluk ö→s | hazır varış ö→s | takılma ms ö→s | kare p95 ö→s | uzun görev | CLS | bellek MiB |');
console.log('|---|---|---|---:|---|---:|---:|---|---:|---:|');
for (const [ad, b] of hb) {
  const a = ha.get(ad);
  for (const sb of b.supur) {
    const sa = a && a.supur.find((x) => x.ad === sb.ad);
    if (!sa) { console.log(`| ${ad} | ${sb.ad} | (önce yok) → ${sb.atlama_yuzde} | ${sb.max_bosluk_kare} | ${sb.varis_hazir}/${sb.varis} | ${sb.takilma_toplam_ms} | ${sb.kare_suresi_p95} | ${sb.uzun_gorev_adet}/${sb.uzun_gorev_max_ms} | ${sb.cls} | ${ok(sb.bellek_mib)} |`); continue; }
    if (sa.film_sn !== sb.film_sn || Math.abs(sa.sure_sn - sb.sure_sn) > 0.05) {
      console.log(`| ${ad} | ${sb.ad} | **KIYASLANAMAZ** pencere ${sa.film_sn}/${sa.sure_sn}→${sb.film_sn}/${sb.sure_sn} | | | | | | | |`);
      continue;
    }
    const hazirO = `${sa.varis_hazir}/${sa.varis}`, hazirS = `${sb.varis_hazir}/${sb.varis}`;
    const hazirTam = sb.varis_hazir >= sb.varis;
    console.log(`| ${ad} | ${sb.ad} | ${sa.atlama_yuzde} → **${sb.atlama_yuzde}** ${fark(sa.atlama_yuzde, sb.atlama_yuzde)} | ${sa.max_bosluk_kare} → **${sb.max_bosluk_kare}** | ${hazirO} → **${hazirS}**${hazirTam ? ' ✓' : ''} | ${sa.takilma_toplam_ms} → **${sb.takilma_toplam_ms}** | ${sa.kare_suresi_p95} → **${sb.kare_suresi_p95}** | ${sb.uzun_gorev_adet}/${sb.uzun_gorev_max_ms} | ${sb.cls} | ${ok(sb.bellek_mib)} |`);
  }
}

console.log('\n## Kapı (27 Ağu, üç ölçü)\n');
console.log('| ölçü | eşik | sonuç |');
console.log('|---|---|---|');
let ilk = null, sinir = null, tavan = 0, birak = 0;
for (const [, b] of hb) {
  if (b.ag !== 'wifi') { const v = b.ilk_kare_ms.medyan; ilk = ilk === null ? v : Math.max(ilk, v); }
  for (const s of b.supur) {
    if (s.ad.startsWith('sert')) { const t = s.varis_hazir >= s.varis; sinir = sinir === null ? t : (sinir && t); }
    if (s.bellek_mib != null) tavan = Math.max(tavan, s.bellek_mib);
    if (s.birakilan != null) birak = Math.max(birak, s.birakilan);
  }
}
console.log(`| 4G ilk kare | < 1500 ms | ${ilk} ms — ${ilk !== null && ilk < 1500 ? '**GEÇTİ**' : '**KALDI**'} |`);
console.log(`| savurmada sınır hazırlığı | tam (4/4) | ${sinir ? '**GEÇTİ**' : '**KALDI**'} |`);
console.log(`| bellek tavanı | pencere ±3 | tepe **${tavan} MiB** · bırakılan klip ${birak} |`);
