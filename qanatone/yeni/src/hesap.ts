/* SEKTÖR PARA HESABI — tek kaynak.
   Kaynak: kök index.html `calc()` 10286 ve sabitleri 10285. Formül
   BİREBİR taşındı, mekanizma değişti: eskiden her kaydırıcı oynatışında
   tarayıcıda koşuyordu, burada DERLEME ANINDA koşuyor ve sonuç HTML'e
   pişiyor (kaydırıcılar geldiğinde aynı fonksiyon istemcide de kullanılır
   — iki üreteç doğurmamak için ada değil modül).

   Katsayılar kaynaktaki gerekçesiyle:
     REACH .55  yanıtsız talebin ajanın ulaşabildiği payı
     LATE  .60  geç dönülen talebin kapanma oranı (canlıya göre)
     BAND  .30  gösterilen aralığın genişliği
   Çarpımları ≈ 1/3: kaçan cironun yaklaşık üçte biri geri gelir.

   Testi `test/hesap.test.mjs` — Anayasa "₺ hesap aritmetiği testli". */
export const REACH = 0.55, LATE = 0.6, BAND = 0.3;

export interface Hesap {
  tiklamaMaliyeti: number; talep: number; kacirma: number;
  satisSimdi: string; satisAjan: string;
  ciroSimdi: number; kayip: number;
  kazanc: number; kazancAlt: number; kazancUst: number;
}

/* Sektörün KENDİ başlangıç değerleriyle hesap. `butce` verilirse onunla
   (kaydırıcı turunda istemci tarafı bunu kullanır). */
export function sektorHesap(s: any, girdi?: { butce?: number; tutar?: number; kacan?: number }): Hesap {
  const f = s.finance || {}, m = s.market || {};
  const ref = Math.max(f.budget || 40000, 1);
  const butce = Math.max(Number(girdi?.butce ?? f.budget) || 0, 0);
  const tutar = Math.max(Number(girdi?.tutar ?? f.ticket) || 0, 0);
  /* bütçe büyüdükçe ucuz ve niyetli trafik tükenir, tıklama pahalılaşır */
  const olcek = Math.min(1.8, Math.max(0.9, Math.pow(butce / ref, 0.2)));
  const cpc = Math.max((m.cpc || 12) * olcek, 1);
  const talep = Math.round((butce / cpc) * (m.lead || 0.04));
  const kacirma = Math.min(Math.max(Number(girdi?.kacan ?? f.miss) / 100 || 0, 0), 0.9);
  const kapanma = m.close || 0.06;
  const satisSimdi = talep * (1 - kacirma) * kapanma;
  const geri = talep * kacirma * REACH * LATE * kapanma;
  const kazanc = geri * tutar;
  const sf = (v: number) => (v < 10 ? v.toFixed(1) : String(Math.round(v)));
  return {
    tiklamaMaliyeti: cpc, talep, kacirma,
    satisSimdi: sf(satisSimdi), satisAjan: sf(satisSimdi + geri),
    ciroSimdi: satisSimdi * tutar,
    kayip: talep * kacirma * kapanma * tutar,
    kazanc, kazancAlt: kazanc * (1 - BAND), kazancUst: kazanc * (1 + BAND),
  };
}

/* Kısa para biçimi — kaynak `fmtS` 10312. Aralık gösterimi uzun olmasın. */
export function bicimKisa(n: number, dil: 'tr' | 'en' = 'tr'): string {
  const birim = dil === 'en' ? '$' : '₺';
  const a = Math.abs(n);
  if (a >= 1e6) return birim + (n / 1e6).toFixed(1).replace('.', dil === 'en' ? '.' : ',') + (dil === 'en' ? 'M' : ' Mn');
  if (a >= 1000) return birim + Math.round(n / 1000) + (dil === 'en' ? 'K' : ' B');
  return birim + Math.round(n);
}
