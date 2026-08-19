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
