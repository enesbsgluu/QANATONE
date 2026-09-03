#!/usr/bin/env node
/* PANEL ENVANTERI (TUR 4, 4 Eyl 2026) — "her alanin panelde yuvasi var mi?"

   NEDEN VAR. Panel kapisi (panel-kapi.cjs) YAZILAN alanin uretimde
   gorundugunu kanitlar; bu betik TERS soruyu sorar: uretilen sayfada duran
   bir metnin panelde KARSILIGI var mi? Ikisi ayri sorudur ve ikincisi
   sessizce kacar — Enes bir cumleyi degistirmek isteyip yerini bulamaz.

   YONTEM (kaynak tarama, uretilen HTML degil — cunku sorulan sey metnin
   NEREDEN geldigi):
     · her .astro'nun SABLON bolgesi (frontmatter ve <style>/<script> disi)
       taranir; JSX yorumlari da atlanir,
     · `{...}` ifadelerinin ICI dinamik sayilir; icinde m( / T( / icerik.
       / veri gecerse PANELDEN gelir,
     · duz metin dugumleri ve gorunur oznitelikler (aria-label, placeholder,
       title, alt) SABIT sayilir.
   Sabit metin her zaman kusur DEGIL: bir kismi teknik (ikon etiketi,
   yon oku), bir kismi zaten `m()` ile panele acilmis komsunun icinde.
   Bu yuzden cikti HUKUM degil ENVANTERDIR: dosya dosya sayilar + ilk
   ornekler; hangisinin panele acilacagi Enes'in karari.

   KULLANIM: node yeni/panel-envanter.cjs
   ENV: ESIK (kac karakterden kisa metin sayilmaz, varsayilan 3) */
const fs = require('fs');
const path = require('path');
const ESIK = Number(process.env.ESIK || 3);
const SRC = path.join(__dirname, 'src');
const CIKTI = path.join(__dirname, 'panel-envanter.json');

/* gorunur oznitelikler: ekranda ya da erisilebilirlik agacinda okunur */
const NITELIK = /\b(aria-label|placeholder|title|alt|aria-description|content)="([^"{}]{3,})"/g;

/* ---- TUR 2 (5 Eyl 2026) — IKI DUZELTME, IKISI DE GOZ ONUNDE ----

   BIR: <meta> GORUNUR DEGIL. Arac kendi tanimini ("ekranda ya da
   erisilebilirlik agacinda okunur") kendi ciginemiyordu: `content=`
   NITELIK listesinde oldugu icin <meta name="viewport" content="width=
   device-width, initial-scale=1">, <meta name="robots" content="noindex">
   ve <meta name="twitter:card" content="summary_large_image"> "panele
   acilmamis gorunur oznitelik" diye sayiliyordu. Ucu de HTML tesisati.
   AMA her <meta content> teknik degil: og:title / og:description /
   description GERCEK KOPYA. Bu yuzden meta ATILMIYOR, AYRILIYOR — adi
   kopya listesinde olan sayilir, olmayanin adi teknik_meta'ya yazilir.
   Susturma degil, baska kutuya koyma: kutu ciktida GORUNUR.

   IKI: URUN OLMAYAN SAYFA. Iki sayfa kendi icinde "urun degil, olcum
   zemini" yaziyor (deneme-react, film/en-film). Onlarin metni panele
   acilmaz — ama sessizce de dusurulmez: ISTISNA listesinde GEREKCESIYLE
   durur ve ozet onlari ayri sayar. Bir metnin istisna olmasi icin
   BURAYA YAZILMASI gerekir; yazilmayan her sabit metin acik kalemdir. */
const META = /<meta\b[^>]*>/g;
const META_KOPYA = /\b(name|property)="(description|keywords|og:title|og:description|og:site_name|og:image:alt|twitter:title|twitter:description)"/i;

