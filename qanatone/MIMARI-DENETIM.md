# MİMARİ DENETİM (gece zinciri TUR 7, 2 Eylül 2026)

**Bu belge hiçbir şeyi değiştirmez.** Envanter ve önceliklendirme. Üç salt-okunur
tarama (fazla yama + tek yazıcı; altyapı; tasarım + erişilebilirlik) aynı gece
koşuldu; her bulgu **nerede · ne kadar yaygın · düzeltme maliyeti (S/M/L) ·
düzeltilmezse ne olur** dörtlüsüyle yazıldı. Satır numaraları 2 Eylül gecesi
ağacına (commit bc49ed3) aittir. Karar sütunu Enes'in; buradaki sıra etki ×
maliyet tahminidir, hüküm değil.

## 0 · ÖNCELİK SIRASI (etki × maliyet)

| Sıra | Bulgu | Neden önce | Maliyet |
|---|---|---|---|
| 1 | **A1 · Film medyası CI'da yok → ilk gerçek deploy düşer.** `yeni/public/varlik/film/` (680 MB) ve `.medya-kurulum.json` git dışı; Netlify'da `MEDYA.kuruldu=false` → FM1/G2 kırmızı → `node yeni/denetim.cjs` exit 1. `kur-medya.cjs` build komutunda yok, kaynağı `C:\projeler2\...` sabit. | Yayın hattı bu hâliyle hiç koşmadı (8 commit `[skip ci]`); kırıklar birikmiş. | L |
| 2 | **M1/A3 · `public/varlik/*.js` (kabuk/pano/sizinti + tespit-fix json) derleme hattında üretilmiyor, tazelik kuralı yok.** K1 yalnız boyuta bakıyor. | `kabuk/efekt.js` düzenlenir, paket unutulur, eski JS yayına gider, hiçbir kural kırmızı yakmaz. Bu depodaki en sessiz kırılma yolu. | S (kaynak sha1'i pakete göm + K1'de kıyasla) |
| 3 | **M3/A13 · İki üretilmiş bloğun (Link başlıkları, sabit metin haritası) tek bekçisi `test/denetim.js`, o da CI'da `dist/yeni` yokken koşuyor** (alt küme = 60 sayfa hiç doğrulanmıyor); `npm test` build komutunda yok. | Kural var sanılıyor, yok. | M (kontrolleri `yeni/denetim.cjs`'e taşı) |
| 4 | **A6 · Eski suite `dist/yeni`'yi hariç tutuyor** (`test/denetim.js:1820`): 60 Astro sayfası mükerrer title/description/canonical, öksüz sayfa, alt'sız görsel, mükerrer id, JSON-LD geçerliliği ailelerinin tamamen dışında; yeni suite'te karşılıkları yok. | En kritik 60 sayfa en zayıf denetimde. | M |
| 5 | **M4/M19/A21 · Sayfa listesi 8 yerde elle** (`Temel SAYFALAR`, Nav ×2, `sitemap.xml.ts`, `admin buildSitemap`, `build.js`, `metin-harita BOLUM`, `denetim.cjs +19`). Bugün bile tutarsız (`/film`, `/hukuki`). | Yeni sayfa = 8 dosya; iki sayfa eklenip biri silinirse yanlış yeşil. | M |
| 6 | **A5 · CSS bütçesi yok**: hizmet parçası 138.375 B, ana 58.130 B; H18/H24 yalnız gzip HTML. TUR 3'te CSS bütçeden çıktı, hiçbir tavana girmedi. | En ağır sayfa 138 KB render-blocking taşıyor, büyümesini kimse görmüyor (TUR 4'ün "ilk kare 100-200 ms" adayı). | S |
| 7 | **E1+E2+E3+E4+E6 · Erişilebilirlik beşlisi**: atlama bağlantısı yok; kapalı mobil menü tab sırasında (13 görünmez durak); birincil düğme kontrastı 4,22:1; odaklanabilir kartta `outline:none`; küresel `:focus-visible` yok. | Hepsi S, her sayfayı etkiliyor, tek dosyada kapanır. | S×5 |
| 8 | **M9 · `EskiGiris` gömüsü kök `index.html`'in donmuş metni**: 9 `data-t` alanı artık panelden güncellenmiyor; panelde "Eski site / boş" görünüp gömüde canlı basılıyor. | İki gerçek kaynak: panelden hero metni değişir, `/film` eski metni gösterir. | M |
| 9 | **M15/A15 · Kesme mayını: yol ≠ canonical** (`/hizmet/<slug>` rota ↔ `/hizmetler/<slug>` canonical + sitemap + ItemList). R8 canonical'ı sitemap'le kıyaslıyor, dosya yoluyla değil. | Faz 4'te 18 URL 404. KESME-PLANI EK adım 1 bunu kapsıyor; kural yok. | M |
| 10 | **A31/A32/A33 · Ops**: CSP report-only + `report-uri` yok; `diagnose.js` `KOTA_TUZ` tanımsızsa FAIL-OPEN; panel Basic Auth'ta oran sınırı yok. | XSS yüzeyi ölçülmüyor; env silinirse sınırsız vekil. | M |
| 11 | **Y1+Y3+A25/A26 · 58 ölçüm betiği**: 10 ayrı sunucu (hiçbiri `_headers` uygulamıyor), 20+ dosyada tarayıcı yolu/port sabit, hepsi `~/.local/lib/film-olc` puppeteer'a bağlı (depoda yok). | Temiz makinede tek ölçüm koşmaz; üretim başlıkları ölçüme girmiyor (yanlış yeşil sınıfı). | S (tek `film/duzenek.cjs`) / L (bağımlılık) |
| 12 | **T3/T4 · Aralık ve kırılım ölçeği yok** (23 dolgu clamp'i, 15 kırılım değeri). | 760-980 px bandında nav mobil, footer/hero masaüstü. | L |

## 1 · FAZLA YAMA (aynı iş iki yerde, ölü dal, kopya gövde)

| # | Bulgu | Nerede | Yaygınlık | Maliyet | Düzeltilmezse |
|---|---|---|---|---|---|
| Y1 | 58 ölçüm betiği, 29'u tarayıcı açıyor, 10'u kendi statik sunucusunu kuruyor; 8 farklı MIME tablosu; hiçbiri `_headers` uygulamıyor (tek uygulayan `yerel-sun.cjs`) | `film/olc.cjs:50`, `olc-devir.cjs:41`, `olc-efekt.cjs:41`, `olc-pencere.cjs:47`, `olc-giris.cjs:15`, `panel-kapi.cjs:28`, +4 satır içi | 10 sunucu | L | ölçümler üretim önbellek/başlık davranışını görmüyor |
| Y2 | Numaralı kopyalar hiç silinmemiş (`olc-titreme` ×4, `kiyas` ×3, `crf-tarama` ×2, `dikis*` ×6, `kontak*` ×3) | `yeni/film/` | 19 betik ≈ 6 iş; 82 JSON + 84 çıktı | M | hangi JSON güncel, kural yok |
| Y3 | Tarayıcı yolu ve port her betikte elle | 20+ dosya `CHROME=`, 20 dosya `8790` | 20+ | S | makine değişince biri unutulur, ölçüm başka tarayıcıda koşar |
| Y4 | `sur()` ViewTimeline sürücüsü iki dosyada birebir (yorum dahil) | `HizmetGovde.astro:392`, `SAAkis.astro:155` | 2 | S | `16e3` sabiti ayrışırsa iki demo ailesi farklı tempo |
| Y5 | `sur` adı üçüncü anlamda (rAF zamanlayıcı) | `ProjeDizin.astro:235` | 1 | S | refactor eden yanlış taşır |
| Y6 | `m(k,…)` yardımcısı 6 bileşende, İKİ imzayla (3 arg ↔ 2 arg) | `Temel:48`, `Nav:26` ↔ `BultenDizin:26`, `OtomasyonGovde:36`, `SssGovde:17`, `SurecGovde:19` | 6 / 2 imza | S | `metin-harita` yalnız 3 arg'ı tarıyor; 2 arg'lıların EN varsayılanı panele düşmüyor (haritada `"en":""`) |
| Y7 | `sema.mjs` içinde `T()` ×7, `KOK` ×7, `strip()` ×2 yeniden tanımlı (`icerik.ts` ikisini dışa veriyor) | `src/sema.mjs` | 16 | S | alan adı değişince 7 satır |
| Y8 | IntersectionObserver kalıbı 11 yerde elden | `HizmetGovde:409`, `MotorSahne:974`, `Nav:165`, `OtomasyonGovde:283`, `SAAkis:171`, `SHHero:101`, `SPDeste:125`, `efekt.js:169,174,374`, `sizinti.js:78` | 11 | M | görünürlük eşiği ürün kararı olamıyor |
| Y9 | resize 180 ms debounce + RO + fonts.ready düzeneği 8 bileşende; `efekt.js:23` ortak otobüs kullanılmıyor | `AkisSahne:157`, `AracSahne:655`, `CanliSahne:206`, `MotorSahne:959`, `OtomasyonGovde:389,469`, `PlatformSahne:464`, `SerpSahne:191` | 8 | M | döndürmede 8 setTimeout + 7 RO okuması |
| Y10 | 8 bağımsız rAF döngüsü, ortak tik yok | `efekt.js:60,152,340,346`, `sizinti.js:72`, `motor.ts:866`, `Film.astro:610`, `ProjeDizin:233` | 8 | M | J1/K1 bayt ölçüyor, kare işini değil |
| Y11 | Kaydırma güdümü iki mekanizma: CSS `view()` (12) ↔ JS `ViewTimeline` (2); yetenek iki yoldan yoklanıyor | `ana.css`, `blok.css`, `deste.css`, `hero.css`, … ↔ `HizmetGovde:393`, `SAAkis:156` | 14 | M | destek eşiği ayrışırsa bir kısım demo donar |
| Y12 | `amCW/amCCW` iki yerde; `akCta`, `akSend` aynı dosyada iki kez | `demo-detay.css`, `MotorSahne.astro` | 4 | S | scope kalkarsa son tanım kazanır |
| Y13 | Stil iki mekanizmada: 22 `stil/*.css` + 20 `.astro` scoped `<style>` | 20 dosya | 42 | L | `inlineStylesheets:auto` ile H18 tahmin edilemez |
| Y14 | `.vh` yalnız `nav.css:39`'da tanımlı, `Temel.astro:142` kullanıyor | 1 | S | Nav kalkarsa gizli h2 görünür |
| Y15 | `esc()` 3 kopya, ikisi farklı davranıyor (`admin.html` `>` kaçırmıyor) | `build.js:414`, `rss.xml.ts:18`, `admin.html:181` | 3 | S | panel ↔ site aynı metni farklı kaçırıyor |
| Y16 | `deneme-react.astro` + `DenemeAda.tsx` ölü; react/react-dom/@astrojs/react/motion + `integrations:[react()]` ayakta | `astro.config.mjs`, `package.json` | 1 sayfa, 6 paket | S | her `npm ci` React kuruyor; `+19` bunu taşıyor |
| Y17 | `kunyeyiSoy()` vite eklentisi kendi yorumunda ölü | `astro.config.mjs` | 1 | S | — |
| Y18 | Referanssız veri dosyaları | `src/veri/kara-izgara.txt`, `logo-kunye.json` | 2 | S | bayat kaynak sanılır |
| Y19 | `METIN_HARITA` "Eski site" 146 anahtar: panelde düzenlenebilir, yeni site okumuyor (~%40 bütçe) | `admin.html` | 146 | M | kullanıcı doldurur, görünmez (TUR 5 raporunda bilinçli; kesmede silinir) |
| Y20 | İki denetim çatısı, iki `ol()`, ortak yardımcı yok; build komutu yalnız `yeni/denetim.cjs` | `test/denetim.js:43`, `yeni/denetim.cjs:13` | 2 | M | bkz. M3 |
| Y21 | `denetim.cjs`'te 8 ayrı `const TAVAN` | `:216,217,218,661,866,1076,1298,1606` | 8 | S | "bütçe" tablosu yok |
| Y22 | `_headers` %96 makine üretimi (240/250 kural) ama elle düzenlenebilir görünüyor | `_headers:81-562` | 1 | M | blok içine elle yazılan kural ilk koşumda silinir |

## 2 · MİMARİ HATA (tek yazıcı ihlali, korumasız kaynak → kopya)

| # | Bulgu | Nerede | Yaygınlık | Maliyet | Düzeltilmezse |
|---|---|---|---|---|---|
| M1 | Derlenmiş kabuk kopyaları depoda, üretim hattında üretilmiyor, tazelik kuralı yok | `kabuk-derle.cjs`, `public/varlik/*`, `netlify.toml:5` | 5 dosya, 0 koruma | S/M | sessiz bayat JS yayına |
| M2 | Link bloğu tazelik kapısı ALT KÜME: silinen sayfanın satırı sonsuza kadar kalır | `link-basliklari.cjs:46-53` | 240 satır | S | silinmiş URL'ye canonical başlığı |
| M3 | İki üretilmiş bloğun tek bekçisi CI'ın koşmadığı `test/denetim.js` | `test/denetim.js:2576,2593`, `netlify.toml:5` | 2 kapı | S | elle koşuma bağlı |
| M4 | Sayfa listesi 8 yerde elle; bugün tutarsız (`/film`, `/hukuki`) | `Temel:67`, `Nav:45,140`, `sitemap.xml.ts:36`, `admin:271`, `build.js:691`, `metin-harita:16`, `denetim:88` | 8 | M | yeni sayfa = 8 dosya |
| M5 | Ana sayfa 15 sahne TR/EN ayrı elle; 7 sayfa çifti aynı desen | `pages/index.astro`, `pages/en/index.astro` +14 dosya | 16 | M | iki dil farklı sayfa gösterebilir, kural yok |
| M6 | Üç sitemap üreteci, üç çıktı; panelinki `build.js`'in HATA dediği `?lang=en` hreflang'ı üretiyor ve "kök klasöre koy" diyor | `build.js:368`, `sitemap.xml.ts:28`, `admin.html:269,821` | 3 | M | yanlış hreflang yayına |
| M7 | İki RSS üreteci, gövdeler elle senkron | `build.js:413`, `rss.xml.ts:15` | 2 | S | iki feed farklı kimlik |
| M8 | `content.json` 5 okuyucu / 1 yazıcı / 3 yol stratejisi (cwd, `__dirname`, Astro file, JSDOM shim) | `icerik.ts:9`, `content.config.ts`, `build.js:147`, `denetim.cjs:86`, `yayinla.js:46` | 5 | M | dizin değişirse denetim başka içerikle kıyaslar |
| M9 | `EskiGiris` gömüsü donmuş; 9 `data-t` kancası panelden güncellenmiyor | `EskiGiris.astro:28,39` | 9 alan × 2 sayfa | M | iki gerçek kaynak |
| M10 | Aynı bayrak iki ad alanı: `theme.testi` ↔ `settings.testi` (TUR 5 düşüş zinciri); `theme.motion` ↔ `settings.*` | `SSBSozBandi:34`, `Temel:50,54` | 2 | S | hangi taraf kazanır, kod okumadan bilinmez |
| M11 | 32 MiB film bütçesi 6 kodda sabit, kapı kaldırılmış; gerçek üç eşik `denetim.cjs`'te gömülü | `crf-tarama*.cjs`, `envanter.cjs:28`, `olc-butce.cjs:39,143`, `uret.cjs:187` | 6+2 | M | betikler kalkmış kapıya göre karar veriyor |
| M12 | `fps` iki kaynakta (`ayar.mjs` ↔ `kanon.json`); koruma testi CI dışı | `src/film/ayar.mjs`, `kanon.json` | 2 | S | eşikler NaN |
| M13 | `/yeni/*` sayfalarında `noindex` + kök canonical (HTML'de zaten vardı; TUR 6 HTTP Link aynı sinyali tekrarlıyor) | `Temel.astro:77`, `_headers` 124 `/yeni` yolu | 124 URL | M | çelişkili sinyal; kesmeye kadar bilinçli (Anayasa N1), kesmede ikisi birlikte döner |
| M14 | `/yeni/sitemap.xml` hiçbir `/yeni` adresi listelemiyor: kök sitemap'in ikizi | `sitemap.xml.ts:52-57` | 2 dosya | S | ayrışırsa doğru olan bilinmez |
| M15 | Rota `/hizmet/` ↔ canonical/sitemap/ItemList `/hizmetler/` | `Nav:78`, `HizmetDizin:111`, `SAAkis:97`, `SKKatman:77,83`, `sema.mjs:217`, `sitemap.xml.ts:39` | 7 | M | kesmede 18 URL 404 |
| M16 | İş aritmetiği sabitleri iki canlı sitede (`hesap.mjs` ↔ `index.html`; `huni.mjs DEG`; `ton.ts HUE`) | 3 küme × 2 | M | aynı ziyaretçiye iki para hesabı |
| M17 | `HUE` yeni içinde de ikiye bölünmüş (`ton.ts` ↔ `SPDeste.astro:36`; yorum "kopya değil bağ" diyor, kopya) | 2 | S | deste ↔ şerit farklı ton |
| M18 | Üç "boş hâl" tanımı (`admin BLANK`, `build.js C0`, `content.json`); `C0` dalı pratikte hiç çalışmıyor | `admin.html:297`, `build.js:81,682` | 3 | M | ölü yedek dalı test edilmiyor |
| M19 | Sayfa sayısı `+19` sihirli sabit; geçici +1/+2'ler kalıcılaştı | `denetim.cjs:88` | 1 | S | iki ekle/bir sil = yanlış yeşil |
| M20 | `admin.html` fonksiyon paketine 4 aday yoldan, bütünlük kontrolü yok | `panel.js:51-54`, `netlify.toml:24` | 1 | S | — |
| M21 | `olcum/sonuc.json` tazelik kuralı var ama ölçüm `no-store` sunucudan (üretim `immutable`) | `denetim.cjs:2091`, `olc.cjs:54` | 1 | M | "4G ilk kare" kapısı yanlış zeminde |

## 3 · ALTYAPI EKSİĞİ

| # | Bulgu | Nerede | Maliyet | Düzeltilmezse |
|---|---|---|---|---|
| A1 | Film medyası (680 MB) ve kurulum damgası git dışı; `kur-medya.cjs` build komutunda yok, kaynağı sabit yol | `.gitignore`, `denetim.cjs:42-66,1057,2009`, `kur-medya.cjs:76` | L | **ilk deploy düşer** |
| A2 | Son 8 commit `[skip ci]` (kural: push yok): Netlify zinciri haftalardır koşmadı | `git log` | S | CI'ya özgü kırıklar birikmiş patlar |
| A3 | `kabuk.js` tazelik kuralı yok (= M1) | `denetim.cjs:2283-2304` | S | — |
| A4 | `tespit-fix.tr/en.json` sıfır kural (runtime'da çekiliyor) | `STETespit.astro:256` | S | teşhis panelinin sessiz ölümü |
| A5 | CSS bütçesi yok (138.375 / 58.130 / 27.251 B) | `dist/yeni/_astro/*.css` | S | büyüme görünmez |
| A6 | Eski suite `dist/yeni`'yi hariç tutuyor; 10 kural ailesi 60 sayfaya uygulanmıyor | `test/denetim.js:1820,1981-2035` | M | — |
| A7 | JSON-LD yalnız `JSON.parse`, kısmi (önekli sayfalar, ilk blok, `@type` semantiği yok) | `denetim.cjs:299-303` | M | — |
| A8 | Görsel boyutları attribute varlığıyla ölçülüyor, gerçek pikselle değil | `denetim.cjs:112-127,1064` | M | yanlış oran = CLS, kural yeşil |
| A9 | Font altküme kapsamı yalnız `index.html`'den ve deklarasyondan (`unicode-range` iddia) | `denetim.cjs:242-281` | M | tofu, yanlış yeşil |
| A10 | EN 404 yok (`dist/404.html` `lang="tr"`) | `build.js:801` | S | — |
| A11 | `_redirects` `/yeni/*` rotalarını içermiyor; kapsam kuralı da görmüyor | `build.js:787-801` | S | — |
| A12 | `yayinla.js` gövde şeması doğrulanmıyor (`typeof === 'object'`) | `yayinla.js:146` | M | bozuk content.json → derleme düşer, geri alma elle |
| A13 | Sıralama tuzağı: Link/harita kontrolleri `dist/yeni` yokken koşuyor (= M3) | `netlify.toml:5`, `build.js:836-845` | M | — |
| A14 | `_headers` üretim → kopya sırası elle (`KOPYA` listesi) | `build.js:81` | S | bayat `dist/_headers` |
| A15 | Kesme mayını yol ≠ canonical (= M15); R8 dosya yoluna bakmıyor | `denetim.cjs:598-640` | M | 18 × 404 |
| A16 | Deterministik olmayan çıktı (`new Date()` lastmod, üretim tarihi damgası) | `sitemap.xml.ts:32`, `build.js:91,313` | S | iki derlemenin diff'i asla boş değil |
| A17 | Node sürümü: Netlify 22, yerel 24, `.nvmrc`/`engines` yok; T1 notu "Node 20" | `netlify.toml:13`, `denetim.cjs:1392` | S | — |
| A18 | Yeni suite regex ile HTML ayrıştırıyor; `link-basliklari.cjs:24` `slice(0,6000)` head 6 KB'ı aşarsa sayfa sessizce düşer | çeşitli | M | — |
| A19 | `link-basliklari.cjs:19` sabit dizin kara listesi | 1 | S | yeni varlık klasörü sayfa sanılır |
| A20 | FM1 bayatlık ölçüsü `mtime` (git korumaz) | `denetim.cjs:2089` | S | CI'da yapısal yeşil |
| A21 | Sayfa sayısı elle sabit (= M19) | `denetim.cjs:89` | S | — |
| A22 | "Kırmızı = deploy düşer" pratikte doğrulanmamış; tavanlar elle büyütülüyor | `denetim.cjs:151-215,2100` | M | bütçe disiplini belge, kapı değil |
| A23 | `DENETIM_ATLA=1` kaçış kapısı; üretimde tanımsızlığı ölçen kural yok | `build.js:836` | S | — |
| A24 | Astro artıkları yayında (`content-assets.mjs`, `content-modules.mjs`) | `dist/yeni/` | S | — |
| A25 | 14+ rig `~/.local/lib/film-olc/node_modules/puppeteer-core`'a bağlı; depoda/package.json'da yok | `panel-kapi.cjs:19`, `olc-*.cjs` | L | temiz makinede ölçüm koşmaz |
| A26 | Brave/Chrome yolu ~20 dosyada sabit; `TARAYICI` env'i tutarsız | çeşitli | S | — |
| A27 | Masaüstü 4K kaynak ağacı depo dışı, manifestsiz | `dikis-yerel.cjs:36`, `envanter.cjs:25`, `kesit-uret.cjs:32`, `olc-butce.cjs:32` | L | film hattı yeniden üretilemez |
| A28 | Python zinciri kayıtsız (`font-uret.py`, `amblem-sdf.py`; requirements yok) | `yeni/` | S | — |
| A29 | 16 env değişkeni belgesiz/doğrulamasız | rig'ler | S | — |
| A30 | Depo kökü `C:\projeler2`; kökte takipsiz `.gitignore`, `agent-reach/`, loglar; `qanatone/` içinde 20+ takipsiz diff; 679 MiB `git add -A` kazası yüzeyi açık | `git status` | S | — |
| A31 | CSP report-only, `report-uri/report-to` yok; `'unsafe-inline'` + `frame-src https:` | `_headers:61` | M | XSS yüzeyi ölçülmüyor |
| A32 | `diagnose.js` `KOTA_TUZ` tanımsızsa FAIL-OPEN | `diagnose.js:155-158` | M | sınırsız vekil |
| A33 | Panel Basic Auth'ta oran sınırı yok (yalnız 300 ms) | `panel.js:31`, `yayinla.js` | M | — |
| A34 | `panel-kapi.cjs` depo `content.json`'unu 3 kez yazıyor, yedek `os.tmpdir()`, SIGINT'te geri yükleme yok | `panel-kapi.cjs:25,115-157` | S | Ctrl+C depoyu kirli bırakır |
| A35 | `yayinla.js` `GITHUB_TOKEN` ile doğrudan commit; kapsam/rotasyon belgesiz | `yayinla.js:153` | M | — |

## 4 · TASARIM HATASI (sayfalar arası tutarsızlık)

| # | Bulgu | Nerede | Yaygınlık | Maliyet | Düzeltilmezse |
|---|---|---|---|---|---|
| T1 | İki ayrı proje kartı bileşeni, ortak kural yok (başlık 1.42rem/700 ↔ 1.16rem/400, etiket hap ↔ çıplak, metin tx2 ↔ tx3) | `stil/deste.css:120-152` (.sp-kart) ↔ `parcalar/ProjeDizin.astro:318-370` (.mi) | 2 bileşen, 2 sayfa | L (tek kart) / M (token) | ana → arşiv geçişinde kimlik kopuyor |
| T2 | Dönen ışık halkası üç kez ayrı yazılmış (+ dördüncü konik) | `hero.css:198-218`, `film.css:126-153`, `temel.css:125-134`, `ProjeDizin.astro:406` | 4 | M | hız/kuyruk ayarı üç yerden bakım; film-halka testi ikisini bekçiliyor |
| T3 | 23 farklı kart dolgusu clamp'i, aralık token'ı yok (`--gut` dışında) | `stil/*.css` | 23 | L | yan yana bölümlerin iç boşluğu tutmuyor |
| T4 | Kırılım noktaları 15 farklı değerde (520…1100); "mobil" nav 980, kabuk 760, ana 640, blok 720, otomasyon 820, motor 860 | `nav.css:157`, `kabuk.css:118`, `ana.css:129`, `blok.css:105`, `OtomasyonGovde.astro:961`, `MotorSahne.astro:872` | 15 değer | L | 760-980 bandında nav mobil, footer/hero masaüstü: üç düzen aynı ekranda |
| T5 | 229 gömülü renk değeri (token varken) | 39 dosya; en yoğun OtomasyonGovde 25, MotorSahne 21, film.css 15, demo-detay 14, akis 12 | 229 | M | kızılı değiştirmek 39 dosya; tema imkânsız |
| T6 | Bölüm başlığı ölçeği sahne başına kopya (`clamp(1.6rem,4vw,3.1rem)` ×6, iletisim sebepsiz sapıyor); kabuk h2 token'ı ana sayfada kullanılmıyor | `akis/katman/kurucu/sektor/sozler/tespit.css`, `iletisim.css:31`, `temel.css:67` | 7 | S | — |
| T7 | Hap düğme dolgusu 9 farklı değerde | `temel.css:94`, `hero.css:170,231`, `nav.css:119,207`, `kabuk.css:70`, `iletisim.css:39`, `deste.css:149`, `HizmetGovde.astro:354` | 9 | M | hero + iletişim aynı sayfada iki boy birincil çağrı |
| T8 | Dört ayrı "hayalet düğme" (kenarlık/zemin/dolgu ayrışık) | `sektor.css:201`, `hero.css:230`, `deste.css:149`, `iletisim.css:39` | 4 | M | — |
| T9 | Çip bileşeni iki kez (`.kdc` ↔ `.tpchip`), detay paneli kelimesi kelimesine aynı | `blok.css:82-96`, `blok.css:154-162` | 2 | S | — |
| T10 | Mikro etiket 12 boy × 15 harf aralığı (8.4-12px; .04-.26em) | site geneli | 27 değer | M | — |
| T11 | `.kunye i` noktası altı dosyada kopya | `ana/akis/iletisim/kurucu/sektor/sozler.css` | 6 | S | — |
| T12 | Font token'ları ölü soyutlama (`--f-baslik`=`--f-tek`=`--f-govde`); ağırlık kuralı çelişik (h1-h5 700 ↔ `.ana h1,h2` 500) | `aile.css:12-13`, `temel.css:65`, `ana.css:15` | 2 | S | ana ile iç sayfa başlıkları farklı ağırlık |
| T13 | Token yerine `inherit`/gömülü aile | `kabuk.css:72`, `demo-detay.css:69,93`, `film.css:367` | 4 | S | — |
| T14 | Hover kapısı tutarsız: dokunmatikte yapışan hover (hero'da çözülmüş, footer/kaydırıcıda değil) | `kabuk.css:73,82,107`, `sektor.css:197`, `blok.css:86,157` | 6 | S | — |
| T15 | `.sse-cagri` aynı dosyada iki kez, ilki ölü (`margin-top` kayboluyor) | `sektor.css:154` ↔ `:200` | 1 | S | — |
| T16 | Yüzey tonu 6 ad-hoc alfa; `--card2` tek kullanım | dağınık; `sektor.css:196` | 6 | M | — |
| T17 | `<details>` açılma işareti kaldırılmış, yerine bir şey konmamış (6 details/hizmet sayfası); üç `<details>` deseni üç affordance | `HizmetGovde.astro:289-290` ↔ `SssGovde.astro:50-52`, `kurucu.css:42-46` | 6×9 sayfa | S | içeriğin açıldığı keşfedilmiyor |
| T18 | Köşe yarıçapı 8…20px serbest | `temel.css`, `sektor.css`, `blok.css`, `ProjeDizin.astro:328` | 10 değer | S | — |
| T19 | `amCW` keyframe iki dosyada kopya | `MotorSahne.astro:500`, `demo-detay.css:274` | 2 | S | — |

## 5 · ERİŞİLEBİLİRLİK

Olumlu taban (ölçüldü): sayfa başına tek h1 (8 örnek sayfa), EN rotalarında doğru `lang`, dekoratif tuval/SVG'de `aria-hidden` tam (94 kullanım / 58 svg), `img alt` eksiksiz, `inert` doğru yerde, hareket azaltma 36 dosyada 54 kural (üç dönen halka kapalı, mobil menü kapsanmış).

| # | Bulgu | Nerede | Yaygınlık | Maliyet | Düzeltilmezse |
|---|---|---|---|---|---|
| E1 | **Atlama bağlantısı yok**; Nav her sayfada ~25 odak durağı | `layouts/Temel.astro:95-113`, `Nav.astro` | her sayfa | S | klavye kullanıcısı içeriğe ~30 durakta varıyor (WCAG 2.4.1) |
| E2 | **Kapalı mobil menü tab sırasında** (yalnız opacity + clip-path + pointer-events; `visibility:hidden`/`inert` yok): 13 görünmez durak | `nav.css:177-184`, `Nav.astro:126-163` | her mobil sayfa | S | odak ekran dışına kaçıyor |
| E3 | **Birincil düğme kontrastı AA altı**: `#ef233c` üstünde `#fff` = 4,22:1 (16,5px/600; 4,5 gerekir); nav CTA, hover `#ff2f47` 3,65:1 | `temel.css:94`, `nav.css:121,146,218`, `demo-detay.css:69,93` | ~6 nokta, her sayfa | S | (not: `--tx3` .50 = 5,3:1 ve `--tx4` .48 = 4,95:1 GEÇİYOR; brifing varsayımı yanlıştı) |
| E4 | **Odak halkası açıkça siliniyor** odaklanabilir kartta (`outline:none` + `tabindex=0`) | `sozler.css:166-167`, `SSZSozler.astro:70` | ~10 kart | S | klavye odağı görünmez (2.4.7) |
| E5 | **EN sayfalarında Türkçe canlı bölge metni** (`Gönderiliyor…`, `Talebin bize ulaştı…`, `WhatsApp'tan gönder`) `aria-live` içinde | `SILIletisim.astro:152,160,163,168`; dist/yeni/en/* doğrulandı | EN form olan sayfalar | S | — |
| E6 | **Küresel `:focus-visible` yok**; 12 dosya nokta atışı, gerisi UA varsayılanı (`#050505` üstünde kızıl bağda ayırt edilmiyor) | `temel.css` | site geneli | S (tek kural) | — |
| E7 | Honeypot alanı erişilebilirlik ağacında (`left:-9999px`, gerçek label, `aria-hidden` yok): ekran okuyucu doldurursa Netlify spam sayıp ATAR | `SILIletisim.astro:71-72`, `BultenDizin.astro:89-90` | 2 form | S | kör kullanıcının talebi sessizce kayboluyor |
| E8 | `aria-expanded` sitede 0; açılır paneller yalnız `:hover/:focus-within`, Escape yok | `Nav.astro:73,87,101`, `nav.css:87-90` | 3 panel | M | SR durumu duymuyor, klavyeyle açılan panel kapanmıyor |
| E9 | `role="radiogroup"` içinde radyo yok (input'lar grubun dışında) | `SSBSozBandi.astro:48-67`, `SSESektor.astro:103-116` | 2 sahne | S | grup adı/konumu ("3'ün 2'si") kayıp |
| E10 | Bulunulan sayfa `aria-current="page"` yok; dil bağlarında yanlış değer (`"true"`) | `Nav.astro:71,99,116-117` | her sayfa | S | — |
| E11 | 8,4-10,5px arası 55 metin bildirimi (büyük harf + geniş aralık) | `MotorSahne.astro` ×6, `OtomasyonGovde.astro:942,944`, `nav.css:103`, `YaziGovde.astro:103,105`, `PlatformSahne.astro` ×4 | 55 | M | 200% dışında okunmuyor |
| E12 | Kontrast düşüşleri: `.sh-meta` 2,96:1 @10px, `.sus-kaydir span` 2,53:1 @9px, `.ssb-kim span` 3,29:1 | `hero.css:241,254`, `sozband.css:61` | 3 | S | — |
| E13 | Metin dışı kontrast: pasif taşıyıcı noktaları 1,57:1 (3:1 gerekir) | `sozband.css:70` | 1 | S | kaçıncı sözde olunduğu görünmüyor |
| E14 | Form hata bildirimi yok (`aria-describedby`/`aria-invalid` 0; zorunlu alan işaretsiz) | `SILIletisim.astro:74-91` | 1 form | M | — |
| E15 | Ajan balonu: `role="dialog"` + `aria-live` aynı öğede; odak yönetimi yok; kapalıyken `.acts` düğmeleri tab sırasında | `Temel.astro:104`, `kabuk.css:70` | her sayfa | M | — |
| E16 | Dokunma hedefleri eşiğin altında (dil bağı ~23px, kaydırıcı düğmeleri ~28px, footer bağları ~20px, çipler ~26px); doğru örnekler var (ssb-nokta 24, nv-mx 44, nv-mcta 54) | `nav.css:114`, `sektor.css:194-196`, `kabuk.css:70,105`, `blok.css:82,154` | 5 sınıf | M | — |
| E17 | `tabindex="0"` gereksiz durak (`<article>` rol/ad yok); doğru örnek `SAAkis.astro:94` | `SSZSozler.astro:70` | ~10 | S | — |
| E18 | Footer bağlantıları renkten başka ipucu taşımıyor (`text-decoration:none`, odak stili yok) | `kabuk.css:105-116` | her sayfa | S | WCAG 1.4.1 |
| E19 | Sistem imleci gizleniyor (`cursor:none!important`), yalnız panel bayrağına bağlı; a11y tercihine bağlı değil | `kabuk.css:53` | her sayfa (masaüstü) | S | OS imleç boyutu/kontrastı kullananlar imleci kaybediyor |
| E20 | Kaydırıcı ön ayar düğmelerinde `aria-pressed` yok; `<input type=range>` `aria-valuetext` yok ("45000" ↔ "45.000 ₺") | `SSESektor.astro:207`, `sektor.css:183-198` | 1 sahne | S | — |
| E21 | Yanıp sönen imleç (`akCaret`) hareket azaltma listesinde görünmüyor (doğrulanmalı) | `akis.css:196` ↔ `:329-331` | 1 | S | — |
| E22 | Footer'da her sayfaya gizli `h2` (ana hat sonuna anlamsız düğüm); `.vh` sınıfı nav.css'e bağımlı | `Temel.astro:142`, `nav.css:39` | her sayfa | S | — |
| E23 | `<summary>` içinde `<h3>` + `<p>` (başlık gezintisi düğmenin içine bırakıyor; T17 ile birleşince açılabilirlik fark edilmiyor) | `HizmetGovde.astro:144,155,171,189` | 4×9 sayfa | S | — |

En ucuz, en yüksek getirili beşli: E1 · E2 · E3 · E4 · E6 (hepsi S, tek dosyada kapanır). En pahalı iki kalem: T3 / T4 (aralık ve kırılım ölçeği, L).
