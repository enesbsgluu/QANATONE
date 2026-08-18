# FAZ 0 KAPI ÖLÇÜMÜ — mevcut mimari ↔ Astro kabuk

**18 Ağustos 2026 · araç: Lighthouse 12 (yerel, mobil emülasyon, simulate
kısma) · canlı: qanatone.netlify.app · temel: 5f476c6 (mevcut) / 3729018 (yeni)**

Astro kararı belgesinin kuralı: hiçbir faz "his" ile kapanmaz, rakamla
kapanır. Faz 0 kapısı = aynı içeriğin iki mimarideki mobil skoru.

Not: Google PSI API'si o gün anonim kota doldurduğundan ölçüm YEREL
Lighthouse ile alındı; kıyasın iki yakası da aynı araç, aynı gün, aynı
makine — karşılaştırma bu yüzden geçerli, mutlak sayılar PSI'dan sapabilir.

## Mevcut mimari (tek dosya + prerender, 127 kural yeşil)

| Sayfa | Puan | FCP | LCP | TBT | SI | CLS |
|---|---|---|---|---|---|---|
| `/` (ana) | **35** | 5,2 s | 7,8 s | 1.310 ms | 7,2 s | 0 |
| `/hizmetler/geo` | **42** | 3,2 s | 7,2 s | 1.260 ms | 5,5 s | 0 |

Pahalı kalemler (Lighthouse): render-blocking ~2,6 s (ana) / ~1,6 s (geo)
— font zinciri teorisi DOĞRULANDI; ana iş parçacığı 9,5 s (ana) / 7,1 s
(geo); bootup 1,3-2,7 s (496 KB betik her sayfada).

## Astro kabuk (Faz 0: /yeni/hizmet/geo — aynı içerik, content.json'dan)

Sayfa: 7 KB HTML + ~3 KB hash'li CSS, **0 JS**, sistem yazı yığını.

| Sayfa | Puan | FCP | LCP | TBT | SI | CLS |
|---|---|---|---|---|---|---|
| `/yeni/hizmet/geo` | **100** | 1,2 s | 1,2 s | 0 ms | 2,5 s | 0 |

## Kapı hükmü

**GEÇİLDİ.** Aynı içerik, aynı CDN, aynı gün: 42 → 100 puan; LCP 7,2 s →
1,2 s (6 kat); TBT 1.260 ms → 0. Göç sürer — Faz 1 başlayabilir.

## Kıyas dürüstlüğü

- Yeni sayfa henüz marka tipografisini (Playfair/Manrope) taşımıyor;
  sistem yığınıyla ölçüldü. Font kararı Faz 1'de verilecek ve fark
  o zaman yeniden ölçülecek — bu tablo mimari + varlık zinciri farkını
  ölçer, tipografi farkını değil.
- Yeni sayfa görsel şölen taşımıyor; Faz 2'nin işi. Kapı sorusu şu:
  zemin ne kadar hızlı — şölen o zeminin ÜSTÜNE eklenecek.
