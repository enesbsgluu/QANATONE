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

## B1 · DURUM — 21 Ağustos, üretildi

**Belgenin "B1 için hiç görsel yok" satırı yanlıştı.** `img/ch1..ch6.webp`
(1400×933) zaten depoda duruyor: altısı da koyu, marka kızılında ve **yazısız**.
Üstelik konuları listedeki altı kanala birebir oturuyor. Yani B1'de üretilecek
görsel yoktu, kadraj/ton/varyant işi vardı — `yeni/gorsel-kanal.cjs` onu yapıyor.

| kaynak | konu | kart |
|---|---|---|
| ch1 | ışıklı arama sonuç satırları | `kanal-google` |
| ch2 | akışta kayan kartlar | `kanal-meta` |
| ch3 | dallanan düğüm | `kanal-web` |
| ch4 | grafik çubukları, biri parlıyor | `kanal-rapor` |
| ch5 | konuşma balonları | `kanal-whatsapp` |
| ch6 | ışıyan ağ | `kanal-ai` |

Ana dosyalar `gorsel-kaynak/kanal/<ad>.png` (1400×932), varyantlar
`yeni/public/img/kanal/` altında: `<ad>.webp` 680×700 · `<ad>-g.webp` 1000×240 ·
`<ad>-m.webp` 700×470. Üçünde de **büyütme yok**, hepsi küçültme.

**Perde dosyaya basılmaz.** Kutu oranları üç varyantta farklı, basılı perde geniş
şeritte yanlış yere düşer. Perde CSS'te — B7'deki "ton basılır, renk CSS'e kalır"
ilkesinin buradaki karşılığı: **görsel basılır, okunabilirlik CSS'te.**

```css
.kn::after{content:'';position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(0deg,rgba(5,5,5,.92) 6%,rgba(5,5,5,.55) 30%,transparent 62%)}
```

**Ton dengesi kartta kurulur, bento CSS'inde değil.** ch2 ve ch5 öbür dörtten
belirgin parlaktı, altısı yan yana gelince ikisi öne fırlıyordu; ikisine karta özel
`brightness` payı verildi. Sebep: kart tek başına da görünüyor (tablet satırı,
mobil), aileye orada da ait olmalı.

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

## B7 · DURUM — 21 Ağustos, üretildi

Bu bölüm artık Enes'in hazırlayacağı görselleri tarif etmiyor; yedisi de
`yeni/gorsel-kompoze.cjs` ile **üretildi**. Ana dosyalar
`gorsel-kaynak/galeri/galeri-<slug>.png` (1400×2100), varyantlar
`yeni/public/img/galeri/` altında (aktif 592×960, mobil 700×520).
Toplam varyant yükü ≈ 140 KB / 14 dosya; en ağırı CMBlu (25 KB, detaylı cephe).

**Neden üretim gerekti:** mevcut yedi kaynağın **hepsi** okunur yazı taşıyordu —
Mercedes'te basılı İngilizce başlık, Schwab/Kononenko/TeraWulf'ta kadrajı kaplayan
kelime markası, SkyClinics/Bab'da site metni. Dikey kırpma bunu kurtarmıyor.

**Dil (dördü de betiğin başında yazılı):** bulanık dikey zemin + keskin yatay odak
bandı · **ton basılır, renk CSS'e kalır** · yazı görselden değil kaynaktan kesilir ·
kadraj merkez %25 dilime göre kurulur, kareye göre değil.

**Duotone artık dosyada değil, CSS'te** (Enes'in kararı, 21 Ağustos). Pasif şerit
duotone, aktif kart gerçek renkte açılır; tek `--k` değişkeni iki katmanı sürer:

```css
.gl::before{background:var(--bg);opacity:calc(var(--k,1) * .42)}   /* koyuluk */
.gl::after {background:var(--red);mix-blend-mode:color;opacity:var(--k,1)}
.gl[data-acik]{--k:0}
```

