/* Konak TEK KAYNAKTAN gelir (icerik.ts KOK). Bu dosyada sekiz ayri
   `const KOK` kopyasi vardi; birincil alan adi degisince yedisi eskir,
   biri degisirdi ve fark ancak Search Console'da gorunurdu. */
import { KOK, OG_KART, sl } from './icerik';
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
        /* ADRES YOK — KARAR (Enes, 6 Eyl 2026), eksiklik degil. LocalBusiness
           (ya da `address: PostalAddress`) yayinlanabilir GERCEK bir adres
           ister; QANATONE'un boyle bir adresi yok, uydurulmuyor. Bunun
           bedeli olculdu ve kabul edildi: kendi tespit aracimiz kendi
           sitemize `local: warn` yaziyor (4 puan, olcut "maps ·
           LocalBusiness") ve yerel arama kazanci alinmiyor. Adres cikarsa
           iki yol var: burada `address` + tip LocalBusiness'a genisletmek,
           ya da adresi sayfada yayinlamadan footer'a Google Maps bagi
           koymak (aracin olcutu ikisini de kabul ediyor). Kapsam
           `areaServed` ile ulke duzeyinde kaliyor. */
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
  const dil = sayfa.dil || 'tr';
  const T = (v) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  g['@graph'].push({
    '@type': 'ItemList', '@id': sayfa.url + '#list',
    itemListElement: (icerik.projects || []).map((p, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'CreativeWork', name: p.name, description: T(p.text),
        url: sl(`${KOK}${dil === 'en' ? '/en' : ''}/projeler/${p.slug}`),
        creator: { '@id': KOK + '/#org' },
      },
    })),
  });
  return g;
}

export function projeSema(icerik, sayfa, proje) {
  const g = anaSema(icerik, sayfa);
  const dil = sayfa.dil || 'tr';
  const T = (v) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  g['@graph'].push({
    '@type': 'CreativeWork', '@id': sayfa.url + '#work',
    name: proje.name, url: sayfa.url, description: T(proje.text),
    creator: { '@id': KOK + '/#org' },
  });
  /* KIRINTI (madde 2): QANATONE → Projeler → <proje adi>. Ad ve adres
     kaydin kendinden; son basamak adressiz (sayfanin kendisi). */
  g['@graph'].push(kirintiSema(sayfa, [
    { ad: dil === 'en' ? 'Projects' : 'Projeler', adres: sl(`${KOK}${dil === 'en' ? '/en' : ''}/projeler`) },
    { ad: proje.name },
  ]));
  return g;
}

/* BÜLTEN DİZİNİ ŞEMASI — eski /bulten @graph'ı yalnız üçlüydü (özel
   blok yalnız /sss ve /hizmetler'de vardı; kök schema() 11559-11574).
   Hizmetler/projeler dizinleriyle tutarlılık için ItemList(N×Article)
   eklendi — bilinçli süperküme. Item alan adları detay sayfasının
   Article şemasıyla aynı (headline/description/datePublished/publisher).
   Sıra tarihe göre yeni→eski: dizin sayfası da böyle basıyor (eski
   postsSorted davranışı), şema sayfayla aynı sırayı anlatmalı. */
/* ItemList SAYFANIN KENDI DILIMI (9 Eyl 2026 — sayfalamayla).
   ONCEDEN TUM ARSIVI BASIYORDU ve iki ayri kusurdu:
   1) OLCU: 200 yazida ItemList 96.950 B, dizin sayfasinin %72'si. Her
      sayfali dizinde AYNI 97 KB tekrarlaniyordu (17 sayfa = 1,65 MB) —
      serit kusurunun (BULGU 1) sema tarafindaki ikizi, ayni O(N×N).
   2) DOGRULUK: 3. sayfanin ItemList'i 3. sayfada NE VARSA onu anlatmali.
      Butun arsivi her sayfada ilan etmek, sayfanin icerigini yanlis
      bildirmektir — sayfalamanin SEO'daki tum anlamini bozar.
   `position` MUTLAK kalir (2. sayfa 13'ten baslar): sira arsivdeki sira,
   sayfa icindeki sira degil — sayfali listelerde dogru olan bu.
   `sayfa.sayfaNo` verilmezse 1 sayilir (eski cagri bicimi kirilmaz). */
