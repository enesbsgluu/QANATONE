'use strict';
/* holding/onay.js — 2.5 İnsan onay kapısı
   A serbest · B bildirimli (geri alınabilir) · C onaylı (insan onaylamadan olmaz)
   Kurulumun ilk ayı her şey C'dir; güven kazandıkça indirilir.

   Tutar-bazlı otomatik eskalasyon (DoA — Delegation of Authority): yetki
   kartında isteğe bağlı `tutarEsigi` varsa ve `istek(..., seviye, {tutar})`
   çağrısındaki tutar o eşiği aşarsa, seviye otomatik C'ye terfi eder ve
   kayda 'onay.terfi' satırı düşer. Eşiksiz veya kartsız ajanda, ya da
   tutar verilmeyen çağrıda davranış değişmez — kimlik yoksa terfi
   denemesi sessizce atlanır, kimlik.kart() asla zorla çağrılmaz. */

let sayac = 0;

class OnayKapisi {
  constructor(kayit, olayYolu, kimlik) {
    this.kayit = kayit || null;
    this.olayYolu = olayYolu || null;
    this.kimlik = kimlik || null;
    this.bekleyen = new Map();
  }

  _terfiKontrol(ajanAdi, seviye, detay) {
    if (seviye === 'C' || !detay || typeof detay.tutar !== 'number') return null;
    if (!this.kimlik || !this.kimlik.varMi(ajanAdi)) return null;
    const kart = this.kimlik.kart(ajanAdi);
    if (typeof kart.tutarEsigi !== 'number' || detay.tutar <= kart.tutarEsigi) return null;
    return { eskiSeviye: seviye, yeniSeviye: 'C', esik: kart.tutarEsigi, tutar: detay.tutar };
  }

  istek(ajanAdi, eylem, seviye, detay) {
    const id = `onay-${++sayac}`;
    const terfi = this._terfiKontrol(ajanAdi, seviye, detay);
    const gercekSeviye = terfi ? terfi.yeniSeviye : seviye;
    const satir = { id, ajan: ajanAdi, eylem, seviye: gercekSeviye, detay, zaman: new Date().toISOString() };

    if (terfi && this.kayit) {
      this.kayit.yaz({ tur: 'onay.terfi', id, ajan: ajanAdi, eylem, ...terfi });
    }

    if (gercekSeviye === 'A') {
      if (this.kayit) this.kayit.yaz({ tur: 'onay.serbest', ...satir });
      return { id, durum: 'onayli', otomatik: true, terfi };
    }
    if (gercekSeviye === 'B') {
      if (this.kayit) this.kayit.yaz({ tur: 'onay.bildirimli', ...satir });
      if (this.olayYolu) this.olayYolu.yayinla('onay.bildirim', satir);
      return { id, durum: 'onayli', otomatik: true, geriAlinabilir: true, terfi };
    }
    if (gercekSeviye === 'C') {
      this.bekleyen.set(id, satir);
      if (this.kayit) this.kayit.yaz({ tur: 'onay.beklemede', ...satir });
      if (this.olayYolu) this.olayYolu.yayinla('onay.beklemede', satir);
      return { id, durum: 'beklemede', otomatik: false, terfi };
    }
    throw new Error(`bilinmeyen onay seviyesi: ${seviye}`);
  }

  onayla(id, onaylayan) {
    const satir = this.bekleyen.get(id);
    if (!satir) throw new Error(`bekleyen onay yok: ${id}`);
    this.bekleyen.delete(id);
    if (this.kayit) this.kayit.yaz({ tur: 'onay.verildi', id, onaylayan });
    if (this.olayYolu) this.olayYolu.yayinla('onay.verildi', { ...satir, onaylayan });
    return { ...satir, durum: 'onayli', onaylayan };
  }

  reddet(id, reddeden, gerekce) {
    const satir = this.bekleyen.get(id);
    if (!satir) throw new Error(`bekleyen onay yok: ${id}`);
    this.bekleyen.delete(id);
    if (this.kayit) this.kayit.yaz({ tur: 'onay.reddedildi', id, reddeden, gerekce });
    if (this.olayYolu) this.olayYolu.yayinla('onay.reddedildi', { ...satir, reddeden, gerekce });
    return { ...satir, durum: 'reddedildi', reddeden, gerekce };
  }
}

module.exports = { OnayKapisi };
