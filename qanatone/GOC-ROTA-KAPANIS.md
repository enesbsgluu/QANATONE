# GÖÇ TURU KAPANIŞ RAPORU — ROTA SAYFALARI

**20 Ağu 2026 · 95593d0 → bu commit · Göç Anayasası v2 · İSKELET turu
çerçevesi (ana sayfa raporundaki tanımla aynı: amaç birebir görüntü değil,
yeni görsel dili taşıyacak ada mimarisi; sapmalar raporlanır, giydirme
ayrı tur).** Ana sayfa turunun raporu: `GOC-TUR-KAPANIS.md`. O raporun
"URL — AÇIK (rota turu)" listesi bu raporla kapanır.

**SAYFA İŞLERİ BİTTİ.** Savurma/telefon hükmü Enes'te — bu rapor kesmenin
(Faz 4) ön şartlarını günceller; kesme ayrı iştir.

---

## 1 · Rota listesi — commit, dönüşümlü ölçüm

Ölçüm düzeni ana sayfa turuyla aynı: Lighthouse 13.4.1 mobil, simulate,
yerel gzip'li sunucu, koşum düzeyinde dönüşümlü (A,B,A,B), 1 ısınma +
3'er koşum ortancası. Her satırda yeni ↔ eski AYNI dakikada.

| Rota | Commit | Yeni | Eski | Ağırlık (yeni↔eski) |
|---|---|---|---|---|
| /hizmetler (+en) | 95593d0 | 100 · LCP 954 · TBT 0 | 50 · 7.011 · 503 | 34 ↔ 908 KB |
| /projeler (+en) | 4921100 | 100 · 1.054 · 0 | 41 · 10.151 · 737 | 36 ↔ 1.468 KB |
| /projeler/× 7 detay (+en) | 4921100 | 100 · 1.054 · 0 | 51 · 6.945 · 482 | 33 ↔ 938 KB |
| /bulten (+en) | feee823 | 100 · 944 · 0 | 49 · 7.104 · 461 | 37 ↔ 925 KB |
| /sss (+en) | 0fa75c6 | 100 · 905 · 0 | 52 · 6.544 · 448 | 60 ↔ 861 KB |
| /surec (+en) | 15e22fb | 100 · 1.054 · 0 | 52 · 6.558 · 451 | 29 ↔ 861 KB |
| /otomasyon (+en) | 9f8f7c3 | 100 · 904 · 0 | 53 · 6.549 · 416 | 32 ↔ 865 KB |

CLS her iki tarafta her ölçümde 0. Rota adları eskiyle BİREBİR — bu aile
kesmede redirect istemez. (Tek istisna Faz 1 mirası: hizmet detayları
yeni kabukta `/hizmet/<slug>`, eski `/hizmetler/<slug>` — kesmede 9×2
redirect İSTER; canonical'lar zaten canlı çoğul adrese verildiği için
kopya içerik yok. Faz 4 listesine yazıldı.)

## 2 · Bot'un ilk kez gördükleri

Eski tarafta bu içerik JS'le doğuyordu, ham HTML'de YOKTU:

- **/sss:** beş soru-cevabın tamamı (`renderFaq`).
- **/surec:** müşteri yolu çizgisinin beş etiketi (`chan()` — etiketler
  kodda, çizim `getTotalLength` + kaydırma dinleyicisiyle).
- **/otomasyon:** akışın tamamı — 4 giriş kanalı, 5 ajan adımı, 4 çıkış
  aksiyonu (`flowKur` IN/OUT/STEPS).
- **/projeler detayları:** blok gövdeleri (`pdBlocks`) ve `.dkres`
  rakamları (dizin turunda kapanmıştı, bütünlük için burada).

Hepsi artık derlemede basılıyor; bekçileri R ailesi (aşağıda).

## 3 · Ada mimarisi

- **Ada JS'i 0:** hizmetler, projeler (+7 detay), bülten dizini, sss,
  surec — sayfadaki tek betik Astro prefetch (2,3 KB).
