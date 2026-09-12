# MONTAJ DÜZENEĞİ — kaydırmaya bağlı oynatma, iki aday ölçümü

**25 Ağustos 2026.** Gerçek klipler henüz teslim edilmedi. Bu tur MİMARİ HAZIRLIK ve ÖLÇÜM'dür;
içeriğe dokunulmadı, karar verilmedi. Karar Enes'te.

---

## 0. Ne ölçüldü, neyle ölçüldü

**Adaylar**
- **(a) kare dizisi** — klip kareleri ayrı görsel dosyaları; tuvale `drawImage` ile çizilir.
- **(b) sık anahtar-kareli mp4 + `currentTime` sürme** — tek `<video>`, kaydırma `currentTime`'ı sürer.

**Sentetik malzeme.** Gerçek klip yok. Malzeme, gerçek `dag-ham.jpg` üzerinde kaydırma/yakınlaşma ile
üretildi (gerçekçi entropi için; düz renk geçişi sıkıştırmayı yalancı iyi gösterirdi). Her kareye
makine okunur kimlik basıldı: üst şeritte 12 bitlik ikili blok + hareketli kızıl çubuk.
İki klip: `k1` 5 sn, `k2` 8 sn, 24 fps, 1920×1080 → toplam 312 kare.

**Ortam.** Gerçek Chrome (headless), puppeteer-core, yerel HTTP (Range destekli).
Her yapılandırma **tek başına** koştu — taze tarayıcı, taze sayfa (CPU çekişmesi kaydı sessizce öldürür).

**Süpürme.** Sayfa içi denetimli sürücü, 16 sn'lik çizelgeyi sabit hızda tarar ve kendini doğrular
(`scrollTo` hedefe oturmadıysa sapma sayılır — bütün koşumlarda sapma **0/…**).
- `hizli_ileri` / `hizli_geri`: 16 sn çizelge 5 sn'de (≈58 ayrı kare/sn talebi — sert savurma)
- `yavas_ileri`: 16 sn çizelge 15 sn'de (okuma temposu)

**"Sunulan kare" nasıl bilindi.** Video için `requestVideoFrameCallback` → `mediaTime`; yani
gerçekten BOYANAN kare. Kare dizisi için çizim anı. Tahmin yok.

---

## 1. AĞIRLIK — bütçeye karşı

Sentetik 13 sn üzerinden ölçüldü; zincir kestirimi **97,5 sn** kabulüyle
(10 adlı klip + final bölümü ≈ 15 klip × ort. 6,5 sn).

| aday | varyant | sn başına | 13 sn (MB) | 97,5 sn zincir (MB) |
|---|---|---:|---:|---:|
| (b) video | g24 1080p | 374 KB | 4,7 | **35,6** |
| (b) video | g12 1080p | 490 KB | 6,2 | 46,7 |
| (b) video | g6 1080p | 732 KB | 9,3 | 69,7 |
| (b) video | g1 1080p (tüm-intra) | 3337 KB | 42,4 | 317,7 |
| (b) video | g24 720p | 142 KB | 1,8 | **13,6** |
| (b) video | g6 720p | 270 KB | 3,4 | 25,7 |
| (a) kare dizisi | avif q45 1280 | 320 KB | 4,1 | **30,5** |
| (a) kare dizisi | webp q60 1280 | 543 KB | 6,9 | 51,7 |
| (a) kare dizisi | webp q75 1280 | 691 KB | 8,8 | 65,8 |
| (a) kare dizisi | webp q75 1920 | 1503 KB | 19,1 | 143,1 |
| (a) kare dizisi | jpeg q72 1920 | 1887 KB | 24,0 | 179,7 |

**Çapa:** bugünkü `dist` (bütün siteler, bütün görseller) **19 MB**; `/yeni/index.html` 183 KB.
Yani en ucuz aday bile mevcut sitenin tamamı kadar, çoğu adayı 2–4 katı.

> **Bu sayılar taban.** Sentetik malzeme bir fotoğraf üzerinde kaydırma/yakınlaşma — gerçek Kling
> üretimi (tünelde ilerleyiş, parçacık, kamera hareketi) zamansal olarak çok daha karmaşık.
> Aynı QP'de gerçek klipler **daha ağır** gelecek. Sıralama da değişebilir; kanon klipler gelince
> aynı düzenekle yeniden ölçülmeli.

---

## 2. KAYDIRMADA KARE ATLAMA

