# GÖÇ ENVANTERİ — 59 keyframe · 3 pin · canvas/rAF sistemleri

**18 Ağu 2026 · Göç Anayasası v2, adım 0 · temel 78ebe7e · kaynaktan
ölçülerek eşlendi (bölüm başlığı + kullanan seçici), tahmin yok.**

Sözleşme: bu tablodaki her satır ya bir sahne adasına bağlanır ya
"taşınmıyor + gerekçe" taşır. Karşılığı olmayan hareket yok sayılamaz.
Süs/kimlik sütunu madde 1.6 gereği.

## Keyframe'ler → sahne

| Ada | Keyframe'ler | Sınıf | Karar |
|---|---|---|---|
| **Perde (EN SON)** | bwipe bscanf bsig bfade bletter bletterout | süs | His ve görüntü taşınır; 2,7 sn bekletme + getTotalLength TAŞINMAZ (madde 2) |
| **Global (nav/CTA)** | gaspin (.shiny parıltı) | kimlik | Aynen, saf CSS |
| **S-H hero** | handIn handFloatA handFloatB rise fadeup voidring cueflow | kimlik (dokunulmaz) | Birebir taşınır (madde 1.3); rise/fadeup opaklığa dokunmadan (H2/LCP dersi) |
| **S-T ticker** | tkdrift | süs (transform-only, ucuz) | Saf CSS marquee, JS 0 |
| **S-A akis** | akType akCaret akRise akChip akFeed akSpon akBlink akJob akJobT akPk akPulse akStep akUp akDown akIn akScroll akCta akSend akDone akCur akCount akPrIn akFill akKnob akRow akTick akTickIn (27) | kimlik (kartın anlattığı içerik) | AYNEN taşınır; mekanizma: play-state kart kökünde, `.akd *` evrensel seçici ve animation-name değiştirme TAŞINMAZ |
| **S-SE sektor** | brainPulse (flow beyni) | kimlik | Aynen; sahne sticky+scroll-driven, mobilde pin YOK |
| **S-TE tespit** | ltdrop (başlık harfleri) + sp (spinner) | kimlik | CSS girişi + araç adası |
| **S-KU kurucu** | kping | kimlik | Aynen |
| **Global #bit** | bitr | kimlik (masaüstü) | Masaüstü adası, idle+lazy; mobilde inmez (eskide de kapalı) |
| **Nav (mobil menü)** | mmrow | kimlik | Menü adasıyla |
| **Rota: hizmet detay** | clhit aidot stcta qtCar | kimlik | Rota turunda, kendi adasında |
| **Rota: ajan/surec** | kdIn tpFlash | kimlik | Rota turunda |
| **Rota: finans (TradeSelf)** | amCCW amCW | kimlik (ölçülmüş 20sn/12sn oranı) | Rota turunda, offsetParent dersiyle |
| **Rota: ai-ajan (pazar/motor)** | kivGit | süs (tel nabzı) | Rota turunda |
| **Globe (sektör)** | gpulse | süs | Globe kendi adasında, yalnız görünürken |
| **TAŞINMIYOR** | pgin (SPA rota geçişi) | süs | Astro'da gezinme belge geçişi; his prefetch + 1 sn altı sayfayla karşılanıyor. Enes veto edebilir |

## GSAP pinleri (3)

| Pin | Yer | Karar |
|---|---|---|
| szStage (sektör) | S-SE | Önce sticky + scroll-driven; his tutmazsa GSAP+ST yalnız bu adaya dinamik import. Mobilde pin YOK |
| __sdST · __sdST2 | hizmet detayları | Rota turunda, sektör kuralıyla |

## Canvas/rAF sistemleri (9 canvas · 40 rAF · 23 IO)

| Sistem | Karar |
|---|---|
| stars (yıldız) + grain (tanecik) | **TAŞINMIYOR** — zemin #bg radyal degrade (madde 2.1, 0 KB JS); mobilde zaten kapalıydı. Süs. Enes veto edebilir |
| tubes.min.js (756 KB) | **TAŞINMIYOR** (madde 2, taşınmayanlar) — tek sahnelik tüp için sayfadan büyük kütüphane |
| wmk (wordmark piksel canvas) | **TAŞINMIYOR** — dev QANATONE yazısı SVG/CSS metin olur; kimlik görüntüdür, piksel örnekleme süstü |
| gcv + gSpark/gDonut/gArea (globe+grafikler) | Sektör/globe adası, yalnız kendi sahnesinde, görünürken |
| szCv (sızıntı) | Otomasyon rotası adası |
| mkMap (pazar haritası) | ai-ajan rotası adası |
| Lenis | **TAŞINMIYOR** — yerli kaydırma + CSS scroll-driven; eski rAF zincirinin parçasıydı |

## Transition'lar

Kaynakta 242 `transition:` bildirimi ölçüldü (anayasadaki 274 sayısı klon
genelinde admin.html'i de kapsıyor). Tamamı hover/focus/durum geri
bildirimi sınıfında (bileşen kimliği): her sahnenin scoped CSS'ine
kendi kalemiyle taşınır; `transition:all` yeni tarafta YASAK (madde 7C),
hover'lar `(hover:hover)` kapılı (madde 4).

## Fontlar (madde 1.4)

Nunito Sans gövde+ara başlık (YENİ, indirilecek) · Playfair yalnız hero ·
JetBrains Mono künye. **Manrope ve Inter EMEKLİ.** Aile adı tek token
dosyasında (`yeni/src/stil/aile.css` değişkenleri).
