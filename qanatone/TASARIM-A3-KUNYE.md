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

---

## 6 · KAYNAĞA DÖNÜŞ TURU (21 Ağu — Enes'in sırası)

Sıra Enes'ten: **hero mobil → akış düğümleri → sızıntı+huni**. Üçü de
kendi commit'i, künyeden, yan yana kareyle.

### 6.1 Hero mobil (`dc15419`) — KAPANDI

| Kalem | Kaynak | Yapılan |
|---|---|---|
| Sıra sözleşmesi | 2582-2587: başlık → paragraf → durum satırı → butonlar | DOM'da cta metadan önce; kaynaktaki `order` deseni birebir (meta mt22 · cta mt20) |
| Düğme standardı | 2593-2595: `width min(340px,100%)` · `min-height 54px` · yazı ortada | birebir; 640px kuralı (2602-2606) da geldi |

**Fark listesi (kareden):** eski/yeni artık aynı sırayı ve aynı düğme
boyunu gösteriyor. Kalan tek görünür fark: yenide nav'da "Konuşalım"
düğmesi var, kaynakta ≤640'ta gizleniyordu (`2610 .nright .btn`) —
nav kalemi, hero değil; **açık**.

### 6.2 Akış düğümleri (`833977d`) — KAPANDI

Düğüm yapısı kaynak `build()` birebiri (10538-10545): ikon kutusu
`.ni` (32px) + metin `.nt` + durum noktası `.nd`. İkon anahtarları
kaynak IN/OUT haritalarından (target/seo/camera/site ·
calendar/clipboard/handoff/chart), yolları `IC`'den birebir (5575+).

**KÜNYE DÜZELTMESİ:** D1'in "düğüm `.fln` kapalı .55 → açık 1" satırı
YANLIŞ bileşendendi — `.fln` (701) başka sahnenin öğesi; akışın gerçek
düğümü `.fnode` (1336), kapalı hâli `opacity 0 + translateY(10px) +
scale(.96)`. Scrub ona çekildi. **Kaynakta düğümde tik YOK** — 21 Ağu
fark listesindeki "✓ tiki eksik" maddesi de bu yüzden düştü; tik
kaynakta ajan ADIM satırlarındaydı (`.fstep i`), oraya geldi.

Beyin `.fbrain` birebiri: kızıl degrade + `.bi` bot ikonu (42px,
`brainPulse` + glow yalnız masaüstü — H14) + adım satırları `.fstep`
(tik dairesi kaynağın kendi `IC.check` SVG'siyle; F1c gereği font
karakteri değil). "Aktif" rozeti kaynaktaki gibi **yalnız mobil**
(1384 gizli / 1410 açık); noktası kaynakta **tanımsız** bir keyframe'e
(`ping2` — kaynakta hiç tanımlı değil, ölçüldü) bağlıydı, gerçek
davranış sabit nokta olduğu için sabit basıldı.

**Canlılık rAF'sız:** kaynağın tick'i düğümleri 1,5 adım/sn (10622,
çıkış +2 faz), adımları 2,2 adım/sn (10626, döngü n+2) sırayla
yakıyordu; eşleniği `@property` dalgası + `color-mix` — desteksiz
tarayıcı ve reduced-motion taban hâli görür.

**İki hata gerçek Chrome ölçümüyle yakalandı** (kare yetmezdi):
`Ikon.astro`'nun SVG'sine scoped seçici ulaşmıyor (`:global()` şart) ve
mobil rozet kuralı sıra yüzünden taban `display:none`'a yeniliyordu.

### 6.3 Sızıntı + huni (`00cfdf8`, D2b) — KAPANDI

F1'de sökülen göz kararı şemasının yerine kaynağın gerçek sahnesi
kuruldu. Kompozisyon: kutu sahne `.szstage` → başlık şeridi `.szhd`
(künye noktası + h2 + "Aynı bütçe" sağ bloğu) → çip şeridi → `.szwrap`
→ `.szfoot` (çubuklar + aşağı ok + kapanış). Kartlar **yanlara** döndü
(sol 0/2 · sağ 1/3 — kaynak markup sırası), aşamalar huninin **üstünde
dikey overlay**, "kalan müşteri" altta, beat rozeti merkezde.

