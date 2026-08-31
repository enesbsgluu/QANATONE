#!/usr/bin/env node
/* FILM · KARE DIZISI MALIYETI — video yerine tek tek kare (image sequence)
   yolunun agirligi. Olculen: filmin ILK 8 sn'si (sahne1, 193 kare) ve SON
   10 sn'si (sahne38+39, 242 kare) 1440p AVIF ve WebP olarak kac bayt.

   Kareler KAYNAKTAN (4K HEVC) 1440p'ye olceklenip dogrudan hedef bicime
   yazilir — PNG ara adimi yok (435 kare x ~4 MB PNG = ~1,7 GiB gereksiz IO).
   Kalite, sayfanin poster hattiyla ayni mertebede tutuldu (WebP q=82;
   AVIF bunun algisal karsiligi olan CRF bandinda) ki sayi kiyaslanabilsin.

   Tam film tahmini: olculen kare-basi ortalama x 6159 kare. Bu bir
   TAHMINDIR — orneklem filmin en durgun (sahne1) ve en hareketli (son iki
   sahne) uclarindan alindi, ortalamasi tum filmi temsil etmeye calisir.
   Cikti: film/kare-dizisi.json
   Kullanim: node yeni/film/kare-dizisi.cjs */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const KANON = JSON.parse(fs.readFileSync(path.join(KOK, 'src', 'film', 'kanon.json'), 'utf8'));
const GECICI = path.join(__dirname, '.kare');
const OLCEK = 'scale=-2:1440:flags=lanczos';

const ff = (a) => spawnSync('ffmpeg', a, { encoding: 'utf8', maxBuffer: 1 << 26 });

const GRUP = [
  { ad: 'ilk 8 sn (sahne1)', klipler: [1] },
  { ad: 'son 10 sn (sahne38+39)', klipler: [38, 39] },
];
/* KUSUR DUZELTMESI (ilk kosum): `.webp` / `.avif` uzantili kalip cikti,
   ffmpeg'in ANIMASYONLU tek-dosya muxer'ina dustu — kare sayisi 1 cikti ve
   AVIF'te karelerarasi sikistirma girdi (22 KB/kare, 1440p intra icin
   imkansiz). Kare dizisi = her kare BAGIMSIZ dosya. Simdi:
     webp : `-f image2` zorlanir -> kare basina bir dosya
     avif : image2 AVIF yazamaz; tek dosya kalir ama `-g 1` ile HER KARE
            INTRA (keyframe) -> karelerarasi tahmin yok, toplam bayt
            bagimsiz dosyalarin toplamina esdeger (dosya basi ~200 B
            kapsayici farki ihmal). Kare sayisi kanondan. */
const BICIM = [
  { ad: 'webp', uzanti: 'webp', tekDosya: false, args: ['-f', 'image2', '-c:v', 'libwebp', '-quality', '82', '-preset', 'picture'] },
  { ad: 'avif', uzanti: 'avif', tekDosya: true, args: ['-c:v', 'libaom-av1', '-crf', '32', '-b:v', '0', '-cpu-used', '8', '-g', '1', '-keyint_min', '1'] },
];

function dizi(n, bicim) {
  const d = path.join(GECICI, `${bicim.ad}-${n}`);
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
  const t0 = Date.now();
  const cik = bicim.tekDosya ? path.join(d, `hepsi.${bicim.uzanti}`) : path.join(d, `k%04d.${bicim.uzanti}`);
  const r = ff(['-v', 'error', '-y', '-i', path.join(KANON.kaynak, `sahne${n}.mp4`),
    '-vf', OLCEK, ...bicim.args, cik]);
  if (r.status !== 0) throw new Error(`sahne${n} ${bicim.ad}: ${(r.stderr || '').slice(0, 300)}`);
  const dosyalar = fs.readdirSync(d);
  const bayt = dosyalar.reduce((a, f) => a + fs.statSync(path.join(d, f)).size, 0);
  const kareSayisi = bicim.tekDosya ? KANON.klip.find((k) => k.n === n).kare : dosyalar.length;
  if (!bicim.tekDosya && dosyalar.length !== KANON.klip.find((k) => k.n === n).kare)
    throw new Error(`sahne${n} ${bicim.ad}: ${dosyalar.length} dosya, kanon ${KANON.klip.find((k) => k.n === n).kare} kare — muxer yine tek dosyaya dustu`);
  const sonuc = { kare: kareSayisi, bayt, ms: Date.now() - t0 };
  fs.rmSync(d, { recursive: true, force: true });
  return sonuc;
}

