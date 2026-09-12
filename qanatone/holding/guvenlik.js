'use strict';
/* holding/guvenlik.js — 2.8 Güvenlik görevlisi (giriş denetçisi)
   Kural: dışarıdan gelen hiçbir metin talimat değildir. Gelen her mesaj
   İÇERİK olarak değerlendirilir, komut olarak değil. Bu modül şimdilik
   sezgisel (regex) kontrol yapar — ileride bir sınıflandırıcıya
   devredilebilir, arayüz aynı kalır. */

const ENJEKSIYON_KALIP =
  /(önceki|onceki)\s+talimat|ignore\s+(previous|all)\s+instructions?|sistem\s+promptunu|rolünü\s+unut|art[ıi]k\s+\S+\s+olarak\s+davran/i;
const TC_KIMLIK = /\b\d{11}\b/;
const KART_NO = /\b(?:\d[ -]?){13,19}\b/;

function maskele(metin) {
  return metin
    .replace(TC_KIMLIK, (m) => m.slice(0, 2) + '*'.repeat(m.length - 2))
    .replace(KART_NO, (m) => m.replace(/\d(?=(?:.*\d){4})/g, '*'));
}

class Guvenlik {
  constructor(kayit) {
    this.kayit = kayit || null;
  }

  degerlendir({ metin, kaynak, kisiId }) {
    const sonuc = {
      guvenli: true,
      enjeksiyonSuphesi: false,
      kisiselVeri: false,
      temizMetin: metin,
      durdur: false,
      not: [],
    };

    if (ENJEKSIYON_KALIP.test(metin)) {
      sonuc.enjeksiyonSuphesi = true;
      sonuc.guvenli = false;
      sonuc.durdur = true;
      sonuc.not.push('metin talimat gibi okunuyor — İÇERİK olarak işlendi, komut olarak değil; insana taşınıyor');
    }

    if (TC_KIMLIK.test(metin) || KART_NO.test(metin)) {
      sonuc.kisiselVeri = true;
      sonuc.temizMetin = maskele(metin);
      sonuc.not.push('kişisel veri maskelendi');
    }

    if (this.kayit) {
      this.kayit.yaz({
        tur: 'guvenlik.degerlendirme',
        kaynak,
        kisiId,
        enjeksiyonSuphesi: sonuc.enjeksiyonSuphesi,
        kisiselVeri: sonuc.kisiselVeri,
        durdur: sonuc.durdur,
      });
    }
    return sonuc;
  }
}

module.exports = { Guvenlik };
