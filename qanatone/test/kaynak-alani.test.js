#!/usr/bin/env node
'use strict';
/* test/kaynak-alani.test.js — panelin KAYNAK alani gercekten uca bagli mi
   node test/kaynak-alani.test.js

   NEDEN VAR. Enes'in kurali (10 Eyl 2026): "haber kaynaklarini
   vermeyecegiz cunku habercilik, bilinen bir bilgiyi kendi yorumlama
   sanatidir. Alan yalniz cok onemli politik konular icin dursun."
   Yani kaynak alani NORMALDE BOS kalacak — ve bos duran bir alanin
   bozuldugu FARK EDILMEZ. Gun gelip gercekten kaynak yazilmasi
   gerektiginde alanin calismadigini ogrenmek en pahali kusurdur:
   [[qanatone-anahtar-kullanimi-olculur]] "atil panel alani = en pahali
   yanlis yesil". Bu yuzden kapi alanin BOS OLDUGU donemde de kosar.

   NE OLCER — SIMULASYON DEGIL, GERCEK PANEL. `admin.html` jsdom'da
   acilir, sunucu uclari (`?veri=1` / `?kayitlar=1`) taklit edilir,
   panel kendi `kur()` akisiyla boot eder. Sonra UC bolumun (bulten,
   nedir, haberler) kaynak alanina GERCEKTEN yazilir ve panelin kendi
   `kayitFarki()` fonksiyonu sorgulanir — yani yayina gidecek govdenin
   ta kendisi. Alanin varligini saymak yetmez: `data-src` alani durup
   `bind` kalkarsa panel "yazdim" der, yayin bos gider.

   FIKSTUR NEDEN VAR: nedir ve haberler bugun BOS koleksiyonlar. Kayit
   yoksa o sekmede kaynak alani hic cizilmez ve kapi uc bolumun ikisini
   olcemezdi. Fikstur `?kayitlar=1` taklidine konur — depoya yazilmaz. */

const fs = require('fs');
const path = require('path');

let gecti = 0, kaldi = 0;
function ol(ad, kosul, ayrinti) {
  console.log('  ' + (kosul ? 'ok ' : '!! ') + ad.padEnd(58) + ' ' + (ayrinti || ''));
  if (kosul) gecti++; else kaldi++;
}
const bitir = () => {
  console.log(`\n  ${gecti} geçti · ${kaldi} kaldı\n`);
  process.exit(kaldi ? 1 : 0);
};

const KOK = path.join(__dirname, '..');
const panelHtml = fs.readFileSync(path.join(KOK, 'admin.html'), 'utf8');
const icerik = JSON.parse(fs.readFileSync(path.join(KOK, 'content.json'), 'utf8'));
const sozlesme = JSON.parse(fs.readFileSync(
  path.join(KOK, 'yeni', 'src', 'veri', 'sayfalar.json'), 'utf8'));

/* Dizin ozeti panel.js'in KENDI fonksiyonundan (asagidaki fetch taklidi). */
const { ozetle } = require(path.join(KOK, 'netlify', 'functions', 'panel.js'));

/* Dosyada duran koleksiyonlar — sozlesmeden, panelde oldugu gibi. */
const DOSYA_KOL = (sozlesme.koleksiyon || [])
  .filter((k) => k.depo === 'dosya')
  .map((k) => ({ ad: k.ad, kaynak: k.kaynak, klasor: k.klasor }));

/* Her bolume EN AZ BIR kayit: gercek kayitlar + eksik kalan bolumler
   icin fikstur. Fikstur gercek kayit sekliyle ayni (slug/title/...). */
const fikstur = (slug) => ({
  slug, date: '2026-09-10', read: 3, topic: '', sector: '',
  tag: { tr: 'Deneme', en: 'Test' },
  title: { tr: 'Kapı kaydı', en: 'Gate record' },
  lede: { tr: 'Kapı için.', en: 'For the gate.' },
  body: { tr: [], en: [] }, sources: []
});
/* ILK KAYIT KAYNAKLI BASLAR — SILME BOYLE OLCULEBILIR. Depodaki
   yazilarin hepsi artik kaynaksiz (Enes'in kurali); temel de kaynaksiz
   olsaydi "alani bosalt" adimi HICBIR fark uretmezdi ve kapi kendi
   olcutunden yanlis kirmizi verirdi (ilk yazimda tam bunu yapti).
   Enes'in gercek akisi zaten bu yon: DOLU kaynagi silmek. */
