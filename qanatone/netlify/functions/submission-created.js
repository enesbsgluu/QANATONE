/* netlify/functions/submission-created.js
   ---------------------------------------------------------------------
   Netlify, her form gönderiminden sonra bu fonksiyonu kendiliğinden çağırır
   (dosya adının "submission-created" olması yeterli, ayrıca bağlamaya gerek yok).

   Kayıt zaten Netlify panelinde (Forms) tutuluyor ve oradan e-posta bildirimi
   açılabiliyor. Bu fonksiyon bunun üstüne WhatsApp'a da düşürüyor.

   ÇALIŞMASI İÇİN GEREKENLER — Netlify > Site settings > Environment variables:
     WA_TOKEN     Meta WhatsApp Cloud API kalıcı erişim jetonu
     WA_PHONE_ID  Cloud API telefon numarası kimliği
     WA_TO        Bildirimin gideceği numara, ülke kodlu ve sadece rakam:
                  905326291508
     WA_TEMPLATE  (isteğe bağlı) onaylı şablon adı
     WA_LANG      (isteğe bağlı) şablon dili, varsayılan tr

   ÖNEMLİ: WhatsApp Cloud API serbest metin mesajını yalnızca karşı taraf
   son 24 saat içinde sana yazdıysa iletir. Kendi numarana bildirim
   göndermek için ya 24 saatte bir kendine mesaj atman ya da onaylı bir
   şablon (WA_TEMPLATE) kullanman gerekir. Değişkenler tanımlı değilse
   fonksiyon sessizce geçer; form kaydı yine de Netlify'da durur.
   --------------------------------------------------------------------- */

exports.handler = async (event) => {
  let d = {};
  try {
    const body = JSON.parse(event.body || '{}');
    d = (body.payload && body.payload.data) || {};
  } catch (e) {
    return { statusCode: 400, body: 'gecersiz govde' };
  }

  const TOKEN = process.env.WA_TOKEN;
  const PHONE_ID = process.env.WA_PHONE_ID;
  const TO = process.env.WA_TO;

  if (!TOKEN || !PHONE_ID || !TO) {
    console.log('WhatsApp ortam degiskenleri tanimli degil — kayit yalnizca Netlify tarafinda.');
    return { statusCode: 200, body: 'ok' };
  }

  const line = [
    'QANATONE — yeni demo talebi',
    'Ad soyad: ' + (d.name || '-'),
    'E-posta: '  + (d.email || '-'),
    'Telefon: '  + (d.phone || '-')
  ].join('\n');

  const payload = process.env.WA_TEMPLATE
    ? { messaging_product: 'whatsapp', to: TO, type: 'template',
        template: {
          name: process.env.WA_TEMPLATE,
          language: { code: process.env.WA_LANG || 'tr' },
          components: [{ type: 'body', parameters: [
            { type: 'text', text: d.name  || '-' },
            { type: 'text', text: d.email || '-' },
            { type: 'text', text: d.phone || '-' }
          ]}]
        }}
    : { messaging_product: 'whatsapp', to: TO, type: 'text', text: { body: line } };

  try {
    const r = await fetch(
      'https://graph.facebook.com/v20.0/' + PHONE_ID + '/messages',
      { method: 'POST',
        headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) }
    );
    if (!r.ok) console.error('WhatsApp gonderilemedi:', r.status, await r.text());
  } catch (e) {
    console.error('WhatsApp istegi basarisiz:', e && e.message);
  }

  return { statusCode: 200, body: 'ok' };
};
