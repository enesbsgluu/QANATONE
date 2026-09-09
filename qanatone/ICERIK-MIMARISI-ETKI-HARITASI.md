# İÇERİK MİMARİSİ — ETKİ HARİTASI

> **9 Eyl 2026 · GÜNCELLEME.** Enes sıralamayı onayladı (**ADIM 2 önce**),
> sayıları verdi (**12 yazı/sayfa · RSS 50**) ve ADIM 2 **YAPILDI**.
> Sonuç en altta, "ADIM 2 KAPANDI" bölümünde. ADIM 1 sırada, ayrı onayla.

**9 Eylül 2026.** Enes: *"Bunu yaparken başka bir şeyi bozmadığından emin
olman ŞART. Değiştirdiğin ve geliştirdiğin alanların hangi uçları
etkilediğini araştırarak ilerlemen gerekir. Son 1 ayda en çok yaptığın
hata bir şeyleri hep sonradan farketmekti."*

Aşağıdaki bölümler (ADIM 1/ADIM 2 analizleri) **değişiklikten önce**
yazıldı; amaç her planlanan adımın hangi uçlara dokunduğunu **ölçerek**
çıkarmaktı. ADIM 2 sonradan uygulandı — sonucu en altta.

Hedef (Enes): içeriklerin SEO ve GEO'da fark yaratması · çok fazla
içeriği yönetebilecek mimari ve mekanizma · **bir haber sitesi kadar
güçlü ve kontrollü**.

## Zincirin ölçülen büyüklüğü

`content.json` veya `getCollection` ile içerik zincirine bağlı
**64 dosya**. Bunların **15'i `posts` ucuna** dokunuyor, **27'si**
`content.json` yolunu biliyor.

### Ölü uçlar — sayılmamalı

Dördü KESME Adım 2'de (6 Eyl) zincirden çıktı, `netlify.toml`'un
yürürlükteki `command`'ında yok:

`build.js` · `index.html` · `test/denetim.js` · `qanat-tek-dosya_130.html`

Bunlar `posts` okuyor ama **canlı uç değil**. Etki sayımına girmezler;
tersi, listeyi 15'ten 11'e indirir.

### Canlı uçlar — `posts` okuyanlar

| uç | rolü |
|---|---|
| `yeni/src/content.config.ts` | koleksiyon yükleyici (`file('../content.json')`) |
| `yeni/src/icerik.ts` | tekil alanlar + `KOK` + `sl()` |
| `yeni/src/pages/bulten/[slug].astro` + `en/…` | detay rotaları |
| `yeni/src/pages/bulten/rss.xml.ts` | RSS |
| `yeni/src/pages/sitemap.xml.ts` | sitemap |
| `yeni/src/parcalar/BultenDizin.astro` | dizin |
| `yeni/src/parcalar/YaziGovde.astro` | gövde + şerit |
| `yeni/src/sema.mjs` | JSON-LD |
| `admin.html` | panel editörü + taslak + yayınla |
| `netlify/functions/panel.js` | `?veri=1` bütün dosyayı sunuyor |
| `netlify/functions/yayinla.js` | bütün dosyayı commit ediyor |

## Kapılar — hangi kural neye bakıyor

`denetim.cjs` içinde `content.json`'u **20 kural** okuyor; `posts`
alanına doğrudan bakan **üçü**: **T10** (şerit tavanı), **R4** (bülten
dizini bütünlüğü), **R8** (sitemap loc = canonical = RSS item seti).

Bunlardan ayrı, en sert olanı adsız ilk kural:

> **"sayfa kümesi = `sayfalar.json` × dil + `content.json` koleksiyonları
> × 2"** — ve **İKİ YÖNLÜ**: listede olup `dist`te olmayan *eksik*,
> `dist`te olup listede olmayan **FAZLA**.

`yeni/src/veri/sayfalar.json` sitenin **tek URL sözleşmesi**; sitemap de
oradan türüyor:

```json
{"ad":"yazilar","kaynak":"posts","dizin":"/bulten",
 "yol":"/bulten/{slug}","sitemap":"0.7","lastmod":"date"}
```

## ADIM 1 — Panel/yayın mimarisi (BULGU 2 + 3)

`posts` `content.json`'dan çıkıp **gönderi başına bir dosyaya** taşınırsa
(haber sitesi deseni), dokunulacak uçlar:

