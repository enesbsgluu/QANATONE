/* AJAN HATTI — ajanların ve dil modellerinin okuyacağı türevler.
   ---------------------------------------------------------------------
   NEREDEN TÜREDİĞİ, MİMARİ KARARI (5 Eyl 2026):

   Bu dosyanın ürettiği her şey **ÇIKTIDAN** türer, kaynaktan değil. İki
   üreteç yazmak (biri HTML'i, öteki markdown'ı kaynaktan üretsin) bu
   depoda bugün ÜÇ KEZ yaşanmış bir hatanın dördüncüsü olurdu: üretici ile
   tüketici ayrışır ve kimse fark etmez (`kota`/`quota` sözlüğü, tespit
   `AD` sözlüğü, `_headers` Link bloğu). Tek renderer var — Astro — ve
   markdown onun çıktısının TÜREVİDİR. Bunun ikinci bir faydası:
   "içerik paritesi" (agent-ready C16, anti-cloaking) YAPI GEREĞİ sağlanır;
   ajana gönderdiğimiz metin, tarayıcıya gönderdiğimizin ta kendisidir.

   NEREYE BAĞLI: `astro:build:done` kancası (astro.config.mjs). Elle
   koşan bir üreteç OLMAMASI bilinçli — `link-basliklari.cjs` elle koşuyor
   ve o yüzden tazeliğini ayrı bir kural (L1) tutmak zorunda. Burada o
   borç doğmuyor: derleme neyse çıktı odur.

   BELİRLENİMCİ: sıralama sabit, zaman damgası yok. `derleme-belirlenim`
   kuralı iki derlemeyi bayt bayt karşılaştırıyor.
   --------------------------------------------------------------------- */
/* ======================================================================
   BILEREK YAPILMAYANLAR — KARAR KAYDI (Enes, 5 Eyl 2026)
   ======================================================================
   `isitagentready.com` / `agent-ready.dev` ailesi 22 kalem olcuyor
   (C1-C22). Asagidakiler UYGULANMADI ve bu bir eksiklik degil, KARAR.

   KURAL: arkasinda CALISAN BIR SEY OLMAYAN hicbir kesif dosyasi
   yayinlanmaz. Bos bir well-known dosyasi o araclarin puanini yukseltir
   ama YALANDIR — hem bu deponun "olcmedigin rakami yazma" kuralinin
   ortasina duser, hem de bir GEO ajansinin musterisine "sunu koy puanin
   artsin" demesiyle ayni sey olur. Puan urunun kendisi degil, olcusudur.

   YAPILMAYANLAR ve NEDEN:
     /.well-known/mcp.json          MCP sunucumuz YOK
     /.well-known/agent-card.json   A2A ajanimiz YOK (disariya acilan yok)
     /.well-known/ucp               genel API YOK
     /.well-known/api-catalog       (RFC 9727) genel API YOK
     /.well-known/oauth-*           (RFC 9728 / 8414) kimlik dogrulama YOK
     /auth.md                       ayni sebep
     /.well-known/acp.json          ticaret protokolu YOK, satis ucu yok
     x402 / MPP / AP2               makine odemesi YOK
     POST /ask (NLWeb)              arkasinda calisan bir uc YOK
     DNS-AID                        DNS Natro'da ve e-posta kayitlari orada;
                                    kayit eklemek Enes'in DNS kararidir,
                                    kod tarafinda karsiligi yok

   TEK GERCEK ADAY — WEB BOT AUTH (`/.well-known/
   http-message-signatures-directory`): o uc SITE icin degil BOT icindir.
   Bizim `QanatoneSiteCheck/1.0` tarayicimizin kim oldugunu imzayla
   kanitlamasini saglar; taranan siteler bizi UA tahminine bakmadan
   taniyabilir. Bu, diagnose.js'teki "KIRMIZI CIZGI — DURUST KIMLIK"
   maddesinin dogal devami: duvari asmaya calismiyoruz, gorunur olmayi
   seciyoruz. Anahtar yonetimi (uretim, dondurme, imzalama) gerektirdigi
   icin ayri bir tur; acilirsa BURAYA degil, tarayicinin yanina yazilir.

   YAPILANLAR bu dosyanin geri kalaninda: `.md` esleri · llms.txt ·
   llms-full.txt · agents.md · agent-permissions.json. Hepsinin arkasinda
   gercek icerik var; hicbiri beyan degil, TUREV.
   ====================================================================== */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

