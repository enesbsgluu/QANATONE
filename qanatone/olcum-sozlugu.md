# Ölçüm Sözlüğü — pazarlama metrikleri → ajan sözlükleri

Kaynak: Enes'in metrik tablosu (11 Ağu 2026). Bu belge ÖLÇÜM spesifikasyonunun
ve Faz 4-5 ajan kartlarının kaynağıdır.

## Üç ilke — pazarlıksız

1. **Metrik ajan doğurmaz; var olan ajanın SÖZLÜĞÜNE girer.** Pazarlama
   ajanları inşa sırasında belli: Faz 4 yorum/reklam tetikleyicisi, Faz 5
   kampanya analisti. Metrik başına ajan = 45-betik tuzağının metrik hâli.
2. **Eşik değeri uydurulmaz.** Her red-flag, hesabın KENDİ taban çizgisine
   göre sapmadır (7 ve 28 günlük ortalamaya kıyas). "Sektörde iyi CTR %X"
   tarzı mutlak eşik yazılmaz — sektör kıyası ancak gerçek veri birikince.
3. **Kaynağı bağlanmamış metrik karta girmez.** Ajan o metrik sorulduğunda
   "rakam yok" der; boş kalması doğrudur (uydurma rakam yasağı).

## 1 · Kampanya Analisti (Faz 5) — ücretli trafik sözlüğü

| Metrik | Kaynak | Davranış bağı (Kapı 2) | Red-flag türü |
|---|---|---|---|
| ROAS | Ads/Meta API + satış değeri | harcama disiplini | taban çizgisi altına düşüş |
| CAC / CPA | Ads/Meta API | — | yükseliş trendi |
| CPL | API + form kayıtları | form sürtünmesi | sıçrama |
| CTR | API | dikkat / mesaj-kitle uyumu | düşüş (Frequency ile birlikte okunur) |
| CPC / CPM | API | açık artırma baskısı | ani artış |
| Frequency | API | reklam bıkkınlığı | Frequency artarken CTR düşüyorsa |
| Reach / Impressions | API | — | bağlam metriği, tek başına alarm değil |
| CPR | API | kampanya hedefine göre | hedef başına ayrı taban çizgisi |

## 2 · Yüzey ölçümü (site) — spec'e girer, inşası kendi fazında

| Metrik | Kaynak | Davranış bağı | Red-flag türü |
|---|---|---|---|
| CR (dönüşüm) | analytics + form/lead kayıtları | sürtünme + güven | düşüş |
| Bounce Rate | analytics | ilk saniye vaadinin tutması | artış |
| Session Duration · Pages/Session | analytics | ilgi derinliği | bağlam metriği |

Not: `diagnose.js` teknik yüzeyi zaten ölçüyor; bu satırlar davranış yüzeyi
ve analytics bağlantısı ister — kaynak bağlanana kadar karta girmez.

## 3 · Yaşam döngüsü — Faz 3 (randevu/takip) + Faz 6 (muhasebe denetçisi)

| Metrik | Kaynak | Davranış bağı | Red-flag türü |
|---|---|---|---|
| CLV · AOV | müşterinin satış verisi | — | AOV düşüş trendi |
| Churn · Retention | **müşterinin kendi CRM'i** (kaynak kuralı: kopya değil bağ) | bağlılık kaybı | churn artışı |
| NPS · CSAT | anket akışı kurulursa | memnuniyet | düşüş |

CRM'i olmayan müşteride bu bölüm boş kalır — boş kalması doğrudur.

## 4 · Karta girmeyenler

Market Share, Brand Awareness — KOBİ ölçeğinde güvenilir ölçüm kaynağı yok
(anket/panel işi). Kaynak doğana kadar sözlükte "rakam yok" olarak durur;
müşteriye bu adlarla vaat verilmez.

## Kullanım

- ÖLÇÜM spesifikasyonu (Code görevi 3+4) red-flag türlerini buradan alır.
- Faz 5 kampanya analistinin yetki kartı, 1. tablodaki metrik listesine
  BAĞLANIR (kopyalanmaz — tek doğruluk kaynağı bu dosya).
- Her metrik satırındaki "davranış bağı" doktrin Kapı 2'nin cevabıdır:
  rapor bir rakamı değil, adlandırılmış bir davranış değişimini anlatır.
