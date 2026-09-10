/* netlify/functions/panel.js
   ---------------------------------------------------------------------
   Yönetim panelinin KAPISI. 2026-08 ölçümü: /admin.html anonim olarak
   200 dönüyordu — panelin bütün alan adları, yapısı ve içerik şeması
   herkese açıktı. Yayın ucu (yayinla.js) parolayla korunduğu için içerik
   DEĞİŞTİRİLEMİYORDU; korumasız olan yüzeyin kendisiydi. PANEL_PAROLA_HASH
   tanımlandığı an panel canlıya çıkacağı için bu açık yüzey aynı turda
   kapatıldı.

   NASIL ÇALIŞIR
     - build.js artık admin.html'i dist'e KOPYALAMIYOR (statik kopya yok).
     - Üretilen _redirects, /admin.html adresini zorlamalı (200!) olarak
       buraya yönlendiriyor. Force şart: ileride dist'e bir kopya geri
       sızarsa statik dosya kapıyı geçersiz kılardı.
     - Kimlik HTTP Basic Auth ile alınıyor ve yayinla.js'in dogrula()'sına
       veriliyor — AYNI scrypt hash'i, ikinci bir sır yok. Kullanıcı adı
       yok sayılır, yalnız parola ölçülür.
     - Kimlik kanıtlanmadan panelin tek baytı gitmez: gövde ancak
       doğrulamadan SONRA okunur.

   ÇALIŞMASI İÇİN GEREKENLER
     PANEL_PAROLA_HASH   yayinla.js ile aynı değer ("tuz:hash", scrypt/hex)
     netlify.toml → [functions] included_files = ["admin.html"]
                    (panel gövdesi fonksiyon paketine bu satırla giriyor)

   NEDEN GİRİŞ EKRANI DEĞİL: sayfa içi giriş ekranı HTML'i yine de
   indirtirdi — anonim istek 200 almaya devam ederdi, yani ölçülen açık
   kapanmazdı. NEDEN PANELİ TAMAMEN ÇIKARMAK DEĞİL: panel yayın ucunu
   aynı kaynaktan çağırıyor; dışarı alınsa Yayınla düğmesi CORS'a
   takılır, çözümü de yayinla.js'i dış kaynağa açmak olurdu — korunan
   ucu zayıflatmak pahasına korumasız yüzeyi kapatmak.
   --------------------------------------------------------------------- */
'use strict';

const fs = require('fs');
const path = require('path');
const { dogrula, SLUG_BICIMI } = require('./yayinla.js');

const ALAN = 'Basic realm="QANATONE panel", charset="UTF-8"';
const SABIT_GECIKME_MS = 300;

const dur = ms => new Promise(r => setTimeout(r, ms));
const simdi = () => new Date().toISOString();

/* Panel gövdesi fonksiyon paketinin içinde; koşum ortamına göre kökü
   değişiyor (Netlify'da /var/task, yerelde depo kökü). Aday listesi
   sırayla denenir — bulunamazsa KAPALI davranılır, asla yarım sayfa
   dönülmez. */
function panelYolu() { return dosyaYolu('admin.html'); }

/* VERI UCU (9 Eyl 2026) — panel varsayilan icerigi ARTIK BURADAN aliyor.
   Eskiden onizleme iframe'ine `/index.html` yuklenip
   `window.__qanatDefaults()` cagriliyordu; o fonksiyon ESKI kok sitede
   vardi ve Astro gocunde tasinmadi, yeni site yayina gecince panel
   "Onizlemeye erisilemedi" deyip aciliyordu. Icerik artik kokteki
   content.json'dan, Basic Auth'un ARDINDAN servis ediliyor — dosya
   yayina (dist'e) konulmuyor, yalniz panel gorebiliyor. */
function icerikYolu() { return dosyaYolu('content.json'); }

/* ---- KADEME 2 (9 Eyl 2026): DOSYA BASINA KAYIT ----------------------
   `posts`/`explainers`/`news` content.json'da degil
   `icerik/<klasor>/<slug>.json` dosyalarinda. Panel bunlari `?kayitlar=1`
   ucundan alir; SOZLESME de ayni yanitla gelir (hangi koleksiyon dosyada,
   klasoru ne) — panelde SABIT YAZILMAZ, tek karar yeri
   `yeni/src/veri/sayfalar.json`. Iki yerde dursaydi biri degisince oteki
   sessizce kayardi.
   Dosyalar fonksiyon paketine `netlify.toml` -> `included_files` ile
   giriyor; `dizinYolu` LAMBDA_TASK_ROOT dahil ayni aday listesini
   kullanir cunku paket ici yol yerel yoldan farklidir. */
function dizinYolu(ad) {
  const adaylar = [
    process.env.LAMBDA_TASK_ROOT && path.join(process.env.LAMBDA_TASK_ROOT, ad),
    path.join(process.cwd(), ad),
    path.join(__dirname, ad),
    path.join(__dirname, '..', '..', ad)
  ].filter(Boolean);
  for (const a of adaylar) {
    try { if (fs.statSync(a).isDirectory()) return a; } catch (e) {}
  }
  return null;
}

