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
  let s = null;
  const al = () => (s = s || require('@netlify/blobs').getStore({ name: 'kota', consistency: 'strong' }));
  return {
    async oku(anahtar) { return (await al().get(anahtar, { type: 'json' })) || null; },
    async yaz(anahtar, deger) { await al().setJSON(anahtar, deger); },
    async sil(anahtar) { await al().delete(anahtar); }
  };
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
  try { kayit = await depo.oku(anahtar); }
  catch (e) {
    console.log(simdi(), 'diagnose: kota deposu OKUNAMADI — acik dusuldu ·', hataOzeti(e));
    return { gecer: true, kalan: null, isle: async () => {} };
  }

  if (kayit && simdiMs - (kayit.bas || 0) >= KOTA_PENCERE_MS) {
    try { await depo.sil(anahtar); } catch (e) { console.log(simdi(), 'diagnose: kota kaydi SILINEMEDI ·', hataOzeti(e)); }
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
  try { await depo.yaz(anahtar, Object.assign({ adet, bas }, yeniHizli)); }
  catch (e) { console.log(simdi(), 'diagnose: oran sayaci YAZILAMADI ·', hataOzeti(e)); }

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
      try { await depo.yaz(anahtar, Object.assign({ adet: adet + 1, bas }, yeniHizli)); }
      catch (e) { console.log(simdi(), 'diagnose: hak YAZILAMADI, kota artmadi ·', hataOzeti(e)); }
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
const UA = 'QanatoneSiteCheck/1.0 (+https://qanatone.com)';

/* --- ağırlıklar: toplam 100 --- */
const W = {
  https: 8, status: 6, speed: 8, weight: 4, title: 7, desc: 7, h1: 4,
  canonical: 4, lang: 3, schema: 10, og: 5, viewport: 8, alt: 4,
  contact: 7, whatsapp: 5, local: 4, analytics: 4, robots: 1, sitemap: 1
};

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

async function safeUrl(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); }
  catch (e) { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.port && !['80', '443', ''].includes(u.port)) return null;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;
  try {
    const addrs = await dns.lookup(host, { all: true });
    if (!addrs.length || addrs.some(a => isPrivate(a.address))) return null;
  } catch (e) { return null; }
  return u;
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
    let hedef = url, r = null;
    for (let hop = 0; ; hop++) {
      r = await fetch(hedef, {
        method: method || 'GET', redirect: 'manual', signal: ac.signal,
        headers: { 'user-agent': UA, accept: 'text/html,*/*' }
      });
      if (r.status < 300 || r.status >= 400) break;
      const loc = r.headers.get('location');
      if (!loc) break;
      /* hop sayacı KOŞUM genelinde: robots.txt ve sitemap.xml çağrıları da
         aynı kasadan harcıyor, yoksa her istek 3 hop daha alırdı */
      if (butce.hopHarca() > TOPLAM_HOP) { const e = new Error('too many redirects'); e.name = 'BlockedRedirect'; throw e; }
      let sonraki = null;
      try { sonraki = await safeUrl(new URL(loc, hedef).href); } catch (e) {}
      if (!sonraki) { const e = new Error('redirect blocked'); e.name = 'BlockedRedirect'; throw e; }
      hedef = sonraki.href;
    }
    if (method === 'HEAD') {
      try { if (r.body) await r.body.cancel(); } catch (e) {}
      return { r, body: '', bytes: 0, ms: Date.now() - started, finalUrl: hedef, kesildi: false };
    }

    const kalan = butce.kalanBayt();
    /* 1) ön kontrol — bildirilen boyut bütçeyi aşıyorsa gövdeye hiç girme */
    const bildirilen = Number(r.headers.get('content-length'));
    if (Number.isFinite(bildirilen) && bildirilen > kalan) {
      try { if (r.body) await r.body.cancel(); } catch (e) {}
      ac.abort();
      return { r, body: '', bytes: 0, ms: Date.now() - started, finalUrl: hedef, kesildi: true };
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
    return { r, body, bytes: okunan, ms: Date.now() - started, finalUrl: hedef, kesildi };
  } finally { clearTimeout(t); }
}

/* ---------- tek bir kontrolün sonucu ---------- */
const S = (k, state, v) => ({ k, state, v: v === undefined ? '' : String(v) });
const band = (n, okMax, warnMax) => n <= okMax ? 'ok' : n <= warnMax ? 'warn' : 'fail';
const between = (n, lo, hi) => n >= lo && n <= hi;

