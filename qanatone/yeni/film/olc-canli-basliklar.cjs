#!/usr/bin/env node
/* CANLI BASLIK SUPURMESI (5 Eyl 2026, Enes: "hizmetlerdeki gitti fakat bu
   seferde diger sayfalarda ayni dosya iniyor").

   ONCEKI OLCUMUN KAPSAM KUSURU: yalniz `/` ve `/hizmetler/seo/` olculmustu.
   "Diger sayfalar" ifadesi kapsami degistiriyor — BUTUN adresler olculur.

   Her adres UC istek biciminde denenir, cunku indirme kararini veren sey
   yanitin KENDISI ve Chrome her gezinmede ayni istegi gondermiyor:
     A) gezinme   — Android Chrome'un gercek Accept'i (signed-exchange dahil)
     B) prefetch  — `Sec-Purpose: prefetch` (Astro prefetchAll/viewport acik)
     C) slashsiz  — sitenin kendi baglari slashsiz; 301 hoplamasi dahil izlenir

   KIRMIZI OLCUT (indirmeye goturen yanit sekilleri):
     content-type text/html DEGIL · content-disposition VAR · durum 200/301 disi
     · yonlendirme zinciri 1'den uzun · son adres beklenenden farkli

   Kullanim: node yeni/film/olc-canli-basliklar.cjs
   Cevre   : KONAK=https://www.qanatone.com · ES=8 (esazamanli istek)
*/
const fs = require('fs');
const path = require('path');
const https = require('https');

const KONAK = process.env.KONAK || 'https://www.qanatone.com';
const ES = Number(process.env.ES || 8);
const DIST = path.join(__dirname, '..', '..', 'dist');
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-canli-basliklar.json');

const UA_MOBIL = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const ACCEPT_GEZINME = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';

/* dist'ten butun sayfa adreslerini topla (index.html -> dizin yolu) */
const yollar = [];
(function tara(d, on) {
  for (const ad of fs.readdirSync(d, { withFileTypes: true })) {
    if (ad.isDirectory()) tara(path.join(d, ad.name), on + '/' + ad.name);
    else if (ad.name === 'index.html') yollar.push((on || '') + '/');
  }
})(DIST, '');
yollar.sort();

const iste = (url, ek) => new Promise((coz) => {
  const u = new URL(url);
  const r = https.request({
    hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
    headers: { 'user-agent': UA_MOBIL, accept: ACCEPT_GEZINME,
      'accept-encoding': 'gzip, deflate, br', ...ek },
  }, (yanit) => {
    yanit.resume();                       /* govdeyi at, baslik yeter */
    yanit.on('end', () => coz({
      durum: yanit.statusCode,
      tur: yanit.headers['content-type'] || null,
      disposition: yanit.headers['content-disposition'] || null,
      konum: yanit.headers.location || null,
      nosniff: yanit.headers['x-content-type-options'] || null,
      kodlama: yanit.headers['content-encoding'] || null,
      vary: yanit.headers.vary || null,
      linkBoy: (yanit.headers.link || '').length,
      basliksayisi: Object.keys(yanit.headers).length,
    }));
  });
  r.on('error', (e) => coz({ hata: e.message }));
  r.setTimeout(20000, () => { r.destroy(); coz({ hata: 'zaman asimi' }); });
  r.end();
});

/* yonlendirmeyi elle izle: KAC hop oldugunu ve her hopun turunu gorelim */
async function zincir(url, ek) {
  const adimlar = [];
  let su = url;
  for (let i = 0; i < 5; i++) {
    const y = await iste(su, ek);
    adimlar.push({ adres: su, ...y });
    if (y.hata || !y.konum) break;
    su = new URL(y.konum, su).toString();
  }
  return adimlar;
}

const kirmizi = (adimlar) => {
  const son = adimlar[adimlar.length - 1];
  if (!son || son.hata) return 'istek hatasi';
  if (son.durum !== 200) return 'son durum ' + son.durum;
  if (!/^text\/html/.test(son.tur || '')) return 'content-type ' + son.tur;
  if (son.disposition) return 'content-disposition ' + son.disposition;
  if (adimlar.length > 2) return adimlar.length - 1 + ' hop';
  return null;
};

(async () => {
  const kayit = [];
  let sira = 0;
  const isci = async () => {
    while (sira < yollar.length) {
      const yol = yollar[sira++];
      const slashsiz = yol.length > 1 ? yol.replace(/\/$/, '') : yol;
      const [gez, pre, sls] = await Promise.all([
        zincir(KONAK + yol, {}),
        zincir(KONAK + yol, { 'sec-purpose': 'prefetch', purpose: 'prefetch' }),
        zincir(KONAK + slashsiz, {}),
      ]);
      const satir = { yol, gezinme: kirmizi(gez), prefetch: kirmizi(pre), slashsiz: kirmizi(sls),
        hop: { gezinme: gez.length, prefetch: pre.length, slashsiz: sls.length },
        son: gez[gez.length - 1] };
      kayit.push(satir);
      if (satir.gezinme || satir.prefetch || satir.slashsiz) {
        console.log(`  !! ${yol}  gezinme=${satir.gezinme || 'ok'} · prefetch=${satir.prefetch || 'ok'} · slashsiz=${satir.slashsiz || 'ok'}`);
      }
    }
  };
  await Promise.all(Array.from({ length: ES }, isci));
  kayit.sort((a, b) => a.yol.localeCompare(b.yol));

  const kirmiziSatir = kayit.filter((k) => k.gezinme || k.prefetch || k.slashsiz);
  const hopDagilim = {};
  for (const k of kayit) hopDagilim['slashsiz:' + k.hop.slashsiz] = (hopDagilim['slashsiz:' + k.hop.slashsiz] || 0) + 1;
  const rapor = { zaman: new Date().toISOString(), konak: KONAK, adres: kayit.length,
    kirmizi: kirmiziSatir.length, hopDagilim, kayit };
  fs.writeFileSync(CIKTI, JSON.stringify(rapor, null, 1));
  console.log(`\n${kayit.length} adres · kirmizi ${kirmiziSatir.length}`);
  console.log('slashsiz hop dagilimi:', JSON.stringify(hopDagilim));
  console.log('kayit:', CIKTI);
  process.exit(kirmiziSatir.length ? 2 : 0);
})();
