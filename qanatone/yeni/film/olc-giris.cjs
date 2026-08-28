#!/usr/bin/env node
/* GIRIS PROTOTIPI OLCUM/KARE DUZENEGI (28 Agu) — dist/ sunulur, prototip
   /yeni/prototip/giris/ acilir; Faz A/B/C kareleri + kaydirma sonrasi (ucus)
   + HUD (faz, fps, GPU adi) alinir. TARAYICI=brave|chrome, HEADLESS=0 gercek pencere.
   Kullanim: node yeni/film/olc-giris.cjs [genislik=1440] [yukseklik=900] */
const path = require('path'), fs = require('fs'), http = require('http');
const pt = require(process.env.PUPPETEER_CORE || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const DIST = path.join(__dirname, '..', '..', 'dist');
const CIKTI = path.join(__dirname, 'olcum', 'giris'); fs.mkdirSync(CIKTI, { recursive: true });
const TARAYICILAR = { chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe' };
const TARAYICI = process.env.TARAYICI || 'chrome', EXE = TARAYICILAR[TARAYICI] || TARAYICI;
const HEADLESS = process.env.HEADLESS === '0' ? false : 'new';
const W = +(process.argv[2] || 1440), H = +(process.argv[3] || 900), MOBIL = W <= 900;
const PORT = 8942;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.css': 'text/css', '.mp4': 'video/mp4', '.avif': 'image/avif', '.woff2': 'font/woff2' };
const srv = http.createServer((req, rp) => {
  const u = decodeURIComponent(req.url.split('?')[0]); let f = path.join(DIST, u);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { rp.writeHead(404); return rp.end('yok ' + u); }
  rp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(rp);
});
(async () => {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  const b = await pt.launch({ executablePath: EXE, headless: HEADLESS, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', ...(HEADLESS ? [] : [`--window-size=${W + 20},${H + 100}`])] });
  const p = await b.newPage(); const log = [];
  p.on('console', (m) => log.push(`[${m.type()}] ${m.text().slice(0, 200)}`)); p.on('pageerror', (e) => log.push('[pageerror] ' + e.message));
  await p.setViewport(MOBIL ? { width: W, height: H, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: W, height: H });
  const ad = (s) => path.join(CIKTI, `${TARAYICI}-${W}x${H}-${s}.png`);
  const hud = () => p.evaluate(() => document.getElementById('hud').textContent);
  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:${PORT}/yeni/prototip/giris/?cizim_min=2.4&kabar=1.4`, { waitUntil: 'load', timeout: 60000 });
  const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
  const kayit = [];
  const kare = async (etiket, ms) => { await bekle(ms); await p.screenshot({ path: ad(etiket) }); const h = await hud(); kayit.push({ etiket, t_ms: Date.now() - t0, hud: h }); console.log(`== ${etiket} @${Date.now() - t0} ms\n${h}`); };
  await kare('A-erken', 600);
  await kare('A-orta', 900);
  await kare('B-kabarma', 1500);
  await kare('C-metal', 2500);
  await kare('C-metal-2', 3000);
  /* ucus: yarim ve tam */
  await p.evaluate(() => scrollTo(0, innerHeight * 0.3)); await kare('ucus-yarim', 1200);
  await p.evaluate(() => scrollTo(0, innerHeight * 0.6)); await kare('ucus-tam-nav', 1500);
  /* nav logosu gercekten acildi mi + quad kapandi mi */
  const nav = await p.evaluate(() => { const i = document.querySelector('#nvLogo img'); const r = i.getBoundingClientRect(); return { opacity: getComputedStyle(i).opacity, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], acik: document.getElementById('nvLogo').classList.contains('acik') }; });
  await p.evaluate(() => scrollTo(0, 0)); await kare('geri-sahne', 1500);
  fs.writeFileSync(path.join(CIKTI, `${TARAYICI}-${W}x${H}.json`), JSON.stringify({ tarayici: TARAYICI, headless: !!HEADLESS, W, H, nav, kayit, log }, null, 1));
  console.log('nav:', JSON.stringify(nav)); console.log(log.filter((l) => !l.startsWith('[warn]')).join('\n'));
  await b.close(); srv.close();
})().catch((e) => { console.error('HATA', e.message); process.exit(1); });