/* URUN OLMAYAN SAYFALAR — metinleri panel kalemi degil. Gerekce zorunlu. */
const ISTISNA_SAYFA = {
  'pages/deneme-react.astro': 'olcum zemini — sayfa kendi icinde "urun degil, olcum zemini: asagidaki kart React + motion adasidir" diyor; dist e giriyor ama noindex ve sitemap disinda (kesme kalemi)',
  'pages/film.astro': 'olcum zemini — kunye: "39 kliplik scroll-scrub adasinin OLCUM ZEMINI; urun sayfasi degil"',
  'pages/en/film.astro': 'olcum zemini — film.astro nun EN esi, ayni kunye',
};
/* TEK TEK METIN ISTISNALARI — dosya + tam metin. Gerekce zorunlu. */
const ISTISNA_METIN = [
  { dosya: 'parcalar/Nav.astro', metin: 'QANAT', neden: 'marka kelimesi — logo tipografik olarak QANAT + ONE diye bolunmus (<b>QANAT<span>ONE</span></b>), metin degil GORSEL kimlik; panele acilirsa bir yazim hatasi site kimligini bozar' },
  { dosya: 'parcalar/Nav.astro', metin: 'ONE', neden: 'marka kelimesinin ikinci parcasi — yukaridakiyle ayni gerekce' },
  { dosya: 'layouts/Temel.astro', metin: 'QANAT', neden: 'marka kelimesi — alt bilgi logosu, Nav ile ayni gerekce (<b>QANAT<span>ONE</span></b>)' },
  { dosya: 'layouts/Temel.astro', metin: 'ONE', neden: 'marka kelimesinin ikinci parcasi — alt bilgi logosu' },
  { dosya: 'layouts/Temel.astro', metin: 'QANATONE', neden: 'filigranin gorunmez basligi (<h2 class="vh">) — ekran okuyucuya sayfanin KIMLIGINI verir, cevrilecek kopya degil' },
  { dosya: 'parcalar/TeslimatBlok.astro', metin: 'pazar-raporu/', neden: 'yol gorunumlu gorsel motif (.tppath / <b>), okunacak kopya degil; slug oldugu icin iki dilde de ayni' },
];
const istisnaMi = (dosya, metin) => ISTISNA_METIN.some((i) => i.dosya === dosya && i.metin === metin);
/* teknik/gorunmez kabul edilenler: yalniz noktalama, sayi, tek harf,
   URL, sinif benzeri, HTML varlik */
