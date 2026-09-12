#!/usr/bin/env node
/* FILM · KODEK DENEMESI — TEK KLIP (sahne20). Uc kodek ayni cozunurlukte
   (1440p) ve ayni kaynaktan (4K HEVC) uretilir; boyut, encode suresi ve
   kaynaga karsi kalite olculur. Tam hat encode'u BASLATILMAZ.

   NOT (libsvtav1): bu ffmpeg derlemesinde SVT-AV1 yok. Mevcut AV1
   encoder'lari: libaom-av1 (yazilim) · av1_nvenc / av1_qsv / av1_amf
   (donanim). Ucu de bu makinede acilmadi:
     av1_nvenc -> "No capable devices found"
     av1_qsv   -> "This version of runtime doesn't support AV1 encoding"
     av1_amf   -> "DLL amfrt64.dll failed to open"
   Bu yuzden AV1 icin libaom-av1, EN HIZLI ON AYARIYLA (cpu-used=8,
   row-mt=1) kullanildi. SVT-AV1 tipik olarak libaom'dan kat kat hizlidir;
   asagidaki AV1 ENCODE SURESI bu yuzden UST SINIRDIR, SVT ile cok daha
   dusuk olur. Boyut ve decode maliyeti kodege ait, encoder'a degil —
   onlar tasinabilir.

   Kalite referansi: kaynagin 1440p'ye olceklenmis hali (encode oncesi),
   yani uc kodek de ayni hedefe karsi olculur.
   Cikti: film/kodek-deneme.json
   Kullanim: node yeni/film/kodek-deneme.cjs */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const KANON = JSON.parse(fs.readFileSync(path.join(KOK, 'src', 'film', 'kanon.json'), 'utf8'));
const KAYNAK = path.join(KANON.kaynak, 'sahne20.mp4');
const CIKTI = path.join(KOK, 'public', 'varlik', 'film', 'kodek');   /* sunulabilsin diye public altinda */
const GECICI = path.join(__dirname, '.kodek');
const N = 20;

fs.mkdirSync(CIKTI, { recursive: true });
fs.mkdirSync(GECICI, { recursive: true });

const ff = (a) => spawnSync('ffmpeg', a, { encoding: 'utf8', maxBuffer: 1 << 26 });
const OLCEK = 'scale=-2:1440:flags=lanczos';

/* ---- referans: kaynagin 1440p hali, gorsel kayipsiza yakin ---- */
const REF = path.join(GECICI, 'ref-1440.mp4');
if (!fs.existsSync(REF)) {
  process.stderr.write('referans (1440p, CRF 8) uretiliyor...\n');
  const r = ff(['-v', 'error', '-y', '-i', KAYNAK, '-an', '-vf', OLCEK,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '8', '-pix_fmt', 'yuv420p', REF]);
  if (r.status !== 0) throw new Error('referans: ' + r.stderr);
}

const ADAY = [
  { ad: 'h264', etiket: 'H.264 1440p (mevcut hat)', mime: 'video/mp4; codecs="avc1.640028"',
    args: ['-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p',
           '-g', '8', '-keyint_min', '8', '-sc_threshold', '0'] },
  { ad: 'h265', etiket: 'H.265/HEVC 1440p', mime: 'video/mp4; codecs="hvc1.1.6.L120.90"',
    args: ['-c:v', 'libx265', '-preset', 'fast', '-crf', '24', '-pix_fmt', 'yuv420p',
           '-x265-params', 'keyint=8:min-keyint=8:scenecut=0:log-level=error', '-tag:v', 'hvc1'] },
  { ad: 'av1', etiket: 'AV1 1440p (libaom, cpu-used 8)', mime: 'video/mp4; codecs="av01.0.08M.08"',
    args: ['-c:v', 'libaom-av1', '-crf', '30', '-b:v', '0', '-cpu-used', '8', '-row-mt', '1',
           '-threads', '8', '-g', '8', '-keyint_min', '8', '-pix_fmt', 'yuv420p'] },
];

function psnr(a, b) {
  const r = ff(['-v', 'info', '-i', a, '-i', b, '-lavfi', 'psnr', '-f', 'null', '-']);
  const m = (r.stderr || '').match(/average:([0-9.]+|inf)/);
  return m ? (m[1] === 'inf' ? 99 : Number(m[1])) : null;
}
function ssim(a, b) {
  const r = ff(['-v', 'info', '-i', a, '-i', b, '-lavfi', 'ssim', '-f', 'null', '-']);
  const m = (r.stderr || '').match(/All:([0-9.]+)/);
  return m ? Number(m[1]) : null;
}

const klip = KANON.klip.find((k) => k.n === N);
const sonuc = [];
for (const a of ADAY) {
  const cik = path.join(CIKTI, `sahne${N}-${a.ad}.mp4`);
  process.stderr.write(`${a.ad} encode...\n`);
  const t0 = Date.now();
  const r = ff(['-v', 'error', '-y', '-i', KAYNAK, '-an', '-vf', OLCEK, ...a.args, '-movflags', '+faststart', cik]);
  const ms = Date.now() - t0;
  if (r.status !== 0) { sonuc.push({ ...a, hata: (r.stderr || '').slice(0, 200) }); continue; }
  const bayt = fs.statSync(cik).size;
  sonuc.push({
    ad: a.ad, etiket: a.etiket, mime: a.mime, dosya: `kodek/sahne${N}-${a.ad}.mp4`,
    bayt, mib: +(bayt / 1048576).toFixed(2),
    kbps: Math.round(bayt * 8 / klip.sure / 1000),
    encode_ms: ms, encode_kat: +(ms / 1000 / klip.sure).toFixed(1),   /* gercek zamanin kac kati */
    psnr: psnr(cik, REF), ssim: ssim(cik, REF),
  });
}

const h264 = sonuc.find((x) => x.ad === 'h264');
for (const x of sonuc) if (!x.hata && h264) x.h264_orani = +(x.bayt / h264.bayt).toFixed(3);

const cikti = {
  _: 'yeni/film/kodek-deneme.cjs — TEK KLIP (sahne20). Tam hat encode edilmedi.',
  olcum: new Date().toISOString(),
  klip: { n: N, sure: klip.sure, kare: klip.kare, kaynak: `${klip.gen}x${klip.yuk} ${klip.kodek}` },
  cozunurluk: '2560x1440',
  not_svtav1: 'libsvtav1 bu derlemede yok; donanim AV1 (nvenc/qsv/amf) da acilmadi. AV1 libaom cpu-used=8 ile uretildi — encode suresi UST SINIR.',
  referans: 'kaynagin 1440p hali, x264 CRF 8',
  aday: sonuc,
};
fs.writeFileSync(path.join(__dirname, 'kodek-deneme.json'), JSON.stringify(cikti, null, 1));

console.log('| kodek | boyut | H.264 orani | kbps | PSNR | SSIM | encode | gercek zamanin kati |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|');
for (const x of sonuc) {
  if (x.hata) { console.log(`| ${x.ad} | HATA: ${x.hata.slice(0, 60)} | | | | | | |`); continue; }
  console.log(`| ${x.etiket} | ${x.mib} MiB | ${x.h264_orani ?? '—'} | ${x.kbps} | ${x.psnr} | ${x.ssim} | ${(x.encode_ms / 1000).toFixed(1)} sn | ${x.encode_kat}× |`);
}
console.log('→ film/kodek-deneme.json · klipler public/varlik/film/kodek/');
