#!/usr/bin/env node
/* PROLOGUN DORT YOLU (TUR 5, 4 Eyl 2026 — kapanis kapisi).
   Kapanis tablosunda "prolog dort yolu yesil" satiri vardi ama onu kosan
   ADLI bir arac yoktu; el yordamiyla bakiliyordu. Kural: kanitlanamayan is
   bitmis degildir — dort yol burada tek komutla kosar.

   YOLLAR (karar TEK yerde verilir: Film.astro'nun erken satir ici betigi):
     1. normal          film kurulur: html.fl-js + html.fl-ana, gec dugmesi
     2. atlandi         oturumda bir kez gorulmus: data-film="atlandi"
     3. hareket-azaltma prefers-reduced-motion: data-film="hareket-azaltma"
     4. mobil           <=900px / kaba isaretci: data-film="mobil"
   Her yolda AYRICA: gec dugmesi klavyeyle erisilebilir mi (yol 1'de sart),
   govde gorunur mu (2/3/4'te site dogrudan akmali) ve sayfa yuksekligi
   (mobilde film rayi HIC kurulmamali — 122.000 px'lik ray belirtisi).
   KIRMIZI-ONCE: BOZ=1 mobil emulasyonunu KAPATIR, "mobil" yolu kirmiziya
   donmeli; yakalanmazsa duzenegin yesili anlamsizdir.
   Kullanim: node yeni/film/olc-prolog-yol.cjs   ·  BOZ=1 ile kirmizi kontrol */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const KOK = (process.env.KOK || 'http://127.0.0.1:8790').replace(/\/$/, '');
const SAYFA = process.env.SAYFA || '/yeni/';
const BOZ = process.env.BOZ === '1';
const EXE = (process.env.TARAYICI === 'chrome')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';

