#!/usr/bin/env node
/* ICERIK AYIRMA — "10 -> 10.000" Kademe 2 (9 Eyl 2026).

   NE YAPAR
     `content.json` icindeki BUYUYEN koleksiyonlari (posts / explainers /
     news) dosya basina bir kayda ayirir:
         qanatone/icerik/<klasor>/<slug>.json
     ve o dizileri content.json'dan cikarir. Kalan content.json ayar ve
     sabit icerik dosyasidir (olculdu: 145 KB, olcekle BUYUMEZ; 97 KB'i
     `services`).

   NEDEN
     Duvarlar olculdu (ICERIK-MIMARISI-OLCUM.md + 9 Eyl aksam olcumu):
       taslak localStorage 5.242.086 karakter -> 1.447 yazi
       yayinla POST govdesi 6 MiB            -> 1.651 yazi
     Ikisi de "butunu her seferinde butun olarak tasimak"tan doguyor.
     Dosya basina kayitta panel DIZIN yukler (239 B/yazi) ve yayin
     yalniz DEGISEN dosyayi commit eder.

   HANGI KOLEKSIYON AYRILIR
     Karar `veri/sayfalar.json`da: `depo: "dosya"` tasiyan koleksiyon
     ayrilir, `klasor` nereye yazilacagini soyler. `hizmetler` (9) ve
     `projeler` (7) AYRILMAZ — sayilari sabit, olcekle buyumuyorlar ve
     panelde tek tek degil butun olarak duzenleniyorlar.

   TEKRAR KOSULABILIR
     Ayrilmis bir depoda ikinci kez kosarsa dosyalari YENIDEN yazar ama
     icerik ayni kalir (kaynak content.json'da dizi yoksa dokunmaz).
     `geri` komutu dosyalari okuyup content.json'a iade eder — goc
     tek yonlu bir kapi degil.

   KULLANIM
     node yeni/icerik-ayir.cjs ayir     # content.json -> dosyalar
     node yeni/icerik-ayir.cjs geri     # dosyalar -> content.json
     node yeni/icerik-ayir.cjs durum    # ne nerede duruyor
*/
'use strict';
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const ICERIK = path.join(KOK, 'content.json');
const SAYFALAR = path.join(__dirname, 'src', 'veri', 'sayfalar.json');

const oku = p => JSON.parse(fs.readFileSync(p, 'utf8'));
/* content.json'i panelin yazdigi bicimde yaz: 2 bosluk girinti + son
   satir sonu. yayinla.js de `JSON.stringify(x, null, 2)` yaziyor;
   bicim ayrisirsa her yayin devasa bir diff uretir. */
const yaz = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8');

/** Ayrilacak koleksiyonlar: sayfalar.json'da `depo: "dosya"` olanlar. */
function ayrilacaklar() {
  return oku(SAYFALAR).koleksiyon.filter(k => k.depo === 'dosya');
}

function dizin(k) { return path.join(KOK, k.klasor); }

function ayir() {
  const j = oku(ICERIK);
  let toplam = 0, degisti = false;
  for (const k of ayrilacaklar()) {
    const kayitlar = j[k.kaynak];
    if (!Array.isArray(kayitlar)) { console.log('  ..', k.ad, '- content.json\'da dizi yok, atlandi'); continue; }
    const d = dizin(k);
    fs.mkdirSync(d, { recursive: true });
    for (const kayit of kayitlar) {
      if (!kayit || !kayit.slug) { console.log('  !!', k.ad, '- slug\'siz kayit atlandi'); continue; }
      yaz(path.join(d, kayit.slug + '.json'), kayit);
      toplam++;
    }
    /* DIZI CIKARILIR — birakilirsa iki kaynak olur ve hangisinin
       gecerli oldugu ilk celiskiye kadar gorunmez. */
    delete j[k.kaynak];
    degisti = true;
    console.log('  ok', k.ad, '->', k.klasor, '·', kayitlar.length, 'dosya');
  }
  if (degisti) yaz(ICERIK, j);
  console.log('ayrildi:', toplam, 'dosya · content.json', fs.statSync(ICERIK).size, 'B');
}

function geri() {
  const j = oku(ICERIK);
  for (const k of ayrilacaklar()) {
    const d = dizin(k);
    if (!fs.existsSync(d)) { console.log('  ..', k.ad, '- klasor yok'); continue; }
    const kayitlar = fs.readdirSync(d).filter(a => a.endsWith('.json'))
      .map(a => oku(path.join(d, a)))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    j[k.kaynak] = kayitlar;
    console.log('  ok', k.ad, '<-', kayitlar.length, 'dosya');
  }
  yaz(ICERIK, j);
  console.log('iade edildi · content.json', fs.statSync(ICERIK).size, 'B');
}

function durum() {
  const j = oku(ICERIK);
  console.log('content.json', fs.statSync(ICERIK).size, 'B');
  for (const k of ayrilacaklar()) {
    const d = dizin(k);
    const dosya = fs.existsSync(d) ? fs.readdirSync(d).filter(a => a.endsWith('.json')).length : 0;
    const dizi = Array.isArray(j[k.kaynak]) ? j[k.kaynak].length : '-';
    console.log('  ', k.ad.padEnd(10), 'dosya:', String(dosya).padStart(5), ' content.json dizisi:', dizi);
  }
}

const komut = process.argv[2];
if (komut === 'ayir') ayir();
else if (komut === 'geri') geri();
else if (komut === 'durum') durum();
else { console.log('kullanim: node yeni/icerik-ayir.cjs ayir|geri|durum'); process.exit(1); }
