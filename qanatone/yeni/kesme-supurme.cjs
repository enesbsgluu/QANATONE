#!/usr/bin/env node
/* KESME · ADRES SUPURMESI.
   `kesme-url-kapsami.cjs` KAGIT UZERINDE bakar: kayitli eski adresin dist'te
   karsiligi var mi. Bu betik onu YETERLI SAYMAZ ve adresi GERCEKTEN ISTER —
   yonlendirme sirasi, sondaki egik cizgi, dizin sayfasi cozumu ancak istekte
   gorunur. Uc soru AYRI AYRI sorulur; biri olmadan otekiler yanlis yesil verir:

     1) DURUM   — 200 mu, 404 mu, yonlendirme mi
     2) ICERIK  — donen sayfa BEKLENEN sayfa mi (canonical'inden okunur)
                  Bu olmadan "404 sifir" yalandir: her adres ana sayfaya
                  dusseydi de 404 sifir cikardi.
     3) KONAK   — donen sayfanin canonical'i SUNULAN KONAKLA ayni mi
                  (Enes, 6 Eyl 2026). Apex'ten gelen istek www'ye dusuyorsa
                  dustugu sayfanin canonical'i da www olmali. Yoksa Search
                  Console "alternate page with proper canonical" verir ve
                  YANLIS TARAF indekslenir. Birincil alan adi www oldugu
                  icin bu kontrol kesmenin kapisidir, susu degil.

   Kullanim:
     node yeni/kesme-supurme.cjs                  yerel (once: node yerel-sun.cjs)
     CANLI=1 node yeni/kesme-supurme.cjs          canli: apex VE www ayri ayri
   Yerelde sunulan konak 127.0.0.1 oldugu icin 3. soru "canonical konagi
   BIRINCIL konakla ayni mi" diye sorulur; canlida gercek konakla. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const KOK = path.join(__dirname, '..');
const CANLI = process.env.CANLI === '1';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
/* BIRINCIL KONAK tek kaynaktan okunur (yeni/src/icerik.ts KOK) — burada
   ikinci kez elle yazilsaydi konak degistiginde bekci eskirdi. */
const BIRINCIL = (fs.readFileSync(path.join(KOK, 'yeni', 'src', 'icerik.ts'), 'utf8')
  .match(/export const KOK = '([^']+)'/) || [])[1];
if (!BIRINCIL) { console.error('icerik.ts icinde KOK bulunamadi'); process.exit(2); }
const BIRINCIL_KONAK = new URL(BIRINCIL).host;
const APEX_KONAK = BIRINCIL_KONAK.replace(/^www\./, '');

const kapsam = JSON.parse(fs.readFileSync(path.join(__dirname, 'kesme-url-kapsami.json'), 'utf8'));
const ADRESLER = kapsam.eski_adres;
/* /shell SAYFA DEGIL — Enes, 6 Eyl 2026: "umursanmiyor". Listede kalir ki
   sayilar 60 uzerinden okunsun, ama hukum disinda tutulur. */
const HUKUM_DISI = new Set(['/shell']);

/* Yonlendirmeleri ELDE izleriz: son URL'i bilmek sartimiz, cunku 3. soru
   "SUNULAN konak" diye soruyor — kutuphaneye birakirsak o bilgi kaybolur. */
const iste = (baslangic, kalan = 6) => new Promise((coz) => {
  const u = new URL(baslangic);
  const mod = u.protocol === 'https:' ? https : http;
  mod.get(u, { headers: { 'user-agent': 'kesme-supurme' } }, (r) => {
    if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && kalan > 0) {
      r.resume();
      const hedef = new URL(r.headers.location, u).toString();
      return coz(iste(hedef, kalan - 1).then((s) => ({ ...s, zincir: [u.toString(), ...s.zincir] })));
    }
    let g = '';
    r.on('data', (d) => (g += d));
    r.on('end', () => coz({ durum: r.statusCode, son: u.toString(), govde: g, zincir: [u.toString()] }));
  }).on('error', (e) => coz({ durum: 0, son: u.toString(), govde: '', zincir: [u.toString()], hata: e.message }));
});

const canonicalOf = (html) => (html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/) || [])[1] || '';