/* ---------- HTML → metin/markdown ----------
   Kapsam DAR ve BİLİNÇLİ: kendi markup'ımızı çeviriyoruz, genel amaçlı
   bir dönüştürücü değil. Genel dönüştürücü bağımlılık ister ve bu depo
   bağımlılık eklemiyor; dar çevirici ise ölçülebilir (bekçi T3 çıktıda
   etiket kalıntısı ve başlık uyumu arar). */

const VARLIK = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ', hellip: '…',
  mdash: '—', ndash: '–', laquo: '«', raquo: '»', shy: '' };
const coz = (s) => String(s)
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&([a-z]+|#\d+);/gi, (t, ad) => (ad.toLowerCase() in VARLIK ? VARLIK[ad.toLowerCase()] : t));

/* Dengeli sil: verilen açılış etiketinden kapanışına kadar olan bloğu
   çıkarır. Regex'le iç içe etiket silinemez — sayaçla yürünüyor. */
function blokSil(html, etiketRe) {
  let s = html;
  for (;;) {
    const m = etiketRe.exec(s);
    if (!m) break;
    const ad = m[1].toLowerCase();
    const acRe = new RegExp(`<${ad}\\b`, 'gi');
    const kapRe = new RegExp(`</${ad}\\s*>`, 'gi');
    let i = m.index + m[0].length, d = 1;
    while (d > 0) {
      acRe.lastIndex = i; kapRe.lastIndex = i;
      const a = acRe.exec(s), k = kapRe.exec(s);
      if (!k) { i = s.length; break; }
      if (a && a.index < k.index) { d++; i = a.index + a[0].length; }
      else { d--; i = k.index + k[0].length; }
    }
    s = s.slice(0, m.index) + s.slice(i);
    etiketRe.lastIndex = 0;
  }
  return s;
}

export function govdeyiCikar(html, kok) {
  const i = html.indexOf('<main');
  const j = html.indexOf('</main>');
  if (i < 0 || j < 0) return '';
  let m = html.slice(html.indexOf('>', i) + 1, j);

  /* SÜS VE MAKİNE PARÇALARI DÜŞER: betik, stil, svg, gölge şablonu ve
     `aria-hidden` taşıyan her şey. Sonuncusu önemli: ekran okuyucudan
     gizlenen şey ajandan da gizlenmeli — aynı sözleşme. */
  m = blokSil(m, /<(script|style|svg|template|noscript)\b[^>]*>/i);
  m = blokSil(m, /<([a-z][a-z0-9]*)\b[^>]*\baria-hidden="true"[^>]*>/i);

  const satir = [];
  /* Blok sınırlarını satır sonuna çevir, sonra etiketleri sök. */
  m = m
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h1|h2|h3|h4|h5|h6|div|section|figcaption|blockquote|dd|dt)\s*>/gi, '\n\n')
    .replace(/<(h1)\b[^>]*>/gi, '\n\n# ')
    .replace(/<(h2)\b[^>]*>/gi, '\n\n## ')
    .replace(/<(h3)\b[^>]*>/gi, '\n\n### ')
    .replace(/<(h4|h5|h6)\b[^>]*>/gi, '\n\n#### ')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    /* VURGU: bos vurgu uretilmez ve komsu metne YAPISMAZ. Ilk yazimda
       ikisi de oluyordu (cikti olculdu): bos <b> `****` birakiyordu ve
       yan yana gelen iki vurgu `*x***y**` gibi bozuk markdown uretiyordu.
       Iki yanina bosluk konuyor, bos govde atiliyor. */
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, (_, __, ic) => {
      const s = ic.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return s ? ' **' + s + '** ' : ' ';
    })
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, (_, __, ic) => {
      const s = ic.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return s ? ' *' + s + '* ' : ' ';
    })
    /* bağ: metin + adres; iç adres mutlaklaşır ki ajan tek başına izleyebilsin */
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a\s*>/gi, (t, adres, ic) => {
      const metin = ic.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!metin) return '';
      const tam = adres.startsWith('/') ? kok + adres : adres;
      return /^(https?:|mailto:|tel:)/.test(tam) ? `[${metin}](${tam})` : metin;
    })
    .replace(/<[^>]+>/g, ' ');

  /* ENTITY COZUMU ETIKET SOKUMUNDEN SONRA KOSAR ve bu bir tuzak: sayfada
     METIN olarak duran kacirilmis markup (`&lt;svg ...&gt;`) cozulunce
     yeniden ETIKETE BENZER. Panel kapisinin BOS icerik kolu yakaladi:
     ana sayfada `<svg viewBox="0 0 24` sizdi; DOLU halde yoktu, yani
     yalnizca goz ile bakan biri hic gormezdi.
     DOGRU DAVRANIS METNI SILMEK DEGIL — o metin sayfada gercekten
     goruluyor. Markdown'da anlamini korumanin yolu KACIRMAK: `\<` bir
     `<` olarak render edilir ama etiket sanilmaz. Bekci T3 kacirilmis
     olani kusur saymiyor (negatif geriye bakis). */
  for (const ham of coz(m).split('\n')) {
    const s = ham.replace(/[ \t ]+/g, ' ').replace(/</g, '\\<').trim();
    satir.push(s);
  }
  /* Boş satırları teke indir, baştaki/sondaki boşluğu at.
     AYRICA: ard arda gelen AYNI METINLI iki başlık teke iner. Kaynağı
     genişleyen kart deseni: kapalı hâlde `### Görünmezlik`, açık hâlde
     `#### Görünmezlik` — aynı başlık iki kez basılıyor (çıktı ölçüldü).
     Gövde metni ATILMAZ, yalnızca ikinci BAŞLIK satırı düşer. */
  const bosaltilmis = [];
  for (const s of satir) {
    if (!s && (!bosaltilmis.length || !bosaltilmis[bosaltilmis.length - 1])) continue;
    bosaltilmis.push(s);
  }
  const basMi = (s) => /^#{1,4} /.test(s);
  const oz = (s) => s.replace(/^#{1,4} /, '').trim().toLowerCase();
  const out = [];
  for (let i = 0; i < bosaltilmis.length; i++) {
    const s = bosaltilmis[i];
    if (basMi(s)) {
      let j = i + 1;
      while (j < bosaltilmis.length && !basMi(bosaltilmis[j])) j++;
      const arada = bosaltilmis.slice(i + 1, j).filter(Boolean).length;
      if (j < bosaltilmis.length && oz(bosaltilmis[j]) === oz(s) && arada <= 1) continue;
    }
    out.push(s);
  }
  while (out.length && !out[out.length - 1]) out.pop();
  return out.join('\n');
}