`atlama %` = talep edilen ayrı karelerden hiç boyanmayanların oranı.
**3 koşumun medyanı**, köşeli parantezde en az–en çok.

### Sert savurma (16 sn çizelge 5 sn'de)

| yapılandırma | ortam | sunulan fps | **atlama %** | max boşluk (kare) |
|---|---|---:|---|---:|
| video 1080p **g24** | masaüstü | 6,4 | **89,1** [83,9–89,3] | 24 |
| video 1080p **g12** | masaüstü | 12,2 | **79,2** [79–82,6] | 22 |
| video 1080p **g6** | masaüstü | 29,6 | **48,9** [41,7–59,6] | 19 |
| video 1080p **g1** (tüm-intra) | masaüstü | 48,4 | **15,4** [14–19,1] | 4 |
| video 1080p g6 + *sarma disiplini* | masaüstü | 39,1 | **29,3** [24,8–36,1] | 7 |
| video **720p** g24 | masaüstü | 38,6 | **34,3** [19,3–45] | 18 |
| video **720p** g24 + *sarma disiplini* | masaüstü | 53,7 | **8,4** [7,1–21,8] | 4 |
| video **720p** g6 | masaüstü | 56,9 | **3,2** [2,6–7,4] | 5 |
| **kare dizisi** webp75-1280 | masaüstü | 55,8 | **0,1** [0–0,3] | 2,5 |
| video 720p g24 | mobil 4× | 47,5 | **16,8** [10,6–39] | 15 |
| video 720p g6 | mobil 4× | 58,0 | **1,0** [0,3–8,8] | 2 |
| **kare dizisi** webp60-1280 | mobil 4× | 28,6 | **2,0** [1,3–2,7] | 4,5 |

### Okuma temposu (16 sn çizelge 15 sn'de)

Bütün adaylar, bütün varyantlar: atlama **≤ 5,4 %**, çoğu ≤ 1 %. Max boşluk 1–5 kare.
**Sorun yalnızca sert savurmada var.**

### Ölçütün gürültüsü — dikkat

Video sarma ölçütü tek koşumda **güvenilmez**. Aynı yapılandırma iki turda **8,0 %** ve **36,9 %**
verdi. Üç koşumun yayılımı:

| yapılandırma | üç koşum | yayılım |
|---|---|---:|
| video 720p g24 (mobil) | 39 · 16,8 · 10,6 | 28,4 |
| video 720p g24 (masaüstü) | 19,3 · 34,3 · 45 | 25,7 |
| video 1080p g6 | 41,7 · 59,6 · 48,9 | 17,9 |
| kare dizisi webp75-1280 | 0 · 0,3 | 0,3 |

Kare dizisi ölçütü kararlı, video ölçütü değil. **Video adayının her sayısı aralıkla okunmalı.**

---

## 3. GERİ KAYDIRMADA DAVRANIŞ

Beklenenin aksine **iki adayda da ceza yok**. Geri süpürme ileri süpürmeyle aynı, kare dizisinde
çoğu koşumda bir tık daha temiz (çözme penceresi yönü doğru tahmin ediyor).

| yapılandırma | ileri atlama % | geri atlama % |
|---|---:|---:|
| video 1080p g24 | 89,1 | 89,4 |
| video 1080p g6 | 48,9 | 43,3 |
| video 720p g6 | 3,2 | 3,2 |
| kare dizisi webp75-1280 | 0,1 | 0,0 |
| kare dizisi webp60-1280 (mobil) | 2,0 | 0,0 |

---

## 4. MOBİLDE KARE SÜRESİ

412×892, dsf 2, CPU 4× kısıtlı. Sert savurma sırasında rAF aralığı.

| yapılandırma | kare süresi p50 | p95 | çizim p95 | atlama % |
|---|---:|---:|---:|---:|
| video 720p g6 | 8,3 ms | **8,4 ms** | 1,0 ms | 1,0 |
| video 720p g6 + palet | 8,3 ms | **8,4 ms** | 1,0 ms | 1,0 |
| kare dizisi webp60-1280 | 12,6 ms | **33,3 ms** | 1,1 ms | 2,0 |
| kare dizisi webp60-1280 + palet | 8,5 ms | **41,5 ms** | 2,2 ms | 1,6 |

Video yolu ana iş parçacığına neredeyse hiçbir şeye mal olmuyor (çözme ayrı yerde).
Kare dizisi yolu dsf2'de tuvale çizimden ötürü ~30 fps tavanına oturuyor; palet katmanı bunu
41,5 ms'ye (≈24 fps) taşıyor.

