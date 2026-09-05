#!/usr/bin/env node
/* netlify/bot-anahtar.js — YEREL koşulur, hiçbir dosyaya yazmaz.
   Web Bot Auth için bir Ed25519 anahtar çifti üretir ve ÖZEL anahtarın
   tohumunu ekrana basar. Değer Netlify > Site configuration >
   Environment variables içine WEB_BOT_AUTH_TOHUM olarak yapıştırılır.

   `netlify/parola-hash.js` ile aynı disiplin: sır ortam değişkeninde
   yaşar, depoya girmez, log'a girmez, bu betik onu diske YAZMAZ.

   Kullanım:
     node netlify/bot-anahtar.js

   ÇIKTIYI PAYLAŞMA. Ekrandaki iki satırdan yalnız İKİNCİSİ (kid ve açık
   anahtar) paylaşılabilir — o zaten dizinde herkese yayınlanıyor.
   Birinci satır sırdır; terminal geçmişinde kalmasın diye pencereyi
   temizlemek iyi bir alışkanlıktır.

   ANAHTAR DÖNDÜRME: yeni tohum üret, Netlify'da değeri değiştir, yeniden
   dağıt. Dizin çoğul bir dizi (`keys`) taşıyor — eski ve yeni anahtarı
   bir süre birlikte yayınlamak gerekirse imza-dizini.js'te `dizin()`
   ikinci kaydı alacak biçimde açılır; bugün tek anahtar var ve olmayan
   bir ikinciyi şimdiden yazmak "ölçmediğin rakamı yazma"ya girer.
   --------------------------------------------------------------------- */
'use strict';

const crypto = require('crypto');
const { imzalayiciOlustur } = require('./functions/imza-dizini.js');

/* Tohum = 32 rastgele bayt. Ed25519'un özel anahtarı budur; geri kalan
   her şey (açık anahtar, kid) bundan TÜRETİLİR — saklanacak tek şey bu. */
const tohum = crypto.randomBytes(32).toString('base64url');

/* Üretilen tohumu HEMEN gerçek imzalayıcıdan geçiriyoruz: basılan değerin
   kullanılabilir olduğu varsayılmıyor, ölçülüyor. Biçim bozuksa burada
   patlar, Netlify'da değil. */
const im = imzalayiciOlustur(tohum);
const dizin = im.dizin();

console.log('');
console.log('  SIR — Netlify ortam degiskeni (paylasma):');
console.log('    WEB_BOT_AUTH_TOHUM=' + tohum);
console.log('');
console.log('  ACIK (dizinde zaten yayinlanacak, paylasilabilir):');
console.log('    kid = ' + im.kid);
console.log('    ' + JSON.stringify(dizin));
console.log('');
console.log('  Kurulum:');
console.log('    1) Netlify > Site configuration > Environment variables > WEB_BOT_AUTH_TOHUM');
console.log('    2) Yeniden dagit (ortam degiskeni degisikligi dagitimla etkinlesir).');
console.log('    3) Dogrula:  curl -sI ' + im.ajan + '/.well-known/http-message-signatures-directory');
console.log('       Beklenen: 200 + content-type: application/http-message-signatures-directory+json');
console.log('');
