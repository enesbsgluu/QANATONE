# TUR 4 — SÖKÜM HAZIRLIĞI KEŞFİ (3 Eyl 2026, salt okunur — hiçbir dosya değiştirilmedi)

Talimat: "yalnız keşif, değişiklik yok." HEAD ad142bd. Beş kalem, dosya:satır referanslı.

---

## 1. ANA SAYFA HARİTA BÖLÜMÜ — SÖKME NOKTALARI

Harita = "Talep akış haritası" (`#globe` / `#gcv`), `section#sektor` içinde.

- **Markup:** `index.html:4829-4895` (`div#globe.rv` tam aralık; kapsayan `#sektor` 4821-4897).
  HUD/sayaçlar 4830-4840 · canvas 4842 · paneller 4844-4884 · lejant 4886-4889 · gfoot 4891-4894.
  4829-4895 çıkınca `#sektor` shead+`#secBox` ile ayakta kalır.
- **CSS:** `index.html:1519-1673` (`#globe` kökü 1520-1524, `gpulse` 1533-1534, daraltmalar 1659-1671, lowfx 1673).
- **JS:** `demandMapKur()` gövdesi `index.html:9578-10202` (~625 satır); CITY 9599+; tema `MT` 9638-9643;
  `__globeSector` 10134-10144; görünürlük IO 10193-10196; `__globeShow` 10200-10201;
  kapılı kurulum kaydı `index.html:10203`; sektör motorunun çağrıları 10214 ve 10221.
  **KURULUM TURU KAYDI listesi girdisi `index.html:9145`** (liste 9143-9145).
  **`QG` (9569-9577, `QG._rle` 6,3 KB) KALIR** — TradeSelf `mkMap` kullanıyor (7694-7695, 7722).
  `kapiliKur/gorunceKur` (9161-9172) ortak, kalır.
- **build.js:** haritaya özel kayıt YOK (globe/demandMap → 0 eşleşme); main kopyası 764-770, KOPYA listesi 81.
- **Denetim (test/denetim.js):** 917-918 (ertelenen liste, 'demandMap' ilk eleman) · 921-922 (damgasızlık) ·
  930 (`#globe.__kur===1`) · **932-936 kural metni "8 kurulum" — söküm sonrası 8→7 düşürülmeli**, yoksa build kırmızı (build.js 827-830).
- **Panel/veri:** admin.html 401-404 (h4 + 3 kaydırıcı) · content.json 33-37 (`theme.map`) ·
  i18n `glb*`: TR 5157-5177 (21 anahtar), EN 5389-5415 · kaynak varsayılanı index.html:5632 · EN dizeleri 6755-6764.
  DİKKAT: `sectors[].map{src/hub/dst}` (content.json 3040-3069) BU HARİTA DEĞİL — TradeSelf motor sahnesi verisi.
- **Dokunulacak dosyalar:** index.html · test/denetim.js · admin.html · content.json. (dist/.onbellek türev;
  yeni/ tarafında karşılık YOK — yeni kabuk haritayı hiç taşımadı, yeni/src/stil/sektor.css:17-22.)

## 2. SAHNE SÜRÜCÜ TABLOSU (eski site)

Rota→bölüm: index.html:11651-11685 (PAGES), damga 11694-11695.

**IntersectionObserver (otomatik):**
| sayfa | sahne | öğe | yer |
|---|---|---|---|
| / | hero tüpleri play/pause | #hero | 9354-9357 |
| / | akış mini demolar (.aklive) | #akis | 7089-7093 |
| / | talep haritası rAF | #globe | 10193-10196 |
| / | kanal kartları giriş (.tin) | #sozler | 10423-10427 |
| tümü | footer bit damgası | #wmk | 11253-11258 |
| /otomasyon | akış diyagramı rAF | #flow | 10644-10645 |
| /otomasyon | sızıntı tanecikleri | #szStage | 10800-10802 |
| /hizmetler/finans | pazar haritası rAF | #mkStage | 7864-7867 |
| /hizmetler/* | tel/çip açılışı | .tpbox/.kdbox | 8097-8100 |
| tümü | genel beliriş .rv→.in | — | 9215-9218 |
| tümü | kurulum kapısı (12 kurulum) | kapiliKur | 9161-9172 |
| tümü | prefetch | a[href] | 9203-9207 |

**Kaydırma sürücülü (GSAP ST):** hero paralaks scrub .6 (12527-12528) · hero eller scrub .9 (12338-12343) ·
proje destesi HAM scroll+rAF (12518-12522; hesap 12488-12511) · /otomasyon akış reveal scrub .5 (12461-12463) ·
**/otomasyon sızıntı PİNLİ** +=2.2vh (12472-12477) · /surec kanal çizimi (12480-12485) ·
hizmet sahnesi ortak sürücü pin+scrub (8974-9014) · TradeSelf perdeler pin 2.7 (8716) ·
**pazar motoru İKİNCİ PİN** +=4.4vh (8702-8713; harita perdesi 8687-8691) · funnel (8729) · flow (8747) ·
climb (8770) · geo-ai (8815) · craft (8962).
Ortam: Lenis yalnız !REDUCE && >880 (12413-12418) · ignoreMobileResize 12411 · lagSmoothing 12442.
`view-timeline`/`scroll()`: eski sitede HİÇ YOK (yalnız yeni/src/stil/ana.css:65,83). karsilama/: ikisi de yok.

