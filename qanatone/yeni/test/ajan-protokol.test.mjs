/* yeni/test/ajan-protokol.test.mjs — MCP ve A2A sunucularinin KANITI.
   ---------------------------------------------------------------------
   BU DOSYA BIR KAPIYA BAGLI: `yeni/denetim.cjs` T1 kurali bu klasordeki
   her `*.test.mjs`i `node --test` ile kosar, denetim de yayin zincirinde.
   "Elle kosulan komut kapi degildir" (Enes, 4 Eyl).

   NE OLCUYOR — DORT AYRI SEY, DORDU DE DAVRANIS:

   1) KOTA ORTAK. `ajan-uc.olc` cagiranin BASLIKLARINI diagnose'a oldugu
      gibi tasiyor mu? Tasimazsa MCP/A2A, `diagnose`un 2 analiz/24sa
      kuralinin etrafindan dolasan ikinci bir kapi olurdu. Kaynakta
      `event.headers` yazdigini GORMEK yetmez — bu depoda "kaynak
      taramasi hesaplanan degeri goremez" dersi odendi; burada gercek
      cagri yapilip diagnose'a NE GITTIGI yakalaniyor.
      KIRMIZI-ONCE KOLU: baslik tasinmazsa test kirmizi olmali.

   2) MCP TASIYICI SOZLESMESI. Spec'in normatif maddeleri
      (2025-06-18/basic/transports) davranis olarak dogrulaniyor:
      bildirime govdesiz 202, GET'e 405, desteklenmeyen protokol
      surumune 400, toplu isteğe ret.

   3) ARAC HATASI != PROTOKOL HATASI. Olculemeyen site JSON-RPC hatasi
      DEGIL, `isError:true` tasiyan bir arac sonucudur — sebep ajana
      ulasmali. Ters kurulsaydi ajan "sunucu bozuk" derdi.

   4) A2A GOREV DONGUSU. `message/send` tamamlanmis Task uretir, eser
      hem metin hem veri tasir, `tasks/get` AYNI gorevi geri verir.
      Depo sahte: aga da Blobs'a da cikilmiyor.
   --------------------------------------------------------------------- */
import test from 'node:test';
import assert from 'node:assert/strict';

import U from '../../netlify/functions/ajan-uc.js';
import diagnose from '../../netlify/functions/diagnose.js';
import mcp from '../../netlify/functions/mcp.js';
import a2a from '../../netlify/functions/a2a.js';

/* ---------- yardimcilar ---------- */
/* FIKSTUR CANLI SOZLESMEDEN ALINDI, UYDURULMADI.
   Ilk yazimda `ajan: 44` yazmistim — yanlisti; gercek alan bir NESNE
   ({olculdu, skor, items, bilgi}) ve ozete "[object Object]/100" dusuyordu.
   Hatayi birim testi degil, yereldeki GERCEK cagri yakaladi (9 Eyl).
   Ders kayitli: elle yazilan fikstur kapiyi kendi hayaline kilitler. */
const SONUC = {
  ok: true, host: 'example.com', finalUrl: 'https://example.com/',
  score: 72, status: 200, bytes: 51234, redirects: 1, kb: 50,
  cdn: 'Netlify', durum: 'saglikli', kalan: 1,
  ajan: {
    olculdu: true, skor: 44,
    items: [{ k: 'aierisim', state: 'ok', v: '0' }, { k: 'llms', state: 'fail', v: 'yok' }],
    bilgi: { metin: 4210 }
  },
  items: [{ k: 'https', state: 'ok', v: 'var' }, { k: 'sitemap', state: 'fail', v: 'yok' },
    { k: 'llms', state: 'warn', v: 'kismi' }]
};

const olay = (govde, basliklar) => ({
  httpMethod: 'POST',
  headers: Object.assign({ 'x-nf-client-connection-ip': '203.0.113.7' }, basliklar || {}),
  body: typeof govde === 'string' ? govde : JSON.stringify(govde)
});

/* olc()'u sahteleyip protokol adaptorunu yalniz basina olcmek icin.
   mcp.js/a2a.js `U.olc(...)` diye CAGRI ANINDA bakiyor, o yuzden
   modul nesnesine yazmak yetiyor. */
function olcSahtele(cevap) {
  const eski = U.olc;
  U.olc = async () => cevap;
  return () => { U.olc = eski; };
}

const sahteDepo = () => {
  const kutu = new Map();
  return {
    async oku(a) { return kutu.has(a) ? kutu.get(a) : null; },
    async yaz(a, d) { kutu.set(a, d); },
    _kutu: kutu
  };
};

