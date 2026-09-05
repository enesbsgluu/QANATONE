/* TESHIS DUZELTME SOZLUGU (sokum turu, 4 Eyl 2026) — kaynak L.tr.f 11101-
   11128 ve L.en.f 11197-11224 BIREBIR; sira PRIO 11257-11259. kabuk-derle
   public/varlik/tespit-fix.<dil>.json yazar ([anahtar, baslik, aciklama]);
   STETespit adasi gonderimde indirir. Son kayit 'yok': kritik eksik yok. */
export const PRIO = ['https', 'viewport', 'contact', 'whatsapp', 'schema', 'desc', 'title', 'analytics',
  'inline', 'blocking', 'compress', 'weight', 'imgdim', 'imgfmt', 'cache', 'fonts', 'reqs',
  'og', 'local', 'h1', 'lang', 'alt', 'sitemap', 'canonical', 'robots'];
export const FIX = {
  tr: {
    schema: ['Yapay zekâ seni okuyamıyor', 'Sitede yapılandırılmış veri yok. Yeni arama yanıtları bunu okur — olmayınca markan o cevaplarda hiç geçmez.'],
    desc: ['Arama sonucunda cümlen yok', 'Açıklama etiketi eksik. Google rastgele bir cümle gösteriyor.'],
    title: ['Sekme başlığı satmıyor', 'Başlık yok ya da arama sonucunda kesiliyor.'],
    contact: ['Ulaşmak zor', 'Ziyaretçi sana ulaşmak için uğraşıyor. En az iki yol olmalı.'],
    whatsapp: ['WhatsApp yok', 'Türkiye’de talebin çoğu WhatsApp’tan gelir.'],
    analytics: ['Ölçüm yok', 'Hangi kanaldan kaç kişi geliyor bilinmiyor.'],
    weight: ['Sayfa fazla ağır', 'Görseller sıkıştırılmamış.'],
    inline: ['Sayfanın büyük kısmı gömülü kod', 'Bu kod önbelleğe alınamıyor — ikinci sayfaya geçen ziyaretçi aynı yükü tekrar indiriyor.'],
    blocking: ['Açılış kapıda bekliyor', 'Head içindeki stil ve betikler ilk boyamayı geciktiriyor.'],
    fonts: ['Yazı tipi yükü fazla', 'Her aile ve varyant ayrı bir istek; dışarıdan gelenler ayrıca dış bağımlılık.'],
    imgdim: ['Görsellerin boyutu yazılmamış', 'Sayfa yüklenirken içerik zıplıyor, ziyaretçi yanlış yere tıklıyor.'],
    imgfmt: ['Görseller eski formatta', 'WebP/AVIF aynı görseli belirgin daha küçük indirir.'],
    compress: ['Sıkıştırma kapalı', 'Sunucu metni sıkıştırmadan gönderiyor — en ucuz kazanç burada.'],
    cache: ['Belge önbelleğe alınmıyor', 'Bu sayfanın kendi başlığı saklanmasını engelliyor; her ziyaret sıfırdan iniyor.'],
    reqs: ['Çok fazla dış kaynak', 'Her referans ayrı bir istek; sayfa parça parça açılıyor.'],
    viewport: ['Mobil ayarı yok', 'Ziyaretçinin çoğu telefondan geliyor.'],
    og: ['Paylaşınca kart boş', 'Link görselsiz görünüyor — güven kaybı.'],
    local: ['Yerel kayıt görünmüyor', '"Yakınımda" aramalarında çıkmazsın.'],
    h1: ['Ana başlık düzensiz', 'Sayfada tek ve net bir H1 olmalı.'],
    alt: ['Görseller tanımsız', 'Görsel aramada çıkmıyorsun.'],
    https: ['Güvenli bağlantı yok', 'Tarayıcı ziyaretçiye uyarı gösteriyor.'],
    sitemap: ['Site haritası yok', 'Arama motoru sayfaları tek tek keşfediyor.'],
    robots: ['robots.txt yok', 'Tarayıcılara yön veremiyorsun.'],
    canonical: ['Adres tekrarı riski', 'Aynı sayfa farklı adreslerle açılıyor.'],
    /* `lang` PUANLANIYORDU AMA SOZLUKTE YOKTU (5 Eyl 2026): W tablosunda
       3 puan tasiyor ve `fail` olabiliyor, ama PRIO ve FIX listesinde
       adi gecmedigi icin duzeltme listesine HIC dusemiyordu — dili
       yazilmamis bir site kaybettigi puani hicbir zaman goremiyordu. */
    lang: ['Sayfanın dili yazılmamış', 'Tarayıcı ve arama motoru hangi dilde olduğunu tahmin ediyor; çeviri ve okuma yardımı yanlış çalışıyor.'],
    yok: ['Kritik bir eksik çıkmadı.', 'Temel yerinde. Bundan sonraki kazanç tamirde değil, stratejide.'],
  },
  en: {
    schema: ['AI cannot read you', 'No structured data — your brand never appears in AI answers.'],
    desc: ['No sentence in search results', 'The description tag is missing or weak.'],
    title: ['The page title is not selling', 'Missing or truncated in search results.'],
    contact: ['Hard to reach you', 'Visitors have to work to contact you.'],
    whatsapp: ['No WhatsApp', 'Most enquiries arrive on WhatsApp.'],
    analytics: ['No measurement', 'You cannot see which channel brings whom.'],
    weight: ['Page is too heavy', 'Images are not compressed.'],
    inline: ['Most of the page is inline code', 'This code cannot be cached — a visitor moving to a second page downloads the same weight again.'],
    blocking: ['The first paint is held at the door', 'Stylesheets and scripts in the head delay it.'],
    fonts: ['Too much font weight', 'Every family and variant is a separate request; external ones add a dependency.'],
    imgdim: ['Images have no dimensions', 'Content jumps while the page loads and visitors tap the wrong thing.'],
    imgfmt: ['Images use legacy formats', 'WebP/AVIF deliver the same image noticeably smaller.'],
    compress: ['Compression is off', 'The server sends text uncompressed — the cheapest win is here.'],
    cache: ['The document is not cacheable', 'This page’s own header blocks storage; every visit downloads it from scratch.'],
    reqs: ['Too many external resources', 'Each reference is a separate request; the page arrives in pieces.'],
    viewport: ['No mobile setup', 'Most visitors are on phones.'],
    og: ['Empty share card', 'Your link shows no image.'],
    local: ['No local footprint', 'You miss "near me" searches.'],
    h1: ['Heading structure is off', 'There should be exactly one clear H1.'],
    alt: ['Images are undefined', 'You miss image search.'],
    https: ['No secure connection', 'Browsers warn your visitors.'],
    sitemap: ['No sitemap', 'Crawlers must discover pages one by one.'],
    robots: ['No robots.txt', 'You cannot guide crawlers.'],
    canonical: ['Duplicate URL risk', 'The same page opens on several URLs.'],
    lang: ['The page language is not declared', 'Browsers and search engines have to guess it; translation and screen readers work against the wrong language.'],
    yok: ['Nothing critical found.', 'The basics are in place.'],
  },
};