## 3. ESKİ→YENİ TAŞIMADA EKLENMİŞ FAZLALIKLAR

**Hâlâ duran:**
1. `.dugme.sus-isik` dönen huzme+parlama — temel.css:97-144; eski mekanizma CSS'te vardı ama markup KULLANMIYORDU
   (index.html:350-361; class="shiny" → 0). Kullanım 6 nokta: 404.astro:14 · BultenDizin:71 · HizmetDizin:121 ·
   HizmetGovde:212(+333-336) · OtomasyonGovde:191,306.
2. Söz kartı üstten parlama + `--line2` kenarlık — sozler.css:118-132 (belgeli yeni kalem). (Kart ikonları KAYNAKTAN.)
3. Eski sitede karşılığı olmayan 4 anlatı sahnesi + kutuları: S2Kayip/S3Mekanizma/S5Surec/S6Sektor
   (index.astro:87,88,93,94; kendi başlıklarında "content.json'da karşılığı yok" yazılı).
   Kutular: ana.css:99 (.s5-adim), 103-104, 110 (.s6-kart), 54-56, 76.
4. Genel düğme hover gölgesi — ana.css:126-127 ("H1'in bilinçli istisnası").
5. Akış kartı ok ikonu .sa-ok — akis.css:115,136; SAAkis.astro:95,106 (eski kartta ok yok: index.html:2661-2664).
6. Proje dizini kızıl dış gölge — ProjeDizin.astro:386 (eskide yok: index.html:1692-1699).
7. Yeni rotalar: film · hukuki · deneme-react (eski rota tablosunda yok: 11684-11685).

**Geri alınmış (kayıt):** akış kartı kutusu (akis.css:92-96) · hover kenarlığı (127-129) · deste sayacı (deste.css:68-69) ·
hero mobil rozet (hero.css:261-264) · proje duotone (ProjeDizin:36-41,415-423) · perde ışıması (perde.css:38-43) ·
sektör satır ikonları eksiltmesi (sektor.css:35-36) · dgscan süpürmesi (tespit.css:14-16) · H14 söndürmeleri.
Kesme adayları (R13 bekçili): SKKatman/SAAkis/SSESektor/SSZSozler başlıkları; yeni/denetim.cjs R13.

## 4. _headers DESENLERİ

Kaynak: kök `_headers` (build.js:81 kopyalar). dist/_headers ŞU AN BAYAT (42-52 bloğu eksik; sonraki build düzeltir).
Desenler: /shell.html · /admin.html · /404.html (noindex) · /varlik/* (immutable) · /yeni/_astro/* (immutable) ·
/yeni/varlik/* (1 gün) · /* (güvenlik başlıkları).

**/yeni/ kapsamayan boşluklar:**
- **/yeni/404.html → noindex YOK** (desen yalnız kök /404.html).
- **/yeni/font/*** → Cache-Control YOK (10 woff2, hash'siz ad).
- **/yeni/img/*** → Cache-Control YOK.
- /yeni/content-assets.mjs + content-modules.mjs → hiçbir desene girmiyor.
- Kök simetrik boşluk /img/* ve /js/* bilinçli (hash'siz — _headers:33-34 yazılı).

## 5. YAZI AİLESİ ENVANTERİ

- **Eski site:** @font-face YOK, tek Google CDN yüklemesi index.html:27 (preconnect 25-26):
  Playfair Display (başlık+hero) · Manrope (UI) · Inter (gövde) · JetBrains Mono (171 bildirim).
- **HERO "EL YAZISI" AİLESİ: AYRI FONT DEĞİL — Playfair Display İTALİK.**
  #hero h1 → index.html:481-484; em/b italik kuralları 489-491; markup 4703-4706 (<em>Yakalayan</em> <b>yok.</b>);
  italik eksen index.html:27'deki ital,wght@1,400;1,500. Kökte script/cursive aile SIFIR.
- **Yeni kabuk (self-host, font.css + font-uret.py):** Nunito Sans (gövde, optional) · Playfair 500 + 500i ·
  JetBrains Mono 400 · Uncut Sans 300-700 (yalnız film). Token: aile.css:4-6. Manrope+Inter EMEKLİ.
- **karsilama/:** Geist + Geist Mono self-host (karsilama/index.html:35-38).
  → Sitede ÜÇ ayrı font rejimi yaşıyor (kök CDN / yeni self-host / karşılama Geist).
