/* netlify/functions/diagnose.js
   ---------------------------------------------------------------------
   Sitedeki "canlı kontrol" aracının sunucu tarafı.

   Ön yüzün beklediği cevap:
     { ok:true, host, finalUrl, score, ms, kb, items:[{k,state,v}] }
     { ok:false, reason:'timeout' | 'unreachable' | 'blocked' }

   Tarayıcı bu isteği doğrudan atamaz (CORS), o yüzden sunucudan yapılıyor.
   Başsız tarayıcı yok — HTML metin olarak alınıp inceleniyor. Bu, gerçek
   render süresini değil ilk yanıt + indirme süresini ölçer; abartmamak için
   ön yüzde "açılış" diye geçiyor, "Lighthouse skoru" demiyoruz.

   GÜVENLİK: burası herkese açık ve dışarıya istek atan bir uç nokta.
   İç ağa sızmayı (SSRF) engellemek için şema, port ve çözümlenen IP
   denetleniyor; yanıt boyutu ve süre sınırlı.
   --------------------------------------------------------------------- */

const dns = require('dns').promises;
const crypto = require('crypto');
/* WEB BOT AUTH — kimliğimizi imzayla kanıtlayan başlıklar. Anahtar
   tanımlı değilse boş nesne döner, yani imzasız yol ayrı bir dal değil.
   Gerekçenin tamamı imza-dizini.js'in başında. (panel.js'in yayinla.js'ten
   dogrula() alması ile aynı desen: fonksiyonlar birbirini ithal eder.) */
const { imzala } = require('./imza-dizini.js');

/* ---------- KOTA ----------
   Kişi başı 2 analiz / 24 saat. Kota bir ÜRÜN kuralıdır; oran sınırı ayrı
   bir şeydir (kötüye kullanım koruması) ve aşağıda ayrı ayrı duruyorlar.

   KİMLİK yalnız Netlify'ın kendi başlığından okunur. x-forwarded-for
   İSTEMCİ TARAFINDAN yazılabilir: okunsaydı saldırgan her istekte başka
   bir değer yazıp sınırı tamamen atlardı. Anahtar YALNIZ sunucunun
   gördüğü kimlikten türer — istek gövdesinden ya da taranan adresten
   hiçbir şey anahtara girmez.

   GİZLİLİK: ham IP saklanmaz, saklanan şey gizli tuzla alınmış özetidir.
   Tuz KOTA_TUZ ortam değişkeninden gelir ve bu ŞARTTIR: sabit ya da koda
   gömülü bir tuzla özet almak gizlilik sağlamaz — IPv4 uzayı dört milyar
   adres, tamamı kaba kuvvetle denenip özet geri çözülür. Gizli tuz
   olmadan bu adım IP günlüğü tutmakla aynı şey olurdu.
   Tuz tanımsızsa kota TUTULMAZ ve bu duruma log satırı düşer — bu depoda
   dört ayrı özelliğin sessizce ölü olduğu bulundu, beşincisi olmasın.
   Tuzun kendisi hiçbir yere loglanmaz.                                  */
const KOTA_HAK = 2;
const KOTA_PENCERE_MS = 24 * 60 * 60 * 1000;
const ORAN_PENCERE_MS = 10 * 1000;
const ORAN_SINIR = 5;

const simdi = () => new Date().toISOString();

/* SOYUT "KİM" ANAHTARI — bugün tuzlu IP özeti, yarın girişli kullanıcı
   kimliği. O gün değişecek tek şey bu fonksiyonun içidir; kotanın geri
   kalanı anahtarın nereden geldiğini bilmez. */
function kimAnahtari(kimlik, tuz) {
  return 'kim-' + crypto.createHmac('sha256', tuz).update(String(kimlik)).digest('hex').slice(0, 32);
}

function istemciKimligi(event) {
  const h = (event && event.headers) || {};
  const bul = ad => h[ad] || h[ad.toLowerCase()] || h[ad.toUpperCase()] || '';
  return String(bul('x-nf-client-connection-ip') || '').trim();
}

/* DEPO ADAPTÖRÜ — yayinla.js'in githubCommit deseninin aynısı: gerçek
   depo yalnız burada, test sahte adaptörle ağa çıkmadan koşar.
   SEÇİM: Netlify Blobs. Fonksiyonlar durumsuz; Blobs bu yığında zaten
   var olan, ek servis/parola gerektirmeyen tek kalıcı depo. TTL'i yok,
   o yüzden süresi dolan kayıt OKUNDUĞU AN siliniyor — kota tutar, günlük
   oluşmaz. Hiç geri dönmeyen bir anahtar depoda kalır ama içeriği ham IP
   değil, geri çözülemeyen bir özettir.                                  */
function blobsDepo() {
  /* 2026-08 CANLIDA ÖLÇÜLDÜ: her çağrıda MissingBlobsEnvironmentError.
     Sebep modül kapsamı değildi — getStore zaten istek anında çağrılıyordu
     (casusla doğrulandı: içe alımda 0, istekte 1). Sebep bu fonksiyonun
     LAMBDA UYUMLULUK KİPİNDE koşması: `exports.handler = (event) => …`
     imzasında Netlify ortamı KENDİLİĞİNDEN kurmuyor, paketin kendi
     belgesi bunu adıyla söylüyor. Ortam bilgisi event'in içinde geliyor
     ve connectLambda(event) ile kuruluyor.
     HER İSTEKTE çağrılır, modülde bir kez değil: bağlam event'e bağlı,
     önceki isteğin event'iyle kurulmuş bağlam sonrakinde eski olur. Bu
     yüzden store da önbelleğe ALINMIYOR.
     Bu yol hesap kapsamlı bir API jetonu istemez — elle siteID+token
     vermek halka açık bir uç nokta için kötü takas olurdu.            */
  /* GÜÇLÜ TUTARLILIK BİLEREK YOK. İlk yazımda `consistency:'strong'`
     vardı; connectLambda düzeldikten sonra canlıda ikinci hata çıktı:
     BlobsConsistencyError — "the environment has not been configured with
     a 'uncachedEdgeURL' property". Paketin kaynağı da bunu söylüyor: güçlü
     tutarlılık okuması ortamda uncachedEdgeURL ister, Lambda uyumluluk
     bağlamı onu VERMİYOR. Yani bu kipte seçilebilir bir şey değil.
     BEDELİ (kabul edildi): yazmadan hemen sonraki okuma bayat gelebilir,
     yani çok hızlı ardışık tıklamada kişi bir hak fazla kullanabilir.
     Kota bir ürün kuralı — kimlik doğrulama değil; kötüye kullanımı
     tutan şey oran sınırı ve akış sınırı, ikisi de bundan bağımsız.
     Bayat okuma yüzünden kotanın gevşemesi, deponun hiç çalışmamasından
     iyidir; bugünkü durum tam olarak oydu.                            */
  const al = (event) => {
    const b = require('@netlify/blobs');
    if (event && typeof b.connectLambda === 'function') b.connectLambda(event);
    return b.getStore({ name: 'kota' });
  };
  return {
    async oku(anahtar, event) { return (await al(event).get(anahtar, { type: 'json' })) || null; },
    async yaz(anahtar, deger, event) { await al(event).setJSON(anahtar, deger); },
    async sil(anahtar, event) { await al(event).delete(anahtar); }
  };
}

/* PROB — yalnız VARLIK bilgisi, değer ASLA. connectLambda tutmazsa bir
   sonraki çevrimde "Blobs sitede etkin mi" sorusunu ayırır. Yalnız depo
   hatası düştüğünde yazılıyor: yama tutarsa log sessiz kalır, tutmazsa
   sebep aynı satırda gelir. Event hiçbir loga girmez. */
function ortamProbu() {
  const v = ad => (process.env[ad] ? 'var' : 'yok');
  return 'prob: NETLIFY_BLOBS_CONTEXT=' + v('NETLIFY_BLOBS_CONTEXT') +
         ' SITE_ID=' + v('SITE_ID') +
         ' NETLIFY_SITE_ID=' + v('NETLIFY_SITE_ID');
}