const TEMEL_KAYNAK = [
  { n: 'Resmî Gazete', u: 'https://www.resmigazete.gov.tr/onceki' },
  { n: 'Adressiz eski kaynak', u: '' }
];
const kayitlar = {};
for (const kol of DOSYA_KOL) {
  const d = path.join(KOK, kol.klasor);
  const gercek = fs.existsSync(d)
    ? fs.readdirSync(d).filter((a) => a.endsWith('.json'))
        .map((a) => JSON.parse(fs.readFileSync(path.join(d, a), 'utf8')))
    : [];
  const dizi = gercek.length ? gercek : [fikstur('kapi-' + kol.ad)];
  dizi[0] = JSON.parse(JSON.stringify(dizi[0]));
  dizi[0].sources = JSON.parse(JSON.stringify(TEMEL_KAYNAK));
  kayitlar[kol.ad] = dizi;
}

/* Sekme kimligi -> koleksiyon anahtari. Panelin kendi P tablosundaki
   adlar; degisirse kapi kirmizi doner (dogru davranis: alan tasindi). */
const BOLUM = [
  ['bulten', 'posts', 'yazilar'],
  ['nedirb', 'explainers', 'nedir'],
  ['haberb', 'news', 'haberler']
];

let JSDOM;
try { ({ JSDOM } = require(path.join(KOK, 'node_modules', 'jsdom'))); }
catch (e) {
  ol('jsdom bulundu', false, 'kok node_modules/jsdom yok — `npm i` gerekiyor');
  bitir();
}

const dom = new JSDOM(panelHtml, {
  url: 'https://www.qanatone.com/admin.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(win) {
    /* SUNUCU UCLARI. Panel `?veri=1` ve `?kayitlar=1` bekler; ikisi de
       Basic Auth'un ardindaki fonksiyondan gelir. Burada gercek disk
       icerigi doner — kapi depodaki halle kosar. */
    win.fetch = async (u) => {
      const s = String(u);
      const q = new URL(s, 'https://www.qanatone.com/admin.html').searchParams;
      /* Tur 2 · B7: acilis `?dizin=1` (ozet), kayit acilinca `?kayit=`.
         Ozet panel.js'in KENDI fonksiyonuyla uretilir — test ikinci bir
         ozet bicimi tutsaydi panel uretimde bozulurken kapi yesil kalirdi. */
      if (q.get('dizin') === '1')
        return { ok: true, json: async () => ({ koleksiyon: DOSYA_KOL,
          dizin: Object.fromEntries(Object.entries(kayitlar).map(([ad, d]) => [ad, d.map(ozetle)])) }) };
      if (q.has('kayit')) {
        const k = (kayitlar[q.get('kol')] || []).find((x) => x.slug === q.get('kayit'));
        return k ? { ok: true, json: async () => JSON.parse(JSON.stringify(k)) }
          : { ok: false, status: 404, json: async () => ({}) };
      }
      if (q.get('kayitlar') === '1')
        return { ok: true, json: async () => ({ koleksiyon: DOSYA_KOL, kayitlar }) };
      if (s.includes('veri=1'))
        return { ok: true, json: async () => JSON.parse(JSON.stringify(icerik)) };
      return { ok: false, status: 404, json: async () => ({}) };
    };
    win.alert = () => {};
    win.confirm = () => true;
  }
});
const win = dom.window;
const doc = win.document;