export function bultenDizinSema(icerik, sayfa) {
  const g = anaSema(icerik, sayfa);
  const dil = sayfa.dil || 'tr';
  const T = (v) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  /* KONU ARSIVINDE LISTE ONCE SUZULUR (9 Eyl 2026). Suzulmezse konu
     sayfasinin ItemList'i butun bulteni ilan eder — sayfalamada
     duzeltilen kusurun aynisi, bu kez konu ekseninde. Bileşendeki
     suzme ile AYNI olcut: `String(p.topic || '') === konu`. */
  /* KAYNAK BOLUMDEN (9 Eyl 2026): bulten `posts`, nedir `explainers`,
     haber `news`. Verilmezse `posts` — eski cagri bicimi kirilmaz. */
  const tum = [...(icerik[sayfa.kaynak || 'posts'] || [])]
    .filter((p) => !sayfa.konu || String(p.topic || '') === sayfa.konu)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const boy = sayfa.sayfaBoyu || tum.length || 1;
  const no = Math.max(1, sayfa.sayfaNo || 1);
  const bas = (no - 1) * boy;
  const yazilar = tum.slice(bas, bas + boy);
  g['@graph'].push({
    '@type': 'ItemList', '@id': sayfa.url + '#list',
    itemListElement: yazilar.map((p, i) => ({
      '@type': 'ListItem', position: bas + i + 1,
      item: {
        /* TIP BOLUME GORE: nedir yazilari TANIM icerigidir, haber degil.
           `DefinedTerm` ayni sayfayi arama motoruna ve dil modellerine
           "bu bir kavram aciklamasi" diye bildirir — GEO tarafinin
           tam olarak besledigi sinyal. Bulten ve haber `Article`. */
        '@type': sayfa.tip || 'Article',
        headline: T(p.title), description: T(p.lede),
        /* DIZIN YOLU BOLUMDEN: `/bulten` sabiti burada duruyordu ve
           nedir/haber yazilarini bultenin altina gosterirdi — sema ile
           gercek adresin ayrismasi, sessiz ve pahali bir kusur. */
        url: sl(`${KOK}${dil === 'en' ? '/en' : ''}${sayfa.dizin || '/bulten'}/${p.slug}`),
        datePublished: p.date,
        publisher: { '@id': KOK + '/#org' },
      },
    })),
  });
  return g;
}

/* SEKTOR ARSIVI SEMASI (9 Eyl 2026).
   NEDEN AYRI: bulten/konu arsivleri TEK koleksiyondan besleniyor ve
   `bultenDizinSema` icerigi `icerik[kaynak]`tan kendisi cikariyor.
   Sektor arsivi BOLUM USTU — uc koleksiyonun karisimi — ve karisim
   yalnizca sayfayi kuran tarafta biliniyor; bu yuzden kayitlar
   DISARIDAN veriliyor (`sektorDilim` ciktisi, sayfanin kartlariyla
   AYNI liste).
   BULUNDU VE DUZELTILDI: ilk surumde sektor sayfasi yalniz `anaSema`
   tasiyordu, yani bir LISTE sayfasi LISTE semasi olmadan yayinlaniyordu
   — bulten dizininde ve konu arsivinde ItemList varken sektorde YOKTU.
   Hicbir kapi bunu goremiyordu; T14'e olcut eklendi.
   `position` MUTLAK (2. sayfa 13'ten baslar). Item tipi BOLUME gore:
   nedir yazilari DefinedTerm, bulten ve haber Article. */
