#!/usr/bin/env node
/* yeni/gorsel-kanal.cjs — B1 bento'sunun kanal kartlarini uretir.

   NEDEN BU BETIK VAR
   GORSEL-LISTESI-B1-B7.md "B1 icin hic gorsel yok" diyordu; yanlisti.
   `img/ch1..ch6.webp` (1400x933) zaten elde: altisi da koyu, marka kizilinda
   ve YAZISIZ. Yani B1'de uretilecek bir sey yok, kadraj/ton/varyant isi var.

   ESLESME (kaynak -> kanal; ch dosyalarinin konusu listedeki siraya oturuyor)
     ch1 arama sonuc satirlari      -> kanal-google
     ch2 akista kayan kartlar       -> kanal-meta
     ch3 dallanan dugum             -> kanal-web
     ch4 grafik cubuklari           -> kanal-rapor
     ch5 konusma balonlari          -> kanal-whatsapp
     ch6 isiyan ag                  -> kanal-ai

   B7'DEN FARKI
   B7'de sorun yatay kaynak + dikey hedef + basili yaziydi; orada bulanik
   zemin/keskin bant dili gerekti. Burada kaynak zaten soyut ve yazisiz,
   tek sorun AYNI dosyanin hem dikeye yakin kareye (680x700) hem cok genis
   serite (1000x240) kirpilmasi. Bu yuzden onemli olan ne varsa orta %60'ta
   tutulur ve her varyantin odagi ayri verilir.

   SERIT (yazi) KARTIN ALTINA BINIYOR: alt %35 sakin kalmali. Karartma
   perdesi dosyaya BASILMAZ — kutu oranlari uc varyantta farkli, basili
   perde genis seritte yanlis yere duser. Perde CSS'te:
     .kn::after{background:linear-gradient(0deg,rgba(5,5,5,.92),transparent 62%)}
   (B7'deki "ton basilir, renk CSS'e kalir" ilkesinin buradaki karsiligi:
    gorsel basilir, okunabilirlik CSS'te.)

   Kosum:  node gorsel-kanal.cjs            (yeni/ icinde; sharp burada)
           node gorsel-kanal.cjs google     (tek karti basar)                 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');

const KAYNAK = path.join(__dirname, '..', 'img');
const ANA    = path.join(__dirname, '..', 'gorsel-kaynak', 'kanal');
const HEDEF  = path.join(__dirname, 'public', 'img', 'kanal');
/* Kunye: bilesen olcuyu ELLE yazmaz (gorsel-uret.cjs'in kurdugu duzen).
   `k` bento'daki kart sirasi (content.json ch1t..ch6t ile ayni); kunyede
   olmayan kart gorselsiz, bugunku uc yuzuyle (desen/kizil/koyu) basilir. */
const KUNYE  = path.join(__dirname, 'src', 'veri', 'kanal-gorselleri.json');

const CHROME = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find((p) => fs.existsSync(p));
if (!CHROME) { console.error('Chrome bulunamadi; CHROME_PATH ver.'); process.exit(1); }

/* --- ISLER ---------------------------------------------------------------
   kare/genis/mobil : her varyantin object-position karsiligi [x,y] (0..1).
                      Ozne uc kirpimda da orta %60'ta kalsin diye ayri ayri.
   ton              : yalniz gerekiyorsa. ch2 ve ch5 obur dortten belirgin
                      parlak; alti kart bento'da yan yana gelince o ikisi
                      one firliyordu. Denge KAREDE kuruluyor, bento CSS'inde
                      degil — kart tek basina da (tablet satiri, mobil) ayni
                      aileye ait gorunmeli.
   not              : oznenin kaynakta nerede durdugu.                       */
const ISLER = [
  { ad: 'kanal-google', src: 'ch1', kare: [0.5, 0.30], genis: [0.5, 0.20], mobil: [0.5, 0.28],
    not: 'isikli satirlar ust-ortada (y 4-30%); alt %35 zaten bos, serit oraya rahat biniyor.' },
  { ad: 'kanal-meta', src: 'ch2', kare: [0.55, 0.45], genis: [0.5, 0.42], mobil: [0.55, 0.45],
    ton: 'brightness(.72) contrast(1.1) saturate(.9)',
    not: 'kayan kartlar caprazda; kadraj sag-ustteki yogunluga biraz kaydirildi. Kaynak setin en parlagi — ton kisildi.' },
  { ad: 'kanal-web', src: 'ch3', kare: [0.42, 0.45], genis: [0.42, 0.45], mobil: [0.42, 0.45],
    not: 'dugum sol-ortada (x ~38%); kirpim onu merkeze cekiyor.' },
  { ad: 'kanal-rapor', src: 'ch4', kare: [0.62, 0.50], genis: [0.6, 0.48], mobil: [0.62, 0.50],
    not: 'cubuklar sag yarida (x 42-90%), parlayan cubuk x ~63%.' },
  { ad: 'kanal-whatsapp', src: 'ch5', kare: [0.5, 0.45], genis: [0.5, 0.45], mobil: [0.5, 0.45],
    ton: 'brightness(.74) contrast(1.1) saturate(.92)',
    not: 'balonlar caprazda, parlak cekirdek merkezde. ch2 ile birlikte setin parlak ikilisi — ton kisildi.' },
  { ad: 'kanal-ai', src: 'ch6', kare: [0.5, 0.44], genis: [0.5, 0.42], mobil: [0.5, 0.44],
    not: 'isiyan cekirdek merkeze yakin (x 50%, y 44%).' },
];

