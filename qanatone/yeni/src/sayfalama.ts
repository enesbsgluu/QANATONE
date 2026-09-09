/* SAYFALAMA — TEK KAYNAK (9 Eyl 2026).
   Sayfa sayisi ve yollari BURADA hesaplanir; TR ve EN rotalari, sitemap
   ve denetim ayni sayidan beslenir. Sayi `veri/sayfalar.json`daki
   `sayfa_boyu` (Enes: 12) — bu dosya onu TASIMAZ, OKUR.

   NEDEN AYRI DOSYA: iki rota (`bulten/sayfa/[n]`, `en/bulten/sayfa/[n]`)
   ve `sitemap.xml.ts` ayni listeyi uretmek zorunda. Uc yerde ayri ayri
   `Math.ceil` yazilsaydi biri degisince obur ikisi sessizce kayardi ve
   sonuc "dist'te var, sitemap'te yok" (ya da tersi) olurdu — R8 kapisinin
   tam olarak yakaladigi kusur, ama kirmizi cikmadan once yayina gitme
   sansi da vardi. */
import { getCollection } from 'astro:content';
import sayfalarVeri from './veri/sayfalar.json';

const KOL: any = (sayfalarVeri as any).koleksiyon.find((k: any) => k.ad === 'yazilar');

export const SAYFA_BOYU: number = KOL.sayfa_boyu;
export const SAYFA_YOLU: string = KOL.sayfa_yolu;

/** Yazi sayisindan toplam dizin sayfasi (1. sayfa dahil). En az 1. */
export const toplamSayfaHesap = (adet: number): number =>
  Math.max(1, Math.ceil(adet / SAYFA_BOYU));

/** Arsivdeki yazi sayisina gore toplam dizin sayfasi. */
export async function toplamSayfa(): Promise<number> {
  return toplamSayfaHesap((await getCollection('yazilar')).length);
}

/** `/bulten` (n=1) ya da `/bulten/sayfa/N` — KOK'suz, dil oneksiz. */
export const sayfaYoluOlustur = (n: number): string =>
  n <= 1 ? KOL.dizin : SAYFA_YOLU.replace('{n}', String(n));

/* getStaticPaths govdesi: 2..N. 1. sayfa BURADA URETILMEZ — o `/bulten`
   (index.astro) ve adresi degismedi; `/bulten/sayfa/1` uretmek ayni
   listeyi ikinci bir adresten sunmak, yani kopya icerik olurdu. */
export async function sayfaYollari() {
  const toplam = await toplamSayfa();
  const yollar = [];
  for (let n = 2; n <= toplam; n++) yollar.push({ params: { n: String(n) } });
  return yollar;
}

/* ---- KONU ARSIVLERI (9 Eyl 2026) ------------------------------------
   `/bulten/konu/<k>` ve `/bulten/konu/<k>/sayfa/<n>`. Ayni sayfa boyu,
   ayni gezinme; tek fark listenin once konuya suzulmesi.
   ADLANDIRMA: alan `posts[].topic`, URL `konu`. `sector` adi 9 Eyl
   2026'da BOSALDI ve GERCEK sektor bagina verildi (alti sektor).
   Ayrinti: src/konular.ts. */
export async function konuListesi(): Promise<string[]> {
  const yazilar = (await getCollection('yazilar')).map((e) => e.data as any);
  return [...new Set(yazilar.map((p) => String(p.topic || '')))].filter(Boolean);
}

export async function konuSayilari(): Promise<Record<string, number>> {
  const yazilar = (await getCollection('yazilar')).map((e) => e.data as any);
  const s: Record<string, number> = {};
  for (const p of yazilar) { const k = String(p.topic || ''); if (k) s[k] = (s[k] || 0) + 1; }
  return s;
}

/** `/bulten/konu/<k>` — her konunun 1. sayfasi. */
export async function konuYollari() {
  return (await konuListesi()).map((k) => ({ params: { k } }));
}

/** `/bulten/konu/<k>/sayfa/<n>` — 2..N, konu basina. 1. sayfa uretilmez. */
export async function konuSayfaYollari() {
  const say = await konuSayilari();
  const yollar: { params: { k: string; n: string } }[] = [];
  for (const [k, adet] of Object.entries(say))
    for (let n = 2; n <= toplamSayfaHesap(adet); n++) yollar.push({ params: { k, n: String(n) } });
  return yollar;
}