/* ====================================================================
   1 · KOTA ORTAK — cagiranin kimligi diagnose'a ULASIYOR
   ==================================================================== */
test('olc(): cagiranin basliklari diagnose`a oldugu gibi gider (kota ortak)', async () => {
  const eski = diagnose.handler;
  let gorulen = null;
  diagnose.handler = async (ev) => {
    gorulen = ev;
    return { statusCode: 200, body: JSON.stringify(SONUC) };
  };
  try {
    await U.olc(olay(null, { 'x-nf-client-connection-ip': '198.51.100.9', 'user-agent': 'AjanX/1' }),
      'https://example.com');
  } finally { diagnose.handler = eski; }

  assert.ok(gorulen, 'diagnose.handler hic cagrilmadi');
  assert.equal(gorulen.httpMethod, 'POST');
  /* KIRMIZI-ONCE: bu satir dusesrse kota anahtari cagirandan degil
     bostan turer ve MCP/A2A kota atlama kapisi olur. */
  assert.equal(gorulen.headers['x-nf-client-connection-ip'], '198.51.100.9');
  assert.equal(JSON.parse(gorulen.body).url, 'https://example.com');
});

/* ====================================================================
   2 · MCP TASIYICI SOZLESMESI
   ==================================================================== */
test('MCP initialize: istenen surum destekleniyorsa AYNISI doner', async () => {
  const y = await mcp.handler(olay({ jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } } }));
  assert.equal(y.statusCode, 200);
  const g = JSON.parse(y.body);
  assert.equal(g.result.protocolVersion, '2025-03-26');
  assert.equal(g.result.serverInfo.name, 'com.qanatone/site-tespit');
  assert.ok(g.result.capabilities.tools, 'tools yetenegi bildirilmedi');
});

test('MCP initialize: bilinmeyen surum istenirse EN YENISI onerilir', async () => {
  const y = await mcp.handler(olay({ jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '1999-01-01' } }));
  assert.equal(JSON.parse(y.body).result.protocolVersion, mcp.SURUM);
});

