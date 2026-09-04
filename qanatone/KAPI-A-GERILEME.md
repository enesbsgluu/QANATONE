# KAPI A — AÇIK KIRMIZI (4 Eyl 2026)

Kesme push'u (`d2a82fe`) Kapı A **kapanmadan** yapıldı. Enes'in kararıydı,
gerekçesiyle birlikte burada duruyor. Bu dosya kapı kapanınca güncellenir
ya da silinir; o güne kadar açık kalem.

## HÜKÜM: GERİLEME — ölçüm kümesi farkı DEĞİL

Sorulan soru şuydu: 61 sayfanın 8'i kırmızı; bu bir gerileme mi, yoksa iki
koşum farklı şeyleri mi ölçtü (küme 59→61 değişti, adresler `/yeni/` önekinden
köke taşındı)?

**Cevap kesin: gerileme.** Sekiz kırmızı sayfanın **sekizi de** önceki
koşumda aynı yolda ölçülmüştü. "Önce hiç ölçülmemiş" kırmızı sayfa: **0**.

| sayfa | önce | sonra |
|---|---|---|
| /hizmetler/finans | 16,8 ms / 1 kare | **33,6 ms / 3 kare** |
| /en/hizmetler/finans | 16,8 ms / 1 kare | **33,4 ms / 3 kare** |
| /projeler | 8,5 ms / 0 kare | **25,0 ms / 2 kare** |
| /hizmetler/web-sitesi-araclar | 16,7 ms / 1 kare | 25,0 ms / 2 kare |
| /en/hizmetler/web-sitesi-araclar | 16,7 ms / 1 kare | 25,1 ms / 2 kare |
| /otomasyon | 16,7 ms / 1 kare | 25,1 ms / 2 kare |
| /en/otomasyon | 16,7 ms / 1 kare | 25,0 ms / 2 kare |
| /en/sss | 8,5 ms / 0 kare | 16,6 ms / 1 kare |

## ASIL BULGU: kapı 8 sayfa gösteriyor, kayma 37 sayfada

Kırmızı sayısı yanıltıcı. 59 ortak sayfanın tamamı kıyaslandığında:

```
KÖTÜLEŞEN 37 · AYNI 21 · İYİLEŞEN 1
p95 farkı medyanı: +8,1 ms  (= tam +1 tik)
tik cinsinden:  -1 tik: 1 · 0 tik: 21 · +1 tik: 34 · +2 tik: 3
```

Yani sayfaların **üçte ikisi bir tik kaybetti**; kapı yalnızca eşiği aşan
8'ini kırmızı yaktı çünkü çoğu 0→1 kaydı ve kapı ≤1. Kaymanın kendisi
kapıdan çok daha geniş.

Değişmeyen 21 sayfanın eski değerleri neredeyse tamamen tabanda (8,5 ms ×16,
8,4 ms ×3): paylarında yer olan sayfalar taşmadı, sınıra yakın olanlar taştı.

## İKİ KOŞUM KIYASLANABİLİR

Aynı tarayıcı (brave Chrome/152.0.7977.76), aynı tazeleme (120,5 Hz · tik
8,3 ms · kararlı: true), aynı tekrar (3), aynı eşikler. Tek fark zaman:
3 Eyl 23:25 ↔ 4 Eyl 12:01.

## SEBEP HENÜZ BELİRLENMEDİ — İKİ ADAY

1. **Kesmenin getirdiği ortak kod değişikliği.** Kayma neredeyse her sayfada
   olduğuna göre sebep de ortak katmanda olmalı (kabuk, temel.css, ana.css,
   Nav/Perde). Kesme turu bu dosyaların hepsine dokundu.
2. **Makine yükü.** Bu depoda emsali VAR ve yazılı:
   `8de57c8 kapanis(olcum) SESSIZ MAKINEDE TAM TARAMA: KAPI A 59/59 GECTI —
   otomasyon kirmizisinin YUK oldugu kesinlesti`.
   Önceki koşum gece 23:25'te (makine boşta), bugünkü öğlen 12:01'de yapıldı.

Tek tip +1 tiklik kayma her iki hipotezle de uyumlu: küçük bir küresel
yavaşlama sınıra yakın sayfaları taşırır, payı olanları taşırmaz.

## SIRADAKİ TURUN İLK ADIMI — TARTIŞMASIZ

**Sessiz makinede Kapı A tam taraması.** Kod avına çıkmadan önce bu
koşulmalı; emsal tam olarak bunun ayırt edici olduğunu söylüyor. Yük
hipotezi elenmeden `olc-soguk-regim.cjs` ile animasyon sayımına geçmek,
gürültüyü sebep sanma riskidir.

Sonra (yük elenirse): `olc-soguk-regim.cjs` ile aynı anda koşan `view()`
animasyonlarını say — finans daha önce 100 animasyonla ölçülmüştü ve
finans burada da +2 tikle en ağır sayfa.

## NOT — bu ölçüm bugün koşulmadı, bilerek

4 Eyl günü makine sürekli meşguldü (derlemeler, tarayıcı ölçümleri, 680 MB
release yüklemesi). Yeni bir Kapı A koşumu bu koşullarda hüküm veremezdi;
"kısmi koşum hüküm değil" kuralının yük karşılığı budur.

---

# DÜZELTME — SESSİZ MAKİNE TARAMASI (4 Eyl 2026, Enes talimatı)

Yukarıdaki hüküm **YÜKLÜ MAKİNEDE** alınmıştı ve fazla genişti. Sessiz
makinede tam tarama koşuldu (aynı tarayıcı, aynı 120,5 Hz / 8,3 ms tik,
aynı tekrar, aynı eşikler). Sonuç tabloyu daraltıyor:

| | yüklü makine | **sessiz makine** |
|---|---|---|
| kötüleşen | 37 | **9** |
| aynı | 21 | **49** |
| iyileşen | 1 | **1** |
| kapıyı aşan (kırmızı) | 8 | **1** |

**"Site geneli bir tik kayması" büyük ölçüde YÜKTÜ.** Emsal (`8de57c8`
"sessiz makinede tam tarama: 59/59 geçti") bir kez daha tuttu; yedi kırmızı
makine boşalınca kayboldu.

## GERİYE KALAN TEK KIRMIZI

`/hizmetler/finans/` — p95 25,0 ms = 3,01 tik → **kaçırılan 2** (kapı ≤1),
takılma oranı %0,00, tek takılma 58 ms. Baz kayıtta 16,8 ms / 1 kare idi.

Bu **gerçek bir gerileme** ve aracın kendi künyesi neden öyle olduğunu
söylüyor (olc-sayfa.cjs, "KISMI KOSUM HUKUM DEGILDIR" notu): finans TAM
TARAMA içinde 16,7 ms ölçülür, tek başına/kesitte 25,0 ms — çünkü tarayıcı
önceki sayfaların ısınmasından faydalanır. Bugünkü **tam** tarama 25,0 ms
verdi; yani ısınmadan artık faydalanamıyor.

Kalan 8 sayfa 0→1 kareye çıktı ama kapı içinde (≤1).

## SIRADAKİ ADIM (değişti)

Yük hipotezi ELENDİ. Artık doğrudan finans'ın kendisine bakılır:
`olc-soguk-regim.cjs` ile aynı anda koşan `view()` animasyonlarını say
(daha önce finans'ta 100 ölçülmüştü). Sessiz makine taraması artık
gerekli değil — koşuldu ve hükmünü verdi.
