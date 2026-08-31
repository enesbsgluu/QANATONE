#!/usr/bin/env node
/* KESIT · URETIM HATTI (31 Agu 2026, PROLOG-KESIT-VE-KAPANIS 2. adim)

   Sekiz duragi 4K ustalardan uretir. TEK HAT H.264 — H.265 yok:
   Chromium HEVC'de ara kareye sarmiyor, sonraki anahtar kareye yapisiyor
   (olculdu: film/seek-3klip.json, h265 27/36).

   SABITLER (ucu de olcumle secildi, gorev metnindeki gerekce):
     crf 28   — SSIM 0,975 (film/olc-butce.json)
     GOP 8    — dogruluk g8/g24/g48'de AYNI (36/36); secen sey p95 seek
                kuyrugu: 83 / 99 / 104 ms (film/seek-gop.json)
     1080p    — scale=-2:1080 lanczos + unsharp, uretim hattiyla ayni zincir

   KIRPMA `trim` ILE, `-ss` ILE DEGIL: trim cozulmus kare uzerinde calisir,
   kare siniri tam tutar (acilis kopyasi da ayni yolu kullaniyor). Kirpilan
   aralik kesit.json'dan gelir; ELLE sure yazilmaz.

   POSTER ENCODE EDILMIS KLIPTEN (sert degismez #1): once mp4 uretilir,
   posteri ONUN ilk karesinden alinir. WebP sayfaya iner, PNG kanon kalir.

   Cikti: public/varlik/kesit/durakN.mp4 (+ -mobile, + -poster.webp)
          film/kesit-uretim.json   (olculen boyut/bayt/sure/kare, sha1)
          film/kesit-dikis/durakN-first.png / -last.png  (dikis olcumu icin)
   Kullanim: node yeni/film/kesit-uret.cjs */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const sharp = require('sharp');

const KOK = path.join(__dirname, '..');
const KAYNAK = path.join(process.env.USERPROFILE, 'Desktop', 'QANATONE SAHNELER 4K');
const CIKTI = path.join(KOK, 'public', 'varlik', 'kesit');
const DIKIS = path.join(__dirname, 'kesit-dikis');
const POSTER_HAM = path.join(__dirname, 'kesit-poster-ham');
const KESIT = require('./kesit.json');
const KANON = require('../src/film/kanon.json');

for (const d of [CIKTI, DIKIS, POSTER_HAM]) fs.mkdirSync(d, { recursive: true });

const CRF_MASAUSTU = 28;
const CRF_MOBIL = 28;
const GOP = 8;
const sha1 = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
const ff = (a) => execFileSync('ffmpeg', a, { encoding: 'utf8', maxBuffer: 1 << 28 });

/* ffprobe: alan ADINA gore okunur — csv ciktisi -show_entries sirasini
   DEGIL kendi ic sirasini kullaniyor (bu tuzak envanter turunda isirdi). */
function olc(dosya) {
  const ham = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,codec_name,nb_frames,duration',
    '-of', 'default=noprint_wrappers=1', dosya], { encoding: 'utf8' });
  const a = {};
  for (const s of ham.trim().split(String.fromCharCode(10))) {
    const i = s.indexOf('='); if (i > 0) a[s.slice(0, i)] = s.slice(i + 1).trim();
  }
  return { gen: +a.width, yuk: +a.height, kodek: a.codec_name,
    kare: +a.nb_frames, sure: +(+a.duration).toFixed(3) };
}

/* Uretim hattinin masaustu/mobil filtre zinciri (scroll-scrub-video.sh ile
   BIREBIR ayni olcek + unsharp); onune varsa trim eklenir. */
const vf = (yuk, keskin, trim) =>
  `${trim ? trim + ',' : ''}scale=-2:${yuk}:flags=lanczos,unsharp=5:5:${keskin}:5:5:0.0`;

function encode(giris, cikis, yuk, keskin, crf, trim) {
  ff(['-v', 'error', '-y', '-i', giris, '-an', '-vf', vf(yuk, keskin, trim),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p',
    '-g', String(GOP), '-keyint_min', String(GOP), '-sc_threshold', '0',
    '-movflags', '+faststart', cikis]);
  return cikis;
}

/* sinir kareleri: kare i'nin zamani i/FPS (kare ORTASI DEGIL — `-ss` PTS>=t
   olan ilk kareyi verir, ortadan istenirse SON kare hic gelmez). */
function sinirKareleri(klip, kare, onek) {
  const fps = KANON.fps;
  ff(['-v', 'error', '-y', '-ss', '0', '-i', klip, '-frames:v', '1', '-q:v', '2', `${onek}-first.png`]);
  ff(['-v', 'error', '-y', '-ss', String((kare - 1) / fps), '-i', klip, '-frames:v', '1', '-q:v', '2', `${onek}-last.png`]);
}

