#!/usr/bin/env node
/* FILM · CRF / COZUNURLUK TARAMASI — butce secenegi A'nin BEDELI olculur,
   tahmin edilmez. Higgsfield betiginin masaustu ayari (CRF 20, GOP 8,
   native) taban; her aday ayni betigin parametrelerinden yalniz CRF /
   olcek / GOP degistirilerek kurulur.

   ORNEKLEM: 39 klibi her adayla encode etmek pahali. Bes temsilci klip
   secildi (en agir 2, ust-orta, orta, en hafif) ve bu bes klibin MEVCUT
   masaustu baytinin tum hatta orani ile olceklenir. Ciktida hem olculen
   bes klip toplami hem olcekli tahmin ayri ayri durur — tahmin oldugu
   yazilidir.

   KALITE: her aday, ayni klibin CRF 20 haline karsi PSNR/SSIM ile
   olculur (referans = su an yayina giden hal). Sicrama olcumunun tabani
   gibi burada da mutlak sayi tek basina hukum degildir; Enes'in gozu icin
   her adaydan ayni kare PNG olarak birakilir.

   Kullanim: node yeni/film/crf-tarama.cjs
   Cikti: film/crf-tarama.json + film/crf-tarama/ (ornek kareler) */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const KANON = JSON.parse(fs.readFileSync(path.join(KOK, 'src', 'film', 'kanon.json'), 'utf8'));
const URETIM = JSON.parse(fs.readFileSync(path.join(__dirname, 'uretim.json'), 'utf8'));
const KAYNAK = KANON.kaynak;
const VARLIK = path.join(KOK, 'public', 'varlik', 'film');
const GECICI = path.join(__dirname, '.crf');
const KARE = path.join(__dirname, 'crf-tarama');

const BM = 32 * 1048576, BB = 16 * 1048576;
const ORNEK = [34, 27, 16, 13, 22];   /* en agir 2 · ust-orta · orta · en hafif */

/* Higgsfield betiginin masaustu/mobil satirlari; degisen yalniz isaretli alanlar */
const ADAY = [
  { ad: 'mevcut-masaustu', hat: 'masaustu', crf: 20, gop: 8, olcek: null, keskin: '5:5:0.8:5:5:0.0' },
  { ad: 'crf24-native', hat: 'masaustu', crf: 24, gop: 8, olcek: null, keskin: '5:5:0.8:5:5:0.0' },
  { ad: 'crf28-native', hat: 'masaustu', crf: 28, gop: 8, olcek: null, keskin: '5:5:0.8:5:5:0.0' },
  { ad: 'crf28-960', hat: 'masaustu', crf: 28, gop: 8, olcek: 960, keskin: '5:5:0.8:5:5:0.0' },
  { ad: 'crf32-960-gop12', hat: 'masaustu', crf: 32, gop: 12, olcek: 960, keskin: '5:5:0.8:5:5:0.0' },
  { ad: 'mevcut-mobil', hat: 'mobil', crf: 23, gop: 4, olcek: 720, keskin: '5:5:0.6:5:5:0.0' },
  { ad: 'mobil-crf28-540', hat: 'mobil', crf: 28, gop: 4, olcek: 540, keskin: '5:5:0.6:5:5:0.0' },
  { ad: 'mobil-crf32-480-gop8', hat: 'mobil', crf: 32, gop: 8, olcek: 480, keskin: '5:5:0.6:5:5:0.0' },
];

const ff = (a) => spawnSync('ffmpeg', a, { encoding: 'utf8', maxBuffer: 1 << 26 });

function encode(giris, cikis, a) {
  const vf = a.olcek
    ? `scale=-2:'min(${a.olcek},ih)',unsharp=${a.keskin}`
    : `unsharp=${a.keskin}`;
  const r = ff(['-v', 'error', '-y', '-i', giris, '-an', '-vf', vf,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(a.crf), '-pix_fmt', 'yuv420p',
    '-g', String(a.gop), '-keyint_min', String(a.gop), '-sc_threshold', '0',
    '-movflags', '+faststart', cikis]);
  if (r.status !== 0) throw new Error(`${a.ad}: ${r.stderr}`);
}

/* aday klibi referansa karsi: cozunurluk farkliysa referans olcegine cikarilir
   (izleyici zaten viewport'a olceklenmis gorur) */
