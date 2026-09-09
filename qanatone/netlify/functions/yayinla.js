/* netlify/functions/yayinla.js
   ---------------------------------------------------------------------
   Panelin "Yayınla" düğmesi buraya düşer: gövdedeki content.json'ı
   doğrudan GitHub'a commit eder. Netlify Identity KULLANILMAZ — giriş
   kararı tek parola: PANEL_PAROLA_HASH ortam değişkeninde "tuz:hash"
   biçiminde scrypt çıktısı durur (üretici: netlify/parola-hash.js).
   Tam biçim: 32 hex tuz + ':' + 128 hex hash (scrypt, keylen 64, Node
   varsayılanları N=16384 r=8 p=1) — toplam 161 karakter. Aynı değeri
   panel kapısı da (netlify/functions/panel.js) kullanır; tek sır.

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
const fs = require('fs');
const path = require('path');

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

/* Saklanan değerin TEK geçerli biçimi — netlify/parola-hash.js'in
   ürettiği biçim: 32 hex tuz + ':' + 128 hex (64 baytlık scrypt çıktısı).
   Tuz ayrı bir değişkende DEĞİL, aynı satırda gömülü; ilk ':' böler.
   2026-08 BULUNDU: keylen saklanan hash'in UZUNLUĞUNDAN türetiliyordu
   (`beklenen.length || 64`). scrypt'in son adımı 1 turluk PBKDF2'dir,
   yani kısa keylen çıktısı uzun keylen çıktısının İLK BAYTLARIDIR.
   Ortam değişkenine kırpık bir hash düşerse (yapıştırırken satır
   kesildi, kopya eksik alındı) doğrulama sessizce ilk N bayta iniyor,
   hata da 401 de vermiyor — kabul ediyordu. Üretimde hiçbir belirti
   ele vermez. Biçim artık ÖNCE ölçülüyor, keylen sabit.
   trim(): Netlify arayüzünden yapıştırılan değer sonuna satır sonu
   alabiliyor; bu güvenliği etkilemeyen tek toleransımız.            */
const HASH_BICIMI = /^[0-9a-f]{32}:[0-9a-f]{128}$/i;
const KEYLEN = 64;

const dur = ms => new Promise(r => setTimeout(r, ms));
const simdi = () => new Date().toISOString();

/* "salt:hash" (hex) ile gelen parolayı zamanlama sızıntısız karşılaştırır. */
function dogrula(parola, hashSatiri) {
  if (typeof parola !== 'string' || !parola || !hashSatiri) return false;
  const satir = String(hashSatiri).trim();
  if (!HASH_BICIMI.test(satir)) return false;
  const ayrac = satir.indexOf(':');
  const salt = satir.slice(0, ayrac);
  const beklenenHex = satir.slice(ayrac + 1);
  let beklenen, uretilen;
  try {
    beklenen = Buffer.from(beklenenHex, 'hex');
    uretilen = crypto.scryptSync(parola, salt, KEYLEN);
  } catch (e) { return false; }
  if (uretilen.length !== beklenen.length) return false;
  return crypto.timingSafeEqual(uretilen, beklenen);
}

/* GitHub adaptörü — gerçek ağ çağrısı yalnız burada.

   KADEME 2 (9 Eyl 2026): ARTIK COK DOSYA, TEK COMMIT.
   Onceden Contents API ile TEK dosya yaziliyordu (`content.json`) ve
   panel her yayinda BUTUN icerigi gonderiyordu. Yazilar dosya basina
   kayda ayrilinca bir yayin birden cok dosyaya dokunabiliyor: degisen
   yazilar + silinenler + (degistiyse) content.json. Contents API'de her
   dosya AYRI commit demek — yarim uygulanmis bir yayin (bir dosya gitti,
   oteki gitmedi) siteyi tutarsiz birakirdi. Git Data API tek agac ve tek
   commit uretir: ya hepsi ya hicbiri.

   Adimlar: ref -> commit -> agac(base_tree) -> yeni commit -> ref guncelle.
   Silme, agac girdisinde `sha: null` ile bildirilir.
   `mode: '100644'` duz dosya; blob'lar utf-8 gonderiliyor (base64
   sarmalamaya gerek yok, API `encoding` alanini kabul ediyor). */
