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
import crypto from 'node:crypto';

/* ANAHTAR DONDURULDU (7 Eyl 2026). Eski anahtar 3eb7c9c7... YANDI:
   api.indexnow.org onu KALICI olarak reddediyordu —
   HTTP 403 {"errorCode":"UserForbiddedToAccessSite"}.
   Olcumle ayristirildi: ayni adrese SAHTE anahtarla istek 202 doner,
   gercek anahtarla 403. Yani sorun dosyanin varligi ya da icerigi degil
   (dosya 200 donuyordu, icerik birebirdi, her UA'ya aciktir) — IndexNow
   o anahtari daha once DOGRULAYAMAMIS ve reddi onbellege almisti.
   Sebep asagidaki "BILDIRIM ARTIK ERKEN ATILMIYOR" blogunda. */
export const ANAHTAR = process.env.INDEXNOW_KEY || 'a8c8fd00519f2044c944c2400bc35665';
const UC = 'https://api.indexnow.org/IndexNow';
/* IndexNow'in istek basi adres siniri. Uzerine cikan liste dilimlenir. */
const ISTEK_TAVANI = 10000;
/* Onceki dagitimin durum dosyasi CANLIDAN okunur; yeni derlemeninki
   dist'e yazilir. Ad `.json` ama sitemap'e girmez, HTML degildir. */
export const DURUM_DOSYASI = 'indexnow-durum.json';

