/* netlify/functions/a2a.js
   ---------------------------------------------------------------------
   A2A AJANI — Agent2Agent, JSON-RPC baglamasi (9 Eyl 2026).

   NE OLDUGU: `diagnose` olcumunu A2A protokolu uzerinden bir AJAN
   BECERISI olarak acar. Baska bir ajan bize mesaj gonderir, biz olcup
   tamamlanmis bir Task dondurur.
   Adres: POST https://www.qanatone.com/a2a

   NEDEN AYRI SUNUCU — MCP YETMEZ MIYDI: hayir. Ikisi ayni ISI acar ama
   FARKLI SOZLESME konusur; `/.well-known/agent-card.json` bir A2A
   ARAYUZU vaat eder ve o karti MCP ucuna dogrultmak, karar kaydinin
   yasakladigi seyin ta kendisi olurdu: arkasinda o protokolu konusan bir
   sey olmayan kesif dosyasi. Ortak is `ajan-uc.js`te, burada yalniz
   protokol adaptoru var.

   SOZLESME KAYNAGI — OLCULDU: a2a-protocol.org spesifikasyonu.
   Uygulanan yontemler: `message/send`, `tasks/get`, `tasks/cancel`.
   Uygulanmayanlar ve NEDEN:
     message/stream, tasks/resubscribe  akis YOK — olcum tek vuruslu,
                                        ara ilerleme uretmiyoruz;
                                        `capabilities.streaming:false`
                                        kartta ACIKCA yaziyor.
     tasks/pushNotificationConfig/*     geri arama YOK — kartta
                                        `pushNotifications:false`.
     agent/getAuthenticatedExtendedCard kimlik dogrulama YOK; genisletilmis
                                        kart da yok. Kartta
                                        `extendedAgentCard` yazilmadi.
   Yani kart NE VAAT EDIYORSA O VAR; olmayan yetenek `false` ile
   BEYAN EDILIYOR, sessizce atlanmiyor.

   SURUM SUPERKUMESI — BILINCLI KARAR. A2A v0.3 ile v1.0 arasinda alan
   adlari ayrisiyor (v0.3: kartta `url`+`preferredTransport`, eserde
   `artifactId`; v1.0: kartta `supportedInterfaces`, eserde `id`).
   Ikisini de yaziyoruz: AYNI GERCEK UCU tarif ettikleri icin bu bir
   celiski degil, iki sozlukte ayni cumle. Tek surumu secip otekini
   kirmak, hangi surumun okundugunu BILMEDIGIMIZ halde bildigimizi
   varsaymak olurdu.
   --------------------------------------------------------------------- */

const crypto = require('crypto');
const U = require('./ajan-uc.js');

const PROTOKOL_SURUM = '0.3.0';   /* JSONRPC baglamasinin konustugu surum */
const BECERI_ID = 'site-tespit';

/* ---------- GOREV DEPOSU ----------
   diagnose'un kota deposuyla AYNI desen (blobsDepo): Lambda uyumluluk
   kipinde `connectLambda(event)` HER ISTEKTE cagrilir, store onbellege
   ALINMAZ. Gerekcenin tamami netlify/functions/diagnose.js icinde.

   YAZMA HATASI OLDURUCU DEGIL: `message/send` sonucu ZATEN yanitin
   icinde doner; depo yalniz sonraki `tasks/get` icindir. Depo dusserse
   olcum yine teslim edilir, `tasks/get` TaskNotFound doner ve log'a
   satir duser. Tersi (depo dustu diye olcumu de dusurmek) calisani
   calismayana feda etmek olurdu.                                       */
function blobsDepo() {
  const al = (event) => {
    const b = require('@netlify/blobs');
    if (event && typeof b.connectLambda === 'function') b.connectLambda(event);
    return b.getStore({ name: 'a2a-gorev' });
  };
  return {
    async oku(anahtar, event) { return (await al(event).get(anahtar, { type: 'json' })) || null; },
    async yaz(anahtar, deger, event) { await al(event).setJSON(anahtar, deger); }
  };
}

/* GOREV OMRU: 24 saat. TTL yok, o yuzden suresi dolan kayit OKUNDUGU AN
   olu sayilir (kota deposundaki tavrin aynisi). */
