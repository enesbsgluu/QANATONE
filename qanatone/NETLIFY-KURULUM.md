# Netlify kurulumu — build 115

## Derleme ayarları

| Alan | Değer |
|---|---|
| Build command | `npm ci && node build.js` |
| Publish directory | **`dist`** |
| Node version | 20 veya üstü |

**Repo bağlama:** Netlify > Add new site > Import an existing project >
GitHub > `enesbsgluu/QANATONE`, branch `main`. Ayarlar zaten
`netlify.toml`'da (build command, publish dir, Node sürümü) — panelden
elle girmeye gerek yok, yalnız ortam değişkenlerini gir (aşağıda).

`dist` şart. Üreteç kaynağa dokunmuyor; çıktı ayrı klasöre yazılıyor.
(Bir kez çıktı kaynağın üzerine yazıldı ve ikinci koşuda "önceden
render edilmiş sayfayı yeniden render etme" durumu oluştu — o yüzden
kaynak ve çıktı artık asla aynı yerde durmuyor.)

## Ortam değişkenleri

| Değişken | Ne için | Zorunlu mu |
|---|---|---|
| `PANEL_PAROLA_HASH` | admin.html'deki "Yayınla" düğmesinin parola kapısı — `salt:hash` (scrypt) | otomatik yayın isteniyorsa; yoksa fonksiyon 503 ile kapalı durur |
| `GITHUB_TOKEN` | `yayinla` fonksiyonunun `content.json`'ı commit etmek için kullandığı GitHub PAT (yalnız bu repoya Contents yazma izni yeterli) | `PANEL_PAROLA_HASH` ile birlikte |
| `INDEXNOW_KEY` | Bing/Yandex/Naver/Seznam/Yep'e anında bildirim | hayır ama tavsiye |
| `WA_TOKEN` `WA_PHONE_ID` `WA_TO` | form → WhatsApp | form bildirimi isteniyorsa |
| `WA_TEMPLATE` `WA_LANG` | onaylı şablon kullanılacaksa | hayır |

**`PANEL_PAROLA_HASH` nasıl üretilir:** yerelde
`node netlify/parola-hash.js` çalıştır, parolayı yaz/yapıştır, çıkan
`salt:hash` satırını olduğu gibi Netlify'a yapıştır. Parolanın kendisi
hiçbir dosyaya yazılmaz, yalnız bu çıktı ortam değişkeninde durur.

**IndexNow anahtarı nasıl üretilir:** 8–128 karakter, harf ve rakam.
Örneğin `openssl rand -hex 16` çıktısı. Netlify'a `INDEXNOW_KEY` olarak
gir; üreteç doğrulama dosyasını (`<anahtar>.txt`) kendisi basıyor ve
derleme production ise ping'i kendisi atıyor.

**Google için IndexNow yok** — Google protokole katılmıyor, sitemap ping
adresleri 2023'te kaldırıldı, Indexing API yalnız JobPosting ve
BroadcastEvent için. Google tarafı: sitemap + iç linkleme + Search
Console'dan "indeksleme iste". Bu bir mimari eksiği değil, Google'ın
politikası — WordPress'e geçmek de değiştirmez.

## Üretilen dosyalar

