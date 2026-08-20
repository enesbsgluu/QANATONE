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
