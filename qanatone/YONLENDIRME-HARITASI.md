# YÖNLENDİRME HARİTASI (TUR 9, 3 Eylül 2026)

Enes'in kararı (3 Eyl): eski site tamamen kalkıyor, `/eski/` arşivi yok; ama
**hiçbir eski adres 404 vermez.** Bu belge iki katmanı ayrı tutar:

1. **Bugün** (bu turda değişen adresler, kural yayında).
2. **Kesme günü** (KESME-PLANI adım 4'ün genişletilmiş hâli; kural henüz yok).

Adres listeleri elle yazılmadı, `dist/` taramasından üretildi (ek A ve B);
sayılar üretildiği ağaca aittir (commit 761b050 sonrası, 58 kök + 62 yeni sayfa).

## 1 · BUGÜN — yeni kabuğun hizmet rotası çoğula döndü

Rota `/yeni/hizmet/<slug>` → `/yeni/hizmetler/<slug>` (TR ve EN, 9 slug × 2 = 18 adres).
Kural `build.js` `_redirects` üretecinde, splat 404 kuralından ÖNCE:

```
/yeni/hizmet/:slug     /yeni/hizmetler/:slug     301!
/yeni/en/hizmet/:slug  /yeni/en/hizmetler/:slug  301!
```

`301!` zorlamalı: statik dosya artık yok, ama kural sırası / gelecekte bir
kopya sızması ihtimaline karşı. Bu adresler `/yeni/` altında noindex'liydi
(Anayasa N1), yani arama motorunda yoklar; kural yer imi ve tarayıcı geçmişi
için tampondur.

| eski | yeni | kural |
|---|---|---|
| /yeni/hizmet/seo | /yeni/hizmetler/seo | 301! |
| /yeni/hizmet/geo | /yeni/hizmetler/geo | 301! |
| /yeni/hizmet/google-ads | /yeni/hizmetler/google-ads | 301! |
| /yeni/hizmet/meta-ads | /yeni/hizmetler/meta-ads | 301! |
| /yeni/hizmet/ai-ajan | /yeni/hizmetler/ai-ajan | 301! |
| /yeni/hizmet/otomasyon | /yeni/hizmetler/otomasyon | 301! |
| /yeni/hizmet/web-tasarim | /yeni/hizmetler/web-tasarim | 301! |
| /yeni/hizmet/web-sitesi-araclar | /yeni/hizmetler/web-sitesi-araclar | 301! |
| /yeni/hizmet/finans | /yeni/hizmetler/finans | 301! |
| /yeni/en/hizmet/<aynı 9 slug> | /yeni/en/hizmetler/<slug> | 301! |

Sınama: `netlify dev` vekilinden (yalnız o `_redirects` uygular; `yerel-sun`
uygulamaz) 18 eski adres 301 → 200, 18 yeni adres 200, kontrol çifti
`/olmayan-adres` 404. **Sonuç (3 Eyl, netlify dev 8888):** 18/18 eski adres
301 → hedefe → 200; 18/18 yeni adres 200; `/yeni/olmayan-sayfa` 404;
`/hizmetler/seo` (eski site) 200; `/yeni/hizmetler/` (dizin) 200.

## 2 · KESME GÜNÜ — eski site kalkar, yeni kabuk köke gelir

### 2a · Kök adresler (58 sayfa, ek A): AYNI YOLDA KALIR

Yeni kabuğun rotaları eski sitenin yollarını birebir kullanıyor (bu turla
`/hizmetler/<slug>` da dahil). Kesmede `base '/'` olunca 58 kök adresin 58'i
yeni kabuktan 200 alır; **yönlendirme gerekmez.** Bekçi: R8(c) dosya yolu =
canonical yolu (bu turda geldi) + kesme günü curl taraması (KESME-PLANI E2 adım 4).

Tek fark biçimsel: eski site `/en/` (eğik çizgili), yeni kabuk `/en` — Netlify
ikisini aynı dosyaya düşürür (`trailingSlash: 'ignore'` + `/en/index.html`).

### 2b · `?lang=en` sorgu ekleri → `/en/...`

Eski site (ve panel sitemap üreteci, MIMARI M6) EN'i `?lang=en` sorgusuyla
üretmişti. Yayında bu biçim kalmış olabilir (yer imi, eski paylaşım). Kural:

```
/*  lang=en  /en/:splat  301!
```

Netlify sorgu-parametresi eşlemesi: yalnız `lang=en` taşıyan istekler döner,
diğerleri dokunulmaz. `/en/*` için de aynı kural anlamsız döngü üretmez
(`/en/en/` doğmasın diye `/en/*` kuralı bundan ÖNCE `200` ile sabitlenir).

### 2c · `/yeni/*` önizleme adresleri (62 sayfa, ek B) → kök

```
/yeni/hizmet/:slug      /hizmetler/:slug      301!
/yeni/en/hizmet/:slug   /en/hizmetler/:slug   301!
/yeni/*                 /:splat               301!
```

İlk iki satır iki adımlı yönlendirmeyi (hizmet → yeni/hizmetler → hizmetler)
tek adıma indirir. `/yeni/en/*` splat ile `/en/*`'a düşer. `/yeni/surum.json`,
`/yeni/sitemap.xml`, `/yeni/bulten/rss.xml` de splat'la köke gider (kökte
aynı adlarla yeni üreteçler var).

