'use strict';
/* holding/ajan/devir.js — DEVİR MEMURU (bölüm 7, 9.1)
   Tetik: niyet.siniflandi. İş: doğru departmana bağlam özetiyle iletir.

   Bölüm 7 tablosunda tetik "sıcaklık eşiği" (NİTELEME'nin çıktısı) ama
   NİTELEME Faz 3'te kuruluyor (bölüm 13) — Faz 1'de henüz yok. Bu yüzden
   eşik burada basitleştirildi: bölüm 9.1'in kritik kuralı ("güven
   skoru düşükse ajan sınıflandırmaz, sorar") ve insan müdahalesi
   gerektiren sınıflar devri tetikler. NİTELEME kurulduğunda bu eşik
   sıcaklık skoruna devredilir, DEPARTMAN_HARITASI kalır.

   Onay seviyesi: A (bölüm 7 tablosu). */

const AJAN_ADI = 'devir-memuru';
const DUSUK_GUVEN_ESIGI = 0.5;

const DEPARTMAN_HARITASI = {
  teklif: 'satis',
  sikayet: 'musteri-hizmetleri',
  is_basvurusu: 'ik',
  tedarikci: 'tedarik',
  basin: 'yonetim',
};

function devirGerekliMi(sinif, guven) {
  if (guven < DUSUK_GUVEN_ESIGI) return { gerekli: true, departman: 'insan-inceleme', neden: 'dusuk_guven' };
  if (DEPARTMAN_HARITASI[sinif]) return { gerekli: true, departman: DEPARTMAN_HARITASI[sinif], neden: 'sinif' };
  return { gerekli: false };
}

function devirKur(omurga) {
  const { olay, hafiza, onay, kayit } = omurga;

  return olay.abone('niyet.siniflandi', (olayNesnesi) => {
    const { kaynak, kisiId, metin, sinif, guven } = olayNesnesi.yuk;
    const karar = devirGerekliMi(sinif, guven);
    if (!karar.gerekli) return;

    const baglam = hafiza.iliskiOku(kisiId);
    onay.istek(AJAN_ADI, 'devir', 'A', { kisiId, departman: karar.departman, neden: karar.neden });

    const kart = {
      kisiId, kaynak, sinif, guven, departman: karar.departman, neden: karar.neden,
      ozet: metin, baglam, zaman: new Date().toISOString(),
    };
    kayit.yaz({ tur: 'devir.karti', ajan: AJAN_ADI, ...kart });
    olay.yayinla('devir.karti', kart);
  });
}

module.exports = { devirKur, devirGerekliMi, AJAN_ADI, DUSUK_GUVEN_ESIGI, DEPARTMAN_HARITASI };
