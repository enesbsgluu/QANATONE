#!/usr/bin/env node
/* TUVAL CIZIM TAMPONU — zoom'da ne kadar buyuyor? (7 Eyl 2026)

   SORU: Enes yakinlastirinca sekme cokuyor. Katman bellegi yariya
   indirildi ama cokme surdu, yani bolen baska. Sonraki supheli BIZIM
   KODUMUZ: `kabuk/tup.js` WebGL alanini kurarken `devicePixelRatio`yu
   gecici olarak min(dpr,1.25)e kapatiyor — AMA YALNIZ KURULUM ANINDA;
   hemen ardindan gercek deger geri veriliyor. Kutuphane pencere
   degisiminde dpr'yi YENIDEN okuyorsa, zoom 2'de cizim tamponu
   viewport x 2 olur; piksel sayisi DORT katina cikar. Intel UHD gibi
   paylasimli bellekli bir kartta GPU sureci orada olebilir.

   OLCULEN, TAHMIN YOK:
     · canvas.width/height  = GERCEK cizim tamponu (aygit pikseli)
     · clientWidth/Height   = CSS kutusu
     · oran                 = tampon / CSS  (etkin dpr)
     · MAX_TEXTURE_SIZE ve tamponun ona orani
     · devicePixelRatio
   Zoom kademesi basina tarayici `--force-device-scale-factor` ile
   yeniden baslatilir (Emulation ile verilen dpr sayfaya GECMIYOR —
   olculdu, olc-zoom-cokme.cjs kunyesi).                                */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'chrome';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const KADEMELER = (process.env.KADEMELER || '1,1.5,2,2.5').split(',').map(Number);
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-tuval-tampon.json');

(async () => {
  const exe = TARAYICILAR[TARAYICI];
  if (!fs.existsSync(exe)) { console.error(`TARAYICI YOK: ${exe}`); process.exit(1); }
  console.log(`TARAYICI : ${TARAYICI} · ${SUNUCU}/ · prolog atlanmis (tuval ancak film bitince kurulur)`);
  const kayit = [];
  for (const z of KADEMELER) {
    const b = await pt.launch({ executablePath: exe, headless: false,
      args: ['--no-first-run', '--no-default-browser-check', `--force-device-scale-factor=${z}`],
      defaultViewport: null });
    try {
      const page = await b.newPage();
      await page.evaluateOnNewDocument("try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}");
      let cokme = null;
      page.on('error', (e) => { cokme = cokme || String(e).slice(0, 160); });
      await page.goto(`${SUNUCU}/`, { waitUntil: 'load', timeout: 45000 });
      /* tup adasi: IO + data-film + 800 ms + bosta + 210 KB indirme */
      await page.waitForFunction('!!window.__tubes', { timeout: 25000, polling: 200 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2500));
      const d = await page.evaluate(() => {
        const cv = document.getElementById('tubes');
        if (!cv) return { tuval: 'yok' };
        const g = cv.getContext('webgl2') || cv.getContext('webgl');
        return {
          kuruldu: !!window.__tubes,
          tampon_en: cv.width, tampon_boy: cv.height,
          css_en: cv.clientWidth, css_boy: cv.clientHeight,
          dpr: devicePixelRatio,
          maks_doku: g ? g.getParameter(g.MAX_TEXTURE_SIZE) : null,
          maks_ciz_tampon: g ? Array.from(g.getParameter(g.MAX_VIEWPORT_DIMS) || []) : null,
          baglam_kayip: g ? g.isContextLost() : null,
        };
      }).catch((e) => ({ hata: String(e).slice(0, 120) }));
      const piksel = d.tampon_en && d.tampon_boy ? (d.tampon_en * d.tampon_boy) / 1e6 : null;
      const etkin = d.tampon_en && d.css_en ? Number((d.tampon_en / d.css_en).toFixed(2)) : null;
      const s = { zoom: z, ...d, tampon_mp: piksel && Number(piksel.toFixed(2)), etkin_dpr: etkin, cokme };
      kayit.push(s);
      console.log(`zoom ${String(z).padEnd(4)} · dpr ${String(d.dpr).padEnd(5)} · kuruldu ${d.kuruldu ? 'E' : 'h'} · CSS ${d.css_en}x${d.css_boy} · TAMPON ${d.tampon_en}x${d.tampon_boy} = ${piksel ? piksel.toFixed(2) : '—'} MP · etkin dpr ${etkin} · maks doku ${d.maks_doku}${cokme ? '  !! ' + cokme : ''}`);
    } catch (e) {
      kayit.push({ zoom: z, hata: String(e).slice(0, 160) });
      console.log(`zoom ${z} · !! ${String(e).slice(0, 160)}`);
    } finally { await b.close().catch(() => {}); }
  }
  fs.writeFileSync(CIKTI, JSON.stringify({ _: 'olc-tuval-tampon.cjs — TESHIS, kapi degil.', olcum: new Date().toISOString(), tarayici: TARAYICI, kademeler: kayit }, null, 1));
  console.log(`\n→ ${CIKTI}`);
})();
