# FAZ 4 — KESME PLANI (hazırlık, 20 Ağu 2026)

**Durum: HAZIRLIK. Kesmenin kendisi bu belgeyle DEĞİL, Enes'in üç savurma
hükmü kapandıktan sonra ayrı bir commit'le yapılır.** Bu belge kesme
gününün adım listesini, hazır blokları ve geri dönüş yolunu kayda alır.
Kaynak raporlar: `GOC-TUR-KAPANIS.md` (ana sayfa) · `GOC-ROTA-KAPANIS.md`
(29 rota) · Göç Anayasası v2.

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