function dosyaKoleksiyonlari() {
  const sy = dosyaYolu(path.join('yeni', 'src', 'veri', 'sayfalar.json'));
  if (!sy) return [];
  try {
    return JSON.parse(fs.readFileSync(sy, 'utf8')).koleksiyon
      .filter(k => k.depo === 'dosya')
      .map(k => ({ ad: k.ad, kaynak: k.kaynak, klasor: k.klasor }));
  } catch (e) { return []; }
}

/* Kayitlar tarihe gore yeni->eski: panelin listesi, sitenin dizini ve
   denetimin kiyasi ayni sirayi gormeli. */
function kayitlariOku(klasor) {
  const d = dizinYolu(klasor);
  /* KLASOR YOK = "bos koleksiyon" DEGIL, "pakete girmemis" olabilir.
     Ayrimi cagiran yapiyor: null doner, uc hepsi null ise 503 verir. */
  if (!d) return null;
  return fs.readdirSync(d).filter(a => a.endsWith('.json'))
    .map(a => { try { return JSON.parse(fs.readFileSync(path.join(d, a), 'utf8')); } catch (e) { return null; } })
    .filter(Boolean)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/* Butun dosya koleksiyonlarini gezer. HICBIR klasor cozulmezse
   `bulunan` 0 kalir ve cagiran 503 verir (asagidaki gerekce). */
function koleksiyonlariOku(donustur) {
  const koleksiyon = dosyaKoleksiyonlari();
  const cikti = {};
  let toplam = 0, bulunan = 0;
  for (const K of koleksiyon) {
    const dizi = kayitlariOku(K.klasor);
    if (dizi === null) { cikti[K.ad] = []; continue; }
    bulunan++; cikti[K.ad] = donustur ? dizi.map(donustur) : dizi; toplam += dizi.length;
  }
  return { koleksiyon, cikti, toplam, bulunan };
}

/* DIZIN OZETI (Tur 2 · B7, 10 Eyl 2026). Panel acilista TUM kayitlari
   cekiyordu: 10.000 yazida 35,6 MiB, her acilista. Liste icin gereken
   yalniz bu uc alan — adres, siralama tarihi, baslik. Govde kayit
   ACILINCA `?kayit=` ile gelir. Panel liste etiketini ve site haritasi
   sayacini bunlardan cizer; alan eklemek acilis yukunu buyutur. */
function ozetle(k) {
  return { slug: k.slug, date: k.date, title: { tr: (k.title && k.title.tr) || '' } };
}

function dosyaYolu(ad) {
  const adaylar = [
    process.env.LAMBDA_TASK_ROOT && path.join(process.env.LAMBDA_TASK_ROOT, ad),
    path.join(process.cwd(), ad),
    path.join(__dirname, ad),
    path.join(__dirname, '..', '..', ad)
  ].filter(Boolean);
  for (const a of adaylar) {
    try { if (fs.statSync(a).isFile()) return a; } catch (e) {}
  }
  return null;
}

/* "Basic <base64>" → parola. Kullanıcı adı yok sayılır; iki nokta
   yoksa biçim bozuk demektir, boş parola döner (reddedilir). */
function parolaCoz(ham) {
  const m = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(String(ham || '').trim());
  if (!m) return '';
  let coz = '';
  try { coz = Buffer.from(m[1], 'base64').toString('utf8'); } catch (e) { return ''; }
  const ayrac = coz.indexOf(':');
  return ayrac < 0 ? '' : coz.slice(ayrac + 1);
}

exports.handler = async function handler(event) {
  const H = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };

  const hashSatiri = process.env.PANEL_PAROLA_HASH;
  if (!hashSatiri) {
    console.log(simdi(), 'panel: PANEL_PAROLA_HASH tanimli degil, kapi kapali');
    return { statusCode: 503, headers: H, body: 'panel kapali' };
  }

  const basliklar = (event && event.headers) || {};
  const ham = basliklar.authorization || basliklar.Authorization || '';
  if (!dogrula(parolaCoz(ham), hashSatiri)) {
    /* yayinla.js ile aynı disiplin: sabit gecikme, genel mesaj — hangi
       parçanın yanlış olduğu söylenmez, süreyle de ayırt edilmez. */
    await dur(SABIT_GECIKME_MS);
    console.log(simdi(), 'panel: giris reddedildi');
    return {
      statusCode: 401,
      headers: Object.assign({}, H, {
        'www-authenticate': ALAN,
        'content-type': 'text/plain; charset=utf-8'
      }),
      body: 'giris gerekli'
    };
  }

  /* `?veri=1` → panel varsayilan icerigi (kokteki content.json). Kapinin
     ARDINDA: buraya ancak parola dogrulandiktan sonra gelinir. */
  const q = (event && event.queryStringParameters) || {};
  if (q.veri === '1') {
    const iy = icerikYolu();
    if (!iy) {
      console.log(simdi(), 'panel: content.json paketde bulunamadi (included_files?)');
      return { statusCode: 503, headers: H, body: 'icerik yok' };
    }
    console.log(simdi(), 'panel: icerik servis edildi');
    return {
      statusCode: 200,
      headers: Object.assign({}, H, { 'content-type': 'application/json; charset=utf-8' }),
      body: fs.readFileSync(iy, 'utf8')
    };
  }

  /* `?kayit=<slug>&kol=<ad>` → TEK kayit (Tur 2 · B7). Panel bir kaydi
     ACINCA buraya gelir. slug ve kol istemciden gelir: kol sozlesmede
     olmali, slug yayinla.js ile AYNI kalipta — `../content` gibi bir
     deger klasorun disina cikamaz. Govde dosyanin kendisi (ayristirilip
     yeniden yazilmaz), yani panelin TEMEL'i diskteki halle birebir. */
  if (q.kayit !== undefined) {
    const K = dosyaKoleksiyonlari().find(k => k.ad === q.kol);
    const slug = String(q.kayit || '');
    if (!K || !SLUG_BICIMI.test(slug)) {
      console.log(simdi(), 'panel: gecersiz kayit istegi reddedildi');
      return { statusCode: 400, headers: H, body: 'gecersiz kayit' };
    }
    const d = dizinYolu(K.klasor);
    const y = d && path.join(d, slug + '.json');
    if (!y || !fs.existsSync(y)) return { statusCode: 404, headers: H, body: 'kayit yok' };
    return {
      statusCode: 200,
      headers: Object.assign({}, H, { 'content-type': 'application/json; charset=utf-8' }),
      body: fs.readFileSync(y, 'utf8')
    };
  }

  /* `?dizin=1` → panelin ACILIS ucu (Tur 2 · B7): sozlesme + kayit
     basina yalniz ozet. `?kayitlar=1` → butun kayitlar; panel onu
     artik yalniz kullanici butunu istediginde cagirir (disa/ice aktar).
     Ikisi de ayni kapinin ardinda; content.json'dan AYRI cunku buyuyen
     kisim burasi. */
  if (q.dizin === '1' || q.kayitlar === '1') {
    const dizinMi = q.dizin === '1';
    const { koleksiyon, cikti, toplam, bulunan } = koleksiyonlariOku(dizinMi ? ozetle : null);
    /* HICBIR KLASOR COZULMEDIYSE paketleme eksiktir (`included_files`).
       Bos dizi donmek TEHLIKELI olurdu: panel "hic yazi yok" gosterir,
       Enes bir sey ekleyip yayinlar ve gercekte var olan yazilar
       panelde gorunmedigi icin sessizce geride kalir. Bos bir
       koleksiyon (nedir/haber) ise NORMAL — o yuzden olcut "hicbiri
       cozulmedi", "biri bos" degil. `.gitkeep` bazi glob'larda
       eslesmedigi icin bos klasor pakete hic girmeyebilir; bu olcut o
       durumu yanlis kirmizi saymaz. */
    if (koleksiyon.length && bulunan === 0) {
      console.log(simdi(), 'panel: kayit klasorleri paketde bulunamadi (included_files?)');
      return { statusCode: 503, headers: H, body: 'kayitlar yok' };
    }
    console.log(simdi(), 'panel: ' + (dizinMi ? 'dizin' : 'kayitlar') + ' servis edildi ·', toplam, '·', bulunan + '/' + koleksiyon.length, 'klasor');
    return {
      statusCode: 200,
      headers: Object.assign({}, H, { 'content-type': 'application/json; charset=utf-8' }),
      body: JSON.stringify(dizinMi ? { koleksiyon, dizin: cikti } : { koleksiyon, kayitlar: cikti })
    };
  }

  const yol = panelYolu();
  if (!yol) {
    /* Paketleme eksikse panel SERVİS EDİLMEZ. Yarım/boş sayfa dönmek,
       "panel bozuk mu yoksa kapı mı" sorusunu belirsiz bırakırdı. */
    console.log(simdi(), 'panel: govde paketde bulunamadi (included_files?)');
    return { statusCode: 503, headers: H, body: 'panel govdesi yok' };
  }

  console.log(simdi(), 'panel: giris kabul edildi');
  return {
    statusCode: 200,
    headers: Object.assign({}, H, { 'content-type': 'text/html; charset=utf-8' }),
    body: fs.readFileSync(yol, 'utf8')
  };
};

exports.parolaCoz = parolaCoz;     /* test: biçim çözümünü izole ölçmek için */
exports.panelYolu = panelYolu;
exports.ozetle = ozetle;           /* test: dizin ozetinin bicimi tek yerde */
