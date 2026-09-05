/* netlify/functions/imza-dizini.js
   ---------------------------------------------------------------------
   WEB BOT AUTH — tarayıcımızın kimliği, tahminle değil imzayla.

   NE YAPAR: `QanatoneSiteCheck/1.0` bir siteyi tararken artık yalnız bir
   User-Agent dizesi göndermiyor; her isteğe RFC 9421 (HTTP Message
   Signatures) imzası ekliyor ve imzayı doğrulayacak açık anahtarı
   `/.well-known/http-message-signatures-directory` adresinde yayınlıyor.
   Taranan site "bu istek gerçekten QANATONE'dan mı geliyor" sorusunu
   UA tahminine bakmadan, kriptografiyle cevaplayabiliyor.

   NEDEN — ÖLÇÜLMÜŞ BİR SORUN. 30 sitelik süpürmede 7 adres 403 döndü
   (%23); r10.net'in Cloudflare kapısı bize 44 puan yazdırdı ve o puan
   sitenin değil DUVARIN puanıydı. UA taklidi bu depoda KAPALI bir yol
   (aşağıdaki KIRMIZI ÇİZGİ maddesi, diagnose.js:226) ve zaten ölçüldü:
   Chrome UA'sıyla da aynı 403 geliyor. Geriye tek dürüst yol kalıyor —
   görünmez olmak değil, TANINABİLİR olmak.

   NE VAAT ETMİYOR — BU ÖNEMLİ. İmza bir duvarı AÇMAZ. Cloudflare'in
   doğrulanmış bot listesine girmek ya da site sahibinin bizi açıkça
   izinli sayması ayrı işlerdir. İmzanın yaptığı tek şey: site sahibine
   izin verme İMKÂNI bırakmak. "İmza koyduk, 403'ler bitecek" cümlesi
   ölçülmemiş bir rakamdır ve yazılmaz. Yayından sonra 403 oranı yeniden
   ölçülür; değişmezse de bu kurulum yanlış değildir, çünkü verdiği şey
   erişim değil kimliktir.

   ---------------------------------------------------------------------
   NEDEN BU DOSYA HEM UÇ HEM MODÜL — MİMARİNİN KALBİ

   Bu dosya iki iş yapıyor: (1) diagnose.js'in çağırdığı İMZALAYICI,
   (2) açık anahtarı yayınlayan DİZİN UCU. Ayrılmadılar çünkü ayrılsalardı
   bu depoda dört kez yaşanmış hata beşinci kez olurdu: üretici ile
   tüketici ayrışır ve kimse fark etmez (`kota`/`quota` sözlüğü, tespit
   `AD` sözlüğü, `_headers` Link bloğu, `kur-medya` uzak yolu).

   Somut hâli: özel anahtar ortam değişkeninde, açık anahtar depoda
   dursaydı ikisi sessizce ayrışabilirdi — yayınladığımız açık anahtar
   imzaladığımız anahtarın karşılığı olmazdı, HER doğrulayıcı bizi
   reddederdi ve hiçbir ölçüm bunu göstermezdi (imza atılıyor, dizin
   iniyor, ikisi de "çalışıyor"). Burada o sapma YAPI GEREĞİ imkânsız:
   açık anahtar özel anahtardan TÜRETİLİYOR, ikisi tek kaynak.
   `panel.js`in `yayinla.js`ten `dogrula()` alması aynı desendir.

   ANAHTAR YOKSA HİÇBİR ŞEY YOK — KARAR KAYDININ MEKANİK HÂLİ.
   `yeni/ajan-hatti.mjs` başındaki karar: "arkasında ÇALIŞAN BİR ŞEY
   olmayan hiçbir keşif dosyası yayınlanmaz." Burada o kural bir niyet
   değil, kod:
     WEB_BOT_AUTH_TOHUM tanımsız → dizin ucu 404 · istek imzasız gider
     tanımlı ama bozuk        → aynı davranış + tek satır log
   Boş bir JWKS yayınlamak (`{"keys":[]}`) o araçların puanını yükseltir
   ve YALANDIR: arkasında imzalayan bir şey yoktur. 404 doğru cevaptır.

   NEDEN DİZİN KENDİ İMZASINI TAŞIMIYOR — bilinçli eksik. Taslak
   (draft-meunier-http-message-signatures-directory) dizin yanıtının da
   imzalanabileceğini söylüyor. Yapılmadı, iki sebeple: (a) güvenlik
   katkısı yok — dizinin kime ait olduğunu TLS zaten bağlıyor, çünkü
   adresini `Signature-Agent` veriyor ve o adrese HTTPS ile gidiliyor;
   kendi anahtarıyla kendini imzalayan bir dosya, sahibi hakkında TLS'in
   söylediğinden fazlasını söylemez. (b) taslak bu profilde oynak ve
   buradan gerçek bir doğrulayıcıya karşı sınayamıyoruz — sınanmamış
   kriptografi yazmak, hiç yazmamaktan kötüdür.

   ---------------------------------------------------------------------
   ÇALIŞMASI İÇİN GEREKEN TEK ŞEY
     WEB_BOT_AUTH_TOHUM   32 baytlık Ed25519 tohumu, base64url (43 karakter)
                          Üreteci: `node netlify/bot-anahtar.js`
                          Netlify > Site configuration > Environment variables
   Sır ortam değişkeninde yaşar: koda, log'a, commit'e girmez (CLAUDE.md).
   Bu dosya tohumu HİÇBİR yere yazmaz; log'a yalnız açık anahtarın
   parmak izi (`kid`) düşer — o zaten dizinde yayınlanıyor.

   BEKÇİ: `yeni/denetim.cjs` → T4. Yayın zincirinde koşar, ağa çıkmaz:
   geçici bir anahtarla imza attırır, `Signature-Input`u AYRIŞTIRIP
   tabanı DOĞRULAYICI GİBİ yeniden kurar ve dizinden okuduğu açık
   anahtarla imzayı doğrular. "Elle koşulan komut kapı değildir"
   (Enes, 4 Eyl) — bu yüzden zincirde.
   --------------------------------------------------------------------- */

