/* BULTEN KONULARI — TEK KAYNAK (9 Eyl 2026).

   ADLANDIRMA UYARISI (Enes, 9 Eyl): sitede "sektor" IKI AYRI SEYI
   anlatiyordu ve bu bir tuzakti.
     · `content.json.sectors` = hizmet verilen ALTI SEKTOR (insaat,
       saglik, eticaret, esnaf, uretim, finans) — ana sayfa sahnesi.
     · `posts[].topic`       = yazinin KONUSU (talep, reklam, arama,
       sektor) — bulten cipleri. 9 Eyl 2026'ya kadar bu alanin adi da
       `sector`di; gercek sektor bagi gelince ad anlamina cekildi.
   Ikincisi sektor DEGIL konu. Arsiv rotasi bu yuzden `/bulten/konu/<k>`:
   `/bulten/sektor/sektor/` gibi bir yol dogmasin ve ileride ALTI gercek
   sektorun arsivi icin `/sektor/` adi bos kalsin. Veri alani `sector`
   olarak KALDI — panelin ve content.json'un sozlesmesi degismedi, yalniz
   URL ve arayuz dili durustlestirildi.

   ETIKETLER PANELE TASINDI (9 Eyl 2026). Onceden bu dosyada SABIT
   duruyorlardi; sokum turunda (4 Eyl) bilincli birakilmisti ama arsiv
   sayfalari gelince durum degisti: etiket artik SAYFA BASLIGINI besliyor
   ("Talep yonetimi — Bulten — QANATONE"). Kodda kalsaydi panelden yeni
   bir konu anahtari geldigi an o konunun arsiv basligi HAM ANAHTAR
   olurdu ("talep — Bulten") ve bunu hicbir sey soylemezdi.
   Kaynak artik `content.json.topics` ([{k, tr, en}]).

   YEDEK KUME NEDEN DURUYOR: panel alani bos ya da bozuksa site
   etiketsiz kalmasin. "Uretim ilk gunden dogru, panel yalniz ezebilir"
   kurali — ayni dusus bicimi `strings` tarafinda da var. */

import { icerik } from './icerik';

const YEDEK: Record<string, [string, string]> = {
  talep: ['Talep yönetimi', 'Lead handling'],
  reklam: ['Reklam & bütçe', 'Ads & budget'],
  arama: ['Arama & yapay zekâ', 'Search & AI'],
  sektor: ['Sektör verisi', 'Sector data'],
};

/** Panelden gelen konu tablosu; bos/bozuksa yedek kume. */
export const KONU_ETIKET: Record<string, [string, string]> = (() => {
  /* `icerik.topics` DUZ YAZILIYOR, `(icerik as any)` ile DEGIL.
     Iki sebep: (1) `icerik` zaten JSON.parse ciktisi, yani any — donusum
     gereksizdi; (2) T8 kapisi "panelde editoru olan her koleksiyon sitede
     OKUNUYOR olmali" kuralini KAYNAK METINDE ariyor ve donusum onu
     gormuyordu. Kapi hakliydi: okumayi greplenebilir birakmak, kodun
     kendini anlatmasinin bir parcasi. */
  const panel = (icerik && icerik.topics) || [];
  if (!Array.isArray(panel) || !panel.length) return YEDEK;
  const t: Record<string, [string, string]> = {};
  for (const x of panel) {
    if (!x || !x.k) continue;
    t[String(x.k)] = [String(x.tr || x.k), String(x.en || x.tr || x.k)];
  }
  return Object.keys(t).length ? t : YEDEK;
})();

/** Etiket; bilinmeyen anahtarda anahtarin kendisi (sessiz bayatlama yok).
    Etiketsiz anahtar ARSIV BASLIGINA dusecegi icin ayrica kapida: T13. */
export const konuAdi = (k: string, dil: 'tr' | 'en'): string =>
  KONU_ETIKET[k] ? (dil === 'en' ? KONU_ETIKET[k][1] : KONU_ETIKET[k][0]) : k;

/** Yazi listesinden gecen konu anahtarlari (gorulme sirasinda). */
export const konulariCikar = (yazilar: any[]): string[] =>
  [...new Set(yazilar.map((p: any) => String(p.topic || '')))].filter(Boolean);

/* ROTADA KULLANILAMAZ SLUG'LAR. `/bulten/konu/…` ve `/bulten/sayfa/…`
   birer dizin segmenti; `konu` ya da `sayfa` adli bir YAZI slug'i
   `/bulten/<slug>` ile ayni yola dusup rotayi belirsizlestirirdi.
   Astro statik rotayi one alir, yani yazi sessizce ERISILEMEZ olurdu —
   belirti vermeyen kayip. Bekci: T11. */
export const AYRILMIS_SLUG = ['sayfa', 'konu'];
