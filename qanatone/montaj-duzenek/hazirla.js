// HAZIRLA — gercek klipleri karara gore iki merdivene kodlar ve agirlik raporu cikarir.
//
//   node hazirla.js <klip-klasoru> [cikti-klasoru]
//
// KARAR (25 Agu):
//   mobil    : 540x960  g24  (dikey 9:16 KIRPMA — klipler 16:9 uretiliyor)
//   masaustu : 1280x720 g6
//   608x1080 yalniz hizli baglanti icin ek merdiven (istege bagli)
//
// Klipler yeniden kodlanacak KABUL EDILIYOR (Kling'in kendi GOP'u seyrek olur -> sarma kopar).
// Once `node kanon.js <klasor>` kosulmali; kanon kapisi sapma gosterirse once o cozulur.
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');

const FF = 'C:/Users/Monster/AppData/Local/CapCut/Apps/8.5.0.3590/ffmpeg.exe';
const KAYNAK = process.argv[2];
const CIKTI  = process.argv[3] || path.join(path.dirname(KAYNAK || '.'), 'zincir');

if (!KAYNAK || !fs.existsSync(KAYNAK)){
  console.log('kullanim: node hazirla.js <klip-klasoru> [cikti-klasoru]');
  process.exit(1);
}

// SIRA — kliplerin oynatma sirasi. Dosya adlari gelince buraya yazilacak;
// eslesmezse alfabetik siraya duser ve UYARI verir.
const SIRA = [
  'dag-vadi', 'vadi-kanal-agzi', 'tunel', 'zemin-yonga', 'yonga-kuyu',
  'kuyu-cekirdek', 'cekirdek-ic', /* burada 3B durak var */ 'beyin-ic',
  'kabloya-giris', 'kablo-terminal',
];

const MERDIVEN = [
  { ad:'mobil',     en:540,  boy:960,  g:24, qp:26, kirp:'dikey' },
  { ad:'masaustu',  en:1280, boy:720,  g:6,  qp:26, kirp:'yok'   },
  { ad:'mobil-hd',  en:608,  boy:1080, g:24, qp:26, kirp:'dikey', istege_bagli:true },
];

function ffmpeg(args){
  const r = spawnSync(FF, args, { encoding:'utf8', maxBuffer: 64*1024*1024 });
  return { cikti:(r.stdout||'')+(r.stderr||''), kod:r.status };
}

function boyut(dosya){
  const c = ffmpeg(['-hide_banner','-i',dosya]).cikti;
  const m = /, (\d+)x(\d+)/.exec(c);
  const s = /Duration: (\d+):(\d+):([\d.]+)/.exec(c);
  return { en:m?+m[1]:null, boy:m?+m[2]:null, sn:s?(+s[1]*3600 + +s[2]*60 + +s[3]):null };
}

const dosyalar = fs.readdirSync(KAYNAK).filter(f=>/\.(mp4|mov|webm|mkv)$/i.test(f));
if (!dosyalar.length){ console.log('klip yok:', KAYNAK); process.exit(1); }

// sirala: SIRA listesindeki anahtara gore, bulunamayan sona alfabetik
const sirali = [...dosyalar].sort((a,b)=>{
  const ia = SIRA.findIndex(k => a.toLowerCase().includes(k));
  const ib = SIRA.findIndex(k => b.toLowerCase().includes(k));
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1; if (ib === -1) return -1;
  return ia - ib;
});
const eslesmeyen = sirali.filter(f => !SIRA.some(k => f.toLowerCase().includes(k)));
if (eslesmeyen.length) console.log('UYARI — SIRA listesiyle eslesmeyen klip (alfabetige dustu):', eslesmeyen.join(', '));

const rapor = [];
for (const m of MERDIVEN){
  if (m.istege_bagli && !process.argv.includes('--hepsi')) continue;
  const d = path.join(CIKTI, m.ad);
  fs.mkdirSync(d, { recursive:true });
  let toplam = 0, sure = 0;
  sirali.forEach((f, i) => {
    const kay = path.join(KAYNAK, f);
    const b = boyut(kay);
    // dikey kirpma: kaynak 16:9 kabul; merkezden 9:16 kes, sonra olcekle.
    // 1080 yuksekliginden en fazla 608 genislik cikar — bunun ustu BUYUTME olur.
    let vf;
    if (m.kirp === 'dikey'){
      const kw = Math.floor(b.boy * 9 / 16 / 2) * 2;
      const kx = Math.floor((b.en - kw) / 2 / 2) * 2;
      if (m.en > kw) console.log(`  ! ${f}: ${m.ad} ${m.en}px genislik istiyor, kirpma ${kw}px veriyor — BUYUTME`);
      vf = `crop=${kw}:${b.boy}:${kx}:0,scale=${m.en}:${m.boy}`;
    } else {
      vf = `scale=${m.en}:${m.boy}`;
    }
    const hedef = path.join(d, `d${i}.mp4`);
    const r = ffmpeg(['-hide_banner','-loglevel','error','-y','-i',kay,'-vf',vf,
      '-pix_fmt','yuv420p','-c:v','h264_nvenc','-preset','p5','-rc','constqp','-qp',String(m.qp),
      '-bf','0','-g',String(m.g),'-profile:v','high','-an','-movflags','+faststart',hedef]);
    if (r.kod !== 0){ console.log('  HATA', f, r.cikti.slice(-200)); return; }
    const bayt = fs.statSync(hedef).size;
    toplam += bayt; sure += b.sn || 0;
    rapor.push({ merdiven:m.ad, sira:i, kaynak:f, hedef:path.basename(hedef), bayt, sn:b.sn });
    console.log(`  ${m.ad} d${i}  ${f}  ${(bayt/1048576).toFixed(2)} MB  (${b.sn} sn)`);
  });
  console.log(`${m.ad.toUpperCase()}: ${sirali.length} durak · ${(toplam/1048576).toFixed(1)} MB · ${sure.toFixed(1)} sn · ${Math.round(toplam/sure/1024)} KB/sn\n`);
}

fs.writeFileSync(path.join(CIKTI,'agirlik.json'), JSON.stringify(rapor,null,1));
console.log('yazildi:', path.join(CIKTI,'agirlik.json'));
console.log('\nSONRAKI ADIM: node kanon.js ' + path.join(CIKTI,'mobil') + '   (cikti kanonu da dogrulanmali)');