- **Tek ada:** /otomasyon huni hesaplayıcısı (S-TE deseni) — iskelet ve
  varsayılan rakamlar derlemede, JS yalnız kaydırıcı dinler, açılışta
  sıfır iş, JS kapalıyken sayfa varsayılanlarla anlamlı. ₺ aritmetiği
  `src/huni.mjs` (derleme+istemci TEK kaynak), `test/huni.test.mjs`
  eski formülün bağımsız kopyasıyla uçlarda birebir (varsayılan çıktı
  ₺929.157 dahil). Gerçek Chrome'da sınandı: 200 talep · ₺200.000 →
  kaçan 124 · ₺24.777.520 (el hesabıyla eş).
- **Formlar:** bülten abone formu statik HTML + native POST (Netlify
  "bulletin" formunu derleme HTML'inden tanır; honeypot `website`
  kaynakla aynı). Dizinler lead formu taşımaz — ada tek formu ana
  sayfada tutar, CTA'lar oraya bağlanır.

## 4 · Metin düşüşü (data-t göçü)

Eski `data-t` düzeninin birebir karşılığı: bileşen `strings[dil][k]`
doluysa panelinkini, boşsa varsayılanı basar. **TR varsayılanları eski
markup'ın kendisi** — bu sayfaların anahtarları `strings.tr`'de hiç yok
(ölçüldü; /otomasyon'un 93 anahtarının tümü `strings.en`'de, hiçbiri
`strings.tr`'de). Panel EN metni değiştirirse sayfa değişir; bekçisi R7
(b) — bileşen varsayılanda kalırsa sessiz bayatlama olurdu.

## 5 · Bilinçli taşınmayanlar ve sapmalar

**Taşınmayanlar (giydirme turuna):**
- Süreç çizgisinin çizilme + nokta animasyonu (statik tam hâl basılıyor;
  giydirmede `pathLength="1"` + scroll-driven CSS — perde SVG izler kararı).
- Otomasyon akışının tel + paket animasyonu; sızıntı sahnesinin canvas
  partikülleri (metin ve son-hâl çubukları statik: Önce %100 · Sonra %46).
- Kart/hero görselleri (projeler — S-SZ bayt dersi).

**Taşınmayanlar (taşımak yanlış olurdu):**
- "Canlı iş akışı" şeridi, "N talep işlendi" sayacı, "Kaydırdıkça akış
  çalışır" satırı — statik sayfada sahte canlılık (perdenin sahte-dolum
  kararıyla aynı ilke).
- Sektör filtre çipleri (projeler + bülten) — etiket haritaları kodda /
  sektörler anahtarsız; panelden gelen yeni değerde çip SESSİZCE bayatlar.
- Bülten abone formunun satır içi "kaydettik" mesajı (JS isterdi; native
  POST Netlify teşekkür sayfası gösterir).
- Akışın sektör bağlama davranışı — eski sayfa doğrudan açılınca zaten
  'genel' basıyordu; statik hâl o varsayılanın aynısı.

**S1-birebir sapmaları (hepsi ölçülü, hepsi bilinçli):**
- /otomasyon desc'inin "canlı akış diyagramı" parçası değişti — olmayan
  canlılığı vadetmemek için; turun tek anlam sapması.
- Kısa desc'ler türetilmiş kuyrukla uzatıldı (S1 tabanı 50): /sss TR 47
  · EN 37, /surec TR 41 · EN 25, /otomasyon EN 37. Sayılar veriden gelir
  (soru/adım sayısı), panel ekleyince kendiliğinden güncellenir.
- SSS ve süreç sonuna "Konuşalım" düğmesi (hizmetler dizini kararının
  tekrarı); bülten dizin şemasına ItemList (hizmetler/projeler tutarlılığı).
- Bülten kırıntısının (BreadcrumbList) 2. basamağı EN sayfada `/en/bulten`
  gösterir — eski kod iki dilde de TR adresi basıyordu; kimlik-dil
  ilkesiyle (kural 107 ailesi) tutarlı küçük düzeltme.

