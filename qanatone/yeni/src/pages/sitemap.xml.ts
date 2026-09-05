/* KESME HAZIRLIĞI (Faz 4) — sitemap üreteci.
   Eski üreteç kök build.js `sitemap()` (367): urlset + xhtml ns, her
   kayıtta loc/lastmod/priority + tr-en hreflang çifti; öncelikler
   687-710'dan birebir (ana 1.0 · dizinler 0.8 · hizmet 0.7 · bülten
   0.7 · proje 0.6). Kesmeye kadar /sitemap.xml'de durur ve HİÇBİR
   robots.txt ona işaret etmez (kök robots eski sitemap'i gösterir) —
   kesmede robots yeni üretece döner, bu dosya kökten sunulur.

   loc'lar sayfaların CANONICAL'larıyla birebir aynı formülden (KOK
   tabanı): sitemap'in işi canonical seti listelemek — bekçisi R8
   (dist'teki canonical seti ↔ sitemap loc seti).

   Bilinçli sapmalar:
   1. EN ana `/en` (eğik çizgisiz) — eski üreteç `/en/` basıyordu;
      yeni sayfanın canonical'ı `/en` (en/index.astro), sitemap sayfa
      gerçeğine uyar, eski biçime değil.
   2. /hukuki LİSTEDE YOK — ve KESMEDE (6 Eyl 2026) gerekçesi değişti:
      canonical'ı artık `qanatone.com/hukuki` (gerçek adres), ama sayfa
      sitemap'e girmiyor çünkü kaydı `sitemap: null`. R8 bu ayrımı
      KAYITTAN okuyor; eskiden canonical'ı netlify.app'e çevirerek
      kuraldan kaçılıyordu ve o kaçamak tam da kesmede patlayacaktı.
      Aynısı /404, /tesekkur, /film, /deneme-react için de geçerli.
      (Tarihçe) Kesmede canonical'ı
      KOK'a dönünce listeye girer (KESME-PLANI.md).
   3. Bülten detaylarının lastmod'u yazının kendi tarihi (eski üreteç
      de öyle); statik sayfalarınki derleme günü (eski `bugun()`
      davranışı birebir — her yayında tazelenir). */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { KOK, sl } from '../icerik';
import sayfalarVeri from '../veri/sayfalar.json';

export const GET: APIRoute = async () => {
  const kol: Record<string, any[]> = {
    hizmetler: (await getCollection('hizmetler')).map(e => e.data),
    projeler: (await getCollection('projeler')).map(e => e.data),
    yazilar: (await getCollection('yazilar')).map(e => e.data),
  };
  const bugun = new Date().toISOString().slice(0, 10);

  /* TUR 9 (3 Eyl 2026): yollar TEK KAYNAKTAN (veri/sayfalar.json). Sıra
     eski üretecin rota sırası korunur: statik kayıt sırası, koleksiyon
     kayıtları `dizin`inden hemen sonra (ana → hizmetler+detay → projeler
     +detay → bülten+yazı → otomasyon/surec/sss). `sitemap: null` olanlar
     (canonical KOK dışı: hukuki, film, deneme-react, 404) girmez. */
  const S = sayfalarVeri as any;
  const yollar: { yol: string; p: string; d?: string }[] = [];
  for (const s of S.statik) {
    if (!s.sitemap) continue;
    yollar.push({ yol: s.yol, p: s.sitemap });
    for (const k of S.koleksiyon.filter((k: any) => k.dizin === s.yol))
      for (const e of kol[k.ad] || [])
        yollar.push({ yol: k.yol.replace('{slug}', e.slug), p: k.sitemap, d: k.lastmod ? e[k.lastmod] : undefined });
  }

  /* ALTERNATE'LER DE sl'DEN GECER (5 Eyl 2026): loc egik cizgili, alternate
     cizgisiz kalirsa sitemap KENDI ICINDE catisir — hreflang cifti 301
     veren bir adresi gosterir. Ikisi de ayni uretecten cikar. */
  const kayit = (loc: string, y: { yol: string; p: string; d?: string }) => {
    const trAdres = sl(`${KOK}${y.yol}`);
    const enAdres = sl(`${KOK}/en${y.yol}`);
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${y.d || bugun}</lastmod>\n` +
      `    <priority>${y.p}</priority>\n` +
      `    <xhtml:link rel="alternate" hreflang="tr" href="${trAdres}"/>\n` +
      `    <xhtml:link rel="alternate" hreflang="en" href="${enAdres}"/>\n  </url>`;
  };

  const govde = yollar.flatMap(y => [
    kayit(sl(`${KOK}${y.yol || '/'}`), y),
    kayit(sl(`${KOK}/en${y.yol}`), y),
  ]).join('\n');

  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + govde + '\n</urlset>\n',
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
