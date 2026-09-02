#!/usr/bin/env node
/* HAP DOLGUSU HESAPLANMIS DEGER OLCUMU (TUR 9 T7, 3 Eyl 2026)
   Token'a baglanan hap dugmelerinin TARAYICIDA hesaplanan padding'i,
   beklenen literalle ayni mi? Kaynak metnine degil getComputedStyle'a
   bakar: var(--hap-*) dolayligi piksel degistirmedi mi, dogrudan kanit.
   Kullanim: MSYS_NO_PATHCONV=1 SUNUCU=http://127.0.0.1:8790 node yeni/film/olc-hap.cjs
   Cevre: TARAYICI=brave|chrome (varsayilan brave — Chrome'da hizlandirma kapali). */
const path = require('path');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
/* sayfa, secici, beklenen (ust sag alt sol => "y x y x") */
const HEDEF = [
  ['/yeni/', '.sh-btn', '14px 26px 14px 26px', 'olcekte: cagri'],
  ['/yeni/', '.nv-cta', '10px 18px 10px 18px', 'olcekte: kompakt'],
  ['/yeni/', '.atla', '10px 18px 10px 18px', 'olcekte: kompakt (onceki literal 10/16 — ekran disi, odakta 2 px genis)'],
  ['/yeni/', '.nv-mlg a', '8px 16px 8px 16px', 'olcekte: cip (mobil menu, DOM\'da)'],
  ['/yeni/hizmetler/seo/', '.sdbtns .dugme', '14px 26px 14px 26px', 'olcekte: cagri'],
  ['/yeni/hizmetler/seo/', '.sdbtns .dugme.koyu', '15px 32px 15px 32px', 'istisna'],
  ['/yeni/', '.sh-void', '14px 30px 14px 30px', 'istisna (kaynak sadakati)'],
  ['/yeni/sss/', '.dugme', '12px 26px 12px 26px', 'istisna'],
];
(async () => {
  const b = await pt.launch({ executablePath: TARAYICILAR[process.env.TARAYICI || 'brave'], headless: 'new', args: ['--no-sandbox'] });
  const page = await b.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem('qanat-splash-seen', '1'); } catch (e) {} });
  let kaldi = 0, son = '';
  for (const [yol, sec, beklenen, not] of HEDEF) {
    if (yol !== son) { await page.goto(SUNUCU + yol, { waitUntil: 'networkidle0', timeout: 60000 }); son = yol; }
    const olcum = await page.evaluate((s) => {
      const e = document.querySelector(s); if (!e) return null;
      const c = getComputedStyle(e); return `${c.paddingTop} ${c.paddingRight} ${c.paddingBottom} ${c.paddingLeft}`;
    }, sec);
    const ok = olcum === beklenen;
    if (!ok) kaldi++;
    console.log(`  ${ok ? 'ok ' : '!! '} ${yol.padEnd(22)} ${sec.padEnd(20)} ${String(olcum).padEnd(22)} (beklenen ${beklenen}) — ${not}`);
  }
  await b.close();
  console.log(kaldi ? `\n  ${kaldi} sapma` : '\n  hesaplanmis dolgular beklenenle ayni');
  process.exit(kaldi ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
