#!/usr/bin/env node
/* TIPOGRAFI TASMA KAPISI (SOKUM VE TASIMA TURU, 4 Eyl 2026).
   Talimat: "Uretilen ciktida eski govde ailesi icin 0 eslesme, TR ve EN
   butun sayfalarda tasma yok." Bu rig ikinci yariyi olcer: dist
   altindaki HER sayfa (TR+EN) iki genislikte (1440 masaustu, 390 telefon)
   gercek tarayicida acilir;
     (a) sayfa yatay tasmiyor: documentElement.scrollWidth <= clientWidth
     (b) hicbir metin tasiyan eleman kendi kutusundan tasmiyor
         (scrollWidth > clientWidth+1 ve overflow visible/clip degil)
         — nowrap/kapsul/kunye satirlari Uncut Sans'ta genisledi mi?
   Font gercekten Uncut Sans mi: her sayfada body'nin computed font-family
   ilk ailesi + document.fonts'ta yuklenmis yuz adi yazilir.
   KIRMIZI-ONCE: ?boz=tasma kolu yok; kirmizi kontrol icin ESKI dist
   (Nunito) ayni rigle kosulur — font satirlari 'Nunito' gosterir, aile
   kapisi adiyla kirmizi olur. Sonra yeni dist.
   Kullanim: node yeni/film/olc-tasma.cjs   (once: node yerel-sun.cjs) */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const DIST = path.join(__dirname, '..', '..', 'dist');
const CIKTI = path.join(__dirname, 'olc-tasma.json');
const CHROME = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
const GENISLIK = [[1440, 900], [390, 844]];
const ESKI_AILE = /Nunito|JetBrains|Manrope|\bInter\b/;

const sayfalar = [];
/* KOK=1: KIRMIZI KONTROL — ayni rig ESKI siteye (dist/*.html, Google CDN
   Manrope/Inter/JetBrains) kosulur; aile kapisi adiyla kirmizi olmali. */
if (process.env.KOK === '1') {
  for (const f of ['index.html', 'hizmetler.html', 'otomasyon.html', 'sss.html'])
    if (fs.existsSync(path.join(DIST, '..', f))) sayfalar.push('/' + f);
}
else (function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(_astro|font|img|varlik)$/.test(e.name)) gez(p); }
    else if (e.name === 'index.html' || e.name === '404.html') sayfalar.push('/yeni/' + path.relative(DIST, p).replace(/\\/g, '/').replace(/index\.html$/, ''));
  }
})(DIST);

(async () => {
  const browser = await pt.launch({ executablePath: CHROME, headless: true, args: ['--window-size=1460,980'], defaultViewport: null, protocolTimeout: 300000 });
  const page = await browser.newPage();
  const sonuc = [];
  for (const yol of sayfalar.sort()) {
    for (const [w, h] of GENISLIK) {
      await page.setViewport({ width: w, height: h });
      await page.goto(SUNUCU + yol, { waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});
      /* film/deneme sayfalari: motor beklenmez; yazi yerlesimi yeter */
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(() => {
        const de = document.documentElement;
        const sayfaTasma = de.scrollWidth - de.clientWidth;
        const tasan = [];
        for (const el of document.querySelectorAll('body *')) {
          if (!el.textContent || !el.textContent.trim()) continue;
          if (el.closest('canvas,svg,video,script,style,template')) continue;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          if (cs.overflowX !== 'visible') continue;
          if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
            /* yalniz kendi metni tasan: cocuklari ayrica olculur */
            const kendi = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
            if (kendi) tasan.push({ sec: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''), fark: el.scrollWidth - el.clientWidth, metin: el.textContent.trim().slice(0, 30) });
          }
        }
        const bodyAile = getComputedStyle(document.body).fontFamily.split(',')[0].replace(/["']/g, '');
        const yuzler = [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))];
        return { sayfaTasma, tasan: tasan.slice(0, 6), tasanSayi: tasan.length, bodyAile, yuzler };
      });
      sonuc.push({ yol, w, ...r });
      const ok = r.sayfaTasma <= 0 && r.tasanSayi === 0;
      console.log(`${ok ? 'ok ' : 'XX '} ${yol.padEnd(34)} ${String(w).padStart(4)}  sayfa+${r.sayfaTasma}  tasan ${r.tasanSayi}${r.tasanSayi ? ' ' + JSON.stringify(r.tasan[0]) : ''}  ${r.bodyAile} [${r.yuzler.join(',')}]`);
    }
  }
  await browser.close();
  const aile = sonuc.every((s) => !ESKI_AILE.test(s.bodyAile) && !s.yuzler.some((y) => ESKI_AILE.test(y)));
  const tasma = sonuc.every((s) => s.sayfaTasma <= 0 && s.tasanSayi === 0);
  const hukum = aile && tasma ? 'GECTI' : 'KALDI';
  fs.writeFileSync(CIKTI, JSON.stringify({ _: 'yeni/film/olc-tasma.cjs — tipografi tasma + aile kapisi, dist tum sayfalar x 2 genislik', olcum: new Date().toISOString(), sayfa: sayfalar.length, aile_kapisi: aile ? 'GECTI' : 'KALDI', tasma_kapisi: tasma ? 'GECTI' : 'KALDI', hukum, sonuc }, null, 1));
  console.log(`\nsayfa ${sayfalar.length} x ${GENISLIK.length} · aile ${aile ? 'GECTI' : 'KALDI'} · tasma ${tasma ? 'GECTI' : 'KALDI'} → HUKUM ${hukum}\n→ ${CIKTI}`);
  process.exit(hukum === 'GECTI' ? 0 : 2);
})().catch((e) => { console.error(e); process.exit(1); });
