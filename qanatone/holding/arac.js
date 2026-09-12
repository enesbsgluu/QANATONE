'use strict';
/* holding/arac.js — 2.4 Araç kaydı (tool registry)
   Ajanlar dış sisteme (CRM, takvim, Ads API...) doğrudan değil,
   kayıt üzerinden erişir. Müşteri CRM değiştirince tek adaptör değişir. */

class AracKaydi {
  constructor(kayit) {
    this.araclar = new Map();
    this.kayit = kayit || null;
  }

  kaydet(ad, adaptor) {
    this.araclar.set(ad, adaptor);
  }

  varMi(ad) {
    return this.araclar.has(ad);
  }

  async cagir(ad, metod, ...args) {
    const adaptor = this.araclar.get(ad);
    if (!adaptor) throw new Error(`araç kayıtlı değil: ${ad}`);
    if (typeof adaptor[metod] !== 'function') throw new Error(`araç metodu yok: ${ad}.${metod}`);
    if (this.kayit) this.kayit.yaz({ tur: 'arac.cagri', arac: ad, metod });
    return adaptor[metod](...args);
  }
}

module.exports = { AracKaydi };
