#!/usr/bin/env node
/* FILM · DIKIS TABANI — "sicrama" hukmu yanlis kirmizi mi?
   Dikis PSNR'i tek basina anlamsizdir: kamera surekli hareket ettigi icin
   KLIP ICINDEKI ardisik kareler de birbirinden farklidir. Olculen sey
   dikisin bu dogal kare-basi degisimden FAZLA olup olmadigi olmali.
   Yontem: her encode edilmis masaustu klibin SON 4 karesi cikarilir,
   ardisik ciftlerin PSNR'i olculur -> o klibin kare-basi hareket tabani
   (medyan). Dikis N->N+1 icin taban = N'in tabani ile N+1'in tabaninin
   ortalamasi. delta = dikis_psnr - taban.
     delta >= -1 dB : dikis klip ici kadar surekli
     -1 > delta >= -4: hafif sapma
     delta < -4 dB  : gercek sicrama
   Cikti: film/taban.json

   ---- IKI DUZELTME (31 Agu 2026), BU BETIK ARTIK KAPI DEGIL ----

   1) "PAYLASILAN KARE" SOZLESMESI OLCUMLE CURUDU. Belgelerde "her klibin
      son karesi bir sonrakinin ilk karesiyle AYNIDIR" yaziyordu. Olculdu:
      38 dikisin SIFIRI birebir ayni kare — HAM 4K ustalarda da (dikis.json
      ozet: esit 0). Zincir SUREKLI ama kare TEKRARLI DEGIL: B, A'nin son
      karesinden SONRAKI kareyle basliyor. Dikis PSNR'inin klip ici ardisik
      kare PSNR'ine yakin cikmasinin sebebi budur; "ayni kare" olsaydi
      PSNR sonsuza giderdi.
      Sonucu: dikiste sicrama gorunmesi "encode ya da seek bozuk" demek
      DEGIL — sapmalar kaynagin kendisinde, encode ne ekliyor ne cikariyor
      (dikis.json'da encode ve ham hatlari yan yana).

   2) TABAN YANLIS YERDEN ORNEKLENIYOR. Bu betik dikis N->N+1 icin tabani
      iki klibin tabaninin ORTALAMASI aliyor ve N+1'in tabanini klibin
      SONUNDAN olcuyor — oysa dikis N+1'in BASINDA. Kamera dikiste
      yavasliyorsa ortalama hicbir yani temsil etmez. Ayni 38 dikis uc
      olcutle 8 / 4 / 0 sicrama verdi (film/dikis-yerel.json `olcut_kiyasi`).
      GECERLI OLCUT: `min(A sonu, B basi)` — film/dikis-yerel.cjs. Bu betik
      tarihsel kayit olarak duruyor, hukum ondan alinmaz. */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const VARLIK = path.join(KOK, 'public', 'varlik', 'film');
const GECICI = path.join(__dirname, '.taban');
const DIKIS = JSON.parse(fs.readFileSync(path.join(__dirname, 'dikis.json'), 'utf8'));
fs.mkdirSync(GECICI, { recursive: true });

const ff = (args) => spawnSync('ffmpeg', args, { encoding: 'utf8' });

function sonKareler(n) {
  // reverse ile son 4 kare: cikan 0 = son kare, 1 = son-1 ...
  const cik = path.join(GECICI, `s${n}-%d.png`);
  const r = ff(['-v', 'error', '-y', '-i', path.join(VARLIK, `sahne${n}.mp4`),
    '-vf', 'reverse', '-frames:v', '4', '-q:v', '2', cik]);
  if (r.status !== 0) throw new Error(`sahne${n} kare cikarma: ${r.stderr}`);
  return [1, 2, 3, 4].map((i) => path.join(GECICI, `s${n}-${i}.png`));
}

function psnr(a, b) {
  const r = ff(['-v', 'info', '-i', a, '-i', b, '-lavfi', 'psnr', '-f', 'null', '-']);
  const m = (r.stderr || '').match(/average:([0-9.]+|inf)/);
  if (!m) return null;
  return m[1] === 'inf' ? 99 : Number(m[1]);
}

const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

const taban = {};
for (let n = 1; n <= 39; n++) {
  const k = sonKareler(n);
  const cift = [psnr(k[1], k[0]), psnr(k[2], k[1]), psnr(k[3], k[2])].filter((x) => x != null);
  taban[n] = { klip: n, cift: cift.map((x) => Number(x.toFixed(2))), taban: Number(medyan(cift).toFixed(2)) };
  process.stderr.write(`sahne${n} taban=${taban[n].taban} dB\n`);
}

const enc = DIKIS.dikis.filter((d) => d.hat === 'encode');
const satir = enc.map((d) => {
  const [a, b] = d.dikis.split('→').map(Number);
  const t = Number(((taban[a].taban + taban[b].taban) / 2).toFixed(2));
  const delta = Number((d.psnr - t).toFixed(2));
  const hukum = delta >= -1 ? 'SUREKLI' : delta >= -4 ? 'hafif-sapma' : 'GERCEK-SICRAMA';
  return { dikis: d.dikis, psnr: d.psnr, taban: t, delta, eski_sinif: d.sinif, hukum };
});

const say = (h) => satir.filter((s) => s.hukum === h).length;
const cikti = {
  _: 'yeni/film/taban.cjs — dikis PSNR\'i klip ici kare-basi degisim tabanina gore olculdu. Mutlak PSNR esigi yanlis kirmizi uretiyor.',
  olcum: new Date().toISOString(),
  esik: { surekli: 'delta >= -1 dB', hafif: '-1 > delta >= -4 dB', sicrama: 'delta < -4 dB' },
  ozet: { surekli: say('SUREKLI'), hafif_sapma: say('hafif-sapma'), gercek_sicrama: say('GERCEK-SICRAMA'),
    gercek_sicrama_dikisler: satir.filter((s) => s.hukum === 'GERCEK-SICRAMA').map((s) => s.dikis) },
  klip_taban: Object.values(taban),
  dikis: satir,
};
fs.writeFileSync(path.join(__dirname, 'taban.json'), JSON.stringify(cikti, null, 1));
fs.rmSync(GECICI, { recursive: true, force: true });
console.log(JSON.stringify(cikti.ozet, null, 1));
