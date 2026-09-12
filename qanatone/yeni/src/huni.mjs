/* Huni aritmetiği — /otomasyon hesaplayıcısının TEK formül kaynağı.
   Derleme (varsayılan iskelet rakamları) ve istemci adası (kaydırıcılar)
   AYNI modülü içer; iki üreteç doğmaz. Kaynak: kök hesapKur()
   10815-10857 — huni SIRAYLA daralır, her yüzde KALANA uygulanır;
   çıkan sayı bizim iddiamız değil, girilen yüzdelerin aritmetiği
   (kaynağın kendi yorumu, aynen taşındı).

   .mjs, .ts DEĞİL: denetimdeki test Node'la doğrudan koşar ve yayın
   Node'u 20 `.ts` açamaz (19 Ağu deploy dersi). */

/* İş değeri cetveli: 500₺–2M₺ aralığını doğrusal kaydırıcı taşıyamaz
   (esnaf ile müteahhit aynı cetvele sığmaz); kaydırıcı bu diziyi
   indeksler. Kaynaktan BİREBİR (29 kalem, varsayılan indeks 13 → 25.000). */
export const DEG = [500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500,
  10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000, 150000,
  200000, 250000, 300000, 400000, 500000, 750000, 1000000, 1500000, 2000000];

/* @param {number} T        aylık gelen talep
 * @param {number[]} yuzde  sıralı kayıp yüzdeleri (4 kalem)
 * @returns {{kademe:number[], kacan:number}} kademe[0]=T, sonrası her
 *          yüzdenin KALANA uygulanmış hâli; kacan = T - son kalan.
 *          Yuvarlama YOK — gösterim fmt'nin işi, para hesabı ham değerle. */
export function huni(T, yuzde) {
  let kalan = T; const kademe = [T];
  for (const y of yuzde) { kalan = kalan * (1 - y / 100); kademe.push(kalan); }
  return { kademe, kacan: T - kalan };
}

/* Sayı biçimi KENDİ ayracımızla: toLocaleString üç farklı ICU'ya bakar
   (yerel Node 24, Netlify Node 20, ziyaretçinin tarayıcısı) ve SSR ile
   istemcinin aynı basması şart — tarih dersinin (YaziGovde) aynısı.
   tr binlik '.', en binlik ',' — eski fmt'nin gözlenen çıktısıyla eş. */
export const fmt = (n, dil = 'tr') =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, dil === 'en' ? ',' : '.');
