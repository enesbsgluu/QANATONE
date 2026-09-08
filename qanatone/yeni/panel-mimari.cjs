#!/usr/bin/env node
/* PANEL MIMARISI — "eklenen sey yayina VE kesif yuzeylerine gidiyor mu?"
   ---------------------------------------------------------------------
   UCUNCU SORU. Depoda iki panel araci zaten vardi ve ikisi de BASKA sey
   olcuyor:
     panel-kapi.cjs      alan panelden YAZILDI -> uretilen sayfada GORUNDU
     panel-envanter.cjs  sayfada duran metnin panelde KARSILIGI var mi
   Ikisi de MEVCUT bir alanin degerini olcer. Enes'in sordugu soru bu
   degil (9 Eyl 2026):

     "Amac sistemdeki iceriklerde su anda ne oldugunu olcmek degil,
      sistemin bolumlerinin dogru mimariyle cizilmis olmasi. Yazilar
      degisir silinir veya yenileri eklenebilir — bu degisiklikler
      dogrudan yayinlanacak mi ve Google/GPT tarafindan gorulebilecek mi?
      Onemli olan o bolgede ne yazdigi degil, o bolgenin nasil calistigi."

   Yani olculen sey ICERIK degil, MEKANIZMA: bir koleksiyona kayit
   EKLENINCE o kayit kendiliginden sayfaya, sitemap'e, markdown esine,
   llms.txt'e ve yapisal veriye giriyor mu; kayit SILININCE hepsinden
   birden dusuyor mu.

   YONTEM — HUKUM DEGIL, IZ SURME. Her koleksiyona bir NOBETCI kayit
   eklenir, bir kayit da silinir; tek derleme kosar; sonra dist BASTAN
   SONA taranir ve nobetcinin GORUNDUGU her dosya yuzey turune gore
   siniflanir. Beklenen yuzey listesi koda GOMULMEZ — cikti ne diyorsa o
   yazilir; boylece yeni bir yuzey eklendiginde arac eskimez.

   NEDEN NOBETCI: kaynak taramasi hesaplanan degeri goremez (bu depoda
   olculdu) ve bir SALTER hic gorunmez. Burada aranan sey degerin
   kendisi degil, kaydin URETTIGI IZ.

   GUVENLIK: content.json once yedeklenir, sonda GERI YUKLENIR ve yeniden
   derlenir. Kesilirse yedek `<tmp>/qanatone-panel-mimari.yedek` dosyasinda
   durur; elle geri alinabilir.

   Kullanim: node yeni/panel-mimari.cjs
   ENV: TUT=1  -> sonda geri yukleme YAPMA (teshis icin)
*/
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const KOK = path.join(__dirname, '..');
const ICERIK = path.join(KOK, 'content.json');
const DIST = path.join(KOK, 'dist');
const YEDEK = path.join(os.tmpdir(), 'qanatone-panel-mimari.yedek');
const IZ = 'QPM' + Date.now().toString(36).slice(-4).toUpperCase();
const slugla = (k) => ('qpm-' + IZ + '-' + k).toLowerCase();

/* ---------- NOBETCI KAYITLAR ----------
   Her koleksiyonun ILK kaydi sablon olarak alinir (alan kumesi oradan
   gelir), sonra metin alanlarina iz basilir. Elle fikstur yazmiyoruz:
   bu depoda "elle yazilan fikstur kapiyi kendi hayaline kilitler" dersi
   odendi — sablon CANLI veriden turer.                                  */
function izBas(deger, k, derinlik) {
  if (derinlik > 6) return deger;
  if (typeof deger === 'string') return deger ? IZ + '-' + k + ' ' + deger.slice(0, 40) : deger;
  if (Array.isArray(deger)) return deger.slice(0, 2).map((v) => izBas(v, k, derinlik + 1));
  if (deger && typeof deger === 'object') {
    const o = {};
    for (const a of Object.keys(deger)) o[a] = izBas(deger[a], k, derinlik + 1);
    return o;
  }
  return deger;
}

/* Adres ureten koleksiyonlarda `slug` iz tasimali; tarih/sayi alanlari
   bozulmamali (bozulursa derleme duser ve olctugumuz sey mimari degil
   kendi fiksturumuz olur). */