> **Düzenek çapası:** bu headless Chrome'da rAF ~120 Hz (8,3 ms) koşuyor, 60 Hz değil.
> Yukarıdaki sayılar **pay göstergesi**, cihaz kestirimi değil. Gerçek telefon hükmü ayrı.

---

## 5. AĞ — asıl takas burada

4G benzetimi: 12 Mbit indirme, 60 ms gidiş-dönüş.

| aday | "hazır" (ms) | sert savurmada atlama % | max boşluk |
|---|---:|---:|---:|
| video g6 1080p | 528 | **47,2** | **77 kare** |
| video g24 1080p | 391 | **79,5** | 20 |
| kare dizisi webp75-1280 | **8 673** | 0,0 | 3 |
| kare dizisi webp60-1280 | **7 717** | 0,0 | 2 |

Video `canplaythrough`'u **yarım tamponla** veriyor; sonra tamponlanmamış bölgeye sarma
menzil isteği tetikliyor ve savurma kopuyor (77 karelik boşluk = 3,2 sn atlama).
Kare dizisi ise 8,7 sn'lik açık bir bekleme ödüyor, sonra hiç atlamıyor.

**Takas tek cümlede:** video beklemeyi saklar, savurmada öder. Kare dizisi beklemeyi peşin öder,
sonra hiç ödemez.

---

## 6. İSKELETİN TAŞIDIKLARI (uygulama değil — taşıyabilirlik kanıtı)

### 6a. video → gerçek zamanlı 3B → video devri

Zaman çizelgesi üç tür segment taşıyor: `video`, `sahne3b`, ve `ekranlar`.
Çekirdek durağı `sahne3b` olarak kuruldu: video durur, tuval devralır, sonra ikinci klip devam eder.
Sürükleme açısı künyeden okunur ve **kelepçelenir** (yatay 40° = ±20°, dikey 25° = ±12,5°);
serbest gezinme yok.

**Ölçüm:** hiçbir süpürmede devir noktasında 50 ms'yi aşan kare üretilmedi (yalnız 4G video
koşumunda 3 uzun kare, o da ağdan). Devir bedava değil ama ölçülebilir ve şu an görünmüyor.

**Sınır:** 3B durağı şu an bir **taslak** (tel kafes ikosahedron), gerçek beyin GLB'si değil.
GLB'nin maliyeti bu turda ÖLÇÜLMEDİ.

### 6b. palet katmanının belirli alanları kapsamaması (terminal ekranları)

İki yol da kuruldu ve **sayısal olarak kanıtlandı**. Kanıt için palet etkisi geçici olarak
`invert(1)` yapıldı (kaynak fotoğraf zaten renksiz olduğu için gri tonlama görsel kanıt vermiyordu):

| yol | ekran 1 içi | ekran 2 içi | dışarısı |
|---|---:|---:|---:|
| paletsiz referans (doğal) | 16,7 | 34,3 | 25,7 |
| (a) kare dizisi — tuval | **16,7** | **34,3** | 229,3 |
| (b) video — backdrop-filter + maske | **17,1** | **34,3** | 229,2 |

İçerisi referansla birebir, dışarısı tersine dönmüş. Mekanizma iki adayda da çalışıyor.

**Maliyeti eşit değil:**

| aday | çizim p50 → paletli | kare süresi p95 → paletli |
|---|---|---|
| video (masaüstü) | 0,1 → 0,1 ms | 8,5 → 16,7 ms |
| video (mobil 4×) | 0,3 → 0,3 ms | 8,4 → 8,4 ms |
| kare dizisi (masaüstü) | 0,1 → 0,3 ms | 12,6 → 25,1 ms |
| kare dizisi (mobil 4×) | 0,4 → 0,8 ms | 33,3 → 41,5 ms |

Video tarafında maske bedava; kare dizisi tarafında çizim işi iki katına çıkıyor.
*(Paletli satırlar n=1 — koşum yarıda kesildi; çizim süresi ölçütü sarma ölçütü kadar gürültülü
değil, yine de tek koşum.)*

### Kanıt sırasında bulunan iki gerçek hata

1. **Opak siyah dikdörtgen alfa maskesinde delik açmaz.** `mask-image` bir SVG *görseli* için
   varsayılan olarak alfayı kullanır; beyaz zemin + siyah dikdörtgen SVG'si alfa olarak her yerde 1
   demektir, yani maske **hiçbir şey yapmaz**. Perde bütün ekranı kaplıyordu ve bu **hata vermiyordu**.
   Delik `fill-rule="evenodd"` ile gerçek bir yolla açılmalı.
