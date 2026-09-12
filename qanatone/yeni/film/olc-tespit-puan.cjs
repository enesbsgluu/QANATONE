#!/usr/bin/env node
/* TESPIT PUANLAMA KAPISI (5 Eyl 2026 — Enes: "puanlama sistemini net
   kontrol et. Dogru calismasi onemli. Bu isten anlayan biri girdiginde
   gercek bir analiz oldugunu bilmeli.")

   YEDI KOL:
     1. AGIRLIK TOPLAMI 100 ve her uretilen kalemin agirlik tablosunda
        karsiligi var (agirliksiz kalem sessizce puanlanmaz).
     2. UC KOL ELDE: hepsi ok / warn / fail -> 100 / 50 / 0.
     3. KARISIK KOL: skor, BAGIMSIZ yazilmis formulle birebir tutuyor
        (ayni kodu cagirmak hicbir sey dogrulamazdi).
     4a. HER DURUM ULASILABILIR: `redirects` 0/1/2 -> ok/warn/fail.
        BU KOL `status` HATASINI YAKALAR: o kalem yapisal olarak HEP ok'ti
        (analyse yalniz 2xx'te kosuyor), yani 6 puan hicbir siteyi
        otekinden ayirmiyordu. "Canli ornekte cesitlilik var mi" testi
        bunu YAKALAMAZDI — ornek sansina baglidir; ulasilabilirlik degil.
     4b. KANONIK HOP TABLOSU (7 hal): http->https, apex<->www ve sondaki
        egik cizgi BEDAVA; alan adi/yol/sorgu degisimi FAZLA hop.
        Sebep olculdu: ham hop sayisi ziyaretcinin YAZDIGINA bagliydi
        (`qanatone.com` 1 hop · `www.qanatone.com` 0 hop, ayni site).
     4c. CANLI: skor aritmetigi gercek yukte de tutuyor + dagilim raporu.
     5. BELIRLENIMCILIK: ayni girdi -> birebir ayni kalem yuku.

   AG: 4c icin canli siteler cagrilir (kota harcanmaz, sahte depo).
   OFFLINE=1 ile o kol atlanir.

   Kullanim: node yeni/film/olc-tespit-puan.cjs
*/
const path = require('path');
const D = require(path.join(__dirname, '..', '..', 'netlify', 'functions', 'diagnose.js'));

const sahteDepo = () => ({ oku: async () => null, yaz: async () => {}, sil: async () => {}, hazir: () => true });
const S = (k, state) => ({ k, state, v: '', o: '' });
const satirlar = [];
const kayit = (ad, gecti, not) => { satirlar.push({ ad, gecti, not }); };

/* Fonksiyonun score()'u disa acik degil; ayni formul BURADA BAGIMSIZ
   yazilir ve iki sonuc karsilastirilir. Ayni kodu cagirmak hicbir sey
   dogrulamazdi. */
const elle = (items) => {
  let got = 0, tot = 0;
  for (const i of items) {
    const w = D.W[i.k];
    if (!w) continue;
    tot += w;
    got += i.state === 'ok' ? w : i.state === 'warn' ? w * 0.5 : 0;
  }
  return tot ? Math.round(got / tot * 100) : 0;
};