| # | uç | ne değişir | risk |
|---|---|---|---|
| 1 | `content.config.ts` | `file()` → `glob()` yükleyici | orta |
| 2 | `admin.html` | liste tembel, tek yazı düzenlenir | **yüksek** |
| 3 | `yayinla.js` | tek dosya yolu → gönderi yolu | **yüksek** |
| 4 | `panel.js` | `?veri=1` bütünü sunuyor | orta |
| 5 | `netlify.toml` | `included_files` yazı dizinini de almalı | orta |
| 6 | `test/yayinla.test.js` | **T5 ile kapıda** — yol değişince kırmızı | düşük |
| 7 | `sayfalar.json` | `kaynak:"posts"` artık `content.json`'da değil | orta |
| 8 | `denetim.cjs` | sayfa kümesi + **T10 · R4 · R8** dördü de `posts` okuyor | orta |
| 9 | `sema.mjs` | JSON-LD kaynağı | düşük |
| 10 | `panel-mimari.cjs` · `panel-kapi.cjs` · `panel-taslak-farki.cjs` | panel kapıları | orta |
| 11 | `yeni/olcek-icerik.cjs` | ölçüm düzeneğim `content.json.posts` şişiriyor | düşük |

**En yüksek risk 2 ve 3: Enes'in yayınlama yolu.** Yanlış giderse site
bozulmaz ama **Enes yayın yapamaz** — ve bu kez belirtisi geç çıkar,
çünkü panel yerelde denenmiyor. [[qanatone-panel-yayin-deploy]] ve
[[qanatone-canli-zincir-tuzagi]] tam olarak bu yolda üç kez ateşledi.

## ADIM 2 — Sayfalama (BULGU 4) · SEO'nun asıl kalemi

Burada **önceden fark edilmesi gereken** şey şu: sayfalama yeni URL
üretir (`/bulten/2/`, `/bulten/3/` …) ve bu URL'ler bugünkü sözleşmede
**tanımsız**. Sonuç, kod doğru yazılsa bile:

> sayfa kümesi kuralı → `dist`te var, listede yok → **FAZLA → KIRMIZI →
> deploy düşer.**

Sayfalamanın dokunduğu uçların tam listesi:

| uç | neden |
|---|---|
| **sayfa kümesi kuralı** | iki yönlü; yeni yollar "fazla" sayılır |
| `sayfalar.json` | sözleşme sayfalı rotayı tanımalı |
| `sitemap.xml.ts` | sitemap oradan türüyor → yeni loc'lar |
| **R8** | loc seti = canonical seti = RSS item seti |
| **S4** | her sayfa başlık+açıklama BENZERSİZ — sayfa 2/3 aynı başlığı taşırsa kırmızı |
| `link-basliklari.cjs` | `_headers` Link bloğu sayfa başına |
| `ajan-hatti.mjs` | her sayfanın `.md` eşi (GEO ucu) |
| `ic-bag-denetimi.cjs` | **derinlik tavanı** + yetim sayfa (SEO ucu) |
| **H16** | iç bağlantılar üretilmiş sayfaya gitmeli |
| **H26** | EN sayfalarda iç bağlar `/en/` altında |
| `kesme-url-kapsami.json` | eski↔yeni adres kapsaması |
| `indexnow.mjs` | adresler sitemap'ten türüyor |
| `BultenDizin.astro` | dizinin kendisi |

**13 uç.** Bunların 5'i kapı (kırmızı yakar), 8'i üretici.

## Sıralama önerim — ve gerekçesi

Listemin başı ADIM 1'di, ama ölçüm başka bir sıra söylüyor:

**ADIM 2 (sayfalama/URL yapısı) önce yapılmalı.** Üç sebep:

1. **Panel duvarı acil değil, URL yapısı acil.** Panel 1.433 gönderide
   çarpıyor; bugün 6 gönderi var. URL yapısı ise *içerik basılmadan önce*
   doğru olmak zorunda: 5.000 yazı yayınlandıktan sonra `/bulten/2/`
   düzenine geçmek yönlendirme borcu ve kaybedilmiş sıralama demektir.
   Haber sitelerinde geri dönülmesi en pahalı karar URL'dir.
2. **SEO/GEO farkı ADIM 2'de doğuyor.** Enes'in istediği fark
   sayfalama + derinlik + `.md` eşleri + IndexNow'da; ADIM 1 yalnız
   *kapasite* açıyor, görünürlük üretmiyor.
3. **Risk sırası ters.** ADIM 1 Enes'in yayınlama yolunu değiştiriyor
   (yanlış giderse yayın durur); ADIM 2 yalnız çıktı üretiyor ve
   **5 kapı** tarafından zaten korunuyor.

## Karar bekleyen tek şey

ADIM 2'ye başlamadan iki sayı gerekiyor:

