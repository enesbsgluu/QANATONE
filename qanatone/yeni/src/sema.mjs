/* ANA SAYFA ŞEMASI — kökteki `@graph` üçlüsünün (Organization + WebSite
   + WebPage) göçü. Kaynak: kök index.html `schema()` 11520-11560 ve
   sabitleri 5613-5638; build.js bunu dist/index.html'e statik basıyor.

   Kural 107 korunuyor: #org kimliği HER sayfada birebir aynı gövdeyi
   taşır (dile göre ayrışmaz). Kaynağın kendi düşüş davranışı da aynen:
   panel `settings.orgDesc/knowsAbout` doldurduysa onlar, yoksa buradaki
   sabitler — "üretim ilk günden doğru, panel yalnız ezebilir".

   .mjs, .ts DEĞİL: Node'un doğrudan koşturduğu denetim de bu modülü
   içe aktarır (şema parite kuralı); Netlify Node 20 `.ts` açamıyor
   (19 Ağu deploy dersi). */

const KURUM_TANIMI = 'QANATONE, talebi yakalayan sistemleri kuran, ölçen ve işletmeye devreden bir performans pazarlama ve yapay zekâ otomasyonu şirketidir. SEO, GEO, Google ve Meta reklamlarını tek bir ölçüm altında toplar; uluslararası ticari veriyi ve alıcı davranışını ölçen davranışsal motoruyla firmaya özel operasyonu bu ölçüme dayandırarak kurar ve ölçekler. İstanbul ve Dubai.';
const KURUM_KONULARI = ['performans pazarlama', 'SEO', 'GEO', 'Google Ads', 'Meta Ads',
  'influencer pazarlaması', 'pazar ve rakip veri analizi', 'yapay zekâ ajanları',
  'pazarlama otomasyonu', 'uluslararası ticaret verisi',
  'tedarik ve lojistik operasyonu', 'ürün ve pazar geliştirme'];

/* @param {any} icerik  content.json
 * @param {{url:string, ad:string, aciklama:string, dil?:string}} sayfa
 * @returns {object} JSON-LD @graph */
export function anaSema(icerik, sayfa) {
  const st = (icerik && icerik.settings) || {};
  const KOK = 'https://qanatone.com';
  const sosyal = (icerik.socials || []).map((s) => s && s.url).filter(Boolean);
  const tel = String(st.whatsapp || '').replace(/\D/g, '');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': KOK + '/#org',
        name: 'QANATONE', url: KOK + '/',
        logo: KOK + '/img/qanatone.webp',
        description: String(st.orgDesc || '').trim() || KURUM_TANIMI,
        knowsAbout: (Array.isArray(st.knowsAbout) && st.knowsAbout.length)
          ? st.knowsAbout : KURUM_KONULARI,
        sameAs: sosyal,
        areaServed: ['TR', 'AE'],
        contactPoint: tel ? [{ '@type': 'ContactPoint', contactType: 'sales',
          telephone: '+' + tel, availableLanguage: ['tr', 'en'] }] : [],
      },
      {
        '@type': 'WebSite', '@id': KOK + '/#site',
        url: KOK + '/', name: 'QANATONE',
        publisher: { '@id': KOK + '/#org' },
        inLanguage: sayfa.dil || 'tr',
      },
      {
        '@type': 'WebPage', '@id': sayfa.url + '#page',
        url: sayfa.url, name: sayfa.ad, description: sayfa.aciklama,
        isPartOf: { '@id': KOK + '/#site' },
        inLanguage: sayfa.dil || 'tr',
      },
    ],
  };
}

/* HİZMETLER DİZİNİ ŞEMASI — eski /hizmetler @graph'ının göçü:
   anaSema üçlüsü + ItemList(9×Service). Kaynak: dist/hizmetler
   `#ldjson` (Organization + WebSite + WebPage + ItemList; item =
   Service{name, description, provider#org, areaServed}). Eski item'da
   url YOKTU; hizmet detay sayfalarının Service.url'iyle tutarlılık
   için eklendi — bilinçli süperküme. */
/* PROJELER ŞEMALARI — eski taraf: dizin @graph üçlü (ItemList YOKTU),
   detay @graph üçlü + CreativeWork{@id #work, name, url, creator#org}.
   Dizine ItemList(7×CreativeWork) eklendi, detaya description —
   hizmetler dizini/detayıyla tutarlılık, bilinçli süperküme. */
