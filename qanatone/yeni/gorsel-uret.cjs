#!/usr/bin/env node
/* yeni/gorsel-uret.cjs — gocun gorsel varliklarini uretir (hero elleri +
   S-T seridinin arac logolari).
   Neden ayri betik: kaynak gorsel kokte (img/), yeni site kendi alaninda
   (yeni/public/img/) kendi kendine yetmeli — Faz 4 kesmesinde kok yeni
   ciktiya doner. Elle olcek verilmez: mobil genislik CSS kutusundan
   turetilir (kural 109: cozulmus bitmap <= 2x CSS kutusu).

     .sus-el-h  mobilde 57vw · 430px ekranda 245 CSS px -> 512 varyant (2,09x)
     .sus-el-r  mobilde 64vw · 430px ekranda 275 CSS px -> 560 varyant (2,04x)

   Masaustu (33vw) icin kaynak boyut aynen tasinir; 1440px ekranda kutu
   475 CSS px, robot eli 1244 = 2,6x — masaustu tarafi mobil sozlesmesinin
   disinda (Anayasa madde 4 "(pointer:coarse) tarafinda").

   Kosum:  node gorsel-uret.cjs      (yeni/ icinde, sharp yeni/node_modules'te)  */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const KAYNAK = path.join(__dirname, '..', 'img');
const HEDEF = path.join(__dirname, 'public', 'img');
fs.mkdirSync(HEDEF, { recursive: true });

/* mobil varyant genisligi yukaridaki CSS kutusu hesabindan gelir */
const ISLER = [
  { ad: 'hand-human', mobil: 512 },
  { ad: 'hand-robot', mobil: 560 },
];

const kb = n => (n / 1024).toFixed(1) + ' KB';

/* --- S-T seridi: 'Powered by' arac logolari ---------------------------
   Kaynak PNG'ler 72 px yuksek (koyu temaya gore islenmis, alfa kanalli).
   CSS kutusu `clamp(24px,3vw,34px)`: mobilde 24 px'e, masaustunde 34 px'e
   oturur. Kural 109 (cozulmus bitmap <= 2x CSS kutusu) iki varyant
   gerektiriyor — tek 72 px kaynak mobilde 3x eder:
     mobil (<=760px)  kutu 24 px -> 48 px kaynak (2,0x)
     masaustu          kutu 34 px -> 68 px kaynak (2,0x)
   Bicim webp: PNG'ler alfa tasiyor, ayni alfayla webp ucta ucuza gelir.
   SIRA KAYNAKTAN: eski renderTicker'in dizisi neyse o (alfabetik degil).
   Olculer ELLE YAZILMAZ — bu betik `src/veri/serit-logolari.json`
   uretir, bilesen onu okur; yukseklik degisirse iki taraf birlikte
   degisir, width/height bayatlamaz. */
const LOGOLAR = [
  ['openai', 'OpenAI'], ['claude', 'Claude'], ['gemini', 'Gemini'],
  ['antigravity', 'Google Antigravity'], ['notebooklm', 'NotebookLM'],
  ['kimi', 'Kimi'], ['vercel', 'Vercel'], ['python', 'Python'],
  ['higgsfield', 'Higgsfield'],
];
const LOGO_KAYNAK = path.join(KAYNAK, 'powered');
const LOGO_HEDEF = path.join(HEDEF, 'powered');
const KUNYE = path.join(__dirname, 'src', 'veri', 'serit-logolari.json');