(async () => {
  const browser = await pt.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] });
  const sonuc = [];
  const yollar = [
    { ad: 'normal', bekle: null },
    { ad: 'atlandi', bekle: 'atlandi' },
    { ad: 'hareket-azaltma', bekle: 'hareket-azaltma' },
    { ad: 'mobil', bekle: 'mobil' },
  ];
  for (const y of yollar) {
    const ctx = await browser.createBrowserContext();
    const p = await ctx.newPage();
    const mobilMi = y.ad === 'mobil' && !BOZ;
    await p.setViewport(mobilMi ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
    await p.setCacheEnabled(false);
    if (y.ad === 'hareket-azaltma') {
      const cdp = await p.target().createCDPSession();
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    }
    await p.evaluateOnNewDocument((atla) => {
      try { sessionStorage.setItem('qanat-splash-seen', '1'); } catch (e) {}
      try { if (atla) sessionStorage.setItem('qanat-prolog-atlandi', '1'); else sessionStorage.removeItem('qanat-prolog-atlandi'); } catch (e) {}
    }, y.ad === 'atlandi');
    const r = await p.goto(KOK + SAYFA, { waitUntil: 'load', timeout: 120000 });
    await new Promise((x) => setTimeout(x, y.ad === 'normal' ? 2500 : 1200));
    const d = await p.evaluate(() => {
      const H = document.documentElement;
      const gec = document.querySelector('.fl-gec');
      const govde = document.getElementById('fl-govde');
      return {
        film: H.dataset.film || null,
        sinif: H.className,
        flVar: !!document.querySelector('section.fl'),
        gecGorunur: gec ? (() => { const b = gec.getBoundingClientRect(); return b.width > 8 && b.height > 8; })() : false,
        gecOdaklanabilir: gec ? (gec.tagName === 'A' && !!gec.getAttribute('href')) : false,
        govdeGorunur: govde ? getComputedStyle(govde).visibility !== 'hidden' : true,
        docH: Math.round(document.documentElement.scrollHeight),
        video: document.querySelectorAll('video.fl-video').length,
      };
    });
    await ctx.close();
    const kusur = [];
    if (r.status() !== 200) kusur.push('durum:' + r.status());
    if (y.bekle) {
      if (d.film !== y.bekle) kusur.push('data-film=' + d.film + ' (beklenen ' + y.bekle + ')');
    } else {
      if (d.film) kusur.push('data-film=' + d.film + ' (beklenen: yok)');
      if (!/\bfl-js\b/.test(d.sinif) || !/\bfl-ana\b/.test(d.sinif)) kusur.push('fl-js/fl-ana yok');
      if (!d.gecGorunur) kusur.push('gec dugmesi gorunmuyor');
      if (!d.gecOdaklanabilir) kusur.push('gec dugmesi odaklanabilir degil (FM2)');
    }
    if (y.ad !== 'normal' && !d.govdeGorunur) kusur.push('govde gizli — site akmiyor');
    if (y.ad === 'mobil' && d.docH > 40000) kusur.push('film rayi kurulmus: docH ' + d.docH);
    sonuc.push({ yol: y.ad, ...d, kusur });
    console.log('  ' + (kusur.length ? 'KALDI' : 'ok   ') + ' ' + y.ad.padEnd(16)
      + ' data-film=' + String(d.film).padEnd(16) + ' docH ' + String(d.docH).padStart(7)
      + ' · .fl ' + (d.flVar ? 'var' : 'yok') + ' · gec ' + (d.gecGorunur ? 'gorunur' : '-')
      + ' · govde ' + (d.govdeGorunur ? 'gorunur' : 'gizli')
      + (kusur.length ? '  !! ' + kusur.join(' | ') : ''));
  }
  await browser.close();
  /* PROLOG ANAHTARI KAPALIYSA DORT YOL KONUSUZDUR (6 Eyl 2026).
     content.json'da theme.motion.prolog = 0 ise ana sayfada film YOK; o
     halde "yol 1 normal kurulmadi" demek YANLIS KIRMIZI olur. Sessizce
     gecmek de YANLIS YESIL olurdu, o yuzden durum ADIYLA yazilir ve TEK
     ters sart sinanir: hicbir yolda film izi GORUNMEMELI. */
  let prologAcik = true;
  try {
    const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'content.json'), 'utf8'));
    prologAcik = ((c.theme || {}).motion || {}).prolog !== 0;
  } catch (e) { /* okunamazsa acik varsay */ }
  if (!prologAcik) {
    const sizan = sonuc.filter((r) => r.flVar);
    console.log('\n!! PROLOG ANAHTARI KAPALI (theme.motion.prolog = 0) — dort yol KONUSUZ.');
    console.log('   Ters sart: hicbir yolda film izi olmamali -> ' + (sizan.length ? 'SIZINTI: ' + sizan.map((r) => r.yol).join(', ') : 'TEMIZ'));
    fs.writeFileSync(path.join(__dirname, 'olc-prolog-yol.json'), JSON.stringify({
      _: 'yeni/film/olc-prolog-yol.cjs — PROLOG KAPALI: dort yol konusuz, yalniz ters sart (film izi yok) sinandi.',
      olcum: new Date().toISOString(), prolog_acik: false, ters_sart_temiz: sizan.length === 0, sonuc,
    }, null, 1));
    process.exit(sizan.length === 0 ? 0 : 1);
  }
  const kaldi = sonuc.filter((s) => s.kusur.length).length;
  fs.writeFileSync(path.join(__dirname, 'olc-prolog-yol.json'), JSON.stringify({ _: 'yeni/film/olc-prolog-yol.cjs — prologun dort yolu: normal / atlandi / hareket-azaltma / mobil.', olcum: new Date().toISOString(), sayfa: SAYFA, boz: BOZ, sonuc }, null, 1));
  console.log('\nHUKUM: ' + (kaldi === 0 ? 'GECTI' : 'KALDI (' + kaldi + ' yol)'));
  if (BOZ) { console.log(kaldi > 0 ? 'KIRMIZI KONTROL BASARILI' : 'KIRMIZI KONTROL BASARISIZ'); process.exit(kaldi > 0 ? 0 : 2); }
  process.exit(kaldi === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(3); });