### 2d · Sayfa olmayan kök dosyalar

| adres | kesme sonrası | not |
|---|---|---|
| /sitemap.xml | yeni üreteç (`sitemap.xml.ts`), aynı yol | R8 bekçili |
| /robots.txt | `yeni/public/robots.txt` (adım 6) | AI botları + Content-Signal taşınır |
| /bulten/rss.xml | yeni üreteç (`rss.xml.ts`), aynı yol | R8 |
| /content.json | **KOPYALAYAN KALMAZ** — bugün `build.js` KOPYA ile dist'e iner; kesmede build.js zincirden çıkınca kimse kopyalamaz | CLAUDE.md: yoksa panelden yönetilen her ayar sessizce ölür (2026-08'de üç ay öyle döndü). Kesme adımı: `yeni/public/content.json`'a kopya YA DA netlify.toml komutunda `cp content.json dist/`; bekçi: dist/content.json = kök content.json |
| /og.png | `settings.og` alanı / kök og.png kopyası | aynı KOPYA sorunu |
| /img/* · /js/* | **YAŞAMALI** — yeni kabuk `/img/` (G2 kuralı kök dist'te arar) ve `/js/tubes.min.js` (hero tüpleri, kabuk/efekt.js) okuyor | kesmede `img/` ve `js/` kopyası zincire eklenir; bekçi G2 + tüp yükleyici |
| /_headers · /_redirects | yeni tarafa taşınır (adım 7 / adım 4) | Link bloğu yeniden üretilir (yollar değişir) |
| /admin.html | `/.netlify/functions/panel 200!` aynen | değişmez |
| /<INDEXNOW_KEY>.txt | adım 9 (IndexNow yeni tarafa) | anahtar dosyası `yeni/public/` |
| /shell.html | kalkar | sayfa değil, SPA kabuğu; robots zaten Disallow. 404 kabul (adres değil, iç mekanizma) |
| /varlik/app.<hash>.js · .css | kalkar | içerik-hash'li eski paket; yalnız bayat HTML önbelleği ister, `immutable` süresi bitince kaybolur. 404 kabul |
| /404.html | yeni kabuğun 404'ü | `/* /404.html 404` sonda kalır |

### 2e · Kesme günü `_redirects` (adım 4'ün tam hâli, sıra önemli)

```
# panel kapisi
/admin.html             /.netlify/functions/panel   200!
# EN kok (donguyu kes)
/en/*                   /en/:splat                  200
# eski sorgu biçimi
/*  lang=en             /en/:splat                  301!
# eski onizleme adresleri
/yeni/hizmet/:slug      /hizmetler/:slug            301!
/yeni/en/hizmet/:slug   /en/hizmetler/:slug         301!
/yeni/*                 /:splat                     301!
# taninmayan adres: gercek 404
/*                      /404.html                   404
```

Kesme öncesi bu dosya `yeni/public/_redirects`'e yazılır; ancak `outDir
'../dist'` ile birlikte dist köküne ulaşır (bugün `dist/yeni/_redirects`'e
düşer ve Netlify okumaz — rota ajanı 3 Eyl bulgusu).

## Ek A · Kök adresler (58) — kesmede aynı yolda kalır

(aşağıya `dist/` taramasıyla eklendi)
- `/`
- `/bulten/`
- `/bulten/donusum-oranlari-sektor-sektor/`
- `/bulten/google-ads-maliyetleri-2026/`
- `/bulten/saglik-turizmi-hasta-basina-gelir/`
- `/bulten/talebe-bes-dakikada-donmek/`
- `/bulten/yapay-zeka-trafigi-tiklama-degil/`
- `/bulten/yapay-zekadan-gelen-ziyaretci-donusuyor-mu/`
- `/en/`
- `/en/bulten/`
- `/en/bulten/donusum-oranlari-sektor-sektor/`
- `/en/bulten/google-ads-maliyetleri-2026/`
- `/en/bulten/saglik-turizmi-hasta-basina-gelir/`
- `/en/bulten/talebe-bes-dakikada-donmek/`
- `/en/bulten/yapay-zeka-trafigi-tiklama-degil/`
- `/en/bulten/yapay-zekadan-gelen-ziyaretci-donusuyor-mu/`
- `/en/hizmetler/`
- `/en/hizmetler/ai-ajan/`
- `/en/hizmetler/finans/`
- `/en/hizmetler/geo/`
- `/en/hizmetler/google-ads/`
- `/en/hizmetler/meta-ads/`
- `/en/hizmetler/otomasyon/`
- `/en/hizmetler/seo/`
- `/en/hizmetler/web-sitesi-araclar/`
- `/en/hizmetler/web-tasarim/`
- `/en/otomasyon/`
- `/en/projeler/`
- `/en/projeler/bab-ic-mimarlik/`
- `/en/projeler/charles-schwab/`
- `/en/projeler/cmblu-energy/`
- `/en/projeler/kononenko-group/`
- `/en/projeler/mercedes-benz/`
- `/en/projeler/skyclinics/`
- `/en/projeler/terawulf/`
- `/en/sss/`
- `/en/surec/`
- `/hizmetler/`
- `/hizmetler/ai-ajan/`
- `/hizmetler/finans/`
- `/hizmetler/geo/`
- `/hizmetler/google-ads/`
- `/hizmetler/meta-ads/`
- `/hizmetler/otomasyon/`
- `/hizmetler/seo/`
- `/hizmetler/web-sitesi-araclar/`
- `/hizmetler/web-tasarim/`
- `/otomasyon/`
- `/projeler/`
- `/projeler/bab-ic-mimarlik/`
- `/projeler/charles-schwab/`
- `/projeler/cmblu-energy/`
- `/projeler/kononenko-group/`
- `/projeler/mercedes-benz/`
- `/projeler/skyclinics/`
- `/projeler/terawulf/`
- `/sss/`
- `/surec/`

## Ek B · /yeni/ önizleme adresleri (62) — kesmede `/yeni/*` → `/:splat` 301!

- `/yeni/`
- `/yeni/bulten/`
- `/yeni/bulten/donusum-oranlari-sektor-sektor/`
- `/yeni/bulten/google-ads-maliyetleri-2026/`
- `/yeni/bulten/saglik-turizmi-hasta-basina-gelir/`
- `/yeni/bulten/talebe-bes-dakikada-donmek/`
- `/yeni/bulten/yapay-zeka-trafigi-tiklama-degil/`
- `/yeni/bulten/yapay-zekadan-gelen-ziyaretci-donusuyor-mu/`
- `/yeni/deneme-react/`
- `/yeni/en/`
- `/yeni/en/bulten/`
- `/yeni/en/bulten/donusum-oranlari-sektor-sektor/`
- `/yeni/en/bulten/google-ads-maliyetleri-2026/`
- `/yeni/en/bulten/saglik-turizmi-hasta-basina-gelir/`
- `/yeni/en/bulten/talebe-bes-dakikada-donmek/`
- `/yeni/en/bulten/yapay-zeka-trafigi-tiklama-degil/`
- `/yeni/en/bulten/yapay-zekadan-gelen-ziyaretci-donusuyor-mu/`
- `/yeni/en/film/`
- `/yeni/en/hizmetler/`
- `/yeni/en/hizmetler/ai-ajan/`
- `/yeni/en/hizmetler/finans/`
- `/yeni/en/hizmetler/geo/`
- `/yeni/en/hizmetler/google-ads/`
- `/yeni/en/hizmetler/meta-ads/`
- `/yeni/en/hizmetler/otomasyon/`
- `/yeni/en/hizmetler/seo/`
- `/yeni/en/hizmetler/web-sitesi-araclar/`
- `/yeni/en/hizmetler/web-tasarim/`
- `/yeni/en/otomasyon/`
- `/yeni/en/projeler/`
- `/yeni/en/projeler/bab-ic-mimarlik/`
- `/yeni/en/projeler/charles-schwab/`
- `/yeni/en/projeler/cmblu-energy/`
- `/yeni/en/projeler/kononenko-group/`
- `/yeni/en/projeler/mercedes-benz/`
- `/yeni/en/projeler/skyclinics/`
- `/yeni/en/projeler/terawulf/`
- `/yeni/en/sss/`
- `/yeni/en/surec/`
- `/yeni/film/`
- `/yeni/hizmetler/`
- `/yeni/hizmetler/ai-ajan/`
- `/yeni/hizmetler/finans/`
- `/yeni/hizmetler/geo/`
- `/yeni/hizmetler/google-ads/`
- `/yeni/hizmetler/meta-ads/`
- `/yeni/hizmetler/otomasyon/`
- `/yeni/hizmetler/seo/`
- `/yeni/hizmetler/web-sitesi-araclar/`
- `/yeni/hizmetler/web-tasarim/`
- `/yeni/hukuki/`
- `/yeni/otomasyon/`
- `/yeni/projeler/`
- `/yeni/projeler/bab-ic-mimarlik/`
- `/yeni/projeler/charles-schwab/`
- `/yeni/projeler/cmblu-energy/`
- `/yeni/projeler/kononenko-group/`
- `/yeni/projeler/mercedes-benz/`
- `/yeni/projeler/skyclinics/`
- `/yeni/projeler/terawulf/`
- `/yeni/sss/`
- `/yeni/surec/`
