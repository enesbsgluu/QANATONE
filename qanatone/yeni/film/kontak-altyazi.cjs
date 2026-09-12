#!/usr/bin/env node
/* ALTYAZI TEMASI · KONTAK (4 Eyl 2026) — sadakat kurali: yan yana kare.
   Sol: onceki yapi (git HEAD'deki kontak-soz/blokNN.jpg — alt bant, sol
   ust kunye). Sag: yeni yapi (olc-soz.cjs'nin az once yazdigi ayni blok).
   Iki kadraj AYRI AYRI (talimat): KOYU (blok 1, dag) ve ACIK (blok 16,
   uzaydan dunya). Hukum burada verilmez — Enes gozle karar verir.
   Kullanim: node yeni/film/kontak-altyazi.cjs   (once olc-soz.cjs kosmus olmali) */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require(path.join(__dirname, '..', 'node_modules', 'sharp'));

const KONTAK = path.join(__dirname, 'kontak-soz');
const SECIM = [{ ad: 'koyu', blok: 1 }, { ad: 'acik', blok: 16 }];
const BASLIK = 44;
const kacis = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const etiket = (gen, yuk, sol, sag) => Buffer.from(`<svg width="${gen}" height="${yuk}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0b0b0c"/>
  <text x="14" y="${Math.round(yuk * 0.66)}" font-family="Consolas,monospace" font-size="${Math.round(yuk * 0.46)}" fill="#e8e6e3">${kacis(sol)}</text>
  <text x="${gen - 14}" y="${Math.round(yuk * 0.66)}" text-anchor="end" font-family="Consolas,monospace" font-size="${Math.round(yuk * 0.4)}" fill="#ff4d63">${kacis(sag)}</text>
</svg>`);

(async () => {
  for (const s of SECIM) {
    const ad = `blok${String(s.blok).padStart(2, '0')}.jpg`;
    const eski = execFileSync('git', ['show', `HEAD:qanatone/yeni/film/kontak-soz/${ad}`], { cwd: path.join(__dirname, '..', '..', '..'), maxBuffer: 1 << 26 });
    const yeniY = path.join(KONTAK, ad);
    if (!fs.existsSync(yeniY)) throw new Error(`${yeniY} yok — once olc-soz.cjs`);
    const em = await sharp(eski).metadata(); const ym = await sharp(yeniY).metadata();
    const yuk = Math.min(em.height, ym.height);
    const sol = await sharp(eski).resize({ height: yuk }).toBuffer();
    const sag = await sharp(yeniY).resize({ height: yuk }).toBuffer();
    const gs = (await sharp(sol).metadata()).width, gg = (await sharp(sag).metadata()).width;
    const gen = gs + 6 + gg;
    const cikti = path.join(KONTAK, `yanyana-${s.ad}.png`);
    await sharp({ create: { width: gen, height: yuk + BASLIK, channels: 3, background: '#0b0b0c' } })
      .composite([
        { input: etiket(gen, BASLIK, `blok ${s.blok} · ${s.ad.toUpperCase()} kadraj — SOL: onceki (alt bant + sol ust kunye)  |  SAG: altyazi temasi (kunye · cizgi · satir maskesi · perde)`, new Date().toISOString().slice(0, 10)), top: 0, left: 0 },
        { input: sol, top: BASLIK, left: 0 },
        { input: sag, top: BASLIK, left: gs + 6 },
      ]).png({ compressionLevel: 9 }).toFile(cikti);
    console.log(`${cikti} (${gen}x${yuk + BASLIK})`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