async function logolar() {
  fs.mkdirSync(LOGO_HEDEF, { recursive: true });
  fs.mkdirSync(path.dirname(KUNYE), { recursive: true });
  const kunye = [];
  let kaynakToplam = 0, mobilToplam = 0, masaToplam = 0;
  for (const [ad, etiket] of LOGOLAR) {
    const giris = path.join(LOGO_KAYNAK, `${ad}.png`);
    const meta = await sharp(giris).metadata();
    kaynakToplam += fs.statSync(giris).size;
    for (const [ek, yuk] of [['-m', 48], ['', 68]]) {
      const cikis = path.join(LOGO_HEDEF, `${ad}${ek}.webp`);
      await sharp(giris).resize({ height: yuk, withoutEnlargement: true })
        .webp({ quality: 82, effort: 6, alphaQuality: 90 }).toFile(cikis);
      const b = fs.statSync(cikis).size;
      if (ek === '-m') mobilToplam += b; else masaToplam += b;
    }
    const m = await sharp(path.join(LOGO_HEDEF, `${ad}.webp`)).metadata();
    kunye.push({ ad, etiket, w: m.width, h: m.height });
    console.log(`  + powered/${ad}  ${meta.width}x${meta.height} png -> ${m.width}x${m.height} webp`);
  }
  fs.writeFileSync(KUNYE, JSON.stringify(kunye, null, 2) + '\n');
  console.log(`  = logolar: kaynak ${kb(kaynakToplam)} · mobil ${kb(mobilToplam)}` +
              ` · masaustu ${kb(masaToplam)} · künye ${path.relative(__dirname, KUNYE)}`);
}

/* --- S-P destesi: proje kart gorselleri --------------------------------
   Kaynak kokteki `img/pj-<slug>.webp` renkli asillar (1600 px genis).
   Iki varyant, ikisi de CSS kutusundan turetildi (elle olcek YOK):

     MASAUSTU  kutu 1120 * .92/2 = 515 CSS px genis, ~440 px yuksek.
       Olcek `max(1030/w, 480/h)` — yani en az 1030 genis YA DA 480 yuksek;
       hangisi baglayiciysa o. `cover` kirpmasi iki eksende de kutuyu
       doldurmali, tek eksene bakmak dar tarafta bosluk birakir. Kirpma YOK:
       slug bazli `object-position` odaklari asil orana gore ayarlandi,
       uretecte kirpmak onlari gecersiz kilardi. Renkli kalir — gri filtre
       masaustunde CSS'te ve hover'da renge doner.

     MOBIL     kutu ~372 CSS px genis (412 px ekran - 2*20 dolgu), 186 yuksek.
       640 px varyant = 1,72x (kural 109 tavani 2x). En/boy 16:9'da kapanir:
       daha uzun asillarda ust/alt kirpilir, genislik tam kalir — kokteki
       `-k` turevlerinin olculmus davranisi (960x540 kononenko 1102x1356'dan).
       Gri + kontrast TUVALDE PISIRILIR: mobilde kalici katmanda `filter`
       yasak (Anayasa madde 7) ve her yeniden rasterlesmede filtre yeniden
       kosuyordu (kural 109).

   Kunye `src/veri/deste-gorselleri.json`: hangi projeler destede ve
   olculeri ne. Bilesen onu okur, olcuyu ELLE yazmaz; denetimdeki H15
   kunye ile content.json'i karsilastirir, panel degisirse kirmizi doner.  */
const DESTE_ADET = 6;                      /* destede kac is duruyor */
const MASA_GEN = 1030, MASA_YUK = 480;     /* masaustu alt sinirlar */
const MOBIL_GEN = 640, MOBIL_ORAN = 9 / 16;
const KART_HEDEF = path.join(HEDEF, 'pj');
const KART_KUNYE = path.join(__dirname, 'src', 'veri', 'deste-gorselleri.json');

