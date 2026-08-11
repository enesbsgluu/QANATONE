# DEVİR — QANATONE build 130

> **Bu dosyayı ÜRETEÇ yazdı** (`build.js`, her derlemede). Elle
> düzenleme — bir sonraki derlemede üzerine yazılır. Dosya listesi
> gerçek diskten, damga gerçek kaynaktan, sayfa sayısı gerçek çıktıdan.
>
> Üretim tarihi: 2026-08-11 09:46 UTC

## Yeni sohbete geçerken

1. Bu dosyayı ve `qanatone-build130-YAYIN.zip` paketini ver.
2. Paket **tam** — aşağıdaki dosya listesi neyin içinde olduğunu gösteriyor.
3. Mimari, kurallar ve kararlar hafızada (`/areas/qanatone.md`) duruyor;
   burada YALNIZ paketin o anki fiziksel durumu var.

## Paketin içi

| dosya | | boyut | özet |
|---|---|---|---|
| `.gitignore` |  | 0 KB | `7ea7dfbc` |
| `AJAN-HOLDING.md` |  | 22 KB | `f886aec6` |
| `CLAUDE.md` |  | 7 KB | `c02f6311` |
| `DEVIR.md` | bu dosya | 3 KB |  |
| `NETLIFY-KURULUM.md` |  | 4 KB | `995201c6` |
| `PROJE-KURULUMU.md` |  | 4 KB | `c4b21bb8` |
| `TEST.md` |  | 2 KB | `fe469648` |
| `_headers` |  | 2 KB | `70fce80d` |
| `admin.html` |  | 56 KB | `7026865a` |
| `build.js` |  | 29 KB | `77c7eae2` |
| `holding/CLAUDE.md` |  | 3 KB | `c9945631` |
| `holding/ajanlar/satis-karsilama.json` |  | 0 KB | `a268ca24` |
| `holding/arac.js` |  | 1 KB | `5e0745a9` |
| `holding/butce.js` |  | 2 KB | `d1a565be` |
| `holding/guvenlik.js` |  | 2 KB | `b289dd7e` |
| `holding/hafiza.js` |  | 2 KB | `14e8bc0f` |
| `holding/index.js` |  | 1 KB | `453512bf` |
| `holding/kayit.js` |  | 1 KB | `7edb00df` |
| `holding/kimlik.js` |  | 1 KB | `f7851bb4` |
| `holding/olay.js` |  | 1 KB | `e8573dc7` |
| `holding/onay.js` |  | 2 KB | `424efd08` |
| `holding/test/omurga.test.js` |  | 6 KB | `53244698` |
| `img/` | 22 dosya | 1194 KB |  |
| `index.html` |  | 786 KB | `18c62824` |
| `js/` | 4 dosya | 889 KB |  |
| `netlify/functions/diagnose.js` |  | 10 KB | `8602c083` |
| `netlify/functions/submission-created.js` |  | 3 KB | `5052688a` |
| `netlify.toml` |  | 0 KB | `4faf049a` |
| `package-lock.json` |  | 27 KB | `d607ad8f` |
| `package.json` |  | 0 KB | `a41c556f` |
| `plugins/onbellek/index.js` |  | 0 KB | `166d0599` |
| `plugins/onbellek/manifest.yml` |  | 0 KB | `53c73417` |
| `qanat-tek-dosya_130.html` |  | 3501 KB | `0ee2469d` |
| `tekdosya.py` |  | 5 KB | `5d2ff2e1` |
| `test/denetim.js` |  | 31 KB | `6f04b056` |

## Üretim durumu

| | |
|---|---|
| build damgası | **130** |
| üretilen sayfa | 58 (29 TR + 29 EN) |
| sitemap URL | 58 |
| denetim suite | temiz |
| son derleme | 111 sn (basılan 58, önbellekten 0) |
| dist boyutu | 46.1 MB |

## Çalıştırma

```
npm install
node build.js          # üretir + denetim suite'ini koşar
npm test               # yalnız denetim
TAM_DERLEME=1 node build.js   # önbelleği yok say
```

Netlify: build `npm install && node build.js` · publish `dist` ·
ortam değişkenleri INDEXNOW_KEY, WA_TOKEN, WA_PHONE_ID, WA_TO.

## Bu pakette OLMAYAN, dışarıdan gelenler

- `content.json` — panelden indirilen içerik. Yoksa `index.html`
  içindeki varsayılanlar kullanılır.
- `og.png` — 1200×630 sosyal paylaşım görseli, **hâlâ eksik**.
- `node_modules/` — `npm install` kurar.
- `.onbellek/` — artımlı derleme önbelleği, Netlify eklentisi taşır.
