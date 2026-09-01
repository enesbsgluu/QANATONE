# SÖKÜM VE TAŞIMA TURU — KAPANIŞ (4-5 Eyl 2026 gecesi)

*(SOKUM-KARAR-LISTESI.md'nin uygulaması. Enes'in kararı: çıkan tek şey kızıl harita; geri kalan her şey eski siteden birebir, hareket dili yeni, GSAP/Lenis yok, tipografi Uncut Sans. Push yok; görsel hüküm Enes'te.)*

## Durum: TAMAMLANDI, TEK KIRMIZI ADIYLA YAZILDI — DURULDU

`/hizmet/finans` (TR ve EN) tur sonu sayfa kapısını geçmiyor: kare p95 25 ms (tavan 20), takılma %3,14 / %1,58. **Sebep tur öncesinden:** aynı sayfa tur öncesi derlemede (f2f80fa, ayrı worktree, :8791) p95 33,3 ms / takılma %4,19 ile daha kötü; pazar zekâsı motoru (`MotorSahne`, `.mk-kap`) gizlenince sayfa geçiyor (p95 16,6, takılma 0), bu turun blokları (`.tpbox,.mfst,.tsa`) gizlenince geçmiyor (p95 25,1). Kabuksuz (`?kabuk=0`) fark yok. Karar Enes'te: MotorSahne ayrı tur.

## Kapılar

| kapı | sonuç | kanıt |
|---|---|---|
| kızıl harita 0 eşleşme (markup/JS/denetim/panel) | GEÇTİ | kök `dist/index.html`+`404.html` 0; `dist/yeni` 0; QG kaldı (TradeSelf) |
| gsap + lenis 0 eşleşme (`dist/yeni`) | GEÇTİ | 0 dosya (film gömüsündeki yorum + `.lenis` kuralı soyuldu) |
| eski gövde ailesi 0 eşleşme | GEÇTİ | `font-family:` Nunito/JetBrains/Manrope/Inter 0 |
| TR+EN taşma yok | GEÇTİ | `olc-tasma.cjs` 63 sayfa × 2 genişlik; kırmızı-önce: eski site KOK=1 aile KALDI |
| her sayfa JS bütçesi | GEÇTİ | denetim J1: ana 12.366/12.800 · film 10.796/11.264 · öbür en büyük 8.657/10.240 |
| sürücü tablosu (IO doğuş + kaydırma / statik) | GEÇTİ | `olc-surucu.cjs` 59 sayfa, kadraja girişle başlayan sonlu animasyon 0; kırmızı-önce enjekte yakalandı |
| suite temiz klonda yeşil, kural sayısı gerekçeli | GEÇTİ | yeni denetim 54→55 (K1 kabuk modülü), kök 128→128 (harita kuralı 8→7 kurulum, abone 7→6); yeni/test 15/15 |
| prolog kapanış tablosu yeniden | KIRILAN YOK | devir 3 oran GEÇTİ (AZALT=1); efekt A düşen 4 (medyan) = öncekiyle aynı bilinçli açık, süre medyan 466; B/halka/ibare GEÇTİ; altyazı TR+EN GEÇTİ |
| kontrol önce kırmızı | GEÇTİ | her yeni rig'de: tasma (eski site), sürücü (enjekte), sayfa (finans), altyazı (?boz) |
| EK KAPI · bütün sayfalar p95 ≤ 20 / takılma ≤ %3 + tek ≤ 250 / taban / JS | 57 / 59 | `olc-sayfa-{A,B,C,D1,D2}.json`; kalan: finans TR+EN (yukarıda) |
| _headers üç boşluk | KAPANDI | `/yeni/404.html` noindex · `/yeni/font/*` · `/yeni/img/*` 1 gün |

## Geri gelen bölümler — sürücü tablosu

`ada` = sayfada `<script>` · `dinamik` = boşta/IO ile inen ayrı modül (J1 dışı, kendi tavanı K1) · `statik` = 0 bayt.

| sayfa | bölüm | kaynak | ada/statik | sürücü |
|---|---|---|---|---|
| tümü | perde (`#perde`) — film hariç her sayfada | 4415-4614 | ada 791 B (is:inline) | zamanlayıcı + ilk dokunuş |
| tümü | yıldız tuvali `#stars` | 9236-9274 | dinamik (kabuk.js) | rAF 30 fps, görünürlük; panel `stars:0` → bugün kapalı basılır |
| tümü | grain `#noise` | 228-232 | statik (img/gren.png) | yok |
| tümü | ajan imleci `#bit/#bittip/#bitsay/#bitback` | 9373-9555 | dinamik (kabuk.js) | pointermove + rAF; balon tıklamada |
| tümü | footer 3 sütun + alt satır | 5478-5512 | statik | yok |
| tümü | bit damgası `#wmk` | 11135-11261 | dinamik (kabuk.js) | IO doğuş tetiği → rAF (görünürken) |
| tümü | GTM/GA | 10765-10783 | statik (gtm boşsa 0) | yok |
| ana | hero tüpleri `#tubes` | 9077-9133 | dinamik (kabuk.js → /js/tubes.min.js) | IO play/pause, görünürlük |
| ana | akış ok düğmeleri + sürükleme | 6863-6888 | ada (SAAkis içinde) | tıklama / pointer |
| ana | pano kaydırıcıları (tek blok) | 4681-4694 · 9422-9500 | dinamik (pano.js, ilk dokunuş) | input |
| ana | "Sektör değiştir" | 4710 | statik | yok — "Genel görünüme dön" TAŞINMADI (hedefi harita) |
| ana | teşhis düzeltme listesi + CTA | 11406-11416 | ada (+ JSON sözlük gönderimde) | kullanıcı eylemi |
| ana | söz bandı otomatik dönüşü | 10471 | — | TAŞINMADI: bayrak kapalı, bölüm basılmıyor |
| /hizmetler | alt demo formu | 5011 | ada 2.487 B (SILIletisim) | submit |
| finans | TradeSelf manifestosu | 7636-7651 | statik | KAYDIRMA (view(): çizgi + kazançlar) |
| finans | teslimat anatomisi | 7705-7770 | ada 483 B (çip → ayrıntı) | KAYDIRMA (view(): teller `--tel`, kartlar, piksel perdesi); IO yok |
| finans | detay görseli yuvası | 8208 | statik | — (det.img bugün boş) |
| ai-ajan | ajan kadrosu | 7656-7699 | ada ~500 B (çip → ayrıntı) | KAYDIRMA (view(): satırlar) |
| /otomasyon | sızıntı pini | 11603-11611 | statik (CSS sticky) | KAYDIRMA (adlı view, contain 0-100) |
| /otomasyon | sızıntı tanecikleri | 9803-9944 | dinamik (sizinti.js, IO) | IO doğuş tetiği → rAF; ilerleme `--szt` |
| /otomasyon | canlı iş akışı şeridi + sayaç | 5024-5051 | — | TAŞINMADI: sahte canlılık (uydurma rakam çizgisi) — karar Enes'te |
| /bulten | sektör filtre çipleri | 7208-7224 | statik (radyo + :has) | yok |
| yazı | geri bağı + "diğer yazılar" şeridi | 5168 · 7265-7288 | ada ~450 B | tıklama / scroll senkron |

## Düzenekler (yeni)

- `yeni/film/olc-tasma.cjs` — tipografi aile + taşma, 63 sayfa × 2 genişlik.
- `yeni/film/olc-surucu.cjs` — sürücü kapısı (kadraja girişle başlayan sonlu animasyon).
- `yeni/film/olc-sayfa.cjs` — EK KAPI: kare p95 / takılma / taban / JS, sayfa sayfa (FILTRE, GIZLE, `?kabuk=0` kolları).
- `yeni/kabuk-derle.cjs` — kabuk.js · pano.js · sizinti.js · tespit-fix.json (esbuild).

## Ölçüm tuzakları (bu turda öğrenilen)

- Ortak stil satır içi olduğu için **ana sayfa gzip tavanı (40,9 KB) HTML ile dolar**: pano başına kopya kaydırıcı ve `<template>` sözlüğü tavanı aştı; tek blok + JSON'a çıkarma çözdü.
- Bölüm bileşenlerinin `<script>`i yalnız o bileşen basılınca sayfaya girer (seo sayfası kadro/teslimat betiğini taşımıyor) — ama CSS'i her hizmet sayfasına iner.
- `olc-devir` daima `AZALT=1` ile; damgasız koşum 538/398 px yanlış kırmızı.
- Arka plan bash zinciri öldürülünce node/brave çocukları yetim kalır; uzun rig'ler ön planda, 10 dakikalık parçalarla.
