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
| 8 | 76,09 - 79,69 | 12 | 11,8 | Otuz üç kilometre boyunca her elli metrede bir kuyu açılır. |
| 9 | 84,84 - 88,44 | 14 | 13,5 | Kazı, ancak ölçülebildiği yerde ilerler. |
| 10 | 92,14 - 95,74 | 15 | 12,7 | Üç bin yıl geçti. Problem yerinde duruyor. |
| 11 | 99,64 - 103,24 | 16 | 11,7 | Kanal hâlâ kanal. Değişen, içinden akan şey. |
| 12 | 104,64 - 108,24 | 17 | 5,1 | Su değil. Talep. **(MENTEŞE — tek başına, zemin bölgenin en durgunu)** |
| 13 | 118,14 - 121,74 | 20 | 12,5 | Müşterin bir yerde arıyor. Sen başka yerdesin. Arası kazılmamış. |
| 14 | 131,89 - 135,49 | 22 | 1,4 | Qanat kazan hiçbir uygarlıkta su eksik değildi. |
| 15 | 192,64 - 196,24 | 30 | 2,8 | Kanal kazıldığı gün bitmez. Şehir büyüdükçe uzatılır… |
| 16 | 200,89 - 204,49 | 31 | 2,3 | Bırakılanı çöl geri alır. |
| 17 | 228,73 - 232,33 | 35 | 12,8 | Her şehir bir kanalın ucunda kurulmuştur. |
| 18 | 234,73 - 238,33 | 35 | 17,3 | Seninki de bir kanalın ucunda. Ya kazılmıştır ya kazılmamıştır. |
| 19 | 241,73 - 245,33 | 37 | 10,6 | Biz o kanalı kazıyoruz. Aramada, yapay zekâ cevaplarında… |
| 20 | 247,98 - 251,58 | 38 | 13,4 | Pompayı da kurarız. Ama kanal yoksa… **(KİLİTLİ metin)** |
| 21 | 252,98 - 256,58 | 39 | 13,9 | Talebin nereden geldiğini ölçmüyoruz. Biliyoruz ve yaratıyoruz. |

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

Üç AÇIK + bir ✗ kapanmadan PUSH YOK (zaten yok). "Üç bin yıl" metni
Enes'in — 2.500'e mi çekilir, kaynağı mı bulunur, karar onun.
UNESCO sayfasının kendisi (whc.unesco.org/en/list/1506) bu ağdan 403
veriyor — doğrulama ikincil kaynaklardan, sayfa doğrudan açılıp
teyit edilmeli (bot duvarı / yanlış yeşil dersi).

## v1 ARŞİVİ (1-2 Eyl gece)

İlk sürüm 6 cümleydi (0fb4bdc ile uygulandı, kapıları geçti); Enes
2 Eyl'de metni 21 blok + 6 künyeyle yeniden yazdı — 6 cümle 113
saniyeye çok seyrek düşüyordu ve teklif düz söylenmiyordu. v1'in sahne
seçim gerekçeleri git tarihinde (0fb4bdc'deki bu dosya).