/** dist/sitemap.xml icindeki <loc> adresleri (cikti = tek kaynak) */
export function adresler(kok) {
  const dosya = path.join(kok, 'sitemap.xml');
  if (!fs.existsSync(dosya)) return [];
  const xml = fs.readFileSync(dosya, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter(Boolean);
}

/* ADRES -> ICERIK OZETI (9 Eyl 2026).
   NEDEN: bildirim ONCEDEN her deploy'da TUM adresleri yolluyordu — hic
   degismemis 20.046 sayfayi "degisti" diye bildirmek hem anlamsiz hem
   IndexNow'in istek basi 10.000 sinirina carpacakti (ICERIK-MIMARISI-
   OLCUM.md BULGU 5).
   NEDEN sitemap `lastmod` DEGIL: o alan IKI YONDEN DE yalan soyluyor —
   statik sayfalarin lastmod'u derleme gunu (her deploy "degisti"),
   yazilarinki kendi tarihi (duzeltilse bile "degismedi"). Olcut bu
   yuzden SAYFANIN KENDI BAYTI.
   DAYANAK OLCULDU: ayni icerikten iki derleme, 74 sayfanin 74'unde
   BIREBIR ayni ozet (0 fark). Derleme kararli olmasaydi bu tasarim
   calismazdi ve her deploy yine hepsini bildirirdi. */
function ozet(govde) {
  return crypto.createHash('sha1').update(govde).digest('hex').slice(0, 16);
}

/** Sitemap'teki her adresin dist'teki HTML dosyasindan ozeti. */
export function durumCikar(kok, urls) {
  const d = {};
  for (const u of urls) {
    let yol;
    try { yol = new URL(u).pathname; } catch (e) { continue; }
    const aday = path.join(kok, yol.replace(/^\//, ''), 'index.html');
    const aday2 = path.join(kok, yol.replace(/^\//, '') || 'index.html');
    const dosya = fs.existsSync(aday) ? aday : (fs.existsSync(aday2) ? aday2 : null);
    if (dosya) d[u] = ozet(fs.readFileSync(dosya));
  }
  return d;
}

/** Durum dosyasini dist'e yazar ve ozetleri dondurur.
    HER DERLEMEDE yazilir — uretim disi kosumda bile. SEBEP: dosyanin
    kendisi CIKTININ PARCASI; bir sonraki dagitim onu CANLIDAN okuyacak.
    Once bildirim govdesinin icinde yaziliyordu ve uretim disi dallanma
    ondan ONCE `return` ediyordu — yani dosya dist'e hic girmiyordu ve
    ilk uretim dagitiminda da canlida bulunamayacakti. Olculdu: yerel
    derlemede dist/indexnow-durum.json YOKTU. */
export function durumYaz(kok, urls) {
  const ozetler = durumCikar(kok, urls);
  fs.writeFileSync(path.join(kok, DURUM_DOSYASI),
    JSON.stringify({ _: 'IndexNow durum kaydi: adres -> sayfa iceriginin sha1 ozeti. '
      + 'Bir sonraki dagitim bunu CANLIDAN okuyup fark alir ve yalniz degisen adresleri bildirir. '
      + 'Elle duzenlenmez; her derlemede yeniden uretilir.',
      uretildi: new Date().toISOString(), ozetler }, null, 1));
  return ozetler;
}

/** Onceki dagitimin durum dosyasi (CANLIDAN). Yoksa null. */
export async function oncekiDurum(host) {
  try {
    const r = await fetch(`https://${host}/${DURUM_DOSYASI}`, { redirect: 'follow' });
    if (r.status !== 200) return null;
    const j = await r.json();
    return (j && typeof j === 'object' && j.ozetler) ? j.ozetler : null;
  } catch (e) { return null; }
}

/** Bildirilecek adresler: YENI + OZETI DEGISEN. Onceki durum yoksa hepsi. */
export function fark(simdi, onceki) {
  if (!onceki) return { liste: Object.keys(simdi), sebep: 'ilk kayit — hepsi' };
  const liste = Object.keys(simdi).filter((u) => onceki[u] !== simdi[u]);
  const yeni = liste.filter((u) => !(u in onceki)).length;
  return { liste, sebep: `${yeni} yeni · ${liste.length - yeni} degisen · ${Object.keys(simdi).length - liste.length} ayni` };
}

/** Anahtar dogrulama dosyasini yazar, adresleri dondurur. */
export function anahtarYaz(kok) {
  /* Sonda satir sonu YOK. Spec "dosya anahtari icerir" der ve cogu
     dogrulayici kirpar; kirpmayan biri icin bu ucuz bir sigorta.
     OLCULMEDI — 403'un sebebi oldugu iddia EDILMIYOR (sebep zamanlamaydi,
     asagida), ama newline'i atmanin bir maliyeti de yok. */
  fs.writeFileSync(path.join(kok, `${ANAHTAR}.txt`), ANAHTAR);
  return `${ANAHTAR}.txt`;
}

/** Anahtar dosyasi CANLIDA yayinda mi ve icerigi birebir mi. */
export async function anahtarYayindaMi(host, dosya) {
  try {
    const r = await fetch(`https://${host}/${dosya}`, { redirect: 'follow' });
    if (r.status !== 200) return { tamam: false, sebep: `HTTP ${r.status}` };
    const govde = (await r.text()).trim();
    if (govde !== ANAHTAR) return { tamam: false, sebep: 'icerik anahtarla ayni degil' };
    return { tamam: true };
  } catch (e) { return { tamam: false, sebep: (e && e.message) || 'istek atilamadi' }; }
}

export async function bildir(kok, logger) {
  const dosya = anahtarYaz(kok);
  const urls = adresler(kok);
  if (!urls.length) {
    logger.warn(`IndexNow: sitemap'ten adres cikmadi — bildirim atlandi (${dosya} yazildi)`);
    return { dosya, adet: 0, durum: 'adres yok' };
  }
  if (process.env.CONTEXT !== 'production') {
    const o = durumYaz(kok, urls);
    logger.info(`IndexNow: ${dosya} + ${DURUM_DOSYASI} yazildi · ${Object.keys(o).length} adres ozetlendi`
      + ' · uretim disi derleme, bildirim atilmadi');
    return { dosya, adet: urls.length, durum: 'uretim disi' };
  }
  const host = new URL(urls[0]).host;

  /* BILDIRIM ARTIK ERKEN ATILMIYOR (7 Eyl 2026) — bu kanca
     `astro:build:done`de kosar, yani Astro derlemeyi BITIRDIGINDE. Netlify
     o an dist'i HENUZ YAYINA ALMAMISTIR: site hala ONCEKI surumdedir.
     Ilk IndexNow deploy'unda anahtar dosyasi bu yuzden canlida yoktu,
     dogrulama basarisiz oldu ve anahtar KALICI 403'e dustu — ve bunu
     hicbir yer kirmizi yakmadi, cunku yanit yalniz derleme kaydinda bir
     `warn` satiriydi.
     Kapi: anahtar dosyasi CANLIDA 200 ve icerigi birebir degilse bildirim
     ATILMAZ. Ilk deploy bildirimi atlar (dosyayi yayina koyar), bir
     sonraki deploy bildirir — akis kendi kendini toparlar ve anahtar bir
     daha "dogrulanamadi" diye yanmaz. */
  const yayin = await anahtarYayindaMi(host, dosya);
  if (!yayin.tamam) {
    durumYaz(kok, urls);
    logger.warn(`IndexNow: ${dosya} canlida hazir degil (${yayin.sebep}) — bildirim ATLANDI.`
      + ' Bu derlemenin ciktisi yayina alininca bir sonraki deploy bildirir.'
      + ' (Erken bildirim anahtari kalici 403 UserForbiddedToAccessSite yapiyor.)');
    return { dosya, adet: urls.length, durum: 'anahtar yayinda degil: ' + yayin.sebep };
  }

  const onceki = await oncekiDurum(host);
  const { liste, sebep } = fark(durumYaz(kok, urls), onceki);

  if (!liste.length) {
    logger.info(`IndexNow: degisen adres yok (${sebep}) — bildirim atlanmadi, GEREKMEDI. ${DURUM_DOSYASI} tazelendi.`);
    return { dosya, adet: 0, durum: 'degisen yok' };
  }

  /* Istek basi tavan (10.000). Ustundeki liste dilimlenip sirayla
     yollanir — tek istekte gondermek 400 dondururdu. */
  const dilimler = [];
  for (let i = 0; i < liste.length; i += ISTEK_TAVANI) dilimler.push(liste.slice(i, i + ISTEK_TAVANI));

  const kodlar = [];
  for (const dilim of dilimler) {
    try {
      const r = await fetch(UC, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key: ANAHTAR,
          keyLocation: `https://${host}/${dosya}`, urlList: dilim }),
      });
      /* 200 = alindi · 202 = alindi, anahtar dogrulanacak. Ikisi de basari;
         obur kodlar (400/403/422/429) sessizce yutulmaz, loga adiyla gecer. */
      const ok = r.status === 200 || r.status === 202;
      kodlar.push(r.status);
      logger[ok ? 'info' : 'warn'](`IndexNow: ${dilim.length} adres bildirildi (${host}) — HTTP ${r.status}${ok ? '' : ' — BASARISIZ'}`);
    } catch (e) {
      logger.warn('IndexNow: bildirilemedi — ' + (e && e.message));
      kodlar.push('hata');
    }
  }
  logger.info(`IndexNow: ${liste.length}/${urls.length} adres (${sebep})`
    + (dilimler.length > 1 ? ` · ${dilimler.length} istek` : ''));
  return { dosya, adet: liste.length, durum: 'HTTP ' + kodlar.join(','), sebep };
}
