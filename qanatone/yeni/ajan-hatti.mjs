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

  for (const ham of coz(m).split('\n')) {
    const s = ham.replace(/[ \t ]+/g, ' ').trim();
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
    const md = [
      '# ' + s.baslik,
      '',
      s.aciklama ? '> ' + s.aciklama : '',
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
    writeFileSync(hedef, md.replace(/\n{3,}/g, '\n\n'), 'utf8');
    s.md = s.yol === '/' ? '/index.md' : s.yol.slice(0, -1) + '.md';
    yazilan++;
  }

  return { sayfa: kayit.length, md: yazilan, kayit };
}
