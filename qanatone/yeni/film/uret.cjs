#!/usr/bin/env node
/* FILM · URETIM HATTI — 39 ham klip -> masaustu + mobil cift hat + posterler
   + sinir kareleri. Her adim HIGGSFIELD-SCRUB-MOTORU.md §6'daki betigi
   (`scroll-scrub-video.sh`) BIREBIR cagirir; parametre burada yasamaz.
   Sira (belge §6 "kullanim sirasi"):
     desktop  ham -> public/varlik/film/sahneN.mp4
     mobile   ham -> public/varlik/film/sahneN-mobile.mp4
     poster   ENCODE EDILMIS klipten (sert degismez #1: kaynak videodan degil)
     bounds   ENCODE EDILMIS masaustu klipten -> film/dikis/sahneN-{first,last}.png
   Ek (bizim kapi): bounds HAM klipten de -> film/dikis-ham/ — encode
   gurultusu ile uretim dikisini ayirt etmek icin (dikis.cjs ikisini de olcer).
   Cikti kunyesi: film/uretim.json (bayt + sha1; denetim posterin encode
   edilmis klipten geldigini bu kayitla dogrular).

   Kullanim: node yeni/film/uret.cjs [--sadece 1,2,3] [--paralel 3] */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const KOK = path.join(__dirname, '..');
const KANON = JSON.parse(fs.readFileSync(path.join(KOK, 'src', 'film', 'kanon.json'), 'utf8'));
const KAYNAK = KANON.kaynak;   /* probe.cjs ne okuduysa o — tek kaynak */
if (!fs.existsSync(KAYNAK)) { console.error('kaynak klasor yok: ' + KAYNAK + '\n  once: node yeni/film/probe.cjs "<klasor>"'); process.exit(1); }
const VARLIK = path.join(KOK, 'public', 'varlik', 'film');
/* PNG posterler ARA URUNDUR: public/ altinda dururlarsa dist'e kopyalanip
   yayina cikarlar (olculdu: 87,9 MiB bos yuk). Sayfaya inen bicim WebP
   (poster-web.cjs). PNG kanon/QA kaynagi olarak repo disi tutulur. */
const POSTER_HAM = path.join(__dirname, 'poster-ham');
const DIKIS = path.join(__dirname, 'dikis');
const DIKIS_HAM = path.join(__dirname, 'dikis-ham');
const BETIK = path.join(__dirname, 'scroll-scrub-video.sh');
const KUNYE = path.join(__dirname, 'uretim.json');

const arg = (ad, vars) => { const i = process.argv.indexOf(ad); return i > 0 ? process.argv[i + 1] : vars; };
const sadece = arg('--sadece', '').split(',').filter(Boolean).map(Number);
const PARALEL = Number(arg('--paralel', Math.max(1, Math.min(3, Math.floor(os.cpus().length / 4)))));

const sha1 = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
/* KADRAJ DUZELTMESI KALKTI (27 Agu 2026, ayni gun ikinci karar).
   sahne1 bir sure 1144x804 (oran 1,423) uretilmisti ve encode zincirinde
   kirpiliyordu. Enes klibi 16:9 YENIDEN URETTI: artik 1284x716, obur 38
   klible birebir. Kirpma adimi bu yuzden kaldirildi — kaynak duzelince
   telafi katmani da kalkar, yoksa iki kez kirpilirdi.
   Tablo bos: hicbir klip on-filtre almiyor. Bir klip yine ayrisirsa
   girisi buraya yazmak yeter, yol degismez. */
const KADRAJ = {};

/* ACILIS KOPYASI (27 Agu 2026, Enes karari) — yavas 4G'de (4 Mbit) ilk kare
   2663 ms olculdu, kapi 1500 ms. Kok: sahne1 tek basina mobilde ~0,9 MB.
   Cozum: sahne1'in ILK SANIYELERINI tasiyan ayri, kucuk bir kopya. Motor
   once onu indirir, ilk kare boyanir; tam kopya arkada iner ve ayni kareye
   sarilip takas edilir.
   KALITE AYNI: acilis kopyasi tam kopyayla BIREBIR ayni CRF/cozunurluk/
   unsharp zinciriyle uretilir, yalniz zaman ekseni kisadir. Dusuk bitrate
   secilmedi — oyle olsaydi takas anında kalite sicramasi GORUNURDU.
   ACILIS ANA HATTAN AYRILDI (Enes, 27 Agu — 2. ayar): sure 2 sn -> 1,2 sn
   ve CRF ana hattan +4. Gerekce: ana hat CRF 22/24'e yukselince acilis
   564 KB'a cikti ve yavas 4G'de ILK KARE kapisini (1,5 sn) tek basina
   yiyordu (564 KB @ 4 Mbit = 1156 ms). Hedef < 250 KB.
   Kalite sicramasi gorunmez: tam kopyaya gecis AYNI kareye sarilarak,
   tek sinif degisimiyle yapiliyor. */
