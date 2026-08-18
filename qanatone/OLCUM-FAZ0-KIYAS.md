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

---

# FAZ 2 ÖLÇÜMÜ — yeni ana sayfa (18 Ağu 2026, fb61631)

Kapı: Lighthouse mobil ≥90, LCP <2 sn, Enes'in savurma testi.

| Sürüm | Puan | FCP | LCP (ham) | TBT | CLS | Not |
|---|---|---|---|---|---|---|
| v1 | 98 | 1,6 s | 2.021 ms | 0 | 0 | giriş animasyonu LCP'yi itiyordu (opacity 0'dan) |
| v2 | 97 | 1,5 s | 2.079 ms | 0 | 0 | font takası boyaması LCP'yi itiyordu |
| **v3** | **99** | **1,5 s** | **1.810 ms** | **0** | **0** | giriş yalnız transform + gövde fontu `optional` |

Sayfa: 15,4 KB HTML + 9 KB CSS + **3,6 KB JS** (hedef 50 KB — %7'si;
kökteki ana sayfa 496 KB betik taşıyordu) + 141 KB öz-barındırılan font
(8 woff2, 3 aile, Inter yok; unicode-range bölmeli, immutable değil ama
statik). Sekiz sahne, hareketli üç (S1 tipografi girişi ≤400 ms yalnız
transform; S2/S3 CSS scroll-driven — 0 JS); H1-H4 + F1b kuralları her
deploy'da. İki LCP dersi kurul kayıtlı: giriş animasyonu opaklığa
dokunamaz; gövde fontu takas boyaması ilk görüşte LCP sayılır.

**Rakam ayağı GEÇİLDİ. Faz 2'nin kapanışı Enes'in savurma testine bağlı**
(hiçbir bölge boş kalmayacak) — hüküm onda.

## Kıyas dürüstlüğü

- Yeni sayfa henüz marka tipografisini (Playfair/Manrope) taşımıyor;
  sistem yığınıyla ölçüldü. Font kararı Faz 1'de verilecek ve fark
  o zaman yeniden ölçülecek — bu tablo mimari + varlık zinciri farkını
  ölçer, tipografi farkını değil.
- Yeni sayfa görsel şölen taşımıyor; Faz 2'nin işi. Kapı sorusu şu:
  zemin ne kadar hızlı — şölen o zeminin ÜSTÜNE eklenecek.
