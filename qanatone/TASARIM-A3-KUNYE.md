# TASARIM TURU A3 — KÜNYE KIYAS RAPORU (sürücü + kompozisyon sütunlu)

**20 Ağu 2026 · kaynak: kök index.html (tek gerçek) · kıyas: yeni/ dist.**

## 0 · SADAKAT KURALI (21 Ağu 2026, Enes — pazarlıksız)

1. **Yan yana kanıt:** her sahne kıyası ESKİ ve YENİ ekran görüntüsünü
   YAN YANA koyar ve yazılı FARK LİSTESİ taşır. Karesiz, listesiz kıyas
   kıyas değildir. (Düzenek: gerçek Chrome + puppeteer-core, tek statik
   sunucu `/` eski · `/yeni/` yeni; scratchpad `kanit.cjs`.)
2. **Ekleme yasağı:** kaynakta olmayan hiçbir görsel öğe eklenmez —
   kutu, çerçeve, ikon, tik işareti, kablo düğümü, parlama, gölge.
   Kaynakta çıplak satır varsa yeni tarafta da çıplak satır olur.
3. **Kompozisyon sütunu:** künye tabloları kompozisyon taşır —
   **kap tipi** (kutu/çıplak) · **ayraç tipi** (çizgi/çerçeve/boşluk) ·
   **ikon var mı** · **vurgu nerede**.
4. **Göz kararı bağlayıcı yasağı:** iki öğeyi görsel olarak birleştiren
   hiçbir şey göz kararı çizilmez — geometri ya kaynaktan birebir okunur
   ya öğe konumlarından ÖLÇÜLÜR (rAF dışında; klasör telleri deseni).

**Kök teşhis (Enes, doğrulandı):** eski sitede kaydırmayla SÜRÜLEN
(scrub) zaman çizelgeleri yeni tarafta ya hiç gelmedi ya IO-tetikli
otomatiğe dönüştü — "video gibi başlayıp bitiyor". Kaynak taraması
teşhisi birebir doğruladı: kökte **8 scrub sistemi** var, dördü hiç
taşınmadı. KALICI KURAL (hafızaya ve bu belgeye): **IO adanın doğuş
tetiğidir, animasyonun sürücüsü değil.** Kaynakta scrub olan yenide
scrub kalır: önce `animation-timeline: view()/scroll()`, tutmazsa
kendi adasında GSAP ScrollTrigger scrub (dinamik import).

