#!/usr/bin/env node
'use strict';
/* holding/test/denetci.test.js — bağımsız denetçi denetimi
   node holding/test/denetci.test.js
   Sahte kayıt fixture'ları — gerçek omurga koşulmaz. Denetçinin
   mantığını, denetlediği koddan bağımsız olarak sınar (bkz.
   holding/denetci.js üst bilgisi). */

const { denetle } = require('../denetci');

let gecti = 0, kaldi = 0;
function ol(ad, kosul, ayrinti) {
  const isaret = kosul ? 'ok ' : '!! ';
  console.log('  ' + isaret + ad.padEnd(56) + ' ' + (ayrinti || ''));
  if (kosul) gecti++; else kaldi++;
}

console.log('\nDenetçi — bağımsız denetim mantığı testi\n');

// ---- temiz senaryo: taslak → onay → gönderim tam, PII yok, bütçe normal ----
const temiz = [
  { tur: 'talep.geldi', kisiId: 'k1' },
  { tur: 'niyet.siniflandi', kisiId: 'k1', sinif: 'fiyat_sorusu', guven: 0.75 },
  { tur: 'karsilama.taslak', ajan: 'satis-karsilama', kisiId: 'k1', onayId: 'onay-1' },
  { tur: 'onay.beklemede', id: 'onay-1', ajan: 'satis-karsilama', seviye: 'C', eylem: 'taslak_yanit' },
  { tur: 'onay.verildi', id: 'onay-1', onaylayan: 'insan:enes' },
  { tur: 'kanal.gonderildi', ajan: 'satis-karsilama', onayId: 'onay-1', kisiId: 'k1' },
  { tur: 'butce.harcama', ajan: 'niyet-siniflandirici', jeton: 10, para: 1 },
];
const sonucTemiz = denetle(temiz);
ol('temiz senaryo: ihlal yok', sonucTemiz.length === 0, `${sonucTemiz.length} ihlal`);

// ---- ihlal 1: C seviyesi karara bağlanmamış ama gönderim izi var ----
const ihlal1 = [
  { tur: 'onay.beklemede', id: 'onay-2', ajan: 'satis-karsilama', seviye: 'C', eylem: 'taslak_yanit' },
  { tur: 'kanal.gonderildi', ajan: 'satis-karsilama', onayId: 'onay-2', kisiId: 'k2' },
];
const sonuc1 = denetle(ihlal1);
ol('ihlal 1: kararsız C + gönderim izi yakalanıyor', sonuc1.some(i => i.tur === 'karasiz-c-gonderim'), `${sonuc1.length} ihlal`);
ol('ihlal 1: PII/bütçe türleri tetiklenmiyor', !sonuc1.some(i => i.tur === 'maskesiz-pii' || i.tur === 'asim-sonrasi-harcama'));

// ---- ihlal 2: gönderim var ama taslak/onay yok (izole — başka kayıt yok) ----
const ihlal2 = [
  { tur: 'kanal.gonderildi', ajan: 'bilinmeyen-ajan', onayId: 'onay-yok', kisiId: 'k3' },
];
const sonuc2 = denetle(ihlal2);
ol('ihlal 2: zincirsiz gönderim yakalanıyor', sonuc2.length === 1 && sonuc2[0].tur === 'zincirsiz-gonderim', `${sonuc2.length} ihlal`);

// ---- ihlal 3: maskesiz PII (izole) ----
const ihlal3 = [
  { tur: 'kapi.durduruldu', kisiId: 'k4', not: ['TC kimlik no 12345678901 ile ilerleyelim'] },
];
const sonuc3 = denetle(ihlal3);
ol('ihlal 3: maskesiz PII yakalanıyor', sonuc3.length === 1 && sonuc3[0].tur === 'maskesiz-pii', `${sonuc3.length} ihlal`);

// ---- ihlal 4: bütçe aşımından sonra harcama (izole) ----
const ihlal4 = [
  { tur: 'butce.asildi', ajan: 'kampanya-analisti', denenenJeton: 150 },
  { tur: 'butce.harcama', ajan: 'kampanya-analisti', jeton: 20, para: 1 },
];
const sonuc4 = denetle(ihlal4);
ol('ihlal 4: aşım sonrası harcama yakalanıyor', sonuc4.length === 1 && sonuc4[0].tur === 'asim-sonrasi-harcama', `${sonuc4.length} ihlal`);

// ---- sınırlar: maskeli PII ve gün içi normal harcama yanlış pozitif üretmemeli ----
const maskeliVeNormal = [
  { tur: 'kapi.gecti', kisiId: 'k5', kisiselVeri: true, temizMetin: 'TC kimlik no 12***9, fiyat nedir' },
  { tur: 'butce.harcama', ajan: 'yeni-ajan', jeton: 50, para: 5 },
  { tur: 'butce.harcama', ajan: 'yeni-ajan', jeton: 999999999999, para: 5 },
];
ol('maskeli TC ve büyük sayısal alanlar yanlış pozitif üretmiyor', denetle(maskeliVeNormal).length === 0, `${denetle(maskeliVeNormal).length} ihlal`);

console.log(`\n  ${gecti} geçti · ${kaldi} kaldı\n`);
console.log(kaldi === 0 ? '  denetçi temiz.' : '  DENETÇİ KALDI.');
process.exit(kaldi === 0 ? 0 : 1);
