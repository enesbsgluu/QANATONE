#!/usr/bin/env node
/* CANLI ZOOM COKMESI — Ctrl+tekerlegin taklidi (7 Eyl 2026).

   Enes'in tarifi (soruldu, cevaplandi): sayfa NORMAL halindeyken (prologda
   degil) Ctrl+fare tekerlegi ile yakinlastirinca Chrome
   "www.qanatone.com sayfasinda bircok kez hata olustu" diyor — yani
   RENDERER TEKRAR TEKRAR COKUYOR.

   NEDEN ONCEKI KOSUMLAR URETEMEDI: tarayici ZATEN yakinlastirilmis
   baslatiliyordu (--force-device-scale-factor). O yol gecisi hic
   yasamiyor. Gercek kullanimda zoom KADEME KADEME CANLI degisiyor ve her
   kademede yeniden yerlesim + yeniden rasterleme + tuval yeniden
   boyutlandirma birlikte oluyor. Bu arac onu taklit eder.

   RIG NOTU (olculdu): `Emulation.setDeviceMetricsOverride` ancak
   `defaultViewport: null` ile ve `width:0,height:0` verilerek calisir —
   bu haliyle `devicePixelRatio` gercekten degisir (1,25 -> 1,5 -> 2
   dogrulandi). Puppeteer'in kendi gorunum penceresi ayarliyken override
   sessizce yutuluyordu; ilk kosumlarim bu yuzden zoom'u hic sinamamisti.

   KOLLAR: EKCSS ile tek degisken kapatilir (ornegin `t-notubes`), boylece
   cokmenin hangi katmandan geldigi elenerek bulunur.                    */
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
const ATLA = process.env.ATLA !== '0';
const TUR = Number(process.env.TUR || 6);
const BEKLE = Number(process.env.BEKLE || 450);
const SINIF = process.env.SINIF || '';       /* html'e eklenecek sinif, or. t-notubes */
const EKCSS = process.env.EKCSS || '';       /* tek degiskenli ablasyon kolu */
const KADEMELER = (process.env.KADEMELER || '1.25,1.5,1.75,2,2.5,3,2.5,2,1.75,1.5,1.25')
  .split(',').map(Number);
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-canli-zoom.json');

