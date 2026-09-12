'use strict';
/* holding/index.js — Faz 0: Ortak Omurga
   AJAN-HOLDING.md bölüm 2'deki sekiz parça burada bir araya gelir.
   Bu omurga kurulmadan yazılan her ajan, dokuzuncu ajanda sökülür. */

const { Kimlik } = require('./kimlik');
const { OlayYolu } = require('./olay');
const { Hafiza } = require('./hafiza');
const { AracKaydi } = require('./arac');
const { OnayKapisi } = require('./onay');
const { Kayit } = require('./kayit');
const { Butce } = require('./butce');
const { Guvenlik } = require('./guvenlik');

function omurgaKur(secenek = {}) {
  const kayit = new Kayit({ diskeYaz: secenek.diskeYaz !== false });
  const olay = new OlayYolu(kayit);
  const kimlik = new Kimlik();
  const hafiza = new Hafiza(kayit);
  const arac = new AracKaydi(kayit);
  const onay = new OnayKapisi(kayit, olay, kimlik);
  const butce = new Butce(kayit, olay);
  const guvenlik = new Guvenlik(kayit);

  return { kayit, olay, kimlik, hafiza, arac, onay, butce, guvenlik };
}

module.exports = { omurgaKur };
