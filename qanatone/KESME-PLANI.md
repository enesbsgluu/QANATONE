# FAZ 4 — KESME PLANI (hazırlık, 20 Ağu 2026 · EK 2 Eyl 2026)

**Durum: HAZIRLIK. Kesmenin kendisi bu belgeyle DEĞİL, Enes'in üç savurma
hükmü kapandıktan sonra ayrı bir commit'le yapılır.** Bu belge kesme
gününün adım listesini, hazır blokları ve geri dönüş yolunu kayda alır.
Kaynak raporlar: `GOC-TUR-KAPANIS.md` (ana sayfa) · `GOC-ROTA-KAPANIS.md`
(29 rota) · Göç Anayasası v2.


## EK · 2 EYLÜL 2026 GÜNCELLEMESİ (gece zinciri TUR 8, uygulama YOK)

Aşağıdaki blok 20 Ağustos gövdesinin yerine geçer; gövde tarih kaydı olarak
durur. Hiçbir adım çalıştırılmadı; push yok; kesme Enes'in açık sözüne bağlı.

### E1 · Ön şartlar, bugünkü durum

| Şart | 20 Ağu | 2 Eyl |
|---|---|---|
| qanatone.com bağlı (Adım 0) | ❌ | ❌ Enes'te (Netlify paneli + DNS; SNI engeli gerekçesi aynen geçerli) |
| Global katman (nav / mobil menü / footer / dil geçişi / #bit / #wmk) | ❌ | ✅ söküm ve taşıma turu (ef4f955…0194646); footer wordmark tembel kurulum (TUR 4) |
| Üç savurma hükmü (rota, EN, giydirme) | ❌ | ❌ Enes'te (değişmedi) |
| Prolog / film | açık | ✅ kapandı (6d00bc6); efekt A düşen kare bilinçli açık |
| NODE_VERSION | 20 | ✅ 22 (netlify.toml) |
| Hizmet rotası tekil → çoğul (2a) | bekliyor | bekliyor (`src/pages/hizmet/[slug].astro`, canonical çoğul) |
| `/yeni` sabit yol envanteri | 22+… | kaynakta 51 geçiş / 25 dosya; `yeni/denetim.cjs` 27; `_headers` 141 (120'si Link bloğu) |
| Panel: her alan yönetilir ve üretimde görünür | ❌ | ✅ TUR 5 kapısı (12 alan + 2 bayrak; sabit metinler 269 anahtar) |
| Ajan hazırlığı (robots AI botları, Content-Signal, Link başlıkları, sameAs) | ❌ | ✅ TUR 6 |
| Chrome kapıları (59 sayfa LCP/CLS/INP/LoAF; p95/takılma) | — | ✅ TUR 4 eşik dışı 0 |
| og/twitter meta | yoktu | ✅ TUR 5 (settings.og; boşsa og.png 1200×614, ölçü Enes'te) |

### E2 · Kesme günü adımları, numaralı, her adımın geri alması

Tek dal, adım başına bir commit; her commit `[skip ci]` DEĞİL (kesme deploy
ister) ama push yalnız Enes'in sözüyle. Geri alma her adımda tek komut.

| # | Adım | Ne yapılır | Bekçi | Geri alma |
|---|---|---|---|---|
| 0 | Alan adı | Netlify panelinden qanatone.com + www bağlanır, sertifika doğrulanır (kesmeden bağımsız, önce) | `curl -sI https://qanatone.com/` 200 | Domain management'tan alan adı kaldırılır (DNS geri alınmaz, gerek yok) |
| 1 | Hizmet rotası çoğula | `git mv yeni/src/pages/hizmet yeni/src/pages/hizmetler` (+ `en/`); iç bağlantı sabitleri | H16 + S1 yeşil | `git revert <c1>` |
| 2 | Yayın hedefi | `astro.config.mjs`: `base '/'`, `outDir '../dist'`; `netlify.toml` command: `npm --prefix yeni ci && npm --prefix yeni run build && node yeni/denetim.cjs` (kök build.js zincirden çıkar) | derleme yeşil; `grep -rn "/yeni" yeni/src` = 0 (geçici bekçi K-KES: dist'te `/yeni/` geçmez) | `git revert <c2>` |
| 3 | `/yeni` önek temizliği | 25 dosya + `yeni/denetim.cjs` 27 satır: `BASE_URL` kullananlar kendiliğinden düzelir, sabit yollar elle (`font.css` 8, `SHHero` 8, index/en-index 8, ana.css/STSerit/SPDeste/ProjeGovde/sitemap/404 2'şer, kurucu.css/SKUKurucu/ProjeDizin/hukuki 1'er) | K-KES | `git revert <c3>` |
| 4 | Redirect'ler | `yeni/public/_redirects`: `/hizmet/:slug /hizmetler/:slug 301!`, `/en/hizmet/:slug /en/hizmetler/:slug 301!`, `/yeni/* /:splat 301!`, `/admin.html /.netlify/functions/panel 200!` (panel korunur) | curl taraması: eski 61 kök URL'nin hepsi 200 ya da 301→200 | `git revert <c4>` |
| 5 | N1 tersine | `Temel.astro` `<meta name="robots" content="noindex">` kalkar; `yeni/denetim.cjs` N1 ters yöne (her sayfa indekslenebilir, 404 istisna); `hukuki` canonical `KOK/hukuki` | N1(ters) + R8 sitemap `/hukuki` | `git revert <c5>` |
| 6 | robots.txt + sitemap | `yeni/public/robots.txt` statik: build.js `robots()` içeriği birebir (11 AI botu Allow + Content-Signal satırı + Disallow admin/404 + Sitemap). `sitemap.xml.ts` zaten var (R8) | eski suite'in robots kuralları yeni suite'e taşınır (2 kural) | `git revert <c6>` |
| 7 | `_headers` | `/yeni/_astro/*`, `/yeni/varlik/*`, `/yeni/font/*`, `/yeni/img/*`, `/yeni/404.html` desenleri köke; Link bloğu `node yeni/link-basliklari.cjs` ile YENİDEN üretilir (yollar değişti), `_headers` `yeni/public/`e taşınır | `KONTROL=1 node yeni/link-basliklari.cjs` TAZE; curl'de `link:` + `content-signal:` | `git revert <c7>` |
| 8 | Panel yolu | `netlify.toml` `[functions] included_files=["admin.html"]` ve `yayinla.js`'in yazdığı yol (depo kökü `content.json`) kesmeden etkilenmez; `panel-kapi.cjs` kesme sonrası bir kez koşar | panel-kapi GEÇTİ | adım 4'ün geri alması |
| 9 | IndexNow | build.js `INDEXNOW_KEY` akışı yeni tarafa: anahtar dosyası `yeni/public/<anahtar>.txt` + deploy sonrası bildirim (Netlify build plugin ya da elle `curl` POST) | bildirim yanıtı 200/202 | anahtar dosyası silinir; bildirim geri alınmaz (zararsız) |
| 10 | Eski sitenin akıbeti | KARAR (Enes): tamamen kalkar mı, `/eski/` arşivi mi (arşivse eski build çıktısı alt klasöre, noindex + `_headers` X-Robots-Tag) | robots/H kuralları | `git revert <c10>` |
| 11 | Deploy + doğrulama | push (Enes'in sözü) → E3 listesi | E3 | `git revert` zinciri ters sırayla + deploy; Search Console'a eski sitemap yeniden gönderilir |

### E3 · Kesme öncesi kontrol listesi

Yeşil olması ŞART olan kapılar (hepsi bu gece koşuldu, tarih damgalı):

| Kapı | Komut | Bu gece |
|---|---|---|
| Yeni suite | `node yeni/denetim.cjs` | 56/0 |
| Eski suite (kesmeden önce son kez) | `node test/denetim.js` | 135/0 |
| Sürücü kapısı | `olc-surucu.cjs` (finans, otomasyon, araçlar) | GEÇTİ |
| Bütün sayfalar p95 ≤ 20 / takılma ≤ %3 / tek ≤ 250 | `olc-sayfa.cjs` | söküm turu kapanışı + TUR 4 (finans 16,9, otomasyon 16,7, araçlar 16,7) |
| Chrome 59 sayfa LCP<2,5 s / CLS<0,1 / INP<200 | `olc-chrome.cjs` | eşik dışı 0 (INP en yüksek 64) |
| Panel kapısı | `node yeni/panel-kapi.cjs` | GEÇTİ (12 alan + 2 bayrak; kırmızı kontrol yakalandı) |
| Sabit metin haritası taze | `KONTROL=1 node yeni/metin-harita.cjs` | TAZE (269) |
| Link başlıkları taze | `KONTROL=1 node yeni/link-basliklari.cjs` | TAZE (120 sayfa) |
| Kalıcı will-change | grep | 0 (+2 ölçülmüş istisna) |
| Bütçeler | J1 ana 12.758/12.800 · K1 12.277/12.288 · gzip ana 22,4/24 KB · admin 78,8/96 KB | yeşil, payı az |

Dolu olması ŞART olan panel alanları (boş hâli sayfayı bozmaz ama kesme
"gerçek site" ister): `settings.whatsapp` (gerçek numara; yer tutucu
uyarısı panelde), `settings.orgDesc`, `settings.knowsAbout`, `settings.og`
(1200×630 yeni görsel; bugünkü og.png 1200×614), `socials` (en az bir
adres, sameAs), `legal.line`, `legal.kvkk`, `founder.*`, `settings.email`
(boşsa footer bağlantısı çıkmaz), `settings.gtm` (isteğe bağlı; açılırsa
çerez onayı Enes'in kararı), `theme.testi.on` (sözler gerçekse aç).

### E4 · Enes'te bekleyen kararlar (2 Eyl)

1. Üç savurma hükmü (rota sayfaları, EN çeviriler, giydirme/telefon).
2. Adım 0 zamanı (öneri: hemen).
3. Eski sitenin akıbeti (adım 10).
4. IndexNow taşınsın mı (adım 9).
5. og görseli ölçüsü (1200×614 → 1200×630 yeni görsel?).
6. Kaldırılacak dört bölüm (2c, R13 bekçisi): prolog kapandı, kaldırma
   kapısı artık Enes'in "kaldır" sözü.
7. Ana sayfa `content-visibility` bedeli (ilk Tab 45-57 ms) için "ilk
   boyamadan sonra aç" tasarımı: J1/K1 bütçesi dolu, yer açmak karar ister
   (TUR4-CHROME-DENETIM.md §3).
8. Hizmet CSS parçası (138 KB) bölme: ilk kare stil+düzen 100-200 ms'nin
   tek adayı; ölçülmedi.

---

## 0 · ADIM 0 — KESMEDEN BAĞIMSIZ, ÖNE ALINDI: qanatone.com'u bağla

**Bu adım kesmeyi BEKLEMEZ ve beklememeli.** İki ölçülmüş gerekçe:

1. **`*.netlify.app` SNI engeli (20 Ağu, Enes'in makinesinden ölçüldü):**
   alan adının TAMAMINA (app.netlify.app dahil) TLS el sıkışması
   kurulamıyor; `netlify.com` ve `github.com` sorunsuz, DNS temiz
   (yerel ↔ 1.1.1.1 aynı IP'ler). Görüntü ISS'in SNI temelli engeli —
   **aynı ISS'teki ziyaretçiler siteye hiç ulaşamıyor olabilir.**
   Özel alan adı bu engelin dışında kalır.
2. **Canlı sitenin canonical'ları ZATEN qanatone.com'a işaret ediyor**
   (kök build.js `ORIGIN` + yeni kabuk `KOK`) — bağlı olmayan bir
   adrese. Arama motoru gözünde "kanonik adresi ölü site" durumundayız;
   bağlamak bunu kendiliğinden düzeltir.

**Yapılacak (Netlify panelinden, Enes):**
- Site settings → Domain management → **Add custom domain → qanatone.com**
  (+ `www.qanatone.com`, primary'ye yönlenir).
- Alan adının alındığı kayıt firmasında DNS: Netlify'ın önerdiği kayıt —
  ya **Netlify DNS'e devir** (NS kayıtları, en az sürtünme) ya da
  **apex A/ALIAS → Netlify load balancer + www CNAME**  (panel adresleri
  gösterir).
- HTTPS sertifikasının (Let's Encrypt) verildiğini panelden doğrula.
- Kontrol: `https://qanatone.com/` eski siteyi, `/yeni/` yeni kabuğu
  vermeli; netlify.app adresi otomatik olarak birincil alana yönlenir.

Bu adım kesme ÖNCESİ eski siteyi qanatone.com'dan yayına sokar —
canonical'lar o andan itibaren doğru; kesme sadece içeriği değiştirir,
adresi değil. **DNS yayılımı 24-48 saat sürebilir; kesme gününden önce
bitmiş olmalı.**

## 1 · Kesme ön şartları — güncel durum (20 Ağu)

| Şart | Durum |
|---|---|
| Ana sayfa skor/parite/şema | ✅ (rapor 19 Ağu; savurma GEÇİLDİ) |
| 29 rota parite + ölçüm | ✅ rota turu kapandı (d57a282) |
| Giydirme (görsel dil) | ✅ yapım bitti (4a1e911); **savurma hükmü AÇIK** |
| Rota sayfaları savurması | ❌ **Enes'te** |
| EN çevirilerin savurması | ❌ **Enes'te** (S2/S3/S5 metinleri benim kalemimden) |
| rss.xml + sitemap üreteci | ✅ bu hazırlıkta geldi (R8 bekçili) |
| EN ana bekçisi | ✅ H24 (üretilmiş + tek h1 + gzip ≤ 32 KB; tam H genişletmesi aşağıda) |
| qanatone.com bağlı | ❌ **Adım 0 — hemen yapılabilir** |
| **Global katman (nav/menü/footer/dil)** | ❌ **HİÇBİR turda ele alınmadı — envanter 20 Ağu, aşağıda 1b; kesme ÖNCESİ tur ister** |

### 1b · Global katman açığı (20 Ağu envanteri)

Yeni kabuğun 60 sayfasının tamamı Faz 1'in MİNİMAL kabuğunu taşıyor
(`Temel.astro`: metin logo + etiket rozeti; footer: legal satırı +
Hukuki + «ana site»). Eski global katmanın karşılıkları:

| Eski öğe (kök index.html) | Envanter kararı | Bugünkü durum |
|---|---|---|
| `#nav`: görselli logo + Hizmetler/Projeler/Stüdyo dropdown + Bülten + TR/EN + «Konuşalım» CTA (gaspin/.shiny) + burger (4632) | gaspin: «Aynen, saf CSS» | **kurulmadı** |
| `#mmenu` tam ekran mobil menü (mmrow kademeli giriş, 4660) | «Menü adasıyla» | **kurulmadı** |
| `<footer>`: logo+tanıtım · «Sayfalar» 6 link · İletişim (waFoot/mailFoot/footSocial — JS) · © + legalLine + İst·Dubai bandı (5478) | envanterde satırı YOK | **kurulmadı** (minimal eş var) |
| `#wmk` wordmark piksel canvas (5502) | «TAŞINMIYOR — SVG/CSS metin olur» | canvas doğru şekilde yok; **SVG karşılığı da yok** (footer kurulmadığı için) |
| `#bit` «QANATONE ajanı» yüzen balonu (bitr, 4624) | «Masaüstü adası, idle+lazy; mobilde inmez» | **kurulmadı** |
| TR/EN dil değiştirici (SPA butonları) | kayıtsız — mekanizma rota tabanına değişti | hreflang var (S1), **görünür geçiş yolu YOK** |
| SPA rota geçişi (pgin) | «TAŞINMIYOR» (kayıtlı, Enes veto edebilir) | doğru şekilde yok |

Sebep «unutma» değil ama «sahipsiz taahhüt»: ana sayfa turu SAHNE
listesiyle, rota turu SAYFA listesiyle, giydirme ertelenen-animasyon
listesiyle çalıştı — global katman hiçbirinin listesine girmedi;
envanterin adaya bağladığı üç kalem (menü adası, nav CTA, #bit) askıda
kaldı. Gezinme bugün sahne gövdelerinden akıyor (H16: 216 iç bağlantı)
ama örneğin bülten yazısından hizmetlere header yolu yok; kesme bu
hâlle yapılırsa köke NAV'SIZ ve dil geçişsiz bir site çıkar — eski
siteye göre gezinme gerilemesi (parite diff'i sayfa gövdesini ölçtü,
chrome'u hiç ölçmedi).

**Gereken: GLOBAL KATMAN TURU (kesme ön şartı).** Kapsam: nav (dropdown
içerikleri statik basılır — eskide JS'ten doluyordu, bot görmüyordu:
süperküme fırsatı) · mobil menü adası · footer (wa/social alanları
content.json'dan; `wa` verisi bozuk — bilinen 4 anahtar) · görünür dil
değiştiricisi (rota eşine bağlantı) · #wmk'nin SVG/CSS metin karşılığı ·
#bit kararı (Enes: taşınsın mı). BAYT UYARISI: TR ana 31.829/32.768 —
nav+footer markup'ı H18 payına sığmayabilir, tur ölçümle açılır.

## 2 · Kesme günü adımları (tek commit + netlify yapılandırması)

Sıra önemli; her adımın bekçisi yanında.

**2a. Hizmet rotası çoğula döner.** `src/pages/hizmet/` → `hizmetler/`,
`en/hizmet/` → `en/hizmetler/` (klasör adı). Canonical'lar ZATEN çoğul —
rota canonical'la hizalanır, eski `/hizmetler/<slug>` adresleri redirect'siz
birebir yaşar. Bekçi: H16 (iç bağlantılar) + S1.

**2b. Redirect blokları.** Yeni kabuğun bugüne kadarki tekil adresleri
(9×2, `/yeni/` altında noindex'liydi ama tarayıcı geçmişi/yer imi olabilir)
çoğula 301:
```
# --- kesme: hizmet tekil → çoğul (2b) ---
/hizmet/:slug        /hizmetler/:slug        301!
/en/hizmet/:slug     /en/hizmetler/:slug     301!
# --- kesme: /yeni/* köke (eski önizleme adresleri ölmesin) ---
/yeni/*              /:splat                 301!
```
Not: eski kök build.js `_redirects` üretiyor — kesmede o üreteç devreden
çıkacağı için bu kurallar yeni tarafın statik `public/_redirects`ine
(veya netlify.toml `[[redirects]]`) taşınır. Bekçi: kesme doğrulama
listesindeki 200/301 taraması (madde 4).

**2c. Yayın hedefi.** `astro.config.mjs`: `base: '/yeni'` → `'/'`,
`outDir: '../dist'`. `netlify.toml`: `command` eski `node build.js`
zincirinden çıkar (yalnız yeni derleme + denetim), `publish = "dist"`.
**Karar (Enes):** eski site tamamen mi kalkar, `/eski/` altında arşiv mi —
arşivse eski build çıktısı bir alt klasöre basılır ve noindex'lenir.
**Panel korunur:** `[functions] included_files=["admin.html"]` ve
`/admin.html → panel fonksiyonu` redirect'i kesmeden ETKİLENMEMELİ
(panel content.json'un tek yazarı). Bekçi: kesme sonrası panel girişi
elle doğrulanır.

**2d. `/yeni` önek envanteri sıfırlanır.** base değişince
`import.meta.env.BASE_URL` kullanan yerler kendiliğinden düzelir; ELLE
değişecek sabit yollar (20 Ağu envanteri, `grep -rn "/yeni" yeni/src ...`):
denetim.cjs ×22 · stil/font.css ×8 (font yolları) · SHHero ×8 ·
index/en-index ×4+4 · astro.config ×3 · ana.css, STSerit, SPDeste,
ProjeGovde, sitemap.xml.ts, 404 ×2'şer · kurucu.css, SKUKurucu,
ProjeDizin, hukuki ×1'er · kök `_headers` (`/yeni/_astro/*` immutable →
`/_astro/*`). Kesme commit'inde `grep -rn "/yeni"` yeni tarafta SIFIR
olmalı — geçici bekçi **K1** (dist çıktısında `/yeni/` geçmez) kesme
commit'iyle eklenir, bir sonraki turda kaldırılabilir.

**2e. N1 tersine döner + hukuki canonical'ı.** `Temel.astro`dan
`noindex` kalkar; denetimde **N1 bekçisi ters yöne çevrilir** (her sayfa
İNDEKSLENEBİLİR olmalı; 404 istisna). `hukuki.astro` canonical'ı
`KOK/hukuki`ye döner → R8 onu sitemap'e OTOMATİK zorlar (üreteçteki
yollar listesine `/hukuki` eklenir; hreflang'sız — tek dil).

**2f. robots.txt yeni üreteçten.** Eski build.js robots'unun taşınacak
içeriği: AI botları davet listesi (GPTBot…meta-externalagent — GEO
stratejisi) + `Sitemap: https://qanatone.com/sitemap.xml` + admin/404
Disallow. `public/robots.txt` (statik) yeterli — dinamik gerektiren şey
yok. Bekçi: R8 sitemap'i zaten kilitliyor; robots satırı S1 ailesine
küçük ek (kesme commit'inde).

**2g. IndexNow.** Eski build.js anahtar dosyası + bildirim yapıyordu
(Bing/Yandex; ChatGPT Bing indeksi — GEO). **Karar (Enes):** yeni
tarafta taşınır mı (deploy sonrası hook ister — Netlify build plugin
veya elle) yoksa Search Console + sitemap yeterli mi.

**2h. Ölçüm ve H bekçileri.** H ailesinin `/yeni/` yol düzeltmeleri
(2d'nin parçası). H18/H24 tavanları değişmez. Kesme sonrası canlıda
Lighthouse (medyanlı düzen) + Search Console'a sitemap bildirimi.

## 2c · KALDIRILACAK DÖRT BÖLÜM — İŞARETLENDİ, KALDIRILMADI (22 Ağu)

Enes'in kararı (21 Ağu, `CODE-TALİMATI-PROLOG-1` → "Ayrıca"):
**"Kaldırılacak dört bölüm işaretlensin, kaldırılmasın. Kesme prolog
çalışınca yapılacak."**

| bölüm | bileşen | ana sayfadaki kökü |
|---|---|---|
| katman | `src/sahneler/SKKatman.astro` | `<section class="sk-sahne">` |
| akış | `src/sahneler/SAAkis.astro` | `<section class="sa-sahne">` |
| sektör + pano | `src/sahneler/SSESektor.astro` | `<section class="sse-sahne">` |
| kanal ızgarası | `src/sahneler/SSZSozler.astro` | `<section class="ssz-sahne">` |

Dördünün de dosya başında `>>> KESME ADAYI · PROLOG ÇALIŞINCA
KALDIRILACAK <<<` bloğu duruyor. **İşaret silinmez.**

Bekçisi `yeni/denetim.cjs` **R13** ve iki yönlü çalışır: (a) dört işaret
de yerinde mi, (b) dört sahne hâlâ ana sayfada basılıyor mu. Yani ne
işaret sessizce kaybolabilir, ne de bölüm sessizce düşebilir — kaldırma
Enes'in kararı, kural onun yerine karar vermez ama sessiz kalmasına izin
vermez. Hata enjekte edilerek doğrulandı: işaret silinince ve bölüm
kaldırılınca kural kırmızı dönüyor.

**Kaldırma günü:** dört dosya + `src/pages/index.astro` (ve EN karşılığı)
+ R13 kuralı BİRLİKTE, tek ve açık mesajlı commit'le kalkar. Kaldırılan
her sahnenin kendi CSS'i, görselleri ve `content.json` alanları da aynı
commit'te temizlenir; H19/H17/H20 gibi o sahnelere bağlı denetim
kuralları da (sessizce değil, adıyla) düşer.

**Ön şart:** prolog çalışıyor olacak. 1. durak (dağ) 22 Ağu'da çıktı;
kaldırma kapısı prologun Enes tarafından kabulüne bağlı.

## 3 · H bekçilerinin EN'e TAM genişletilmesi (ayrı iş, kesme şartı değil)

H24 üç ucu kilitledi (üretilmiş/h1/gzip). H1-H23'ün EN eşleri içerik
sözlükleri ister (H15 deste adları, H17 katman anahtarları, H19 akış
kartları EN değerleriyle). Kesmeden bağımsız ilerleyebilir; kesme İÇİN
şart değil (EN ana zaten TR ile aynı bileşenlerden derleniyor, CSS
kuralları TR ölçümünde yakalanıyor).

## 4 · Kesme günü doğrulama listesi

1. `node yeni/denetim.cjs` yeşil (N1 ters yönde, K1 dahil).
2. Eski 60 rotanın URL listesi (GOC-ENVANTER + rota raporu) curl ile
   taranır: hepsi 200 veya 301→200; **hiçbir URL ölmez** (Anayasa şartı).
3. `https://qanatone.com/sitemap.xml` ve `/bulten/rss.xml` yayında,
   loc'lar 200.
4. Panel: `/admin.html` Basic Auth + kayıt/yayın denemesi (content.json
   zinciri canlıda).
5. Netlify Forms: lead + bulletin formları kesme derlemesinde yeniden
   tanınmış mı (form listesinde görünmeli — statik HTML değişti).
6. Canlı Lighthouse medyanı ana + 2 iç sayfa; bant: ana ≥97/LCP<2sn,
   iç sayfalar 100/LCP~1sn.
7. Search Console: sitemap gönder, kapsam raporunu ertesi gün kontrol.

## 5 · Geri dönüş planı

Kesme TEK commit + netlify yapılandırması olduğundan geri dönüş tek
`git revert` + deploy. Adım 0 (alan adı) geri alınmaz — eski site de
qanatone.com'da yaşayabildiği için DNS kesmeden bağımsız kalıcıdır.
Search Console'a sitemap bildirimi revert hâlinde eski sitemap'le
yenilenir. `/yeni/*` redirect'i revert'te kalkacağı için eski önizleme
adresleri yine çalışır.

## 6 · Enes'te bekleyen kararlar (kesme öncesi)

1. **Üç savurma hükmü:** rota sayfaları · EN çeviriler · giydirme
   (telefonda). Kesmenin tek gerçek kapısı bunlar.
2. **Adım 0 zamanı:** qanatone.com bağlama — önerim HEMEN (SNI engeli).
3. **Eski sitenin akıbeti:** tamamen kalkar mı, `/eski/` arşivi mi.
4. **IndexNow** taşınsın mı (2g).
5. **NODE_VERSION=20** destek dışı — 22'ye çekmek ayrı ölçülü iş,
   kesmeyle birleştirilebilir (tek deploy riski yerine önce tek başına
   denenmesi daha temiz).
6. **content.json veri bozulması** (dgh/wa/ld5/prjall) — panelden onarım;
   kesmeye engel değil (bileşenler ayıklıyor) ama temiz kesme güzel olur.
