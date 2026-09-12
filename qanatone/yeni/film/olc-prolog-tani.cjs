#!/usr/bin/env node
/* PROLOG TANI SAYFASI DUZENEGI (11 Eyl 2026).
   public/prototip/prolog-tani.html ana sayfayi iframe'de acip prolog
   kapisinin kararini okur. Bu duzenek sayfanin HER DALDA dogru hukmu
   verdigini sinar: kosul emule edilir, tani sayfasinin `body[data-hukum]`
   kodu beklenenle kiyaslanir.
   YAYINDAN ONCE SINANABILIR: KOK canli siteyse (varsayilan) tani adresine
   giden istek YEREL dosyayla karsilanir — sayfa canli ana sayfayla AYNI
   kaynakta calisir, yani gercek canli kapi kosar. YEREL=0 verilirse canli
   tani sayfasinin kendisi olculur (yayindan sonra).
   KIRMIZI-ONCE: BOZ=1 her kolun beklentisini kaydirir; duzenek kirmizi
   vermezse yesili anlamsizdir.
   Kullanim: node yeni/film/olc-prolog-tani.cjs   (TARAYICI=edge|brave, BOZ=1, YEREL=0) */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const KOK = (process.env.KOK || 'https://www.qanatone.com').replace(/\/$/, '');
const YOL = '/prototip/prolog-tani.html';
const YEREL = process.env.YEREL !== '0';
const BOZ = process.env.BOZ === '1';
const EXE = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
}[process.env.TARAYICI || 'chrome'];
const GOVDE = fs.readFileSync(path.join(__dirname, '..', 'public', 'prototip', 'prolog-tani.html'));

const KOLLAR = [
  { ad: 'normal', vp: { width: 1920, height: 1080 }, bekle: 'acik' },
  { ad: 'hareket-azaltma', vp: { width: 1920, height: 1080 }, azalt: true, bekle: 'hareket-azaltma' },
  { ad: 'dokunmatik', vp: { width: 1920, height: 1080, hasTouch: true }, bekle: 'mobil-dokunmatik' },
  { ad: 'dar-pencere', vp: { width: 768, height: 864, deviceScaleFactor: 1.25 }, bekle: 'mobil-dar' },
  { ad: 'atlandi', vp: { width: 1920, height: 1080 }, atla: true, bekle: 'atlandi' },
  { ad: 'mp4-engelli', vp: { width: 1920, height: 1080 }, engel: /\.mp4(\?|$)/, bekle: 'video-inmedi' },
  { ad: 'film-betigi-yok', vp: { width: 1920, height: 1080 }, engel: /Film\.astro_astro_type_script/, bekle: 'kare-yok' },
];
/* BOZ: beklentileri bir kaydir — her kol kirmizi olmali */
if (BOZ) { const b = KOLLAR.map((k) => k.bekle); KOLLAR.forEach((k, i) => { k.bekle = b[(i + 1) % b.length]; }); }

(async () => {
  const browser = await pt.launch({ executablePath: EXE, headless: 'new' });
  console.log((await browser.version()) + ' · ' + KOK + YOL + (YEREL ? ' (yerel dosyayla karsilaniyor)' : ' (canli)') + (BOZ ? ' · BOZ=1' : ''));
  const sonuc = [];
  for (const k of KOLLAR) {
    const ctx = await browser.createBrowserContext();
    const p = await ctx.newPage();
    await p.setViewport(k.vp);
    if (k.azalt) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    if (k.atla) await p.evaluateOnNewDocument(() => { try { sessionStorage.setItem('qanat-prolog-atlandi', '1'); } catch (e) {} });
    await p.setRequestInterception(true);
    p.on('request', (r) => {
      const u = r.url();
      if (YEREL && u.split('?')[0] === KOK + YOL) return r.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: GOVDE });
      if (k.engel && k.engel.test(u)) return r.abort();
      r.continue();
    });
    await p.goto(KOK + YOL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    let h = null;
    try { await p.waitForFunction(() => document.body.dataset.hukum, { timeout: 25000 }); h = await p.evaluate(() => window.__tani); } catch (e) {}
    await ctx.close();
    const kod = h ? h.hukum : 'ZAMAN-ASIMI';
    const ok = kod === k.bekle;
    sonuc.push({ kol: k.ad, bekle: k.bekle, kod, ok, rapor: h });
    console.log((ok ? 'ok    ' : 'KALDI ') + k.ad.padEnd(16) + ' hukum=' + kod.padEnd(17) + (ok ? '' : ' (beklenen ' + k.bekle + ')')
      + (h ? ' · karar=' + h.karar + ' pencere=' + h.ortam.pencere + ' ilkKare=' + h.ilkKareMs + ' s1=' + h.sahne1 : ''));
  }
  await browser.close();
  const kaldi = sonuc.filter((s) => !s.ok).length;
  fs.writeFileSync(path.join(__dirname, 'olc-prolog-tani.json'), JSON.stringify({ _: 'yeni/film/olc-prolog-tani.cjs', olcum: new Date().toISOString(), kok: KOK, yerel: YEREL, boz: BOZ, sonuc }, null, 1));
  if (BOZ) { console.log(kaldi === sonuc.length ? '\nKIRMIZI KONTROL BASARILI (' + kaldi + '/' + sonuc.length + ' kaldi)' : '\nKIRMIZI KONTROL BASARISIZ — yalniz ' + kaldi + '/' + sonuc.length + ' kaldi'); process.exit(kaldi === sonuc.length ? 0 : 2); }
  console.log('\nHUKUM: ' + (kaldi ? 'KALDI (' + kaldi + ' kol)' : 'GECTI (' + sonuc.length + ' kol)'));
  process.exit(kaldi ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(3); });