async function kartlar() {
  fs.mkdirSync(KART_HEDEF, { recursive: true });
  const icerik = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
  /* Deste kurali TEK yerde: fotografi olan isler, kaynak sirasiyla, ilk
     DESTE_ADET tanesi. `imgc` (logo) tasiyan is destede degil — logo kart
     penceresini dolduramaz, arsivde yasar. */
  const secim = (icerik.projects || []).filter(p => p.image && !p.imgc).slice(0, DESTE_ADET);
  const kunye = [];
  let masaToplam = 0, mobilToplam = 0, kaynakToplam = 0;
  for (const p of secim) {
    const giris = path.join(__dirname, '..', p.image);
    const m = await sharp(giris).metadata();
    kaynakToplam += fs.statSync(giris).size;

    const s = Math.min(1, Math.max(MASA_GEN / m.width, MASA_YUK / m.height));
    const mg = Math.round(m.width * s), my = Math.round(m.height * s);
    const masa = path.join(KART_HEDEF, `${p.slug}.webp`);
    await sharp(giris).resize({ width: mg, height: my })
      .webp({ quality: 80, effort: 6 }).toFile(masa);

    const my2 = Math.min(Math.round(MOBIL_GEN * m.height / m.width),
                         Math.round(MOBIL_GEN * MOBIL_ORAN));
    const mob = path.join(KART_HEDEF, `${p.slug}-m.webp`);
    /* CSS `grayscale(1) contrast(1.1)` karsiligi: gri + lineer kontrast
       (a=1.1, b=-0.5*(1.1-1)*255) — ayni egri, tuvalde bir kez. */
    await sharp(giris).resize({ width: MOBIL_GEN, height: my2, fit: 'cover', position: 'centre' })
      .grayscale().linear(1.1, -12.75)
      /* q74 OLCUYLE secildi: ilk yukte destenin ilk iki karti lazy
         esigin icinde kaliyor (Lighthouse ag dokumu), yani bu iki dosya
         dogrudan sahne kapisinin "152 KB'i yukari cekme" sartina
         giriyor. Ayni iki gorsel q78'de 23,9 KB, q74'te 21,5 KB, kokteki
         eski `-k-640` turevlerinde 23,1 KB. Gri fotograf q74'te de
         temiz; secim tahmin degil olcum. */
      .webp({ quality: 74, effort: 6 }).toFile(mob);

    masaToplam += fs.statSync(masa).size;
    mobilToplam += fs.statSync(mob).size;
    kunye.push({ slug: p.slug, w: mg, h: my, mw: MOBIL_GEN, mh: my2 });
    console.log(`  + pj/${p.slug}  ${m.width}x${m.height} -> masa ${mg}x${my} ` +
                `${kb(fs.statSync(masa).size)} · mobil ${MOBIL_GEN}x${my2} ${kb(fs.statSync(mob).size)}`);
  }
  fs.writeFileSync(KART_KUNYE, JSON.stringify(kunye, null, 2) + '\n');
  console.log(`  = deste: kaynak ${kb(kaynakToplam)} · masaustu ${kb(masaToplam)}` +
              ` · mobil ${kb(mobilToplam)} · künye ${path.relative(__dirname, KART_KUNYE)}`);
}

/* --- S-KU kurucu fotografi --------------------------------------------
   Kaynak `img/founder.webp` 832x1253 (4:5). CSS kutusu: masaustunde
   akordeon govdesinde ~300 px genis, mobilde tam genislik ~372 px.
   TEK varyant 640 px yetiyor: mobilde 1,72x (kural 109 tavani 2x),
   masaustunde 2,13x — masaustu zaten mobil sozlesmesinin disinda
   (Anayasa madde 4). Iki varyant uretmek burada bayt kazandirmiyordu:
   olculdu, 480'lik ikinci dosya toplamda daha pahaliya geliyordu. */
const KURUCU_GEN = 640;

async function kurucu() {
  const giris = path.join(__dirname, '..', 'img', 'founder.webp');
  if (!fs.existsSync(giris)) { console.log('  ! founder.webp yok, atlandi'); return; }
  const m = await sharp(giris).metadata();
  const cikis = path.join(HEDEF, 'founder.webp');
  const o = await sharp(giris).resize({ width: KURUCU_GEN, withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 }).toFile(cikis);
  const kunye = path.join(__dirname, 'src', 'veri', 'kurucu-gorsel.json');
  fs.writeFileSync(kunye, JSON.stringify({ w: o.width, h: o.height }, null, 2) + String.fromCharCode(10));
  console.log(`  + founder  ${m.width}x${m.height} -> ${o.width}x${o.height}` +
              `  ${kb(fs.statSync(giris).size)} -> ${kb(fs.statSync(cikis).size)}`);
}


/* --- Projeler dizini + detay gorselleri (giydirme, 20 Agu) ------------
   Kaynak ayni renkli asillar (img/pj-<slug>.webp). Uc varyant, ucu de
   CSS kutusundan (kural 109, <=2x):

     THUMB (dizin karti solunda, SABIT 104 CSS px, 4:3)
       -> 208x156 cover (2,0x) — tek varyant, kutu her kirilimda sabit.
     HERO masaustu (detay, main 800 CSS px, 16:9)
       -> 1280x720 cover (1,6x) — 2x tavaninin altinda, bayt bilinçli.
     HERO mobil (372 CSS px kutu) -> 744x419 cover (2,0x).

   Kunye `src/veri/proje-gorselleri.json`: bilesen olcuyu ELLE yazmaz;
   `image`si olmayan proje kunyeye girmez, bilesen gorselsiz basar
   (panelden yeni proje senaryosu — deste <source> dersinin ayni). */