/* Beklenen sayfa: adresin dist'teki karsiligi; kiyas YOL uzerinden yapilir
   (konak zaten 3. soruda ayrica denetleniyor). */
const beklenenYol = (yol) => {
  const temiz = yol.replace(/\/$/, '') || '/';
  for (const aday of [path.join(KOK, 'dist', temiz, 'index.html'), path.join(KOK, 'dist', temiz + '.html')]) {
    if (fs.existsSync(aday)) {
      const c = canonicalOf(fs.readFileSync(aday, 'utf8'));
      return c ? new URL(c).pathname.replace(/\/$/, '') || '/' : null;
    }
  }
  return null;
};

(async () => {
  const kokler = CANLI ? [`https://${APEX_KONAK}`, `https://${BIRINCIL_KONAK}`] : [SUNUCU];
  const satir = [];
  let kusur = 0, atlanan = 0;
  for (const kok of kokler) {
    for (const yol of ADRESLER) {
      const r = await iste(new URL(yol, kok).toString());
      const bek = beklenenYol(yol);
      const don = canonicalOf(r.govde);
      const donYol = don ? (new URL(don).pathname.replace(/\/$/, '') || '/') : '';
      const donKonak = don ? new URL(don).host : '';
      const sunulanKonak = new URL(r.son).host;
      const disi = HUKUM_DISI.has(yol);
      let hal = 'ok', not = '';
      if (disi) { hal = 'ATLANDI'; not = 'hükümsüz (Enes: /shell sayfa değil)'; atlanan++; }
      else if (r.durum !== 200) { hal = 'DURUM'; not = 'durum ' + r.durum + (r.hata ? ' · ' + r.hata : ''); }
      else if (!bek) { hal = 'ICERIK'; not = 'dist karşılığı yok'; }
      else if (donYol !== bek) { hal = 'ICERIK'; not = 'yanlış sayfa: ' + donYol + ' ≠ ' + bek; }
      /* 3. SORU — canonical konağı. Yerelde sunulan konak 127.0.0.1 olduğu
         için birincil konakla; canlıda gerçekten sunulan konakla kıyaslanır. */
      else if (donKonak !== (CANLI ? sunulanKonak : BIRINCIL_KONAK)) {
        hal = 'KONAK';
        not = 'canonical ' + donKonak + ' ≠ sunulan ' + (CANLI ? sunulanKonak : BIRINCIL_KONAK);
      }
      if (hal !== 'ok' && hal !== 'ATLANDI') kusur++;
      satir.push({ kok, yol, durum: r.durum, hal, not, canonical: don, son: r.son, atlama: r.zincir.length - 1 });
    }
  }
  for (const s of satir) if (s.hal !== 'ok' && s.hal !== 'ATLANDI') console.log(`  ${s.hal.padEnd(8)} ${s.kok}${s.yol}`.padEnd(60) + ' ' + s.not);
  const ok = satir.filter((s) => s.hal === 'ok').length;
  const sayim = { DURUM: 0, ICERIK: 0, KONAK: 0 };
  for (const s of satir) if (sayim[s.hal] !== undefined) sayim[s.hal]++;
  console.log(`\n  konak ${kokler.length} × adres ${ADRESLER.length} = ${satir.length} istek`);
  console.log(`  ok ${ok} · durum kusuru ${sayim.DURUM} · içerik kusuru ${sayim.ICERIK} · konak kusuru ${sayim.KONAK} · hüküm dışı ${atlanan}`);
  console.log(`  birincil konak: ${BIRINCIL_KONAK} (kaynak: yeni/src/icerik.ts KOK)`);
  const cikti = path.join(__dirname, 'kesme-supurme' + (CANLI ? '-canli' : '') + '.json');
  fs.writeFileSync(cikti, JSON.stringify({
    _: 'KESME adres supurmesi — durum, icerik VE canonical konagi birlikte. Ucu de olmadan "404 sifir" yanlis yesildir.',
    canli: CANLI, kokler, birincil_konak: BIRINCIL_KONAK, istek: satir.length, ok, sayim, hukum_disi: atlanan, satir,
  }, null, 1));
  console.log(`\nHUKUM: ${kusur === 0 ? 'GECTI' : 'KALDI'}\n→ ${cikti}`);
  process.exit(kusur === 0 ? 0 : 1);
})();