export function sektorDizinSema(icerik, sayfa, kayitlar, bas) {
  const g = anaSema(icerik, sayfa);
  const dil = sayfa.dil || 'tr';
  const T = (v) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  g['@graph'].push({
    '@type': 'ItemList', '@id': sayfa.url + '#list',
    itemListElement: (kayitlar || []).map((p, i) => ({
      '@type': 'ListItem', position: (bas || 0) + i + 1,
      item: {
        '@type': p._bolum === 'nedir' ? 'DefinedTerm' : 'Article',
        headline: T(p.title), description: T(p.lede),
        url: sl(`${KOK}${dil === 'en' ? '/en' : ''}${p._dizin}/${p.slug}`),
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

/* DETAY ŞEMALARI — rota turu kapanış raporunda yakalanan parite açığı:
   Faz 1 hizmet/bülten detaylarına TEKİL düğüm yazmıştı; eski taraf her
   sayfada üçlü @graph + tür basıyor, hizmette det.faq varsa FAQPage,
   bültende BreadcrumbList de var (kök schema() 11575-11602). Alan alan
   birebir; eski `serviceType:...||undefined` düşüşü aynen (JSON.stringify
   undefined alanı düşürür — yarım alan basılmaz). */
export function hizmetSema(icerik, sayfa, hizmet) {
  const g = anaSema(icerik, sayfa);
  const dil = sayfa.dil || 'tr';
  const T = (v) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  const strip = (v) => String(T(v)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const det = hizmet.det || {};
  g['@graph'].push({
    '@type': 'Service', '@id': sayfa.url + '#service',
    name: strip(det.h), description: strip(det.lede),
    provider: { '@id': KOK + '/#org' }, areaServed: ['TR', 'AE'],
    serviceType: T(hizmet.tag) || undefined,
  });
  if (det.faq && det.faq.length)
    g['@graph'].push({
      '@type': 'FAQPage', '@id': sayfa.url + '#faq',
      mainEntity: det.faq.map((f) => ({
        '@type': 'Question', name: strip(f.q),
        acceptedAnswer: { '@type': 'Answer', text: strip(f.a) },
      })),
    });
  /* KIRINTI (madde 2): QANATONE → Hizmetler → <hizmet adi>. */
  g['@graph'].push(kirintiSema(sayfa, [
    { ad: dil === 'en' ? 'Services' : 'Hizmetler', adres: sl(`${KOK}${dil === 'en' ? '/en' : ''}/hizmetler`) },
    { ad: strip(det.h) || T(hizmet.tag) || sayfa.ad },
  ]));
  return g;
}

/* ---- BREADCRUMB URETECI (YAYIN ONCESI KONTROL madde 2, 6 Eyl 2026) ----
   Envanter: `BreadcrumbList` YALNIZ 12 bulten yazisindaydi (6 yazi x 2 dil);
   hizmet ve proje detaylari — yani sitenin en derin ve en cok baglanan
   sayfalari — hic tasimiyordu. Gorsel breadcrumb da yoktu.
   KARAR: sema HER iki dilde uc basamakli olarak eklenir; GORSEL tarafta
   YENI BIR SERIT EKLENMEZ — detay sayfalarinda zaten bir "geri bagi"
   (.pgback) var ve o bagin ISLEVI breadcrumb'in kendisidir. Bag
   `<nav aria-label="Breadcrumb">` icine alindi: gorunum degismedi,
   erisilebilirlik agacinda ve tarayicilar icin anlam kazandi.
   Uydurma basamak yok: ad ve adres kaydin kendi alanlarindan gelir. */
export function kirintiSema(sayfa, basamaklar) {
  return {
    '@type': 'BreadcrumbList', '@id': sayfa.url + '#crumb',
    itemListElement: [{ '@type': 'ListItem', position: 1, name: 'QANATONE', item: KOK + '/' }]
      .concat(basamaklar.map((b, i) => Object.assign(
        { '@type': 'ListItem', position: i + 2, name: b.ad },
        b.adres ? { item: b.adres } : {},
      ))),
  };
}

export function yaziSema(icerik, sayfa, yazi) {
  const g = anaSema(icerik, sayfa);
  const dil = sayfa.dil || 'tr';
  const T = (v) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  g['@graph'].push({
    '@type': 'Article', '@id': sayfa.url + '#article',
    headline: T(yazi.title), description: sayfa.aciklama,
    datePublished: yazi.date, dateModified: yazi.date,
    inLanguage: dil,
    mainEntityOfPage: { '@id': sayfa.url + '#page' },
    author: { '@id': KOK + '/#org' }, publisher: { '@id': KOK + '/#org' },
    /* 4 EYL 2026: geri dusus `og.png` idi ve o dosya kesmede ciktidan
       kalkti — alti yazinin hepsi (x2 dil) semada 404 veren bir adres
       ilan ediyordu (olculdu, dist'te 6 kopya). Ad artik icerik.ts'te
       TEK KAYNAK ve DILE GORE secilir: sema ile meta etiketi ayni
       karti gosterir. */
    image: KOK + (yazi.image ? '/' + String(yazi.image).replace(/^\//, '') : OG_KART[dil === 'en' ? 'en' : 'tr']),
  });
  g['@graph'].push({
    '@type': 'BreadcrumbList', '@id': sayfa.url + '#crumb',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'QANATONE', item: KOK + '/' },
      { '@type': 'ListItem', position: 2, name: dil === 'en' ? 'Bulletin' : 'Bülten',
        item: sl(`${KOK}${dil === 'en' ? '/en' : ''}/bulten`) },
      { '@type': 'ListItem', position: 3, name: T(yazi.title) },
    ],
  });
  return g;
}

export function dizinSema(icerik, sayfa) {
  const g = anaSema(icerik, sayfa);
  const dil = sayfa.dil || 'tr';
  const T = (v) => typeof v === 'string' ? v : (v && (v[dil] || v.tr)) || '';
  g['@graph'].push({
    '@type': 'ItemList', '@id': sayfa.url + '#list',
    itemListElement: (icerik.services || []).map((s, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'Service', name: T(s.title), description: T(s.text),
        url: sl(`${KOK}${dil === 'en' ? '/en' : ''}/hizmetler/${s.slug}`),
        provider: { '@id': KOK + '/#org' }, areaServed: ['TR', 'AE'],
      },
    })),
  });
  return g;
}