29 sayfa: `/`, `/hizmetler`, 9 hizmet detayı, `/projeler`, 7 proje,
`/otomasyon`, `/surec`, `/sss`, `/bulten`, 6 yazı.
Ayrıca `sitemap.xml` (29 URL, lastmod'lu), `robots.txt`, `bulten/rss.xml`,
`shell.html`.

`shell.html` ne işe yarar: statik sayfalar yalnız kendi rotasının
bölümlerini taşıyor (yoksa 29 sayfa aynı 21.000 karakteri taşıyor ve
arama motoru için kopya içerik oluyordu). Ziyaretçi tarayıcıda
gezinebilsin diye eksik bölümler açılışta bu dosyadan geri alınıyor.
Bot bunu çalıştırmadığı için ham HTML temiz kalıyor.

## Doğrulama

Yayından sonra:
1. Herhangi bir sayfada **kaynağı görüntüle** (DevTools'un Elements
   sekmesi değil — o JS sonrasını gösterir) ve içerikten bir cümle ara.
   Bulunuyorsa AI tarayıcıları da okuyabiliyor demektir.
2. Search Console'a `sitemap.xml` gönder.
3. Bing Webmaster Tools'a da ekle — ChatGPT büyük ölçüde Bing indeksini
   kullanıyor.

---

# build 119 · ne değişti

## İngilizce artık ayrı adres

`?lang=en` yerine **`/en/...` yol öneki**. Sebep: sorgu dizesi sunucuda
dosya değiştirmiyor, o yüzden `?lang=en` adresine giren AI tarayıcısının
eline Türkçe HTML geçiyordu. Artık iki dilin de kendi dosyası var:
`/hizmetler` ve `/en/hizmetler`. **58 sayfa** üretiliyor (29 TR + 29 EN),
hreflang doğru bilgi veriyor.

`?lang=en` geriye dönük uyumluluk için çalışmaya devam ediyor.

## Artımlı derleme

Her yayında bütün site yeniden basılmıyor. Her rotanın **girdilerinin
özeti** alınıyor; özet değişmediyse sayfa önbellekten kopyalanıyor.

| değişiklik | basılan sayfa | süre |
|---|---|---|
| hiçbir şey | 0 / 58 | 3 sn |
| bir bülten yazısı | 4 / 58 | 10 sn |
| bir hizmet metni | 8 / 58 | 15 sn |
| `index.html` (kod) | 58 / 58 | ~100 sn |

Kod değişince her şeyin yeniden basılması **doğru** — kabuk her sayfada.

Önbellek `.onbellek/` klasöründe ve Netlify derlemeleri arasında
`plugins/onbellek` eklentisiyle taşınıyor (`netlify.toml` içinde tanımlı).
Önbellek yoksa tam derleme olur, yani en kötü durum eski durum.

**Elle tam derleme:** `TAM_DERLEME=1 node build.js`

## netlify.toml

Artık ayarlar dosyada; panelden girmeye gerek yok. Sadece ortam
değişkenlerini (`PANEL_PAROLA_HASH`, `GITHUB_TOKEN`, `INDEXNOW_KEY`,
`WA_*`) arayüzden gir.

---

# Panel yayın hattı — parola korumalı otomatik commit

admin.html'deki **Yayınla** düğmesi `netlify/functions/yayinla.js`
fonksiyonuna parola + o an panelde duran içeriği (`content.json`) POST
eder. Netlify Identity **kullanılmıyor** — giriş tek parola, fonksiyon
tarafında `PANEL_PAROLA_HASH` ile `scryptSync` + `timingSafeEqual`
üzerinden doğrulanıyor (zamanlama saldırısına kapalı).

Akış: **panel → parola doğru mu? → doğruysa `GITHUB_TOKEN` ile
`content.json`'ı `main`'e commit et → Netlify bu commit'i görüp
otomatik yeniden derler.**

Yanlış parola genel bir "giriş reddedildi" ile döner (hangi kısmın
yanlış olduğu söylenmez) ve ~300ms sabit gecikme uygulanır. Parola,
hash ve `GITHUB_TOKEN` hiçbir yanıt gövdesine, hata mesajına ya da log
satırına yazılmaz — bkz. `netlify/functions/yayinla.js` üst bilgisi.

**`PANEL_PAROLA_HASH` tanımlı değilse fonksiyon 503 ile kapalı davranır**
— yani ortam değişkeni girilmeden bu düğme hiçbir işe yaramaz, açık bir
parola kapısı hâlâ yoktur.

**Suite kalırsa deploy düşer:** panelden atılan commit doğrudan `main`'e
gidiyor, gözden geçirme (PR) yok — bu yüzden güvenlik ağı `build.js`'in
sonunda otomatik koşan `test/denetim.js`. Commit sonrası Netlify'ın
tetiklediği derlemede suite'te tek kural bile kalırsa `build.js` `exit 1`
ile döner ve Netlify derlemeyi **başarısız** sayar — yayın çıkmaz, site
eski hâlinde kalır. Panelin kendisi `test/yayinla.test.js` ile ayrıca
kanıtlanıyor (ağa çıkmadan, sahte GitHub adaptörüyle).

**Yerel kurulum adımları:**
1. `node netlify/parola-hash.js` çalıştır, parolanı yaz, çıkan
   `salt:hash` satırını Netlify'a `PANEL_PAROLA_HASH` olarak gir.
2. GitHub'da bu repoya yalnız Contents (read/write) izni olan bir
   fine-grained PAT üret, Netlify'a `GITHUB_TOKEN` olarak gir.
3. admin.html'i aç, içeriği düzenle, **Yayınla**'ya bas, parolanı gir.