(async () => {
  const exe = TARAYICILAR[TARAYICI];
  if (!fs.existsSync(exe)) { console.error(`TARAYICI YOK: ${exe}`); process.exit(1); }
  console.log(`TARAYICI : ${TARAYICI} · ${ADRES} · prolog ${ATLA ? 'atlanmis' : 'ACIK'} · ${TUR} tur x ${KADEMELER.length} kademe${SINIF ? ` · KOL: html.${SINIF}` : ''}`);

  const gunluk = [];
  const b = await pt.launch({ executablePath: exe, headless: false,
    args: ['--no-first-run', '--no-default-browser-check', '--enable-logging=stderr', '--v=1'],
    defaultViewport: null });
  const p0 = b.process();
  if (p0 && p0.stderr) p0.stderr.on('data', (d) => String(d).split('\n').forEach((s) => {
    if (/crash|GPU process|OOM|out of memory|context lost|Fatal|ERROR:|exited/i.test(s)) gunluk.push(s.trim().slice(0, 220));
  }));

  let coktu = null, sonKademe = null, sayac = 0;
  const page = await b.newPage();
  if (ATLA) await page.evaluateOnNewDocument("try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}");
  if (SINIF) await page.evaluateOnNewDocument(`(()=>{const k=()=>document.documentElement.classList.add(${JSON.stringify(SINIF)});document.documentElement?k():addEventListener('DOMContentLoaded',k,{once:true})})()`);
  await page.evaluateOnNewDocument(`(()=>{globalThis.__kayip=0;addEventListener('webglcontextlost',()=>{globalThis.__kayip++},true)})()`);
  if (EKCSS) await page.evaluateOnNewDocument(`(()=>{const k=()=>{const s=document.createElement('style');s.setAttribute('data-ablasyon','1');s.textContent=${JSON.stringify(EKCSS)};(document.head||document.documentElement).appendChild(s)};document.head?k():document.addEventListener('DOMContentLoaded',k,{once:true})})()`);
  page.on('error', (e) => { coktu = coktu || { nerede: 'page error', kademe: sonKademe, sayac, mesaj: String(e).slice(0, 200) }; });

  try {
    const cdp = await page.createCDPSession();
    cdp.on('Inspector.targetCrashed', () => { coktu = coktu || { nerede: 'targetCrashed', kademe: sonKademe, sayac }; });
    await cdp.send('Inspector.enable').catch(() => {});
    await page.goto(ADRES, { waitUntil: 'load', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 3500));
    /* GERCEK ZOOM IKI SEYI BIRDEN YAPAR: aygit pikseli/CSS pikseli orani
       BUYUR **ve** CSS gorunum penceresi KUCULUR. Ilk yazimda yalniz dpr
       degistiriliyordu (css 1036'da sabit kaldi) — yani yeniden yerlesim,
       medya sorgusu ve tuval yeniden boyutlandirma hic tetiklenmiyordu,
       zoom'un YARISI olculmustu. Pencerenin aygit genisligi bir kez
       olculur, her kademede CSS boyu ondan turetilir. */
    const taban = await page.evaluate(() => ({
      aygit_en: Math.round(innerWidth * devicePixelRatio),
      aygit_boy: Math.round(innerHeight * devicePixelRatio),
    }));
    console.log(`  pencere aygit olcusu: ${taban.aygit_en}x${taban.aygit_boy}`);
    if (SINIF) {
      const var_ = await page.evaluate((s) => document.documentElement.classList.contains(s), SINIF);
      if (!var_) throw new Error(`KOL UYGULANMADI (html.${SINIF}) — kosum hukumsuz`);
    }
    if (EKCSS) {
      const var_ = await page.evaluate(() => !!document.querySelector('style[data-ablasyon]'));
      if (!var_) throw new Error('EKCSS UYGULANMADI — kosum hukumsuz');
      console.log('  ablasyon stili UYGULANDI');
    }

    for (let t = 1; t <= TUR && !coktu; t++) {
      for (const z of KADEMELER) {
        if (coktu) break;
        sonKademe = z; sayac++;
        try {
          await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: Math.round(taban.aygit_en / z), height: Math.round(taban.aygit_boy / z),
            deviceScaleFactor: z, mobile: false });
        } catch (e) { coktu = { nerede: 'override', kademe: z, sayac, mesaj: String(e).slice(0, 160) }; break; }
        await new Promise((r) => setTimeout(r, BEKLE));
      }
      const d = await page.evaluate(() => ({
        dpr: Number(devicePixelRatio.toFixed(2)), en: innerWidth,
        yigin: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
        kayip: globalThis.__kayip || 0, tubes: !!window.__tubes,
      })).catch((e) => { coktu = coktu || { nerede: 'evaluate', kademe: sonKademe, sayac, mesaj: String(e).slice(0, 160) }; return null; });
      if (d) console.log(`  tur ${t} bitti · dpr ${d.dpr} · css ${d.en} · yigin ${d.yigin} MB · baglam kaybi ${d.kayip} · tubes ${d.tubes ? 'acik' : 'yok'}`);
      if (d && d.en === taban.aygit_en) console.log('  !! CSS genisligi degismedi — zoom taklidi EKSIK, kosum hukumsuz');
    }
  } catch (e) {
    coktu = coktu || { nerede: 'genel', kademe: sonKademe, sayac, mesaj: String(e).slice(0, 200) };
  }

  let yasiyor = false;
  try { yasiyor = await page.evaluate(() => 1 + 1 === 2); } catch (e) { yasiyor = false; }
  console.log(`\nSONUC: ${coktu ? 'COKME — ' + JSON.stringify(coktu) : 'cokme yok'} · sayfa ${yasiyor ? 'YASIYOR' : 'OLU'} · toplam ${sayac} zoom degisimi`);
  if (gunluk.length) { console.log('GUNLUKTEN:'); gunluk.slice(-10).forEach((s) => console.log('   ' + s)); }
  fs.writeFileSync(CIKTI, JSON.stringify({ _: 'olc-canli-zoom.cjs — TESHIS, kapi degil.', olcum: new Date().toISOString(), tarayici: TARAYICI, adres: ADRES, prolog_atlandi: ATLA, kol: SINIF || null, kademeler: KADEMELER, tur: TUR, zoom_degisimi: sayac, coktu, yasiyor, gunluk }, null, 1));
  console.log(`→ ${CIKTI}`);
  await b.close().catch(() => {});
})();
