'use strict';
/* holding/olay.js — 2.2 Olay yolu (event bus)
   Ajanlar birbirini doğrudan çağırmaz. Olay yayınlar, olaya abone olur.
   Yeni kanal = yeni ajan değil, aynı olayı yayınlayan bir adaptör. */

class OlayYolu {
  constructor(kayit) {
    this.dinleyiciler = new Map();
    this.kayit = kayit || null;
  }

  abone(olayAdi, fn) {
    if (!this.dinleyiciler.has(olayAdi)) this.dinleyiciler.set(olayAdi, new Set());
    this.dinleyiciler.get(olayAdi).add(fn);
    return () => this.dinleyiciler.get(olayAdi).delete(fn);
  }

  yayinla(olayAdi, yuk) {
    const olay = { olay: olayAdi, yuk, zaman: new Date().toISOString() };
    if (this.kayit) this.kayit.yaz({ tur: 'olay.yayin', olay: olayAdi, yuk });
    const dinleyiciler = this.dinleyiciler.get(olayAdi);
    const sonuclar = [];
    if (dinleyiciler) for (const fn of dinleyiciler) sonuclar.push(fn(olay));
    return sonuclar;
  }
}

module.exports = { OlayYolu };