/* ---------- sayfa künyesi: başlık, açıklama, dil ---------- */
export function kunye(html) {
  const al = (re) => { const m = html.match(re); return m ? coz(m[1]).trim() : ''; };
  return {
    baslik: al(/<title[^>]*>([\s\S]*?)<\/title>/i),
    aciklama: al(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)
      || al(/<meta[^>]+content="([^"]*)"[^>]+name="description"/i),
    dil: al(/<html[^>]+lang="([^"]*)"/i) || 'tr',
    kanonik: al(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i),
    indeks: !/name="robots"[^>]*content="[^"]*noindex/i.test(html),
  };
}

/* ---------- dist gezintisi ---------- */
export function sayfalariTopla(dist) {
  const cikti = [];
  (function yuru(d) {
    for (const ad of readdirSync(d, { withFileTypes: true })) {
      const y = join(d, ad.name);
      if (ad.isDirectory()) yuru(y);
      else if (ad.name === 'index.html') cikti.push(y);
    }
  })(dist);
  return cikti.sort();
}

export const yolaCevir = (dist, dosya) => {
  const r = relative(dist, dirname(dosya)).replace(/\\/g, '/');
  return r ? '/' + r + '/' : '/';
};

/* ---------- ÜRETİM ---------- */
/* KONAK CIKTIDAN TURER, ikinci bir kaynak yazilmaz. `icerik.ts`teki KOK
   zaten her sayfanin canonical'ina akiyor; buradan onu okumak ayni tek
   kaynagi kullanmak demektir. astro.config bir .mjs ve .ts ithal edemez —
   konagi oraya elle yazmak KOK'un ikinci kopyasi olurdu (bu depoda sekiz
   kopyali `const KOK` yasanmis, hepsi sema.mjs'te tek kaynaga baglanmisti). */
