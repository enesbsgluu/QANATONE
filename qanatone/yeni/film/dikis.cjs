#!/usr/bin/env node
/* FILM · DIKIS OLCUMU — 38 dikis, piksel kiyasi (HIGGSFIELD §5 + §8).
   `bounds` ciktilari: dikis/sahneN-last.png  vs  dikis/sahne(N+1)-first.png
   Iki hat olculur:
     encode : bounds ENCODE EDILMIS masaustu klipten (belgenin istedigi)
     ham    : bounds HAM klipten — encode gurultusu ile URETIM dikisini
              ayirmak icin. Ham dikis kotuyse klip zinciri kotudur; yalniz
              encode kotuyse kodlama kotudur.
   Olcut: ffmpeg psnr + ssim (Y ortalamasi) + sharp ile ortalama mutlak
   fark (MAF, 0-255) ve |fark|>24 olan piksel yuzdesi.
   Sinif (ESIK ILK KEZ BURADA KONDU, olcumle gozden gecirilir):
     esit    PSNR >= 35 dB ve SSIM >= 0.95  (encode gurultusu duzeyi)
     yakin   28 <= PSNR < 35                (goz hukmu, Enes)
     SICRAMA PSNR < 28 ya da SSIM < 0.90
   Boyut farkli dikiste (sahne1 1144x804 -> sahne2 1284x716) uc uyum
   denenir ve EN IYISI bildirilir: stretch / cover (olcek+kirp) / contain
   (olcek+pad). Hangisi tutuyorsa sahne2'nin sahne1'den nasil turedigini
   soyler — karar Enes'te, kaydirilmaz.
   Cikti: film/dikis.json + stdout tablo + dikis/kiyas-N.png (yan yana). */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const KOK = __dirname;
const KANON = JSON.parse(fs.readFileSync(path.join(KOK, '..', 'src', 'film', 'kanon.json'), 'utf8'));
const ADET = KANON.klip.length;

const ff = (args) => {
  try { return execFileSync('ffmpeg', ['-v', 'error', '-nostdin', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }); }
  catch (e) { return (e.stdout || '') + (e.stderr || ''); }
};
const olcu = (a, b, uyum) => {
  /* uyum: A'yi B'nin boyutuna getiren filtre (bos = ayni boyut) */
  const gir = uyum ? `[0:v]${uyum}[a];[a][1:v]` : '[0:v][1:v]';
  const p = ff(['-i', a, '-i', b, '-lavfi', `${gir}psnr=stats_file=-`, '-f', 'null', '-']);
  const s = ff(['-i', a, '-i', b, '-lavfi', `${gir}ssim=stats_file=-`, '-f', 'null', '-']);
  const psnr = Number((p.match(/psnr_avg:([\d.inf]+)/) || [])[1]);
  const ssim = Number((s.match(/All:([\d.]+)/) || [])[1]);
  return { psnr: isFinite(psnr) ? +psnr.toFixed(2) : 99, ssim: +ssim.toFixed(4) };
};
async function maf(a, b, uyum, gen, yuk) {
  let A = sharp(a);
  if (uyum === 'cover') A = A.resize(gen, yuk, { fit: 'cover' });
  else if (uyum === 'contain') A = A.resize(gen, yuk, { fit: 'contain', background: '#000' });
  else if (uyum === 'stretch') A = A.resize(gen, yuk, { fit: 'fill' });
  const [x, y] = await Promise.all([
    A.raw().toBuffer({ resolveWithObject: true }),
    sharp(b).raw().toBuffer({ resolveWithObject: true }),
  ]);
  const n = x.info.width * x.info.height, ch = x.info.channels;
  let top = 0, buyuk = 0;
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let c = 0; c < 3; c++) { const d = Math.abs(x.data[i * ch + c] - y.data[i * ch + c]); top += d; if (d > m) m = d; }
    if (m > 24) buyuk++;
  }
  return { maf: +(top / (n * 3)).toFixed(2), buyuk_yuzde: +(100 * buyuk / n).toFixed(2) };
}
const sinif = ({ psnr, ssim }) => (psnr >= 35 && ssim >= 0.95) ? 'esit' : (psnr >= 28 && ssim >= 0.90) ? 'yakin' : 'SICRAMA';

