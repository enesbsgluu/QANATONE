#!/usr/bin/env node
/* PANEL KAPISI (GECE ZINCIRI TUR 5, 2 Eyl 2026).
   Kapi "alan panelde var" degil: her alan icin PANELDEN YAZILDI -> DERLENDI ->
   URETILEN SAYFADA GORUNDU ucu birden gosterilir; ayrica BOS HALI sayfayi
   bozmuyor (denetim yesil, "undefined"/"null" sizmiyor).
   Yontem: repo koku 8791'de sunulur (admin.html + onizleme iframe'i /index.html
   + content.json); Brave'de panel acilir, alanlara puppeteer ile gercek girdi
   yazilir (input olayi -> set -> touch -> localStorage taslagi). Taslak
   content.json'a yazilir (yayinla fonksiyonunun yaptigi is), astro derlenir,
   dist/yeni'de nobetci metin aranir. Sonra ayni alanlar bosaltilir, yeniden
   derlenir, denetim kosulur. Sonda content.json geri yuklenir ve yeniden
   derlenir.
   ONCE KIRMIZI: 'strings.tr.zzz_kirmizi' hicbir bilesende okunmaz; kapi onu
   "gorunmedi" diye KIRMIZI yazmali (yanlis yesil tuzagi).
   Kullanim: node yeni/panel-kapi.cjs   (Brave; ~4 dk, 3 derleme) */
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execSync } = require('child_process');
const pt = require(process.env.PUPPETEER_CORE || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const KOK = path.join(__dirname, '..');
const DIST = path.join(KOK, 'dist', 'yeni');
const CHROME = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
const PORT = 8791;
const YEDEK = path.join(require('os').tmpdir(), 'qanatone-content.json.yedek');
const N = 'PNLKAPI' + Date.now().toString(36).slice(-4);
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };

/* ALANLAR: sekme, alan yolu (data-p), nobetci deger, gorunmesi beklenen sayfa(lar), bos hal notu */
const ALAN = [
  { sekme: 'metin', p: 'strings.tr.nav0', deger: N + '-NAV', sayfa: ['index.html'], not: 'menü ilk madde (Nav)' },
  { sekme: 'metin', p: 'strings.en.nav0', deger: N + '-NAVEN', sayfa: ['en/index.html'], not: 'menü ilk madde EN' },
  { sekme: 'metin', p: 'strings.tr.foot1', deger: N + '-FOOT', sayfa: ['index.html', 'sss/index.html'], not: 'alt bilgi (Temel)' },
  { sekme: 'metin', p: 'strings.tr.gn3', deger: N + '-GN3', sayfa: ['otomasyon/index.html'], not: '/otomasyon sabit metni' },
  { sekme: 'metin', p: 'strings.tr.@ESKI', deger: N + '-KIRMIZI', sayfa: ['index.html'], not: 'KIRMIZI KONTROL: yalniz eski site okur, yeni sitede gorunmemeli', kirmizi: true },
  { sekme: 'genel', p: 'settings.og', deger: 'https://qanatone.com/img/' + N + '-og.png', sayfa: ['index.html', 'en/index.html'], not: 'og:image' },
  { sekme: 'genel', p: 'settings.orgDesc', deger: N + ' kurum tanimi cumlesi', sayfa: ['index.html'], not: 'Organization description (şema)' },
  { sekme: 'genel', p: 'legal.line', deger: N + ' Dijital', sayfa: ['index.html'], not: 'alt bilgi şirket satırı' },
  { sekme: 'genel', p: 'legal.kvkk', deger: '<p>' + N + ' KVKK</p>', sayfa: ['hukuki/index.html'], not: 'KVKK metni (/hukuki)' },
  { sekme: 'kurucu', p: 'founder.bio.tr', deger: '<p>' + N + ' biyografi</p>', sayfa: ['index.html'], not: 'kurucu biyografisi' },
  { sekme: 'kurucu', p: 'socials.0.url', deger: 'https://www.instagram.com/' + N, sayfa: ['index.html'], not: 'sosyal adres (alt bilgi + sameAs)' },
  { sekme: 'soz', p: 'testimonials.0.q.tr', deger: N + ' müşteri sözü', sayfa: ['index.html'], not: 'müşteri sözü (theme.testi.on=1 ile)' },
  /* TUR 4 (4 Eyl 2026) — planin saydigi kalan alanlar kapiya alindi. */
  { sekme: 'genel', p: 'settings.gtm', deger: 'G-' + N.toUpperCase().slice(-8), sayfa: ['index.html', 'sss/index.html'], not: 'ölçüm betiği (GTM/GA)' },
  { sekme: 'genel', p: 'settings.whatsapp', deger: '90' + (5000000000 + parseInt(N.slice(-4), 36) % 999999999), sayfa: ['index.html', 'sss/index.html'], not: 'WhatsApp numarası (bütün düğmeler)' },
  { sekme: 'kurucu', p: 'founder.bio.en', deger: '<p>' + N + ' EN bio</p>', sayfa: ['en/index.html'], not: 'kurucu biyografisi EN' },
  { sekme: 'kurucu', p: 'socials.0.label', deger: N + '-SOSYAL', sayfa: ['index.html'], not: 'sosyal hesap etiketi (alt bilgi)' },
  { sekme: 'metin', p: 'strings.tr.bkh', deger: N + '-BULTEN', sayfa: ['bulten/index.html'], not: 'bülten dizini başlığı' },
  { sekme: 'metin', p: 'strings.tr.s3h', deger: N + '-SUREC', sayfa: ['surec/index.html'], not: '/surec başlığı' },
  { sekme: 'metin', p: 'strings.tr.s5h', deger: N + '-SSS', sayfa: ['sss/index.html'], not: '/sss başlığı' },
  { sekme: 'metin', p: 'strings.tr.hs1', deger: N + '-HUNI', sayfa: ['otomasyon/index.html'], not: 'hesaplayıcı başlığı (TUR 1 kartı)' },
  { sekme: 'metin', p: 'strings.tr.mf1', deger: N + '-MODEL', sayfa: ['otomasyon/index.html'], not: 'doğru model kartı başlığı (TUR 1)' },
  { sekme: 'metin', p: 'strings.tr.gn1', deger: N + '-GUN', sayfa: ['otomasyon/index.html'], not: 'bir gün rayı başlığı (TUR 1)' },
  { sekme: 'metin', p: 'strings.en.foot1', deger: N + '-FOOTEN', sayfa: ['en/index.html'], not: 'alt bilgi EN' },
  /* TUR 4 · IKINCI DALGA: 80 sabit iki dilli metin panele acildi (M('anahtar',
     'TR','EN')). Her acilan DOSYADAN en az bir anahtar kapiya girer — tek tek
     hepsini yazmak kapiyi 4 dakikadan saatlere cikarirdi; dosya basina bir
     ornek, bagin kurulup kurulmadigini gosterir (imza ve harita ortak). */
  { sekme: 'metin', p: 'strings.tr.hzg01', deger: N + '-HZG', sayfa: ['hizmetler/seo/index.html'], not: 'hizmet detayı — geri bağı' },
  { sekme: 'metin', p: 'strings.en.hzg13', deger: N + '-HZGEN', sayfa: ['en/hizmetler/seo/index.html'], not: 'hizmet detayı çağrı düğmesi EN' },
  { sekme: 'metin', p: 'strings.tr.hzd01', deger: N + '-HZD', sayfa: ['hizmetler/index.html'], not: '/hizmetler dizini' },
  { sekme: 'metin', p: 'strings.tr.prd01', deger: N + '-PRD', sayfa: ['projeler/index.html'], not: '/projeler dizini' },
  { sekme: 'metin', p: 'strings.tr.prg01', deger: N + '-PRG', sayfa: ['projeler/skyclinics/index.html'], not: 'proje detayı' },
  { sekme: 'metin', p: 'strings.tr.bld01', deger: N + '-BLD', sayfa: ['bulten/index.html'], not: 'bülten dizini (M ailesi)' },
  { sekme: 'metin', p: 'strings.tr.srg01', deger: N + '-SRG', sayfa: ['surec/index.html'], not: '/surec (M ailesi)' },
  { sekme: 'metin', p: 'strings.tr.ssg01', deger: N + '-SSG', sayfa: ['sss/index.html'], not: '/sss (M ailesi)' },
  /* sahneler: hangi hizmet sayfasinda gorundukleri OLCULDU (dist'te arandi) */
  { sekme: 'metin', p: 'strings.tr.arc01', deger: N + '-ARC', sayfa: ['hizmetler/web-sitesi-araclar/index.html'], not: 'araç sahnesi künyesi' },
  { sekme: 'metin', p: 'strings.tr.plt01', deger: N + '-PLT', sayfa: ['hizmetler/finans/index.html'], not: 'platform sahnesi künyesi' },
  { sekme: 'metin', p: 'strings.tr.mtr01', deger: N + '-MTR', sayfa: ['hizmetler/finans/index.html'], not: 'motor sahnesi künyesi' },
];
const ANAHTAR = [ /* dugmeler: data-sw yolu, beklenen iz (deger 1 iken dist'te ARANMAYAN sinif) */
  { sekme: 'gorunum', sw: 'theme.motion.stars', iz: 't-nostars', not: 'yıldız tuvali' },
  { sekme: 'soz', sw: 'theme.testi.on', iz: null, not: 'söz bandı bayrağı' },
];