const KORU = new Set(['slug', 'date', 'year', 'read', 'n', 'w', 'hot', 'win', 'rank', 'score',
  'lat', 'lon', 'pick', 'size', 'hi', 'icon', 'fam', 'sector', 'k', 'url', 'image', 'photo']);

function nobetciKayit(sablon, koleksiyon) {
  const y = JSON.parse(JSON.stringify(sablon));
  for (const a of Object.keys(y)) {
    if (KORU.has(a)) continue;
    y[a] = izBas(y[a], koleksiyon, 0);
  }
  if ('slug' in y) y.slug = slugla(koleksiyon);
  if ('name' in y && typeof y.name === 'string') y.name = IZ + ' ' + koleksiyon;
  if ('k' in y && typeof y.k === 'string') y.k = slugla(koleksiyon);
  if ('url' in y && typeof y.url === 'string') y.url = 'https://ornek.gecersiz/' + slugla(koleksiyon);
  return y;
}

/* ---------- YUZEY SINIFLANDIRMA ----------
   Dosya yolundan hangi kesif yuzeyi oldugu okunur. Liste ACIK UCLU:
   taninmayan dosya "sayfa/diger" olarak sayilir, gizlenmez.            */
function yuzey(gorece) {
  const y = gorece.replace(/\\/g, '/');
  if (y === 'sitemap.xml') return 'sitemap.xml';
  if (/^rss(\.xml)?$/.test(y) || /rss/.test(y)) return 'RSS';
  if (y === 'llms.txt' || y === '.well-known/llms.txt') return 'llms.txt';
  if (y === 'llms-full.txt') return 'llms-full.txt';
  if (y === 'agents.md') return 'agents.md';
  if (y.endsWith('.md')) return 'markdown eşi';
  if (y === '_headers') return '_headers (Link)';
  if (y.startsWith('.well-known/')) return 'well-known';
  if (y.endsWith('.html')) return 'sayfa';
  return 'diğer';
}

function dosyalar(kok, taban = kok, liste = []) {
  for (const ad of fs.readdirSync(kok)) {
    const t = path.join(kok, ad);
    const s = fs.statSync(t);
    if (s.isDirectory()) dosyalar(t, taban, liste);
    else if (s.size < 8 * 1024 * 1024) liste.push(path.relative(taban, t));
  }
  return liste;
}

function ara(iz) {
  const bulunan = new Map();
  for (const g of dosyalar(DIST)) {
    let m = '';
    try { m = fs.readFileSync(path.join(DIST, g), 'utf8'); } catch (e) { continue; }
    if (m.includes(iz)) {
      const t = yuzey(g);
      if (!bulunan.has(t)) bulunan.set(t, []);
      bulunan.get(t).push(g);
    }
  }
  return bulunan;
}

/* ---------- KOSUM ---------- */
const ham = fs.readFileSync(ICERIK, 'utf8');
fs.writeFileSync(YEDEK, ham, 'utf8');
const c = JSON.parse(ham);

const KOLEKSIYONLAR = Object.keys(c).filter((k) => Array.isArray(c[k]) && c[k].length && typeof c[k][0] === 'object');
const eklenen = [];
const silinen = [];

for (const k of KOLEKSIYONLAR) {
  const dizi = c[k];
  eklenen.push({ k, kayit: nobetciKayit(dizi[0], k) });
  dizi.push(eklenen[eklenen.length - 1].kayit);
  /* SILME KOLU: adres ureten koleksiyonlarda son gercek kaydi cikar ve
     izini sur — sayfa, sitemap ve markdown esi birlikte dusmeli. */
  if (dizi.length > 2 && dizi[dizi.length - 2] && dizi[dizi.length - 2].slug) {
    const kurban = dizi.splice(dizi.length - 2, 1)[0];
    silinen.push({ k, slug: kurban.slug });
  }
}

fs.writeFileSync(ICERIK, JSON.stringify(c, null, 2) + '\n', 'utf8');

