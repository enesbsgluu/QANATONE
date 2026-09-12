'use strict';
/* holding/ajan/kapi.js — KAPI ajanı (AJAN-HOLDING bölüm 7, 9.1)
   Tetik: kanal adaptörünün yayınladığı ham mesaj (mesaj.geldi.ham).
   İş: guvenlik.degerlendir'den geçirir; temizse talep.geldi yayınlar,
   şüpheliyse durdurup insana taşır — pipeline burada biter, NİYET'e
   ulaşmaz. Onay seviyesi: A (bölüm 7 tablosu).

   Kanal-agnostik kasıtlı: her adaptör aynı ham olayı yayınlar, KAPI
   tek başına kalır — "bir adaptör varsayımsal dikiş, iki adaptör
   gerçek dikiştir" (bölüm 2.2). */

const AJAN_ADI = 'kapi';

function kapiKur(omurga) {
  const { olay, guvenlik, onay, kayit } = omurga;

  return olay.abone('mesaj.geldi.ham', (olayNesnesi) => {
    const { kaynak, kisiId, metin } = olayNesnesi.yuk;
    const sonuc = guvenlik.degerlendir({ metin, kaynak, kisiId });

    onay.istek(AJAN_ADI, 'mesaj.degerlendir', 'A', { kaynak, kisiId });

    if (sonuc.durdur) {
      kayit.yaz({ tur: 'kapi.durduruldu', ajan: AJAN_ADI, kaynak, kisiId, not: sonuc.not });
      olay.yayinla('kapi.durduruldu', { kaynak, kisiId, metin, not: sonuc.not });
      return;
    }

    kayit.yaz({ tur: 'kapi.gecti', ajan: AJAN_ADI, kaynak, kisiId, kisiselVeri: sonuc.kisiselVeri });
    olay.yayinla('talep.geldi', { kaynak, kisiId, metin: sonuc.temizMetin });
  });
}

module.exports = { kapiKur, AJAN_ADI };
