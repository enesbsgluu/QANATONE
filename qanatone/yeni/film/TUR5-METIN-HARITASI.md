# TUR 5 v2 — ANLATI METNİ HARİTASI (2 Eyl 2026 gece)

Kaynak metin: PROLOG-ANLATI-METNI.md (Enes, 2 Eyl) — **21 metin bloğu
(18 vuruş; 1/5/13 çift cümleli tek vuruş) + 6 perde künyesi, iki dil.**
Üretici: `vurus-harita.py` (bu dosyayla aynı klasörde; pencereler ELLE
SEÇİLMEDİ). Girdi: `olc-kamera-hizi.json` (saniyelik kare-fark eğrisi)
+ kanon süreleri. Kural: pencere 3,6 sn (kapının ≥3 sn okunurluğu +
0,4 sn geçiş payı), aynı perdede pencereler arası ≥1,2 sn, blok sırası
= zaman sırası, seçim DP ile toplam fark minimumu.

## Perde bölgeleri (künye aralıkları) — gerekçeli

| perde | sahneler | film-sn | gerekçe |
|---|---|---|---|
| I · KAYNAK | 1-2 | 0,3 - 13,1 | dağ + nehir |
| II · İKİ YOL | 3-7 | 13,4 - 53,3 | kuyu ağzı, tünele iniş |
| III · EĞİM | 8-14 | 53,6 - 88,6 | tünel + ölçüm ekranları (11-12) |
| IV · KANAL | 15-20 | 88,9 - 121,8 | halat/liman (15 posterle doğrulandı) |
| V · ÖLÇEK | 21-34 | 122,1 - 228,4 | uçak, Dubai, yörünge |
| VI · KENT | 35-39 | 228,7 - 256,6 | kıta ışık ağı, şehir |

Bölge tarihi (ölçümle): III önce 9-12 sonra 9-14 denendi — sahne9-10
kamerası hızlı (en iyi pencere 19-23 fark), blok 6 orada okunmazdı.
Sahne8 durgun (7,9) ve tema hâlâ tünel; III sahne8'den başlatıldı,
blok 6 farkı 19,3 → 8,6. Künye "perde başında değişir" kuralı bu yüzden
perde sınırını anlatı sınırı sayar, içerik etiketi değil.

## 21 blok — giriş/çıkış (film-sn) + zeminin ölçülen hızı

| blok | pencere | sahne | fark | metin (TR) |
|---|---|---|---|---|
| 1 | 0,30 - 3,90 | 1 | 3,3 | Su dağın altında. Şehir çölün ortasında. Arada otuz üç kilometre kaya. |
| 2 | 5,30 - 8,90 | 1 | 5,6 | Bunu geçmenin iki yolu var. |
| 3 | 20,38 - 23,98 | 3 | 1,6 | Pompa çalıştığı sürece su verir. Durduğu anda keser. |
| 4 | 25,38 - 28,98 | 4 | 0,3 | Kanal bir kez kazılır. Sonra kendi kendine akar. |
| 5 | 40,13 - 43,73 | 6 | 4,9 | Kanalı seçenler işe tek bir kuyuyla başladı. Üç yüz metre… |
| 6 | 54,59 - 58,19 | 8 | 8,6 | Gerisi tek bir sayıdır. Her kilometrede bir metre iniş. |
| 7 | 70,34 - 73,94 | 11 | 5,7 | Fazlası kanalı aşındırır. Azı suyu durdurur. |
| 8 | 76,09 - 79,69 | 12 | 11,8 | Otuz üç kilometre boyunca yüzlerce dikey kuyu açılır. |
| 9 | 84,84 - 88,44 | 14 | 13,5 | Kazı, ancak ölçülebildiği yerde ilerler. |
| 10 | 92,14 - 95,74 | 15 | 12,7 | İki bin beş yüz yıl geçti. Problem yerinde duruyor. |
| 11 | 99,64 - 103,24 | 16 | 11,7 | Kanal hâlâ kanal. Değişen, içinden akan şey. |
| 12 | 104,64 - 108,24 | 17 | 5,1 | Su değil. Talep. **(MENTEŞE — tek başına, zemin bölgenin en durgunu)** |
| 13 | 118,14 - 121,74 | 20 | 12,5 | Müşterin bir yerde arıyor. Sen başka yerdesin. Arası kazılmamış. |
| 14 | 131,89 - 135,49 | 22 | 1,4 | Qanat kazan hiçbir uygarlıkta su eksik değildi. |
| 15 | 192,64 - 196,24 | 30 | 2,8 | Kanal kazıldığı gün bitmez. Şehir büyüdükçe uzatılır, bakımı bırakılırsa dolar. |
| 16 | 200,89 - 204,49 | 31 | 2,3 | Bırakılanı çöl geri alır. |
| 17 | 228,73 - 233,13 | 35 | 14,2 | Her şehir bir kanalın ucunda kurulmuştur. |
| 18 | 234,23 - 238,63 | 35 | 18,1 | Seninki de bir kanalın ucunda. Ya kazılmıştır ya kazılmamıştır. |
| 19 | 241,23 - 245,63 | 36 | 17,4 | Biz o kanalı kazıyoruz. Aramada, yapay zekâ cevaplarında… |
| 20 | 246,73 - 251,13 | 38 | 15,4 | Pompayı da kurarız. Ama kanalın nereye kazıldığını bilmeden… **(KİLİTLİ metin)** |
| 21 | 252,23 - 256,63 | 39 | 13,8 | Talebin nereden geldiğini ölçmüyoruz. Biliyoruz ve yaratıyoruz. |

