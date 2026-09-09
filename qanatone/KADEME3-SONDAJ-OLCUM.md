# KADEME 3 — HİBRİT SONDAJI · ÖLÇÜM RAPORU

**10 Eylül 2026.** Enes'in kararı (9 Eyl): hibrit, coinotag modeli — büyüyen
bölüm istek anında üretilir, ana sayfa/hizmetler statik kalır. Bu rapor
kararın **bedelini** ölçer; kod yayına çıkmadı, ağaç temiz bırakıldı.

Yeniden uygulanabilir yama: `kademe3-sondaj.diff` (4 dosya).
Düzenek: `@astrojs/netlify@6.6.5` + `output:'static'` + tek rotada
`export const prerender = false` (`yeni/src/pages/bulten/[slug].astro`).
Astro 5.18.2 — **Astro 7'ye çıkmaya gerek olmadı.**

---

## KARAR İÇİN TEK CÜMLE

Hibrit derleme duvarını **~4.680'den ~8.640 yazıya** taşıyor ve çıktıyı
**bayt-birebir** koruyor; bedeli derleme süresi değil, **denetimin 13
kuralının sessizce körleşmesi** ve çıktıdan türeyen beş yüzeyin (ajan
hattı, Link başlıkları, IndexNow, llms.txt, llms-full.txt) büyüyen bölümü
**kaybetmesi**.

---

## 1 · DERLEME SÜRESİ — iki taraf da bugün, aynı makinede ölçüldü

| N=1.000 | statik | hibrit (TEK rota) | fark |
|---|---:|---:|---:|
| derleme | 106,5 sn | **70,1 sn** | −34% |
| denetim | 98,3 sn | **50,4 sn** | −49% |
| **toplam** | **204,8 sn** | **120,5 sn** | **−41%** |
| üretilen sayfa | 2.415 | 1.415 | −1.000 |
| `_headers` | 1.523.300 B | 650.548 B | −57% |

Isınma koşusu her iki tarafta da atıldı, ölçülen ikinci koşum
([[qanatone-lighthouse-olcum-duzeni]] disiplini). N=6 çıpası: statik
11,8 sn, hibrit 14,5 sn — adaptör **sabit maliyete ~2,7 sn ekliyor**.

**Doğrusal model** (iki nokta: N=6 ve N=1.000):

| | sabit | 1.000 yazı başına | 900 sn duvarı |
|---|---:|---:|---:|
| statik | ~16 sn | 189 sn | **~4.680 yazı** |
| hibrit (TR yazı rotası) | ~19 sn | 102 sn | **~8.640 yazı** |

TEK rotanın çevrilmesi duvarı neredeyse ikiye katlıyor. Kalan eğimin
büyük kısmı ikizinde: `en/bulten/[slug]` hâlâ 1.000 sayfa basıyor.
İkisi de çevrilirse eğim bir kez daha yarıya iner ve 10.000 hedefi
duvarın altında kalır — **ölçülmedi, yansıtma.**

## 2 · ÇIKTI SADAKATİ — bayt-birebir ✓

İstek anında üretilen sayfa, statik hâliyle **6/6 bayt-birebir**:

| slug | bayt | hüküm |
|---|---:|---|
| talebe-bes-dakikada-donmek | 35.382 | birebir |
| donusum-oranlari-sektor-sektor | 35.115 | birebir |
| google-ads-maliyetleri-2026 | 35.183 | birebir |
| saglik-turizmi-hasta-basina-gelir | 35.489 | birebir |
| yapay-zeka-trafigi-tiklama-degil | 36.506 | birebir |
| yapay-zekadan-gelen-ziyaretci-donusuyor-mu | 35.684 | birebir |

Ölçüm yöntemi: derlenmiş `ssr.mjs` doğrudan Node'dan çağrıldı (Netlify
gerekmedi), gövde diskteki statik tabanla `cmp`'lendi. Taban kopyalar
turdan önce alındı.

**404 iki AYRI yoldan gelir ve yalnız biri sadık:**

| istek | yol | durum | gövde |
|---|---|---:|---|
| `/hicboyleyol/` (rota yok) | adaptörün `notFoundContent`i | 404 | **birebir** (23.117 B) |
| `/bulten/olmayan-slug/` (rota var, kayıt yok) | Astro çalışma anında basıyor | 404 | 23.070 B — **47 B eksik** |

