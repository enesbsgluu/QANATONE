/* MARKDOWN ICERIK PAZARLIGI (9 Eyl 2026).

   HEDEF: `Accept: text/markdown` ile gelen ajanlara sayfanin markdown
   karsiligini dondurmek; tarayicilar icin HTML VARSAYILAN kalir.
   Olcut (isitagentready skill): istek `Accept: text/markdown` -> yanit
   `Content-Type: text/markdown`, varsa `x-markdown-tokens`.

   NEDEN EDGE FUNCTION: Cloudflare zonelarinda bu ozellik hazir geliyor,
   Netlify'da gelmiyor — istek basligina bakip yanit degistirmek yalniz
   burada mumkun. `_redirects` Accept basligina gore dallanamaz.

   ES DOSYALARI ZATEN VAR: ajan hatti her indekslenebilir sayfanin yaninda
   bir `.md` uretiyor (59 es, bekci T3). Bu fonksiyon YENI ICERIK URETMEZ,
   var olan esi servis eder — tek kaynak korunur.
     /                     -> /index.md
     /hizmetler/           -> /hizmetler.md
     /bulten/<yazi>/       -> /bulten/<yazi>.md

   UC KORUMA:
     1. Yalnizca `text/markdown` ACIKCA istendiginde devreye girer. Tarayici
        `Accept: text/html,...` yollar, oraya dokunulmaz.
     2. Kendi `.md` istegimiz yine bu fonksiyondan gecer; sonsuz dongu
        olmasin diye `.md`/varlik uzantili yollar bastan elenir.
     3. Es bulunamazsa (noindex sayfalar: film, tesekkur, 404) HTML'e
        DUSULUR — ajan bos yanit almaz.

   `Vary: Accept` SART: ayni adres iki farkli govde dondurdugu icin araya
   giren onbellekler bunu bilmeli, yoksa tarayiciya markdown servis edilir. */

const ATLA = /\.(md|txt|xml|json|webp|avif|png|jpg|svg|ico|css|js|mjs|woff2?|mp4|webm|pdf)$/i;

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  /* PAZARLIK YALNIZ OKUMA ISTEKLERINDE (9 Eyl 2026, MCP/A2A turu).
     Icerik pazarligi bir TEMSIL secimidir; POST bir EYLEMDIR ve markdown
     esi diye bir sey yoktur. Bu satir olmadan, `/mcp`ye `Accept:
     text/markdown` ile POST atan bir ajan — bugun degil ama ileride
     `/mcp.md` gibi bir sayfa dogarsa — protokol ucu yerine markdown
     alirdi ve hata HICBIR YERDE kirmizi yakmazdi. Bugun olculdu: es
     dosya yok, uc saglam donuyor; kapi gelecege karsi kuruluyor. */
  if (request.method !== 'GET' && request.method !== 'HEAD') return;
  const accept = request.headers.get('accept') || '';
  if (!/(^|,)\s*text\/markdown\b/i.test(accept)) return;   /* HTML varsayilan */

  const url = new URL(request.url);
  if (ATLA.test(url.pathname)) return;

  const yol = url.pathname.replace(/\/+$/, '');
  const esYolu = yol === '' ? '/index.md' : yol + '.md';

  let es: Response;
  try {
    es = await fetch(new URL(esYolu, url.origin).toString(), {
      headers: { accept: 'text/plain' },
    });
  } catch {
    return;                                                 /* ag hatasi -> HTML */
  }
  if (!es.ok) return;                                       /* es yok -> HTML */

  const govde = await es.text();
  if (!govde.trim()) return;

  return new Response(govde, {
    status: 200,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      /* kaba jeton tahmini (~4 karakter/jeton) — olcut "varsa" diyor */
      'x-markdown-tokens': String(Math.ceil(govde.length / 4)),
      'vary': 'accept',
      'cache-control': 'public, max-age=0, must-revalidate',
      'x-robots-tag': 'noindex',
      'x-content-type-options': 'nosniff',
    },
  });
};

export const config = { path: '/*' };