2. **Perde katmanı kare modunda da açılıyordu**, yani palet iki kez uygulanıyordu (tuvalde bir,
   perdede bir) ve dıştaki ters çevirme kendini götürüyordu. Görsel olarak "çalışıyor" gibi duruyordu.

Bu ikisi de ancak **iki taraflı sayısal kıyas** (içeri/dışarı × paletli/paletsiz) ile yakalandı.

---

## 7. DÜZENEĞİN KENDİ TUZAKLARI (kayda geçti)

- **`scrollTo` boşa gidebilir.** Sürücü her adımda `scrollY`'yi hedefle kıyaslar; bütün koşumlarda
  sapma 0 çıktı. Bu kapı olmadan üretilen tablo inandırıcı görünür ve yanlıştır.
- **Tuval `cover` matematiği.** İlk turda kare dizisi görüntüyü tuvale gererek çiziyordu (`<video>`
  `object-fit:cover` iken). Hem bozuk çiziyor hem fazla iş yapıyordu; mobil kıyası bundan çarpıktı.
  Düzeltildi ve bütün kare modu koşumları yenilendi.
- **`sharp(...).stats()` boru hattını değil GİRDİYİ ölçer.** İlk palet kanıtı üç ayrı bölgeden aynı
  sayıyı verdi — kırpma hiç uygulanmamıştı. Önce `toBuffer()`, sonra `stats()`.
- **Video sarma ölçütü gürültülü** (§2). Tek koşumla hüküm verilmez.
- **rAF bu düzenekte ~120 Hz.** 60 Hz'lik bir cihazın kare bütçesi değil, pay göstergesi.

---

## 8. ÖLÇÜLMEYENLER — açık kalemler

- **Gerçek klipler.** fps/çözünürlük kanonu bilinmiyor; ilk klip gelince `ffprobe` ile ölçülüp
  kanon kabul edilecek, diğerleri ona doğrulanacak. Sapan klip yeniden üretilecek — kendiliğinden
  yeniden kodlama yok.
- **Dikiş.** Video zinciri sahnenin son karesinden gelmiyor (ayrı üretilmiş kare zinciri).
  İki yol (statik bindirme + kare eşleşmesi ölçümü / son kare yakalama + bulanıklık maskeli çapraz
  geçiş) ölçülmedi — klipler gelince.
- **Safari / iOS.** Bu makinede ölçülemez. iOS'ta video sarma davranışı bambaşkadır ve
  `backdrop-filter` + `mask` bileşimi riskli. Gerçek cihaz hükmü şart.
- **Bellek.** Kare önbelleğinin ayak izi ölçülmedi (312 kare tutuldu; gerçek zincir ~2340 kare
  olacak — pencere stratejisi zorunlu, ölçülmeli).
- **Gerçek beyin GLB'sinin maliyeti** (§6a).
- **AVIF çözme maliyeti.** Yalnız boyut ölçüldü (en hafif kare dizisi varyantı); çözme süresi
  ölçülmedi ve AVIF çözme WebP'den belirgin pahalıdır.

---

## 9. DÜZENEĞİ TEKRAR KOŞMAK

