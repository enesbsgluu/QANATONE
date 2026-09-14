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
      body: JSON.stringify({ content: d.icerik, encoding: d.kodlama === 'base64' ? 'base64' : 'utf-8' })
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
/* OZET ISARETI (Tur 2 · B7, 10 Eyl 2026). Panel buyuyen koleksiyonlari
   acilista DIZINDEN yukler; henuz acilmamis kayit panelde yalniz
   slug/tarih/baslik tasiyan bir OZET olarak durur ve bu isareti tasir.
   Ozet bir kayit dosyasinin yerine yazilirsa yazinin govdesi SESSIZCE
   silinir. Panel ozeti gondermez (kayitFarki atlar); bu ikinci kilit. */
const OZET_ISARETI = '_ozet';
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

/* GORSELLER DOSYAYA (14 Eyl 2026).
   Panelin gorsel alani dosyayi `data:image/...;base64,` olarak icerige
   gomuyordu. Derleme hatti ise gorseli DISKTE bir dosya olarak bekliyor
   (gorsel-uret.cjs varyant uretir, G1/G2 dosyayi arar): gomulu gorsel ya
   bozuk basiliyor ya deploy'u dusuruyordu. Burada her gomulu gorsel ayri
   bir dosya olarak commit edilir, icerikte yalniz yolu kalir.
     · ad icerikten turer (sha1) — ayni gorsel iki kez yuklense tek dosya
     · bayt imzasi beyan edilen tiple ortusmeli; SVG kabul edilmez (betik
       tasiyabilir)
     · `eslesme`: panel yayindan sonra kendi taslagindaki data URL'leri bu
       yollarla degistirir, gorsel her yayinda yeniden gonderilmez */
