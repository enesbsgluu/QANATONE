#!/usr/bin/env node
/* KESIT · DIKIS KONTAK SAYFASI (31 Agu 2026)
   Yedi dikisin sinir kareleri yan yana. Hukum burada verilmez — sadakat
   kurali: yan yana kare + fark listesi, goz karari baglayici, cizilmez.
   YENI dogan dikisler etikette isaretlenir.

   KARE ZAMANI: kare i'nin zamani i/FPS (kare ORTASI DEGIL). `-ss` girdi
   aramasi PTS >= t olan ilk kareyi verir; ortadan istenirse SON kare hic
   gelmez. Bu tuzak gecen turda isirdi.

   Cikti: film/kontak/kesit-dikisler.png
   Kullanim: node yeni/film/kesit-dikis-kontak.cjs */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');

const VARLIK = path.join(__dirname, '..', 'public', 'varlik', 'film');
const GECICI = path.join(__dirname, '.kesit-kontak');
const CIKTI = path.join(__dirname, 'kontak');
const KANON = require('../src/film/kanon.json');
const KESIT = require('./' + (process.env.KESIT || 'kesit.json'));
fs.mkdirSync(GECICI, { recursive: true });
fs.mkdirSync(CIKTI, { recursive: true });

const FPS = KANON.fps;
const kareSayisi = (ad) => KANON.klip.find((k) => `sahne${k.n}` === ad).kare;
const G = 440, Y = 248, ETIKET = 30, BOSLUK = 8;

/* durak icin: kirpilan araligin ILK ve SON kare indisi */
const uclar = (d) => {
  const K = kareSayisi(d.kaynak);
  const bas = Math.round((d.aralik[0] || 0) * FPS);
  const son = d.aralik[1] == null ? K - 1 : Math.min(K - 1, Math.round(d.aralik[1] * FPS) - 1);
  return { bas, son, K };
};

const cek = (ad, kareNo, cikis) => {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(kareNo / FPS), '-i',
    path.join(VARLIK, `${ad}.mp4`), '-frames:v', '1', '-vf', `scale=${G}:${Y}`, cikis]);
  return cikis;
};

const yazi = (metin, g, y, renk = '#f2f2f2') => Buffer.from(
  `<svg width="${g}" height="${y}"><rect width="${g}" height="${y}" fill="#0b0b0b"/>` +
  `<text x="8" y="${Math.round(y * 0.7)}" font-family="DejaVu Sans, Arial" font-size="17" fill="${renk}">${metin}</text></svg>`);

(async () => {
  const D = KESIT.durak;
  const satirlar = [];
  for (let i = 0; i < D.length - 1; i++) {
    const a = D[i], b = D[i + 1];
    const ua = uclar(a), ub = uclar(b);
    const yeni = KESIT.yeni_dikisler.includes(`${a.n}|${b.n}`);
    satirlar.push({
      etiket: `${a.n}|${b.n}   ${a.kaynak}@kare${ua.son} (son)  →  ${b.kaynak}@kare${ub.bas} (ilk)` +
        `   ${yeni ? '★ YENI DIKIS (kesitin dogurdugu)' : 'orijinal komsu'}`,
      renk: yeni ? '#ef233c' : '#9a9a9a',
      sol: cek(a.kaynak, ua.son, path.join(GECICI, `d${i}-a.png`)),
      sag: cek(b.kaynak, ub.bas, path.join(GECICI, `d${i}-b.png`)),
    });
    process.stderr.write(`  dikis ${a.n}|${b.n}    \r`);
  }
  const gen = 2 * G + 3 * BOSLUK;
  const yuk = satirlar.length * (Y + ETIKET + BOSLUK) + BOSLUK;
  const kat = [];
  satirlar.forEach((s, i) => {
    const ust = BOSLUK + i * (Y + ETIKET + BOSLUK);
    kat.push({ input: yazi(s.etiket, gen, ETIKET, s.renk), top: ust, left: 0 });
    kat.push({ input: s.sol, top: ust + ETIKET, left: BOSLUK });
    kat.push({ input: s.sag, top: ust + ETIKET, left: BOSLUK * 2 + G });
  });
  const ad = path.join(CIKTI, process.env.KONTAK || 'kesit-dikisler.png');
  await sharp({ create: { width: gen, height: yuk, channels: 3, background: '#141414' } })
    .composite(kat).png().toFile(ad);
  console.log(`→ ${ad}`);
  fs.rmSync(GECICI, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