/* ---- GORUNTU SOZLUKLERI (5 Eyl 2026) ----
   ADADAN BURAYA TASINDI. Sebep olculdu: popup ve duvar mesajlari
   eklenince ana sayfanin ada JS'i J1 tavanini asti (bos panel halinde
   13.662 B / tavan 12.800). Duzeltme sozlugu de ayni sebeple HTML'den
   varlik JSON'una tasinmisti (bkz. dosya basi) — ayni yol tutuldu.
   Butun goruntu metni artik TEK dosyada, TEK uretecte; ada yalnizca
   DAVRANIS tasiyor. Metinler ada surumunden BIREBIR kopyalandi.
   Bekci: denetim T2 (kalem/durum/sebep sozlukleri iki tarafta). */
export const AD = {
  tr: {
      https: 'HTTPS', status: 'HTTP durumu', weight: 'Sayfa ağırlığı', title: 'Başlık',
      desc: 'Açıklama', h1: 'H1', canonical: 'Canonical',
      schema: 'Şema', og: 'Paylaşım kartı', lang: 'Dil', robots: 'robots.txt',
      sitemap: 'Sitemap', alt: 'Görsel alt metni', imgdim: 'Görsel ölçüsü',
      imgfmt: 'Görsel biçimi', fonts: 'Yazı tipi', inline: 'Satır içi yük',
      blocking: 'Engelleyici kaynak', compress: 'Sıkıştırma', cache: 'Önbellek',
      reqs: 'İstek sayısı', analytics: 'Ölçümleme', contact: 'İletişim',
      whatsapp: 'WhatsApp', local: 'Yerel işaret', viewport: 'Viewport',
    },
  en: {
      https: 'HTTPS', status: 'HTTP status', weight: 'Page weight', title: 'Title',
      desc: 'Description', h1: 'H1', canonical: 'Canonical',
      schema: 'Schema', og: 'Share card', lang: 'Language', robots: 'robots.txt',
      sitemap: 'Sitemap', alt: 'Image alt text', imgdim: 'Image dimensions',
      imgfmt: 'Image format', fonts: 'Web fonts', inline: 'Inline weight',
      blocking: 'Render-blocking', compress: 'Compression', cache: 'Caching',
      reqs: 'Request count', analytics: 'Analytics', contact: 'Contact',
      whatsapp: 'WhatsApp', local: 'Local signal', viewport: 'Viewport',
    },
};
export const DURUM_AD = {
  tr: { ok: 'İyi', warn: 'Uyarı', fail: 'Eksik' },
  en: { ok: 'Good', warn: 'Warning', fail: 'Missing' },
};
export const DURUM_MESAJ = {
  tr: {
      engel: 'Site otomatik erişimi engelliyor, bu yüzden taranamıyor.',
      reddedildi: 'Sunucu isteğimizi reddetti. Ortada bir engel sistemi imzası yok — erişim ayarı olabilir.',
      bulunamadi: 'Bu adreste sayfa yok.',
      'sunucu-hatasi': 'Sitenin kendi sunucusu hata verdi.',
      ulasilamadi: 'Siteye ulaşılamadı — adresi kontrol eder misin?',
    },
  en: {
      engel: 'The site blocks automated access, so it cannot be scanned.',
      reddedildi: 'The server refused our request. There is no block-system signature — it may be an access setting.',
      bulunamadi: 'There is no page at this address.',
      'sunucu-hatasi': 'The site\u2019s own server returned an error.',
      ulasilamadi: 'Could not reach the site \u2014 could you check the address?',
    },
};
export const SEBEP = {
  tr: {
      blocked: 'Bu adres taranamıyor (site otomatik erişimi engelliyor).',
      unreachable: 'Siteye ulaşılamadı — adresi kontrol eder misin?',
      timeout: 'Site zamanında yanıt vermedi — birazdan tekrar dene.',
      kota: 'Günlük tarama hakkın doldu.',
      oran: 'Çok sık denedin — biraz bekleyip tekrar dene.',
    },
  en: {
      blocked: 'This address cannot be scanned (the site blocks automated access).',
      unreachable: 'Could not reach the site — could you check the address?',
      timeout: 'The site did not answer in time — try again shortly.',
      kota: 'You have used your daily scans.',
      oran: 'Too many attempts — wait a moment and try again.',
    },
};
export const HUKUM = {
  tr: [
      [85, 'Sistem çalışıyor.', 'Yapı sağlam. Buradan sonrası hız ve içerik işi.'],
      [70, 'İyi ama açık var.', 'Temel yerinde; birkaç kalem talebi kaçırıyor.'],
      [50, 'Yarısı eksik.', 'Site duruyor ama seni bulan da bulamayan da var.'],
      [0, 'Talebi kaçırıyor.', 'Bu hâliyle gelen kişi seni bulamıyor ya da ulaşamıyor.'],
    ],
  en: [
      [85, 'The system works.', 'The structure is sound. From here it is speed and content.'],
      [70, 'Good, but there are gaps.', 'The basics are in place; a few items are losing demand.'],
      [50, 'Half of it is missing.', 'The site is up, but some people find you and some do not.'],
      [0, 'It is losing demand.', 'As it stands, the person who arrives cannot find or reach you.'],
    ],
};
