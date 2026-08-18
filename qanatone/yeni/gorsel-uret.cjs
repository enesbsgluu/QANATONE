#!/usr/bin/env node
/* yeni/gorsel-uret.cjs — gocun gorsel varliklarini uretir (hero elleri +
   S-T seridinin arac logolari).
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

/* --- S-T seridi: 'Powered by' arac logolari ---------------------------
   Kaynak PNG'ler 72 px yuksek (koyu temaya gore islenmis, alfa kanalli).
   CSS kutusu `clamp(24px,3vw,34px)`: mobilde 24 px'e, masaustunde 34 px'e
   oturur. Kural 109 (cozulmus bitmap <= 2x CSS kutusu) iki varyant
   gerektiriyor — tek 72 px kaynak mobilde 3x eder:
     mobil (<=760px)  kutu 24 px -> 48 px kaynak (2,0x)
     masaustu          kutu 34 px -> 68 px kaynak (2,0x)
   Bicim webp: PNG'ler alfa tasiyor, ayni alfayla webp ucta ucuza gelir.
   SIRA KAYNAKTAN: eski renderTicker'in dizisi neyse o (alfabetik degil).
   Olculer ELLE YAZILMAZ — bu betik `src/veri/serit-logolari.json`
   uretir, bilesen onu okur; yukseklik degisirse iki taraf birlikte
   degisir, width/height bayatlamaz. */
const LOGOLAR = [
  ['openai', 'OpenAI'], ['claude', 'Claude'], ['gemini', 'Gemini'],
  ['antigravity', 'Google Antigravity'], ['notebooklm', 'NotebookLM'],
  ['kimi', 'Kimi'], ['vercel', 'Vercel'], ['python', 'Python'],
  ['higgsfield', 'Higgsfield'],
];
const LOGO_KAYNAK = path.join(KAYNAK, 'powered');
const LOGO_HEDEF = path.join(HEDEF, 'powered');
const KUNYE = path.join(__dirname, 'src', 'veri', 'serit-logolari.json');

async function logolar() {
  fs.mkdirSync(LOGO_HEDEF, { recursive: true });
  fs.mkdirSync(path.dirname(KUNYE), { recursive: true });
  const kunye = [];
  let kaynakToplam = 0, mobilToplam = 0, masaToplam = 0;
  for (const [ad, etiket] of LOGOLAR) {
    const giris = path.join(LOGO_KAYNAK, `${ad}.png`);
    const meta = await sharp(giris).metadata();
    kaynakToplam += fs.statSync(giris).size;
    for (const [ek, yuk] of [['-m', 48], ['', 68]]) {
      const cikis = path.join(LOGO_HEDEF, `${ad}${ek}.webp`);
      await sharp(giris).resize({ height: yuk, withoutEnlargement: true })
        .webp({ quality: 82, effort: 6, alphaQuality: 90 }).toFile(cikis);
      const b = fs.statSync(cikis).size;
      if (ek === '-m') mobilToplam += b; else masaToplam += b;
    }
    const m = await sharp(path.join(LOGO_HEDEF, `${ad}.webp`)).metadata();
    kunye.push({ ad, etiket, w: m.width, h: m.height });
    console.log(`  + powered/${ad}  ${meta.width}x${meta.height} png -> ${m.width}x${m.height} webp`);
  }
  fs.writeFileSync(KUNYE, JSON.stringify(kunye, null, 2) + '\n');
  console.log(`  = logolar: kaynak ${kb(kaynakToplam)} · mobil ${kb(mobilToplam)}` +
              ` · masaustu ${kb(masaToplam)} · künye ${path.relative(__dirname, KUNYE)}`);
}

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
  await logolar();
})();
