#!/usr/bin/env node
/* YUK / KARE EGRISI — YUK_KAPI'nin degeri UYDURULMAZ, OLCULUR.
   (6 Eyl 2026. Sebep: kapi degeri once "tek kanit noktasinin altina"
   diye 0,5 kondu, sonra olculdu ki bu makinenin SESSIZ hali bile 0,37-0,64
   cekirdek yabanci yuk tasiyor — yani 0,5 kapisi sessiz makinenin yarisini
   hukumsuz yapardi. Kapi birimi mutlak olmali AMA degeri de olculmeli.)

   YONTEM: tek sayfa, TEKRAR=3, ayni agac, ayni tarayici; tek degisken
   BOZ_YUK (bilinen buyuklukte yabanci yuk, kesirli). Her doz icin olculen
   YABANCI CEKIRDEK ile p95/kacirilan kare yan yana yazilir. Kapi, karenin
   hala bozulmadigi en yuksek yuk ile bozuldugu en dusuk yuk ARASINA konur.

   Kullanim: node yeni/film/olc-yuk-tarama.cjs   (once: node yerel-sun.cjs)
   Cevre  : SAYFA=/hizmetler/geo/ · DOZ=0,0.5,1,2,4 · TEKRAR=3 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SAYFA = process.env.SAYFA || '/hizmetler/geo/';
const DOZ = (process.env.DOZ || '0,0.5,1,2,4').split(',').map(Number);
const TEKRAR = process.env.TEKRAR || '3';
const ARAC = path.join(__dirname, 'olc-sayfa.cjs');
const satir = [];

for (const d of DOZ) {
  const cikti = `olc-yuk-doz-${String(d).replace('.', 'v')}.json`;
  const cevre = {
    ...process.env, SAYFA, TEKRAR, CIKTI: cikti, DEVAM: '1',
    YUK_KAPI: '99',                      /* TARAMADA KAPI KAPALI: olculen sey
                                            kapinin kendisi, kapi hukum vermez */
  };
  if (d > 0) cevre.BOZ_YUK = String(d); else delete cevre.BOZ_YUK;
  try { execFileSync(process.execPath, [ARAC], { env: cevre, stdio: 'ignore', timeout: 900000 }); } catch (e) {}
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, cikti), 'utf8'));
  const s = j.sayfa[0];
  satir.push({
    doz: d,
    yabanci: s.yuk.yabanci_cekirdek_medyan,
    yabanci_kosumlar: s.yuk.yabanci_cekirdek_kosumlar,
    rig: s.yuk.rig_cekirdek_medyan,
    sistem: s.yuk.sistem_cekirdek_medyan,
    p95: s.p95_medyan,
    p95_kosumlar: s.kosum.map((k) => k.p95_ms),
    tik: j.tazeleme.tik_ms,
    kare_p95: s.kare_p95,
    kacirilan: s.kacirilan_kare,
    taban_tik_p10: s.kosum.map((k) => k.taban.tik_p10),
    tik_sapma: s.tik_sapma,
    tek_takilma: s.takilma_tek_max,
  });
  const r = satir[satir.length - 1];
  console.log(`doz ${String(d).padStart(4)} → yabanci ${String(r.yabanci).padStart(6)} cekirdek · p95 ${String(r.p95).padStart(5)} ms = ${r.kare_p95.toFixed(2)} tik → KACIRILAN ${r.kacirilan} · tek takilma ${r.tek_takilma} ms · taban tik ${r.taban_tik_p10.join('/')}`);
}

const cikti = path.join(__dirname, process.env.TARAMA_CIKTI || 'olc-yuk-tarama.json');
fs.writeFileSync(cikti, JSON.stringify({
  _: 'YUK / KARE egrisi — YUK_KAPI degerinin olculmus dayanagi. Tek degisken BOZ_YUK; kapi taramada kapali (YUK_KAPI=99).',
  sayfa: SAYFA, tekrar: TEKRAR, olcum: new Date().toISOString(), satir,
}, null, 1));
console.log(`\n→ ${cikti}`);