/* DERLEME CAGRISI — KABUKTAN, execFileSync ILE DEGIL.
   ILK YAZIMDA `execFileSync('npm.cmd', …)` vardi ve bu makinede EINVAL
   atiyordu. EINVAL/ENOENT'te `e.stdout` ve `e.stderr` UNDEFINED gelir,
   yani `String((e.stdout||'')+(e.stderr||''))` BOS STRING uretiyordu ve
   `if (derlemeHatasi)` onu BASARILI sayiyordu. Sonuc: derleme hic
   kosmadi, dist eski kaldi, arac dokuz koleksiyonu birden "hicbir yuzeye
   girmedi" diye kirmiziya yazdi — ZINCIR SAGLAMDI, olcum bozuktu.
   (Elle dogrulandi: content.json'da faq[0].q degistirilip derlenince iz
   dist/sss/index.html, dist/sss.md ve llms-full.txt'e ULASTI.)
   Hata metni artik e.message'i de kapsiyor ve asla bos kalmiyor. */
const derle = () => execSync('npm --prefix yeni run build',
  { cwd: KOK, encoding: 'utf8', stdio: 'pipe' });
let derlemeHatasi = '';
try {
  derle();
} catch (e) {
  derlemeHatasi = (String(e.message || '') + '\n'
    + String(e.stdout || '') + String(e.stderr || '')).trim().slice(-1200)
    || 'derleme calistirilamadi (sebep bildirilmedi)';
}

console.log('PANEL MIMARISI · iz ' + IZ + '\n');

if (derlemeHatasi) {
  /* BU BASLI BASINA BULGUDUR: panelden kayit eklemek derlemeyi
     dusuruyorsa, Enes "Yayinla" dedigi anda deploy kirmizi doner. */
  console.log('!! DERLEME DUSTU — panelden kayit eklemek yayini durduruyor olabilir.\n');
  console.log(derlemeHatasi);
} else {
  /* DUZENEK KENDINI DOGRULAR — bu depoda odenmis ders: bayat yuzey
     sessizce yanlis sayi uretir. Iz dist'te HIC gecmiyorsa hukum
     "sistem bozuk" degil "OLCUM bozuk"tur. */
  if (ara(IZ).size === 0) {
    console.log('!! DUZENEK SUPHELI — iz ' + IZ + ' dist`te HIC gecmiyor.');
    console.log('   Derleme dist`i tazelememis olabilir; asagidaki satirlar HUKUM DEGILDIR.\n');
  }
  console.log('EKLENEN NOBETCI KAYITLARIN IZI (hangi yuzeylere girdi)\n');
  for (const { k } of eklenen) {
    const izAd = IZ + '-' + k;
    const bul = ara(izAd);
    const slug = slugla(k);
    const bulSlug = ara(slug);
    for (const [t, l] of bulSlug) {
      if (!bul.has(t)) bul.set(t, l);
      else bul.set(t, [...new Set([...bul.get(t), ...l])]);
    }
    if (!bul.size) { console.log('  !! ' + k.padEnd(14) + 'HICBIR YUZEYE GIRMEDI'); continue; }
    const ozet = [...bul.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([t, l]) => t + ' (' + l.length + ')').join(' · ');
    console.log('  ok ' + k.padEnd(14) + ozet);
    for (const [t, l] of bul) if (t === 'sayfa' || t === 'markdown eşi')
      console.log('       ' + t + ': ' + l.slice(0, 3).join(', ') + (l.length > 3 ? ' …' : ''));
  }

  console.log('\nSILINEN KAYITLARIN ARTIGI (bos olmali)\n');
  if (!silinen.length) console.log('  (adres ureten koleksiyon bulunamadi)');
  for (const { k, slug } of silinen) {
    const bul = ara(slug);
    if (!bul.size) console.log('  ok ' + k.padEnd(14) + slug + ' — hicbir yuzeyde kalmadi');
    else console.log('  !! ' + k.padEnd(14) + slug + ' HALA VAR: '
      + [...bul.entries()].map(([t, l]) => t + ' (' + l.length + ')').join(' · '));
  }
}

if (!process.env.TUT) {
  fs.writeFileSync(ICERIK, ham, 'utf8');
  try {
    derle();
    console.log('\ncontent.json geri yuklendi ve yeniden derlendi.');
  } catch (e) {
    console.log('\n!! GERI YUKLEME DERLEMESI DUSTU — yedek: ' + YEDEK);
  }
} else {
  console.log('\nTUT=1 — content.json NOBETCILI halde birakildi. Yedek: ' + YEDEK);
}
