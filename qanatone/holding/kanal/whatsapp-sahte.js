'use strict';
/* holding/kanal/whatsapp-sahte.js — sahte WhatsApp adaptörü
   Faz 1: gerçek WhatsApp Cloud API bağlantısı YOK. Bu adaptör arac
   kaydına 'whatsapp' adıyla girer, gönderilen mesajları belleğe yazar,
   dışarı hiçbir ağ çağrısı yapmaz. Gerçek bağlantı gölge modu öncesi
   ayrı iştir (bkz. holding/CLAUDE.md). */

class WhatsappSahte {
  constructor() {
    this.gonderilen = [];
  }

  async mesajGonder(kisiId, metin) {
    const satir = { kisiId, metin, zaman: new Date().toISOString() };
    this.gonderilen.push(satir);
    return { basarili: true, ...satir };
  }
}

module.exports = { WhatsappSahte };