function sunucu() {
  return new Promise((r) => {
    const s = http.createServer((req, res) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      let f = path.normalize(path.join(KOK, u === '/' ? '/index.html' : u));
      if (!f.startsWith(KOK) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    }).listen(PORT, '127.0.0.1', () => r(s));
  });
}
function derle() { execSync('npm run build --silent', { cwd: __dirname, stdio: 'pipe', timeout: 300000 }); }
function denetim() { try { const o = execSync('node denetim.cjs', { cwd: __dirname, encoding: 'utf8', timeout: 120000 }); const m = o.match(/(\d+) geçti · (\d+) kaldı/); return m ? { gecti: +m[1], kaldi: +m[2] } : { gecti: 0, kaldi: -1 }; } catch (e) { const m = String(e.stdout || '').match(/(\d+) geçti · (\d+) kaldı/); return m ? { gecti: +m[1], kaldi: +m[2] } : { gecti: 0, kaldi: -1 }; } }
const oku = (rel) => { const f = path.join(DIST, rel); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''; };
const idOf = (p) => '#f-' + String(p).replace(/\W+/g, '-');

(async () => {
  const yedek = fs.readFileSync(path.join(KOK, 'content.json'), 'utf8');
  fs.writeFileSync(YEDEK, yedek);
  const srv = await sunucu();
  const browser = await pt.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1460,980'], defaultViewport: null, protocolTimeout: 120000 });
  const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => { try { localStorage.removeItem('qanat-admin-draft'); localStorage.removeItem('qanat-content'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${PORT}/admin.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('#side [data-go="metin"]', { timeout: 30000 });
  const sonuc = [];
  const yaz = async (sekme, p, deger) => {
    await page.click(`#side [data-go="${sekme}"]`); await bekle(250);
    const sel = idOf(p);
    const var_ = await page.$(sel);
    if (!var_) return false;
    await page.evaluate((s) => { const el = document.querySelector(s); el.focus(); el.select && el.select(); }, sel);
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace');
    if (deger) await page.type(sel, deger, { delay: 2 });
    await bekle(120);
    return true;
  };
  const taslak = async () => { await bekle(600); return await page.evaluate(() => localStorage.getItem('qanat-admin-draft')); };
  /* KIRMIZI KONTROL anahtari: haritada 'Eski site' bolumunden ilk anahtar — panelde
     alani VAR, taslaga girer, ama yeni sitenin hicbir bileseni okumaz; kapi bunu
     'gorunmedi' diye yazmali (yanlis yesil tuzagi burada yakalanir). */
  const eskiAnahtar = await page.evaluate(() => Object.keys(METIN_HARITA).find((k) => METIN_HARITA[k].b === 'Eski site'));
  for (const a of ALAN) if (a.p.includes('@ESKI')) { a.p = a.p.replace('@ESKI', eskiAnahtar); a.not += ' (' + eskiAnahtar + ')'; }
  /* arama kapisi */
  await page.click('#side [data-go="metin"]'); await bekle(300);
  const toplam = await page.evaluate(() => document.querySelectorAll('#mtL .mt').length);
  await page.type('#mtQ', 'whatsapp'); await bekle(200);
  const aramaSonuc = await page.evaluate(() => [...document.querySelectorAll('#mtL .mt')].filter((r) => !r.hidden).length);
  await page.evaluate(() => { const q = document.querySelector('#mtQ'); q.value = ''; q.dispatchEvent(new Event('input')); });
  await page.select('#mtB', 'Menü'); await bekle(150);
  const bolumSonuc = await page.evaluate(() => [...document.querySelectorAll('#mtL .mt')].filter((r) => !r.hidden).length);
  await page.select('#mtB', ''); await bekle(100);
  console.log(`SEKME: ${toplam} metin listelendi · arama "whatsapp" -> ${aramaSonuc} · bölüm "Menü" -> ${bolumSonuc}`);

  /* 1) YAZ */
  for (const a of ALAN) { a.yazildi = await yaz(a.sekme, a.p, a.deger); }
  for (const k of ANAHTAR) {
    await page.click(`#side [data-go="${k.sekme}"]`); await bekle(250);
    k.yazildi = await page.evaluate((sw) => { const b = document.querySelector(`[data-sw="${sw}"]`); if (!b) return false; if (!b.classList.contains('on')) b.click(); return true; }, k.sw);
  }
  let t = await taslak();
  if (!t) throw new Error('taslak yok');
  let C = JSON.parse(t);
  for (const a of ALAN) a.taslakta = String(a.p.split('.').reduce((o, k) => o?.[k], C) ?? '') === a.deger;
  for (const k of ANAHTAR) k.taslakta = k.sw.split('.').reduce((o, kk) => o?.[kk], C) === 1;
  fs.writeFileSync(path.join(KOK, 'content.json'), JSON.stringify(C, null, 1));
  console.log('derleniyor (dolu)…'); derle();
  const dn1 = denetim();
  for (const a of ALAN) { a.gorundu = a.sayfa.filter((s) => oku(s).includes(a.deger)); }
  for (const k of ANAHTAR) { k.gorundu = k.iz ? !oku('index.html').includes(k.iz) : true; }
  const sozBant = oku('index.html');
  /* 2) BOS */
  for (const a of ALAN) { if (a.kirmizi) continue; await yaz(a.sekme, a.p, ''); }
  for (const k of ANAHTAR) {
    await page.click(`#side [data-go="${k.sekme}"]`); await bekle(250);
    await page.evaluate((sw) => { const b = document.querySelector(`[data-sw="${sw}"]`); if (b && b.classList.contains('on')) b.click(); }, k.sw);
  }
  t = await taslak(); C = JSON.parse(t);
  for (const a of ALAN) if (!a.kirmizi) a.bosTaslakta = String(a.p.split('.').reduce((o, k) => o?.[k], C) ?? '') === '';
  fs.writeFileSync(path.join(KOK, 'content.json'), JSON.stringify(C, null, 1));
  console.log('derleniyor (boş)…'); derle();
  const dn2 = denetim();
  const sizinti = ['index.html', 'en/index.html', 'hukuki/index.html', 'otomasyon/index.html'].map((s) => [s, (oku(s).match(/>(undefined|null|\[object Object\])</g) || []).length]).filter((x) => x[1]);
  for (const a of ALAN) { if (!a.kirmizi) a.bosSizinti = a.sayfa.filter((s) => oku(s).includes(a.deger)); }
  for (const k of ANAHTAR) { k.kapali = k.iz ? oku('index.html').includes(k.iz) : true; }
  /* 3) GERI YUKLE */
  fs.writeFileSync(path.join(KOK, 'content.json'), yedek);
  console.log('derleniyor (geri yükleme)…'); derle();
  await browser.close(); srv.close();

  /* RAPOR */
  let kaldi = 0;
  console.log('\n| Alan | Panelde yazıldı | Taslakta | Derlendi | Üretimde göründü | Boş hâli | Hüküm |\n|---|---|---|---|---|---|---|');
  for (const a of ALAN) {
    const g = a.gorundu.length === a.sayfa.length;
    const bos = a.kirmizi ? '—' : (a.bosTaslakta && !a.bosSizinti.length ? 'temiz' : 'SIZINTI');
    const ok = a.kirmizi ? (!g && a.yazildi && a.taslakta) : (a.yazildi && a.taslakta && g && bos === 'temiz');
    if (!ok) kaldi++;
    console.log(`| ${a.p} (${a.not}) | ${a.yazildi ? '✓' : '✗'} | ${a.taslakta ? '✓' : '✗'} | ✓ | ${g ? '✓ ' + a.gorundu.join(', ') : (a.kirmizi ? 'görünmedi (beklenen)' : '✗ ' + (a.gorundu.length ? 'yalnız ' + a.gorundu.join(', ') : 'hiçbir sayfada'))} | ${bos} | ${ok ? (a.kirmizi ? 'KIRMIZI YAKALANDI' : 'GEÇTİ') : 'KALDI'} |`);
  }
  for (const k of ANAHTAR) {
    const ok = k.yazildi && k.taslakta && k.gorundu && k.kapali; if (!ok) kaldi++;
    console.log(`| ${k.sw} (${k.not}) | ${k.yazildi ? '✓' : '✗'} | ${k.taslakta ? '✓' : '✗'} | ✓ | ${k.iz ? (k.gorundu ? '✓ açıkken ' + k.iz + ' yok' : '✗') : 'bayrak (görsel bant eski sitede)'} | ${k.iz ? (k.kapali ? 'kapalıyken ' + k.iz + ' var' : 'SIZINTI') : '—'} | ${ok ? 'GEÇTİ' : 'KALDI'} |`);
  }
  console.log(`\nDENETIM (dolu): ${dn1.gecti} geçti · ${dn1.kaldi} kaldı · DENETIM (boş): ${dn2.gecti} geçti · ${dn2.kaldi} kaldı · boş hâlde undefined/null sızıntısı: ${sizinti.length ? JSON.stringify(sizinti) : 'yok'}`);
  console.log(`ARAMA: ${toplam} metin · "whatsapp" ${aramaSonuc} · bölüm Menü ${bolumSonuc} · admin.html ${fs.statSync(path.join(KOK, 'admin.html')).size} B`);
  console.log(`HÜKÜM: ${kaldi === 0 && dn1.kaldi === 0 && dn2.kaldi === 0 && !sizinti.length ? 'GEÇTİ' : 'KALDI (' + kaldi + ' alan)'}`);
})().catch((e) => { console.error(e); try { fs.writeFileSync(path.join(KOK, 'content.json'), fs.readFileSync(YEDEK, 'utf8')); } catch (x) {} process.exit(1); });
