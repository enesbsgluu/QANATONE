#!/usr/bin/env node
'use strict';
/* test/blok-metin.test.js — panelin govde donusturucusu
   node test/blok-metin.test.js

   NE OLCER. Panel artik govdeyi HTML olarak yazdirmiyor (Enes, 9 Eyl
   2026: "ben kod yazim diliyle yazmak istemiyorum"); bolum = baslik +
   blok kartlari, HTML yalniz `htmlToBloklar` / `bloklarToHtml` ciftinde
   uretiliyor. Bu cift bozulursa kayip SESSIZ olur: panel acilir, bolum
   yarim gorunur, kaydedilince gercek icerik silinir.

   OLCUT: gercek icerigin HER bolumu html -> blok -> html gidip
   donduğunde BIREBIR ayni kalmali. Fikstur YOK — depodaki gercek
   yazilar ve projeler taranir; icerik buyudukce kapi da buyur.

   KOD KOPYALANMAZ: fonksiyonlar `admin.html` icindeki BLOK-METIN-BAS /
   BLOK-METIN-SON isaretleri arasindan CIKARILIP kosuluyor. Ikinci bir
   kopya tutsaydik test yesil kalirken panel bozulabilirdi. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let gecti = 0, kaldi = 0;
function ol(ad, kosul, ayrinti) {
  console.log('  ' + (kosul ? 'ok ' : '!! ') + ad.padEnd(56) + ' ' + (ayrinti || ''));
  if (kosul) gecti++; else kaldi++;
}

const KOK = path.join(__dirname, '..');
const panel = fs.readFileSync(path.join(KOK, 'admin.html'), 'utf8');
const m = /\/\*BLOK-METIN-BAS\*\/([\s\S]*?)\/\*BLOK-METIN-SON\*\//.exec(panel);

console.log('\nblok-metin — panel govde donusturucusu\n');
ol('admin.html icinde BLOK-METIN blogu var', !!m, m ? m[1].length + ' karakter' : 'YOK');
if (!m) { console.log(`\n  ${gecti} gecti · ${kaldi} kaldi\n`); process.exit(1); }

/* `esc` blogun disinda tanimli — calisma ortamina veriyoruz. */
const ortam = {
  esc: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
};
vm.createContext(ortam);
vm.runInContext(m[1], ortam);
const { htmlToBloklar, bloklarToHtml, satirIciOku, satirIciGecerli } = ortam;

/* ---- 1) GERCEK ICERIK: gidis-donus birebir ---- */
const bolumler = [];
for (const kol of ['yazilar', 'nedir', 'haber']) {
  const d = path.join(KOK, 'icerik', kol);
  if (!fs.existsSync(d)) continue;
  for (const a of fs.readdirSync(d).filter(x => x.endsWith('.json'))) {
    const j = JSON.parse(fs.readFileSync(path.join(d, a), 'utf8'));
    for (const dil of ['tr', 'en'])
      for (const b of ((j.body || {})[dil] || [])) bolumler.push({ ad: kol + '/' + a, html: b[1] || '' });
  }
}
const c = JSON.parse(fs.readFileSync(path.join(KOK, 'content.json'), 'utf8'));
for (const pr of (c.projects || []))
  for (const dil of ['tr', 'en'])
    for (const b of ((pr.blocks || {})[dil] || [])) bolumler.push({ ad: 'proje/' + pr.slug, html: b[1] || '' });

const sapan = [];
let hamDusen = 0;
const tip = {};
for (const b of bolumler) {
  const bl = htmlToBloklar(b.html);
  for (const x of bl) tip[x.t] = (tip[x.t] || 0) + 1;
  if (bl.some(x => x.t === 'ham')) hamDusen++;
  if (bloklarToHtml(bl) !== String(b.html).trim()) sapan.push(b.ad);
}
ol('gercek icerik: html -> blok -> html BIREBIR',
   sapan.length === 0 && bolumler.length > 0,
   bolumler.length + ' bolum · ' + Object.entries(tip).map(([k, n]) => k + '(' + n + ')').join(' ') +
   (sapan.length ? ' · SAPAN: ' + sapan.slice(0, 3).join(', ') : ''));
/* `ham` bir kusur DEGIL (koruma yolu), ama bugun sifir olmali: sifirdan
   buyurse panelde elle HTML yazilan bir sey birikiyor demektir. */
