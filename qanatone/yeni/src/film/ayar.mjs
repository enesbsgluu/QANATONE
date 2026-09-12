/* FILM · AYAR SABITLERI — TEK KAYNAK (30 Agu 2026, sertlestirme turu).

   NEDEN AYRI DOSYA: bu bes sayi iki yerde birden lazim —
     · `sahneler.ts` derleme aninda okur, `Film.astro` bunlari `data-*`
       olarak DOM'a yazar (tarayiciya inen sey budur);
     · `motor.ts` tarayicida, ilgili `data-*` DUSERSE kullanacagi YEDEK
       olarak okur.
   Eskiden sayilar iki tarafta da ELLE yaziliydi. Tutuyorlardi, ama biri
   degistiginde oburu sessizce eskiyordu: DOM her zaman kazandigi icin
   fark hicbir yerde kirmizi yakmiyordu. Artik tek yer burasi.

   motor.ts `sahneler.ts`i ITHAL EDEMEZ: o dosya `kanon.json` +
   `uretim.json` ithal eder, ikisi de yalniz derleme verisidir (sert
   degismez: kanon.json tarayiciya inmez). Bu yuzden sayilar yapraga tasindi.

   NEDEN .mjs: `node --test` bu dosyayi derleyici olmadan okuyabilsin
   (huni.mjs / hesap.mjs ile ayni gerekce — "derleme + istemci TEK
   kaynak"); TS tarafi da ayni dosyayi ithal eder.

   BU TURDA HICBIR DEGER DEGISMEDI — yalnizca yerleri degisti.
   Degerlerin gerekcesi ve olcum tarihcesi asagida, sahneler.ts'ten
   oldugu gibi tasindi. */

