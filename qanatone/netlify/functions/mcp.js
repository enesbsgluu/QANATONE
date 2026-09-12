/* netlify/functions/mcp.js
   ---------------------------------------------------------------------
   MCP SUNUCUSU — Streamable HTTP (9 Eyl 2026).

   NE OLDUGU: `diagnose` olcumunu Model Context Protocol araci olarak
   disariya acar. Bir ajan bu uca baglanip "su siteyi olc" diyebilir.
   Adres: POST https://www.qanatone.com/mcp

   NEDEN YAZILDI — KARAR KAYDININ DEGISEN MADDESI.
   `yeni/ajan-hatti.mjs` basindaki karar kaydi 5 Eyl'de soyle diyordu:
     /.well-known/mcp.json   MCP sunucumuz YOK
   Kural aynen duruyor ("arkasinda CALISAN BIR SEY OLMAYAN hicbir kesif
   dosyasi yayinlanmaz"); degisen sey KURAL DEGIL, GERCEK: artik sunucu
   var. Karti once yazip sunucuyu sonraya birakmak tam da o kuralin
   yasakladigi sey olurdu — sira bilincli olarak TERSTIR: once bu dosya,
   sonra kart.

   SOZLESME KAYNAGI — OLCULDU, UYDURULMADI:
     modelcontextprotocol.io/specification/2025-06-18/basic/transports
   Oradan gelen ve burada UYGULANAN normatif maddeler:
     · Tek uc hem POST hem GET kabul eder.
     · POST govdesi JSON-RPC ISTEK ise sunucu ya `text/event-stream` ya
       `application/json` doner. Biz JSON donuyoruz: araclarimiz tek
       vuruslu, ara ilerleme mesajimiz yok — SSE akisi acmak bedava
       degil ve tasiyacagi sey yok.
     · POST govdesi BILDIRIM ya da YANIT ise: 202 Accepted, GOVDESIZ.
     · GET'e SSE akisi sunmuyorsak 405 donmeliyiz.
     · Gecersiz/desteklenmeyen `MCP-Protocol-Version` -> 400.
     · Origin dogrulanmali (gerekce ve bizim yorumumuz ajan-uc.js'te).

   OTURUM YOK — BILINCLI. Netlify fonksiyonlari durumsuz; `Mcp-Session-Id`
   vermiyoruz, dolayisiyla istemci de sonraki isteklerde tasimak zorunda
   degil (spec: oturum kimligi MAY). DELETE'e 405 doniyoruz, cunku
   sonlandirilacak oturum yok.

   TOPLU ISTEK (JSON-RPC batch) YOK: 2025-06-18 surumu batch'i
   KALDIRDI. Dizi govde gelirse -32600 ile reddediliyor.
   --------------------------------------------------------------------- */

const U = require('./ajan-uc.js');

/* Desteklenen protokol surumleri — YENIDEN ESKIYE. Ilki bizim
   tercihimiz; istemci bunlardan birini isterse AYNISI doner, istemezse
   en yenisini oneririz (spec: surum pazarligi). */
const SURUMLER = ['2025-06-18', '2025-03-26'];
const SURUM = SURUMLER[0];

const SUNUCU = {
  name: 'com.qanatone/site-tespit',
  title: 'QANATONE · Site Tespit',
  version: '1.0.0'
};

/* Ajan bu metni initialize yanitinda alir. "Ne yapar"dan cok "NE YAPMAZ"
   yaziyor: bu deponun tespit aracinda odedigi ders — bir olcumu
   oldugundan genis sunmak yanlis yesildir.                              */
const YONERGE =
  'Tek araç: ' + U.ARAC_ADI + '. ' + U.ARAC_ACIKLAMA + '\n'
  + U.ARAC_SINIR + '\n'
  + 'Yanıtta ok:false gelirse HTTP kodu değil reason alanı okunmalıdır.';

const ARACLAR = [{
  name: U.ARAC_ADI,
  title: 'Site tespiti',
  description: U.ARAC_ACIKLAMA + ' ' + U.ARAC_SINIR,
  inputSchema: U.GIRDI_SEMASI,
  outputSchema: U.CIKTI_SEMASI
}];

/* ---------- JSON-RPC yardimcilari ---------- */
const yanit = (id, sonuc) => ({ jsonrpc: '2.0', id, result: sonuc });
const hata = (id, kod, mesaj, veri) => ({
  jsonrpc: '2.0', id: id === undefined ? null : id,
  error: veri === undefined ? { code: kod, message: mesaj } : { code: kod, message: mesaj, data: veri }
});

const HTTP = (kod, govde, ek) => ({
  statusCode: kod,
  headers: Object.assign({}, U.JSON_BASLIK, ek || {}),
  body: govde === null ? '' : JSON.stringify(govde)
});

/* ---------- Tek mesaji isle ----------
   Donen deger: JSON-RPC yanit nesnesi ya da null (bildirim -> govdesiz). */
