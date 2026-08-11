#!/usr/bin/env node
'use strict';
/* holding/test/doa.test.js — tutar-bazlı otomatik eskalasyon (DoA)
   node holding/test/doa.test.js
   Yetki kartındaki isteğe bağlı tutarEsigi, onay.istek'e tutar
   geldiğinde eşik aşılırsa seviyeyi otomatik C'ye terfi ettiriyor mu?
   (bkz. holding/onay.js üst bilgisi, holding/ajanlar/teklif-hazirlayici.json) */

const fs = require('fs');
const path = require('path');
const { omurgaKur } = require('../index');

let gecti = 0, kaldi = 0;
function ol(ad, kosul, ayrinti) {
  const isaret = kosul ? 'ok ' : '!! ';
  console.log('  ' + isaret + ad.padEnd(56) + ' ' + (ayrinti || ''));
  if (kosul) gecti++; else kaldi++;
}

const VERI = path.join(__dirname, '..', '.veri');
if (fs.existsSync(VERI)) fs.rmSync(VERI, { recursive: true, force: true });

console.log('\nDoA — tutar-bazlı otomatik eskalasyon denetimi\n');

const o = omurgaKur();

ol('teklif-hazirlayici kartı tutarEsigi ile yüklü', o.kimlik.kart('teklif-hazirlayici').tutarEsigi === 10000);

// eşik altı: seviye aynı kalır (B)
const altEsik = o.onay.istek('teklif-hazirlayici', 'teklif_gonder', 'B', { tutar: 5000, kisiId: 'k1' });
ol('eşik altı: seviye B kalıyor', altEsik.durum === 'onayli' && altEsik.geriAlinabilir === true);
ol('eşik altı: terfi yok', !altEsik.terfi);

// eşik üstü: B → C otomatik terfi
const ustEsik = o.onay.istek('teklif-hazirlayici', 'teklif_gonder', 'B', { tutar: 15000, kisiId: 'k2' });
ol('eşik üstü: seviye C\'ye terfi ediyor (beklemede)', ustEsik.durum === 'beklemede');
ol('eşik üstü: terfi bilgisi dönüyor', !!ustEsik.terfi && ustEsik.terfi.eskiSeviye === 'B' && ustEsik.terfi.yeniSeviye === 'C');

// terfi kayıtta görünüyor mu
const terfiKayitlari = o.kayit.sorgula({ tur: 'onay.terfi' });
ol('terfi kayda düştü (tek satır)', terfiKayitlari.length === 1);
ol('terfi kaydı doğru ajan/tutar/eşik taşıyor', terfiKayitlari[0].ajan === 'teklif-hazirlayici'
  && terfiKayitlari[0].tutar === 15000 && terfiKayitlari[0].esik === 10000);

// zaten C olan istek: terfi mantığı devreye girmiyor (gerek yok, kısa devre)
const zatenC = o.onay.istek('teklif-hazirlayici', 'teklif_gonder', 'C', { tutar: 999999, kisiId: 'k3' });
ol('zaten C seviyesinde terfi tetiklenmiyor', !zatenC.terfi);

// kartı var ama tutarEsigi yok (kapi.json): davranış değişmiyor
const esiksizKart = o.onay.istek('kapi', 'mesaj.degerlendir', 'A', { tutar: 999999 });
ol('eşiksiz kartta davranış değişmiyor', esiksizKart.durum === 'onayli' && !esiksizKart.terfi);

// hiç kartı olmayan ajan: hata fırlatmıyor, davranış değişmiyor
const kartsizAjan = o.onay.istek('hic-boyle-bir-ajan-yok', 'herhangi', 'B', { tutar: 999999 });
ol('kaydı olmayan ajanda hata fırlatmıyor, terfi yok', kartsizAjan.durum === 'onayli' && !kartsizAjan.terfi);

// tutar verilmeden çağrı: mevcut çağrı deseni bozulmuyor
const tutarsiz = o.onay.istek('teklif-hazirlayici', 'teklif_gonder', 'B', { kisiId: 'k4' });
ol('tutar verilmeden seviye B kalıyor', tutarsiz.durum === 'onayli' && !tutarsiz.terfi);

console.log(`\n  ${gecti} geçti · ${kaldi} kaldı\n`);
console.log(kaldi === 0 ? '  DoA kanıtlandı.' : '  DoA KALDI.');
process.exit(kaldi === 0 ? 0 : 1);
