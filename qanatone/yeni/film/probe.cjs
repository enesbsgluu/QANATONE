#!/usr/bin/env node
/* FILM · KANON OKUYUCUSU — 39 ham klibin sure / fps / cozunurluk / kare
   sayisi ffprobe'dan OKUNUR, tahmin edilmez (DEVIR-SPESIFIKASYONU §1).
   Cikti: src/film/kanon.json (sahne dizisinin tek sayisal kaynagi) +
   stdout'a Markdown tablo. Kapi: sahne32-39 sureleri 8,8,8,8,5,5,5,5
   olmali; tutmazsa cikis kodu 1 — kaydirilmaz, Enes'e sorulur.

   ffmpeg/ffprobe: ~/.local/bin (ffmpeg-static 6.1 + ffprobe-static 4.0,
   27 Agu). CapCut'in ffmpeg'i KULLANILMAZ: libx264/ffprobe/unsharp yok. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KAYNAK = process.argv[2] || path.join(process.env.USERPROFILE, 'Desktop', 'QANATONE SAHNELER');
const CIKTI = path.join(__dirname, '..', 'src', 'film', 'kanon.json');
const ADET = 39;
/* DEVIR §1 tablosu — son sekiz klibin beklenen suresi (sn). */
const BEKLENEN_SON8 = { 32: 8, 33: 8, 34: 8, 35: 8, 36: 5, 37: 5, 38: 5, 39: 5 };

const probe = (dosya) => JSON.parse(execFileSync('ffprobe', [
  '-v', 'error', '-select_streams', 'v:0',
  '-show_entries', 'stream=codec_name,width,height,r_frame_rate,avg_frame_rate,nb_frames,pix_fmt,duration:format=duration,size,bit_rate',
  '-of', 'json', dosya,
], { encoding: 'utf8' }));
const oran = (s) => { const [a, b] = s.split('/').map(Number); return b ? a / b : a; };

const klipler = [];
for (let n = 1; n <= ADET; n++) {
  const dosya = path.join(KAYNAK, `sahne${n}.mp4`);
  if (!fs.existsSync(dosya)) { console.error('EKSIK:', dosya); process.exit(2); }
  const p = probe(dosya);
  const s = p.streams[0];
  klipler.push({
    n, dosya: `sahne${n}.mp4`,
    sure: +Number(s.duration || p.format.duration).toFixed(3),
    fps: +oran(s.r_frame_rate).toFixed(3),
    fps_ort: +oran(s.avg_frame_rate).toFixed(3),
    kare: Number(s.nb_frames),
    gen: s.width, yuk: s.height,
    kodek: s.codec_name, piksel: s.pix_fmt,
    bayt: Number(p.format.size),
    kbps: Math.round(Number(p.format.bit_rate) / 1000),
  });
}

/* --- tablo --- */
console.log('| # | dosya | süre (sn) | fps | kare | çözünürlük | kodek | MB | kbps |');
console.log('|---:|---|---:|---:|---:|---|---|---:|---:|');
for (const k of klipler)
  console.log(`| ${k.n} | ${k.dosya} | ${k.sure} | ${k.fps} | ${k.kare} | ${k.gen}×${k.yuk} | ${k.kodek}/${k.piksel} | ${(k.bayt / 1048576).toFixed(2)} | ${k.kbps} |`);

const toplam = klipler.reduce((a, k) => a + k.sure, 0);
const toplamKare = klipler.reduce((a, k) => a + k.kare, 0);
const toplamBayt = klipler.reduce((a, k) => a + k.bayt, 0);
const fpsKume = [...new Set(klipler.map((k) => k.fps))];
const colKume = [...new Set(klipler.map((k) => `${k.gen}x${k.yuk}`))];
console.log(`\nTOPLAM ${toplam.toFixed(3)} sn (${(toplam / 60).toFixed(2)} dk) · ${toplamKare} kare · ham ${(toplamBayt / 1048576).toFixed(1)} MB`);
console.log(`fps kümesi: ${fpsKume.join(' · ')} ${fpsKume.length === 1 ? '✓ tek' : '✗ SAPMA'}`);
console.log(`çözünürlük kümesi: ${colKume.join(' · ')} ${colKume.length === 1 ? '✓ tek' : '✗ SAPMA'}`);

/* --- kapi: sahne32-39 --- */
let kapi = true;
console.log('\n### Kapı · sahne32-39 = 8,8,8,8,5,5,5,5');
for (const [n, b] of Object.entries(BEKLENEN_SON8)) {
  const k = klipler[n - 1];
  const ok = Math.abs(k.sure - b) <= 0.05;
  if (!ok) kapi = false;
  console.log(`- sahne${n}: ${k.sure} sn (beklenen ${b}) ${ok ? '✓' : '✗ TUTMUYOR'}`);
}

fs.mkdirSync(path.dirname(CIKTI), { recursive: true });
fs.writeFileSync(CIKTI, JSON.stringify({
  _: 'ffprobe ile okundu (yeni/film/probe.cjs). Sureler/fps/kare TAHMIN DEGIL; sahne dizisi bu dosyadan turer. Yeniden uretmek: node yeni/film/probe.cjs',
  kaynak: KAYNAK,
  okunma: new Date().toISOString(),
  toplam_sn: +toplam.toFixed(3),
  toplam_kare: toplamKare,
  fps: fpsKume.length === 1 ? fpsKume[0] : null,
  gen: klipler[0].gen, yuk: klipler[0].yuk,
  son8_kapisi: kapi,
  /* Cozunurluk sapmasi KAPI DEGIL, BULGU: OKU.md §8 "sapan klip yeniden
     uretilecek — kendiliginden yeniden kodlama yok". Hat klibi oldugu
     gibi tasir, karar Enes'te. Bilinen sapma (27 Agu): sahne1 1144x804. */
  sapma: klipler.filter((k) => `${k.gen}x${k.yuk}` !== colKume[colKume.length - 1] || k.fps !== fpsKume[0])
    .map((k) => ({ n: k.n, gen: k.gen, yuk: k.yuk, fps: k.fps })),
  klip: klipler,
}, null, 1));
console.log(`\n→ ${path.relative(process.cwd(), CIKTI)}`);
if (!kapi) { console.log('\nKAPI KALDI — sahne32-39 sureleri belgeyle tutmuyor; Enes\'e sorulur, kaydirilmaz.'); process.exit(1); }
if (fpsKume.length !== 1 || colKume.length !== 1)
  console.log('\nKANON SAPMASI (bulgu, kapi degil) — fps/cozunurluk tek degil; sapan klipler kanon.json `sapma` alaninda, karar Enes\'te.');
