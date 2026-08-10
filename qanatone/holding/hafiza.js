'use strict';
/* holding/hafiza.js — 2.3 Üç katmanlı hafıza
   kurum: kalıcı, ajan tek başına yazamaz (onaylayan şart)
   iliski: kalıcı, kişi bazlı, ajanlar yazar
   gorev: görev/konuşma bağlamı, iş bitince arşivlenir (kalıcı depoya taşınmaz) */

const fs = require('fs');
const path = require('path');

const VERI_KOK = path.join(__dirname, '.veri');

function dosyaOku(ad) {
  const p = path.join(VERI_KOK, ad);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function dosyaYaz(ad, veri) {
  if (!fs.existsSync(VERI_KOK)) fs.mkdirSync(VERI_KOK, { recursive: true });
  fs.writeFileSync(path.join(VERI_KOK, ad), JSON.stringify(veri, null, 2));
}

class Hafiza {
  constructor(kayit) {
    this.kayit = kayit || null;
    this.kurum = dosyaOku('kurum.json');
    this.iliski = dosyaOku('iliski.json');
    this.gorev = new Map();
  }

  kurumYaz(anahtar, deger, { onaylayan } = {}) {
    if (!onaylayan) throw new Error('kurum belleğine ajan tek başına yazamaz — onaylayan gerekli');
    this.kurum[anahtar] = { deger, onaylayan, zaman: new Date().toISOString() };
    dosyaYaz('kurum.json', this.kurum);
    if (this.kayit) this.kayit.yaz({ tur: 'hafiza.kurum.yaz', anahtar, onaylayan });
  }

  kurumOku(anahtar) {
    const kayit = this.kurum[anahtar];
    return kayit ? kayit.deger : undefined;
  }

  iliskiYaz(kisiId, alan, deger, ajanAdi) {
    this.iliski[kisiId] = this.iliski[kisiId] || {};
    this.iliski[kisiId][alan] = deger;
    dosyaYaz('iliski.json', this.iliski);
    if (this.kayit) this.kayit.yaz({ tur: 'hafiza.iliski.yaz', kisiId, alan, ajan: ajanAdi });
  }

  iliskiOku(kisiId) {
    return this.iliski[kisiId] || {};
  }

  gorevBaslat(gorevId) {
    this.gorev.set(gorevId, { baglam: {}, baslangic: Date.now() });
  }

  gorevYaz(gorevId, alan, deger) {
    const g = this.gorev.get(gorevId);
    if (!g) throw new Error(`görev belleği başlatılmamış: ${gorevId}`);
    g.baglam[alan] = deger;
  }

  gorevOku(gorevId) {
    return (this.gorev.get(gorevId) || { baglam: {} }).baglam;
  }

  gorevArsivle(gorevId) {
    const g = this.gorev.get(gorevId);
    this.gorev.delete(gorevId);
    if (this.kayit) {
      this.kayit.yaz({ tur: 'hafiza.gorev.arsiv', gorevId, sureMs: g ? Date.now() - g.baslangic : null });
    }
    return g;
  }
}

module.exports = { Hafiza };
