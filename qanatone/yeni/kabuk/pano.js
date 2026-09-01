/* PANO KAYDIRICILARI (sokum turu, 4 Eyl 2026) — kaynak SEC.calc/metrics/
   syncSliders 9422-9500. Formul hesap.mjs'ten ithal (tek kaynak, testli);
   bu dosya yalniz DOM'u okur/yazar. TEK kaydirici blogu: secili radyonun
   panosu (data-butce/tutar/kacan/cpc/lead/close) kaynak; sektor degisince
   kaydiricilar o sektorun varsayilanina doner (kaynak SEC.pick -> F=...).
   Ilk dokunus/ilk sektor degisiminde SSESektor.astro'daki satir ici tetik
   dinamik ithal eder (J1 disi). Uretim: kabuk-derle.cjs. */
import { sektorHesap, bicimKisa, bicimTam } from '../src/hesap.mjs';

export function baslat() {
  const c = document.querySelector('.sse-calc'); if (!c || c.__kur) return; c.__kur = 1;
  const dil = document.documentElement.lang === 'en' ? 'en' : 'tr';
  const yer = dil === 'en' ? 'en-US' : 'tr-TR';
  const alan = {}; for (const i of c.querySelectorAll('input[type=range]')) alan[i.name] = i;
  const etiket = {}; for (const b of c.querySelectorAll('b[data-v]')) etiket[b.dataset.v] = b;
  const secili = () => { const r = document.querySelector('input[name=sse]:checked'); return r && document.querySelector('.sse-pano-' + r.id.replace(/^sse-/, '')); };
  const veri = (pano) => ({ finance: { budget: +pano.dataset.butce, ticket: +pano.dataset.tutar, miss: +pano.dataset.kacan },
                           market: { cpc: +pano.dataset.cpc, lead: +pano.dataset.lead, close: +pano.dataset.close } });
  const yaz = () => {
    const pano = secili(); if (!pano) return;
    const K = (k) => pano.querySelector('[data-kutu="' + k + '"]');
    const g = { butce: +alan.butce.value, tutar: +alan.tutar.value, kacan: +alan.kacan.value };
    const h = sektorHesap(veri(pano), g);
    etiket.butce.textContent = bicimTam(g.butce, dil);
    etiket.tutar.textContent = bicimTam(g.tutar, dil);
    etiket.kacan.textContent = '%' + Math.round(g.kacan);
    K('talep').textContent = h.talep.toLocaleString(yer);
    K('ciro').textContent = bicimKisa(h.ciroSimdi, dil);
    K('kayip').textContent = bicimKisa(h.kayip, dil);
    K('satis1').textContent = h.satisSimdi; K('satis2').textContent = h.satisAjan;
    K('kazanc').textContent = bicimKisa(h.kazancAlt, dil) + ' – ' + bicimKisa(h.kazancUst, dil);
    for (const i of Object.values(alan)) i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min) * 100).toFixed(1) + '%');
    for (const b of c.querySelectorAll('.sse-slp button')) b.classList.toggle('on', +b.dataset.v === +alan[b.dataset.a].value);
  };
  const sektoreDon = () => { const p = secili(); if (!p) return; alan.butce.value = p.dataset.butce; alan.tutar.value = p.dataset.tutar; alan.kacan.value = p.dataset.kacan; yaz(); };
  for (const i of Object.values(alan)) i.addEventListener('input', yaz, { passive: true });
  c.addEventListener('click', (e) => { const b = e.target.closest('.sse-slp button'); if (!b) return; alan[b.dataset.a].value = b.dataset.v; yaz(); });
  for (const r of document.querySelectorAll('input[name=sse]')) r.addEventListener('change', sektoreDon);
  /* ilk kurulum: kaydiricilar derlemede ILK sektorun degerleriyle dogdu —
     kullanici sektor degistirmeden dokunduysa degeri EZME (olculdu: ilk
     dokunus sektor varsayilanina geri donuyordu), yalniz hesapla. */
  const p = secili();
  if (p && !p.classList.contains('sse-pano-' + c.dataset.ilk)) sektoreDon(); else yaz();
}
