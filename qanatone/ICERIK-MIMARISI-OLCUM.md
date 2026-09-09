# 10 → 10.000 İÇERİK MİMARİSİ — ÖLÇÜM

> **9 Eyl 2026 · GÜNCELLEME.** BULGU 1 (şerit O(N²)) **KAPANDI** —
> Enes tavanı 8 kart olarak verdi, uygulandı ve ölçüldü. Sonuç en altta,
> "BULGU 1 KAPANDI" bölümünde. Diğer beş kalem açık.

**9 Eylül 2026.** Enes'in kuralı (9 Eyl): *"Panelden yayınlanan HER ŞEY
Google'a, GPT'ye, tüm yerlere iletilmeli. Her alan binlerce içerik
potansiyeline göre mimari edilmiş olmalı. 10.000 içeriğin herhangi
birinde ufak bir değişiklik yapıldığında o alan direkt güncellenmeli.
Önemli olan o bölgede ne yazdığı değil, o bölgenin nasıl çalıştığı."*

Bu belge **araştırma değil ölçüm**. Her katsayı `content.json`'daki
`posts` dizisi gerçekten şişirilip **gerçek derleme koşularak** çıktı.
Yansıtmalar (1.000 / 10.000) bu katsayıların uzantısı; ayrıca
işaretlenmedikçe hiçbir rakam tahmin değil.

## Ölçüm düzeni

- Gerçek bir gönderi şablon alındı, `slug`/`date`/`title` değiştirilerek
  çoğaltıldı — **bayt büyüklüğü gerçek gönderiyle aynı** (küçük sahte
  kayıt eğriyi yalancı düzleştirmesin diye).
- N = 6 (bugünkü hâl), 50, 200 için `npm --prefix yeni run build`.
- Süre ölçümünde her N'de **bir ısınma koşusu atıldı**, sonraki iki
  koşum alındı. İlk (soğuk) ölçümlerim 34,1 / 50,0 / 17,8 sn çıkmıştı —
  yani 200 gönderi 6 gönderiden *hızlı* görünüyordu; bu Vite/esbuild
  önbelleğiydi, süre değil. Aşağıdaki süreler sıcak-sıcak eşleştirilmiş.
- Ölçüm sonrası `content.json` yedekten geri yüklendi, temiz derleme
  yapıldı, `yeni/denetim.cjs` **81 geçti · 0 kaldı**.

## Ölçülen (gerçek derleme)

| | 6 gönderi | 50 gönderi | 200 gönderi |
|---|---:|---:|---:|
| HTML sayfa | 66 | 154 | 454 |
| `.md` eş | 61 | 149 | 449 |
| `content.json` | 237,7 KB | 428,6 KB | 1,08 MB |
| `_headers` | 38,4 KB | 95,4 KB | 292,0 KB |
| `sitemap.xml` | 20,5 KB | 57,3 KB | 183,4 KB |
| `bulten/rss.xml` | 3,5 KB | 27,8 KB | 111,0 KB |
| `llms.txt` | 14,2 KB | 39,9 KB | 127,9 KB |
| **`llms-full.txt`** | **189,9 KB** | **1,31 MB** | **16,08 MB** |
| bülten dizini HTML | — | — | 336,4 KB |
| tek gönderi HTML | — | — | 98,9 KB |
| derleme (sıcak) | 15,2–16,3 sn | 13,7–14,1 sn | 19,7–21,9 sn |
| `denetim.cjs` | 6,2–6,5 sn | 7,9–8,9 sn | **28,8–29,0 sn** |

Sayfa sayısı tam olarak `54 + 2N` (TR + EN). `.md` eşleri `49 + 2N`.

## BULGU 1 — Tek gerçek mimari kırılma: "Diğer yazılar" şeridi O(N²)

`yeni/src/parcalar/YaziGovde.astro:17`

```js
const digerleri = tum.length > 1
  ? Array.from({ length: tum.length - 1 }, (_, k) => tum[(ben + 1 + k) % tum.length])
  : [];
```

Her gönderi sayfası **diğer TÜM gönderileri** listeliyor. Tavan yok.
200 gönderide ölçüldü:

- tek gönderi HTML = 98.949 B, bunun **66.014 B'ı şerit** (%67) →
  **331,7 B / listelenen gönderi**
- tek gönderi `.md` = 40.233 B, bunun **37.978 B'ı tek satırlık şerit**
  (%94) → **190,8 B / listelenen gönderi**

Ürün N×N. `llms-full.txt`'in eğrisi bunun doğrudan sonucu:
190,5 KB → 1,31 MB → 16,08 MB.

Yansıtma (aynı katsayılarla):