'use strict';

const crypto = require('crypto');

/* KÖK ADRES — `Signature-Agent` bu değeri taşır ve dizin BU adreste
   yayınlanır. İkisi aynı olmak zorunda: doğrulayıcı imzadaki adrese
   gidip dizini orada arar, bulamazsa imza doğrulanamaz ve imzasız
   istekten DAHA KÖTÜ olur (karşılığı olmayan bir iddia).
   Değer astro.config.mjs'teki `site` ile birebir aynı olmalı; T4 iki
   tarafı da okuyup karşılaştırıyor — burada elle yazılmış bir sabitin
   sessizce eskimesi bu depoda yaşanmış bir hata sınıfıdır.
   NEDEN process.env.URL DEĞİL: Netlify o değeri önizleme dağıtımlarında
   önizleme adresine çevirir; her önizleme kendine yeni bir bot kimliği
   uydurur ve doğrulayıcıların önbelleği çöplenir. Kimlik dağıtıma değil
   KURUMA aittir. */
const KOK_ADRES = 'https://www.qanatone.com';

/* Web Bot Auth profili — taslakta sabit. `tag` doğrulayıcının imzayı
   hangi amaçla değerlendireceğini söyler; bir bot imzası yanlışlıkla
   başka bir bağlamda (ör. yanıt imzası) geçerli sayılamasın diye var. */
const ETIKET = 'web-bot-auth';
const BILESENLER = ['@authority', 'signature-agent'];

/* İMZA ÖMRÜ. Kısa olmalı — imza kopyalanıp başka bir isteğe yapıştırılsa
   bile penceresi dar kalsın. 300 sn, bizim kendi bütçemizin (9 sn'lik
   TOPLAM_SURE_MS) çok üstünde, yani meşru bir koşumu asla kesmez; saat
   sapması olan bir doğrulayıcıya da pay bırakır. */
const OMUR_SN = 300;

/* PKCS#8 sarmalının Ed25519 için değişmeyen 16 baytlık başlığı. Ham
   32 baytlık tohum bunun arkasına eklenince Node'un okuyabildiği bir
   özel anahtar olur. Tohumu ortam değişkeninde tutmanın sebebi biçim:
   PEM çok satırlı, base64url tek satır — ortam değişkeni tek satır ister. */
const PKCS8_ONEK = Buffer.from('302e020100300506032b657004220420', 'hex');

/* ---------- RFC 9421 · imza tabanı ----------
   Taban, imzalanan metnin ta kendisidir; doğrulayıcı onu KENDİ elindeki
   istekten yeniden kurar. Tek karakterlik fark imzayı geçersiz kılar,
   bu yüzden burada "yaklaşık doğru" diye bir şey yok. */

