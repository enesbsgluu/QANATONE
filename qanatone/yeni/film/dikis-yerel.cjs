#!/usr/bin/env node
/* FILM · DIKIS TABANI, YEREL SURUM (31 Agu 2026, PROLOG-ISKELET 4. adim)

   NEDEN YENIDEN: `taban.cjs` dikisin tabanini iki hatali varsayimla kuruyor
   ve bu 8 "GERCEK SICRAMA" uretiyor. Ikisi de olcut hatasi, klip hatasi degil:

   1. ORTALAMA. Dikis N->N+1 icin taban, N ile N+1'in tabanlarinin
      ORTALAMASI aliniyor. Iki klibin hareket hizi cok farkliysa ortalama
      hicbirini temsil etmez. Ornek 3->4: sahne3 tabani 24,45 dB (hizli
      kamera), sahne4 tabani 49,60 dB (neredeyse duragan) -> ortalama 37,02.
      Dikis 23,66 cikinca delta -13,36 ve hukum "gercek sicrama". Oysa
      sahne3'un KENDI tabanina gore delta yalnizca -0,79.

   2. YANLIS UC. `sonKareler(n)` her klibin SON 4 karesini aliyor —
      N+1 icin de. Ama dikis N+1'in BASINDA. Yani B'nin tabani dikisle
      alakasiz bir yerden, klibin sonundan olculuyor.

   DOGRUSU: dikisin tabani DIKISIN IKI YANINDAKI hareketten kurulur —
   A'nin SON kareleri ve B'nin ILK kareleri. Havuzlanmis ardisik ciftlerin
   medyani taban olur. Esikler taban.cjs ile ayni birakildi (delta >= -1
   surekli · -4'e kadar hafif · altinda sicrama) ki tek degisen sey OLCUT
   olsun, hukum esigi degil.

   AYRICA HAM HAT: ayni olcum kaynak 4K ustalarda da kosar. "Sicrama
   varsa encode ya da seek bozuktur, kaynak klipler degil" (gorev sabiti)
   iddiasi ancak iki hat yan yana konunca sinanabilir.

   Cikti: film/dikis-yerel.json
   Kullanim: node yeni/film/dikis-yerel.cjs */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const VARLIK = path.join(KOK, 'public', 'varlik', 'film');
const KAYNAK = path.join(process.env.USERPROFILE, 'Desktop', 'QANATONE SAHNELER 4K');
const GECICI = path.join(__dirname, '.dikis-yerel');
fs.mkdirSync(GECICI, { recursive: true });

const ff = (args) => spawnSync('ffmpeg', args, { encoding: 'utf8' });
const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

/* KARE CIKARMA ZAMAN DAMGASIYLA, `reverse` ILE DEGIL.
   `-vf reverse` klibin TAMAMINI bellege alir: 4K'da 193 kare x ~24 MB
   ~4,6 GB eder (taban.cjs bunu yalniz 1080p ciktida yaptigi icin sorun
   cikmamisti; ham hat ayni yolu kaldirmaz). Kare indisleri kanondan
   bilindigi icin her kare kendi zamanindan tek tek alinir; girdi
   tarafinda arama (-ss ... -i) oldugu icin ayrica hizli. */
const KANON = require('../src/film/kanon.json');
const FPS = KANON.fps;
const kareSayisi = (n) => KANON.klip.find((k) => k.n === n).kare;
function kareCek(dosya, t, cikis) {
  const r = ff(['-v', 'error', '-y', '-ss', String(t), '-i', dosya, '-frames:v', '1', '-q:v', '2', cikis]);
  if (r.status !== 0 || !fs.existsSync(cikis)) throw new Error(`kare cekilemedi ${dosya} @${t}: ${r.stderr}`);
  return cikis;
}
/* UC TANIMI: kare i'nin zamani i/FPS — kare ORTASI (i+0.5)/FPS DEGIL.
   `-ss` girdi aramasi PTS >= t olan ilk kareyi verir; ortadan istenince
   SON kare (PTS 8,0000 < 8,0208) hic gelmez, ilk kare de bir kayar.
   Video etiketinin `currentTime` semantigi ortadir, ffmpeg'inki degil —
   iki ucun ayni sayilmasi klasik tuzak. Dogrulandi: bu formulle cekilen
   son kare `-vf reverse` ciktisiyla BIREBIR ayni (PSNR inf), ilk kare de
   dogal ilk kareyle ayni; kontrol olarak ilk-son farki 13,24 dB. */