/* Panel `kur()`i modul sonunda cagirir; iki fetch + boot bekleniyor. */
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  /* HAZIRLIK SINYALI VERIYE BAGLI, KODA DEGIL. Ilk yazimda `show`
     fonksiyonunun VARLIGI beklenmisti — `function` bildirimi hoist
     edildigi icin o kosul `kur()` daha veriyi almadan saglaniyordu ve
     sekme BOS ciziliyordu: kapi "0 alan / 6 kayit" diye YANLIS KIRMIZI
     verdi. Beklenen sey verinin kendisi. */
  const kayitSay = () => {
    try { win.show('bulten'); } catch (e) { return 0; }
    return doc.querySelectorAll('#ed .item').length;
  };
  for (let i = 0; i < 200 && !(typeof win.show === 'function' && kayitSay()); i++) await bekle(25);
  const n = typeof win.show === 'function' ? kayitSay() : 0;
  ol('panel boot etti ve kayıtlar yüklendi',
     n > 0 && typeof win.kayitFarki === 'function',
     'bülten sekmesinde ' + n + ' kayıt kartı · kayitFarki=' + typeof win.kayitFarki);
  if (!n) bitir();

  for (const [sekme, kaynak, kolAd] of BOLUM) {
    let hata = null;
    try { win.show(sekme); } catch (e) { hata = e; }
    if (hata) { ol(sekme + ' · sekme açıldı', false, String(hata.message).slice(0, 70)); continue; }

    /* B6 (Tur 2): kayitlar KAPALI cizilir, alan ancak kayit acilinca
       var. Hepsi acilir — acma yolu (ozet → ?kayit= → yerinde cizim)
       boylece bu kapidan da gecer. */
    const acici = () => [...doc.querySelectorAll('#ed [data-ac]')];
    for (const b of acici()) b.click();
    for (let i = 0; i < 300 && doc.querySelectorAll('#ed .kg').length < acici().length; i++) await bekle(10);

    const alanlar = [...doc.querySelectorAll('textarea[data-src]')];
    const kayitSayisi = (kayitlar[kolAd] || []).length;
    ol(sekme + ' · her kayıtta kaynak alanı var',
       alanlar.length === kayitSayisi,
       alanlar.length + ' alan / ' + kayitSayisi + ' kayıt');
    if (!alanlar.length) continue;

    /* KURAL NOTU HER BOLUMDE. Kaynak yazmama karari haberlere ozel
       degil (Enes, 10 Eyl: "sindikilerde dahil"); notu yalniz bir
       sekmede tutmak kurali diger iki sekmede gorunmez kilar. */
    const govde = doc.querySelector('#ed').innerHTML;
    ol(sekme + ' · editoryal kaynak kuralı notu yazıyor',
       /kaynak\s+yazm[ıi]yoruz/i.test(govde),
       /kaynak\s+yazm[ıi]yoruz/i.test(govde) ? 'not yerinde' : 'NOT YOK');

    /* ---- ASIL OLCUM: yaz -> yayina gidecek govdede gorun ---- */
    const el = alanlar[0];
    const yol = el.dataset.src;                      /* ornek: posts.0.sources */
    const slug = (kayitlar[kolAd][0] || {}).slug;

    /* KAYITTAN ALANA: temeldeki kaynak alanda gorunmeli. Gorunmezse
       Enes yayindaki kaynagi panelde goremez ve ilk kaydetmede siler. */
    ol(sekme + ' · kayıttaki kaynak alanda açılıyor',
       el.value === 'Resmî Gazete :: https://www.resmigazete.gov.tr/onceki\nAdressiz eski kaynak :: ',
       JSON.stringify(el.value));

    el.value = 'Resmî Gazete :: https://www.resmigazete.gov.tr/x\nAdressiz kaynak';
    el.dispatchEvent(new win.Event('input', { bubbles: true }));

    const bul = () => (win.kayitFarki().degisen || [])
      .find((d) => d.kaynak === kaynak && d.slug === slug);
    const d1 = bul();
    const s1 = d1 && d1.kayit && d1.kayit.sources;
    ol(sekme + ' · yazılan kaynak yayın gövdesine ulaşıyor',
       !!s1 && s1.length === 2
         && s1[0].n === 'Resmî Gazete' && s1[0].u === 'https://www.resmigazete.gov.tr/x'
         && s1[1].n === 'Adressiz kaynak' && s1[1].u === '',
       s1 ? JSON.stringify(s1) : 'kayıt DEĞİŞEN listesinde yok (' + yol + ')');

    /* GERI DONUS: alan bosaltilinca kaynak GERCEKTEN kalkmali.
       Enes'in akisi tam bu — bugun dolu olan kaynagi silmek. */
    el.value = '';
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
    const d2 = bul();
    const s2 = d2 && d2.kayit && d2.kayit.sources;
    ol(sekme + ' · alan boşaltılınca kaynak siliniyor',
       Array.isArray(s2) && s2.length === 0,
       JSON.stringify(s2));

    /* GIDIS-DONUS: panel yeniden cizilince ayni metin geri gelmeli;
       gelmezse Enes kaydettigini bir sonraki acilista kaybeder. */
    win.set(yol, [{ n: 'A kaynağı', u: 'https://a.example/x' }, { n: 'B kaynağı', u: '' }]);
    win.show(sekme);
    const el2 = doc.querySelector('textarea[data-src="' + yol + '"]');
    const beklenen = 'A kaynağı :: https://a.example/x\nB kaynağı :: ';
    ol(sekme + ' · kayıttan alana geri yazım birebir',
       !!el2 && el2.value === beklenen,
       el2 ? JSON.stringify(el2.value) : 'alan bulunamadı');
    win.set(yol, []);
  }

  /* SITE TARAFI: bos kaynak hicbir iz birakmamali. Kaynak render'i
     KOSULLU olmali; kosul kalkarsa her yazida bos bir "Kaynaklar"
     basligi cikar ve bunu kimse fark etmez (alan hep bos). */
  const govde = fs.readFileSync(
    path.join(KOK, 'yeni', 'src', 'parcalar', 'YaziGovde.astro'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  ol('site: kaynak bloğu koşullu (boş kaynak iz bırakmaz)',
     /sources\?\.length\s*>\s*0/.test(govde),
     /sources\?\.length\s*>\s*0/.test(govde) ? 'sources?.length > 0' : 'KOŞUL YOK');

  /* VAAT ILE DAVRANIS AYNI OLMALI. Bolum giris metinleri 10 Eyl'e kadar
     "kaynagiyla birlikte yaziyoruz" / "with the source next to it"
     diyordu; kaynak yazilmayan bir bolumde bu YALAN olur ve kimse fark
     etmez, cunku metin varsayilan olarak koddan/sozlesmeden geliyor
     (content.json'da TR karsiligi bile yok). Aranan sey kelimenin
     kendisi degil VAAT: "kaynagiyla/kaynagiyla birlikte" ve EN esi. */
  /* KAPSAM TUM `yeni/src` — ILK YAZIMDA IKI DOSYAYLA SINIRLIYDI ve
     19 DOSYAYI KACIRDI: vaat asil META ACIKLAMALARDAydi (`const
     aciklama = '... — kaynagiyla.'`), yani Google'da gorunen cumlede.
     Bolum giris metnini duzeltip meta'yi birakmak, yalani en gorunur
     yerde birakmak olurdu. */
  /* 10 Eyl 2026: kalip genisledi. "with the source" yalniz BIR kalibi
     yakaliyordu; /en/sektor ("With numbers and sources."), /en/nedir
     ("with examples and sources") meta aciklamalari gecip gidiyordu —
     /en/sektor/saglik canlidaydi. Vaadin EN esi "... and sources". */
  const VAAT = /kayna[ğg][ıi]yla|kaynaklar[ıi]yla|with the source|\band sources\b/i;
  const suclu = [];
  const gez = (d) => {
    for (const ad of fs.readdirSync(d)) {
      const t = path.join(d, ad);
      if (fs.statSync(t).isDirectory()) { gez(t); continue; }
      if (!/\.(astro|ts|tsx|mjs|json)$/.test(ad)) continue;
      const k = fs.readFileSync(t, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      if (VAAT.test(k)) suclu.push(path.relative(KOK, t).replace(/\\/g, '/'));
    }
  };
  gez(path.join(KOK, 'yeni', 'src'));
  /* content.json: yalniz BOLUM GIRIS anahtarlari (bkp/ndz3/hbz3).
     Tum dosyayi taramak yanlis kirmizi verirdi — hizmet metinlerinde
     "bagimsiz kaynaklarda" gibi mesru kullanimlar var. */
  const str = (icerik.strings || {});
  for (const dil of Object.keys(str))
    for (const anahtar of ['bkp', 'ndz3', 'hbz3']) {
      const v = str[dil] && str[dil][anahtar];
      const d = typeof v === 'string' ? v : (v && (v.tr || '') + ' ' + (v.en || '')) || '';
      if (VAAT.test(d)) suclu.push('strings.' + dil + '.' + anahtar);
    }
  ol('bölüm girişleri kaynak VAAT ETMİYOR (vaat = davranış)',
     suclu.length === 0, suclu.length ? suclu.join(' | ') : 'yeni/src taranmış · content.json bölüm girişleri temiz');

  bitir();
})().catch((e) => { ol('kapı çalıştı', false, String(e && e.stack || e).slice(0, 200)); bitir(); });
