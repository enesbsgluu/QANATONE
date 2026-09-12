#!/usr/bin/env node
/* FILM · 39 KLIP KONTAK SAYFASI (31 Agu 2026, KESIT turu 1. adim)
   Kesit sekiz sahneyi ADIYLA degil ICERIGIYLE secmek zorunda: DEVIR
   spesifikasyonundaki anlati sirasi 33 kalem, klip 39 — bazi kalemler
   birden fazla klibe yayiliyor, yani "3. kalem = sahne3" DEGIL. Hangi
   klipte ne oldugu goruntuden okunur.

   Her klipten UC kare: %10, %50, %90. Tek kare hareketin yonunu
   gostermiyor (klip icinde kamera yer degistiriyor); uc kare "nereden
   nereye" sorusunu cevapliyor.

   Cikti: film/kontak/kontak39-A.png ... -D.png (10 klip/sayfa)
   Kullanim: node yeni/film/kontak39.cjs */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');

const VARLIK = path.join(__dirname, '..', 'public', 'varlik', 'film');
const GECICI = path.join(__dirname, '.kontak39');
const CIKTI = path.join(__dirname, 'kontak');
const KANON = require('../src/film/kanon.json');
fs.mkdirSync(GECICI, { recursive: true });
fs.mkdirSync(CIKTI, { recursive: true });

const G = 300, Y = 169;                 /* kucuk resim */
const ETIKET = 26;                      /* satir basligi yuksekligi */
const BOSLUK = 6;
const SUTUN = 3;                        /* %10 · %50 · %90 */
const SATIR_SAYFA = 10;

const kare = (n, oran, cikis) => {
  const k = KANON.klip.find((x) => x.n === n);
  const t = ((k.kare - 1) * oran) / KANON.fps;   /* kare BASLANGICI: -ss PTS>=t verir */
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i',
    path.join(VARLIK, `sahne${n}.mp4`), '-frames:v', '1', '-vf', `scale=${G}:${Y}`, cikis]);
  return cikis;
};

const yaziSvg = (metin, g, y, boyut = 18) => Buffer.from(
  `<svg width="${g}" height="${y}"><rect width="${g}" height="${y}" fill="#0b0b0b"/>` +
  `<text x="8" y="${Math.round(y * 0.72)}" font-family="DejaVu Sans, Arial" font-size="${boyut}" fill="#f2f2f2">${metin}</text></svg>`);

(async () => {
  const sayfaGen = SUTUN * G + (SUTUN + 1) * BOSLUK;
  let sayfa = 0;
  for (let bas = 0; bas < KANON.klip.length; bas += SATIR_SAYFA) {
    const kume = KANON.klip.slice(bas, bas + SATIR_SAYFA);
    const sayfaYuk = kume.length * (Y + ETIKET + BOSLUK) + BOSLUK;
    const kat = [];
    for (let i = 0; i < kume.length; i++) {
      const k = kume[i];
      const ust = BOSLUK + i * (Y + ETIKET + BOSLUK);
      kat.push({ input: yaziSvg(`sahne${k.n}   ${k.sure.toFixed(2)} sn   ${k.kare} kare`, sayfaGen, ETIKET), top: ust, left: 0 });
      const oranlar = [0.1, 0.5, 0.9];
      for (let j = 0; j < SUTUN; j++) {
        const p = kare(k.n, oranlar[j], path.join(GECICI, `s${k.n}-${j}.png`));
        kat.push({ input: p, top: ust + ETIKET, left: BOSLUK + j * (G + BOSLUK) });
      }
      process.stderr.write(`  sahne${k.n}      \r`);
    }
    const ad = path.join(CIKTI, `kontak39-${'ABCD'[sayfa]}.png`);
    await sharp({ create: { width: sayfaGen, height: sayfaYuk, channels: 3, background: '#141414' } })
      .composite(kat).png().toFile(ad);
    console.log(`→ ${ad}  (sahne${kume[0].n}–${kume[kume.length - 1].n})`);
    sayfa++;
  }
  fs.rmSync(GECICI, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
