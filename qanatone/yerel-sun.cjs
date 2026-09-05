#!/usr/bin/env node
/* yerel-sun.cjs — YALNIZ yerel sunum icin statik sunucu (netlify dev'in
   hedefi). Yayinda kullanilmaz, derlemeye girmez.

   NEDEN VAR: netlify-cli 27.1.2'nin kendi statik sunucusu bu makinede
   ALT DIZIN isteklerine 403 donuyor (kok dosyalar 200) — /projeler/,
   /yeni/projeler/, hatta /yeni/img/... hepsi Forbidden. Statik sunum bu
   betige devredildi; netlify dev vekil olarak KALIYOR, yani _redirects,
   _headers ve netlify/functions gercek yayindaki gibi calisiyor.

   Dizin istegi index.html'e duser (Netlify'in davranisi) ve metin
   varliklar gzip'lenir — olcum duzeniyle ayni. */
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const KOK = path.join(__dirname, 'dist');
const PORT = +(process.env.YEREL_PORT || 8790);
const TIP = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.json':'application/json', '.xml':'application/xml', '.txt':'text/plain; charset=utf-8', '.md':'text/markdown; charset=utf-8',
  '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg',
  '.ico':'image/x-icon', '.woff2':'font/woff2', '.webmanifest':'application/manifest+json',
  /* video: MIME olmadan tarayici klibi oynatmaz (film adasi) */
  '.mp4':'video/mp4', '.m4v':'video/mp4', '.webm':'video/webm', '.avif':'image/avif' };
const GZIP = new Set(['.html','.js','.mjs','.css','.json','.xml','.txt','.md','.svg','.webmanifest']);

const coz = (u) => {
  const guvenli = path.normalize(path.join(KOK, decodeURIComponent(u.split('?')[0])));
  if (!guvenli.startsWith(KOK)) return null;                 /* disari cikma */
  for (const aday of [guvenli, path.join(guvenli, 'index.html'), guvenli + '.html'])
    try { if (fs.statSync(aday).isFile()) return aday; } catch {}
  return null;
};

/* _HEADERS UYGULANIR (gece zinciri tur 3, 2 Eyl): kok `_headers` dosyasi
   okunur, desen (`*` joker) eslesen yollara basliklar basilir — Netlify'in
   yaptigi gibi, sonraki blok oncekini ezer. Eslesmeyen: Netlify HTML
   varsayilani (max-age=0, must-revalidate + ETag -> 304). Boylece "ikinci
   sayfa bayti" olcumu yayindaki onbellek davranisini gorur; eskiden hepsi
   no-store idi ve her sayfa her seyi yeniden indiriyordu (olculdu: 616 KB). */
const KURAL = (() => {
  try {
    const out = []; let cur = null;
    for (const ham of fs.readFileSync(path.join(__dirname, '_headers'), 'utf8').split(/\r?\n/)) {
      const l = ham.replace(/#.*$/, '').replace(/\s+$/, '');
      if (!l.trim()) continue;
      if (!/^\s/.test(l)) { cur = { re: new RegExp('^' + l.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'), h: {} }; out.push(cur); }
      else if (cur) { const i = l.indexOf(':'); if (i > 0) cur.h[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); }
    }
    return out;
  } catch (e) { return []; }
})();
const basliklar = (u) => { const h = {}; for (const k of KURAL) if (k.re.test(u)) Object.assign(h, k.h); return h; };

http.createServer((req, res) => {
  const f = coz(req.url);
  if (!f) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('yok: ' + req.url); }
  const ext = path.extname(f).toLowerCase();
  const st = fs.statSync(f);
  const etag = '"' + st.size.toString(16) + '-' + Math.floor(st.mtimeMs).toString(16) + '"';
  const yol = decodeURIComponent(req.url.split('?')[0]);
  const ozel = basliklar(yol);
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, { etag, ...ozel }); return res.end(); }
  const buf = fs.readFileSync(f);
  const h = { 'content-type': TIP[ext] || 'application/octet-stream', 'cache-control': 'public, max-age=0, must-revalidate', etag, ...ozel };
  if (GZIP.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) {
    const g = zlib.gzipSync(buf, { level: 6 });
    res.writeHead(200, { ...h, 'content-encoding': 'gzip', 'content-length': g.length });
    return res.end(g);
  }
  res.writeHead(200, { ...h, 'content-length': buf.length });
  res.end(buf);
}).listen(PORT, '0.0.0.0', () => console.log('yerel-sun ' + PORT + ' -> ' + KOK));