function analyse(html, res, ms, bytes, finalUrl) {
  const h = html;
  const low = h.toLowerCase();
  const head = low.slice(0, 60000);
  const items = [];

  items.push(S('https', finalUrl.startsWith('https://') ? 'ok' : 'fail'));
  items.push(S('status', res.status >= 200 && res.status < 300 ? 'ok'
    : res.status < 400 ? 'warn' : 'fail'));
  items.push(S('speed', band(ms, 1500, 3500), ms));

  const kb = Math.round(bytes / 1024);
  items.push(S('weight', band(kb, 500, 1500), kb));

  const title = (h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]
    .replace(/\s+/g, ' ').trim();
  items.push(S('title', title ? (between(title.length, 25, 65) ? 'ok'
    : between(title.length, 10, 80) ? 'warn' : 'fail') : 'fail', title.length));

  const desc = (h.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                h.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) ||
                [, ''])[1].trim();
  items.push(S('desc', desc ? (between(desc.length, 70, 165) ? 'ok'
    : between(desc.length, 30, 200) ? 'warn' : 'fail') : 'fail', desc.length));

  const h1 = (h.match(/<h1[\s>]/gi) || []).length;
  items.push(S('h1', h1 === 1 ? 'ok' : h1 === 2 ? 'warn' : 'fail', h1));

  items.push(S('canonical', /rel=["']canonical["']/i.test(head) ? 'ok' : 'warn'));
  items.push(S('lang', /<html[^>]+lang=["'][a-z]{2}/i.test(head) ? 'ok' : 'fail'));

  const ld = /type=["']application\/ld\+json["']/i.test(low);
  items.push(S('schema', ld ? 'ok' : /itemscope|itemtype=/i.test(low) ? 'warn' : 'fail'));

  const ogT = /property=["']og:title["']/i.test(head);
  const ogI = /property=["']og:image["']/i.test(head);
  items.push(S('og', ogT && ogI ? 'ok' : (ogT || ogI) ? 'warn' : 'fail'));

  items.push(S('viewport', /name=["']viewport["'][^>]*width=device-width/i.test(head) ? 'ok' : 'fail'));

  const imgs = h.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter(t => !/\balt\s*=/i.test(t)).length;
  items.push(S('alt', imgs.length === 0 ? 'warn' : band(noAlt, 0, 2), noAlt));

  const wa = /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//i.test(low);
  const tel = /href=["']tel:/i.test(low);
  const mail = /href=["']mailto:/i.test(low);
  const form = /<form\b/i.test(low) && /type=["']email["']|name=["'](email|mail|eposta)["']/i.test(low);
  const ways = [wa, tel, mail, form].filter(Boolean).length;
  items.push(S('contact', ways >= 2 ? 'ok' : ways === 1 ? 'warn' : 'fail', ways));
  items.push(S('whatsapp', wa ? 'ok' : 'warn'));

  const local = /maps\.google|google\.com\/maps|maps\.app\.goo\.gl|"@type"\s*:\s*"[^"]*LocalBusiness/i.test(low);
  items.push(S('local', local ? 'ok' : 'warn'));

  const anal = /googletagmanager\.com|google-analytics\.com|gtag\(|plausible\.io|matomo|mc\.yandex|connect\.facebook\.net|clarity\.ms/i.test(low);
  items.push(S('analytics', anal ? 'ok' : 'fail'));

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

  const u = await safeUrl(raw);
  if (!u) return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, reason: 'blocked' }) };

  /* tek kasa: ana sayfa + robots.txt + sitemap.xml aynı bütçeden harcar */
  const butce = butceAc();
  let page;
  try { page = await grab(u.href, undefined, butce); }
  catch (e) {
    const reason = (e && e.name === 'AbortError') ? 'timeout'
                 : (e && e.name === 'BlockedRedirect') ? 'blocked' : 'unreachable';
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, reason }) };
  }

  /* redirect:'manual' olduğu için r.url son adresi vermez; grab kendi takip
     ettiği son adresi finalUrl olarak döndürüyor.                        */
  const finalUrl = page.finalUrl || u.href;
  const items = analyse(page.body, page.r, page.ms, page.bytes, finalUrl);

  /* robots.txt ve site haritası — bulunamazsa uyarı, hata değil */
  const origin = new URL(finalUrl).origin;
  let robotsBody = '';
  try {
    const rb = await grab(origin + '/robots.txt', undefined, butce);
    const okR = rb.r.ok && /user-agent/i.test(rb.body);
    robotsBody = rb.body || '';
    items.push(S('robots', okR ? 'ok' : 'warn'));
  } catch (e) { items.push(S('robots', 'warn')); }

  try {
    if (/sitemap:/i.test(robotsBody)) items.push(S('sitemap', 'ok'));
    else {
      const sm = await grab(origin + '/sitemap.xml', 'HEAD', butce);
      items.push(S('sitemap', sm.r.ok ? 'ok' : 'warn'));
    }
  } catch (e) { items.push(S('sitemap', 'warn')); }

  /* buraya gelindiyse analiz BAŞARILI — hak ancak şimdi yakılıyor */
  await kapi.isle();

  return {
    statusCode: 200, headers: H,
    body: JSON.stringify({
      ok: true,
      host: u.hostname,
      finalUrl,
      score: score(items),
      ms: page.ms,
      kb: Math.round(page.bytes / 1024),
      kalan: kapi.kalan,
      items
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
