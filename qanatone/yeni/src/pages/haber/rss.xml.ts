/* HABER RSS ÜRETECİ — `/haber/rss.xml` (Enes, 10 Eyl 2026: "Google
   haberleri de bülteni de çeksin"; karar defteri H3 "yap").

   Bülten beslemesinin (`../bulten/rss.xml.ts`) AYNI biçimi: rss 2.0,
   item alanları title/link/guid/pubDate 09:00Z/description, sıra tarihe
   göre yeni→eski, adresler `sl()` ile eğik çizgili (H29). TR-only —
   bülten beslemesi de tek dilli.

   AYRI DOSYA, AYRI BESLEME: bülten QANATONE'un kendi veri yazıları, haber
   sektör gündemi. T12 "bölümler sızmaz" her beslemenin YALNIZ kendi
   bölümünü taşıdığını ölçer; R8 item setini koleksiyonla kıyaslar.
   Google beslemeyi Search Console'da sitemap olarak da kabul ediyor —
   yeni haberi sitemap'ten önce fark ettiren yüzey bu.

   TAVAN TEK YERDE: sayı bülten üretecinden ithal edilir, burada tekrar
   yazılmaz (R8 onu oradan okuyor; iki yerde duran sayı kayar). */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { KOK, T, sl } from '../../icerik';
import { RSS_TAVAN } from '../bulten/rss.xml';

export const GET: APIRoute = async () => {
  /* ESIT TARIHTE SLUG ARTAN: haberler gunde birden cok cikiyor (olculdu:
     ayni tarihte 4 haber) — bulten ureteciyle ve R8'le ayni anahtar. */
  const haberler = (await getCollection('haberler')).map(e => e.data)
    .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)) || String(a.slug).localeCompare(String(b.slug)))
    .slice(0, RSS_TAVAN);
  const esc = (s: unknown) => String(s == null ? '' : s).replace(/&/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n' +
    `  <title>QANATONE Haberler</title>\n  <link>${sl(`${KOK}/haber`)}</link>\n` +
    '  <description>Yapay zeka, arama ve dijital pazarlama gundemi, kendi okumamizla.</description>\n' +
    '  <language>tr</language>\n' +
    haberler.map((p: any) => '  <item>\n' +
      `    <title>${esc(T(p.title, 'tr'))}</title>\n` +
      `    <link>${sl(`${KOK}/haber/${p.slug}`)}</link>\n` +
      `    <guid>${sl(`${KOK}/haber/${p.slug}`)}</guid>\n` +
      `    <pubDate>${new Date(p.date + 'T09:00:00Z').toUTCString()}</pubDate>\n` +
      `    <description>${esc(T(p.lede, 'tr'))}</description>\n  </item>`).join('\n') +
    '\n</channel></rss>\n',
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
