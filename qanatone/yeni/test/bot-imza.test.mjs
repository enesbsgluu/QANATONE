/* yeni/test/bot-imza.test.mjs — WEB BOT AUTH · imza yolunun kanıtı.
   ---------------------------------------------------------------------
   BU DOSYA BİR KAPIYA BAĞLI: `yeni/denetim.cjs` T1 kuralı bu klasördeki
   her `*.test.mjs`i `node --test` ile koşar, denetim de yayın zincirinde.
   "Elle koşulan komut kapı değildir" (Enes, 4 Eyl) — yeni bir doğrulama
   aracı yazınca sorulacak tek soru "bunu hangi kapı çağırıyor?" idi;
   cevabı burada yazılı.

   NE ÖLÇÜYOR — ÜÇ AYRI ŞEY, ÜÇÜ DE DAVRANIŞ:

   1) ANAHTAR YOKKEN HİÇBİR İDDİA YOK. Dizin ucu 404 döner, istekler
      imzasız gider. Karar kaydının kuralı ("arkasında çalışan bir şey
      olmayan hiçbir keşif dosyası yayınlanmaz") burada koda dönüşüyor:
      niyet değil, ölçülen davranış.

   2) İMZA GERÇEKTEN İSTEĞE BİNİYOR. Kaynakta `imzala(` geçtiğini görmek
      yetmez — bu depoda "kaynak taraması hesaplanan değeri göremez"
      dersi ödendi. Burada `diagnose.grab()` GERÇEKTEN çağrılıyor,
      `fetch` sahteleniyor ve giden başlıklar yakalanıyor.

   3) İMZA DOĞRULANIYOR — DOĞRULAYICI ROLÜNDEN. Test, imzalayıcının
      taban kurucusunu ÇAĞIRMAZ. `Signature-Input`u uzaktaki bir sunucu
      gibi ayrıştırır, tabanı kendi kurar ve dizinden okuduğu açık
      anahtarla doğrular. İmzalayıcının kendi fonksiyonuyla doğrulamak
      "kendi kendine yeşil" olurdu: bozuk bir taban da kendi kendisiyle
      tutarlı olurdu ve dünyada hiç kimse bizi doğrulayamazdı.
      KIRMIZI-ÖNCE KOLU: aynı imza YANLIŞ konakla doğrulanMAMAlı —
      yoksa test hiçbir şeyi kanıtlamamış olur.
   --------------------------------------------------------------------- */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const IM = require.resolve('../../netlify/functions/imza-dizini.js');
const DG = require.resolve('../../netlify/functions/diagnose.js');

/* Modüller anahtarı BİR KEZ çözüp önbelleğe alıyor (Lambda kabı istekler
   arasında yaşıyor, her istekte yeniden ayrıştırmanın anlamı yok). Bu
   yüzden iki senaryo iki ayrı modül örneği ister — önbellek elle
   düşürülüyor. Ortam değişkeni de AÇIKÇA yönetiliyor: Netlify'da
   WEB_BOT_AUTH_TOHUM DOLU olacak, yerelde boş; test ikisinde de aynı
   hükmü vermeli, yoksa "yerelde yeşil, CI kırmızı" sınıfına düşer. */
function tazeYukle(tohum) {
  delete require.cache[IM];
  delete require.cache[DG];
  if (tohum) process.env.WEB_BOT_AUTH_TOHUM = tohum;
  else delete process.env.WEB_BOT_AUTH_TOHUM;
  return { M: require(IM), D: require(DG) };
}

const ONCEKI_TOHUM = process.env.WEB_BOT_AUTH_TOHUM;
const TOHUM = crypto.randomBytes(32).toString('base64url');   /* geçici; hiçbir yere yazılmaz */

/* `grab()`i ağa çıkmadan koşturur ve giden başlıkları verir.
   METOT 'HEAD': grab yönlendirme döngüsünden sonra gövdeye hiç girmeden
   döner, yani sahte yanıtın gövde akışını taklit etmesi gerekmez. */
async function istekBasliklari(D, adres) {
  const oncekiFetch = globalThis.fetch;
  let yakalanan = null;
  globalThis.fetch = async (u, o) => {
    yakalanan = { url: String(u), basliklar: (o && o.headers) || {} };
    return { status: 200, headers: new Map(), body: null };
  };
  try { await D.grab(adres, 'HEAD', D.butceAc()); }
  finally { globalThis.fetch = oncekiFetch; }
  return yakalanan;
}

test('anahtar yokken: dizin 404, istek imzasiz', async () => {
  const { M, D } = tazeYukle(null);

  assert.deepEqual(M.imzala('https://ornek.test/'), {},
    'anahtar yokken imzala() bos donmeli');

  const y = await M.handler({});
  assert.equal(y.statusCode, 404,
    'anahtar yokken dizin YAYINLANMAZ — bos JWKS puan yukseltir ama yalandir');

  const g = await istekBasliklari(D, 'https://ornek.test/yol/');
  assert.ok(g, 'grab fetch cagirmadi');
  assert.equal(g.basliklar['user-agent'], 'QanatoneSiteCheck/1.0 (+https://qanatone.com)',
    'imzasiz halde bile durust kimlik gitmeli');
  for (const b of ['signature', 'signature-input', 'signature-agent'])
    assert.equal(g.basliklar[b], undefined, 'anahtar yokken ' + b + ' gonderilmemeli');
});

