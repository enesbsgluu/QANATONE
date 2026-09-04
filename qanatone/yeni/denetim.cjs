#!/usr/bin/env node
/* yeni/denetim.js — Astro çıktısının denetimi (Faz 1, kova 3).
   Referans dersleri KURAL hâlinde: F1 yazı tipi zinciri, G1 görsel hattı,
   V1 veri derlemede pişer, J1 sayfa başına JS tavanı, S1 baş sözleşmesi,
   N1 göç bekçisi (noindex). Astro derlemesinden SONRA koşar (netlify.toml);
   kırmızı → deploy düşer. Eski suite (test/denetim.js) kök siteyi
   denetlemeye devam eder — kovalar: DENETIM-GOC-KOVALARI.md. */
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..', 'dist');
let gecti = 0, kaldi = 0;
/* ERKEN CIKIS BEKCISI (TUR 9, 3 Eyl 2026). Bu dosya CommonJS: modul
   seviyesinde `return` gecerlidir ve dosyayi sessizce bitirir — FM1'in
   "girdi eksik" dali tam bunu yapiyordu; kalan kurallar, ozet ve exit(1)
   atlaniyor, surec 0 ile cikiyordu (yanlis yesil, olculdu). Cikista ozet
   satirina ulasilmamissa cikis kodu 1'e zorlanir: bu siniftaki her erken
   cikis (return, throw'suz process.exit(0) vb.) kirmiziya doner. */
let ozetBasildi = false;
process.on('exit', (kod) => {
  if (!ozetBasildi && kod === 0) {
    console.log('\n  !! DENETİM ÖZETE ULAŞMADAN BİTTİ (erken return/çıkış) — yanlış yeşil engellendi, çıkış 1');
    process.exitCode = 1;
  }
});
const ol = (ad, ok, not) => {
  console.log(`  ${ok ? 'ok ' : '!! '} ${ad}${not ? '  ' + not : ''}`);
  ok ? gecti++ : kaldi++;
};

if (!fs.existsSync(KOK)) {
  console.log('dist yok — önce astro build.');
  process.exit(1);
}

/* sayfaları topla */
const tumSayfalar = [];
(function tara(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) tara(p);
    else if (f.endsWith('.html')) tumSayfalar.push(p);
  }
})(KOK);
const oku = p => fs.readFileSync(p, 'utf8');
const rel = p => path.relative(KOK, p).replace(/\\/g, '/');

/* ---- BIRINCIL KONAK · TEK KAYNAK (4 Eyl 2026) ----
   www kararinda (6 Eyl, Enes) kaynak agacindaki 14 elle yazilmis konak
   `src/icerik.ts`'teki tek `KOK`a baglandi — ama DENETLEYICININ KENDISI
   supurulmedi: burada apex alti yerde sabit yaziliydi (R6 faq kimligi,
   R8 sitemap+rss, S2 #org govdesi). Yani denetim, uretimin ARTIK
   basmadigi bir adresi bekliyordu. Bu sinifin en sinsi hali: kural
   dogru seyi olcuyor gorunur, olcutu bayattir.
   Konak ARTIK TURETILIR, yazilmaz. Kaynak `src/icerik.ts` — sayfalarin,
   sema.mjs'in ve robots.txt'in okudugu ayni satir. Node .ts calistiramaz
   (yerel 24 / Netlify 22 farki ayri bir ders), o yuzden metin okunur;
   satir bicimi degisirse desen tutmaz ve ASAGIDAKI KAPI yanar — sessiz
   sapma yerine gurultulu kirmizi.
   Ikinci bir kaynak da var: astro.config.mjs `site` (canonical/sitemap
   Astro tarafinda ORADAN uretilir). Ikisi ayrisirsa cikti kendi icinde
   celisir; K3 bunu tutar. */
const KONAK = (() => {
  const y = path.join(__dirname, 'src', 'icerik.ts');
  const m = fs.existsSync(y) && oku(y).match(/export\s+const\s+KOK\s*=\s*['"]([^'"]+)['"]/);
  return m ? m[1].replace(/\/+$/, '') : null;
})();
/* desen icine gomulecek hali — konak nokta tasir, kacirilmazsa `.`
   herhangi bir karakter olur ve kural gevser (qanatoneXcom da gecerdi) */
const KONAK_RE = KONAK ? KONAK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
const ASTRO_KONAK = (() => {
  const y = path.join(__dirname, 'astro.config.mjs');
  const m = fs.existsSync(y) && oku(y).match(/^\s*site:\s*['"]([^'"]+)['"]/m);
  return m ? m[1].replace(/\/+$/, '') : null;
})();

/* ---- MEDYA KURULUM KAPISI (GECE TUR 2c, 1-2 Eyl 2026) ----
   Film medyasi (~680 MB) bilincli git disi; onu getiren KURULUM ADIMI
   `yeni/film/kur-medya.cjs`. Denetim o adimin ARDINA konur: adim
   kosmamissa (damga yok / manifest'e uymuyor / dosya eksik) G2 ve FM1
   sebebini ADIYLA basar — eski hal "dosya-yok" yigini basiyordu, temiz
   klonda kirmizinin sebebi okunmuyordu. Hizli yoklama: damga + varlik +
   bayt (sha1'i kurulum adimi ve FM1'in kendi kunye zinciri dogrular). */
const MEDYA = (() => {
  const manifestY = path.join(__dirname, 'film', 'medya-manifest.json');
  const damgaY = path.join(__dirname, 'film', '.medya-kurulum.json');
  const KUR = 'once `node yeni/film/kur-medya.cjs` kos (kaynak: arguman ya da MEDYA_KAYNAK)';
  if (!fs.existsSync(manifestY))
    return { kuruldu: false, mesaj: 'medya-manifesti-yok: ana agacta `kur-medya.cjs --damgala` kosulmali' };
  if (!fs.existsSync(damgaY))
    return { kuruldu: false, mesaj: 'medya-kurulmamis: ' + KUR };
  try {
    /* \r ayiklanir — git autocrlf manifesti CRLF cikarabilir, damga LF
       govdenin sha1'ini tasir (kur-medya.cjs ile ayni normalizasyon). */
    const govde = Buffer.from(fs.readFileSync(manifestY, 'utf8').replace(/\r/g, ''));
    const D = JSON.parse(fs.readFileSync(damgaY, 'utf8'));
    if (D.manifest_sha1 !== require('crypto').createHash('sha1').update(govde).digest('hex'))
      return { kuruldu: false, mesaj: 'medya-damgasi-bayat (manifest degismis): ' + KUR };
    const M = JSON.parse(govde);
    const dizin = path.join(__dirname, 'public', 'varlik', 'film');
    for (const d of M.dosya) {
      const p = path.join(dizin, d.ad);
      if (!fs.existsSync(p) || fs.statSync(p).size !== d.bayt)
        return { kuruldu: false, mesaj: 'medya-eksik(' + d.ad + '): ' + KUR };
    }
    /* IKINCI YON (4 Eyl 2026): eskiden yalniz manifest -> disk bakiliyordu,
       yani diskteki FAZLA dosya sessizdi. Fazlalik zararsiz gorunur ama
       degildir: manifest disi bir dosya yayina cikar, uzak kaynakta
       KARSILIGI OLMAZ ve temiz klonda hicbir sey onu getirmez — "bende
       calisiyordu"nun tam kaynagi. Kapi artik BIREBIR. */
    const listede = new Set(M.dosya.map((d) => d.ad));
    const fazla = (fs.existsSync(dizin) ? fs.readdirSync(dizin) : []).filter((a) => !listede.has(a));
    if (fazla.length)
      return { kuruldu: false, mesaj: 'medya-fazla(' + fazla.slice(0, 3).join(',') + '): manifest bayat — `kur-medya.cjs --damgala`' };
    return { kuruldu: true, mesaj: '' };
  } catch (e) { return { kuruldu: false, mesaj: 'medya-damgasi-okunamadi: ' + e.message }; }
})();

/* ---- PROTOTIP AYRIMI (31 Agu 2026, PROLOG-ISKELET 6. adim) ----
   `public/prototip/**` altindakiler URUN SAYFASI DEGIL, OLCUM DUZENEGI:
   kendi kopya nav'i, kendi three.js surucusu, kendi varlik yolu var;
   site navigasyonundan erisilmez ve DEVIR §2 hukmu Enes'te bekliyor.
   Uretim sayfasi kurallari (sayfa sayimi, G1 gorsel, V1 veri, J1 JS
   tavani, S1 bas sozlesmesi, G2 alan) bunlara uygulaninca 6 KIRMIZI
   uretiyordu; bu duzenegin kusuru degil, kuralin YANLIS YERE
   uygulanmasiydi — ve suite gunlerdir bu yuzden kirmiziydi.
   MUAFIYET SESSIZ DEGIL: (1) asagida adiyla BASILIR, (2) P1 kurali
   prototipleri ayrica denetler (noindex + siteden baglanti yok).
   noindex kapsam DISI birakilmaz: N1 tum sayfalarda kosar. */
const PROTOTIP = /(^|\/)prototip\//;
const sayfalar = tumSayfalar.filter((p) => !PROTOTIP.test(rel(p)));
const prototipler = tumSayfalar.filter((p) => PROTOTIP.test(rel(p)));

console.log(`\nQANATONE yeni kabuk denetimi — ${sayfalar.length} sayfa` +
  (prototipler.length ? ` (+ ${prototipler.length} prototip, ürün kuralları dışında: ${prototipler.map(rel).join(', ')})` : '') + `\n`);

/* SAYFA KUMESI (TUR 9, 3 Eyl 2026) — onceden SAYI kiyaslaniyordu
   (koleksiyon x2 + "19" sihirli sabit): bir sayfa eklenip biri silinirse
   yesil kaliyordu (MIMARI M4/M19). Simdi beklenen KUME tek kaynaktan
   (src/veri/sayfalar.json statik kayitlari x dil + koleksiyon slug'lari x2)
   ve dist'teki sayfa yollariyla IKI YONLU kiyaslanir: listede olup dist'te
   olmayan "eksik", dist'te olup listede olmayan "fazla". Kirmizi-once:
   3 Eyl, /film kaydi gecici cikarilinca 2 fazla; sahte kayit eklenince 1 eksik. */
{
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
  const S = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'veri', 'sayfalar.json'), 'utf8'));
  const beklenen = new Set();
  for (const s of S.statik) for (const d of s.dil) beklenen.add(((d === 'en' ? '/en' : '') + (s.yol || '')) || '/');
  for (const k of S.koleksiyon) for (const e of (c[k.kaynak] || [])) for (const d of ['tr', 'en'])
    beklenen.add((d === 'en' ? '/en' : '') + k.yol.replace('{slug}', e.slug));
  const gercek = new Set(sayfalar.map((p) =>
    ('/' + rel(p).replace(/\/?index\.html$/, '').replace(/\.html$/, '')).replace(/\/$/, '') || '/'));
  const eksik = [...beklenen].filter((x) => !gercek.has(x));
  const fazla = [...gercek].filter((x) => !beklenen.has(x));
  ol('sayfa kümesi = sayfalar.json × dil + content.json koleksiyonları × 2 (iki yönlü)',
     eksik.length === 0 && fazla.length === 0,
     (eksik.length ? 'eksik:' + eksik.slice(0, 3).join(',') + ' ' : '') + (fazla.length ? 'fazla:' + fazla.slice(0, 3).join(',') : '')
       || `${gercek.size} sayfa`);
}

/* FM4 · UZAK MEDYA KAYNAGI GERCEKTEN DOLU (4 Eyl 2026 — DEPLOY DUSTUKTEN
   SONRA yazildi, bedeli odenmis kural).
   NE OLDU: manifestin `uzak` alani
   `github.com/enesbsgluu/QANATONE/releases/download/medya-v1` gosteriyordu;
   o release HIC OLUSTURULMAMISTI (depoda sifir release). Yerelde medya
   diskte durdugu icin `kur-medya.cjs` kaynak sirasindan DISKI secip yesil
   geciyordu — 238 yerinde, 0 indirildi. CI'da disk yok: uzak tek kaynak,
   238/238 dosya HTTP 404, zincir kur-medya adiminda dustu.
   NEDEN HICBIR KURAL GORMEDI: yoklama araci (`--uzak-yokla`) VARDI ama
   yalniz belgede duruyordu — hicbir kapiya, zincire, kontrol listesine
   bagli degildi. Yani "release gercekten duruyor mu" sorusu bir kez bile
   sorulmadi. Elle kosulan komut kapi degildir.
   BU KURAL AG CAGRISI YAPMAZ (CI'da da kosuyor): yoklamanin KAYDINI okur.
   Kayit `yeni/film/uzak-yokla.json`, git icinde, manifestin sha1'ini
   tasir — manifest degisip yoklama tazelenmezse kural KIRMIZI yanar.
   Boylece medya her degistiginde "release'i guncelledin mi" sorusu
   OTOMATIK sorulur. */
{
  const kusur = [];
  const ky = path.join(__dirname, 'film', 'uzak-yokla.json');
  const my = path.join(__dirname, 'film', 'medya-manifest.json');
  let not = '';
  if (!fs.existsSync(my)) kusur.push('manifest-yok');
  else if (!fs.existsSync(ky))
    kusur.push('uzak-yoklama-kaydi-yok: `node yeni/film/kur-medya.cjs --uzak-yokla` kosulmali');
  else {
    try {
      const K = JSON.parse(oku(ky));
      const M = JSON.parse(oku(my).replace(/\r/g, ''));
      const mSha = require('crypto').createHash('sha1')
        .update(Buffer.from(oku(my).replace(/\r/g, ''))).digest('hex');
      if (K.sonuc !== 'TAZE')
        kusur.push('uzak-EKSIK(' + K.kusurlu + '/' + K.dosya_sayisi + '): ' + (K.ilk_kusur || []).slice(0, 2).join(' '));
      if (K.manifest_sha1 !== mSha)
        kusur.push('yoklama-BAYAT: manifest degismis, `--uzak-yokla` yeniden kosulmali');
      if (K.uzak !== M.uzak)
        kusur.push('yoklama-baska-adresi-olcmus: ' + K.uzak + ' != ' + M.uzak);
      if (K.dosya_sayisi !== (M.dosya || []).length)
        kusur.push('yoklama-dosya-sayisi:' + K.dosya_sayisi + '!=' + (M.dosya || []).length);
      not = `${K.dosya_sayisi} varlık · ${K.uzak} · ${K.tarih}`;
    } catch (e) { kusur.push('kayit-okunamadi:' + e.message); }
  }
  ol('FM4 · uzak medya kaynağı dolu ve yoklama TAZE (kayıtla kanıtlı, ağ çağrısı yok)',
     kusur.length === 0, kusur.slice(0, 2).join(' ') || not);
}

/* K3 · BIRINCIL KONAK TEK KAYNAK (4 Eyl 2026). Iki uretec var ve ikisi de
   adresi kendi kaynagindan okur: sayfa/sema/robots tarafi `src/icerik.ts`
   KOK'unu, canonical+sitemap tarafi Astro'nun `site`ini. Ayrisirlarsa
   cikti kendi icinde celisir (canonical www, JSON-LD apex gibi) ve
   hicbir sayfa kurali bunu tek basina goremez. Dosya basindaki KONAK
   turetimi de buraya dayanir: asagidaki butun konak kiyaslari bu tek
   degeri kullanir, apex/www artik denetleyicide SABIT YAZILI DEGIL. */
{
  const kusur = [];
  if (!KONAK) kusur.push('icerik.ts-KOK-okunamadi');
  if (!ASTRO_KONAK) kusur.push('astro.config-site-okunamadi');
  if (KONAK && ASTRO_KONAK && KONAK !== ASTRO_KONAK) kusur.push(KONAK + ' != ' + ASTRO_KONAK);
  ol('K3 · birincil konak TEK KAYNAK: icerik.ts KOK = astro.config site',
     kusur.length === 0, kusur.join(' ') || KONAK);
}

/* F1 · yazı tipi zinciri: üçüncü parti font sunucusu SIFIR; engelleyici
   stylesheet yalnız kendi alandan. Faz 2'de marka fontu gelince bu kural
   onu varlik/font/ + preload + swap yoluna zorlar. */
{
  const kirli = sayfalar.filter(p => /fonts\.(googleapis|gstatic)\.com/.test(oku(p)));
  const yabanciCss = sayfalar.filter(p =>
    [...oku(p).matchAll(/<link rel="stylesheet" href="([^"]+)"/g)]
      .some(m => /^https?:\/\//.test(m[1])));
  ol('F1 · üçüncü parti font/CSS sunucusu yok', kirli.length === 0 && yabanciCss.length === 0,
     [...kirli, ...yabanciCss].slice(0, 3).map(rel).join(' '));
}

/* G1 · görsel hattı: her <img> width+height (kayma yok); ilk ekran
   dışındakiler lazy — eager kalan fetchpriority=high taşımalı. */
{
  const kusur = [];
  let gorselSayisi = 0;
  for (const p of sayfalar) {
    for (const m of oku(p).matchAll(/<img[^>]*>/g)) {
      gorselSayisi++;
      const t = m[0];
      if (!/\bwidth=/.test(t) || !/\bheight=/.test(t)) kusur.push(rel(p) + ':olcusuz');
      else if (!/loading="lazy"/.test(t) && !/fetchpriority="high"/.test(t))
        kusur.push(rel(p) + ':eager-isaretsiz');
    }
  }
  ol('G1 · her <img> ölçülü + lazy/öncelik işaretli', kusur.length === 0,
     kusur.slice(0, 3).join(' ') || `${gorselSayisi} görsel tarandı`);
}

/* V1 · veri derlemede pişer: sayfa içi çalışan betiklerde fetch/XHR yok.
   İKİ istisna (talimatın kendi metni: "form gönderimi hariç; o kullanıcı
   eylemidir"): (1) Astro'nun gezinme prefetch betiği (_astro/page.*.js) —
   veri değil, sonraki sayfanın HTML'ini ısıtır; (2) fetch'i YALNIZ bir
   submit dinleyicisi içinde taşıyan betik (S7 teşhis aracı) — betikte
   addEventListener('submit') YOKSA fetch yine kırmızıdır. İkisi de J1
   tavanına dahildir. */
{
  const kusur = [];
  for (const p of sayfalar) {
    for (const m of oku(p).matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/application\/ld\+json/.test(m[1])) continue;
      if (!/\bfetch\s*\(|XMLHttpRequest/.test(m[2])) continue;
      if (/addEventListener\(["']submit["']/.test(m[2])) continue;   /* kullanıcı eylemi */
      kusur.push(rel(p));
    }
  }
  ol('V1 · istemci veri çekme sıfır (fetch yalnız submit eyleminde yaşar)',
     kusur.length === 0, kusur.slice(0, 3).join(' '));
}

/* J1 · sayfa başına JS tavanı. ÖLÇÜLDÜ (18 Ağu 2026): prefetch betiği
   2.253 B + Astro modül yükleyici satırı — sayfa toplamı ~2,7 KB.
   Tavan 10 KB (talimat: içerikte 0 hedef, kaçınılmazsa <10 KB; buradaki
   tek JS gezinme prefetch'i). Tavana yaklaşan her artış bilinçli olmalı. */
{
  /* ANA SAYFAYA AYRI TAVAN (22 Agu, prolog 1. durak; Anayasa madde 3'un
     "J1 bilincli guncellenir, sessizce gevsetilmez" sarti):
     ana sayfa 15 sahne + perde + prolog tasiyor, obur 60 sayfa en cok
     birkac ada; 10 KB tavani ikisini ayni kefeye koyuyordu.
     OLCULDU: ana sayfa prolog ONCESI 10.051 B · prolog adasi 326 B
     (minify edilmis) · toplam 10.377 B. Ana sayfa tavani 11 KB —
     kalan pay ~889 B, yani bir sonraki ada da bilincli karar olacak.
     OBUR 60 SAYFANIN TAVANI DEGISMEDI. Anayasanin istedigi "ana
     sayfada sahne bazli butce raporu" hala acik kalem.

     22 AGU · IKINCI GUNCELLEME, PROLOG A YAKLASIMI (11 -> 12 KB).
     BILINCLI, RAKAMLARIYLA:
       ada 326 B (satir ici)     -> 1.635 B (ayri parca)   +1.309 B
       `pr-gl` satir ici acilis  ->   234 B                  +234 B
       toplam ana sayfa 10.377 B -> 11.920 B
     Ada neden buyudu: 3B sahnesi `import()` ile cekiliyor ve Vite her
     dinamik import icin `__vitePreload` yardimcisini (~1,15 KB) parcaya
     yaziyor. Yardimcidan KURTULMA DENENDI ve BIRAKILDI: `build.
     modulePreload:false` yardimciyi kaldirmadi, 1.635 -> 1.779 B ile
     BUYUTTU (olculdu); ustelik butun ciktida modulepreload bagi sayisi
     zaten sifir. Karsiliginda alinan sey sayfada degil: 17 KB'lik 3B
     parcasi J1'in disinda, kendi tavani R14'te ve yalnizca WebGL2 olan
     + hareket azaltmasi kapali ziyaretcide iniyor.
     Yeni tavan 12 KB, kalan pay ~368 B.

   IKINCI BILINCLI DEGISIM - 12 KB -> 12,5 KB (23 Agu), RAKAMIYLA:
     ada 1.635 B -> 1.777 B   (+142 B: yedek yol dallarinin ADLARI +
                               `<html data-prolog>` izi + tek konsol
                               satiri; sadelestirilmis hali, tam modul
                               327 B tutuyordu)
     ana sayfa toplam 11.920 B -> 12.295 B  (tavan 12.288 idi: 7 B)
   Neden tavan buyudu, neden dal kesilmedi: bu 142 B bir OZELLIK degil,
   OLCUM ARACI. Sahne 22 Agu'da Chrome ve Safari'de sessizce yedek yola
   dusuyordu ve elde sebebi ayirt edecek tek bir olcum yoktu - "yalniz
   Brave'de calisiyor" gozlemi bir tur boyunca teshis edilemedi. 7 B
   ugruna bir teshis dalini kesmek, ayni korlugu geri getirirdi. Dal
   listesi R15'te kilitli.
     Yeni tavan 12,5 KB, kalan pay ~505 B.

   FILM SAYFASINA AYRI TAVAN — 10.240 -> 11.264 B (1-2 Eyl gece, giris
   sahnesi sokumu). BU BUYUME DEGIL, MUHASEBE KAYMASI, RAKAMLARIYLA:
     sokum oncesi film sayfasi 10.196 B = prefetch 2.253 + surucu 7.423
       + satir ici 520 (nvS 224 + PRDag acilisi 296)
     sokum sonrasi           10.691 B = prefetch 2.253 + surucu 8.214
       + satir ici 224
   Surucu neden buyudu: Vite ortak yardimciyi (__vitePreload zinciri,
   791 B) prolog-ada parcasina koymus, surucu onu ORADAN statik ithal
   ediyordu — o bayt sayfaya bagli olmadigi icin J1 disiydi. Ada gidince
   yardimci sayfaya bagli surucuye gomuldu: ayni bayt, sayilan tarafa
   gecti. Ziyaretcinin toplam yuku ise KUCULDU: prolog zincirinin alti
   parcasi (ada 1,8 + gl 17,2 + halka + isci + metal + paralaks,
   ~50 KB) artik hic uretilmiyor, PRDag acilisi (296 B) sayfadan gitti.
   Yeni tavan 11 KB; kalan pay 573 B = TUR 5 hikaye metinlerinin payi.
   2 EYL EKI (R23 kaynak sokumu): talimat "ada betigi cikinca J1
   dusmeli" bekliyordu; OLCULDU, dusmedi — film sayfasi sokum oncesi de
   sonrasi da 10.691 B. Sebep: ada sayfadan zaten 1-2 Eyl gece cikmisti,
   kaynak silmek sayfaya bagli bayti degistirmez; __vitePreload kaymasi
   da o gece olmustu (ustteki rakamlar). Tavan 11.264 B KALIYOR,
   pay 573 B hala TUR 5'in. Tampon motora eklendi ve motor sayfaya
   bagli degil (dinamik ithal) — J1 disi, kendi tavani FM1'de. */
  const TAVAN = 10 * 1024;
  const TAVAN_ANA = 12.5 * 1024;
  const TAVAN_FILM = 11 * 1024;
  const kusur = [];
  let enBuyuk = 0, anaToplam = 0, leadSon = 0;
  for (const p of sayfalar) {
    let toplam = 0;
    const h = oku(p);
    for (const m of h.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/g)) {
      const dosya = path.join(KOK, m[1].replace(/^\/(?:yeni\/)?/, ''));
      if (fs.existsSync(dosya)) toplam += fs.statSync(dosya).size;
      else kusur.push(rel(p) + ':kayıp-js:' + m[1]);
    }
    /* LEAD FORMU HER SAYFADA (3 Eyl 2026, ANAYASA 'kabuk katmanlari'; kaynak 11742
       'form her rotada en sonda'): gonderim betigi (LeadKutu.astro, satir ici) kabuk
       kalemi — sayfa tavanindan DUSULUR, ayrica raporlanir. Kaynakta da her rotada
       ayni betik kosuyordu; form JS'siz de calisir (native POST). Olculen ~1,1 KB. */
    let leadJs = 0;
    for (const m of h.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g))
      if (!/application\/ld\+json/.test(m[1])) { const b = Buffer.byteLength(m[2]); if (/getElementById\('silForm'\)/.test(m[2])) leadJs += b; else toplam += b; }
    const anaMi = /^(index|en[\\/]index)[.]html$/.test(rel(p));
    const filmMi = /^(film|en[\\/]film)[\\/]index[.]html$/.test(rel(p));
    /* PROLOG ANA SAYFADA (3 Eyl 2026, ANAYASA istisna 4): ana sayfa film
       bolumunu (`<section class="fl"`) tasiyorsa tavan ana + film (film
       betigi 8,3 KB, motor dinamik ithal — J1 disi, FM1). ENES ONAYI BEKLIYOR:
       sayi ana 12,5 + film 11 = 23,5 KB; olculen 21.033 B. */
    const prologlu = anaMi && /<section class="fl"/.test(h);
    if (anaMi) anaToplam = toplam;
    if (leadJs) leadSon = leadJs;
    if (toplam > (anaMi ? TAVAN_ANA + (prologlu ? TAVAN_FILM : 0) : filmMi ? TAVAN_FILM : TAVAN)) kusur.push(rel(p) + ':' + toplam + 'B');
    if (!anaMi) enBuyuk = Math.max(enBuyuk, toplam);
  }
  ol(`J1 · JS: ana sayfa ≤ ${TAVAN_ANA} B (+film ${TAVAN_FILM} B prologluysa) · film ≤ ${TAVAN_FILM} B · öbür sayfalar ≤ ${TAVAN} B`,
     kusur.length === 0,
     kusur.slice(0, 3).join(' ') || `ana ${anaToplam} B · öbürlerinin en büyüğü ${enBuyuk} B · lead betiği ${leadSon} B (kabuk, tavan dışı)`);
}

/* F1c · font kapsamı: sayfalarda GEÇEN her kod noktasının bir
   @font-face'in unicode-range'inde karşılığı olmalı. Alt küme daraltmak
   (Anayasa madde 4 "TR+Latin") baytı yarıya indirdi ama sessiz bir risk
   doğurdu: panelden yeni bir karakter gelirse (ör. "č", "≥") o glif
   sistem fontuna düşer ve satır iki yazı tipiyle karışık dizilir.
   Bu kural o riski kırmızıya çevirir — kapsam listesi font-uret.py'de,
   düzeltme oraya karakter eklemek. */
{
  const ana = path.join(KOK, 'index.html');
  let menziller = [];
  if (fs.existsSync(ana)) {
    let css = [...oku(ana).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
    for (const m of oku(ana).matchAll(/<link rel="stylesheet" href="([^"]+)"/g)) {
      const d = path.join(KOK, m[1].replace(/^\/(?:yeni\/)?/, ''));
      if (fs.existsSync(d)) css += '\n' + fs.readFileSync(d, 'utf8');
    }
    for (const m of css.matchAll(/unicode-range:([^;}]+)/g))
      for (const p of m[1].split(','))
        if (/U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?/.test(p.trim())) {
          const [, a, b] = p.trim().match(/U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?/);
          menziller.push([parseInt(a, 16), parseInt(b || a, 16)]);
        }
  }
  const kapsar = c => menziller.some(([a, b]) => c >= a && c <= b);
  const eksik = new Map();
  for (const p of sayfalar) {
    const metin = oku(p)
      .replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<[^>]+>/g, ' ');
    for (const ch of metin) {
      const c = ch.codePointAt(0);
      if (c < 0x20 || kapsar(c)) continue;
      if (!eksik.has(ch)) eksik.set(ch, rel(p));
    }
  }
  ol('F1c · sayfadaki her karakterin alt kümede karşılığı var',
     menziller.length > 0 && eksik.size === 0,
     eksik.size ? [...eksik].slice(0, 4).map(([c, s]) => `U+${c.codePointAt(0).toString(16).toUpperCase()}(${s})`).join(' ')
                : `${menziller.length} menzil`);
}

/* ---- F1d · GOVDE FONTU HER SAYFADA ON YUKLENIR + OLCU ESLENMIS YEDEK
   (TUR 3, 4 Eyl 2026) ----
   OLCULMUS KUSUR: on yukleme YALNIZ ana sayfadaydi; obur 58 sayfada
   `font-display:swap` ile gelen Uncut ilk boyamadan SONRA geliyor,
   satirlar yeniden sariliyor. /yeni/bulten/yapay-zeka-trafigi-tiklama-degil/
   SOGUK ONBELLEKTE uc kez arka arkaya CLS 0,1588 verdi (sicak onbellekte 0,
   woff2 reddedilince 0). 3/4 Eyl'de "bir bulten yazisinda 0,1622, sonra
   0/0/0,0013" diye yazilan aykiri deger BUYDU — tekrar etmemesinin sebebi
   sonraki kosumlarin sicak onbellekle donmesiydi.
   KURAL UC AYAK TUTAR:
     1. her kabuk sayfasi govde fontunu on yukler (ana sayfa istisna degil),
     2. yigin olcu eslenmis yedekle baslar (yazi tipi gec gelirse yerini
        ayni genislikte tutar),
     3. o yedek yuzler font.css'te TANIMLI ve size-adjust tasiyor.
   Olcen arac: yeni/film/olc-cls-kosul.cjs (kollar: sicak/soguk/font-gec/
   font-yok/yavas/supur). Kalibrasyon: yeni/film/font-yedek-olc.cjs. */
{
  const kusur = [];
  const YEDEK = ['Uncut Yedek Segoe', 'Uncut Yedek Arial', 'Uncut Yedek Roboto'];
  /* 1 + 2: her kabuk sayfasinda on yukleme */
  let bakilan = 0;
  for (const y of tumSayfalar) {
    const h = oku(y);
    if (!/id="icerik"/.test(h)) continue;          /* kabuksuz sayfa (film) atlanir */
    bakilan++;
    if (!/rel="preload"[^>]*uncut-sans-latin\.woff2/.test(h)
      && !/uncut-sans-latin\.woff2[^>]*rel="preload"/.test(h)) {
      kusur.push('on-yukleme-yok:' + path.relative(KOK, y).replace(/\\/g, '/'));
      if (kusur.length > 3) break;
    }
  }
  if (!bakilan) kusur.push('kabuk-sayfasi-bulunamadi');
  /* 3: yedek yuzler tanimli mi ve olcu bindirmesi tasiyor mu */
  const cssler = [];
  for (const d of ['_astro']) {
    const kd = path.join(KOK, d);
    if (!fs.existsSync(kd)) continue;
    for (const f of fs.readdirSync(kd)) if (f.endsWith('.css')) cssler.push(oku(path.join(kd, f)));
  }
  /* satir ici stiller de sayilir (inlineStylesheets: auto) */
  const anaH = path.join(KOK, 'index.html');
  if (fs.existsSync(anaH)) cssler.push(...[...oku(anaH).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]));
  const css = cssler.join('\n');
  for (const y of YEDEK) {
    const re = new RegExp('@font-face\\{[^}]*' + y + '[^}]*\\}');
    const blok = (css.match(re) || [''])[0];
    if (!blok) { kusur.push('yedek-yuz-yok:' + y); continue; }
    if (!/size-adjust\s*:/.test(blok)) kusur.push('size-adjust-yok:' + y);
    if (!/ascent-override\s*:/.test(blok)) kusur.push('ascent-yok:' + y);
  }
  /* yigin: govde ailesi web fonttan HEMEN SONRA yedegi tasimali */
  const aile = (css.match(/--f-govde:([^;}]+)/) || [])[1] || '';
  if (!aile) kusur.push('f-govde-okunamadi');
  else if (!/['"]Uncut Sans['"]\s*,\s*['"]Uncut Yedek/.test(aile)) kusur.push('yigin-yedeksiz:' + aile.slice(0, 60));
  ol('F1d · gövde fontu her kabuk sayfasında ön yüklenir + ölçü eşlenmiş yedek yığında',
     kusur.length === 0, kusur.slice(0, 4).join(' ') + (kusur.length ? '' : `  ${bakilan} kabuk sayfası · 3 yedek yüz`));
}

