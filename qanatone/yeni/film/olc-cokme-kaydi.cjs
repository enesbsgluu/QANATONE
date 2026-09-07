#!/usr/bin/env node
/* COKME KAYDI — sekme neden oluyor? (7 Eyl 2026)

   Enes: "yakinlastirinca sayfa hata verip kapaniyor" — katman bellegi
   yariya indirildikten SONRA da suruyor. Iki hipotez olculup dustu:
     · katman bellegi  : yariya indi, cokme surdu
     · WebGL cizim tamponu : zoom'la BUYUMUYOR (etkin dpr her kademede 2,
                             tampon ~2,5-3 MP sabit)
   Tahmin sirasi bitti; bu arac COKMENIN KENDI KAYDINI toplar.

   NE TOPLANIR:
     · tarayici stderr gunlugu (--enable-logging=stderr --v=1) —
       GPU/renderer surec olumleri, OOM, baglam kaybi burada yazar
     · CDP `Inspector.targetCrashed` olayi (sekme gercekten coktuyse)
     · WebGL baglam kaybi olayi (webglcontextlost) — sayfa icinden
     · bellek: performance.memory + katman alani
   SENARYO gercek kullanimi taklit eder: zoom'lu acilis, prolog boyunca
   agresif kaydirma, sonra hero'da bekleme. Cokerse hangi adimda ve
   gunlugun son satirlariyla yazilir.

   NOT: cikis kodu her zaman 0 — bu bir kapi degil, kayit aracidir.     */
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
const ZOOM = Number(process.env.ZOOM || 2);
const ATLA = process.env.ATLA === '1';
const TUR = Number(process.env.TUR || 30);          /* kac kaydirma adimi */
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-cokme-kaydi.json');

(async () => {
  const exe = TARAYICILAR[TARAYICI];
  if (!fs.existsSync(exe)) { console.error(`TARAYICI YOK: ${exe}`); process.exit(1); }
  console.log(`TARAYICI : ${TARAYICI} · ${ADRES} · zoom ${ZOOM} · prolog ${ATLA ? 'atlanmis' : 'ACIK'} · ${TUR} adim`);

  const gunluk = [];
  const b = await pt.launch({ executablePath: exe, headless: false,
    args: ['--no-first-run', '--no-default-browser-check',
      `--force-device-scale-factor=${ZOOM}`, '--enable-logging=stderr', '--v=1'],
    defaultViewport: null, dumpio: false });
  /* stderr'i yakala: puppeteer surec nesnesini verir */
  const p0 = b.process();
  if (p0 && p0.stderr) p0.stderr.on('data', (d) => {
    String(d).split('\n').forEach((s) => {
      if (/crash|GPU process|OOM|out of memory|context lost|Fatal|ERROR:|lost the GPU|exited/i.test(s)) gunluk.push(s.trim().slice(0, 220));
    });
  });

  let coktu = null, adim = 0;
  const page = await b.newPage();
  if (ATLA) await page.evaluateOnNewDocument("try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}");
  /* WebGL baglam kaybi sayfanin ICINDEN de izlenir */
  await page.evaluateOnNewDocument(`(()=>{globalThis.__kayip=[];addEventListener('webglcontextlost',e=>globalThis.__kayip.push('lost@'+Math.round(performance.now())),true);})()`);
  page.on('error', (e) => { coktu = coktu || { nerede: 'page error', adim, mesaj: String(e).slice(0, 200) }; });

  try {
    const cdp = await page.createCDPSession();
    cdp.on('Inspector.targetCrashed', () => { coktu = coktu || { nerede: 'Inspector.targetCrashed', adim }; });
    await cdp.send('Inspector.enable').catch(() => {});
    await page.goto(ADRES, { waitUntil: 'load', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 3000));

    for (adim = 1; adim <= TUR && !coktu; adim++) {
      await cdp.send('Input.synthesizeScrollGesture',
        { x: 400, y: 300, xDistance: 0, yDistance: -1800, speed: 6000, gestureSourceType: 'mouse' }).catch((e) => {
          coktu = coktu || { nerede: 'scroll', adim, mesaj: String(e).slice(0, 160) };
        });
      if (adim % 6 === 0) {
        const d = await page.evaluate(() => ({
          y: Math.round(scrollY),
          yigin: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
          kayip: (globalThis.__kayip || []).length,
        })).catch((e) => { coktu = coktu || { nerede: 'evaluate', adim, mesaj: String(e).slice(0, 160) }; return null; });
        if (d) console.log(`  adim ${String(adim).padStart(3)} · scrollY ${String(d.y).padStart(7)} · yigin ${d.yigin} MB · baglam kaybi ${d.kayip}`);
      }
    }
    await new Promise((r) => setTimeout(r, 2500));
  } catch (e) {
    coktu = coktu || { nerede: 'genel', adim, mesaj: String(e).slice(0, 200) };
  }

  let yasiyor = false;
  try { yasiyor = await page.evaluate(() => 1 + 1 === 2); } catch (e) { yasiyor = false; }
  console.log(`\nSONUC: ${coktu ? 'COKME — ' + JSON.stringify(coktu) : 'cokme yok'} · sayfa ${yasiyor ? 'YASIYOR' : 'OLU'}`);
  if (gunluk.length) {
    console.log('GUNLUKTEN (son 12 ilgili satir):');
    gunluk.slice(-12).forEach((s) => console.log('   ' + s));
  } else console.log('GUNLUK: ilgili satir yok');
  fs.writeFileSync(CIKTI, JSON.stringify({ _: 'olc-cokme-kaydi.cjs — TESHIS, kapi degil.', olcum: new Date().toISOString(), tarayici: TARAYICI, adres: ADRES, zoom: ZOOM, prolog_atlandi: ATLA, coktu, yasiyor, gunluk }, null, 1));
  console.log(`→ ${CIKTI}`);
  await b.close().catch(() => {});
})();
