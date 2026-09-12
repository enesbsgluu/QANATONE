'use strict';
/* holding/ajan/niyet.js — NİYET SINIFLANDIRICI (bölüm 7, 9.1)
   Tetik: talep.geldi. İş: mesajı sınıflar + güven skoru üretir.
   Şimdilik sezgisel (regex) — ileride bir sınıflandırıcıya devredilir,
   arayüz aynı kalır (guvenlik.js'teki aynı desen, bkz. holding/CLAUDE.md).

   Kritik kural (bölüm 9.1): güven düşükse ajan SINIFLANDIRMAZ — burada
   düşük güvenle 'ozel_mesaj' dönüyoruz ve karar DEVİR MEMURU'na kalıyor
   (bkz. ajan/devir.js, DUSUK_GUVEN_ESIGI). Yanlış sınıflandırılmış bir
   talep, cevaplanmamış talepten pahalıdır. */

const AJAN_ADI = 'niyet-siniflandirici';

const KALIPLAR = [
  ['sikayet', /şikayet|memnun\s*değil|sorun\s*yaşıyorum|çalışmıyor|bozuk\s*geldi/i, 0.8],
  ['is_basvurusu', /iş\s*başvurusu|\bcv\b|özgeçmiş|staj\s*imkanı/i, 0.85],
  ['tedarikci', /tedarikçi|bayilik|toptan\s*alım|distribütör/i, 0.7],
  ['basin', /basın\s*mensubu|röportaj|haber\s*yapmak\s*istiyoruz/i, 0.75],
  ['spam', /kazandınız|hemen\s*tıkla|bedava\s*kazan|takipçi\s*al/i, 0.9],
  ['teklif', /teklif\s*alabilir|proje\s*teklifi|görüşelim\s*mi|toplantı\s*ayarlayalım/i, 0.7],
  ['fiyat_sorusu', /fiyat|kaç\s*para|ne\s*kadar\s*tutar|ücret(i|leri)?\s*nedir|bütçe/i, 0.75],
];

function siniflandir(metin) {
  for (const [sinif, kalip, guven] of KALIPLAR) {
    if (kalip.test(metin)) return { sinif, guven };
  }
  return { sinif: 'ozel_mesaj', guven: 0.4 };
}

function niyetKur(omurga) {
  const { olay, onay, kayit } = omurga;

  return olay.abone('talep.geldi', (olayNesnesi) => {
    const { kaynak, kisiId, metin } = olayNesnesi.yuk;
    const { sinif, guven } = siniflandir(metin);

    onay.istek(AJAN_ADI, 'siniflandirma', 'A', { kisiId, sinif, guven });
    kayit.yaz({ tur: 'niyet.siniflandi', ajan: AJAN_ADI, kisiId, sinif, guven });
    olay.yayinla('niyet.siniflandi', { kaynak, kisiId, metin, sinif, guven });
  });
}

module.exports = { niyetKur, siniflandir, AJAN_ADI };