/* pk = dizin izgarasinin kart bandi. Olcu kaynaktan turedi: orijinal
   arsiv (#msn/.mi, kok index.html 1730) gorsel bandini 220 px SABIT
   tutuyor.
   OLCU DUZELTILDI (22 Agu, sadakat turu): onceki 526x440 "kap 1120, DORT
   sutun, sutun 263" varsayimindan turemisti ve o varsayim YANLISTI.
   Kaynagin kabi `.wrap` = max 1280 - 2x40 oluk = en fazla 1200 px, sutun
   sayisi da KAP genisliginden okunuyor (11056): 1200 px hicbir zaman 1240
   esigini gecmez, yani sayfa en fazla UC sutun. Dogru sutun
   (1200-44)/3 = 385,33 px -> 2x kutu 770x440 (kural 109: cozulmus bitmap
   <= 2x CSS kutusu). Eski 526 hem yanlis kadraji (daha yakin kirpma) hem
   eksik cozunurluk demekti.
   KAYNAK GORSEL `imgc || image`: kaynak arsiv karti kart-ozel bir gorsel
   alanini onceliyor (11002). Uretec bunu hic okumuyordu; Bab Ic Mimarlik
   kartinda kaynak cizgi logoyu (pj-bab-logo) gosterirken yeni taraf ic
   mekan fotografini basiyordu. */
/* GORSEL ODAK NOKTALARI — kaynak index.html 1223-1227, slug bazli.
   Kaynagin kendi yorumu: "cover kirpmasi logolu/metinli bolgeyi pencereden
   atmasin diye slug bazli hizalar". Turetilemez, sanat yonetimi karari;
   kaynaktan OKUNDU, goz karariyla konmadi. Listede olmayan proje %50.
   Deger `object-position` yuzdesidir ve burada KIRPMAYA PISIRILIR:
   varyant zaten kutunun oraninda uretildigi icin CSS'te ayrica
   `object-position` yazmak gerekmiyor (ve yazilsaydi merkezden kirpilmis
   bir goruntuyu kaydirmaya calisirdi — ise yaramazdi). */
const ODAK = { 'mercedes-benz': .04, 'skyclinics': .10, 'cmblu-energy': .12,
               'terawulf': .70 };

/* object-fit:cover + object-position'un tarayicidaki davranisinin birebiri:
   once kutuyu ORTECEK kadar olcekle, sonra odak yuzdesiyle kaydirip kes. */
async function odakliKirp(giris, W, H, fx) {
  const m = await sharp(giris).metadata();
  const s = Math.max(W / m.width, H / m.height);
  const w = Math.round(m.width * s), h = Math.round(m.height * s);
  const sol = Math.max(0, Math.min(Math.round((w - W) * fx), w - W));
  const ust = Math.max(0, Math.min(Math.round((h - H) * .5), h - H));
  return sharp(giris).resize(w, h).extract({ left: sol, top: ust, width: W, height: H });
}

const PRJ_HEDEF_K = path.join(HEDEF, 'pk');
const PRJ_HEDEF_T = path.join(HEDEF, 'pt');
const PRJ_HEDEF_D = path.join(HEDEF, 'pd');
const PRJ_KUNYE = path.join(__dirname, 'src', 'veri', 'proje-gorselleri.json');