/* S1 · baş sözleşmesi: title/description menzilde, canonical var,
   hizmet+bülten sayfalarında hreflang çifti + geçerli şema. */
{
  const kusur = [];
  for (const p of sayfalar) {
    const h = oku(p), r = rel(p);
    const t = (h.match(/<title>([^<]*)<\/title>/) || [, ''])[1];
    const d = (h.match(/name="description" content="([^"]*)"/) || [, ''])[1];
    if (t.length < 10 || t.length > 75) kusur.push(r + ':title(' + t.length + ')');
    if (d.length < 50 || d.length > 165) kusur.push(r + ':desc(' + d.length + ')');
    if (!/<link rel="canonical" href="https:\/\//.test(h)) kusur.push(r + ':canonical');
    if (/^(en\/)?(hizmet|hizmetler|bulten|projeler|sss|surec|otomasyon)\//.test(r)) {
      if (!/hreflang="tr"/.test(h) || !/hreflang="en"/.test(h) || !/hreflang="x-default"/.test(h))
        kusur.push(r + ':hreflang');
      const ld = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      let sema = null;
      try { sema = ld && JSON.parse(ld[1]); } catch (e) {}
      /* iki geçerli biçim var: tekil düğüm (@type — hizmet/bülten) ve
         @graph (dizin sayfaları, ana sayfayla aynı üçlü + liste) */
      if (!sema || !(sema['@type'] || Array.isArray(sema['@graph']))) kusur.push(r + ':şema');
    }
  }
  ol('S1 · title/desc menzilde + canonical + hreflang çifti + şema',
     kusur.length === 0, kusur.slice(0, 4).join(' '));
}

/* G3 · PAYLASIM KARTI (4 Eyl 2026, kesme oncesi son is — Enes: "bu push'tan
   ONCE girecek"). G-ailesinin (gorsel hatti) uyesi, ama S1'in yaninda
   duruyor cunku okudugu sey BAS ETIKETLERI.

   NEYI TUTAR — dordu de sessizce bozulabilir:
     (a) VARLIK: her sayfada og:image VAR. Yoksa paylasimda kart cikmaz,
         hicbir yerde hata gorunmez; kimse fark etmez.
     (b) TAM ADRES: goreli yol KIRMIZI. og:image'i sayfa baglaminda
         cozmek kazicilarin garantisi degil, davranisi — Facebook coger,
         baskasi cozmez. Ayrica konak BIZIM konagimiz olmali (K3'un tek
         kaynagi): apex/www ayrismasi tam buradan sizardi.
     (c) DIL: panel bosken TR sayfa og-tr, EN sayfa og-en gostermeli.
         Kartlarin uzerinde METIN var; yanlis dil sessiz bir hatadir —
         sayfa dogru, onizleme yanlis dilde.
     (d) ETIKET YALAN SOYLEMESIN: og:image:type UZANTIYLA uyusmali ve
         olcu etiketi basiliyorsa dosyanin GERCEK olcusu olmali. Bu yuzden
         kart dosyalari ciktida ACILIP olculur — "1200x630 yaziyor" ile
         "1200x630" ayri iki sey.

   PANEL USTUNLUGU BILINCLI: `settings.og` doluysa dil dali DUSER (tek
   alan, dil basina alan yok) ve olcu etiketleri hic basilmaz — bilmedigimiz
   bir gorselin olcusunu iddia etmeyiz. Bos alan sayfayi BOZMAZ; bu davranis
   kuralin kendisi tarafindan da korunuyor (asagidaki `panelli` dali).

   KAPSAM `sayfalar`: prototipler P1 muafiyetinde (S1 ile ayni sinir).

   KART ADLARI BURADA BILEREK ELLE YAZILI. `icerik.ts`'teki `OG_KART` tek
   kaynak URETIM icin — Temel.astro ile sema.mjs oradan okur ki ayrismasinlar.
   Denetim onu ITHAL ETMEZ: ayni sabiti okuyan bir kural, sabitin kendisi
   yanlis degistiginde sessizce onaylar (kural ile uretec ayni yanilgiyi
   paylasir). Buradaki liste BAGIMSIZ BEYANDIR — sozlesme "og-tr.jpg /
   og-en.jpg, 1200x630". Uretimde ad degisirse bu kural KIRMIZI yanar ve
   yanmasi DOGRUDUR: sozlesme degisiyorsa iki tarafta da bilerek degisir.

   KIRMIZI-ONCE: yedi kol dist'e enjeksiyonla yakildi (etiketi sil · tam
   adresi goreliye cevir · TR sayfaya EN kartini yaz · olcuyu yalanla ·
   twitter:image'i sil · tipi celistir · olu og.png'yi geri getir), her
   biri sonrasi dosya bayt-birebir geri yazildi. Sema kolu ENJEKSIYONSUZ
   kanitlandi: kural yazildiginda uretimde DURAN kusuru (12 bulten sayfasi)
   gercekten yakti. */
{
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
  const panelOg = String(((c.settings || {}).og) || '').trim();
  const panelli = panelOg !== '';
  const KART = { tr: '/og-tr.jpg', en: '/og-en.jpg' };
  const kusur = [];
  const bilgi = new Set();

  /* --- kart dosyalari ciktida ve GERCEKTEN 1200x630 mi --- */
  const jpegOlc = (dosya) => {
    const b = fs.readFileSync(dosya);
    if (b.readUInt16BE(0) !== 0xffd8) return null;
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const im = b[i + 1];
      /* SOF0..SOF15; DHT(C4)/JPG(C8)/DAC(CC) olcu tasimaz */
      if (im >= 0xc0 && im <= 0xcf && im !== 0xc4 && im !== 0xc8 && im !== 0xcc)
        return { y: b.readUInt16BE(i + 5), g: b.readUInt16BE(i + 7) };
      if (im === 0xd8 || (im >= 0xd0 && im <= 0xd9)) { i += 2; continue; }
      i += 2 + b.readUInt16BE(i + 2);
    }
    return null;
  };
  for (const yol of Object.values(KART)) {
    const d = path.join(KOK, yol.replace(/^\//, ''));
    if (!fs.existsSync(d)) { kusur.push('kart-ciktida-yok:' + yol); continue; }
    const o = jpegOlc(d);
    if (!o) kusur.push('kart-jpeg-degil:' + yol);
    else if (o.g !== 1200 || o.y !== 630) kusur.push('kart-olcu:' + yol + '=' + o.g + 'x' + o.y);
  }

  for (const p of sayfalar) {
    const h = oku(p), r = rel(p);
    const en2 = /^en\//.test(r);
    const og = (h.match(/<meta property="og:image" content="([^"]*)"/) || [, ''])[1];
    if (!og) { kusur.push(r + ':og-yok'); continue; }
    if (!/^https?:\/\//i.test(og)) { kusur.push(r + ':og-goreli:' + og); continue; }
    /* KONAK VE DIL SARTI YALNIZ GERI DUSUSTE (4 Eyl 2026 · panel dali
       OLCULDU, kural burada DUZELDI). Ilk yazimda konak sarti panelli
       hale de uygulaniyordu ve olcum bunu yakaladi: panele mesru bir CDN
       adresi (`https://cdn.../kart.png`) konunca G3 65 sayfada birden
       kirmizi yanip DEPLOY'U DUSURUYORDU. Bu, bu depoda bir kez bedeli
       odenmis hata: "panelden yayinlamak deploy dusuruyordu" — panel
       eylemi iceriktir, yayin hattini kilitlemez. Panelli halde kural
       yalnizca BICIME bakar (tam adres · tip durustlugu · olcu iddiasi
       yok); konak ve dil kendi kartlarimizin sarti. */
    if (!panelli) {
      if (KONAK && og.indexOf(KONAK + '/') !== 0) kusur.push(r + ':og-yabanci-konak:' + og);
      if (og !== KONAK + KART[en2 ? 'en' : 'tr']) kusur.push(r + ':og-yanlis-dil:' + og.replace(KONAK, ''));
    } else if (KONAK && og.indexOf(KONAK + '/') === 0) {
      /* Panel KENDI konagimizi gosteriyorsa dosyanin ciktida olup
         olmadigini KANITLAYABILIRIZ — ama yine kirmizi yakmiyoruz
         (yukaridaki gerekce). BILGI olarak basilir: CI kutugunde
         gorunur, operator sessiz kalmaz, yayin durmaz. */
      if (!fs.existsSync(path.join(KOK, og.slice(KONAK.length).replace(/^\//, '').split(/[?#]/)[0])))
        bilgi.add('panel-og-ciktida-yok:' + og.slice(KONAK.length));
    }

    const tw = (h.match(/<meta name="twitter:image" content="([^"]*)"/) || [, ''])[1];
    if (!tw) kusur.push(r + ':twitter-image-yok');
    else if (tw !== og) kusur.push(r + ':twitter-og-ayrismis');

    /* tip etiketi uzantiyla uyusuyor mu (panel PNG koyarsa da) */
    const uz = (og.match(/\.(jpe?g|png|webp|gif)(?:[?#]|$)/i) || [])[1];
    const tip = (h.match(/<meta property="og:image:type" content="([^"]*)"/) || [, ''])[1];
    if (uz) {
      const bek = 'image/' + uz.toLowerCase().replace('jpg', 'jpeg');
      if (tip !== bek) kusur.push(r + ':og-tip:' + (tip || 'yok') + '!=' + bek);
    } else if (tip) kusur.push(r + ':og-tip-uydurulmus:' + tip);

    /* olcu etiketi: panel bosken ZORUNLU ve 1200x630; panelliyken YASAK */
    const gen = (h.match(/<meta property="og:image:width" content="([^"]*)"/) || [, ''])[1];
    const yuk = (h.match(/<meta property="og:image:height" content="([^"]*)"/) || [, ''])[1];
    if (panelli) {
      if (gen || yuk) kusur.push(r + ':panelde-olcu-iddiasi');
    } else if (gen !== '1200' || yuk !== '630') kusur.push(r + ':og-olcu:' + (gen || 'yok') + 'x' + (yuk || 'yok'));

    /* SEMA GORSELLERI DE SAYILIR (4 Eyl 2026 — kural BU TURDA genisledi).
       Meta etiketleri duzeltilirken `sema.mjs`'teki IKINCI geri dusus
       gozden kacmisti: yazi semasi `yazi.image` boskan `/og.png`e
       dusuyordu ve alti bulten yazisi (x2 dil) JSON-LD'de 404 veren bir
       adresi ILAN EDIYORDU. G3'un ilk hali bunu goremezdi cunku yalniz
       <meta>'ya bakiyordu — yani kural dogru seyi olcuyor gorunup
       yarim kapsam tutuyordu.
       Simdi JSON-LD bloklarindaki KENDI KONAGIMIZA ait her gorsel
       adresi (image · logo · ImageObject.url — hepsi ayni desene duser)
       ciktida ARANIR. Yabanci konak dogrulanamaz, dokunulmaz. */
    const ldHam = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => x[1]).join('\n');
    for (const mi of ldHam.matchAll(/"(https?:\/\/[^"]+\.(?:jpe?g|png|webp|gif|svg|avif))"/gi)) {
      const u = mi[1];
      if (!KONAK || u.indexOf(KONAK + '/') !== 0) continue;
      if (!fs.existsSync(path.join(KOK, u.slice(KONAK.length).replace(/^\//, '').split(/[?#]/)[0])))
        kusur.push(r + ':sema-gorseli-ciktida-yok:' + u.slice(KONAK.length));
    }

    /* OLU BAGLANTI BEKCISI: `/og.png` eski KOK SITENIN dosyasiydi ve
       build.js zincirden cikinca ciktida kalmadi. Geri gelirse 404
       basar; ad ile yasaklaniyor ki bir daha sessizce donmesin. */
    if (/\/og\.png/.test(og)) kusur.push(r + ':olu-og-png');
  }
  ol('G3 · paylaşım kartı: og:image tam adres + dile göre doğru + tip/ölçü dürüst + twitter:image',
     kusur.length === 0,
     [kusur.slice(0, 4).join(' ') || (panelli ? 'panel kartı (dil dalı düşük)' : sayfalar.length + ' sayfa · 1200×630 doğrulandı'),
      bilgi.size ? '(bilgi: ' + [...bilgi].slice(0, 2).join(' ') + ')' : ''].filter(Boolean).join(' '));
}

/* N1 · göç bekçisi: kesmeye (Faz 4) kadar her sayfa noindex — canlı kök
   siteyle kopya içerik doğmaz. Faz 4'te bu kural TERSİNE çevrilir. */
{
  /* KAPSAM: prototipler DAHIL — noindex her uretilen sayfa icin gecerli.
     BICIM: content="noindex,nofollow" de gecerli bir noindex'tir. Eski
     kural content="noindex" diye TAM eslesme ariyordu ve prototipe
     YANLIS KIRMIZI yakiyordu: sayfa zaten noindex'ti, kural bicimi
     okuyordu. Artik robots listesinde noindex var mi diye bakilir. */
  /* KESMEDE TERSINE DONDU (6 Eyl 2026, Faz 4). Eski hali "her sayfa
     noindex"di — canli kok siteyle kopya icerik dogmasin diye. Kok site
     ARTIK YOK, gerekce de yok; kural ters yone dondu ve IKI YONLU:
       · indekslenmesi gereken sayfada noindex kalirsa -> KIRMIZI
         (kesmenin en pahali sessiz hatasi: site yayinda ama gorunmez)
       · bilerek disarida tutulan sayfada noindex DUSERSE -> KIRMIZI
     Istisnalar ADIYLA ve GEREKCESIYLE; sessiz muafiyet yok.
     Kaynak karsiligi: Temel.astro `indeks={false}` + `kesmeOncesi`. */
  const NOINDEX_KALICI = {
    '404.html': 'hata sayfasi — arama sonucunda gorunmesi anlamsiz',
    'tesekkur/index.html': 'donusum ucu — dogrudan girilirse ziyaretciyi yaniltir',
    'en/tesekkur/index.html': 'donusum ucu (EN)',
    'film/index.html': 'olcum zemini — urun sayfasi degil',
    'en/film/index.html': 'olcum zemini (EN)',
    'deneme-react/index.html': 'olcum zemini — React adasi denemesi',
  };
  const kusur = [];
  let indeksli = 0, kapali = 0;
  for (const p2 of tumSayfalar) {
    const r = rel(p2);
    const noindex = /name="robots"[^>]*content="[^"]*noindex/.test(oku(p2));
    /* prototip ayrimi TEK KAYNAK: satir 91 PROTOTIP. Kendi desenimi yazsaydim
       prototip taniminin iki kopyasi olurdu ve sessizce ayrisirlardi. */
    const kaliciMi = NOINDEX_KALICI[r] !== undefined || PROTOTIP.test(r);
    if (kaliciMi) { if (!noindex) kusur.push(r + ':noindex-DUSMUS'); else kapali++; }
    else if (noindex) kusur.push(r + ':HALA-noindex');
    else indeksli++;
  }
  ol('N1 · kesme sonrası: her sayfa indekslenebilir; bilerek kapalı olanlar listede',
     kusur.length === 0, kusur.slice(0, 3).join(' ') || indeksli + ' indekslenebilir · ' + kapali + ' bilerek kapalı');
}

/* P1 · PROTOTIP MUAFIYETININ BEDELI (31 Agu 2026, PROLOG-ISKELET 6. adim)
   `prototip/**` uretim sayfasi kurallarindan muaf tutuldu (dosya basindaki
   gerekce). Muafiyet BOS CEK OLMASIN diye bedeli burada:
     1. Prototip URETILEN HICBIR SAYFADAN baglanmaz. Baglanirsa artik
        "olcum duzenegi" degil sitenin bir parcasidir ve muafiyet duser.
     2. Prototip sitemap'e girmez.
   (noindex sarti ayri tutulmuyor: N1 prototipler DAHIL tum sayfalarda
   kosuyor.) */
{
  const kusur = [];
  for (const s of sayfalar) {
    const h = oku(s);
    for (const m of h.matchAll(/(?:href|src)="([^"]*prototip\/[^"]*)"/g)) {
      kusur.push(`${rel(s)} -> ${m[1]}`);
    }
  }
  const smY = path.join(KOK, 'sitemap.xml');
  if (fs.existsSync(smY) && /prototip\//.test(oku(smY))) kusur.push('sitemap.xml:prototip-var');
  ol('P1 · prototip muafiyetinin bedeli: üretilen sayfalardan bağlanmıyor + sitemap dışında',
     kusur.length === 0,
     kusur.slice(0, 3).join(' ') + (prototipler.length ? `  [${prototipler.length} prototip muaf]` : '  [prototip yok]'));
}

/* ---- ROTA TURU · R ailesi ------------------------------------------

   R1 · HIZMETLER DIZINI BUTUNLUGU: dizin sayfasi (TR ve EN) content.json'daki
   HER hizmetin basligini, tanitim metnini ve detay sayfasina baglantiyi
   ham HTML'de tasimali. Panel hizmet ekleyince dizin kendiliginden
   buyumeli; bir alan bos kalir ya da bilesen basmayi unutursa bot eksik
   dizin gorur ve bu SESSIZ bir kayiptir (madde 1 + madde 5).
   Karsilastirma cozulmus metinle yapilir — bot da boyle gorur. */
{
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
  const coz = (t) => String(t).replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const D = (v, dil) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  const kusur = [];
  for (const dil of ['tr', 'en']) {
    const p = path.join(KOK, dil === 'en' ? 'en/hizmetler' : 'hizmetler', 'index.html');
    if (!fs.existsSync(p)) { kusur.push(dil + ':sayfa yok'); continue; }
    const ham = oku(p), duz = coz(ham);
    for (const s of c.services) {
      if (!duz.includes(coz(D(s.title, dil)))) kusur.push(`${dil}:${s.slug}:ad`);
      if (!duz.includes(coz(D(s.text, dil)))) kusur.push(`${dil}:${s.slug}:metin`);
      if (!ham.includes(`${dil === 'en' ? '/en' : ''}/hizmetler/${s.slug}`))
        kusur.push(`${dil}:${s.slug}:bağlantı`);
    }
  }
  ol('R1 · hizmetler dizini: her hizmet ad+metin+bağlantı ile ham HTML\'de',
     kusur.length === 0, kusur.slice(0, 4).join(' '));
}

/* R2 · PROJELER DIZINI BUTUNLUGU: R1'in projeler esi — 7 isin adi,
   anlatimi, rakamlari (res) ve detay baglantisi dizinde (TR ve EN). */
{
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
  const coz = (t) => String(t).replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const D = (v, dil) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  const kusur = [];
  for (const dil of ['tr', 'en']) {
    const p = path.join(KOK, dil === 'en' ? 'en/projeler' : 'projeler', 'index.html');
    if (!fs.existsSync(p)) { kusur.push(dil + ':sayfa yok'); continue; }
    const ham = oku(p), duz = coz(ham);
    for (const pr of c.projects) {
      if (!duz.includes(coz(pr.name))) kusur.push(`${dil}:${pr.slug}:ad`);
      if (!duz.includes(coz(D(pr.text, dil)))) kusur.push(`${dil}:${pr.slug}:metin`);
      for (const r of pr.res || [])
        /* `r.v` de yerellestirilmis olabilir ({tr,en}) — ham haliyle olcmek
           YANLIS YESIL uretiyordu: sayfa `[object Object]` basiyordu, kural
           da ayni dizeyi ariyor ve GECIYORDU (22 Agu, sadakat turunda
           yakalandi). Olcum artik dil cozumunden sonra. */
        if (!duz.includes(coz(D(r.v, dil))))
          kusur.push(`${dil}:${pr.slug}:rakam(${D(r.v, dil)})`);
      if (!ham.includes(`${dil === 'en' ? '/en' : ''}/projeler/${pr.slug}`))
        kusur.push(`${dil}:${pr.slug}:bağlantı`);
    }
  }
  ol('R2 · projeler dizini: her iş ad+metin+rakam+bağlantı ile ham HTML\'de',
     kusur.length === 0, kusur.slice(0, 4).join(' '));
}

/* R3 · PROJE DETAYI BUTUNLUGU: her detay sayfasi kendi blocks basliklarini
   ve govdelerini, res degerlerini ve kunye alanlarini (yil/rol/sure/kanal)
   ham HTML'de tasimali. Eski tarafta bunlar JS'le doguyordu ve bot HIC
   gormuyordu; yenide derlemede basiliyor — bir alan sessizce dusmesin. */
{
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
  const coz = (t) => String(t).replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const D = (v, dil) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  const kusur = [];
  for (const dil of ['tr', 'en']) {
    for (const pr of c.projects) {
      const p = path.join(KOK, dil === 'en' ? 'en' : '', 'projeler', pr.slug, 'index.html');
      if (!fs.existsSync(p)) { kusur.push(`${dil}:${pr.slug}:sayfa yok`); continue; }
      const duz = coz(oku(p));
      for (const [bas, gov] of (pr.blocks && (pr.blocks[dil] || pr.blocks.tr)) || []) {
        if (!duz.includes(coz(bas))) kusur.push(`${dil}:${pr.slug}:blok(${bas})`);
        if (!duz.includes(coz(gov))) kusur.push(`${dil}:${pr.slug}:blok-gövde(${bas})`);
      }
      for (const r of pr.res || [])
        /* `r.v` de yerellestirilmis olabilir ({tr,en}) — ham haliyle olcmek
           YANLIS YESIL uretiyordu: sayfa `[object Object]` basiyordu, kural
           da ayni dizeyi ariyor ve GECIYORDU (22 Agu, sadakat turunda
           yakalandi). Olcum artik dil cozumunden sonra. */
        if (!duz.includes(coz(D(r.v, dil))))
          kusur.push(`${dil}:${pr.slug}:rakam(${D(r.v, dil)})`);
      for (const alan of ['role', 'dur', 'ch'])
        if (pr.meta && pr.meta[alan] && !duz.includes(coz(D(pr.meta[alan], dil))))
          kusur.push(`${dil}:${pr.slug}:künye(${alan})`);
      if (!duz.includes(String(pr.year))) kusur.push(`${dil}:${pr.slug}:yıl`);
    }
  }
  ol('R3 · proje detayları: blok+rakam+künye alanları ham HTML\'de (7×2 sayfa)',
     kusur.length === 0, kusur.slice(0, 4).join(' '));
}

/* R4 · BULTEN DIZINI BUTUNLUGU: dizin (TR ve EN) HER yazinin basligini,
   girisini (lede), tarihini (time[datetime] ham degeriyle) ve detay
   baglantisini ham HTML'de tasimali; abone formu ("bulletin", honeypot
   website dahil) STATIK HTML'de dogmali — Netlify Forms formu derleme
   anindaki HTML'den tanir (S-IL dersi), JS'le eklenen form kayda girmez. */
{
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
  const coz = (t) => String(t).replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const D = (v, dil) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  const kusur = [];
  for (const dil of ['tr', 'en']) {
    const p = path.join(KOK, dil === 'en' ? 'en/bulten' : 'bulten', 'index.html');
    if (!fs.existsSync(p)) { kusur.push(dil + ':sayfa yok'); continue; }
    const ham = oku(p), duz = coz(ham);
    for (const y of c.posts) {
      if (!duz.includes(coz(D(y.title, dil)))) kusur.push(`${dil}:${y.slug}:ad`);
      if (!duz.includes(coz(D(y.lede, dil)))) kusur.push(`${dil}:${y.slug}:lede`);
      if (!ham.includes(`datetime="${y.date}"`)) kusur.push(`${dil}:${y.slug}:tarih`);
      if (!ham.includes(`${dil === 'en' ? '/en' : ''}/bulten/${y.slug}`))
        kusur.push(`${dil}:${y.slug}:bağlantı`);
    }
    if (!/<form[^>]*name="bulletin"[^>]*method="POST"/i.test(ham) ||
        !ham.includes('name="form-name" value="bulletin"') ||
        !ham.includes('name="website"'))
      kusur.push(dil + ':abone formu statik değil');
  }
  ol('R4 · bülten dizini: her yazı ad+lede+tarih+bağlantı ham HTML\'de + statik abone formu',
     kusur.length === 0, kusur.slice(0, 4).join(' '));
}

/* R5 · SSS BUTUNLUGU: sayfa (TR ve EN) HER sorunun metnini ve cevabini
   ham HTML'de tasimali (eski tarafta faq JS'le doguyordu, bot gormuyordu)
   VE FAQPage semasi tam olmali: mainEntity sayisi content.json faq
   sayisina esit, kimlik sayfanin KENDI adresindeki #faq (TR/EN kimlik
   cakismasi duzeltmesi geri gelmesin). */
{
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
  const coz = (t) => String(t).replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const D = (v, dil) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  const kusur = [];
  for (const dil of ['tr', 'en']) {
    const p = path.join(KOK, dil === 'en' ? 'en/sss' : 'sss', 'index.html');
    if (!fs.existsSync(p)) { kusur.push(dil + ':sayfa yok'); continue; }
    const ham = oku(p), duz = coz(ham);
    for (const f of c.faq) {
      if (!duz.includes(coz(D(f.q, dil)))) kusur.push(`${dil}:soru(${coz(D(f.q, dil)).slice(0, 20)}…)`);
      if (!duz.includes(coz(D(f.a, dil)))) kusur.push(`${dil}:cevap(${coz(D(f.q, dil)).slice(0, 20)}…)`);
    }
    const ld = ham.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    let sema = null;
    try { sema = ld && JSON.parse(ld[1]); } catch (e) {}
    const faqDugum = sema && Array.isArray(sema['@graph'])
      && sema['@graph'].find((d) => d['@type'] === 'FAQPage');
    if (!faqDugum) kusur.push(dil + ':FAQPage yok');
    else {
      if ((faqDugum.mainEntity || []).length !== c.faq.length)
        kusur.push(`${dil}:mainEntity ${(faqDugum.mainEntity || []).length}/${c.faq.length}`);
      const beklenenKimlik = `${KONAK}${dil === 'en' ? '/en' : ''}/sss#faq`;
      if (faqDugum['@id'] !== beklenenKimlik) kusur.push(dil + ':kimlik(' + faqDugum['@id'] + ')');
    }
  }
  ol('R5 · sss: her soru+cevap ham HTML\'de + FAQPage şeması tam ve kimliği kendi adresinde',
     kusur.length === 0, kusur.slice(0, 4).join(' '));
}

/* R6 · SUREC BUTUNLUGU: sayfa (TR ve EN) HER adimin numarasini, adini,
   anlatimini ve olcum kalemlerini (m — duz metin + dilli karisik) ham
   HTML'de tasimali; musteri yolu cizgisinin BES etiketi de artik statik
   dogmali (eski tarafta cizgi+etiket JS'le kuruluyordu, bot gormuyordu). */
{
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
  const coz = (t) => String(t).replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const D = (v, dil) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  const YOL = { tr: ['Fark ediliyor', 'Arıyor', 'Soruyor', 'Karşılaştırıyor', 'Satın alıyor'],
                en: ['Notices', 'Searches', 'Asks', 'Compares', 'Buys'] };
  const kusur = [];
  for (const dil of ['tr', 'en']) {
    const p = path.join(KOK, dil === 'en' ? 'en/surec' : 'surec', 'index.html');
    if (!fs.existsSync(p)) { kusur.push(dil + ':sayfa yok'); continue; }
    const duz = coz(oku(p));
    for (const a of c.steps) {
      if (!duz.includes(a.n)) kusur.push(`${dil}:${a.n}:numara`);
      if (!duz.includes(coz(D(a.t, dil)))) kusur.push(`${dil}:${a.n}:ad`);
      if (!duz.includes(coz(D(a.p, dil)))) kusur.push(`${dil}:${a.n}:anlatım`);
      for (const x of a.m || [])
        if (!duz.includes(coz(D(x, dil)))) kusur.push(`${dil}:${a.n}:ölçüm(${coz(D(x, dil))})`);
    }
    for (const e of YOL[dil])
      if (!duz.includes(e)) kusur.push(`${dil}:yol(${e})`);
  }
  ol('R6 · süreç: her adım n+ad+anlatım+ölçüm kalemleri + 5 yolculuk etiketi ham HTML\'de',
     kusur.length === 0, kusur.slice(0, 4).join(' '));
}

/* R7 · OTOMASYON BUTUNLUGU: sayfanin bes blogu da ham HTML'de dogmali.
   (a) Yapisal: akisin 5 ajan adimi + 4 giris + 4 cikis, gunun 6 zamani,
   sizintinin 4 cozumu, huninin varsayilan para ciktisi (₺ ile dolu) —
   eski tarafta akis TAMAMEN JS'le dogyordu, bot hicbirini gormuyordu.
   (b) Panel canliligi: sayfanin data-t anahtarlari strings.en'de yasar;
   EN sayfa strings.en'deki GUNCEL metni basmali — panel metni degistirir
   de bilesen varsayilanda kalirsa bu SESSIZ bir bayatlamadir. TR'de ayni
   kontrol yapilamaz (anahtarlar strings.tr'de yok, kaynak markup). */
{
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
  const coz = (t) => String(t).replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const YAPISAL = {
    tr: ['Talep okundu', 'Niyet çıkarıldı', 'Fiyat/kapsam eşleşti', 'Yanıt gönderildi',
      'CRM + hatırlatma', 'Google Ads', 'Organik arama', 'Instagram DM', 'Web formu',
      'Randevu yazıldı', 'Fiyat aralığı', 'Sana devir', 'Elendi'],
    en: ['Enquiry read', 'Intent extracted', 'Matched to pricing', 'Reply sent',
      'CRM + reminder', 'Google Ads', 'Organic search', 'Instagram DM', 'Web form',
      'Booked', 'Price range', 'Handover', 'Filtered'],
  };
  const SAAT = ['02:41', '07:00', '09:00', '13:30', '17:00'];
  const ANAHTAR = ('s8e s8h s8p flc1 flc2 flc3 flb flbs mf0 mf1 mf2 mf3 mf4 mf5 mf6 mf7 mf8 '
    + 'mf9 mfa mfb mfc mfd mfe mff mfg mfh mfi gn0 gn1 gn2 gn3 gn4 gn5 gn6 gn7 gn8 gn9 '
    + 'gna gnb gnc gnd gne gnf sz0 sz1 sz2 sz3 sz4 sz5 sz6 sz7 sz8 sz9 sza szb szc szd '
    + 'sze szf szg szh szi szj szk szl szm szn szo szp szq szr szs szt szu hs0 hs1 hs2 '
    + 'hs3 hs4 hs5 hs6 hs7 hs8 hs9 hsa hsb hsc hsd hse hsf hsg hsh hsi').split(' ');
  const kusur = [];
  for (const dil of ['tr', 'en']) {
    const p = path.join(KOK, dil === 'en' ? 'en/otomasyon' : 'otomasyon', 'index.html');
    if (!fs.existsSync(p)) { kusur.push(dil + ':sayfa yok'); continue; }
    const ham = oku(p), duz = coz(ham);
    for (const x of YAPISAL[dil])
      if (!duz.includes(x)) kusur.push(`${dil}:akış(${x})`);
    for (const x of SAAT)
      if (!duz.includes(x)) kusur.push(`${dil}:saat(${x})`);
    if (!/id="hnPara"[^>]*>₺[\d.,]+</.test(ham)) kusur.push(dil + ':huni para varsayılanı boş');
    if (dil === 'en')
      for (const k of ANAHTAR) {
        const v = coz((c.strings.en || {})[k] || '');
        if (v && !duz.includes(v)) kusur.push(`en:${k}`);
      }
  }
  ol('R7 · otomasyon: akış+gün+sızıntı+huni ham HTML\'de, EN metinleri strings.en\'den güncel',
     kusur.length === 0, kusur.slice(0, 4).join(' '));
}

/* R8 · SITEMAP + RSS BUTUNLUGU (kesme hazirligi, Faz 4).
   (a) sitemap.xml'in loc seti, dist'teki sayfalarin KOK tabanli
   canonical setiyle BIREBIR ayni olmali — iki yonlu: sitemap'te olup
   sayfasi olmayan loc hayalet, canonical'i olup sitemap'e girmeyen
   sayfa gorunmez. Bilincli disarida: /hukuki (canonical'i kendine —
   netlify.app/yeni; kesmede KOK'a donunce kendiliginden listeye girer
   ve bu kural onu OTOMATIK kapsar) + 404 (canonical'siz).
   (b) rss.xml'in item seti = content.json posts seti (guid tabanli),
   pubDate her item'da var. Uretecler kaynaktan ayni formulle kurar;
   bu kural CIKTILARI kiyaslar — uretec formulu sessizce saparsa
   kirmiziya doner. */
{
  const kusur = [];
  const smYol = path.join(KOK, 'sitemap.xml');
  if (!fs.existsSync(smYol)) kusur.push('sitemap.xml yok');
  else {
    const sm = oku(smYol);
    /* iki taraf da sondaki cizgi atilarak normallesir (kok dahil):
       kiyasin konusu adres kimligi, cizgi bicimi degil. */
    const norm = (u) => u.replace(/\/$/, '');
    const smN = new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => norm(m[1])));
    const canonN = new Set();
    /* (c) TUR 9 (3 Eyl 2026) — KESME MAYINI: sayfanin DISKTEKI yolu ile
       canonical'inin yolu ayni olmali. Onceden yalniz canonical <-> sitemap
       kiyaslaniyordu; ikisi ayni formulden geldigi icin rota klasoru
       /hizmet/ iken canonical /hizmetler/ olsa da yesil kaliyordu
       (MIMARI M15/A15: kesmede 18 URL 404). Dosya yolu dist'ye gore,
       canonical yolu KOK'a gore alinir: /yeni oneki iki tarafta da yok,
       kesmede KOK dist'e donunce formul degismeden calisir. Kirmizi-once:
       3 Eyl, klasor adi degismeden 18 sayfa (9 slug x 2 dil) kirmizi. */
    const yolKusur = [];
    for (const p of sayfalar) {
      const m = oku(p).match(/<link rel="canonical" href="([^"]+)"/);
      /* 4 EYL 2026 · SESSIZ ATLAMA KAPANDI. Bu satir bir FILTREYDI: konak
         tutmayan sayfa `canonN`e hic girmiyordu, yani canonical'i yabanci
         (ya da bayat) bir konaga bakan sayfa kirmizi yakmak yerine
         KIYASTAN DUSUYORDU. www kararinda tam bu oldu — filtre apex
         ariyordu, 65 sayfanin hicbiri kumeye girmedi ve kural "sitemap'te
         var, sayfasi yok" diye SITEMAP'i sucladi. Artik atlanmaz: konak
         tutmuyorsa kusur olarak ADIYLA basilir. */
      if (!m) kusur.push(rel(p) + ':canonical-yok');
      else if (KONAK && !m[1].startsWith(KONAK + '/') && m[1] !== KONAK) kusur.push(rel(p) + ':canonical-yabanci-konak:' + m[1]);
      else {
        canonN.add(norm(m[1]));
        /* KESME (6 Eyl 2026): `404.html` gibi DIZIN OLMAYAN sayfalarda
           dirname yolu '/' veriyordu ve canonical '/404' ile catisiyordu.
           index disi dosya adinda yol DOSYADAN turetilir. */
        const dizinYolu = ('/' + path.relative(KOK, path.dirname(p)).replace(/\\/g, '/')).replace(/^\/\.$/, '/');
        const dosyaAdi = path.basename(p, '.html');
        const dosyaYolu = dosyaAdi === 'index' ? dizinYolu : (dizinYolu === '/' ? '/' + dosyaAdi : dizinYolu + '/' + dosyaAdi);
        const canonYolu = norm(new URL(m[1]).pathname) || '/';
        if (norm(dosyaYolu) !== norm(canonYolu) && !(dosyaYolu === '/' && canonYolu === '/'))
          yolKusur.push(dosyaYolu + ' ↔ ' + canonYolu);
      }
    }
    /* SITEMAP-DISI KAYITLAR (6 Eyl 2026): sayfalar.json'da `sitemap: null`
       olan yollar sitemap'e GIRMEZ ve girmemeli (noindex donusum ucu,
       hukuki, 404). Onlarin canonical'i dogru adresi gosterebilsin diye
       kural burada okur — eskiden canonical'i netlify.app'e cevirerek
       kaciliyordu ve o kacamak KESMEDE patlayacakti. */
    const smDisi = new Set();
    try {
      const S8 = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'veri', 'sayfalar.json'), 'utf8'));
      for (const k of S8.statik) if (k.sitemap === null || k.sitemap === undefined) {
        for (const d of (k.dil || ['tr'])) smDisi.add(norm(KONAK + (d === 'en' ? '/en' : '') + k.yol));
      }
    } catch (e) { /* okunamazsa istisna yok: kural sert kalir */ }
    for (const c of canonN) if (!smN.has(c) && !smDisi.has(c)) kusur.push('sitemapte-yok:' + c);
    for (const l of smN) if (!canonN.has(l)) kusur.push('sayfasi-yok:' + l);
    if (yolKusur.length) kusur.push(`yol≠canonical ${yolKusur.length} sayfa: ` + yolKusur.slice(0, 2).join(', '));
    if (smN.size < 10) kusur.push('sitemap süpheli kisa:' + smN.size);
  }
  const rssYol = path.join(KOK, 'bulten', 'rss.xml');
  if (!fs.existsSync(rssYol)) kusur.push('rss.xml yok');
  else {
    const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
    const rss = oku(rssYol);
    const guidler = [...rss.matchAll(/<guid>([^<]+)<\/guid>/g)].map(m => m[1]);
    for (const p of (c.posts || []))
      if (!guidler.includes(`${KONAK}/bulten/${p.slug}`)) kusur.push('rss-eksik:' + p.slug);
    if (guidler.length !== (c.posts || []).length) kusur.push(`rss-sayi:${guidler.length}/${(c.posts || []).length}`);
    if ((rss.match(/<pubDate>/g) || []).length !== guidler.length) kusur.push('rss-pubDate eksik');
  }
  ol('R8 · sitemap loc seti = canonical seti + dosya yolu = canonical yolu + rss item seti = posts',
     kusur.length === 0, kusur.slice(0, 3).join(' | '));
}

/* H24 · EN ANA BEKCI ESLERI (kesme hazirligi, Faz 4). Rota kapanisinin
   kaydi: H ailesi yalniz TR anayi olcer, EN ana BEKCISIZDI (gzip 28 KB
   bandinda — tavana yakin, sessiz bayatlama riski). TAM genisletme
   (H1-H23'un EN esleri) ayri is: icerik kurallari (H15/H17/H19/H21)
   EN deger sozlukleri ister. Burada en gercek uc risk kilitlenir:
   sayfa uretilmis + tek h1 + gzip tavani (TR H18 ile AYNI tavan —
   ayni cwnd ucurumu iki dil icin de gecerli; 32 -> 40 KB tasarim
   turu A1 nav karari, gerekce H18 yorumunda). */
{
  const zlib = require('zlib');
  const p = path.join(KOK, 'en', 'index.html');
  const kusur = [];
  let gz = 0;
  if (!fs.existsSync(p)) kusur.push('en/index.html yok');
  else {
    const h = oku(p);
    const h1 = (h.match(/<h1[\s>]/g) || []).length;
    if (h1 !== 1) kusur.push('h1 sayisi:' + h1);
    /* TUR 3 (2 Eyl 2026): EN ana gzip 40.180 -> 21.917 B; tavan 40 -> 24 KB. */
    /* prologlu EN ana: H18 ile ayni tavan (28 KB, ENES ONAYI BEKLIYOR) */
    const TAVAN = (/<section class="fl"/.test(h) ? 28 : 24) * 1024;
    gz = zlib.gzipSync(fs.readFileSync(p), { level: 9 }).length;
    if (gz > TAVAN) kusur.push(`gzip ${gz} > ${TAVAN}`);
  }
  ol('H24 · EN ana: üretilmiş + tek h1 + gzip HTML <= 24576 B (prologlu 28672)',
     kusur.length === 0, kusur.join(' | ') || `${gz} B`);
}

/* ---- FAZ 2 · ana sayfa kuralları (H ailesi) ------------------------- */
{
  const ana = path.join(KOK, 'index.html');
  const anaVar = fs.existsSync(ana);
  ol('H0 · ana sayfa üretilmiş (kök)', anaVar, anaVar ? '' : 'index.html yok');
  if (anaVar) {
    const h = oku(ana);
    /* CSS iki yerde yaşayabilir: satır içi <style> + bağlı _astro/*.css
       (Astro eşiği aşınca dışarı çıkarır) — İKİSİ de okunur; yalnız
       satır içine bakmak H kurallarını sessizce boşa düşürür (yaşandı). */
    let css = [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
    for (const m of h.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)) {
      const dosya = path.join(KOK, m[1].replace(/^\/(?:yeni\/)?/, ''));
      if (fs.existsSync(dosya)) css += '\n' + fs.readFileSync(dosya, 'utf8');
    }

    /* düzleştirici: @media/@supports sarmalları AÇILIR (iç kurallar düz
       listeye iner — parantez sayarak, [^}]* tuzağı değil), @keyframes/
       @font-face bütünüyle atlanır. H1/H2 düz kural listesinde ölçer. */
    const duzlestir = txt => {
      const out = [];
      let i = 0;
      while (i < txt.length) {
        const ac = txt.indexOf('{', i);
        if (ac === -1) break;
        const bas = txt.slice(i, ac).trim();
        if (/^@(media|supports)/.test(bas)) {
          let d = 1, k = ac + 1;
          for (; k < txt.length && d > 0; k++) { if (txt[k] === '{') d++; else if (txt[k] === '}') d--; }
          out.push(...duzlestir(txt.slice(ac + 1, k - 1)));
          i = k;
        } else if (bas.startsWith('@')) {
          let d = 1, k = ac + 1;
          for (; k < txt.length && d > 0; k++) { if (txt[k] === '{') d++; else if (txt[k] === '}') d--; }
          i = k;
        } else {
          const kap = txt.indexOf('}', ac);
          if (kap === -1) break;
          out.push({ sec: bas, gov: txt.slice(ac + 1, kap) });
          i = kap + 1;
        }
      }
      return out;
    };
    const duzKurallar = duzlestir(css);

    /* GÖÇ ÖNEKLERİ (Göç Anayasası madde 3: "H1 yeni sahne önekleriyle
       GENİŞLETİLİR — sessizce silinmez, gevşetilmez").
         s1- s2- s3-  Faz 2 anlatı sahneleri
         sh-          S-H hero (göçün ilk sahnesi)
         st-          S-T şerit (ticker)
         sp-          S-P deste (projeler)
         sk-          S-K katman (dort katman)
         sa-          S-A akis (hizmet seridi)
         sse-         S-SE sektor + pano
         ste-         S-TE tespit (teshis araci)
         ssz-         S-SZ sozler (kanal kartlari)
         ssb-         S-SB soz bandi
         sku-         S-KU kurucu
         sil-         S-IL iletisim + lead formu
         sus-         süs katmanı; H4 zaten bu öneki tanıyor — hareketin
                      yaşadığı yer burası, cihaz kısıtının söndürebildiği
                      tek yer de burası. İkisi aynı sözlüğü kullanmalı.
       Sonraki sahneler geldikçe TEK yer değişir: bu iki dizi. */
    const SAHNE_ONEK = /(^|[\s,.>(])(s[123]-|sh-|st-|sp-|sk-|sa-|sse-|ste-|ssz-|ssb-|sku-|sil-)/;      /* içerik sahneleri */
    /* `ak` öneki: S-A mini demo ailesi (giydirme, 20 Agu) — kart içi
       canlandırmaların tüm sınıfları kaynaktan `ak*` gelir (akd akrw
       aksq akmini...). S-A'nın alt sözlüğü sayılır. */
    /* `nv-`: global katman (nav + mobil menü, tasarım turu A1) — H1
       sözlüğüne eklendi (Anayasa madde 3: önek GENİŞLETİLİR). SAHNE_ONEK'e
       BİLEREK girmedi: H2 "içerik görünür doğar"ı mobil menü linklerine
       uygulamak yanlış olur (kapalı katmanın içeriği görünmez doğar,
       menü açılınca mmrow'la gelir — kaynağın kendi davranışı). */
    /* `kb-` ONEKI (4 Eyl 2026, SOKUM VE TASIMA TURU): Anayasa madde 3 —
       "H1 yeni sahne onekleriyle GENISLETILIR". KABUK katmani: eski
       sitenin ajan imleci (#bit/#bittip/#bitsay/#bitback) her sayfaya
       geri geldi; hareketi (halka nabzi, balon gecisi, imlec sonumu)
       .kb-* siniflarinda. nv- gibi global katman: SAHNE_ONEK'e girmez. */
    /* fl-: PROLOG ana sayfada (3 Eyl 2026, ANAYASA istisna 4) — filmin kendi
       ailesi, kendi kapilari FM1/FM2 (bellek, ilk kare, sokum). */
    const HAREKET_ONEK = /(^|[\s,.>(])(s[123]-|sh-|st-|sp-|sk-|sa-|sse-|ste-|ssz-|ssb-|sku-|sil-|sus-|pr-|fl-|ak[a-z]|nv-|kb-)/; /* + süs + ak demo ailesi + global katman + PROLOG (pr-) */

    /* `pr-` ONEKI (22 Agu, prolog 1. durak): Anayasa madde 3'un ongordugu
       genisletme — "H1 yeni sahne onekleriyle genisletilir", ayri ve acik
       mesajli commit'le. Prolog KENDI sahne ailesi: alti katman + cumle +
       "Gec" dugmesi. Kural GEVSEMIYOR, listeye bir sahne ekleniyor; onek
       disindaki hicbir secici hala hareket alamaz. Hata enjekte edilerek
       dogrulandi (bkz. tur raporu): sinif `.pr-kat` yerine `.prkat`
       yazilinca kural KIRMIZI donuyor.
    /* H1 · hareket bütçesi: animation/transition yalnız sahne/süs
       öneklerinde ve etkileşim geri bildiriminde.
       BİLİNÇLİ İSTİSNA (kurala yazıldı): .dugme üzerindeki `transition`
       — hover geri bildiriminin mekanik parçası (bileşen kimliği,
       H4'ün diliyle); `animation` bu istisnaya girmez.
       `.s4-kart` istisnası KALKTI: S4 kanıt sahnesi S-P destesine
       devredildi, sınıf artık hiçbir sayfada yok (kural gevşemedi,
       daraldı). */
    {
      const kusur = [];
      for (const { sec, gov } of duzKurallar) {
        const animVar = /(?:^|[^a-z-])animation\s*:/.test(gov);
        const gecisVar = /(?:^|[^a-z-])transition\s*:/.test(gov);
        if (!animVar && !gecisVar) continue;
        const sahneli = HAREKET_ONEK.test(sec);
        const etkilesim = /:hover|:focus|:active/.test(sec);
        const kimlik = !animVar && /\.dugme\b/.test(sec);
        if (!sahneli && !etkilesim && !kimlik) kusur.push(sec.slice(0, 40));
      }
      ol('H1 · hareket bütçesi: hareket yalnız sahne/süs öneki + etkileşim',
         kusur.length === 0, kusur.slice(0, 3).join(' | '));
    }

    /* H2 · görünür doğar: İÇERİK sınıflarına (s1-/s2-/s3-/sh- öneki)
       hover dışı opacity:0 / visibility:hidden YAZILAMAZ — giriş hareketi
       keyframe from{}'dan gelir, taban her zaman opak. Savurmada boş ekran
       yok. .sus- bilinçli DIŞARIDA: süs sönük doğabilir, içerik doğamaz. */
    {
      /* BOŞ SÖZDE-ELEMAN İSTİSNASI (2026-08-19, hero turunda kural
         keskinleştirildi — gevşetilmedi): `content:''` taşıyan
         ::before/::after'ın içeriği YOKTUR; boyadığı şey zemin, çerçeve
         veya parıltıdır. .sh-void::before hover parıltısıdır ve sönük
         doğması doğru davranıştır. Kural metin ve görselin görünür
         doğmasını ölçer; içeriksiz katman ölçünün konusu değil.
         Sınır dar tutuldu: content'i boş OLMAYAN sözde-eleman (ör.
         content:'→') hâlâ kuralın içinde. Astro çıktısı tek iki nokta
         basıyor (:before) — ikisi de yakalanır. */
      const bosSozde = (sec, gov) =>
        /:{1,2}(before|after)\b/.test(sec) && /content\s*:\s*(''|"")/.test(gov);
      const kusur = [];
      for (const { sec, gov } of duzKurallar) {
        if (!SAHNE_ONEK.test(sec) || /:hover|:focus/.test(sec)) continue;
        if (bosSozde(sec, gov)) continue;
        if (/opacity\s*:\s*0(?![.\d])/.test(gov) || /visibility\s*:\s*hidden/.test(gov))
          kusur.push(sec.slice(0, 40));
      }
      ol('H2 · içerik görünür doğar (sahne sınıfında opacity:0/hidden yok)',
         kusur.length === 0, kusur.slice(0, 3).join(' | '));
    }

    /* H5 · giriş keyframe'i opaklığa dokunmaz (madde 5'in ikinci yarısı).
       H2 taban kuralı; bu onun tamamlayıcısı: İÇERİK sınıfının çağırdığı
       keyframe `opacity` taşıyorsa eleman gene animasyon payı kadar
       görünmez kalır — LCP tam o kadar itilir (2.021 ms, ölçüldü).
       Süs keyframe'leri (sh-hale, sh-yukari-sus) serbest: onları içerik
       sınıfı çağırmaz.

       KESKİNLEŞTİRME (19 Ağu, S-P destesi turunda — GEVŞETME DEĞİL):
       kural "opacity geçiyor mu" diye bakıyordu, oysa koruduğu şey
       "eleman GÖRÜNMEZ mi başlıyor". Destenin küçülme eğrisi
       `from{opacity:1} → to{opacity:.72}`: ilk kareden itibaren tam
       opak, üstelik zaman değil KAYDIRMA güdümlü (sayfa açılırken
       ilerleme 0). Kural artık başlangıç durağına bakıyor: opacity
       taşıyan bir içerik keyframe'i, `from`/`0%` durağında açıkça
       `opacity:1` yazmak zorunda. Yazmıyorsa (ya da 1'den küçükse)
       kırmızı — yani "sönük doğan içerik" hâlâ hata, "sönükleşen
       içerik" değil. Açık `from` şartı bilinçli: niyet CSS'in kendi
       metninde okunsun.
       DOĞRULANDI: dist'teki `sp-cek`in `from` durağı `opacity:1`den
       `opacity:.99`a çevrildiğinde kural kırmızıya döndü. */
    {
      const kareler = {};
      for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
        let d = 1, k = m.index + m[0].length;
        for (; k < css.length && d > 0; k++) { if (css[k] === '{') d++; else if (css[k] === '}') d--; }
        kareler[m[1]] = css.slice(m.index + m[0].length, k - 1);
      }
      /* Bir keyframe gövdesinin BAŞLANGIÇ durağı: `from` ya da `0%`.
         Duraklar `from,50%{...}` gibi birleşik yazılabildiği için
         seçici listesi parçalanarak aranır. Derleyici `from`u `0%`e
         çevirebiliyor — ikisi de kabul. */
      const opakBaslar = (govde) => {
        for (const d of govde.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
          const duraklar = d[1].split(',').map(x => x.trim());
          if (!duraklar.some(x => x === 'from' || x === '0%')) continue;
          const o = d[2].match(/opacity\s*:\s*([\d.]+)/);
          if (o && Number(o[1]) >= 1) return true;
        }
        return false;
      };
      const kusur = [];
      for (const { sec, gov } of duzKurallar) {
        if (!SAHNE_ONEK.test(sec) || /:hover|:focus/.test(sec)) continue;
        for (const a of gov.matchAll(/animation\s*:\s*([^;]+)/g))
          for (const ad of a[1].split(/\s+/))
            if (kareler[ad] && /opacity\s*:/.test(kareler[ad]) && !opakBaslar(kareler[ad]))
              kusur.push(sec.slice(0, 28) + '→' + ad);
      }
      ol('H5 · içerik giriş keyframe\'i opaklığa dokunmaz (yalnız transform)',
         kusur.length === 0, kusur.slice(0, 3).join(' | '));
    }

    /* H6 · hero görsel hattı — KOŞULLU kural: hero sahnesi sayfada varsa
       ölçer, yoksa ölçecek şey yoktur (göç sırasında sahne bir commit'te
       gelir; kural sahneyle birlikte kendiliğinden devreye girer).
       Ölçtüğü: ilk ekranın iki eli mobil kaynağını taşıyor mu (kural 109
       dersi — çözülmüş bitmap ≤ 2× CSS kutusu) ve mobil ilk ekran görsel
       yükü 300 KB tavanının altında mı (Anayasa madde 3).
       Ölçü gerçek dosya boyutundan; "ürettim" demek yetmez. */
    if (/class="sh-sahne"/.test(h)) {
      const TAVAN = 300 * 1024;
      const kusur = [];
      let mobilYuk = 0;
      const eller = [...h.matchAll(/<source[^>]*media="\(max-width:900px\)"[^>]*srcset="([^"]+)"/g)]
        .map(m => m[1]);
      for (const el of ['hand-human', 'hand-robot'])
        if (!eller.some(u => u.includes(el + '-m.avif'))) kusur.push(el + ':mobil-kaynak-yok');
      /* mobil ilk ekran: her el icin EN IYI bicim (avif) sayilir */
      for (const u of eller.filter(x => x.endsWith('.avif'))) {
        const dosya = path.join(KOK, u.replace(/^\/(?:yeni\/)?/, ''));
        if (fs.existsSync(dosya)) mobilYuk += fs.statSync(dosya).size;
        else kusur.push('kayıp:' + u);
      }
      if (mobilYuk > TAVAN) kusur.push('mobil-yük:' + mobilYuk + 'B');
      ol(`H6 · hero elleri mobil kaynaklı + ilk ekran ≤ ${TAVAN} B`,
         kusur.length === 0, kusur.slice(0, 3).join(' ') || `mobil ilk ekran ${mobilYuk} B`);
    }

    /* H7 · tek h1: göç sırasında sahne devri iki h1 doğurabilir (S1Acilis
       ile hero aynı sözü söylüyordu — yaşandı). Parite sözleşmesinin
       (madde 5) ana sayfa ayağı. */
    {
      const sayi = (h.match(/<h1[\s>]/g) || []).length;
      ol('H7 · ana sayfada tek h1', sayi === 1, `${sayi} adet`);
    }

    /* H10 · göç sahnesinin dolgusu gerçekten uygulanıyor mu.
       ana.css'te `.ana section{padding:11vh 0}` var; özgüllüğü (0,1,1)
       düz sınıf seçicisini (0,1,0) YENER. `.sh-sahne{padding:...}` yazan
       sahne kaynakta doğru okunuyor ama tarayıcıda hiç yürürlüğe
       girmiyordu — hero'da yaşandı, ancak GERÇEK TARAYICIDA ekran
       görüntüsüyle görüldü (kaydır işareti hmeta satırının üstüne
       biniyordu). Denetim metni okuduğu için göremezdi; kural bu yüzden
       özgüllüğü ölçer, görüntüyü değil: `-sahne` ile biten bir sınıfa
       padding yazan her kural `.ana` ile nitelenmiş olmalı.
       Yanlış yeşilden korunmanın yolu: kuralı belirtiye değil SEBEBE
       bağlamak. */
    {
      const kusur = [];
      for (const { sec, gov } of duzKurallar) {
        if (!/(^|[\s,.>(])s[a-z0-9]*-sahne\b/.test(sec)) continue;
        if (!/(?:^|[^a-z-])padding(?:-(?:top|bottom|block|inline))?\s*:/.test(gov)) continue;
        /* her virgüllü parça ayrı ayrı nitelenmiş olmalı */
        for (const parca of sec.split(','))
          if (/-sahne\b/.test(parca) && !/\.ana\s/.test(parca))
            kusur.push(parca.trim().slice(0, 40));
      }
      ol('H10 · göç sahnesi dolgusu `.ana` ile nitelenmiş (özgüllük yenilmiyor)',
         kusur.length === 0, kusur.slice(0, 3).join(' | '));
    }

    /* H8 · şerit dikişi: marquee'nin tur SAYISI ile kaydırma BÖLENİ aynı
       sayı olmak zorunda — üç tur varsa kaydırma bir tur, yani -100%/3.
       İkisi ayrı yerde yaşadığı için ayrışabilir ve ayrıştığında hata
       sessizdir: şerit her turda biraz kayar, bir süre sonra boşluk
       geçer. Bu depoda "iki yerde yaşayan oran" üç kez ısırdı (tel
       birimi, halka tur süresi, şeridin kendi 84/42 sn yorumu).
       KOŞULLU: şerit sahnesi yoksa ölçecek şey yok. */
    if (/class="st-sahne"/.test(h)) {
      const tur = (h.match(/class="st-tur"/g) || []).length;
      /* NOT: derleyici (lightningcss) `translateX(...)` -> `translate(...)`
         yazıyor; kural ÇIKTIYI okuduğu için ikisini de kabul eder.
         Kaynağa göre yazılmış regex burada sessizce null döndürdü. */
      const kare = css.match(/@keyframes\s+st-akis\s*\{[^}]*translate(?:X)?\(\s*calc\(\s*-100%\s*\/\s*(\d+)\s*\)/);
      const bolen = kare ? Number(kare[1]) : null;
      ol('H8 · şerit dikişi: tur sayısı = kaydırma böleni',
         tur >= 2 && bolen === tur, `tur ${tur} · bölen ${bolen}`);
    }

    /* H11 · sonsuz hareketin durdurma sözleşmesi: `infinite` koşan her
       animasyonun `prefers-reduced-motion:reduce` altında karşılığı
       olmalı. Anayasa bunu S-T için açıkça yazıyor ("marquee ...
       prefers-reduced-motion durdurur") ama kural sahneye değil
       DAVRANIŞA bağlandı: süreklilik nerede olursa olsun kullanıcının
       beyanına uymalı. Tek seferlik giriş animasyonları kapsam dışı —
       onlar zaten biter.
       NOT: derleyici `::before` -> `:before` yazabiliyor, iki taraf da
       normalleştirilerek karşılaştırılır. */
    {
      const norm = s => s.trim().replace(/::/g, ':').replace(/\s+/g, ' ');
      const duran = new Set();
      for (const m of css.matchAll(/@media[^{]*prefers-reduced-motion[^{]*\{((?:[^{}]*\{[^}]*\})*)\}/g))
        for (const r of m[1].matchAll(/([^{}]+)\{([^}]*)\}/g))
          if (/animation(?:-play-state)?\s*:\s*(none|paused)/.test(r[2]))
            for (const p of r[1].split(',')) duran.add(norm(p));
      const kusur = [];
      for (const { sec, gov } of duzKurallar) {
        const anim = gov.match(/animation\s*:\s*([^;]+)/);
        if (!anim || /^\s*none\b/.test(anim[1])) continue;
        /* GENISLETME (19 Agu, S-P turu): kural yalniz `infinite` kosani
           olcuyordu. Deste kaydirma-gudumlu — `infinite` degil ama
           kullanici kaydirdikca surekli, ve durdurmasi OZGULLUKTE
           kaybediyordu: `.sp-govde` (0,1,0) karsi hareketi veren
           `.sp-kart:not(:last-child) .sp-govde` (0,3,0). Denetim goremedi,
           gercek Chrome'da hareket-azaltma emulasyonu gordu (+1000 px'te
           kartlar hala 0,94/0,72 okuyordu). Olcut artik: SAHNE sinifinda
           yasayan her animasyonun, hareketi VEREN seciciyle AYNI secici
           uzerinde bir `prefers-reduced-motion` karsiligi olmali.
           Gevsetme degil, H11'in kendi dersinin genellestirilmesi. */
        /* nv- (global katman, A1): tek seferlik menü girişleri (mmrow) de
           durdurma sözleşmesine tabi — SAHNE_ONEK'e girmedi (H2 sebebi,
           sözlük yorumunda) ama H11 kapsamına açıkça alındı. */
        if (!/\binfinite\b/.test(anim[1]) && !SAHNE_ONEK.test(sec)
            && !/(^|[\s,.>(])nv-/.test(sec)) continue;
        for (const p of sec.split(','))
          if (!duran.has(norm(p))) kusur.push(norm(p).slice(0, 36));
      }
      ol('H11 · her sahne hareketinin AYNI seçicide reduced-motion karşılığı var',
         kusur.length === 0, kusur.slice(0, 3).join(' | ') || `${duran.size} durdurma`);
    }

    /* H9 · şeridin görsel tekrarı erişilebilirlik ağacında bir kez:
       dikiş için tur üç kez basılıyor ama isimler ÜÇ KEZ okunmamalı.
       Eski tarafta dört kopyanın dördü de alt metin taşıyordu — botlara
       ve ekran okuyucuya aynı dokuz ad dört kez gidiyordu. */
    if (/class="st-sahne"/.test(h)) {
      const bolum = h.slice(h.indexOf('class="st-sahne"'));
      const son = bolum.indexOf('</section>');
      const altlar = [...bolum.slice(0, son).matchAll(/<img[^>]*\salt="([^"]*)"/g)]
        .map(m => m[1]).filter(Boolean);
      const tekrar = altlar.filter((a, i) => altlar.indexOf(a) !== i);
      ol('H9 · şerit alt metinleri tekrarlanmıyor (tekrar turları gizli)',
         tekrar.length === 0, tekrar.slice(0, 3).join(' ') || `${altlar.length} ad`);
    }

    /* ---- S-P destesiyle gelen kurallar (H12-H15 + G2) --------------
       Sahne talimatinin kendi sartlari: "kaydirma sirasinda uzun gorev
       uretme", "ilk ekran butcesi", "mobilde pin YOK", "icerik uc halde
       de eksiksiz". Dordu de burada rakama baglandi; dordu de dist'e
       hata enjekte edilerek kirmiziya donduruldu (H8'in sessizce null
       donmesi dersi: kirmiziya donmeyen kural yesil sayilmaz). */

    /* H12 · kaydirmanin kendisi is uretmez: ana sayfanin HICBIR betigi
       kaydirma dinleyicisi kurmaz ve duzen okumaz. Eski deste tam
       tersiydi — `scroll` + rAF + kart basina `getBoundingClientRect`;
       58 sn'lik kayitta dort buyuk donmanin dordu de o bolgedeydi.
       Kural belirtiye (donma) degil SEBEBE bakar: dinleyici ve okuma
       yoksa kaydirma karesi bizden is almaz.
       Olcu hem satir ici hem dis (_astro/*.js) betikleri kapsar —
       yalniz satir icine bakmak kurali sessizce bosa dusururdu. */
    {
      /* getTotalLength perde turunda eklendi: Anayasa'nin perde icin
         adiyla yasakladigi maliyet (iz basina zorunlu yerlesim okumasi);
         kural artik onu da tarar. */
      const OKUMA = /getBoundingClientRect|getClientRects|\boffset(Width|Height|Top|Left)\b|\bscroll(Top|Left|Height|Width)\b|getComputedStyle|getTotalLength/;
      const DINLEYICI = /addEventListener\s*\(\s*["']scroll["']|\bonscroll\s*=/;
      const kusur = [];
      const betikler = [];
      for (const m of h.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/g)) {
        const dosya = path.join(KOK, m[1].replace(/^\/(?:yeni\/)?/, ''));
        if (fs.existsSync(dosya)) betikler.push([m[1], fs.readFileSync(dosya, 'utf8')]);
      }
      for (const m of h.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g))
        if (!/application\/ld\+json/.test(m[1])) betikler.push(['satir ici', m[2]]);
      for (const [ad, kod] of betikler) {
        /* PROLOG (3 Eyl 2026): film betigi kaydirmanin KENDISINI anlatan tek
           sahne (CLAUDE.md surucu kurali) — scroll dinleyicisi ve tek seferlik
           getComputedStyle (fade kaydi) onun tanimi; bedeli kendi kapisinda
           (FM1 takilma/bellek, olc-devir). Ana sayfanin obur betikleri kurala
           tabi kalir. */
        if (/Film\.astro_astro_type_script/.test(ad)) continue;
        if (DINLEYICI.test(kod)) kusur.push(ad + ':kaydirma-dinleyicisi');
        const o = kod.match(OKUMA);
        if (o) kusur.push(ad + ':duzen-okuma:' + o[0]);
      }
      ol('H12 · ana sayfa betiklerinde kaydirma dinleyicisi ve duzen okumasi yok',
         kusur.length === 0, kusur.slice(0, 3).join(' ') || `${betikler.length} betik`);
    }

    /* G2 · gorsel hatti kendi alanimizdan: yeni kabugun bastigi her
       <img src> ve <source srcset> `/yeni/` altinda olmali ve dosyasi
       diskte durmali. ACIK KALEMI KAPATIR: S4'un kart gorselleri kokteki
       `/img/pj-*-k-640.webp`e bagliydi — mobil icin pisirilmis turev
       masaustune de iniyordu ve Faz 4 kesmesinde kok yeni ciktiya
       donunce o yol kimsenin garantisi degildi. Font tarafindaki F1b'nin
       gorsel karsiligi. */
    {
      const kusur = [];
      for (const p2 of sayfalar) {
        const g = oku(p2);
        const yollar = [...g.matchAll(/<img[^>]*\bsrc="([^"]+)"/g)].map(m => m[1])
          .concat([...g.matchAll(/<source[^>]*\bsrcset="([^"]+)"/g)]
            .map(m => m[1].split(',')[0].trim().split(/\s+/)[0]));
        for (const u of yollar) {
          /* `/img/` ISTISNASI KESMEDE DUSTU (6 Eyl 2026). Kesmeden once
             gomulu eski giris (EskiGiris.astro) kok varliklarini
             kullaniyordu ve onlar `dist/../img/` altindaydi — yani ESKI
             sitenin klasoru. Kesmede eski site uretilmiyor; `/img/`
             artik `yeni/public/img` -> `dist/img`, yani asagidaki GENEL
             dalin tam olarak baktigi yer. Istisna gereksizlesti ve
             KALDIRILDI: kalsaydi var olmayan bir klasore bakip her
             gorseli "kayip-kok" diye kirmizi yakardi (yasandi). */
          if (!u.startsWith('/')) { kusur.push(rel(p2) + ':yabanci:' + u); continue; }
          if (!fs.existsSync(path.join(KOK, u.replace(/^\/(?:yeni\/)?/, '')))) {
            /* TUR 2c: kayip dosya git-disi film medyasindansa sebep
               kurulum adimidir — adiyla basilir, yigin basilmaz. */
            if (!MEDYA.kuruldu && u.startsWith('/varlik/film/')) {
              if (!kusur.includes(MEDYA.mesaj)) kusur.push(MEDYA.mesaj);
            }
            else kusur.push(rel(p2) + ':kayip:' + u);
          }
        }
      }
      ol('G2 · görseller kendi alanımızdan (kök) + dosyalar diskte',
         kusur.length === 0, kusur.slice(0, 3).join(' '));
    }

    /* H13 · deste gorsel hatti — KOSULLU (sahne yoksa olcecek sey yok).
       Sahne kapisinin "ilk ekran butcesi" sarti: kartlar ilk ekranin
       altinda, hepsi lazy, ve her kartin MOBIL kaynagi var (kural 109:
       cozulmus bitmap <= 2x CSS kutusu). Mobil kutu olculdu: 412 px
       ekranda kart genisligi 372 CSS px (ekran - 2x20 dolgu), tavan
       744 px. Olcu dosyanin kendi basligindan okunur, "urettim" demek
       yetmez. */
    if (/class="sp-sahne"/.test(h)) {
      const TAVAN = 744;
      const bolum0 = h.slice(h.indexOf('class="sp-deste"'));
      const deste = bolum0.slice(0, bolum0.indexOf('</section>'));
      const kusur = [];
      const kartlar = [...deste.matchAll(/<picture>([\s\S]*?)<\/picture>/g)].map(m => m[1]);
      for (const kart of kartlar) {
        const img = (kart.match(/<img[^>]*>/) || [''])[0];
        if (!/loading="lazy"/.test(img)) kusur.push('eager:' + img.slice(0, 40));
        const mob = kart.match(/<source[^>]*media="\(max-width:900px\)"[^>]*srcset="([^"]+)"/);
        if (!mob) { kusur.push('mobil-kaynak-yok'); continue; }
        const dosya = path.join(KOK, mob[1].replace(/^\/(?:yeni\/)?/, ''));
        if (!fs.existsSync(dosya)) { kusur.push('kayip:' + mob[1]); continue; }
        /* webp basligindan gercek piksel genisligi (VP8/VP8L/VP8X) */
        const b = fs.readFileSync(dosya);
        const tur = b.slice(12, 16).toString();
        let gen = null;
        if (tur === 'VP8 ') gen = b.readUInt16LE(26) & 0x3fff;
        else if (tur === 'VP8L') gen = (b.readUInt32LE(21) & 0x3fff) + 1;
        else if (tur === 'VP8X') gen = (b.readUIntLE(24, 3) & 0xffffff) + 1;
        if (gen === null) kusur.push('okunmadi:' + mob[1]);
        else if (gen > TAVAN) kusur.push(`genis:${mob[1]}:${gen}px`);
      }
      if (!kartlar.length) kusur.push('kart-yok');
      ol(`H13 · deste kartlari lazy + mobil kaynak <= ${TAVAN} px`,
         kusur.length === 0, kusur.slice(0, 3).join(' ') || `${kartlar.length} kart`);
    }

    /* H14 · MOBIL SAGLAMLIK: mobil baglamda PAHALI KATMAN yok.
       KURAL DEGISTI (19 Agu, Enes karari — sessizce degil, gerekcesiyle):
       onceki hali `position:sticky` yalniz `min-width:901px` icinde
       dogabilir diyordu ve mobilde pin'i tumden yasakliyordu. Enes sinirin
       yanlis yere cizildigini soyledi: Anayasa'nin "mobilde pin YOK"
       maddesi GSAP pinlerini kapsar — kaydirmayi kilitleyen, resize'da
       kendini baştan kuran, kare basina is ureten pin. CSS `position:
       sticky` o ailenin disinda: duzenin kendi isi, JS yok, dinleyici yok.
       (Eski kaynak da mobilde sticky'ydi, CSS 1287.)

       Kural o yuzden PIN'i degil MALIYETI olcuyor — mobilde kasmanin
       olculmus dort kaynagi bir daha tabana yazilamaz:
         filter / backdrop-filter  kural 109 + Anayasa madde 7
         will-change               kalici kompozit katman
         box-shadow                olceklenen katmanda her karede yeniden
                                   rasterlesiyordu (kural 111)
       "Mobil baglam" = medya sarmali olmayan taban VE telefonu disarida
       birakmayan her sarmal. `min-width:901px`, `pointer:fine` ve
       `hover:hover` telefonu disarida birakir, o yuzden gecerli kapi
       sayilir; baska her yerde bu dort ozellik kirmizidir.
       `none` degerleri serbest: kapatmak maliyet uretmez. */
    {
      const PAHALI = /(?:^|[^a-z-])(filter|backdrop-filter|will-change|box-shadow)\s*:\s*([^;]+)/g;
      const KAPI = /min-width\s*:\s*901px|pointer\s*:\s*fine|hover\s*:\s*hover/;
      const kusur = [];
      let olculen = 0;
      const yuru = (txt, kosul) => {
        let i = 0;
        while (i < txt.length) {
          const ac = txt.indexOf('{', i);
          if (ac === -1) break;
          const bas = txt.slice(i, ac).trim();
          if (/^@(media|supports)/.test(bas)) {
            let d = 1, k = ac + 1;
            for (; k < txt.length && d > 0; k++) { if (txt[k] === '{') d++; else if (txt[k] === '}') d--; }
            yuru(txt.slice(ac + 1, k - 1), kosul + ' ' + bas);
            i = k;
          } else if (bas.startsWith('@')) {
            let d = 1, k = ac + 1;
            for (; k < txt.length && d > 0; k++) { if (txt[k] === '{') d++; else if (txt[k] === '}') d--; }
            i = k;
          } else {
            const kap = txt.indexOf('}', ac);
            if (kap === -1) break;
            const gov = txt.slice(ac + 1, kap);
            if (SAHNE_ONEK.test(bas)) {
              olculen++;
              if (!KAPI.test(kosul))
                for (const m of gov.matchAll(PAHALI))
                  if (!/^\s*none\b/.test(m[2]))
                    kusur.push(bas.slice(0, 24) + ':' + m[1]);
            }
            i = kap + 1;
          }
        }
      };
      yuru(css, '');
      ol('H14 · mobil baglamda pahali katman yok (filter/backdrop/will-change/golge)',
         kusur.length === 0 && olculen > 0,
         kusur.slice(0, 3).join(' | ') || `${olculen} sahne kurali tarandi`);
    }

    /* H15 · destenin icerigi ham HTML'de TAM — sahne talimatinin
       cekirdek sarti: "bu sahnenin kartlari sitenin tek kanit yuzeyi,
       bot bos gorurse E-E-A-T kaybi olur". Eski tarafta kartlari
       `renderProjects` basiyordu; JS kosmayan bot destede hicbir is
       gormuyordu.
       Kural ayni zamanda URETEC BEKCISI: kunye (`deste-gorselleri.json`)
       content.json'un fotografli ilk alti isiyle ortusmezse kirmizi —
       panelden proje eklenip `gorsel-uret.cjs` kosmadiysa sessizce eski
       liste yayina cikmaz. */
    if (/class="sp-sahne"/.test(h)) {
      const c2 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
      const kunye = JSON.parse(fs.readFileSync(
        path.join(__dirname, 'src', 'veri', 'deste-gorselleri.json'), 'utf8'));
      /* Kunye, content.json'un fotografli isler dizisinin BASTAN
         kesilmis hali olmali (deste kurali: fotografi olan ilk N is).
         Uzunlugu kunyeden alip ayni diziyi kesmek dairesel olurdu —
         her kunye kendini dogrulardi; olculen sey SIRA ve KIMLIK. */
      const fotograflilar = (c2.projects || []).filter(x => x.image && !x.imgc);
      /* ANA SAYFA DESTESI DORT KART (kaynak `const DESTE_PROJE=4`, kok 6975).
         Kural once kunye uzunlugunu (alti) bekliyordu; deste kaynaga donunce
         iki is ana sayfada basilmaz oldu. KURAL GEVSEMEDI, ikiye ayrildi:
         (a) ana sayfada DORT kart TAM olacak, (b) fotografli islerin HEPSI
         arsivde (/projeler) tam olacak — kanit yuzeyi bir butun olarak
         korunur, yalniz yeri kaynaktaki gibi. */
      const DESTE_PROJE = 4;
      const beklenen = fotograflilar.slice(0, Math.min(DESTE_PROJE, kunye.length));
      /* kunye sirasi content.json onekiyle ayni mi — TAM listeye bakar
         (ana sayfa destesi artik dortle kesiliyor, kunye alti tasiyor) */
      const onek = kunye.every((k, i) => fotograflilar[i] && fotograflilar[i].slug === k.slug);
      const bolum1 = h.slice(h.indexOf('class="sp-sahne"'));
      const deste = bolum1.slice(0, bolum1.indexOf('</section>'));
      /* Karsilastirma COZULMUS metinle: hangi kacis bicimi kullanildigi
         (&quot; mi &#34; mu) derleyicinin isi, kuralin degil. Once
         etiketler atilir, sonra varliklar cozulur — bot da metni boyle
         gorur. */
      const coz = (t) => String(t).replace(/<[^>]+>/g, '')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      const T2 = (v) => (typeof v === 'string' ? v : (v && (v.tr || v.en)) || '');
      const kusur = [];
      if (!onek || kunye.length === 0)
        kusur.push('kunye != content.json onek (gorsel-uret.cjs kosmadi?)');
      const metin = coz(deste);
      for (const x of beklenen)
        for (const [ad, deger] of [['ad', x.name], ['yil', String(x.year)],
                                   ['etiket', T2(x.tag)], ['anlatim', T2(x.text)]])
          if (!metin.includes(String(deger))) kusur.push(`${x.slug}:${ad}-yok`);
      /* (b) arsiv: fotografli islerin hepsi /projeler'de ham HTML'de */
      const arsivYol = path.join(KOK, 'projeler', 'index.html');
      let arsivMetin = '';
      if (fs.existsSync(arsivYol)) arsivMetin = coz(oku(arsivYol));
      else kusur.push('arsiv:/projeler yok');
      for (const x of fotograflilar)
        for (const [ad, deger] of [['ad', x.name], ['etiket', T2(x.tag)]])
          if (arsivMetin && !arsivMetin.includes(String(deger))) kusur.push(`arsiv:${x.slug}:${ad}-yok`);
      ol(`H15 · deste icerigi ham HTML'de tam (ana ${beklenen.length} is x ad/yil/etiket/anlatim · arsiv ${fotograflilar.length} is)`,
         kusur.length === 0, kusur.slice(0, 3).join(' '));
    }

    /* ---- S-K katmaniyla gelen kurallar (H16, H17) -------------------

       H16 · IC BAGLANTI BUTUNLUGU: yeni kabuktaki her `/yeni/...` baglantisi
       gercekten uretilmis bir sayfaya (ya da diskteki bir dosyaya) gitmeli.
       Sahne dokuz hizmet sayfasinin tamamina baglaniyor — sayfanin ic
       baglanti omurgasi burada. Bir slug yanlis yazilirsa ya da rota adi
       degisirse (ornek: /hizmet vs /hizmetler) hata SESSIZDIR: sayfa
       yayinlanir, baglanti 404 verir, hem kullanici hem tarayici kaybeder.
       Kural bunu derlemede kirmiziya cevirir. */
    {
      const kusur = [];
      let sayi = 0;
      for (const p2 of sayfalar) {
        for (const m of oku(p2).matchAll(/<a[^>]*\bhref="(\/[^"#?]*)/g)) {
          sayi++;
          const yol = m[1].replace(/^\/(?:yeni\/)?/, '').replace(/\/$/, '');
          const adaylar = [path.join(KOK, yol), path.join(KOK, yol, 'index.html'),
                           path.join(KOK, yol + '.html')];
          if (!adaylar.some(a => fs.existsSync(a) && fs.statSync(a).isFile()))
            kusur.push(rel(p2) + ' -> ' + m[1]);
        }
      }
      ol('H16 · ic baglantilarin hepsi uretilmis bir sayfaya gidiyor',
         kusur.length === 0, kusur.slice(0, 3).join(' | ') || `${sayi} baglanti`);
    }

    /* H17 · KATMAN ICERIGI ham HTML'de tam — KOSULLU (sahne yoksa olcecek
       sey yok). Sahnenin 21 metin anahtarinin (kt0..ktg) 21'i de
       content.json'un `strings` alaninda yasiyor; sahne onlari derlemede
       basar. Panelden bir anahtar bosaltilirsa ya da bilesen bir alani
       basmayi unutursa bot eksik sayfa gorur ve bu SESSIZ bir kayiptir
       (madde 1 + madde 5). Karsilastirma cozulmus metinle yapilir:
       etiketler atilir, varliklar cozulur — bot da boyle gorur. */
    if (/class="sk-sahne"/.test(h)) {
      const c3 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
      const str = (c3.strings && c3.strings.tr) || {};
      const ANAHTAR = ['kt0','kt1','kt2','kt3','kt4','kt5','kt6','kt7','kt8','kt9',
                       'kta','ktb','kth','kti','ktc','ktd','kte','ktj','ktm','ktf','ktg'];
      const coz = (t) => String(t).replace(/<[^>]+>/g, '')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ');
      const bolum = h.slice(h.indexOf('class="sk-sahne"'));
      const metin = coz(bolum.slice(0, bolum.indexOf('</section>')));
      const kusur = [];
      for (const k of ANAHTAR) {
        const deger = coz(typeof str[k] === 'string' ? str[k] : (str[k] && str[k].tr) || '');
        if (!deger) { kusur.push(k + ':content.json-bos'); continue; }
        if (!metin.includes(deger.trim())) kusur.push(k + ':sayfada-yok');
      }
      ol(`H17 · katman icerigi ham HTML'de tam (${ANAHTAR.length} anahtar)`,
         kusur.length === 0, kusur.slice(0, 3).join(' '));
    }

    /* ---- S-A akisiyla gelen kurallar (H18, H19) -------------------

       H18 · ANA SAYFA GZIP HTML BUTCESI. Bu tur bir esik OLCULDU: sayfanin
       gzip'li HTML'i, TCP'nin ilk tikanma penceresini (yaklasik 10 segment
       ~ 14,6 KB) asinca LCP bir tam GIDIS-DONUS kadar itiliyor. Olcum,
       Lighthouse mobil, kosum duzeyinde donusumlu:
         14,3 KB gz (S-A oncesi)  -> LCP 1.692 ms
         15,1 KB gz (S-A markup)  -> LCP 1.828 ms   (+136 ms = 1 RTT)
         15,6 KB gz (S-A tam)     -> LCP 1.833 ms   (+5 ms; ADIM, dogrusal degil)
       Sebep dogrulandi: RTT 150 -> 75 ms yapilinca fark 130 -> 72 ms'e
       dustu, yani maliyet bant genisligi ya da CPU degil, TEK BIR
       gidis-donus. Sonraki esik cwnd katlandigi icin ~29 KB gz.
       TAVAN GUNCELLENDI (giydirme, 20 Agu — ENES KARARI, sessizce degil):
       S-A mini demolari +~2,7 KB gz getirdi ve ~29 KB ucurumu ASILDI;
       secenekler rakamlariyla soruldu, "tavani as" secildi — LCP'ye bir
       tam RTT (+~130-150 ms) goze alindi. SONRA OLCULDU (3 kosum): LCP
       bandi DEGISMEDI (ortanca 1.826, eski bant 1.815-1.833) — LCP
       elemani (hero lede) HTML'in ILK cwnd'inde geliyor; kuyruk baytlari
       onu itmiyor. Esik dersi gecerli ama olcusu "toplam gzip" degil
       "LCP elemaninin bayt konumu". Yeni tavan 32 KB: bir
       SONRAKI ucurumdan (cwnd katlanmasi, ~44 KB) once kirmiziya doner.
       Eski ders duruyor: tavana yaklasildiginda cozum sahne kismak
       degil, satir ici CSS kararini olculu bir turda yeniden acmaktir.
       TAVAN 32 -> 40 KB (tasarim turu A1, 20 Agu — ENES KARARI,
       sessizce degil): NAV + mobil menu geldi (+3,3 KB gz; zorunlu
       icerik — "menu bile yok" hukmu) ve bedeli DONUSUMLU olculdu:
       LCP 1.818 -> 1.908 (+90 ms), puan 95-96, CLS 0 — kapilar
       iceride. Secenekler rakamlariyla soruldu, "tavani 40'a cek"
       secildi. 40 KB bir SONRAKI gercek ucurumdan (cwnd katlanmasi,
       ~44 KB) once kirmiziya doner. */
    {
      const zlib = require('zlib');
      /* GECE ZINCIRI TUR 3 (2 Eyl 2026): inlineStylesheets 'always' -> 'auto';
         ana sayfa gzip 40.947 -> 22.434 B olculdu (satir ici oran %52 -> %10).
         Tavan 40 -> 24 KB: ortak stil geri satir ici olursa adiyla kirmizi. */
      /* PROLOG ANA SAYFADA (3 Eyl 2026, ANAYASA istisna 4): film markup'i
         (39 poster + 21 soz blogu) +3,9 KB gz getirdi (21.384 -> 25.308 B).
         Tavan prologluysa 28 KB: bir sonraki gercek ucurum (cwnd katlanmasi,
         ~29 KB) once kirmiziya doner. ENES ONAYI BEKLIYOR — bedel Lighthouse
         donusumlu olculup rapora yazilir (performans turu). */
      const prologlu = /<section class="fl"/.test(fs.readFileSync(ana, 'utf8'));
      const TAVAN = (prologlu ? 28 : 24) * 1024;
      const gz = zlib.gzipSync(fs.readFileSync(ana), { level: 9 }).length;
      ol(`H18 · ana sayfa gzip HTML <= ${TAVAN} B${prologlu ? ' (prologlu)' : ''}`, gz <= TAVAN,
         `${gz} B (esik dersi: ~14,6 KB'ta bir RTT, ~29 KB'ta bir RTT daha)`);
    }

    /* H19 · AKIS SERIDININ ICERIGI ham HTML'de tam — KOSULLU.
       Eski tarafta bu bolumun markup'i TEK SATIRDI (`<div id="akTrack">`)
       ve kartlarin tamamini `__akisRender` basiyordu: JS kosmayan bot bes
       hizmetin ne adini, ne anlatimini, ne de sayfalarina giden bes
       baglantiyi goruyordu. Kural o kaybin geri gelmesini engeller:
       serittteki her hizmetin ADI, ILK CUMLESI ve BAGLANTISI ham HTML'de
       olmali. Kart sayisi da content.json'dan turetilir; panelden hizmet
       sirasi degisirse serit sessizce eskimez. */
    if (/class="sa-sahne"/.test(h)) {
      const c4 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
      const AKIS_KART = 5;
      const hiz = (c4.services || []).slice(0, AKIS_KART);
      const coz = (t) => String(t).replace(/<[^>]+>/g, '')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ');
      const T4 = (v) => (typeof v === 'string' ? v : (v && (v.tr || v.en)) || '');
      const ilkCumle = (t) => {
        const m = String(t || '').match(/^[\s\S]*?[.!?](?=\s+[A-ZÇĞİÖŞÜ])/);
        return m ? m[0] : String(t || '');
      };
      const bolum = h.slice(h.indexOf('class="sa-sahne"'));
      const ham = bolum.slice(0, bolum.indexOf('</section>'));
      const metin = coz(ham);
      const kusur = [];
      for (const x of hiz) {
        if (!metin.includes(coz(T4(x.title)).trim())) kusur.push(x.slug + ':ad-yok');
        const c = coz(ilkCumle(T4(x.text))).trim();
        if (c && !metin.includes(c)) kusur.push(x.slug + ':cumle-yok');
        if (!ham.includes(`/hizmetler/${x.slug}"`)) kusur.push(x.slug + ':baglanti-yok');
      }
      ol(`H19 · akis seridinde ${hiz.length} hizmetin adi/cumlesi/baglantisi ham HTML'de`,
         kusur.length === 0, kusur.slice(0, 3).join(' '));
    }

    /* ---- S-SE sektor panosuyla gelen kurallar (T1, H20) -------------

       T1 · PARA ARITMETIGI TESTLI (Anayasa: "₺ hesap aritmetigi testli").
       Pano her sektorun kazanc rakamini DERLEME ANINDA hesaplayip HTML'e
       basiyor; formul kaynaktan tasindi. Yanlis tasinmis bir carpan
       sessizdir — sayfa yayinlanir, rakam yanlistir. `test/hesap.test.mjs`
       eski `calc()`i satir satir kopyalayip ikisini alti sektor ve
       kaydirici uclarinda karsilastirir; bu kural o testi KOSAR.
       Testin kendisi kirmizi donerse denetim de kirmizi doner. */
    {
      const { execFileSync } = require('child_process');
      /* YAYIN NODE'U 20 (netlify.toml NODE_VERSION). Node 20 `.ts`
         dosyasini ACAMAZ — tur soyma 22.6+ isi. Bu yuzden testin ve
         onun ictigi modullerin uzantisi .mjs/.js olmak ZORUNDA.
         19 Agu'da tam bu yuzden deploy dustu: yerelde Node 24 tur
         soydugu icin test geciyordu, Netlify'da
         ERR_UNKNOWN_FILE_EXTENSION veriyordu. Kural artik once bunu
         STATIK olarak olcer — hata Netlify'a kadar gitmez. */
      /* Rota turunda test AILE oldu (hesap + huni) — kural klasördeki
         her *.test.mjs'i tarar ve --test'i klasöre koşar. */
      const testKlasoru = path.join(__dirname, 'test');
      const testler = fs.readdirSync(testKlasoru).filter(f => /\.test\.mjs$/.test(f))
        .map(f => path.join(testKlasoru, f));
      const tsIthal = [];
      const bakIthal = (dosya) => {
        if (!fs.existsSync(dosya)) return [];
        const kod = fs.readFileSync(dosya, 'utf8');
        return [...kod.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map(m => m[1]);
      };
      for (const testYolu of testler)
        for (const u of bakIthal(testYolu)) {
          if (/\.ts$/.test(u)) tsIthal.push(path.basename(testYolu) + ' -> ' + u);
          const cozulen = path.join(path.dirname(testYolu), u);
          for (const v of bakIthal(cozulen))
            if (/\.ts$/.test(v)) tsIthal.push(path.basename(u) + ' -> ' + v);
        }
      let ciktiMetni = '', gecti = false;
      try {
        ciktiMetni = execFileSync(process.execPath,
          ['--test', ...testler],
          { encoding: 'utf8', cwd: __dirname });
        gecti = /# fail 0/.test(ciktiMetni) || /\bfail 0\b/.test(ciktiMetni);
      } catch (e) {
        ciktiMetni = (e.stdout || '') + (e.stderr || '');
        gecti = false;
      }
      const ge = (ciktiMetni.match(/pass (\d+)/) || [, '0'])[1];
      const ka = (ciktiMetni.match(/fail (\d+)/) || [, '?'])[1];
      ol('T1 · sektor para aritmetigi testleri geciyor (+ .ts ithali yok)',
         gecti && tsIthal.length === 0,
         tsIthal.length ? 'Node 20 .ts acamaz: ' + tsIthal.join(' ')
                        : `${ge} gecti · ${ka} kaldi`);
    }

    /* H20 · SEKTOR PANOSU ICERIGI ham HTML'de tam — KOSULLU.
       Eski tarafta secici de pano da BOS kaptı (`#secBox`, `#skGrid`,
       `#skCh`, `#skQ`, `#skAct`) ve hepsini JS dolduruyordu: bot alti
       sektorun HICBIRINI gormuyordu. Yeni tarafta altisi da HTML'de
       dogar ve gecis saf CSS'tir. Kural bunu kilitler: her sektorun ADI,
       BASLIGI, TIPIK TALEBI ve ILK 30 GUN maddeleri ham HTML'de olmali,
       ayrica sektor sayisi content.json ile ortusmeli. */
    if (/class="sse-sahne"/.test(h)) {
      const c5 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
      const sek = c5.sectors || [];
      const coz = (t) => String(t).replace(/<[^>]+>/g, '')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ');
      const T5 = (v) => (typeof v === 'string' ? v : (v && (v.tr || v.en)) || '');
      const bolum = h.slice(h.indexOf('class="sse-sahne"'));
      const ham = bolum.slice(0, bolum.lastIndexOf('</section>'));
      const metin = coz(ham);
      const kusur = [];
      const pano = (ham.match(/class="sse-pano /g) || []).length;
      if (pano !== sek.length) kusur.push(`pano ${pano} != sektor ${sek.length}`);
      for (const x of sek) {
        if (!metin.includes(coz(T5(x.n)).trim())) kusur.push(x.k + ':ad-yok');
        const bas = (x.head && (x.head.tr || x.head.en)) || [];
        if (bas[0] && !metin.includes(coz(bas[0]).trim())) kusur.push(x.k + ':baslik-yok');
        const q = (x.q && (x.q.tr || x.q.en)) || [];
        if (q[0] && !metin.includes(coz(q[0]).trim())) kusur.push(x.k + ':talep-yok');
        const act = (x.act && (x.act.tr || x.act.en)) || [];
        for (const a of act)
          if (!metin.includes(coz(a).trim())) { kusur.push(x.k + ':is-yok'); break; }
      }
      ol(`H20 · sektor panosu ham HTML'de tam (${sek.length} sektor)`,
         kusur.length === 0, kusur.slice(0, 3).join(' '));
    }

    /* H21 · TESPIT ARACI: form + sonuc iskeleti ham HTML'de, ISKELE
       SIZINTISI yok — KOSULLU.
       Iki sey olculur:
       (a) Anayasa'nin sarti: "form ve sonuc iskeleti STATIK HTML" — yani
           halka, skor, kunye ve izgara kaplari JS'siz de sayfada olmali.
           JS yalniz deger yazar; yapiyi kurarsa bot bos gorur.
       (b) `strings.tr.dgh` content.json'da BOZUK: eski istemci harf-harf
           dusme iskelesini (span.lt + i[--k]) verinin icine geri yazmis,
           ustelik iki kez ic ice (2.825 bayt / 31 karakter). Bilesen
           ayikliyor; kural o ayiklamanin calistigini kilitler — iskele
           ciktiya sizarsa kullanici ham HTML okur (19 Agu'da ekran
           goruntusunde goruldu). */
    if (/class="ste-sahne"/.test(h)) {
      const kusur = [];
      const bolum = h.slice(h.indexOf('class="ste-sahne"'));
      const ham = bolum.slice(0, bolum.indexOf('</section>'));
      for (const [ad, desen] of [
        ['form', /<form[^>]*id="steForm"/], ['giris', /id="steUrl"/],
        ['dugme', /id="steGo"/], ['durum', /id="steDurum"/],
        ['sonuc-kabi', /id="steSonuc"/], ['halka', /id="steYay"/],
        ['skor', /id="steSkor"/], ['izgara', /id="steIzgara"/],
      ]) if (!desen.test(ham)) kusur.push(ad + '-yok');
      /* iskele sizintisi: ne etiket olarak ne de kacmis metin olarak.
         GENISLETME (21 Agu, giydirme turu B3): basligin harfleri artik
         DERLEMEDE uretiliyor (`<span class="ste-lt"><i style="--k:N">`)
         ve mesru. Kural gevsemedi, AYIRT EDIYOR: once mesru harf kalibi
         cikarilir, KALANDA `--k` gorunurse iskele sizmistir. Eski
         iskelenin kendi sinifi (`lt`, `ste-lt` DEGIL) ve kacmis metin
         hali oldugu gibi kirmizi. */
      const mesruHarf = /<span class="ste-lt"[^>]*><i style="--k:\d+"[^>]*>[\s\S]*?<\/i><\/span>/g;
      const kalan = ham.replace(mesruHarf, '');
      if (/class="lt"/.test(ham) || /&lt;span class=&#34;lt&#34;/.test(ham) ||
          /--k:\s*\d/.test(kalan)) kusur.push('harf-iskelesi-sizmis');
      /* aria-live: sonuc ekran okuyucuya duyurulmali */
      if (!/aria-live="polite"/.test(ham)) kusur.push('aria-live-yok');
      ol("H21 · tespit araci: form + sonuc iskeleti statik, iskele sizintisi yok",
         kusur.length === 0, kusur.slice(0, 3).join(' '));
    }

    /* H22 · SOZ BANDI KAPISI — Anayasa'nin bu sahneye dusen cumlesi
       KURALA cevrildi: "`testi.on` bayragi ... kapaliyken bolum
       DERLEMEDE HIC BASILMAZ (eski `display:none` cozumu ham HTML'de
       uydurma sozleri botlara gosteriyordu)".
       IDDIA OLCULDU (19 Agu): canli kok sayfa cekildi, ham HTML'inde
       ucundan birincisi arandi — VARDI. Yani eski tarafta bant CSS ile
       gizliyken metin sayfada duruyor. Kaynagin kendi yorumu sozlerin
       UYDURMA oldugunu yaziyor.
       Kural iki yonlu:
         bayrak KAPALI  -> hicbir sayfada soz metni ve .ssb- bolumu YOK
         bayrak ACIK    -> bant basili ve sozlerin metni ham HTML'de VAR
       Boylece "acilinca calisiyor mu" da olculur, kural tek yone
       calisan bir yasak olmaz. */
    {
      const c6 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
      /* TUR 5 (2 Eyl 2026): bayragin gercek yuvasi panelin yazdigi theme.testi
         (admin.html sw 'theme.testi.on'); settings.testi yalniz yedek. Kural
         settings'i okurken bayrak acilinca yanlis kirmizi verdi (panel-kapi). */
      const bayrak = !!(((c6.theme || {}).testi || (c6.settings || {}).testi || {}).on);
      const T6 = (v) => (typeof v === 'string' ? v : (v && (v.tr || v.en)) || '');
      /* Bant yalniz SOZU VE UNVANI olan kaydi basar (SSBSozBandi: "yarim kayit
         banda cikmaz"); kural da ayni suzgeci uygular — unvansiz kaydin metni
         acikken aranmaz (TUR 5: rol bos kayit yanlis kirmizi verdi). */
      const sozler = (c6.testimonials || [])
        .filter(x => T6(x.role).trim())
        .map(x => T6(x.q).trim()).filter(Boolean);
      /* Karsilastirma COZULMUS metinle: sozlerde tirnak var ve HTML'de
         `&quot;` olarak duruyor; ham karsilastirma yanlis kirmizi verir
         (bu kural ilk yazildiginda tam bunu yapti, acik-bayrak denemesi
         yakaladi). Etiketler atilir, varliklar cozulur — bot da metni
         boyle gorur. */
      const coz6 = (t) => String(t).replace(/<[^>]+>/g, '')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ');
      const kusur = [];
      const bandVar = sayfalar.filter(p2 => /class="ssb-sahne"/.test(oku(p2)));
      if (!bayrak) {
        if (bandVar.length) kusur.push('kapaliyken bant basili: ' + rel(bandVar[0]));
        for (const p2 of sayfalar) {
          const g = coz6(oku(p2).replace(/<script[\s\S]*?<\/script>/g, ''));
          for (const q of sozler)
            if (g.includes(coz6(q).slice(0, 40))) { kusur.push('kapaliyken soz metni: ' + rel(p2)); break; }
        }
      } else {
        if (!bandVar.length) kusur.push('acikken bant basilmamis');
        /* TUR 5: bandVar[0] EN ana sayfa cikabiliyor (dizin sirasi) ve orada
           TR sozler yok — yanlis kirmizi. Butun bant sayfalarina birlikte bakilir. */
        const ana2 = bandVar.map(p2 => coz6(oku(p2))).join(' ');
        for (const q of sozler)
          if (!ana2.includes(coz6(q).slice(0, 40))) { kusur.push('acikken soz metni yok: ' + coz6(q).slice(0, 24)); break; }
      }
      ol(`H22 · soz bandi kapisi (bayrak ${bayrak ? 'ACIK' : 'KAPALI'})`,
         kusur.length === 0,
         kusur.slice(0, 2).join(' ') || `${sozler.length} soz · ${bandVar.length} sayfada bant`);
    }

    /* S2 · ANA SAYFA SEMA PARITESI (madde 5: "rota basina JSON-LD tur
       kumesi eski = yeni diff'lenir; fark kirmizidir"). Tur kapanisinda
       OLCULDU: eski ana sayfa @graph'i Organization + WebSite + WebPage
       tasiyor, yenide HIC yoktu. Kural o uclunun varligini VE #org
       kimliginin degismezligini (kural 107) kilitler. */
    {
      const kusur = [];
      const semalar = [];
      for (const m of h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
        try { semalar.push(JSON.parse(m[1])); } catch (e) { kusur.push('sema-parse-hatasi'); }
      }
      const dugumler = semalar.flatMap(x => x['@graph'] || [x]);
      const turler = new Set(dugumler.flatMap(n => [].concat(n['@type'] || [])));
      for (const t of ['Organization', 'WebSite', 'WebPage'])
        if (!turler.has(t)) kusur.push(t + '-yok');
      const org = dugumler.find(n => n['@id'] === KONAK + '/#org');
      if (!org) kusur.push('#org-kimligi-yok');
      else if (!org.description || !(org.knowsAbout || []).length) kusur.push('#org-govdesi-eksik');
      ol('S2 · ana sayfa semasi: Organization+WebSite+WebPage + #org govdesi',
         kusur.length === 0, kusur.slice(0, 3).join(' ') || `${turler.size} tur`);
    }

    /* H25 · ORGANIZATION.sameAs PANELDEN (gece zinciri TUR 6, 2 Eyl 2026).
       Kaynak content.json socials[].url (panel Kurucu > Footer sosyal medya).
       Iki yon: liste doluysa sema ayni siralamayla ayni adresleri tasir;
       bossa `sameAs: []` (uydurma adres girmez, alan da silinmez). */
    {
      const c7 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
      const beklenen = (c7.socials || []).map(x => x && x.url).filter(Boolean);
      let org7 = null;
      for (const m of h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
        try { const j = JSON.parse(m[1]); org7 = (j['@graph'] || [j]).find(n => n['@id'] === KONAK + '/#org') || org7; } catch (e) {}
      }
      const olan = org7 && Array.isArray(org7.sameAs) ? org7.sameAs : null;
      ol(`H25 · Organization.sameAs = panel socials (${beklenen.length} adres${beklenen.length ? '' : ' → []'})`,
         !!olan && JSON.stringify(olan) === JSON.stringify(beklenen),
         olan ? `sema ${olan.length} · panel ${beklenen.length}` : 'sameAs dizisi yok');
    }

    /* H23 · PERDE SOZLESMESI — KOSULLU (perde yoksa olcecek sey yok).
       Anayasa'nin dort sarti olculebilir kalemlere cevrildi:
         a) icerigi BEKLETMEZ: perde `pointer-events:none` tasir ve eski
            `overflow:hidden` kaydirma kilidi (html.booting) ciktida HIC
            gecmez — kilit geri gelirse kirmizi.
         b) dokunma/kaydirma IPTAL EDER: kapi betiginde pointerdown ve
            wheel dinleyicileri olmali (scroll dinleyicisi degil — H12).
         c) oturumda BIR KEZ: sessionStorage anahtari betikte olmali.
         d) guvenlik: kosulsuz kaldirma zamanlayicisi olmali — betik
            nerede patlarsa patlasin sayfa acik kalir (eski kaynagin
            kendi dersi, 4610).
       Ayrica: perde varsayilan GIZLI dogmali (`html:not(...)` kurali) —
       gorunurluk karari betiginse, betik kosmadan perde gorunmemeli. */
    if (/class="sus-perde"/.test(h)) {
      const kusur = [];
      if (!/class="sus-perde"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*class="sus-perde"/.test(h)
          && !/<div class="sus-perde" id="perde" aria-hidden="true">/.test(h))
        kusur.push('aria-hidden-yok');
      if (!/html:not\(\.prd\)\s*\.sus-perde\{display:none\}/.test(css))
        kusur.push('varsayilan-gizli-degil');
      /* butun .sus-perde bloklarini tara (ilki `display:none` yedegi) */
      if (!(css.match(/\.sus-perde\{[^}]*\}/g) || []).some(b => /pointer-events:\s*none/.test(b)))
        kusur.push('pointer-events-none-yok');
      if (/overflow\s*:\s*hidden/.test((css.match(/html\.[a-z-]+(,[^{]*)?\{[^}]*\}/g) || [])
          .filter(k => /booting|prd/.test(k)).join('')))
        kusur.push('kaydirma-kilidi-geri-gelmis');
      /* kapi betigi: satir ici script'lerde ara */
      let kapi = '';
      for (const m of h.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g))
        if (!/application\/ld\+json/.test(m[1]) && /perde/.test(m[2])) kapi += m[2];
      if (!/sessionStorage/.test(kapi)) kusur.push('oturum-kapisi-yok');
      if (!/pointerdown/.test(kapi) || !/wheel/.test(kapi)) kusur.push('etkilesim-iptali-yok');
      if (!/setTimeout\(kaldir,\s*\d{4}\)/.test(kapi)) kusur.push('guvenlik-zamanlayicisi-yok');
      ol('H23 · perde sozlesmesi (bekletmez · iptal edilir · oturumda bir kez · guvenlikli)',
         kusur.length === 0, kusur.slice(0, 3).join(' '));
    }

    /* H3 · sahne bütçesi: ana sayfa toplam JS ≤ 50 KB (bugünkü kökte 496 KB).
       Ölçü: dış src dosyaları + ld+json dışı satır içi gömüler. */
    {
      const TAVAN = 50 * 1024;
      let toplam = 0;
      for (const m4 of h.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/g)) {
        const dosya = path.join(KOK, m4[1].replace(/^\/(?:yeni\/)?/, ''));
        if (fs.existsSync(dosya)) toplam += fs.statSync(dosya).size;
      }
      for (const m4 of h.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g))
        if (!/application\/ld\+json/.test(m4[1])) toplam += Buffer.byteLength(m4[2]);
      ol(`H3 · ana sayfa toplam JS ≤ ${TAVAN} B`, toplam <= TAVAN && toplam >= 0,
         `ölçülen ${toplam} B`);
    }

    /* H4 · süs/kimlik ayrımı: cihaz-yeteneği medya blokları (pointer/
       width) animation:none'ı yalnız .sus- önekli süs sınıflarına
       basabilir; bileşen kimliği her cihazda yaşar. prefers-reduced-motion
       kullanıcı TERCİHİDİR, istisna. */
    {
      const kusur = [];
      for (const m5 of css.matchAll(/@media([^{]*)\{((?:[^{}]*\{[^}]*\})*)\}/g)) {
        if (/prefers-reduced-motion/.test(m5[1])) continue;
        if (!/pointer|hover|max-width|min-width/.test(m5[1])) continue;
        for (const r of m5[2].matchAll(/([^{}]+)\{([^}]*)\}/g))
          if (/animation\s*:\s*none/.test(r[2]) && !/(^|[\s,.])sus-/.test(r[1]))
            kusur.push(r[1].trim().slice(0, 40));
      }
      ol('H4 · süs/kimlik ayrı: cihaz kısıtı yalnız .sus- söndürür',
         kusur.length === 0, kusur.slice(0, 3).join(' | '));
    }

    /* fontlar: yalnız kendi alandan (F1 zaten üçüncü partiyi yasaklıyor);
       burada marka fontunun GERÇEKTEN yerelden geldiği kilitlenir. */
    {
      const yuzler = [...css.matchAll(/@font-face\{[^}]*src:url\(([^)]+)\)/g)].map(m => m[1]);
      const yerel = yuzler.length > 0 && yuzler.every(u => u.startsWith('/font/'));
      const dosyalar = yuzler.every(u =>
        fs.existsSync(path.join(KOK, u.replace(/^\/(?:yeni\/)?/, ''))));
      ol('F1b · marka fontları kendi alandan + dosyalar diskte',
         yerel && dosyalar, `${yuzler.length} yüz`);
    }
  }
}


/* ============================================================
   22 AGU · /hizmetler YAN YANA TURUNUN KURALLARI
   Dordu de bu turda GERCEKTEN kirmizi donen kusurlardan dogdu;
   hicbiri "olmasi guzel" degil, hepsi olculmus bir sapmanin bekcisi.
   ============================================================ */

/* R9 · TOKEN SADAKATI. Bu turda dort taban token ve govde tipografisi
   kaynaktan sapmis bulundu (--tx #f5f5f5 yerine #ffffff, --tx2 .72
   yerine .62, --line .1 yerine .08, --card #101010 yerine #0D0D0D,
   govde 16px/1.65 yerine 16,5px/1.66) ve --card2 HIC tanimlanmamisti
   (ProjeGovde `.step:hover`ta onu cagiriyor, kural sessizce oluydu).
   Bunlar tek sayfanin degil BUTUN kabugun kusuruydu; kural kaynagi
   TARAYIP kiyasliyor, sabit liste tutmuyor. */
{
  const kaynak = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const kokBlok = (metin) => {
    const i = metin.indexOf(':root{');
    return i < 0 ? '' : metin.slice(i, metin.indexOf('}', i));
  };
  /* Kaynak :root'u yorumlu; deger okunurken yorumlar ayiklanir
     (kural yazimi dersi: yorum icindeki metin deger sanilmasin). */
  const temizle = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
  const tokenler = (t) => {
    const o = {};
    for (const m of temizle(t).matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+)/g))
      o[m[1]] = m[2].trim().toLowerCase().replace(/\s+/g, '');
    return o;
  };
  const K = tokenler(kokBlok(kaynak));
  const stil = fs.readFileSync(path.join(__dirname, 'src', 'stil', 'temel.css'), 'utf8');
  const Y = tokenler(kokBlok(stil));
  /* AILE ADLARI BILINCLI FARKLI (Anayasa 1.4: Inter/Manrope EMEKLI) —
     kiyas yalnizca RENK ve OLCU tokenlarinda. */
  const BAKILAN = ['bg', 'ink', 'card', 'card2', 'line', 'line2', 'red', 'red-soft',
                   'red-dim', 'red-glow', 'tx', 'tx2', 'tx3', 'tx4', 'gut', 'e', 'e2'];
  const kusur = [];
  for (const t of BAKILAN) {
    if (K[t] === undefined) continue;              /* kaynakta yoksa konu degil */
    if (Y[t] === undefined) { kusur.push('--' + t + ':TANIMSIZ'); continue; }
    /* BICIM DEGIL DEGER: `.50` ile `.5`, `#ffffff` ile `#fff` ayni
       renktir. Kural yazimi dersi — bicim farki kirmizi donerse kural
       gurultu uretir ve bir sure sonra kimse bakmaz. */
    const denk = (v) => v
      .replace(/#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3\b/g, '#$1$2$3')
      .replace(/(^|[^0-9])0?\.([0-9]*?)0+(?=[^0-9]|$)/g, '$1.$2')
      .replace(/(^|[^0-9])\.([0-9]+)/g, '$10.$2');
    const a = denk(K[t]), b = denk(Y[t]);
    if (a !== b) kusur.push('--' + t + ': kaynak ' + K[t] + ' ≠ yeni ' + Y[t]);
  }
  /* govde tipografisi: kaynak 198-200 */
  const gov = (stil.match(/body\{[^}]*\}/) || [''])[0].replace(/\s+/g, '');
  if (!/font-size:16\.5px/.test(gov)) kusur.push('body font-size ≠ 16.5px');
  if (!/line-height:1\.66/.test(gov)) kusur.push('body line-height ≠ 1.66');
  const bas = (stil.match(/h1,h2,h3,h4,h5\{[^}]*\}/) || [''])[0].replace(/\s+/g, '');
  if (!/letter-spacing:-\.045em/.test(bas)) kusur.push('baslik letter-spacing ≠ -.045em');
  if (!/line-height:1\.04/.test(bas)) kusur.push('baslik line-height ≠ 1.04');
  ol('R9 · token sadakati: kabuk :root kaynagin :root\'uyla ayni',
     kusur.length === 0, kusur.slice(0, 4).join(' · ') || BAKILAN.length + ' token');
}

/* R10 · /hizmetler BENTO. Goc turu bu sayfayi tek sutun listeye
   sadelestirmisti; kaynak dort sutunluk bir bento (1169-1181) ve her
   kartta numara + ikon + baslik + metin + "Incele" var, tam BIR kart
   vurgulu (panelin `hi` bayragi). Kural sayfayi HAM HTML'den olcer. */
{
  const kusur = [];
  for (const rota of ['hizmetler/index.html', 'en/hizmetler/index.html']) {
    const dosya = path.join(KOK, rota);
    if (!fs.existsSync(dosya)) { kusur.push(rota + ':sayfa-yok'); continue; }
    const h = oku(dosya);
    if (!/class="[^"]*\bbento\b/.test(h)) kusur.push(rota + ':bento-yok');
    const kart = (h.match(/class="[^"]*\bcard\b[^"]*"/g) || []).length;
    if (kart !== 9) kusur.push(rota + ':kart=' + kart);
    for (const [ad, re] of [['num', /class="num"/g], ['ic', /class="ic"/g],
                            ['svgo', /class="svgo"/g]]) {
      const n = (h.match(re) || []).length;
      if (n !== 9) kusur.push(rota + ':' + ad + '=' + n);
    }
    const vurgu = (h.match(/<li class="[^"]*\bhi\b/g) || []).length;
    if (vurgu !== 1) kusur.push(rota + ':vurgulu-kart=' + vurgu);
    if (!/class="pgback"/.test(h)) kusur.push(rota + ':pgback-yok');
    if (!/class="mono"/.test(h)) kusur.push(rota + ':kunye-seridi-yok');
    if (!/class="cnt"/.test(h)) kusur.push(rota + ':sayac-yok');
    if (!/<main[^>]*\bclass="genis"/.test(h)) kusur.push(rota + ':govde-sutunu-dar');
  }
  ol('R10 · /hizmetler: dokuz bento karti + kunye + tek vurgulu kart',
     kusur.length === 0, kusur.slice(0, 4).join(' '));
}

/* R11 · HIZMET DETAYI. Ayni turda olculen dort eksik: geri bagi,
   kunye seridi (`#sdTag`), kaynagin ALTI genisleyen karti (`sdGrid`
   7586-7606) ve IKI dugmeli cagri (`sdCta` 7608-7621). Uc vurusun
   sahneden SONRA gelmesi de kaynagin sirasi (SDT haritasi). */
{
  const kusur = [];
  /* Panelin WhatsApp numarasi — asagidaki cagri kurali KOSULLU (bkz. yorum).
     Okunamazsa numara VAR sayilir: kural gevsemesin. */
  const WA_VAR = (() => {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
      return !!String((c.settings || {}).whatsapp || '').replace(/[^0-9]/g, '');
    } catch (e) { return true; }
  })();
  /* TUR 9 (3 Eyl 2026): rota /hizmet/ -> /hizmetler/ (kesme mayini, R8c).
     Bu kural, R1 ve H19 yolu SABIT tasiyordu ve yeniden adlandirmada
     kirmiziya dustu — dogru davranis; uc kural birlikte cogula alindi. */
  const detaylar = sayfalar.filter(p => /(^|\/)(en\/)?hizmetler\/[^/]+\/index\.html$/
    .test(rel(p)));
  if (detaylar.length !== 18) kusur.push('detay-sayfasi=' + detaylar.length);
  for (const p of detaylar) {
    const h = oku(p), r = rel(p);
    if (!/class="pgback"/.test(h)) kusur.push(r + ':pgback-yok');
    if (!/class="mono"/.test(h)) kusur.push(r + ':kunye-yok');
    if (!/<main[^>]*\bclass="genis"/.test(h)) kusur.push(r + ':govde-sutunu-dar');
    const xc = (h.match(/<details class="xc"/g) || []).length;
    if (xc !== 6) kusur.push(r + ':genisleyen-kart=' + xc);
    /* Sinif GOVDESINDE aranir, tam esitlikle degil: kap `sdsec sdhits`
       tasiyor ve Astro kapsam nitelikleri de ekleniyor. */
    if (!/class="[^"]*\bsdhits\b/.test(h)) kusur.push(r + ':uc-vurus-yok');
    /* SIRA: sahne bloklari uc vurustan ONCE. Sahnesiz hizmet yok. */
    const iV = h.search(/class="[^"]*\bsdhits\b/);
    const iS = h.search(/class="(hn|ak|cl|ai|st|qt|mk)[a-z-]*sahne|class="[a-z]*stage/);
    if (iV > 0 && iS > 0 && iS > iV) kusur.push(r + ':vurus-sahneden-once');
    const dugme = (h.match(/class="[^"]*\bsdbtns\b[\s\S]{0,3000}?<\/section>/) || [''])[0];
    /* CAGRI DUGMELERI KOSULA BAGLI (TUR 4, 4 Eyl 2026 — PANEL KAPISI).
       Ikinci dugme WhatsApp dugmesidir ve numara PANELDEN BOSALTILABILIR;
       kural "her zaman iki dugme" derse Enes numarayi silince deploy
       denetimi kirmiziya doner (olculdu: dokuz hizmet sayfasi x TR/EN).
       KURAL GEVSEMEDI, KOSULLU OLDU ve iki yonu birden tutar: numara
       DOLUYSA iki dugme SART; BOSSA en az bir dugme olmali VE wa.me bagi
       basilmamis olmali (bos numarayla 'https://wa.me/?text=' basmak
       sessiz kusurdur). */
    const dugmeSayi = (dugme.match(/<a\s/g) || []).length;
    if (WA_VAR) { if (dugmeSayi < 2) kusur.push(r + ':cagri-tek-dugme'); }
    else {
      if (dugmeSayi < 1) kusur.push(r + ':cagri-dugmesi-yok');
      if (/wa\.me\//.test(dugme)) kusur.push(r + ':bos-numarayla-wa-bagi');
    }
  }
  ol('R11 · hizmet detayi: geri bagi + kunye + alti genisleyen kart + iki dugme',
     kusur.length === 0, kusur.slice(0, 4).join(' '));
}

