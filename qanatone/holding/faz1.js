'use strict';
/* holding/faz1.js — Faz 1: KAPI + NİYET + KARŞILAMA + DEVİR, tek kanal
   (AJAN-HOLDING.md bölüm 9.1, 13). Omurga (Faz 0, holding/index.js)
   değişmez — bu dosya onun üzerine ajanları kurar. Gerçek WhatsApp API
   YOK; sahte adaptör arac kaydına girer, hiçbir ağ çağrısı yapmaz. */

const { kapiKur } = require('./ajan/kapi');
const { niyetKur } = require('./ajan/niyet');
const { karsilamaKur } = require('./ajan/karsilama');
const { devirKur } = require('./ajan/devir');
const { WhatsappSahte } = require('./kanal/whatsapp-sahte');

function faz1Kur(omurga) {
  const whatsapp = new WhatsappSahte();
  omurga.arac.kaydet('whatsapp', whatsapp);

  const aboneler = [kapiKur(omurga), niyetKur(omurga), karsilamaKur(omurga), devirKur(omurga)];

  function webhookAl(kisiId, metin) {
    omurga.olay.yayinla('mesaj.geldi.ham', { kaynak: 'whatsapp', kisiId, metin });
  }

  function kapat() {
    for (const birak of aboneler) birak();
  }

  return { whatsapp, webhookAl, kapat };
}

module.exports = { faz1Kur };
