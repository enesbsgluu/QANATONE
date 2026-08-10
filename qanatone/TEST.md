# Denetim suite'i

## Neden var

"Her kontrolde yeni hata çıkıyor" bir kod sorunu değildi, **ölçüm
sorunuydu.** Her turda ayrı bir betik yazılıp çalıştırılıp atılıyordu;
her tur farklı bir boyuta bakılıyor, bakılan boyut temiz çıkıyor,
bakılmayan sessizce bozuluyordu.

`test/denetim.js` o bakışı kalıcı hâle getiriyor. Bugüne kadar bulunan
her hata sınıfı burada bir kural. Yeni bir sınıf çıkarsa buraya **bir kez**
eklenir, sonsuza kadar bekçilik eder.

## Nasıl çalıştırılır

```
npm test                 # tek başına
node build.js            # derlemenin sonunda kendiliğinden koşar
DENETIM_ATLA=1 node build.js   # atla (ne atladığını bilerek)
```

**Kural kalırsa derleme HATA ile biter — bozuk çıktı yayına gitmez.**

## Ne bakıyor (50 kural)

| bölüm | kurallar |
|---|---|
| 1 · kaynak bütünlüğü | script sözdizimi · CSS parantez dengesi · EN sözlüğünde eksik `data-t` · kullanılmayan `@keyframes` · **rAF döngüsünde düzen okuması** |
| 2 · çalışma zamanı | 7 rota × 2 dil dolu mu · 9 hizmet + 7 proje detayı · runtime hata · mobil menü + kaydırma kilidi · bozuk `content.json` dayanıklılığı · **postMessage origin** |
| 3 · yayın çıktısı | mükerrer id · alt · adsız link · sayfa başına 1 h1 · viewport · JSON-LD · mükerrer canonical/description/title · **EN bağlantı grafiği** · öksüz sayfa · sitemap örtüşmesi · yönlendirme kuralları · 404 · robots |
| 4 · güvenlik | gömülü sır · postMessage · dış CDN · SSRF yönlendirme + özel IP · 4 güvenlik başlığı |
| 5 · tasarım | kontrast AA (tx2/tx3/tx4) · reduced-motion · focus-visible · dokunma hedefi |

## Suite'in kendisi de test edildi

Üç hata kasten enjekte edildi (h1'i h2 yap, postMessage origin
doğrulamasını kaldır, `X-Frame-Options` başlığını sil) — **üçünü de
yakaladı.**

İlk denemede `X-Frame-Options` kuralı YEŞİL kalmıştı: `_headers` içinde
aynı kelime bir yorum satırında geçtiği için. Yanlış yeşil, yanlış
kırmızıdan tehlikelidir; kural artık yorumları atıp gerçek başlık
satırını arıyor.

## Yeni kural nasıl eklenir

`test/denetim.js` içinde ilgili bölüme tek satır:

```js
ol('kuralın adı', kosul, 'ayrıntı');
```

`ol` = ölç. Koşul doğruysa geçer, değilse derleme durur.
