#!/usr/bin/env node
/* yeni/gorsel-kompoze.cjs — B7 akordeon galerisinin dikey ana dosyalarini
   (1400x2100) ve akordeon varyantlarini uretir.

   NEDEN BU BETIK VAR
   Elde duran proje gorselleri yatay ve HEPSI okunur yazi tasiyor (Mercedes'te
   basili Ingilizce baslik, Schwab/Kononenko/TeraWulf'ta kadraji kaplayan kelime
   markasi, SkyClinics/Bab'da site metni). Site iki dilli, yazi HTML'de sirt
   uzerine biniyor — dolayisiyla bu dosyalar dikey kirpilarak kurtarilamaz,
   yeniden kompoze edilmeleri gerekiyor.

   DIL (yedisi icin ortak)
     1) Bulanik dikey zemin + keskin yatay odak bandi. Zemin ayni fotografin
        buyutulmus/bulanik hali — buyutmeyi bulaniklik sakliyor. Bant fotografi
        kendi cozunurlugune yakin basiyor, keskinlik oradan geliyor.
     2) TON basilir, RENK CSS'e kalir. Duotone dosyaya BASILMAZ: akordeonda
        pasif serit duotone, aktif kart gercek renkte aciliyor (Enes'in karari,
        21 Agu 2026). Kizil calisma aninda `mix-blend-mode:color` ile biniyor.
        Bu yuzden burada patlamis beyaz birakilmaz — `color` harmani luminansi
        koruyor, 240 ustu kanal kizila donmeyip beyaz kalir ve kart yamalanir.
     3) Yazi GORSELDEN degil KAYNAKTAN kesilir (kesim alani). Kadraj ne kadar
        kayarsa kaysin yazi cerceveye giremez. Zemin tam kaynagi kullanir —
        26px bulanikta metin okunmaz lekedir, kural o tarafta cignenmiyor.
     4) Kadraj merkez dilime gore kurulur, kareye gore degil. Pasif seritte
        gorselin yalniz orta %25'i gorunuyor; olcut "kare guzel mi" degil,
        "148 px'lik dilim tek basina ne diyor".

   Kosum:  node gorsel-kompoze.cjs            (yeni/ icinde; sharp burada)
           node gorsel-kompoze.cjs mercedes   (tek isi basar)                 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');

const KAYNAK = path.join(__dirname, '..', 'img');
const ANA    = path.join(__dirname, '..', 'gorsel-kaynak', 'galeri');
const HEDEF  = path.join(__dirname, 'public', 'img', 'galeri');
/* Kunye: bilesen olcuyu ELLE yazmaz (gorsel-uret.cjs'in kurdugu duzen).
   Kunyeye girmeyen proje galeride gorselsiz basilir. */
const KUNYE  = path.join(__dirname, 'src', 'veri', 'galeri-gorselleri.json');
const AKTIF  = [592, 960];
const MOBIL  = [700, 520];

/* Chrome yolu: kompozisyon CSS harmanlariyla kuruluyor, sharp tek basina
   mix-blend-mode/soft-light basamaz. Headless Chrome burada bir cizim
   motoru olarak kullaniliyor, tarayici olarak degil. */
const CHROME = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find(p => fs.existsSync(p));
if (!CHROME) { console.error('Chrome bulunamadi; CHROME_PATH ver.'); process.exit(1); }

/* --- ISLER ---------------------------------------------------------------
   kesim : kaynaktan yaziyi disarida birakan dikdortgen [sol,ust,en,boy]
   bpos  : bandin object-position'i — ODAK merkez %25 dilime bununla oturur
   zpos  : bulanik zeminin object-position'i (kompozisyon dengesi)
   not   : kesimin NEDEN orada oldugu; sonraki tur okuyup tartisabilsin      */