const GOREV_OMRU_MS = 24 * 60 * 60 * 1000;

const kimlik = () => crypto.randomUUID();
const zaman = () => new Date().toISOString();

/* ---------- JSON-RPC ---------- */
const yanit = (id, sonuc) => ({ jsonrpc: '2.0', id, result: sonuc });
const hata = (id, kod, mesaj, veri) => ({
  jsonrpc: '2.0', id: id === undefined ? null : id,
  error: veri === undefined ? { code: kod, message: mesaj } : { code: kod, message: mesaj, data: veri }
});
/* A2A'ya ozgu hata kodlari (spec): -32001 TaskNotFound,
   -32002 TaskNotCancelable, -32005 ContentTypeNotSupported. */
const GOREV_YOK = -32001;
const IPTAL_EDILEMEZ = -32002;

const HTTP = (kod, govde) => ({
  statusCode: kod,
  headers: U.JSON_BASLIK,
  body: govde === null ? '' : JSON.stringify(govde)
});

/* ---------- MESAJDAN ADRES CIKARMA ----------
   Iki yol, bu SIRAYLA:
     1) DataPart icinde acik `url` alani — makinenin dogru yolu.
     2) TextPart icinde gecen ilk adres — insan gibi yazan ajan icin.
   Tahmin YOK: metinde adres yoksa hata doneriz, "example.com demek
   istedi herhalde" diye bir dal kurulmadi.                             */