## 6 · Şema paritesi — bu kapanışta yakalanıp kapanan açık

Ana sayfa raporu "kalan türler rota sayfalarıyla gelecek" demişti. Dizin
ve proje detay şemaları turda birebir taşınmıştı; **kapanış taraması Faz 1
mirası iki açık buldu:** hizmet ve bülten detayları TEKİL düğüm basıyordu,
eski taraf üçlü @graph + tür basıyor — hizmette `det.faq` varsa **FAQPage**
(zengin sonuç kaybıydı), bültende **BreadcrumbList** + Article'ın
dateModified/author/image/mainEntityOfPage alanları. `hizmetSema`/`yaziSema`
ile alan alan kapatıldı; tür kümeleri artık eski çıktıyla dosya dosya eş
(geo: Service+FAQPage(3 soru)+üçlü · yazı: Article+BreadcrumbList+üçlü).

Türlerin tamamı: Organization · WebSite · WebPage (her sayfa) · ItemList
(3 dizin) · Service (+FAQPage) (9×2) · CreativeWork (7×2) · Article +
BreadcrumbList (6×2) · FAQPage (/sss).

## 7 · Bekçiler (bu turda eklenenler)

| Bekçi | Ne tutar |
|---|---|
| R1-R3 | hizmetler/projeler dizin + detay bütünlüğü (önceki kapanıştan) |
| R4 | bülten dizini: yazı ad+lede+tarih+bağlantı + statik abone formu |
| R5 | sss: soru+cevap ham HTML + FAQPage mainEntity sayısı + kimlik kendi adresinde |
| R6 | süreç: adım alanları + 5 yolculuk etiketi ham HTML'de |
| R7 | otomasyon: yapısal parite + EN metinleri strings.en'den GÜNCEL |
| S1 | kapsam: bütün rota aileleri (hreflang çifti + şema biçimi) |
| T1 | artık `test/` klasöründeki TÜM *.test.mjs koşar (9 test) |
| sayfa formülü | content.json'dan: services·posts·projects ×2 + 15 |

Kapanış anı: **43 kural / 0 kırmızı · 59 sayfa.**

## 8 · Bağlantı kaçakları (dist taraması)

**GÜNCELLENDİ — /en ana sayfa adası kuruldu (kapanışın hemen ardından):**
kök-sabit kaçak tek sınıfa indi: yapısal `/` ×121 (logo + «ana site»,
kesmede kendiliğinden doğru). `/en#iletisim` ×13 ve `/en#lead` ×1
sınıfları SIFIRLANDI — altı CTA `${B}/en`e döndü. H16 bekçiliyor.

`/yeni/en/` kapı ölçümü (dönüşümlü, 3 koşum ortancası): **yeni 98 ·
FCP 1.213 · LCP 1.739 · TBT 42 · CLS 0 · 164 KB ↔ eski /en 62 ·
3.822 · 6.665 · 186 · 987 KB.** TR ana bandıyla uyumlu. S2/S3/S5
anlatılarının EN metni TR'nin sadık çevirisi (sahne dosyalarında iki dil
yan yana) — **savurmada TR'yle birlikte Enes bakmalı.** EN ana gzip
28.040 B: TR tavanının (28.672) altında ama **H ailesi bekçileri yalnız
TR anayı ölçer** — EN'e genişletme ayrı iş.

## 9 · Kalan işler

**Rota (üreteç/kesme):** `bulten/rss.xml` · sitemap.xml (eskileri kök
build.js üretiyor; kesmede yeni üreteç ister). **Faz 4 ek şartı:** hizmet
detay redirect'leri (9×2, tekil→çoğul) + H bekçilerinin EN anaya
genişletilmesi.

**Enes'te bekleyenler:** rota sayfalarının savurma/telefon hükmü ·
giydirme turunun başlangıcı (ertelenen animasyonlar bölüm 5'te) · Faz 3
(haber ağı) / Faz 4 (kesme) sırası.