- **dizin sayfa başına kaç yazı?** Öneri **12** (bugünkü kart düzenine
  oturuyor; 10.000 yazıda 834 sayfa, derinlik tavanını zorlamıyor).
- **RSS kaç öğe?** Öneri **50** (haber sitesi pratiği; bugün tavansız).

Bunlar gelince ADIM 2'yi yukarıdaki 13 ucun hepsine dokunarak,
her kapıyı önce kırmızıya düşürüp sonra yeşile alarak yapabilirim.

ADIM 1 sırasını kaybetmiyor, sadece ADIM 2'den sonraya geçiyor — ve
başlarken ayrı bir onay isteyeceğim, çünkü panel/yayın yolu Enes'in
kendi çalışma aracı.

---

## ADIM 2 KAPANDI — sayfalama + RSS tavanı

**Enes, 9 Eyl:** ADIM 2 önce · **12 yazı/sayfa** · **RSS 50**.

### Yapılanlar

| dosya | ne |
|---|---|
| `src/veri/sayfalar.json` | `sayfa_boyu:12` · `sayfa_yolu` · `sayfa_sitemap` — **tek kaynak** |
| `src/sayfalama.ts` **(yeni)** | sayfa sayısı/yolları tek yerde (3 tüketici aynı formülü yazmasın) |
| `src/parcalar/BultenDizin.astro` | dilim + numaralı gezinme; çip sayaçları sayfa yereli |
| `src/pages/bulten/sayfa/[n].astro` **(yeni)** + EN eşi | 2..N rotaları |
| `src/pages/bulten/index.astro` + EN eşi | 1. sayfa, şemaya dilim bilgisi |
| `src/pages/sitemap.xml.ts` | sayfalı dizin adresleri |
| `src/pages/bulten/rss.xml.ts` | `RSS_TAVAN = 50` |
| `src/sema.mjs` | **ItemList sayfanın kendi dilimi** (aşağıda) |
| `denetim.cjs` | sayfa kümesi · **R4** · **R8** güncellendi · **T11** eklendi |
| `admin.html` | `bld05/bld06` — gezinme etiketleri panelden düzenlenebilir |

### Ölçüm (200 yazı, gerçek derleme)

| | önce | sonra |
|---|---:|---:|
| bülten dizini (1. sayfa) | 336.409 B | **46.502 B** |
| `rss.xml` | 111.015 B | **28.484 B** |
| dizin sayfası | 1 | 17 (×2 dil) |

Bugünkü 6 yazıda çıktı **bayt-birebir aynı** (66/61/38.352/189.894/
14.163/20.518/3.525) — tavan 12'nin altında devreye girmiyor.
Denetim **83 geçti · 0 kaldı**.

### Turun en pahalı bulgusu — şeridin şemadaki ikizi

Sayfalama çalışır hâle geldikten *sonra* ölçünce dizin sayfası hâlâ
137 KB çıktı. Sebep 12 kart değildi: **JSON-LD `ItemList` tüm arşivi
basıyordu** — 200 yazıda 96.950 B, sayfanın **%72'si**, ve bu her sayfalı
dizinde tekrarlanıyordu (17 sayfa = 1,65 MB). BULGU 1'deki şerit
kusurunun şema tarafındaki ikizi, aynı O(N×N).

