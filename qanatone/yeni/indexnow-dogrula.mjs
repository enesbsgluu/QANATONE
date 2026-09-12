/* INDEXNOW DOGRULAMA — bildirimin HTTP yanitini BURADAN gorunur kilar.
   7 Eyl 2026, Enes: "IndexNow bildiriminin HTTP yaniti yalniz Netlify
   derleme kaydinda, buradan goremiyorum."

   NEDEN AYRI ARAC: `indexnow.mjs` derleme kancasidir, yalniz derleme
   sirasinda ve yalniz `CONTEXT=production` iken bildirir. Yaniti Netlify'in
   log ekranina yazar; makineden okunamaz, Netlify CLI de depoya bagli
   degil. Bu arac ayni protokolu ELDEN kosar ve yaniti YAZAR.

   VARSAYILAN KURU. Gercek bildirim dis bir servise POST'tur, yan etkisi
   vardir (arama motorlari tarama kuyruguna girer) — bu yuzden acik istek
   olmadan atilmaz: `GONDER=1` verilmedikce hicbir POST yapilmaz, ne
   gonderilecegi yazilir ve cikilir.

   KURU MODDA DA GERCEKTEN OLCULENLER (POST'suz, hepsi CANLIDAN):
   · sitemap 200 mu, kac <loc> var
   · anahtar dosyasi 200 mu ve icerigi anahtarla BIREBIR mi
     (IndexNow dogrulamasi tam olarak buna bakar; dosya varsa ama icerik
      farkliysa bildirim 403 doner ve sebebi burada gorunur)
   · anahtar dosyasi sitemap'te GECMEMELI (T6 bekcisinin ayagi)
   · bildirilecek adreslerin hepsi ayni konakta mi (IndexNow sarti)

   Kosum:
     node yeni/indexnow-dogrula.mjs            # kuru, hicbir POST yok
     GONDER=1 node yeni/indexnow-dogrula.mjs   # gercek bildirim + HTTP yaniti
   ENV: KOK (varsayilan https://www.qanatone.com) · GONDER */
import { ANAHTAR } from './indexnow.mjs';

const KOK = (process.env.KOK || 'https://www.qanatone.com').replace(/\/$/, '');
const GONDER = process.env.GONDER === '1';
const UC = 'https://api.indexnow.org/IndexNow';

const yaz = (im, s) => console.log(`  ${im} ${s}`);

async function getir(u) {
  try {
    const r = await fetch(u, { redirect: 'follow' });
    return { kod: r.status, govde: await r.text() };
  } catch (e) { return { kod: 0, hata: (e && e.message) || 'bilinmeyen', govde: '' }; }
}

(async () => {
  console.log(`INDEXNOW DOGRULAMA · ${KOK} · ${GONDER ? 'GERCEK BILDIRIM' : 'KURU (POST yok)'}\n`);
  let kusur = 0;

  const sm = await getir(`${KOK}/sitemap.xml`);
  if (sm.kod !== 200) { yaz('!!', `sitemap.xml HTTP ${sm.kod}${sm.hata ? ' — ' + sm.hata : ''}`); kusur++; }
  else yaz('ok', `sitemap.xml 200`);
  const urls = [...sm.govde.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter(Boolean);
  if (!urls.length) { yaz('!!', 'sitemap\'ten adres cikmadi — bildirilecek bir sey yok'); kusur++; }
  else yaz('ok', `${urls.length} adres`);

  /* Anahtar dosyasi: IndexNow dogrulamasinin TAMAMI budur. */
  const ad = `${ANAHTAR}.txt`;
  const an = await getir(`${KOK}/${ad}`);
  if (an.kod !== 200) { yaz('!!', `${ad} HTTP ${an.kod} — bildirim 403 doner`); kusur++; }
  else if (an.govde.trim() !== ANAHTAR) {
    yaz('!!', `${ad} icerigi anahtarla ayni DEGIL (govde: ${JSON.stringify(an.govde.slice(0, 40))}) — bildirim 403 doner`); kusur++;
  } else yaz('ok', `${ad} 200 ve icerik anahtarla birebir`);

  if (urls.some((u) => u.includes(ad))) { yaz('!!', 'anahtar dosyasi sitemap\'te — orada olmamali (T6)'); kusur++; }
  else yaz('ok', 'anahtar dosyasi sitemap disinda');

  const konaklar = [...new Set(urls.map((u) => { try { return new URL(u).host; } catch { return '?'; } }))];
  if (konaklar.length > 1) { yaz('!!', `adresler tek konakta degil: ${konaklar.join(', ')} — IndexNow reddeder`); kusur++; }
  else if (urls.length) yaz('ok', `tek konak: ${konaklar[0]}`);

  if (!GONDER) {
    console.log(`\nKURU: POST atilmadi. Gonderilecek olan — host ${konaklar[0] || '?'} · ${urls.length} adres`
      + `\n  keyLocation ${KOK}/${ad}`
      + `\n  Gercek bildirim icin: GONDER=1 node yeni/indexnow-dogrula.mjs`);
    process.exit(kusur ? 2 : 0);
  }

  if (kusur) { console.log(`\n${kusur} kusur var — bildirim ATILMADI (403 almak icin gonderilmez).`); process.exit(2); }

  const host = konaklar[0];
  try {
    const r = await fetch(UC, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: ANAHTAR, keyLocation: `${KOK}/${ad}`, urlList: urls }),
    });
    const govde = await r.text();
    /* 200 alindi · 202 alindi, anahtar dogrulanacak. Obur kodlar sebebiyle
       birlikte yazilir — sessizce yutmak bu turun kapattigi seyin ta kendisi. */
    const ok = r.status === 200 || r.status === 202;
    console.log(`\n${ok ? 'GECTI' : 'KALDI'} — HTTP ${r.status}${govde ? ' · govde: ' + govde.slice(0, 200) : ' · govde bos'}`);
    console.log(`  ${urls.length} adres bildirildi (${host})`);
    process.exit(ok ? 0 : 2);
  } catch (e) {
    console.log(`\nKALDI — istek atilamadi: ${(e && e.message) || e}`);
    process.exit(2);
  }
})();