**3 Eyl güncellemesi:** VI pencereleri 4,4 sn (ara 1,0) — İş B okunurluk
kapısı için; VI rayı yerel k=1,4 (data-yavas; motor parçalı harita).
Blok 8/10/15/20 metinleri rakam düzeltmesiyle değişti (kaynak dosya).
İş A: metin sinema altyazısına indi (bottom %18, tek ölçek 56→36 tavan,
ağırlık 500) — merkez kapısı eski yerleşimde adıyla kırmızıydı.

## İşaretli bölgeler (dürüstlük satırları)

- **VI · KENT hiç durmuyor:** bölgenin en durgun pencereleri bile
  10,6-17,3 fark bandında (kıta uçuşu). "Kamera hızlanırken metin
  gelmez" için mutlak eşik tanımlı değil; en durgun anlar seçildi,
  görsel hüküm Enes'te. Alternatif yok: kapanışın beş vuruşu bu bölgeye
  bağlı (metin sırası bağlayıcı).
- Blok 8/9/10/11/13 de 11-13 bandında — IV/III bölge doğası.
- Kaynak dosyada numara kayması: "Vuruş 11 yalnız kalır" notu tablodaki
  **#12'yi** ("Su değil. Talep.") kastediyor; "Vuruş 18 tek düz hizmet
  cümlesi" notu **#19'u**, "Vuruş 20 kilitli" **#20'yi**. Blok
  numaraları BU dosyada bağlayıcıdır.