Bağımlılıklar: `puppeteer-core` (bu turda mevcut kurulumdan alındı), `sharp`
(`yeni/node_modules`), ffmpeg (bu makinede yalnız CapCut'ınki çalışıyor ve yalnız `h264_nvenc`).

```sh
node uret-kare.js            # sentetik usta kareler (dag-ham.jpg'den)
sh   kodla.sh                # mp4 varyantlari (g1/g6/g12/g24 × 1080p/720p)
node uret-dizi.js            # kare dizisi teslim bicimleri (webp/jpeg/avif)
node kapi.js                 # KAPI: Chrome H.264 cozuyor mu, rVFC atiyor mu
node olc.js                  # butun yapilandirmalar
TEKRAR=3 CIKTI=x.json node olc.js ODAK   # tekrarli odak turu (medyan icin)
node rapor.js  / node rapor2.js x.json   # tablolar
node kanit-palet.js          # palet disi alan kaniti (sayisal)
```

Malzeme (285 MB) kasıtlı olarak repoda değil; `uret-kare.js` ile yeniden üretilir.


---

# EK — MOBİL DİKEY FİLM, İLK KARE, ZİNCİR AĞIRLIĞI (25 Ağu, ikinci tur)

## E0. Kırpmada sert sınır: "720p dikey" 16:9 kaynaktan ÇIKMAZ

1920×1080'den merkez 9:16 kırpma en fazla **608×1080** verir. Gerçek 720×1280 için ya
görüntü büyütülecek (bayt yakar, keskinlik vermez) ya da klipler **baştan 9:16 üretilecek**.
Aşağıdaki dikey merdiven bu yüzden 608×1080 / 540×960 / 432×768 olarak ölçüldü.

## E1. İçerik karmaşıklığı çarpanı — ölçüldü, tahmin değil

Gerçek klip yok. Onun yerine aynı süre, aynı kare sayısı, aynı QP ile iki uç üretildi:
**sakin** (fotoğraf üzerinde yavaş kaydırma) ve **hareketli** (agresif dolly + 360 parçacık akışı
— gerçek üretilmiş klibin zamansal karmaşıklığını AŞAN üst sınır).

| kodlama | sakin | hareketli | çarpan |
|---|---:|---:|---:|
| video g6 1080p | 3 629 543 | 7 521 733 | **×2,07** |
| video g6 720p | 1 350 138 | 3 427 834 | **×2,54** |
| video g24 1080p | 1 851 759 | 5 650 042 | **×3,05** |
| video g24 720p | 723 615 | 2 751 560 | **×3,80** |
| kare dizisi webp75-1280 | 3 413 944 | 4 929 606 | **×1,44** |
| kare dizisi webp60-1280 | 2 683 406 | 3 974 088 | **×1,48** |

**Bulgu:** ceza GOP uzunluğuyla büyüyor. Seyrek anahtar-kare (g24) hareketle neredeyse dörde
katlanırken sık anahtar-kare (g6) ikiye katlanıyor. Yani **sakin ölçümde g24'ün g6'ya üstünlüğü
%70 iken, hareketli içerikte %12'ye iniyor** — gerçek kliplerde sarma kalitesi neredeyse bedavaya
geliyor. Kare dizisi ise harekete karşı en duyarsız (×1,45), çünkü zamansal tahmin kullanmıyor.

## E2. Mobil tek film (k1+k2 bitişik, dikey kırpılmış) — ağırlık

13 sn ölçüldü; zincir 97,5 sn, durak 6,5 sn kabulüyle.

| varyant | 13 sn | zincir SAKİN | zincir HAREKETLİ | MB/durak sakin | MB/durak hareketli |
|---|---:|---:|---:|---:|---:|
| 608×1080 g6 | 4,8 MB | 36,2 MB | **92,0 MB** | 2,4 | 6,1 |
| 608×1080 g24 | 2,9 MB | 21,6 MB | **82,0 MB** | 1,4 | 5,5 |
| 540×960 g6 | 3,1 MB | 23,4 MB | **59,5 MB** | 1,6 | 4,0 |
| **540×960 g24** | 1,8 MB | 13,7 MB | **52,1 MB** | 0,9 | 3,5 |
| 432×768 g24 | 1,3 MB | 9,4 MB | **35,7 MB** | 0,6 | 2,4 |

## E3. İlk kare ne zaman geliyor

Mobil (412×892 dsf2), tek film, `+faststart`, `preload=auto`. Süre = sayfa başlangıcından
**gerçekten boyanan ilk kareye** (`requestVideoFrameCallback`).

| ağ | 608×1080 g24 | 540×960 g24 | 432×768 g24 | kare dizisi (kıyas) |
|---|---:|---:|---:|---:|
| wifi (sınırsız) | 0,05 sn | 0,05 sn | 0,04 sn | 0,06 sn |
| 4G 12 Mbit | 0,19 sn | 0,17 sn | — | — |
| 4G yavaş 4 Mbit | 0,38 sn | 0,37 sn | 0,31 sn | 0,44 sn |

**İlk kare sorun değil: her koşulda yarım saniyenin altında.** `preload=metadata` ile de aynı
(0,17–0,20 sn) — yani tam dosyayı önden çekmeye gerek yok, ilk kare için değil.

## E4. Asıl kapı: ilk kare değil, SARMA GÜVENLİ hâle gelme anı

Kaydırmaya bağlı oynatmada video ancak **tam tamponlandığında** kopmadan sarılır (§5'te
ölçülmüştü: yarım tamponda sert savurma 77 karelik boşluk veriyor). 13 sn'lik film için:

| ağ | 608×1080 g6 | 608×1080 g24 | 540×960 g6 | 540×960 g24 | 432×768 g24 |
|---|---:|---:|---:|---:|---:|
| 4G 12 Mbit | 3,55 sn | 2,21 sn | 2,40 sn | 1,40 sn | — |
| 4G yavaş 4 Mbit | 10,41 sn | 6,30 sn | 6,81 sn | 4,06 sn | 2,87 sn |

Bu süre zincir uzunluğuyla **doğrusal** büyür. İlk kare sabit kalır, sarma güvenliği durak
başına birikir. Prologun kapasitesini belirleyen sayı budur.

## E5. Masaüstü zinciri — gerçek kliplerle

**Ölçülemez, klipler yok.** Ölçülen taban ve ölçülen çarpanla aralık:

| varyant | zincir SAKİN (ölçüldü) | zincir HAREKETLİ (ölçülen çarpanla) |
|---|---:|---:|
| 1280×720 g24 | 13,5 MB | **51,1 MB** |
| 1280×720 g6 *(sarma tatlı noktası)* | 25,1 MB | **63,8 MB** |
| 1920×1080 g24 | 34,4 MB | **105,0 MB** |
| 1920×1080 g6 | 67,5 MB | **139,7 MB** |
| kare dizisi webp60-1280 | 49,9 MB | **73,9 MB** |

Gerçek zincir karışık olacak (dağ→vadi sakin, tünel/parçacık hareketli), yani beklenen yer
aralığın ortası–üstü. **Masaüstü için beklenen bant: 1280×720 g6'da 45–65 MB.**
Kesin sayı, ilk klipler gelince tek komut: `sh kodla.sh` + `node rapor.js`.

## E6. Durak başına maliyet — kapasite

Bir durak = 6,5 sn film. HAREKETLİ içerik kabulüyle (gerçekçi üst uç):

| aday | MB/durak | tamponlama sn/durak (12 Mbit) | (yavaş 4 Mbit) |
|---|---:|---:|---:|
| mobil 432×768 g24 | 2,38 | 1,7 | 5,0 |
| mobil 540×960 g24 | 3,48 | 2,4 | 7,3 |
| mobil 540×960 g6 | 3,97 | 2,8 | 8,3 |
| mobil 608×1080 g24 | 5,47 | 3,8 | 11,5 |
| masaüstü 1280×720 g24 | 3,44 | 2,4 | 7,2 |
| masaüstü 1280×720 g6 | 4,35 | 3,0 | 9,1 |

**Kaç durak sığar** (hareketli kabul):

| aday | 30 MB bütçe | 50 MB | 80 MB | 15 sn tampon (12 Mbit) | 15 sn tampon (4 Mbit) |
|---|---:|---:|---:|---:|---:|
| mobil 432×768 g24 | 12 | 21 | 33 | 9 | 3 |
| mobil 540×960 g24 | 8 | 14 | 23 | 6 | 2 |
| mobil 608×1080 g24 | 5 | 9 | 14 | 3 | 1 |
| masaüstü 1280×720 g6 | 6 | 11 | 18 | 4 | 1 |

## E7. Bu sayıların söylediği yapısal şey (karar değil, ölçüm sonucu)

Planlanan zincir **10 durak + final bölümü**. Yavaş 4G'de tek film olarak:
10 durak × 7,3 sn = **73 sn** sarma güvenli hâle gelme süresi. Tek film bu uzunlukta
yavaş hatta sarmaya uygun değil — ya durak başına ayrı dosya (önden yükleme, ilerledikçe),
ya daha düşük merdiven, ya da kare dizisine geçiş. Üçü de ölçülü; seçim Enes'te.

**Ölçülmeyen:** gerçek kliplerin kendi bit hızı (Kling çıktısı yeniden kodlanmadan kullanılırsa
bu tablo geçersiz — Kling'in kendi GOP'u seyrek olur ve sarma kopar), iOS davranışı, bellek.


---

# EK 2 — DURAK BAŞINA AYRI DOSYA: KARARIN SINANMASI (25 Ağu, üçüncü tur)

Karar (25 Ağu): tek film düştü, **durak başına ayrı dosya, sırayla, biri oynarken sonraki iniyor**.
Mobil 540×960 g24, masaüstü 1280×720 g6. Bu turda o kurgu kuruldu ve ölçüldü.

## E8. ÖNCEKİ SAYIMIN DÜZELTMESİ — mobil zincir 52 MB değil, 34 MB

Önceki turda mobil zinciri **52,1 MB** vermiştim. O sayı yanlıştı: hareket çarpanını
1280×720'de ölçüp 540×960'a taşımıştım. Doğrudan o merdivende ölçünce:

| 540×960 g24 | sn başına | 97,5 sn zincir | durak (6,5 sn) |
|---|---:|---:|---:|
| sakin | 138 KB | 13,1 MB | 0,87 MB |
| **hareketli** | **357 KB** | **34,0 MB** | **2,26 MB** |

Çarpan bu merdivende **×2,59**, 1280×720'deki ×3,80 değil. Kare küçüldükçe hareket cezası
düşüyor. **Masaüstü sayısı değişmedi** (1280×720 g6 hareketli = 63,7 MB; çarpan aynı
merdivende ölçülmüştü).

## E9. Zincir düzeneği

10 durak × 5 sn ayrı dosya, her durak kendi `<video>`'su, `önden` kadar ilerisi indiriliyor,
2 durak geriden öncesi bellekten bırakılıyor. "Hazır" = **tam tampon** (sarma ancak o zaman
kopmuyor). Malzeme **hareketli** (h1) — yani gerçekçi kötü durum.

**Ölçüt:** her durağa varışta hazır mıydı. (İlk koşumda takılan durak listesi yanıltıcıydı —
tek sürekli takılmanın bittiği durağı yazıyordu; düzeltilip yeniden koşuldu.)

## E10. 4G 12 Mbit

| küme | tempo (50 sn zincir) | önden | ilk durak hazır | hazır varış | takılma | atlama % |
|---|---|---:|---:|---:|---:|---:|
| mobil | 40 sn (ağır) | 1 | 2,51 sn | 9/9 | **0 sn** | 3,5 |
| mobil | 20 sn (normal) | 1 | 2,50 sn | 9/9 | **0 sn** | 12,8 |
| mobil | 20 sn (normal) | 2 | 3,71 sn | 9/9 | **0 sn** | 5,5 |
| mobil | 10 sn (hızlı) | 1 | 2,50 sn | 7/9 | 8,04 sn | 27,5 |
| masaüstü | 40 sn (ağır) | 2 | 6,96 sn | 9/9 | **0 sn** | 0,4 |
| masaüstü | 20 sn (normal) | 2 | 6,85 sn | 4/9 | 4,39 sn | 1,8 |

## E11. 4G yavaş 4 Mbit — karar burada sınırla karşılaşıyor

| küme | tempo | önden | ilk durak hazır | hazır varış | takılma | atlama % |
|---|---|---:|---:|---:|---:|---:|
| mobil | 40 sn (ağır) | 1 | **7,35 sn** | **9/9** | **0 sn** | 0,4 |
| mobil | 40 sn (ağır) | 2 | 10,85 sn | 9/9 | 0 sn | 10,4 |
| mobil | 20 sn (normal) | 1 | 7,36 sn | **1/9** | **16,5 sn** | 1,3 |
| mobil | 10 sn (hızlı) | 1 | 7,35 sn | 1/9 | 8,51 sn | 13,4 |
| masaüstü | 40 sn (ağır) | 2 | **20,21 sn** | **2/9** | **28,5 sn** | 15,8 |
| masaüstü | 20 sn (normal) | 2 | 20,25 sn | 2/9 | 14,5 sn | 15,1 |

## E12. Kural — kaç saniye durakta kalınmalı

Gözlem basit bir modelle birebir örtüşüyor:

> **durak başına en az kalma süresi = durak MB ÷ bant genişliği**
> Kullanıcı bundan hızlı geçerse ön yükleme geride kalır ve takılır.

| aday | MB/durak (hareketli) | 12 Mbit | yavaş 4 Mbit |
|---|---:|---:|---:|
| mobil 540×960 g24 | 1,74 (5 sn durak) | 1,16 sn | **3,65 sn** |
| masaüstü 1280×720 g6 | 3,27 (5 sn durak) | 2,18 sn | **6,86 sn** |

6,5 sn'lik gerçek duraklarda: mobil 2,26 MB → 12 Mbit'te 1,51 sn, yavaş 4G'de **4,74 sn**;
masaüstü 4,25 MB → 2,83 sn / **8,91 sn**.

Yani: yavaş 4G'de mobilde kullanıcı bir durakta **en az ~4,7 sn** kalmalı. Durak 6,5 sn ise
pay ×1,37 — dar ama tutuyor. Masaüstü merdiveni yavaş 4G'de tutmuyor (8,9 sn gerekiyor),
ama masaüstü kullanıcısının 4 Mbit'te olması beklenmez.

## E13. `önden=2` yavaş hatta ZARARLI

Beklenenin tersi çıktı. İki durak birden indirilince bant bölünüyor:

| ağ | önden=1 ilk durak | önden=2 ilk durak |
|---|---:|---:|
| 12 Mbit | 2,50 sn | 3,71 sn |
| yavaş 4 Mbit | 7,35 sn | **10,85 sn** |

Hazır varış oranı da iyileşmiyor. **Yavaş hatta önden=1.** Daha iyisi ölçülmedi: sıradaki
durağı ancak mevcut durak tam tamponlandıktan SONRA istemek (kesin seri) — bu düzenekte
eşzamanlı başlıyor, ayrı bir tur ister.

## E14. Seçilen merdivenlerde sarma kalitesi

| merdiven | tempo | atlama % |
|---|---|---:|
| mobil 540×960 g24 | ağır | 0,4–3,5 |
| mobil 540×960 g24 | normal | 1,3–12,8 |
| mobil 540×960 g24 | hızlı | 13,4–27,5 |
| masaüstü 1280×720 g6 | ağır | **0,4** |
| masaüstü 1280×720 g6 | normal | **1,8** |

Mobilde g24 seçimi okuma temposunda temiz, savurmada bozuluyor — 540×960'ta önceki turdaki
1280×720 g24 ölçümünden (%34) belirgin iyi, çünkü kare küçük. Masaüstünde g6 seçimi çok temiz.

## E15. KANON OKUYUCUSU — klipler gelince ilk iş

`kanon.js` yazıldı ve **kendini doğruladı**. Bu makinede ffprobe yok (CapCut derlemesi
`--disable-ffprobe`); GOP, `select=eq(pict_type,I)` ile I-kare sayılarak ölçülüyor.
Bilinen-GOP dosyalarla kapı:

| dosya | beklenen GOP | ölçülen | sonuç |
|---|---:|---:|---|
| k1_g1_1080p | 1 | 1 | GEÇTİ |
| k1_g6_1080p | 6 | 6 | GEÇTİ |
| k1_g12_1080p | 12 | 12 | GEÇTİ |
| k1_g24_1080p | 24 | 24 | GEÇTİ |

```sh
node kanon.js --dogrula          # olcutu her seferinde once dogrula
node kanon.js <klip-klasoru>     # fps / cozunurluk / GOP / bit hizi + kanon kapisi
```

Kapı üç şeye bakar: fps tek mi, çözünürlük tek mi, GOP > 8 olan var mı (varsa sarma kopar,
hepsi yeniden kodlanacak). **Not:** eşik gelen HAM klipler için; mobil çıktı zaten g24.

## E16. YENİDEN KODLAMA HATTI

`hazirla.js` yazıldı — karara göre iki merdiven üretir ve ağırlık raporu çıkarır:

```sh
node hazirla.js C:\projeler2\qanatone\klip [cikti]        # mobil + masaustu
node hazirla.js ... --hepsi                                  # mobil-hd (608x1080) de
```

- mobil: merkez 9:16 kırpma → 540×960, g24, qp26
- masaüstü: 1280×720, g6, qp26
- `SIRA` listesi klip adlarına göre sıralar; eşleşmeyen klip için **UYARI** verir ve
  alfabetiğe düşer. Dosya adları gelince o liste güncellenecek.
- Kaynak 1080'den dar kırpma çıkarsa (büyütme gerekirse) satır satır uyarır.

**Sınanmadı:** gerçek klip dosyaları üzerinde hiç koşmadı; sentetik kaynakla yol/parametre
akışı doğrulandı, gerçek kliplerde ilk koşum gözetimli olmalı.

## E17. Bu turda ölçülmeyen

- Kesin seri ön yükleme (mevcut durak bitmeden sonrakine başlamamak) — E13'ün önerdiği düzeltme.
- Duraklar arası **dikiş** (hâlâ açık kalem, klipler gerekiyor).
- 3B durağın zincire girişi — zincir düzeneği şu an yalnız video duraklar taşıyor;
  `duzenek.html` iskeletinde 3B segment var ama iki düzenek henüz birleştirilmedi.
- Gerçek cihaz, iOS, bellek.
