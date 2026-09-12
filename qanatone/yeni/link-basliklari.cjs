#!/usr/bin/env node
/* LINK BASLIKLARI (GECE ZINCIRI TUR 6, 2 Eyl 2026).
   ---------------------------------------------------------------------
   6 EYL 2026 — BLOK YENIDEN KURULDU. Uc sey OLCULEREK degisti; eski hali
   bu basligin altinda yaziyor ki geri donmek isteyen neden geri donmedigimizi
   gorsun.

   1) CIZGISIZ YOLLAR DUSTU — OLU IDILER. Eski surum her sayfayi iki yol
      bicimiyle yaziyordu (`/x/` ve `/x`) ve gerekcesi soyleydi: "Netlify
      dizin sayfasini ikisiyle de dogrudan sunar". BU VARSAYIM YANLIS.
      Canlidan olculdu (6 Eyl):
        GET /hizmetler/seo   -> 301 Location: /hizmetler/seo/   · Link YOK
        GET /en              -> 301 Location: /en/              · Link YOK
      Yonlendirme once calisiyor, ozel basliklar hic uygulanmiyor. Yani
      blogun TAM YARISI (64 kural, ~29 KB) hicbir yanita dokunmuyordu.
      `/index.html` OLCULDU ve 200 veriyor, o yuzden KALDI.

   2) BLOK `.md` YOLLARINA TASINDI. Asil kusur buydu: canonical ve hreflang
      HTML yollarinda duruyordu — oysa HTML sayfa o baglari ZATEN kendi
      `<head>`inde tasiyor (tekrar). `.md` dosyasi ise bagi belgede ifade
      EDEMEYEN tek yanit turu ve tam orada hicbir Link basligi yoktu:
      bir ajan `/hizmetler/seo.md`ye dustugunde alintilayacagi insan
      adresini ogrenemiyordu. Artik canonical + dil esleri ORADA.

   3) HTML tarafinda YALNIZ markdown alternatifi kaldi. Tam kaldirmadik
      cunku bu blogun varlik sebebi oydu: HTML'i hic indirmeden yalniz
      baslik okuyan (HEAD) ajan istemcileri markdown esini boyle bulur.
      Canonical/hreflang tekrari dustu; kalan tek satir ~110 B.

   ADRES FORMULU TEK YERDE (`mdAdresi`) — ve 6 Eyl'de burada CANLI BIR HATA
   bulundu: kok sayfa icin `canonical - egik cizgi + ".md"` formulu
   `https://www.qanatone.com.md` uretiyordu. `.md` Moldova'nin alan adi;
   yani ana sayfa her ajana SAHIBI OLMADIGIMIZ bir konagi gosteriyordu.
   Dogrusu `/index.md`. Uretec (ajan-hatti.mjs:288) kok dalini dogru
   yaziyordu, ilan eden iki taraf (bu dosya + Temel.astro) yazmiyordu.
   ILAN EDILEN HER ADRESIN DOSYASI DISKTE ARANIR (`varMi`): olmayan bir
   adresi ilan etmek "olcmedigin rakami yazma" kuralina girer ve bu kez
   tam da o olmustu.

   Degerler sayfanin KENDI <head>'inden okunur (ikinci bir dogruluk kaynagi
   uydurulmaz). _headers dosyasina LINK-BASLIKLARI-BAS ... LINK-BASLIKLARI-SON
   isaretleri arasina yazilir.
   Kullanim: node yeni/link-basliklari.cjs            (once: iki derleme)
             KONTROL=1 node yeni/link-basliklari.cjs  (gomulu blok taze mi? cikis kodu)
   KESME (6 Eyl 2026): kaynak yeni/public/_headers; Astro public/'i dist'e
   kendisi tasir, ayrica kopyalayan bir adim YOK. Uretimden sonra yalniz
   `npm --prefix yeni run build` gerekir. */
const fs = require('fs');
const path = require('path');
const KOK = path.join(__dirname, '..');
const DIST = path.join(KOK, 'dist');

/* MARKDOWN ESININ ADRESI — TEK FORMUL, UC TUKETICI (bu dosya, Temel.astro,
   ajan-hatti.mjs). Kok dali sart: `/` -> `/index.md`, `/x/` -> `/x.md`. */
const mdAdresi = (kanonik) => (new URL(kanonik).pathname === '/'
  ? kanonik + 'index.md'
  : kanonik.replace(/\/$/, '') + '.md');

/* Ilan edilen adres DISKTE var mi. Formulu ikinci kez yazmak yerine
   SONUCU olcuyoruz — 6 Eyl'deki hata tam olarak formulu iki yerde
   tekrarlamaktan dogmustu. */
const varMi = (mdUrl) => {
  try { return fs.existsSync(path.join(DIST, new URL(mdUrl).pathname.replace(/^\//, ''))); }
  catch (e) { return false; }
};

const sayfalar = [];
(function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(_astro|font|img|js|varlik)$/.test(e.name)) gez(p); }
    else if (e.name === 'index.html') sayfalar.push(p);
  }
})(DIST);