async function projeGorselleri() {
  fs.mkdirSync(PRJ_HEDEF_K, { recursive: true });
  fs.mkdirSync(PRJ_HEDEF_T, { recursive: true });
  fs.mkdirSync(PRJ_HEDEF_D, { recursive: true });
  const icerik = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
  const kunye = [];
  let toplam = 0;
  for (const pr of (icerik.projects || [])) {
    if (!pr.image) continue;
    const giris = path.join(__dirname, '..', pr.image);
    if (!fs.existsSync(giris)) { console.log('  ! kaynak yok: ' + pr.image); continue; }
    /* kart bandi kaynagi: `imgc` varsa O (kok index.html 11002) */
    const girisK = pr.imgc && fs.existsSync(path.join(__dirname, '..', pr.imgc))
      ? path.join(__dirname, '..', pr.imgc) : giris;
    const t = path.join(PRJ_HEDEF_T, pr.slug + '.webp');
    await sharp(giris).resize({ width: 208, height: 156, fit: 'cover', position: 'centre' })
      .webp({ quality: 78, effort: 6 }).toFile(t);
    const d = path.join(PRJ_HEDEF_D, pr.slug + '.webp');
    await sharp(giris).resize({ width: 1280, height: 720, fit: 'cover', position: 'centre' })
      .webp({ quality: 78, effort: 6 }).toFile(d);
    const dm = path.join(PRJ_HEDEF_D, pr.slug + '-m.webp');
    await sharp(giris).resize({ width: 744, height: 419, fit: 'cover', position: 'centre' })
      .webp({ quality: 74, effort: 6 }).toFile(dm);
    /* LOGO KARTI: `imgc` tasiyan projede kart gorseli bir LOGO'dur ve
       kaynak ona `object-fit:contain + #000 zemin + %9 dolgu` uyguluyor
       (1229-1231: "pencere orani ne olursa olsun logo tam, ortali ve
       tutarli olcekte"). Contain kirpmaz — o yuzden varyant da kirpilmaz,
       kutuya SIGDIRILIR ve kirpmayi/yerlesimi CSS yapar. */
    const logo = !!pr.imgc;
    const k = path.join(PRJ_HEDEF_K, pr.slug + '.webp');
    const km = path.join(PRJ_HEDEF_K, pr.slug + '-m.webp');
    let kb2, kmb;
    if (logo) {
      kb2 = await sharp(girisK).resize({ width: 770, height: 440, fit: 'inside' })
        .webp({ quality: 82, effort: 6 }).toFile(k);
      kmb = await sharp(girisK).resize({ width: 700, height: 360, fit: 'inside' })
        .webp({ quality: 82, effort: 6 }).toFile(km);
    } else {
      const fx = ODAK[pr.slug] != null ? ODAK[pr.slug] : .5;
      kb2 = await (await odakliKirp(girisK, 770, 440, fx))
        .webp({ quality: 76, effort: 6 }).toFile(k);
      kmb = await (await odakliKirp(girisK, 700, 360, fx))
        .webp({ quality: 74, effort: 6 }).toFile(km);
    }
    const boy = fs.statSync(t).size + fs.statSync(d).size + fs.statSync(dm).size
      + fs.statSync(k).size + fs.statSync(km).size;
    toplam += boy;
    kunye.push({ slug: pr.slug, thumb: { w: 208, h: 156 }, logo,
      kart: { w: kb2.width, h: kb2.height }, kartm: { w: kmb.width, h: kmb.height },
      hero: { w: 1280, h: 720 }, herom: { w: 744, h: 419 } });
    console.log('  + prj ' + pr.slug + '  ' + kb(boy) + ' (t+k+km+d+dm)');
  }
  fs.writeFileSync(PRJ_KUNYE, JSON.stringify(kunye, null, 2) + String.fromCharCode(10));
  console.log('  = projeler: ' + kunye.length + ' is · toplam ' + kb(toplam));
}


/* ---------- KARA IZGARASI (motor sahnesi · dünya haritası) ----------
   400x142 equirectangular, hücre başına 2 bit (0 deniz · 1 seyrek kara ·
   2 yerleşik · 3 yoğun). Kaynak: kökteki QG._rle — Natural Earth 50m
   kara poligonları + 170.536 yerleşim noktasından üretilmiş, RLE+base64
   6,3 KB. `src/veri/kara-izgara.txt`e KOPYALANDI (derleme girdisi,
   tarayıcıya İNMEZ).

   PAYLAŞILAN KATMAN: kaynakta aynı ızgarayı hem ana sayfa talep haritası
   hem TradeSelf pazar haritası kullanıyor. Burada ızgara BİR KEZ
   görüntüye basılıyor; ana sayfa haritası göçtüğünde aynı dosyayı
   kullanacak — ikinci kopya yok.

   NEDEN GÖRÜNTÜ: kaynak ızgarayı canvas'a çiziyordu; o yol 6,3 KB veri +
   çözücü + çizici JS demek ve sayfa başına 10 KB'lik J1 tavanını tek
   başına yerdi. Nokta katmanı statiktir — derlemede bir kez basılır.
   ÖLÇÜLDÜ: 1600x568 webp 19,9 KB · 800x284 webp 4,5 KB.            */
