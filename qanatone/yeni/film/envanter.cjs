#!/usr/bin/env node
/* FILM · ENVANTER TABLOSU — PROLOG-ISKELET 1. adim (31 Agu 2026)
   39 klibin tamami ffprobe ile okunur ve tek tablo basilir:
     dosya · sure · fps · cozunurluk · kodek · GOP · bayt
   Altinda uc toplam: toplam sure, toplam bayt, 32 MiB butceye gore kalan pay.
   Fps ya da cozunurluk olarak digerlerinden AYRILAN klip adiyla listelenir.

   IKI TABLO, KARISTIRILMASIN:
     KAYNAK  = Desktop/QANATONE SAHNELER 4K (3840x2160 HEVC ustalar)
     CIKTI   = yeni/public/varlik/film/sahneN.mp4 (1080p H.264, yayina giden)
   32 MiB butcesi CIKTI icindir; 4K ustalari o butceyle kiyaslamak anlamsiz
   olurdu (ustalar ~2 GB). Ikisi de basilir, hangisinin butceye girdigi
   ayrica yazilir.

   GOP kanon.json'da YOK (probe.cjs okumuyor): burada kare kare `key_frame`
   sayilarak olculur — `-g` yazmak keyframe uretildigi anlamina gelmez,
   sessiz no-op tuzagi (dikis-olcum tuzaklari #2).

   Cikti: film/envanter.json + stdout tablosu
   Kullanim: node yeni/film/envanter.cjs */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const KAYNAK = path.join(process.env.USERPROFILE, 'Desktop', 'QANATONE SAHNELER 4K');
const CIKTI_DIZIN = path.join(__dirname, '..', 'public', 'varlik', 'film');
const KANON = require('../src/film/kanon.json');
const BUTCE = 32 * 1048576;

const sh = (f, a) => execFileSync(f, a, { encoding: 'utf8', maxBuffer: 1 << 28 });

function gop(dosya) {
  const c = sh('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'frame=key_frame', '-of', 'csv=p=0', dosya]).trim().split(/\r?\n/);
  const kare = c.length;
  const anahtar = c.filter((x) => x.trim() === '1').length;
  return { kare, anahtar, ort: anahtar ? +(kare / anahtar).toFixed(2) : null };
}

function akis(dosya) {
  /* ALAN ADINA GORE AYRISTIR, SIRAYA GUVENME: ffprobe csv ciktisi
     -show_entries'te yazdigin sirayi DEGIL kendi ic sirasini kullaniyor
     (gercekte codec_name,width,height,r_frame_rate geliyor). Konuma gore
     okuyan ilk surum genislige `hevc` atadi ve tablo NaNx3840 bastik —
     ustelik bu, 39 klibin tamamini "aykiri cozunurluk" diye listeledi.
     key=value bicimi bu sinif hatayi bastan keser. */
  const ham = sh('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,codec_name,r_frame_rate',
    '-of', 'default=noprint_wrappers=1', dosya]);
  const a = {};
  for (const s of ham.trim().split(String.fromCharCode(10))) { const i = s.indexOf('='); if (i > 0) a[s.slice(0, i)] = s.trim().slice(i + 1).trim(); }
  for (const alan of ['width', 'height', 'codec_name', 'r_frame_rate'])
    if (!(alan in a)) throw new Error(`ffprobe ${alan} vermedi: ${dosya}`);
  const [x, y] = String(a.r_frame_rate).split('/');
  return { gen: +a.width, yuk: +a.height, kodek: a.codec_name, fps: +(+x / +(y || 1)).toFixed(3) };
}

/* GOP ONBELLEGI: 4K ustada kare kare key_frame saymak klip basina ~8,6 sn
   suruyor (39 klip ~6 dk). Dosya boyutu degismediyse onceki olcum aynen
   gecerlidir; yeniden saymayiz. */
const ONCEKI = (() => {
  try { return new Map(require('./envanter.json').klip.map((k) => [k.n, k])); } catch { return new Map(); }
})();
function gopOnbellekli(dosya, n, taraf) {
  const o = ONCEKI.get(n);
  const b = fs.statSync(dosya).size;
  if (o && o[taraf] && o[taraf].bayt === b && o[taraf].gop != null)
    return { ort: o[taraf].gop, kare: o[taraf].kare, anahtar: null };
  return gop(dosya);
}

const satir = [];
for (const k of KANON.klip) {
  const kSrc = path.join(KAYNAK, k.dosya);
  const kOut = path.join(CIKTI_DIZIN, `sahne${k.n}.mp4`);
  process.stderr.write(`  ${k.dosya} ...\r`);
  const s = akis(kSrc); const sg = gopOnbellekli(kSrc, k.n, 'kaynak');
  const varOut = fs.existsSync(kOut);
  const o = varOut ? akis(kOut) : null; const og = varOut ? gopOnbellekli(kOut, k.n, 'cikti') : null;
  satir.push({
    n: k.n, dosya: k.dosya,
    kaynak: { sure: k.sure, fps: s.fps, gen: s.gen, yuk: s.yuk, kodek: s.kodek,
      gop: sg.ort, kare: sg.kare, bayt: fs.statSync(kSrc).size },
    cikti: varOut ? { fps: o.fps, gen: o.gen, yuk: o.yuk, kodek: o.kodek,
      gop: og.ort, kare: og.kare, bayt: fs.statSync(kOut).size } : null,
  });
}
process.stderr.write('                                   \r');