/* Yakalanan hatanın okunabilir özeti.
   2026-08 BULUNDU: depo catch'i hatayı yutuyordu — logda yalnız "kota
   deposu okunamadi" satırı vardı, altındaki istisna yoktu. Yedi canlı
   çağrının hepsinde aynı satır düştü ve NEDEN olduğu ölçülemedi: teşhis
   aracının teşhis edilememesi. Yutulan istisna, bu depoda tekrar eden
   hata sınıfı (sessizce ölü özellik) ile aynı kökten.
   SIR SIZDIRMAZ: yalnız name/message/code/status alınır, mesaj kısaltılır
   ve jeton benzeri diziler <GIZLI> ile maskelenir — Blobs hataları imzalı
   adres ya da Authorization parçası taşıyabilir. Tuz hiçbir yolda buraya
   girmez, yine de maske son savunma olarak duruyor. */
function hataOzeti(e) {
  if (!e) return 'hata nesnesi yok';
  /* Tuzun kendisi de maskeleniyor: bu fonksiyonun elindeki TEK sır o.
     Kalıp tabanlı maske onu tanımaz (rastgele bir dizedir), o yüzden
     değerin kendisi aranıp değiştiriliyor — regex kaçışı derdi olmasın
     diye split/join ile. Test edilirken bulundu: uydurma bir hata mesajı
     tuzu taşıyınca loga aynen düşüyordu. */
  const tuz = process.env.KOTA_TUZ;
  const maskele = s0 => String(
    (tuz && String(tuz).length >= 8) ? String(s0).split(tuz).join('<GIZLI>') : s0)
    .replace(/(bearer\s+)[^\s'"]+/gi, '$1<GIZLI>')
    .replace(/((?:token|key|secret|sig|signature|password|auth)["'\s:=]+)[^\s,'"&]+/gi, '$1<GIZLI>')
    .replace(/eyJ[A-Za-z0-9._~+/=-]{10,}/g, '<GIZLI>')
    .replace(/[A-Za-z0-9_-]{40,}/g, '<GIZLI>');
  const parca = [];
  parca.push('name=' + maskele(e.name || 'Error').slice(0, 60));
  parca.push('message=' + maskele(e.message || '').slice(0, 240));
  if (e.code !== undefined) parca.push('code=' + maskele(e.code).slice(0, 60));
  if (e.status !== undefined || e.statusCode !== undefined)
    parca.push('status=' + maskele(e.status !== undefined ? e.status : e.statusCode).slice(0, 20));
  return parca.join(' · ');
}

/* Kota kapısı. Dönüş: {gecer, sebep, kalan, yenilenmeMs, isle}
   BAŞARISIZLIK YÖNÜ — BİLİNÇLİ KARAR: depo erişilemezse fonksiyon AÇIK
   düşer (kota sayılmaz, analiz çalışır). Gerekçe: bu bir kimlik doğrulama
   değil, kullanım kotası; bir depo arızası yüzünden lead mıknatısını
   kapatmak yanlış takas olur. Akış sınırı ve oran sınırı bağımsız
   çalıştığı için kötüye kullanım yine sınırlı kalır. Gözden kaçmış
   değil, kabul edilmiş bir risktir.                                     */
async function kotaKapisi(event, depo, tuz, simdiMs) {
  if (!tuz) {
    console.log(simdi(), 'diagnose: KOTA_TUZ tanimli degil — kota TUTULMUYOR, arac aciktan calisiyor');
    return { gecer: true, kalan: null, isle: async () => {} };
  }
  const kimlik = istemciKimligi(event);
  if (!kimlik) {
    console.log(simdi(), 'diagnose: istemci kimligi okunamadi — kota tutulmadi');
    return { gecer: true, kalan: null, isle: async () => {} };
  }
  const anahtar = kimAnahtari(kimlik, tuz);
  let kayit = null;
  try { kayit = await depo.oku(anahtar, event); }
  catch (e) {
    console.log(simdi(), 'diagnose: kota deposu OKUNAMADI — acik dusuldu ·', hataOzeti(e), '·', ortamProbu());
    return { gecer: true, kalan: null, isle: async () => {} };
  }

  if (kayit && simdiMs - (kayit.bas || 0) >= KOTA_PENCERE_MS) {
    try { await depo.sil(anahtar, event); }
    catch (e) { console.log(simdi(), 'diagnose: kota kaydi SILINEMEDI ·', hataOzeti(e), '·', ortamProbu()); }
    kayit = null;                                   /* penceresi dolan kayıt yaşamaz */
  }

  /* ORAN SINIRI — kotadan ayrı: kota ürün kuralı (2 hak/gün), bu kötüye
     kullanım koruması (saniyede yüz istek). Başarısız koşumlar da sayılır,
     çünkü korunan şey hak değil sunucu. */
  const hizliBas = kayit && kayit.hizliBas || 0;
  const hizliAdet = (kayit && kayit.hizliAdet) || 0;
  if (kayit && simdiMs - hizliBas < ORAN_PENCERE_MS && hizliAdet >= ORAN_SINIR) {
    return { gecer: false, sebep: 'oran', kalan: 0, yenilenmeMs: hizliBas + ORAN_PENCERE_MS, isle: async () => {} };
  }

  const adet = (kayit && kayit.adet) || 0;
  const bas = (kayit && kayit.bas) || simdiMs;
  const yeniHizli = (kayit && simdiMs - hizliBas < ORAN_PENCERE_MS)
    ? { hizliBas, hizliAdet: hizliAdet + 1 }
    : { hizliBas: simdiMs, hizliAdet: 1 };

  /* oran sayacı her istekte yazılır — hak yakılmadan  */
  try { await depo.yaz(anahtar, Object.assign({ adet, bas }, yeniHizli), event); }
  catch (e) { console.log(simdi(), 'diagnose: oran sayaci YAZILAMADI ·', hataOzeti(e), '·', ortamProbu()); }

  if (adet >= KOTA_HAK) {
    return { gecer: false, sebep: 'kota', kalan: 0, yenilenmeMs: bas + KOTA_PENCERE_MS, isle: async () => {} };
  }

  return {
    gecer: true,
    kalan: KOTA_HAK - adet - 1,
    yenilenmeMs: bas + KOTA_PENCERE_MS,
    /* YALNIZ BAŞARILI ANALİZ HAK YAKAR — geçersiz adres, ulaşılamayan
       site ya da zaman aşımı hakkı tüketmez; yoksa yazım hatası yapan
       ziyaretçi cezalandırılırdı. Bu yüzden artırma handler'ın sonunda,
       sonuç üretildikten SONRA çağrılıyor. */
    isle: async () => {
      try { await depo.yaz(anahtar, Object.assign({ adet: adet + 1, bas }, yeniHizli), event); }
      catch (e) { console.log(simdi(), 'diagnose: hak YAZILAMADI, kota artmadi ·', hataOzeti(e), '·', ortamProbu()); }
    }
  };
}

/* BÜTÇELER KOŞUM BAŞINA — istek başına DEĞİL.
   Sıradaki iş (SEO/GEO skoru) robots.txt ve sitemap.xml'i de okuyacak,
   yani bir analiz 2-3 istek atacak. Bütçe istek başına tanımlansaydı
   sınır istek sayısıyla ÇARPILARAK aşılırdı. Yönlendirmeler de aynı
   bütçeden yer: bugün 3 hop elle takip ediliyor, her hop kendi bütçesini
   alsaydı 3 hop × 2 MB = 6 MB okunabilirdi.                            */
const TOPLAM_SURE_MS = 9000;
const TOPLAM_HOP = 3;
const TOPLAM_BAYT = 2 * 1024 * 1024;
/* KIRMIZI ÇİZGİ — DÜRÜST KİMLİK. Duvarı aşma yolu açılmayacak: sahte UA
   yok, tarayıcı parmak izi taklidi yok. ÖLÇÜLDÜ: Chrome UA'sıyla da aynı
   adresten 403 alındı, kazancı yok. Dürüst kimlik site sahibine izin
   verme imkânı bırakıyor. Doğru çözüm görünmez olmak değil, GÖREMEMEYİ
   SÖYLEYEBİLMEK — bu dosyanın Faz 0'da yaptığı şey tam olarak budur. */
const UA = 'QanatoneSiteCheck/1.0 (+https://qanatone.com)';

/* --- ağırlıklar: toplam 100 ---
   FAZ 1: `speed` kalemi kaldırıldı. Tek bir soğuk isteğin süresini
   puanlıyordu ve skoru tekrarlanamaz yapıyordu — AYNI sağlıklı site
   soğukta 1900 ms → 89, ısınmışta 505 ms → 93, gecikmede 4729 ms → 85.
   8 puanı, aynı fetch'ten belirlenimci okunan sekiz YAPI kalemine
   dağıtıldı; toplam yine 100, ağırlık dağılımına dokunulmadı.
   PAY NEDEN EŞİT: hangi yapı kaleminin ötekinden kaç kat önemli olduğu
   ölçülmüş bir şey değil. Uydurma bir fark koymak bu deponun "ölçmediğin
   rakamı yazma" kuralına girer. Bütün ağırlıkların kanıta bağlanması
   Faz 3'ün işi; bu tur bozuk aletin yerine çalışan aletleri koyuyor. */
const W = {
  https: 8, redirects: 6, weight: 4, title: 7, desc: 7, h1: 4,
  canonical: 4, lang: 3, schema: 10, og: 5, viewport: 8, alt: 4,
  contact: 7, whatsapp: 5, local: 4, analytics: 4, robots: 1, sitemap: 1,
  /* `status` GITTI, 6 PUAN `redirects`E GECTI (5 Eyl 2026, Enes karari).
     SEBEP OLCULDU: `analyse()` yalniz durum=saglikli iken cagriliyor,
     saglikli = 2xx, ve `status` kalemi tam da 2xx'te `ok` veriyordu —
     yani puanlanan HER sonucta zorunlu olarak yesildi. 6 puan hicbir
     siteyi otekinden ayirmiyordu; Faz 0'da erken donus konunca kalem
     gereksizlesmis ama agirligi tabloda kalmisti.
     `redirects` ZATEN OLCULUYORDU ve hicbir sey yapmiyordu: giris
     adresinden son adrese kac yonlendirme takip edildigi. Her hop, sayfa
     baslamadan once tam bir gidis-donus.
     ILK HOP BAGISLANIR (band 1 · 2), ve bu KEYFI DEGIL: ziyaretcinin
     yazdigi bicim hopu belirliyor. Olculdu:
       qanatone.com -> 1 hop · www.qanatone.com -> 0 hop  (AYNI SITE)
       sahibinden.com 1 · wikipedia.org 1 · github.com 0 · vercel.com 0
     apex->www evrensel ve mesru; onu kirmizi yakmak araci yalanci yapardi.
     2 hop uyari, 3+ kirmizi: orada artik sitenin kendi zinciri vardir.
     SINIR DURUSTCE: yalniz GIRIS adresinin zinciri olculur, sitenin ic
     baglantilarindaki yonlendirmeler DEGIL (o ek istek ister). */
  /* speed'in 8 puanı — sekize eşit bölündü */
  inline: 1, blocking: 1, fonts: 1, imgdim: 1, imgfmt: 1, compress: 1, cache: 1, reqs: 1
};

/* YANITIN İKİ BÖLGESİ — sınır kodda açıkça duruyor, tahmine bırakılmadı.
     · PUANLANAN YÜK: ok/host/finalUrl/score/kb/status/bytes/redirects/
       cdn/durum/cfEylul/items. Belirlenimcilik kuralı BUNU karşılaştırır;
       aynı girdi → birebir aynı yük.
     · TEŞHİS BÖLGESİ (`teshis`): zamana bağlı gözlemler. `ms` burada
       yaşıyor — ölçülmeye devam ediyor çünkü kendi teşhisimiz için
       değerli, ama puanlanmıyor ve ekrana çıkmıyor.
   Sürüm 1'de `ms` yanıtın gövdesinde duruyordu ve "çıktı birebir aynı
   olmalı" kuralıyla çelişiyordu: her koşumda değişen bir alan, aynı
   çıktı iddiasını imkânsız kılar. Bölge ayrımı o çelişkiyi kaldırıyor. */
const TESHIS_ALANI = 'teshis';

/* ---------- SSRF koruması ---------- */
function isPrivate(ip) {
  if (ip.includes(':')) {                      // IPv6
    const l = ip.toLowerCase();
    return l === '::1' || l.startsWith('fc') || l.startsWith('fd') ||
           l.startsWith('fe80') || l.startsWith('::ffff:');
  }
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 ||
         (a === 169 && b === 254) ||
         (a === 172 && b >= 16 && b <= 31) ||
         (a === 192 && b === 168) ||
         (a === 100 && b >= 64 && b <= 127) ||
         a >= 224;
}

/* RET SEBEBI AYRILDI (5 Eyl 2026). Eskiden bu fonksiyon her ret icin
   `null` donuyordu ve handler hepsini `reason:'blocked'` yapiyordu; arayuz
   de ona "site otomatik erisimi engelliyor" diyordu. Olculdu: alan adi
   COZULEMEYEN bir adres de ayni mesaji aliyordu — yani yazim hatasi yapan
   ziyaretciye "site seni engelliyor" deniyordu. Iki hal ayri:
     `adres` — adres gecersiz ya da alan adi cozulmedi (ziyaretcinin isi)
     `blocked` — BIZIM guvenlik reddimiz: ic ag adresi (SSRF korumasi)
   Donus: { u } ya da { sebep }. Yonlendirme dongusu yalnizca `u`ya bakar,
   davranisi degismez. */
async function safeUrl(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); }
  catch (e) { return { sebep: 'adres' }; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { sebep: 'adres' };
  if (u.port && !['80', '443', ''].includes(u.port)) return { sebep: 'adres' };
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return { sebep: 'blocked' };
  let addrs = null;
  try { addrs = await dns.lookup(host, { all: true }); }
  catch (e) { return { sebep: 'adres' }; }
  if (!addrs.length) return { sebep: 'adres' };
  if (addrs.some(a => isPrivate(a.address))) return { sebep: 'blocked' };
  return { u };
}

/* ---------- koşum bütçesi ----------
   Tek bir analiz boyunca yaşar; bütün istekler aynı kasadan harcar. */
function butceAc() {
  const bas = Date.now();
  const d = { bayt: 0, hop: 0 };
  return {
    kalanMs: () => TOPLAM_SURE_MS - (Date.now() - bas),
    kalanBayt: () => TOPLAM_BAYT - d.bayt,
    baytEkle: n => { d.bayt += n; },
    hopHarca: () => ++d.hop,
    okunan: () => d.bayt
  };
}

/* ---------- sınırlı, süreli indirme ----------
   2026-08 BULUNDU: gövde `arrayBuffer()` ile TAMAMEN belleğe alınıyor,
   sınır ondan SONRA uygulanıyordu (`buf.slice(0, MAX_BYTES)`). Yani sınır
   tüketimi önlemiyor, yalnız sonucu kırpıyordu: 500 MB'lık bir gövde
   sunan adres, fonksiyonun belleğini o gövde kadar şişiriyordu.
   İKİ KATMAN, biri yetmez:
     1) Content-Length ön kontrolü — bildirilen boyut bütçeyi aşıyorsa
        gövde HİÇ okunmaz (ucuz, tek başına güvenilmez).
     2) Okuyucu sayaçla akıtılır, bütçe aşıldığı anda iptal — çünkü
        Content-Length YALAN söyleyebilir ve chunked yanıtta HİÇ bulunmaz.
   İptalden sonra gövde cancel + AbortController abort ile kapatılıyor:
   yük altında sızdıran soket, kaçındığımız tüketimin aynısını üretir. */
/* KANONIK HOP MU, FAZLA HOP MU? (5 Eyl 2026)
   OLCULDU, 24 TURK SITESI: puanlanabilen 15 adresin 14'u TAM 1 hop
   yapiyor, hicbiri 2+ degil. Ham hop sayisini puanlamak iki yoldan da
   yanlis olurdu:
     · esik 1'de bagislayinca kalem HERKESTE yesil kalir — az once
       `status`ta duzeltilen "olu agirlik" hatasinin aynisi;
     · esik 0'da 15 siteden 14'u sirf apex->www yaptigi icin sari yanar,
       ki bu evrensel ve mesru bir desen — arac yalanci olur.
   Ustelik ham sayi ZIYARETCININ YAZDIGINA bagli: `qanatone.com` 1 hop,
   `www.qanatone.com` 0 hop — AYNI SITE.
   Cozum: hopu siniflandir. Sunlar KANONIKTIR ve sayilmaz:
     http -> https · apex <-> www · sondaki egik cizgi
   Geri kalan (alan adi degisimi, yol degisimi, sorgu degisimi) FAZLA
   hoptur: sitenin kendi zinciri, sahibinin denetiminde, ve her biri
   sayfa baslamadan once tam bir gidis-donus.
   Adres DISARI CIKMAZ — yalniz sayi doner (yanit yuzeyi degismedi). */
function kanonikHop(oncekiUrl, sonrakiUrl) {
  try {
    const a = new URL(oncekiUrl), b = new URL(sonrakiUrl);
    const konak = (h) => h.replace(/^www\./i, '').toLowerCase();
    if (konak(a.hostname) !== konak(b.hostname)) return false;
    if (a.search !== b.search) return false;
    const yol = (s) => s.replace(/\/+$/, '');
    return yol(a.pathname) === yol(b.pathname);
  } catch (e) { return false; }
}

async function grab(url, method, butce) {
  const ac = new AbortController();
  const sure = Math.max(1, butce.kalanMs());
  const t = setTimeout(() => ac.abort(), sure);
  const started = Date.now();
  try {
    /* GÜVENLİK — yönlendirmeler elle takip ediliyor.
       redirect:'follow' iken SSRF denetimi YALNIZCA ilk adrese uygulanıyordu:
       saldırgan kendi alan adını verip (genel IP, denetimden geçer) sunucuyu
       302 ile http://169.254.169.254/ gibi bir iç adrese yollayabiliyordu ve
       o cevabın başlık/açıklama parçaları JSON'da geri dönüyordu.
       Şimdi her adım safeUrl() ile yeniden doğrulanıyor.
       KALAN RİSK — DNS yeniden bağlama: safeUrl'in çözdüğü IP ile fetch'in
       çözdüğü IP arasında saniyeler var; saldırgan çok kısa TTL ile ikisini
       farklılaştırabilir. Tam çözüm IP'ye bağlanıp Host başlığı göndermek,
       o da TLS sertifika doğrulamasını bozuyor. Bilinçli olarak kabul edildi. */
    /* takip edilen yönlendirme SAYISI — URL listesi DEĞİL. Liste yeni bir
       saldırgan kontrollü dize sink'i açardı (yanıta girip ekrana kadar
       gider); bu turda gereği yok, sayı yeterli bilgiyi taşıyor. */
    let hedef = url, r = null, takip = 0, fazla = 0;
    for (let hop = 0; ; hop++) {
      /* İMZA HOP BAŞINA YENİLENİR. İmzalanan bileşenlerden biri
         `@authority`; yönlendirme başka bir konağa götürdüğünde eski imza
         o konakta DOĞRULANAMAZ. Tek imzayı zincire yaymak, ikinci hop'ta
         karşılığı olmayan bir iddia göndermek olurdu. */
      r = await fetch(hedef, {
        method: method || 'GET', redirect: 'manual', signal: ac.signal,
        headers: Object.assign({ 'user-agent': UA, accept: 'text/html,*/*' }, imzala(hedef))
      });
      if (r.status < 300 || r.status >= 400) break;
      const loc = r.headers.get('location');
      if (!loc) break;
      /* hop sayacı KOŞUM genelinde: robots.txt ve sitemap.xml çağrıları da
         aynı kasadan harcıyor, yoksa her istek 3 hop daha alırdı */
      if (butce.hopHarca() > TOPLAM_HOP) { const e = new Error('too many redirects'); e.name = 'BlockedRedirect'; throw e; }
      let sonraki = null;
      try { sonraki = (await safeUrl(new URL(loc, hedef).href)).u || null; } catch (e) {}
      if (!sonraki) { const e = new Error('redirect blocked'); e.name = 'BlockedRedirect'; throw e; }
      if (!kanonikHop(hedef, sonraki.href)) fazla++;
      hedef = sonraki.href;
      takip++;
    }
    if (method === 'HEAD') {
      try { if (r.body) await r.body.cancel(); } catch (e) {}
      return { r, body: '', bytes: 0, ms: Date.now() - started, finalUrl: hedef, kesildi: false, redirects: takip, fazlaHop: fazla };
    }

    const kalan = butce.kalanBayt();
    /* 1) ön kontrol — bildirilen boyut bütçeyi aşıyorsa gövdeye hiç girme */
    const bildirilen = Number(r.headers.get('content-length'));
    if (Number.isFinite(bildirilen) && bildirilen > kalan) {
      try { if (r.body) await r.body.cancel(); } catch (e) {}
      ac.abort();
      return { r, body: '', bytes: 0, ms: Date.now() - started, finalUrl: hedef, kesildi: true, redirects: takip, fazlaHop: fazla };
    }

    /* 2) sayaçla akıt — Content-Length yalan söylemiş ya da hiç yoksa
       gerçek fren burası. Bütçe aşıldığı anda okuma durur ve bağlantı
       kapanır; okunan bayt bütçeyi en fazla son parça kadar aşar.     */
    let okunan = 0, kesildi = false;
    const parcalar = [];
    if (r.body) {
      const okuyucu = r.body.getReader();
      try {
        for (;;) {
          const { done, value } = await okuyucu.read();
          if (done) break;
          if (value && value.length) {
            parcalar.push(Buffer.from(value));
            okunan += value.length;
          }
          if (okunan >= kalan) { kesildi = true; break; }
        }
      } finally {
        if (kesildi) { try { await okuyucu.cancel(); } catch (e) {} ac.abort(); }
        else { try { okuyucu.releaseLock(); } catch (e) {} }
      }
    }
    butce.baytEkle(okunan);
    const body = Buffer.concat(parcalar).toString('utf8');
    return { r, body, bytes: okunan, ms: Date.now() - started, finalUrl: hedef, kesildi, redirects: takip, fazlaHop: fazla };
  } finally { clearTimeout(t); }
}

/* ---------- tek bir kontrolün sonucu ----------
   DÖRDÜNCÜ ALAN `o` = ÖLÇÜT (5 Eyl 2026, Enes: "maddelerin üzerine
   tıklayınca sebeplerini gerçek bir şekilde özetle belirtsin"). Ziyaretçi
   bir kalemin neden o renkte olduğunu ancak eşiği görünce anlar; eşik
   zaten burada duruyor, kalemle BİRLİKTE gönderiliyor.
   İKİNCİ KEZ YAZILMAZ: `bandS` durumu da ölçütü de AYNI iki sayıdan
   üretir — arayüze elle bir eşik tablosu koymak sapma üretirdi (bu
   depoda üretici/tüketici sözlüğü üç kez ayrıştı).
   DİLDEN BAĞIMSIZ: fonksiyon isteğin dilini bilmiyor (gövde yalnız
   {url} taşıyor). Ölçüt sayılardan ve HTML belirtecinden ibarettir
   (`25-65 · 10-80`, `og:title + og:image`); "iyi/uyarı" etiketini arayüz
   kendi dilinde yazar. */
const S = (k, state, v, o) => ({ k, state, v: v === undefined ? '' : String(v), o: o || '' });
const band = (n, okMax, warnMax) => n <= okMax ? 'ok' : n <= warnMax ? 'warn' : 'fail';
/* Bantlı kalem: durum + değer + ölçüt tek satırdan, tek çift sayıdan. */
const bandS = (k, n, okMax, warnMax, birim) =>
  S(k, band(n, okMax, warnMax), n, `≤${okMax} · ≤${warnMax}${birim ? ' ' + birim : ''}`);
const between = (n, lo, hi) => n >= lo && n <= hi;

/* ---------- CDN TANIMA — ham başlık ASLA yanıta girmez ----------
   `server` ve `cf-ray` SALDIRGANIN KONTROLÜNDE: kötü niyetli bir sunucu
   `server: <script>…` gönderip dizeyi istemciye kadar taşıtabilir.
   Bu yüzden tespit sabit bir tanıma listesinden geçer ve yanıta yalnız
   LİSTEDEN BİR DEĞER girer. Yeni sağlayıcı eklenecekse buraya eklenir;
   ham başlığı geçiren bir yol hiç açılmaz.                             */
const CDN_LISTESI = [
  { ad: 'cloudflare', server: /cloudflare/i, baslik: ['cf-ray'] },
  { ad: 'fastly', server: /fastly/i, baslik: ['fastly-debug-digest', 'x-fastly-request-id'] },
  { ad: 'cloudfront', server: /cloudfront/i, baslik: ['x-amz-cf-id'] },
  { ad: 'akamai', server: /akamai/i, baslik: ['x-akamai-transformed', 'x-akamai-request-id'] }
];
const CDN_BILINMIYOR = 'bilinmiyor';

function basligiOku(res, ad) {
  try { return String((res && res.headers && res.headers.get(ad)) || ''); }
  catch (e) { return ''; }
}

function cdnTani(res) {
  const srv = basligiOku(res, 'server');
  for (const c of CDN_LISTESI) {
    if (c.server.test(srv)) return c.ad;
    if (c.baslik.some(b => basligiOku(res, b))) return c.ad;
  }
  return CDN_BILINMIYOR;
}

/* ---------- ENGEL İMZASI — GÜÇ AYRIMI ----------
   Dönüş sabit sözlükten bir sağlayıcı adı ya da null; gövdeden alınan
   hiçbir dize dışarı çıkmaz.

   BAŞLIK İMZASI GÜÇLÜ KANIT, GÖVDE METNİ ZAYIF. `cf-mitigated` bir
   başlıktır — sunucu onu bilerek koyar. "Just a moment" ise sayfada
   tesadüfen geçebilecek bir metindir. İkisi aynı sırada değerlendirilmez;
   sıra `durumBelirle`de.                                               */
function baslikImzasi(res) {
  if (basligiOku(res, 'cf-mitigated')) return 'cloudflare';
  if (/(^|[,\s])chlray/i.test(basligiOku(res, 'server-timing'))) return 'cloudflare';
  /* `cf-error-details` BAŞLIK olarak burada duruyor çünkü sıralama onu
     güçlü kanıt sayıyor. ÖLÇÜM NOTU: bugün Cloudflare bunu başlık olarak
     GÖNDERMİYOR — yakalanan "Attention Required" sayfasında gövdedeki bir
     CSS sınıfıydı. O yüzden bu satır bugün hiç ateşlenmiyor; gerçek
     yakalama aşağıdaki gövde listesindeki `Attention Required` ile
     oluyor. Sözleşme değişirse satır hazır. */
  if (basligiOku(res, 'cf-error-details')) return 'cloudflare';
  return null;
}

/* ZAYIF KANIT — yalnız durum kodunun kendi anlamı yokken konuşur.
   `Attention Required` ÖLÇÜLEREK eklendi: r10.net aynı saat içinde bu
   ikinci engel sayfasını da döndürdü ve üzerinde ne `cf-mitigated` ne
   `_cf_chl_opt` vardı — yalnız "Just a moment"a bakan bir liste onu
   kaçırırdı. */
const GOVDE_IMZALARI = [
  { desen: /_cf_chl_opt/, ad: 'cloudflare' },
  { desen: /Just a moment/i, ad: 'cloudflare' },
  { desen: /Attention Required/i, ad: 'cloudflare' },
  { desen: /datadome/i, ad: 'datadome' },
  { desen: /_Incapsula_/, ad: 'imperva' },
  { desen: /_abck/, ad: 'akamai' },
  { desen: /px-captcha/i, ad: 'perimeterx' }
];
function govdeImzasi(govde) {
  const g = String(govde || '').slice(0, 20000);
  for (const i of GOVDE_IMZALARI) if (i.desen.test(g)) return i.ad;
  return null;
}

/* ---------- DURUM TAKSONOMİSİ — hepsi "duvar" değil ----------
   BEŞ ayrı hâl, beş ayrı mesaj. 404'ü "engel" diye göstermek, engeli hiç
   görmemek kadar yanlıştır.

   BEŞİNCİ HÂL `reddedildi` — ilk yazımda imzasız bir 403 varsayılan
   olarak `engel` sayılıyordu. Bu yanlış: imzasız 403 bir engel sistemi de
   olabilir, bir yetki ayarı da. `engel` iddiası YALNIZ imza varken
   kurulur, çünkü "AI tarayıcıları da aynı duvara çarpıyor" hükmü ancak o
   zaman doğrudur. İmza yoksa ölçülen gerçek söylenir, konu sunucu
   sahibine devredilir.

   SIRA (bozulursa üç negatif test birden düşer):
     0 · 2xx muafiyeti — HER ŞEYİN ÜSTÜNDE. `x-datadome`, `x-iinfo` gibi
         başlıklar o sağlayıcıların GEÇİRDİKLERİ trafikte de gidiyor;
         durum 2xx ise hiçbir imza duvar iddiası kuramaz.
     1 · başlık imzaları (güçlü) → engel
     2 · durum koduna özgü anlamlar (404/410, 5xx) → 3. adımı EZER,
         yoksa her hata sayfasında geçen bir kelime adresi duvar ilan eder
     3 · gövde metni imzaları (zayıf) → engel
     4 · hiçbiri yoksa ve 2xx dışıysa → reddedildi                      */
function durumBelirle(res, govde) {
  const kod = (res && res.status) || 0;
  if (kod >= 200 && kod < 300) return { durum: 'saglikli', saglayici: null };
  const guclu = baslikImzasi(res);
  if (guclu) return { durum: 'engel', saglayici: guclu };
  if (kod === 404 || kod === 410) return { durum: 'bulunamadi', saglayici: null };
  if (kod >= 500) return { durum: 'sunucu-hatasi', saglayici: null };
  const zayif = govdeImzasi(govde);
  if (zayif) return { durum: 'engel', saglayici: zayif };
  return { durum: 'reddedildi', saglayici: null };
}

/* ---------- robots.txt AI ajanlarına kapalı mı ----------
   15 Eylül ibaresinin İKİNCİ şartı (bkz. handler). Grup ayrımı korunur:
   ardışık user-agent satırları TEK grubu adresler, araya kural girince
   yeni grup başlar. `*` grubunun `Disallow: /`si AI ajanlarını da kapatır.
   Kapsam dar tutuldu: yalnız kökün tamamının kapalı olması sayılır,
   dar yol yasakları AI'a kapalı sayılmaz.                              */
const AI_AJAN = /^(gptbot|oai-searchbot|chatgpt-user|claudebot|anthropic-ai|claude-web|perplexitybot|ccbot|google-extended|applebot-extended|bytespider|meta-externalagent)$/i;
function robotsAiKapali(metin) {
  if (!metin) return false;
  const gruplar = [];
  let su = null;
  for (const ham of String(metin).split(/\r?\n/)) {
    const s = ham.replace(/#.*$/, '').trim();
    if (!s) { su = null; continue; }
    const i = s.indexOf(':');
    if (i < 1) continue;
    const ad = s.slice(0, i).trim().toLowerCase();
    const deger = s.slice(i + 1).trim();
    if (ad === 'user-agent') {
      if (!su || su.kural) { su = { ajanlar: [], kural: false, kapali: false, acik: false }; gruplar.push(su); }
      su.ajanlar.push(deger.toLowerCase());
    } else if (su && (ad === 'disallow' || ad === 'allow')) {
      su.kural = true;
      if (ad === 'disallow' && deger === '/') su.kapali = true;
      if (ad === 'allow' && deger === '/') su.acik = true;
    }
  }
  return gruplar.some(g => g.kapali && !g.acik &&
    g.ajanlar.some(a => a === '*' || AI_AJAN.test(a)));
}

/* ====================== YAPI ÖLÇÜMÜ (FAZ 1) ======================
   Hepsi elimizdeki TEK fetch'ten okunuyor — ek istek yok.

   GÜVENLİK — SAYIM EVET, İÇERİK HAYIR: yazı tipi adları, görsel ve betik
   adresleri, dış alan adları ne döndürülür ne saklanır. Bunlar karşı
   tarafın kontrolündeki dizelerdir; gösterildikleri anda mevcut zincire
   yeni bir uç eklerler. Bu fonksiyondan yalnız SAYI çıkar.

   ZAMAN TABANLI KORUMA YOK ve olmayacak. "Ayrıştırma X ms'yi aşarsa
   vazgeç" cazip görünür ama aynı siteye makine yüküne göre farklı skor
   verir — bu turda düzelttiğimiz kusurun aynısı. Sınır GİRDİ BOYUTUNDAN
   gelir: gövde zaten 2 MB'ta kesiliyor, tarama tek geçişli ve O(n).

   DESENLER SINIRLI: iç içe nicelleyici yok. Etiket taraması tek bir
   `[^>]*` kullanıyor (geri izleme patlaması üretemez), satır içi içerik
   ise regex'le DEĞİL, kapanış etiketinin indeksi bulunup ATLANARAK
   geçiliyor — hem tek geçiş korunuyor hem betik gövdesindeki `<img`
   benzeri diziler yanlışlıkla etiket sayılmıyor.
   Kapanış araması küçük harfe çevrilmiş kopyada DEĞİL, özgün metinde
   yapılıyor: Türkçe 'İ' JS'te iki koda düşer ve toLowerCase() indeksleri
   kaydırır — kopya üzerinden bulunan indeks özgün metinde yanlış yeri
   gösterirdi.                                                          */
const ESKI_GORSEL = /\.(?:jpe?g|png|gif|bmp)(?:[?#]|$)/i;
const YAZI_TIPI_DOSYA = /\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/i;
const FONT_SERVISI = /fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|fonts\.bunny\.net|fast\.fonts\.net/i;
const ETIKET = /<(script|style|link|img|source|iframe)\b([^>]*)>/gi;
const KAPANIS = { script: /<\/script/gi, style: /<\/style/gi };
const N_SRC = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const N_SRCSET = /\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const N_HREF = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const N_REL = /\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const N_MEDIA = /\bmedia\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const oku = (re, s) => {
  const m = re.exec(s);
  if (!m) return '';
  return (m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]) || '';
};

/* Belgenin KENDİ önbellek başlığı. SINIR DÜRÜSTÇE YAZILIYOR: yalnız
   belgenin başlığını görüyoruz, varlıkların değil — varlık başlıkları ek
   istek ister ve bu turda yok. Rapor metni de bunu ima etmiyor.        */
function belgeOnbellegi(res) {
  const cc = basligiOku(res, 'cache-control').toLowerCase();
  if (!cc) return { durum: 'warn', saniye: null };
  if (/\bno-store\b/.test(cc)) return { durum: 'fail', saniye: 0 };
  const m = /\bmax-age\s*=\s*(\d{1,9})/.exec(cc);
  return { durum: 'ok', saniye: m ? Number(m[1]) : null };
}

function yapiOlc(h, res, finalUrl) {
  const n = h.length;
  const kafa = /<\/head\s*>/i.exec(h);
  const kafaSonu = kafa ? kafa.index : n;
  let belgeHost = '';
  try { belgeHost = new URL(finalUrl).hostname.toLowerCase(); } catch (e) {}
  /* yalnız "dışarıda mı" sorusunun EVET/HAYIR'ı tutuluyor; alan adının
     kendisi hiçbir değişkende yaşamıyor */
  const disarida = u => {
    if (!u) return false;
    const mutlak = /^https?:\/\//i.test(u) ? u : (u.slice(0, 2) === '//' ? 'https:' + u : '');
    if (!mutlak) return false;
    try { return new URL(mutlak).hostname.toLowerCase() !== belgeHost; } catch (e) { return false; }
  };

  let satirIci = 0, engelleyen = 0, yaziTipi = 0, disFont = false;
  let gorsel = 0, boyutsuz = 0, eski = 0, disKaynak = 0;

  ETIKET.lastIndex = 0;
  let m;
  while ((m = ETIKET.exec(h))) {
    const ad = m[1].toLowerCase();
    const nit = m[2] || '';
    const kafada = m.index < kafaSonu;

    if (ad === 'script' || ad === 'style') {
      const src = ad === 'script' ? oku(N_SRC, nit) : '';
      if (src) {
        disKaynak++;
        /* type=module varsayılan olarak ertelenir; async/defer da öyle */
        if (kafada && !/\b(?:async|defer)\b/i.test(nit) &&
            !/\btype\s*=\s*["']?module/i.test(nit)) engelleyen++;
        if (YAZI_TIPI_DOSYA.test(src)) { yaziTipi++; if (disarida(src)) disFont = true; }
      } else {
        /* satır içi: içeriği ÖLÇ ve ATLA — tek geçiş korunur */
        const kre = KAPANIS[ad];
        kre.lastIndex = ETIKET.lastIndex;
        const km = kre.exec(h);
        const son = km ? km.index : n;
        const ic = h.slice(ETIKET.lastIndex, son);
        satirIci += ic.length;
        if (ad === 'style') {
          const ff = ic.match(/@font-face/gi);
          if (ff) yaziTipi += ff.length;
        }
        ETIKET.lastIndex = son;
      }
      continue;
    }

    if (ad === 'link') {
      const href = oku(N_HREF, nit);
      const rel = oku(N_REL, nit).toLowerCase();
      if (href) disKaynak++;
      if (rel.indexOf('stylesheet') !== -1) {
        const media = oku(N_MEDIA, nit).toLowerCase().trim();
        const engelsiz = media && media !== 'all' && media !== 'screen';
        if (kafada && !engelsiz) engelleyen++;
      }
      const fontBaglantisi = FONT_SERVISI.test(href) || YAZI_TIPI_DOSYA.test(href) ||
        (rel.indexOf('preload') !== -1 && /\bas\s*=\s*["']?font/i.test(nit));
      if (fontBaglantisi) { yaziTipi++; if (disarida(href)) disFont = true; }
      continue;
    }

    const kaynak = oku(N_SRC, nit) || oku(N_SRCSET, nit);
    if (ad === 'img') {
      gorsel++;
      if (!/\bwidth\s*=/i.test(nit) || !/\bheight\s*=/i.test(nit)) boyutsuz++;
      if (ESKI_GORSEL.test(kaynak)) eski++;
    }
    /* <source> ISTEK DEGIL SECENEKTIR (4 Eyl 2026 — kendi sitemizde olculdu).
       `<picture>`/`<video>` icindeki her `<source>` bir ALTERNATIFTIR;
       tarayici ebeveyn basina EN FAZLA BIRINI indirir. Her birini ayri
       istek saymak sayiyi sisiriyordu: qanatone.com ana sayfasinda
       82 img + 91 source + 11 link + 3 script = 187 "istek" cikip KIRMIZI
       yaniyordu; gercek istek ~96. Rakam iki katina yakin abartiliydi ve
       ziyaretciye olmayan bir sorun gosteriyordu.
       `<img>` zaten sayildigi icin her picture bir istek olarak kayda
       giriyor — yani sayim eksilmiyor, DOGRULUYOR. */
    if (kaynak && ad !== 'source') disKaynak++;
  }

  return {
    satirIciOran: n ? Math.round(satirIci / n * 100) : 0,
    engelleyen,
    yaziTipi, disFont,
    gorsel, boyutsuz,
    eskiOran: gorsel ? Math.round(eski / gorsel * 100) : 0,
    disKaynak,
    sikistirma: /\b(?:gzip|br|deflate|zstd)\b/i.test(basligiOku(res, 'content-encoding')),
    onbellek: belgeOnbellegi(res)
  };
}

function analyse(html, res, bytes, finalUrl, redirects) {
  const h = html;
  const low = h.toLowerCase();
  const head = low.slice(0, 60000);
  const items = [];

  items.push(S('https', finalUrl.startsWith('https://') ? 'ok' : 'fail', undefined, 'https://'));
  items.push(bandS('redirects', Number(redirects) || 0, 0, 1));

  const kb = Math.round(bytes / 1024);
  items.push(bandS('weight', kb, 500, 1500, 'KB'));

  /* ---- YAPI KALEMLERİ — `speed`in yerine gelenler ---- */
  const y = yapiOlc(h, res, finalUrl);
  /* satır içi kod ÖNBELLEĞE ALINAMAZ: ikinci sayfaya geçen ziyaretçi
     aynı yükü tekrar indirir. Oran, belge boyutunun yüzdesi. */
  items.push(bandS('inline', y.satirIciOran, 20, 50, '%'));
  items.push(bandS('blocking', y.engelleyen, 2, 5));
  /* dış alan adından gelen yazı tipi ek istek + dış bağımlılıktır:
     sayı yeşil bandda olsa bile en iyi ihtimalle uyarı */
  const fontBandi = band(y.yaziTipi, 2, 5);
  items.push(S('fonts', y.disFont && fontBandi === 'ok' ? 'warn' : fontBandi, y.yaziTipi,
    y.disFont ? '≤2 · ≤5 + dis alan' : '≤2 · ≤5'));
  items.push(bandS('imgdim', y.boyutsuz, 0, 2));
  items.push(S('imgfmt', y.gorsel === 0 ? 'ok' : band(y.eskiOran, 20, 60), y.eskiOran, '≤20 · ≤60 %'));
  items.push(S('compress', y.sikistirma ? 'ok' : 'fail', undefined, 'content-encoding'));
  /* saniye YALNIZ pozitifken gösteriliyor: `max-age=0, must-revalidate`
     geçerli ve ucuz bir ayardır (304 ile döner), ama yanında "0 sn"
     yazan YEŞİL bir kutu kendi kendisiyle çelişir gibi okunur. Sayı
     bilgi taşımıyorsa yazılmaz. */
  items.push(S('cache', y.onbellek.durum,
    y.onbellek.saniye > 0 ? y.onbellek.saniye : undefined, 'max-age > 0'));
  items.push(bandS('reqs', y.disKaynak, 30, 60));

  const title = (h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]
    .replace(/\s+/g, ' ').trim();
  items.push(S('title', title ? (between(title.length, 25, 65) ? 'ok'
    : between(title.length, 10, 80) ? 'warn' : 'fail') : 'fail', title.length, '25-65 · 10-80'));

  const desc = (h.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                h.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) ||
                [, ''])[1].trim();
  items.push(S('desc', desc ? (between(desc.length, 70, 165) ? 'ok'
    : between(desc.length, 30, 200) ? 'warn' : 'fail') : 'fail', desc.length, '70-165 · 30-200'));

  const h1 = (h.match(/<h1[\s>]/gi) || []).length;
  items.push(S('h1', h1 === 1 ? 'ok' : h1 === 2 ? 'warn' : 'fail', h1, '1 · 2'));

  items.push(S('canonical', /rel=["']canonical["']/i.test(head) ? 'ok' : 'warn', undefined, 'rel=canonical'));
  items.push(S('lang', /<html[^>]+lang=["'][a-z]{2}/i.test(head) ? 'ok' : 'fail', undefined, '<html lang>'));

  const ld = /type=["']application\/ld\+json["']/i.test(low);
  items.push(S('schema', ld ? 'ok' : /itemscope|itemtype=/i.test(low) ? 'warn' : 'fail', undefined, 'ld+json · microdata'));

  const ogT = /property=["']og:title["']/i.test(head);
  const ogI = /property=["']og:image["']/i.test(head);
  items.push(S('og', ogT && ogI ? 'ok' : (ogT || ogI) ? 'warn' : 'fail', undefined, 'og:title + og:image'));

  items.push(S('viewport', /name=["']viewport["'][^>]*width=device-width/i.test(head) ? 'ok' : 'fail', undefined, 'width=device-width'));

  const imgs = h.match(/<img\b[^>]*>/gi) || [];
  /* CIPLAK OZNITELIK DE ALT'TIR (4 Eyl 2026 — kendi sitemizde yakalandi).
     Eski desen `\balt\s*=` idi ve `<img ... alt width=...>` gibi CIPLAK
     yazilmis alt'i GORMUYORDU. HTML'de ciplak `alt`, `alt=""` ile
     esdegerdir: gorsel DEKORATIFTIR, dogru isaretlemedir.
     BEDELI OLCULDU: qanatone.com ana sayfasinda 82 gorselin 18'i boyle
     yazilmis (kayan logo seridinin kopyalari; kaynakta alt={''} ve Astro
     bunu ciplak basiyor). Arac "18 eksik" deyip KIRMIZI yakiyordu;
     GERCEKTEN alt'siz gorsel SIFIR.
     Bu yalniz bizi degil, ayni yazimi kullanan HER ziyaretciyi yanlis
     sucluyordu — bir lead miknatisinda YANLIS KIRMIZI, eksik olcumden
     daha pahalidir. */
  const noAlt = imgs.filter(t => !/(?:^|\s)alt(?:\s*=|[\s/>]|$)/i.test(t)).length;
  items.push(S('alt', imgs.length === 0 ? 'warn' : band(noAlt, 0, 2), noAlt, '0 · ≤2'));

  const wa = /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//i.test(low);
  const tel = /href=["']tel:/i.test(low);
  const mail = /href=["']mailto:/i.test(low);
  const form = /<form\b/i.test(low) && /type=["']email["']|name=["'](email|mail|eposta)["']/i.test(low);
  const ways = [wa, tel, mail, form].filter(Boolean).length;
  items.push(S('contact', ways >= 2 ? 'ok' : ways === 1 ? 'warn' : 'fail', ways, '≥2'));
  items.push(S('whatsapp', wa ? 'ok' : 'warn', undefined, 'wa.me'));

  const local = /maps\.google|google\.com\/maps|maps\.app\.goo\.gl|"@type"\s*:\s*"[^"]*LocalBusiness/i.test(low);
  items.push(S('local', local ? 'ok' : 'warn', undefined, 'maps · LocalBusiness'));

  const anal = /googletagmanager\.com|google-analytics\.com|gtag\(|plausible\.io|matomo|mc\.yandex|connect\.facebook\.net|clarity\.ms/i.test(low);
  items.push(S('analytics', anal ? 'ok' : 'fail', undefined, 'gtag · plausible · matomo'));

  return items;
}

function score(items) {
  let got = 0, tot = 0;
  items.forEach(i => {
    const w = W[i.k]; if (!w) return;
    tot += w;
    got += i.state === 'ok' ? w : i.state === 'warn' ? w * 0.5 : 0;
  });
  return tot ? Math.round(got / tot * 100) : 0;
}

/* Handler'ı depo adaptörüyle inşa eder — test sahte depoyla çağırır,
   çalışma zamanı gerçek Blobs deposuyla (yayinla.js ile aynı desen). */
function handlerOlustur(depo) {
  return async function handler(event) {
  const H = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: '{"ok":false}' };

  /* Kapı EN BAŞTA: oran sınırı geçersiz gövdeli istekleri de kapsamalı,
     yoksa saldırgan çöp gönderip sınırın etrafından dolanır. Hak ise
     ancak analiz BAŞARILI olursa yakılıyor (aşağıda kapi.isle()). */
  const kapi = await kotaKapisi(event, depo, process.env.KOTA_TUZ, Date.now());
  if (!kapi.gecer) {
    return {
      statusCode: 429, headers: H,
      body: JSON.stringify({ ok: false, reason: kapi.sebep, kalan: 0, yenilenmeMs: kapi.yenilenmeMs })
    };
  }

  let raw = '';
  try { raw = String((JSON.parse(event.body || '{}').url) || '').trim(); } catch (e) {}
  if (!raw) return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, reason: 'unreachable' }) };

  const coz = await safeUrl(raw);
  if (!coz.u) return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, reason: coz.sebep }) };
  const u = coz.u;

  /* tek kasa: ana sayfa + robots.txt + sitemap.xml aynı bütçeden harcar */
  const butce = butceAc();
  let page;
  try { page = await grab(u.href, undefined, butce); }
  catch (e) {
    const reason = (e && e.name === 'AbortError') ? 'timeout'
                 : (e && e.name === 'BlockedRedirect') ? 'blocked' : 'unreachable';
    /* zaman aşımı / DNS / bağlantı = "ulaşılamadı". `blocked` bizim KENDİ
       reddimizdir (SSRF koruması), sitenin duvarı değil — ona durum
       iliştirilmiyor, eski genel mesajı görüyor. */
    const govde = { ok: false, reason };
    if (reason !== 'blocked') { govde.durum = 'ulasilamadi'; govde.host = u.hostname; }
    return { statusCode: 200, headers: H, body: JSON.stringify(govde) };
  }

  /* redirect:'manual' olduğu için r.url son adresi vermez; grab kendi takip
     ettiği son adresi finalUrl olarak döndürüyor.                        */
  const finalUrl = page.finalUrl || u.href;
  const cdn = cdnTani(page.r);
  const teshis = durumBelirle(page.r, page.body);

  /* SKOR YERİNE BULGU — durum kötüyse analyse() HİÇ ÇALIŞMAZ.
     Eski kod HTTP durumunu 19 kalemden biri sayıp analize devam ediyordu:
     engel sayfası küçük ve hızlı olduğu için `speed` ve `weight` YEŞİL
     çıkıyor, araç ziyaretçiye görmediği bir site hakkında rakam veriyordu.
     Skor bileşeni bu yolda ekrana hiç basılmaz — sıfır da değil, "N/A" de
     değil, YOK. Aşağıdaki alanların hepsi ölçülmüş gerçeklerdir.
     KOTA: buradan hak YAKILMADAN dönülüyor (kapi.isle çağrılmıyor) —
     analiz yapılmadı, "yalnız başarılı analiz hak yakar" kuralı kapsıyor.
     BİLİNÇLİ KABUL EDİLEN AÇIK: sürekli duvarlı adres göndererek kotasız
     istek yapılabilir. Ayrı çalışan oran sınırı bunu kapsıyor ve her
     deneme yine bizim tarafımızda bir fetch'e mal oluyor; takas kullanıcı
     deneyimi lehine yapıldı.                                            */
  if (teshis.durum !== 'saglikli') {
    return {
      statusCode: 200, headers: H,
      body: JSON.stringify({
        ok: false,
        durum: teshis.durum,
        saglayici: teshis.saglayici,
        host: u.hostname,
        finalUrl,
        status: page.r.status,
        bytes: page.bytes,
        redirects: page.redirects,
        cdn,
        /* 15 EYLÜL — koşullu, skora bağlı DEĞİL. Bu yolda skor zaten yok;
           şart cdn=cloudflare + durum=engel. Diğer üç hâlde çıkmaz. */
        cfEylul: cdn === 'cloudflare' && teshis.durum === 'engel'
      })
    };
  }

  /* PUANLANAN: FAZLA hop (kanonik olanlar bedava — bkz. kanonikHop).
     Ham toplam `redirects` alaninda bilgi olarak duruyor. */
  const items = analyse(page.body, page.r, page.bytes, finalUrl, page.fazlaHop);

  /* robots.txt ve site haritası — bulunamazsa uyarı, hata değil */
  const origin = new URL(finalUrl).origin;
  let robotsBody = '';
  try {
    const rb = await grab(origin + '/robots.txt', undefined, butce);
    const okR = rb.r.ok && /user-agent/i.test(rb.body);
    robotsBody = rb.body || '';
    items.push(S('robots', okR ? 'ok' : 'warn', undefined, 'robots.txt'));
  } catch (e) { items.push(S('robots', 'warn', undefined, 'robots.txt')); }

  try {
    if (/sitemap:/i.test(robotsBody)) items.push(S('sitemap', 'ok', undefined, 'sitemap.xml'));
    else {
      const sm = await grab(origin + '/sitemap.xml', 'HEAD', butce);
      items.push(S('sitemap', sm.r.ok ? 'ok' : 'warn', undefined, 'sitemap.xml'));
    }
  } catch (e) { items.push(S('sitemap', 'warn', undefined, 'sitemap.xml')); }

  /* buraya gelindiyse analiz BAŞARILI — hak ancak şimdi yakılıyor */
  await kapi.isle();

  return {
    statusCode: 200, headers: H,
    body: JSON.stringify({
      ok: true,
      host: u.hostname,
      finalUrl,
      score: score(items),
      kb: Math.round(page.bytes / 1024),
      kalan: kapi.kalan,
      /* sağlıklı yolda da taşınıyor: istemci aynı alanları tek yerden
         okusun, "durum" yalnız kötü hâlde var olan bir alan olmasın */
      status: page.r.status,
      bytes: page.bytes,
      redirects: page.redirects,
      cdn,
      durum: teshis.durum,
      /* 15 Eylül'ün ikinci şartı: robots AI ajanlarına kapalıysa site
         sağlıklı olsa bile uyarı çıkar. Skorla hiçbir bağı yok — 95
         puanlık bir site bloklanmak üzere olabilir. */
      cfEylul: cdn === 'cloudflare' && robotsAiKapali(robotsBody),
      items,
      /* ---- TEŞHİS BÖLGESİ — buradan aşağısı puanlanmaz, gösterilmez ve
         belirlenimcilik karşılaştırmasına GİRMEZ. Zamana bağlı gözlemler
         yalnız burada yaşar; ön yüz bu nesneye hiç dokunmuyor. ---- */
      [TESHIS_ALANI]: { ms: page.ms }
    })
  };
  };
}

exports.handler = handlerOlustur(blobsDepo());

/* test: akış sınırı ağa çıkmadan, yerel bir uç noktaya karşı ölçülebilsin
   diye dışa veriliyor (safeUrl yerel adresi bilinçli reddettiği için
   handler üzerinden ölçülemez). Kota da sahte depoyla, deterministik. */
exports.grab = grab;
exports.butceAc = butceAc;
exports.TOPLAM_BAYT = TOPLAM_BAYT;
exports.handlerOlustur = handlerOlustur;
exports.kotaKapisi = kotaKapisi;
exports.kimAnahtari = kimAnahtari;
exports.istemciKimligi = istemciKimligi;
exports.KOTA_HAK = KOTA_HAK;
exports.KOTA_PENCERE_MS = KOTA_PENCERE_MS;
/* Faz 1: ağırlık tablosu ve bölge sınırı denetimden okunabilsin — kural
   "toplam 100 · yapı payı 8" dengesini tahminle değil, kaynaktan ölçüyor. */
exports.W = W;
exports.TESHIS_ALANI = TESHIS_ALANI;
/* SOZLESME YUZEYI (5 Eyl 2026): arayuzun tanimasi GEREKEN butun degerler.
   Denetim bunlari STETespit'in sozlukleriyle karsilastirir — `kota`/`quota`
   ayrismasi (4 Eyl) bir daha sessizce olmasin. */
/* `analyse` denetim icin disa aciliyor: bekci fikstur HTML'le cagirip
   her kalemin OLCUT tasidigini AG'A CIKMADAN dogrular. */
exports.analyse = analyse;
/* siniflandirma tablosu denetimde kilitli (olc-tespit-puan 4b) */
exports.kanonikHop = kanonikHop;
exports.DURUMLAR = ['saglikli', 'engel', 'bulunamadi', 'sunucu-hatasi', 'reddedildi', 'ulasilamadi'];
exports.SEBEPLER = ['timeout', 'unreachable', 'blocked', 'adres', 'kota', 'oran'];
