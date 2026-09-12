# TUR 4 — Chrome derin performans denetimi (2 Eylül 2026, gece zinciri)

Düzenek: Brave 152 (Chromium, donanım hızlandırma AÇIK; bu makinede Chrome'un
hızlandırması kapalı, yanlış kırmızı verir — bkz. hafıza "fps ölçüm tarayıcı"),
1440×900, yerel sunucu `yerel-sun.cjs` (8790, `_headers` uygulanıyor).
Araçlar: `olc-chrome.cjs` (LCP/CLS/INP/LoAF, CDP gerçek girdi, kırmızı kontrol),
`olc-ilkkare.cjs` (ilk kare biseksiyonu — YENİ), `olc-profil.cjs` (CDP CPU
profili soğuk/sıcak — YENİ), `olc-bosta.cjs` (boşta iz — YENİ), `olc-sayfa.cjs`
(p95/takılma), `olc-surucu.cjs`.

Sayfa sayısı: 59 (film sayfası ve 404 ayrı düzenekte). Plan 63 diyordu; dizin
taraması 59 `index.html` buldu, fark sayım değil kapsam (film/404/en-404).

## 1. Sonuç tablosu (sonra; 59 sayfa)

Tam tablo: `olc-chrome-tablo.md` (sayfa sayfa LCP / CLS / INP+hedef / LoAF
adet-toplam / en uzun kare + kaynağı / önce LoAF toplamı).

| Kapı | Eşik | Sonuç (59 sayfa) |
|---|---|---|
| LCP | < 2500 ms | en yüksek **300 ms** (/hizmet/web-sitesi-araclar; yerel ağ) |
| CLS | < 0,1 | en yüksek **0,0371** (/en/bulten/yapay-zeka-trafigi-tiklama-degil) |
| INP | < 200 ms | en yüksek **64 ms** (finans, önce 184) |
| LoAF | ölçülür | toplam **8.069 → 6.338 ms** (59 sayfa), en kötü sayfa /en/ 570 ms |
| Eşik dışı | 0 | **0** |

Kırmızı kontrol (`?boz`: yüklemeden 2 s sonra 120 ms zorla görev + 300 px
kayma): LoAF 932 ms, CLS 0,2106 → YAKALANDI. İlk sürümde kayma `load` anında
perde altında ekleniyordu ve API saymıyordu (yanlış "yakalanamadı"); düzeltildi.

## 2. En kötü beş sayfa: kökler, önce/sonra

Seçim LoAF toplamına göre (önce): ana 587, finans 367, web-sitesi-araclar 232,
otomasyon 200, projeler 156.