const ISLER = [
  { ad: 'mercedes-benz', kesim: [480, 0, 1120, 725], bpos: '0% 46%', zpos: '62% 42%',
    not: 'basili "Artificial Intelligence at Mercedes-Benz." native x<460; 480 guvenli sinir. Odak: parlayan el.' },
  { ad: 'charles-schwab', kesim: [0, 0, 1600, 400], bpos: '59% 50%', zpos: '50% 45%',
    not: 'mavi tabela x 640-1120 / y 425-850, camdaki hayalet kelime markasi x 150-430 / y 570-790. Yazisiz tek genis alan UST cephe (y<400). Bant 3,1x buyutuyor — yuzey duz cam/metal oldugu icin tasiyor. Kimlik zayif: mavi yalniz bulanik zeminde leke olarak var.' },
  { ad: 'kononenko-group', kesim: [0, 640, 880, 716], bpos: '100% 55%', zpos: '50% 60%',
    not: 'afis x 185-990 / y 120-1250, yazi y 250-560. Ust bant (agac) yazisiz ama 5,4x buyuterdi; afisin BOS alt yarisi + kafe/delikli panel hem yazisiz hem 1,6x. Sagdaki dukkan tabelasi ("CO...") native x~905te, en 880de kesildi. Kare buyuk beyaz duzlemin hakimiyetinde — setin en zayif kimligi, kaynak degismeli.' },
  { ad: 'skyclinics', kesim: [780, 0, 820, 670], bpos: '20% 45%', zpos: '60% 40%',
    not: '"SKYCLINICS" + Ingilizce alt metin x<45%; kesim 780den. Odak: sisin icindeki zirve. Setin en parlak kaynagi.' },
  { ad: 'cmblu-energy', kesim: [430, 0, 710, 899], bpos: '50% 42%', zpos: '40% 45%',
    not: 'duvardaki logo x 100-420, bayraklardaki "cmblu" x>1150; temiz koridor ikisinin arasi. Odak: lamali cephe + giris, dusey lamalar dilime iyi oturuyor.' },
  { ad: 'terawulf', kesim: [0, 0, 608, 840], bpos: '50% 55%', zpos: '55% 45%',
    not: '"TERAWULF" x 40-81%, kalkan amblem x 52-68%; yazisiz alan yalniz sol serit. Bant 2,3x buyutuyor, gren ortuyor.' },
  { ad: 'bab-ic-mimarlik', kesim: [1200, 515, 660, 330], bpos: '50% 50%', zpos: '35% 50%',
    not: 'baslik satiri x 110-1615 (izgaradan 1295 diye okunmustu, KESIP bakinca 1615 cikti), govde metni x~1170e kadar, ust menu y<60, sagda "GIRIS" x~1742/y~314, altta "KESFETMEK ICIN KAYDIRIN" y~860. Yazisiz ve YETERINCE YUKSEK alan yok; en iyisi baslik blogunun ALTINDAKI koltuk grubu. Bant 3,8x buyutuyor — yuzey duz/koyu mobilya oldugu icin tasiyor ama setin en yumusagi. Kaynak degisirse ilk bu degismeli.' },
];

/* --- SABLON --------------------------------------------------------------
   700x1050 CSS, 2x ile 1400x2100 basilir. Ust %23,6 sessiz: aktif panelde
   baslik ve etiket oraya yukseliyor (GORSEL-LISTESI-B1-B7.md).              */
const sablon = (o) => `<style>
  :root{--bg:#050505;--red:#ef233c;--red-glow:rgba(239,35,60,.45);--line:rgba(255,255,255,.1)}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:700px;height:1050px;background:var(--bg);overflow:hidden}
  .kare{position:relative;width:700px;height:1050px;isolation:isolate}
  .zemin{position:absolute;inset:0;overflow:hidden}
  .zemin img{width:100%;height:100%;object-fit:cover;object-position:${o.zpos};
    filter:saturate(.55) blur(26px) brightness(.6) contrast(1.08);transform:scale(1.14)}
  .isik{position:absolute;inset:0;
    background:radial-gradient(56% 30% at 50% 44%,var(--red-glow),transparent 72%);
    mix-blend-mode:soft-light;opacity:.34}
  .ust{position:absolute;inset:0 0 auto 0;height:40%;
    background:linear-gradient(180deg,#050505 8%,rgba(5,5,5,.78) 44%,transparent 100%)}
  .alt{position:absolute;inset:auto 0 0 0;height:32%;
    background:linear-gradient(0deg,#050505 6%,rgba(5,5,5,.5) 48%,transparent 100%)}
  .vinyet{position:absolute;inset:0;
    background:radial-gradient(80% 64% at 50% 46%,transparent 46%,rgba(5,5,5,.72) 100%)}
  .bant{position:absolute;left:0;right:0;top:248px;height:620px;overflow:hidden;
    box-shadow:0 0 0 1px var(--line),0 46px 100px -18px rgba(0,0,0,.95)}
  .bant img{width:100%;height:100%;object-fit:cover;object-position:${o.bpos};
    filter:saturate(.58) brightness(.74) contrast(1.16)}
  .bant .tep{position:absolute;inset:0;
    background:linear-gradient(180deg,rgba(5,5,5,.42),transparent 24%,transparent 74%,rgba(5,5,5,.52))}
  .cizgi{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,
    transparent,rgba(239,35,60,.55) 16%,rgba(239,35,60,.55) 84%,transparent)}
  .gren{position:absolute;inset:0;opacity:.13;mix-blend-mode:overlay}
</style>
<div class="kare">
  <div class="zemin"><img src="${o.zsrc}"></div>
  <div class="isik"></div><div class="vinyet"></div>
  <div class="ust"></div><div class="alt"></div>
  <div class="bant"><img src="${o.bsrc}">
    <div class="tep"></div>
    <div class="cizgi" style="top:0"></div><div class="cizgi" style="bottom:0"></div>
  </div>
  <svg class="gren" xmlns="http://www.w3.org/2000/svg">
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3"/></filter>
    <rect width="100%" height="100%" filter="url(#n)"/>
  </svg>
</div>`;

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
const url = (p) => 'file:///' + p.split(path.sep).join('/');

