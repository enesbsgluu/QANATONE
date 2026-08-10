'use strict';
/* holding/kayit.js — 2.6 Kayıt ve denetim izi
   Her ajan eylemi: ne gördü, ne düşündü, ne yaptı, hangi kaynağa dayandı.
   Kaynaksız üretilen hiçbir bilgi müşteriye gitmez — bu satır o iddiayı kanıtlar. */

const fs = require('fs');
const path = require('path');

const LOG_DOSYA = path.join(__dirname, '.veri', 'kayit.jsonl');

class Kayit {
  constructor({ diskeYaz = true } = {}) {
    this.satirlar = [];
    this.diskeYaz = diskeYaz;
  }

  yaz(satir) {
    const tam = { ...satir, zaman: satir.zaman || new Date().toISOString() };
    this.satirlar.push(tam);
    if (this.diskeYaz) {
      const klasor = path.dirname(LOG_DOSYA);
      if (!fs.existsSync(klasor)) fs.mkdirSync(klasor, { recursive: true });
      fs.appendFileSync(LOG_DOSYA, JSON.stringify(tam) + '\n');
    }
    return tam;
  }

  sorgula({ tur, ajan, limit } = {}) {
    let sonuc = this.satirlar;
    if (tur) sonuc = sonuc.filter(s => s.tur === tur);
    if (ajan) sonuc = sonuc.filter(s => s.ajan === ajan);
    if (limit) sonuc = sonuc.slice(-limit);
    return sonuc;
  }
}

module.exports = { Kayit };
