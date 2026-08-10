'use strict';
/* holding/onay.js — 2.5 İnsan onay kapısı
   A serbest · B bildirimli (geri alınabilir) · C onaylı (insan onaylamadan olmaz)
   Kurulumun ilk ayı her şey C'dir; güven kazandıkça indirilir. */

let sayac = 0;

class OnayKapisi {
  constructor(kayit, olayYolu) {
    this.kayit = kayit || null;
    this.olayYolu = olayYolu || null;
    this.bekleyen = new Map();
  }

  istek(ajanAdi, eylem, seviye, detay) {
    const id = `onay-${++sayac}`;
    const satir = { id, ajan: ajanAdi, eylem, seviye, detay, zaman: new Date().toISOString() };

    if (seviye === 'A') {
      if (this.kayit) this.kayit.yaz({ tur: 'onay.serbest', ...satir });
      return { id, durum: 'onayli', otomatik: true };
    }
    if (seviye === 'B') {
      if (this.kayit) this.kayit.yaz({ tur: 'onay.bildirimli', ...satir });
      if (this.olayYolu) this.olayYolu.yayinla('onay.bildirim', satir);
      return { id, durum: 'onayli', otomatik: true, geriAlinabilir: true };
    }
    if (seviye === 'C') {
      this.bekleyen.set(id, satir);
      if (this.kayit) this.kayit.yaz({ tur: 'onay.beklemede', ...satir });
      if (this.olayYolu) this.olayYolu.yayinla('onay.beklemede', satir);
      return { id, durum: 'beklemede', otomatik: false };
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
