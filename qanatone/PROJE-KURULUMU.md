# Claude Project kurulumu — sohbet devri

## Sorun

Sohbet şişince yeni sohbete geçerken devir dosyaları elle taşınıyordu ve
hep bir şey eksik kalıyordu. İki ayrı eksik vardı:

1. **Devir notu elle yazılıyordu** → yazıldığı an bayatlıyordu.
2. **Dosyalar her sohbete elden veriliyordu** → biri unutuluyordu.

---

## Üç yer, üç iş — karıştırma

| nerede | ne durur | kim günceller |
|---|---|---|
| **hafıza** | mimari, kurallar, kararlar, ders çıkarılan hatalar | Claude, kendiliğinden |
| **DEVIR.md** | paketin o anki fiziksel durumu (dosya, boyut, özet, damga) | `build.js`, her derlemede |
| **proje bilgi tabanı** | DEVIR + kurulum/test/ajan notları | **SEN, elle** |
| **sohbete yükleme** | kod paketi (zip) | sen, o sohbette gerekiyorsa |

**Dikkat — bu satırın altını çiz:** Claude proje bilgi tabanına
**yazamaz.** Öyle bir aracı yok. "Her yeni gelişme kendiliğinden projeye
işlensin" isteğinin karşılığı şu ikisi:

- **Hafıza** gerçekten kendiliğinden işliyor — karar, kural, mimari.
- **DEVIR.md** gerçekten kendiliğinden işliyor — ama *dosyanın içine*,
  bilgi tabanına değil.

Bilgi tabanındaki kopyayı **senin değiştirmen** gerekir. 20 saniyelik iş,
ama otomatik değil. Bunu bilmeden kurarsan üç hafta sonra bilgi tabanında
build 126 durur, sen build 140'tasındır ve kimse fark etmez — yani
çözdüğümüzü sandığımız sorunun aynısı, bir kat yukarıdan.

---

## Kurulum (bir kere)

1. Sol menü → **Projects** → **+ New Project** → ad: `QANATONE`
2. **Proje bilgi tabanına** şu dört dosyayı koy:
   - `DEVIR.txt`
   - `TEST.txt`
   - `NETLIFY-KURULUM.txt`
   - `AJAN-HOLDING.txt`
3. **Custom instructions** alanına aşağıdaki metni yapıştır.

### Neden `.txt`, neden `.md` değil

Desteklenen türler: PDF, DOCX, CSV, TXT, HTML, ODT, RTF, EPUB, JSON, XLSX.
**`.md` listede yok, ZIP de yok.** Uzantıyı `.txt` yapmak yeterli —
içerik aynı, markdown yine okunuyor. Dosya başına 30 MB, sayı sınırsız;
gerçek sınır bağlam penceresi.

`index.html` 783 KB — bilgi tabanına **koyma.** Her sohbette bağlamın
neredeyse tamamını yer ve hiçbir işe yaramaz. Kod paketi sohbete yüklenir.

### Custom instructions — kopyala yapıştır

```
QANATONE — kendi pazarlama ajansım. Tek dosya vanilla JS site + statik
üreteç (build.js) + 56 kurallı denetim suite'i.

Her sohbete DEVIR.txt'yi okuyarak başla: damga, dosya listesi ve
üretim durumu orada. Mimari, kurallar ve kararlar hafızanda —
tekrar anlatmamı bekleme.

Kaynak paketi (zip) sohbete ben yükleyeceğim; yüklemediysem iste.
Paket geldiğinde: aç, DEVIR'deki özetleri diskle karşılaştır
(sha1sum ilk 8 hane), `npm install && node build.js` çalıştır,
denetim suite'inin 0 kuralla bittiğini gör. Ondan sonra işe başla.

Kod değişikliğinde: önce oku, tek eşleşme kuralıyla yama, sonra
sözdizimi + davranış testi. Doğrulamadan "oldu" deme, ölçmediğin
rakamı verme. Her düzeltme denetim suite'inde kalıcı bir kurala
dönüşür.

Türkçe konuş, süsleme yapma, katılmadığın yerde katılma.
```

---

## Her çalışma oturumunun sonunda (30 saniye)

1. Son derlemeden çıkan **`DEVIR.md`**'yi al, adını `DEVIR.txt` yap.
2. Proje bilgi tabanındaki eskisini **sil**, yenisini koy.
3. Bitti.

Bunu atlarsan bilgi tabanı bayatlar. Bayat devir notu, devir notu
olmamasından daha kötüdür — çünkü ona güvenilir.

---

## Asıl çözüm — GitHub

Yayın hattı kurulunca depo hem devir dosyasının hem bu ritüelin yerini
alır: paket zaten orada, sürüm geçmişiyle. O gün yeni sohbete tek gereken
depo adresi olur. Ne zip, ne `.txt` çevirme, ne bayatlama.

Eksik olan tek şey: **GitHub kullanıcı adı + depo adı** ve panel için
**giriş yöntemi** kararı (Netlify Identity mi, fonksiyonda parola mı).