const t = (f) => satir.reduce((a, r) => a + f(r), 0);
const toplamSure = +t((r) => r.kaynak.sure).toFixed(3);
const kaynakBayt = t((r) => r.kaynak.bayt);
const ciktiBayt = t((r) => (r.cikti ? r.cikti.bayt : 0));

/* AYKIRI: cogunluktan sapan fps / cozunurluk */
const cok = (dizi) => {
  const m = new Map();
  for (const x of dizi) m.set(x, (m.get(x) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
};
const fpsCok = cok(satir.map((r) => r.kaynak.fps));
const cozCok = cok(satir.map((r) => `${r.kaynak.gen}x${r.kaynak.yuk}`));
const aykiriFps = satir.filter((r) => r.kaynak.fps !== fpsCok).map((r) => `${r.dosya} (${r.kaynak.fps} fps)`);
const aykiriCoz = satir.filter((r) => `${r.kaynak.gen}x${r.kaynak.yuk}` !== cozCok).map((r) => `${r.dosya} (${r.kaynak.gen}x${r.kaynak.yuk})`);
const aykiriCiktiCoz = satir.filter((r) => r.cikti && r.cikti.yuk !== 1080).map((r) => `${r.dosya} (${r.cikti.gen}x${r.cikti.yuk})`);
const eksikCikti = satir.filter((r) => !r.cikti).map((r) => r.dosya);

const p = (x, n) => String(x).padStart(n);
const mib = (b) => (b / 1048576).toFixed(2);
console.log('\nKAYNAK: ' + KAYNAK);
console.log('CIKTI : yeni/public/varlik/film/sahneN.mp4  (32 MiB butcesi BUNUN icin)\n');
console.log('  #  dosya          sure    fps   cozunurluk   kodek   GOP     kaynak MiB  |  cikti cozunurluk  kodek  GOP    cikti MiB');
console.log('  ' + '-'.repeat(116));
for (const r of satir) {
  const c = r.cikti;
  console.log('  ' + p(r.n, 2) + '  ' + r.dosya.padEnd(13)
    + p(r.kaynak.sure.toFixed(3), 7) + p(r.kaynak.fps, 7) + p(`${r.kaynak.gen}x${r.kaynak.yuk}`, 13)
    + p(r.kaynak.kodek, 8) + p(r.kaynak.gop, 6) + p(mib(r.kaynak.bayt), 14)
    + '  |  ' + p(c ? `${c.gen}x${c.yuk}` : 'YOK', 15) + p(c ? c.kodek : '—', 7)
    + p(c ? c.gop : '—', 6) + p(c ? mib(c.bayt) : '—', 12));
}
console.log('  ' + '-'.repeat(116));
console.log(`  TOPLAM SURE : ${toplamSure} sn (${Math.floor(toplamSure / 60)} dk ${(toplamSure % 60).toFixed(1)} sn) · ${t((r) => r.kaynak.kare)} kare`);
console.log(`  TOPLAM BAYT : kaynak ${mib(kaynakBayt)} MiB · CIKTI ${mib(ciktiBayt)} MiB`);
const kalan = BUTCE - ciktiBayt;
console.log(`  32 MiB PAYI : ${mib(ciktiBayt)} / 32 MiB — kalan pay ${mib(kalan)} MiB ` +
  `(${kalan < 0 ? 'ASILDI, butcenin x' + (ciktiBayt / BUTCE).toFixed(2) : 'icinde'})`);
console.log('');
console.log(`  AYKIRI fps (cogunluk ${fpsCok})           : ${aykiriFps.length ? aykiriFps.join(', ') : 'yok'}`);
console.log(`  AYKIRI kaynak cozunurluk (cogunluk ${cozCok}): ${aykiriCoz.length ? aykiriCoz.join(', ') : 'yok'}`);
console.log(`  AYKIRI cikti cozunurluk (hedef 1080 satir) : ${aykiriCiktiCoz.length ? aykiriCiktiCoz.join(', ') : 'yok'}`);
console.log(`  CIKTISI EKSIK klip                        : ${eksikCikti.length ? eksikCikti.join(', ') : 'yok'}`);

fs.writeFileSync(path.join(__dirname, 'envanter.json'), JSON.stringify({
  _: 'yeni/film/envanter.cjs — 39 klip ffprobe envanteri. GOP kare kare key_frame sayimiyla OLCULDU (kanon.json GOP tasimaz). 32 MiB butcesi CIKTI hatti icindir; kaynak 4K ustalar butceye girmez.',
  olcum: new Date().toISOString(), kaynak: KAYNAK,
  toplam: { sure_sn: toplamSure, kare: t((r) => r.kaynak.kare), kaynak_bayt: kaynakBayt, cikti_bayt: ciktiBayt,
    butce_bayt: BUTCE, kalan_pay_bayt: kalan, butceye_gore_x: +(ciktiBayt / BUTCE).toFixed(2) },
  cogunluk: { fps: fpsCok, cozunurluk: cozCok },
  aykiri: { fps: aykiriFps, kaynak_cozunurluk: aykiriCoz, cikti_cozunurluk: aykiriCiktiCoz, ciktisi_eksik: eksikCikti },
  klip: satir,
}, null, 1));
console.log('\n→ film/envanter.json');
