# ARŞİV — 39 kliplik tam zincir

31 Ağustos 2026'da film **sekiz duraklık kesite** indi
(`yeni/film/kesit.json`, `PROLOG-KESIT-VE-KAPANIS.md`).
Görev metni: *"Kesit dışı klipler silinmez, arşiv klasörüne alınır. Tam
39 kliplik zincir ayrı bir teslim olarak yaşamaya devam eder."*

Burada duran şey:

| yol | ne |
|---|---|
| `varlik-39/` | 39 klibin tüm encode çıktısı (H.264 + H.265 + mobil + poster + açılış), 238 dosya |
| `kanon.json` | 39 klibin ffprobe künyesi (`src/film/kanon.json`ın kopyası) |
| `uretim.json` | 39 kliplik üretim künyesi (`uret.cjs` çıktısı) |

**Neden `public/` dışında:** `public/varlik/film/` altındayken 680 MB'lık
klasörün tamamı derlemeye ve yayına giriyordu. Kesit `public/varlik/kesit/`
altında yaşıyor; arşiv yalnız diskte durur.

**Geri döndürmek:** klasörü `yeni/public/varlik/film/` konumuna taşı,
`src/film/sahneler.ts`i arşivdeki `kanon.json` + `uretim.json`a bağla.
Motor artık tek hat H.264 olduğu için `-h265` dosyaları kullanılmaz;
sebebi `film/seek-3klip.json`da ölçülü (HEVC 27/36 kare doğru).

Kaynak 4K ustalar hiç ellenmedi: `Desktop/QANATONE SAHNELER 4K`.