const satirlar = [];
let sayfaSayisi = 0, altSayisi = 0, mdYolu = 0, eksikEs = [];
for (const p of sayfalar.sort()) {
  const h = fs.readFileSync(p, 'utf8').slice(0, 6000);
  const can = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (!can) continue;
  sayfaSayisi++;

  /* `noindex` sayfaya es URETILMIYOR (ajan-hatti.mjs ayni kapsami tutuyor),
     o yuzden ne HTML tarafinda ilan edilir ne de `.md` kurali yazilir. */
  const noindex = /name="robots"[^>]*content="[^"]*noindex/i.test(h);
  if (noindex) continue;

  const md = mdAdresi(can);
  if (!varMi(md)) { eksikEs.push(md); continue; }

  const yol = '/' + path.relative(DIST, path.dirname(p)).replace(/\\/g, '/');
  const kokMu = yol === '/';

  /* --- HTML tarafi: YALNIZ markdown alternatifi ---
     Cizgisiz bicim YOK (301 verir, baslik uygulanmaz — olculdu).
     `/index.html` VAR (200 verir — olculdu). */
  const htmlYollari = kokMu ? ['/', '/index.html'] : [yol + '/'];
  for (const b of htmlYollari)
    satirlar.push(`${b}\n  Link: <${md}>; rel="alternate"; type="text/markdown"`);

  /* --- `.md` tarafi: canonical + dil esleri ---
     CANONICAL insan sayfasini gosterir: ajan `.md`ye dustugunde
     ALINTILAYACAGI adresi ogrenmeli. hreflang esleri ise OTEKI DILIN
     `.md`sini gosterir — markdown baglamindan yararli olan odur; ve
     yalnizca DISKTE VAR OLANI ilan ederiz. */
  const alt = [...h.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)]
    .map(([, dil, adres]) => ({ dil, md: mdAdresi(adres) }))
    .filter((a) => varMi(a.md));
  altSayisi += alt.length;
  const deger = [`<${can}>; rel="canonical"`]
    .concat(alt.map((a) => `<${a.md}>; rel="alternate"; hreflang="${a.dil}"`))
    .join(', ');
  satirlar.push(`${new URL(md).pathname}\n  Link: ${deger}`);
  mdYolu++;
}

/* Ilan edilecek es bulunamadiysa SESSIZ GECME: uretecin kapsami ile bu
   dosyanin kapsami ayrisiyor demektir, ve o ayrisma tam da bu turda
   duzeltilen hata sinifi. */
if (eksikEs.length) {
  console.error(`!! ${eksikEs.length} sayfanin ilan edilecek .md esi DISKTE YOK, ilki: ${eksikEs[0]}`);
  console.error('   (uretec kapsami ile bu dosyanin kapsami ayrismis — bkz. denetim T3)');
  process.exit(3);
}

const blok = satirlar.join('\n');
/* KESME (6 Eyl 2026): kaynak _headers kokten yeni/public/_headers'a tasindi —
   Astro public/'i dist'e kendisi kopyalar, build.js'in kopyalama adimi dustu. */
const H = path.join(__dirname, 'public', '_headers');
const hd = fs.readFileSync(H, 'utf8');
const BAS = '# LINK-BASLIKLARI-BAS', SON = '# LINK-BASLIKLARI-SON';
const i = hd.indexOf(BAS), j = hd.indexOf(SON);
if (i < 0 || j < 0) { console.error('_headers isaretleri yok'); process.exit(2); }
const mevcut = hd.slice(i + BAS.length, j).replace(/^\r?\n|\r?\n$/g, '');
if (process.env.KONTROL) {
  /* ALT KUME kontrolu: Netlify'da kok derleme (ve icindeki eski suite) astro
     derlemesinden ONCE kosar, o anda dist yoktur. Kural "mevcut her
     sayfanin girdisi blokta birebir var mi" diye bakar; tam esitlik ancak iki
     dist de varken saglanir (uretim modu her zaman tam yazar).
     TUR 9 (3 Eyl 2026): LINK_BIREBIR=1 ile TAM ESITLIK sart — dist
     varken (yeni/denetim.cjs L1) alt kume yetmez: silinen sayfanin satiri
     sonsuza kadar kalirdi (MIMARI M2). Eski suite dist yokken bu
     kurali artik ERTELER, alt kume dali yalniz dist varken ve
     LINK_BIREBIR verilmeden cagrilirsa kalir. */
  const m2 = mevcut.replace(/\r\n/g, '\n');
  const eksik = satirlar.filter((s2) => !m2.includes(s2));
  const birebir = !!process.env.LINK_BIREBIR;
  const taze = birebir ? m2 === blok : eksik.length === 0;
  const not = taze ? (m2 === blok ? 'blok birebir' : 'blok ust kume (dist eksik olabilir)')
    : (eksik.length === 0 ? 'blok birebir DEGIL: fazla/bayat satir var (dist varken tam esitlik sart) — node yeni/link-basliklari.cjs'
      : 'eksik/farkli ' + eksik.length + ' girdi, ilki: ' + eksik[0].split('\n')[0]);
  console.log(`LINK BASLIKLARI ${taze ? 'TAZE' : 'BAYAT'}: ${sayfaSayisi} sayfa · ${satirlar.length} yol (${mdYolu} md) · ${altSayisi} alternate · ${not}`);
  process.exit(taze ? 0 : 1);
}
const nl = hd.includes('\r\n') ? '\r\n' : '\n';
fs.writeFileSync(H, hd.slice(0, i + BAS.length) + nl + blok.replace(/\n/g, nl) + nl + hd.slice(j));
console.log(`LINK BASLIKLARI: ${sayfaSayisi} sayfa · ${satirlar.length} yol (${mdYolu} md) · ${altSayisi} alternate · _headers ${fs.statSync(H).size} B`);