async function isle(event, m) {
  const id = m.id;
  const bildirim = !('id' in m) || m.id === null;

  switch (m.method) {
    case 'initialize': {
      const istenen = m.params && m.params.protocolVersion;
      const secilen = SURUMLER.includes(istenen) ? istenen : SURUM;
      return yanit(id, {
        protocolVersion: secilen,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SUNUCU,
        instructions: YONERGE
      });
    }

    /* Bildirimler: govdesiz 202 (cagiran katman halleder). Bilinmeyen
       bildirime HATA DONULMEZ — JSON-RPC'de bildirimin yaniti olmaz. */
    case 'notifications/initialized':
    case 'notifications/cancelled':
    case 'notifications/progress':
      return null;

    case 'ping':
      return bildirim ? null : yanit(id, {});

    case 'tools/list':
      return yanit(id, { tools: ARACLAR });

    case 'tools/call': {
      const p = m.params || {};
      if (p.name !== U.ARAC_ADI)
        return hata(id, -32602, 'Bilinmeyen araç: ' + String(p.name));
      const url = p.arguments && p.arguments.url;
      if (typeof url !== 'string' || !url.trim())
        return hata(id, -32602, 'url alanı zorunlu (metin)');

      const { kod, govde } = await U.olc(event, url.trim());
      /* ARAC HATASI ILE PROTOKOL HATASI AYRI SEYDIR (spec). Site
         olculemedi -> bu bir arac sonucudur, `isError:true` ile DONER;
         JSON-RPC hatasi degildir. Ajan boylece sebebi okuyup kullaniciya
         soyleyebilir; -32603 donseydi sebep kaybolurdu. */
      const basarisiz = kod !== 200 || govde.ok !== true;
      return yanit(id, {
        content: [{ type: 'text', text: U.ozet(govde) }],
        structuredContent: govde,
        isError: basarisiz
      });
    }

    default:
      return bildirim ? null : hata(id, -32601, 'Bilinmeyen yöntem: ' + String(m.method));
  }
}

/* ---------- HTTP kabugu ---------- */
async function handler(event) {
  const yontem = (event && event.httpMethod) || 'GET';

  if (yontem === 'OPTIONS') return { statusCode: 204, headers: U.CORS, body: '' };

  if (!U.originGecerli(event))
    return HTTP(403, hata(null, -32600, 'Geçersiz Origin başlığı'));

  /* Spec: SSE akisi sunmuyorsak GET -> 405. DELETE -> oturum yok. */
  if (yontem === 'GET')
    return HTTP(405, hata(null, -32601, 'Bu uçta SSE akışı yok — JSON-RPC için POST kullanın'),
      { allow: 'POST, OPTIONS' });
  if (yontem !== 'POST')
    return HTTP(405, hata(null, -32601, 'Desteklenmeyen yöntem: ' + yontem), { allow: 'POST, OPTIONS' });

  /* Spec: gecersiz/desteklenmeyen MCP-Protocol-Version -> 400.
     Baslik YOKSA spec 2025-03-26 varsayilmasini soyler (geriye uyum) —
     yani basligin yoklugu hata degildir. */
  const pv = String(U.bas(event, 'mcp-protocol-version') || '').trim();
  if (pv && !SURUMLER.includes(pv))
    return HTTP(400, hata(null, -32600, 'Desteklenmeyen MCP-Protocol-Version: ' + pv,
      { supported: SURUMLER }));

  let m;
  try { m = JSON.parse(event.body || ''); } catch (e) {
    return HTTP(400, hata(null, -32700, 'Gövde geçerli JSON değil'));
  }

  /* 2025-06-18 JSON-RPC batch'i kaldirdi. */
  if (Array.isArray(m))
    return HTTP(400, hata(null, -32600, 'Toplu istek desteklenmiyor (MCP ' + SURUM + ' batch`i kaldirdi)'));
  if (!m || typeof m !== 'object' || m.jsonrpc !== '2.0' || typeof m.method !== 'string') {
    /* Govde bir JSON-RPC YANITI ise (id + result/error, method yok) bu da
       gecerli girdidir ve 202 ister — sunucu-istemci rolleri simetrik. */
    if (m && typeof m === 'object' && m.jsonrpc === '2.0' && ('result' in m || 'error' in m))
      return { statusCode: 202, headers: U.CORS, body: '' };
    return HTTP(400, hata(m && m.id, -32600, 'Geçersiz JSON-RPC mesajı'));
  }

  let cikti;
  try { cikti = await isle(event, m); } catch (e) {
    /* Ic hatanin metni disariya SIZDIRILMAZ — yigin izi ve ic adresler
       ajan gunlugune dusmemeli (diagnose'daki `maskele` ile ayni tavir). */
    console.log(JSON.stringify({ olay: 'mcp-ic-hata', yontem: m.method, mesaj: String(e && e.message).slice(0, 120) }));
    return HTTP(500, hata(m.id, -32603, 'Sunucu hatası'));
  }

  /* Bildirim ya da yanit -> 202 Accepted, GOVDESIZ (spec). */
  if (cikti === null) return { statusCode: 202, headers: U.CORS, body: '' };
  return HTTP(200, cikti, { 'mcp-protocol-version': pv || SURUM });
}

exports.handler = handler;

/* Denetim ve davranis testi icin disa aciliyor: kapi kaynak taramasiyla
   degil GERCEK CAGRIYLA olcer (bu depoda "kaynak taramasi hesaplanan
   degeri goremez" dersi odendi). */
exports.isle = isle;
exports.SURUMLER = SURUMLER;
exports.SURUM = SURUM;
exports.SUNUCU = SUNUCU;
exports.ARACLAR = ARACLAR;
exports.YONERGE = YONERGE;