47 B'nin tamamı `data-netlify="true"` + `netlify-honeypot="company"`
özniteliklerinin düşmesi; `<form>` etiketi ayrıca yeniden serileşiyor
(tek tırnak, alfabetik sıra). **Mekanizma bulunamadı** — bu dizeyi
üreten kod ne adaptörde ne `node_modules`'te ne kaynakta var; çalışma
anında oluşuyor. Sayı ilginç biçimde Netlify'ın deploy anındaki form
yeniden yazımıyla aynı ([[qanatone-kademe2-parca-mimarisi]], 47 B).
Durum kodu doğru, sayfa doğru; **404 gövdesinde form işaretçisi
kaybı bugün zararsız** ama "istek anı render = statik render" iddiası
bu yolda tutmuyor. Kayda geçiyor.

**`Astro.rewrite('/404')` HİBRİTTE ÇALIŞMIYOR:** istek anındaki bir
rotadan ön-üretilmiş bir rotaya rewrite `TypeError: module.page is not
a function` verip **500** döndürüyor. Çare: `new Response(null,
{status:404})`. Sondajın ilk hâli tam bu tuzağa düştü.

## 3 · DENETİM — asıl bedel burada

`denetim.cjs` 87 kural. Hibritte:

**5 kural KIRMIZI** (yani kaybı fark ediyor):
`sayfa kümesi` · `T6` (IndexNow) · `T15` (dosya başına kayıt) ·
`R8` (sitemap/canonical/rss) · `H16` (iç bağlantı hedefi üretilmiş mi)

Bu beşi N=6'da da N=1.000'de de aynı. Kolay tarafı bu — çevrilmeleri
gerekir ve göze batarlar.

### YANLIŞ YEŞİL — ölçüldü, varsayılmadı