/* ---- R23 · GIRIS SOKUMU KALICI (2 Eyl 2026, Enes) --------------------
   Karar zinciri: 1-2 Eyl gece "logonun nav'a yukselme kismini cikart"
   ile giris sahnesi SAYFADAN cikti, kod ve kurallar uykuya alindi.
   2 Eyl talimati sokumu KALICILASTIRDI: amblem prologu (PRDag +
   gl/halka/isci/metal/paralaks/tani zinciri + ada betigi), nav'a oturma
   rampasi ve olcum duzenegi KAYNAKTAN cikti; sayfa direkt videoyla
   baslar, yukleme tamponu amblemsiz motorda (motor.ts basligi).

   KURAL SAYISI BILINCLI DUSTU (talimat sarti: "dusus yazilir"):
   57 -> 54. Dokuz kural silindi, bir kural (bu) eklendi:
     - R12/R14/R15/R16/R18 (uykudaydi, sayilmiyordu) - konusu URETILEN
       SAYFAydi: prolog sozlesmesi, A-yaklasimi kalitesi, yedek yol x2,
       durak 2. Sayfada olculecek seyleri kalmadi.
     - R17/R20/R21/R22 (calisiyordu, -4) - konusu KAYNAK DOSYAydi:
       takip sozlesmesi, zaman surucusu, amblem SDF, olcum araligi.
       Kaynak silinince olctukleri sey yok.
   ISTISNALAR: R19 nav logosu YASIYOR - logo `src/prolog/amblem.json` +
   `amblem-sdf.py` uzaklik alanindan uretiliyor ve nav sitede kaldi;
   uretim zinciri sokumden MUAF (src/prolog/ bu yuzden TEK dosyayla
   durur). R13 (kesme adayi) prologla ilgisiz, yerinde.

   Kural iki yonlu tutar:
   (a) KAYNAK - sokulenler geri dogmasin: src/prolog'da amblem.json
       disinda dosya yok; PRDag.astro, stil/prolog.css, prolog-katman.py,
       prolog-derinlik.py, public/img/prolog, public/prototip/giris,
       film/olc-rampa.cjs diskte YOK.
   (b) CIKTI - uretilen hicbir sayfada (prototipler dahil)
       `<section class="pr"` / `PRDag` / `prolog-ada` / `img/prolog`
       gecmez; dist varliklarinda prolog-ada parcasi yok.

   KIRMIZI-ONCE KANITI (2 Eyl): kural sokumden ONCE yazildi ve dosyalar
   diskteyken adiyla kirmizi yandi (duruyor:src/sahneler/PRDag.astro ...);
   sokum yesile cevirdi. */
{
  const kusur = [];
  const yok = (...p) => {
    if (fs.existsSync(path.join(__dirname, ...p))) kusur.push('duruyor:' + p.join('/'));
  };
  yok('src', 'sahneler', 'PRDag.astro');
  yok('src', 'stil', 'prolog.css');
  yok('prolog-katman.py');
  yok('prolog-derinlik.py');
  yok('public', 'img', 'prolog');
  yok('public', 'prototip', 'giris');
  yok('film', 'olc-rampa.cjs');
  const pd = path.join(__dirname, 'src', 'prolog');
  if (fs.existsSync(pd)) {
    const fazla = fs.readdirSync(pd).filter((a) => a !== 'amblem.json');
    if (fazla.length) kusur.push('src-prolog-fazla:' + fazla.slice(0, 3).join(','));
  } else kusur.push('src-prolog-yok(amblem.json-R19-girdisi)');
  for (const p of tumSayfalar) {
    const h = oku(p);
    for (const iz of ['<section class="pr"', 'PRDag', 'prolog-ada', 'img/prolog'])
      if (h.includes(iz)) { kusur.push('sayfada:' + iz + '@' + rel(p)); break; }
  }
  const varlikDizin = path.join(KOK, '_astro');
  if (fs.existsSync(varlikDizin))
    for (const a of fs.readdirSync(varlikDizin))
      if (/prolog-ada/.test(a)) kusur.push('varlikta:' + a);
  ol('R23 · giris sokumu kalici: kaynakta ve ciktida amblem/rampa kalintisi yok (R19 logo zinciri muaf)',
     kusur.length === 0, kusur.slice(0, 4).join(' '));
}
/* R13 · KALDIRILAN BOLUMLER GERI GELMEZ. Tarihce: 21 Agu talimati dort
   bolumu (katman, akis, sektor+panel, kanal izgarasi) "isaretle, kaldirma"
   diyordu ve kural her ikisini bekliyordu. 3 Eyl 2026 (TUR 9): prolog
   kapandi, Enes "kaldir" dedi ve eski duzene donuldu (hero → serit →
   projeler → tespit → soz bandi → kurucu → iletisim). Dort bolum ve
   eskide olmayan dort anlati sahnesi ana sayfadan cikti; kural artik
   YOKLUKLARINI tutar. Dosyalar bir sonraki temizlik commit'inde silinir
   (kullanim taramasiyla: pano.js/hesap.mjs yalniz sektor panosunun
   miydi?). */
{
  /* Sahnenin KOKU aranir (`<section class="xx-sahne">`), gecici bir alt
     sinif degil: bolum gercekten kalkarsa kok de kalkar, tek bir ic
     dugumun adi degisirse kural gurultu uretmez. */
  /* TUR 9 (3 Eyl 2026): Enes'in "kaldir" sozu geldi (TUR9 belgesi: "R13'teki
     dort bolum kalkiyor", sorulup yeniden onaylandi). Kural TERS DONDU:
     dort bolumun hicbiri TR ve EN ana sayfada basilmaz; biri geri gelirse
     kirmizi. Eskide olmayan dort anlati sahnesi (S2/S3/S5/S6) de ayni
     kararla ana sayfadan cikti; onlar da burada denetlenir. */
  /* 3 Eyl aksam (Enes, onizleme geri bildirimi): "eski kok siteyi birebir
     al, yalniz dedigim kalemleri cikar" — dort bolum GERI GELDI. Kural artik
     ESKI DUZEN SIRASINI tutar: kok index.html'in bolum sirasi (hero, serit,
     projeler, katman, akis, sektor, tespit, kanal izgarasi, [soz bandi:
     bayrak], kurucu, iletisim). Anlati sahneleri (S2/S3/S5/S6) yok. */
  const ESKI = ['sh', 'st', 'sp', 'sk', 'sa', 'sse', 'ste', 'ssz', 'sku', 'sil'];
  const kusur = [];
  for (const p of [path.join(KOK, 'index.html'), path.join(KOK, 'en', 'index.html')]) {
    if (!fs.existsSync(p)) { kusur.push(rel(p) + ':yok'); continue; }
    const h = oku(p);
    const sira = [...h.matchAll(/<section class="([a-z]+)-sahne/g)].map((m) => m[1]).filter((k) => k !== 'ssb');
    if (sira.join(',') !== ESKI.join(',')) kusur.push(rel(p) + ':sira ' + sira.join(',') + ' ≠ ' + ESKI.join(','));
    const anlati = (h.match(/data-sahne="[2356]"/g) || []).length;
    if (anlati) kusur.push(rel(p) + ':anlati-sahnesi:' + anlati);
  }
  ol('R13 · ana sayfa bolum sirasi = kok index.html (10 bolum, soz bandi bayrakli), anlati sahnesi yok (TR+EN)',
     kusur.length === 0, kusur.slice(0, 2).join(' ') || ESKI.join(' → '));
}


/* R19 - NAV LOGOSU URETILIYOR, ELDE TASINMIYOR (23 Agu).
   24 AGU: uretec `amblem-sdf.py` oldu, kaynak `src/prolog/amblem.json` -
   nav logosu amblemle AYNI uzaklik alanindan cikiyor. Olculdu (29 px):
   eski rasterle XOR %1,8, agirlik merkezi farki 0,06/0,08 px, medyan L
   80,8 -> 80,2 (tam --red). Dort sart aynen duruyor.
   Varlik `logo-uret.py` ile uretilir: girdi depodaki seffaf kaynak
   (`gorsel-kaynak/prolog/QANAT_LOGO-seffaf-2.png`), kizil ise
   `temel.css`teki `--red`. Uretec `src/veri/logo-kunye.json`e girdi ve
   ciktilarin SHA1'ini, olcusunu ve OLCULEN renk gerceklerini yaziyor;
   kural o kunyeyi dosyalarin gercegiyle kiyasliyor. Boylece denetimin
   webp cozmesi gerekmiyor - Netlify'da ne Python var ne de garanti bir
   goruntu kutuphanesi.
   Dort sey tutuluyor:
     (a) girdi, uretec ve ciktilar yerinde; hash'ler tutuyor - varlik
         elle degistirilmis ya da kaynaktan kopmus olamaz;
     (b) uretec kizili OKUYOR, gomulu bir hex yazmiyor. Bu turun sebebi
         tam buydu: nav'da uc ayri kizil yan yana duruyordu (amblem
         `--red`, logo rasteri rgb(168,1,3), QANAT yazisi `--red-soft`)
         ve amblem nava otururken devir -15,9 birimlik bir parlaklik
         kirilmasiyla kapaniyordu;
     (c) kunyedeki kizil `--red`in kendisi ve olculen medyan govde tonu
         onun isikliligina esit; OPAK BEYAZ PIKSEL SIFIR - yeni varlikta
         ic alanlar beyaz degil delik ve amblem de o varsayimla ciziliyor;
     (d) sayfadaki `width`/`height` dosyanin gercek olcusuyle ayni,
         yoksa logo yerlesirken kayar. */
{
  const kusur = [];
  /* IKILI dosyalar icin ham bayt (webp/avif) — git bunlara dokunmaz. */
  const sha1 = (p) => require('crypto').createHash('sha1')
    .update(fs.readFileSync(p)).digest('hex');
  /* METIN dosyalari icin SATIR SONU NORMALIZE EDILIR (4 Eyl 2026).
     `core.autocrlf=true`: Windows calisma agacinda amblem.json CRLF
     (24.970 B), depoda ve Linux CI'da LF (24.506 B). Ham bayt hash'i bu
     yuzden PLATFORMA BAGLIYDI ve kunyeye Windows degeri yazilmisti:
     yerelde 68/0, CI'da `kunye-kaynaga-uymuyor` ile DEPLOY DUSTU.
     Ayni tuzak bu depoda daha once kur-medya/MEDYA kapisinda yasandi ve
     orada `\r` ayiklamasiyla cozuldu; R19 ayni muameleyi gormemisti.
     Uretec tarafi da (amblem-sdf.py) ayni normalizasyonu yapar — iki
     taraf ayni kurali kullanmazsa hash bir daha ayrisir. */
  const sha1Metin = (p) => require('crypto').createHash('sha1')
    .update(Buffer.from(fs.readFileSync(p, 'utf8').replace(/\r/g, ''))).digest('hex');
  const kyol = path.join(__dirname, 'src', 'prolog', 'amblem.json');
  const uyol = path.join(__dirname, 'amblem-sdf.py');
  const kunyeYol = path.join(__dirname, 'src', 'veri', 'logo-kunye.json');
  let K = null, olcu = null;

  if (!fs.existsSync(kunyeYol)) kusur.push('kunye-yok');
  else { try { K = JSON.parse(fs.readFileSync(kunyeYol, 'utf8')); }
         catch { kusur.push('kunye-bozuk'); } }

  /* KAYNAK ARTIK DEPODA (24 Agu): nav logosu amblemle AYNI SDF alanindan
     cikiyor ve alanin kaynagi `src/prolog/amblem.json` - Photoroom rasteri
     (gorsel-kaynak/, .gitignore'da) devreden cikti. Kaynak temiz klonda da
     var, yani varligi SART kosulabilir ve hash her yerde tutulur. */
  const kaynakVar = fs.existsSync(kyol);
  if (!kaynakVar) kusur.push('kaynak-yok');
  else if (K && sha1Metin(kyol) !== K.kaynak_sha1) kusur.push('kunye-kaynaga-uymuyor');

  if (!fs.existsSync(uyol)) kusur.push('uretec-yok');
  else {
    /* Yorumlari at: gerekce metninde gecen hex kurali yaniltmasin (H-kural). */
    const u = fs.readFileSync(uyol, 'utf8').replace(/"""[\s\S]*?"""/g, '').replace(/^\s*#.*$/gm, '');
    if (!/temel\.css/.test(u) || !/--red/.test(u)) kusur.push('uretec-kizili-okumuyor');
    if (/#[0-9a-fA-F]{6}['"]/.test(u)) kusur.push('uretec-kizili-gomulu');
  }

  /* (a) ciktilar ve hash'leri - IKI HAL (Enes, 24 Agu): `beyaz` (qanatone,
     ic disk + nehir beyaz, statik nav) ve `delik` (qanatone-delik, olcum
     varligi). Ikisi de kunyeden, ikisi de hash'li. */
  const HAL = (K && K.hal) || {};
  if (!HAL.beyaz || !HAL.delik) kusur.push('iki-hal-kunyesi-yok');
  for (const [hal, dosya] of [['beyaz', 'qanatone'], ['delik', 'qanatone-delik']]) {
    for (const u of ['webp', 'avif']) {
      const p = path.join(__dirname, 'public', 'img', dosya + '.' + u);
      if (!fs.existsSync(p)) { kusur.push('varlik-yok:' + hal + ':' + u); continue; }
      const bayt = fs.statSync(p).size;
      if (bayt > 40 * 1024) kusur.push('varlik-buyuk:' + hal + ':' + u + ':' + bayt);
      const hk = (HAL[hal] || {}).cikti || {};
      if (hk[u] && sha1(p) !== hk[u].sha1) kusur.push('varlik-kunyeye-uymuyor:' + hal + ':' + u);
    }
  }
  /* Eski SVG denemesi geri gelmesin. */
  if (fs.existsSync(path.join(__dirname, 'public', 'img', 'qanatone.svg')))
    kusur.push('svg-varyanti-geri-gelmis');

  /* (b,c) kizil paletten ve ic alanlar delik */
  if (K) {
    const temel = oku(path.join(__dirname, 'src', 'stil', 'temel.css'));
    const rm = temel.match(/--red\s*:\s*(#[0-9a-fA-F]{6})/);
    if (!rm) kusur.push('temel-css-red-yok');
    else if (rm[1].toLowerCase() !== String(K.kizil).toLowerCase())
      kusur.push('kunye-kizili-palete-uymuyor:' + K.kizil + '!=' + rm[1]);
    else {
      const h = rm[1].slice(1);
      const L = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16));
      const hedef = 0.2126 * L[0] + 0.7152 * L[1] + 0.0722 * L[2];
      if (Math.abs(K.medyan_L_sonra - hedef) > 1.5)
        kusur.push('kizil-eslenmemis:' + K.medyan_L_sonra + '!=' + hedef.toFixed(1));
    }
    /* (c) IKI HAL: delik halde opak beyaz SIFIR; beyaz halde beyaz VAR ve
       yalniz ic+nehir bolgesinde (uretecin maskeyle sayimi, disari 0). */
    if (HAL.delik && HAL.delik.opak_beyaz_piksel !== 0)
      kusur.push('delik-hal-beyaz-tasiyor:' + HAL.delik.opak_beyaz_piksel);
    if (HAL.beyaz && !(HAL.beyaz.opak_beyaz_piksel > 0))
      kusur.push('beyaz-hal-beyazsiz');
    if (HAL.beyaz && HAL.beyaz.beyaz_disari_piksel !== 0)
      kusur.push('beyaz-ic-disari-tasmis:' + HAL.beyaz.beyaz_disari_piksel);
    olcu = K.olcu;
  }

  /* (d) sayfadaki olcu dosyanin olcusu */
  if (olcu) {
    const ana = oku(path.join(KOK, 'index.html'));
    const m = ana.match(/qanatone\.webp[^>]*?width="(\d+)"[^>]*?height="(\d+)"/);
    if (!m) kusur.push('sayfada-olcu-yok');
    else if (+m[1] !== olcu[0] || +m[2] !== olcu[1])
      kusur.push('olcu-uyusmuyor:' + m[1] + 'x' + m[2] + '!=' + olcu.join('x'));
  }

  ol('R19 - nav logosu: uretilmis varlik + kizil paletten + iki hal (delik/beyaz ic)',
     kusur.length === 0,
     kusur.slice(0, 4).join(' ')
       || (K ? K.olcu.join('x') + ' · webp ' + (K.cikti.webp.bayt / 1024).toFixed(1)
            + ' KB · avif ' + (K.cikti.avif.bayt / 1024).toFixed(1) + ' KB · '
            + 'medyan L ' + K.medyan_L_once + '->' + K.medyan_L_sonra
            + ' · opak beyaz 0 · kaynak '
            + (kaynakVar ? 'hash tuttu' : 'depoda yok, atlandi')
          : 'kunye okunamadi'));
}

/* ---- FILM · scroll-scrub iskeleti (FM ailesi, 27 Agu) ----------------
   HIGGSFIELD-SCRUB-MOTORU.md §3 sert degismezleri + §7 butce kapisi + §8
   teslim listesi CIKTIDAN olculur. Kaynak sayilar uretim.json (uret.cjs)
   ve kanon.json (ffprobe); ikisi de "urettim" demekle degil sha1/bayt ile
   dist'teki dosyaya baglanir. */
/* TUR 9 (3 Eyl 2026): blok IIFE — icindeki `return` (girdi eksik dali)
   onceden MODULU bitiriyordu: FM2/K1/ozet/exit(1) kosmuyor, surec 0 ile
   cikiyordu. Olculdu: damga gizliyken `node yeni/denetim.cjs` EXIT=0.
   CI'da bu "deploy duser" degil "medyasiz site YESIL cikar" demekti. */
(() => {
  const crypto = require('crypto');
  const sha1 = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
  const sayfa = path.join(KOK, 'film', 'index.html');
  const kusur = [];
  let rapor = '';
  if (!fs.existsSync(sayfa)) kusur.push('film/index.html yok');
  else {
    const h = oku(sayfa);
    /* GIRDI KAPISI (31 Agu 2026) — OLCULDU: bu iki dosya yokken kural
       "sessizce gecmiyordu", DAHA KOTUSUNU yapiyordu: yakalanmamis ENOENT
       ile BUTUN suite cokuyordu (node yigin izi basip cikiyor). Yani temiz
       bir klonda denetim hic hukum vermiyordu. Artik eksik girdi TEMIZ
       KIRMIZI: kural kalir, sebebi adiyla yazilir.
       Kalici cozum ayrica: `yeni/film/` olcum dizini commit'lendi. */
    const kanonY = path.join(__dirname, 'src', 'film', 'kanon.json');
    const uretimY = path.join(__dirname, 'film', 'uretim.json');
    if (!fs.existsSync(kanonY)) kusur.push('kanon.json-yok');
    if (!fs.existsSync(uretimY)) kusur.push('uretim.json-yok (film olcum dizini eksik)');
    /* TUR 2c: medya kurulum kapisi — adim kosmamissa sebep ADIYLA
       kirmizi, "dosya-yok" yigini degil (temiz klon dersi). */
    if (!MEDYA.kuruldu) kusur.push(MEDYA.mesaj);
    if (kusur.length) { ol('FM1 · film iskeleti: girdi eksik', false, kusur.join(' ')); return; }
    const K = JSON.parse(fs.readFileSync(kanonY, 'utf8'));
    const U = JSON.parse(fs.readFileSync(uretimY, 'utf8'));
    const sahneler = [...h.matchAll(/<div class="fl-sahne[^"]*"([^>]*)>/g)].map((m) => m[1]);
    if (sahneler.length !== K.klip.length) kusur.push('sahne=' + sahneler.length);
    /* sira + sure toplami kanonla ayni */
    let toplam = 0;
    sahneler.forEach((a, j) => {
      if ((a.match(/data-n="(\d+)"/) || [])[1] !== String(j + 1)) kusur.push('sira:' + j);
      toplam += Number((a.match(/data-sure="([\d.]+)"/) || [, 0])[1]);
    });
    if (Math.abs(toplam - K.toplam_sn) > 0.01) kusur.push('sure-toplami:' + toplam.toFixed(3));
    if (!/class="fl-sahne fl-etkin"/.test(h)) kusur.push('ilk-sahne-etkin-degil');
    /* video: src YOK (JS'siz / azaltmada sifir fetch), preload none, muted, playsinline */
    /* acilis kopyasi olan sahnede IKINCI bir <video class="fl-acilis"> var
       (tam klip inene kadar ilk kareyi tasir); ana video sayisi = sahne
       sayisi, acilis sayisi = uretim kunyesinde acilis'i olan klip sayisi. */
    const tumVideo = h.match(/<video[^>]*>/g) || [];
    const videolar = tumVideo.filter((v) => !/fl-acilis/.test(v));
    const acilisVideo = tumVideo.length - videolar.length;
    const acilisBekl = U.klip.filter((k) => k.acilis).length;
    if (videolar.length !== K.klip.length) kusur.push('video=' + videolar.length);
    if (acilisVideo !== acilisBekl) kusur.push('acilis-video=' + acilisVideo + '/' + acilisBekl);
    for (const v of videolar) {
      if (/\bsrc=/.test(v)) { kusur.push('video-src-statik'); break; }
      if (!/preload="none"/.test(v) || !/\bmuted\b/.test(v) || !/\bplaysinline\b/.test(v)) { kusur.push('video-nitelik'); break; }
    }
    /* varliklar diskte + poster zinciri: dist webp sha1 == uretim.web.sha1,
       web.kaynak_sha1 == png sha1, png kaynak_sha1 == ENCODE EDILMIS klip sha1
       == dist mp4 sha1 (sert degismez #1: poster encode sonrasi kareden) */
    let md = 0, mb = 0;
    for (const k of U.klip) {
      if (k.hata) { kusur.push('uretim-hata:' + k.n); continue; }
      for (const [hat, poster] of [['masaustu', 'poster'], ['mobil', 'mobil_poster']]) {
        const mp4 = path.join(KOK, 'varlik', 'film', k[hat].dosya);
        const webp = path.join(KOK, 'varlik', 'film', (k[poster].web || {}).dosya || 'x');
        if (!fs.existsSync(mp4)) { kusur.push('dosya-yok:' + k[hat].dosya); continue; }
        if (!fs.existsSync(webp)) { kusur.push('poster-yok:' + k.n); continue; }
        if (sha1(mp4) !== k[hat].sha1) kusur.push('mp4-bayat:' + k[hat].dosya);
        if (k[poster].kaynak_sha1 !== k[hat].sha1 || k[poster].web.kaynak_sha1 !== k[poster].sha1
            || sha1(webp) !== k[poster].web.sha1) kusur.push('poster-zinciri:' + k.n);
        if (hat === 'masaustu') md += k[hat].bayt; else mb += k[hat].bayt;
      }
      if (!h.includes(`data-clip="varlik/film/${k.masaustu.dosya}"`)) kusur.push('sayfada-yok:' + k.n);
    }
    /* KAPI YENIDEN TANIMLANDI (27 Agu 2026, Enes karari). Higgsfield §7'nin
       TOPLAM BAYT kapisi (32/16 MiB) kaldirildi: kapi sureyle olceklenmiyordu
       (32 MiB / 256,6 sn = 1046 kbps) ve motor zaten segmentli yukluyor —
       kullanici toplami hicbir zaman indirmiyor. Yerine UC OLCU:
         1) 4G'de ilk kare < 1500 ms
         2) savurmada sinir hazirligi 4/4 (her sahne sinirina hazir klip ile varilir)
         3) bellek tavani: kayan pencere, gecerli +-PENCERE disi revoke
       1 ve 2 gercek tarayici olcumunden (yeni/film/olcum/sonuc.json) okunur;
       3 motorun kendisinde aranir. Toplamlar artik yalniz RAPOR. */
    const oY = path.join(__dirname, 'film', 'olcum', 'sonuc.json');
    if (!fs.existsSync(oY)) kusur.push('olcum-yok');
    else {
      const O = JSON.parse(fs.readFileSync(oY, 'utf8'));
      if (!O.length) kusur.push('olcum-bos');
      let ilkKapi = null, sinirKapi = null, tavan = 0;
      for (const { ozet: o } of O) {
        if (o.ag && o.ag !== 'wifi') {
          const v = o.ilk_kare_ms && o.ilk_kare_ms.medyan;
          if (v != null) ilkKapi = ilkKapi === null ? v : Math.max(ilkKapi, v);
        }
        for (const x of o.supur || []) {
          if (x.ad && x.ad.indexOf('sert') === 0) {
            const tam = x.varis_hazir >= x.varis;
            sinirKapi = sinirKapi === null ? tam : (sinirKapi && tam);
          }
          if (x.bellek_mib != null) tavan = Math.max(tavan, x.bellek_mib);
        }
      }
      if (ilkKapi === null) kusur.push('olcumde-4G-yok');
      else if (ilkKapi >= 1500) kusur.push(`4G-ilk-kare:${ilkKapi}ms>=1500`);
      if (sinirKapi === null) kusur.push('olcumde-savurma-yok');
      else if (!sinirKapi) kusur.push('savurmada-sinir-hazirligi-eksik');
      rapor += `4G ilk kare ${ilkKapi} ms · sınır hazırlığı ${sinirKapi ? 'tam' : 'EKSİK'} · bellek tepe ${tavan} MiB · `;
      /* olcum uretimden taze olmali — bayat olcumle yesil verilmez */
      const oDosya = fs.statSync(oY).mtime.toISOString();
      if (oDosya < U.uretim) kusur.push('olcum-bayat');
    }
    /* motor parcasi: sayfaya <script src> ile BAGLI DEGIL (dinamik ithal),
       kendi tavani. OLCULDU 27 Agu: motor.*.js ~3 KB; tavan 6 KB. */
    const astro = path.join(KOK, '_astro');
    const motor = (fs.existsSync(astro) ? fs.readdirSync(astro) : []).filter((f) => /^motor\..*\.js$/.test(f));
    if (motor.length !== 1) kusur.push('motor-parcasi=' + motor.length);
    else {
      const b = fs.statSync(path.join(astro, motor[0])).size;
      /* tavan 6 -> 7 KB (27 Agu): kayan pencere, yon/hiz duyarli on yukleme,
         devralma ve kaydirma sonumlemesi eklendi; dordu de kare basina is
         yapan, olculmus gerekcesi olan katmanlar. Tavan yine de dar tutulur.

         TAVAN 7 -> 10 KB (31 Agu 2026, PROLOG-ISKELET 6. adim) — UCUNCU
         YUKSELTME, HESABI ASAGIDA. 28-30 Agu turlarinda motora alti katman
         daha girdi; hicbiri tavanla birlikte gozden gecirilmedigi icin
         suite bu kural yuzunden GUNLERDIR KIRMIZIYDI (9608 B > 7168 B) ve
         kirmizi kimseyi durdurmadi. Bu, tavanin kendisinin bakimsiz
         kaldiginin isareti; sayiyi sessizce buyutmemek icin katmanlar
         adiyla yaziliyor:
           · yay + sonum (sabit 4 ms fizik adimi, iki durum harmani)
           · moment devri (birakista hedef hizinin yaya devri)
           · durusta akis (motor sayfayi kendisi kaydirir, girdiyle durur)
           · birakista sayfa hizalama (borcu yol yerine hizalanarak kapatma)
           · sinir on-sarma + cift video devri (0,5 s kala komsuyu boyar)
           · acilis kopyasi takasi + kodek secimi (h264 tek hat, h265 olcum)
         31 Agu'da eklenen `durdu`/`rafId` kapilari 71 B (9608 -> 9679).
         10 KB bugunku olcunun ~%3 ustu: yeni katman tavani YINE zorlar.
         ONERI (Enes'in karari): olcum-icin-var olan `?kodek=h265` dali
         urun paketinden cikarilabilir; motor o zaman tek hat kalir.
         2 EYL: tavan 10.240 -> 10.752 RAKAMLI GEREKCEYLE. Yukleme
         tamponu (Enes talimati, giris sokumu paketi) motora girdi:
         v1 kilit+delme 9.532->9.988 (456 B), v2 kismi sart + 6 sn
         siniri + AKISLI fetch (inenB ilerlemesi) 9.988->10.301 (313 B).
         Toplam +769 B'in tamami talimatla istenen davranis; pay ~450 B
         sonraki katman icin. Sessiz gevseme degil: bu satirin tarihi
         ve sayilari kaydin kendisi.
         3 EYL: 10.752 -> 11.264. TUR 5 v2 soz surucusu + ?soz kolu +
         IS B parcali ray haritasi (data-yavas, sanal/gercek donusum,
         akis carpani) 10.301->10.832 (+531 B) — ikisi de Enes
         talimatiyla istenen davranis. Pay 432 B. */
      if (b > 11 * 1024) kusur.push('motor-tavan:' + b);
      if (h.includes(motor[0])) kusur.push('motor-sayfaya-bagli');
      rapor += `motor ${(b / 1024).toFixed(1)}/11 KB`;
      const kod = fs.readFileSync(path.join(astro, motor[0]), 'utf8');
      /* blob seek + rVFC olcum yuzeyi + sokum */
      if (!/createObjectURL/.test(kod)) kusur.push('motor-blob-yok');
      if (!/revokeObjectURL/.test(kod)) kusur.push('motor-sokum-yok');
      if (!/requestVideoFrameCallback/.test(kod)) kusur.push('motor-rvfc-yok');
      /* bellek tavani: kayan pencere gercekten kurulu mu (revoke + durum sifirlama) */
      if (!/revokeObjectURL/.test(kod)) kusur.push('motor-pencere-revoke-yok');
      if (!/removeAttribute\(["']src["']\)/.test(kod)) kusur.push('motor-pencere-src-birakmiyor');
      /* SOKUM GERCEKTEN DURDURUYOR MU (31 Agu, PROLOG-ISKELET 5. adim):
         `sok()` eskiden yalniz dinleyicileri cozuyordu; `kare` kendi
         sonunda `tik()` cagirdigi icin yay/akis oturmamissa dongu
         sokumden SONRA da doniyordu — gorunmeyen sahne icin kare basina
         is, yani sessiz pil sizintisi. Kapi: bekleyen rAF iptal ediliyor
         mu ve dongunun bir durma kapisi var mi. */
      if (!/cancelAnimationFrame/.test(kod)) kusur.push('motor-raf-iptali-yok');
    }
    /* ada betigi: hareket azaltma kapisi + dinamik ithal */
    const ada = [...h.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => {
      const d = path.join(KOK, m[1].replace(/^\/(?:yeni\/)?/, ''));
      return fs.existsSync(d) ? fs.readFileSync(d, 'utf8') : '';
    }).join('\n');
    if (!/prefers-reduced-motion/.test(ada)) kusur.push('azaltma-kapisi-yok');
    /* sahne dosyasinda yer tutucu yok (§8) */
    if (/<[a-z-]+>/.test(fs.readFileSync(path.join(__dirname, 'src', 'film', 'sahneler.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')))
      kusur.push('sahneler.ts-yer-tutucu');
    /* CSP media-src blob: (sert degismez #5) */
    if (!/media-src[^;]*blob:/.test(fs.readFileSync(path.join(__dirname, 'public', '_headers'), 'utf8'))) kusur.push('csp-media-src-blob-yok');
    /* dikis olcumu var ve uretimden taze, 38 dikis x 2 hat */
    const dY = path.join(__dirname, 'film', 'dikis.json');
    if (!fs.existsSync(dY)) kusur.push('dikis.json-yok');
    else {
      const D = JSON.parse(fs.readFileSync(dY, 'utf8'));
      if (D.olcum < U.uretim) kusur.push('dikis-bayat');
      const e = D.dikis.filter((x) => x.hat === 'encode' && !x.hata).length;
      if (e !== K.klip.length - 1) kusur.push('dikis-sayisi:' + e);
      rapor += ` · dikiş mutlak esit/yakin/sicrama ${D.ozet.encode.esit}/${D.ozet.encode.yakin}/${D.ozet.encode.sicrama.length}`;
    }
    /* DIKIS HUKMU MUTLAK PSNR'DAN GELMEZ (taban.cjs, 27 Agu): kamera surekli
       hareket ettigi icin klip ICINDEKI ardisik kareler de farklidir. Mutlak
       esik 35 dikisi "sicrama" sayiyordu; klip ici kare-basi degisim tabanina
       gore olculunce 8'i gercek cikti. Kapi bu 8 uzerinden. */
    const tY = path.join(__dirname, 'film', 'taban.json');
    if (!fs.existsSync(tY)) kusur.push('taban.json-yok');
    else {
      const T = JSON.parse(fs.readFileSync(tY, 'utf8'));
      if (T.olcum < U.uretim) kusur.push('taban-bayat');
      if (T.dikis.length !== K.klip.length - 1) kusur.push('taban-dikis-sayisi:' + T.dikis.length);
      rapor += ` · tabana göre sürekli/hafif/GERÇEK-SIÇRAMA ${T.ozet.surekli}/${T.ozet.hafif_sapma}/${T.ozet.gercek_sicrama}`;
      if (T.ozet.gercek_sicrama) rapor += ` (${T.ozet.gercek_sicrama_dikisler.join(',')})`;
    }
    /* YEREL OLCUT (31 Agu 2026) — yukaridaki 8 rakami TEK BASINA
       okunmasin diye. taban.cjs dikisin tabanini iki klibin ORTALAMASI
       olarak kuruyor ve B'nin tabanini klibin SONUNDAN aliyor; dikis ise
       B'nin BASINDA. Kamera dikiste yavasliyorsa (3->4: sahne3 sonu
       ~24 dB/kare, sahne4 basi ~50 dB/kare) ortalama hicbir yani temsil
       etmez ve dikis "sicrama" gorunur.
       dikis-yerel.cjs ayni 38 dikisi uc olcutle olcer; C olcutu
       (min(A sonu, B basi) — "adim HEMEN YANINDAKI en yavas adimdan
       kotu mu") scrub surekliligi icin dogru sorudur ve hem encode hem
       HAM 4K hatta 0 sicrama verir. Kapi hala A uzerinden kurulu
       degil — bu satir yalniz RAPOR; hangi olcutun urun kapisi olacagi
       Enes'in karari. */
    const yY = path.join(__dirname, 'film', 'dikis-yerel.json');
    if (fs.existsSync(yY)) {
      const Y = JSON.parse(fs.readFileSync(yY, 'utf8'));
      const c = Y.olcut_kiyasi && Y.olcut_kiyasi.C_min_taban;
      if (c) rapor += ` · yerel ölçüt (min taban) encode/ham SIÇRAMA ${c.encode_sicrama}/${c.ham_sicrama}`;
    } else rapor += ' · yerel ölçüt YOK (node yeni/film/dikis-yerel.cjs)';
    rapor += ` · disk masaüstü ${(md / 1048576).toFixed(1)} MiB · mobil ${(mb / 1048576).toFixed(1)} MiB (kapı değil, rapor)`;
  }
  ol('FM1 · film iskeleti: 39 sahne kanonla + video src\'siz + poster zinciri encode\'dan + motor ayrı + CSP blob + dikiş ölçülü + KAPI (4G ilk kare<1,5sn · sınır 4/4 · bellek tavanı)',
     kusur.length === 0, kusur.slice(0, 4).join(' ') + (rapor ? '  [' + rapor + ']' : ''));
})();

/* ---- FM2 · PROLOGU GEC SOZLESMESI (31 Agu 2026, PROLOG-ISKELET 5. adim)
   Gorevin uc tamamlanma sarti kural haline getirildi, cunku ucu de "kodda
   var" denip gecilebilecek, davranista sessizce bozulabilecek cinsten:
     1. dugme KLAVYEYLE erisilebilir -> odaklanabilir bir ogedir (a[href]
        ya da button; div+onclick kabul edilmez), hedefi gercekten var ve
        gorunur bir odak halkasi tanimli.
     2. atlandiginda ZINCIR DURUR    -> ada betigi baslat()'in dondurdugu
        sokumu cagirir (motorun rAF iptali FM1'de ayrica olculur).
     3. OTURUMDA BIR KEZ             -> sessionStorage bayragi hem YAZILIR
        hem OKUNUR; okumadan yazmak davranisi kurmaz, yalniz iz birakir.
   AYRICA KONUM: kumanda sticky kutunun (.fl-yapis) ICINDE olmali. Eskiden
   `.fl-ray` icindeydi ve `bottom:16px` 115.487 px'lik RAYIN DIBI demekti —
   dugme film boyunca ekran disindaydi, ancak film bitince goruluyordu.
   Bu kural o hatanin geri gelmesini engeller. */
{
  const kusur = [];
  const fY = path.join(KOK, 'film', 'index.html');
  if (!fs.existsSync(fY)) kusur.push('film-sayfasi-yok');
  else {
    const h = oku(fY);
    /* 1. klavye: .fl-gec odaklanabilir bir oge mi, hedefi var mi */
    const gec = h.match(/<(a|button)\b[^>]*class="[^"]*\bfl-gec\b[^"]*"[^>]*>/);
    if (!gec) kusur.push('fl-gec-odaklanabilir-degil');
    else if (gec[1] === 'a') {
      const hr = gec[0].match(/\bhref="#([^"]+)"/);
      if (!hr) kusur.push('fl-gec-href-yok');
      else if (!new RegExp('id="' + hr[1] + '"').test(h)) kusur.push('fl-gec-hedef-yok:' + hr[1]);
    }
    /* konum: kumanda sticky kutunun icinde (rayin dibinde degil).
       SINIF ESLESMESI TAM OLMALI: ilk surum `indexOf('fl-kumanda')`
       kullaniyordu ve `fl-kumandaX` da bu alt-dizeyi tasidigi icin kural
       KASTEN BOZULMUS sayfada bile yesil yaniyordu (yanlis yesil). */
    const sinifYeri = (ad) => {
      const m = h.match(new RegExp('class="[^"]*\\b' + ad + '\\b[^"]*"'));
      return m ? m.index : -1;
    };
    const yapis = sinifYeri('fl-yapis');
    const kumanda = sinifYeri('fl-kumanda');
    if (kumanda < 0) kusur.push('fl-kumanda-yok');
    else if (yapis < 0 || kumanda < yapis) kusur.push('kumanda-yapisin-disinda');
    /* odak halkasi + atlanmis hali: uretilen CSS'ten.
       IKI KAYNAK: Astro bu sayfada stili SATIR ICI `<style>` blogunda
       veriyor, `<link>` yok. Yalniz link'e bakan ilk surum BOZULMAMIS
       koda da kirmizi yakti (yanlis kirmizi); kural once kasten
       bozularak, sonra bozulmamis halde de sinandigi icin yakalandi.
       TIRNAK: minify `[data-film="atlandi"]` -> `[data-film=atlandi]`
       yaptigi icin tirnak istege bagli aranir. */
    const css = [...h.matchAll(/<link[^>]+href="([^"]+\.css)"/g)]
      .map((m) => { const d = path.join(KOK, m[1].replace(/^\/(?:yeni\/)?/, '')); return fs.existsSync(d) ? oku(d) : ''; })
      .concat([...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]))
      .join('\n');
    if (!/fl-gec[^{]*:focus-visible/.test(css)) kusur.push('fl-gec-odak-halkasi-yok');
    if (!/\[data-film=["']?atlandi["']?\][^{]*\.fl\s*\{[^}]*display:\s*none/.test(css))
      kusur.push('atlandi-hali-gizlemiyor');
    /* 2 + 3: ADA BETIGI — sokum cagrisi + oturum bayragi yaz VE oku.
       KAPSAM DARALTMASI: ilk surum sayfadaki BUTUN betikleri tek metinde
       birlestirip `getItem(` ariyordu. Sayfa kabugu (perde) zaten
       sessionStorage kullandigi icin, film adasindaki okuma kasten
       silinse bile kural yesil yaniyordu — yanlis yesil. Artik yalniz
       PROLOG ANAHTARINI tasiyan betik(ler) taranir. */
    const betikler = [...h.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)]
      .map((m) => { const d = path.join(KOK, m[1].replace(/^\/(?:yeni\/)?/, '')); return fs.existsSync(d) ? oku(d) : ''; })
      .concat([...h.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]));
    const ada = betikler.filter((b) => /qanat-prolog-atlandi/.test(b)).join('\n');
    if (!ada) kusur.push('oturum-anahtari-tasiyan-betik-yok');
    else {
      if (!/setItem\(/.test(ada)) kusur.push('oturum-bayragi-yazilmiyor');
      if (!/getItem\(/.test(ada)) kusur.push('oturum-bayragi-okunmuyor');
      if (!/baslat\(/.test(ada)) kusur.push('baslat-cagrisi-yok');
    }
  }
  ol('FM2 · prologu geç: klavyeyle erişilir + sticky kumandada + atlanınca zincir söküm + oturumda bir kez',
     kusur.length === 0, kusur.join(' '));
}

/* ---- FM3 · FILM ONUNDEYKEN ODAK FILMIN ICINDE (TUR 2, 4 Eyl 2026) ----
   OLCULMUS KUSUR: film onundeyken belge 122.000 px uzundu ve `#fl-govde`
   DISINDA kalan kabuk katmanlari (atlama bagi, gizli nav anahtari, nav,
   lead bolumu, footer) hala tab sirasindaydi. Video odaktayken Tab,
   121.364 px asagidaki `a.flogo`yu seciyor, tarayici oraya kaydiriyor ve
   o dev belgenin duzenini zorluyordu: keydown 232 / 304 / 264 ms (Chrome,
   filmin bas/orta/son noktasi, uc kosum medyani; isleme 79-134 ms +
   sunum 118-265 ms). Dun "film etkinken INP 256-304 ms, video.fl-video
   keydown" diye raporlanan sey BUYDU — sebep motorun isi degil, odagin
   filmin disina kacmasi. Duzeltmeden sonra 136 / 168 / 120 ms.
   KURAL NEYI TUTAR (ucu de sessizce bozulabilir):
     1. ana sayfanin ERKEN satir ici betigi inert'i KURAR — modulde degil,
        cunku modul /film'de de iniyor ve ayni kod orada J1 tavanini
        158 B asti (11.422 > 11.264). Kural bu kararin yerini de tutar.
     2. inert GERI ALINIR — `fl-js` dusunce (uc sokum yolunun ucu de onu
        dusuruyor); kalici inert footer'i olduren sessiz a11y kusuru olur.
     3. `.fl-gec` HICBIR ZAMAN inert kapsaminda olmaz (FM2 ile celisirdi).
   Olcen arac: yeni/film/olc-gec-inp.cjs (Event Timing, gercek girdi). */
{
  const kusur = [];
  const aY = path.join(KOK, 'index.html');
  const fY = path.join(KOK, 'film', 'index.html');
  /* PROLOG ANAHTARI (6 Eyl 2026): panelden `theme.motion.prolog = 0`
     denince film ana sayfaya HIC girmez — kural o halde KONUSUZ olur.
     Sessizce atlanmaz: kapali halde TERS SART sinanir, cunku kapali
     anahtarin arkasindan olu kod sizmasi da bir kusurdur. */
  let prologVar = null;
  if (!fs.existsSync(aY)) kusur.push('ana-sayfa-yok');
  else {
    const h = oku(aY);
    /* yalniz PROLOG KARARINI veren erken betik taranir (FM2'nin kapsam
       daraltma dersi: butun betikleri birlestirmek yanlis yesil verir) */
    const erken = [...h.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
      .map((m) => m[1]).filter((b) => /fl-ana/.test(b) && /qanat-prolog-atlandi/.test(b)).join('\n');
    prologVar = /<section class="fl"/.test(h);
    if (!prologVar) {
      /* KAPALI HAL — kural konusuz, ama olu kod sizmamali */
      if (erken) kusur.push('prolog-kapali-ama-erken-karar-betigi-var');
      if (/toggleAttribute\(['"]inert/.test(h)) kusur.push('prolog-kapali-ama-inert-duzenegi-var');
      if (/class="[^"]*\bfl-govde\b/.test(h)) kusur.push('prolog-kapali-ama-fl-govde-kancasi-var');
    }
    else if (!erken) kusur.push('erken-karar-betigi-yok');
    else {
      if (!/inert/.test(erken)) kusur.push('inert-kurulmuyor');
      /* geri alma: fl-js dusunce inert kalkmali — sinifi izleyen bir
         gozlemci ya da acik bir kaldirma olmali */
      if (!/MutationObserver|removeAttribute\(['"]inert|toggleAttribute\(['"]inert/.test(erken))
        kusur.push('inert-geri-alinmiyor');
      if (!/fl-js/.test(erken)) kusur.push('geri-alma-bayragi-yok');
      /* kapsam: gec dugmesi ve film katmani ASLA icinde olmamali */
      const kap = erken.match(/Q\s*=\s*(['"])([^'"]*)\1/);
      const kapsam = kap ? kap[2] : '';
      if (!kapsam) kusur.push('inert-kapsami-okunamadi');
      else {
        if (/fl-gec|\.fl[^-a-z]|#fl-|body\s*>\s*\*/.test(kapsam)) kusur.push('gec-dugmesi-inert-kapsaminda:' + kapsam.slice(0, 40));
        if (!/footer/.test(kapsam)) kusur.push('footer-kapsam-disi:' + kapsam.slice(0, 40));
      }
    }
  }
  /* /film sayfasi bu betigi TASIMAMALI (J1 tavani nedeni yukarida) */
  if (fs.existsSync(fY) && /toggleAttribute\(['"]inert/.test(oku(fY))) kusur.push('film-sayfasina-sizmis');
  ol('FM3 · film önündeyken odak film içinde: kabuk katmanları inert + fl-js düşünce geri alınır',
     kusur.length === 0, [kusur.join(' '), prologVar === false ? '(prolog KAPALI — kural konusuz; ters şart sınandı: ölü kod yok)' : ''].filter(Boolean).join(' '));
}

/* ---- P2 · PANEL METIN HATTI (TUR 4, 4 Eyl 2026) ----
   Uc sessiz kusuru birden tutar; ucu de bu turda YASANDI:
     1. HARITA BAYAT. Panelin "Sabit metinler" sekmesi admin.html'e GOMULU
        haritadan beslenir (yeni/metin-harita.cjs uretir). Bilesene yeni
        metin girip haritayi yenilemeyi unutmak = alan panelde YOK ve
        kimse fark etmez. Kural haritayi yeniden uretip GOMULU olanla
        kiyaslar.
     2. ANAHTARSIZ `M(` CAGRISI. `M` imzasi (anahtar, TR, EN); anahtar
        unutulursa cagri SESSIZCE yanlis dili basar — bu tam olarak
        olculdu: `M(`...adimda kurulum...`, `...steps...`)` TR sayfada
        Ingilizce cikti ve 18 sayfanin gorunur metni degisti. Kural her
        `M(` cagrisinin ilk argumaninin duz tirnakli anahtar olmasini ister.
     3. OLU BILESEN ANAHTARI. Hicbir sayfanin ithal etmedigi bilesenin
        anahtari panele girerse Enes yazar ve HICBIR SEY DEGISMEZ (bu
        turun kacindigi yanlis yesil). Harita uretecinin OLU listesi var;
        kural o listedeki dosyalarin gercekten ithal edilmedigini dogrular
        — dosya yeniden baglanirsa liste bayatlar.
   Kanit araci: yeni/panel-kapi.cjs (yazildi -> derlendi -> uretimde gorundu). */
{
  const kusur = [];
  const bilgi = [];   /* HUKUM VERMEZ — kayda ve satira gecer */
  const SRC = path.join(__dirname, 'src');
  /* 1 · harita taze mi */
  try {
    const cikti = require('child_process').execSync('node metin-harita.cjs',
      { cwd: __dirname, env: Object.assign({}, process.env, { KONTROL: '1' }), encoding: 'utf8', timeout: 60000 });
    /* 5 EYL 2026 — ISARET IKIYE AYRILDI (metin-harita.cjs kunyesinde
       gerekce). BLOKLAYICI olan KAYNAK yarisi: gelistirici m()/M() ile yeni
       metin acip haritayi uretmediyse alan panelde GORUNMEZ, kuralin sordugu
       soru budur. ICERIK yarisi (content.json'un "Eski site" kovasi)
       PANELDEN YAYINLAYINCA degisir; onu bloklayici tutmak paneli her
       kullanildiginda DEPLOY'U DUSURUYORDU (olculdu: yayinla.js govdeyi
       birebir yazar, taslak 43 olu glb* anahtarini tasimaz; netlify.toml
       zincirinde denetim exit 1 -> deploy duser). Bilgi olarak yazilir. */
    if (!/KAYNAK-TAZE/.test(cikti)) kusur.push('harita-bayat-kaynak');
    if (/ICERIK-FARKLI/.test(cikti)) bilgi.push('harita-icerik-farkli');
  } catch (e) {
    const o = String((e && e.stdout) || '');
    kusur.push(/KAYNAK-BAYAT/.test(o) ? 'harita-bayat-kaynak' : 'harita-kontrol-hatasi');
  }
  /* 2 · anahtarsiz M( cagrisi: ilk arguman duz tirnakli anahtar olmali */
  const anahtarsiz = [];
  (function gez(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p2 = path.join(d, e.name);
      if (e.isDirectory()) { gez(p2); continue; }
      if (!e.name.endsWith('.astro')) continue;
      const k = fs.readFileSync(p2, 'utf8');
      if (!/const M = \(k: string/.test(k)) continue;      /* panele acilmis dosyalar */
      /* ILK ARGUMAN ANAHTAR OLMALI. "tirnakla basliyor mu" YETMEZ: anahtari
         silince cagri `M('Sik sorulan sorular', ...)` olur ve tirnakla baslar
         — kural ilk surumde bunu KACIRDI (kirmizi-once denemesinde goruldu).
         Anahtar bicimi: kucuk harf + rakam, 3-12 karakter, BOSLUKSUZ. */
      for (const m of k.matchAll(/(^|[^A-Za-z0-9_$.])M\(\s*([^)]{0,40}?)\s*,/g)) {
        const ilk = m[2].trim();
        if (!/^'[a-z][a-z0-9]{2,11}'$/.test(ilk))
          anahtarsiz.push(path.relative(SRC, p2).replace(/\\/g, '/') + ':' + ilk.slice(0, 24));
      }
    }
  })(SRC);
  if (anahtarsiz.length) kusur.push('anahtarsiz-M:' + anahtarsiz.slice(0, 3).join(','));
  /* 3 · olu listesi hala olu mu */
  const olu = ['S2Kayip', 'S3Mekanizma', 'S5Surec', 'S6Sektor'];
  const tumKaynak = [];
  (function gez2(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p2 = path.join(d, e.name);
      if (e.isDirectory()) gez2(p2);
      else if (/\.(astro|ts)$/.test(e.name)) tumKaynak.push([path.relative(SRC, p2).replace(/\\/g, '/'), fs.readFileSync(p2, 'utf8')]);
    }
  })(SRC);
  for (const ad of olu) {
    const ithal = tumKaynak.filter(([r, k]) => !r.endsWith(ad + '.astro') && new RegExp('[\'"/]' + ad + '[\'"]|/' + ad + '\\.astro').test(k));
    if (ithal.length) kusur.push('olu-sanilan-bilesen-ithal-edilmis:' + ad);
  }
  ol('P2 · panel metin hattı: kaynak haritası taze + anahtarsız M( yok + ölü bileşen listesi geçerli',
     kusur.length === 0, [kusur.slice(0, 3).join(' '), bilgi.length ? '(bilgi: ' + bilgi.join(' ') + ')' : ''].filter(Boolean).join(' '));
}

/* K1 · KABUK MODULU TAVANI (4 Eyl 2026, SOKUM VE TASIMA TURU). Eski
   sitenin uc rAF katmani (yildiz, bit damgasi, ajan imleci) kabuk.js'e
   tasindi: film motoru deseniyle DINAMIK ITHAL — sayfaya bagli degil,
   J1 disi. Kendi tavani burada: dosya <= 12 KB (olculdu: 10,8 KB ham /
   5,0 KB gzip), diskte var, film disindaki her sayfada tetik satiri var,
   film sayfasinda YOK (kabuk={false}: kapanis tablolari kabuksuz olculdu),
   her sayfada uc sutunlu footer + #wmk tuvali var. Kural sayisi 54->55. */
{
  const kusur = [];
  const mod = path.join(KOK, 'varlik', 'kabuk.js');
  const boy = fs.existsSync(mod) ? fs.statSync(mod).size : -1;
  if (boy < 0) kusur.push('varlik/kabuk.js yok');
  else if (boy > 12 * 1024) kusur.push(`kabuk.js ${boy} B > 12288`);
  for (const p of sayfalar) {
    const h = oku(p), r = rel(p), filmMi = /^(film|en[\/]film)[\/]index[.]html$/.test(r);
    const tetik = /import\('\/varlik\/kabuk\.js'\)/.test(h);
    if (filmMi ? tetik : !tetik) kusur.push(r + (filmMi ? ':film-sayfasinda-kabuk-tetigi' : ':kabuk-tetigi-yok'));
    if (!/<canvas id="wmk"/.test(h) || !/class="fgrid"/.test(h)) kusur.push(r + ':footer-eksik');
  }
  ol('K1 · kabuk modülü ≤ 12 KB, film dışı her sayfada tetik, her sayfada üç sütunlu footer + bit damgası',
     kusur.length === 0, kusur.slice(0, 3).join(' ') || `kabuk.js ${boy} B`);
}

/* ---- H26 · EN SAYFADA TR IC BAGLANTI YOK (TUR 9, 3 Eyl 2026) ----
   Rota turunda bulundu: SAAkis/SKKatman/SPDeste/SSESektor href'lerini
   `${B}/...` ile kuruyor, `${on}` ('/en') onekini kullanmiyordu; EN ana
   sayfa 20+ TR sayfaya bagliyordu (dil sizintisi). H16 bunu gormez
   (hedef dosya var). Kural: EN sayfadaki her `/yeni/...` href'i `/yeni/en`
   ile baslar; istisna yalniz (a) sayfanin KENDI TR esi (head'deki
   hreflang="tr" — dil degistirici), (b) /yeni/hukuki (tek dilli, Temel
   bilincli TR'ye baglar), (c) varlik/img/font yollari. Kirmizi-once:
   3 Eyl, duzeltmeden once en/index.html 21 TR baglanti. */
{
  const kusur = [];
  let sayi = 0;
  /* KESME (6 Eyl 2026) — `/en/film` KAPSAM DISI, gerekcesiyle: o sayfa
     olcum zemini ve govdesi ESKI SITENIN GIRISI (EskiGiris.astro, Shadow
     DOM'a gomulu birebir markup). Icindeki `/`, `/#lead`, `/bulten`
     baglantilari eski sitenin kendi nav'i — yeni kabugun dil kurali
     onlara islemez, cevrilmeleri de istenmiyor (birebir tasima karari).
     Kesmeden once bu baglantilar `/yeni` oneki tasimadigi icin kural
     onlari HIC gormuyordu; onek dusunce gorunur oldular. Susturma degil:
     sayfa adiyla disarida ve sebebi burada yazili. */
  const enSayfalar = sayfalar.filter((p) => (/(^|\/)en\//.test(rel(p)) || /^en\/index\.html$/.test(rel(p)))
    && !/^en\/film\/index\.html$/.test(rel(p)));
  for (const p of enSayfalar) {
    const h = oku(p);
    const trEs = (h.match(/<link rel="alternate" hreflang="tr" href="([^"]+)"/) || [])[1] || '';
    /* hreflang yoksa (film: hreflang basilmiyor) TR esi dosya yolundan
       turetilir: en/film/index.html -> /film
       KESME (6 Eyl 2026): `/yeni` oneki dustu, yollar kok tabanli. */
    const trYol = trEs
      ? (trEs.replace(new RegExp('^' + KONAK_RE), '').replace(/\/$/, '') || '/')
      : ('/' + rel(p).replace(/^en\//, '').replace(/\/?index\.html$/, '')).replace(/\/$/, '');
    for (const m of h.matchAll(/<a[^>]*\bhref="(\/[^"#?]*)/g)) {
      const yol = m[1].replace(/\/$/, '') || '/';
      sayi++;
      if (yol === '/en' || yol.startsWith('/en/')) continue;
      if (yol === trYol) continue;                          /* dil degistirici: kendi TR esi */
      if (yol === '/hukuki') continue;                      /* tek dilli hukuki */
      if (/^\/(varlik|img|font|_astro)\//.test(yol)) continue;
      kusur.push(rel(p) + ' -> ' + m[1]);
    }
  }
  const ozet = {};
  for (const k of kusur) { const s = k.split(' -> ')[0]; ozet[s] = (ozet[s] || 0) + 1; }
  ol('H26 · EN sayfalarda ic baglantilar /yeni/en/ altinda (istisna: kendi TR esi, hukuki)', kusur.length === 0,
     kusur.length ? Object.entries(ozet).slice(0, 3).map(([s, n]) => `${s}:${n}`).join(' ') + ` (ilk: ${kusur[0]})` : `${enSayfalar.length} EN sayfa · ${sayi} baglanti`);
}

/* ---- K2 · KABUK PAKETI TAZE (TUR 9, 3 Eyl 2026) ----
   K1 yalniz boyuta bakiyordu: kabuk/efekt.js duzenlenip kabuk-derle.cjs
   unutulunca eski JS yayina gidiyor, hicbir kural kirmizi yakmiyordu
   (MIMARI M1/A3 — bu depodaki en sessiz kirilma yolu). Simdi kaynak,
   kabuk-derle.cjs'in PAYLASILAN derle() fonksiyonuyla bellekte yeniden
   derlenir ve dist/varlik/{kabuk,pano,sizinti}.js + tespit-fix.*.json
   ile BAYT-BIREBIR kiyaslanir. esbuild deterministik: 3 Eyl'de refactor
   git'teki ciktiyi birebir uretti (git status bos). Derleme hatti artik
   kabuk-derle'yi `npm run build` icinde kosturuyor; bu kural o adimin
   atlandigi (dogrudan `astro build`) ya da eski ciktinin basildigi her
   durumu yakalar. Ayar tek yerde (derle()) — iki yerde olsaydi ayrisir,
   kural yanlis kirmizi verirdi. */
{
  const kusur = [];
  let ozet = '';
  try {
    const { derle } = require(path.join(__dirname, 'kabuk-derle.cjs'));
    const beklenen = derle();
    for (const [ad, buf] of Object.entries(beklenen)) {
      const y = path.join(KOK, 'varlik', ad);
      if (!fs.existsSync(y)) { kusur.push(ad + ':yok'); continue; }
      const d = fs.readFileSync(y);
      if (!d.equals(buf)) kusur.push(`${ad}:BAYAT (dist ${d.length} B ↔ kaynaktan ${buf.length} B) — npm --prefix yeni run build`);
    }
    ozet = Object.keys(beklenen).length + ' dosya bayt-birebir';
  } catch (e) { kusur.push('derlenemedi: ' + String(e && e.message).split('\n')[0].slice(0, 100)); }
  ol('K2 · kabuk paketi taze: kaynaktan derlenen çıktı dist ile bayt-birebir (kabuk-derle.cjs derle())',
     kusur.length === 0, kusur.slice(0, 3).join(' ') || ozet);
}

/* ---- L1 · LINK BASLIKLARI BIREBIR (TUR 9, 3 Eyl 2026) ----
   Onceden tek bekci test/denetim.js'teydi ve Netlify sirasinda dist
   yokken kosuyordu: alt kume kontrolu 60 Astro sayfasini hic gormeden
   "taze" diyordu (MIMARI M3/A13); silinen sayfanin satiri da sonsuza
   kadar kaliyordu (M2). Burada dist ve dist ikisi de var: blok
   BIREBIR olmali (LINK_BIREBIR=1). Ayrica yayina giden kopya
   dist/_headers, kaynak yeni/public/_headers ile ayni olmali (Astro public/'i
   kopyalar; arada elle uretim yapildiysa bayat kalir). */
{
  const kusur = [];
  let not = '';
  try {
    not = require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'link-basliklari.cjs')],
      { cwd: path.join(__dirname, '..'), env: Object.assign({}, process.env, { KONTROL: '1', LINK_BIREBIR: '1' }), encoding: 'utf8', timeout: 60000 }).trim();
  } catch (e) { kusur.push(String(e.stdout || e.message).trim().slice(0, 140)); }
  const kaynakH = path.join(__dirname, 'public', '_headers'), distH = path.join(__dirname, '..', 'dist', '_headers');
  if (!fs.existsSync(distH)) kusur.push('dist/_headers yok');
  else if (fs.readFileSync(kaynakH, 'utf8') !== fs.readFileSync(distH, 'utf8')) kusur.push('dist/_headers ≠ yeni/public/_headers (astro derlemesi bayat)');
  ol('L1 · _headers Link bloğu dist ile birebir + dist/_headers kaynakla aynı', kusur.length === 0,
     kusur.join(' | ') || not.replace(/^LINK BASLIKLARI TAZE: /, '').slice(0, 90));
}

ozetBasildi = true;
/* ---- S4 · BENZERSIZ BASLIK VE ACIKLAMA (YAYIN ONCESI KONTROL, madde 4) ----
   "Kopya baslik en yaygin sessiz SEO hatasidir" — ve bugune kadar 63 sayfada
   gercekten benzersiz olup olmadigi HIC olculmedi. Iki sayfa ayni <title>
   ya da ayni meta description tasiyorsa KIRMIZI.
   TR ve EN esleri AYRI sayfalardir ve ayri baslik tasimalidir; ayni
   basligi tasiyorlarsa da kirmizidir (arama motoru ikisini ayirt edemez).
   404 ve tesekkur DAHIL: noindex olmalari baslik kopyasini mesru kilmaz,
   ustelik kesmede N1 tersine donunce ikisi de gorunur hale gelebilir. */
{
  const kusur = [];
  const bas = new Map(), ack = new Map();
  for (const p2 of sayfalar) {
    const h = oku(p2), r = rel(p2);
    const t = (h.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    const d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1];
    if (!t || !t.trim()) { kusur.push(r + ':baslik-yok'); }
    else { const k = t.trim(); (bas.get(k) || bas.set(k, []).get(k)).push(r); }
    if (!d || !d.trim()) { kusur.push(r + ':aciklama-yok'); }
    else { const k = d.trim(); (ack.get(k) || ack.set(k, []).get(k)).push(r); }
  }
  for (const [k, v] of bas) if (v.length > 1) kusur.push('kopya-baslik(' + v.length + '):' + v.slice(0, 2).join(',') + ' → ' + k.slice(0, 40));
  for (const [k, v] of ack) if (v.length > 1) kusur.push('kopya-aciklama(' + v.length + '):' + v.slice(0, 2).join(',') + ' → ' + k.slice(0, 40));
  ol('S4 · her sayfanın başlığı ve açıklaması BENZERSİZ (' + sayfalar.length + ' sayfa)',
     kusur.length === 0, kusur.slice(0, 3).join(' | ') || bas.size + ' başlık · ' + ack.size + ' açıklama');
}

/* ---- S5 · GORSEL ALT METNI (YAYIN ONCESI KONTROL, madde 5) ----
   Kendi teshis aracimiz (STETespit) baskalarinin sitesinde alt metin
   eksigi ariyor; kendi sitemizde HIC olculmemisti.
   KURAL: her <img> bir 'alt' OZNITELIGI TASIMALI. Bos alt ("") gecerlidir
   ve DOGRU cevaptir — dekoratif gorselin adi okunmamali. Yasak olan
   ozniteligin HIC OLMAMASI: ekran okuyucu o zaman dosya adini okur.
   Ayrica: 'alt' degeri dosya adina benzemesin (uzantili ad = kopyala-yapistir
   belirtisi) ve 125 karakteri gecmesin (ekran okuyucu keser). */
{
  const kusur = [];
  let toplam = 0, bos = 0, dolu = 0;
  for (const p2 of sayfalar) {
    const h = oku(p2), r = rel(p2);
    for (const m of h.matchAll(/<img\b[^>]*>/g)) {
      toplam++;
      const t = m[0];
      /* CIPLAK `alt` DA GECERLIDIR ve BOS alt demektir. Kucultme alt=""
         yazimini `alt` haline getiriyor; ilk yazimda desen yalnizca
         alt="..." ariyordu ve seridin TEKRAR TURLARINA (H9 geregi bos alt
         + aria-hidden — dogru a11y) 18 YANLIS KIRMIZI verdi. Kural once
         kendi yanlisini duzeltti, sonra siteye baktı. */
      const a = t.match(/\salt(?:\s*=\s*"([^"]*)")?[\s/>]/);
      if (!a) { kusur.push(r + ':alt-yok:' + (t.match(/src="([^"]*)"/) || [, '?'])[1].split('/').pop()); continue; }
      const deger = a[1] === undefined ? '' : a[1];
      if (deger === '') { bos++; continue; }
      dolu++;
      if (/\.(webp|png|jpe?g|avif|svg)\s*$/i.test(deger)) kusur.push(r + ':alt-dosya-adi:' + deger.slice(0, 30));
      if (deger.length > 125) kusur.push(r + ':alt-uzun(' + deger.length + '):' + deger.slice(0, 30));
    }
  }
  ol('S5 · her <img> alt taşıyor (dekoratif alt="" geçerli, öznitelik eksikliği değil)',
     kusur.length === 0, kusur.slice(0, 3).join(' | ') || toplam + ' görsel · ' + dolu + ' metinli · ' + bos + ' dekoratif');
}

/* ---- S6 · YAYIN DOSYALARI: robots.txt · Content-Signal · ads.txt ----
   (yayin oncesi kontrol TUR B, 6 Eyl 2026)
   Bugun /yeni/robots.txt KOK DISINDA oldugu icin tarayicilar okumuyor;
   kesmede (adim 6) kokun kendisi olacak. O gun yanlis olmasi pahali,
   o yuzden kural BUGUNDEN tutuyor: dosya var mi, on bir AI botunun
   hepsi davetli mi, Content-Signal satiri yerinde mi, Sitemap satiri
   dogru adresi mi gosteriyor, panel/olcum zeminleri disarida mi.
   ads.txt: panel degeri BOSSA dosya OLMAMALI (bos ya da sahte ads.txt
   AdSense tarafinda gecersiz sayilir, hic olmamasindan kotudur);
   DOLUYSA icerigi panel degeriyle tutarli olmali. */
{
  const kusur = [];
  const rp = path.join(KOK, 'robots.txt');
  if (!fs.existsSync(rp)) kusur.push('robots.txt-yok');
  else {
    const r = fs.readFileSync(rp, 'utf8');
    const botlar = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User',
      'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'meta-externalagent'];
    for (const b of botlar) if (!new RegExp('User-agent:\\s*' + b + '\\s*\\n\\s*Allow:\\s*/', 'i').test(r)) kusur.push('bot-davetsiz:' + b);
    if (!/Content-Signal:\s*search=yes,\s*ai-input=yes,\s*ai-train=no/.test(r)) kusur.push('content-signal-yok-ya-da-farkli');
    if (!new RegExp('^Sitemap:\\s*' + KONAK_RE + '/sitemap\\.xml\\s*$', 'm').test(r)) kusur.push('sitemap-satiri-yok');
    for (const d of ['/admin.html', '/tesekkur', '/film', '/deneme-react'])
      if (!r.split('\n').some((sat) => sat.trim() === 'Disallow: ' + d)) kusur.push('disallow-eksik:' + d);
  }
  /* ads.txt panel degeriyle tutarli mi */
  let adsId = '';
  try { adsId = String((JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8')).settings || {}).adsense || '').trim(); } catch (e) {}
  const ap = path.join(KOK, 'ads.txt');
  const adsVar = fs.existsSync(ap);
  if (!adsId && adsVar) kusur.push('ads.txt-var-ama-panel-bos');
  if (/^ca-pub-\d{10,20}$/.test(adsId)) {
    if (!adsVar) kusur.push('ads.txt-yok-ama-panel-dolu');
    else if (!fs.readFileSync(ap, 'utf8').includes(adsId.replace(/^ca-pub-/, 'pub-'))) kusur.push('ads.txt-panel-degeriyle-uyumsuz');
  }
  ol('S6 · robots.txt (11 AI botu + Content-Signal + Sitemap + Disallow) ve ads.txt panelle tutarlı',
     kusur.length === 0, kusur.slice(0, 3).join(' | ') || (adsId ? 'ads.txt ' + adsId : 'ads.txt yok (panel boş — doğru)'));
}

console.log(`\n  ${gecti} geçti · ${kaldi} kaldı`);
if (kaldi > 0) { console.log('  YENİ KABUK DENETİMİ KALDI — yayın çıkmamalı.'); process.exit(1); }
console.log('  yeni kabuk temiz.\n');
