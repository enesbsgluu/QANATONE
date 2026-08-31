#!/usr/bin/env node
/* KESIT · YEDI DIKIS (31 Agu 2026, PROLOG-KESIT-VE-KAPANIS 1. adim)

   OLCUT: `min(A sonu, B basi)` — dikis adimi, HEMEN YANINDAKI en yavas
   adimdan kotu mu? Gorev sabiti bunu emrediyor; gerekcesi gecen turda
   olculdu (film/dikis-yerel.json `olcut_kiyasi`): ortalama taban dikisi
   YANLIS YERDEN ornekliyordu ve ayni 38 dikis uc olcutle 8 / 4 / 0 sicrama
   veriyordu. Ortalama, kamera dikiste yavasliyorsa hicbir yani temsil
   etmez; min taban "adim komsusundan kotu mu" sorusunu sorar.

   Esikler taban.cjs ile ayni: delta >= -1 surekli · -4'e kadar hafif ·
   altinda GERCEK SICRAMA.

   Kare uclari: kare i'nin zamani i/FPS (kare ORTASI DEGIL).

   Cikti: film/kesit-dikis.json
   Kullanim: node yeni/film/kesit-dikis.cjs */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const VARLIK = path.join(KOK, 'public', 'varlik', 'kesit');
const GECICI = path.join(__dirname, '.kesit-dikis-kare');
const U = require('./kesit-uretim.json');
const KESIT = require('./kesit.json');
const FPS = require('../src/film/kanon.json').fps;
fs.mkdirSync(GECICI, { recursive: true });

const ff = (a) => spawnSync('ffmpeg', a, { encoding: 'utf8' });
const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

function kareCek(dosya, i, cikis) {
  const r = ff(['-v', 'error', '-y', '-ss', String(i / FPS), '-i', dosya, '-frames:v', '1', '-q:v', '2', cikis]);
  if (r.status !== 0 || !fs.existsSync(cikis)) throw new Error(`kare cekilemedi ${dosya} @kare${i}: ${r.stderr}`);
  return cikis;
}
function psnr(a, b) {
  /* null SESSIZ GECMEZ: olcum uretmeyen bir olcum sifir degerle rapora girmemeli */
  const r = ff(['-v', 'info', '-i', a, '-i', b, '-lavfi', 'psnr', '-f', 'null', '-']);
  const m = (r.stderr || '').match(/average:([0-9.]+|inf)/);
  if (!m) throw new Error(`psnr uretilmedi: ${path.basename(a)} vs ${path.basename(b)}`);
  return m[1] === 'inf' ? 99 : Number(m[1]);
}
const ardisik = (k) => [psnr(k[1], k[0]), psnr(k[2], k[1]), psnr(k[3], k[2])];

const D = U.durak;
const satir = [];
for (let i = 0; i < D.length - 1; i++) {
  const a = D[i], b = D[i + 1];
  process.stderr.write(`  dikis ${a.n}|${b.n}      \r`);
  const fa = path.join(VARLIK, a.masaustu.dosya);
  const fb = path.join(VARLIK, b.masaustu.dosya);
  /* A'nin SON 4 karesi (0 = son), B'nin ILK 4 karesi */
  const aSon = [0, 1, 2, 3].map((j) => kareCek(fa, a.masaustu.kare - 1 - j, path.join(GECICI, `a${i}-${j}.png`)));
  const bIlk = [0, 1, 2, 3].map((j) => kareCek(fb, j, path.join(GECICI, `b${i}-${j}.png`)));
  const d = psnr(aSon[0], bIlk[0]);
  const aT = +medyan(ardisik(aSon)).toFixed(2);
  const bT = +medyan(ardisik(bIlk)).toFixed(2);
  const t = Math.min(aT, bT);
  const delta = +(d - t).toFixed(2);
  const anahtar = `${a.n}|${b.n}`;
  satir.push({
    dikis: anahtar,
    kaynak: `${a.kaynak}@kare${a.masaustu.kare - 1} → ${b.kaynak}@kare0`,
    yeni: KESIT.yeni_dikisler.includes(anahtar),
    psnr: +d.toFixed(2), a_taban: aT, b_taban: bT, taban: t, delta,
    hukum: delta >= -1 ? 'SUREKLI' : delta >= -4 ? 'hafif-sapma' : 'GERCEK-SICRAMA',
  });
}
process.stderr.write('                          \r');

const asan = satir.filter((s) => s.hukum === 'GERCEK-SICRAMA');
const enKotu = [...satir].sort((a, b) => a.delta - b.delta)[0];
const cikti = {
  _: 'yeni/film/kesit-dikis.cjs — kesitin 7 dikisi, olcut min(A sonu, B basi). YENI = kesitin dogurdugu dikis (orijinal zincirde komsu degillerdi).',
  olcum: new Date().toISOString(),
  olcut: 'delta = dikis_psnr - min(A son 4 kare medyani, B ilk 4 kare medyani)',
  esik: { surekli: 'delta >= -1 dB', hafif: '-1 > delta >= -4 dB', sicrama: 'delta < -4 dB' },
  ozet: {
    surekli: satir.filter((s) => s.hukum === 'SUREKLI').length,
    hafif_sapma: satir.filter((s) => s.hukum === 'hafif-sapma').length,
    gercek_sicrama: asan.length,
    esigi_asanlar: asan.map((s) => `${s.dikis} (${s.delta} dB)`),
    en_kotu: { dikis: enKotu.dikis, delta: enKotu.delta, yeni: enKotu.yeni },
    yeni_dikisler: satir.filter((s) => s.yeni).map((s) => `${s.dikis} ${s.delta} dB ${s.hukum}`),
  },
  dikis: satir,
};
fs.writeFileSync(path.join(__dirname, 'kesit-dikis.json'), JSON.stringify(cikti, null, 1));
fs.rmSync(GECICI, { recursive: true, force: true });

console.log('dikis'.padEnd(7), 'yeni'.padStart(5), 'PSNR'.padStart(7), 'A tab'.padStart(7), 'B tab'.padStart(7), 'min tab'.padStart(8), 'delta'.padStart(7), '  hukum');
console.log('-'.repeat(70));
for (const s of satir) console.log(s.dikis.padEnd(7), (s.yeni ? '★' : '·').padStart(5), String(s.psnr).padStart(7),
  String(s.a_taban).padStart(7), String(s.b_taban).padStart(7), String(s.taban).padStart(8), String(s.delta).padStart(7), '  ' + s.hukum);
console.log('-'.repeat(70));
console.log(`surekli ${cikti.ozet.surekli} · hafif ${cikti.ozet.hafif_sapma} · GERCEK SICRAMA ${cikti.ozet.gercek_sicrama}`);
console.log(`esigi asanlar: ${asan.length ? cikti.ozet.esigi_asanlar.join(', ') : 'yok'}`);
console.log(`en kotu: ${enKotu.dikis} · ${enKotu.delta} dB${enKotu.yeni ? ' (kesitin dogurdugu dikis)' : ''}`);
console.log('\n→ film/kesit-dikis.json');