/* varyantlar GORSEL-LISTESI-B1-B7.md'den: masaustu kart / tablet satir / mobil */
const VARYANT = [
  { ek: '',   en: 680,  boy: 700, alan: 'kare'  },
  { ek: '-g', en: 1000, boy: 240, alan: 'genis' },
  { ek: '-m', en: 700,  boy: 470, alan: 'mobil' },
];

/* --- TON -----------------------------------------------------------------
   Kaynaklar zaten koyu ve kizil; burada yapilan is onlari B7 galerisiyle
   ayni aileye baglamak: hafif vinyet + ayni gren. Renk/parlaklik neredeyse
   oldugu gibi birakiliyor, cunku bu kareler zaten palette.               */
const sablon = (src, ton) => `<style>
  :root{--bg:#050505}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:700px;height:466px;background:var(--bg);overflow:hidden}
  .kare{position:relative;width:700px;height:466px;isolation:isolate}
  .kare img{width:100%;height:100%;object-fit:cover;display:block;
    filter:${ton || 'brightness(.94) contrast(1.06) saturate(1.02)'}}
  .vinyet{position:absolute;inset:0;
    background:radial-gradient(88% 78% at 50% 46%,transparent 52%,rgba(5,5,5,.62) 100%)}
  .gren{position:absolute;inset:0;opacity:.11;mix-blend-mode:overlay}
</style>
<div class="kare">
  <img src="${src}">
  <div class="vinyet"></div>
  <svg class="gren" xmlns="http://www.w3.org/2000/svg">
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3"/></filter>
    <rect width="100%" height="100%" filter="url(#n)"/>
  </svg>
</div>`;

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
const url = (p) => 'file:///' + p.split(path.sep).join('/');

/* object-fit:cover + object-position'in sharp karsiligi: kaynagi hedefi
   ortecek sekilde olcekle, sonra [px,py] oranina gore kaydirip kes. */
async function kirp(girdi, cikti, en, boy, [px, py]) {
  const m = await sharp(girdi).metadata();
  const olcek = Math.max(en / m.width, boy / m.height);
  const sw = Math.round(m.width * olcek);
  const sh = Math.round(m.height * olcek);
  const sol = Math.round((sw - en) * px);
  const ust = Math.round((sh - boy) * py);
  await sharp(girdi).resize(sw, sh)
    .extract({ left: sol, top: ust, width: en, height: boy })
    .webp({ quality: 78 }).toFile(cikti);
  return olcek;
}

(async () => {
  const secim = process.argv[2];
  const isler = secim ? ISLER.filter((i) => i.ad.includes(secim)) : ISLER;
  if (!isler.length) { console.error('is bulunamadi: ' + secim); process.exit(1); }

  fs.mkdirSync(ANA, { recursive: true });
  fs.mkdirSync(HEDEF, { recursive: true });
  const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'qkanal-'));
  const kunye = [];

  for (const is of isler) {
    const src = path.join(KAYNAK, is.src + '.webp');
    if (!fs.existsSync(src)) { console.log('  ! kaynak yok: ' + is.src); continue; }

    const png = path.join(gecici, is.src + '.png');
    await sharp(src).png().toFile(png);
    const html = path.join(gecici, is.ad + '.html');
    fs.writeFileSync(html, sablon(url(png), is.ton));

    /* ana dosya 1400x932 (kaynak 1400x933; 2x cift sayi olsun diye 466 CSS) */
    const kod = is.ad.replace('kanal-', '');
    const ana = path.join(ANA, kod + '.png');
    execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars',
      '--window-size=700,466', '--force-device-scale-factor=2',
      '--screenshot=' + ana, url(html)], { stdio: 'ignore' });

    const satir = [];
    const olcu = { k: ISLER.indexOf(is) + 1, kod };
    let toplam = 0;
    for (const v of VARYANT) {
      const cikti = path.join(HEDEF, kod + v.ek + '.webp');
      const olcek = await kirp(ana, cikti, v.en, v.boy, is[v.alan]);
      const boyut = fs.statSync(cikti).size;
      toplam += boyut;
      satir.push(v.en + 'x' + v.boy + ' ' + kb(boyut) +
        (olcek > 1 ? ' (' + olcek.toFixed(2) + 'x BUYUTME)' : ''));
      olcu[v.ek === '' ? 'w' : v.ek === '-g' ? 'gw' : 'mw'] = v.en;
      olcu[v.ek === '' ? 'h' : v.ek === '-g' ? 'gh' : 'mh'] = v.boy;
    }
    kunye.push(olcu);
    console.log('  ' + is.ad.padEnd(16) + satir.join('  ') + '   toplam ' + kb(toplam));
  }
  if (secim && fs.existsSync(KUNYE)) {
    const eski = JSON.parse(fs.readFileSync(KUNYE, 'utf8'));
    for (const e of eski) if (!kunye.some((x) => x.k === e.k)) kunye.push(e);
  }
  kunye.sort((a, b) => a.k - b.k);
  fs.writeFileSync(KUNYE, JSON.stringify(kunye, null, 2) + String.fromCharCode(10));
  console.log('  kunye: src/veri/kanal-gorselleri.json (' + kunye.length + ' kart)');
  fs.rmSync(gecici, { recursive: true, force: true });
})();
