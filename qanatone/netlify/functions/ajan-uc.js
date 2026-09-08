/* netlify/functions/ajan-uc.js
   ---------------------------------------------------------------------
   MCP ve A2A sunucularinin ORTAK CEKIRDEGI (9 Eyl 2026).

   NEDEN AYRI DOSYA: iki protokol de AYNI iSi yapiyor — `diagnose`
   olcumunu disariya aciyor. Ikisine ayri ayri yazilsaydi bu deponun
   dort kez odedigi hata sinifi bes olurdu: uretici ile tuketici sessizce
   ayrisir (`kota`/`quota` sozlugu, tespit `AD` sozlugu, `_headers` Link
   blogu, panel/site anahtar ayrismasi). Arac tanimi TEK YERDE; mcp.js ve
   a2a.js yalnizca PROTOKOL ADAPTORU.

   KIRMIZI CIZGI — KOTA ATLANMAZ.
   `diagnose` kisi basi 2 analiz/24sa tutuyor ve anahtari YALNIZ Netlify'in
   kendi gordugu istemci IP'sinden turuyor. Buradaki cagri o handler'i
   DOGRUDAN cagirir ve CAGIRANIN BASLIKLARINI oldugu gibi tasir — yani
   MCP/A2A uzerinden gelen istek de ayni kotayi harcar. Alternatif (kendi
   olcum yolunu yazmak) kotanin etrafindan dolasan ikinci bir kapi acardi;
   bir "ajan hazirligi" ucunun ilk isi kendi urun kuralini delmek olamaz.

   AYRICA BEDAVA GELEN: `safeUrl` (SSRF kalkani), akis siniri, oran
   siniri, Web Bot Auth imzasi ve puanlama tablosu — hepsi diagnose'un
   icinde, tek satir kopyalanmadi.
   --------------------------------------------------------------------- */

const diagnose = require('./diagnose.js');
const { KOK_ADRES } = require('./imza-dizini.js');

/* ---------- ARAC TANIMI — TEK KAYNAK ----------
   `aciklama` alani `.well-known/agent-skills/site-tespit/SKILL.md`
   frontmatter'indaki `description` ile BIREBIR AYNI olmak zorunda.
   Kapi: yeni/denetim.cjs T7 (b). Iki metin ayrisirsa denetim kirmizi
   doner — "ajan sunucusu bir sey soyluyor, yetenek dosyasi baskasini"
   hali yayina cikamaz.                                                  */
const ARAC_ADI = 'site_tespit';
const ARAC_SURUM = '1.0.0';
const ARAC_ACIKLAMA =
  'Bir web sitesinin teknik sağlığını ve ajan hazırlığını gerçek isteklerle ölçer; kalem kalem durum ve puan döndürür.';

/* SINIRLAR da tek kaynak: SKILL.md'nin "Sınırlar — dürüstçe" bolumunun
   ozeti. Ajana ne olctugumuzu DEGIL, NE OLCMEDIGIMIZI de soyluyoruz;
   bir ajan bu araci "tum siteyi tarar" sanip yanlis rapor yazmasin. */
const ARAC_SINIR =
  'Ölçüm ana sayfa + robots.txt + sitemap.xml üzerinden yapılır, tüm siteyi taramaz. '
  + 'Kota IP başınadır (2 analiz / 24 saat), toplu tarama için uygun değildir. '
  + 'Puan bir sıralama iddiası değil, kalemlerin özetidir; karar için items[] okunmalıdır.';

const GIRDI_SEMASI = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      description: 'Ölçülecek sitenin adresi. Şema yoksa https:// varsayılır. Örn. https://example.com'
    }
  },
  required: ['url'],
  additionalProperties: false
};

/* CIKTI SEMASI — MCP `structuredContent` ve A2A DataPart ayni gövdeyi
   tasiyor. `items` acik birakildi (kalem kumesi diagnose'un W tablosuyla
   birlikte buyuyor; burada sabitlemek uçuncu bir kopya olurdu). */
const CIKTI_SEMASI = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', description: 'Ölçüm yapılabildi mi. false ise reason okunur.' },
    reason: { type: 'string', description: 'ok:false ise sebep — timeout | unreachable | blocked | adres | kota | oran' },
    host: { type: 'string' },
    finalUrl: { type: 'string', description: 'Yönlendirmelerden sonraki adres' },
    score: { type: 'number', description: '0-100 toplam puan' },
    ajan: {
      type: 'object',
      description: 'Ajan hazırlığı — AYRI EKSEN, score ile karışmaz ve ona eklenmez. '
        + 'olculdu:true ise skor (0-100) ve kendi items[] dizisi gelir; '
        + 'olculdu:false ise sebep gelir (ölçüm bütçesi dolmuş olabilir).',
      properties: {
        olculdu: { type: 'boolean' },
        skor: { type: 'number' },
        sebep: { type: 'string' },
        items: { type: 'array', items: { type: 'object' } }
      },
      required: ['olculdu']
    },
    status: { type: 'number' },
    bytes: { type: 'number' },
    redirects: { type: 'number' },
    cdn: { type: 'string' },
    durum: { type: 'string' },
    kalan: { type: 'number', description: 'Bu istemci için kalan analiz hakkı' },
    items: {
      type: 'array',
      description: 'Ölçüm kalemleri: k anahtar, state ok/warn/fail, v ölçülen, o ölçüt',
      items: { type: 'object' }
    }
  },
  required: ['ok']
};

/* ---------- CAGRI ----------
   `event`: cagiran protokolun aldigi HAM Netlify olayi. Basliklar
   OLDUGU GIBI tasinir (kota kimligi orada). Govde yeniden yazilir —
   diagnose {url} bekler, MCP/A2A baska sey gonderir.                   */
