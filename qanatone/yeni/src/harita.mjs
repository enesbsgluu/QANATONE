/* DÜNYA HARİTASI GEOMETRİSİ — motor sahnesinin 8. perdesi.
   Kaynak: kök index.html · mkMap 7687-7900 (QCO_RAW ülke listesi, AG
   tohumlu ağ, proj/kontrol/nokta yardımcıları).

   BURASI DERLEME ZAMANI: tarayıcıya bu dosyadan hiçbir şey inmez —
   çıktı yalnızca SVG yolu ve yüzde koordinatlarıdır. Kaynak aynı işi
   her karede canvas'ta yapıyordu; o yol 6,3 KB ızgara + 5 KB ülke
   listesi + çizici JS demek ve sayfa başına 10 KB'lik J1 tavanını tek
   başına yerdi. Statik olan derlemede pişer, hareket CSS'te sürer.

   PROJEKSİYON kaynağın kendisi (7694): equirectangular,
   lon −180..180 · lat −56..72 kutusuna gerilir. */
import ULKELER from './veri/ulkeler.json';

export const KUTU = { lon0: -180, lon1: 180, lat0: -56, lat1: 72 };
/* SVG kutusu: kara ızgarasının kendi oranı (400/142) */
export const VB = { w: 1000, h: 355.6 };

export const ulkeler = ULKELER;

/* yüzde koordinat (nokta katmanı: mutlak konumlu, YUVARLAK kalsın diye
   SVG'ye girmiyor — SVG kutusu preserveAspectRatio=none ile gerilir) */
export const yuzde = (lon, lat) => ({
  x: ((lon - KUTU.lon0) / (KUTU.lon1 - KUTU.lon0)) * 100,
  y: (1 - (lat - KUTU.lat0) / (KUTU.lat1 - KUTU.lat0)) * 100,
});
/* SVG kutu koordinatı */
export const nokta = (lon, lat) => {
  const p = yuzde(lon, lat);
  return { x: (p.x / 100) * VB.w, y: (p.y / 100) * VB.h };
};

/* Yay: kaynağın kontrol noktası (7734) — orta nokta, mesafenin %40'ı
   kadar yukarı, kutu yüksekliğinin %40'ıyla sınırlı. Kaynak bunu PİKSEL
   uzayında hesaplıyordu; burada kutu uzayında (sapma yazılı: kutu
   gerildiğinde eğrilik de gerilir). */
export const yay = (a, b) => {
  const p1 = nokta(a.lon, a.lat), p2 = nokta(b.lon, b.lat);
  const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2 - Math.min(d * .4, VB.h * .4);
  return {
    d: `M${p1.x.toFixed(1)},${p1.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`,
    p1, p2, kenar: Math.abs(p2.x - p1.x) > VB.w / 2,   /* kaynak: kenardan dolananı çizme (7740) */
  };
};

/* KÜRESEL AĞ — kaynağın tohumlu üreticisi (7699-7709) BİREBİR:
   aynı doğrusal eşleşmeli üreteç, aynı tohum, aynı 64 çift. Ağırlığı
   yüksek ülke havuzda o kadar kez bulunur. */
export function agKur() {
  let s = 20260808;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const hav = [];
  ULKELER.forEach((c, i) => { for (let k = 0; k < c.w; k++) hav.push(i); });
  const p = [];
  for (let n = 0; n < 74 && p.length < 64; n++) {
    const a = hav[(rnd() * hav.length) | 0], b = hav[(rnd() * hav.length) | 0];
    if (a === b) continue;
    p.push({ a, b, hiz: 2.6 + rnd() * 3.4, faz: rnd() });
  }
  return p;
}