/* @authority — hedef adresin otoritesi, küçük harf, varsayılan port
   düşer (RFC 9421 §2.2.3). IPv6 köşeli parantezleri KALIR, çünkü
   otoritenin kendisi öyle yazılır. */
function otorite(adres) {
  const u = new URL(adres);
  /* WHATWG URL zaten varsayılan portu siler (443/80); bu kontrol o
     davranışa güvenmemek için — biçim kuralı burada YAZILI olsun. */
  const port = u.port && !((u.protocol === 'https:' && u.port === '443')
                        || (u.protocol === 'http:' && u.port === '80')) ? ':' + u.port : '';
  return (u.hostname + port).toLowerCase();
}

/* Parametre satırı ve taban AYNI yerde üretilir: ikisi birbirinin
   kopyasını taşır (bileşen listesi), ayrı fonksiyonlara bölünürse
   sessizce ayrışabilirler — imza da o gün ölür. */
function tabanKur(hedef, ajan, parametreler) {
  const satir = [];
  for (const b of BILESENLER) {
    if (b === '@authority') satir.push('"@authority": ' + otorite(hedef));
    else if (b === 'signature-agent') satir.push('"signature-agent": "' + ajan + '"');
    else throw new Error('imza tabaninda bilinmeyen bilesen: ' + b);
  }
  satir.push('"@signature-params": ' + parametreler);
  return satir.join('\n');
}

function parametreSatiri(kid, created, expires, nonce) {
  return '(' + BILESENLER.map((b) => '"' + b + '"').join(' ') + ')'
    + ';created=' + created
    + ';expires=' + expires
    + ';keyid="' + kid + '"'
    + ';alg="ed25519"'
    + ';nonce="' + nonce + '"'
    + ';tag="' + ETIKET + '"';
}

/* RFC 7638 · JWK parmak izi. Anahtarın ADI, anahtarın KENDİSİNDEN türer:
   `kid` uydurulmuş bir etiket olsaydı dizindeki kayıt ile imzadaki
   `keyid` ayrışabilirdi. Alan sırası şart (crv, kty, x) ve OKP için
   RFC'de sabittir — JSON.stringify'ın nesne sırasını koruması buna
   dayanıyor, bu yüzden nesne ELDE yazılıyor, kopyalanmıyor. */
function parmakIzi(jwk) {
  const kanonik = JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x });
  return crypto.createHash('sha256').update(kanonik).digest('base64url');
}

/* ---------- imzalayıcı ----------
   FABRİKA, çünkü bekçi (T4) üretim anahtarını göremez: geçici bir
   anahtar enjekte edip gerçek yolu ölçebilmeli. diagnose.js'in
   `handlerOlustur(blobsDepo())` deseni aynı sebeple böyle. */
function imzalayiciOlustur(tohumMetni, kokAdres) {
  const tohum = Buffer.from(String(tohumMetni || '').trim(), 'base64url');
  if (tohum.length !== 32) throw new Error('tohum 32 bayt olmali, gelen: ' + tohum.length);

  const ozel = crypto.createPrivateKey({
    key: Buffer.concat([PKCS8_ONEK, tohum]), format: 'der', type: 'pkcs8',
  });
  const acikJwk = crypto.createPublicKey(ozel).export({ format: 'jwk' });
  const kid = parmakIzi(acikJwk);
  const ajan = kokAdres || KOK_ADRES;

  return {
    kid,
    ajan,

    /* Dizin gövdesi — JWKS. `nbf`/`exp` YAZILMIYOR: anahtarın ne zaman
       döneceği ölçülmüş bir şey değil, uydurulmuş bir tarih yazmak bu
       deponun kuralına girer. Anahtar döndürüldüğünde eski ve yeni
       ANAHTAR BİR SÜRE BİRLİKTE yayınlanır (dizi zaten çoğul); o gün
       gerçek tarihler biliniyor olacak. */
    dizin() {
      return { keys: [{ kty: acikJwk.kty, crv: acikJwk.crv, x: acikJwk.x, kid }] };
    },

    /* HER HOP AYRI İMZALANIR — `@authority` hedefe bağlı ve grab()
       yönlendirmeleri elle takip ediyor. Tek imzayı bütün zincire
       yaymak, ikinci hop'ta doğrulanamayan bir imza göndermek olurdu. */
    basliklar(hedef) {
      const created = Math.floor(Date.now() / 1000);
      const expires = created + OMUR_SN;
      const nonce = crypto.randomBytes(16).toString('base64url');
      const par = parametreSatiri(kid, created, expires, nonce);
      const imza = crypto.sign(null, Buffer.from(tabanKur(hedef, ajan, par), 'utf8'), ozel);
      return {
        'signature-agent': '"' + ajan + '"',
        'signature-input': 'sig1=' + par,
        'signature': 'sig1=:' + imza.toString('base64') + ':',
      };
    },
  };
}

