# TUR 5 — HİKÂYE METİNLERİ HARİTASI (1-2 Eyl 2026 gece)

ÖNCE HARİTA, SONRA UYGULAMA (talimat şartı). Durgun anlar GÖZLE değil
ÖLÇÜMLE seçildi: `olc-kamera-hizi.py` → `olc-kamera-hizi.json`
(160×90 gri ardışık kare ortalama mutlak farkı, 8 örnek/sn; "durgun" =
klip içindeki en düşük 2 sn'lik pencere). Sahne başlangıçları kanon.json
kümülatifinden; kaydırma pikseli = film-sn × 450 (pxsn, ayar.mjs).

## Altı cümlenin yerleşimi

| # | durak | cümle | sahne (içerik) | durgun pencere (fark) | görünme aralığı film-sn | ~px |
|---|---|---|---|---|---|---|
| 1 | KAYNAK | Kaynak hep vardı. | sahne1 (dağ + nehir) | 0,0-2,0 sn (2,42) | **0,3 - 4,0** | 135-1800 |
| 2 | KUYU AĞZI | Önce ağzını bulursun.* | sahne3 (tünel içi, parlayan ağız) | 5,75-7,75 (6,37) | **17,8 - 21,0** | 8010-9450 |
| 3 | YOL | Kazmadan önce ölçen kazanır. | sahne11 (halka içinden ölçüm ekranları) | 2,75-4,75 (4,44) | **70,7 - 73,4** | 31815-33030 |
| 4 | KANAL | Yerin altında kayıp yok. | sahne17 (liman gece, kızıl hat gemilere) | 2,75-4,75 (5,55) | **103,9 - 106,7** | 46755-48015 |
| 5 | ÖLÇEK | Kıt olan ölçülür. | sahne31 (yörüngeden dünya + şehir) | 5,75-7,75 (1,51) | **201,5 - 204,3** | 90675-91935 |
| 6 | KENT | Şehirler kanalın üstüne kurulur. | sahne35 (kıta gece, şehir ışık ağı) | 0,0-2,0 (8,73) | **228,7 - 232,4** | 102915-104580 |

\* 2. cümle hikâye belgesinde tam cümle olarak yok, öneri (talimattaki
not); Enes onaylamazsa değişir.

## Seçim gerekçeleri (ölçümden)

- **sahne1 @0:** filmin ilk 2 sn'si klibin en durgun penceresi (2,42);
  cümle açılışta oturur, sahne2'nin sert hareketi (8,82+) başlamadan
  söner.
- **sahne2 ATLANDI:** KUYU AĞZI'nın ilk adayıydı ama klip boyu hareketli
  (en durgun penceresi bile 8,82); sahne3'ün sonu (6,37) hem daha durgun
  hem "ağız" görüntüsünün ta kendisi (parlayan geçit).
- **sahne11 vs 12:** ikisi de ölçüm-ekranı teması; 11'in penceresi 4,44,
  12'ninki 9,17 → 11 kazanır ("kamera hızının en düşük olduğu anları
  bul, cümleleri oraya yasla").
- **sahne17:** KANAL bölgesinde (13-20) en durgun pencere (5,55; tek
  istisna sahne18 başı 3,08 ama o kare örgülü kablonun makrosu, cümlenin
  "kayıp yok" vurgusunu liman teslimi daha iyi taşıyor — tema sütunu
  gözle, pencere ölçümle). Enes isterse 18 başına kayar.
- **sahne31:** 1,51 ile bölgesinin en durgunu; ÖLÇEK'in ilk dünya
  görünümü.
- **KENT için sıra kısıtı:** en güçlü kent görüntüleri (28-30 Dubai)
  ÖLÇEK durağından (31) ÖNCE geliyor; cümle sırası bağlayıcı olduğundan
  KENT 31'den sonraki bölgeden seçildi. Oradaki en durgun anlamlı aday
  sahne35 başı (8,73; kıta gece ışık ağı — "kanalın üstüne kurulmuş
  şehirler" görüntüsü). sahne36 tema olarak daha "sokak" ama penceresi
  15,06 — kamera hızlıyken metin okunmaz kuralına takılır.
- **sahne4 (0,34) ve sahne22 (1,11)** filmden en durgun iki klip ama
  durak teması taşımıyorlar (damar doğuşu makrosu / uçak gece); metin
  cümle sayısını artırmaz (altı cümle bağlayıcı).

## Uygulama şartları (talimattan, uygulamada denetlenecek)

- Metin HTML katmanında; videoya metin basılmaz.
- Uncut Sans, ağırlık 300-700.
- Kaydırma konumuna bağlı (film-sn → konum), zamanlayıcıya değil; geri
  sarılırsa geri gelir.
- Bir anda tek cümle (yukarıdaki aralıklar ayrık — en yakın ikisi
  arasında 96+ sn var).
- TR + EN.
- reduced-motion: geçiş sadeleşir, metin kaybolmaz.
- J1 payı: film sayfası 10.691/11.264 → 573 B (tavan güncellemesi
  denetim.cjs J1 blokunda, rakamlı gerekçeyle).
- Kapı ölçümleri: üç koşumda görünürlük, çakışma yokluğu, metinli/
  metinsiz düşen kare kıyası, kontak görseli (6 kare).
