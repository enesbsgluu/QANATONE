# DENETİM SUITE GÖÇÜ — 127 kuralın üç kovası

**18 Ağustos 2026 · Faz 1'in ilk işi (CODE-TALIMAT-faz1, Bölüm C) ·
kaynak: test/denetim.js, 122 çağrı noktası / 127 çalışan kural**

Kural olmayan ders kaybolur; kova bilinmeyen kural göçte kaybolur.
Numara = kuralın suite çıktısındaki sırası (çağrı noktası).

## Kova 1 — ÇIKTI HTML/işlev denetleyenler → Astro çıktısına da uygulanır, YAŞAR

SEO/erişilebilirlik/rota (59-78, 82): adsız form alanı yok · lead formu
alanları · atıf alanları · mükerrer id · img alt · adsız bağlantı · tam 1
h1 · viewport · JSON-LD geçerli · @id tutarlılığı · mükerrer canonical /
description / title · EN→EN bağlantı · öksüz sayfa · sitemap örtüşmesi ·
?lang kalıntısı · yönlendirme kuralları · 404 kuralı · 404.html ·
dist/content.json. Tasarım ölçüleri (119-122): kontrast AA ×3 ·
prefers-reduced-motion · :focus-visible · dokunma hedefi.
**Şimdilik eski dist'i denetliyorlar (dist/yeni bilinçli muaf); Faz 4
kesmesinde hedefleri yeni çıktıya çevrilir.** Yeni çıktı bugünden
`yeni/denetim.js`'teki karşılıklarıyla (S1 ailesi) korunuyor.

## Kova 1b — ARKA UÇ (aynen taşınır, ön yüzden bağımsız YAŞAR)

12 (KVKK onayı) · 99-118: güvenlik taraması (sır/CDN/postMessage/SSRF),
yayinla (parola, timingSafeEqual, log, yol uyumu, hash biçimi), güvenlik
başlıkları, teşhis motoru (gövde sınırı, kota, beş hâl, yapı kalemleri,
belirlenimcilik), panel kapısı, admin parola alanı.

## Kova 2 — KAYNAK MONOLİTİ denetleyenler → mevcut site emekli olana dek YAŞAR, Faz 4'te emekli

1-6 (kaynak bütünlüğü: sözdizimi, CSS dengesi, data-t, önbellek imzası,
@keyframes, rAF düzen okuması) · 7-11 (monolit runtime rotaları, dil,
mobil menü) · 13-27 (panel önizleme/diagnose gösterimi/huni/hero monolit
davranışları) · 28-35 (mobil paketler: deste, eager/640, görünür doğar,
lowfx, stars/noise, backdrop, görünürlük kapısı, bileşen kimliği) ·
36-58 (sahne sözleşmeleri: huni statik, katman, dil geçidi, kaydırma,
reveal, pazar sahnesi, teller, pin, kart boyutu, halka, will-change,
GSAP, Motion sökümü, adres çubuğu, perde, TradeSelf, motor kabloları,
posix rota) · 79-81 (shell/admin/fonksiyon kaynağı taraması) · 83-87
(2a betik, satır içi envanter, boyut tavanı, 2b CSS, prefetch) · 88-98
(hidrasyon kanıtları, tek render, güvenlik haritası posix).
**Şimdi silinmez** — kök site yayında olduğu sürece bekçidir.

## Kova 3 — YENİ kurallar (yeni/denetim.js, Astro çıktısına, her deploy'da)

- **F1** yazı tipi zinciri: çıktıda fonts.googleapis/gstatic SIFIR;
  engelleyici stylesheet yalnız kendi alandan.
- **G1** görsel hattı: her `<img>` width+height; ilk ekran dışı lazy.
- **V1** veri derlemede pişer: istemci `fetch` sıfır (form gönderimi hariç).
- **J1** sayfa başına JS bayt tavanı (ölçülüp yazıldı — dosyada).
- **S1** taşınan sayfa başı: title/description menzilde, canonical,
  hreflang çifti, şema geçerli.
- **N1** göç bekçisi: kesmeye kadar her yeni sayfa `noindex` (kopya
  içerik cezasına karşı) — Faz 4'te bu kural TERSİNE çevrilir.