const GORSEL_DIZIN = 'img/yuklenen';
const GORSEL_TAVAN = 8 * 1024 * 1024;
const GORSEL_TIP = { png: 'png', jpeg: 'jpg', jpg: 'jpg', webp: 'webp', gif: 'gif', avif: 'avif' };
function imzaTutar(tip, b) {
  const h = (i, s) => b.slice(i, i + s.length).toString('latin1') === s;
  if (tip === 'png') return h(0, '\x89PNG');
  if (tip === 'jpg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (tip === 'webp') return h(0, 'RIFF') && h(8, 'WEBP');
  if (tip === 'gif') return h(0, 'GIF8');
  if (tip === 'avif') return h(4, 'ftyp');
  return false;
}
const gorselAnahtari = (v) => v.length + '|' + v.slice(v.length >> 1, (v.length >> 1) + 24) + '|' + v.slice(-24);
function gorselleriCikar({ content, kayitlar }) {
  const dosyalar = [], eslesme = {}, yazilan = new Set();
  let hata = null;
  const cevir = (v) => {
    const m = /^data:image\/([a-z0-9.+-]+);base64,([A-Za-z0-9+/]+=*)$/i.exec(v);
    const tip = m && GORSEL_TIP[m[1].toLowerCase()];
    if (!tip) { hata = hata || 'desteklenmeyen gomulu veri (yalniz png/jpg/webp/gif/avif)'; return v; }
    const b = Buffer.from(m[2], 'base64');
    if (b.length > GORSEL_TAVAN) { hata = hata || 'gorsel 8 MB sinirini asiyor'; return v; }
    if (!imzaTutar(tip, b)) { hata = hata || 'gorselin baytlari ' + tip + ' degil'; return v; }
    const yol = GORSEL_DIZIN + '/' + crypto.createHash('sha1').update(b).digest('hex').slice(0, 16) + '.' + tip;
    if (!yazilan.has(yol)) { yazilan.add(yol); dosyalar.push({ yol: TEMEL_DIZIN + '/' + yol, icerik: m[2], kodlama: 'base64' }); }
    eslesme[gorselAnahtari(v)] = yol;
    return yol;
  };
  const gez = (o) => {
    if (typeof o === 'string') return o.startsWith('data:') ? cevir(o) : o;
    if (Array.isArray(o)) return o.map(gez);
    if (o && typeof o === 'object') { const c = {}; for (const k of Object.keys(o)) c[k] = gez(o[k]); return c; }
    return o;
  };
  const yeniIcerik = gez(content);
  const yeniKayitlar = (kayitlar || []).map((k) => (k && k.kayit ? Object.assign({}, k, { kayit: gez(k.kayit) }) : k));
  return { content: yeniIcerik, kayitlar: yeniKayitlar, dosyalar, eslesme, hata };
}

/* ICERIK SOZLESMESI (14 Eyl 2026). Derlemenin DUZELTEMEDIGI icerik
   eksikleri deploy'u dusuruyordu ve Enes bunu yalniz Netlify'da kirmizi
   bir satir olarak goruyordu. Burada, commit'ten ONCE, alan adiyla ve
   Turkce reddedilir; panel gerekceyi gosterir. Derlemenin KENDISININ
   duzelttigi seyler (uzun baslik, bos giris, egik cizgisiz ic bag) burada
   sorulmaz — onlar icin yazar kural bilmek zorunda degil.
     · slug bicimsizse addan/basliktan TURETILIR (Turkce harf cevrilir) — red degil
     · proje: ad + etiket TR/EN + kisa anlatim TR/EN; kayit: baslik TR/EN +
       giris TR/EN. EN bossa EN sayfasi TR'nin kopyasi olur (S4) — red
     · baslik tekrari: iki yazi ayni basligi tasirsa (S4) — red */
const TR_HARF = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
                  'Ç': 'c', 'Ğ': 'g', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
const sluglastir = (s) => String(s || '').replace(/[çğıİöşüÇĞÖŞÜ]/g, (h) => TR_HARF[h])
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');
const metin = (v, dil) => String(typeof v === 'string' ? v : (v && typeof v[dil] === 'string' ? v[dil] : '')).trim();
const ikiDil = (v) => !!(v && typeof v === 'object' && metin(v, 'tr') && metin(v, 'en'));
function mevcutKayitlar() {
  const kok = [process.env.LAMBDA_TASK_ROOT, process.cwd(), path.join(__dirname, '..', '..')]
    .filter(Boolean).find((k) => fs.existsSync(path.join(k, 'icerik')));
  const m = new Map();
  if (!kok) return m;
  for (const kl of (izinliKlasorler() || [])) {
    const d = path.join(kok, kl);
    if (!fs.existsSync(d)) continue;
    for (const a of fs.readdirSync(d).filter((x) => x.endsWith('.json'))) {
      try { m.set(kl + '/' + a.slice(0, -5), JSON.parse(fs.readFileSync(path.join(d, a), 'utf8'))); } catch (e) {}
    }
  }
  return m;
}
function icerikSozlesmesi(content, kayitlar, mevcut) {
  const sorun = [];
  const gorulen = new Set();
  for (const p of (Array.isArray(content && content.projects) ? content.projects : [])) {
    if (!p || typeof p !== 'object') continue;
    const ad = metin(p.name, 'tr');
    let s = SLUG_BICIMI.test(String(p.slug || '')) ? p.slug : sluglastir(p.slug || ad);
    if (!s) { sorun.push('adi ve adresi bos bir proje var'); continue; }
    for (let n = 2, s0 = s; gorulen.has(s); n++) s = s0 + '-' + n;
    gorulen.add(s); p.slug = s;
    const kim = '"' + (ad || s) + '" projesi';
    if (!ad) sorun.push(kim + ': ad bos');
    if (!ikiDil(p.tag)) sorun.push(kim + ': etiket TR ve EN dolu olmali');
    else if (metin(p.tag, 'tr') === metin(p.tag, 'en')) sorun.push(kim + ': etiket TR ve EN ayni — EN\'yi Ingilizce yaz (sayfa basligi kopya olur)');
    if (!ikiDil(p.text)) sorun.push(kim + ': kisa anlatim TR ve EN dolu olmali');
    else if (metin(p.text, 'tr') === metin(p.text, 'en')) sorun.push(kim + ': kisa anlatim TR ve EN ayni');
    /* sayfa basligi (ad · etiket) ve aciklamasi (kisa anlatim) projeler arasi benzersiz (S4) */
    for (const d of ['tr', 'en']) for (const [ne, deger] of [['baslik', ad + ' · ' + metin(p.tag, d)], ['kisa anlatim', metin(p.text, d)]]) {
      const k = 'p|' + d + '|' + ne + '|' + deger.toLowerCase();
      if (!metin(p.tag, d) || !metin(p.text, d)) continue;
      if (gorulen.has(k)) sorun.push(kim + ': ' + d.toUpperCase() + ' ' + ne + ' baska bir projeyle ayni');
      gorulen.add(k);
    }
  }
  const yazilan = (kayitlar || []).filter((k) => k && k.kayit && typeof k.kayit === 'object' && !k.kayit[OZET_ISARETI]);
  for (const k of yazilan) {
    const s = SLUG_BICIMI.test(String(k.slug || '')) ? k.slug : sluglastir(k.slug || metin(k.kayit.title, 'tr'));
    k.slug = s; k.kayit.slug = s;
  }
  const baslik = new Map();
  const kimlik = (k) => k.klasor + '/' + k.slug;
  const yazilanId = new Set(yazilan.map(kimlik));
  /* sayfa basligi yaziBas() (icerik.ts) ile 60 karakterde kisalir; tekrar da
     KISALMIS halde aranir — ayni onekli iki uzun baslik kisalinca carpisir (S4) */
  const kisa = (t) => { if (t.length <= 60) return t; const q = t.slice(0, 60); return q.slice(0, Math.max(q.lastIndexOf(' '), 30)).trimEnd() + '…'; };
  const bk = (v, d) => kisa(metin(v, d)).toLowerCase();
  for (const [id, r] of (mevcut || new Map()))
    if (!yazilanId.has(id)) for (const d of ['tr', 'en']) if (bk(r.title, d)) baslik.set(d + '|' + bk(r.title, d), id);
  for (const k of yazilan) {
    const r = k.kayit, ad = metin(r.title, 'tr') || k.slug, kim = '"' + ad + '" yazisi';
    if (!k.slug) { sorun.push('basligi ve adresi bos bir yazi var'); continue; }
    if (!ikiDil(r.title)) sorun.push(kim + ': baslik TR ve EN dolu olmali');
    else if (bk(r.title, 'tr') === bk(r.title, 'en')) sorun.push(kim + ': baslik TR ve EN ayni — EN\'yi Ingilizce yaz');
    if (!ikiDil(r.lede)) sorun.push(kim + ': giris cumlesi TR ve EN dolu olmali');
    else if (metin(r.lede, 'tr') === metin(r.lede, 'en')) sorun.push(kim + ': giris cumlesi TR ve EN ayni');
    for (const d of ['tr', 'en']) {
      const t = bk(r.title, d);
      if (!t) continue;
      /* yalniz bu yayinin DEGISTIRDIGI baslik sorulur: onceden duran bir
         durum ilgisiz bir duzenlemeyi kilitlemesin (duran hal zaten derlendi) */
      const once = mevcut && mevcut.get(kimlik(k));
      if (once && bk(once.title, d) === t) { baslik.set(d + '|' + t, kimlik(k)); continue; }
      const var_ = baslik.get(d + '|' + t);
      if (var_ && var_ !== kimlik(k)) sorun.push(kim + ': ayni ' + d.toUpperCase() + ' baslik baska bir yazida da var');
      else baslik.set(d + '|' + t, kimlik(k));
    }
  }
  return sorun;
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
    /* SON SATIR SONU: panel eskiden `content.json`u satir sonsuz
       yaziyordu, depodaki hali ve `icerik-ayir.cjs` ise satir sonuyla —
       her panel yayini icerik degismese bile TEK SATIRLIK sahte bir diff
       uretiyordu (9 Eyl 2026'da `eed7ba4` tam olarak buydu: bos bir
       yayin, tek fark dosya sonu). Iki taraf da artik satir sonuyla
       yaziyor; kayit dosyalari da oyle. */
    /* GORSELLER DOSYAYA: gomulu gorseller ayri dosya olur (gorselleriCikar). */
    const gc = gorselleriCikar({ content: govde.content,
      kayitlar: Array.isArray(govde.kayitlar) ? govde.kayitlar : [] });
    if (gc.hata) {
      console.log(simdi(), 'yayinla: gorsel reddedildi');
      return { statusCode: 400, body: JSON.stringify({ ok: false, reason: gc.hata }) };
    }
    const sorunlar = icerikSozlesmesi(gc.content, gc.kayitlar, mevcutKayitlar());
    if (sorunlar.length) {
      console.log(simdi(), 'yayinla: icerik sozlesmesi reddetti ·', sorunlar.length, 'sorun');
      return { statusCode: 400, body: JSON.stringify({ ok: false, sorunlar,
        reason: sorunlar.slice(0, 3).join(' · ') + (sorunlar.length > 3 ? ' (+' + (sorunlar.length - 3) + ')' : '') }) };
    }
    const dosyalar = [{
      yol: DOSYA_YOLU,
      icerik: JSON.stringify(gc.content, null, 2) + '\n'
    }];
    for (const d of gc.dosyalar) dosyalar.push(d);
    const kayitlar = gc.kayitlar;
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
      for (const k of kayitlar) {
        if (k.kayit && typeof k.kayit === 'object' && k.kayit[OZET_ISARETI]) {
          console.log(simdi(), 'yayinla: ozet kayit reddedildi (govdesi yok)');
          return { statusCode: 400, body: JSON.stringify({ ok: false, reason: 'ozet kayit yazilamaz' }) };
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
    return { statusCode: 200, body: JSON.stringify({ ok: true, dosya: dosyalar.length, gorseller: gc.eslesme }) };
  };
}

exports.handler = handlerOlustur(githubCommit);
exports.gorselleriCikar = gorselleriCikar;   // test + fuzz: panel ciktisini yayin donusumunden gecirmek
exports.gorselAnahtari = gorselAnahtari;     // panelin taslak tazeleme anahtariyla ayni mi
exports.icerikSozlesmesi = icerikSozlesmesi; // test: mevcut icerik sozlesmeden geciyor mu
exports.sluglastir = sluglastir;
exports.handlerOlustur = handlerOlustur;   // test: sahte adaptörle çağırmak için
exports.dogrula = dogrula;                 // test: parola doğrulamasını izole ölçmek için
exports.githubCommit = githubCommit;
exports.REPO = REPO;
exports.DOSYA_YOLU = DOSYA_YOLU;
exports.SLUG_BICIMI = SLUG_BICIMI;         // panel.js `?kayit=` ayni kurali kullanir
exports.OZET_ISARETI = OZET_ISARETI;       // test: panelin isaretiyle ayni mi