test('MCP tools/list: tek arac, girdi semasi url zorunlu', async () => {
  const y = await mcp.handler(olay({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
  const t = JSON.parse(y.body).result.tools;
  assert.equal(t.length, 1);
  assert.equal(t[0].name, 'site_tespit');
  assert.deepEqual(t[0].inputSchema.required, ['url']);
  assert.ok(t[0].outputSchema, 'outputSchema yok — yapisal sonuc sozlesmesiz kalir');
});

test('MCP bildirim: govdesiz 202 (spec)', async () => {
  const y = await mcp.handler(olay({ jsonrpc: '2.0', method: 'notifications/initialized' }));
  assert.equal(y.statusCode, 202);
  assert.equal(y.body, '');
});

test('MCP GET: SSE akisi yok -> 405 (spec)', async () => {
  const y = await mcp.handler({ httpMethod: 'GET', headers: {} });
  assert.equal(y.statusCode, 405);
  assert.equal(y.headers.allow, 'POST, OPTIONS');
});

test('MCP desteklenmeyen MCP-Protocol-Version -> 400 (spec)', async () => {
  const y = await mcp.handler(olay({ jsonrpc: '2.0', id: 3, method: 'tools/list' },
    { 'mcp-protocol-version': '2001-01-01' }));
  assert.equal(y.statusCode, 400);
  assert.equal(JSON.parse(y.body).error.code, -32600);
});

test('MCP basliksiz istek gecerli (spec: geriye uyum) ', async () => {
  const y = await mcp.handler(olay({ jsonrpc: '2.0', id: 4, method: 'ping' }));
  assert.equal(y.statusCode, 200);
  assert.deepEqual(JSON.parse(y.body).result, {});
});

test('MCP toplu istek reddedilir (2025-06-18 batch`i kaldirdi)', async () => {
  const y = await mcp.handler(olay([{ jsonrpc: '2.0', id: 1, method: 'ping' }]));
  assert.equal(y.statusCode, 400);
});

test('MCP bozuk JSON -> -32700', async () => {
  const y = await mcp.handler(olay('{bu json degil'));
  assert.equal(JSON.parse(y.body).error.code, -32700);
});

test('MCP bilinmeyen yontem -> -32601', async () => {
  const y = await mcp.handler(olay({ jsonrpc: '2.0', id: 9, method: 'yok/boyle' }));
  assert.equal(JSON.parse(y.body).error.code, -32601);
});

/* ====================================================================
   3 · ARAC SONUCU
   ==================================================================== */
test('MCP tools/call: metin ozet + structuredContent, isError false', async () => {
  const geri = olcSahtele({ kod: 200, govde: SONUC });
  try {
    const y = await mcp.handler(olay({ jsonrpc: '2.0', id: 5, method: 'tools/call',
      params: { name: 'site_tespit', arguments: { url: 'https://example.com' } } }));
    const r = JSON.parse(y.body).result;
    assert.equal(r.isError, false);
    assert.equal(r.structuredContent.score, 72);
    const metin = r.content[0].text;
    assert.match(metin, /example\.com/);
    assert.match(metin, /72\/100/);
    /* IKINCI EKSEN SAYIYA DONMELI. Bu satir olmasaydi `ajan` nesnesi
       ozete "[object Object]" olarak duser ve kimse fark etmezdi. */
    assert.match(metin, /ajan hazırlığı 44\/100/);
    assert.doesNotMatch(metin, /\[object Object\]/);
    assert.match(metin, /Ajan ekseninde kırmızı \(1\): llms/);
    /* Kirmizi kalem ozette ADIYLA gecmeli — ozetin isi sorunu gostermek. */
    assert.match(metin, /sitemap/);
    /* Sinirlar her yanitta tekrarlanir: ajan araci oldugundan genis sunmasin. */
    assert.match(metin, /tüm siteyi taramaz/);
  } finally { geri(); }
});

test('MCP tools/call: olculemeyen site PROTOKOL hatasi degil, isError:true', async () => {
  const geri = olcSahtele({ kod: 200, govde: { ok: false, reason: 'blocked' } });
  try {
    const y = await mcp.handler(olay({ jsonrpc: '2.0', id: 6, method: 'tools/call',
      params: { name: 'site_tespit', arguments: { url: 'https://example.com' } } }));
    const g = JSON.parse(y.body);
    assert.ok(!g.error, 'JSON-RPC hatasi donmemeli — sebep ajana ulasmali');
    assert.equal(g.result.isError, true);
    assert.match(g.result.content[0].text, /bot duvarı/);
  } finally { geri(); }
});

test('ozet(): ajan ekseni olculemediyse SEBEP yazilir, nesne basilmaz', () => {
  const m = U.ozet(Object.assign({}, SONUC, { ajan: { olculdu: false, sebep: 'butce' } }));
  assert.match(m, /ajan hazırlığı ölçülemedi \(butce\)/);
  assert.doesNotMatch(m, /\[object Object\]/);
  /* Eksen hic gelmezse de nesne basilmamali. */
  const m2 = U.ozet(Object.assign({}, SONUC, { ajan: undefined }));
  assert.match(m2, /ajan hazırlığı —/);
});

test('MCP tools/call: url yoksa -32602', async () => {
  const y = await mcp.handler(olay({ jsonrpc: '2.0', id: 7, method: 'tools/call',
    params: { name: 'site_tespit', arguments: {} } }));
  assert.equal(JSON.parse(y.body).error.code, -32602);
});

test('MCP tools/call: bilinmeyen arac -32602', async () => {
  const y = await mcp.handler(olay({ jsonrpc: '2.0', id: 8, method: 'tools/call',
    params: { name: 'baska_arac', arguments: { url: 'https://example.com' } } }));
  assert.equal(JSON.parse(y.body).error.code, -32602);
});

/* ====================================================================
   4 · A2A GOREV DONGUSU
   ==================================================================== */
test('A2A adresCikar: DataPart url oncelikli, metin ikinci', async () => {
  assert.equal(a2a.adresCikar({ parts: [{ kind: 'data', data: { url: 'https://a.example' } },
    { kind: 'text', text: 'https://b.example' }] }), 'https://a.example');
  assert.equal(a2a.adresCikar({ parts: [{ kind: 'text', text: 'sunu olc: https://c.example/x adresini' }] }),
    'https://c.example/x');
  assert.equal(a2a.adresCikar({ parts: [{ kind: 'text', text: 'ornek.com.tr sitesine bak' }] }), 'ornek.com.tr');
  assert.equal(a2a.adresCikar({ parts: [{ kind: 'text', text: 'merhaba nasilsin' }] }), '');
});

test('A2A message/send: tamamlanmis Task + metin ve veri eseri', async () => {
  const depo = sahteDepo();
  const h = a2a.handlerOlustur(depo);
  const geri = olcSahtele({ kod: 200, govde: SONUC });
  let gorevId = '';
  try {
    const y = await h(olay({ jsonrpc: '2.0', id: 1, method: 'message/send',
      params: { message: { kind: 'message', role: 'user', messageId: 'm1',
        parts: [{ kind: 'data', data: { url: 'https://example.com' } }] } } }));
    assert.equal(y.statusCode, 200);
    const t = JSON.parse(y.body).result;
    assert.equal(t.kind, 'task');
    assert.equal(t.status.state, 'completed');
    assert.equal(t.artifacts.length, 1);
    const tipler = t.artifacts[0].parts.map(p => p.kind);
    assert.deepEqual(tipler, ['text', 'data']);
    assert.equal(t.artifacts[0].parts[1].data.score, 72);
    assert.equal(t.history.length, 1, 'gonderilen mesaj gecmiste olmali');
    gorevId = t.id;
  } finally { geri(); }

  /* tasks/get AYNI gorevi geri vermeli — depoya gercekten yazilmis mi */
  const y2 = await h(olay({ jsonrpc: '2.0', id: 2, method: 'tasks/get', params: { id: gorevId } }));
  assert.equal(JSON.parse(y2.body).result.id, gorevId);
});

test('A2A message/send: olculemeyen site -> state failed, eser yok', async () => {
  const h = a2a.handlerOlustur(sahteDepo());
  const geri = olcSahtele({ kod: 200, govde: { ok: false, reason: 'timeout' } });
  try {
    const y = await h(olay({ jsonrpc: '2.0', id: 1, method: 'message/send',
      params: { message: { parts: [{ kind: 'text', text: 'https://example.com' }] } } }));
    const t = JSON.parse(y.body).result;
    assert.equal(t.status.state, 'failed');
    assert.deepEqual(t.artifacts, []);
    assert.match(t.status.message.parts[0].text, /zamanında yanıt vermedi/);
  } finally { geri(); }
});

test('A2A message/send: adres yoksa -32602', async () => {
  const h = a2a.handlerOlustur(sahteDepo());
  const y = await h(olay({ jsonrpc: '2.0', id: 1, method: 'message/send',
    params: { message: { parts: [{ kind: 'text', text: 'merhaba' }] } } }));
  assert.equal(JSON.parse(y.body).error.code, -32602);
});

test('A2A tasks/get: bilinmeyen gorev -> -32001', async () => {
  const h = a2a.handlerOlustur(sahteDepo());
  const y = await h(olay({ jsonrpc: '2.0', id: 1, method: 'tasks/get', params: { id: 'yok' } }));
  assert.equal(JSON.parse(y.body).error.code, -32001);
});

test('A2A tasks/get: suresi dolmus gorev OLU sayilir', async () => {
  const depo = sahteDepo();
  await depo.yaz('gorev-eski', { t: Date.now() - a2a.GOREV_OMRU_MS - 1000, gorev: { id: 'eski' } });
  const h = a2a.handlerOlustur(depo);
  const y = await h(olay({ jsonrpc: '2.0', id: 1, method: 'tasks/get', params: { id: 'eski' } }));
  assert.equal(JSON.parse(y.body).error.code, -32001);
});

test('A2A tasks/cancel: eszamanli is iptal edilemez -> -32002', async () => {
  const h = a2a.handlerOlustur(sahteDepo());
  const y = await h(olay({ jsonrpc: '2.0', id: 1, method: 'tasks/cancel', params: { id: 'x' } }));
  assert.equal(JSON.parse(y.body).error.code, -32002);
});

test('A2A GET: 405 ve ajan kartina yonlendirir', async () => {
  const h = a2a.handlerOlustur(sahteDepo());
  const y = await h({ httpMethod: 'GET', headers: {} });
  assert.equal(y.statusCode, 405);
  assert.match(JSON.parse(y.body).error.message, /agent-card\.json/);
});

/* ====================================================================
   5 · ORTAK KABUK
   ==================================================================== */
test('Origin: yoksa gecer, http(s) ise gecer, bozuksa reddedilir', async () => {
  assert.equal(U.originGecerli({ headers: {} }), true);
  assert.equal(U.originGecerli({ headers: { origin: 'https://baska.example' } }), true);
  assert.equal(U.originGecerli({ headers: { origin: 'null' } }), true);
  assert.equal(U.originGecerli({ headers: { origin: 'javascript:alert(1)' } }), false);
  assert.equal(U.originGecerli({ headers: { origin: 'bu adres degil' } }), false);
  const y = await mcp.handler(olay({ jsonrpc: '2.0', id: 1, method: 'ping' },
    { origin: 'javascript:alert(1)' }));
  assert.equal(y.statusCode, 403);
});

test('OPTIONS: iki uc da CORS on kontrolu gecirir', async () => {
  for (const h of [mcp.handler, a2a.handlerOlustur(sahteDepo())]) {
    const y = await h({ httpMethod: 'OPTIONS', headers: {} });
    assert.equal(y.statusCode, 204);
    assert.equal(y.headers['access-control-allow-origin'], '*');
  }
});
