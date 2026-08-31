#!/usr/bin/env node
/* FILM · TARAMA 2 — birinci taramanin iki kusuru duzeltildi:
   1) `scale=-2:'min(720,ih)'` / `min(960,ih)` HIC OLCEKLEMIYOR: klipler
      716 satir, tavanin altinda. Higgsfield betiginin mobil hattinda da
      ayni durum — "720p tavani" bu malzemede etkisiz, mobil hat masaustu
      cozunurlugunde kaliyor. Buradaki adaylar SABIT yukseklik kullanir.
   2) Kalite olcumu `scale=rw:rh` ile kuruldu; rw/rh scale filtresinde
      yok (scale2ref'te var) -> filtre patladi, PSNR/SSIM null dondu.
      Burada aday referansin boyutuna scale2ref ile getirilir.

   Kalite referansi = su an yayina giden hal (masaustu CRF20/GOP8/native).
   Mutlak sayi tek basina hukum degil; her adaydan ayni kare PNG olarak
   birakilir, goz karari Enes'te.
   Cikti: film/crf-tarama2.json + film/crf-tarama/ */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const KANON = JSON.parse(fs.readFileSync(path.join(KOK, 'src', 'film', 'kanon.json'), 'utf8'));
const URETIM = JSON.parse(fs.readFileSync(path.join(__dirname, 'uretim.json'), 'utf8'));
const KAYNAK = KANON.kaynak;
const VARLIK = path.join(KOK, 'public', 'varlik', 'film');
const GECICI = path.join(__dirname, '.crf2');
const KARE = path.join(__dirname, 'crf-tarama');

const BM = 32 * 1048576, BB = 16 * 1048576;
const ORNEK = [34, 27, 16, 13, 22];

const ADAY = [
  /* --- yalniz CRF (cozunurluk native 1284x716) --- */
  { ad: 'crf28-native', crf: 28, gop: 8, yuk: null },
  { ad: 'crf32-native-gop12', crf: 32, gop: 12, yuk: null },
  /* --- gercek cozunurluk dusurme --- */
  { ad: 'crf26-540', crf: 26, gop: 8, yuk: 540 },
  { ad: 'crf28-540', crf: 28, gop: 8, yuk: 540 },
  { ad: 'crf28-432-gop12', crf: 28, gop: 12, yuk: 432 },
  { ad: 'crf30-360-gop12', crf: 30, gop: 12, yuk: 360 },
];

const ff = (a) => spawnSync('ffmpeg', a, { encoding: 'utf8', maxBuffer: 1 << 26 });

function encode(giris, cikis, a) {
  const vf = (a.yuk ? `scale=-2:${a.yuk},` : '') + 'unsharp=5:5:0.8:5:5:0.0';
  const r = ff(['-v', 'error', '-y', '-i', giris, '-an', '-vf', vf,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(a.crf), '-pix_fmt', 'yuv420p',
    '-g', String(a.gop), '-keyint_min', String(a.gop), '-sc_threshold', '0',
    '-movflags', '+faststart', cikis]);
  if (r.status !== 0) throw new Error(`${a.ad}: ${r.stderr}`);
}

/* aday referansin boyutuna scale2ref ile getirilir; sonra PSNR + SSIM */
function kalite(aday, ref) {
  const oku = (lav, re) => {
    const r = ff(['-v', 'info', '-i', aday, '-i', ref, '-lavfi', lav, '-f', 'null', '-']);
    const m = (r.stderr || '').match(re);
    return m ? (m[1] === 'inf' ? 99 : Number(m[1])) : null;
  };
  return {
    psnr: oku('[0:v][1:v]scale2ref=flags=bicubic[a][r];[a][r]psnr', /average:([0-9.]+|inf)/),
    ssim: oku('[0:v][1:v]scale2ref=flags=bicubic[a][r];[a][r]ssim', /All:([0-9.]+)/),
  };
}

(async () => {
  fs.mkdirSync(GECICI, { recursive: true });
  fs.mkdirSync(KARE, { recursive: true });

  const hepsiM = URETIM.toplam.masaustu_bayt;
  const ornekM = ORNEK.reduce((a, n) => a + URETIM.klip.find((k) => k.n === n).masaustu.bayt, 0);
  const olcek = hepsiM / ornekM;

  const sonuc = [];
  for (const a of ADAY) {
    let bayt = 0; const kal = [];
    for (const n of ORNEK) {
      const cik = path.join(GECICI, `${a.ad}-${n}.mp4`);
      encode(path.join(KAYNAK, `sahne${n}.mp4`), cik, a);
      bayt += fs.statSync(cik).size;
      kal.push(kalite(cik, path.join(VARLIK, `sahne${n}.mp4`)));
      if (n === 34) ff(['-v', 'error', '-y', '-ss', '4', '-i', cik, '-frames:v', '1', '-q:v', '2', path.join(KARE, `${a.ad}-sahne34.png`)]);
      fs.rmSync(cik, { force: true });
    }
    const tahmin = bayt * olcek;
    const ort = (v) => { const f = v.filter((x) => x != null); return f.length ? +(f.reduce((x, y) => x + y, 0) / f.length).toFixed(2) : null; };
    const s = {
      ad: a.ad, crf: a.crf, gop: a.gop, cozunurluk: a.yuk ? `1284x716 -> ~${Math.round(1284 * a.yuk / 716)}x${a.yuk}` : '1284x716 (native)',
      olculen_5klip_mib: +(bayt / 1048576).toFixed(1),
      tahmini_hat_mib: +(tahmin / 1048576).toFixed(1),
      masaustu_kapisi_x: +(tahmin / BM).toFixed(2),
      mobil_kapisi_x: +(tahmin / BB).toFixed(2),
      psnr_vs_yayin: ort(kal.map((k) => k.psnr)),
      ssim_vs_yayin: ort(kal.map((k) => k.ssim)),
    };
    sonuc.push(s);
    console.log(`${a.ad.padEnd(20)} ${s.cozunurluk.padEnd(26)} hat~${String(s.tahmini_hat_mib).padStart(6)} MiB · 32MiB x${s.masaustu_kapisi_x} · 16MiB x${s.mobil_kapisi_x} · PSNR ${s.psnr_vs_yayin} SSIM ${s.ssim_vs_yayin}`);
  }

  fs.writeFileSync(path.join(__dirname, 'crf-tarama2.json'), JSON.stringify({
    _: 'yeni/film/crf-tarama2.cjs — tahmini_hat_mib 5 klip orneklemiyle OLCEKLI TAHMIN (%16,4 temsil), olculen_5klip_mib gercek. Kalite referansi = yayindaki masaustu hat (CRF20/GOP8/native).',
    olcum: new Date().toISOString(),
    ornek_klipler: ORNEK,
    not_720p_tavani: "Higgsfield betiginin `scale=-2:'min(720,ih)'` mobil tavani bu malzemede ETKISIZ: klipler 716 satir. Mobil hat bu yuzden masaustu cozunurlugunde kaldi; mobil butcenin x10,24 asmasinin sebeplerinden biri bu.",
    aday: sonuc,
  }, null, 1));
  fs.rmSync(GECICI, { recursive: true, force: true });
  console.log('\n→ yeni/film/crf-tarama2.json · ornek kareler film/crf-tarama/');
})();
