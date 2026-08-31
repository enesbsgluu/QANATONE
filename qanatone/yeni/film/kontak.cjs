#!/usr/bin/env node
/* FILM · KONTAK SAYFASI — taban.json'un GERCEK-SICRAMA dedigi dikisler icin
   son kare / ilk kare yan yana. Hukum burada verilmez; Enes gozle karar
   verir (sadakat kurali: yan yana kare + fark listesi, goz karari
   baglayicidir, cizilmez).

   KAYNAK: film/dikis/ altindaki sinir kareleri — ENCODE EDILMIS masaustu
   klipten (uret.cjs `bounds`), yani yayina gidecek halin kendisi. Ham
   klipten degil: izleyicinin gordugu kare olculur.

   CIKTI:
     film/kontak/kontak-sicrama.png   tek sayfa, 8 satir, etiketli
     film/kontak/dikis-N-N1.png       her dikis tam cozunurlukte, ayri
   Kullanim: node yeni/film/kontak.cjs */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIKIS = path.join(__dirname, 'dikis');
const CIKTI = path.join(__dirname, 'kontak');
const T = JSON.parse(fs.readFileSync(path.join(__dirname, 'taban.json'), 'utf8'));

const SATIR_GEN = 1800;      /* kontak sayfasi genisligi */
const BASLIK = 46;           /* satir basligi yuksekligi */
const BOSLUK = 10;

const kacis = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function etiket(gen, yuk, sol, sag) {
  const svg = `<svg width="${gen}" height="${yuk}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0b0b0c"/>
  <text x="14" y="${Math.round(yuk * 0.68)}" font-family="Consolas,monospace" font-size="${Math.round(yuk * 0.5)}" fill="#e8e6e3">${kacis(sol)}</text>
  <text x="${gen - 14}" y="${Math.round(yuk * 0.68)}" text-anchor="end" font-family="Consolas,monospace" font-size="${Math.round(yuk * 0.44)}" fill="#c8302f">${kacis(sag)}</text>
</svg>`;
  return Buffer.from(svg);
}

(async () => {
  fs.mkdirSync(CIKTI, { recursive: true });
  const sicrama = T.dikis.filter((d) => d.hukum === 'GERCEK-SICRAMA');
  if (!sicrama.length) { console.log('gercek sicrama yok'); return; }

  const satirlar = [];
  for (const d of sicrama) {
    const [a, b] = d.dikis.split('→').map(Number);
    const solY = path.join(DIKIS, `sahne${a}-last.png`);
    const sagY = path.join(DIKIS, `sahne${b}-first.png`);
    if (!fs.existsSync(solY) || !fs.existsSync(sagY)) { console.warn('kare yok: ' + d.dikis); continue; }

    /* --- tam cozunurluklu ayri dosya --- */
    const ms = await sharp(solY).metadata();
    const mg = await sharp(sagY).metadata();
    const yuk = Math.min(ms.height, mg.height);
    const solTam = await sharp(solY).resize({ height: yuk }).toBuffer();
    const sagTam = await sharp(sagY).resize({ height: yuk }).toBuffer();
    const gs = (await sharp(solTam).metadata()).width;
    const gg = (await sharp(sagTam).metadata()).width;
    const tamGen = gs + 4 + gg;
    await sharp({ create: { width: tamGen, height: yuk + BASLIK, channels: 3, background: '#0b0b0c' } })
      .composite([
        { input: etiket(tamGen, BASLIK, `sahne${a} SON KARE  |  sahne${b} ILK KARE`, `PSNR ${d.psnr} dB · taban ${d.taban} dB · delta ${d.delta} dB`), top: 0, left: 0 },
        { input: solTam, top: BASLIK, left: 0 },
        { input: sagTam, top: BASLIK, left: gs + 4 },
      ]).png().toFile(path.join(CIKTI, `dikis-${a}-${b}.png`));

    /* --- kontak satiri --- */
    const yariGen = Math.floor((SATIR_GEN - 4) / 2);
    const sol = await sharp(solY).resize({ width: yariGen }).toBuffer();
    const sag = await sharp(sagY).resize({ width: yariGen }).toBuffer();
    const sy = (await sharp(sol).metadata()).height;
    const gy = (await sharp(sag).metadata()).height;
    const ky = Math.max(sy, gy);
    const satir = await sharp({ create: { width: SATIR_GEN, height: ky + BASLIK, channels: 3, background: '#0b0b0c' } })
      .composite([
        { input: etiket(SATIR_GEN, BASLIK, `sahne${a} son  →  sahne${b} ilk`, `Δ ${d.delta} dB  (PSNR ${d.psnr} / taban ${d.taban})`), top: 0, left: 0 },
        { input: sol, top: BASLIK, left: 0 },
        { input: sag, top: BASLIK, left: yariGen + 4 },
      ]).png().toBuffer();
    satirlar.push({ buf: satir, yuk: ky + BASLIK, dikis: d.dikis });
    console.log(`dikis ${d.dikis}: delta ${d.delta} dB`);
  }

  const toplamYuk = satirlar.reduce((a, s) => a + s.yuk + BOSLUK, 0) + 64;
  const bas = `QANATONE PROLOG · GERCEK SICRAMA KONTAK SAYFASI · ${satirlar.length} dikis · encode edilmis masaustu hattindan`;
  await sharp({ create: { width: SATIR_GEN, height: toplamYuk, channels: 3, background: '#0b0b0c' } })
    .composite([
      { input: etiket(SATIR_GEN, 64, bas, `${new Date().toISOString().slice(0, 10)}`), top: 0, left: 0 },
      ...satirlar.map((s, i) => ({ input: s.buf, top: 64 + satirlar.slice(0, i).reduce((a, x) => a + x.yuk + BOSLUK, 0), left: 0 })),
    ]).png({ compressionLevel: 9 }).toFile(path.join(CIKTI, 'kontak-sicrama.png'));

  const b = fs.statSync(path.join(CIKTI, 'kontak-sicrama.png')).size;
  console.log(`\nkontak sayfasi: film/kontak/kontak-sicrama.png (${(b / 1048576).toFixed(2)} MiB, ${SATIR_GEN}x${toplamYuk})`);
  console.log(`ayri dosyalar : film/kontak/dikis-*.png (${satirlar.length} adet, tam cozunurluk)`);
})();