- Menteşe (#12) bölgesinin en durgun penceresine denk geldi (5,1) —
  ölçüm anlatıyla aynı yere bastı, ayar gerekmedi.

## Uygulama şartları (talimattan)

- Bir anda tek vuruş (pencereler ayrık — DP kısıtı ≥1,2 sn boşluk).
- Künye ayrı, küçük, sürekli katman; perde başında değişir (aralıklar
  üstteki tablo); vuruşlarla ÇAKIŞMAZ (yerleşim: sol üst köşe — vuruş
  merkezde; kapı bounding-box kesişimiyle ölçülür).
- Kaydırma konumuna bağlı; geri sarılırsa geri gelir.
- Uncut Sans 300-700. TR ve EN AYRI ölçülür (EN satırları uzun, taşma
  kapısı ayrı). EN sayfası bu turda doğar (yeni/src/pages/en/film.astro).
- J1: film sayfası 10.691 / 11.264 — aşılırsa ÖNCE söylenir.
- Metin katmanı düşen kare eklemez: metinli/metinsiz yan yana, taban
  damgalı (olc-soz.cjs).
- Kontak: 21 blok, her biri kendi karesinde.
- RAKAMLAR: 33 km · 300 m · 1:1000 · 50 m'de kuyu · 3000 yıl ·
  derinleştirme — UNESCO Persian Qanat kaydına bağlanmadan PUSH YOK;
  sayfaya küçük kaynak satırı konur (kondu: .fl-kaynak, son perde).

## RAKAM DOĞRULAMA TABLOSU (2 Eyl gece — PUSH KAPISI)

| iddia | durum | kaynak |
|---|---|---|
| 33 km kanal | ✓ 33.113 m, 427 kuyu (Qasabeh Gonabad) | Wikipedia "Qanats of Ghasabeh"; UNESCO 1506 bileşeni |
| 300 m ana kuyu | ✓ "mother well ~300 m" | aynı kayıtlar |
| 3000 yıl | ✗ DOĞRULANAMADI — kayıtlar 2.500-2.700 yıl (MÖ 700-500, Ahameniş) | Wikipedia/UNESCO tanıtımları |
| 1:1000 eğim | AÇIK — literatür tipik 1:1000-1:1500 der, Gonabad'a özgü teyit bulunamadı | — |
| 50 m'de bir kuyu | AÇIK — literatür 20-50 m aralık verir, spesifik teyit yok | — |
| su düştükçe derinleştirme | AÇIK — genel qanat pratiği, kayıt cümlesi aranacak | — |

**RAKAM KAPISI KAPANDI (Enes, 1 Eyl doğrulaması + 3 Eyl metin):**
33 km ✓ 300 m ✓ kaldı; "50 m'de kuyu" → "yüzlerce dikey kuyu"
(aralık 20-200 m, sabit sayı yok); "3000 yıl" → "iki bin beş yüz"
(Gonabad 2.500-2.700); derinleştirme iddiası çıktı → "bakımı
bırakılırsa dolar". #20 pompa cümlesi yeniden yazıldı. PUSH ENGELİ
KALKTI (push kararı yine Enes'in). Kaynak satırı sayfada (.fl-kaynak).

## v1 ARŞİVİ (1-2 Eyl gece)

İlk sürüm 6 cümleydi (0fb4bdc ile uygulandı, kapıları geçti); Enes
2 Eyl'de metni 21 blok + 6 künyeyle yeniden yazdı — 6 cümle 113
saniyeye çok seyrek düşüyordu ve teklif düz söylenmiyordu. v1'in sahne
seçim gerekçeleri git tarihinde (0fb4bdc'deki bu dosya).

## ALTYAZI TEMASI (4 Eyl 2026) — metin katmanı yeniden kuruldu

Enes onayladı, yapı bağlayıcı (referans altyazi-son.html; diskte
bulunamadı, yapı brief'teki sayılardan kuruldu). Önceki katman (İş A:
alt bant, tek ölçek, sönümlenerek belirme, sol üstte sürekli künye)
okunuyordu ama karakteri yoktu.

**Yapı (yukarıdan aşağı, ortalanmış; film.css "ALTYAZI TEMASI"):**
perde künyesi 11,5 px · .16em · 600 · #ff4d63, alttan .35em yükselir →
kızıl çizgi 1 px · min(%38, 260 px) · iki uca sönen gradyan · merkezden
açılır (scaleX 0→1, origin center) → satırlar, her biri kendi
overflow:hidden maskesinde, translateY(110%)→0, cubic-bezier(.22,1,.36,1),
ikinci satır 90 ms gecikmeli → alt perde %32, tabanda rgba(3,4,6,.90).
Ağırlık 500, Uncut Sans. Text-shadow kalktı (okunurluk perdeden).

**Yapı değişikliği:** künye artık ayrı sürekli katman DEĞİL — her bloğun
ilk satırı, blokla gelir gider; sol üstteki sürekli künye KALKTI. Satır
= cümle: çok cümleli blok en dengeli noktadan iki satıra bölünür
(Film.astro `satirla`, metin birebir). Motor DEĞİŞMEDİ: sınıfı
konteynere yazar, parçalar CSS'le gelir; perde `:has()` ile.

**Ölçüm (olc-soz.cjs v3, 4 Eyl, Brave 152, 1440×900):** HÜKÜM GEÇTİ.
TR ve EN ayrı, 3 koşum: 21/21 blok her koşumda; kaplama en çok %10,1
(künye + çizgi dahil; tavan %20); merkez örtülmüyor; gecikme 83-97 ms
(yarı-yol anından, hedef 90); çizgi merkez kayması 0 px; künye alttan;
hareket azaltma (CDP emülasyonu): geçişler 0, metin + perde görünür;
VI okunurluk 3073-3131 ms; düşen kare TABAN DAMGALI: taban 0/10 sn,
metinli [2,0,0] / metinsiz [0,1,0], medyan 0 = 0. J1 film sayfası
10.796 B (önce 10.691; tavan 11.264). Kontak: kontak-soz/blok01-21.jpg
+ yanyana-koyu.png (blok 1, dağ) + yanyana-acik.png (blok 16, uzaydan
dünya) — hüküm Enes'in gözünde.

**Kırmızı-önce:** (a) v3 rig eski yapıya karşı YALNIZ_SAYIM=1 ile
koşuldu → YAPI KALDI (blok 27≠21, eski sürekli künye 6, perde 0);
(b) her koşumda `?boz=soz` (gecikme 0 + çizgi orijini sol + maske açık)
→ gecikme 0 ms, merkez kayması 112,5 px, maske: üçü de KIRMIZI.

**Düzeneğin kendi hataları (ilk koşumda yanlış kırmızı, düzeltildi):**
perde "önce" anı önceki bloğun penceresine düşüyordu (blok 1 3,9'da
biter, blok 2 5,3'te başlar) → o anda blok varsa perde açık olmalı;
ortalama innerWidth'e göreydi, kaydırma çubuğu 7,6 px yanlış kırmızı
verdi → clientWidth; gecikme oturma anından ölçülüyordu, sarılan satır
aynı eğrinin kuyruğunda daha geç oturur (EN b21 50 ms) → yarı-yol anı.

**Prolog kapanış tablosu YENİDEN koşuldu (aynı gece):** devir 3 oran
GEÇTİ (AZALT=1 damgalı; damgasız koşum bilinen yanlış kırmızı: 538/398
px); efekt A düşen kalemi ÖNCEKİYLE AYNI bilinçli açık (düşen 5/4/5,
zoom 14 — değişiklik öncesi 5/4/5, 14/12/12), B + halka + ibare GEÇTİ;
yeni/test 15/15; kök denetim suite 128/0. Kırılan kapı yok.