Kırmızı-önce: TEK bir yazının **yalnız TR başlığı** başka bir yazınınkiyle
çakıştırıldı (EN'e dokunulmadı), aynı ağaç iki kez derlendi.

| | S4 · her sayfanın başlığı BENZERSİZ |
|---|---|
| statik | **KIRMIZI** — `kopya-baslik(2): bulten/google-ads-maliyetleri-2026, bulten/talebe-bes-dakikada-donmek` |
| hibrit | **ok** — "69 başlık · 69 açıklama" |

Kural uyarmıyor, kapsamı küçültüp yeşil geçiyor.

**Kör noktanın boyutu:** iki denetim çıktısı satır satır kıyaslandı —
yazılar `dist`ten çıkınca **18 kuralın çıktısı değişiyor**. Beşi kırmızı;
kalan **13'ü daha küçük bir kümeyi denetleyip yeşil kalıyor**:

`G1` · `G3` · `G4` · `G5` · `F1d` · `H28` · `H29` · `L1` · `N1` ·
`S4` · `S5` · `T3` · `T10`

Bugün bu 6 sayfa demek. **10.000 yazıda bu 13 kural sitenin büyüyen
bölümünün SIFIRINI denetler** ve tamamı yeşil raporlar.

> **Bu turun tek cümlelik dersi:** hibritin bedeli 5 kırmızı değil,
> **82 yeşil**. Beş kırmızıyı susturmak kolaydır ve susturulduğu anda
> denetim büyüyen bölüm hakkında hiçbir şey söylemiyor olur.

Çare tek: **denetim `dist` okumayı bırakıp çalışan sunucuya `fetch`
atmalı.** Bugün 88 kuralın 89 yerde `dist` yolu birleştirmesi, 67 yerde
dosya okuması var. Bu, Kademe 3'ün gerçek işi — adaptör kurmak değil.

## 4 · ÇIKTIDAN TÜREYEN YÜZEYLER — sessizce boşalıyor

N=6'da statik ve hibrit çıktısı dosya dosya kıyaslandı: **152 ortak
dosyanın 146'sı bayt-birebir**, 6'sı farklı — ve altısı da aynı sebepten:

| dosya | statik | hibrit | ne kayboldu |
|---|---:|---:|---|
| `llms-full.txt` | 203.424 B | 181.966 B | 6 yazının gövdesi |
| `_headers` | 43.034 B | 38.060 B | 6 sayfanın Link satırı |
| `llms.txt` (+`.well-known/`) | 16.259 B | 14.474 B | 6 girdi |
| `indexnow-durum.json` | 5.244 B | 4.700 B | 6 adres |
| `sitemap.xml` | 23.921 B | 23.921 B | **aynı küme** (aşağıya bak) |

Ayrıca **12 dosya hiç üretilmedi**: 6 `index.html` + 6 `.md` eşi.

Sebep mimari ve tek: ajan hattı, Link başlıkları ve IndexNow üreteçleri
`astro:build:done` kancasında **`dist`i gezerek** çalışıyor. Sayfa
`dist`te yoksa o üreteçler için sayfa **yoktur**. Yani hibrit bu üç
kancanın kaynağını, bir ayar değişikliği görünümü altında değiştiriyor.
`.md` eşleri projenin ajan hattının belkemiği ([[qanatone-ajan-hatti]]).

**Sitemap ayrık duruyor ve bu iyi haber:** koleksiyondan türediği için
adres kümesi bozulmadı. Aynı boyutta ama **bayt farklı** — `konu`
sayfalarının SIRASI iki koşumda değişti (`reklam` ↔ `sektor`). Küme
aynı, sıra kararsız. Hibritten bağımsız, **bugün de var olan** bir
belirsizlik; ayrı kalem.

## 5 · DEPLOY TARAFI — iki risk, ikisi de yerelde ölçülemez

**5a · Adaptör çıktısı yanlış dizine düşüyor.** Adaptör
`config.root`a yazıyor: `qanatone/yeni/.netlify/v1/functions/ssr/`.
Netlify'ın base dizini `qanatone/` (publish `dist` oradan çözülüyor),
yani baktığı yer `qanatone/.netlify/`. **Fonksiyon bulunmaz.**
Gereken: derleme zincirine bir taşıma adımı. Denenmedi.

**5b · `_redirects` splat'ı ile fonksiyon rotası çakışabilir.**
Üretilen fonksiyon `path:'/*'`, `preferStatic:true` ile geliyor;
bizim `_redirects` dosyamızın son satırı `/* /404.html 404`. Netlify'da
hangisinin önce geldiği **belgeye bakarak değil deneyerek** bilinir.
Yanlış sıra = istek anındaki her yazı 404. Şube dağıtımıyla ölçülmeli.

**5c ·** Fonksiyon `includedFiles:['**/*']` ile paketleniyor. Bugün
3,9 MB. 10.000 yazıda kaynak dosyalar ~37 MB; ayrıca adaptörün
`.netlify/v1/config.json`'ı `/_astro/*` için kendi `Cache-Control`unu
yazıyor — bizim `_headers` kuralımızla çakışma ihtimali ölçülmedi
([[qanatone-onbellek-sira-tuzagi]]: sonra gelen kural kazanır).

## 6 · SONDAJIN YAN ÜRÜNÜ — bugün var olan gizli bağ

Adaptör eklenir eklenmez derleme, hibritle hiç ilgisi olmayan bir
yerden çöktü:

```
ENOENT: ... open 'C:\projeler2\qanatone\yeni\index.html'
  at AstroComponentInstance.EskiGiris
```

`EskiGiris.astro` kök `index.html`i `new URL('../../../index.html',
import.meta.url)` ile okuyordu. O üç nokta **Astro'nun iç derleme
dizininin derinliğine** bağlı: statikte parça `dist/chunks/astro/`
altına düşüyor ve üç yukarı kök oluyor; adaptörle parça
`.netlify/build/chunks/astro/` altına düştü ve aynı üç nokta başka
bir yere çıktı.

Çare sayıyı değiştirmek değil, **işaret aramak**: kökte hem
`index.html` hem `content.json` durur, yukarı doğru o ikisi aranır.
Yama `kademe3-sondaj.diff` içinde; çıktıyı **değiştirmiyor** (temiz
derleme 87/0). Hibrit kararından bağımsız olarak alınabilir.

---

## SIRADAKİ ADIMLAR — ölçüme dayalı, karar Enes'te

1. **Denetimi sunucuya çevirmek** (bu turun gerçek işi, en büyük kalem).
   Bu yapılmadan hibrit yayına çıkarsa 13 kural yalan söyler.
2. **Türetilen yüzeyleri kaynağa bağlamak:** ajan hattı / Link
   başlıkları / IndexNow `dist` yerine koleksiyondan türemeli — sitemap
   zaten öyle çalışıyor ve tam da bu yüzden sağlam çıktı.
3. **Deploy sondajı (şube dağıtımı):** 5a taşıma adımı + 5b sıra hükmü.
4. `en/bulten/[slug]` ve arşiv rotalarının çevrilmesi — eğimin kalanı.
5. `_headers` çalışma anına taşınması (BULGU 6, hâlâ açık).

**Ölçülmeyen:** gerçek Netlify'da yanıt süresi, kenar önbelleği
davranışı, soğuk başlangıç. Hepsi dağıtım gerektirir.