const ACILIS = { 1: { sn: 1.2, crfArti: 4 } };

/* encode edilmis dosyanin GERCEK boyutu — kunyeye yazilir ki sahne dizisi
   (src/film/sahneler.ts) ham kanondan degil ciktidan okusun. sahne1 kirpildi,
   mobil hat 540 satira indi: ikisi de kanon.json'daki ham boyuttan farkli. */
const boyut = (f) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f], { encoding: 'utf8' });
  const [g, y] = (r.stdout || '').trim().split(',').map(Number);
  return { gen: g, yuk: y };
};

/* prevf ILK argüman: `(...a)` rest parametresi YENI bir dizi urettigi icin
   diziye ilistirilen ozellik (a.prevf) cagri sirasinda kayboluyordu —
   olculdu: sahne1 kirpilmadan 1144x804 cikti. Imza artik acik. */
const bash = (prevf, eylem, giris, cikis, crfArti, kodek) => new Promise((res, rej) => {
  const a = [eylem, giris, cikis];
  const p = spawn('bash', [BETIK, ...a], { stdio: ['ignore', 'inherit', 'pipe'],
    env: { ...process.env,
      QSS_PREVF: (eylem === 'desktop' || eylem === 'mobile') ? (prevf || '') : '',
      QSS_CRF_ARTI: String(crfArti || 0),
      QSS_KODEK: kodek || 'h264' } });
  let err = '';
  p.stderr.on('data', (d) => { err += d; });
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${a[0]} ${a[1]} -> kod ${c}\n${err}`))));
});

/* IKI KODEK (Enes, 27 Agu aksam): H.265 ana, H.264 yedek. Her klip ve
   acilis kopyasi iki kodekle uretilir; tarayici canPlayType ile secer.
   Dosya adi: h264 -> sahneN.mp4 (degismedi), h265 -> sahneN-h265.mp4.
   POSTER ve BOUNDS H.264'ten: iki kodegin ilk karesi ayni kaynaktan ayni
   filtre zinciriyle gelir; poster tek olur, kanon H.264 (her tarayicida
   var) secildi. Sert degismez #1 korunur: poster ENCODE EDILMIS klipten. */
const KODEK = ['h264', 'h265'];
const ek = (k) => (k === 'h264' ? '' : `-${k}`);

async function klip(n) {
  const ham = path.join(KAYNAK, `sahne${n}.mp4`);
  const dp = path.join(POSTER_HAM, `sahne${n}-poster.png`);
  const mp = path.join(POSTER_HAM, `sahne${n}-mobile-poster.png`);
  const t0 = Date.now();
  const kadraj = KADRAJ[n] || '';
  const hat = {};
  for (const kd of KODEK) {
    const d = path.join(VARLIK, `sahne${n}${ek(kd)}.mp4`);
    const m = path.join(VARLIK, `sahne${n}-mobile${ek(kd)}.mp4`);
    await bash(kadraj, 'desktop', ham, d, 0, kd);
    await bash(kadraj, 'mobile', ham, m, 0, kd);
    hat[kd] = {
      masaustu: { dosya: path.basename(d), bayt: fs.statSync(d).size, sha1: sha1(d), ...boyut(d) },
      mobil: { dosya: path.basename(m), bayt: fs.statSync(m).size, sha1: sha1(m), ...boyut(m) },
    };
  }
  const d = path.join(VARLIK, `sahne${n}.mp4`);     /* kanon (h264) — poster/bounds kaynagi */
  const m = path.join(VARLIK, `sahne${n}-mobile.mp4`);
  /* acilis: ayni zincire trim eklenir — kadraj varsa ONCE kadraj, sonra kesim */
  let acilis = null;
  if (ACILIS[n]) {
    const { sn, crfArti } = ACILIS[n];
    const kes = `${kadraj ? kadraj + ',' : ''}trim=0:${sn},setpts=PTS-STARTPTS`;
    acilis = { sn, crf_arti: crfArti };
    for (const kd of KODEK) {
      const ad = path.join(VARLIK, `sahne${n}-acilis${ek(kd)}.mp4`);
      const am = path.join(VARLIK, `sahne${n}-acilis-mobile${ek(kd)}.mp4`);
      await bash(kes, 'desktop', ham, ad, crfArti, kd);
      await bash(kes, 'mobile', ham, am, crfArti, kd);
      acilis[kd] = {
        masaustu: { dosya: path.basename(ad), bayt: fs.statSync(ad).size, sha1: sha1(ad), ...boyut(ad) },
        mobil: { dosya: path.basename(am), bayt: fs.statSync(am).size, sha1: sha1(am), ...boyut(am) },
      };
    }
    /* geriye uyum: kokteki masaustu/mobil = h264 */
    acilis.masaustu = acilis.h264.masaustu; acilis.mobil = acilis.h264.mobil;
  }
  await bash('', 'poster', d, dp);
  await bash('', 'poster', m, mp);
  await bash('', 'bounds', d, path.join(DIKIS, `sahne${n}`));
  await bash('', 'bounds', ham, path.join(DIKIS_HAM, `sahne${n}`));
  const k = {
    n,
    kadraj: kadraj || null,
    acilis,
    masaustu: hat.h264.masaustu,          /* kanon = h264 (geriye uyum) */
    mobil: hat.h264.mobil,
    h265: hat.h265,
    poster: { dosya: `sahne${n}-poster.png`, bayt: fs.statSync(dp).size, sha1: sha1(dp), kaynak_sha1: sha1(d) },
    mobil_poster: { dosya: `sahne${n}-mobile-poster.png`, bayt: fs.statSync(mp).size, sha1: sha1(mp), kaynak_sha1: sha1(m) },
    sure_ms: Date.now() - t0,
  };
  console.log(`sahne${n}: h264 ${(k.masaustu.bayt / 1048576).toFixed(2)}/${(k.mobil.bayt / 1048576).toFixed(2)} MB · h265 ${(k.h265.masaustu.bayt / 1048576).toFixed(2)}/${(k.h265.mobil.bayt / 1048576).toFixed(2)} MB${acilis ? ` · AÇILIŞ h264 ${(acilis.h264.mobil.bayt / 1024).toFixed(0)} KB h265 ${(acilis.h265.mobil.bayt / 1024).toFixed(0)} KB (mobil)` : ''} · ${(k.sure_ms / 1000).toFixed(0)} sn`);
  return k;
}

(async () => {
  fs.mkdirSync(VARLIK, { recursive: true });
  fs.mkdirSync(POSTER_HAM, { recursive: true });
  fs.mkdirSync(DIKIS, { recursive: true });
  fs.mkdirSync(DIKIS_HAM, { recursive: true });
  const liste = KANON.klip.map((k) => k.n).filter((n) => !sadece.length || sadece.includes(n));
  const eski = fs.existsSync(KUNYE) ? JSON.parse(fs.readFileSync(KUNYE, 'utf8')) : { klip: [] };
  const sonuc = new Map(eski.klip.map((k) => [k.n, k]));
  console.log(`${liste.length} klip · paralel ${PARALEL} · betik ${path.basename(BETIK)}`);
  const t0 = Date.now();
  let i = 0;
  const isci = async () => {
    while (i < liste.length) {
      const n = liste[i++];
      try { sonuc.set(n, await klip(n)); }
      catch (e) { console.error(`sahne${n} HATA:`, e.message); sonuc.set(n, { n, hata: e.message }); }
    }
  };
  await Promise.all(Array.from({ length: PARALEL }, isci));
  const klipler = [...sonuc.values()].sort((a, b) => a.n - b.n);
  const top = (alan) => klipler.reduce((a, k) => a + ((k[alan] || {}).bayt || 0), 0);
  const kunye = {
    _: 'yeni/film/uret.cjs ciktisi. Posterler ENCODE EDILMIS klipten (kaynak_sha1 = o klibin sha1\'i). Yeniden uretmek: node yeni/film/uret.cjs',
    uretim: new Date().toISOString(),
    betik_sha1: sha1(BETIK),
    toplam: { masaustu_bayt: top('masaustu'), mobil_bayt: top('mobil'), poster_bayt: top('poster') + top('mobil_poster'),
      /* h265 hatti ayri sayilir: kullanici ya birini ya oburunu indirir, toplanmaz */
      h265_masaustu_bayt: klipler.reduce((a, k) => a + ((k.h265 || {}).masaustu || {}).bayt || 0, 0),
      h265_mobil_bayt: klipler.reduce((a, k) => a + ((k.h265 || {}).mobil || {}).bayt || 0, 0) },
    /* butce alani KAPI DEGIL (27 Agu): rapor icin duruyor; kapi uc olcu (olc.cjs) */
    butce: { masaustu_bayt: 32 * 1048576, mobil_bayt: 16 * 1048576 },
    klip: klipler,
  };
  fs.writeFileSync(KUNYE, JSON.stringify(kunye, null, 1));
  const mb = (b) => (b / 1048576).toFixed(2);
  console.log(`\nTOPLAM h264 masaüstü ${mb(kunye.toplam.masaustu_bayt)} · mobil ${mb(kunye.toplam.mobil_bayt)} MiB · h265 masaüstü ${mb(kunye.toplam.h265_masaustu_bayt)} · mobil ${mb(kunye.toplam.h265_mobil_bayt)} MiB · posterler ${mb(kunye.toplam.poster_bayt)} MiB · ${((Date.now() - t0) / 60000).toFixed(1)} dk`);
  console.log(`→ ${path.relative(process.cwd(), KUNYE)}`);
})().catch((e) => { console.error(e); process.exit(1); });
