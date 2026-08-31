#!/usr/bin/env node
/* KAYNAK KARE HIZI ADAY MATRISI (1 Eyl 2026, Enes) — bayt + PSNR + SSIM.
   Amac: 4G'de talep (tavan 2'de ~15 Mbit) hattin (12 Mbit) ustunde; bayti
   dusurmek. Adaylar 12/15/18 fps (Enes) + GOP kaldiraci (ilk uc-nokta
   deneyi: sahne34'te kazancin YARISI GOP'tan geldi — 12fps/g4 %8,7 ·
   24fps/g16 %9,0 · 12fps/g8 %17,2).
   ZINCIR URETIMLE BIREBIR (scroll-scrub-video.sh desktop): 4K kaynak,
   fps=X (varsa), scale=-2:1080 lanczos, unsharp, x264 slow CRF 24.
   PSNR/SSIM: aday ciktisi vs AYNI filtre zincirinden gecmis ham kaynak
   (encode oncesi) — kareler bire bir hizali, olculen sey codec kaybi.
   (Dikis dersi: olcut sayfanin gosterdigi zincirle ayni olmali; mutlak
   PSNR tek basina hukum vermez, 24fps referans satiri ayni yontemle.)
   Kullanim: node yeni/film/karehizi-aday.cjs
   Cikti: yeni/film/karehizi-aday.json + karehizi/*.mp4 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const KAYNAK = 'C:/Users/Monster/Desktop/QANATONE SAHNELER 4K';
const CIKD = path.join(__dirname, 'karehizi');
const CIKTI = path.join(__dirname, 'karehizi-aday.json');
/* temsili klipler: en agir (34), duz kamera akisi (3), orta agirlik (16) */
const KLIPLER = ['sahne34', 'sahne3', 'sahne16'];
/* adaylar: ad · fps (0 = kaynak 24) · gop */
const ADAYLAR = [
  { ad: '24-g8', fps: 0, g: 8 },        /* REFERANS: bugunku uretim */
  { ad: '18-g6', fps: 18, g: 6 },       /* GOP suresi 1/3 s sabit */
  { ad: '15-g5', fps: 15, g: 5 },
  { ad: '12-g4', fps: 12, g: 4 },
  { ad: '24-g16', fps: 0, g: 16 },      /* yalniz GOP kaldiraci */
  { ad: '12-g8', fps: 12, g: 8 },       /* iki kaldirac birden (GOP 0,67 s) */
];

const filtre = (fps) => `${fps ? `fps=${fps},` : ''}scale=-2:1080:flags=lanczos,unsharp=5:5:0.8:5:5:0.0`;
const ff = (args) => spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8' });

fs.mkdirSync(CIKD, { recursive: true });
const S = { _: 'yeni/film/karehizi-aday.cjs — fps/GOP aday matrisi; PSNR/SSIM ayni filtre zincirli kaynaga karsi', olcum: new Date().toISOString(), crf: 24, klipler: {} };

for (const klip of KLIPLER) {
  const kaynak = path.join(KAYNAK, `${klip}.mp4`);
  S.klipler[klip] = {};
  for (const a of ADAYLAR) {
    const cikti = path.join(CIKD, `${klip}-${a.ad}.mp4`);
    if (!fs.existsSync(cikti)) {
      const r = ff(['-i', kaynak, '-an', '-vf', filtre(a.fps),
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p',
        '-g', String(a.g), '-keyint_min', String(a.g), '-sc_threshold', '0',
        '-movflags', '+faststart', cikti]);
      if (r.status !== 0) { console.error(klip, a.ad, r.stderr); continue; }
    }
    /* PSNR + SSIM tek geciste: kaynak ayni filtreden gecer, split ile
       iki karsilastirmaya dagitilir */
    const p2 = spawnSync('ffmpeg', ['-v', 'info', '-i', cikti, '-i', kaynak, '-lavfi',
      `[0:v]split=2[a1][a2];[1:v]${filtre(a.fps)},split=2[r1][r2];[a1][r1]psnr;[a2][r2]ssim`,
      '-f', 'null', '-'], { encoding: 'utf8' });
    const err = p2.stderr || '';
    const psnr = +(/average:([\d.]+)/.exec(err)?.[1] || 0);
    const ssim = +(/All:([\d.]+)/.exec(err)?.[1] || 0);
    const bayt = fs.statSync(cikti).size;
    S.klipler[klip][a.ad] = { bayt, mib: +(bayt / 1048576).toFixed(2), psnr, ssim };
    console.log(`${klip} ${a.ad}\t${(bayt / 1048576).toFixed(2)} MiB\tPSNR ${psnr}\tSSIM ${ssim}`);
  }
  /* referansa oranlar */
  const ref = S.klipler[klip]['24-g8'];
  for (const a of ADAYLAR) {
    const v = S.klipler[klip][a.ad];
    if (v && ref) v.oran = +(v.bayt / ref.bayt).toFixed(3);
  }
}
fs.writeFileSync(CIKTI, JSON.stringify(S, null, 1));
console.log(`→ ${CIKTI}`);
