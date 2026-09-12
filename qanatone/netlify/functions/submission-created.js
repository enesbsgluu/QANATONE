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

  /* ATIF — istemcide süzülmüş olması YETMEZ: istemci doğrulaması kullanıcı
     deneyimidir, hazırlanmış bir POST onu atlar ve buraya ham değer
     düşebilir. Bu satırlar Enes'in okuyup işlem yaptığı WhatsApp mesajına
     ve fonksiyon loglarına gidiyor, yani yabancı metin buraya yazdırmak
     bir sahtecilik yüzeyi. Aynı kalıp burada bir kez daha uygulanıyor;
     uymayan değer ATILIYOR (kırpılmıyor) ve mesaja hiç girmiyor.
     Kalıbın satır sonunu dışarıda bırakması ayrıca şart: çok satırlı bir
     değer hem log satırını sahteleyebilir hem de şablon kullanılıyorsa
     Meta'nın parametreyi reddetmesine yol açar — tek bir hazırlanmış
     bağlantı bütün bildirimleri düşürebilirdi.                        */
  const ATIF_ALANLAR = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term',
                        'utm_content', 'gclid', 'fbclid', 'msclkid',
                        'inilen_sayfa', 'yonlendiren'];
  const ATIF_KALIP = /^[\w.\-]{1,128}$/;
  const ATIF_YOL_KALIP = /^\/[\w\-./]{0,127}$/;
  const atifSuz = (k, v) => {
    if (typeof v !== 'string' || !v) return '';
    return (k === 'inilen_sayfa' ? ATIF_YOL_KALIP : ATIF_KALIP).test(v) ? v : '';
  };
  const atifSatirlari = ATIF_ALANLAR
    .map(k => [k, atifSuz(k, d[k])])
    .filter(([, v]) => v)
    .map(([k, v]) => k + ': ' + v);

  const line = [
    'QANATONE — yeni demo talebi',
    'Ad soyad: ' + (d.name || '-'),
    'E-posta: '  + (d.email || '-'),
    'Telefon: '  + (d.phone || '-')
  ].concat(atifSatirlari.length ? ['—', 'Geliş bağlamı:'].concat(atifSatirlari) : [])
   .join('\n');

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
