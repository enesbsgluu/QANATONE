# Düzeltme: "paylaşılan kare" sözleşmesi ölçümle çürüdü

**31 Ağustos 2026.** PROLOG-KAPANIS-v2 7. adımın gereği.

## İddia neydi

İki referans belge de aynı şeyi söylüyordu:

- `DEVIR-SPESIFIKASYONU.md` §1: *"Her klibin son karesi bir sonrakinin ilk
  karesiyle aynıdır (paylaşılan kare zinciri)."*
- `HIGGSFIELD-SCRUB-MOTORU.md` §4: *"multi-leg'de her leg önceki legin
  GERÇEK son karesinden başlar (bizim 'paylaşılan kare' kuralıyla birebir)."*
- Görev metinleri buradan bir sonuç çıkarıyordu: *"Dikiş tahmine
  bırakılmaz, aynı kare olduğu için sıçrama imkânsızdır. Bir dikişte
  sıçrama görünüyorsa ya encode ya seek bozuktur, kaynak klipler değil."*

## Ölçüm ne dedi

**38 dikişin sıfırı birebir aynı kare.** Ham 4K ustalarda da öyle.

| ölçüm | encode hattı | ham 4K hattı |
|---|---|---|
| eşit (PSNR ≥ 35 & SSIM ≥ 0,95) | **0** / 38 | **0** / 38 |
| yakın (PSNR ≥ 28 & SSIM ≥ 0,90) | 1 / 38 | 1 / 38 |

Kaynak: `film/dikis.json` (`ozet.encode.esit`, `ozet.ham.esit`).
"Aynı kare" olsaydı PSNR sonsuza giderdi; ölçülen medyan 23,66 dB.

Komşu-kare matrisi (`film/dikis-komsu.json`, ham klipler, son 4 × ilk 4
kare) hizalamanın doğru olduğunu gösteriyor: 38 dikişin neredeyse
tamamında en iyi eşleşme `son-0 ↔ ilk+0`. Yani kayma yok — kareler
**hizalı ama özdeş değil**.

## Doğrusu

> **Zincir sürekli, kare tekrarlı değil.** Klip B, klip A'nın son
> karesinden *sonraki* kareyle başlar. Dikişteki değişim, klip içindeki
> ardışık iki kare arasındaki değişimle aynı büyüklüktedir.

Bu scrub için **daha iyidir**: tekrarlanan bir kare, kaydırma sırasında
duraksama gibi görünürdü.

## Sonuçları

1. **"Sıçrama varsa encode ya da seek bozuktur" çıkarımı geçersiz.**
   Sapmalar kaynağın kendisinde; encode ne ekliyor ne çıkarıyor — encode
   ve ham hatlar yan yana ölçüldü (`film/dikis-yerel.json`).

2. **Dikiş ölçütü mutlak PSNR olamaz.** Kamera sürekli hareket ettiği için
   klip *içindeki* ardışık kareler de farklıdır. Ölçüt taban-görelidir:
   `delta = dikiş_psnr − min(A sonu, B başı)`.
   Aynı 38 dikiş üç farklı tabanla **8 / 4 / 0** sıçrama verdi — hüküm
   malzemeden değil ölçütten çıkıyordu. Geçerli ölçüt `min` tabanıdır;
   onunla encode ve ham hatta **0 sıçrama**.
   Betik: `film/dikis-yerel.cjs`, karşılaştırma `olcut_kiyasi` alanında.
   `film/taban.cjs` (ortalama taban) tarihsel kayıt olarak duruyor,
   **hüküm ondan alınmaz**.

## Nerede düzeltildi

- `yeni/film/taban.cjs` künyesi (iddia + neden geçersiz).
- Bu dosya.
- **Düzeltilmedi:** `DEVIR-SPESIFIKASYONU.md` ve `HIGGSFIELD-SCRUB-MOTORU.md`
  depoda değil, Enes'in `Intel/Downloads` klasöründe duruyor. İkisi de
  hâlâ eski ifadeyi taşıyor; kaynak belgeleri onaysız değiştirmedim.
