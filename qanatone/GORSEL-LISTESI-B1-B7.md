# GÖRSEL LİSTESİ — B1 (bento) ve B7 (akordeon galeri)

*21 Ağustos 2026 · giydirme turu · ölçüler canlı sayfadan alındı*

Bu belge Enes'in **hazırlayacağı görselleri** tarif eder. Kural: sen
**tek bir yüksek çözünürlüklü ana dosya** verirsin, varyantları üreteç
(`yeni/gorsel-uret.cjs`) basar — bileşen elle ölçü yazmaz, künyeye
girmeyen görselsiz basılır (proje görsellerinde işleyen desen).

**Teslim biçimi:** PNG veya JPG (kayıpsız/yüksek kalite), sRGB.
WebP'ye çevirmeyi ve kırpmayı üreteç yapar.
**Klasör:** `qanatone/gorsel-kaynak/` (yeni klasör; ana dosyalar depoda
durur, çıktı `yeni/public/img/` altına üretilir).
**Ad kuralı:** aşağıdaki tabloların "dosya adı" sütunu birebir.

---

## B1 · Bento — kanal kartları (ana sayfa, "sözler/kanallar" bloğu)

Altı kart, üç sütun. Kart içinde **büyük görsel + üstünde okunur bir
şerit** (etiket/başlık/açıklama). Bugün kartlar görselsiz; görsel
gelince kartın yüzü fotoğraf olacak, yazı şeridin üstünde duracak.

**Ölçülen kutular** (canlı sayfa):

| kırılım | kart kutusu (CSS px) |
|---|---|
| masaüstü 1440 | 337×348 (büyük) · 337×263 (orta) · 337×178 (küçük) |
| dizüstü 1280 | 337×329 · 337×249 · 337×169 |
| tablet 900 | 828×189 (tam genişlik satır) |
| mobil 390 | 350×234 · 350×212 |

Yani aynı görsel hem **dikeye yakın kare** (337×348) hem **çok geniş
şerit** (828×189) olarak kırpılacak. Bu yüzden ana dosya **geniş ve
merkezde nefes alan** bir kadraj istiyor.

**Ana dosya şartları (altısı için ortak):**
- En az **1600×1000 px** (16:10). Daha büyüğü sorun değil.
- **Önemli olan ne varsa ORTA %60'ta** dursun — kenarlar her kırılımda
  kırpılıyor.
- **Görselin içinde yazı OLMASIN.** Site iki dilli; yazı şeritte,
  HTML'de duruyor. (Ekran görüntüsü kullanacaksan arayüz yazısı
  okunmayacak kadar küçük/bulanık kalsın — dekor olarak çalışır.)
- Alt %35'i **sakin** olsun (şerit oraya biniyor); yüz, logo, ana özne
  o bantta kalmasın.
- Karanlık/kontrastlı görüntü tercih: sayfa siyah, kızıl vurgulu.
  Aşırı parlak veya beyaz zeminli görseller kartı yamalı gösteriyor.

| # | kart (bugünkü başlık) | dosya adı | görselde ne olsun |
|---|---|---|---|
| 1 | Google Arama | `kanal-google.png` | arama niyeti / sonuç ekranı atmosferi — ekran yakın çekim, yazılar okunmaz ölçekte |
| 2 | Meta Reklamları | `kanal-meta.png` | akışta reklam hissi: telefon ekranı, parmak, kaydırma anı |
| 3 | Web Siteniz | `kanal-web.png` | bir sitenin açılış anı: ekran + kod/ızgara dokusu, kızıl vurgu |
| 4 | Tek Ekran Rapor | `kanal-rapor.png` | pano/gösterge atmosferi: grafik ve rakam yüzeyleri, okunmaz ölçekte |
| 5 | WhatsApp Ajanı | `kanal-whatsapp.png` | gece, telefon ekranında konuşma balonları (metin okunmasın), yeşil DEĞİL kızıl tonlu ışık |
| 6 | Yapay Zekâ Asistanları | `kanal-ai.png` | sohbet arayüzü / ışıklı ağ dokusu — soyut, marka kızılında |

