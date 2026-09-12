# SOKUM-KARAR-LISTESI

*(salt okunur keşif · 3/4 Eyl 2026 gecesi · hiçbir dosya değiştirilmedi · TUR4-SOKUM-KESIF.md'nin tamamlayıcısı · KARAR sütunu BOŞ — Enes dolduracak)*

**Okuma anahtarı** — `ada` = yenide `<script>` taşıyan bölüm · `statik` = 0 bayt. Eski taraf `ada/statik` sütununda kurulumun adı (kapiliKur kaydı) ya da doğrudan çağrılan fonksiyon yazar. JS maliyeti: eskide `index.html:X-Y` satır aralığı, yenide **derlenmiş çıktıdaki gerçek satır içi bayt** (`dist/yeni/…`, ölçüldü). JSON-LD baytları JS sayılmadı.

Eski rota tablosu: `index.html:11651-11685` · yeni rotalar: `yeni/src/pages/`. Yeni tarafta ayrıca 11 `/en/*` sayfası var (`yeni/src/pages/en/`), aynı parçaları `dil="en"` ile kullanır — aşağıda ayrı satır açılmadı.

---

## 0. TÜM SAYFALARDA ORTAK KABUK

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| karşılama perdesi (`#boot`) | Anakart izleri + QANATONE harfleri + dolum çubuğu; 2,7 sn zorunlu bekletme, `html.booting{overflow:hidden}` kaydırma kilidi (`index.html:4415-4437`, CSS 81-196, denetleyici 4438-4614) | Aynı SVG izler (`pathLength="1"`), harf kaskadı; 1,3 sn ya da ilk dokunuşta süpürülür, kaydırma kilidi yok, dolum çubuğu yok (`yeni/src/parcalar/Perde.astro:36-63`) | aynı | eski: satır içi kapı betiği · yeni: **ada** (`is:inline`, Perde.astro:73-91) | yok (zamanlayıcı + `once` olay) | eski 4438-4614 (~176 satır) · yeni **791 B** | |
| perdenin sayfa kapsamı | 58 sayfanın hepsinde | **yalnız ana sayfa** (`index.astro:79`; gerekçe 75-78) | yenide kaybolmuş | — | — | — | |
| yıldız tuvali `#stars` | Sabit tam ekran canvas, rAF ile kayan yıldız alanı (`index.html:4621`, CSS 228, JS 9221-9274) | — | yenide kaybolmuş | eski: `starsKur` doğrudan | eski: rAF döngüsü | eski 9221-9274 (~54 satır) | |
| grain `#noise` | Sabit tam ekran gürültü katmanı, opacity .055 (`index.html:4622`, CSS 229-232) | — | yenide kaybolmuş | eski: statik CSS | yok | 0 | |
| üst karartma `.topfade` | 110 px sabit degrade (`index.html:4623`, CSS 255-257) | `.nv-fade` (`Nav.astro:58`, `stil/nav.css`) | aynı | statik | yok | 0 | |
| QANATONE ajanı imleci (`#bit` · `#bittip` · `#bitsay`) | Fareyi izleyen kızıl nokta + balon; yazarak konuşan mesajlar, aksiyon düğmeleri, sayfa turu (`index.html:4624-4629`, CSS 1454-1514, JS 9373-9555) | — | yenide kaybolmuş | eski: doğrudan çağrı, rAF | eski: rAF + pointermove | eski 9373-9555 (~183 satır) | |
| nav çubuğu | Logo + 4 bağlantı + 3 açılır panel (hizmet/proje/stüdyo) + TR/EN + CTA + burger; paneller JS ile doluyor (`index.html:4631-4658`, `buildNavDD` 9030-9078, `NDTXT` 9019-9029) | Aynı iskelet; **açılır panel içerikleri derlemede basılı** (8 hizmet + 7 proje + Stüdyo), `.here` derlemede, dil düğmeleri gerçek rota (`Nav.astro:60-123`) | aynı | eski: `buildNavDD` · yeni: **ada** (yalnız stuck nöbetçisi) | eski: yok (hover) · yeni: IO tek eşik | eski 9030-9078 · yeni **224 B** | |
| mobil tam ekran menü | 7 bağlantı + dil + iki CTA; JS ile açılıp kapanır (`index.html:4660-4680`, CSS 2533-2577) | Birebir markup, **checkbox + kardeş seçici** ile açılır (`Nav.astro:126-163`) | aynı | eski: burger dinleyicisi · yeni: **statik** | yok | eski ~2533-2577 CSS + burger JS · yeni **0** | |
| footer (3 sütunlu ızgara) | Logo + tanıtım + "Sayfalar" 6 bağlantı + "İletişim" (WhatsApp/e-posta/sosyal) (`index.html:5478-5501`, `renderWa` 7457-7467) | Tek satır: telif + `/hukuki` + "ana site" (`Temel.astro:56-66`) | yenide kaybolmuş | statik | yok | 0 | |
| footer bit damgası (`#wmk`) | "QANATONE" kelimesini bit bit çizen canvas, IO ile başlayan rAF (`index.html:5502`, CSS 2336-2340, JS 11135-11261) | — | yenide kaybolmuş | eski: `wmk` bloğu, IO 11253-11258 | **IO otomatik** | eski 11135-11261 (~127 satır) | |
| SPA yönlendirme | `history.pushState` + bölüm gösterme/gizleme, `.pg` damgası, kaydırma geri yükleme (`index.html:11649-11912`) | Yok — her rota gerçek HTML dosyası (`dist/yeni/*/index.html`) | yenide kaybolmuş | eski: `ROUTER` | yok | eski 11649-11912 (~264 satır) | |
| prefetch | Görünür iç bağlantıların HTML'ini IO ile önden çeker, 30 sayfa tavanı (`index.html:9181-9210`) | Astro viewport prefetch; kök siteye giden bağ hariç tutulmuş (`Temel.astro:60-64`) | aynı | eski: `prefetchKur` · yeni: **ada** (harici) | **IO otomatik** | eski 9181-9210 · yeni `page.sJrt8mpm.js` **2.253 B** (her sayfa) | |
| genel beliriş `.rv → .in` | IO ile sınıf yazımı, `data-d` kademesi (`index.html:9211-9220`) | CSS `animation-timeline: view()` (`stil/ana.css:65,83`) | aynı | eski: `observeRv` · yeni: **statik** | eski IO · yeni **kaydırma (view scrub)** | eski 9211-9220 · yeni **0** | |
| görünürlük kapısı (kurulum turu) | 8 kayıtlı `kapiliKur` + 4 ilk-ekran istisnası; `rootMargin:600px` (`index.html:9161-9172`, kayıt listesi 9143-9145) | Yok — ada başına kendi IO'su | yenide kaybolmuş | eski: `gorunceKur` | IO | eski 9149-9173 | |
| dil değiştirme (TR/EN) | Aynı DOM'da `applyStrings` + `setLang`, `data-t` süpürmesi (`index.html:6827-6884`) | Ayrı rota ağacı `/en/*` (11 sayfa), derlemede iki dil | aynı | eski: `setLang` · yeni: **statik** | yok | eski 6827-6884 · yeni **0** | |
| şema / canonical / hreflang | Çalışma anında `SEO.apply` (`index.html:11482-11648`) | Derlemede `sema.mjs` → `<script type="ld+json">` (`Temel.astro:44`) | aynı | eski: `SEO` · yeni: **statik** | yok | eski 11482-11648 · yeni 0 JS (JSON 1,5-5,9 KB) | |
| GA4 / gtag | `gtag/js` dinamik yükleme + `page_view` (`index.html:11636-11648`) | — | yenide kaybolmuş | eski: satır içi | yok | eski 11636-11648 | |
| hareket motoru (GSAP + ScrollTrigger + Lenis) | 3 harici kütüphane `defer` (`index.html:5514-5516`), Lenis yalnız `!REDUCE && >880` (12413-12418), `lagSmoothing` 12442 | Hiç yok — tüm scrub CSS `animation-timeline` | yenide kaybolmuş | eski: harici js/*.min.js | — | eski `js/gsap.min.js` + `ScrollTrigger.min.js` + `lenis.min.js` · yeni **0** | |
| `noindex` | Yok (üretim) | Kabuk geneli `<meta name="robots" content="noindex">` (`Temel.astro:37`) | yenide eklenmiş | statik | — | 0 | |

---

## 1. ANA SAYFA `/`

Eski bölüm dizisi (`index.html:11652`): `hero · ticker · projeler · katman · akis · sektor · sekpanel · tespit · sozler · sozband · kurucu · iletisim` (+ ayrı `#lead`).
Yeni sıra (`yeni/src/pages/index.astro:84-100`): `SHHero · STSerit · S2Kayip · S3Mekanizma · SPDeste · SKKatman · SAAkis · SSESektor · S5Surec · S6Sektor · STETespit · SSZSozler · SSBSozBandi · SKUKurucu · SILIletisim`.
Sayfa toplamı: `dist/yeni/index.html` 176.512 B, satır içi JS **7.623 B** (+1.554 B JSON-LD).

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| hero atmosfer katmanı `.atmo` | 4 renk lekesi (`index.html:4686`, CSS 383-401) | Aynı 4 leke, `sus-a1..a4` (`SHHero.astro:23-26`) | aynı | statik | yok | 0 | |
| hero 3B tüpler `<canvas id="tubes">` | WebGL/2D tüp alanı, IO ile play/pause (`index.html:4687`, JS 9313-9372, IO 9354-9357) | — | yenide kaybolmuş | eski: `tubesKur` (ilk-ekran istisnası) | **IO otomatik** | eski 9313-9372 (~60 satır) | |
| hero eller (insan + robot) | İki `<picture>`, GSAP ST scrub .9 ile süzülme (`index.html:4688-4700`, `initHeroHands` 12333-12372, ST 12338-12343) | Aynı iki görsel + **mobil varyant** (`-m.avif/-m.webp`); süzülme CSS `view()` (`SHHero.astro:28-47`, `stil/hero.css`) | aynı | eski: `initHeroHands` · yeni: **statik** | eski **kaydırma (scrub .9)** · yeni **kaydırma (view)** | eski 12333-12372 · yeni **0** | |
| hero rozet + h1 + lede + 2 CTA | `index.html:4702-4712`; h1 Playfair italik `<em>Yakalayan</em> <b>yok.</b>`; CTA'lar `#heroCta` (teşhise) ve `/#lead` | Birebir metin, `suz()` süzgeciyle; CTA'lar `#tespit` ve `#cagri` bağlantısı (`SHHero.astro:49-60`) | aynı | statik | yok | 0 | |
| hero paralaks (`.heroin` y+opacity) | GSAP `gsap.to` scrub .6 (`index.html:12525-12530`) | CSS `view()` (`stil/hero.css`, `--sh-hero` adlandırılmış çizelge) | aynı | eski: GSAP · yeni: **statik** | **kaydırma (scrub)** | eski 12525-12530 · yeni **0** | |
| hero saati `#clock` | İstanbul saati, `setInterval` (`index.html:4714`, `clockKur` 9276-9292) | Aynı; **IO'lu** — yalnız hero ekrandayken `setInterval` koşar; gece yarısı sarma hatası düzeltilmiş (`SHHero.astro:62,70-96`) | aynı | eski: `clockKur` (ilk-ekran istisnası) · yeni: **ada** | yeni: **IO otomatik** | eski 9276-9292 · yeni **438 B** | |
| hero "Kaydır" ipucu | `index.html:4718` | `SHHero.astro:67` | aynı | statik | yok | 0 | |
| şerit / ticker (`#ticker`) | 9 araç logosu × 4 kopya, `.tkdrift` sabit hız 42 sn; markup tek satır, kartları `renderTicker` basıyor (`index.html:4724-4726`, CSS 585-615, JS 7149-7170) | 9 logo × 3 tur, derlemede HTML'de; tekrarlar `aria-hidden`; mobil varyant `-m.webp` (`STSerit.astro:28-53`) | aynı | eski: `renderTicker` · yeni: **statik** | yok (saf CSS döngü) | eski 7149-7170 · yeni **0** | |
| **S2 · Kayıp** (bir talebin yolu, 5 durak) | — | Tek çizgi + 5 durak; çizgi dolumu CSS scroll-driven (`sahneler/S2Kayip.astro:27-43`) | yenide eklenmiş | statik | **kaydırma (view)** | 0 | |
| **S3 · Mekanizma** (ajan devrede, 5 adım) | — | 5 numaralı adım; rayı kaydırmayla çizilir (`sahneler/S3Mekanizma.astro:25-39`) | yenide eklenmiş | statik | **kaydırma (view)** | 0 | |
| proje destesi (`#projeler` / `#prjDeck`) | Yapışkan kart yığını, kartlar `renderProjects` ile basılıyor (bot görmüyor); üstteki kart küçülür (ham `scroll` + rAF) (`index.html:4728-4742`, CSS 1183-1313, JS 7230-7272, `deck()` 12488-12522) | 6 kart derlemede HTML'de (ad/yıl/etiket/anlatım), yapışkan yığın + kart geçişi CSS `animation-timeline`; **mobilde de yaşar** (`SPDeste.astro:49-97`) | aynı | eski: `deck()` ham scroll · yeni: **ada** (yalnız `view()` desteklemeyen tarayıcıda IO yedeği) | eski **kaydırma (scroll+rAF, yalnız >900px & pointer:fine)** · yeni **kaydırma (view)** | eski 12488-12522 + 7230-7272 · yeni **480 B** (destekleyende 0 iş) | |
| deste sayacı `.cnt` | `#prjCount` JS ile (`index.html:4732`) | `(7)` derlemede (`SPDeste.astro:54`) | aynı | statik | — | 0 | |
| katman / mimari (`#katman`) | 4 kart ("Dokuz hizmet değil. Dört katman."), 7 hizmet rotasına çip bağlantıları (`index.html:4757-4801`, CSS 2943-2999) | Birebir 4 kart + çipler; giriş hareketi CSS `view()` (IO'lu sürüm ölçülüp düşürülmüş: LCP +158 ms) (`SKKatman.astro:57-93`) | aynı | statik | eski IO `.rv` · yeni **kaydırma (view)** | eski 0 (statik markup) · yeni **0** | |
| katman **kesme işareti** | — | `SKKatman.astro:2-14` "KESME ADAYI · prolog çalışınca kaldırılacak", bekçi `yeni/denetim.cjs` R13 | yenide eklenmiş | — | — | — | |
| akış galerisi (`#akis`) | Yatay şerit, kartların **tamamını** `__akisRender` basıyor (bot hiçbir şey görmüyor); sürükleme + ok düğmeleri + `scroll-snap` (`index.html:4803-4818`, CSS 2653-4290 ~927 satır / 27 keyframe, JS 7064-7125 · 7099-7125) | 5 hizmet kartı + "tüm hizmetler" kartı derlemede HTML'de; yerli yatay kaydırma + `scroll-snap`, klavye için `tabindex` (`SAAkis.astro:75-112`) | aynı | eski: `akisScrollKur` + `akLiveKur` · yeni: **ada** (yalnız demo play/pause) | eski **IO otomatik** (`.aklive` 7089-7093) · yeni **IO otomatik** (threshold .25) | eski 7064-7125 + 7099-7125 · yeni **291 B** | |
| akış ok düğmeleri + fare sürüklemesi | `#akPrev`/`#akNext`, pointer sürükleme, 6 px eşiğiyle tıklama yutma (`index.html:4811-4814`, JS 7099-7125) | — | yenide kaybolmuş | eski: `akisScrollKur` | yok | eski 7099-7125 | |
| akış mini demoları (8 sahne) | `akDemo` şablonları, JS ile basılıyor (`index.html:6917-7047`, CSS 2653-4290 içinde 27 `ak*` keyframe) | 9 demonun 9'u derlemede HTML'de (5'i şeritte, 4'ü hizmet detayında) (`parcalar/AkisDemo.astro`) | aynı | eski: `akDemo` · yeni: **statik** (oynatma anahtarı adada) | **IO otomatik** (`animation-play-state`) | eski 6917-7047 · yeni **0** (anahtar 291 B içinde) | |
| akış kartı ok ikonu `.sa-ok` | — (eski kartta ok yok: `index.html:2661-2664`) | `SAAkis.astro:95,106`, `stil/akis.css:115,136` | yenide eklenmiş | statik | yok | 0 | |
| akış **kesme işareti** | — | `SAAkis.astro:2-14` (R13 bekçili) | yenide eklenmiş | — | — | — | |
| sektör seçici (`#sektor` › `#secBox`) | 6 sektör kartı, `renderSectors` ile basılıyor (bot görmüyor); tıklamada sayfa boyunca yeniden kurulum (`index.html:4826`, JS 7171-7183, `SEC` 10206-10383) | 6 sektör derlemede HTML'de; geçiş **radyo + kardeş seçici**, JS yok (`SSESektor.astro:101-115`) | aynı | eski: `SEC` · yeni: **statik** | yok | eski 7171-7183 + 10206-10383 · yeni **0** | |
| **talep akış haritası** (`#globe` / `#gcv`) | Canvas dünya haritası + rotalar + 6 HUD paneli (akan talep, en yoğun rotalar, sistem durumu/donut, kapsanan pazarlar, canlı olay akışı, yoğunluk alanı) + lejant + altyazı (`index.html:4829-4895`, CSS 1519-1673, JS `demandMapKur` 9578-10202 ~625 satır) | — (yeni kabuk haritayı hiç taşımadı; `yeni/src/stil/sektor.css:17-22`) | yenide kaybolmuş | eski: `kapiliKur('demandMap','#globe')` `index.html:10203` | **IO otomatik → rAF** (10193-10196) | eski 9578-10202 (~625 satır) + CSS 1519-1673 | |
| sektör panosu (`#sekpanel`) | Seçilen sektörün başlığı + 4 metrik kutusu + kanal payları + tipik talep + "ilk 30 gün"; hepsi `panel()` ile JS'te (`index.html:4900-4940`, JS 10229-10285) | Altı sektörün **hepsinin panosu** derlemede pişer; aynı formül `hesap.mjs` (testli), radyo ile açılır (`SSESektor.astro:117-175`) | aynı | eski: `SEC.panel` · yeni: **statik** | yok | eski 10229-10285 · yeni **0** | |
| pano hesap kaydırıcıları (`#skCalc`: bütçe / satış tutarı / yanıtsız oranı) | 3 `input[range]`, canlı `calc()` (`index.html:4907-4917`, JS 10286-10383) | — (rakamlar sektörün başlangıç değerleriyle sabit basılır) | yenide kaybolmuş | eski: `SEC.calc` | yok (input) | eski 10286-10383 | |
| pano "Sektör değiştir" / "Genel görünüme dön" düğmeleri | `#skChange`, `[data-sreset]` (`index.html:4936-4937`) | — (radyo seçici zaten değiştiriyor) | yenide kaybolmuş | eski: `SEC` | yok | eski 10210-10228 | |
| sektör **kesme işareti** | — | `SSESektor.astro:2-14` (R13 bekçili) | yenide eklenmiş | — | — | — | |
| **S5 · Süreç** (4 adım + 14 gün taahhüdü) | — | `sahneler/S5Surec.astro:21-38`; hareket yok (H1) | yenide eklenmiş | statik | yok | 0 | |
| **S6 · Sektör** (öne çıkan 3 sektör kartı) | — | `sahneler/S6Sektor.astro:18-32`; içerik `content.json.sectors`ten (insaat/saglik/finans) | yenide eklenmiş | statik | yok | 0 | |
| canlı teşhis başlığı (harf harf düşme) | `#tespit h2` harfleri JS ile `<span class="lt"><i>` sarılıyor (`index.html:7126-7148`, CSS 4315-4324) | Harfler **derlemede** bölünür; `aria-label` tam metin; içerik bozulması (`strings.tr.dgh` 2.825 B iç içe iskele) ayıklanıyor (`STETespit.astro:43-101`) | aynı | eski: `__dgTitle` · yeni: **statik** | eski yok (giriş) · yeni **kaydırma (view, `--ste-bas`)** | eski 7126-7148 · yeni **0** | |
| canlı teşhis formu + sonuç (`#tespit`) | URL girişi + tarama süpürmesi + skor halkası + hüküm + ızgara + düzeltme listesi; sonuç yapısı JS'le kuruluyor (`index.html:4945-4980`, CSS 4290-4380, `diagKur` 11938-12326, `render()` 12240) | Form ve **sonuç iskeleti HTML'de doğar** (`hidden`), JS yalnız değer yazar; hüküm eşikleri 85/70/50/0 ve renk eşikleri 70/45 kaynaktan (`STETespit.astro:105-146` + 148-246) | aynı | eski: `kapiliKur('diag','#dgUrl')` 12327 · yeni: **ada** (tek `submit`) | **yok** (kullanıcı eylemi) | eski 11938-12326 (~389 satır) · yeni **2.983 B** | |
| teşhis "düzeltme listesi" `#dgFix` + Eylül/CF uyarı kutusu | `index.html:4977`, `eylulKutusu` 12163-12184, `kotaGoster` 12226-12239 | Kota mesajı ve tek satırlık `robots.txt` uyarısı var (`STETespit.astro:206-216`); ayrı düzeltme listesi yok | yenide kaybolmuş | ada | — | eski 12163-12239 | |
| kanal genişliği kartları (`#sozler`) | 3 sütun × 2 kart bento (Google Arama, Meta, Web siteniz, Tek ekran rapor, WhatsApp ajanı, Yapay zekâ asistanları); açıklama hover'da açılır, giriş IO ile (`index.html:5268-5321`, CSS 1989-2160) | Birebir 6 kart + aynı sütun dizilimi; **kart görselleri eklendi** (18 dosya / 158 KB, üç kırılım, tembel) (`SSZSozler.astro:57-103`) | aynı | eski: `kapiliKur('kanal','#sozler')` 10429 · yeni: **statik** | eski **IO otomatik** (`.tin` 10423-10427) · yeni **kaydırma (view)** | eski 10421-10429 + `chImg` 10403-10420 · yeni **0** | |
| söz kartı üstten parlama + `--line2` kenarlık | — | `stil/sozler.css:118-132` | yenide eklenmiş | statik | yok | 0 | |
| sözler **kesme işareti** | — | `SSZSozler.astro:2-14` (R13 bekçili) | yenide eklenmiş | — | — | — | |
| söz bandı (`#sozband`) | 3 müşteri sözü, otomatik dönüş `interval:7`, avatar + nokta gezinme; `testi.on` kapalıyken `display:none` — **metin ham HTML'de kalıyor ve bot okuyor** (`index.html:5322-5330`, CSS 2178-2208, JS 10437-10490) | Bayrak kapalıyken **hiçbir şey basılmaz**; açıkken radyo + kardeş seçici ile elle gezinme (`SSBSozBandi.astro:37-67`). Bugün bayrak kapalı → bölüm yok | aynı | eski: `tst` render · yeni: **statik** | eski `setInterval` · yeni yok | eski 10437-10490 · yeni **0** | |
| söz bandı otomatik dönüşü | `setInterval` 7 sn (`index.html:10474`) | — | yenide kaybolmuş | — | — | eski 10471-10490 | |
| kurucu (`#kurucu`) | Fotoğraf + ad + unvan + biyografi + bağlantılar; satırı `renderFounder` basıyor, açılma `bindKteam` (`index.html:5333-5339`, CSS 2215-2300, JS 7363-7456) | Aynı içerik derlemede; akordeon **native `<details>/<summary>`** — JS'siz de açılır (`SKUKurucu.astro:31-71`) | aynı | eski: `renderFounder`+`bindKteam` · yeni: **statik** | yok | eski 7363-7456 (~94 satır) · yeni **0** | |
| CTA bandı (`#iletisim`) | Başlık + cümle + WhatsApp düğmesi + "Demo talep et" (`index.html:5352-5364`) | Aynı; WhatsApp bağlantısı `settings.whatsapp`ten derlemede (`SILIletisim.astro:45-57`) | aynı | eski: `renderWa` 7457-7467 · yeni: **statik** | yok | eski 7457-7467 · yeni **0** | |
| demo talep formu (`#lead`) | Ad/e-posta/telefon/mesaj + KVKK onayı + honeypot + 10 atıf alanı; Netlify Forms; `fetch` gönderim, hata olursa WhatsApp'a düşürme (`index.html:5415-5474`, `leadForm` 11340-11449, `atifOku` 11262-11339) | Aynı alanlar, aynı honeypot, aynı 10 atıf alanı, aynı WhatsApp yedeği; `kvkk_metin_ozet` **derlemede** doluyor (`SILIletisim.astro:60-112` + 116-173) | aynı | eski: `leadForm` · yeni: **ada** (tek `submit`) | **yok** (kullanıcı eylemi) | eski 11262-11449 (~188 satır) · yeni **2.416 B** | |
| düğme dönen huzme `.sus-isik` | CSS'te mekanizma vardı, markup **kullanmıyordu** (`index.html:350-361`, `class="shiny"` → 0) | 6 noktada kullanılıyor (`SILIletisim.astro:50,106` · `404.astro:14` · `BultenDizin:71` · `HizmetDizin:121` · `HizmetGovde:212`) | yenide eklenmiş | statik | yok | 0 | |
| genel düğme hover gölgesi | — | `stil/ana.css:126-127` ("H1'in bilinçli istisnası") | yenide eklenmiş | statik | yok | 0 | |

---

## 2. `/hizmetler` (dizin)

Eski: `#hizmet` (`index.html:5002-5012`) + `renderServices` (7184-7198) + `.bento/.card` CSS (1150-1182).
Yeni: `pages/hizmetler.astro` → `parcalar/HizmetDizin.astro`. Çıktı 53.455 B, satır içi JS **224 B**.

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| geri bağlantısı `.pgback` | Ana sayfaya (`index.html:5003`) | Ana sayfaya (`HizmetDizin.astro:75-79`) | aynı | statik | yok | 0 | |
| başlık künyesi (26 px kızıl çizgi + "Ne yapıyoruz" + h1 + sayaç + lede) | `index.html:5005-5010`; sayaç `#svcCount` JS ile | Birebir; sayaç `(9)` derlemede; `.mono` **12 px tabanı** uygulanmış (kaynak 4326-4366 bulgusu) (`HizmetDizin.astro:81-97`) | aynı | statik | yok | 0 | |
| bento ızgara (9 hizmet kartı) | 4 sütun, `b2`/`b2x2` boyları, `hi` vurgulu kart; kartları `renderServices` basıyor (bot görmüyor) (`index.html:5011`, JS 7184-7198) | 9 kart derlemede; `<ol>/<li><a>` (sıralı liste semantiği); boy/vurgu `content.json`dan (`HizmetDizin.astro:99-118`) | aynı | eski: `renderServices` · yeni: **statik** | eski IO `.rv` · yeni **kaydırma (view, `entry 0%→100%`)** | eski 7184-7198 · yeni **0** | |
| alt demo formu | Sayfa altında ikinci form (`index.html:5011` civarı bento sonrası) | — · yerine tek "Konuşalım" düğmesi (`HizmetDizin.astro:120-122`; gerekçe 43-45: "iç sayfada form kalmaz") | yenide kaybolmuş | statik | yok | 0 | |

---

## 3. `/hizmetler/<slug>` — 9 hizmet detayı

Eski iskelet: `#hizmetdetay` (`index.html:4983-4989`, gövdeyi `sdetail` 11799-11811 basıyor) + aile şablonu `SDT` (8447-8468) + ortak sahne sürücüsü `__sdMotion` (8469-8974, ST kurulumu 8974-9014).
Yeni: `pages/hizmet/[slug].astro` → `parcalar/HizmetGovde.astro` (+ 8 sahne parçası).

### 3a. Tüm hizmet sayfalarında ortak

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| geri bağı + künye + h1 + lede | `#sdTag`/`#sdH`/`#sdLede` JS ile doluyor (`index.html:4985-4987`, 11799-11811) | Derlemede (`HizmetGovde.astro:61-73`) | aynı | eski: `sdetail` · yeni: **statik** | yok | eski 11799-11811 · yeni 0 | |
| **detay giriş mini demosu** | — (kaynak yorumu 6898 kart görselini "detay sahnesinin mini hâli" diye tanımlıyordu ama sahne yoktu) | 4 hizmette çalışan mini demo: `site`/`tool`/`auto`/`trade` (`HizmetGovde.astro:74-76`, `AkisDemo.astro`) | yenide eklenmiş | **ada** (play/pause anahtarı) | **IO otomatik** (threshold .25) | **298 B** (her hizmet sayfası) | |
| üç vuruş (`sdHits`) | Mono sıra no + büyük cümle, sahneden **sonra** (`index.html:7575-7579`, CSS 891-896) | Aynı sıra ve görünüm (`HizmetGovde.astro:98-102`) | aynı | statik | yok | eski 7575-7579 · yeni 0 | |
| altı genişleyen kart (`sdGrid`) | 3 dert + "Nasıl yürütürüz" + "Eline geçenler" + "Hedefler & SSS"; açılışı **FLIP'li tam ekran panel** (`#xcPanel`+`#xcOv`, `backdrop-filter: blur(10px)`, ~90 satır JS) (`index.html:7586-7607`, `xC` 7580-7585) | Aynı altı kart, aynı sıra; açılış **yerinde `<details>`** — ada JS'i 0, mobil bulanıklık yok (`HizmetGovde.astro:124-194`) | aynı | eski: panel JS · yeni: **statik** | yok | eski 7580-7607 + panel ~90 satır · yeni **0** | |
| hizmet SSS (`det.faq`) | Panel içinde (`index.html:7601-7605`) | İç içe `<details>` (`HizmetGovde.astro:185-190`) | aynı | statik | yok | 0 | |
| çağrı bloğu (`sdCta`) | Başlık + cümle + iki düğme (form + WhatsApp `.shiny`) (`index.html:7608-7621`) | Aynı iki düğme; WhatsApp numarası boşsa düğme **hiç basılmaz** (kaynak sahte `905000000000`e düşüyordu, 7459) (`HizmetGovde.astro:204-219`) | aynı | statik | yok | eski 7608-7621 · yeni 0 | |
| detay görseli (`sdImg` · `det.img`) | Varsa tam genişlik görsel (`index.html:8444-8446`); bugün yalnız `finans` taşıyor | — | yenide kaybolmuş | statik | yok | eski 8444-8446 | |
| ortak sahne sürücüsü | `__sdMotion` tek `draw(p)` + ST `pin+scrub .5`, `start` iki dallı, `end '+='+innerHeight*pin` (`index.html:8974-9014`) | Sahne başına CSS `animation-timeline` (`view()` ya da adlandırılmış `--*-kap`); ada yalnız ölçüm yazar | aynı | eski: GSAP ST · yeni: **statik + küçük ölçüm adası** | **kaydırma (pin+scrub)** iki tarafta da | eski 8469-9014 (~546 satır) · yeni sahne başına 0-2.326 B | |

### 3b. Aile bazında sahneler

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| **google-ads · meta-ads** (`fam:funnel`) huni sahnesi `#fnStage` | Satırlar dolar, oran metni JS'le yazılır, oklar açılır (`index.html:7623-7629`, `draw` 8721-8728) | Aynı eşikler (`t=clamp((p−i·.18)/.4)`, `e=1−(1−t)³`), yüzde metni **CSS sayacıyla** (`HuniSahne.astro`) | aynı | statik | eski **kaydırma (scrub .5, pinsiz)** · yeni **kaydırma (view, `entry calc(100%+Nvh)`)** | eski 7623-7629 + 8721-8728 · yeni **0** | |
| google-ads / meta-ads sayfa toplamı | — | `dist/yeni/hizmet/google-ads/index.html` 170.637 B | — | — | — | **522 B** (nav 224 + demo 298) | |
| **seo** (`fam:climb`+`serp`) tırmanış sahnesi `#clStage` | Sen ve 4 rakip satırı yer değiştirir, sıra `#8→#1`, zirvede vuruş; **pin .95** (`index.html:7637-7681`, `draw` 8749-8770, ST 8998-9005) | Aynı formüller; `offsetTop` ölçümü rAF **dışında** (kurulum + resize + `fonts.ready` + `ResizeObserver`), scrub CSS'te (`SerpSahne.astro`) | aynı | **ada** (yalnız ölçüm) | **kaydırma (pin .95 + scrub)** iki tarafta | eski 7637-7681 + 8749-8770 · yeni **629 B** | |
| seo sayfa toplamı | — | 171.394 B | — | — | — | **1.151 B** | |
| **geo** (`fam:climb`+`ai`) sohbet sahnesi `#aiStage` | Yazan sohbet — karakter karakter `innerHTML` her karede (`index.html:8325-8334`, `draw` 8774-8814) | Aynı segment hesabı derlemede pişer; yazım **kelime granülaritesinde**, JS'siz (`SohbetSahne.astro`) | aynı | statik | eski **kaydırma (scrub, pinsiz)** · yeni **kaydırma (view)** | eski 8325-8334 + 8774-8814 · yeni **0** | |
| geo sayfa toplamı | — | 177.763 B | — | — | — | **522 B** | |
| **ai-ajan · otomasyon** (`fam:flow`) akış sahnesi `#flStage` | Düğümler yanar, işaretçi düğümler arası gezer (`gBCR` ile) (`index.html:7630-7636`, `draw` 8730-8747) | Aynı eşikler; işaretçi konumu **düzen kurallarından türer** (flex:1 + 14px gap) (`AkisSahne.astro`) | aynı | **ada** (yalnız ölçüm) | **kaydırma (scrub, pinsiz)** iki tarafta | eski 7630-7636 + 8730-8747 · yeni **818 B** | |
| **ai-ajan** ajan kadrosu (`kadroStage`, `det.kadro`) | 4-5 alt ajan kartı, tel/çip açılışı (`index.html:7892-7940`, IO 8097-8100) | — | yenide kaybolmuş | eski: `.kdbox` IO | **IO otomatik** | eski 7892-7940 | |
| ai-ajan / otomasyon sayfa toplamı | — | 172.135 / 172.955 B | — | — | — | **1.340 B** | |
| **web-tasarim** (`fam:craft`+`story.sites`) canlı hikâyeler `#stStage.stlive` | Mini tarayıcı kutusunda canlı site iframe'i (ölçekli) ya da `.nofr` iki kart ızgarası (`index.html:8336-8365`, fit 8818-8845) | İki dal da taşındı; kart arkası `background-image` yerine `<img loading="lazy">` + künye ölçüsü (CLS yok) (`CanliSahne.astro`) | aynı | **ada** (yalnız ölçek) | **yok** (scrub yok, kaynakta da yoktu) | eski 8336-8365 + 8818-8845 · yeni **467 B** | |
| web-tasarim sayfa toplamı | — | 171.216 B | — | — | — | **989 B** | |
| **web-sitesi-araclar** (`fam:craft`+`story.tools`) araçlar sahnesi `#stStage.sttools` | 3 perde (fiyat hesabı, takvim, müşteri paneli) + **simüle fare imleci** (11 hedef, `gBCR` ölçümlü) + kaydırma çubuğu; **pin 1.05** (`index.html:8371-8443`, `draw` 8817-8960) | Aynı üç perde, aynı imleç (11 hedef **ada ölçer**, scrub CSS'te), sayfa ötelemesi ölçümsüz yüzde çeviriyle (`AracSahne.astro`) | aynı | **ada** (yalnız ölçüm) | **kaydırma (pin 1.05 + scrub)** iki tarafta | eski 8371-8443 + 8817-8960 (~217 satır) · yeni **1.478 B** | |
| web-sitesi-araclar sayfa toplamı | — | 176.427 B | — | — | — | **2.000 B** | |
| **finans** (`fam:trade`) platform akışı `#qtStage` | 4 perde yatay kayar (arama → alıcılar → karar verici → ilk temas); yazan sorgu, koşan sayaç, yazılan e-posta; **pin 2.7** (`index.html:8264-8324`, `draw` 8475-8527, ST 8716) | Aynı 4 perde, aynı eşikler; sorgu karakter, e-posta kelime granülaritesinde; kilit boyu ölçüldü (`PlatformSahne.astro`) | aynı | **ada** (yalnız sarmal yüksekliği) | **kaydırma (pin 2.7 + scrub)** iki tarafta | eski 8264-8324 + 8475-8527 · yeni **333 B** | |
| **finans** TradeSelf manifestosu (`tradeMfst`) | Sahneler **arasında** duran ikna bloğu (`index.html:7872-7891`) | — | yenide kaybolmuş | statik | yok | eski 7872-7891 | |
| **finans** pazar zekâsı motoru `#mkStage` | 8 perde yatay kayar (ham veri → sinyal → harcama eğrisi → risk → davranışsal motor → karar → kampanya → dünya haritası); kablolar `offsetLeft/Top` ile ölçülür; harita `mkMap`/`QG` ile; **İKİNCİ PİN 4.4** (`index.html:8137-8263`, `mdraw` 8611-8692, `kabloKur` 8536-8604, `mkMap` 7687-7871, ST 8702-8713) | Aynı 8 perde, aynı eşikler; kablolar ada ölçer; şerit anahtar kareyle; amblem/kıvılcım IO kapılı (`MotorSahne.astro`, 931 satır) | aynı | **ada** (ölçüm + amblem kapısı) | **kaydırma (pin 4.4 + scrub)** iki tarafta; amblem **IO otomatik** | eski 7687-7871 + 8137-8263 + 8536-8692 (~500 satır) · yeni **2.326 B** | |
| **finans** teslimat anatomisi (`deliverStage`, `det.deliver`) | Tel/çip açılışlı teslimat bloğu (`index.html:7941-8136` ~196 satır, IO `.tpbox` 8097-8100) | — | yenide kaybolmuş | eski: `.tpbox` IO | **IO otomatik** | eski 7941-8136 | |
| **finans** TradeSelf amblemi | `engineLab` 3 katmanlı dönen amblem (`index.html:8232`, CSS 3544-3587) | Aynı 3 katman, IO kapılı (`HizmetGovde.astro:107-109`) | aynı | **ada** (`.tsa` aynı kapı) | **IO otomatik** | 298 B içinde | |
| finans sayfa toplamı | — | 248.205 B (en ağır hizmet sayfası) | — | — | — | **3.181 B** | |

---

## 4. `/projeler` (arşiv)

Eski: `#prjall` (`index.html:4744-4755`) + `projectsArchiveKur` (10926-11133, `kapiliKur` kaydı 11133).
Yeni: `pages/projeler/index.astro` → `parcalar/ProjeDizin.astro`. Çıktı 55.765 B, satır içi JS **1.454 B**.

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| geri bağı + künye ("Arşiv") + h1 + sayaç + lede | `index.html:4745-4752`; sayaç `#msnCount` JS ile | Derlemede (`ProjeDizin.astro:110-125`) | aynı | statik | yok | 0 | |
| sektör filtre çipleri (`#msnFilter`) | Etiketin ilk parçasından türeyen çipler, JS filtresi (`index.html:4753`, `chipsRender` 11032-11054) | Aynı çipler; süzme **radyo + `:has()`**, JS yok (`ProjeDizin.astro:79-105`, `suzKural`) | aynı | eski: `projectsArchiveKur` · yeni: **statik** | yok | eski 11032-11054 · yeni **0** | |
| masonry ızgara (`#msn`) | Mutlak konumlu masonry, sütun sayısı `host.clientWidth`ten (≥1240:4 · ≥920:3 · ≥600:2), kart başına `offsetHeight` okuması (`index.html:4754`, `layout` 11055-11132) | CSS `columns` + **kap sorgusu**; okuma sırası sütun sütun (Enes onayı); sütun tavanı derlemede (`ProjeDizin.astro`) | aynı | eski: `kapiliKur('projectsArchive','#msn')` · yeni: **statik** | eski **IO otomatik** + `resize` · yeni yok | eski 10926-11133 (~208 satır) · yeni **0** | |
| kart imleç parıltısı + konik kenar ışığı + 3B eğim | 7° eğim, %38 parıltı, sönüm .12/.20 (`index.html:1701-1723`, sürücü 10936-10974) | Aynı sayılar; delegasyonlu, yalnız CSS değişkeni yazan, `(hover:hover)+(pointer:fine)` kapılı (`ProjeDizin.astro`) | aynı | **ada** | yok (pointermove) | eski 10936-10974 · yeni **1.230 B** | |
| kart dinlenme filtresi `grayscale(.22) contrast(1.05)` | `index.html:1735` | Aynı (duotone denemesi geri alınmış) | aynı | statik | yok | 0 | |
| görsel odağı (`object-position`) + Bab logo muamelesi | 4 projeye slug bazlı odak (`index.html:1223-1231`) | Odak **varyantın kırpmasına pişirilmiş**; logo muamelesi CSS'te (`ProjeDizin.astro:56-63`) | aynı | statik | yok | 0 | |
| kızıl dış gölge (kart) | — (`index.html:1692-1699`da yok) | `ProjeDizin.astro:386` | yenide eklenmiş | statik | yok | 0 | |

---

## 5. `/projeler/<slug>` — 7 proje detayı

Eski: `#projedetay` (`index.html:4991-4999`) + `detail()` (11773-11797).
Yeni: `pages/projeler/[slug].astro` → `parcalar/ProjeGovde.astro`. Çıktı ~39.521 B, satır içi JS **224 B**.

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| geri bağı → `/projeler` | `index.html:4992` | `ProjeGovde.astro:55-59` | aynı | statik | yok | 0 | |
| künye + h1 + lede | `#pdTag`/`#pdName`/`#pdLede` JS ile (`index.html:4994`, 11776-11778) | Derlemede (`ProjeGovde.astro:61-65`) | aynı | eski: `detail()` · yeni: **statik** | yok | eski 11773-11797 · yeni 0 | |
| hero görseli `.pdhero` | 16/7 kutu, `grayscale(.3) contrast(1.06)` CSS filtresi; görsel yoksa baş harfler `.mk` (`index.html:4995`, 11779-11781, CSS 2260-2263) | Aynı kutu; **gri/kontrast dosyaya pişmiş** (CSS `filter` yok), `eager`+`fetchpriority=high` LCP adayı; künyesiz proje görselsiz basılır (`ProjeGovde.astro:67-72`) | aynı | statik | yok | 0 | |
| meta şeridi (Yıl · Kapsam · Süre · Kanallar) | `.steps`>`.step` JS ile (`index.html:4996`, 11782-11786) | `<dl>` semantiğiyle, `order` ile aynı görünüm (`ProjeGovde.astro:74-83`) | aynı | statik | yok | 0 | |
| içerik blokları | `blocks` panelden HTML, JS basıyor (`index.html:11788-11790`) | Derlemede, `suz()` beyaz listesinden geçer; başlıklar `<h2>` (kaynak `<span class="mono">`) (`ProjeGovde.astro:85-90`) | aynı | statik | yok | 0 | |
| sonuç rakamları (`res`) | `index.html:11791-11793` | `ProjeGovde.astro:92-96` | aynı | statik | yok | 0 | |
| "Sonraki proje" | Kaynak sırasında bir sonraki, sonda başa döner (`index.html:11794-11796`) | Aynı kural (`ProjeGovde.astro:98-105`) | aynı | statik | yok | 0 | |

---

## 6. `/otomasyon`

Eski: `#ajan` (`index.html:5015-5243`) — beş blok. Yeni: `pages/otomasyon.astro` → `parcalar/OtomasyonGovde.astro` (958 satır). Çıktı 86.381 B, satır içi JS **5.009 B**.

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| geri bağı + künye + h1 + lede | `index.html:5016-5022` | `OtomasyonGovde.astro:102-106` | aynı | statik | yok | 0 | |
| akış diyagramı — 3 kolon (`#flow`) | Gelen/Ajan/Çıkan; **tamamı JS ile kuruluyor** (IN/OUT/STEPS haritaları kodda, bot hiçbir adı görmüyor) (`index.html:5023-5051`, `flowKur` 10492-10653) | Üç kolonun içeriği derlemede HTML'de; düğüm yapısı kaynağın `.fnode` birebiri (`OtomasyonGovde.astro:113-172`) | aynı | eski: `kapiliKur('flow','#flow')` 10653 · yeni: **statik** | eski **IO otomatik → rAF** (10644-10645) + ST scrub .5 (12461-12463) · yeni **kaydırma (view, `--fyt`)** | eski 10492-10653 (~162 satır) · yeni **0** | |
| akış telleri (SVG bağlantılar) | `gBCR` ile ölçülüp rAF paketleriyle canlandırılıyor (`index.html:10553-10600`) | Uçlar aynı künyeyle ölçülür (rAF **dışında**: kurulum + resize 180 ms + `fonts.ready`); paketler yerine CSS `pathLength` çizilme (`OtomasyonGovde.astro:311-380`) | aynı | **ada** | **kaydırma (view)** | eski 10553-10600 · yeni **1.760 B** | |
| "Canlı iş akışı" şeridi + "N talep işlendi" sayacı + sektör bağlama | `#flowSec`, `#flowN`, `.ff` (`index.html:5024-5027, 5048-5051`) | — (bilinçli: "statik sayfada sahte canlılık iddiası olur", `OtomasyonGovde.astro:11-17`) | yenide kaybolmuş | — | — | eski 10492-10653 içinde | |
| doğru model (`.mfst`) | Künye + h2 + 3 adım + 4 kazanç + kapanış + CTA (`index.html:5052-5081`, CSS 2713-2791) | Birebir aynı içerik (`OtomasyonGovde.astro:174-193`) | aynı | statik | yok | 0 | |
| bir gün anlatısı (`#gnSec`) | 6 satırlık ray, saat + başlık + metin (`index.html:5082-5116`, CSS 3001-3068) | Aynı 6 satır (`OtomasyonGovde.astro:195-227`) | aynı | statik | eski IO `.rv` · yeni yok | 0 | |
| sızıntı sahnesi (`#szStage`) | Canvas tanecikli huni + 4 sızıntı kartı + 3 aşama + kanal çipleri + maliyet çubukları; **PİNLİ sahne** `+=2.2vh` (`index.html:5117-5178`, `sizintiKur` 10667-10808, ST 12470-12477) | Metnin tamamı statik; huni geometrisi **ada ölçüp SVG basar**; çubuklar son değerle basılı; eşikler kaynağın 10785-10795 formülleri birebir (`OtomasyonGovde.astro:229-272`) | aynı | eski: `kapiliKur('sizinti','#szStage')` 10808 · yeni: **ada** (yalnız SVG geometri) | eski **kaydırma (PİN 2.2 + scrub .5)** + IO→rAF (10800-10802) · yeni **kaydırma (view, `--szt`) — PİN YOK** | eski 10667-10808 (~142 satır) · yeni **1.949 B** | |
| sızıntı tanecikleri (canvas rAF) | `#szCv`, phyllotaxis dağılım, sürekli akan tanecikler (`index.html:10732-10799`) | — | yenide kaybolmuş | eski: `sizintiKur` | **IO otomatik → rAF** | eski 10732-10799 | |
| sızıntı **pini** | `pin: szw, +=innerHeight*2.2` (`index.html:12470-12477`) | — (açık madde D2c; bölüm 100vh'ye sığmıyor) | yenide kaybolmuş | — | — | eski 12470-12477 | |
| huni hesabı (`#hsSec`) | 6 kaydırıcı + 5 basamaklı akış + kaçan/yıllık/ciro rakamları (`index.html:5179-5241`, `hesapKur` 10815-10858) | İskelet ve **varsayılan rakamlar derlemede** (`src/huni.mjs`, testli); JS yalnız kaydırıcı dinler, açılışta sıfır iş (`OtomasyonGovde.astro:274-309` + ada) | aynı | eski: `kapiliKur('hesap','#hsSec')` 10858 · yeni: **ada** | yok (input) | eski 10815-10858 · yeni **1.076 B** | |

---

## 7. `/surec`

Eski: `#surec` (`index.html:5246-5266`) + `chan()` (10860-10920) + `renderSteps` (7199-7229).
Yeni: `pages/surec.astro` → `parcalar/SurecGovde.astro`. Çıktı 38.117 B, satır içi JS **224 B**.

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| geri bağı + künye + h1 + lede | `index.html:5247-5253` | `SurecGovde.astro:35-39` | aynı | statik | yok | 0 | |
| müşteri yolu çizgisi (`#chan`) | SVG Bezier; yol, 5 düğüm ve etiketler **JS ile** doğuyor (bot hiçbirini görmüyor); `getTotalLength`/`getPointAtLength` ile çizim + gezen nokta (`index.html:5254-5263`, `chan()` 10860-10920, ST 12480-12485) | Aynı sabitlerle eğri **derlemede** hesaplanır; çizilme `pathLength="1"` + `@property --yt`; nokta `offset-path` (`SurecGovde.astro:49-65`, CSS 89-126) | aynı | eski: `chan` doğrudan · yeni: **statik** | eski **kaydırma (scrub .5, top 90%→bottom 55%)** · yeni **kaydırma (view, cover 5%→55%)** | eski 10860-10920 · yeni **0** | |
| 5 aşama kartı (`#stepBox`) | `renderSteps` JS ile basıyor (`index.html:5264`, 7199-7229) | Derlemede `<ol>` (`SurecGovde.astro:67-80`) | aynı | eski: `renderSteps` · yeni: **statik** | eski IO `.rv` | eski 7199-7229 · yeni 0 | |
| kapanış "Konuşalım" düğmesi | — | `SurecGovde.astro:82-84` (`.sus-isik`) | yenide eklenmiş | statik | yok | 0 | |

---

## 8. `/sss`

Eski: `#sss` (`index.html:5342-5349`) + `renderFaq` (7356-7362).
Yeni: `pages/sss.astro` → `parcalar/SssGovde.astro`. Çıktı 35.857 B, satır içi JS **224 B**.

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| geri bağı + künye + h1 | `index.html:5343-5347` | `SssGovde.astro:20-24` (+ sayaç eklendi) | aynı | statik | yok | 0 | |
| SSS akordeonu (`#faqBox`) | JS ile basılan liste, JS ile açılan akordeon (`index.html:5348`, 7356-7362, CSS 2297-2317) | Native `<details>` — JS'siz de açılır (`SssGovde.astro:26-33`) | aynı | eski: `renderFaq` · yeni: **statik** | eski IO `.rv` · yeni yok | eski 7356-7362 · yeni **0** | |
| soru sayacı `(N)` | — | `SssGovde.astro:23` | yenide eklenmiş | statik | yok | 0 | |
| kapanış "Konuşalım" düğmesi | — | `SssGovde.astro:36-38` | yenide eklenmiş | statik | yok | 0 | |

---

## 9. `/bulten` (dizin)

Eski: `#bulten` (`index.html:5367-5390`) + `renderPosts` (7292-7305) + `bkFilter` (7275-7291) + `subscribeKur` (11453-11480).
Yeni: `pages/bulten/index.astro` → `parcalar/BultenDizin.astro`. Çıktı 40.397 B, satır içi JS **224 B**.

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| geri bağı + künye + h1 + sayaç + lede | `index.html:5368-5376` | Başlık + sayaç + lede (`BultenDizin.astro:42-46`); **geri bağı yok** | aynı | statik | yok | 0 | |
| sektör filtre çipleri (`#bkFilter`) | Etiket haritası `BKC` kodda, JS filtresi (`index.html:5377`, 7275-7291) | — (bilinçli: harita `content.json`da yok, sessizce bayatlar; sektör bilgisi kart künyesinde duruyor) | yenide kaybolmuş | eski: `bkFilter` | yok | eski 7275-7291 | |
| yazı kartları (`#bkList`) | `renderPosts` JS ile basıyor (`index.html:5378`, 7292-7305) | Derlemede, **tarihe göre** yeni→eski; tarih elle biçimlenir (Node ICU farkı) (`BultenDizin.astro:48-58`) | aynı | eski: `renderPosts` · yeni: **statik** | eski IO `.rv` | eski 7292-7305 · yeni **0** | |
| abone formu (`#subForm`) | E-posta + honeypot + Netlify Forms; `fetch` gönderim + satır içi "kaydettik" mesajı (`index.html:5379-5389`, `subscribeKur` 11453-11480) | Aynı form, aynı honeypot, aynı `bulletin` form adı; **native POST** — ada JS'i 0, gönderen Netlify teşekkür sayfasını görür (`BultenDizin.astro:60-72`) | aynı | eski: `kapiliKur('subscribe','#subForm')` 11480 · yeni: **statik** | yok | eski 11453-11480 · yeni **0** | |

---

## 10. `/bulten/<slug>` — 6 yazı

Eski: `#bultendetay` (`index.html:5393-5412`) + `postDetail` (7306-7331) + `buildRail` (7332-7355).
Yeni: `pages/bulten/[slug].astro` → `parcalar/YaziGovde.astro`. Satır içi JS **224 B**.

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| geri bağı → `/bulten` | `index.html:5394` | — | yenide kaybolmuş | statik | yok | 0 | |
| meta şeridi (etiket · tarih · okuma süresi) | JS ile (`index.html:5396`, 7311-7315) | Derlemede (`YaziGovde.astro:16-20`) | aynı | statik | yok | eski 7306-7331 · yeni 0 | |
| başlık + lede + gövde bölümleri | `#bdTitle`/`#bdLede`/`#bdBody` JS ile (`index.html:5397-5399`, 7316-7321) | Derlemede, bölümler `[başlık, html]` çiftleri (`YaziGovde.astro:15,21-27`) | aynı | eski: `postDetail` · yeni: **statik** | yok | 0 | |
| kaynaklar (`#bdSrc`) | JS ile, `↗` işaretli dış bağlantı (`index.html:5400`, 7322-7328) | Derlemede `<ul>` (`YaziGovde.astro:28-35`) | aynı | statik | yok | 0 | |
| "Diğer yazılar" kayan şeridi (`#bdRail`) | Sıradaki yazıdan başlayıp başa dolanan şerit + ok düğmeleri + `disabled` senkronu (`index.html:5401-5410`, `buildRail` 7332-7355) | — | yenide kaybolmuş | eski: `buildRail` | yok | eski 7332-7355 | |

---

## 11. `/iletisim`

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| ayrı iletişim rotası | **Yok** — rota tablosunda karşılığı yok (`index.html:11651-11685`); CTA `#iletisim` ve form `#lead` ana sayfa bölümleri, `data-r="lead"` ile açılıyor | **Yok** — `SILIletisim` ana sayfada bölüm (`#iletisim` + `#lead` çıpaları) | aynı | — | — | — | |

---

## 12. `404`

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| 404 sayfası | Ana sayfanın **tam kopyası** + değiştirilmiş `<title>` + `noindex`; ROUTER tanınmayan adresi `home`a düşürür, ziyaretçi ana sayfayı görür (`build.js:798-804`, `_redirects` kuralı 795-796) | Kendi sayfası: `404` + "Bu sayfa burada değil" + ana sayfaya dönüş düğmesi (`pages/404.astro:11-16`) | aynı | statik | yok | eski = tüm ana sayfa yükü · yeni **224 B** (29.250 B HTML) | |
| `/yeni/404.html` için `noindex` başlığı | `_headers` deseni yalnız kök `/404.html`i kapsıyor (TUR4 §4) | Sayfa `noindex` meta taşıyor (kabuk geneli) ama `_headers` boşluğu duruyor | aynı | — | — | — | |

---

## 13. YENİDE DOĞAN, ESKİDE HİÇ OLMAYAN BİLEŞENLER

TUR4-SOKUM-KESIF.md §3'ün listesi + sayfa taramasında bulunanlar. ESKİDE sütunu her satırda `—`.

| bölüm | ESKİDE NE VAR | YENİDE NE VAR | FARK | ada/statik | sürücü | JS maliyeti | KARAR |
|---|---|---|---|---|---|---|---|
| **/film rotası** | — (eski rota tablosunda yok: `index.html:11651-11685`) | 39 kliplik scroll-scrub film iskeleti; `<video>`larda `src` yok, motor Blob verir; `reduced-motion`/JS'siz yolda **hiç video inmez**, 39 poster düz sütun (`pages/film.astro`, `parcalar/Film.astro:128-205`) | yenide eklenmiş | **ada** (harici modül) | **kaydırma (scrub, `PX_SN` + sönüm)** | nav 224 B + `Film.astro_…js` **8.232 B** + `motor.CDgxg5-r.js` **11.003 B** + `gecis.Be_ieyFZ.js` **3.004 B**; HTML 345.102 B | |
| /film gövdesi = eski sitenin girişi | — | Kök `index.html`in `<style>` + `<nav id="nav">` + `<section id="hero">` bloğu **derlemede regex'le çekilip** Declarative Shadow DOM'a gömülür; kaynak değişirse gömüm değişir, çekim bozulursa derleme kırmızı (`parcalar/EskiGiris.astro:26-61`) | yenide eklenmiş | statik (DSD) | tubes devir sonrası motorda | 0 (gömülü markup) | |
| **/hukuki rotası** | — (eskide KVKK metni modalda) | `content.json legal.kvkk` içeriği kendi sayfasında (`pages/hukuki.astro`) | yenide eklenmiş | statik | yok | **224 B**, 32.135 B HTML | |
| **/deneme-react rotası** | — | React + motion adasının bütçe ölçüm zemini; GEÇİCİ, silinecek (`pages/deneme-react.astro`, `parcalar/DenemeAda.tsx`) | yenide eklenmiş | **ada** (`client:visible`) | yok | nav 224 + hidrasyon 372 + ada 3.462 B satır içi + `client.mHSpsdgU.js` **186.794 B** + `DenemeAda.m4xWBozS.js` **124.080 B** | |
| **S2 · Kayıp** sahnesi | — (kendi başlığında "content.json'da karşılığı yok" yazılı) | Ana sayfa, 5 duraklı talep yolu (`sahneler/S2Kayip.astro`; `index.astro:87`) | yenide eklenmiş | statik | **kaydırma (view)** | 0 | |
| **S3 · Mekanizma** sahnesi | — | Ana sayfa, 5 adımlı ajan mekanizması (`sahneler/S3Mekanizma.astro`; `index.astro:88`) | yenide eklenmiş | statik | **kaydırma (view)** | 0 | |
| **S5 · Süreç** sahnesi + `.s5-adim` kutusu | — | Ana sayfa, 4 adım + "marka kimliği 14 gün" sözü (`sahneler/S5Surec.astro`; `index.astro:93`; kutu `stil/ana.css:99,103-104`) | yenide eklenmiş | statik | yok (H1) | 0 | |
| **S6 · Sektör** sahnesi + `.s6-kart` kutusu | — | Ana sayfa, 3 öne çıkan sektör kartı (`sahneler/S6Sektor.astro`; `index.astro:94`; kutu `stil/ana.css:110,54-56,76`) | yenide eklenmiş | statik | yok (H1) | 0 | |
| `.dugme.sus-isik` dönen huzme + parlama | — (mekanizma CSS'te vardı, markup **kullanmıyordu**: `index.html:350-361`, `class="shiny"` → 0 eşleşme) | 6 kullanım noktası: `404.astro:14` · `BultenDizin:71` · `HizmetDizin:121` · `HizmetGovde:212(+333-336)` · `OtomasyonGovde:191,306` · `SILIletisim:50,106` (`stil/temel.css:97-144`) | yenide eklenmiş | statik | yok | 0 | |
| söz kartı üstten parlama + `--line2` kenarlık | — | `stil/sozler.css:118-132` | yenide eklenmiş | statik | yok | 0 | |
| genel düğme hover gölgesi | — | `stil/ana.css:126-127` | yenide eklenmiş | statik | yok | 0 | |
| akış kartı ok ikonu `.sa-ok` | — (`index.html:2661-2664`) | `stil/akis.css:115,136` · `SAAkis.astro:95,106` | yenide eklenmiş | statik | yok | 0 | |
| proje dizini kızıl dış gölge | — (`index.html:1692-1699`) | `ProjeDizin.astro:386` | yenide eklenmiş | statik | yok | 0 | |
| sözler kart görselleri | — (kaynağın `chimg` görselleri 202 KB'tı, iskelet turunda ertelenmişti) | 18 dosya / 158 KB, üç kırılım, hepsi tembel (`SSZSozler.astro:74-81`, `veri/kanal-gorselleri.json`) | yenide eklenmiş | statik | yok | 0 | |
| hizmet detayı giriş demosu (4 sahne) | — | `site`/`tool`/`auto`/`trade` demoları hizmet sayfası girişinde (`HizmetGovde.astro:74-76`) | yenide eklenmiş | **ada** (kapı) | **IO otomatik** | 298 B | |
| hero mobil görsel varyantları | — (eskide tek boy) | `hand-human-m` / `hand-robot-m` (`SHHero.astro:31-32,40-41`) | yenide eklenmiş | statik | — | 0 | |
| self-host yazı ailesi | — (tek Google CDN yüklemesi `index.html:27`) | `font.css` + `font-uret.py`: Nunito Sans · Playfair 500/500i · JetBrains Mono 400 · Uncut Sans 300-700 (yalnız film); Manrope+Inter emekli (`stil/aile.css:4-6`) | yenide eklenmiş | statik | — | 0 (10 woff2) | |
| dizin/detay sayaçları ve kapanış düğmeleri | — | `/sss` soru sayacı · `/surec`, `/sss`, `/hizmetler` kapanış "Konuşalım" düğmeleri | yenide eklenmiş | statik | yok | 0 | |
| kabuk geneli `noindex` | — | `Temel.astro:37` (kesmeye kadar) | yenide eklenmiş | statik | — | 0 | |
| KESME ADAYI işaretleri (4 dosya) | — | `SKKatman` · `SAAkis` · `SSESektor` · `SSZSozler` başlıklarında; bekçi `yeni/denetim.cjs` R13 | yenide eklenmiş | — | — | — | |

---

### Ölçüm notları

- Yeni tarafta **`page.sJrt8mpm.js` (2.253 B)** her sayfaya iner (Astro prefetch); yukarıdaki satır içi rakamlara dahil değil.
- Yeni tarafta hiçbir sayfada GSAP/ScrollTrigger/Lenis yok; eski tarafta üçü de `defer` ile her sayfaya iniyor (`index.html:5514-5516`).
- Eski tarafta **8 kapılı kurulum** kayıtlı (`demandMap · kanal · flow · sizinti · hesap · projectsArchive · subscribe · diag`) + 4 ilk-ekran istisnası (`akLive · akisScroll · clock · tubes`); denetim kural metni "8 kurulum" der (`test/denetim.js:932-936`) — harita sökülürse 8→7.
- `dist/yeni/` çıktısı 3 Eyl 20:39 derlemesinden; ölçümler o derlemeden.