/* ---- BOLUMLER (nedir · haber, 9 Eyl 2026) ---------------------------
   Bolum farklari VERI: `veri/sayfalar.json`. Bu yardimcilar rotalarin
   `getStaticPaths`ini besler ve BOS koleksiyonda BOS dizi doner — yani
   bos bolum hic sayfa uretmez. `kosullu` bayragiyla birlikte bolum,
   ilk yazi panelden eklenene kadar sitede YOKTUR: menude, sitemap'te,
   sayfa kumesinde. Kod degisikligi gerekmeden acilir. */
export function bolumKaydi(ad: string): any {
  return (sayfalarVeri as any).koleksiyon.find((k: any) => k.ad === ad);
}

/** Bolumun dizin sayfasi (1. sayfa) — koleksiyon BOSSA uretilmez.
    Rota `[...kok].astro`: rest parametresi ADIYLA ve `undefined`
    verilmeli (`{}` degil) — Astro aksi halde
    "getStaticPaths expected params" ile duser. `undefined` rest,
    segmentsiz yolu (`/nedir`) uretir. */
export async function bolumDizinYolu(ad: string) {
  const adet = (await getCollection(ad as any)).length;
  return adet > 0 ? [{ params: { kok: undefined } }] : [];
}

/** Bolumun yazi detaylari. */
export async function bolumYaziYollari(ad: string) {
  return (await getCollection(ad as any)).map((e: any) => ({ params: { slug: e.id }, props: { p: e.data } }));
}

/** Bolumun 2..N dizin sayfalari. */
export async function bolumSayfaYollari(ad: string) {
  const toplam = toplamSayfaHesap((await getCollection(ad as any)).length);
  const yollar = [];
  for (let n = 2; n <= toplam; n++) yollar.push({ params: { n: String(n) } });
  return yollar;
}

/** Bolumun konu arsivleri (yalniz `arsiv_alan` tanimliysa). */
export async function bolumKonuYollari(ad: string) {
  const K = bolumKaydi(ad);
  if (!K || !K.arsiv_alan) return [];
  const yazilar = (await getCollection(ad as any)).map((e: any) => e.data);
  const k = [...new Set(yazilar.map((p: any) => String(p[K.arsiv_alan] || '')))].filter(Boolean);
  return (k as string[]).map((x) => ({ params: { k: x } }));
}

/** Bolumun konu arsivi 2..N sayfalari (yalniz `arsiv_alan` tanimliysa). */
export async function bolumKonuSayfaYollari(ad: string) {
  const K = bolumKaydi(ad);
  if (!K || !K.arsiv_alan) return [];
  const yazilar = (await getCollection(ad as any)).map((e: any) => e.data);
  const say: Record<string, number> = {};
  for (const p of yazilar) {
    const a = String((p as any)[K.arsiv_alan] || '');
    if (a) say[a] = (say[a] || 0) + 1;
  }
  const yollar: { params: { k: string; n: string } }[] = [];
  for (const [k, adet] of Object.entries(say))
    for (let n = 2; n <= toplamSayfaHesap(adet); n++) yollar.push({ params: { k, n: String(n) } });
  return yollar;
}

/* ---- SEKTOR ARSIVI (Enes, 9 Eyl 2026) -------------------------------
   BOLUM USTU KESIT: `/sektor/<k>` bir sektorun TUM icerigini toplar —
   bulten, nedir ve haber ayrimi yapmadan. Enes'in cumlesi: "yaziyi
   girerken panelden sektor secilmeli ve o sektore yerlesmeli, boylece
   icerigin ne icerigi oldugu bilinir".
   Konu arsivinden FARKI: konu bir bolumun ICINDE suzer (/bulten/konu/x),
   sektor bolumleri ASAR. Bu yuzden `koleksiyon` degil kendi sozlesme
   kaydinda (`sektor_arsivi`) duruyor.
   Anahtarlar VERIDEN dogar: yalniz ICERIGI OLAN sektorun sayfasi
   uretilir — bos sektor sayfasi ince icerik olurdu. */
export const SEKTOR: any = (sayfalarVeri as any).sektor_arsivi;

