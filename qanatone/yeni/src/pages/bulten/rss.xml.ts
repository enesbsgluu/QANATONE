/* KESME HAZIRLIĞI (Faz 4) — bülten RSS üreteci.
   Eski üreteç kök build.js `rss()` (408): rss 2.0, kanal başlığı/
   açıklaması/dili ve item alanları (title/link/guid/pubDate 09:00Z/
   description) BİREBİR. TR-only — eski üreteç de tekti.

   Bilinçli sapma: item sırası TARİHE göre yeni→eski — eski üreteç
   content.json'un ham sırasını basıyordu, o sıra kronolojik değil
   (bülten dizini turunda ölçüldü); dizinle aynı karar. Okuyucular
   pubDate'e göre sıralar, alan değerleri birebir. Bekçisi R8'in rss
   ayağı (yazı seti ↔ item seti). */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { KOK, T } from '../../icerik';

export const GET: APIRoute = async () => {
  const yazilar = (await getCollection('yazilar')).map(e => e.data)
    .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
  const esc = (s: unknown) => String(s == null ? '' : s).replace(/&/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n' +
    `  <title>QANATONE Bülten</title>\n  <link>${KOK}/bulten</link>\n` +
    '  <description>Yapay zeka, arama ve talep yonetiminde isine dokunan gelismeler.</description>\n' +
    '  <language>tr</language>\n' +
    yazilar.map((p: any) => '  <item>\n' +
      `    <title>${esc(T(p.title, 'tr'))}</title>\n` +
      `    <link>${KOK}/bulten/${p.slug}</link>\n` +
      `    <guid>${KOK}/bulten/${p.slug}</guid>\n` +
      `    <pubDate>${new Date(p.date + 'T09:00:00Z').toUTCString()}</pubDate>\n` +
      `    <description>${esc(T(p.lede, 'tr'))}</description>\n  </item>`).join('\n') +
    '\n</channel></rss>\n',
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