function adresCikar(mesaj) {
  const parcalar = (mesaj && Array.isArray(mesaj.parts)) ? mesaj.parts : [];
  for (const p of parcalar) {
    const d = p && (p.data || (p.kind === 'data' ? p : null));
    if (d && typeof d.url === 'string' && d.url.trim()) return d.url.trim();
  }
  for (const p of parcalar) {
    const t = p && typeof p.text === 'string' ? p.text : '';
    if (!t) continue;
    const m = t.match(/https?:\/\/[^\s<>"']+/i)
      || t.match(/\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\b/i);
    if (m) return m[0];
  }
  return '';
}

/* ---------- GOREV NESNESI ----------
   `kind` ayirici v0.3'te sart. Eser hem `artifactId` hem `id` tasiyor
   (surum superkumesi karari, dosya basinda yazili).                    */
function gorevYap(gorevId, baglamId, mesaj, govde, basarisiz) {
  const metin = U.ozet(govde);
  return {
    kind: 'task',
    id: gorevId,
    contextId: baglamId,
    status: {
      state: basarisiz ? 'failed' : 'completed',
      timestamp: zaman(),
      message: {
        kind: 'message',
        role: 'agent',
        messageId: kimlik(),
        taskId: gorevId,
        contextId: baglamId,
        parts: [{ kind: 'text', text: metin }]
      }
    },
    artifacts: basarisiz ? [] : [{
      artifactId: kimlik(),
      id: BECERI_ID + '-sonuc',
      name: 'site-tespit-sonuc',
      description: 'Ölçüm özeti (metin) ve ham sonuç (veri).',
      parts: [
        { kind: 'text', text: metin },
        { kind: 'data', data: govde }
      ]
    }],
    history: mesaj ? [mesaj] : [],
    metadata: { skill: BECERI_ID, tool: U.ARAC_ADI, limits: U.ARAC_SINIR }
  };
}

/* ---------- Yontemler ---------- */
async function isle(event, m, depo) {
  const id = m.id;

  switch (m.method) {
    case 'message/send': {
      const p = m.params || {};
      const mesaj = p.message;
      if (!mesaj || !Array.isArray(mesaj.parts))
        return hata(id, -32602, 'params.message.parts zorunlu');

      const url = adresCikar(mesaj);
      if (!url)
        return hata(id, -32602, 'Mesajda ölçülecek adres yok. DataPart içinde {"url":"..."} '
          + 'gönderin ya da metinde açık bir adres yazın.');

      const gorevId = kimlik();
      const baglamId = (mesaj.contextId && String(mesaj.contextId)) || kimlik();
      const { kod, govde } = await U.olc(event, url);
      const basarisiz = kod !== 200 || govde.ok !== true;
      const gorev = gorevYap(gorevId, baglamId, mesaj, govde, basarisiz);

      try {
        await depo.yaz('gorev-' + gorevId, { t: Date.now(), gorev }, event);
      } catch (e) {
        /* Olcum teslim edilir, yalniz `tasks/get` yolu kapanir. */
        console.log(JSON.stringify({ olay: 'a2a-depo-yazilamadi', mesaj: String(e && e.message).slice(0, 120) }));
      }
      return yanit(id, gorev);
    }

    case 'tasks/get': {
      const p = m.params || {};
      if (!p.id) return hata(id, -32602, 'params.id zorunlu');
      let kayit = null;
      try { kayit = await depo.oku('gorev-' + String(p.id), event); } catch (e) { kayit = null; }
      if (!kayit || !kayit.gorev || (Date.now() - Number(kayit.t || 0)) > GOREV_OMRU_MS)
        return hata(id, GOREV_YOK, 'Görev bulunamadı (görevler 24 saat saklanır)');
      /* historyLength: spec'te istege bagli kirpma. */
      const g = kayit.gorev;
      const n = p.historyLength;
      if (typeof n === 'number' && n >= 0 && Array.isArray(g.history))
        return yanit(id, Object.assign({}, g, { history: g.history.slice(-n) }));
      return yanit(id, g);
    }

    case 'tasks/cancel':
      /* Olcum ESZAMANLI tamamlanir: iptal edilecek calisan gorev hicbir
         zaman olusmaz. Spec'in bu durum icin kodu var — sessizce
         "tamam" demek yerine dogrusunu doneriz. */
      return hata(id, IPTAL_EDILEMEZ, 'Görev eşzamanlı tamamlanır, iptal edilebilir bir aşaması yok');

    default:
      return hata(id, -32601, 'Bilinmeyen yöntem: ' + String(m.method));
  }
}

/* ---------- HTTP kabugu ---------- */
function handlerOlustur(depo) {
  return async function handler(event) {
    const yontem = (event && event.httpMethod) || 'GET';
    if (yontem === 'OPTIONS') return { statusCode: 204, headers: U.CORS, body: '' };
    if (!U.originGecerli(event)) return HTTP(403, hata(null, -32600, 'Geçersiz Origin başlığı'));
    if (yontem !== 'POST')
      return {
        statusCode: 405,
        headers: Object.assign({}, U.JSON_BASLIK, { allow: 'POST, OPTIONS' }),
        body: JSON.stringify(hata(null, -32601, 'A2A JSON-RPC için POST kullanın. '
          + 'Ajan kartı: ' + U.KOK_ADRES + '/.well-known/agent-card.json'))
      };

    let m;
    try { m = JSON.parse(event.body || ''); } catch (e) {
      return HTTP(400, hata(null, -32700, 'Gövde geçerli JSON değil'));
    }
    if (Array.isArray(m))
      return HTTP(400, hata(null, -32600, 'Toplu istek desteklenmiyor'));
    if (!m || typeof m !== 'object' || m.jsonrpc !== '2.0' || typeof m.method !== 'string')
      return HTTP(400, hata(m && m.id, -32600, 'Geçersiz JSON-RPC mesajı'));

    let cikti;
    try { cikti = await isle(event, m, depo); } catch (e) {
      console.log(JSON.stringify({ olay: 'a2a-ic-hata', yontem: m.method, mesaj: String(e && e.message).slice(0, 120) }));
      return HTTP(500, hata(m.id, -32603, 'Sunucu hatası'));
    }
    return HTTP(200, cikti);
  };
}

exports.handler = handlerOlustur(blobsDepo());

/* Test ve denetim icin: sahte depoyla AGA CIKMADAN kosulabilsin
   (diagnose'un `handlerOlustur` deseniyle ayni gerekce). */
exports.handlerOlustur = handlerOlustur;
exports.isle = isle;
exports.adresCikar = adresCikar;
exports.gorevYap = gorevYap;
exports.PROTOKOL_SURUM = PROTOKOL_SURUM;
exports.BECERI_ID = BECERI_ID;
exports.GOREV_OMRU_MS = GOREV_OMRU_MS;
