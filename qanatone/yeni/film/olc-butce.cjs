#!/usr/bin/env node
/* FILM · BUTCE KALDIRAC OLCUMU (31 Agu 2026, PROLOG-ISKELET 2. adim)
   SORU: masaustu hat 238,3 MiB, butce 32 MiB. Hangi kaldirac ne kadar
   kazandiriyor? Tahminle degil, gercek encode ile.

   NEDEN YENI TARAMA: film/crf-tarama2.cjs 27 Agu'da kosdu ama o gun hat
   720p KAYNAKTAN (native 1284x716) uretiliyordu. Bugunku hat 4K kaynaktan
   `scale=-2:1080`. Eski tablonun "native" sutunu bugunku hattin adi bile
   degil; sayilari tasimak yanlis yesil olur.

   YONTEM
   - Ornek: 5 klip (13,16,22,27,34) — crf-tarama2 ile AYNI ornek, kiyas
     surebilsin diye. Temsil orani ORNEGIN GERCEK PAYINDAN hesaplanir
     (ornek_bayt / hat_bayt), varsayilmaz.
   - Taban aday YENIDEN ENCODE EDILMEZ: diskteki uretim ciktisi olculur.
     Boylece "taban" gercekten yayindaki dosyadir.
   - Her aday tek kaldiraci oynatir; birlesik aday en sonda, butceye
     gercekten inen bir hat var mi diye.
   - Kalite: taban ciktiya gore PSNR + SSIM (ffmpeg). Referans TABAN,
     kaynak degil: soru "tabandan ne kadar kaybettim".
   - GOP adaylarinda ayrica ANAHTAR KARE SAYISI ffprobe ile dogrulanir
     (`-g` yazmak keyframe uretildigi anlamina gelmez; sessiz no-op
     tuzagi — dikis-olcum tuzaklari #2).

   Cikti: film/olc-butce.json
   Kullanim: node yeni/film/olc-butce.cjs */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const KOK = path.join(__dirname, '..', '..');
const KAYNAK = path.join(process.env.USERPROFILE, 'Desktop', 'QANATONE SAHNELER 4K');
const VARLIK = path.join(__dirname, '..', 'public', 'varlik', 'film');
const GECICI = path.join(__dirname, 'butce-gecici');
const CIKTI = path.join(__dirname, 'olc-butce.json');
const KANON = require('../src/film/kanon.json');

const ORNEK = [13, 16, 22, 27, 34];
const BUTCE = 32 * 1048576;

/* Uretim hattinin masaustu satiri (scroll-scrub-video.sh `desktop`):
   scale=-2:1080 lanczos + unsharp, libx264 preset slow, crf 24, g 8. */
const VF = (yuk) => `scale=-2:${yuk}:flags=lanczos,unsharp=5:5:0.8:5:5:0.0`;

const ADAY = [
  { ad: 'taban (yayindaki: 1080p crf24 gop8)', kaldirac: '—', yuk: 1080, crf: 24, gop: 8, diskten: true },
  { ad: 'crf28 · 1080p gop8', kaldirac: 'crf', yuk: 1080, crf: 28, gop: 8 },
  { ad: 'crf32 · 1080p gop8', kaldirac: 'crf', yuk: 1080, crf: 32, gop: 8 },
  { ad: 'crf24 · 720p gop8', kaldirac: 'cozunurluk', yuk: 720, crf: 24, gop: 8 },
  { ad: 'crf24 · 1080p gop24', kaldirac: 'anahtar kare', yuk: 1080, crf: 24, gop: 24 },
  { ad: 'crf24 · 1080p gop48', kaldirac: 'anahtar kare', yuk: 1080, crf: 24, gop: 48 },
  { ad: 'BIRLESIK crf30 · 720p gop12', kaldirac: 'ucu birden', yuk: 720, crf: 30, gop: 12 },
];

const sh = (dosya, args) => execFileSync(dosya, args, { encoding: 'utf8', maxBuffer: 1 << 28 });
const bayt = (p) => fs.statSync(p).size;

function anahtarKare(dosya) {
  /* ffprobe: kac kare anahtar (key_frame=1) — `-g` gercekten uygulandi mi */
  const c = sh('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'frame=key_frame', '-of', 'csv=p=0', dosya]).trim().split(/\r?\n/);
  const toplam = c.length;
  const anahtar = c.filter((x) => x.trim() === '1').length;
  return { kare: toplam, anahtar, ort_aralik: +(toplam / anahtar).toFixed(2) };
}

function kalite(referans, sinanan) {
  /* PSNR + SSIM: sinanan dosya referansa gore. Boyut farkliysa referansin
     olcusune olceklenir (720p adayini 1080p tabana kiyaslamak icin). */
  const ref = sh('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=width,height', '-of', 'csv=p=0', referans]).trim().split(',');
  const [g, y] = ref;
  /* PSNR: `psnr` filtresinin OZET satiri ('average:') stderr'e gider,
     execFileSync ise yalniz stdout dondurur — ilk surumde bu yuzden butun
     PSNR degerleri null/0 cikti (sessiz sifir, yanlis sayi). stats_file=-
     ile stdout'a KARE BASINA satir yaziliyor; ortalamayi oradan aliriz. */
  const cikti = sh('ffmpeg', ['-v', 'error', '-i', sinanan, '-i', referans, '-lavfi',
    `[0:v]scale=${g}:${y}:flags=lanczos[a];[a][1:v]psnr=stats_file=-`, '-f', 'null', '-']);
  const kareler = [...cikti.matchAll(/psnr_avg:([\d.]+|inf)/g)]
    .map((m) => (m[1] === 'inf' ? 99 : +m[1])).filter((x) => !Number.isNaN(x));
  const p = kareler.length ? [null, String(kareler.reduce((a, b) => a + b, 0) / kareler.length)] : null;
  const cikti2 = sh('ffmpeg', ['-v', 'error', '-i', sinanan, '-i', referans, '-lavfi',
    `[0:v]scale=${g}:${y}:flags=lanczos[a];[a][1:v]ssim=stats_file=-`, '-f', 'null', '-']);
  const s = cikti2.match(/All:([\d.]+)/);
  return { psnr: p ? +(+p[1]).toFixed(2) : null, ssim: s ? +(+s[1]).toFixed(4) : null };
}