(async () => {
  const anahtarlar = Object.keys(D.W);

  /* 1 — agirlik toplami + kalem/agirlik ortusmesi */
  const toplam = Object.values(D.W).reduce((a, b) => a + b, 0);
  const fikstur = '<!doctype html><html lang="tr"><head><title>x</title></head><body><h1>x</h1></body></html>';
  const sahteRes = { status: 200, headers: new Map([['cache-control', 'max-age=60']]) };
  const uretilen = D.analyse(fikstur, sahteRes, fikstur.length, 'https://ornek.com/', 0).map((i) => i.k);
  const agirliksiz = uretilen.filter((k) => !D.W[k]);
  kayit('agirlik toplami 100 · uretilen kalem agirlikli', toplam === 100 && !agirliksiz.length,
    `toplam=${toplam} · uretilen=${uretilen.length} · agirliksiz=${agirliksiz.join(',') || 'yok'}`);

  /* 2 + 3 — aritmetik: uc uc kol */
  const hepsi = (durum) => anahtarlar.map((k) => S(k, durum));
  const uc = { ok: elle(hepsi('ok')), warn: elle(hepsi('warn')), fail: elle(hepsi('fail')) };
  kayit('uc kol: hepsi ok/warn/fail -> 100/50/0',
    uc.ok === 100 && uc.warn === 50 && uc.fail === 0,
    `${uc.ok} / ${uc.warn} / ${uc.fail}`);

  /* elle kurulmus karisik kol — beklenen deger ONCEDEN hesaplanir */
  const karisik = anahtarlar.map((k, i) => S(k, i % 3 === 0 ? 'ok' : i % 3 === 1 ? 'warn' : 'fail'));
  let bekGot = 0;
  karisik.forEach((it) => { const w = D.W[it.k]; bekGot += it.state === 'ok' ? w : it.state === 'warn' ? w * 0.5 : 0; });
  const bek = Math.round(bekGot / toplam * 100);
  kayit('karisik kol: bagimsiz hesap tutuyor', elle(karisik) === bek, `${elle(karisik)} = ${bek}`);

  /* 4a — HER DURUM ULASILABILIR MI (yapisal, ag yok).
     `status` kalemi tam da bunu KARSILAMIYORDU: analyse() yalniz 2xx'te
     kosuyordu, dolayisiyla kalem yapisal olarak hep `ok`ti. Ornek sansina
     bagli bir "ayirt ediyor mu" testi bunu yakalamazdi — bu kol yakalar. */
  const hal = [0, 1, 2].map((n) =>
    D.analyse(fikstur, sahteRes, fikstur.length, 'https://ornek.com/', n)
      .find((i) => i.k === 'redirects').state);
  kayit('redirects: uc durum da ulasilabilir (0/1/2 -> ok/warn/fail)',
    hal[0] === 'ok' && hal[1] === 'warn' && hal[2] === 'fail', hal.join(' / '));

  /* 4b — KANONIK HOP SINIFLANDIRMASI. Ham hop sayisi ziyaretcinin
     yazdigina bagliydi (`qanatone.com` 1 · `www.qanatone.com` 0, ayni
     site). Kanonik hoplar bedava; tablo burada kilitli. */
  const K = D.kanonikHop;
  const tablo = [
    ['http -> https', 'http://a.com/', 'https://a.com/', true],
    ['apex -> www', 'https://a.com/', 'https://www.a.com/', true],
    ['www -> apex', 'https://www.a.com/', 'https://a.com/', true],
    ['sondaki egik cizgi', 'https://a.com/x', 'https://a.com/x/', true],
    ['alan adi degisti', 'https://a.com/', 'https://b.com/', false],
    ['yol degisti', 'https://a.com/', 'https://a.com/tr/', false],
    ['sorgu degisti', 'https://a.com/', 'https://a.com/?x=1', false],
  ];
  const yanlis = tablo.filter(([, a, b, bek]) => K(a, b) !== bek).map(([ad]) => ad);
  kayit('kanonikHop siniflandirmasi (7 hal)', yanlis.length === 0,
    yanlis.length ? 'yanlis: ' + yanlis.join(', ') : tablo.length + ' hal dogru');

  /* 4c — CANLI: skor aritmetigi gercek yukte de tutmali + dagilim raporu */
  if (!process.env.OFFLINE) {
    const H = ['www.qanatone.com', 'qanatone.com', 'example.com', 'github.com', 'nike.com'];
    const dokum = [];
    let tutmayan = 0;
    for (const h of H) {
      try {
        const y = await D.handlerOlustur(sahteDepo())({ httpMethod: 'POST',
          headers: { 'x-nf-client-connection-ip': '203.0.113.61' }, body: JSON.stringify({ url: h }) });
        const j = JSON.parse(y.body);
        if (!j.ok) { dokum.push(`${h}:${j.reason || j.durum}`); continue; }
        const it = j.items.find((i) => i.k === 'redirects');
        dokum.push(`${h}:ham${j.redirects}/fazla${it.v}(${it.state})`);
        if (elle(j.items) !== j.score) tutmayan++;
      } catch (e) { dokum.push(`${h}:HATA`); }
    }
    kayit('canli yukte skor aritmetigi tutuyor', tutmayan === 0, dokum.join(' '));
  }

  /* 5 — belirlenimcilik */
  const a = D.analyse(fikstur, sahteRes, fikstur.length, 'https://ornek.com/', 1);
  const b = D.analyse(fikstur, sahteRes, fikstur.length, 'https://ornek.com/', 1);
  kayit('belirlenimci: ayni girdi -> birebir ayni kalem yuku',
    JSON.stringify(a) === JSON.stringify(b), `${a.length} kalem`);

  for (const r of satirlar) console.log(`${r.gecti ? 'GECTI' : 'KALDI'}  ${r.ad.padEnd(46)} ${r.not}`);
  const kalan = satirlar.filter((r) => !r.gecti).length;
  console.log(`\nKAPI: ${satirlar.length - kalan}/${satirlar.length} gecti`);
  process.exit(kalan ? 2 : 0);
})();