Kaynağın kendi sözü de bu yönde (8992, "2026-08 animasyon hız
sözleşmesi"): *"Enes'in istediği davranış: kaydırdıkça sahne sabit
kalır, animasyon anlaşılır hızda akar, bitince sayfa devam eder —
bu tam olarak pin+scrub."*

---

## 1 · Kaynak SCRUB envanteri (kaydırma-güdümlü — künyeleriyle)

| # | Sahne | Öğe/İş | Sürücü (kaynak) | Aralık | Katsayı | Kompozisyon (kap · ayraç · ikon · vurgu) | Kaynak satır |
|---|---|---|---|---|---|---|---|
| K1 | Hero eller | hand-h `yPercent:-15` · hand-r `+17`, ease:none | ST **scrub** | hero `top top → bottom top` | .9 | çıplak sahne · boşluk · ikon YOK (düğmeler salt metin) · parlama h1/b text-shadow + halka drop-shadow (490-527) | 12338-12343 |
| K2 | Hero içerik paralaksı | `.heroin` y:110 · opacity→.2, ease:none | ST **scrub** | hero `top top → bottom top` | .6 | K1 ile aynı sahne; rozet MOBİLDE YOK (2581) | 12527-12528 |
| K3 | Proje destesi | kart `scale 1−.06t` · `opacity 1−.28t`, t=(H−top)/(H·.82) | elle **scroll scrub** (rAF) — mobilde hiç bağlanmaz | kart bazlı | — | kutu kart .dkin · çizgi ayraçlar (dknum::after, dkgo alt çizgi) · ok ikonu (AR 7146) · gölge yalnız masaüstü (1193/1303); başlık künyesi 26px kızıl ÇİZGİ + mono (366-367), sayı DEĞİL | 12488-12522 |
| K4 | /otomasyon AKIŞ `#flow` | `__flowReveal(p)` — kanal/adım/çıkışlar ilerlemeyle | ST **scrub** | `top 86% → bottom 90%` (Enes'in kendi ayarı: blok tam görünürken biter) | .5 | kutu düğümler + ikon kutusu .ni + ✓ tik (871) · beyin kutu + "Aktif" rozeti · teller ÖLÇÜLÜ (wire 10553: düğüm kenar-orta ↔ kart .42h/.58h; mobil sp=min(34,w·.08) + fjoin daireleri 10570-10581) · vurgu lit kızıl + hot nabız | 12455-12463 |
| K5 | /otomasyon SIZINTI `#szStage` | `__szDraw(p)` — sızıntılar→tıpalar→çıkış; tanecikler ayrı rAF | **PIN + scrub** (kilitli sahne) | `center/top → +=2.2·vh` | .5 | SAHNE KUTUSU .szstage (2804) · çip hapları + kutu kartlar + mühür rozeti (kızıl daire+tik 2864) · görsel = canvas HUNİ: daralan duvarlar + tanecikler + kesikli bağ çizgileri (ÖLÇÜLÜ, 10702-10730) · aşama = mono başlık + çubuk 92/58/30% (2873-2885, OK YOK) · glow'lu kavşak noktaları | 12467-12478 |
| K6 | Müşteri yolu çizgisi `#chan` | `__chanDraw(p)` — eğri çizilme + duraklar (delta eşiği .004) | ST **scrub** | `top 90% → bottom 55%` | .5 | çıplak · eğri + durak daireleri (sabitler 10877, yenide birebir devralındı) · ikon yok · gradyan vurgu | 12479-12485 |
| K7 | Hizmet detay sahneleri `__sdST` | her hizmetin story sahnesi `draw(p)` (GEO, TradeSelf, clhit/aidot/stcta/qtCar…) | **PIN + scrub**; pinsiz dal YALNIZ reduce | `→ +=pin·vh` | .5 | kompozisyon künyesi D4'te sahne sahne çıkarılacak (kural 3) | 8985-9010 |
| K8 | ai-ajan MOTOR `mkStage` `__sdST2` | `mdraw(p)` — yedi perde; amblem+kablolar bu sahnenin içi | **PIN + scrub** | `→ +=4.4·vh` | .5 | panel kabı .mkact · kablolar ÖLÇÜLÜ (offsetParent zinciri 8548, gBCR bilinçli RED) · kablo düğümleri r2.2/3 + gezici nokta · amblem 3 WEBP, gölgesiz | 8700-8714 |

## 2 · Kaynak OTOMATİK envanteri (tetik/zaman — sapma DEĞİL sınıfı)

IO/tetik kaynakta da sürücü değil doğuş anahtarıydı şu ailelerde:
ak* demo döngüleri (aklive + infinite) · `.rv.in` tek seferlik
girişler (IO tetik + transition) · `ltdrop` başlık harfleri (rv.in) ·
hero giriş `rise/fadeup` (yükleme anı) · `handFloat` salınımları ·
`mmrow` (menü açılışı) · `gaspin`/`tkdrift`/`akBlink` vb. infinite
süsler · amblem `amCCW/amCW` (infinite; kapısı pin sahnesinin `on`u).
**Bunların yenideki IO kapılı otomatik hâli kaynağa SADIKTIR.**

## 3 · Kıyas tablosu

| Sahne | Sürücü kaynak | Sürücü yeni | Hüküm |
|---|---|---|---|
| Deste (S-P) | scroll scrub (elle) | `view-timeline --sp-deste` scrub | ✅ SADIK (0,003 ölçek farkı, ölçülü) |
| S2 kayıp çizgisi | (Faz 2 anlatısı — kaynak eşi yok) | `view()` entry 15%→exit 85% scrub | ✅ scrub ilkesine uygun |
| S3 mekanizma rayı | (Faz 2 anlatısı) | `view()` entry 25%→entry 85% scrub | ✅ |
| /surec çizgisi (rota) | K6 scrub | anonim `view()` + `--yt` scrub, cover 5%→55% (2a2bfe1) | ✅ SADIK — **ilk yazımda "açık" sanılmıştı; kod doğrulaması düzeltti** |
| Ana sayfa S5 süreç | — (kökte #chan YALNIZ /surec'teydi — kaynağın kendi yorumu 10862; ilk yazımdaki "kök anada vardı" iddiası YANLIŞTI) | kartlı anlatı (Faz 2) | ✅ sapma yok — "anaya çizgi" karar kalemi DÜŞTÜ |
| S-K katman girişi | rv.in tetik | `view()` scrub | ✅ (tetikten scrub'a — yön doğru) |
| S-SZ sözler girişi | rv.in tetik | `view()` scrub | ✅ |
| ak* demolar (5 ana + 4 detay) | IO + infinite | IO + infinite (`--akps`) | ✅ SADIK — kaynak da otomatik |
| TradeSelf amblemi dönüşü | infinite (pin `on` kapısı) | infinite (IO `akoynar` kapısı) | ✅ dönüş sadık; **sahnesi eksik (K8)** |
| Hero eller paralaksı (K1) | **scrub .9** | YOK (iskelet kararı, hero.css 22'de yazılı) | ⚠️ AÇIK — tasarım turunda geri gelmeli (aşağıda D5) |
| Hero içerik paralaksı (K2) | **scrub .6** | YOK (aynı karar) | ⚠️ AÇIK (D5) |
| /otomasyon akış (K4) | **scrub .5** | animasyon YOK — statik | ❌ AÇIK (D1) — Enes'in özel şikâyeti |
| /otomasyon sızıntı (K5) | **PIN+scrub** kilitli sahne | statik son-hâl çubukları | ❌ AÇIK (D2) |
| ~~/surec çizgisi (rota)~~ | — | — | satır yukarı taşındı: SADIK çıktı (D3 düştü) |
| Hizmet detay story sahneleri (K7) | **PIN+scrub** | tamamen YOK (statik metin) | ❌ EN BÜYÜK AÇIK (D4) |
| ai-ajan motor sahnesi (K8) | **PIN+scrub** yedi perde | yalnız amblem (A2, sahnesiz) | ❌ AÇIK (D4 ailesi) |

**Değer düzeyinde bulgu:** A1/A2 ve demolarda süre/eğri/gecikme künyeden
birebir gitti (ayrı sapma bulunmadı); hover geçişleri kaynak değerleriyle
ve `(hover:hover)` kapılı. **Asıl sapma sınıfı SÜRÜCÜ düzeyinde** —
tablo bunu doğruluyor: his farkının kaynağı eksik scrub'lar.

## 4 · Düzeltme planı (merdiven: önce CSS, tutmazsa GSAP ST scrub adası)

| # | İş | Önerilen mekanizma | Not |
|---|---|---|---|
| D1 | /otomasyon akış scrub | S5 deseni: `@property` ilerleme değişkeni + anonim `view()`, adım/kanal durumları calc/step'le | kaynak aralığı korunur: top 86%→bottom 90% |
| D2 | /otomasyon sızıntı kilitli sahnesi | sticky kap + uzun bölme + `scroll()` ilerleme (destenin pin-eşdeğeri deseni); tutmazsa GSAP ST pin+scrub adası | tanecik rAF'ı taşınmaz (rota kararı); çubuk/tıpa/çıkış scrub |
| ~~D3~~ | /surec çizgisi | **ZATEN KAPALI** (2a2bfe1, `--yt` view() scrub) — ilk yazım kodu doğrulamadan rota raporunun eski notuna dayanmıştı; ders: künye kıyası KODA bakar, rapora değil | — |
| D4 | Hizmet detay story + motor sahneleri | sahne başına karar; ölçümlü kablolar/pinli yedi perde → **GSAP ST scrub kendi adasında** güçlü aday | kapsamı büyük — Enes'le sıra kararı |
| D5 | Hero paralaks (eller + içerik) | `animation-timeline: scroll(root)` hero aralığında (K1/K2 değerleri birebir) | iskeletin "taşınmadı" kararı tasarım turunda düşer |

Sıra önerisi: **D1 → D2 → D5 → D4** (D3 zaten kapalı çıktı; ucuzdan
pahalıya; D4 sahne sahne kendi commit'leriyle). Her biri kendi kapısı +
ekran karesi + savurma hükmüyle. ("Anaya çizgi dönsün mü" kalemi
düştü: kökte #chan yalnız /surec'teydi — 10862.)

---

## 5 · KOMPOZİSYON DENETİMİ (21 Ağu — kural 0'ın ilk uygulaması)

Yöntem: dört paralel tarama (nav+hero · perde+deste · amblem+demolar ·
Faz 2 sahneleri) + akış/sızıntı elden; her hüküm kaynak satırıyla
doğrulandı. Yan yana kareler: gerçek Chrome, 6 sahne (akış, sızıntı,
demo şeridi, deste künye, hero mobil, akış mobil).

### Temizlenen FAZLALIKLAR (kaynakta yoktu → söküldü)

| # | Sahne | Fazlalık | Yapılan |
|---|---|---|---|
| F1 | Sızıntı | DOM şeması: boru + damlalar + giriş noktası daireleri + damla uçları + çıkış ok başı — tamamı göz kararı, kaynakta böyle bir şema hiç yok (kaynak görseli canvas HUNİsiydi) | şema TÜMÜYLE söküldü; huni görseli açık kalem **D2b** (kaynak kompozisyonuyla, ölçülerek kurulacak) |
| F2 | Sızıntı | aşamalar arası ok SVG'leri — kaynak .szstages'te ok yok | oklar söküldü; kaynağın aşama+çubuk kompozisyonu künyeden geldi (92/58/30%, done kızıllaşması dahil) |
| F3 | Akış | tel yelpazesi göz kararı sabitlerle çizili ("ölçüm YOK" notluydu) — kaynak telleri ÖLÇÜYORDU | teller ölçülü adaya döndü: kaynak wire() künyesi birebir (masaüstü kenar-orta ↔ .42h/.58h; mobil sp formülü + fjoin daireleri); SSR'de d boş — JS'siz ziyaretçi kaynaktaki gibi telsiz |
| F4 | Hero (mobil) | rozet kutusu mobilde görünüyordu — kaynak 2581 mobilde kaldırıyordu | `.sh-rozet{display:none}` ≤900px |
| F5 | Hero | `em` ağırlığı 500 — kaynak italic 400 | 400'e döndü |
| F6 | Deste | başlık künyesinde anlatı sayacı "04" — kaynak künyesi 26px kızıl ÇİZGİ + mono (366-367) | sayaç düştü (data-anlati kalktı, sonraki numaralar DOM'dan kendiliğinden kayar), çizgi künyeden geldi |
| F7 | Ana demo şeridi | kartın TAMAMI kutu (border+zemin) — kaynakta kart ÇIPLAKTI, kutu yalnız görsel alan .akv'deydi; oran da 16/10'a kaymış içerik taşırıyordu | kutu görsel alana indi: .akv künyesi birebir (1/1.02, radius 20, üç katman degrade, ton parlaması masaüstünde, hover kart kalkması); .akd dolgusu kaynağa döndü (8cqw 7cqw — 16/10 gerekçesi düşünce sapma da düştü); kaynakta olmayan hover border-color söküldü |
| F8 | Nav | burger odak halkası `--red`/2px — kaynak küresel halka `--red-soft`/3px (2632) | kaynak değerlere döndü |

Belge düzeltmeleri (kod değil yorum yanlıştı): perde.css + Perde.astro
"anakart izleri gelmedi" diyordu — izler a8b1d6a'da kaynaktan birebir
gelmişti (dokuz yol karakter karakter aynı, 4418-4428); iki yorum da
düzeltildi. perde.css madde 6 "gradient sadeleşti" iddiası da yanlıştı
(gradient birebir, yalnız glow kaldırılmış) — düzeltildi.

### TEMİZ çıkan sahneler (fazlalık bulunamadı)

Perde (öz alt küme; izler kaynak kopyası) · Nav (F8 dışında birebir,
ikon kümesi dahil) · TradeSelf amblemi (tamamen çıkarıcı) · hizmet
detay demoları (gölge/glow değerleri satır satır kaynak) · Faz 2
sahneleri S2/S3/S5/S6 (kaynak eşi yok; göz kararı bağlayıcı YOK — S2
rayı kutudan türer, /surec eğrisi kaynak sabitlerinden devralınmış).

### Fark listeleri — yan yana karelerden (EKSİK sınıfı, açık kalemler)

- **Akış:** yenide düğüm ikon kutuları (.ni), ✓ tiki (871) ve "Aktif"
  rozeti YOK — kaynakta VAR; "Canlı iş akışı" şeridi + "N talep
  işlendi" bilinçli taşınmadı (sahte canlılık ilkesi, duruyor).
- **Sızıntı:** sahne kutusu .szstage (2804) yenide yok (blok çıplak);
  mühür çözüm rozeti (kızıl daire+tik hapı 2858-2866) yenide düz metin;
  huni görseli D2b. Aşama çubukları geldi (bu turda).
- **Hero mobil:** kaynak sıra sözleşmesi (h1→lede→meta→cta, 2582-2587)
  ve düğme standardı (tam genişlik min 340px, 2593-2595) taşınmamış —
  yenide düğmeler metada önce ve içerik genişliğinde; lowfx yolları yok.
- **Nav:** projeler paneli kaynakta 2 sütun/530px (ndp-g 299), yenide
  tek sütun 280px; prefers-reduced-transparency/contrast kuralları yok.
- **Demo şeridi:** kart hover kalkması + ton parlaması bu turda geldi;
  .aksh/.akd-trust kaynak demoları hâlâ yok (belgeli).
- **Deste künye:** çizgi+metin biçimi kaynağa döndü; metin rengi yenide
  red-soft, kaynakta tx3 sınıfındaydı (küçük değer sapması, açık).

Kural 0.1 gereği bundan sonra HER sahne işi bu düzenekle kare + liste
üretir; kompozisyon sütunu olmayan künye eksik künyedir (K7 D4'te).