(async () => {
  const kayit = [];
  let bas = 0;
  for (const d of KESIT.durak) {
    const t0 = Date.now();
    const ham = path.join(KAYNAK, `${d.kaynak}.mp4`);
    const [a0, a1] = d.aralik;
    const trim = (a0 || a1) ? `trim=${a0 || 0}:${a1 == null ? '' : a1},setpts=PTS-STARTPTS` : '';
    const dm = path.join(CIKTI, `durak${d.n}.mp4`);
    const mb = path.join(CIKTI, `durak${d.n}-mobile.mp4`);
    encode(ham, dm, 1080, '0.8', CRF_MASAUSTU, trim);
    encode(ham, mb, 720, '0.6', CRF_MOBIL, trim);

    /* poster: ENCODE EDILMIS klibin ilk karesi (sert degismez #1) */
    const pd = path.join(POSTER_HAM, `durak${d.n}-poster.png`);
    const pm = path.join(POSTER_HAM, `durak${d.n}-mobile-poster.png`);
    ff(['-v', 'error', '-y', '-ss', '0', '-i', dm, '-frames:v', '1', '-q:v', '2', pd]);
    ff(['-v', 'error', '-y', '-ss', '0', '-i', mb, '-frames:v', '1', '-q:v', '2', pm]);
    const wd = path.join(CIKTI, `durak${d.n}-poster.webp`);
    const wm = path.join(CIKTI, `durak${d.n}-mobile-poster.webp`);
    await sharp(pd).webp({ quality: 72 }).toFile(wd);
    await sharp(pm).webp({ quality: 70 }).toFile(wm);

    /* ACILIS KOPYASI (yalniz durak 1): tam klibin ilk saniyeleri, BIREBIR
       ayni encode zinciriyle + crf +4. Motor once bunu indirir, ilk kare
       erken boyanir; tam kopya arkada inince ayni kareye sarilip takas
       edilir. 39'luk hatta olculmustu: 4G ilk kare 1269 ms. Kesitte de
       kalir — kaldirmak sessiz bir gerileme olurdu. */
    let acilis = null;
    if (d.n === 1) {
      const sn = 1.2;
      const kes = `${trim ? trim + ',' : ''}trim=0:${sn},setpts=PTS-STARTPTS`;
      const ad = path.join(CIKTI, `durak1-acilis.mp4`);
      const am = path.join(CIKTI, `durak1-acilis-mobile.mp4`);
      encode(ham, ad, 1080, '0.8', CRF_MASAUSTU + 4, kes);
      encode(ham, am, 720, '0.6', CRF_MOBIL + 4, kes);
      acilis = { sn, crf_arti: 4,
        masaustu: { dosya: path.basename(ad), bayt: fs.statSync(ad).size, sha1: sha1(ad), ...olc(ad) },
        mobil: { dosya: path.basename(am), bayt: fs.statSync(am).size, sha1: sha1(am), ...olc(am) } };
    }

    const od = olc(dm), om = olc(mb);
    sinirKareleri(dm, od.kare, path.join(DIKIS, `durak${d.n}`));

    kayit.push({
      n: d.n, ad: d.ad, kaynak: d.kaynak, aralik: d.aralik, hedef_sn: d.hedef_sn,
      bas: +bas.toFixed(3), acilis,
      masaustu: { dosya: `durak${d.n}.mp4`, bayt: fs.statSync(dm).size, sha1: sha1(dm), ...od },
      mobil: { dosya: `durak${d.n}-mobile.mp4`, bayt: fs.statSync(mb).size, sha1: sha1(mb), ...om },
      /* POSTER ZINCIRI: webp <- png <- ENCODE EDILMIS mp4 (sert degismez #1).
         Kendi sha1'i de yaziliyor ki denetim dist'teki dosyayi kunyeye
         BAGLAYABILSIN — "urettim" demek yetmez, bayt tutmali. */
      poster: { dosya: `durak${d.n}-poster.webp`, bayt: fs.statSync(wd).size, sha1: sha1(wd), kaynak_sha1: sha1(dm) },
      mobil_poster: { dosya: `durak${d.n}-mobile-poster.webp`, bayt: fs.statSync(wm).size, sha1: sha1(wm), kaynak_sha1: sha1(mb) },
    });
    bas += od.sure;
    console.log(`  durak${d.n}  ${d.kaynak}  ${od.sure} sn · ${od.kare} kare · ${od.gen}x${od.yuk} · ` +
      `${(fs.statSync(dm).size / 1048576).toFixed(2)} MiB  (${Math.round((Date.now() - t0) / 1000)} sn)`);
  }

  const md = kayit.reduce((t, k) => t + k.masaustu.bayt, 0);
  const mm = kayit.reduce((t, k) => t + k.mobil.bayt, 0);
  const mp = kayit.reduce((t, k) => t + k.poster.bayt + k.mobil_poster.bayt, 0);
  const toplamSn = +kayit.reduce((t, k) => t + k.masaustu.sure, 0).toFixed(3);
  const toplamKare = kayit.reduce((t, k) => t + k.masaustu.kare, 0);

  fs.writeFileSync(path.join(__dirname, 'kesit-uretim.json'), JSON.stringify({
    _: 'yeni/film/kesit-uret.cjs ciktisi. TEK HAT H.264 · crf28 · GOP 8 · 1080p. Sure/kare/boyut ffprobe ile CIKTIDAN okundu, kesit.json hedefinden degil. Poster ENCODE EDILMIS klipten.',
    uretim: new Date().toISOString(),
    ayar: { kodek: 'h264', crf_masaustu: CRF_MASAUSTU, crf_mobil: CRF_MOBIL, gop: GOP, masaustu_satir: 1080, mobil_satir: 720 },
    kaynak: KAYNAK,
    toplam: { sure_sn: toplamSn, kare: toplamKare, masaustu_bayt: md, mobil_bayt: mm, poster_bayt: mp },
    durak: kayit,
  }, null, 1));

  console.log(`\n  TOPLAM  ${toplamSn} sn · ${toplamKare} kare`);
  console.log(`  masaustu ${(md / 1048576).toFixed(2)} MiB · mobil ${(mm / 1048576).toFixed(2)} MiB · poster ${(mp / 1024).toFixed(0)} KB`);
  console.log('\n→ film/kesit-uretim.json');
})().catch((e) => { console.error(e); process.exit(1); });