/** Bir sektorun tum bolumlerdeki icerigi, tarihe gore yeni->eski. */
export async function sektorIcerigi(k: string) {
  const hepsi: any[] = [];
  for (const bolum of SEKTOR.bolumler) {
    const kayit = bolumKaydi(bolum);
    for (const e of await getCollection(bolum as any)) {
      const v = (e as any).data;
      if (String(v[SEKTOR.alan] || '') === k) hepsi.push({ ...v, _dizin: kayit.dizin, _bolum: bolum });
    }
  }
  return hepsi.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/** Icerigi olan sektor anahtarlari -> adet. */
export async function sektorSayilari(): Promise<Record<string, number>> {
  const s: Record<string, number> = {};
  for (const bolum of SEKTOR.bolumler)
    for (const e of await getCollection(bolum as any)) {
      const k = String(((e as any).data)[SEKTOR.alan] || '');
      if (k) s[k] = (s[k] || 0) + 1;
    }
  return s;
}

/** `/sektor/<k>` — yalniz icerigi olan sektorler. */
export async function sektorYollari() {
  return Object.keys(await sektorSayilari()).map((k) => ({ params: { k } }));
}

/** `/sektor/<k>/sayfa/<n>` — 2..N. */
export async function sektorSayfaYollari() {
  const say = await sektorSayilari();
  const yollar: { params: { k: string; n: string } }[] = [];
  for (const [k, adet] of Object.entries(say))
    for (let n = 2; n <= toplamSayfaHesap(adet); n++) yollar.push({ params: { k, n: String(n) } });
  return yollar;
}

/** Sektor arsivinde O SAYFADA gorunen kayitlar (dilim) + toplam.
    TEK KAYNAK: hem sayfanin kartlari hem JSON-LD ItemList'i buradan
    besleniyor. Ikisi ayri hesaplansaydi sema sayfada olmayan bir
    icerigi ilan edebilirdi — "kaynak dogru, cikti baska" kalibi. */
export async function sektorDilim(k: string, sayfa: number) {
  const hepsi = await sektorIcerigi(k);
  const boy: number = SEKTOR.sayfa_boyu;
  const toplam = toplamSayfaHesap(hepsi.length);
  const no = Math.min(Math.max(1, sayfa), toplam);
  return { hepsi, toplam, no, bas: (no - 1) * boy, gorunen: hepsi.slice((no - 1) * boy, no * boy) };
}

/* ---- DILIM TEK KAYNAKTAN (Kademe 2, 9 Eyl 2026) ---------------------
   Kartlar ve ItemList AYNI listeden turemek ZORUNDA. Onceden sema
   (`sema.mjs`) listeyi content.json'dan KENDI cikariyordu, kartlari ise
   `BolumDizin` Astro koleksiyonundan aliyordu — iki ayri yol, ayni
   dosyayi okuduklari icin ortusuyorlardi. Yazilar dosyaya ayrilinca
   sema bir anda BOSALDI: ItemList 0, kart 6 (T11 ve T14 yakaladi).
   Bu fonksiyon iki yolu tek yola indirir; rota dilimi bir kere alir,
   hem semaya hem bilesene verir. T14'un 5. olcutu — "ItemList = kart =
   dilim" — artik yalniz kapiyla degil YAPIYLA tutuluyor.
   Siralama, konu suzgeci ve sayfa kelepcesi BolumDizin'deki davranisin
   AYNISI: tarihe gore yeni->eski, `topic` esitligi, sayfa 1..toplam. */
export async function bolumDilimi(
  bolum: string,
  secim: { sayfa?: number; konu?: string } = {},
): Promise<{ arsiv: any[]; tum: any[]; yazilar: any[]; bas: number; sayfa: number; toplamSayfa: number }> {
  const K = bolumKaydi(bolum);
  const boy: number = (K && K.sayfa_boyu) || SAYFA_BOYU;
  const konu = secim.konu || '';
  const arsiv = (await getCollection(bolum as any)).map((e: any) => e.data)
    .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
  const tum = konu ? arsiv.filter((p: any) => String(p.topic || '') === konu) : arsiv;
  const toplamSayfa = Math.max(1, Math.ceil(tum.length / boy));
  const sayfa = Math.min(Math.max(1, secim.sayfa || 1), toplamSayfa);
  const bas = (sayfa - 1) * boy;
  return { arsiv, tum, yazilar: tum.slice(bas, bas + boy), bas, sayfa, toplamSayfa };
}
