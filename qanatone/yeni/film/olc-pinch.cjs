#!/usr/bin/env node
/* MOBIL PINCH ZOOM — DOGRU TAKLIT (8 Eyl 2026).

   NEDEN YENI ARAC: 7-8 Eyl'in butun zoom araclari `Emulation.
   setDeviceMetricsOverride` kullaniyor — bu MASAUSTU zoom'udur (Ctrl+tekerlek):
   CSS gorunum penceresi KUCULUR, dpr BUYUR, sayfa YENIDEN YERLESIR.
   Mobildeki parmakla yakinlastirma BASKA BIR SEYDIR:
     · layout viewport DEGISMEZ  · devicePixelRatio DEGISMEZ
     · yeniden yerlesim YOK
     · degisen tek sey GORSEL olcek: `visualViewport.scale`
   Tarayici sayfayi yeniden yerlestirmez ama gosterilen bolgeyi DAHA YUKSEK
   COZUNURLUKTE YENIDEN RASTERLER — yani bedeli tamamen kompozitor/GPU
   tarafindadir ve KATMAN sayisi x alan ile buyur.
   Yani mobil cokme dort turdur YANLIS MEKANIZMAYLA aranmis olabilir.
   Dogru kol: `Emulation.setPageScaleFactor` (gercek pinch).

   BU ARAC OLCER:
     1. pinch kademe kademe (1 -> 5) uygulanir, her kademede sayfa YASIYOR MU
     2. cokme kaydi: Inspector.targetCrashed · page error/crash · konsol
        · webglcontextlost · tarayici stderr
     3. bellek: JS yigini + Performance.getMetrics (LayoutObjects, Nodes,
        JSHeapUsedSize) + LayerTree toplam katman alani (MP)
     4. kare: her kademede rAF p50/p95 (kompozitor isi ana ipligi bekletiyor mu)
     5. AYNI SAYFA masaustu zoom koluyla da kosulur — ikisi yan yana konur

   RIG KENDINI DOGRULAR: `visualViewport.scale` istenen kademeye GECMEZSE
   kademe HUKUMSUZ yazilir (pinch uygulanmamis demektir). dpr ve innerWidth
   DEGISMEMELIDIR — degisiyorsa taklit pinch degil masaustu zoom'udur.     */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'chrome';
const ADRES = process.env.ADRES || 'http://127.0.0.1:8790/';
const KADEMELER = (process.env.KADEMELER || '1,1.5,2,3,4,5').split(',').map(Number);
const TUR = Number(process.env.TUR || 2);          /* kademe dizisi kac kez gezilir */
const CIHAZ = process.env.CIHAZ || '412x915';      /* mobil gorunum */
const KOL = process.env.KOL || 'pinch';            /* pinch | masaustu */
const CIKTI = path.join(__dirname, process.env.CIKTI || `olc-pinch-${KOL}.json`);

