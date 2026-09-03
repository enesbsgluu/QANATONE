# QANATONE — CLAUDE.md

Bu dosya her oturum açılışında okunur ve iki Claude yüzeyinin sözleşmesidir.
Chat tarafının hafızasından damıtıldı: burada yalnız depodan TÜRETİLEMEYEN
şeyler var — nedenler, acıyla öğrenilmiş tuzaklar, Enes'in kalıcı kararları.
Dosya düzenini, bağımlılıkları, sayfa listesini buraya yazma; depo söylüyor.

## İş bölümü — iki yüzey, bir depo

- **Claude Code (burası):** sistemin arka tarafı — ajan sistemi, veritabanı,
  Netlify fonksiyonları, yayın hattı, git, derleme altyapısı.
- **claude.ai chat:** ön taraf — site sahneleri, metin, tasarım kararları,
  strateji, doktrin. Chat'in hafızası oradadır; oraya taşınacak karar yoktur,
  **karar bu depoya işlenir.**
- Ortak beyin bu depodur. Kalıcı bir karar doğduğunda bu dosyaya TEK satır
  ekle; şişirme — 200 satırı aşan talimat dosyası uyumu düşürür.
- Aynı dosyada eşzamanlı çalışma yok: oturum başında `git pull`, sonunda
  commit + push. Sürümün tek gerçek işareti **damga**dır (`__QBUILD`).

## Oturum ritüeli

1. Açılışta `DEVIR.md`'ye bak — paketin fiziksel durumu orada, elle yazılmaz,
   `build.js` üretir.
2. Gerçek işe girmeden `node build.js` koştur, denetim suite'inin
   **sıfır kalanla** bittiğini gör. Kırık zeminde iş yapılmaz.
3. Oturum sonunda: suite temiz → commit → push. `DEVIR.md` her derlemede
   kendini günceller, elleme.
4. **Her commit mesajının sonuna `[skip ci]` (Enes, 21 Ağu)** — Netlify
   derlemesi commit'le değil Enes'in sözüyle tetiklenir. Yalnız Enes
   **"yayınla"** dediğinde işaretsiz commit atılır; itilen yığının BAŞ
   commit'i işaretsizse Netlify tüm yığını derler, ara commit'lerin
   işareti yayını geciktirmez.

## Değişiklik disiplini — pazarlıksız

- Düzenlemeden önce dosyanın o bölümünü **oku**; yamayı **tek eşleşme**
  kuralıyla uygula (çapa kısa ve benzersiz — uzun çapa komşu değişiklikte
  sessizce düşer, üç kez yaşandı).
- Her değişiklikten sonra sözdizimi + davranış doğrulaması; iş ancak
  `node build.js` **sıfır kalan** ile bittiğinde biter.
- **Her düzeltme `test/denetim.js`'te kalıcı bir kurala dönüşür.** Kural
  yazarken ham metin regex'i değil DOM üzerinden ölç — `<script>` içindeki
  şablon elementmiş gibi eşleşir, yanlış yeşil verir. Yanlış yeşil, yanlış
  kırmızıdan tehlikelidir.
- Ölçmediğin rakamı söyleme; "oldu" demeden önce kanıtı göster.
- Kanıtlanamayan iş "bitti" değildir — bulgu olarak raporlanır.

## Kırmızı çizgiler — Enes'in kalıcı kararları

- **Uydurma rakam yazılmaz.** Metrik, müşteri sözü, sektör rasyosu, kapasite
  iddiası — kaynak yoksa alan boş kalır, Enes verene kadar bekler.
- Sitede React yok (tek dosya akışı korunur); TradeSelf panelinde serbest.
  Three.js yalnız tüp katmanında. `framer-motion` bilinçli duruyor —
  kaldırmayı önerme.
- **Enflasyon testi:** yeni sahne/animasyon/özellik, sayfada zaten anlatılan
  bir şeyi tekrar ediyorsa eklenmez.