fs.mkdirSync(GECICI, { recursive: true });

/* --- ornegin hat icindeki gercek payi (varsayim yok) --- */
const hatBayt = KANON.klip.reduce((t, k) => t + bayt(path.join(VARLIK, `sahne${k.n}.mp4`)), 0);
const ornekBayt = ORNEK.reduce((t, n) => t + bayt(path.join(VARLIK, `sahne${n}.mp4`)), 0);
const pay = ornekBayt / hatBayt;
console.log(`hat ${(hatBayt / 1048576).toFixed(1)} MiB · ornek ${(ornekBayt / 1048576).toFixed(1)} MiB · pay %${(pay * 100).toFixed(1)}`);

const sonuc = [];
for (const a of ADAY) {
  const t0 = Date.now();
  let toplam = 0; const kaliteler = []; let ak = null;
  for (const n of ORNEK) {
    const hedef = a.diskten
      ? path.join(VARLIK, `sahne${n}.mp4`)
      : path.join(GECICI, `s${n}-${a.yuk}-${a.crf}-g${a.gop}.mp4`);
    if (!a.diskten && !fs.existsSync(hedef)) {
      sh('ffmpeg', ['-v', 'error', '-y', '-i', path.join(KAYNAK, `sahne${n}.mp4`), '-an',
        '-vf', VF(a.yuk), '-c:v', 'libx264', '-preset', 'slow', '-crf', String(a.crf),
        '-pix_fmt', 'yuv420p', '-g', String(a.gop), '-keyint_min', String(a.gop),
        '-sc_threshold', '0', '-movflags', '+faststart', hedef]);
    }
    toplam += bayt(hedef);
    if (!a.diskten) kaliteler.push(kalite(path.join(VARLIK, `sahne${n}.mp4`), hedef));
    if (ak === null) ak = anahtarKare(hedef);
  }
  const tahminHat = toplam / pay;
  const r = {
    ad: a.ad, kaldirac: a.kaldirac, yuk: a.yuk, crf: a.crf, gop: a.gop,
    olculen_ornek_bayt: toplam,
    olculen_ornek_mib: +(toplam / 1048576).toFixed(2),
    tahmini_hat_mib: +(tahminHat / 1048576).toFixed(1),
    butceye_gore_x: +(tahminHat / BUTCE).toFixed(2),
    gecer_mi: tahminHat <= BUTCE,
    anahtar_kare: ak,
    psnr_vs_taban: kaliteler.length ? +(kaliteler.reduce((t, k) => t + k.psnr, 0) / kaliteler.length).toFixed(2) : null,
    ssim_vs_taban: kaliteler.length ? +(kaliteler.reduce((t, k) => t + k.ssim, 0) / kaliteler.length).toFixed(4) : null,
    sn: Math.round((Date.now() - t0) / 1000),
  };
  sonuc.push(r);
  console.log(`  ${r.ad.padEnd(38)} ${String(r.olculen_ornek_mib).padStart(7)} MiB ornek · hat ~${String(r.tahmini_hat_mib).padStart(6)} MiB · butce x${r.butceye_gore_x} · GOP ort ${r.anahtar_kare.ort_aralik} · psnr ${r.psnr_vs_taban ?? '—'}`);
}

/* kazanc: tabana gore yuzde */
const taban = sonuc[0].tahmini_hat_mib;
for (const r of sonuc) r.tabana_gore_kazanc_yuzde = +(((taban - r.tahmini_hat_mib) / taban) * 100).toFixed(1);

fs.writeFileSync(CIKTI, JSON.stringify({
  _: 'yeni/film/olc-butce.cjs — 32 MiB butcesi icin kaldirac olcumu. tahmini_hat_mib ORNEKTEN OLCEKLI TAHMIN (pay gercek bayttan), olculen_ornek_mib gercek. Taban aday DISKTEKI uretim ciktisi (yeniden encode yok).',
  olcum: new Date().toISOString(),
  kaynak: KAYNAK,
  ornek_klipler: ORNEK,
  ornek_payi_yuzde: +(pay * 100).toFixed(2),
  hat_gercek_bayt: hatBayt,
  hat_gercek_mib: +(hatBayt / 1048576).toFixed(1),
  butce_mib: 32,
  aday: sonuc,
}, null, 1));
console.log(`\nyazildi: ${CIKTI}`);
