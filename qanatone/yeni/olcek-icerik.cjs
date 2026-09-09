#!/usr/bin/env node
/* OLCEK DUZENEGI — "10 -> 10.000 icerik mimarisi" turunun olcum araci.
   Raporu: ICERIK-MIMARISI-OLCUM.md (9 Eyl 2026).

   NE YAPAR
     Yazi kayitlarini N adede sisirir, gercek derlemeyi kosturur,
     ciktilari olcer. KADEME 2'DEN SONRA (9 Eyl 2026) kayitlar
     content.json'da DEGIL `icerik/yazilar/<slug>.json` dosyalarinda —
     duzenek de oraya yazar. Eski govde content.json'daki `posts`
     dizisini sisiriyordu; o dizi artik YOK ve duzenek dokunmadan
     birakilsaydi `sis 1000` sessizce HICBIR SEY yapmayacak, olcum
     "1.000 yazi" diye 6 yaziyi olcecekti — yanlis yesilin en pahali
     turu. Yedek de dosyalari kapsar. Sablon GERCEK bir gonderidir; yalniz
     slug/date/title degisir, bayt buyuklugu korunur — kucuk sahte kayit
     egriyi yalanci duzlestirmesin diye.

   NEDEN YEDEK SART
     Betik content.json'u YERINDE degistirir. `hazirla` once yedegi
     .onbellek/ altina alir, `geri` onu iade eder. Olcum bittiginde
     `geri` KOSULMALI, sonra temiz derleme + denetim.

   KULLANIM
     node yeni/olcek-icerik.cjs hazirla        # yedegi al (bir kez)
     node yeni/olcek-icerik.cjs sis 200        # posts -> 200
     npm --prefix yeni run build               # derle
     node yeni/olcek-icerik.cjs olc            # ciktilari olc (tek satir)
     node yeni/olcek-icerik.cjs geri           # content.json'u iade et
     node yeni/olcek-icerik.cjs yansit         # olculen katsayilardan tablo

   SURE OLCERKEN: her N'de BIR ISINMA kosusu at, sonraki iki kosumu al.
   Soguk ilk kosum yaniltir — 2 Eyl olcumunde 200 gonderi 6 gonderiden
   HIZLI cikmisti (Vite/esbuild onbellegi), sure degil onbellek olculmustu. */
'use strict';
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const HEDEF = path.join(KOK, 'content.json');
const YEDEK = path.join(KOK, '.onbellek', 'content.json.olcek-yedek');
/* KADEME 2: yazilar dosyada. Klasor ve alan adi sozlesmeden okunur —
   ikinci bir yerde sabitlemek sapmanin en sik kaynagi. */
const KOLEKSIYON = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'veri', 'sayfalar.json'), 'utf8'))
  .koleksiyon.find(k => k.ad === 'yazilar');
const YAZI_DIZIN = path.join(KOK, KOLEKSIYON.klasor);
const YEDEK_DIZIN = path.join(KOK, '.onbellek', 'yazilar-olcek-yedek');
const yaziOku = d => fs.existsSync(d)
  ? fs.readdirSync(d).filter(a => a.endsWith('.json')).map(a => JSON.parse(fs.readFileSync(path.join(d, a), 'utf8')))
  : [];
const yaziSil = d => { for (const a of fs.readdirSync(d)) if (a.endsWith('.json')) fs.unlinkSync(path.join(d, a)); };
const yaziYaz = (d, kayitlar) => {
  fs.mkdirSync(d, { recursive: true });
  for (const k of kayitlar) fs.writeFileSync(path.join(d, k.slug + '.json'), JSON.stringify(k, null, 2) + '\n');
};
const DIST = path.join(KOK, 'dist');

const oku = p => fs.readFileSync(p, 'utf8');
const boyut = p => { try { return fs.statSync(p).size; } catch (e) { return 0; } };
const say = (dizin, uzanti) => {
  let n = 0;
  const gez = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const t = path.join(d, e.name);
    if (e.isDirectory()) gez(t); else if (e.name.endsWith(uzanti)) n++;
  } };
  try { gez(dizin); } catch (e) { return 0; }
  return n;
};

function hazirla() {
  if (fs.existsSync(YEDEK)) { console.log('yedek zaten var:', YEDEK); return; }
  fs.mkdirSync(path.dirname(YEDEK), { recursive: true });
  fs.copyFileSync(HEDEF, YEDEK);
  yaziYaz(YEDEK_DIZIN, yaziOku(YAZI_DIZIN));
  console.log('yedek alindi:', YEDEK, boyut(YEDEK), 'B ·', yaziOku(YEDEK_DIZIN).length, 'yazi dosyasi');
}

function geri() {
  if (!fs.existsSync(YEDEK)) { console.error('YEDEK YOK — geri yuklenemez'); process.exit(1); }
  fs.copyFileSync(YEDEK, HEDEF);
  fs.mkdirSync(YAZI_DIZIN, { recursive: true });
  yaziSil(YAZI_DIZIN);
  yaziYaz(YAZI_DIZIN, yaziOku(YEDEK_DIZIN));
  console.log('iade edildi · content.json', boyut(HEDEF), 'B ·', yaziOku(YAZI_DIZIN).length, 'yazi dosyasi');
  console.log('SIMDI: npm --prefix yeni run build && node yeni/denetim.cjs');
}