export function projeDizinSema(icerik, sayfa) {
  const g = anaSema(icerik, sayfa);
  const KOK = 'https://qanatone.com';
  const dil = sayfa.dil || 'tr';
  const T = (v) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  g['@graph'].push({
    '@type': 'ItemList', '@id': sayfa.url + '#list',
    itemListElement: (icerik.projects || []).map((p, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'CreativeWork', name: p.name, description: T(p.text),
        url: `${KOK}${dil === 'en' ? '/en' : ''}/projeler/${p.slug}`,
        creator: { '@id': KOK + '/#org' },
      },
    })),
  });
  return g;
}

export function projeSema(icerik, sayfa, proje) {
  const g = anaSema(icerik, sayfa);
  const KOK = 'https://qanatone.com';
  const dil = sayfa.dil || 'tr';
  const T = (v) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  g['@graph'].push({
    '@type': 'CreativeWork', '@id': sayfa.url + '#work',
    name: proje.name, url: sayfa.url, description: T(proje.text),
    creator: { '@id': KOK + '/#org' },
  });
  return g;
}

/* BÜLTEN DİZİNİ ŞEMASI — eski /bulten @graph'ı yalnız üçlüydü (özel
   blok yalnız /sss ve /hizmetler'de vardı; kök schema() 11559-11574).
   Hizmetler/projeler dizinleriyle tutarlılık için ItemList(N×Article)
   eklendi — bilinçli süperküme. Item alan adları detay sayfasının
   Article şemasıyla aynı (headline/description/datePublished/publisher).
   Sıra tarihe göre yeni→eski: dizin sayfası da böyle basıyor (eski
   postsSorted davranışı), şema sayfayla aynı sırayı anlatmalı. */
export function bultenDizinSema(icerik, sayfa) {
  const g = anaSema(icerik, sayfa);
  const KOK = 'https://qanatone.com';
  const dil = sayfa.dil || 'tr';
  const T = (v) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  const yazilar = [...(icerik.posts || [])]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  g['@graph'].push({
    '@type': 'ItemList', '@id': sayfa.url + '#list',
    itemListElement: yazilar.map((p, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'Article', headline: T(p.title), description: T(p.lede),
        url: `${KOK}${dil === 'en' ? '/en' : ''}/bulten/${p.slug}`,
        datePublished: p.date,
        publisher: { '@id': KOK + '/#org' },
      },
    })),
  });
  return g;
}

/* SSS ŞEMASI — eski /sss @graph'ının göçü: üçlü + FAQPage (kök schema()
   11559-11567; bülten gibi salt üçlü DEĞİL, özel bloğu olan iki eski
   sayfadan biri). Kimlik sayfanın kendi adresine bağlı (eski taraftaki
   TR/EN kimlik çakışması düzeltmesi korunuyor); q/a strip'li — etiket
   sıyrılır, boşluk tekilleşir, kaynaktaki davranışın aynısı. */
export function sssSema(icerik, sayfa) {
  const g = anaSema(icerik, sayfa);
  const dil = sayfa.dil || 'tr';
  const T = (v) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  const strip = (v) => String(T(v)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  g['@graph'].push({
    '@type': 'FAQPage', '@id': sayfa.url + '#faq',
    mainEntity: (icerik.faq || []).map((f) => ({
      '@type': 'Question', name: strip(f.q),
      acceptedAnswer: { '@type': 'Answer', text: strip(f.a) },
    })),
  });
  return g;
}

export function dizinSema(icerik, sayfa) {
  const g = anaSema(icerik, sayfa);
  const KOK = 'https://qanatone.com';
  const dil = sayfa.dil || 'tr';
  const T = (v) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  g['@graph'].push({
    '@type': 'ItemList', '@id': sayfa.url + '#list',
    itemListElement: (icerik.services || []).map((s, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'Service', name: T(s.title), description: T(s.text),
        url: `${KOK}${dil === 'en' ? '/en' : ''}/hizmetler/${s.slug}`,
        provider: { '@id': KOK + '/#org' }, areaServed: ['TR', 'AE'],
      },
    })),
  });
  return g;
}
