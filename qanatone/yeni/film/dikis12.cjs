#!/usr/bin/env node
/* FILM · YALNIZ 1→2 DIKISI — sahne1 16:9 yeniden uretildi (kirpma kalkti)
   ve hat CRF 22/24'e yukseldi; bu dikis yeniden olculuyor. OBUR 37 DIKISE
   DOKUNULMUYOR: onlarin hukmu verildi (Enes), bu betik onlari okumaz da
   yazmaz da.

   Olcu, taban.cjs ile AYNI: mutlak PSNR tek basina hukum degil; dikis, iki
   klibin KENDI ICINDEKI ardisik kare degisiminin tabanina gore olculur.
     delta >= -1 dB  : SUREKLI
     -1 > delta >= -4: hafif sapma
     delta < -4 dB   : GERCEK SICRAMA
   Kareler `bounds` ciktisindan (encode edilmis masaustu hat) — yayina
   gidecek halin kendisi.
   Cikti: film/dikis12.json + film/kontak/dikis-1-2-YENI.png
   Kullanim: node yeni/film/dikis12.cjs */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const VARLIK = path.join(KOK, 'public', 'varlik', 'film');
const DIKIS = path.join(__dirname, 'dikis');
const KONTAK = path.join(__dirname, 'kontak');
const GECICI = path.join(__dirname, '.d12');
fs.mkdirSync(GECICI, { recursive: true });
fs.mkdirSync(KONTAK, { recursive: true });

const ff = (a) => spawnSync('ffmpeg', a, { encoding: 'utf8', maxBuffer: 1 << 26 });
const oku = (a, re) => { const m = (a.stderr || '').match(re); return m ? (m[1] === 'inf' ? 99 : Number(m[1])) : null; };
const psnr = (x, y) => oku(ff(['-v', 'info', '-i', x, '-i', y, '-lavfi', 'psnr', '-f', 'null', '-']), /average:([0-9.]+|inf)/);
const ssim = (x, y) => oku(ff(['-v', 'info', '-i', x, '-i', y, '-lavfi', 'ssim', '-f', 'null', '-']), /All:([0-9.]+)/);
const medyan = (a) => { const s = [...a].sort((p, q) => p - q); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

/* klip ici kare-basi degisim tabani: son 4 kareden ardisik ciftler */
function taban(n) {
  const cik = path.join(GECICI, `s${n}-%d.png`);
  const r = ff(['-v', 'error', '-y', '-i', path.join(VARLIK, `sahne${n}.mp4`), '-vf', 'reverse', '-frames:v', '4', '-q:v', '2', cik]);
  if (r.status !== 0) throw new Error(`sahne${n}: ${r.stderr}`);
  const k = [1, 2, 3, 4].map((i) => path.join(GECICI, `s${n}-${i}.png`));
  return medyan([psnr(k[1], k[0]), psnr(k[2], k[1]), psnr(k[3], k[2])].filter((x) => x != null));
}

const sol = path.join(DIKIS, 'sahne1-last.png');
const sag = path.join(DIKIS, 'sahne2-first.png');
for (const f of [sol, sag]) if (!fs.existsSync(f)) { console.error('bounds karesi yok: ' + f + '\n  once: node yeni/film/uret.cjs'); process.exit(1); }

const boyut = (f) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f], { encoding: 'utf8' });
  return (r.stdout || '').trim();
};

const p = psnr(sol, sag), s = ssim(sol, sag);
const t1 = taban(1), t2 = taban(2);
const t = +((t1 + t2) / 2).toFixed(2);
const delta = +(p - t).toFixed(2);
const hukum = delta >= -1 ? 'SUREKLI' : delta >= -4 ? 'hafif-sapma' : 'GERCEK-SICRAMA';

/* yan yana kare — goz karari icin */
const kiyas = path.join(KONTAK, 'dikis-1-2-YENI.png');
ff(['-v', 'error', '-y', '-i', sol, '-i', sag, '-lavfi', '[0:v][1:v]hstack', '-frames:v', '1', kiyas]);

const cikti = {
  _: 'yeni/film/dikis12.cjs — YALNIZ 1→2. Obur 37 dikisin hukmu verildi, dokunulmadi.',
  olcum: new Date().toISOString(),
  hat: 'masaustu CRF22 native (yayina giden)',
  boyut: { sahne1_son: boyut(sol), sahne2_ilk: boyut(sag), ayni: boyut(sol) === boyut(sag) },
  psnr: p, ssim: s, taban_sahne1: t1, taban_sahne2: t2, taban: t, delta, hukum,
  kiyas_kare: 'kontak/dikis-1-2-YENI.png',
};
fs.writeFileSync(path.join(__dirname, 'dikis12.json'), JSON.stringify(cikti, null, 1));
fs.rmSync(GECICI, { recursive: true, force: true });

console.log(`1→2 · boyut ${cikti.boyut.sahne1_son} / ${cikti.boyut.sahne2_ilk} ${cikti.boyut.ayni ? '(ayni)' : '(FARKLI!)'}`);
console.log(`     PSNR ${p} dB · SSIM ${s}`);
console.log(`     taban sahne1 ${t1} · sahne2 ${t2} -> ${t} dB`);
console.log(`     delta ${delta} dB -> ${hukum}`);
console.log(`→ film/dikis12.json · kare: film/kontak/dikis-1-2-YENI.png`);
