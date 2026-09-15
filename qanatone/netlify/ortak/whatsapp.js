/* netlify/ortak/whatsapp.js — WhatsApp Cloud API gondericisi, TEK YER.
   ---------------------------------------------------------------------
   15 Eyl 2026: form bildirimi (submission-created) ve izleme uyarisi
   (nobetci) ayni istegi atiyor. Iki kopya yazilsaydi bu deponun bildigi
   hata sinifi dogardi: biri duzelir, oburu sessizce eskide kalir.
   Hata FIRLATMAZ: bildirim, cagiran fonksiyonun asil isini bozmamali.
   Doner: { ok, durum?, neden? }.
   Bu klasor `netlify/functions` DISINDA: icindeki dosya fonksiyon sayilmaz,
   yalniz `require` ile pakete girer. */
'use strict';

function waHazir() {
  return !!(process.env.WA_TOKEN && process.env.WA_PHONE_ID && process.env.WA_TO);
}

async function waGonder(payload) {
  const TOKEN = process.env.WA_TOKEN;
  const PHONE_ID = process.env.WA_PHONE_ID;
  if (!TOKEN || !PHONE_ID) return { ok: false, neden: 'WA degiskenleri tanimli degil' };
  try {
    const r = await fetch('https://graph.facebook.com/v20.0/' + PHONE_ID + '/messages', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) return { ok: false, durum: r.status, neden: String(await r.text()).slice(0, 300) };
    return { ok: true, durum: r.status };
  } catch (e) {
    return { ok: false, neden: (e && e.message) || 'istek basarisiz' };
  }
}

module.exports = { waHazir, waGonder };