| | 1.000 gönderi | 10.000 gönderi |
|---|---:|---:|
| tek gönderi HTML | 364 KB | **3,3 MB** |
| tüm gönderi HTML | 729 MB | **67 GB** |
| `llms-full.txt` | 386 MB | **38,2 GB** |

10.000 gönderide **tek bir bülten yazısının HTML'i 3,3 MB** olur ve
bunun %99'u o yazıyla ilgisi olmayan 9.999 kartlık şerittir.

Bu aynı zamanda **denetim süresinin** de sürücüsü: `denetim.cjs` sayfa
başına 22,7 ms (66→154 sayfa) iken 68,7 ms'e (154→454 sayfa) çıkıyor —
sayfa sayısı değil, sayfa **baytı** büyüdüğü için. Süperdoğrusal.
Şerit düzelirse denetim süresi de düzelir.

## BULGU 2 — Panel taslağı 5,24 MB'da duvara çarpıyor · ~1.433 gönderi

**Enes'in gerçek tarayıcısında ölçüldü** (Chrome 152,
`https://www.qanatone.com`):

```
localStorage kotası = 5.242.086 karakter
o an kayıtlı taslak  =   164.036 karakter  (qanat-admin-draft)
```

`admin.html` taslağı `localStorage`'a yazıyor. Gönderi başına 3.510
karakterle taban 209.616 karakterden başlayınca tavan
**≈ 1.433 gönderi**. Ötesinde `setItem` `QuotaExceededError` atar —
ve panel bunu `try{}catch(e){}` ile yutuyor, yani **taslak sessizce
kaydedilmemeye başlar**.

> Ölçüm sırasında mevcut taslağa dokunulmadı; test anahtarı silindi,
> `qanat-admin-draft` 164.036 karakterle sağlam doğrulandı.

## BULGU 3 — `yayinla` tek POST gövdesi · ~1.639 gönderi

`admin.html:1010` bütün içeriği tek gövdede yolluyor:

```js
body: JSON.stringify({ parola, content: C })
```

`netlify/functions/yayinla.js` de bunu tek `content.json` olarak
GitHub'a base64'leyip commit ediyor. Netlify Functions eş zamanlı
çağrıda **6 MiB gövde sınırı** (belgelenmiş sınır — burada ölçülmedi)
→ gönderi başına 3.706 bayt ile **≈ 1.639 gönderi**.

Ayrıca: tek harf değişse bile **37,3 MB'lık dosyanın tamamı** yeniden
yazılıyor. Enes'in kuralındaki *"10.000 içeriğin herhangi birinde ufak
bir değişiklik yapıldığında o alan direkt güncellenmeli"* şartı bu
tasarımla karşılanamaz — ufak değişikliğin maliyeti bütünün maliyeti.

## BULGU 4 — Sayfalanmayan dizinler ve sınırsız RSS

- **Bülten dizini** (`BultenDizin.astro:34`) tüm gönderileri tek sayfaya
  basıyor: 200 gönderide 336,4 KB → 10.000'de ~16 MB tek HTML.
- **`rss.xml`** (`src/pages/bulten/rss.xml.ts`) tavansız: 200 gönderide
  200 `<item>`, 111 KB → 10.000'de 5,5 MB. RSS'te olağan pratik son
  20–50 öğedir.

## BULGU 5 — IndexNow her deploy'da TÜM adresleri bildiriyor

`yeni/indexnow.mjs:109` — `urlList: urls`, dilimleme yok; `urls` doğrudan
`dist/sitemap.xml`'in tamamı. Yani hiç değişmemiş 20.046 adres her
deploy'da "değişti" diye bildiriliyor. IndexNow'ın **istek başına 10.000
adres** sınırı (belgelenmiş, ölçülmedi) → **≈ 4.973 gönderi**.

## BULGU 6 — `_headers` 13 MB'a çıkıyor

Gönderi başına 1.304 B doğrusal: 38,4 KB → 292 KB (ölçüldü) → 10.000'de
**13,1 MB**. Netlify'ın bu dosya için işleme tavanı burada ölçülmedi;
duvarın yeri **doğrulanmalı**.

## Şüphelenip ölçünce DÜŞEN iki kalem

Dürüstlük payı — açılışta yazdığım şüpheli listesinin ikisi ölçümle
sırasını kaybetti:

- **Tam yeniden derleme.** Sıcak derleme 6→200 gönderide 15,7 → 20,8 sn,
  yani +5 sn. Bu aralıkta duvar **değil**; şüpheliler arasında en az
  acili. (Yine de O(N²) bayt eğrisinden besleniyor, şerit düzelmezse
  bükülür.)
- **Sitemap 50.000 sınırı.** ≈ 24.973 gönderiye denk geliyor — listedeki
  **en uzak** duvar. 10.000 hedefi bunu hiç görmüyor.