| Kök | Kanıt | Düzeltme | Önce → Sonra |
|---|---|---|---|
| **Altbilgi amblemi (`wordmark`) yüklemede iki kez kuruluyor, büyük tuvalden `getImageData`** — her sayfada | CDP profil: `b@kabuk.js` soğuk 547 ms / sıcak 31-67 ms (projeler, araçlar); LoAF `import.then` 584-606 ms soğuk | Kurulum kadraja yaklaşınca (IO 600 px pay), fonts.ready yalnız kuruluysa; `willReadFrequently` | profil soğuk 547 → **yok** (ilk 4 sırada değil); projeler LoAF 149 → 140, import.then karesi kalktı |
| **AracSahne ölçüm döngüsü: hedef başına yaz-oku (11 zorla yerleşim + araya değişken yazımı), kurulumda 3 çağrı** | profil `r@satır içi` sıcak 145 ms / soğuk 211 ms | yaz → oku → yaz tek yerleşim; tek kurulum çağrısı (ResizeObserver'ın ilk bildirimi) | 145 → **5 ms**; LoAF 2 kare/243 → 1 kare/117; 21 değişken eski/yeni fark **0,00 px** |
| **Finans ilk Tab tuşu 184 ms**: klavye odak gezintisi motor şeridinin `content-visibility:auto` perdelerini her adayda zorla açıp kapatıyor | CDP izi: keydown içinde 2.584 zorla stil+yerleşim, 10 yerleşim/44 ms ("Added to layout" I.mkc, circle.mkagp); perde c-v kapatılınca 52 → 11, motor gizlenince 9 | Şerit `inert` (dekoratif, odaklanabilir öğe yok, işaretçi olayı yok). c-v KALIYOR: kaldırılınca kaydırma p95 16,9 → 25,2 (KALDI) | Tab işleme 52 → **26 ms**; INP 184 → **64 ms** |
| **Ana sayfa tüpler (three.js `tubes.min.js`)**: modül değerlendirme ~120 ms + WebGL kurulum/ilk kare 157-179 ms | LoAF kaynağı `tubes.min.js:e`; `?kabuk=0` ile ikisi de kayboluyor | DÜZELTİLMEDİ, bilinçli: iki kare perde altında (t≈520-720 ms < perde 1,3 s), INP'ye değmiyor (48 ms); bundle "olduğu gibi" | ana LoAF 587 → 526 (yalnız amblem payı) |
| **İlk kare stil+yerleşim 100-200 ms** (her ağır sayfa, `betiksiz`) | biseksiyon (finans): `main` gizli 171 → 61, `.sdsec` gizli → 104, tek blok gizli → ±10 (dağınık, tek kök yok); `main{c-v:hidden}` → stil+düzen 5 ms | Kök tek değil; CSS kural sayısı × öğe sayısı. `content-visibility:auto` ilk karede İŞE YARAMIYOR (aşağıda). Aday: hizmet CSS parçası (138 KB) bölme — Enes'in kararı | — |

## 3. content-visibility bulguları (kalıcı ders)

- Chrome **ilk karede** `content-visibility:auto` alt ağaçlarını atlamıyor:
  finans `.sdsec` auto 157 ms ↔ `visible!important` 164 ms (fark gürültü);
  `hidden!important` 116 ms (tavan). `.sdsec`/`.blok` denemesi GERİ ALINDI.
- Ana sayfada (`.ana>section`, eski turdan) c-v var ve orada ölçülebilir kazanç
  VAR: c-v'siz ilk kare 209 ms (stil+düzen 198), LCP 288 → 368. Kalıyor.
- Bedel: klavye odak gezintisi kilitli alt ağaçları zorla yerleştiriyor —
  ana ilk Tab 45-57 ms (c-v'siz 10), finans 52 (motor perdeleri). Gate
  (INP<200) geçiyor; ana için "ilk boyamadan sonra c-v'yi aç" tasarımı
  J1/K1 bütçesi dolu olduğu için (12.758/12.800, 12.277/12.288) yapılmadı —
  Enes'in kararı.
- Kaydırma kazancı gerçek: motor `.mkact` c-v kaldırılınca finans p95
  16,9 → 25,2 ms, takılma %2 (KALDI). Tur 2 sonrası yeniden ölçüldü.

## 4. Diğer denetim kalemleri

- **Kalıcı `will-change` sızıntısı**: grep (dist CSS+HTML) → `.kb-bit`/`.kb-tip`
  kaldırıldı; eski site gömüsünden (`#boot.out`, `.hand`, `.hfloat`, `.mktrack`,
  `.qttrack`) `EskiGiris` derlemede ayıklıyor. Kalan 2: `html.fl-hazirla
  .fl-yapis` (geçici, sınıf kalkınca gidiyor) ve `.fl-halka::before` (film,
  ölçülmüş istisna — film.css'te gerekçesi). Kalıcı sızıntı **0**.
- **Boyutsuz görsel**: 0. **Eski format (png/jpg src)**: 0. **Dış kaynak**: 0
  (yalnız 3 bağlantı: wa.me ×2, linkedin).
- **Boşta maliyet** (`olc-bosta.cjs`, 2 s iz, scroll 0): her sayfada ~120
  stil hesabı/sn (15-30 ms/sn) + PrePaint 13-16 ms/sn + rAF 120/sn (yıldız
  tuvali). Kare başına ~0,3-0,5 ms; finans motor payı ~8 ms/sn. Kasma değil.
- **Soğuk tarayıcı** (`olc-profil.cjs` soğuk ↔ sıcak): amblem kalkınca soğuk
  ilk sayfa JS'i 547 → 11 ms (projeler). Araçlar sayfasında soğukta `s`
  (ViewTimeline kurulumu) 177 ms görünüyor, sıcakta 3 ms: ilk stil hesabı
  betiğe yazılıyor (parse bitmeden çalışan modül), ek maliyet değil.
- **EN bülten CLS 0,03-0,037** (iki yazı): eşik altı; kaynak bakılmadı
  (Ne kaldı).

## 5. Elenen hipotezler (bu tur)

1. `.sdsec`/`.blok` `content-visibility:auto` ilk boyamayı hızlandırır → hayır (yukarıda).
2. Finans Tab maliyeti motorun animasyonlarından/paketlerinden/yaylarından → hayır
   (tek tek gizlenince 44-58, hepsi aynı); kök c-v perdeleri.
3. Motor `.mkact` c-v artık gereksiz (Tur 2 sonrası) → hayır, p95 25,2'ye döndü.
4. Şerit `inert` Tab maliyetini sıfırlar → yarısını alır (52 → 26); kalan 26 ms
   c-v perdelerinin odak gezintisi dışı kısmı (kaynağı iz dışı).

## 6. Dosyalar

`olc-chrome-A2.json`, `olc-chrome-B2.json` (sonra), `olc-chrome-A.json`/`B.json`
(önce), `olc-chrome-tablo.md`, `kontak-gece/tur4-wmk.png` (altbilgi amblemi
tembel kurulum sonrası, 1161×171, 74.358 dolu piksel).
