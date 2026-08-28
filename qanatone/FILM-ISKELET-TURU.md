# FILM İSKELET TURU — ölçüm raporu (27 Ağu 2026)

Kaynak sözleşmeler: `DEVIR-SPESIFIKASYONU.md` + `HIGGSFIELD-SCRUB-MOTORU.md`
(ikisi de `C:\Users\Monster\Intel\Downloads\`).
Kapsam: **yalnız iskelet** — metin yok, giriş Q sahnesi yok, final devri yok.
Deploy yok, push yok. Bütün hükümler ölçümden; karar kalemleri Enes'te.

---

## 1. Klip künyesi (ffprobe, tahmin yok)

39 klip · **256,638 sn** (4 dk 16,6 sn) · **24 fps** · 6159 kare · h264 / yuv420p · sessiz
Ham kaynak toplamı 375,2 MiB. Künye: `yeni/film/kanon.json` (üreten: `yeni/film/probe.cjs`).

**sahne32–39 kapısı — GEÇTİ.** Beklenen 8,8,8,8,5,5,5,5; ölçülen sekizi de tam
(8,042 / 5,042 sn — 24 fps'te 193 ve 121 kare). Kaydırma yapılmadı, gerek olmadı.

**Belgeden iki sapma (Enes'e):**

| | belge | ölçülen |
|---|---|---|
| çözünürlük | "Tümü 16:9, 1280×720" | 38 klip **1284×716** (oran 1,793), **sahne1 tek başına 1144×804** (oran 1,423) |
| en-boy | tek oran | iki oran |

sahne1 giriş sahnesinin arka planı olacak klip (DEVIR §2), yani sapma tam da
kritik yerde. Nehir kaynağı karede görünür durumda — o şart karşılanıyor
(`gorsel-kaynak/film/sahne1-ilk-kare.png`).

---

## 2. Üretim hattı

`HIGGSFIELD-SCRUB-MOTORU.md` §6'daki `scroll-scrub-video.sh` **birebir** kullanıldı;
parametreler betikte yaşıyor, sarmalayıcıda (`yeni/film/uret.cjs`) değil.
Sıra: desktop → mobile → poster (encode edilmiş klipten) → bounds.

Sert değişmez doğrulaması (`uretim.json` sha1 zinciriyle):

- **#1 poster = ENCODE EDİLMİŞ klibin karesi: 39/39** masaüstü, 39/39 mobil
- **#2 mobileClip varsa mobilePoster: 39/39**
- **#5 CSP `media-src 'self' blob:`** — `_headers` içinde var
- **#3 sahne dizisi modül sabiti** — `src/film/sahneler.ts`, `kanon.json`'dan türer
- **#4 kare başına değer framework'ten sürülmez** — doğrudan `video.currentTime`

### Bu turda düzeltilen iki gerçek kusur

1. **PNG posterler yayına çıkıyordu.** `public/varlik/film/*.png` = 87,9 MiB ara ürün;
   sayfa WebP okuyor ama PNG'ler `dist/`e kopyalanıyordu. Hat `yeni/film/poster-ham/`e
   taşındı (gitignore'da). 78 WebP posterin sha1'i **bit-bit aynı kaldı** — taşıma
   encode'a dokunmadı.
2. **Nav dil değiştiricisi kırık bağlantı üretiyordu.** `/yeni/en/film` sayfası yok;
   Astro'nun `prefetchAll` + `viewport` stratejisi bu bağlantıyı gerçekten fetch edip
   404 alıyordu. `Nav.astro`'daki `essiz` listesine `/film` eklendi (mekanizma zaten
   vardı, `/film` unutulmuştu).

### Kapatılmayan, bilinen açık

`/favicon.ico` 404 — sitede hiç `rel="icon"` bildirimi ve favicon dosyası yok.
**Film sayfasına özgü değil, kabuk geneli.** Bu turun kapsamı dışında bırakıldı.

---

## 3. Bütçe — KAPI AŞILDI

| hat | toplam | kapı | **aşma** | oran |
|---|---:|---:|---:|---:|
| masaüstü | **200,8 MiB** | 32,0 MiB | **+168,8 MiB** | **×6,28** |
| mobil | **163,8 MiB** | 16,0 MiB | **+147,8 MiB** | **×10,24** |
| poster webp (sayfaya inen) | 5,4 MiB | kapı dışı | — | — |

**En büyük 5 klip**

| klip | süre | masaüstü | mobil | masaüstü kbps | tek başına kapının |
|---|---:|---:|---:|---:|---:|
| sahne34 | 8,04 sn | 10,9 MiB | 8,7 MiB | 11 345 | %34,0 |
| sahne35 | 8,04 sn | 10,8 MiB | 8,5 MiB | 11 252 | %33,7 |
| sahne27 | 8,04 sn | 9,6 MiB | 7,6 MiB | 10 001 | %30,0 |
| sahne29 | 8,04 sn | 8,3 MiB | 6,6 MiB | 8 705 | %26,1 |
| sahne26 | 8,04 sn | 8,2 MiB | 7,1 MiB | 8 548 | %25,6 |
| **5 klip** | 40,2 sn | **47,8 MiB** | **38,4 MiB** | | **%149 / %240** |

**Aşmanın kökü:** kapı süreyle ölçeklenmiyor. 32 MiB ÷ 256,6 sn = **1046 kbps**
ortalama gerektirir; hat 6564 kbps. Kapının izin verdiği klip başı boyut masaüstünde
0,8 MiB, mobilde 0,4 MiB; üretilen 5,1 ve 4,2 MiB.

**Ayrıca ölçüldü: mobil hattın "720p tavanı" bu malzemede etkisiz.** Higgsfield
betiğinin `scale=-2:'min(720,ih)'` satırı 716 satırlık klipte hiçbir şey yapmıyor —
mobil hat masaüstü çözünürlüğünde kalıyor. Mobil aşmanın ×10,24 olmasının
sebeplerinden biri bu. (İlk taramada `min(960,ih)` adayı da aynı sebeple native ile
birebir aynı çıktı; tarama bu yüzden sabit yükseklikle yeniden kuruldu.)

### Seçenek A — CRF / çözünürlük düşürme (ölçüldü)

5 temsilci klip (sahne34, 27, 16, 13, 22 = hattın %16,4'ü) her adayla gerçekten
encode edildi; hat toplamı bu orandan **ölçekli tahmin**. Kalite referansı = şu an
yayına giden hal (CRF 20 / GOP 8 / native). Örnek kareler: `yeni/film/crf-tarama/`.

| aday | çözünürlük | hat ~ | 32 MiB | 16 MiB | PSNR | SSIM |
|---|---|---:|---:|---:|---:|---:|
| **mevcut** | 1284×716 | 200,8 MiB | ×6,28 | ×12,55 | — | — |
| crf24 | 1284×716 | 119,6 MiB | ×3,74 | ×7,48 | — | — |
| crf28 | 1284×716 | 73,1 MiB | ×2,29 | ×4,57 | 39,33 | 0,97 |
| crf32 gop12 | 1284×716 | 41,0 MiB | ×1,28 | ×2,56 | 36,83 | 0,96 |
| crf26 | ~968×540 | 60,9 MiB | ×1,90 | ×3,81 | 37,74 | 0,97 |
| crf28 | ~968×540 | 48,4 MiB | ×1,51 | ×3,03 | 36,90 | 0,96 |
| **crf28 gop12** | **~775×432** | **31,3 MiB** | **×0,98 GEÇER** | ×1,96 | 34,99 | 0,95 |
| **crf30 gop12** | **~646×360** | **19,7 MiB** | **×0,61 GEÇER** | ×1,23 | 32,90 | 0,93 |

Okuması: **yalnız CRF ile kapı geçilmiyor** — CRF 32 bile ×1,28'de duruyor.
Masaüstü kapısı ancak **432 satıra** inince açılıyor. Mobilin 16 MiB'ı 360 satırda
bile ×1,23; mobil için ya daha agresif bir ayar ya ikinci bir karar gerekiyor.

### Seçenek B — segmentli yükleme

**Not: motor bunu zaten yapıyor.** `DEVIR §3 Seçenek B` uygulandı — 39 klip ayrı
dosya, sınırda el değişimi, mevcut/+1/−1/+2 sırasıyla **tek seferde tek indirme**.
Yani B, kapıyı bugünkü hâliyle *geçmiyor*; kapıyı yeniden tanımlıyor:

- **ağdan inen bayt zamana yayılır** — kullanıcı yalnız gezdiği klipleri indirir
- **ama bellek maliyeti aynı kalır**: motor sözleşme gereği ziyaret edileni bırakmıyor
  (geri kaydırma birinci sınıf yol). Ölçüldü: masaüstünde 40 sn film gezildiğinde
  **37,9 MiB blob** birikiyor; film baştan sona gezilirse bu 200,8 MiB'a çıkar.

B'yi kapıya uydurmanın yolu bellek tavanı koymaktır (uzak klipleri revoke etmek) —
bu, sözleşmenin "geri kaydırma birinci sınıf" maddesiyle takas edilir.

**Karar Enes'te.** Bu belge iki seçeneği ölçülmüş hâlde bırakır, seçim yapmaz.

---

## 4. Oynatma ölçümü

Gerçek Chrome (headless), **üretim çıktısı** (`dist/`) sunuldu, her yapılandırma
**taze tarayıcıda 3 tekrar**, değerler medyan. "Sunulan kare" `requestVideoFrameCallback`
ile ölçüldü — tahmin değil. Sürücü kendini doğrular (scrollTo sapması sayılır).
Düzenek: `yeni/film/olc.cjs`, çıktı `yeni/film/olcum/sonuc.json`.

| küme | ağ / CPU | ilk kare | süpürme | atlama % | max boşluk | hazır varış | takılma | kare p95 | uzun görev | CLS | blob |
|---|---|---:|---|---:|---:|---|---:|---:|---|---:|---:|
| masaüstü | wifi, 1× | **547 ms** [306–645] | sert ileri | 25,0 | 11 kare | 6/6 | 0 ms | 10,9 ms | **0** | **0** | 37,9 MiB |
| masaüstü | wifi, 1× | | sert geri | 18,0 | 9 kare | 6/6 | 0 ms | 10,1 ms | **0** | **0** | 37,9 MiB |
| masaüstü | wifi, 1× | | okuma 1× | 1,9 | 6 kare | 6/6 | 0 ms | 9,6 ms | **0** | **0** | 37,9 MiB |
| mobil | 4G 12 Mbit, 4× | **1969 ms** | sert ileri | 5,2 | **154 kare** | **1/4** | **3179 ms** | 9,5 ms | **0** | **0** | 10,6 MiB |
| mobil | 4G 12 Mbit, 4× | | sert geri | **34,4** | 18 kare | 3/4 | 962 ms | **39,5 ms** | **0** | **0** | 19,5 MiB |
| mobil | 4G 12 Mbit, 4× | | okuma 1× | 0,5 | 1 kare | 4/4 | 0 ms | 9,5 ms | **0** | **0** | 23,3 MiB |
| mobil | 4G yavaş 4 Mbit, 4× | **5814 ms** | okuma 1× | 1,0 | **112 kare** | 2/4 | **8483 ms** | 10,4 ms | **0** | **0** | 10,6 MiB |

Savurma = filmin W saniyesini W/3,3 saniyede geçmek; okuma = 1× tempo.

**Uzun görev 0, CLS 0 — yedi yapılandırmanın hepsinde.** Motor kare başına değeri
DOM'dan sürüyor, düzen okuması döngü dışında; bu taraf temiz.

**Mobilde ileri savurmada atlama oranı yanlış yeşil veriyor.** %5,2 iyi görünüyor
ama dört sahne sınırından yalnız **biri** hazır klibe varıyor: 3179 ms takılma,
**154 karelik boşluk**. Film ilerlemiyor, poster üstünde bekliyor — istenen kare
sayısı düştüğü için atlama yüzdesi de düşüyor. Tek başına o sütuna bakan yanılır.

**Geri savurma ileriden belirgin kötü**: mobilde %34,4 atlama, kare p95 39,5 ms.
Motor komşuyu `+1, −1, +2` sırasıyla indiriyor; geri giderken öncelik ters çalışıyor.

**Yavaş 4G'de ilk kare 5,8 sn** — sahne1'in tek başına 4,1 MiB olmasının doğrudan
sonucu. Bütçe kapısıyla aynı kök.

---

## 5. Dikiş doğrulaması — 38 dikiş

`bounds` komutuyla her klibin ilk/son karesi encode edilmiş masaüstü hattından
çıkarıldı (yayına gidecek hâlin kendisi), piksel kıyaslandı.

### Mutlak eşik yanlış kırmızı verdi

İlk ölçüm (PSNR≥35 & SSIM≥0,95 = eşit) **38 dikişin 35'ini "sıçrama"** saydı.
Bu ölçüt hatalı: kamera sürekli hareket ettiği için klip **içindeki** ardışık kareler
de birbirinden farklıdır. Ölçülmesi gereken, dikişin bu doğal kare başı değişimden
fazla olup olmadığı.

`yeni/film/taban.cjs`: her klibin son 4 karesi çıkarılır, ardışık çiftlerin PSNR'ı
o klibin **kare başı hareket tabanı** olur; dikiş tabanına göre ölçülür.

| hüküm | ölçüt | adet |
|---|---|---:|
| sürekli | Δ ≥ −1 dB | **18** |
| hafif sapma | −1 > Δ ≥ −4 dB | **12** |
| **gerçek sıçrama** | Δ < −4 dB | **8** |

### 8 gerçek sıçrama

| dikiş | PSNR | taban | **Δ** |
|---|---:|---:|---:|
| **sahne3 → sahne4** | 26,35 | 40,64 | **−14,29** |
| **sahne30 → sahne31** | 33,42 | 45,27 | **−11,85** |
| sahne15 → sahne16 | 22,44 | 27,57 | −5,13 |
| sahne4 → sahne5 | 37,07 | 42,14 | −5,07 |
| sahne2 → sahne3 | 17,80 | 22,05 | −4,25 |
| sahne28 → sahne29 | 19,02 | 23,24 | −4,22 |
| sahne29 → sahne30 | 27,14 | 31,36 | −4,22 |
| sahne37 → sahne38 | 18,09 | 22,30 | −4,21 |

En ağır ikisi durgun sahnelerde (taban 40+ dB): kamera neredeyse sabitken oluşan
fark doğrudan göze vuruyor. 30→31'de kadraj geri çekiliyor — motor sözleşmesinin
"dikişte kamera hızı istemeden tersine dönmüyor" maddesinin ihlali.

**Kontak sayfası (Enes'in göz kararı için):**
`yeni/film/kontak/kontak-sicrama.png` — 8 satır, solda sahneN son kare, sağda
sahneN+1 ilk kare, her satır Δ etiketli. Tam çözünürlüklü ayrı dosyalar:
`yeni/film/kontak/dikis-*.png`. Hüküm burada verilmez.

### Kayma değil, yeniden üretim

Komşuluk taraması (`dikis-komsu.cjs`, son 4 × ilk 4 kare matrisi) **33/38 dikişte
en iyi eşleşmenin zaten kaymasız** olduğunu gösterdi. Klipler yanlış sırada ya da
fazla/eksik kareyle kesilmiş değil; Higgsfield aynı son kareden devam ederken kareyi
birebir yeniden üretmemiş.

### Ölçütün kendi sınırı

`dikis.cjs` boyut uyumsuzluğunu **`contain`** ile normalize ediyor, sayfa ise
**`object-fit: cover`** kullanıyor. Yalnız 1→2 dikişini etkiler (tek boyut sapması
sahne1'de), ama ölçüt sayfanın gerçek uyumuyla aynı değil. Cover altında görünen alan:

| viewport | sahne1 (1,423) | sahne2–39 (1,793) | kırpma ekseni |
|---|---:|---:|---|
| masaüstü 1440×900 | %88,9 | %89,2 | sahne1 üst/alttan, sahne2 yanlardan |
| **mobil 412×892** | **%32,5** | **%25,8** | ikisi de yanlardan |

Masaüstünde pratik fark yok (0,3 puan). **Mobilde yatay klibin yalnız %25,8'i
görünüyor** — dikey telefonda kadrajın dörtte üçü kırpılıyor. Bu, DEVIR'de hiç
konuşulmamış ve mobil deneyimi belirleyen bir kalem.

---

## 6. Denetim

`node yeni/denetim.cjs` → **59 geçti · 1 kaldı**.

Kalan: **FM1** — film iskeleti kuralı, yalnız bütçe kaleminden
(`butce-masaustu:200.8>32MiB`, `butce-mobil:163.8>16MiB`). FM1 bu turda dikiş
hükmünü mutlak eşikten **taban ölçümüne** bağlandı; artık raporu ikisini de
gösteriyor (mutlak 0/3/35, tabana göre 18/12/8).

Kapı bilerek gevşetilmedi — belge "aşarsa önce kısalt/yeniden encode et, bütçeyi
gevşetme" diyor. Bütçe kararı verilene kadar FM1 kırmızı kalır, yayın çıkmaz.

---

## 7. Karar bekleyen kalemler (hepsi Enes'te)

1. **Bütçe:** Seçenek A (hangi CRF/çözünürlük) mı, Seçenek B'ye bellek tavanı mı,
   yoksa kapının süreye göre yeniden tanımlanması mı.
2. **8 gerçek sıçrama:** kontak sayfasına bakıp hangileri yeniden üretilecek.
3. **sahne1'in farklı en-boy oranı** (1144×804): giriş sahnesinin arka planı bu klip.
4. **Mobilde %25,8 görünen alan:** dikey kadraj için ayrı hat mı, farklı `object-fit`
   mi, yoksa kabul mü.
5. **Geri savurmada mobil performansı** (%34,4 atlama): ön yükleme sırası geri yön
   için yeniden düzenlenecek mi.
6. DEVIR §6'nın kendi açık kalemleri: hikâye yerleşimi, kaydırma uzunluğu
   (iskelette `PX_SN = 300`), prolog başı metinleri, ses.

---

## 8. Bu turda üretilen düzenekler

| dosya | ne yapar |
|---|---|
| `yeni/film/probe.cjs` | ffprobe künyesi → `kanon.json` |
| `yeni/film/scroll-scrub-video.sh` | Higgsfield §6 betiği, birebir |
| `yeni/film/uret.cjs` | çift hat encode + poster + bounds → `uretim.json` |
| `yeni/film/poster-web.cjs` | PNG poster → WebP (sayfanın okuduğu hat) |
| `yeni/film/dikis.cjs` | 38 dikiş × 2 hat, mutlak PSNR/SSIM |
| `yeni/film/dikis-komsu.cjs` | ±kare komşuluk matrisi (kayma mı, üretim mi) |
| `yeni/film/taban.cjs` | **klip içi taban** → dikiş hükmü |
| `yeni/film/kontak.cjs` | sıçrama kontak sayfası (göz kararı için) |
| `yeni/film/crf-tarama2.cjs` | bütçe Seçenek A'nın bayt + kalite bedeli |
| `yeni/film/olc.cjs` | gerçek Chrome oynatma ölçümü |
| `yeni/src/film/motor.ts` | scroll-scrub motoru (Higgsfield §2, Astro'ya taşınmış) |
| `yeni/src/film/sahneler.ts` | sahne dizisi, modül sabiti, `kanon.json`'dan türer |
| `yeni/src/parcalar/Film.astro` | ada; iki yol (JS / hareket azaltma) aynı markup |
| `yeni/src/pages/film.astro` | `/yeni/film` ölçüm zemini (noindex, sitemap dışı) |

---
---

# 2. TUR — kapı yeniden tanımlandı (27 Ağu 2026)

Enes kararı: kapı **toplam bayt değil**, üç ölçü — 4G ilk kare < 1,5 sn ·
savurmada sınır hazırlığı 4/4 · bellek tavanı. Dört iş yapıldı, ölçüm aynı
koşullarda tekrarlandı. Dikişlere karar verilmedi, yalnız yeniden ölçüldü.

## Yapılanlar

**(a) Encode hattı geçirildi.** `scroll-scrub-video.sh`: masaüstü CRF 20→28
(native 1284×716), mobil CRF 23→28 ve `min(720,ih)` tavanı yerine sabit **540
satır**. Sapma betiğin başına gerekçesiyle yazıldı; preset/GOP/unsharp/
faststart/pix_fmt özgün. 39 klip yeniden encode edildi, posterler encode
sonrası yenilendi.
- masaüstü **200,8 → 74,4 MiB** · mobil **163,8 → 64,2 MiB** · poster webp 5,43 → 4,26 MiB
- dist film varlıkları 371 → 144 MB

**(b) Kayan pencere.** Geçerli sahnenin ±3'ü bellekte; dışarı çıkan blob
revoke, `<video>` src'si kaldırılıp `load()` ile dekoder de serbest, durum
`yok`a döner. Motor sözleşmesi maddesi güncellendi: "geri kaydırma birinci
sınıf" → **"geri kaydırma birinci sınıf PENCERE İÇİNDE"**.

**(c) Ön yükleme yön ve hız duyarlı.** Yön son iki karenin film zamanı
farkından, hız aynı farkın mutlak değerinden (düzen okuması yok). Okumada
gidilen yöne derinlemesine, savurmada iki yönde de sınır önce. Ön yükleme
penceresi tutma penceresinden dar (indir ±2 / tut ±3) — histerezis.

**(d) sahne1 kırpıldı.** Encode zincirine ön filtre olarak (`QSS_PREVF`):
`crop=1144:638` (merkez) → `scale=1284:716`. Tek encode, ara dosya yok.
**39/39 klip artık masaüstünde 1284×716, mobilde 968×540.**

## Yol boyunca bulunan ve kapatılan kilitlenme

Kayan pencerenin ilk hâli **indirilmekte olan** klibi de bırakabiliyordu.
`src` kaldırılınca `yukle()` içindeki `loadeddata` beklemesi hiç çözülmüyor,
`inen` bayrağı dolu kalıyor, motor bir daha hiçbir klip indiremiyordu.
Ölçüldü: mobil-4G kümesi savurmada durdu, 12 dk ilerleme yok. Üç değişiklikle
kapatıldı: `birak()` 'iniyor' olana dokunmuyor · inen klip kendi pencere
kontrolünü indirme bitince yapıyor · `loadeddata` beklemesine 30 sn zaman
aşımı.

## Oynatma — önce/sonra (aynı koşullar, 3 tekrar, medyan)

| küme | ölçü | önce | sonra |
|---|---|---:|---:|
| masaüstü wifi | ilk kare | 547 ms | **369 ms** (−33%) |
| mobil 4G | ilk kare | 1969 ms | **942 ms** (−52%) |
| mobil 4G yavaş | ilk kare | 5814 ms | **2663 ms** (−54%) |
| masaüstü | sert ileri atlama | 25,0% | **2,4%** (−90%) |
| masaüstü | sert geri atlama | 18,0% | **4,1%** (−77%) |
| mobil 4G | sert ileri atlama | 5,2% | **3,3%** |
| mobil 4G | sert ileri hazır varış | **1/4** | **4/4** |
| mobil 4G | sert ileri takılma | 3179 ms | **0 ms** |
| mobil 4G | sert ileri max boşluk | 154 kare | **3 kare** |
| mobil 4G | sert geri atlama | 34,4% | **16,7%** (−51%) |
| mobil 4G | sert geri kare p95 | 39,5 ms | **15,4 ms** |
| mobil 4G yavaş | okuma takılma | 8483 ms | **0 ms** |
| mobil 4G yavaş | hazır varış | 2/4 | **4/4** |
| her yapılandırma | uzun görev / CLS | 0 / 0 | **0 / 0** |
| bellek tepesi | — | 37,9 MiB | **10,3 MiB** |

## Kapı

| ölçü | eşik | sonuç |
|---|---|---|
| 4G ilk kare | < 1500 ms | 12 Mbit **942 ms GEÇTİ** · yavaş 4 Mbit **2663 ms KALDI** |
| savurmada sınır hazırlığı | 4/4 | **GEÇTİ** (masaüstü 6/6, mobil 4/4, ileri ve geri) |
| bellek tavanı | pencere ±3 | tepe **10,3 MiB** · bırakılan klip 8 |

Denetim: **59 geçti · 1 kaldı** — FM1 yalnız yavaş 4G ilk kare kaleminden.

## İki kalem ters yönde

1. **Masaüstü geri savurmada max boşluk 9 → 120 kare.** Atlama %18→4,1'e
   düştü, hazır varış 6/6, takılma 0 — ama sunulan ardışık kareler arasında
   tek bir 120 karelik sıçrama var. Geri yönde sahneye girerken klip son
   kareye ön-sarılı; ilk sunulan kare o, sonraki gerçek scrub konumu. Mobilde
   aynı şey 3 kare (klipler küçük, seek ucuz). Kapı ölçüsü değil, ama gözle
   görünür olabilir.
2. **Mobil 4G okuma atlaması 0,5% → 0,7%.** Gürültü mertebesinde.

## Dikişler yeniden ölçüldü (karar verilmedi)

Klipler yeniden encode edildiği ve sahne1 kırpıldığı için önceki dikiş ölçümü
bayattı. Tazelendi: **16 sürekli · 12 hafif sapma · 10 gerçek sıçrama**
(önce 18/12/8).

Listeye iki dikiş eklendi:

- **1→2 (Δ −8,1 dB) — yeni değil, ÖLÇÜT DÜZELDİ.** Önce "sürekli" (Δ +2,46)
  sayılıyordu; o ölçüm sahne1 farklı boyutta olduğu için `contain` ile
  yapılıyordu ve eklenen siyah pad iki karede de aynı olduğu için PSNR'ı
  şişiriyordu — yanlış yeşil. Artık iki kare de 1284×716, ölçüt dürüst.
  Kırpma bu dikişi bozmadı, görünür hâle getirdi.
- **31→32 (Δ −5,81 dB)** — önce hafif sapmaydı (−2,69), CRF 28 ile eşiğin
  altına indi. Sınırda.

En ağır ikisi yine 3→4 (−17,04) ve 30→31 (−13,26); durgun sahnelerde
(taban 43–47 dB) olduğu için göze doğrudan vuruyorlar.

Kontak sayfası tazelendi: `yeni/film/kontak/kontak-sicrama.png` (10 satır) +
`dikis-*.png`. **Hüküm Enes'te.**

## Açık kalan

- **Yavaş 4G (4 Mbit) ilk kare 2663 ms** — kapının tek kırmızısı. sahne1
  masaüstünde 1,2 MB, mobilde 0,9 MB; 4 Mbit'te bu ~2 sn indirme demek.
  Seçenek: sahne1 için ayrı düşük-bitrate "açılış" kopyası, ya da eşiğin
  yavaş hat için gevşetilmesi. **Karar Enes'te.**
- Masaüstü geri savurmada 120 karelik ön-sarma sıçraması.
- `/favicon.ico` 404 — kabuk geneli, hâlâ açık.


---
---

# 5. TUR — 4K kaynak · H.265 ana + H.264 yedek · gerçek kullanım hızları (27 Ağu akşam)

## Kaynak

`QANATONE SAHNELER 4K`: 39 klip, Topaz ile 2160p, **HEVC**, 3840×2160, 24 fps,
2,00 GiB. ffmpeg 6.1.1 HEVC'yi sorunsuz çözüyor (kare çıkarma test edildi).
Süreler ve kare sayıları eski kaynakla birebir (20 klip 8,042 sn, 19 klip 5,042 sn);
**sahne32-39 kapısı GEÇTİ**. Tek sapma: en-boy oranı 1,7933 → **1,7778** (tam 16:9,
Topaz normalize etmiş).

## Hat

| | H.264 (yedek) | **H.265 (ana)** | oran |
|---|---:|---:|---:|
| masaüstü 1080p CRF 24 | 238,3 MiB | **197,7 MiB** | 0,83 |
| mobil 720p CRF 26 | 138,3 MiB | **94,8 MiB** | 0,69 |
| açılış mobil (1,2 sn, CRF+4) | 179 KB | **118 KB** | 0,66 |
| sahne1 tam mobil | 2,18 MiB | **1,26 MiB** | 0,58 |
| poster webp (39×2) | 9,28 MiB | | |

Ölçekleme artık gerçek (kaynak 2160p). Tarayıcı `canPlayType('hvc1.1.6.L120.90')`
`'probably'` ise H.265, değilse H.264; `?kodek=h264` yedeği zorlar (ölçüm için).
Encode 36,9 dk (39 klip × 2 kodek × 2 hat, paralel 2). Motor 6,9 / 7 KB.

Kodek testinde AV1 **kapandı**: tek klipte savurmada %99,2 atlama (decode seek'e
yetişemiyor; `kodek-olcum.json`). `libsvtav1` bu derlemede yok; donanım AV1
(nvenc/qsv/amf) üçü de açılmadı.

## BULGU: Chrome'da H.265 kare-doğru seek yapmıyor

Ölçümde H.265 her hızda ~%75 atlama verdi — **1× okumada bile** (mobil 154/600
sunulan = tam 1/4). Bu "decode yetişemiyor" deseni değil. Doğrudan seek testi
(`seek-test.cjs`, aynı klibin iki kodeği, 0..15 + 40..43 karelerine tek tek sarma):

| klip | doğru | yapışma |
|---|---:|---|
| sahne20-mobile.mp4 (H.264, GOP 4) | **20/20** | — |
| sahne20-mobile-h265.mp4 (H.265, GOP 4) | **5/20** | 1→4 2→4 3→4 5→8 6→8 7→8 9→12 … |
| sahne20.mp4 (H.264, GOP 8) | **20/20** | — |
| sahne20-h265.mp4 (H.265, GOP 8) | **16/20** | 6→8 7→8 14→16 15→16 |

GOP iki kodekte birebir aynı (ffprobe: 7,6 / 3,9, ikisinde de B-kare). Fark encode'da
değil: Chrome'un Windows HEVC yolu (donanım/MediaFoundation) hedef kare anahtar
kareden uzaksa **sonraki anahtar kareye yapışıyor**; H.264 yazılım çözücü kare-doğru.
Mobil GOP 4'te 4 karenin 3'ü, masaüstü GOP 8'de 8 karenin 2'si erişilmez — ölçülen
%75 / %25,6 atlamayla birebir örtüşüyor.

Sonuç: **bu makinede H.265 scrub kaynağı olarak kullanılamaz.** Seçenekler (karar
Enes'te): GOP 1 (her kare anahtar — boyut avantajı gider), H.265'i yalnız kare-doğru
seek yapan tarayıcılarda açmak (Safari/iOS bilinmiyor, telefonda ölçülmeli), ya da
H.264 tek hat. Motor şu an H.265'i `'probably'` gören her tarayıcıda seçiyor —
**Chrome'da bu yanlış seçim.**

## Teşhis: laboratuvar savurması ve gerçek kullanım hızları

3,3× savurma saniyede 79 kare ister, 60 Hz ekran 60 sunar → **%24 atlama
kaçınılmaz** (taban). 1× / 1,5× / 2× 'te taban sıfır; ölçülen her atlama gerçek.

### H.264 (kare-doğru olan), sönümleme 0,18 açık, 3 tekrar medyanı

| küme | süpürme | hız | **atlama** [aralık] | sunulan/istenen | max boşluk | hazır varış | takılma | kare p95 |
|---|---|---:|---:|---:|---:|---|---:|---:|
| masaüstü | okuma | 1× | **0,4** [0,2–9,3] | 958/960 | 2 | 6/6 | 0 | 9,4 |
| masaüstü | gezinme | 1,5× | **0,7** [0,6–24,3] | 942/945 | 2 | 6/8 | 195 | 9,9 |
| masaüstü | gezinme | 2× | **29,4** [5,9–30,4] | 662/932 | 11 | 6/8 | 212 | 15,1 |
| masaüstü | gezinme geri | 2× | **12,3** [8,4–51,2] | 835/952 | 4 | 6/6 | 0 | 12,6 |
| masaüstü | savurma | 3,3× | 49 [43,5–78,3] | 448/896 | 9 | 6/6 | 0 | 17,5 |
| masaüstü | savurma geri | 3,3× | 58,2 [39,2–73,6] | 318/841 | 23 | 6/6 | 0 | 18 |
| mobil 4G | okuma | 1× | **0,2** | 601/600 | 1 | 4/4 | 0 | 9,7 |
| mobil 4G | gezinme | 1,5× | **0,2** | 588/587 | 2 | 5/5 | 0 | 10,3 |
| mobil 4G | gezinme | 2× | **0,5** | 583/584 | 2 | 5/5 | 0 | 10,6 |
| mobil 4G | gezinme geri | 2× | **17,8** [17,7–22,7] | 467/568 | 4 | 4/4 | 0 | 23,9 |
| mobil 4G | savurma | 3,3× | 10,1 [4,9–10,5] | 536/593 | 3 | 4/4 | 0 | 13 |
| mobil 4G | savurma geri | 3,3× | 32,7 [31,5–32,8] | 277/410 | 16 | 4/4 | 0 | 40,5 |
| mobil yavaş | okuma | 1× | **0,2** | 528/527 | 1 | **3/4** | **3055** | 9,6 |
| mobil yavaş | gezinme | 1,5× | **0** | 588/587 | 1 | 5/5 | 0 | 10,1 |

Düzenek notu: taban sütunu çıktıda 0 yazıyor çünkü sönümleme açıkken istek gösterilen
konumdan üretiliyor ve rAF sayısı istenen kare sayısını aşıyor; 3,3× için teorik taban
yine %24, sütun bunu göstermiyor.

**Okuması:**
- **1× ve 1,5× her profilde temiz** (≤%0,7). Kapının gerçek kullanım tanımı için zemin bu.
- **2× ileri masaüstünde gürültülü**: medyan %29,4 ama aralık 5,9–30,4 — bir tekrar iyi,
  iki kötü. Mobilde 2× ileri %0,5. Masaüstü 1080p'de 48 kare/sn istek decode sınırında;
  tekrar artırılmadan karar verilmemeli.
- **Geri yön ileriden kötü** (mobil 2× geri %17,8, 3,3× geri %32,7, kare p95 40,5 ms):
  geri giderken her seek GOP başından decode gerektiriyor (B-kareli GOP 4/8). Yapısal.
- **Yavaş 4G'de 1× okumada 3055 ms takılma, hazır varış 3/4**: 2,18 MiB'lik tam sahne1
  4 Mbit'te ~4,4 sn iniyor; açılış kopyası ilk kareyi 1269 ms'de veriyor ama tam klip
  gelmeden sınıra varılıyor.
- **Uzun görev**: H.264'te 1 (mobil 3,3× geri), H.265'te 0. CLS her yerde 0.
- **Bellek tepesi**: H.264 33,4 (masaüstü) / 20,2 (mobil) MiB.

### Eski kapı (üç ölçü) — H.264

| ölçü | eşik | sonuç |
|---|---|---|
| 4G ilk kare | < 1500 ms | 12 Mbit **360 ms** · yavaş **1269 ms** — **GEÇTİ** |
| savurmada sınır hazırlığı | 4/4 | **GEÇTİ** (masaüstü 6/6, mobil 4/4, iki yön) |
| bellek tavanı | pencere ±3 | tepe 33,4 MiB |

## Beş tur yan yana (`kiyas4.cjs`)

| küme | ölçü | tur 1 | tur 2 | tur 3 | tur 4 | tur 5 h265 | **tur 5 h264** |
|---|---|---:|---:|---:|---:|---:|---:|
| masaüstü | ilk kare | 547 | 369 | 248 | 638 | 425 | **520** ms |
| mobil 4G | ilk kare | 1969 | 942 | 303 | 526 | 342 | **360** ms |
| mobil yavaş | ilk kare | 5814 | 2663 | 910 | 1847 | 974 | **1269** ms |
| masaüstü | okuma 1× atlama | 1,9 | 0,5 | 0,4 | 16,1 | 25,6 | **0,4** |
| masaüstü | savurma 3,3× atlama | 25 | 2,4 | 4,2 | 64,1 | 70 | **49** |
| masaüstü | savurma kare p95 | 10,9 | 8,6 | 8,8 | 29,7 | 10 | **17,5** ms |
| mobil 4G | okuma 1× atlama | 0,5 | 0,7 | 0,8 | 0,5 | 74,7 | **0,2** |
| mobil 4G | savurma 3,3× atlama | 5,2 | 3,3 | 4,2 | 19,5 | 75,2 | **10,1** |
| mobil 4G | savurma hazır varış | 1/4 | 4/4 | 4/4 | 1/4 | 4/4 | **4/4** |
| mobil 4G | savurma geri atlama | 34,4 | 16,7 | 19,6 | 39 | 72,8 | **32,7** |
| mobil yavaş | okuma takılma | 8483 | 0 | 0 | 12865 | 0 | **3055** ms |
| — | uzun görev toplam | 0 | 0 | 0 | 6 | 0 | **1** |
| — | bellek tepe | — | 10,3 | 10,3 | 48 | 25,9 | **33,4** MiB |

Tur 3 (eski kaynak, CRF 28 / 540 satır) hâlâ en temiz performans profili; tur 5 H.264
1080p/720p ondan pahalı ama tur 4'ün (1440p) çöküşünden uzak ve gerçek kullanım
hızlarında temiz.

## Kare dizisi maliyeti (1440p, kaynak 4K)

| grup | kare | WebP q82 | kare başı | AVIF CRF32 | kare başı |
|---|---:|---:|---:|---:|---:|
| ilk 8 sn (sahne1) | 193 | 13,92 MiB | 73,9 KB | 4,31 MiB | 22,9 KB |
| son 10 sn (sahne38+39) | 242 | 25,36 MiB | 107,3 KB | 8,39 MiB | 35,5 KB |
| **tam film tahmini (6159)** | | **~556 MiB** | 92,5 KB | **~180 MiB** | 29,9 KB |

AVIF her kare intra doğrulandı (`-g 1` 804 KB vs `-g 240` 241 KB, 3,3× fark).
AVIF bayt olarak videonun altında ama her kare ayrı istek + decode + bitmap bellek
(1440p bitmap 14,7 MB/kare); WebP videodan büyük, elendi.

## Kodek denemesi (sahne20, 1440p) — özet

| kodek | boyut | H.264 oranı | PSNR | encode katı | savurmada atlama |
|---|---:|---:|---:|---:|---:|
| H.264 | 4,39 MiB | 1,00 | 45,21 | 1,9× | 74,8% |
| H.265 | 3,07 MiB | 0,70 | 46,22 | 2,9× | 83,9% |
| AV1 (libaom cpu-used 8) | 2,66 MiB | 0,61 | 46,32 | 15,4× | **99,2%** |

## Ayarlanabilir kalemler

- **Sönümleme** `SONUM = 0,18` (`sahneler.ts`); `?sonum=0.35` hafif · `0.08` ağır · `1` kapalı.
- **Kaydırma uzunluğu** `PX_SN = 300` → 76.991 px ray, masaüstü 900 px'te 85,5 ekran,
  1 ekran = 3,0 sn film; `?pxsn=450` (128 ekran, 2,0 sn) · `?pxsn=200` (57 ekran, 4,5 sn).
- **Kodek** `?kodek=h264` / `h265`.

## Karar bekleyen (Enes)

1. **H.265 Chrome'da kare-doğru değil** — GOP 1 mi, tarayıcıya göre kapı mı, H.264 tek hat mı.
   Telefonda (Safari) H.265 seek ölçülmeli; motor şu an Chrome'da yanlış kodeği seçiyor.
2. Kapının gerçek kullanım hızları üstünden yeniden tanımı (1×/1,5× temiz; 2× masaüstünde gürültülü).
3. Geri yön maliyeti (yapısal, GOP/B-kare).
4. Yavaş 4G'de tam sahne1'in 4,4 sn inişi (açılış ilk kareyi kurtarıyor, sınırı kurtarmıyor).
5. 7 gerçek dikiş sıçraması (3→4, 4→5, 15→16, 29→30, 30→31, 31→32, 37→38) — dokunulmadı.


---
---

# 6. TUR — motorun üç ayarı + giriş sahnesi prototipi (28 Ağu 2026)

Splat yolu kapandı (Enes, 15:10: sahne34 750K/931k ikisi de yetersiz, sebep malzeme).
Dünya hattı video motoruna ve Three.js giriş sahnesine döndü. Deploy yok, kredi 0.

## (1) Motorun yarım kalan üç ayarı — `src/film/motor.ts`, `sahneler.ts`, `Film.astro`

| ayar | önce | sonra | nasıl ayarlanır |
|---|---|---|---|
| sönümleme | hedef/gösterilen ayrı, üstel yaklaşma; kuyruk hedefe sonsuz yavaşlayarak varıyordu (**sürünme**) | üstel yaklaşma + **alt hız tabanı** `SURUNME_SN = 0,25` film-sn/sn (6 kare/sn): adım tabanın altına düşmez, yarım kareden yakınken oturur | `?sonum=` / `data-sonum` / `__fl.sonum` (katsayı); taban sabit, yorumda gerekçeli |
| hız tavanı | yok | gösterilen konum saniyede en çok **`TAVAN = 1,5` film-sn**; üstü YUTULUR (hedef ilerler, gösterilen tavanda gelir) | `?tavan=` / `data-tavan` / `__fl.tavan`; 0 = kapalı |
| atla | yok | `__fl.atla()` gösterileni hedefe oturtur; motor esik geçişinde (`GERIDE_SN = 1`) bölüme `fl-geride` olayı atar (kare başına olay yok); **düğme sayfanın** (`.fl-atla`, Film.astro — motor UI kurmaz, sert değişmez #6), sağ alt, "Atla +N sn" | — |
| kaydırma uzunluğu | `PX_SN = 300` | **`PX_SN = 450`** (Enes): ray 115.487 px, masaüstü 900 px'te 128 ekran, 1 ekran = 2,0 sn film, çentik = 5,3 kare | `?pxsn=` / `data-pxsn` |

Ölçüm düzeneği (`yeni/film/olc.cjs`) de değişti — **tarayıcı ve hızlandırma durumu kaydedilir, tek sayıya bakılmaz** (Enes kuralı, 28 Ağu):
`TARAYICI=brave|chrome`, `HEADLESS=0` gerçek pencere, `SUPUR=okuma-1x,gezinme-1.5x` süpürme seçimi, `CIKTI_AD=`; her sonuca `tarayici: {ad, headless, ua, gpu (WEBGL_debug_renderer_info), hizlandirma: donanim|YAZILIM, dpr}` yazılır; her süpürme `__fl.atla()` ile hedefe oturmuş konumdan başlar (tavan gerisinde kalan önceki süpürme sonrakini kirletmesin).

### Ölçüm — 1× ve 1,5×, Brave (aşağıda; "telefon" = Brave'de 412×892 mobil öykünme + 4G/CPU 4×; gerçek telefon Enes'te)

**Tarayıcı kaydı:** Brave 152 (HeadlessChrome/152 UA), headless=true · **GPU: ANGLE (NVIDIA GeForce GTX 1650 Ti, Direct3D11) → DONANIM** · tavan 1,5 · pxsn 450 · sönüm 0,18 · 3 tekrar, medyan [aralık]. Sonuç: `yeni/film/olcum/sonuc-28agu-brave.json`.

| küme | kodek | ilk kare ms | süpürme | hız | **atlama %** [aralık] | sunulan/istenen | max boşluk | hazır varış | takılma ms | kare p95 | uzun görev | CLS | bellek MiB |
|---|---|---:|---|---:|---:|---:|---:|---|---:|---:|---|---:|---:|
| masaüstü wifi | h265 | 176 | okuma | 1× | 26,2 [25,8–26,7] | 710/960 | 5 | 6/6 | 0 | 9,1 | 0 | 0 | 25,9 |
| masaüstü wifi | h265 | 176 | gezinme | 1,5× | 24,9 | 368/482 | 4 | 7/7 | 0 | 9,0 | 0 | 0 | 25,9 |
| **masaüstü wifi** | **h264** | 399 | okuma | 1× | **2,0** [2–2,4] | 943/960 | 7 | 6/6 | 0 | 9,2 | 0 | 0 | 33,4 |
| **masaüstü wifi** | **h264** | 399 | gezinme | 1,5× | **0** | 487/482 | 3 | 7/7 | 0 | 9,0 | 0 | 0 | 33,4 |
| mobil 4G (öykünme, CPU 4×) | h265 | 320 | okuma | 1× | 74,7 | 154/600 | 4 | 4/4 | 0 | 9,3 | 0 | 0 | 13,7 |
| mobil 4G | h265 | 320 | gezinme | 1,5× | 74,5 | 78/302 | 4 | 5/5 | 0 | 9,5 | 0 | 0 | 13,7 |
| **mobil 4G** | **h264** | 412 | okuma | 1× | **0,3** [0,2–0,8] | 600/600 | 2 | 4/4 | 0 | 9,5 | 0 | 0 | 20,2 |
| **mobil 4G** | **h264** | 412 | gezinme | 1,5× | **0** | 303/302 | 4 | 5/5 | 0 | 9,9 | 0 | 0 | 20,2 |
| mobil yavaş 4G | h265 | 971 | okuma | 1× | 74,7 | 153/600 | 4 | 4/4 | 0 | 9,4 | 0 | 0 | 12,1 |
| mobil yavaş 4G | h265 | 971 | gezinme | 1,5× | 74,5 | 78/302 | 4 | 5/5 | 0 | 9,5 | 0 | 0 | 12,1 |
| **mobil yavaş 4G** | **h264** | 1247 | okuma | 1× | **0,2** | 540/540 | 1 | **3/4** | **2522** | 10,2 | 0 | 0 | 13,4 |
| **mobil yavaş 4G** | **h264** | 1247 | gezinme | 1,5× | **0** | 303/302 | 3 | 5/5 | 0 | 10,1 | 0 | 0 | 17,4 |

Okuması:
- **H.264: 1× ve 1,5× her kümede temiz** (masaüstü %2 / %0, mobil %0,3 / %0, yavaş 4G %0,2 / %0). Sönümleme+taban+tavan kareyi düşürmedi; 1,5×'te sunulan = istenen (tavan tam sınırda, yutma yok).
- **H.265 Brave'de de kare-doğru seek yapmıyor**: masaüstü %25-26 (GOP 8'de 2/8 kare erişilmez), mobil %74,5 (GOP 4'te 3/4) — 5. turun Chrome bulgusuyla birebir; Brave aynı Chromium HEVC yolu. **Motor hâlâ `canPlayType 'probably'` ile H.265 seçiyor → Chromium'da yanlış seçim, karar Enes'te (GOP 1 / tarayıcı kapısı / H.264 tek hat).**
- Yavaş 4G 1× okumada 2,5 sn takılma, hazır varış 3/4 (5. turda 3,1 sn): tam sahne1 4 Mbit'te ~4,4 sn iniyor, açılış kopyası ilk kareyi kurtarıyor (1247 ms), sınırı kurtarmıyor — bilinen açık kalem.
- 4G ilk kare kapısı: 12 Mbit 412 ms, yavaş 1247 ms — **GEÇTİ** (< 1500).
- Uzun görev 0, CLS 0 her kümede. Tek 404 `favicon.ico` (kabuk geneli, bilinen).
- **Gerçek telefon ölçülmedi** (öykünme); tarayıcı + hızlandırma kaydıyla Enes'te.

**Pencereli Brave (headless=false, aynı GPU donanım, yalnız masaüstü H.264, 3 tekrar):** 1× **%4,5** [4,4–11,7] · 1,5× **%0** [0–48,5]; kare p95 11,5 / 10 ms. İlk tekrar her iki süpürmede sapmış (pencere öne gelme/odak — dış etken), 2. ve 3. tekrar headless ile aynı (%4,4 / %0). Pencereli ölçüm gürültüye açık; **kural gereği ikisi de kaydedildi, tek sayı yok.** Sonuç: `olcum/sonuc-28agu-brave-pencere.json`.


## (2) Giriş sahnesi prototipi — `yeni/public/prototip/giris/` (ayrı sayfa, filme BAĞLI DEĞİL)

DEVİR §2 bağlayıcı: **tek WebGL katmanı, üç faz aynı quad + aynı malzemede** (bölünme/yeniden mount yok).
Three r180 (`lib/` yerel kopya, f0/viewer'dan), `metal.ts` FS'i GLSL3'e taşındı (SDF pah normali, envmap, güneş huzmesi, tek saat 12,08 s salınım, pivot kuyruk ucu; sayılar `sahne.json durak2.metal`den, kaynağıyla etiketli).

| faz | ne | sürücü |
|---|---|---|
| A çizim | Q vektörel: önce halka (`cizim2.cember.yol`, kalınlık 248,5), sonra kuyruk (`cizim2.kuyruk.yol`, gövdeden uca incelen — kanal kazılır); canvas 2D → doku, aynı quad | varlık ön-yükleme bayt ilerlemesi (SDF 44 KB + poster 60 KB) ∧ alt süre tabanı `?cizim_min=1.6` |
| B kabarma | `uKabar` 0→1: kenar çizgi dokusundan SDF'e, normal düzden pah eğimine, renk düz kızıldan metale; doğuş = ışık (env kazancı + dip 0→1, metal.ts) | `?kabar=1.2` sn |
| C giriş | amblem canlı dağ ortamında: arka plan **sahne1'in ilk karesi** (encode edilmiş klibin posteri, 1920×1080, aynı kadraj — nehir kaynağı görünür), **kamera nefesi** (perspektif kamera ±0,4 % salınım, 3 periyot), amblemin kendi salınımı | zaman |
| ilk kaydırma | aynı anda: amblem nav'daki yerine uçar (vektör kutusu → nav `<img>` dikdörtgeni; oturunca quad kapanır, navın kendi logosu açılır — halka.ts kuralı, ikinci logo yok) + kamera aşağı/ileri kayar (**video yok, film scrub'ının yer tutucusu**; DAĞA DALMAZ) | `?ucus=0.6` ekran boyu |

Nav gerçek `Nav.astro` değil, ölçüleriyle kopya (20 px pad, 1180 max, logo img 29 px). Hareket azaltmada fazlar atlanır (metal doğrudan).
Düzenek: `yeni/film/olc-giris.cjs` (dist sunar, faz kareleri + HUD + nav durumu → `olcum/giris/`).

Headless Chrome, Intel UHD (donanım, ANGLE D3D11): masaüstü 1440×900 dpr 1 → A→B→C 6,8 sn (cizim_min 2,4 + kabar 1,4), **120 fps (min 105)**; mobil 412×892 dpr 2 → **120 fps (min 94)**; uçuş p=1'de quad kapandı, nav img opacity 1 (26×29 px). Kareler: `olcum/giris/kontak-1440.jpg`, `kontak-erken-mobil.jpg`. GTX/Brave/telefon ölçümü Enes'te (tarayıcı + hızlandırma kaydıyla).

Bilinen sınırlar: arka plan tek kare (film değil); yerleşim sayıları künyeden yaklaşık (kutu 0,569×yükseklik, v 0,546); envmap posterden canvas'ta türetildi (FBO değil); halka çizgi kalınlığı dolgu kalınlığı, kuyruk çizgisi kalınlığın %35'i (göz kararı, Enes'te).