- **Sadakat kuralı (21 Ağu):** sahne kıyası yan yana ekran karesi + yazılı
  fark listesiyle yapılır; kaynakta olmayan görsel öğe eklenmez (kutu/
  çerçeve/ikon/tik/düğüm/parlama/gölge — kaynak çıplaksa yeni de çıplak);
  künyeler kompozisyon sütunu taşır (kap·ayraç·ikon·vurgu); iki öğeyi
  birleştiren hiçbir şey göz kararı çizilmez — ya kaynaktan okunur ya
  ölçülür. Ayrıntı `TASARIM-A3-KUNYE.md` bölüm 0.
- **Süreç demoları görünürlükte canlı (Enes, 3 Eyl 2026 — önceki "sürücü
  ayrım kuralı"nı DEĞİŞTİRİR):** akış/otomasyon demoları kaydırdıkça
  ilerlemez; bölüm kadraja girince kendi ritminde sonsuz döner, çıkınca
  durur (eski sitenin `#akis.aklive` deseni). Doku, amblem, dekor serbest.
  Kaydırma çizelgesine bağlı kalan tek şey film/deste gibi kaydırmanın
  kendisini anlatan sahneler. Bekçi `olc-surucu.cjs` bu kurala göre
  yeniden yazıldı (3 Eyl: 63 sayfa GEÇTİ, kırmızı-önce iki tuzak; H11
  ayağı reduced-motion altında koşan animasyonu da yakalar — dersi:
  animasyon sözde öğeye (::before) taşınınca durduran liste de taşınır).
- **Ana sayfa eski düzen, yeni mimari (Enes, 3 Eyl 2026):** bölüm sırası ve
  her bölümün ölçüsü kök `index.html`'den birebir okunur; eskide olmayan
  öğe (anlatı sahnesi, numaralı etiket, kızıl nokta, halka) eklenmez.
  Kanıt yan yana kare + ölçülmüş fark listesi (`olc-tipografi.cjs`,
  `kontak-tasarim.cjs SECICI_*`). R13'ün dört bölümü GERİ geldi (Enes
  3 Eyl akşam: "eski siteyi komple al"); R13 kök sırayı tutar. Kabuk da
  kaynağın katmanlarıyla birebir: `#bg` (fade/orb/grid) her kabuk
  sayfasında, ana sayfa dahil (+71,5 ms LCP ölçüldü, karar Enes'te).
  Sektörde varsayılan seçim yok, pano seçilene kadar gizli (kaynak).
  Bilinçli tek sapma yazı ailesi (Uncut Sans; aile.css).
- **TASARIM ANAYASASI (3 Eyl 2026, `Intel/Downloads/TASARIM-ANAYASASI.md`):**
  eski site kaynaktır, farklı olan her şey KAPALI istisna listesinde
  olmalı (yazı ailesi · kızıl harita yok · sürücü · prolog · mimari ·
  erişilebilirlik · görünümü değiştirmeyen performans · Enes'in saydığı
  fazlalıklar · sahte canlılık yok · **10** projeler arşivi CSS sütunları ·
  **11** gerçek referans kartında metrik yok — 10 ve 11 Enes'in 4 Eyl açık
  sözüyle eklendi). Listede olmayan sapma kırmızı; şüphede
  DUR ve "İSTİSNA TALEBİ" kalıbıyla sor. AÇIK ÇELİŞKİ: belgenin istisna 3'ü
  "süreç hareketi kaydırmaya bağlanır" der, Enes'in 3 Eyl sözü
  "görünürlükte canlı" — sözü esas alındı, hüküm Enes'te.
- **Prolog ana sayfada (3 Eyl 2026, istisna 4):** `Film sayfa="ana"` gövdenin
  önünde, gövde `.fl-govde` sarmalında; devir bitince film sökülür, site
  0'dan akar (`siteyeGec`); atlama/oturumda bir kez/hareket azaltma kararı
  ilk yerleşimden önce satır içi betikle (CLS dersi). Kabuk navı film
  boyunca gizli. Prologlu ana sayfada bekçi tavanları: J1 ana+film, H18/H24
  28 KB, H1 `fl-`, H12 film betiği dışarıda — ENES ONAYI BEKLİYOR.
- **Film önündeyken odak filmin içinde (4 Eyl, FM3):** prolog öndeyken belge
  122.000 px uzun; `#fl-govde` DIŞINDA kalan kabuk katmanları (atlama bağı,
  `#nvAc`, nav, lead, footer) tab sırasında kalırsa Tab 121.364 px aşağıdaki
  bağa gider ve tarayıcı o dev belgeyi yerleştirir — ölçüldü 232/304/264 ms,
  `inert` ile 136/168/120. İnert'i **ana sayfanın erken satır içi betiği**
  kurar (modüle konursa `/film`'in J1 tavanı 158 B aşılıyor), `fl-js`
  düşünce MutationObserver geri alır. `.fl-gec` asla kapsamda değil (FM2).
  **Dün "film etkinken INP 256-304 ms" diye yazılan rakam buydu**; motorun
  işi değildi. Ölçen araç `olc-gec-inp.cjs` (Event Timing, gerçek girdi).
- **CLS'in kökü yazı tipi takasıydı (4 Eyl, F1d):** ön yükleme YALNIZ ana
  sayfadaydı; öbür 58 sayfada Uncut ilk boyamadan sonra gelip satırları
  yeniden sarıyordu. Bir bülten yazısı **soğuk önbellekte üç kez 0,1588**
  (sıcakta 0, font reddedilince 0) — 3 Eyl'in "0,1622 aykırı değeri" buydu,
  tekrar etmemesinin sebebi koşumun sıcak önbellekle dönmesiydi. Üç ayaklı
  düzeltme: (a) her kabuk sayfası gövde fontunu ön yükler, (b) yığında ölçü
  eşlenmiş yedek yüzler (`size-adjust` **ölçülerek** bulunur — OS/2
  `xAvgCharWidth` türevi Arial'de %128,68 diyordu, gerçeği %99,20), (c)
  `.lede`nin `62ch`i `em`e çevrildi: **`ch` kutuyu yazı tipine bağlar.**
  TOPLU `ch→em` ÇEVİRME YANLIŞ: Uncut değişken font, `0` genişliği ağırlığa
  göre değişiyor (gövde 0,646 · footer 0,634) ve blanket çevirme iki yerde
  satır sayısını değiştirdi. Ölçen araçlar `olc-cls-kosul.cjs` (soğuk/sıcak/
  font-geç/font-yok/yavaş/süpür kolları) ve `font-yedek-olc.cjs`.
- **CLS ölçüm dersi (3 Eyl):** yatay taşma (scrollWidth > viewport) klasik
  kaydırma çubuğu olan tarayıcıda çubuk belirip kaybolunca sabit katmanları
  oynatır ve büyük CLS üretir; headless overlay çubukta görünmez. Taşma
  ikili aramayla bulunur (çocukları gizleyip scrollWidth'e bak).
- **LCP: kapı 2,5 sn (Core Web Vitals), 2,0 sn HEDEF (Enes, 3 Eyl):** kapı
  geçilmezse tur kapanmaz; hedef geçilmezse yalnızca daha iyisi yapılamamıştır.
  2,0 kapı sayılıp başka yerden (tasarımdan) ödün verilmez.
- **Kabuk lead formu (3 Eyl, anayasa):** kaynakta `#lead` her rotada en sonda
  (11742); `LeadKutu.astro` tek parça, `Temel.astro` footer önüne basar,
  gövdesinde basan sayfa `lead={false}` verir. Gönderim betiği J1 dışı kabuk
  kalemi. `.kunye` etiketi global (temel.css; kaynakta `.mono` global).
- **Hizmet detayı giriş demosu YOK (3 Eyl, anayasa):** kaynağın detay
  sayfasında `akd` demoları yoktu (yalnız ana sayfa şeridi); `.hd-demo` kalktı.
  Detay sayfalarında animasyon = kaynağın kendi sahneleri (Tırmanış/huni/akış/
  platform/canlı işler), kareleri ve sürücüsü kaynaktan.
- **Mobilde prolog yok (Enes, 3/4 Eyl):** ana sayfa telefonda doğrudan siteyi
  gösterir. Karar TEK yerde verilir: satır içi erken betik `data-film="mobil"`
  yazar, modül onu görünce hiçbir şey kurmaz, CSS aynı kapıyı ayrıca tutar.
  Modül kendi ölçümünü kurarsa `/film` sayfasının JS tavanı aşılır.
- **Yazı ailesi (anayasa istisna 1):** Uncut Sans her alan; tek istisna ana
  sayfa hero başlığı. Kaynakta Playfair olan bir başlığı taşırken aile
  `--f-baslik` tokenine bağlanır, ölçüler (boy, ağırlık, satır aralığı)
  kaynaktan kalır. Playfair'i geri yazmak istisna listesini deler.
- **Ana sayfa destesi dört kart** (kaynak `DESTE_PROJE=4`); tam arşiv
  `/projeler`'de. Deste rayının boyu kart sayısıdır: kart yüksekliği, marj
  ve sticky üst zaten birebirdi, altı kart 972 px fazla ray demekti.
- **Ölçüm düzeneği: eski ağaç kendini çalışma anında kurar.** Uzun turda
  (100+ yükleme) yarım ölçülür ve sahte sapma üretir. Üç kalıcı kural:
  (a) bekleme ölçütü süre değil KARARLILIK (yapısal sinyal iki okumada aynı),
  (b) varlık kümesi opaklığa bakmaz (eski ağaç `.rv` ile opacity 0 doğar),
  (c) kabuk öğeleri (nav/footer) SİTE GENELİ kümede aranır — bir sayfada
  görüldüyse vardır. Tek sayfa koşumu temizken tur kirliyse sebep budur.
- **Kilitli sahnede kare almak (`olc-kilitli.cjs`):** yan yana kare çalışmaz,
  iki farklı scrollY aynı kareyi verebilir. Sahnenin KENDİ ilerlemesi okunur,
  etkin aralık ölçülür (formül iki ağaçta farklı), p=0..1 örneklenir, her
  adımda değer DURULANA kadar beklenir (eski ağaçta scrub var). CSS sayacı
  `::after` içeriği `textContent`e girmez ve `getComputedStyle` sayacı çözmez
  — değer `counterReset`ten okunur.
- Fiyat/paket bloğu yok. Gerçek referans kartlarına metrik yazılmaz.
- Kaynak ile çıktı aynı yerde durmaz: kaynak kökte, çıktı `dist/`,
  önbellek `.onbellek/`. Üreteç bir kez kendi kaynağının üzerine yazdı.
- `content.json` panelin ürünüdür, KAYNAKTA durmaz — ama derleme onu
  `dist/`e her zaman basar (sitenin kendi varsayılanından); panel
  yayınlarsa onun dosyası ezer. Yoksa `/content.json` 404 olur ve
  panelden yönetilen her ayar sessizce ölür — 2026-08'de üç ay öyle döndü.
- Forma istemci zaman damgası EKLENMEZ: gönderenin değiştirebildiği alan
  kanıt değil yanlış güven üretir; güvenilir zaman Netlify'ın `created_at`'i.
  Onay/sürüm gibi alanlar tanımlayıcıdır, kanıt değildir.
- Panel yayın çıktısında statik dosya olarak DURMAZ: `/admin.html`
  zorlamalı yönlendirmeyle `functions/panel.js`'e düşer, Basic Auth
  aynı `PANEL_PAROLA_HASH`'i ölçer. Tek sır, iki kapı.

## Tuzaklar — hepsi yaşandı

- rAF döngüsü içinde düzen okuma (getBoundingClientRect, offsetWidth,
  getComputedStyle, scrollTop) sayfayı kilitler → ölçümü döngü DIŞINDA al,
  önbellekle.
- Ölçüm aracının maliyeti kare bütçesinin altında kalmalı — tanı paneli
  kare başına düzen okuyup altı turluk ölçümü kirletti.
- IIFE'ler applyTheme'den önce koşar → sınıf tabanlı guard yerine
  başlat/durdur fonksiyonu deseni (`__starsInit` gibi).
- `delete window.x` sonraki kodu ReferenceError'a düşürür → değeri geri yaz.
- Çok bloklu at-rule silerken parantez sayarak kes — `[^}]*` iç bloğun ilk
  `}`'inde durur, yetim parantez bırakır.
- Minified betik satır içine alınırken IIFE'ye sar — `const T` çakışması.
- Önbellek imzası üreteci de kapsar (`uretecOzet`); build.js değişince tam
  derleme normaldir (~150 sn), değilse ~45 sn.

## Mimari NEDEN'leri — koddan okunamayanlar

- Prerender jsdom'la sitenin KENDİ render fonksiyonlarını koşturur çünkü
  şablonu Node'da yeniden yazmak aynı içeriğe iki üreteç doğururdu
  (tek kaynak ilkesi).
- Statik çıktı şart çünkü AI tarayıcıları JS çalıştırmıyor (GPTBot,
  ClaudeBot, Perplexity; istisna Gemini). Saf statik HTML, WordPress dahil
  her dinamik yığını SEO/GEO'da yener — bu ölçüldü, tartışma kapalı.
- `/en/` ayrı dosyadır çünkü `?lang=en` sunucuda dosya değiştirmez, bot
  Türkçe HTML alır.
- `shell.html` statik sayfalara yalnız kendi bölümlerini koyar; yoksa 58
  sayfa aynı 21.000 karakteri taşır (kopya içerik cezası).
- IndexNow var (Bing/Yandex → dakikalar, GEO'ya da yarar); Google'a anlık
  indeksleme yolu kimsede yok; `llms.txt`'ye zaman harcanmaz.

## Sırlar

WA_TOKEN, WA_PHONE_ID, INDEXNOW_KEY ve benzerleri **yalnız ortam
değişkeninde** yaşar: koda, log'a, commit'e girmez; paylaşılan çıktıda
`<GIZLI>` ile maskelenir. Şüphede: maskele, sonra sor.

## Doktrin — üç kapı

Her teklif, sayfa, otomasyon ve yığın kararı üç satır taşır:

```
Kanal   : <bağlanan araç + hangi yanı üstün, ölçümüyle> | <kıt bölge: neden>
Davranış: <mekanizmanın adı> ← <rasyonun kaynağı | "rakam yok">
Kıtlık  : <sektör | veri | dağıtım> | <nakit işi>
```

Üç satır yazılamıyorsa karar olgunlaşmamıştır; eksiği uydurmak yerine eksik
olduğunu söyle. Ayrıntı `qanatone-doktrin` becerisinde.

## Ajan sistemi — arka tarafın ana işi

- Spesifikasyon: `AJAN-HOLDING.md` — ajan işine girerken **önce onu oku.**
  İnşa sırası dokuz fazdır, **faz atlanmaz**, Faz 0 omurgadır.
- **Faz 0 kapandı (2026-08-11)** — omurga sözleşmesi `holding/CLAUDE.md`'de,
  AJAN-HOLDING'den `ajan-yazimi` ilkeleriyle türetildi; ajan yazmadan önce
  o dosyayı oku.
- Omurga: Node + Postgres(pgvector) + Redis; model API ile başlar ve
  değiştirilebilir kalır — model emtiadır, fark yöntem + veridedir.
- Ajan, kurum belleğine tek başına yazamaz. Obsidian kasası tek yönlü
  okunur: kasa → gömü → ajan; ajan kasaya yazamaz.
- Her faz ancak çalışırken kanıtlandığında kapanır: `docker compose up` +
  duman testi; kanıtsız faz açık kalır.
- Müşteri verisi ayrık tutulur; test verisi gerçek müşteri verisi değildir.

## Koşullu okuma — işaretçiler

- `DEVIR.md` — paketin anlık durumu; her açılışta kısa bak.
- `TEST.md` — denetim felsefesi; kural yazarken oku.
- `NETLIFY-KURULUM.md` — deploy/ortam işine girerken oku.
- `AJAN-HOLDING.md` — ajan sistemi işine girerken oku.
- `olcum-sozlugu.md` — ÖLÇÜM/red-flag/metrik işine girerken oku; tek
  doğruluk kaynağı orası, bağlanır, kopyalanmaz.
- `OBSIDIAN-KURULUM.md` — kasa işine girerken oku.

## Üslup

Türkçe konuş. Süsleme yapma. Katılmadığın yerde katılma — gerekçesiyle.
Kod blokları dışında kısa yaz. Enes'e "reisim" doğaldır, zorunlu değildir.
