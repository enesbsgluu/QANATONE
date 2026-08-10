# Netlify kurulumu — build 115

## Derleme ayarları

| Alan | Değer |
|---|---|
| Build command | `npm install && node build.js` |
| Publish directory | **`dist`** |
| Node version | 20 veya üstü |

`dist` şart. Üreteç kaynağa dokunmuyor; çıktı ayrı klasöre yazılıyor.
(Bir kez çıktı kaynağın üzerine yazıldı ve ikinci koşuda "önceden
render edilmiş sayfayı yeniden render etme" durumu oluştu — o yüzden
kaynak ve çıktı artık asla aynı yerde durmuyor.)

## Ortam değişkenleri

| Değişken | Ne için | Zorunlu mu |
|---|---|---|
| `INDEXNOW_KEY` | Bing/Yandex/Naver/Seznam/Yep'e anında bildirim | hayır ama tavsiye |
| `WA_TOKEN` `WA_PHONE_ID` `WA_TO` | form → WhatsApp | form bildirimi isteniyorsa |
| `WA_TEMPLATE` `WA_LANG` | onaylı şablon kullanılacaksa | hayır |

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
değişkenlerini (`INDEXNOW_KEY`, `WA_*`) arayüzden gir.
