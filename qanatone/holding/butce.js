'use strict';
/* holding/butce.js — 2.7 Bütçe sayacı
   Her ajanın günlük jeton/para bütçesi var. Aşılırsa ajan durur ve
   haber verir — sessizce fatura büyütmez. */

class Butce {
  constructor(kayit, olayYolu) {
    this.kayit = kayit || null;
    this.olayYolu = olayYolu || null;
    this.limitler = new Map();
    this.kullanim = new Map();
  }

  limitBelirle(ajanAdi, { jetonGunluk, paraGunluk }) {
    this.limitler.set(ajanAdi, { jetonGunluk, paraGunluk });
  }

  _gun() {
    return new Date().toISOString().slice(0, 10);
  }

  _durum(ajanAdi) {
    const bugun = this._gun();
    let k = this.kullanim.get(ajanAdi);
    if (!k || k.gun !== bugun) {
      k = { gun: bugun, jeton: 0, para: 0 };
      this.kullanim.set(ajanAdi, k);
    }
    return k;
  }

  harca(ajanAdi, jeton, para) {
    const limit = this.limitler.get(ajanAdi);
    const k = this._durum(ajanAdi);
    const yeniJeton = k.jeton + jeton;
    const yeniPara = k.para + para;

    if (limit && (yeniJeton > limit.jetonGunluk || yeniPara > limit.paraGunluk)) {
      if (this.kayit) this.kayit.yaz({ tur: 'butce.asildi', ajan: ajanAdi, denenenJeton: yeniJeton, denenenPara: yeniPara, limit });
      if (this.olayYolu) this.olayYolu.yayinla('butce.asildi', { ajan: ajanAdi, jeton: yeniJeton, para: yeniPara });
      return {
        izinVerildi: false,
        kalanJeton: Math.max(0, limit.jetonGunluk - k.jeton),
        kalanPara: Math.max(0, limit.paraGunluk - k.para),
      };
    }

    k.jeton = yeniJeton;
    k.para = yeniPara;
    if (this.kayit) this.kayit.yaz({ tur: 'butce.harcama', ajan: ajanAdi, jeton, para });
    return {
      izinVerildi: true,
      kalanJeton: limit ? limit.jetonGunluk - k.jeton : Infinity,
      kalanPara: limit ? limit.paraGunluk - k.para : Infinity,
    };
  }

  durum(ajanAdi) {
    return this._durum(ajanAdi);
  }
}

module.exports = { Butce };