**Huni adası — ölçülü, göz kararı yok:** katlar `LY/LW` (10681) ·
duvar dolgusu `k%2 ? .016 : .028` + kenar `.13` (10704-10711) · bağ
çizgileri kavşaktan `W·.30`/`W·.70`'e, kesikli `[3,4]`, mühürlenince
kızıl (10716-10730) · çıkan küme phyllotaxis `a=i·2.39996`,
`r=√(i/n)·min(W,H)·.11`, `i%3` kızıl (10776-10782). Ölçüm rAF dışında;
SSR'de SVG boş (kaynakta da canvas'ı JS çiziyordu), içerik SSR'de tam.

**Fark listesi (karelerden):**
- Eski taraf canvas'ı headless'ta **boş** — rAF ölü (bilinen ölçüm
  tuzağı, hafızada kayıtlı). Kıyas bu sahnede DOM katmanında geçerli;
  huni görselinin gerçek karşılaştırması Enes'in ekranında.
- Tanecikler (rAF) bilinçli yok — rota kararı, değişmedi.
- **D2c açık:** kaynağın pin kilidi ve ona bağlı `max-height:
  calc(100vh - 44px)` alınmadı — pin'siz alınırsa içeriği keser.
  Kilit ancak bölüm kompaktlaşmasıyla gelir (tasarım kararı, Enes).

**Kapı:** denetim 45/0 · LH mobil 3 koşum ortanca **100** · LCP
**1,355 s** · TBT 0 · CLS 0 · sayfa JS 8,8 KB.

---

## 7 · D4 — HİZMET DETAY SAHNELERİ (21 Ağu, sahne sahne)

Künye taraması D4'ün gerçek kapsamını ölçtü: **8 sahne**, kaynakta
~1050 satır JS + ~620 CSS, göçte **%0** taşınmıştı. İçerikleri
`content.json`'da duruyordu ama sayfada hiç basılmıyordu — yani D4
aynı zamanda bir içerik kazanımı (bot da ziyaretçi de görmüyordu).

**Kapsam düzeltmesi (künyeye işlendi):** "K8 = ai-ajan motor sahnesi"
adlandırması YANLIŞTI — `#mkStage` TradeSelf pazar motorudur (finans);
ai-ajan `fam:'flow'` ile `#flStage`'i kullanır. Ayrıca `clhit/aidot/
stcta/qtCar` anahtarları tek bir sahnenin parçaları değil, dört ayrı
sahnenin.

| Sahne | Hizmet(ler) | Sürücü | Durum |
|---|---|---|---|
| `#fnStage` huni | google-ads · meta-ads | pinsiz scrub | ✅ `e9a34e5` |
| `#flStage` akış | ai-ajan · otomasyon | pinsiz scrub | ✅ (kare + ölçüm) |
| `#clStage` tırmanış | seo | **PIN .95** | ✅ (sticky kilit) |
| `#aiStage` sohbet | geo | pinsiz scrub | ✅ (kelime yazımı) |
| `#stStage.sttools` araçlar | web-sitesi-araclar | **PIN 1.05** | ✅ (17 kare parmak izi · bölüm 8) |
| `#stStage.stlive` canlı | web-tasarim | draw YOK | ⏳ açık — iframe yerleştirme + `fit()` |
| `#qtStage` platform akışı | finans | **PIN 2.7** | ✅ (19 kare parmak izi · bölüm 9) |
| `#mkStage` motor | finans | **PIN 4.4** | ⏳ açık — 8 perde + kablolar + **dünya haritası canvas** (243 ülke) |

### Ortak sürücü yazımı (dört sahnede kanıtlandı)