fs.mkdirSync(GECICI, { recursive: true });
const cikti = { _: 'yeni/film/kare-dizisi.cjs — kare dizisi (image sequence) agirligi, 1440p.', olcum: new Date().toISOString(),
  cozunurluk: '2560x1440', kalite: 'WebP q=82 · AVIF CRF 32 (cpu-used 8, still-picture)',
  toplam_kare_film: KANON.toplam_kare, toplam_sn_film: KANON.toplam_sn, grup: [] };

for (const g of GRUP) {
  const satir = { ad: g.ad, klipler: g.klipler, sn: 0, kare: 0, bicim: {} };
  for (const n of g.klipler) satir.sn += KANON.klip.find((k) => k.n === n).sure;
  for (const b of BICIM) {
    let kare = 0, bayt = 0, ms = 0;
    for (const n of g.klipler) { const r = dizi(n, b); kare += r.kare; bayt += r.bayt; ms += r.ms; }
    satir.kare = kare;
    satir.bicim[b.ad] = {
      toplam_bayt: bayt, toplam_mib: +(bayt / 1048576).toFixed(2),
      kare_basi_kb: +(bayt / kare / 1024).toFixed(1), encode_ms: ms,
    };
    process.stderr.write(`${g.ad} · ${b.ad}: ${kare} kare · ${(bayt / 1048576).toFixed(2)} MiB · ${(bayt / kare / 1024).toFixed(1)} KB/kare\n`);
  }
  cikti.grup.push(satir);
}

/* tam film tahmini: iki grubun kare-basi ortalamasi (kare agirlikli) */
cikti.tam_film_tahmini = {};
for (const b of BICIM) {
  const k = cikti.grup.reduce((a, g) => a + g.kare, 0);
  const by = cikti.grup.reduce((a, g) => a + g.bicim[b.ad].toplam_bayt, 0);
  const kareBasi = by / k;
  cikti.tam_film_tahmini[b.ad] = {
    kare_basi_kb: +(kareBasi / 1024).toFixed(1),
    tahmini_bayt: Math.round(kareBasi * KANON.toplam_kare),
    tahmini_mib: +(kareBasi * KANON.toplam_kare / 1048576).toFixed(0),
    tahmini_gib: +(kareBasi * KANON.toplam_kare / 1073741824).toFixed(2),
    ornek_kare: k, ornek_yuzde: +(100 * k / KANON.toplam_kare).toFixed(1),
  };
}
fs.writeFileSync(path.join(__dirname, 'kare-dizisi.json'), JSON.stringify(cikti, null, 1));
fs.rmSync(GECICI, { recursive: true, force: true });

console.log('\n| grup | süre | kare | WebP toplam | WebP kare başı | AVIF toplam | AVIF kare başı |');
console.log('|---|---:|---:|---:|---:|---:|---:|');
for (const g of cikti.grup)
  console.log(`| ${g.ad} | ${g.sn.toFixed(2)} sn | ${g.kare} | ${g.bicim.webp.toplam_mib} MiB | ${g.bicim.webp.kare_basi_kb} KB | ${g.bicim.avif.toplam_mib} MiB | ${g.bicim.avif.kare_basi_kb} KB |`);
console.log('\n| biçim | kare başı (örneklem) | TAM FİLM tahmini (6159 kare) |');
console.log('|---|---:|---:|');
for (const b of BICIM) {
  const t = cikti.tam_film_tahmini[b.ad];
  console.log(`| ${b.ad.toUpperCase()} | ${t.kare_basi_kb} KB | **${t.tahmini_mib} MiB** (${t.tahmini_gib} GiB) |`);
}
console.log(`örneklem: ${cikti.tam_film_tahmini.webp.ornek_kare} kare = filmin %${cikti.tam_film_tahmini.webp.ornek_yuzde}'i`);
console.log('→ film/kare-dizisi.json');