function sis(N) {
  if (!fs.existsSync(YEDEK)) { console.error('once: node yeni/olcek-icerik.cjs hazirla'); process.exit(1); }
  if (!Number.isFinite(N) || N < 1) { console.error('N gerekli'); process.exit(1); }
  const kaynak = yaziOku(YEDEK_DIZIN);
  if (!kaynak.length) { console.error('YEDEK DIZINDE YAZI YOK — once hazirla'); process.exit(1); }
  const yeni = [];
  for (let i = 0; i < N; i++) {
    const t = JSON.parse(JSON.stringify(kaynak[i % kaynak.length]));
    if (i >= kaynak.length) {
      t.slug = t.slug + '-o' + i;
      const g = 1 + (i % 28), ay = 1 + (i % 12);
      t.date = '2025-' + String(ay).padStart(2, '0') + '-' + String(g).padStart(2, '0');
      t.title = { tr: t.title.tr + ' (' + i + ')', en: t.title.en + ' (' + i + ')' };
    }
    yeni.push(t);
  }
  fs.mkdirSync(YAZI_DIZIN, { recursive: true });
  yaziSil(YAZI_DIZIN);
  yaziYaz(YAZI_DIZIN, yeni);
  console.log('yazi dosyasi =', yaziOku(YAZI_DIZIN).length, '· content.json =', boyut(HEDEF), 'B');
}

function olc() {
  const sm = path.join(DIST, 'sitemap.xml');
  const loc = fs.existsSync(sm) ? (oku(sm).match(/<loc>/g) || []).length : 0;
  const s = {
    posts: yaziOku(YAZI_DIZIN).length,
    contentJson: boyut(HEDEF),
    html: say(DIST, '.html'),
    md: say(DIST, '.md'),
    headers: boyut(path.join(DIST, '_headers')),
    llmsFull: boyut(path.join(DIST, 'llms-full.txt')),
    llms: boyut(path.join(DIST, 'llms.txt')),
    sitemap: boyut(sm),
    sitemapLoc: loc,
    rss: boyut(path.join(DIST, 'bulten', 'rss.xml')),
  };
  console.log(JSON.stringify(s));
  return s;
}

/* OLCULEN katsayilar (N=6/50/200 gercek derlemelerinden). Sabit degil,
   yeniden olcunce guncellenmeli. */
function yansit() {
  const mb = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB'
               : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB'
               : b >= 1e3 ? (b / 1e3).toFixed(1) + ' KB' : b + ' B';
  const postMd = N => 2255 + 190.8 * Math.max(0, N - 1);
  const postHtml = N => 32935 + 331.7 * Math.max(0, N - 1);
  const alan = [
    ['sayfa (HTML)', N => 54 + 2 * N, v => v.toLocaleString('tr-TR')],
    ['content.json', N => 215500 + 3706 * N, mb],
    ['_headers', N => 30528 + 1304 * N, mb],
    ['sitemap.xml', N => 15484 + 839 * N, mb],
    ['rss.xml', N => 201 + 554 * N, mb],
    ['llms.txt', N => 10647 + 586 * N, mb],
    ['llms-full.txt', N => 152000 + 2 * N * postMd(N), mb],
    ['tek gonderi HTML', postHtml, mb],
    ['tum gonderi HTML', N => 2 * N * postHtml(N), mb],
  ];
  const N = [6, 200, 1000, 10000];
  const bas = ['6 (bugun)', '200 (olculdu)', '1.000', '10.000'];
  console.log();
  console.log('ALAN'.padEnd(22) + bas.map(g => g.padStart(15)).join(''));
  console.log('-'.repeat(82));
  for (const [ad, f, b] of alan) console.log(ad.padEnd(22) + N.map(n => String(b(f(n))).padStart(15)).join(''));
  console.log();
  console.log('TAVANLAR (2 = OLCULDU · digerleri belgelenmis dis sinir, dogrulanmali)');
  console.log('  panel taslagi localStorage 5.242.086 karakter ... ' + Math.floor((5242086 - 209616) / 3510).toLocaleString('tr-TR') + ' gonderi');
  console.log('  yayinla POST govdesi 6 MiB ..................... ' + Math.floor((6 * 1024 * 1024 - 215500) / 3706).toLocaleString('tr-TR') + ' gonderi');
  console.log('  IndexNow 10.000 adres/istek .................... ' + Math.floor((10000 - 54) / 2).toLocaleString('tr-TR') + ' gonderi');
  console.log('  sitemap 50.000 adres .......................... ' + Math.floor((50000 - 54) / 2).toLocaleString('tr-TR') + ' gonderi');
  console.log();
}

const [, , komut, arg] = process.argv;
({ hazirla, geri, olc, yansit }[komut] || (komut === 'sis' ? () => sis(parseInt(arg, 10)) : () => {
  console.log(oku(__filename).split('*/')[0].split('\n').slice(1).join('\n'));
  process.exit(1);
}))();