async function githubCommit({ token, repo, branch, dosyalar, mesaj }) {
  const api = 'https://api.github.com/repos/' + repo;
  const baslik = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'qanatone-panel',
    'Content-Type': 'application/json'
  };
  const cagir = async (yol, secenek) => {
    const r = await fetch(api + yol, Object.assign({ headers: baslik }, secenek || {}));
    if (!r.ok) throw new Error('github ' + yol + ' -> ' + r.status);
    return r.json();
  };

  const ref = await cagir('/git/ref/heads/' + branch);
  const commitSha = ref.object.sha;
  const commit = await cagir('/git/commits/' + commitSha);

  const agac = [];
  for (const d of dosyalar) {
    if (d.icerik === null) { agac.push({ path: d.yol, mode: '100644', type: 'blob', sha: null }); continue; }
    const blob = await cagir('/git/blobs', {
      method: 'POST',
      body: JSON.stringify({ content: d.icerik, encoding: 'utf-8' })
    });
    agac.push({ path: d.yol, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const yeniAgac = await cagir('/git/trees', {
    method: 'POST',
    body: JSON.stringify({ base_tree: commit.tree.sha, tree: agac })
  });
  const yeniCommit = await cagir('/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message: mesaj, tree: yeniAgac.sha, parents: [commitSha] })
  });
  await cagir('/git/refs/heads/' + branch, {
    method: 'PATCH',
    body: JSON.stringify({ sha: yeniCommit.sha })
  });
  return { commit: yeniCommit.sha, dosya: dosyalar.length };
}

/* YOL GUVENLIGI — `klasor` ve `slug` ISTEMCIDEN gelir.
   Kapi paroladan geciyor diye serbest birakilamaz: hatali bir panel
   surumu ya da ele gecmis bir oturum depoda BASKA bir dosyayi
   ezebilirdi (`../../netlify.toml` gibi). Iki kat suzgec:
     · klasor SOZLESMEDE tanimli olmali (`sayfalar.json` -> depo:"dosya")
     · slug yalniz kucuk harf, rakam ve tire
   Sozlesme fonksiyon paketinden okunur; okunamazsa kayit yazma KAPALI
   (varsayilan kapali, varsayilan acik degil). */
const SLUG_BICIMI = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function izinliKlasorler() {
  const adaylar = [
    process.env.LAMBDA_TASK_ROOT && path.join(process.env.LAMBDA_TASK_ROOT, 'yeni', 'src', 'veri', 'sayfalar.json'),
    path.join(process.cwd(), 'yeni', 'src', 'veri', 'sayfalar.json'),
    path.join(__dirname, '..', '..', 'yeni', 'src', 'veri', 'sayfalar.json')
  ].filter(Boolean);
  for (const a of adaylar) {
    try {
      return JSON.parse(fs.readFileSync(a, 'utf8')).koleksiyon
        .filter(k => k.depo === 'dosya').map(k => k.klasor);
    } catch (e) {}
  }
  return null;
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
    /* Biçim bozuksa 401 DEĞİL 503: 401, "parolan yanlış" demektir ve
       Enes doğru parolayı yazmaya devam eder — teşhis edilemeyen bir
       kilitlenme. 503 + bu log satırı, sorunun ortam değişkeninde
       olduğunu tek bakışta söyler. Değerin kendisi loglanmaz.        */
    if (!HASH_BICIMI.test(String(hashSatiri).trim())) {
      console.log(simdi(), 'yayinla: PANEL_PAROLA_HASH bicimi beklenen kalibi tutmuyor (32 hex + : + 128 hex), fonksiyon kapali');
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

    /* KADEME 2: govdede content.json'un YANINDA degisen kayit dosyalari
       ve silinenler gelir. Ikisi de istege bagli — yalniz `content`
       gonderen eski bir panel surumu de calisir. */
    const dosyalar = [{
      yol: DOSYA_YOLU,
      icerik: JSON.stringify(govde.content, null, 2)
    }];
    const kayitlar = Array.isArray(govde.kayitlar) ? govde.kayitlar : [];
    const silinen = Array.isArray(govde.silinen) ? govde.silinen : [];
    if (kayitlar.length || silinen.length) {
      const izinli = izinliKlasorler();
      if (!izinli) {
        console.log(simdi(), 'yayinla: sozlesme okunamadi, kayit yazma kapali');
        return { statusCode: 503, body: JSON.stringify({ ok: false, reason: 'kapali' }) };
      }
      for (const k of kayitlar.concat(silinen)) {
        if (!k || !izinli.includes(String(k.klasor)) || !SLUG_BICIMI.test(String(k.slug || ''))) {
          console.log(simdi(), 'yayinla: gecersiz kayit yolu reddedildi');
          return { statusCode: 400, body: JSON.stringify({ ok: false, reason: 'gecersiz kayit yolu' }) };
        }
      }
      for (const k of kayitlar)
        dosyalar.push({
          yol: TEMEL_DIZIN + '/' + k.klasor + '/' + k.slug + '.json',
          icerik: JSON.stringify(k.kayit, null, 2) + '\n'
        });
      for (const k of silinen)
        dosyalar.push({ yol: TEMEL_DIZIN + '/' + k.klasor + '/' + k.slug + '.json', icerik: null });
    }

    try {
      await adaptor({
        token: process.env.GITHUB_TOKEN,
        repo: REPO,
        branch: BRANCH,
        dosyalar,
        mesaj: dosyalar.length === 1
          ? 'panel: content.json güncellendi'
          : 'panel: ' + dosyalar.length + ' dosya güncellendi'
      });
    } catch (e) {
      console.log(simdi(), 'yayinla: commit basarisiz');
      return { statusCode: 502, body: JSON.stringify({ ok: false, reason: 'commit basarisiz' }) };
    }

    console.log(simdi(), 'yayinla: kabul edildi, commit atildi ·', dosyalar.length, 'dosya');
    return { statusCode: 200, body: JSON.stringify({ ok: true, dosya: dosyalar.length }) };
  };
}

exports.handler = handlerOlustur(githubCommit);
exports.handlerOlustur = handlerOlustur;   // test: sahte adaptörle çağırmak için
exports.dogrula = dogrula;                 // test: parola doğrulamasını izole ölçmek için
exports.githubCommit = githubCommit;
exports.REPO = REPO;
exports.DOSYA_YOLU = DOSYA_YOLU;