async function olc(event, url) {
  const alt = {
    httpMethod: 'POST',
    headers: (event && event.headers) || {},
    body: JSON.stringify({ url: String(url == null ? '' : url) })
  };
  const y = await diagnose.handler(alt);
  let govde = {};
  try { govde = JSON.parse(y.body || '{}'); } catch (e) { govde = { ok: false, reason: 'unreachable' }; }
  return { kod: y.statusCode, govde };
}

/* ---------- INSAN OKUNUR OZET ----------
   MCP `content[0].text` ve A2A TextPart bunu tasiyor. Ajanlarin cogu
   once metni okur; sayilar orada YOKSA modelin structuredContent'i
   ayristirmasi gerekir ve pratikte ayristirmaz. Kirmizi kalemler
   ONCE yaziliyor: ozetin isi ovmek degil, sorunu gostermek.            */
function ozet(g) {
  if (!g || g.ok !== true) {
    const s = (g && g.reason) || 'unreachable';
    const ad = {
      timeout: 'site zamanında yanıt vermedi',
      unreachable: 'adrese ulaşılamadı',
      blocked: 'site otomatik isteği engelledi (bot duvarı)',
      adres: 'adres geçersiz ya da izinli değil',
      kota: 'analiz kotası doldu — 24 saat içinde yenilenir',
      oran: 'çok sık istek — birkaç saniye sonra tekrar deneyin'
    }[s] || s;
    return 'Ölçüm yapılamadı: ' + ad + ' (reason: ' + s + ').';
  }
  const it = Array.isArray(g.items) ? g.items : [];
  const kirmizi = it.filter((i) => i && i.state === 'fail').map((i) => i.k);
  const sari = it.filter((i) => i && i.state === 'warn').map((i) => i.k);
  const sat = [];
  /* IKINCI EKSEN BIR NESNEDIR, SAYI DEGIL — `{olculdu, skor, items, bilgi}`
     ya da `{olculdu:false, sebep}`. Ilk yazimda sayi sanildi ve canli
     olcumde ozete "[object Object]/100" dustu (9 Eyl, yerelde yakalandi).
     Birim testi bunu goremezdi: fikstur de yanlis sekildeydi — kapiyi
     acan sey gercek uca yapilan cagriydi. */
  const a = g.ajan;
  const ajanMetni = (a && a.olculdu) ? a.skor + '/100'
    : (a && a.sebep) ? 'ölçülemedi (' + a.sebep + ')' : '—';
  sat.push(g.host + ' — puan ' + g.score + '/100, ajan hazırlığı ' + ajanMetni + '.');
  if (a && a.olculdu && Array.isArray(a.items)) {
    const ak = a.items.filter((i) => i && i.state === 'fail').map((i) => i.k);
    if (ak.length) sat.push('Ajan ekseninde kırmızı (' + ak.length + '): ' + ak.join(', ') + '.');
  }
  sat.push('HTTP ' + g.status + ' · ' + g.bytes + ' bayt · ' + g.redirects + ' yönlendirme'
    + (g.cdn ? ' · CDN ' + g.cdn : '') + (g.durum ? ' · durum ' + g.durum : '') + '.');
  sat.push(kirmizi.length ? 'Kırmızı (' + kirmizi.length + '): ' + kirmizi.join(', ') + '.' : 'Kırmızı kalem yok.');
  if (sari.length) sat.push('Sarı (' + sari.length + '): ' + sari.join(', ') + '.');
  sat.push('Sınır: ' + ARAC_SINIR);
  if (g.kalan != null) sat.push('Kalan analiz hakkı: ' + g.kalan + '.');
  return sat.join('\n');
}

/* ---------- ORTAK HTTP KABUGU ----------
   CORS: `*`. Bu uc KIMLIKSIZ ve HALKA ACIK; ambient yetki (cerez, oturum,
   ic ag erisimi) TASIMIYOR. Origin kisitlamasi burada guvenlik
   uretmez — saldirgan zaten curl ile ayni istegi atabilir — ama tarayici
   icinde kosan gercek ajan istemcilerini keserdi.

   MCP'nin "Origin dogrula" MUST maddesi DNS yeniden baglama tehdidine
   karsidir ve o tehdit sunucunun BASKA TURLU ERISILEMEYEN bir adreste
   (localhost / ozel ag) olmasini gerektirir. Burasi kamuya acik bir
   Netlify fonksiyonu: tehdit modeli gecerli degil. Yine de bicimsel
   dogrulama yapiliyor (asagida `originGecerli`) — bozuk/kotu bicimli
   Origin reddedilir, cunku onu kabul etmek "dogruladik" demenin
   yalan hali olurdu.                                                    */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id',
  'access-control-expose-headers': 'mcp-protocol-version, mcp-session-id',
  'access-control-max-age': '86400'
};

const JSON_BASLIK = Object.assign({ 'content-type': 'application/json', 'cache-control': 'no-store' }, CORS);

function bas(event, ad) {
  const h = (event && event.headers) || {};
  return h[ad] || h[ad.toLowerCase()] || h[ad.toUpperCase()] || '';
}

/* Origin BICIMSEL dogrulamasi. Yok = tarayici disi istemci (normal hal).
   Var = mutlak http(s) adresi olmali; degilse reddedilir. */
function originGecerli(event) {
  const o = String(bas(event, 'origin') || '').trim();
  if (!o) return true;
  if (o === 'null') return true;             /* file:// ve sandbox iframe */
  try {
    const u = new URL(o);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) { return false; }
}

module.exports = {
  ARAC_ADI, ARAC_SURUM, ARAC_ACIKLAMA, ARAC_SINIR,
  GIRDI_SEMASI, CIKTI_SEMASI,
  olc, ozet, bas, originGecerli,
  CORS, JSON_BASLIK, KOK_ADRES
};
