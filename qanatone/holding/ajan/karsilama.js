'use strict';
/* holding/ajan/karsilama.js — KARŞILAMA (bölüm 7, 9.1)
   Tetik: niyet.siniflandi. İş: kurum belleğinden GERÇEK bilgiye dayalı
   taslak yanıt kurar; kaynağı olmayan cümle kurmaz, "bilmiyorum" der.
   İlişki belleğine bakar (bu kişiyi tanıyor muyuz), sonra yazar.

   Ajan kimliği kasıtlı olarak 'satis-karsilama' — bölüm 2.1'in örnek
   yetki kartı zaten bu ad altında Faz 0'da kanıtlandı, yeni kart açıp
   tekrar etmiyoruz (bkz. holding/ajanlar/satis-karsilama.json).

   Onay seviyesi: bölüm 7 tablosunda C→B; kurulumun ilk ayı (bölüm 2.5)
   her şey C'dir, Faz 1 o aya girer — burada sabit C. */

const AJAN_ADI = 'satis-karsilama';

// sınıf → kurum belleği anahtarı. Kaynağı olmayan sınıf için ajan
// "bilmiyorum, öğrenip döneceğim" der (bölüm 9.1, kaynaksız cümle yasak).
const KAYNAK_ANAHTARI = {
  fiyat_sorusu: 'fiyat.politikasi',
};

const KAYNAKSIZ_YANIT = 'Bu konuda şu an elimde kaynaklı bilgi yok, öğrenip döneceğim.';

function taslakKur(hafiza, sinif) {
  const anahtar = KAYNAK_ANAHTARI[sinif];
  if (!anahtar) return { metin: KAYNAKSIZ_YANIT, kaynakli: false };
  const deger = hafiza.kurumOku(anahtar);
  if (deger === undefined) return { metin: KAYNAKSIZ_YANIT, kaynakli: false };
  return { metin: String(deger), kaynakli: true, kaynakAnahtari: anahtar };
}

function karsilamaKur(omurga) {
  const { olay, hafiza, onay, kayit } = omurga;

  return olay.abone('niyet.siniflandi', (olayNesnesi) => {
    const { kaynak, kisiId, sinif, guven } = olayNesnesi.yuk;

    const gecmis = hafiza.iliskiOku(kisiId);
    const taniyorMu = Object.keys(gecmis).length > 0;
    const taslak = taslakKur(hafiza, sinif);

    hafiza.iliskiYaz(kisiId, 'sonSinif', sinif, AJAN_ADI);
    hafiza.iliskiYaz(kisiId, 'sonTemas', new Date().toISOString(), AJAN_ADI);

    const onaySonucu = onay.istek(AJAN_ADI, 'taslak_yanit', 'C', {
      kisiId, sinif, guven, taslak: taslak.metin, kaynakli: taslak.kaynakli,
    });

    kayit.yaz({
      tur: 'karsilama.taslak', ajan: AJAN_ADI, kisiId, sinif, guven,
      kaynakli: taslak.kaynakli, taniyorMu, onayId: onaySonucu.id,
    });

    olay.yayinla('karsilama.taslak.hazir', {
      kaynak, kisiId, sinif, guven, taslak: taslak.metin,
      kaynakli: taslak.kaynakli, onayId: onaySonucu.id,
    });
  });
}

module.exports = { karsilamaKur, taslakKur, AJAN_ADI, KAYNAKSIZ_YANIT };
