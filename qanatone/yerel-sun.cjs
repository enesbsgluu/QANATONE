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
  '.css':'text/css', '.json':'application/json', '.xml':'application/xml', '.txt':'text/plain; charset=utf-8',
  '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg',
  '.ico':'image/x-icon', '.woff2':'font/woff2', '.webmanifest':'application/manifest+json' };
const GZIP = new Set(['.html','.js','.mjs','.css','.json','.xml','.txt','.svg','.webmanifest']);

const coz = (u) => {
  const guvenli = path.normalize(path.join(KOK, decodeURIComponent(u.split('?')[0])));
  if (!guvenli.startsWith(KOK)) return null;                 /* disari cikma */
  for (const aday of [guvenli, path.join(guvenli, 'index.html'), guvenli + '.html'])
    try { if (fs.statSync(aday).isFile()) return aday; } catch {}
  return null;
};

http.createServer((req, res) => {
  const f = coz(req.url);
  if (!f) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('yok: ' + req.url); }
  const ext = path.extname(f).toLowerCase();
  const buf = fs.readFileSync(f);
  const h = { 'content-type': TIP[ext] || 'application/octet-stream', 'cache-control': 'no-store' };
  if (GZIP.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) {
    const g = zlib.gzipSync(buf, { level: 6 });
    res.writeHead(200, { ...h, 'content-encoding': 'gzip', 'content-length': g.length });
    return res.end(g);
  }
  res.writeHead(200, { ...h, 'content-length': buf.length });
  res.end(buf);
}).listen(PORT, '0.0.0.0', () => console.log('yerel-sun ' + PORT + ' -> ' + KOK));
