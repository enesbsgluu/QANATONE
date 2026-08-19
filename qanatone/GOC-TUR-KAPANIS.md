# GÖÇ TURU KAPANIŞ RAPORU — ANA SAYFA (Anayasa madde 8)

**19 Ağu 2026 · temel 78ebe7e → kapanış cb28fae (+şema paritesi bu commit) ·
Göç Anayasası v2 · İSKELET turu çerçevesi (Enes, 19 Ağu: "amaç eski görüntüyü
birebir geri getirmek değil, yeni görsel dili taşıyacak ada mimarisi;
sapmalar raporlanır, giydirme ayrı tur").**

Bu rapor kesmenin (Faz 4) ön şartlarını üretir; kesme ayrı iştir.
**Savurma hükmü Enes'in telefonunda.**

---

## 1 · Sahne listesi — commit, skor, bayt

Ölçüm düzeni: Lighthouse 13.4.1 mobil, simulate, yerel gzip'li sunucu,
**koşum düzeyinde dönüşümlü** (A,B,A,B — makinenin kayması ikisini de aynı
yöne iter), 4-6 tur ortancası. Her sahne kendi tabanıyla AYNI dakikada
kıyaslandı.

| Ada | Commit | Puan | LCP | Sahnenin kendi ölçüsü |
|---|---|---|---|---|
| S-H hero | 3342f78 | 99 | 1.676 | mobil ilk ekran 27,8 KB (tavan 300) |
| S-T şerit | 9c6dc00 | 100 | 1.674 | dikiş birebir (3 tur = −100%/3), JS 0 |
| S-P deste | c018ba6 + 961e5de | 98 | 1.675 | kaydırmada **0 uzun görev** (eski bölge: 42 görev / 4.737 ms); mobilde de sticky (Enes kararı), eski formülle azami fark 0,003 ölçek |
| S-K katman | a4a84b7 | 98 | 1.678 | JS 0; 9 hizmet sayfasına iç bağlantı; IO reveal ÖLÇÜLÜP söküldü (233 B betik = +158 ms LCP) |
| S-A akış | ab4a6f8 | 98 | 1.828 | JS 0; bot eskiden bu bölümde HİÇBİR ŞEY görmüyordu → 695 kr + 5 bağlantı HTML'de; **TCP eşiği bulundu** (aşağıda) |
| S-SE sektör | 539000e + 7886064 | 97 | 1.868 | JS 0; 6 pano HTML'de (7.098 kr, eskiden 0); **GSAP inmedi**; ₺ hesabı derlemede + 5 testle birebir |
| S-TE tespit | 97930b9 | 97 | 1.822 | sonuç iskeleti statik; ada yalnız submit'te; kota+AI-robots uyarısı eklendi |
| S-SZ sözler | 7c2b61c | 98 | 1.835 | JS 0; bento flex-grow + 0fr→1fr; mobilde açıklama hep açık |
| S-SB söz bandı | 1649436 | — | — | bayrak kapalı → **çıktıda hiç yok** (eski: uydurma sözler ham HTML'de, canlıda ölçüldü); açık hâli de sınandı |
| S-KU kurucu | 12ca50b | 97 | 1.859 | JS 0; native `<details>` — JS kapalıyken de açılıyor; foto 39,9→16,8 KB |
| S-IL iletişim + form | 7a35e95 | 97 | 1.852 | form statik (Netlify şartı), atıf boş doğar, POST gerçek Chrome'da yakalandı; JS'siz native POST çalışıyor |
| CSS teslim kararı | 0bfe8e9 | — | — | `always` ÖLÇÜLDÜ ve korundu: dış CSS +118 ms LCP |
| Perde | cb28fae | 97 | 1.829 | **perdesiz 1.828 — fark 1 ms**; dört Anayasa şartı gerçek Chrome'da tek tek ölçüldü |

**Ölçüm zemini dürüstlüğü:** mutlak LCP oturum boyunca 1.670 → 1.830
bandına kaydı; DEĞİŞMEYEN taban da aynı yöne kaydığı için bu makinenin
yükü, sahnelerin birikimi değil (bir pencerede kendi bıraktığım 16 headless
Chrome süreci TBT'yi 324'e itmişti; temizlenince iki taraf da normale döndü).
Kıyasların tamamı dönüşümlü — fark sütunu güvenilir, mutlak sütun değil.

## 2 · Toplam bütçeler (denetim ölçümü, kapanış anı)

| Kalem | Değer | Tavan |
|---|---|---|
| Ana sayfa toplam JS | **9.536 B** | 51.200 B (Anayasa hedef 50 KB) |
| — eski kaynak | 480 KB satır içi + 756 KB tubes | — |
| gzip HTML | **28.494 B** | 28.672 B (H18) — **pay 178 B** |
| Ham metin (bot görür) | 15.166 kr | eski ham: 8.813 kr (+%72) |
| Font trafiği | 77,6 KB, kendi alanımız | — |
| CLS | 0 (tüm sahnelerde) | 0 |
| TBT | 58-117 ms bandı | 200 ms |

**Bu turun iki ölçülmüş keşfi:**
1. **TCP ilk tıkanma penceresi (~14,6 KB gzip):** aşınca LCP tam bir RTT
   itiliyor (14,3→15,1 KB'ta +136 ms; RTT 150→75 yapılınca fark 130→72 —
   kanıt). Adım fonksiyonu; sonraki eşik ~29 KB. Bekçisi H18.
2. **Ada betiğinin açılış maliyeti:** 233 baytlık bir IO betiği bile
   açılışta sınıf yazınca LCP'yi 158 ms itebiliyor. Bu ders üç sahnede
   JS'i sıfıra indirdi (S-K, S-SZ reveal'ları scroll-driven'a; S-SE
   radyoya).

## 3 · Taşınmayan kalemler ve gerekçeleri

**Envanter kararları (v1, değişmedi):** tubes.min.js 756 KB · #wmk canvas
(SVG olacak) · Lenis · stars/grain canvas.

**Bu turda alınan sapmalar** (her biri sahne CSS'inin başında adıyla;
tümünün vetosu Enes'te):

| Sahne | Taşınmayan | Gerekçe |
|---|---|---|
| S-P | `.dkres` sonuç rakamları (%64, 3,1×…) | Faz 2 kırmızı çizgisi: doğrulanmamış metrik kartta durmaz |
| S-P | Bab İç Mimarlık destede yok | kart fotoğrafı değil logosu var; arşivde yaşayacak |
| S-K | `text-wrap:balance` | ÖLÇÜLDÜ: 2 bildirim ≈ +115 ms LCP; kaynakta 11 yerde daha var, her biri ayrı ölçülecek |
| S-A | 8 mini demo sahnesi (27 keyframe, 927 satır CSS) | giydirme turu; geldiğinde play-state kuralları hazır |
| S-A | sürükleme + ok düğmeleri (~1,6 KB JS) | 158 ms dersi; yerli kaydırma + klavye çalışıyor |
| S-A | `.akpin` yapışkan başlık | yatay kaydırma + dikey pin mobilde yön çatışması |
| S-SE | globe canvas + 3 grafik | envanter kararı zaten "kendi adasında, görünürken"; iskelette hiç inmiyor |
| S-SE | kaydırıcılar | rakamlar sabit ama görünür; hesap modülü istemciye hazır |
| S-SE | **GSAP** | merdivenin ilk basamağı bile gerekmedi (radyo+panolar); ~35 KB gzip hiç inmedi |
| S-TE | öneri listesi (`.dgfix`) | kalem başına 2 cümlelik i18n sözlüğü metin yükünü ikiler (H18) |
| S-TE | `ltdrop` harf girişi, tarama süpürmesi, skor sayacı rAF'ı | giydirme |
| S-SZ | kart görselleri (`chimg`, 202 KB) | kaynağın kendi sözü: "görsel kartın ATMOSFERİ, konusu değil" |
| S-SZ | giriş `opacity+blur` | madde 5/H2 (görünür doğar) + madde 7 (mobil filtre) |
| S-SB | otomatik dönüş (7 sn interval) | açılışta koşan zamanlayıcı; el ile geziliyor |
| S-KU | `#kcard` yaylı takip kartı + `kping` | rAF lerp + kare başına konum yazımı; envanterin kping satırı bununla kapandı |
| Perde | 2,7 sn zorunlu bekleme | maskelenecek yükleme kalmadı; perde ~2,2 sn marka selamı |
| Perde | `getTotalLength` + SVG izler | Anayasa adıyla yasaklıyor; izler giydirmede `pathLength="1"` ile gelebilir |
| Perde | ilerleme çubuğu + rAF | bekletme gidince gerçek ilerleme kalmadı; sahte dolum kaynağın kendi ilkesine aykırı |
| Genel | Manrope/Inter | madde 4, EMEKLİ |

## 4 · Denetim kural değişiklikleri (36 kural; hepsi enjeksiyonla kanıtlı)

**Yeni önekler:** sp- sk- sa- sse- ste- ssz- ssb- sku- sil- (SAHNE_ONEK +
HAREKET_ONEK; perde `sus-`).

**Yeni kurallar:** H12 kaydırma dinleyicisi + düzen okuması + getTotalLength
yasak · G2 görseller kendi alanımızdan · H13 deste görsel hattı · H15-H17
içerik/bağlantı bütünlüğü · **H18 gzip HTML ≤ 28 KB** (TCP eşiği dersi) ·
H19-H21 sahne içerik kilitleri · **H22 söz bandı çift yönlü kapı** · **H23
perde sözleşmesi** (6 enjeksiyon) · **S2 ana sayfa şema paritesi** · **T1
₺ aritmetiği testli** (+ Node 20 `.ts` bekçisi).

**Değişen kurallar (sessizce değil, gerekçeyle):** H1 daraldı (`.s4-kart`
istisnası kalktı — sınıf artık yok) · H5 keskinleşti ("opacity geçiyor mu"
→ "sönük mü başlıyor": `from{opacity:1}` şartı) · **H11 genişledi**
(`infinite` → TÜM sahne hareketleri; sebep: gerçek bir özgüllük hatası
denetimden kaçtı, gerçek Chrome yakaladı) · **H14 yeniden yazıldı** (pin
yasağı → mobil bağlamda pahalı katman yasağı; Enes'in "pin yasağı GSAP
içindir" kararıyla) · H14 mesajı düzeltildi (kusursuzken "sticky yok"
diyordu — yanlış yeşil).

## 5 · Parite diff sonuçları (madde 5)

**İÇERİK — YEŞİL, süperküme:** ham metin 8.813 → 15.166 karakter. 15 bölüm
ibaresinin 15'i yeni ham HTML'de. Eskiden botun HİÇ göremediği içerik artık
görünür: deste 6 iş (renderProjects JS'teydi) · akış 5 hizmet kartı
(`#akTrack` boştu) · sektör 6 pano (`#secBox` boştu) · teşhis iskeleti ·
kurucu satırı. Ayrıca eski `dgh` başlığı harf-iskele bozulması yüzünden
botta parçalıydı ("Ö n c e…"), yenide düz metin.

**ŞEMA — YEŞİL (bu kapanışta kapandı):** eski ana sayfa @graph'ı
{Organization, WebSite, WebPage}; yenide HİÇ yoktu → `src/sema.mjs` ile
taşındı, #org gövdesi eskiyle birebir (kural 107), bekçisi S2. Kalan türler
(Service, FAQPage, ItemList, Article, BreadcrumbList, CreativeWork) rota
sayfalarıyla gelecek — rota turunun işi.

**URL — AÇIK (rota turu):** eski 60 rotadan 29'u yeni kabukta henüz yok:
`/hizmetler` ve `/projeler` dizinleri, `/otomasyon` `/surec` `/sss`
`/bulten`, 7 proje detayı ve bunların `/en/` karşılıkları. Yeni kabuk 32
rota üretiyor (+`/hukuki`). Kesmede hiçbir URL ölmez şartı bu liste
kapanmadan sağlanamaz. N1 (noindex) kesmeye kadar sürüyor — doğru durumda.

## 6 · Faz 4 kesme şartları — durum

| Şart | Durum |
|---|---|
| Ana sayfa skorlar kapıda (≥90 · <2 sn · <200 ms · 0) | ✅ 97/1.829/117/0, perde açıkken |
| Ana sayfa içerik paritesi | ✅ süperküme |
| Ana sayfa şema paritesi | ✅ (S2 bekçili) |
| Tüm rotalarda parite | ❌ 29 rota rota-turunda |
| Rota sayfaları eski görsel dile giydirme | ❌ ayrı tur |
| Enes'in savurma testi + onayı | ⏳ telefonda |

## 7 · Enes'te bekleyen kararlar

1. **content.json veri bozulması (4 anahtar):** `dgh` (harf iskelesi,
   2.825 B), `wa` / `ld5` / `prjall` (içlerine SVG yazılmış). Bileşenler
   ayıklıyor; kalıcı onarım panelden — değerler yalın metin olmalı.
2. **Söz bandı bayrağı** kapalı: gerçek müşteri sözleri girilince panelden
   açılır, H22 iki yönü de bekçiliyor.
3. **NODE_VERSION=20** destek dışı (Nis 2026); 22/24'e çekmek ayrı ölçülmüş iş.
4. **Renk paleti:** `--metin-2` kart zemininde 4,16:1 (taban 4,5) — giydirme
   öncesi karar. Token dosyası hazır, bağlı değil.
5. **Perde yalnız ana sayfada** (iç sayfaya doğrudan giren görmez) ve
   hareket azaltmada hiç doğmuyor — ikisi de bilinçli sapma.
6. **Deste sırası** kanonik değil (bedeli ~44 KB) · **`.dkres` rakamları**
   taşınmadı · **Playfair yalnız hero** çelişkisi (`.ana h2` hepsine
   veriyor) — üçü giydirme/karar kalemi.
7. **H18 payı 178 B:** ana sayfaya eklenecek her şey ya bu paya sığar ya
   CSS diyeti ister ("daha az CSS yazmak" — teslim biçimi değil, ölçüldü).
