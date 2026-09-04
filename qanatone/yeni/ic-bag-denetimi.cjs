#!/usr/bin/env node
/* IC BAG DOKUSU (YAYIN ONCESI KONTROL, madde 3 — 6 Eyl 2026).

   NEDEN VAR. H16 "her ic baglantinin hedefi var mi" diye sorar — KIRIK BAG
   arar. Bu betik TERS soruyu sorar: her sayfaya BAG GELIYOR MU, ve ana
   sayfadan kac tiklamada ulasiliyor. Ikisi ayri sorudur:
     · kirik bag = giden ucta kusur
     · yetim sayfa = gelen ucta kusur, ve H16 onu HIC gormez
   Yetim sayfa arama motoru icin pratikte yoktur: sitemap'te olsa bile
   "hicbir yerden baglanmayan sayfa" zayif sinyaldir.

   OLCULENLER (uretilen HTML uzerinden, kaynak degil — ziyaretcinin ve
   botun gordugu sey odur):
     gelen_bag   sayfaya kac AYRI sayfadan bag geliyor (kendi ici sayilmaz)
     yetim       gelen_bag = 0 olan sayfalar
     derinlik    ana sayfadan BFS ile en kisa tiklama sayisi (ulasilamayan
                 sayfa Infinity)
     en_derin    en buyuk derinlik ve o sayfalar
   KAPSAM DISI (gerekcesiyle, sessizce degil): sitemap disi ve dogrudan
   hedef olmayan sayfalar — 404, tesekkur (donusum ucu), film ve
   deneme-react (olcum zemini). Bunlarin yetim olmasi DOGRU.

   HUKUM: yetim (kapsam ici) = 0 ve derinlik <= DERINLIK_TAVANI.
   Cikis kodu 1 kirmiziya duser; kapi olarak kosulabilir.
   Kullanim: node yeni/ic-bag-denetimi.cjs   ·  TAVAN=3 ile esik degisir */
const fs = require('fs');
const path = require('path');
const DIST = path.join(__dirname, '..', 'dist', 'yeni');
const CIKTI = path.join(__dirname, 'ic-bag-denetimi.json');
const DERINLIK_TAVANI = Number(process.env.TAVAN || 3);
/* Kapsam disi: yetim olmalari DOGRU olan sayfalar (gerekce zorunlu) */
const ISTISNA = {
  '/404': 'hata sayfasi — hicbir yerden baglanmaz, sunucu dondurur',
  '/tesekkur': 'donusum ucu — yalniz form gonderiminden gelinir',
  '/en/tesekkur': 'donusum ucu (EN)',
  '/film': 'olcum zemini — urun sayfasi degil, siteden baglanmaz',
  '/en/film': 'olcum zemini (EN)',
  '/deneme-react': 'olcum zemini — React adasi denemesi',
};

const sayfalar = [];
(function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) gez(p); else if (e.name.endsWith('.html')) sayfalar.push(p);
  }
})(DIST);

/* dosya yolu -> site yolu ("/", "/hizmetler/seo", "/en/bulten/...") */
const yolu = (p) => {
  let r = '/' + path.relative(DIST, p).replace(/\\/g, '/');
  r = r.replace(/\/index\.html$/, '').replace(/\.html$/, '');
  return r === '' ? '/' : r;
};
const kume = new Map();                       /* site yolu -> dosya */
for (const p of sayfalar) kume.set(yolu(p), p);

/* Bir sayfadan cikan IC baglantilar. Yalnizca /yeni/ onekli ve ayni
   siteye giden mutlak yollar; disari, mailto, tel, wa.me ve capa (#) elenir.
   Sorgu ve capa kirpilir — /hizmetler#x ile /hizmetler AYNI sayfadir. */