ol('gercek icerikte `ham` bloga dusen yok', hamDusen === 0, hamDusen + ' bolum');

/* ---- 2) BLOK TIPLERI ---- */
ol('paragraf', JSON.stringify(htmlToBloklar('<p>merhaba</p>')) === JSON.stringify([{ t: 'p', ic: 'merhaba' }]), '');
ol('paragraf icinde kalin korunur',
   htmlToBloklar('<p>bir <b>iki</b></p>')[0].ic === 'bir <b>iki</b>', '');
ol('liste', JSON.stringify(htmlToBloklar('<ul><li>a</li><li>b</li></ul>')) ===
   JSON.stringify([{ t: 'liste', ogeler: ['a', 'b'] }]), '');
ol('vurgu (.nfig)', JSON.stringify(htmlToBloklar('<div class="nfig"><b>4×</b><span>fark</span></div>')) ===
   JSON.stringify([{ t: 'vurgu', sayi: '4×', aciklama: 'fark' }]), '');
ol('bos govde bos dizi', JSON.stringify(htmlToBloklar('')) === '[]', '');
ol('cok blok sirasi korunur',
   bloklarToHtml(htmlToBloklar('<p>a</p><ul><li>x</li></ul><p>b</p>')) === '<p>a</p><ul><li>x</li></ul><p>b</p>', '');

/* ---- 3) TANIMAYAN BICIM SESSIZCE KAYBOLMAZ ---- */
const yabanci = '<p>a</p><table><tr><td>x</td></tr></table>';
const yb = htmlToBloklar(yabanci);
ol('tanimayan bicim `ham` olur', yb.length === 1 && yb[0].t === 'ham', yb.map(x => x.t).join(','));
ol('tanimayan bicim BIREBIR korunur', bloklarToHtml(yb) === yabanci, '');
const iciYabanci = htmlToBloklar('<p>a <span class="x">b</span></p>');
ol('paragraf icinde izinsiz etiket -> ham (metin kaybolmaz)',
   iciYabanci[0].t === 'ham' && bloklarToHtml(iciYabanci).includes('span'), '');

/* ---- 4) SATIR ICI OKUMA (yapistirma temizligi) ----
   Gercek DOM yok; `satirIciOku` yalniz nodeType/tagName/childNodes
   okudugu icin kucuk bir sahte agac yeter. Olculen sey tam da riskli
   olan: tarayicinin yapistirdigi span/style/div disari SIZMAMALI. */
const T = v => ({ nodeType: 3, nodeValue: v });
const E = (ad, ...c) => ({ nodeType: 1, tagName: ad.toUpperCase(), childNodes: c });
ol('satir ici: duz metin', satirIciOku(E('div', T('merhaba'))) === 'merhaba', '');
ol('satir ici: <b> gecer', satirIciOku(E('div', T('a '), E('b', T('kalin')))) === 'a <b>kalin</b>', '');
ol('satir ici: <strong> -> <b>', satirIciOku(E('div', E('strong', T('x')))) === '<b>x</b>', '');
ol('satir ici: <i> -> <em>', satirIciOku(E('div', E('i', T('x')))) === '<em>x</em>', '');
ol('satir ici: <span style> DUSER, metni kalir',
   satirIciOku(E('div', E('span', T('yapistirilan')))) === 'yapistirilan', '');
ol('satir ici: <div> DUSER, metni kalir',
   satirIciOku(E('div', E('div', T('a')), T('b'))) === 'ab', '');
ol('satir ici: < ve & kacirilir',
   satirIciOku(E('div', T('a < b & c'))) === 'a &lt; b &amp; c', '');

/* ---- 5) URETILEN HTML PANELIN OKUDUGU BICIMDE ---- */
const gidisDonus = bloklarToHtml([{ t: 'p', ic: 'a' }, { t: 'vurgu', sayi: '9', aciklama: 'b' }]);
ol('uretilen HTML kendi cozucusunden gecer',
   bloklarToHtml(htmlToBloklar(gidisDonus)) === gidisDonus, gidisDonus);

console.log(`\n  ${gecti} geçti · ${kaldi} kaldı\n`);
console.log(kaldi === 0 ? '  blok-metin kanıtlandı.' : '  blok-metin KALDI.');
process.exit(kaldi === 0 ? 0 : 1);
