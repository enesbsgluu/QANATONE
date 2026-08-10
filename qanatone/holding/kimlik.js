'use strict';
/* holding/kimlik.js — 2.1 Kimlik ve yetki
   Yetki kartı KODDA değil, holding/ajanlar/*.json içinde durur.
   Bir ajanın ne yapabildiğini görmek için kod okumak gerekmez. */

const fs = require('fs');
const path = require('path');

const KLASOR = path.join(__dirname, 'ajanlar');

function kartlariYukle() {
  const kartlar = {};
  if (!fs.existsSync(KLASOR)) return kartlar;
  for (const dosya of fs.readdirSync(KLASOR)) {
    if (!dosya.endsWith('.json')) continue;
    const kart = JSON.parse(fs.readFileSync(path.join(KLASOR, dosya), 'utf8'));
    kartlar[kart.ajan] = kart;
  }
  return kartlar;
}

class Kimlik {
  constructor() {
    this.kartlar = kartlariYukle();
  }

  kart(ajanAdi) {
    const k = this.kartlar[ajanAdi];
    if (!k) throw new Error(`kimlik kartı yok: ${ajanAdi}`);
    return k;
  }

  varMi(ajanAdi) {
    return !!this.kartlar[ajanAdi];
  }

  yetkiliMi(ajanAdi, kategori, deger) {
    const kart = this.kart(ajanAdi);
    if (this.aslaMi(ajanAdi, deger)) return false;
    const liste = (kart.yetki && kart.yetki[kategori]) || [];
    return liste.includes(deger);
  }

  aslaMi(ajanAdi, eylem) {
    const kart = this.kart(ajanAdi);
    return !!(kart.yetki && kart.yetki.asla && kart.yetki.asla.includes(eylem));
  }
}

module.exports = { Kimlik, kartlariYukle };