const cikanlar = (p) => {
  const h = fs.readFileSync(p, 'utf8');
  const out = new Set();
  for (const m of h.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
    let u = m[1];
    if (/^(https?:|mailto:|tel:|#|javascript:)/i.test(u)) continue;
    u = u.split('#')[0].split('?')[0];
    if (!u.startsWith('/yeni')) continue;
    u = u.replace(/^\/yeni/, '') || '/';
    u = u.replace(/\/$/, '') || '/';
    if (kume.has(u)) out.add(u);
  }
  return [...out];
};

const bag = new Map();                        /* yol -> cikan yollar */
for (const [y, p] of kume) bag.set(y, cikanlar(p));

/* GELEN BAG — kendi kendine bag sayilmaz */
const gelen = new Map([...kume.keys()].map((y) => [y, new Set()]));
for (const [kaynak, hedefler] of bag) for (const h of hedefler) if (h !== kaynak) gelen.get(h).add(kaynak);

/* DERINLIK — ana sayfadan BFS. Iki dil iki koktur: / ve /en */
const derinlik = new Map();
for (const kok of ['/', '/en']) {
  if (!kume.has(kok)) continue;
  const kuyruk = [[kok, 0]];
  const gor = new Set([kok]);
  while (kuyruk.length) {
    const [y, d] = kuyruk.shift();
    if (!derinlik.has(y) || derinlik.get(y) > d) derinlik.set(y, d);
    for (const h of bag.get(y) || []) if (!gor.has(h)) { gor.add(h); kuyruk.push([h, d + 1]); }
  }
}

const satir = [...kume.keys()].map((y) => ({
  yol: y, gelen: gelen.get(y).size, cikan: (bag.get(y) || []).length,
  derinlik: derinlik.has(y) ? derinlik.get(y) : null,
  istisna: ISTISNA[y] || null,
})).sort((a, b) => a.gelen - b.gelen || String(a.yol).localeCompare(b.yol));

const yetim = satir.filter((s) => s.gelen === 0 && !s.istisna);
const ulasilmaz = satir.filter((s) => s.derinlik === null && !s.istisna);
const derin = satir.filter((s) => s.derinlik !== null && s.derinlik > DERINLIK_TAVANI);
const enDerin = Math.max(...satir.filter((s) => s.derinlik !== null).map((s) => s.derinlik));

console.log(`IC BAG DOKUSU · ${kume.size} sayfa · derinlik tavani ${DERINLIK_TAVANI}`);
console.log(`  yetim (kapsam ici)     : ${yetim.length}${yetim.length ? ' -> ' + yetim.slice(0, 6).map((s) => s.yol).join(', ') : ''}`);
console.log(`  ulasilmaz (BFS disi)   : ${ulasilmaz.length}${ulasilmaz.length ? ' -> ' + ulasilmaz.slice(0, 6).map((s) => s.yol).join(', ') : ''}`);
console.log(`  tavani asan derinlik   : ${derin.length}${derin.length ? ' -> ' + derin.slice(0, 6).map((s) => s.yol + '(' + s.derinlik + ')').join(', ') : ''}`);
console.log(`  en derin sayfa         : ${enDerin} tiklama`);
console.log(`  kapsam disi (gerekceli): ${satir.filter((s) => s.istisna).length}`);
console.log('\n  EN AZ BAG ALAN ON SAYFA (kapsam ici):');
for (const s of satir.filter((s) => !s.istisna).slice(0, 10)) console.log(`    ${String(s.gelen).padStart(3)} gelen · derinlik ${s.derinlik} · ${s.yol}`);

fs.writeFileSync(CIKTI, JSON.stringify({
  _: 'yeni/ic-bag-denetimi.cjs — gelen bag / yetim sayfa / ana sayfadan derinlik. H16 KIRIK bag arar, bu betik GELMEYEN bag arar; ikisi ayri sorudur.',
  olcum: new Date().toISOString(), sayfa: kume.size, derinlik_tavani: DERINLIK_TAVANI,
  yetim: yetim.map((s) => s.yol), ulasilmaz: ulasilmaz.map((s) => s.yol),
  tavani_asan: derin.map((s) => ({ yol: s.yol, derinlik: s.derinlik })),
  en_derin: enDerin, istisna: ISTISNA, sayfa_tablosu: satir,
}, null, 1));
const kaldi = yetim.length + ulasilmaz.length + derin.length;
console.log(`\nHUKUM: ${kaldi === 0 ? 'GECTI' : 'KALDI (' + kaldi + ' sayfa)'}\n→ ${CIKTI}`);
process.exit(kaldi === 0 ? 0 : 1);
