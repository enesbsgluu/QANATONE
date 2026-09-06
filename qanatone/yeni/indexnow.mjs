/* INDEXNOW — KESME-PLANI adim 9 / 2g (Enes, 6 Eyl 2026: "IndexNow'dan
   devam et").

   NE ISE YARAR: Bing, Yandex, Naver, Seznam ve Yep bu protokolu okuyor;
   yayindan sonra "su adresler degisti" diye haber verilir ve tarayicinin
   siteye ugramasi beklenmez. GOOGLE KATILMIYOR — Google tarafi sitemap +
   ic linkleme + Search Console ile ilerler, anlik indeksleme yolu orada
   kimsede yok. ChatGPT buyuk olcude Bing indeksini kullandigi icin bu
   ayni zamanda GEO'ya (ajan gorunurlugu) dokunuyor.

   ADRESLER CIKTIDAN TURER: kaynak `dist/sitemap.xml`. Ayri bir liste
   tutsaydik tazeligini ayri bir kuralla korumak zorunda kalirdik (L1'in
   dersi); sitemap zaten R8 ile canonical setine kilitli, yani buradaki
   kume "sayfalarin gercek adresleri" olmus oluyor.

   ANAHTAR NEDEN DEPODA. IndexNow anahtari GIZLI DEGIL: dogrulama biciminin
   kendisi anahtari `https://alan-adi/<anahtar>.txt` adresinde HERKESE ACIK
   yayinlamaktir. Eski kok build.js onu yalniz `INDEXNOW_KEY` ortam
   degiskeninden okuyordu ve degisken tanimsizsa akis SESSIZCE hicbir sey
   yapmiyordu — "IndexNow'i tasidik" denip yillarca hic bildirim
   gitmeyebilirdi. Burada varsayilan anahtar depoda duruyor: ozellik ya
   calisir ya da gorunur bicimde yoktur. Ortam degiskeni yalnizca
   DONDURME (rotasyon) icin: tanimliysa o kazanir.

   URETIM DISI DERLEMEDE BILDIRIM ATILMAZ (`CONTEXT !== 'production'`) —
   ama anahtar dosyasi HER derlemede yazilir, cunku dosyanin varligi
   yayinda dogrulamanin sarti ve onu ancak yayin derlemesinde yazmak
   "yerelde gecti, canlida yok" farkini dogurur. */
import fs from 'node:fs';
import path from 'node:path';

export const ANAHTAR = process.env.INDEXNOW_KEY || '3eb7c9c7e1160a53431ad6b601ad3438';
const UC = 'https://api.indexnow.org/IndexNow';

/** dist/sitemap.xml icindeki <loc> adresleri (cikti = tek kaynak) */
export function adresler(kok) {
  const dosya = path.join(kok, 'sitemap.xml');
  if (!fs.existsSync(dosya)) return [];
  const xml = fs.readFileSync(dosya, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter(Boolean);
}

/** Anahtar dogrulama dosyasini yazar, adresleri dondurur. */
export function anahtarYaz(kok) {
  fs.writeFileSync(path.join(kok, `${ANAHTAR}.txt`), ANAHTAR + '\n');
  return `${ANAHTAR}.txt`;
}

export async function bildir(kok, logger) {
  const dosya = anahtarYaz(kok);
  const urls = adresler(kok);
  if (!urls.length) {
    logger.warn(`IndexNow: sitemap'ten adres cikmadi — bildirim atlandi (${dosya} yazildi)`);
    return { dosya, adet: 0, durum: 'adres yok' };
  }
  if (process.env.CONTEXT !== 'production') {
    logger.info(`IndexNow: ${dosya} yazildi · ${urls.length} adres hazir · uretim disi derleme, bildirim atilmadi`);
    return { dosya, adet: urls.length, durum: 'uretim disi' };
  }
  const host = new URL(urls[0]).host;
  try {
    const r = await fetch(UC, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: ANAHTAR,
        keyLocation: `https://${host}/${dosya}`, urlList: urls }),
    });
    /* 200 = alindi · 202 = alindi, anahtar dogrulanacak. Ikisi de basari;
       obur kodlar (400/403/422/429) sessizce yutulmaz, loga adiyla gecer. */
    const ok = r.status === 200 || r.status === 202;
    logger[ok ? 'info' : 'warn'](`IndexNow: ${urls.length} adres bildirildi (${host}) — HTTP ${r.status}${ok ? '' : ' — BASARISIZ'}`);
    return { dosya, adet: urls.length, durum: 'HTTP ' + r.status };
  } catch (e) {
    logger.warn('IndexNow: bildirilemedi — ' + (e && e.message));
    return { dosya, adet: urls.length, durum: 'hata' };
  }
}