export const AYAR = {
  /* KAYDIRMA UZUNLUGU (px / film saniyesi) — DEVIR §6 ACIK KALEM.
     Kaynak: eski kod (montaj-duzenek/zincir.html `PX_PER_SN = 300`);
     yaklasikla kurulmadi. OLCULDU (27 Agu, 256,638 sn film):
       PX_SN=300 -> ray 76.991 px · masaustu 900 px ekranda 85,5 ekran boyu
       · saniyede 0,333 ekran · 1 ekran = 3,00 sn film
       · tekerlek centigi (100 px) = 0,33 sn = 8 kare
     Aday degerler: 200 (57 ekran, 1 ekran=4,5 sn) · 300 (eski)
       · 450 (128 ekran, 1 ekran=2,0 sn).
     DENEME: ?pxsn=450 — motor URL degerini alir ve ray boyunu da yeniden
     yazar. Deger oturunca buraya yazilir.
     28 AGU (Enes): varsayilan 450. Ray 115.487 px; masaustu 900 px ekranda
     128 ekran boyu, 1 ekran = 2,0 sn film, tekerlek centigi (100 px) =
     0,22 sn = 5,3 kare. */
  pxsn: 450,

  /* YAY + SONUM (28 Agu 2026, Enes) — kaydirmanin hedef konumu ile filmin
     gosterilen konumu arasinda kritik sonumlu yay (motor.ts basindaki not).
     SERTLIK k (1/s^2): oturma suresi ~5,8/sqrt(k). Uc aday:
       60  yumusak  ~0,75 s   (agir okuma, sinema hissi)
       120 orta     ~0,53 s   (VARSAYILAN)
       250 siki     ~0,37 s   (ele yapisik, hizli gezinme)
     DENEME: ?sert=250 (URL) · konsolda __fl.sert = 60. */
  sert: 120,

  /* SONUM c (1/s): 0 = kritik (2*sqrt(k)) otomatik; elle vermek yalniz
     deneme icin (c < 2*sqrt(k) salinir, c > asiri sonumlu surunur). */
  sonum: 0,

  /* HIZ TAVANI (28 Agu 2026, Enes) — gosterilen konum saniyede en cok bu
     kadar film-sn ilerler; daha hizli kaydirma yutulur, sayfadaki "atla"
     dugmesi (`__fl.atla()`) hedefe oturtur. 1x ve 1,5x olculdu, temiz
     (FILM-ISKELET-TURU 5. tur). 0 = tavan yok. DENEME: ?tavan=2 */
  tavan: 1.5,

  /* DURUSTA AKIS (28 Agu 2026, Enes) — kaydirma birakilinca film bu
     tempoyla ilerlemeye devam eder (film-sn / gercek-sn). 0 = kapali.
     DENEME: ?akis=0.12 */
  akis: 0.08,

  /* MOMENT DEVRI KATSAYISI (30 Agu 2026, TUR 6) — kaydirma birakildiginda
     hedefin son hizinin ne kadari yaya devredilir. 1 = tamami (28 Agu'dan
     beri surdurulen davranis, DEGISMEDI), 0 = hic devir yok (yay hedefe
     sifir hizdan baslar). Ara degerler lastik hissini kisaltir.
     NEREDE ISLIYOR: motor.ts MOMENT DEVRI blogu — devredilen miktar
     `min(|hedefHiz| * moment, w*|d|)` ve yalniz mevcut hizdan BUYUKSE
     yazilir; yani bu kol hizi ancak azaltabilir, artiramaz.
     NE ZAMAN ISLER: yalniz hedef DURDUGU ilk fizik adiminda (hedefDurdu===1).
     Savurma SIRASINDA hedef hareketli oldugu icin blok hic calismaz.
     DENEME: ?moment=0.3 (URL) · data-moment (DOM) · __fl.moment (konsol) */
  moment: 1,

  /* HIZALAMA (30 Agu 2026, TUR 7) — DENEYSEL KOL, VARSAYILAN KAPALI.
     0 = kapali (bugunku davranis, hicbir sey degismez).
     >0 = kullanici kaydirmayi biraktiginda kalan borc YOL KAT EDEREK degil
     SAYFA HIZALANARAK kapanir: film o anki hiziyla asmadan durabilecegi
     kadar (|v|/w) ilerler, sayfa o noktaya cekilir, borcun geri kalani
     atilir. Sayi bu savrulma payinin carpani: 1 = tam pay (asma sinirinda),
     2 = iki kat savrulma, 0,5 = daha kisa.
     NEDEN HARITA DEGIL SAYFA: `hedefT = f(scrollY)` degismezi ve ray
     boyunun filmin sonuyla ortusmesi korunsun diye (motor.ts basindaki
     "tek gercek kaynak scrollY" maddesi). Haritaya kayma terimi eklemek
     ayni etkiyi verir ama kayma savurma basina birikir.
     DENEME: ?hizala=1 (URL) · data-hizala · __fl.hizala (konsol)
     30 AGU (Enes, TUR 8): VARSAYILAN 2. Kol acildi; savurma birakildiginda
     film |v|/w x 2 kadar suzulup duruyor, kalan borc sayfa hizalanarak
     atiliyor. Kapatmak icin ?hizala=0. */
  hizala: 2,

  /* FPS YEDEGI (30 Agu 2026, TUR 2 Adim 0) — DIKKAT: bu bir AYAR DEGIL.
     fps'in kaynagi `kanon.json` (ffprobe), oradan sahneler.ts -> Film.astro
     -> `data-fps`. Bu sayi yalnizca `data-fps` DUSERSE devreye giren SON
     CARE yedegi. Neden gerekli: fps NaN olursa kareNo/kareSn/sar esiklerinin
     TAMAMI NaN olur — pxsn'den daha sert ve yine sessiz bir kirilma.
     SAPMA KORUMASI: `test/film-ayar.test.mjs` bu sayiyi kanon.json'un
     gercek fps'iyle karsilastirir; film yeniden encode edilip fps degisirse
     test kirmizi yakar (yedek sessizce eskiyemez). */
  fpsYedek: 24,
};

/* Uc aday sertlik — deneme icin; urun degeri AYAR.sert. */
export const SERTLIK_ADAY = [60, 120, 250];