Bunun iki sonucu var: (1) ana dosyalarda **patlamış beyaz bırakılmaz** — `color`
harmanı luminansı korur, 240 üstü kanal kızıla dönmez ve kart yamalanır; betik her
koşumda en parlak kanalı raporlar. (2) CSS gelmeden görsel gelirse kartlar tam
renkli açılır, sonra kızıla oturur — FOUC kalemi bunun üstüne biniyor.

**Ölçüm dersi:** kesimler ızgaralı önizlemeden **göz kararıyla okunamıyor**. Bab'ın
başlığını 1295'te bitiyor diye okudum, kesip bakınca 1615 çıktı; Schwab'ın tabelasını
y<350 sandım, 425-850 çıktı. Kesim koordinatı yazıldıktan sonra **kesilip bakılmadan
kabul edilmez**.

**Üç zayıf kimlik (kaynak değişirse sırası budur):**

| proje | sorun | bugünkü çare |
|---|---|---|
| Kononenko | afiş kareyi yiyor, yazısız alan yalnız afişin boş alt yarısı | büyük beyaz düzlem + kafe; kare kimlik söylemiyor |
| Charles Schwab | mavi tabela ve camdaki hayalet marka kadrajın ortasında | üst cephe (cam + yaprak); mavi yalnız bulanık zeminde leke |
| Bab İç Mimarlık | yazısız **ve yeterince yüksek** alan yok | başlık bloğunun altındaki koltuk grubu, bant 3,8x büyütüyor |

---

## Karar verildi — B7 `/projeler` dizinine girdi

Akordeon, dizindeki 7 kartın **yerine geçti** (1. aday). Ölçüler bu belgede
verildiği gibi: kap 800, aktif ~305, pasif ~76, yükseklik 480.

Üç şey bilinçli, `ProjeDizin.astro`nun başında da yazılı:

1. **İçerik kaybolmadı.** Pasif öğenin yazısı `opacity` ile sönüyor, DOM'dan
   çıkmıyor. `display:none` ve `visibility:hidden` kullanılmadı — ikisi de
   metni ekran okuyucudan ve tarayıcıdan siler. Dizinin bütün metni
   (yıl · etiket · ad · anlatım · rakamlar · bağlantı) her durumda kaynakta.
2. **Ada JS'i yok.** Genişleme `flex-grow`, açılma `:hover`/`:focus-within`.
   Varsayılan açık öğe ilk proje; kabın üzerine gelince o kapanıyor, imlecin
   durduğu açılıyor — S-SZ bento'sunun kurduğu desen.
3. **Duotone tek değişkende.** `--k` aynı anda kızıl katmanı, karartmayı ve
   yazı opaklığını sürüyor. Katmanlar **yalnız masaüstünde** kuruluyor:
   dokunmatikte pasif/aktif diye bir durum yok, `--k:0` olsa bile ayakta
   duran `mix-blend-mode` katmanı harman bağlamı doğuruyor ve H14'ün mobil
   pahalı katman disiplinine giriyor.

Mobil: dikey liste, görsel üstte yatay bant (`-m.webp` 700×520), yazı altında,
kızıl katman yok — yani mobilde kareler gerçek renginde.

**Ana dosyalar depoda tutulmuyor.** `gorsel-kaynak/` yok sayılıyor (13 dosya
≈ 11 MB) çünkü ikisi de üretilebilir: `node gorsel-kompoze.cjs` ve
`node gorsel-kanal.cjs` kaynağı `img/`den okuyup aynısını basıyor. Yayına
giren `.webp` varyantlar depoda.

---

## Şu an elde ne var (yeniden üretmeyesin diye)

`yeni/public/img/` altında proje görselleri üç varyantta hazır:
`pt/<slug>.webp` 208×156 (dizin küçük görseli) · `pd/<slug>.webp`
1280×720 ve `pd/<slug>-m.webp` 744×419 (detay hero). Bunlar **yatay**;
B7'nin dikey kadrajını karşılamıyor. B1 için hiç görsel yok.
