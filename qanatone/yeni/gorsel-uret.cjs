#!/usr/bin/env node
/* yeni/gorsel-uret.cjs — hero el gorsellerinin mobil varyantlarini uretir.
   Neden ayri betik: kaynak gorsel kokte (img/), yeni site kendi alaninda
   (yeni/public/img/) kendi kendine yetmeli — Faz 4 kesmesinde kok yeni
   ciktiya doner. Elle olcek verilmez: mobil genislik CSS kutusundan
   turetilir (kural 109: cozulmus bitmap <= 2x CSS kutusu).

     .sus-el-h  mobilde 57vw · 430px ekranda 245 CSS px -> 512 varyant (2,09x)
     .sus-el-r  mobilde 64vw · 430px ekranda 275 CSS px -> 560 varyant (2,04x)

   Masaustu (33vw) icin kaynak boyut aynen tasinir; 1440px ekranda kutu
   475 CSS px, robot eli 1244 = 2,6x — masaustu tarafi mobil sozlesmesinin
   disinda (Anayasa madde 4 "(pointer:coarse) tarafinda").

   Kosum:  node gorsel-uret.cjs      (yeni/ icinde, sharp yeni/node_modules'te)  */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const KAYNAK = path.join(__dirname, '..', 'img');
const HEDEF = path.join(__dirname, 'public', 'img');
fs.mkdirSync(HEDEF, { recursive: true });

/* mobil varyant genisligi yukaridaki CSS kutusu hesabindan gelir */
const ISLER = [
  { ad: 'hand-human', mobil: 512 },
  { ad: 'hand-robot', mobil: 560 },
];

const kb = n => (n / 1024).toFixed(1) + ' KB';

(async () => {
  for (const is of ISLER) {
    /* masaustu: kaynak dosyalar oldugu gibi tasinir — yeniden kodlama
       nesil kaybi demek, kazanci yok. */
    for (const uzanti of ['webp', 'avif']) {
      const k = path.join(KAYNAK, `${is.ad}.${uzanti}`);
      const h = path.join(HEDEF, `${is.ad}.${uzanti}`);
      fs.copyFileSync(k, h);
      console.log(`  = ${is.ad}.${uzanti}  ${kb(fs.statSync(h).size)}`);
    }
    /* mobil: webp kaynagindan olcekle (avif kaynak zaten kayipli) */
    const giris = path.join(KAYNAK, `${is.ad}.webp`);
    const meta = await sharp(giris).metadata();
    const olcek = sharp(giris).resize({ width: is.mobil, withoutEnlargement: true });
    const wp = path.join(HEDEF, `${is.ad}-m.webp`);
    const av = path.join(HEDEF, `${is.ad}-m.avif`);
    await olcek.clone().webp({ quality: 76, effort: 6 }).toFile(wp);
    await olcek.clone().avif({ quality: 52, effort: 6 }).toFile(av);
    console.log(`  + ${is.ad}-m  ${meta.width}x${meta.height} -> ${is.mobil}w` +
                `  webp ${kb(fs.statSync(wp).size)} · avif ${kb(fs.statSync(av).size)}`);
  }
})();