## Duvarlar, çarpma sırasına göre

| # | duvar | gönderi | kaynak |
|---|---|---:|---|
| 1 | *(sürekli bozulma — şerit O(N²))* | ~200'den itibaren | **ölçüldü** |
| 2 | panel taslağı `localStorage` | **1.433** | **ölçüldü** (Chrome 152) |
| 3 | `yayinla` POST gövdesi 6 MiB | **1.639** | belgelenmiş sınır |
| 4 | IndexNow 10.000 adres/istek | **4.973** | belgelenmiş sınır |
| 5 | sitemap 50.000 adres | 24.973 | belgelenmiş sınır |

3, 4 ve 5 belgelenmiş dış sınırlar — bu turda **ölçülmediler**,
doğrulanmaları ayrı bir iş.

## Hüküm

Mimari bugünkü 10 içerikte doğru çalışıyor ve **81/0 yeşil**. Ama
Enes'in koyduğu şart *"her alan binlerce içerik potansiyeline göre
mimari edilmiş olmalı"* bugün **karşılanmıyor**: ilk duvar 10.000'in
%14'ünde (1.433 gönderi), sürekli bozulma ise 200 gönderiden itibaren
ölçülebilir.

Kritik olan şu: **beş kalem de aynı tek kök desenden geliyor** —
*bütünü her seferinde bütün olarak işlemek*. Şerit bütün gönderileri
basıyor, panel bütün içeriği belleğe alıyor, `yayinla` bütün dosyayı
yolluyor, IndexNow bütün adresleri bildiriyor, `_headers` bütün sayfaları
yazıyor. Enes'in cümlesindeki *"o bölgenin nasıl çalıştığı"* tam olarak
bu: bugün her bölge **bütün** üzerinde çalışıyor, **değişen** üzerinde
değil.

## Enes'in kararına kalan

Bu tur ölçümdü; aşağıdakiler onay bekliyor, hiçbiri uygulanmadı.

1. **Şerit tavanı** (BULGU 1) — kaç kart? Komşuluk mu (tarihte önceki/
   sonraki N), sektör eşleşmesi mi? Tek kalemde hem 67 GB hem denetim
   süresi düşüyor; turun en yüksek getirili maddesi.
2. **Panel bütünü taşımayı bırakmalı** (BULGU 2 + 3) — parça yükleme ve
   parça yayınlama. En büyük iş kalemi; mimari kararı Enes'in.
3. **Sayfalama + RSS tavanı** (BULGU 4) — dizin kaç gönderi/sayfa,
   RSS kaç öğe?
4. **IndexNow yalnız değişeni bildirsin** (BULGU 5) — bir önceki
   sitemap'le fark alınabilir.
5. **`_headers` gerçek Netlify tavanı** (BULGU 6) — ölçülmeli.

## Düzenek

`yeni/olcek-icerik.cjs` — kendi kendine yeter, depodan koşar:

```
node yeni/olcek-icerik.cjs hazirla     # content.json yedegi (.onbellek/)
node yeni/olcek-icerik.cjs sis 200     # posts -> 200
npm --prefix yeni run build
node yeni/olcek-icerik.cjs olc         # ciktilari olc
node yeni/olcek-icerik.cjs geri        # content.json iade + temiz derleme
node yeni/olcek-icerik.cjs yansit      # katsayilardan tablo
```

Doğrulama: temiz `dist` üzerinde `olc` bu belgedeki 6-gönderi sütununu
birebir yeniden üretiyor (66 / 61 / 38.352 / 189.894 / 14.163 / 20.518 /
3.525). Süre ölçerken her N'de bir ısınma koşusu atılmalı.

## BULGU 1 KAPANDI — şerit tavanı 8 kart

**Enes, 9 Eyl:** *"şeridi düzelt tavanı 8 kart yap"* →
`yeni/src/parcalar/YaziGovde.astro`, `TAVAN = 8`:

```js
const digerleri = tum.length > 1
  ? Array.from({ length: Math.min(TAVAN, tum.length - 1) }, (_, k) => tum[(ben + 1 + k) % tum.length])
  : [];
```

Şeridin **anlamı değişmedi**: sıra yine "sıradaki yazıdan başlayıp başa
dolanan", yalnız ilk 8 tanesi alınıyor. Yazı sayısı 9'un altındayken tavan
hiç devreye girmiyor — bugünkü 6 gönderilik sitede çıktı **bayt-birebir
aynı** (189.894 / 38.352 / 20.518 … hepsi öncesiyle özdeş), yani görsel
fark yok.

### Ölçüm (aynı düzenek, gerçek derleme)