const KARA_KAYNAK = path.join(__dirname, 'src', 'veri', 'kara-izgara.txt');
async function karaIzgarasi() {
  if (!fs.existsSync(KARA_KAYNAK)) { console.log('  ! kara-izgara.txt yok'); return; }
  const X = 400, Y = 142;
  const b = Buffer.from(fs.readFileSync(KARA_KAYNAK, 'utf8').trim(), 'base64');
  const g = new Uint8Array(X * Y);
  let p = 0;
  for (let i = 0; i < b.length; i++) {
    const t = b[i], v = t >> 6, n = (t & 63) + 1;
    for (let k = 0; k < n && p < g.length; k++) g[p++] = v;
  }
  const ciz = (W) => {
    const H = Math.round(W * Y / X), sx = W / X, sy = H / Y;
    const r0 = Math.max(.5, Math.min(sx, sy) * .42);
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
    for (let y = 0; y < Y; y++) for (let x = 0; x < X; x++) {
      const v = g[y * X + x]; if (!v) continue;
      const a = v === 3 ? .2 : v === 2 ? .12 : .06;
      const r = r0 * (v === 3 ? 1.2 : v === 2 ? 1 : .8);
      svg += `<circle cx="${((x + .5) * sx).toFixed(1)}" cy="${((y + .5) * sy).toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" fill-opacity="${a}"/>`;
    }
    return { svg: svg + '</svg>', H };
  };
  let toplam = 0;
  for (const [ad, W] of [['kara.webp', 1600], ['kara-m.webp', 800]]) {
    const { svg, H } = ciz(W);
    const hedef = path.join(HEDEF, ad);
    await sharp(Buffer.from(svg)).resize(W, H).webp({ quality: 82, effort: 6, alphaQuality: 90 }).toFile(hedef);
    const boy = fs.statSync(hedef).size; toplam += boy;
    console.log(`  + ${ad}  ${W}x${H}  ${kb(boy)}`);
  }
  console.log('  = kara ızgarası: ' + kb(toplam));
}

(async () => {
  for (const is of ISLER) {
    /* masaustu: kaynak dosyalar oldugu gibi tasinir — yeniden kodlama
       nesil kaybi demek, kazanci yok. */
    for (const uzanti of ['webp', 'avif']) {
      const k = path.join(KAYNAK, `${is.ad}.${uzanti}`);
      const h = path.join(HEDEF, `${is.ad}.${uzanti}`);
      fs.copyFileSync(k, h);
      console.log(`  = ${is.ad}.${uzanti}  ${kb(fs.statSync(h).size)}`);
    }
    /* mobil: webp kaynagindan olcekle (avif kaynak zaten kayipli) */
    const giris = path.join(KAYNAK, `${is.ad}.webp`);
    const meta = await sharp(giris).metadata();
    const olcek = sharp(giris).resize({ width: is.mobil, withoutEnlargement: true });
    const wp = path.join(HEDEF, `${is.ad}-m.webp`);
    const av = path.join(HEDEF, `${is.ad}-m.avif`);
    await olcek.clone().webp({ quality: 76, effort: 6 }).toFile(wp);
    await olcek.clone().avif({ quality: 52, effort: 6 }).toFile(av);
    console.log(`  + ${is.ad}-m  ${meta.width}x${meta.height} -> ${is.mobil}w` +
                `  webp ${kb(fs.statSync(wp).size)} · avif ${kb(fs.statSync(av).size)}`);
  }
  await logolar();
  await kartlar();
  await kurucu();
  await projeGorselleri();
  await karaIzgarasi();
})();