(async () => {
  const secim = process.argv[2];
  const isler = secim ? ISLER.filter((i) => i.ad.includes(secim)) : ISLER;
  if (!isler.length) { console.error('is bulunamadi: ' + secim); process.exit(1); }

  fs.mkdirSync(ANA, { recursive: true });
  fs.mkdirSync(HEDEF, { recursive: true });
  const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'qkompoze-'));
  const kunye = [];

  for (const is of isler) {
    const src = path.join(KAYNAK, 'pj-' + is.ad + '.webp');
    if (!fs.existsSync(src)) { console.log('  ! kaynak yok: ' + is.ad); continue; }

    /* bant kaynagi: yazi burada kesilir. zemin tam kaynagi kullanir. */
    const bantPng = path.join(gecici, is.ad + '-bant.png');
    const zeminPng = path.join(gecici, is.ad + '-zemin.png');
    await sharp(src).png().toFile(zeminPng);
    const k = is.kesim;
    await (k ? sharp(src).extract({ left: k[0], top: k[1], width: k[2], height: k[3] }) : sharp(src))
      .png().toFile(bantPng);

    const html = path.join(gecici, is.ad + '.html');
    fs.writeFileSync(html, sablon({
      zsrc: url(zeminPng), bsrc: url(bantPng), zpos: is.zpos, bpos: is.bpos,
    }));

    const ana = path.join(ANA, is.ad + '.png');
    execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars',
      '--window-size=700,1050', '--force-device-scale-factor=2',
      '--screenshot=' + ana, url(html)], { stdio: 'ignore' });

    const st = await sharp(ana).stats();
    const enParlak = Math.max(...st.channels.map((c) => c.max));

    /* varyantlar: aktif panel 592x960; mobil 700x520 bandin ortasindan
       (bant master'da y 496..1736, merkez 1116). */
    const aktif = path.join(HEDEF, is.ad + '.webp');
    const mobil = path.join(HEDEF, is.ad + '-m.webp');
    await sharp(ana).resize(AKTIF[0], AKTIF[1], { fit: 'cover' }).webp({ quality: 78 }).toFile(aktif);
    await sharp(ana).extract({ left: 0, top: 596, width: 1400, height: 1040 })
      .resize(MOBIL[0], MOBIL[1]).webp({ quality: 78 }).toFile(mobil);
    kunye.push({ slug: is.ad, w: AKTIF[0], h: AKTIF[1], mw: MOBIL[0], mh: MOBIL[1] });

    console.log('  ' + is.ad.padEnd(18) +
      ' ana ' + kb(fs.statSync(ana).size) +
      '  aktif ' + kb(fs.statSync(aktif).size) +
      '  mobil ' + kb(fs.statSync(mobil).size) +
      '  en parlak ' + enParlak + (enParlak > 240 ? '  << PATLAMIS BEYAZ' : ''));
  }
  /* tek is basildiysa kunyenin gerisi korunur */
  if (secim && fs.existsSync(KUNYE)) {
    const eski = JSON.parse(fs.readFileSync(KUNYE, 'utf8'));
    for (const e of eski) if (!kunye.some((k) => k.slug === e.slug)) kunye.push(e);
    kunye.sort((a, b) => ISLER.findIndex((i) => i.ad === a.slug) - ISLER.findIndex((i) => i.ad === b.slug));
  }
  fs.writeFileSync(KUNYE, JSON.stringify(kunye, null, 2) + String.fromCharCode(10));
  console.log('  kunye: src/veri/galeri-gorselleri.json (' + kunye.length + ' proje)');
  fs.rmSync(gecici, { recursive: true, force: true });
})();
