#!/usr/bin/env node
/* PANELIN TASLAK AYAK IZI — TESHIS (kapi degil), 5 Eyl 2026.

   NEDEN VAR. `netlify/functions/yayinla.js` panelden gelen govdeyi
   content.json'a BIREBIR yazar (`icerik: JSON.stringify(govde.content)`) —
   birlestirme YOK. Yani panelin taslaginda olmayan her anahtar, "Yayinla"
   dendigi anda content.json'dan DUSER. Panel kapisi bu gece bunu sayiyla
   gosterdi (+155 anahtar / -42 anahtar) ama hangi anahtarlar oldugunu
   kirpiyordu. Bu betik tam listeyi cikarir ve DUSEN anahtarlarin ESKI
   SITEDE okunup okunmadigini sayar — cunku eski site hala yayindadir.

   YONTEM: depo koku 8791'de sunulur, panel Brave'de acilir, tek bir alana
   dokunulur (taslak dogsun diye), localStorage'daki taslak okunur ve
   content.json ile ANAHTAR KUMESI karsilastirilir. Hicbir sey yazilmaz:
   content.json'a DOKUNULMAZ.

   Kullanim: node yeni/panel-taslak-farki.cjs */
const path = require('path');
const fs = require('fs');
const http = require('http');
const pt = require(process.env.PUPPETEER_CORE || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const KOK = path.join(__dirname, '..');
const CHROME = process.env.CHROME || 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
const PORT = Number(process.env.PORT || 8793);
const CIKTI = path.join(__dirname, 'panel-taslak-farki.json');
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };

const kume = (o, on = '') => {
  const s = new Set();
  for (const [k, v] of Object.entries(o || {})) {
    const y = on ? on + '.' + k : k;
    s.add(y);
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const x of kume(v, y)) s.add(x);
  }
  return s;
};

(async () => {
  const sunucu = http.createServer((q, c) => {
    const yol = decodeURIComponent(q.url.split('?')[0]);
    const p = path.join(KOK, yol === '/' ? 'index.html' : yol.replace(/^\//, ''));
    if (!p.startsWith(KOK) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { c.writeHead(404); return c.end('yok'); }
    c.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(c);
  }).listen(PORT);

  const browser = await pt.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1400,950'], defaultViewport: null, protocolTimeout: 300000 });
  let sonuc;
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/admin.html`, { waitUntil: 'networkidle0', timeout: 60000 });
    await bekle(2500);
    /* taslagi dogurmak icin TEK alana dokun (deger degistirmeden geri yaz) */
    const dokunuldu = await page.evaluate(() => {
      const el = document.querySelector('[data-p]');
      if (!el) return false;
      const v = el.value;
      el.value = v + ' ';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    });
    await bekle(1200);
    const taslak = await page.evaluate(() => localStorage.getItem('qanat-admin-draft'));
    if (!taslak) throw new Error('taslak dogmadi (dokunuldu=' + dokunuldu + ')');
    const T = JSON.parse(taslak);
    const C = JSON.parse(fs.readFileSync(path.join(KOK, 'content.json'), 'utf8'));
    const A = kume(C), B = kume(T);
    const dusen = [...A].filter((k) => !B.has(k));
    const eklenen = [...B].filter((k) => !A.has(k));

    /* DUSEN anahtarlar eski sitede okunuyor mu — data-t sozlugu */
    const eski = fs.readFileSync(path.join(KOK, 'index.html'), 'utf8');
    const kullanim = {};
    for (const y of dusen) {
      const k = y.split('.').pop();
      const n = (eski.match(new RegExp('data-t="' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'g')) || []).length;
      if (n) kullanim[y] = n;
    }
    sonuc = {
      _: 'yeni/panel-taslak-farki.cjs — TESHIS. yayinla.js govdeyi content.json a BIREBIR yazar; panelin taslaginda olmayan anahtar yayinda DUSER. Bu kayit hangi anahtarlarin dustugunu ve DUSENLERIN ESKI SITEDE kac yerde okundugunu gosterir.',
      olcum: new Date().toISOString(),
      content_anahtar: A.size, taslak_anahtar: B.size,
      dusen_sayi: dusen.length, eklenen_sayi: eklenen.length,
      dusen, eklenen,
      dusen_eski_sitede_okunan: kullanim,
      dusen_eski_sitede_okunan_toplam: Object.values(kullanim).reduce((a, b) => a + b, 0),
    };
    fs.writeFileSync(CIKTI, JSON.stringify(sonuc, null, 1));
    console.log(`content.json ${A.size} anahtar · taslak ${B.size} anahtar`);
    console.log(`DUSEN ${dusen.length}: ${dusen.join(' ')}`);
    console.log(`EKLENEN ${eklenen.length}: ${eklenen.slice(0, 40).join(' ')}${eklenen.length > 40 ? ' …' : ''}`);
    const say = Object.keys(kullanim).length;
    console.log(`\nDUSENLERDEN ESKI SITEDE OKUNAN: ${say} anahtar, toplam ${sonuc.dusen_eski_sitede_okunan_toplam} yer`);
    for (const [k, n] of Object.entries(kullanim)) console.log(`   ${k}  ->  eski sitede ${n} yerde`);
    console.log(`\n→ ${CIKTI}`);
  } finally {
    await browser.close();
    sunucu.close();
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