**Üreteç ne basacak** (senin işin değil, bilgi olsun):
`kanal/<ad>.webp` 680×700 (masaüstü kart) · `kanal/<ad>-g.webp`
1000×240 (tablet satır) · `kanal/<ad>-m.webp` 700×470 (mobil kart).
Toplam tahmini bütçe: 6 kart × üç varyant ≈ **90-120 KB** (ana sayfa
gzip tavanı 40 KB HTML'i etkilemez, görseller ayrı ve tembel yüklenir).

---

## B7 · Akordeon galeri — "Çalıştıklarımız" (7 proje)

Yatay akordeon: **aktif öğe genişler, pasifler daralır**. Pasif öğe
neredeyse dikey bir şerittir — görselin **dikey kompozisyonu** bu yüzden
kritik.

**Ölçülen kutular** (projeler sayfası, kap 800 px):

| durum | kutu (CSS px) | 2× hedef |
|---|---|---|
| aktif panel | ~296×480 | 592×960 |
| pasif şerit | ~74×480 | 148×960 |
| mobil (dikey liste / kaydırmalı şerit) | 350×260 | 700×520 |

**Ana dosya şartları (yedisi için ortak):**
- En az **1400×2100 px** (2:3 **DİKEY**). Bugünkü proje görselleri yatay
  ekran görüntüsü (1860×898) — akordeonda dikey kırpınca içerik
  kayboluyor, o yüzden yeni kadraj istiyorum.
- Kompozisyonun **dikey ekseni** taşısın: pasif şeritte görselin yalnız
  orta %25'lik dikey dilimi görünecek. O dilim tek başına "bu iş neydi"
  hissini vermeli.
- Üst %20'yi boş bırak: aktif panelde başlık ve etiket oraya yükseliyor.
- Yazı **olmasın** (dil değişiyor); marka logosu görselin içinde
  duracaksa küçük ve köşede olsun.

| # | proje | dosya adı | not |
|---|---|---|---|
| 1 | Mercedes-Benz (2026 · bayi ağı) | `galeri-mercedes-benz.png` | mevcut yatay görselin dikey kadrajı yeniden çekilmeli |
| 2 | Charles Schwab (2025 · içerik otoritesi) | `galeri-charles-schwab.png` | |
| 3 | Kononenko Group (2025 · web tasarım) | `galeri-kononenko-group.png` | |
| 4 | SkyClinics (2026 · web + otomasyon) | `galeri-skyclinics.png` | |
| 5 | CMBlu Energy (2025 · web tasarım) | `galeri-cmblu-energy.png` | |
| 6 | TeraWulf (2026 · web + otomasyon) | `galeri-terawulf.png` | |
| 7 | Bab İç Mimarlık (2026 · web + SEO) | `galeri-bab-ic-mimarlik.png` | mekân fotoğrafı dikey çok iyi çalışır |

**Üreteç ne basacak:** `galeri/<slug>.webp` 592×960 (aktif) ·
`galeri/<slug>-m.webp` 700×520 (mobil). Pasif şerit aynı dosyadan
kırpılır, ikinci dosya gerekmez.

---

## Karar bekleyen tek şey

**B7 galerisi nereye giriyor?** İki aday var:
1. `/projeler` dizini — bugün 7 kart var, akordeon onların yerine geçer.
2. Ana sayfadaki deste (yapışkan kartlar) — orası zaten kendi diliyle
   çalışıyor ve pin'li.

Görev belgesi "kart yerine" diyor; ben **1. adayı** (projeler dizini)
varsayıyorum ve ölçüleri ona göre verdim. İkinci adaysa kutular
değişir, listeyi güncellerim.

---

## Şu an elde ne var (yeniden üretmeyesin diye)

`yeni/public/img/` altında proje görselleri üç varyantta hazır:
`pt/<slug>.webp` 208×156 (dizin küçük görseli) · `pd/<slug>.webp`
1280×720 ve `pd/<slug>-m.webp` 744×419 (detay hero). Bunlar **yatay**;
B7'nin dikey kadrajını karşılamıyor. B1 için hiç görsel yok.
