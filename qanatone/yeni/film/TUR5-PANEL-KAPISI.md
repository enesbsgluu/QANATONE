# TUR 5 — Panel (2 Eylül 2026, gece zinciri)

Kapı "alan panelde var" değil: **panelden yazıldı → derlendi → üretilen sayfada
göründü**, üçü birden. Düzenek `yeni/panel-kapi.cjs`: repo kökü 8791'de sunulur,
Brave'de `admin.html` açılır, alanlara gerçek klavye girdisi yazılır (input →
`set` → `touch` → localStorage taslağı), taslak `content.json`'a yazılır
(yayınla fonksiyonunun işi), astro derlenir, `dist/yeni`'de nöbetçi metin
aranır; sonra aynı alanlar boşaltılır, yeniden derlenir, denetim koşulur;
sonda `content.json` geri yüklenir ve yeniden derlenir (3 derleme, ~4 dk).

## Açılan / bağlanan alanlar

| Alan | Durum |
|---|---|
| **Sabit metinler sekmesi** (`metin`) | YENİ. 269 anahtar: yeni site 123 (m('anahtar','TR','EN') okuyan bileşenler: /otomasyon 94, Menü 10, Kabuk 7, Bülten dizini 7, /surec 3, /sss 2) + yalnız eski site 146 (data-t sözlüğü). Arama (anahtar + iki dil + yazılan) ve bölüm süzgeci; boş alanda koddaki varsayılan yer tutucu olarak görünür. Harita `yeni/metin-harita.cjs` üretir ve `admin.html`'e gömer; eski suite kuralı `KONTROL=1` ile tazeliği ölçer. |
| Sosyal adresler (`socials`) | vardı (Kurucu sekmesi); alt bilgide görünüyor. `sameAs` beslemesi TUR 6. |
| og görseli (`settings.og`) | YENİ alan + YENİ çıktı: yeni site hiç `og:*`/`twitter:card` basmıyordu (eski site basıyordu). Temel.astro: og:type/title/description/url/image/locale + twitter:card. Boşsa kök `og.png` (1200×614 — ölçüsü Enes'in kararı). |
| Kurucu biyografisi TR/EN | vardı; kapıdan geçti. |
| KVKK metni + yasal satır | vardı; kapıdan geçti (/hukuki TR; EN sayfası tasarım gereği yok). |
| Ölçüm betiği (`settings.gtm`) | vardı (GTM-/G- kimliği; boşsa istek yok). |
| Müşteri sözleri + `testi.on` | vardı ama **YANLIŞ YEŞİLDİ**: panel `theme.testi.on` yazıyor, `SSBSozBandi` `settings.testi` okuyordu → panelden açılan bant üretimde doğmuyordu. Düzeltildi; H22 kuralı da aynı yolu ve aynı kayıt süzgecini (söz + unvan) okuyor. |
| Yıldız tuvali (`theme.motion.stars`) | vardı (Görünüm); açık/kapalı iki yönde ölçüldü (`t-nostars`). |

## Kapı tablosu (panel-kapi.cjs çıktısı)

| Alan | Panelde yazıldı | Taslakta | Derlendi | Üretimde göründü | Boş hâli | Hüküm |
|---|---|---|---|---|---|---|
| strings.tr.nav0 (menü) | ✓ | ✓ | ✓ | index.html | temiz | GEÇTİ |
| strings.en.nav0 (menü EN) | ✓ | ✓ | ✓ | en/index.html | temiz | GEÇTİ |
| strings.tr.foot1 (alt bilgi) | ✓ | ✓ | ✓ | index.html, sss/ | temiz | GEÇTİ |
| strings.tr.gn3 (/otomasyon) | ✓ | ✓ | ✓ | otomasyon/ | temiz | GEÇTİ |
| strings.tr.ahb (**kırmızı kontrol**: yalnız eski site okur) | ✓ | ✓ | ✓ | görünmedi | — | KIRMIZI YAKALANDI |
| settings.og | ✓ | ✓ | ✓ | index.html, en/ | temiz | GEÇTİ |
| settings.orgDesc (şema) | ✓ | ✓ | ✓ | index.html | temiz | GEÇTİ |
| legal.line | ✓ | ✓ | ✓ | index.html | temiz | GEÇTİ |
| legal.kvkk | ✓ | ✓ | ✓ | hukuki/ | temiz | GEÇTİ |
| founder.bio.tr | ✓ | ✓ | ✓ | index.html | temiz | GEÇTİ |
| socials.0.url | ✓ | ✓ | ✓ | index.html | temiz | GEÇTİ |
| testimonials.0.q.tr (testi.on=1) | ✓ | ✓ | ✓ | index.html (düzeltme sonrası; önce "hiçbir sayfada") | temiz | GEÇTİ |
| theme.motion.stars | ✓ | ✓ | ✓ | açıkken t-nostars yok | kapalıyken var | GEÇTİ |
| theme.testi.on | ✓ | ✓ | ✓ | bant doğdu | bant yok | GEÇTİ |

Denetim: dolu hâl 55/0 (H22 düzeltmesi sonrası), boş hâl 55/0, boş hâlde
`undefined`/`null` sızıntısı yok. Arama: 269 metin, "whatsapp" → 5, bölüm
Menü → 10. Panel bütçesi: `admin.html` 78.808 B (kural ≤ 96 KB; harita 15,4 KB).

## Elenen / yakalanan

- Yanlış yeşil #1: söz bandı bayrağı yolu (theme ↔ settings). Kapı yakaladı.
- Yanlış yeşil #2 (kural tarafı): H22 `settings.testi` okuyordu ve unvansız
  kaydı da bantta arıyordu; bayrak açılınca yanlış kırmızı. İki yönde ölçüldü.
- İlk kırmızı kontrol (`zzz_kirmizi`) yanlış tasarımdı: panelde alanı olmayan
  anahtar "yazılamadı" diye kaldı, kablo kopukluğunu sınamadı. Kontrol "Eski
  site" bölümünden gerçek bir alana alındı (alan var, taslağa girer, yeni
  sitede görünmez).
- Gömülü harita ilk yerleşiminde `P` nesnesinin içine düştü (sözdizimi
  hatası, panel boş açıldı); `P`'nin üstüne alındı. Eski suite'e sözdizimi
  değil, KONTROL + sekme + bütçe kuralları eklendi (131 → 134 kural).

## Enes'e kalan

- Yalnız eski sitede okunan 146 anahtar: eski site kesildiğinde bölüm silinir.
- og.png 1200×614 (standart 1200×630).
- Panel önizlemesi hâlâ eski siteyi (`/index.html`) gösteriyor; yeni site
  önizlemesi kesme sonrası işi.
