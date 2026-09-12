# İş 4 — klasör şemasında teller kartlarla birleşmiyor

**Temel:** `e5919f9` · **Dosyalar:** `qanatone/index.html`, `qanatone/test/denetim.js`

## Uygulama

```bash
cd C:\projeler2\qanatone
git rev-parse HEAD              # e5919f9 olmalı
git apply --stat klasor-telleri.diff
git apply --check klasor-telleri.diff
git apply klasor-telleri.diff
```

## Kanıt

| Komut | Beklenen |
|---|---|
| `node build.js` | **81 geçti · 0 kaldı** · 58 sayfa |
| `node harness-hidrasyon.js` | **7 geçti · 0 kaldı · 1 bilgi** |
| `node test/yayinla.test.js` | **28 geçti · 0 kaldı** |

Yeni kural: `klasör telleri ölçülmüş kart merkezine hizalanır` → `hizala=true merkez=true kurulumTuru=true`

## Commit

```bash
git add index.html test/denetim.js DEVIR.md
git commit -m "fix(klasor): teller olculmus kart merkezine hizalaniyor"
git push
```

## Kök neden

`deliverStage` telleri şöyle çiziyordu:

```js
const y=(100/n)*(i+.5);
'<path d="M0,50 C46,50 54,'+y+' 100,'+y+'"/>'
```

Koddaki yorum varsayımı açıkça söylüyor: *"kart merkezleri eşit aralıklı — düzen ölçmeye gerek yok"*. Varsayımın iki ayağı da yanlış:

```css
.tpcards{display:flex;flex-direction:column;gap:clamp(8px,1vw,13px)}
```

1. Kartlar **eşit yükseklikte değil** — içerik uzunluğuna göre değişiyor (TR/EN metin farkı bile kaydırıyor).
2. Aralarında **gap** var.

Sonuç: telin ucu kartın ortasını ıskalıyor, sapma uçlarda büyüyor.

## Değişiklik

`teslimat()` IIFE'sine `telHizala` eklendi: `.tpmid` ve her `.tpcard` ölçülüyor, telin bitiş `y`'si gerçek kart merkezine göre yüzdeye çevrilip `d` yeniden yazılıyor.

Tetikleme: kurulum, `resize`, `visualViewport.resize`, `#sdBody` mutasyonu, `document.fonts.ready`. **Kaydırmada ölçüm yok** — kart yükseklikleri kaydırmayla değişmiyor, rAF döngüsünde düzen okuma tuzağına girmemek için bilerek böyle. `window.__telHizala` kurulum turu listesine de eklendi (rota değişince yeniden hizalansın); `#sdBody`'nin IIFE anında var olmama sorunu böyle kapatıldı.

## Doğrulama — ölçülen rakamlar

jsdom'da kartlara **kasten eşit olmayan** yükseklikler verildi (60, 140, 90, 200, 70 px + 10px gap) ve `/hizmetler/finans` sayfası açıldı:

| Tel | Yeni kod çiziyor | Gerçek kart merkezi | Eski formül | Sapma |
|---|---|---|---|---|
| 0 | 5.0% | 5.0% | 10.0% | 0.00 |
| 1 | 23.3% | 23.3% | 30.0% | 0.03 |
| 2 | 44.2% | 44.2% | 50.0% | 0.03 |
| 3 | 70.0% | 70.0% | 70.0% | 0.00 |
| 4 | 94.2% | 94.2% | 90.0% | 0.03 |

`Eski formül` sütunu, eski kodun `d` niteliğine yazdığı değerin ta kendisi — **5.8 puana kadar sapma**, gözle görülen kayma bu.

Yanında: `node build.js` **81/0** · kırmızı taraf eski index = **80/1** · harness 7/0 · yayinla 28/0 · 5 betik bloğu `node --check` temiz.

## Ne DOĞRULANMADI

Gerçek tarayıcıda görsel sonuç. Bu kapta yerleşim ölçülemiyor (Puppeteer'ın tarayıcı indirmesi ağ izniyle engelli, jsdom'un düzen motoru yok). Ölçüm, kart geometrisi taklit edilerek yapıldı — matematik doğru, ama telin **eğrisinin** kartın kenarına nasıl oturduğu (kontrol noktaları `C46,50 54,y`) göze bağlı. Kayma sürerse eğrinin kontrol noktaları ayarlanır.

## Kapsamadıkları

GEO ve TradeSelf animasyonlarının kaydırma hızından bağımsız, sabit hızda ilerlemesi — sıradaki iş.