(async () => {
  const sonuc = [];
  for (const hat of ['encode', 'ham']) {
    const kl = path.join(KOK, hat === 'encode' ? 'dikis' : 'dikis-ham');
    for (let n = 1; n < ADET; n++) {
      const a = path.join(kl, `sahne${n}-last.png`), b = path.join(kl, `sahne${n + 1}-first.png`);
      if (!fs.existsSync(a) || !fs.existsSync(b)) { sonuc.push({ hat, dikis: `${n}→${n + 1}`, hata: 'kare yok' }); continue; }
      const [ma, mb] = await Promise.all([sharp(a).metadata(), sharp(b).metadata()]);
      const ayni = ma.width === mb.width && ma.height === mb.height;
      const uyumlar = ayni ? [['ayni', '']] : [
        ['stretch', `scale=${mb.width}:${mb.height}`],
        ['cover', `scale=${mb.width}:-2,crop=${mb.width}:${mb.height}`],
        ['contain', `scale=-2:${mb.height},pad=${mb.width}:${mb.height}:(ow-iw)/2:0`],
      ];
      let enIyi = null;
      for (const [ad, f] of uyumlar) {
        const o = { uyum: ad, ...olcu(a, b, f), ...(await maf(a, b, ad === 'ayni' ? '' : ad, mb.width, mb.height)) };
        if (!enIyi || o.psnr > enIyi.psnr) enIyi = o;
      }
      const r = { hat, dikis: `${n}→${n + 1}`, boyut: `${ma.width}x${ma.height}→${mb.width}x${mb.height}`, ...enIyi, sinif: sinif(enIyi) };
      sonuc.push(r);
      if (hat === 'encode') {
        const kiyas = path.join(kl, `kiyas-${n}.png`);
        const f = ayni ? '[0:v][1:v]hstack' : `[0:v]scale=-2:${mb.height}[a];[a][1:v]hstack`;
        ff(['-y', '-i', a, '-i', b, '-lavfi', f, '-frames:v', '1', kiyas]);
      }
    }
  }
  console.log('| hat | dikiş | boyut | uyum | PSNR dB | SSIM | MAF | >24 % | sınıf |');
  console.log('|---|---|---|---|---:|---:|---:|---:|---|');
  for (const r of sonuc)
    console.log(r.hata ? `| ${r.hat} | ${r.dikis} | — | — | — | — | — | — | ${r.hata} |`
      : `| ${r.hat} | ${r.dikis} | ${r.boyut} | ${r.uyum} | ${r.psnr} | ${r.ssim} | ${r.maf} | ${r.buyuk_yuzde} | ${r.sinif} |`);
  const ozet = {};
  for (const hat of ['encode', 'ham']) {
    const h = sonuc.filter((r) => r.hat === hat && !r.hata);
    ozet[hat] = {
      esit: h.filter((r) => r.sinif === 'esit').length,
      yakin: h.filter((r) => r.sinif === 'yakin').length,
      sicrama: h.filter((r) => r.sinif === 'SICRAMA').map((r) => r.dikis),
      psnr_min: Math.min(...h.map((r) => r.psnr)), psnr_medyan: [...h.map((r) => r.psnr)].sort((a, b) => a - b)[Math.floor(h.length / 2)],
      ssim_min: Math.min(...h.map((r) => r.ssim)),
    };
  }
  console.log('\nÖZET', JSON.stringify(ozet));
  fs.writeFileSync(path.join(KOK, 'dikis.json'), JSON.stringify({
    _: 'yeni/film/dikis.cjs ciktisi — 38 dikis x 2 hat (encode/ham). Esikler dosya basinda.',
    olcum: new Date().toISOString(), esik: { esit: 'PSNR>=35 & SSIM>=0.95', yakin: 'PSNR>=28 & SSIM>=0.90' },
    ozet, dikis: sonuc,
  }, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