test('dizin: RFC 7638 parmak izi ve tur, imzalayiciyla ayni anahtar', async () => {
  const { M } = tazeYukle(TOHUM);
  const y = await M.handler({});

  assert.equal(y.statusCode, 200);
  assert.equal(y.headers['content-type'], 'application/http-message-signatures-directory+json',
    'taslak bu turu ZORUNLU tutuyor; application/json gonderen dizin atlanir');

  const dizin = JSON.parse(y.body);
  assert.equal(dizin.keys.length, 1);
  const jwk = dizin.keys[0];
  assert.equal(jwk.kty, 'OKP');
  assert.equal(jwk.crv, 'Ed25519');

  /* Parmak izi BAGIMSIZ hesaplaniyor — modulun parmakIzi()'ini
     cagirmiyoruz. RFC 7638: OKP icin kanonik alanlar crv, kty, x. */
  const kanonik = JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x });
  const beklenen = crypto.createHash('sha256').update(kanonik).digest('base64url');
  assert.equal(jwk.kid, beklenen, 'kid anahtarin KENDISINDEN turemeli');
});

test('imza istege biniyor ve DOGRULAYICI GIBI dogrulaniyor', async () => {
  const { M, D } = tazeYukle(TOHUM);
  const dizin = JSON.parse((await M.handler({})).body);
  const jwk = dizin.keys[0];

  const HEDEF = 'https://ornek-site.test/bir/yol/';
  const g = await istekBasliklari(D, HEDEF);
  assert.ok(g, 'grab fetch cagirmadi');

  const h = g.basliklar;
  assert.ok(h['signature-agent'], 'signature-agent yok');
  assert.ok(h['signature-input'], 'signature-input yok');
  assert.ok(h['signature'], 'signature yok');

  /* --- buradan asagisi UZAKTAKI SUNUCUNUN yaptigi is --- */

  const par = h['signature-input'].replace(/^sig1=/, '');
  assert.match(par, /;keyid="([^"]+)"/);
  assert.equal(par.match(/;keyid="([^"]+)"/)[1], jwk.kid,
    'imzadaki keyid dizindeki kid degil — dogrulayici anahtari bulamaz');
  assert.match(par, /;alg="ed25519"/);
  assert.match(par, /;tag="web-bot-auth"/);
  assert.match(par, /;nonce="[A-Za-z0-9_-]+"/);
  const created = Number(par.match(/;created=(\d+)/)[1]);
  const expires = Number(par.match(/;expires=(\d+)/)[1]);
  assert.ok(expires > created, 'expires created`dan buyuk olmali');
  assert.ok(expires - created <= 900, 'imza omru dar olmali (tekrar saldirisi penceresi)');

  /* Tabani ISTEKTEN yeniden kur (RFC 9421 §2.5). Bilesen listesi de
     imzanin kendi parametrelerinden okunuyor — modulden degil. */
  const bilesenler = par.match(/^\(([^)]*)\)/)[1].split(' ').map((s) => s.replace(/"/g, ''));
  assert.deepEqual(bilesenler, ['@authority', 'signature-agent']);
  const otorite = new URL(g.url).host.toLowerCase();
  const taban = bilesenler
    .map((b) => (b === '@authority' ? '"@authority": ' + otorite : '"' + b + '": ' + h[b]))
    .join('\n') + '\n"@signature-params": ' + par;

  const imzaB64 = h['signature'].match(/^sig1=:(.+):$/)[1];
  const acik = crypto.createPublicKey({ key: { kty: jwk.kty, crv: jwk.crv, x: jwk.x }, format: 'jwk' });
  assert.ok(crypto.verify(null, Buffer.from(taban, 'utf8'), acik, Buffer.from(imzaB64, 'base64')),
    'IMZA DOGRULANMADI — bu haliyle hicbir site bizi taniyamaz');

  /* KIRMIZI-ONCE: ayni imza BASKA bir konakta gecmemeli. Gecerse taban
     @authority'yi gercekten tasimiyor demektir ve yukaridaki yesil
     hicbir sey kanitlamiyordur. */
  const bozuk = taban.replace('"@authority": ' + otorite, '"@authority": baska-konak.test');
  assert.notEqual(bozuk, taban, 'kirmizi-once kolu kurulamadi: tabanda @authority satiri yok');
  assert.equal(crypto.verify(null, Buffer.from(bozuk, 'utf8'), acik, Buffer.from(imzaB64, 'base64')),
    false, 'imza konaga bagli degil — baska konakta da gecti');

  /* signature-agent dizinin BULUNDUGU adresi gostermeli; yoksa
     dogrulayici anahtari aramaya nereye gidecegini bilemez. */
  assert.equal(h['signature-agent'], '"' + M.KOK_ADRES + '"');
});

test('her hop kendi imzasini alir (@authority hop`ta degisir)', async () => {
  const { D } = tazeYukle(TOHUM);
  const a = await istekBasliklari(D, 'https://bir.test/');
  const b = await istekBasliklari(D, 'https://iki.test/');
  assert.notEqual(a.basliklar['signature'], b.basliklar['signature'],
    'iki farkli konaga ayni imza gitti — yonlendirmede ikinci hop dogrulanamaz');
});

process.on('exit', () => {
  if (ONCEKI_TOHUM === undefined) delete process.env.WEB_BOT_AUTH_TOHUM;
  else process.env.WEB_BOT_AUTH_TOHUM = ONCEKI_TOHUM;
});
