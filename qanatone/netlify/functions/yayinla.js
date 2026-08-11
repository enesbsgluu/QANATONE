/* netlify/functions/yayinla.js
   ---------------------------------------------------------------------
   Panelin "Yayınla" düğmesi buraya düşer: gövdedeki content.json'ı
   doğrudan GitHub'a commit eder. Netlify Identity KULLANILMAZ — giriş
   kararı tek parola: PANEL_PAROLA_HASH ortam değişkeninde "salt:hash"
   biçiminde scrypt çıktısı durur (üretici: netlify/parola-hash.js).

   ÇALIŞMASI İÇİN GEREKENLER — Netlify > Site settings > Environment variables:
     PANEL_PAROLA_HASH   "salt:hash" (parola-hash.js YEREL üretir, buraya yapıştırılır)
     GITHUB_TOKEN        content.json'a yazma izni olan GitHub PAT (Contents API)

   GÜVENLİK
     - Parola scryptSync + timingSafeEqual ile karşılaştırılır — string
       eşitliği (===) zamanlama farkıyla parolayı harf harf sızdırabilir.
     - Yanlış parola → genel 401 (hangi parçanın yanlış olduğu söylenmez)
       + ~300ms sabit gecikme; doğru/yanlış yanıt süresiyle ayırt edilmesin.
     - PANEL_PAROLA_HASH tanımsızsa fonksiyon 503 ile KAPALI davranır —
       varsayılan kapalı, varsayılan açık değil.
     - Parola, hash ve GITHUB_TOKEN hiçbir koşulda loglanmaz, yanıt
       gövdesine ya da hata mesajına yazılmaz. Log satırları yalnız
       sonucu (kabul/red) ve zamanı taşır.
     - GitHub çağrısı ayrı bir adaptör fonksiyonundan (githubCommit) geçer;
       test bunu sahte bir adaptörle değiştirip ağa hiç çıkmadan koşar.
   --------------------------------------------------------------------- */
'use strict';

const crypto = require('crypto');

const REPO = 'enesbsgluu/QANATONE';
const BRANCH = 'main';
/* GitHub Contents API yolu HER ZAMAN depo KÖKÜNE göredir — Netlify
   arayüzündeki "Base directory" ayarını (bu sitede: qanatone) BİLMEZ.
   build.js ise kendi __dirname'inden okur; Netlify o çalışmayı base
   directory'nin İÇİNDE başlatır. İkisi aynı __dirname'i paylaşmadığı
   için TEMEL_DIZIN burada AÇIKÇA yazılıyor ve DOSYA_YOLU ondan türüyor.
   2026-08 BULUNDU: burada 'content.json' yazıyordu (depo köküne), build.js
   qanatone/content.json okuyordu — panel 200 dönüyor, commit atılıyor,
   derleme yeşil bitiyordu ama site hiç değişmiyordu (yanlış yeşil).
   test/denetim.js 'yayinla yazdığı yol = build.js okuduğu yol' kuralı
   TEMEL_DIZIN'i gerçek git deposuna karşı doğrular — buradaki değer
   yanlışsa (ör. depo yeniden düzenlenirse) derleme kırmızı yanar. */
const TEMEL_DIZIN = 'qanatone';
const DOSYA_YOLU = TEMEL_DIZIN + '/content.json';
const SABIT_GECIKME_MS = 300;

const dur = ms => new Promise(r => setTimeout(r, ms));
const simdi = () => new Date().toISOString();

/* "salt:hash" (hex) ile gelen parolayı zamanlama sızıntısız karşılaştırır. */
function dogrula(parola, hashSatiri) {
  if (typeof parola !== 'string' || !parola || !hashSatiri) return false;
  const ayrac = String(hashSatiri).indexOf(':');
  if (ayrac < 0) return false;
  const salt = hashSatiri.slice(0, ayrac);
  const beklenenHex = hashSatiri.slice(ayrac + 1);
  let beklenen, uretilen;
  try {
    beklenen = Buffer.from(beklenenHex, 'hex');
    uretilen = crypto.scryptSync(parola, salt, beklenen.length || 64);
  } catch (e) { return false; }
  if (uretilen.length !== beklenen.length) return false;
  return crypto.timingSafeEqual(uretilen, beklenen);
}

/* GitHub Contents API adaptörü — gerçek ağ çağrısı yalnız burada. */
async function githubCommit({ token, repo, branch, yol, icerik, mesaj }) {
  const api = 'https://api.github.com/repos/' + repo + '/contents/' + yol;
  const baslik = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'qanatone-panel'
  };
  const mevcut = await fetch(api + '?ref=' + branch, { headers: baslik });
  let sha;
  if (mevcut.status === 200) sha = (await mevcut.json()).sha;
  else if (mevcut.status !== 404) throw new Error('github okuma basarisiz: ' + mevcut.status);

  const govde = {
    message: mesaj,
    content: Buffer.from(icerik, 'utf8').toString('base64'),
    branch
  };
  if (sha) govde.sha = sha;

  const r = await fetch(api, {
    method: 'PUT',
    headers: Object.assign({ 'Content-Type': 'application/json' }, baslik),
    body: JSON.stringify(govde)
  });
  if (!r.ok) throw new Error('github yazma basarisiz: ' + r.status);
  return r.json();
}

/* Handler'ı bir adaptörle inşa eder — testler sahte adaptörle çağırır,
   Netlify çalışma zamanı gerçek githubCommit ile. */
function handlerOlustur(adaptor) {
  return async function handler(event) {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ ok: false, reason: 'yalniz POST' }) };
    }

    const hashSatiri = process.env.PANEL_PAROLA_HASH;
    if (!hashSatiri) {
      console.log(simdi(), 'yayinla: PANEL_PAROLA_HASH tanimli degil, fonksiyon kapali');
      return { statusCode: 503, body: JSON.stringify({ ok: false, reason: 'kapali' }) };
    }

    let govde;
    try { govde = JSON.parse(event.body || '{}'); }
    catch (e) { return { statusCode: 400, body: JSON.stringify({ ok: false, reason: 'gecersiz govde' }) }; }

    const gecerli = dogrula(govde.parola, hashSatiri);
    if (!gecerli) {
      await dur(SABIT_GECIKME_MS);
      console.log(simdi(), 'yayinla: giris reddedildi');
      return { statusCode: 401, body: JSON.stringify({ ok: false, reason: 'giris reddedildi' }) };
    }

    if (!govde.content || typeof govde.content !== 'object') {
      console.log(simdi(), 'yayinla: giris kabul, icerik eksik');
      return { statusCode: 400, body: JSON.stringify({ ok: false, reason: 'icerik eksik' }) };
    }

    try {
      await adaptor({
        token: process.env.GITHUB_TOKEN,
        repo: REPO,
        branch: BRANCH,
        yol: DOSYA_YOLU,
        icerik: JSON.stringify(govde.content, null, 2),
        mesaj: 'panel: content.json güncellendi'
      });
    } catch (e) {
      console.log(simdi(), 'yayinla: commit basarisiz');
      return { statusCode: 502, body: JSON.stringify({ ok: false, reason: 'commit basarisiz' }) };
    }

    console.log(simdi(), 'yayinla: kabul edildi, commit atildi');
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  };
}

exports.handler = handlerOlustur(githubCommit);
exports.handlerOlustur = handlerOlustur;   // test: sahte adaptörle çağırmak için
exports.dogrula = dogrula;                 // test: parola doğrulamasını izole ölçmek için
exports.githubCommit = githubCommit;
exports.REPO = REPO;
exports.DOSYA_YOLU = DOSYA_YOLU;