İki ayrı kusurdu: **ölçü** (yukarıdaki) ve **doğruluk** — 3. sayfanın
`ItemList`'i 3. sayfada ne varsa onu anlatmalı; bütün arşivi her sayfada
ilan etmek sayfalamanın SEO'daki anlamını bozar. Düzeltildi; `position`
mutlak kaldı (2. sayfa 13'ten başlar), sayfalı listelerde doğru olan bu.

### Önceden yakalanan üç kapı

Etki haritasının işe yaradığı yer — üçü de **kod doğru yazılmışken**
deploy'u düşürecekti:

1. **sayfa kümesi kuralı** iki yönlü: `/bulten/sayfa/2` `dist`te belirir,
   sözleşmede yoktu → "FAZLA" → kırmızı. Sözleşme önce öğretildi.
2. **R8** "RSS item seti = posts seti" diyordu; tavan 50 ile 51. yazıda
   düşerdi. Ölçüt "= en yeni min(50, N)" oldu, tavan üreteçten okunuyor.
3. **R4** "her yazı `bulten/index.html`de" diyordu; 13. yazıda düşerdi.
   Yeni ölçüt **daha sıkı**: yazı *ait olduğu* sayfada aranıyor.

### Bekçi T11 (ateşlediği ölçüldü)

`/sayfa/1` yok · **ItemList = kart = beklenen dilim** (üç sayı birden) ·
kendine kanonik · numaralı gezinme. Sınandı: şema tüm arşivi basınca
🔴, sayfalı sayfa `/bulten`e kanoniklenince 🔴, temiz hâlde 🟢.

**T11 ilk yazımında kendi yeşil vakasında kırmızı yandı** — Astro her
öğeye `data-astro-cid-…` basıyor, çıktıda `<ol>` değil
`<ol data-astro-cid-xg7gohwu>` duruyor ve çıplak `<ol>` arayan regex
tutmuyordu. Özellik doğruydu, bekçi yanlıştı. Ders yorum-ayıklama
dersinin kardeşi: **kaynağı da çıktıyı da olduğu gibi oku.**

### Açık kalan — sektör çipleri

Çipler saf CSS ile (radyo + `:has()`) yalnız **basılı** kartları süzüyor.
Sayaçlar arşiv geneli kalsaydı çip "Talep yönetimi 340" yazıp 12 karttan
3'ünü gösterirdi; bu yüzden sayaçlar **sayfa yereli** yapıldı — dürüst
ama büyük arşivde işlevsiz. Asıl çözüm **sektör arşiv rotaları**
(`/bulten/sektor/<k>`, kendi sayfalamasıyla): hem çipi düzeltir hem
SEO yüzeyini çoğaltır. Ayrı kalem, Enes'in kararı.

### Astro tuzağı (kayda geçti)

`export const getStaticPaths = async () => …` **çalışmıyor** — Astro
rotayı üretiyor ama `Astro.params` `undefined` geliyor
("Cannot destructure property 'n'"). `export async function
getStaticPaths()` biçimi şart. Bir derleme turu bunu bulmaya gitti.

---

## ADIM 3 — Konu arşivleri + Nedir + Haber bölümleri (9 Eyl 2026)

Enes: *"sektörler arşivlerini yap ve nedir başlığı da kur… genel
haberlerin olduğu bir bölüm olacak"*.

### Önce yakalanan adlandırma çakışması

Sitede **"sektör" iki ayrı şeyi** anlatıyordu:
`content.json.sectors` = hizmet verilen **altı sektör**;
`posts[].sector` = yazının **konusu** (talep/reklam/arama/sektor).
Çiplerden arşiv kurmak `/bulten/sektor/sektor/` gibi bir yol doğuracaktı.
Enes'e soruldu, **`/bulten/konu/<k>`** seçildi — veri alanı `sector`
olarak kaldı, yalnız URL dürüstleşti ve altı gerçek sektör için
`/sektor/` adı boş bırakıldı.

### Tek mekanizma, üç bölüm

Üç bölümü üç kopya bileşenle yazmak sapmanın en sık kaynağıdır. Bunun
yerine `BultenDizin.astro` → **`BolumDizin.astro`** olarak genelleştirildi
ve **bülten de ona geçti**; `YaziGovde.astro` da `bolum` propu aldı.
Bölüm farkları artık **veri**: `sayfalar.json`daki koleksiyon kaydı
künye/başlık/giriş metin anahtarlarını, abone formunun ve konu
çiplerinin açık olup olmadığını, dizin yolunu ve arşiv alanını taşıyor.

Bülten gerilemedi: R4 · T10 · T11 · sayfa kümesi kuralı yeşil kaldı.
**Refactor'ü güvenli kılan şey kapılardı.**

### Koşullu bölüm — boş bölüm yayına çıkmaz

`nedir` ve `haber` içeriği panelden gelecek. Boş bir `/nedir` sayfasını
Google'a sunmak ince içerik, menüye koymak hiçbir şey vermeyen bir
kapıdır. Bu yüzden `kosullu: "<kaynak>"` bayrağı: kaynak boşken bölüm
**sayfa · menü · alt bilgi · sitemap** dördünde birden yok; ilk yazı
eklendiği an **kod değişikliği olmadan** açılır. Ölçüldü, iki yönde de
doğru çalışıyor.

Bunun için dizin rotası `index.astro` değil `[...kok].astro`:
`index.astro` koşulsuz üretilir, rest parametreli rota `getStaticPaths`
boş dizi dönünce hiç sayfa basmaz.

### Bölüm kimlikleri

| bölüm | yol | çip | form | RSS | ItemList tipi |
|---|---|---|---|---|---|
| bülten | `/bulten` | konu | abone | var | `Article` |
| nedir | `/nedir` | — | — | **yok** | **`DefinedTerm`** |
| haber | `/haber` | konu | — | yok | `Article` |

`DefinedTerm`, tanım içeriğini arama motoruna ve dil modellerine "bu bir
kavram açıklaması" diye bildirir — GEO tarafının beslediği sinyal.
Nedir yazıları bültenin beslemesine **karışmaz**: evergreen içeriği
haber diye göndermek türünü yanlış bildirmek olurdu.

### Panel

`nedirb` ve `haberb` editörleri eklendi (bülten editörünün aynısı; alan
sözleşmesi üçünde de aynı). Nedir'de **Konu alanı yok** — arşivi yok.
Ayrıca panelde **bayat bir talimat** bulundu ve düzeltildi: "yazı
ekledikten sonra `node build-bulten.js` çalıştırmayı unutma" diyordu,
**o dosya yok** — Astro'ya geçişten kalmış.

### Kapılar

- **T12 (yeni)** — koşullu bölüm dört yüzeyde tutarlı · bölümler kart
  ızgarasına sızmaz · şema tipi bölüme göre. Ateşlediği ölçüldü: boş ve
  dolu hâlde yeşil; menü süzgeci kalkınca 🔴, nedir şeması `Article`a
  dönünce 🔴.
- **T8 genişletildi** — "panel koleksiyonu okunuyor" ölçütü fazla düzdü
  (`icerik.posts` metnini arıyordu); erişim bölüme göre değişken olunca
  hâlâ çalışan `posts`u "okunmuyor" ilan etti. Üçüncü kanıt biçimi
  eklendi: **sözleşmede `kaynak` olarak bağlı olmak**.
- **sayfa kümesi · R8 · H16 · S1** konu arşivi eksiğini kendiliğinden
  yakaladı: `haber` çipleri vardı ama arşiv rotaları yazılmamıştı.

### Bu turda düştüğüm tuzaklar

1. `getStaticPaths` **ok fonksiyonu** çalışmıyor (bir derleme turu).
2. `[...kok]` rotası `params: {}` kabul etmiyor; rest parametresi
   **adıyla `undefined`** verilmeli.
3. İçe aktarma derinliğini yanlış hesapladım, derleme düştü ve denetim
   yirmi kırmızı verdi — hepsi tek kökten.
4. **Heredoc ters bölü tuzağına iki kez düştüm** (kendi kaydım var).
   Regex/`\` içeren betikler Write ile yazılmalı.
5. T12 ilk yazımında **kendi yanlış kırmızısını** verdi: `/hizmetler` ile
   `/projeler` arasındaki çapraz bağı "sızıntı" saydı. Ölçüt kart
   ızgarasına daraltıldı.

### Açık kalan

- **Konu etiketleri hâlâ kodda** (`src/konular.ts`). Artık sayfa
  başlığını da besliyorlar; panelden yeni konu anahtarı gelirse başlık
  ham anahtar olur. Panele taşınmalı.
- **`/sektor/<k>`** — altı gerçek sektörün arşivi. Bugün `posts[]` ile
  sektör arasında bağ **yok**; önce o bağ kurulmalı.
- Bülten dışındaki bölümler için **ayrı besleme** (`/haber/rss.xml`)
  istenirse ayrı kalem.

---

## ADIM 4 — Konu anahtarı çakışması + IndexNow farkı (9 Eyl 2026)

### Yakalanan çakışma: `nav7` iki yerde

`/nedir` bölümüne panel metin anahtarı olarak `nav7` vermiştim. **O
anahtar zaten kullanımdaydı**: `Nav.astro:110`daki "Stüdyo" açılır
başlığı. Metin haritası sessizce üzerine yazıyor — Enes "Nedir"
etiketini düzeltirken menüdeki "Stüdyo" yazısını değiştirirdi ve belirti
ancak siteye bakınca çıkardı. `/nedir` **`nav9`**'a alındı.

`sayfalar.json` tek başına hangi anahtarın boş olduğunu **bilmiyor**;
kesişimi yalnız metin haritası görüyor. **T12'ye dördüncü ölçüt eklendi:**
her statik kaydın `anahtar`ı panel haritasında kendi etiketine
çözülmeli. Ateşlediği ölçüldü (`nav7`e geri alınca 🔴).

### IndexNow artık yalnız değişeni bildiriyor (BULGU 5 kapandı)

**Ölçüt neden `lastmod` olamaz:** sitemap'in bu alanı iki yönden de
yalan söylüyor — statik sayfaların `lastmod`u derleme günü (her deploy
"değişti"), yazılarınki kendi tarihi (düzeltilse bile "değişmedi").

**Ölçüt sayfanın kendi baytı.** Her dağıtım `dist/indexnow-durum.json`
yazıyor (adres → sayfa HTML'inin sha1 özeti); bir sonraki dağıtım onu
**canlıdan** okuyup fark alıyor ve yalnız **yeni + özeti değişen**
adresleri bildiriyor. İstek başına 10.000 sınırı için liste dilimleniyor.

**Tasarımın dayanağı ölçüldü:** aynı içerikten iki derleme, **74 sayfanın
74'ünde birebir aynı özet (0 fark)**. Derleme kararlı olmasaydı bu
yaklaşım çalışmaz, her deploy yine hepsini bildirirdi — bu yüzden önce
o ölçüldü, sonra yazıldı.

Fark mantığı gerçek `dist` üzerinde, ağa çıkmadan sınandı:

| durum | bildirilen |
|---|---|
| ilk kayıt (canlıda durum yok) | 66 / 66 — doğru |
| hiçbir şey değişmemiş | **0** |
| bir sayfa değişmiş + bir yeni | **2** |

**Bir tasarım hatası ölçümle çıktı:** durum dosyası ilk yazımda bildirim
gövdesinin içindeydi ve üretim dışı dallanma ondan **önce** `return`
ediyordu — yani dosya `dist`e hiç girmiyordu ve ilk üretim dağıtımında
canlıda da bulunamayacaktı. Artık **her derlemede** yazılıyor.

**T6 genişletildi:** durum dosyası çıktıda ve sitemap'i tam kapsıyor ·
POST gövdesi tüm listeyi değil farkı yolluyor · istek tavanı dilimlemesi
duruyor. İki bozmada da ateşledi (`urlList: urls`'e döndürünce 🔴, durum
dosyası silinince 🔴).

### Hâlâ açık

- **Konu etiketleri kodda** (`src/konular.ts`) — panele taşınmadı.
  Arşiv sayfa başlığını besliyorlar; panelden yeni konu anahtarı
  gelirse başlık ham anahtar olur.
- `/sektor/<k>` · `/haber/rss.xml` · ADIM 1 (panel duvarı) · `_headers`
  Netlify tavanı · derleme süresi.

---

## ADIM 5 — Konu tablosu panele (kendi açtığım deliği kapatma)

**Bu kusuru ben açtım.** Konu arşivlerini kurarken (`/bulten/konu/<k>`)
etiket haritasını **kodda** bıraktım — oysa arşiv sayfasının **başlığı**
o etiketten türüyor. Panelden etiketi olmayan bir konu anahtarı gelseydi
başlık ham anahtar olurdu ve bunu hiçbir şey söylemezdi.

**Ölçülerek gösterildi.** Etiketi silip derleyince arşiv sayfasının
başlığı gerçekten şu oldu:

```
reklam — Bülten — QANATONE
```

### Çözüm

Etiketler `content.json.topics` (`[{k, tr, en}]`) alanına taşındı.
`src/konular.ts` artık oradan okuyor; panel boş/bozuksa **yedek küme**
devrede (*"üretim ilk günden doğru, panel yalnız ezebilir"* — `strings`
tarafındaki düşüşün aynısı).

Panelde **Konular** sekmesi açıldı (ekle/sil/sırala + TR/EN etiket) ve
yazı editöründeki **açılır liste artık o tablodan doğuyor** — yani
panelden **etiketsiz konu üretilemez**. Bekçi, elle düzenlenmiş
`content.json` yolunu kapatıyor.

### Bekçi T13 — iki hat birden

- **(a) Kaynak:** yazıların kullandığı her konu anahtarının tabloda
  karşılığı olmalı. Bu aynı zamanda *"panelden bir konuyu sildim ama
  yazılar hâlâ o konuda"* vakasının belirtisidir.
- **(b) Çıktı:** üretilmiş arşiv sayfasının `<title>`'ı ham anahtarla
  başlamamalı.

İkisi ayrı hat: (a) kaynağı, (b) çıktıyı ölçer. Bu depoda "kaynak doğru,
çıktı bayat" vakası daha önce oldu, o yüzden ikisi de var.
Tablonun kendi sağlığı da burada: anahtar tekil ve adreste geçerli
(`^[a-z0-9-]+$`), TR etiketi dolu.

**Ateşlediği ölçüldü — 6 vaka, 6 kırmızı:** kullanılan konu tablodan
silindi · anahtar tekrar etti · anahtar adreste geçersiz · TR etiketi boş ·
etiket yok + derlendi · **etiket geri kondu ama derlenmedi** (bu sonuncusu
(b)'yi tek başına sınadı — kaynak yeşilken çıktı kırmızı).

### T8 kapısı kodu düzeltti

İlk yazımda `(icerik as any).topics` yazmıştım ve T8 *"panelde `topics`
editörü VAR ama site OKUMUYOR"* dedi. Kapı **haklıydı**: dönüşüm
gereksizdi (`icerik` zaten `JSON.parse` çıktısı) ve okumayı
greplenemez yapıyordu. `icerik.topics`e indirildi — kod da tespit de
dürüstleşti.

### Bozulmadığı doğrulanan uçlar

`sitemap` · sayfa kümesi · `R8` · `H16` · `S4` · `T11` · `T12` — hepsi
anahtar **değerinden** türüyor, etiketten değil; etiket yalnız görünen
metni besliyor. Denetim **85 geçti · 0 kaldı**, çıktı ölçüleri
değişmedi (74 sayfa / 66 loc / 42.148 B `_headers`).

---

## ADIM 6 — Sektör bağı ve `/sektor/<k>` arşivi (9 Eyl 2026)

Enes: *"Bağları da kur, hangi yazı hangi sektörde; yazıyı girerken
panelden sektör seçilmeli ve o sektöre yerleşmeli, böylece içeriğin ne
içeriği olduğu bilinir."*

### Önce bir engel: `sector` adı zaten doluydu

`posts[].sector` **konuyu** tutuyordu (talep/reklam/arama/sektor). Aynı
ada ikinci anlam yüklemek mimariyi zayıflatırdı, o yüzden alan adı
anlamına çekildi:

```
posts[].topic   -> yazının konusu   (talep, reklam, arama, sektor)
posts[].sector  -> GERÇEK sektör    (insaat, saglik, eticaret, …)  YENİ
```

**Göç güvenliydi çünkü kümeler ayrık** — konu anahtarlarıyla sektör
anahtarları kesişmiyor (ölçüldü: kesişim boş). Bu, yarım kalmış bir göçü
**makineyle** görülebilir kılıyor ve T14'ün ilk maddesi oldu.
**URL'ler değişmedi**: `/bulten/konu/<k>` yolları anahtar
*değerlerinden* türüyor, alan adından değil.

### `/sektor/<k>` — bölüm üstü kesit

Konu arşivi bir bölümün **içinde** süzer; sektör arşivi bölümleri
**aşar**: bülten + nedir + haber bir arada, her kartta hangi bölümden
geldiğini söyleyen rozetle. `/sektor/` adı bu iş için bilinçli boş
tutulmuştu — çip arşivleri `/bulten/konu/` altına konurken alınan karar.

Ölçüldü (fikstür: 6 bülten + 9 nedir + 9 haber, 3 sektöre dağıtılmış):

| sektör | toplam | dağılım |
|---|---:|---|
| insaat | 8 | Bülten 2 · Nedir 3 · Haberler 3 |
| saglik | 8 | Bülten 2 · Nedir 3 · Haberler 3 |
| eticaret | 8 | Bülten 2 · Nedir 3 · Haberler 3 |

Sayfalama da sınandı (tek sektöre 30 içerik): **12 + 12 + 6**, her sayfa
kendine kanonik, numaralı gezinme, sitemap'te 3 sayfa × 2 dil.

### Panel

Her yazı editörüne (bülten · nedir · haber) **Sektör** açılır listesi
eklendi; kaynağı `content.json.sectors`. Boş bırakılabilir — her içerik
bir sektöre ait olmak zorunda değil.

### Bağların kendisi — ve neden beşi boş

Enes "hangi yazı hangi sektörde" dedi; **altı yazının beşi sektör
üstü**: "2026 Google Ads maliyetleri: hangi sektör ne ödüyor?" ve
"Açılış sayfası dönüşüm oranları: sektör sektör" zaten tüm sektörleri
anlatıyor. Yalnız **"Sağlık turizminde asıl hikâye…"** kendi içeriğinden
açıkça bir sektöre ait — o `saglik`e bağlandı.

Kalan beşi **bilerek boş**: genel yazıyı bir sektöre atamak arşivi
kirletir ve "içeriğin ne içeriği olduğu bilinir" iddiasını
zayıflatırdı. Atama artık panelde, karar Enes'te.

### Kapılar önce üç kırmızı verdi (hepsi gerçek)

`/sektor/saglik` üretilince: **sayfa kümesi** "FAZLA" dedi · **R8**
sitemap'te yok dedi · **S1** açıklama kısa dedi. Üçü de bağlandı.

**Kendi ölçüm hatam:** "sitemap sektör loc: 2" diye ölçmüştüm — regex'im
`/bulten/konu/**sektor**/` yollarını sayıyordu; sitemap'te sektör arşivi
**hiç yoktu**. R8 doğruyu söyledi.

**İkinci hata, düzeltildi:** açıklamayı `sectors[].d`den kurmuştum. O
alan bir sektör tanımı değil, ana sayfadaki **sancı cümlesi** ("Gece
gelen mesaj sabaha kalıyor") — çıktı *"Gece gelen mesaj sabaha kalıyor
Sağlık turizmi sektöründe yazdıklarımız…"* oluyordu. Açıklama artık
sektör adından kuruluyor. **Ders: bir alanı kullanmadan önce ne
tuttuğuna bak, adına değil.**

### Bekçi T14 — dört ölçüt

Göç tamam mı (`sector` alanında KONU anahtarı duruyor mu) · anahtar
`sectors` tablosunda mı · arşiv **iki yönlü** (içeriği olanın var,
olmayanın yok) · arşivdeki kartlar gerçekten o sektörün mü.

Ateşlediği ölçüldü: `sector`e konu anahtarı konunca 🔴 · tanımsız sektör
🔴 · bağlar kaldırılıp derlenmeyince *"içerik YOK ama arşiv ÜRETİLMİŞ"* 🔴.

Denetim **86 geçti · 0 kaldı**.

---

## YAYIN ÖNCESİ DENETİM (9 Eyl 2026) — bir kusur bulundu ve kapatıldı

Enes sordu: *"düzeltilmeyi bekleyen bir hata var mı, yoksa hepsi yayına
hazır mı?"* Cevabı iddia etmek yerine ölçtüm.

### Hiç sınamadığım şey: panelin gerçekten açılması

`admin.html`e üç tur düzenleme yapmıştım ve yalnız **metin arayarak**
doğrulamıştım — bir sözdizimi hatası paneli tümden öldürürdü. Gerçekten
çalıştırıldı (yerel sunucu + Chrome):

- 17 sekme, üç yeni sekme (**Konular · Nedir yazıları · Haberler**) yerinde
- kayıt eklenince alanlar doğru çiziliyor: nedir'de **Sektör var, Konu
  yok** (arşivi yok) · haber'de **ikisi de** · bülten'de ikisi de
- açılır listeler veriden doluyor: 6 sektör + "genel", 4 konu
- **konsol hatası yok**

İlk ölçümüm güvenilmezdi: boş koleksiyonda alanlar hiç çizilmiyor, benim
regex'im not metnindeki "Sektör" kelimesini yakalıyordu. Kayıt ekleyip
gerçek alanlara bakınca doğru sonuç çıktı.

### Bulunan kusur: `/sektor/<k>` liste şeması taşımıyordu

| sayfa | JSON-LD |
|---|---|
| `/bulten` | Organization + WebSite + WebPage + **ItemList (6)** |
| `/bulten/konu/talep` | … + **ItemList (1)** |
| **`/sektor/saglik`** | … **ItemList YOK** |

Bir liste sayfası, ne listelediğini şemada söylemiyordu — tam da GEO
tarafının okuduğu sinyal. **Hiçbir kapı görmüyordu**: T12'nin şema
ölçütü yalnız `koleksiyon` kayıtlarını kapsıyor, sektör arşivi bir
**kesit**.

**Çözüm:** `sektorDizinSema` eklendi. Bölüm üstü olduğu için kayıtlar
dışarıdan veriliyor ve dilim **tek kaynaktan** (`sektorDilim`) —
sayfanın kartlarıyla aynı liste; iki yerde hesaplansaydı şema sayfada
olmayan bir içeriği ilan edebilirdi. Item tipi bölüme göre (nedir →
`DefinedTerm`).

**T14'e beşinci ölçüt:** ItemList = kart = beklenen dilim (üç sayı
birden). Şema boş listeyle çağrılınca 🔴.

### Diğer uçların bozulmadığı ölçüldü

- Denetim **86 geçti · 0 kaldı**
- `kesme-supurme.cjs` (60 eski adres, yerel sunucudan): **GEÇTİ**, 0 kusur
- **Sitemap'teki 68 adresin tamamı sunucudan 200** — yeni rotalar dahil
  (`/bulten/konu/*` 4 · `/sektor/saglik` TR+EN)
- `surum-yaz.cjs` tamam

### Kendi tekrar eden hatam

**Heredoc ters bölü tuzağına bu turda üçüncü kez düştüm** — kendi
kaydım olmasına rağmen. Kural netleşti: ters bölü / regex içeren betik
**asla** heredoc ile yazılmaz, Write ile dosyaya yazılır.