function konagiBul(dist, sayfalar) {
  for (const d of sayfalar) {
    const k = kunye(readFileSync(d, 'utf8'));
    if (k.kanonik) { try { return new URL(k.kanonik).origin; } catch (e) {} }
  }
  return '';
}

export function uret(dist) {
  const sayfalar = sayfalariTopla(dist);
  const kok = konagiBul(dist, sayfalar);
  if (!kok) throw new Error('ajan-hatti: konak bulunamadi (canonical yok)');
  const kayit = [];
  for (const dosya of sayfalar) {
    const html = readFileSync(dosya, 'utf8');
    const k = kunye(html);
    const yol = yolaCevir(dist, dosya);
    const govde = govdeyiCikar(html, kok);
    kayit.push({ yol, ...k, govde });
  }

  /* 1 · .md EŞLERİ — her sayfanın yanında `index.md`.
     `/hizmetler/seo/index.md` -> `/hizmetler/seo/index.md` adresinden ve
     `/hizmetler/seo.md` yeniden yazımıyla (bkz. _redirects) erişilir. */
  let yazilan = 0;
  for (const s of kayit) {
    /* NOINDEX SAYFAYA ES URETILMEZ (5 Eyl 2026): tesekkur, film, 404 ve
       deneme sayfalari arama ve ajan icin zaten kapali; onlara ajan
       yuzeyi acmak kendi robots kuralimizla celisirdi. Bekci T3 ayni
       kapsami tutuyor — iki taraf ayni sayida (59). */
    if (!s.indeks) continue;
    /* KACIRMA MARKDOWN'I YAZAN YERDE (5 Eyl 2026). Govde zaten kaciriliyordu
       ama BASLIK ve ACIKLAMA kacirilmiyordu: `kunye()` entity cozuyor, ve
       panelin BOS icerik kolunda bir aciklama icinde kacirilmis markup
       (`&lt;svg ...&gt;`) bulundu — cozulunce .md'ye ETIKET olarak dustu.
       Dolu halde yoktu; yalnizca panel kapisinin bos kolu yakaladi.
       Kural: markdown'a giren HER metin ayni kapidan gecer. */
    const kacir = (s) => String(s || '').replace(/</g, '\<');
    const md = [
      '# ' + kacir(s.baslik),
      '',
      s.aciklama ? '> ' + kacir(s.aciklama) : '',
      s.aciklama ? '' : '',
      s.kanonik ? 'Kaynak: ' + s.kanonik : '',
      '',
      '---',
      '',
      s.govde,
      '',
    ].filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n');
    /* ADRES BICIMI: KARDES dosya — `/hizmetler/seo/` -> `/hizmetler/seo.md`,
       kok -> `/index.md`. Ajan tarafinda yerlesik bicim bu; `index.md`
       icinde birakmak `/hizmetler/seo/index.md` gibi bir adres uretirdi ve
       ne llmstxt ne agent-ready o bicimi ariyor. Yeniden yazma kurali da
       gerekmiyor: dosya gercekten orada duruyor (bir yonlendirme daha
       eklemek bugun kapattigimiz 301 hopunun yenisi olurdu). */
    const kisa = s.yol === '/' ? 'index' : s.yol.slice(1, -1);
    const hedef = join(dist, kisa + '.md');
    mkdirSync(dirname(hedef), { recursive: true });
    /* SON KAPI — YAZMA ANINDA, ALAN ALAN DEGIL. Kacirma once govdeye,
       sonra baslik/aciklamaya eklendi ve panel kapisinin BOS kolu iki
       kezinde de kirmizi kaldi: alan alan kacirmak yarin eklenecek yeni
       bir alani KAPSAMAZ. Artik dosyaya yazilan dizgenin TAMAMI tek
       yerden geciyor; zaten kacirilmis olan ikinci kez kacirilmaz. */
    const guvenli = md.replace(/\n{3,}/g, '\n\n').replace(/(^|[^\\])</g, '$1\\<');
    writeFileSync(hedef, guvenli, 'utf8');
    s.md = s.yol === '/' ? '/index.md' : s.yol.slice(0, -1) + '.md';
    yazilan++;
  }

  /* 2 · llms.txt — SITENIN HARITASI, dil modelleri icin.
     Bicim llmstxt.org: bir H1, bir alinti (ozet), sonra bolum bolum
     [baslik](adres): aciklama satirlari. Baslik ve aciklama sayfanin
     KENDI etiketlerinden geliyor (S1/S4 kurallari zaten hepsinin BENZERSIZ
     oldugunu tutuyor) — yani burada ikinci bir metin kaynagi dogmuyor.
     IKI ADRESE de yazilir: `/llms.txt` (yerlesik) ve `/.well-known/llms.txt`
     (llmstxt v2 ve agent-ready C-serisi orayi ariyor). Ayni uretecin ayni
     ciktisi; iki dosya arasinda sapma imkansiz. */
  const bolumAdi = (yol) => {
    const en = yol.startsWith('/en/') || yol === '/en/';
    const g = yol.replace(/^\/en/, '') || '/';
    if (g.startsWith('/hizmetler')) return en ? 'Services' : 'Hizmetler';
    if (g.startsWith('/projeler')) return en ? 'Projects' : 'Projeler';
    if (g.startsWith('/bulten')) return en ? 'Newsletter' : 'Bülten';
    return en ? 'Pages' : 'Sayfalar';
  };
  const ana = kayit.find((s) => s.yol === '/') || kayit[0];
  const yayin = kayit.filter((s) => s.indeks);
  const grup = new Map();
  for (const s of yayin) {
    const ad = (s.yol.startsWith('/en/') || s.yol === '/en/' ? 'EN · ' : 'TR · ') + bolumAdi(s.yol);
    if (!grup.has(ad)) grup.set(ad, []);
    grup.get(ad).push(s);
  }
  /* TR ONCE: alfabetik sirada EN basa geciyordu; sitenin birincil dili
     Turkce ve llms.txt'i okuyan model listenin BASINDAKINI agirlikli
     alir. Dil oncelikli, sonra bolum adi. */
  const sira = [...grup.keys()].sort((x, y) =>
    (x.startsWith('TR') === y.startsWith('TR')) ? x.localeCompare(y) : (x.startsWith('TR') ? -1 : 1));
  const llms = ['# QANATONE', ''];
  if (ana && ana.aciklama) llms.push('> ' + ana.aciklama, '');
  llms.push('Her sayfanin markdown esi ayni adresin `.md` uzantili halindedir'
    + ' (ornek: `' + kok + '/hizmetler/seo.md`). Tam metin: `' + kok + '/llms-full.txt`.', '');
  for (const ad of sira) {
    llms.push('## ' + ad);
    for (const s of grup.get(ad).sort((x, y) => x.yol.localeCompare(y.yol))) {
      const adres = s.kanonik || kok + s.yol;
      llms.push('- [' + s.baslik.replace(/\]/g, '') + '](' + adres + ')'
        + (s.aciklama ? ': ' + s.aciklama : ''));
    }
    llms.push('');
  }
  const llmsMetin = llms.join('\n').replace(/\n{3,}/g, '\n\n');
  writeFileSync(join(dist, 'llms.txt'), llmsMetin, 'utf8');
  mkdirSync(join(dist, '.well-known'), { recursive: true });
  writeFileSync(join(dist, '.well-known', 'llms.txt'), llmsMetin, 'utf8');

  /* 3 · llms-full.txt — butun sayfalarin markdown govdesi tek dosyada.
     Ayri bir cikarim DEGIL: yukarida uretilen esler birlestiriliyor, yani
     .md esleriyle ayrisamaz. */
  const tam = yayin.map((s) => '<!-- ' + (s.kanonik || kok + s.yol) + ' -->\n\n'
    + '# ' + s.baslik + '\n\n' + (s.aciklama ? '> ' + s.aciklama + '\n\n' : '') + s.govde)
    .join('\n\n---\n\n')
    .replace(/(^|[^\\])</g, '$1\\<');
  writeFileSync(join(dist, 'llms-full.txt'), tam + '\n', 'utf8');

  /* 4 · agents.md ve 5 · agent-permissions.json — IKISI DE robots.txt'ten
     TUREYEN belgeler. Politikayi ikinci kez yazmiyoruz: `Content-Signal`
     ve `Disallow` satirlari robots.txt'te duruyor (bekcisi S6, panelle
     tutarliligini o tutuyor); burada yalnizca AJANIN OKUYACAGI BICIME
     ceviriliyor. Ikinci bir politika kaynagi acmak, iki yerde farkli sey
     yazan bir siteye giden en kisa yoldur.
     ZAMAN DAMGASI YOK: `derleme-belirlenim` kurali iki derlemeyi bayt
     bayt karsilastiriyor; tarih koysak her derleme farkli cikardi. */
  const robots = (() => {
    try { return readFileSync(join(dist, 'robots.txt'), 'utf8'); } catch (e) { return ''; }
  })();
  const sinyal = (robots.match(/^Content-Signal:\s*(.+)$/mi) || [, ''])[1].trim();
  const kapali = [...robots.matchAll(/^Disallow:\s*(\S+)\s*$/gmi)].map((m) => m[1])
    .filter((x, i, a2) => x && x !== '/' && a2.indexOf(x) === i).sort();
  const ajanlar = [...robots.matchAll(/^User-agent:\s*(\S+)\s*$/gmi)].map((m) => m[1])
    .filter((x) => x !== '*').filter((x, i, a2) => a2.indexOf(x) === i).sort();

  const agents = [
    '# agents.md — QANATONE',
    '',
    ana && ana.aciklama ? '> ' + ana.aciklama : '',
    '',
    '## Bu siteyi nasil okursun',
    '',
    '- Her sayfanin markdown esi ayni adresin `.md` uzantili halidir:',
    '  `' + kok + '/hizmetler/seo/` -> `' + kok + '/hizmetler/seo.md`',
    '- Site haritasi (model icin): `' + kok + '/llms.txt`',
    '- Butun metin tek dosyada: `' + kok + '/llms-full.txt`',
    '- Adres listesi (arama icin): `' + kok + '/sitemap.xml`',
    '',
    '## Icerik paritesi',
    '',
    'Markdown esler HTML CIKTISINDAN turetilir; ajana verilen metin,',
    'tarayiciya verilenin ta kendisidir. Ajana ozel bir surum yoktur.',
    '',
    '## Izin',
    '',
    sinyal ? '- Content-Signal: `' + sinyal + '`' : '',
    '- Arama ve yapay zeka yanitlarinda KAYNAK olarak kullanilabilir.',
    '- Model egitimi icin govde verilmez (`ai-train=no`).',
    ajanlar.length ? '- Acikca davet edilen ajanlar: ' + ajanlar.join(', ') : '',
    '',
    '## Kapali yollar',
    '',
    ...(kapali.length ? kapali.map((y) => '- `' + y + '`') : ['- yok']),
    '',
    '## Iletisim',
    '',
    '- ' + kok + '/#lead',
    '',
  ].filter((s, i, a2) => !(s === '' && a2[i - 1] === ''));
  writeFileSync(join(dist, 'agents.md'), agents.join('\n').replace(/(^|[^\\])</g, '$1\\<'), 'utf8');

  const izin = {
    version: '0.1',
    site: kok,
    contentSignal: sinyal || null,
    default: { read: true, quote: true, train: false },
    disallow: kapali,
    invitedAgents: ajanlar,
    resources: {
      llms: kok + '/llms.txt',
      llmsFull: kok + '/llms-full.txt',
      sitemap: kok + '/sitemap.xml',
      markdown: '<page>.md',
      agents: kok + '/agents.md',
    },
  };
  writeFileSync(join(dist, '.well-known', 'agent-permissions.json'),
    JSON.stringify(izin, null, 2) + '\n', 'utf8');

  return { sayfa: kayit.length, md: yazilan, llms: yayin.length, kayit };
}
