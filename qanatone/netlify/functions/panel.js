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
const { dogrula } = require('./yayinla.js');

const ALAN = 'Basic realm="QANATONE panel", charset="UTF-8"';
const SABIT_GECIKME_MS = 300;

const dur = ms => new Promise(r => setTimeout(r, ms));
const simdi = () => new Date().toISOString();

/* Panel gövdesi fonksiyon paketinin içinde; koşum ortamına göre kökü
   değişiyor (Netlify'da /var/task, yerelde depo kökü). Aday listesi
   sırayla denenir — bulunamazsa KAPALI davranılır, asla yarım sayfa
   dönülmez. */
function panelYolu() {
  const adaylar = [
    process.env.LAMBDA_TASK_ROOT && path.join(process.env.LAMBDA_TASK_ROOT, 'admin.html'),
    path.join(process.cwd(), 'admin.html'),
    path.join(__dirname, 'admin.html'),
    path.join(__dirname, '..', '..', 'admin.html')
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