(async () => {
  const exe = TARAYICILAR[TARAYICI];
  if (!fs.existsSync(exe)) { console.error(`TARAYICI YOK: ${exe}`); process.exit(1); }
  const [CEN, CBOY] = CIHAZ.split('x').map(Number);
  console.log(`TARAYICI : ${TARAYICI} · ${ADRES}`);
  console.log(`KOL      : ${KOL === 'pinch' ? 'PINCH (setPageScaleFactor) — layout ve dpr DEGISMEZ' : 'MASAUSTU (setDeviceMetricsOverride) — layout kuculur, dpr buyur'}`);
  console.log(`CIHAZ    : ${CEN}x${CBOY} · kademeler ${KADEMELER.join(' · ')} · ${TUR} tur`);

  const gunluk = [];
  const b = await pt.launch({ executablePath: exe, headless: false,
    args: ['--no-first-run', '--no-default-browser-check'], defaultViewport: null,
    dumpio: false });
  /* tarayici stderr: renderer cokmesi cogu zaman yalniz burada gorunur */
  try {
    const p = b.process();
    if (p && p.stderr) p.stderr.on('data', (d) => {
      const t = String(d);
      if (/crash|out of memory|OOM|GPU process|lost context|Fatal/i.test(t)) gunluk.push({ tip: 'stderr', metin: t.slice(0, 200) });
    });
  } catch (e) {}

  let coktu = null, sonKademe = null, sayac = 0;
  const page = await b.newPage();
  await page.evaluateOnNewDocument("try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}"
    + ";globalThis.__kayip=0;addEventListener('webglcontextlost',()=>{globalThis.__kayip++},true);");
  page.on('error', (e) => { coktu = coktu || { nerede: 'page error', kademe: sonKademe, sayac, mesaj: String(e).slice(0, 200) }; });
  page.on('console', (m) => { if (m.type() === 'error') gunluk.push({ tip: 'konsol', metin: m.text().slice(0, 160) }); });
  const cdp = await page.createCDPSession();
  cdp.on('Inspector.targetCrashed', () => { coktu = coktu || { nerede: 'targetCrashed', kademe: sonKademe, sayac }; });
  await cdp.send('Inspector.enable').catch(() => {});
  await cdp.send('Performance.enable').catch(() => {});
  await cdp.send('LayerTree.enable').catch(() => {});

  /* MOBIL GORUNUM — her iki kolda da AYNI, tek degisken zoom mekanizmasi */
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: CEN, height: CBOY, deviceScaleFactor: 3, mobile: true });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }).catch(() => {});
  await page.goto(ADRES, { waitUntil: 'load', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));

  const taban = await page.evaluate(`({
    dpr: devicePixelRatio, en: innerWidth, boy: innerHeight,
    olcek: visualViewport ? visualViewport.scale : null,
    yukseklik: document.documentElement.scrollHeight,
    film: document.documentElement.dataset.film || null,
    tubes: !!window.__tubes,
  })`);
  console.log(`  taban: dpr ${taban.dpr} · css ${taban.en}x${taban.boy} · olcek ${taban.olcek} · belge boyu ${taban.yukseklik} px · film ${taban.film} · tubes ${taban.tubes ? 'ACIK' : 'yok'}`);

  const katmanOlc = async () => {
    try {
      const { layers } = await cdp.send('LayerTree.compositingReasons', { layerId: '0' }).then(() => ({ layers: null })).catch(() => ({ layers: null }));
      return layers;
    } catch (e) { return null; }
  };
  let katmanlar = null;
  cdp.on('LayerTree.layerTreeDidChange', (e) => { katmanlar = e.layers || null; });

  const olc = async (z) => {
    const m = await cdp.send('Performance.getMetrics').catch(() => ({ metrics: [] }));
    const M = Object.fromEntries((m.metrics || []).map((x) => [x.name, x.value]));
    const kare = await page.evaluate(`(async () => {
      const a = []; let son = performance.now();
      await new Promise((res) => { let k = 0;
        const t = () => { const s = performance.now(); a.push(s - son); son = s;
          if (++k < 90) requestAnimationFrame(t); else res(); };
        requestAnimationFrame(t); });
      const b = a.slice(5).sort((x, y) => x - y);
      return { p50: b[Math.floor(b.length * .5)], p95: b[Math.floor(b.length * .95)], max: b[b.length - 1],
        yigin: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
        kayip: globalThis.__kayip || 0,
        dpr: devicePixelRatio, en: innerWidth, olcek: visualViewport ? visualViewport.scale : null };
    })()`).catch((e) => { coktu = coktu || { nerede: 'evaluate', kademe: z, sayac, mesaj: String(e).slice(0, 160) }; return null; });
    if (!kare) return null;
    const katmanAlan = katmanlar ? katmanlar.reduce((a, L) => a + (L.width * L.height), 0) / 1e6 : null;
    return { ...kare, katman_sayi: katmanlar ? katmanlar.length : null,
      katman_mp: katmanAlan ? Number(katmanAlan.toFixed(1)) : null,
      dugum: M.Nodes || null, duzen_nesnesi: M.LayoutObjects || null,
      js_yigin_mb: M.JSHeapUsedSize ? Math.round(M.JSHeapUsedSize / 1048576) : null };
  };

  const kayit = [];
  for (let t = 1; t <= TUR && !coktu; t++) {
    for (const z of KADEMELER) {
      if (coktu) break;
      sonKademe = z; sayac++;
      try {
        if (KOL === 'pinch') {
          await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: z });
        } else {
          await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: Math.round(CEN / z), height: Math.round(CBOY / z),
            deviceScaleFactor: 3 * z, mobile: true });
        }
      } catch (e) { coktu = { nerede: 'zoom komutu', kademe: z, sayac, mesaj: String(e).slice(0, 160) }; break; }
      await new Promise((r) => setTimeout(r, 1400));
      const d = await olc(z);
      if (!d) break;
      /* RIG DOGRULAMASI */
      let hukumsuz = null;
      if (KOL === 'pinch') {
        if (Math.abs((d.olcek || 0) - z) > 0.05) hukumsuz = `olcek ${d.olcek} != ${z}`;
        else if (Math.abs(d.dpr - taban.dpr) > 0.01 || d.en !== taban.en) hukumsuz = 'pinch layout/dpr DEGISTIRDI — taklit yanlis';
      } else if (Math.abs(d.en - CEN / z) > 2) hukumsuz = `css en ${d.en} != ${Math.round(CEN / z)}`;
      kayit.push({ tur: t, zoom: z, ...d, hukumsuz });
      console.log(`  tur${t} z${String(z).padEnd(4)} · olcek ${d.olcek} · dpr ${d.dpr} · css ${d.en} · rAF p50 ${d.p50.toFixed(1)} p95 ${d.p95.toFixed(1)} max ${d.max.toFixed(1)} ms · katman ${d.katman_sayi}/${d.katman_mp} MP · JS ${d.js_yigin_mb} MB · dugum ${d.dugum}${d.kayip ? ' · !! WEBGL BAGLAM KAYBI ' + d.kayip : ''}${hukumsuz ? '  !! HUKUMSUZ: ' + hukumsuz : ''}`);
    }
  }

  const yasiyor = await page.evaluate('1+1').then((x) => x === 2).catch(() => false);
  console.log(`\nSONUC: ${coktu ? 'COKME — ' + JSON.stringify(coktu) : 'cokme yok'} · sayfa ${yasiyor ? 'YASIYOR' : 'OLU'} · ${sayac} zoom degisimi`);
  if (gunluk.length) console.log('gunluk: ' + gunluk.slice(0, 5).map((g) => g.tip + ': ' + g.metin.slice(0, 90)).join(' | '));

  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'olc-pinch.cjs — TESHIS. KOL=pinch: gercek mobil parmak zoom (setPageScaleFactor, layout ve dpr DEGISMEZ). KOL=masaustu: Ctrl+tekerlek taklidi (setDeviceMetricsOverride).',
    olcum: new Date().toISOString(), tarayici: TARAYICI, adres: ADRES, kol: KOL, cihaz: CIHAZ,
    taban, kademeler: kayit, coktu, yasiyor, gunluk }, null, 1));
  console.log(`\n→ ${CIKTI}`);
  await b.close().catch(() => {});
})();