function kalite(aday, referans) {
  const r = ff(['-v', 'info', '-i', aday, '-i', referans,
    '-lavfi', '[0:v]scale=rw:rh[a];[a][1:v]psnr', '-f', 'null', '-']);
  const p = (r.stderr || '').match(/average:([0-9.]+|inf)/);
  const r2 = ff(['-v', 'info', '-i', aday, '-i', referans,
    '-lavfi', '[0:v]scale=rw:rh[a];[a][1:v]ssim', '-f', 'null', '-']);
  const s = (r2.stderr || '').match(/All:([0-9.]+)/);
  return { psnr: p ? (p[1] === 'inf' ? 99 : Number(p[1])) : null, ssim: s ? Number(s[1]) : null };
}

(async () => {
  fs.mkdirSync(GECICI, { recursive: true });
  fs.mkdirSync(KARE, { recursive: true });

  /* ornek klipler tum hattin ne kadarini temsil ediyor */
  const hepsiM = URETIM.toplam.masaustu_bayt, hepsiB = URETIM.toplam.mobil_bayt;
  const ornekM = ORNEK.reduce((a, n) => a + URETIM.klip.find((k) => k.n === n).masaustu.bayt, 0);
  const ornekB = ORNEK.reduce((a, n) => a + URETIM.klip.find((k) => k.n === n).mobil.bayt, 0);
  const olcekM = hepsiM / ornekM, olcekB = hepsiB / ornekB;

  const sonuc = [];
  for (const a of ADAY) {
    let bayt = 0; const kal = [];
    for (const n of ORNEK) {
      const ham = path.join(KAYNAK, `sahne${n}.mp4`);
      const cik = path.join(GECICI, `${a.ad}-${n}.mp4`);
      encode(ham, cik, a);
      bayt += fs.statSync(cik).size;
      const ref = path.join(VARLIK, a.hat === 'mobil' ? `sahne${n}-mobile.mp4` : `sahne${n}.mp4`);
      if (!a.ad.startsWith('mevcut')) kal.push(kalite(cik, ref));
      if (n === ORNEK[0]) {
        ff(['-v', 'error', '-y', '-ss', '4', '-i', cik, '-frames:v', '1', '-q:v', '2',
          path.join(KARE, `${a.ad}-sahne${n}.png`)]);
      }
      fs.rmSync(cik, { force: true });
    }
    const olcek = a.hat === 'mobil' ? olcekB : olcekM;
    const tahmin = bayt * olcek;
    const kapi = a.hat === 'mobil' ? BB : BM;
    const ort = (v) => (v.length ? +(v.reduce((x, y) => x + y, 0) / v.length).toFixed(2) : null);
    const s = {
      ad: a.ad, hat: a.hat, crf: a.crf, gop: a.gop, olcek: a.olcek || 'native',
      olculen_5klip_mib: +(bayt / 1048576).toFixed(1),
      tahmini_hat_mib: +(tahmin / 1048576).toFixed(1),
      kapi_mib: kapi / 1048576,
      kapiya_gore: +(tahmin / kapi).toFixed(2),
      gecer_mi: tahmin <= kapi,
      psnr_vs_mevcut: ort(kal.map((k) => k.psnr).filter((x) => x != null)),
      ssim_vs_mevcut: ort(kal.map((k) => k.ssim).filter((x) => x != null)),
    };
    sonuc.push(s);
    console.log(`${a.ad.padEnd(20)} 5klip ${String(s.olculen_5klip_mib).padStart(5)} MiB · hat~${String(s.tahmini_hat_mib).padStart(6)} MiB · kapinin x${s.kapiya_gore} ${s.gecer_mi ? 'GECER' : 'ASAR'}${s.psnr_vs_mevcut ? ` · PSNR ${s.psnr_vs_mevcut} SSIM ${s.ssim_vs_mevcut}` : ''}`);
  }

  fs.writeFileSync(path.join(__dirname, 'crf-tarama.json'), JSON.stringify({
    _: 'yeni/film/crf-tarama.cjs — butce secenegi A olculdu. tahmini_hat_mib OLCEKLI TAHMINDIR (5 klip orneklemi), olculen_5klip_mib gercek.',
    olcum: new Date().toISOString(),
    ornek_klipler: ORNEK,
    ornek_temsil: { masaustu_yuzde: +(100 / olcekM).toFixed(1), mobil_yuzde: +(100 / olcekB).toFixed(1) },
    referans: 'mevcut hat (masaustu CRF20/GOP8/native · mobil CRF23/GOP4/720)',
    aday: sonuc,
  }, null, 1));
  fs.rmSync(GECICI, { recursive: true, force: true });
  console.log('\n→ yeni/film/crf-tarama.json · ornek kareler film/crf-tarama/');
})();