const TEKNIK = (t) => !t || t.length < ESIK || /^[\s\p{P}\p{S}0-9]+$/u.test(t)
  || /^(https?:|\/|#|\$\{|mailto:)/.test(t) || /^[a-z-]+$/.test(t) && !/[aeiouıöü]{2}/.test(t);

/* BETIK YUZEYI TARAYICISI (TUR 2, 5 Eyl 2026).
   Iki isaret, ikisi de kaydedilir:
     yuva   dizge GORUNUR BIR YUVAYA atanmis (textContent / innerText /
            innerHTML / placeholder / title / ariaLabel / createTextNode /
            setAttribute('aria-label'|'placeholder'|'title')). Yuksek
            guven: bu metin kesin ekrana ya da erisilebilirlik agacina gider.
     turkce dizge Turkceye ozgu harf tasiyor (cgiosu / CGIOSU). Yuva
            tespiti kacirsa bile TR kopyayi yakalar — EN ziyaretciye
            Turkce gosterilmesinin isareti budur.
   Secici/sinif/URL benzeri dizgeler elenir. Sayi HUKUM degil ENVANTER. */
const YUVA = /\.(textContent|innerText|innerHTML|placeholder|title|ariaLabel)\s*=\s*(['"`])((?:[^\\]|\\.)*?)\2|createTextNode\(\s*(['"`])((?:[^\\]|\\.)*?)\4|setAttribute\(\s*['"](?:aria-label|placeholder|title)['"]\s*,\s*(['"`])((?:[^\\]|\\.)*?)\6/g;
const TR_HARF = /[çğıöşüÇĞİÖŞÜ]/;
const DIZGE = /(['"`])((?:[^\\]|\\.)*?)\1/g;
/* BETIK AYIRICI — regex yetmiyor, olculdu (TUR 2, 5 Eyl 2026).
   `/<script[\s\S]*?<\/script>/` KENDI KENDINI KAPATAN etiketi goremez.
   Temel.astro'da uc tane var (97, 125, 209); regex 97'deki acilisi
   209'daki kapanisa kadar TEK BLOK sayiyor ve ARADAKI 112 SATIR SABLONU
   siliyordu — envanter o govdeye KOR'du. (Oradaki metinler zaten m() ile
   acilmis oldugu icin acik kalem gizlemiyordu; korluk yine de gercek.)
   Acilis etiketinin sonu TIRNAK ve {} FARKINDALIGIYLA bulunur, cunku
   `set:html={...}` icinde `>` gecebiliyor (Film.astro 184: `indexOf(..)>-1`). */
function ayirBetik(kaynak) {
  const betikler = [];
  let govde = '', i = 0;
  for (;;) {
    const a = kaynak.indexOf('<script', i);
    if (a < 0) { govde += kaynak.slice(i); break; }
    govde += kaynak.slice(i, a) + ' ';
    let j = a + 7, tirnak = '', derinlik = 0, kendiKapanan = false, etiketSonu = -1;
    for (; j < kaynak.length; j++) {
      const c = kaynak[j];
      if (tirnak) { if (c === tirnak) tirnak = ''; continue; }
      if (c === '"' || c === "'" || c === '\u0060') { tirnak = c; continue; }
      if (c === '{') { derinlik++; continue; }
      if (c === '}') { derinlik--; continue; }
      if (derinlik > 0) continue;
      if (c === '>') { kendiKapanan = kaynak[j - 1] === '/'; etiketSonu = j; break; }
    }
    if (etiketSonu < 0) { betikler.push(kaynak.slice(a)); break; }
    if (kendiKapanan) { betikler.push(kaynak.slice(a, etiketSonu + 1)); i = etiketSonu + 1; continue; }
    const kapat = kaynak.indexOf('<\/script>', etiketSonu);
    if (kapat < 0) { betikler.push(kaynak.slice(a)); break; }
    betikler.push(kaynak.slice(a, kapat + 9));
    i = kapat + 9;
  }
  return { govde, betikler };
}

function betikTara(ham) {
  /* ONCE YORUMLAR AYIKLANIR — yazili kural. Ayiklanmazsa `turkce` isareti
     betik yorumlarindaki Turkce prozayi kopya sanar, ustelik yorumdaki
     kesme isaretleri dizge sinirlarini kaydirir (ilk surumde ikisi de oldu). */
  const kaynak = ham
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1 ');
  const yuva = [], turkce = [];
  let m;
  YUVA.lastIndex = 0;
  while ((m = YUVA.exec(kaynak))) {
    const v = (m[3] ?? m[5] ?? m[7] ?? '').replace(/\s+/g, ' ').trim();
    if (v && !TEKNIK(v)) yuva.push(v);
  }
  DIZGE.lastIndex = 0;
  while ((m = DIZGE.exec(kaynak))) {
    const v = m[2].replace(/\s+/g, ' ').trim();
    if (v.length >= 4 && TR_HARF.test(v) && !TEKNIK(v) && !yuva.includes(v)) turkce.push(v);
  }
  return { yuva, turkce };
}

function sablon(kaynak) {
  /* frontmatter --- ... --- atlanir */
  let s = kaynak;
  if (s.startsWith('---')) { const i = s.indexOf('\n---', 3); if (i > 0) s = s.slice(i + 4); }
  /* style ve script bloklari cikarilir */
  s = s.replace(/<style[\s\S]*?<\/style>/g, '');
  /* BETIK BLOKLARI ATILMIYOR, AYRILIYOR (TUR 2, 5 Eyl 2026): ada JS'i
     ekrana metin yaziyor ve o metin bugune kadar envanterde HIC gorunmedi.
     Ayirma REGEXLE DEGIL kucuk bir ayristiriciyla — gerekcesi ayirBetik'te. */
  const { govde, betikler } = ayirBetik(s);
  s = govde;
  /* JSX yorumlari {/* ... *\/} cikarilir */
  s = s.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');
  /* <meta> AYRILIR (silinmez): kopya tasiyanlar sablonda kalir, teknik
     olanlar ayri kutuya gider ve ciktida adiyla yazilir. */
  const teknikMeta = [];
  s = s.replace(META, (t) => {
    if (META_KOPYA.test(t)) return t;                 /* gercek kopya: sayilsin */
    const ad = (t.match(/\b(?:name|property|charset|http-equiv)="?([^"\s>]+)/) || [, 'adsiz'])[1];
    const deger = (t.match(/content="([^"{}]*)"/) || [])[1];
    if (deger && !TEKNIK(deger)) teknikMeta.push(`${ad}="${deger}"`);
    return ' ';
  });
  return { s, teknikMeta, betikMetni: betikTara(betikler.join('\n')) };
}

/* duz metin dugumleri: etiketler ve {ifade} bloklari disinda kalan metin */
function metinDugumleri(s) {
  const out = [];
  let derinlik = 0, buf = '', etiket = false, tirnak = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (etiket) {
      if (tirnak) { if (c === tirnak) tirnak = ''; }
      else if (c === '"' || c === "'") tirnak = c;
      else if (c === '{') derinlik++;
      else if (c === '}') derinlik--;
      else if (c === '>' && derinlik === 0) etiket = false;
      continue;
    }
    if (c === '<' && /[a-zA-Z/!]/.test(s[i + 1] || '')) { if (buf.trim()) out.push(buf.trim()); buf = ''; etiket = true; continue; }
    if (c === '{') { if (buf.trim()) out.push(buf.trim()); buf = ''; let d = 1; i++; while (i < s.length && d > 0) { if (s[i] === '{') d++; else if (s[i] === '}') d--; i++; } i--; continue; }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.map((t) => t.replace(/\s+/g, ' ').trim()).filter((t) => !TEKNIK(t));
}

const rapor = {};
(function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { gez(p); continue; }
    if (!e.name.endsWith('.astro')) continue;
    const rel = path.relative(SRC, p).replace(/\\/g, '/');
    const ham = fs.readFileSync(p, 'utf8');
    const { s, teknikMeta, betikMetni } = sablon(ham);
    const hamSabitler = metinDugumleri(s);
    /* Istisnalar AYRILIR, atilmaz — sayilari ve gerekceleri kayitta durur */
    const sayfaIstisna = ISTISNA_SAYFA[rel] || null;
    const sabitler = sayfaIstisna ? [] : hamSabitler.filter((t) => !istisnaMi(rel, t));
    const metinIstisna = sayfaIstisna ? hamSabitler : hamSabitler.filter((t) => istisnaMi(rel, t));
    const nitelikler = [];
    let m; NITELIK.lastIndex = 0;
    while ((m = NITELIK.exec(s))) { const v = m[2].replace(/\s+/g, ' ').trim(); if (!TEKNIK(v)) nitelikler.push(`${m[1]}="${v}"`); }
    const nitelikGecerli = sayfaIstisna ? [] : nitelikler;
    /* `m(` VE `M(` birlikte sayilir: iki imza da panelden okur (TUR 4) */
    const mSayi = (ham.match(/\b[mM]\(\s*'[a-zA-Z0-9_]+'/g) || []).length;
    if (sabitler.length || nitelikGecerli.length || mSayi || metinIstisna.length || teknikMeta.length || betikMetni.yuva.length || betikMetni.turkce.length) {
      rapor[rel] = { panelli: mSayi, sabit_metin: sabitler.length, sabit_nitelik: nitelikGecerli.length,
        ornek: sabitler.slice(0, 6), ornek_nitelik: nitelikGecerli.slice(0, 4),
        ...(metinIstisna.length ? { istisna_metin: metinIstisna, istisna_neden: sayfaIstisna || ISTISNA_METIN.filter((i) => i.dosya === rel).map((i) => i.neden) } : {}),
        ...(teknikMeta.length ? { teknik_meta: teknikMeta } : {}),
        ...(betikMetni.yuva.length || betikMetni.turkce.length ? { betik_metni: betikMetni } : {}) };
    }
  }
})(SRC);

const sirali = Object.entries(rapor).sort((a, b) => (b[1].sabit_metin + b[1].sabit_nitelik) - (a[1].sabit_metin + a[1].sabit_nitelik));
let tS = 0, tN = 0, tP = 0;
console.log('DOSYA                                        panelli  sabit-metin  sabit-nitelik');
for (const [f, r] of sirali) {
  tS += r.sabit_metin; tN += r.sabit_nitelik; tP += r.panelli;
  if (r.sabit_metin + r.sabit_nitelik === 0) continue;
  console.log(`${f.padEnd(44)}${String(r.panelli).padStart(7)}${String(r.sabit_metin).padStart(13)}${String(r.sabit_nitelik).padStart(15)}`);
}
console.log(`\nTOPLAM: panelden okunan cagri ${tP} · sabit metin ${tS} · sabit gorunur nitelik ${tN}`);
if (tS + tN) {
  console.log('EN COK SABIT TASIYAN UC DOSYANIN ORNEKLERI:');
  for (const [f, r] of sirali.slice(0, 3)) if (r.sabit_metin + r.sabit_nitelik) console.log(`  ${f}\n    ${r.ornek.concat(r.ornek_nitelik).join(' | ').slice(0, 220)}`);
}
/* ISTISNALAR HER KOSUMDA BASILIR — "0 acik kalem" cumlesi ancak bu liste
   goz onundeyken dogru okunur: sifir olan GEREKCESIZ kalem sayisidir,
   susturulmus kalem degil. */
let tI = 0, tM = 0;
const istisnaSatir = [], metaSatir = [];
for (const [f, r] of sirali) {
  if (r.istisna_metin) { tI += r.istisna_metin.length; istisnaSatir.push([f, r]); }
  if (r.teknik_meta) { tM += r.teknik_meta.length; metaSatir.push([f, r]); }
}
console.log(`\nGEREKCELI ISTISNA: ${tI} metin (panel kalemi DEGIL — sebebi yazili)`);
for (const [f, r] of istisnaSatir) {
  const neden = Array.isArray(r.istisna_neden) ? r.istisna_neden : [r.istisna_neden];
  console.log(`  ${f}  [${r.istisna_metin.map((t) => JSON.stringify(t.slice(0, 40))).join(', ')}]`);
  for (const n of neden) console.log(`      ${n}`);
}
console.log(`\nTEKNIK <meta> (gorunur degil, panel kalemi degil): ${tM}`);
for (const [f, r] of metaSatir) console.log(`  ${f}  ${r.teknik_meta.join(' · ')}`);
let tBY = 0, tBT = 0;
const betikSatir = [];
for (const [f, r] of sirali) if (r.betik_metni) { tBY += r.betik_metni.yuva.length; tBT += r.betik_metni.turkce.length; betikSatir.push([f, r]); }
console.log(`\nBETIK YUZEYI (ada JS'inin ekrana yazdigi SABIT metin): ${tBY} gorunur yuvaya atanmis · ${tBT} Turkce dizge`);
for (const [f, r] of betikSatir) {
  console.log(`  ${f}`);
  if (r.betik_metni.yuva.length) console.log(`      yuva  : ${r.betik_metni.yuva.slice(0, 5).map((t) => JSON.stringify(t.slice(0, 46))).join(' ')}${r.betik_metni.yuva.length > 5 ? ' …(' + r.betik_metni.yuva.length + ')' : ''}`);
  if (r.betik_metni.turkce.length) console.log(`      turkce: ${r.betik_metni.turkce.slice(0, 5).map((t) => JSON.stringify(t.slice(0, 46))).join(' ')}${r.betik_metni.turkce.length > 5 ? ' …(' + r.betik_metni.turkce.length + ')' : ''}`);
}
console.log(`\nACIK KALEM — DOM/OZNITELIK yuzeyi (gerekcesi yazilmamis): ${tS + tN}`);
console.log(`ACIK KALEM — BETIK yuzeyi (panele acilmamis, EN ziyaretciye de Turkce gosteriliyor): ${tBY + tBT}`);
fs.writeFileSync(CIKTI, JSON.stringify({ _: 'yeni/panel-envanter.cjs — kaynak taramasi: hangi metin panelden geliyor, hangisi sabit. HUKUM DEGIL envanter. Istisnalar SILINMEZ, gerekcesiyle ayri sayilir.', olcum: new Date().toISOString(), toplam: { panelli: tP, sabit_metin: tS, sabit_nitelik: tN, gerekceli_istisna: tI, teknik_meta: tM }, dosya: rapor }, null, 1));
console.log(`\n→ ${CIKTI}`);
