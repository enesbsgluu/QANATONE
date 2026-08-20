# TASARIM TURU A3 — KÜNYE KIYAS RAPORU (sürücü sütunlu)

**20 Ağu 2026 · kaynak: kök index.html (tek gerçek) · kıyas: yeni/ dist.**

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

| # | Sahne | Öğe/İş | Sürücü (kaynak) | Aralık | Katsayı | Kaynak satır |
|---|---|---|---|---|---|---|
| K1 | Hero eller | hand-h `yPercent:-15` · hand-r `+17`, ease:none | ST **scrub** | hero `top top → bottom top` | .9 | 12338-12343 |
| K2 | Hero içerik paralaksı | `.heroin` y:110 · opacity→.2, ease:none | ST **scrub** | hero `top top → bottom top` | .6 | 12527-12528 |
| K3 | Proje destesi | kart `scale 1−.06t` · `opacity 1−.28t`, t=(H−top)/(H·.82) | elle **scroll scrub** (rAF) — mobilde hiç bağlanmaz | kart bazlı | — | 12488-12522 |
| K4 | /otomasyon AKIŞ `#flow` | `__flowReveal(p)` — kanal/adım/çıkışlar ilerlemeyle | ST **scrub** | `top 86% → bottom 90%` (Enes'in kendi ayarı: blok tam görünürken biter) | .5 | 12455-12463 |
| K5 | /otomasyon SIZINTI `#szStage` | `__szDraw(p)` — sızıntılar→tıpalar→çıkış; tanecikler ayrı rAF | **PIN + scrub** (kilitli sahne) | `center/top → +=2.2·vh` | .5 | 12467-12478 |
| K6 | Müşteri yolu çizgisi `#chan` | `__chanDraw(p)` — eğri çizilme + duraklar (delta eşiği .004) | ST **scrub** | `top 90% → bottom 55%` | .5 | 12479-12485 |
| K7 | Hizmet detay sahneleri `__sdST` | her hizmetin story sahnesi `draw(p)` (GEO, TradeSelf, clhit/aidot/stcta/qtCar…) | **PIN + scrub**; pinsiz dal YALNIZ reduce | `→ +=pin·vh` | .5 | 8985-9010 |
| K8 | ai-ajan MOTOR `mkStage` `__sdST2` | `mdraw(p)` — yedi perde; amblem+kablolar bu sahnenin içi | **PIN + scrub** | `→ +=4.4·vh` | .5 | 8700-8714 |

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
| S5 süreç çizgisi (ana) | K6 scrub | anonim `view()` + `--yt` scrub | ✅ SADIK |
| S-K katman girişi | rv.in tetik | `view()` scrub | ✅ (tetikten scrub'a — yön doğru) |
| S-SZ sözler girişi | rv.in tetik | `view()` scrub | ✅ |
| ak* demolar (5 ana + 4 detay) | IO + infinite | IO + infinite (`--akps`) | ✅ SADIK — kaynak da otomatik |
| TradeSelf amblemi dönüşü | infinite (pin `on` kapısı) | infinite (IO `akoynar` kapısı) | ✅ dönüş sadık; **sahnesi eksik (K8)** |
| Hero eller paralaksı (K1) | **scrub .9** | YOK (iskelet kararı, hero.css 22'de yazılı) | ⚠️ AÇIK — tasarım turunda geri gelmeli (aşağıda D5) |
| Hero içerik paralaksı (K2) | **scrub .6** | YOK (aynı karar) | ⚠️ AÇIK (D5) |
| /otomasyon akış (K4) | **scrub .5** | animasyon YOK — statik | ❌ AÇIK (D1) — Enes'in özel şikâyeti |
| /otomasyon sızıntı (K5) | **PIN+scrub** kilitli sahne | statik son-hâl çubukları | ❌ AÇIK (D2) |
| /surec çizgisi (rota) | **scrub .5** (K6) | statik TAM hâl (çizilme yok) | ❌ AÇIK (D3) |
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
| D3 | /surec çizgisi çizilmesi | ana sayfadaki S5 `--yt` düzeni AYNEN rotaya | en ucuz kalem |
| D4 | Hizmet detay story + motor sahneleri | sahne başına karar; ölçümlü kablolar/pinli yedi perde → **GSAP ST scrub kendi adasında** güçlü aday | kapsamı büyük — Enes'le sıra kararı |
| D5 | Hero paralaks (eller + içerik) | `animation-timeline: scroll(root)` hero aralığında (K1/K2 değerleri birebir) | iskeletin "taşınmadı" kararı tasarım turunda düşer |

Sıra önerisi: **D3 → D1 → D2 → D5 → D4** (ucuzdan pahalıya; D4 sahne
sahne kendi commit'leriyle). Her biri kendi kapısı + ekran karesi +
savurma hükmüyle.