Kaynağın ST pinsiz dalı `start:'bottom 98%' · end:'bottom 42%'`.
CSS eşleniği **yaklaştırma değil birebir**: `view()` +
`animation-range: entry calc(100% + 2vh) → entry calc(100% + 58vh)`.
Gerekçe: `entry 100%` tam olarak elemanın alt kenarının viewport
altına değdiği andır (= ST'nin `bottom 100%`i); 98% ve 42% eşikleri
oradan 2vh ve 58vh sonrasıdır, ikisi de viewport yüzdesi. Gerçek
Chrome'da doğrulandı: bitişte alt kenar %41,9 (hedef 42).

Kilitli sahnede (tırmanış) desen destenin dersi: **çizelgenin öznesi
sticky OLMAYAN kap**, animasyonu sticky sahne alır.

### Bu turda yakalanan üç hata (kare tek başına yetmedi)

1. **Astro scoped CSS bileşen SVG'sine ulaşmıyor** — `Ikon.astro`
   çıktısı için `:global(svg)` şart. `getComputedStyle` ölçümü
   yakaladı; kare "ikon var" diyordu, ölçüm "kural uygulanmıyor".
2. **Kaynağın kendi kusuru:** akış işaretçisi `y0`'ı border
   kutusundan ölçüp `top`a yazıyordu; `top` padding kutusundan
   ölçülür → nokta düğüm merkezinden **+1 px** kayıktı (eski sitede
   ölçüldü: yatay +1,00 · dikey +0,99). Kusur taşınmadı, sapma yazılı.
3. **F1c ajan işaretini düşürdü** — kaynak `✦` (U+2726) alt kümede
   yok; aynı yıldız SVG'ye çevrildi (S-SE okunun dersinin tekrarı).

Ayrıca kare kıyası bir içerik hatası yakaladı: marka vurgusu kullanıcı
mesajında da kızıl çıkıyordu; kaynak `typed()`i yalnız ajan dalında
çağırıyor.

---

## 8 · ARAÇLAR SAHNESİ — `#stStage.sttools` (21 Ağu, D4'ün beşinci sahnesi)

Kaynak: markup `storyStage` 8371-8443 · CSS 882-886 + 921-936 +
1006-1127 **+ 4375-4380** · sürücü `draw` 8817-8960 · ST 9002-9008.
Dört perde (senin siten · anında teklif · rezervasyon · müşteri paneli),
mini tarayıcı, kaydırma çubuğu ve **simüle fare**.

### Sürücü — Enes'in uyarısı yerine oturdu

"Simüle fare kaydırmayla sürülmezse yine video hissi verir" (21 Ağu).
Kaynakta imleç zaten `draw(p)` içinde yaşıyordu (8866-8905) ve tıklama
halkası anahtar-kare değil ilerlemeye bağlıydı. Yeni tarafta da tek
sürücü var: `--stp`. Kaydırma geri alınınca imleç geri sarar, halka geri
söner. Hiçbir yerde `IO → play` yok ([[qanatone-io-tetik-surucu]]).

**Kilit ölçüldü:** kap `sarmal + 105vh`, sarmal sticky
`top: (100vh − sarmal)/2`. Gerçek kaydırmada: sahne d=4 px'te 228'e
yapışıyor, ilerleme 0→1 tam **945 px** = 1,05 × 900 vh, ve animasyon
bittiği anda (d=945) yapışkanlık bırakıyor. İlk yazımda kap
`sarmal/2 + 155vh` idi ve sahne bitişten sonra **228 px daha** yapışık
kalıyordu — ölçüm yakaladı, kap boyu düzeltildi. **Aynı fazlalık
tırmanış sahnesinde (`.cl-kap`, 195vh) duruyor — açık kalem.**

### Ölçüm — göz kararı koordinat yok

Fare 11 hedefin merkezine gidiyor; koordinatlar ada tarafında
**ölçülüyor** (kaynak da `getBoundingClientRect` okuyordu), rAF dışında,
`fonts.ready` + `ResizeObserver` + resize(180 ms) tazelemesiyle.
İki ölçüm dersi:
- **Dikey ölçü SAYFA uzayında alınır** (hedef ile `.stpage` aynı
  ötelemeyi yer → fark ilerlemeden bağımsız). İlk yazım görüntü
  kutusuna göre ölçüp öteleme geri ekliyordu; sürücü tüketiciye
  dağıtılınca o varsayım çöktü ve fare **787 px** kaydı. Parmak izi
  yakaladı.
- Hedef **tamamlanmış kadrajında** okunur: fiyat kutusunun genişliği
  içeriğe bağlı ("₺ 0" 39,6 px ↔ "₺ 284.400" 81,2 px) ve imleç oraya
  ancak sayı tam boyuna ulaştıktan sonra varır.
Sürgü hedefi ölçülmez, kaynağın kendi formülünden türer
(`rngx + kq·rngw`) — kaynak da canlı okuyordu, çünkü hedef hareketli.

### Kanıt — 17 kare, durum düzeyinde parmak izi

Yan yana kare tek başına yetmiyor (kaynak tarafında sınıf geçişleri
zaman tabanlı, kare yakalarken yarı yolda kalıyor). Bu yüzden 17 `p`
değerinde **sayısal parmak izi** alındı: alan · fiyat · yüzde · perde
ışığı · çip · 21 gün · 3 saat · onay · 4 adım · fare opaklığı · halka.
**16/17 kare birebir**; tek fark `p=0,50`'de takvimin 7. günü — eşik
tam o noktada, kaynak sınıfı yeni atmış (görsel olarak hâlâ saydam),
rampa yarısına gelmiş. Sapma değil, geçiş→rampa çevriminin sınırı.

Renk kıyası da ölçüldü (`color-mix` çevriminin doğrulaması): p=0/0,5/1
üç durumda sekiz seçicinin hesaplanmış renkleri birebir — tek fark
`--tx2` (aşağıda, bulgu).

### Bu turda yakalanan bulgular

1. **MOBİL İÇERİK İSTİSNASI ANA CSS BLOĞUNUN DIŞINDAYDI** (kaynak
   4375-4380). `@media (pointer:coarse),(max-width:900px)` içinde
   `.tlsay,.tldd,.tlsl,.tlok{opacity:1;transform:none}` ve
   **`.tlptr{display:none}`** duruyor — yani fare 640'ta değil
   **900**'de sönüyor ve mobilde içerik görünür doğuyor. İlk yazım
   yalnız 1006-1127 aralığını okuduğu için kaçırdı; **gerçek Chrome'da
   mobil yan yana kare yakaladı** (eski tarafta 21 günün hepsi görünür,
   yenide 6). DERS: `tl*`/`st*` kuralları TEK blokta değil — sahne
   işine girmeden `grep` ile sınıfın GEÇTİĞİ her satır taranmalı.
2. **`--tx2` kabukta .72, kaynakta .62.** İkincil yazı tonu bütün
   göçmüş sahnelerde biraz daha parlak. Kabuk düzeyinde karar, bu
   turda dokunulmadı — Enes'in kalemi.
3. **F1c kör noktası:** kural `@font-face` menzil BEYANINA bakıyor,
   diske basılan alt kümeye değil. `U+00B2` (²) beyanda var, üretilen
   dosyada yok (font-uret.py TREN listesinde yok) — "m²" gövde
   fontundan değil sistem fontundan çiziliyor. EN ana sayfada da geçen
   mevcut bir durum; araçlar sahnesi bunu çoğaltıyor.
4. **Yorum içinde `*/` CSS'i kesiyor.** `--fx*/--fy*` yazan bir yorum
   yorumu erken kapattı, esbuild `.tlptr` kuralının tamamını yuttu ve
   fare hiç doğmadı. Derleme uyarısı vardı ama kırmızı değildi.
5. **Sayfadaki 0,00002'lik CLS araçlar sahnesinden DEĞİL** — kaynağı
   `EM.akm2` (giriş mini demosu), ölçüldü.

### Bedel — ölçüldü, biri açık kaldı

Sürücü önce ortak atada yaşıyordu ve `--stp`'nin her karesi **95**
elemanın hesaplanmış stilini tazeliyordu. Animasyon aynı zaman
çizelgesinden **tüketicilere dağıtıldı** ve ilerleme değişkenleri
mirassız yapıldı (`@property ... inherits: false`): kare başına
tazelenen eleman **95 → 43**, mobilde (içerik istisnası + fare yok)
**18**.

Gerçek kaydırmada kare süresi (fare tekerleği, 40 adım, ortanca/p95/
düşen kare >32 ms):

| Düzenek | Eski (JS draw) | Yeni (CSS scrub) |
|---|---|---|
| 412 px · 4× CPU kısıtı | 8,6 / 20,3 / **3** | 8,4 / 12,3 / **1** |
| 1440 px · kısıtsız | 8,4 / 13,7 / **2** | 8,3 / 9,2 / **0** |
| 1440 px · 4× CPU kısıtı | 11,3 / 17,6 / **0** | 8,5 / 31,8 / **7** |

Yani gerçek cihaz profillerinde (telefon-kısıtlı, masaüstü-kısıtsız)
yeni sahne kaynaktan **daha akıcı**; tek zayıf nokta **geniş ekran +
zayıf CPU** birleşimi — orada kuyruk kaynaktan kötü. Sebebi ölçüldü:
imlecin ~50 halkalı `calc` zinciri (fare kaldırılınca düşen kare 7→1).
**AÇIK KALEM:** imleci `@keyframes` + `linear()` yazımına çevirmek
(zincir yerine yerli ara değer). Bu turda yapılmadı, kararı Enes'in.

### Bilinçli sapmalar

- Yarıçap 18 px (kardeş K7 sahneleriyle aynı; kaynak `--r-lg` 26 px).
- Mono yüz `ui-monospace` (kabuk sözleşmesi; kaynak JetBrains Mono).
- Kap genişliği 798 px ↔ kaynak 1198 px (kabuk düzeni; oranlar korunur,
  fare koordinatları ölçümden gelir).
- Sınıf geçişleri → rampa; çevrim **m = 9/süre(s)** (D1'in ×20 = .45 s
  eşleniğinden türetildi): .45 s→20 · .35 s→26 · .30 s→30 · .28 s→32 ·
  .24 s→37,5.
- Sayılar CSS sayacı; `₺` biçimi üç parçalı sayaç + boş sembollü geri
  düşüş (11 değerde JS `toLocaleString` ile genişlik birebir ölçüldü).
- Kilitlenen blok etiket + sahne + notun tamamı (kaynak `pWrap`
  `.sdsec`); tırmanışta yalnız sahne kutusu kilitleniyordu.
- Fare hedefleri tamamlanmış kadrajda ölçülür; kaynak canlı okuduğu
  için saat (4 px) ve onay (5 px) giriş ötelemesini de görüyordu —
  ≤5 px sapma, yazılı.

**Kapı:** denetim **45/0** · LH mobil 3 koşum ortanca **100** · LCP
**1,357 s** · TBT **0** · CLS 0,00002 (sahne dışı) · sayfa JS **7,1 KB**
· sayfa HTML 99,6 KB ham / 20,8 KB gzip.

---

## 9 · PLATFORM AKIŞI — `#qtStage` (21 Ağu, D4'ün altıncı sahnesi)

Kaynak: markup `tradeStage` 8264-8324 · CSS 3736-3899 **+ 4393-4395** ·
sürücü `draw` 8475-8527 · ST 8716 (pin 2.7). Dört perde tek pencerede
yatay kayar: arama → alıcılar → karar verici → ilk temas.

### Kilit — Enes'in uyarısı ölçüldü, fazlalık YOK

Araçlar sahnesinde kap boyu yanlış kurulduğu için sahne bitişten sonra
228 px daha yapışık kalmıştı. Burada kap **sarmal + 270vh**: yapışık
pencere (kapBoyu − sarmal) tam kilit boyuna eşit. Gerçek kaydırmayla
ölçüldü (1440 × 900): sahne 178,5 px'te yapışıyor (= (900−543)/2),
ilerleme 0 → 1 **2.430 px**'te tamamlanıyor (= 2,7 × 900) ve tam o
noktada yapışkanlık bırakıyor (d=2.536'da sahne 72,2'ye çıkmış).

Sticky üst hizası kaynağın **iki dalını da** tek ifadeyle karşılıyor:
`max(0px, (100vh − sarmal)/2)` — blok ekrana sığıyorsa `center center`,
sığmıyorsa `top top` (kaynağın 9003 koşulu). Aralık başlangıcı da
ondan türüyor: `100vh − üstHiza`.

### Şerit anahtar kareyle — birebir ve bileşik katmana uygun

Kaynağın şerit formülü (`slide = min(N−1, idx + clamp((sub−.82)/.18))`)
eşikleri SABİT: e = .205→.25, .455→.5, .705→.75; aralarda hareket
doğrusal. Yani `@keyframes` yazımı yaklaştırma değil **birebir**.
Değişken güdümlü `transform` bileşik katmanda sürülemiyordu; 3192 × 420
px'lik şerit her karede yeniden rasterleniyordu.

`will-change: transform` (kaynağın 3770 satırı) DENENDİ ve **ölçümle
reddedildi**: 1440 + 4× kısıtta düşen kare 8 → **22-28**. Katman
promosyonunun bedeli, kaçınılan rasterlemeden ağır. Anahtar kare
yazımı onun yerine geçti.

### Yazım — iki granülarite, ikisi de gerekçeli

- **Sorgu** (18 harf, tek satır): KARAKTER granülaritesi. Gizli harf
  `font-size: 0` → sıfır genişlik; böylece metin gerçekten büyür ve
  imleç ucunda kalır (kaynakta `textContent` büyüyordu).
- **E-posta gövdesi** (281 karakter): KELİME granülaritesi — sohbet
  sahnesinin dersi; 281 ayrı eleman kare başına ağır olurdu.
- **Sayaç** 1.284: üçlü sayaç (binler + ayraç + **sıfır dolgulu** kalan;
  araçlar sahnesindeki ₺ biçiminin kardeşi, orada kalan hep 100'ün katı
  olduğu için dolgu gerekmiyordu, burada gerekiyor).

### Kanıt — 19 kare, GERÇEK KAYDIRMAYLA

Bu turda parmak izi enjeksiyonla değil **sayfayı gerçekten kaydırarak**
alındı (şerit artık anahtar kare; enjeksiyonla animasyonu durdurmak
sahneyi taban kareye düşürüyordu — ölçüm düzeni tuzağı, yakalandı).
19 `p` değerinde şerit konumu · perde ışığı · adım rayı · sorgu metni ·
sayaç · çipler · satırlar · seçim · özet · kanallar · rozet · kelime
sayısı · gönderildi · yanıt karşılaştırıldı.

**İki eşik dışında birebir:** `p=0,32`'de dördüncü satır ve `p=0,68`'de
doğrulama rozeti — ikisi de eşiğin tam üstünde; kaynakta sınıf yeni
atılmış (görsel olarak hâlâ saydam), rampa yarısına gelmiş. Geçiş →
rampa çevriminin bilinen sınırı, sapma değil.

Şerit konumu oran düzeyinde birebir: kaynak −931,8/1198 = −0,7778 ↔
yeni −619,2/798 = −0,7759 (fark gerçek kaydırmanın tam sayı piksele
oturmasından).

### Bu turda yakalanan bulgular

1. **Seçili satırın gölgesi rampa DEĞİL basamak olmalı** — kaynağın
   geçiş listesi `box-shadow`'u içermiyor (3820), yani anında gelir.
   Rampa yazımı 30 px bulanık gölgeyi kilit boyunca her karede yeniden
   boyatıyordu. Kural: **kaynağın `transition` listesinde OLMAYAN
   özellik rampalanmaz.**
2. **Miras seçimi ölçülmüş karardır.** İlerleme değişkeni miras alırsa
   onu KULLANMAYAN bütün alt ağaç da kare başına tazelenir; `--qact`
   ilkin mirastaydı ve her perdenin ~40 elemanlık gövdesini stil
   hesabına sokuyordu. Miras artık yalnız alt ağacı bir-iki elemanlık
   olanlarda açık (`--qsa/--qsd`, `--qyaz`, `--qsec`).
3. **E-posta gövdesi dar kapta kırpılıyor — kaynağın kendi davranışı.**
   Ölçüldü: kaynak 1198 px kapta sığdırıyor, **872 px kapta kırpıyor**
   (`.qtbody{overflow:hidden}`). Yeni kabuğun sütunu 798 px olduğu için
   kırpma masaüstünde de görünür (145 px metin, 123 px pencere → bir
   satır gidiyor). Mobilde iki taraf da birebir aynı kırpıyor (160 ↔
   87/86 px). **Kabuk sütun genişliği kararı — Enes'in kalemi.**
4. **Kaynakta ölü kural:** `@media(max-width:760px) .qtstep span` —
   `.qtstep`in içinde `span` yok (etiket düz metin). Olduğu gibi
   bırakıldı; mobilde adım etiketleri iki tarafta da görünür.

### Kaydırma akıcılığı (ortanca / p95 / düşen kare >32 ms)

| Düzenek | Eski (JS draw) | Yeni (CSS scrub) |
|---|---|---|
| 412 px · 4× CPU kısıtı | 9,6 / 19,6 / **1** | 8,5 / 17,0 / **0** |
| 1440 px · kısıtsız | 8,4 / 10,4 / **0** | 8,4 / 16,3 / **0** |
| 1440 px · 4× CPU kısıtı | 14,3 / 20,3 / **0** | 8,8 / 33,0 / **13** |

Gerçek cihaz profillerinde kaynakla aynı ya da daha iyi; **geniş ekran +
zayıf CPU** birleşimi araçlar sahnesiyle aynı açık kalemde (ölçüm
gürültüsü bu düzenekte ±5 kare).

**Kapı:** denetim **45/0** · LH mobil 3 koşum ortanca **100** · LCP
**1,508 s** · TBT **0** · CLS **0** · sayfa HTML 123,8 KB ham /
24,2 KB gzip.