/* ---------- varsayılan örnek ----------
   Tembel ve tek sefer: Lambda kabı isteklerin arasında yaşıyor, anahtarı
   her istekte yeniden ayrıştırmanın anlamı yok. Bozuk anahtar TEK SATIR
   log düşürür ve yokmuş gibi davranır — bu depoda dört ayrı özelliğin
   sessizce ölü olduğu bulundu, beşincisi olmasın. */
let _cozuldu = false;
let _imzalayici = null;
function varsayilan() {
  if (_cozuldu) return _imzalayici;
  _cozuldu = true;
  const tohum = process.env.WEB_BOT_AUTH_TOHUM;
  if (!tohum) {
    console.log(new Date().toISOString(),
      'web-bot-auth: WEB_BOT_AUTH_TOHUM yok — istekler IMZASIZ gidiyor, dizin 404.');
    return null;
  }
  try {
    _imzalayici = imzalayiciOlustur(tohum);
    console.log(new Date().toISOString(), 'web-bot-auth: anahtar yuklendi · kid', _imzalayici.kid);
  } catch (e) {
    /* Hatanın METNİ loglanır, anahtarın kendisi ASLA. */
    console.log(new Date().toISOString(), 'web-bot-auth: anahtar OKUNAMADI (' + e.message
      + ') — istekler imzasiz gidiyor, dizin 404.');
    _imzalayici = null;
  }
  return _imzalayici;
}

/* diagnose.js'in çağırdığı yüz. Anahtar yoksa BOŞ nesne döner ve
   `Object.assign` hiçbir şey eklemez — çağıran tarafta dal yok, yani
   imzasız yol ayrı bir kod yolu değil, aynı yolun kimliksiz hâli. */
function imzala(hedef) {
  const im = varsayilan();
  if (!im) return {};
  try { return im.basliklar(hedef); }
  catch (e) {
    console.log(new Date().toISOString(), 'web-bot-auth: imza atilamadi ·', e.message);
    return {};
  }
}

/* ---------- dizin ucu ----------
   Adres: /.well-known/http-message-signatures-directory  (_redirects · 6)
   Content-Type taslakta ZORUNLU ve özeldir; `application/json` gönderen
   bir dizin doğrulayıcı tarafından atlanır. Başlıklar `_headers`a değil
   BURAYA yazılı: fonksiyon yanıtında kazanan taraf fonksiyondur, iki
   yere yazmak yine iki kaynak demek olurdu. */
exports.handler = async () => {
  const im = varsayilan();
  const ortak = { 'x-robots-tag': 'noindex' };
  if (!im) {
    return {
      statusCode: 404,
      headers: Object.assign({}, ortak, { 'content-type': 'text/plain; charset=utf-8' }),
      body: 'web bot auth anahtari tanimli degil — imzalanan istek yok.\n',
    };
  }
  return {
    statusCode: 200,
    headers: Object.assign({}, ortak, {
      'content-type': 'application/http-message-signatures-directory+json',
      /* 1 saat: doğrulayıcıya ucuz, anahtar döndürüldüğünde de dünyanın
         bizi tanıması bir saatten uzun sürmez. Bir gün yazmak rotasyonu
         bir güne kilitlerdi. */
      'cache-control': 'public, max-age=3600',
    }),
    body: JSON.stringify(im.dizin()),
  };
};

exports.imzala = imzala;
exports.imzalayiciOlustur = imzalayiciOlustur;   /* T4: geçici anahtarla gerçek yolu ölçmek için */
exports.otorite = otorite;
exports.parmakIzi = parmakIzi;
exports.KOK_ADRES = KOK_ADRES;
exports.ETIKET = ETIKET;
exports.BILESENLER = BILESENLER;
exports.OMUR_SN = OMUR_SN;
