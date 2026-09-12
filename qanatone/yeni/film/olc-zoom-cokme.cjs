#!/usr/bin/env node
/* ZOOM COKMESI — TESHIS ARACI (7 Eyl 2026, Enes: "hem pc'den hem
   masaustunden yakinlastirma yapinca sayfa hata verip kapaniyor").

   HIPOTEZ (olculecek, varsayilmayacak): tarayici yakinlastirmasi CSS
   pikselini buyutur, yani ayni sayfa daha fazla AYGIT pikseli kaplar.
   Kompozit katmanlarin alani zoom'un KARESIYLE buyur. Ana sayfa girisi
   olculdu: 51 katman / 154 MP (bkz. olc-katman.cjs). 2x zoom'da bu
   ~616 MP'e cikar; GPU surecinin katman belleği tukenirse sekme coker
   ("Aw, Snap"). Tumlesik kartta esik daha erken gelir.

   NE OLCULUYOR: zoom kademe kademe artirilir, her kademede
     · sayfa hala yasiyor mu (crash olayi)
     · kompozit katman sayisi ve TOPLAM ALAN
     · JS yigin kullanimi
   Cokme hangi kademede geldigi ve o anki katman alani YAZILIR — boylece
   "coktu" bir sikayet degil, esikli bir olcum olur.

   RIG DERSI (ilk yazim CURUDU): `Emulation.setDeviceMetricsOverride`
   ile verilen `deviceScaleFactor` SAYFAYA GECMEDI — `devicePixelRatio`
   1'de kaldi ve katman alani BUYUYECEGINE kuculdu (154 -> 29,5 MP).
   O kosum zoom'u degil, dar pencereyi olcmustu; hipotezi hic
   sinamamisti. Artik her kademe icin tarayici
   `--force-device-scale-factor=<z>` ile YENIDEN BASLATILIR: bu, CSS
   pikseli basina dusen aygit pikselini gercekten degistirir, yani
   Ctrl+'+' ile ayni isi yaptirir. Rig kendini dogrular: olculen dpr
   istenen z'ye esit degilse kademe HUKUMSUZ yazilir.                  */
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
const YOL = process.env.SAYFA_YOL || '/';
const EN = Number(process.env.EN || 1920);
const BOY = Number(process.env.BOY || 1080);
const ATLA = process.env.ATLA !== '0';
const KADEMELER = (process.env.KADEMELER || '1,1.25,1.5,1.75,2,2.5,3,4,5')
  .split(',').map(Number);
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-zoom-cokme.json');

(async () => {
  const exe = TARAYICILAR[TARAYICI];
  if (!fs.existsSync(exe)) { console.error(`TARAYICI YOK: ${exe}`); process.exit(1); }
  console.log(`TARAYICI : ${TARAYICI} · ${SUNUCU}${YOL} · pencere ${EN}x${BOY} · prolog ${ATLA ? 'atlanmis' : 'acik'}`);
  console.log(`KADEMELER: ${KADEMELER.join(' · ')}`);

  const kayit = [];
  let coktu = null;

  for (const z of KADEMELER) {
    if (coktu) break;
    const b = await pt.launch({ executablePath: exe, headless: false,
      args: ['--no-first-run', '--no-default-browser-check', `--force-device-scale-factor=${z}`],
      defaultViewport: null });
    try {
      const page = await b.newPage();
      if (ATLA) await page.evaluateOnNewDocument("try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}");
      let cokmeOlayi = null;
      page.on('error', (e) => { cokmeOlayi = cokmeOlayi || String(e).slice(0, 200); });
      page.on('pageerror', (e) => console.log(`  [sayfa hatasi] ${String(e).slice(0, 150)}`));

      const cdp = await page.createCDPSession();
      const katmanlar = [];
      cdp.on('LayerTree.layerTreeDidChange', (e) => { katmanlar.length = 0; (e.layers || []).forEach((l) => katmanlar.push(l)); });

      await page.goto(`${SUNUCU}${YOL}`, { waitUntil: 'load', timeout: 45000 });
      await new Promise((r) => setTimeout(r, 3200));
      await cdp.send('LayerTree.enable').catch(() => {});
      await new Promise((r) => setTimeout(r, 2500));
      /* kaydirma da denenir: cokme cogu kez ilk boyamada degil, yeni
         dosemeler rasterlenirken gelir */
      await cdp.send('Input.synthesizeScrollGesture',
        { x: 400, y: 300, xDistance: 0, yDistance: -2400, speed: 1200, gestureSourceType: 'mouse' }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));

      let bilgi = null;
      try {
        bilgi = await page.evaluate(() => ({
          genislik: innerWidth, dpr: devicePixelRatio,
          yigin_mb: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
        }));
      } catch (e) { cokmeOlayi = cokmeOlayi || 'sayfa cevap vermiyor: ' + String(e).slice(0, 120); }

      const alan = katmanlar.reduce((t, l) => t + (l.width * l.height) / 1e6, 0);
      const dprTam = bilgi ? Math.abs(bilgi.dpr - z) < 0.02 : false;
      const s2 = { zoom: z, css_genislik: bilgi && bilgi.genislik, dpr: bilgi && Number(bilgi.dpr.toFixed(2)),
        dpr_uygulandi: dprTam, katman: katmanlar.length, alan_mp: Number(alan.toFixed(1)),
        yigin_mb: bilgi && bilgi.yigin_mb, cokme: cokmeOlayi };
      kayit.push(s2);
      console.log(`zoom ${String(z).padEnd(5)} · css ${String(s2.css_genislik).padStart(5)} px · dpr ${String(s2.dpr).padEnd(5)}${dprTam ? '' : ' !!UYGULANMADI'} · katman ${String(s2.katman).padStart(3)} · ALAN ${String(s2.alan_mp).padStart(7)} MP · yigin ${s2.yigin_mb} MB${cokmeOlayi ? '  !! COKME: ' + cokmeOlayi : ''}`);
      if (cokmeOlayi) coktu = { zoom: z, mesaj: cokmeOlayi };
    } catch (e) {
      coktu = { zoom: z, mesaj: String(e).slice(0, 200) };
      console.log(`zoom ${z} · !! ${coktu.mesaj}`);
    } finally { await b.close().catch(() => {}); }
  }

  const hukumsuz = kayit.filter((k) => !k.dpr_uygulandi).map((k) => k.zoom);
  console.log(`
SONUC: ${coktu ? 'COKME — ' + JSON.stringify(coktu) : 'cokme yok'}`);
  if (hukumsuz.length) console.log(`!! HUKUMSUZ KADEMELER (dpr uygulanmadi): ${hukumsuz.join(', ')} — bu kademeler zoom'u SINAMADI`);
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'olc-zoom-cokme.cjs — TESHIS, kapi degil.', olcum: new Date().toISOString(),
    tarayici: TARAYICI, pencere: `${EN}x${BOY}`, yol: YOL, kademeler: kayit, coktu,
  }, null, 1));
  console.log(`→ ${CIKTI}`);
})();
