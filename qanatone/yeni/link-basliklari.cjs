#!/usr/bin/env node
/* LINK BASLIKLARI (GECE ZINCIRI TUR 6, 2 Eyl 2026).
   Her uretilmis sayfa (dist kok + dist/yeni, 404 haric) icin HTTP Link
   basligi: canonical + hreflang alternate'ler — degerler sayfanin KENDI
   <head>'inden okunur (ikinci bir dogruluk kaynagi uydurulmaz). _headers
   dosyasina LINK-BASLIKLARI-BAS ... LINK-BASLIKLARI-SON isaretleri arasina
   yazilir; iki yol bicimi (/yol/ ve /yol) — Netlify dizin sayfasini ikisiyle
   de dogrudan sunar, baslik yalniz tam eslesen yola uygulanir.
   Kullanim: node yeni/link-basliklari.cjs            (once: iki derleme)
             KONTROL=1 node yeni/link-basliklari.cjs  (gomulu blok taze mi? cikis kodu)
   Not: _headers derlemede dist'e KOPYALANIR (build.js KOPYA); uretimden sonra
   `cp _headers dist/_headers` ya da kok derleme gerekir. */
const fs = require('fs');
const path = require('path');
const KOK = path.join(__dirname, '..');
const DIST = path.join(KOK, 'dist');
const sayfalar = [];
(function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(_astro|font|img|js|varlik)$/.test(e.name)) gez(p); }
    else if (e.name === 'index.html') sayfalar.push(p);
  }
})(DIST);
const satirlar = [];
let sayfaSayisi = 0, altSayisi = 0;
for (const p of sayfalar.sort()) {
  const h = fs.readFileSync(p, 'utf8').slice(0, 6000);
  const can = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (!can) continue;
  const alt = [...h.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `<${m[2]}>; rel="alternate"; hreflang="${m[1]}"`);
  const deger = [`<${can}>; rel="canonical"`].concat(alt).join(', ');
  const yol = '/' + path.relative(DIST, path.dirname(p)).replace(/\\/g, '/');
  const bicimler = yol === '/' ? ['/', '/index.html'] : [yol + '/', yol];
  for (const b of bicimler) satirlar.push(`${b}\n  Link: ${deger}`);
  sayfaSayisi++; altSayisi += alt.length;
}
const blok = satirlar.join('\n');
const H = path.join(KOK, '_headers');
const hd = fs.readFileSync(H, 'utf8');
const BAS = '# LINK-BASLIKLARI-BAS', SON = '# LINK-BASLIKLARI-SON';
const i = hd.indexOf(BAS), j = hd.indexOf(SON);
if (i < 0 || j < 0) { console.error('_headers isaretleri yok'); process.exit(2); }
const mevcut = hd.slice(i + BAS.length, j).replace(/^\r?\n|\r?\n$/g, '');
if (process.env.KONTROL) {
  /* ALT KUME kontrolu: Netlify'da kok derleme (ve icindeki eski suite) astro
     derlemesinden ONCE kosar, o anda dist/yeni yoktur. Kural "mevcut her
     sayfanin girdisi blokta birebir var mi" diye bakar; tam esitlik ancak iki
     dist de varken saglanir (uretim modu her zaman tam yazar). */
  const m2 = mevcut.replace(/\r\n/g, '\n');
  const eksik = satirlar.filter((s2) => !m2.includes(s2));
  const taze = eksik.length === 0;
  const not = taze ? (m2 === blok ? 'blok birebir' : 'blok ust kume (dist eksik olabilir)') : 'eksik/farkli ' + eksik.length + ' girdi, ilki: ' + eksik[0].split('\n')[0];
  console.log(`LINK BASLIKLARI ${taze ? 'TAZE' : 'BAYAT'}: ${sayfaSayisi} sayfa · ${satirlar.length} yol · ${altSayisi} alternate · ${not}`);
  process.exit(taze ? 0 : 1);
}
const nl = hd.includes('\r\n') ? '\r\n' : '\n';
fs.writeFileSync(H, hd.slice(0, i + BAS.length) + nl + blok.replace(/\n/g, nl) + nl + hd.slice(j));
console.log(`LINK BASLIKLARI: ${sayfaSayisi} sayfa · ${satirlar.length} yol · ${altSayisi} alternate · _headers ${fs.statSync(H).size} B`);
