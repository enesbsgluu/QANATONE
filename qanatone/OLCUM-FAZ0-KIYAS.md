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

---

# FAZ 1 ÖLÇÜMÜ — 32 sayfa (18 Ağu 2026, f26e630)

Doğrulama şartı: Faz 0'ın 100 / 1,2 sn / 0 ms çizgisinden aşağı düşen
sayfa kabul edilmez. Düşen olmadı.

| Sayfa (canlı, /yeni) | Puan | FCP | LCP | TBT | CLS | HTML | JS |
|---|---|---|---|---|---|---|---|
| hizmet/seo | **100** | 1,0 s | 1,0 s | 10 ms | 0 | 9,9 KB | 2.253 B |
| bulten/talebe-bes-dakikada-donmek | **100** | 0,9 s | 0,9 s | 10 ms | 0 | 8,1 KB | 2.253 B |
| hukuki | **100** | 0,9 s | 0,9 s | 10 ms | 0 | 7,6 KB | 2.253 B |
| (404.html) | — | — | — | — | — | 4,8 KB | 2.253 B |

JS'in tamamı Astro'nun prefetch betiği (gezinme ısıtması, J1 tavanı
10 KB'ın içinde). Mevcut sitede aynı sayfalar 79-102 KB HTML + 485 KB
betik zinciri taşıyor. Kural bekçileri: yeni/denetim.cjs (F1 G1 V1 J1
S1 N1) her deploy'da koşuyor; kırmızı = yayın düşer.

## Kıyas dürüstlüğü

- Yeni sayfa henüz marka tipografisini (Playfair/Manrope) taşımıyor;
  sistem yığınıyla ölçüldü. Font kararı Faz 1'de verilecek ve fark
  o zaman yeniden ölçülecek — bu tablo mimari + varlık zinciri farkını
  ölçer, tipografi farkını değil.
- Yeni sayfa görsel şölen taşımıyor; Faz 2'nin işi. Kapı sorusu şu:
  zemin ne kadar hızlı — şölen o zeminin ÜSTÜNE eklenecek.