| | 200 gönderi önce | 200 gönderi sonra | 1.000 gönderi sonra |
|---|---:|---:|---:|
| şerit kart sayısı | 199 | **8** | **8** |
| şerit bloğu (HTML) | 66.014 B | **2.682 B** | — |
| tek gönderi HTML | 98.949 B | **35.617 B** | **36.350 B** |
| tek gönderi `.md` | 40.233 B | **3.826 B** | **3.839 B** |
| `llms-full.txt` | 16,08 MB | **1,79 MB** | **8,40 MB** |
| `denetim.cjs` | 28,8 sn | **14,3 sn** | 59,2 sn |

**O(N²) gitti.** Kanıt, 200 → 1.000 arasında gönderi başına maliyetin
sabit kalması: HTML 35.617 → 36.350 B, `.md` 3.826 → 3.839 B. Eskiden bu
iki sayı N ile doğrusal büyüyordu; artık büyümüyor. Denetimin sayfa
başına maliyeti de düzleşti: 22,7 → 68,7 ms hızlanıyordu, şimdi
20,6 → 28,1 ms.

### Yansıtma, düzeltme sonrası

| | 10.000 gönderi ÖNCE | 10.000 gönderi SONRA |
|---|---:|---:|
| tek gönderi HTML | 3,3 MB | **~36 KB** |
| tüm gönderi HTML | 67 GB | **~727 MB** |
| `llms-full.txt` | 38,2 GB | **~82 MB** |

### Bu turda AÇILAN yeni kalem — derleme süresi

Rapordaki *"tam yeniden derleme duvar değil"* satırı 200 gönderiye kadar
doğruydu, 1.000'de artık değil: sıcak derleme **94 sn** (200'de 20 sn),
`denetim.cjs` **59 sn**. İkisi ~92 ms/gönderi ve ~28 ms/sayfa ile
doğrusal; 10.000 gönderide toplam **~25 dk**, Netlify'ın 15 dk varsayılan
derleme tavanının üstünde. Yeni kalem, Enes'in kararına: artımlı derleme
mi, tavanı yükseltmek mi.

### Durum

`content.json` iade edildi, temiz derleme **81 geçti · 0 kaldı**.
Ölçüm koşularındaki tek kırmızı yine S4'tü ve yine fikstür kaynaklı
(kopyalanmış `lede`'ler) — düzeltmenin öncesinde de sonrasında da aynı.
Değişen tek dosya `yeni/src/parcalar/YaziGovde.astro`. **Commit yok.**

### Bekçi — T10 (eklendi ve ateşlediği ölçüldü)

`denetim.cjs` · **T10**. Neden şart: tavan tek bir `Math.min` çağrısı ve
site 6 gönderilik olduğu için onu silen düzenleme **hiçbir belirti
vermez** — çıktı bayt-birebir aynı kalır. Kırılma aylar sonra, arşiv
büyüyünce sessizce geri gelirdi.

İki tarafta ölçüyor: **kaynakta** `const TAVAN` + `Math.min(TAVAN, …)`
(yorumlar önce ayıklanıyor — bu dosyanın yorumunda da "TAVAN 8 KART"
yazıyor, ham metinde arayan bir kural yorumu kod sanardı), **çıktıda**
her gönderi sayfasındaki gerçek kart sayısı. Beklenen değer
`min(TAVAN, gönderi − 1)` ve **eşitlik** aranıyor, `≤ 8` değil: yalnız üst
sınır aransa boş ya da kopuk bir şerit de geçerdi.

Ayrıca **değer de kapıda** (`KARAR_TAVAN = 8`). Yalnız tutarlılık
ölçülseydi `TAVAN`ı 30'a çıkaran düzenleme sessizce geçerdi — çıktı da 30
basar, iki taraf tutar, kural yeşil yanardı. Sayı Enes'in kararı, türev
değil.

**Ateşlediği ölçüldü** — 6 kasıtlı bozma, 6 kırmızı:

| bozma | sonuç |
|---|---|
| `Math.min` silindi | `tavan UYGULANMIYOR` |
| `TAVAN` 8 → 30 (iki taraf tutarlı) | `Enes'in kararı 8` |
| `TAVAN` sabiti kaldırıldı, sayı gömüldü | `const TAVAN yok (yorum sayılmaz)` |
| tavan yalnız yorumda kaldı | `tavan UYGULANMIYOR` |
| 20 gönderi, tavan devrede | **yeşil**, 8 kart · 40 sayfa |
| içerik 6'ya döndü, derleme yapılmadı | `fazla kart — bayat dist?` |

Son satır bir düzeltme de getirdi: kart sayısı **beklenenle** kıyaslanıyor,
tavanla değil. İlk sürüm 5 beklenirken 8 kart görünce "şerit eksik/kopuk"
diyordu — fazlaya "eksik" demek yanlış teşhistir.

Denetim **82 geçti · 0 kaldı**.
