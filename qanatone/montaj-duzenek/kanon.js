// KANON — bir klibin fps / cozunurluk / GOP / bit hizi. Klipler gelince ILK IS.
// NOT: bu makinede ffprobe YOK (CapCut derlemesi --disable-ffprobe). GOP, I-kare
// sayarak olculuyor: ffmpeg select=eq(pict_type,I). Duzenek kendini bilinen-GOP
// dosyalarla dogrular (--dogrula).
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');

const FF = 'C:/Users/Monster/AppData/Local/CapCut/Apps/8.5.0.3590/ffmpeg.exe';

function ffmpeg(args){
  // ffmpeg kunye ve ilerleme satirini STDERR'e yazar — ikisi de toplanmali
  const r = spawnSync(FF, args, { encoding:'utf8', maxBuffer: 64*1024*1024 });
  return (r.stdout || '') + (r.stderr || '');
}

function kunye(dosya){
  const cikti = ffmpeg(['-hide_banner','-i', dosya]);
  const s = /Stream #\d+:\d+.*?: Video: ([^\s,]+)[^,]*, ([^,]+), (\d+)x(\d+)[^,]*(?:,[^,]*)*?, ([\d.]+) fps/.exec(cikti);
  const sure = /Duration: (\d+):(\d+):([\d.]+)/.exec(cikti);
  const hiz  = /bitrate: (\d+) kb\/s/.exec(cikti);
  return {
    kodek: s ? s[1] : null,
    piksel: s ? s[2].trim() : null,
    en: s ? +s[3] : null, boy: s ? +s[4] : null,
    fps: s ? +s[5] : null,
    sure_sn: sure ? (+sure[1]*3600 + +sure[2]*60 + +sure[3]) : null,
    bit_kbps: hiz ? +hiz[1] : null,
    bayt: fs.statSync(dosya).size,
  };
}

function ikareSay(dosya){
  // I-kareleri sec ve say — "frame= N" son satirdan okunur
  const c = ffmpeg(['-hide_banner','-i',dosya,'-vf','select=eq(pict_type\\,I)','-fps_mode','passthrough','-f','null','-']);
  const m = [...c.matchAll(/frame=\s*(\d+)/g)];
  return m.length ? +m[m.length-1][1] : null;
}

function toplamKare(dosya){
  const c = ffmpeg(['-hide_banner','-i',dosya,'-fps_mode','passthrough','-f','null','-']);
  const m = [...c.matchAll(/frame=\s*(\d+)/g)];
  return m.length ? +m[m.length-1][1] : null;
}

function oku(dosya){
  const k = kunye(dosya);
  const toplam = toplamKare(dosya);
  const ikare = ikareSay(dosya);
  k.kare = toplam;
  k.ikare = ikare;
  k.gop_ort = (toplam && ikare) ? +(toplam/ikare).toFixed(2) : null;
  k.sn_basina_kb = k.sure_sn ? Math.round(k.bayt/k.sure_sn/1024) : null;
  return k;
}

const yollar = process.argv.slice(2).filter(a => a !== '--dogrula');
const dogrula = process.argv.includes('--dogrula');

if (dogrula){
  // KAPI: GOP'u bilinen dosyalarla olcut dogrulanir
  const bekle = [
    ['malzeme/video/k1_g1_1080p.mp4', 1],
    ['malzeme/video/k1_g6_1080p.mp4', 6],
    ['malzeme/video/k1_g12_1080p.mp4', 12],
    ['malzeme/video/k1_g24_1080p.mp4', 24],
  ];
  let hepsiGecti = true;
  for (const [f, g] of bekle){
    if (!fs.existsSync(f)) { console.log('ATLANDI (dosya yok):', f); continue; }
    const k = oku(f);
    const gecti = k.gop_ort !== null && Math.abs(k.gop_ort - g) <= Math.max(1, g*0.15);
    if (!gecti) hepsiGecti = false;
    console.log(`${gecti?'GECTI':'KALDI'}  ${path.basename(f)}  beklenen GOP ${g}  olculen ${k.gop_ort}  (kare ${k.kare}, I ${k.ikare}, fps ${k.fps}, ${k.en}x${k.boy})`);
  }
  console.log(hepsiGecti ? '\nKAPI GECTI — olcut guvenilir.' : '\nKAPI KALDI — GOP olcutu duzeltilmeden klip okunmaz.');
  process.exit(hepsiGecti ? 0 : 1);
}

if (!yollar.length){
  console.log('kullanim: node kanon.js <klip.mp4> [...]   |   node kanon.js --dogrula');
  process.exit(1);
}

const hepsi = [];
for (const y of yollar){
  const dosyalar = fs.statSync(y).isDirectory()
    ? fs.readdirSync(y).filter(f=>/\.(mp4|mov|webm|mkv)$/i.test(f)).map(f=>path.join(y,f))
    : [y];
  for (const d of dosyalar) hepsi.push({ dosya: path.basename(d), ...oku(d) });
}

console.log('| dosya | kodek | çözünürlük | fps | süre | kare | I-kare | **GOP ort** | MB | KB/sn |');
console.log('|---|---|---|---:|---:|---:|---:|---:|---:|---:|');
for (const k of hepsi)
  console.log(`| ${k.dosya} | ${k.kodek} | ${k.en}×${k.boy} | ${k.fps} | ${k.sure_sn} sn | ${k.kare} | ${k.ikare} | **${k.gop_ort}** | ${(k.bayt/1048576).toFixed(1)} | ${k.sn_basina_kb} |`);

// KANON KAPISI: hepsi ayni fps/cozunurlukte mi
const fpsKume = [...new Set(hepsi.map(k=>k.fps))], colKume = [...new Set(hepsi.map(k=>k.en+'x'+k.boy))];
console.log('\n### Kanon kapısı');
console.log(`- fps: ${fpsKume.join(' · ')} ${fpsKume.length===1?'✓ tek':'✗ SAPMA VAR — sapan klip yeniden üretilmeli'}`);
console.log(`- çözünürlük: ${colKume.join(' · ')} ${colKume.length===1?'✓ tek':'✗ SAPMA VAR'}`);
const seyrek = hepsi.filter(k => k.gop_ort !== null && k.gop_ort > 8);
console.log(`- GOP: ${seyrek.length ? `✗ ${seyrek.length} klipte GOP > 8 — SARMA KOPAR, hepsi yeniden kodlanacak` : '✓ hepsi sık anahtar-kareli'}`);
fs.writeFileSync('kanon.json', JSON.stringify(hepsi, null, 1));
