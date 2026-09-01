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

   Testi `test/hesap.test.mjs` — Anayasa "₺ hesap aritmetiği testli".

   NEDEN .mjs, .ts DEĞİL (19 Ağu, deploy düşerek öğrenildi): bu modülü
   hem Astro derlemesi hem de `node --test` içe aktarıyor. Netlify
   NODE_VERSION=20 ve Node 20 `.ts` dosyasını AÇAMIYOR
   (ERR_UNKNOWN_FILE_EXTENSION); tür soyma Node 22.6+ işi. Yerelde Node 24
   olduğu için test geçiyor, yayında düşüyordu. Türler JSDoc'ta duruyor,
   editör yine tamamlıyor, çalışma zamanı her Node'da açıyor. */
export const REACH = 0.55, LATE = 0.6, BAND = 0.3;

/**
 * @typedef {Object} Hesap
 * @property {number} tiklamaMaliyeti @property {number} talep
 * @property {number} kacirma @property {string} satisSimdi
 * @property {string} satisAjan @property {number} ciroSimdi
 * @property {number} kayip @property {number} kazanc
 * @property {number} kazancAlt @property {number} kazancUst
 */

/* Sektörün KENDİ başlangıç değerleriyle hesap. `butce` verilirse onunla
   (kaydırıcı turunda istemci tarafı bunu kullanır).
 * @param {any} s  @param {{butce?:number,tutar?:number,kacan?:number}} [girdi]
 * @returns {Hesap} */
export function sektorHesap(s, girdi) {
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
  const sf = (v) => (v < 10 ? v.toFixed(1) : String(Math.round(v)));
  return {
    tiklamaMaliyeti: cpc, talep, kacirma,
    satisSimdi: sf(satisSimdi), satisAjan: sf(satisSimdi + geri),
    ciroSimdi: satisSimdi * tutar,
    kayip: talep * kacirma * kapanma * tutar,
    kazanc, kazancAlt: kazanc * (1 - BAND), kazancUst: kazanc * (1 + BAND),
  };
}

/* Kısa para biçimi — kaynak `fmtS` 10312. Aralık gösterimi uzun olmasın.
 * @param {number} n  @param {'tr'|'en'} [dil]  @returns {string} */
export function bicimKisa(n, dil = 'tr') {
  const birim = dil === 'en' ? '$' : '₺';
  const a = Math.abs(n);
  if (a >= 1e6) return birim + (n / 1e6).toFixed(1).replace('.', dil === 'en' ? '.' : ',') + (dil === 'en' ? 'M' : ' Mn');
  if (a >= 1000) return birim + Math.round(n / 1000) + (dil === 'en' ? 'K' : ' B');
  return birim + Math.round(n);
}

/* Tam para biçimi — kaynak `fmt` 10305 (kaydırıcı etiketleri: bütçe ve
   satış tutarı). Derlemede ilk değer, istemcide (varlik/pano.js) her
   kaydırışta aynı fonksiyon — iki üreteç yok.
 * @param {number} n  @param {'tr'|'en'} [dil]  @returns {string} */
export function bicimTam(n, dil = 'tr') {
  const birim = dil === 'en' ? '$' : '₺', yer = dil === 'en' ? 'en-US' : 'tr-TR';
  if (Math.abs(n) >= 1e6) return birim + (n / 1e6).toFixed(1).replace('.', dil === 'en' ? '.' : ',') + (dil === 'en' ? 'M' : ' Mn');
  return birim + Math.round(n).toLocaleString(yer);
}