function sonKareler(dosya, etiket, n) {
  /* cikan 0 = SON kare, 1 = son-1, ... (taban.cjs ile ayni siralama) */
  const K = kareSayisi(n);
  return [0, 1, 2, 3].map((i) =>
    kareCek(dosya, (K - 1 - i) / FPS, path.join(GECICI, `${etiket}-son-${i}.png`)));
}
function ilkKareler(dosya, etiket) {
  return [0, 1, 2, 3].map((i) =>
    kareCek(dosya, i / FPS, path.join(GECICI, `${etiket}-ilk-${i}.png`)));
}
function psnr(a, b) {
  /* OLCEKLEME YOK: kiyas her zaman AYNI HAT icinde yapilir (encode-encode
     ya da ham-ham), boyutlar zaten esit. Ilk surumde `scale=rw:rh`
     yazilmisti — `rw`/`rh` scale filtresinde yok, filtre kuruldu sanildi
     ama psnr hic uretilmedi ve fonksiyon sessizce null dondu.
     Bu yuzden null artik SESSIZ GECMEZ, hata firlatir: olcum uretmeyen
     bir olcum, sifir degerle rapora girmemeli. */
  const r = ff(['-v', 'info', '-i', a, '-i', b, '-lavfi', 'psnr', '-f', 'null', '-']);
  const m = (r.stderr || '').match(/average:([0-9.]+|inf)/);
  if (!m) throw new Error(`psnr uretilmedi: ${path.basename(a)} vs ${path.basename(b)}
${(r.stderr || '').slice(-400)}`);
  return m[1] === 'inf' ? 99 : Number(m[1]);
}
const ardisik = (k) => [psnr(k[1], k[0]), psnr(k[2], k[1]), psnr(k[3], k[2])].filter((x) => x != null);

function hat(ad, yol) {
  const satir = [];
  for (let n = 1; n <= 38; n++) {
    process.stderr.write(`  ${ad} ${n}->${n + 1}          \r`);
    const A = yol(n), B = yol(n + 1);
    const aSon = sonKareler(A, `a${n}`, n);
    const bIlk = ilkKareler(B, `b${n}`);
    /* dikis: A'nin son karesi ile B'nin ilk karesi */
    const d = psnr(aSon[0], bIlk[0]);
    /* YEREL TABAN: dikisin IKI YANINDAKI ardisik kare degisimi */
    const havuz = [...ardisik(aSon), ...ardisik(bIlk)];
    const t = Number(medyan(havuz).toFixed(2));
    const delta = Number((d - t).toFixed(2));
    satir.push({
      dikis: `${n}→${n + 1}`, psnr: Number(d.toFixed(2)), taban: t, delta,
      a_taban: Number(medyan(ardisik(aSon)).toFixed(2)),
      b_taban: Number(medyan(ardisik(bIlk)).toFixed(2)),
      hukum: delta >= -1 ? 'SUREKLI' : delta >= -4 ? 'hafif-sapma' : 'GERCEK-SICRAMA',
    });
  }
  return satir;
}

const encode = hat('encode', (n) => path.join(VARLIK, `sahne${n}.mp4`));
const ham = hat('ham   ', (n) => path.join(KAYNAK, `sahne${n}.mp4`));
process.stderr.write('                                        \r');

const ozet = (s) => ({
  surekli: s.filter((x) => x.hukum === 'SUREKLI').length,
  hafif_sapma: s.filter((x) => x.hukum === 'hafif-sapma').length,
  gercek_sicrama: s.filter((x) => x.hukum === 'GERCEK-SICRAMA').length,
  gercek_sicrama_dikisler: s.filter((x) => x.hukum === 'GERCEK-SICRAMA').map((x) => x.dikis),
  en_kotu: [...s].sort((a, b) => a.delta - b.delta)[0],
});

const cikti = {
  _: 'yeni/film/dikis-yerel.cjs — dikis tabani DIKISIN IKI YANINDAN (A son 4 kare + B ilk 4 kare) kurulur. taban.cjs iki tabani ORTALIYOR ve B tabanini klibin SONUNDAN aliyordu; ikisi de olcut hatasi.',
  olcum: new Date().toISOString(),
  esik: { surekli: 'delta >= -1 dB', hafif: '-1 > delta >= -4 dB', sicrama: 'delta < -4 dB' },
  ozet: { encode: ozet(encode), ham: ozet(ham) },
  encode, ham,
};
fs.writeFileSync(path.join(__dirname, 'dikis-yerel.json'), JSON.stringify(cikti, null, 1));

for (const [ad, s] of [['ENCODE (1080p H.264, yayina giden)', encode], ['HAM (4K ustalar)', ham]]) {
  const o = ozet(s);
  console.log(`\n${ad}`);
  console.log(`  surekli ${o.surekli} · hafif sapma ${o.hafif_sapma} · GERCEK SICRAMA ${o.gercek_sicrama}`);
  if (o.gercek_sicrama) console.log(`  esigi asanlar: ${o.gercek_sicrama_dikisler.join(', ')}`);
  console.log(`  en kotu: ${o.en_kotu.dikis} · delta ${o.en_kotu.delta} dB (dikis ${o.en_kotu.psnr} vs taban ${o.en_kotu.taban})`);
}
console.log('\n→ film/dikis-yerel.json');
