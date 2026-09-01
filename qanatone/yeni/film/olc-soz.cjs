#!/usr/bin/env node
/* ============================================================
   TUR 5 · HIKAYE METINLERI OLCUMU (2 Eyl 2026).
   Harita ve uygulama sartlari: yeni/film/TUR5-METIN-HARITASI.md.

   KAPILAR:
   1. GORUNURLUK: alti cumlenin her biri kendi penceresinin ortasinda
      GORUNUR (opacity > 0.9, visibility visible) — uc kosumda.
   2. PENCERE DISI: pencerenin 3 sn disinda GORUNMEZ.
   3. TEKLIK: hicbir olcum aninda birden fazla cumle gorunmez.
   4. Geri sarma: pencereye GERIDEN gelinince cumle geri gelir
      (kaydirma konumuna baglilik — zamanlayici yasak).
   RAPOR (kapi degil):
   - metinli / metinsiz (?soz=0) ayni scrub penceresinde dusen kare
     kiyasi (harita sarti "kiyas olculur"; esik verilmedi).
   - kontak: alti cumlenin ekran goruntusu yeni/film/kontak-soz/
     (KALICI — onceki kontak scratchpad'de ucup gitmisti, ders).
   TABAN DAMGASI (8a3af8b kurali): rig basina ucgen-scrub tabani;
   gurultuluyse hukum verilmez.

   KIRMIZI-ONCE: rig, motor surucusu eklenmeden ONCE kosuldu — cumleler
   DOM'da ama sinif atayan yoktu, GORUNURLUK adiyla kirmizi yandi.

   Kullanim: node yeni/film/olc-soz.cjs   (once: node yerel-sun.cjs) */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'brave';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const CIKTI = path.join(__dirname, 'olc-soz.json');
const KONTAK = path.join(__dirname, 'kontak-soz');
const TEKRAR = Number(process.env.TEKRAR || 3);
const BOSLUK_ESIK_MS = 100;
const TABAN_SN = Number(process.env.TABAN_SN ?? 10);
const TABAN_TAVAN = Number(process.env.TABAN_TAVAN ?? 1);

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const jest = (cdp, mesafe, hiz) => cdp.send('Input.synthesizeScrollGesture', {
  x: 720, y: 450, xDistance: 0, yDistance: -mesafe, speed: hiz, gestureSourceType: 'mouse', repeatCount: 0 });

const KAYITCI = `(() => {
  window.__sun = [];
  const bagla = () => {
    for (const v of document.querySelectorAll('video')) {
      if (v.__bagli || !v.requestVideoFrameCallback) continue;
      v.__bagli = true;
      const f = (now) => { __sun.push(+now.toFixed(1)); v.requestVideoFrameCallback(f); };
      v.requestVideoFrameCallback(f);
    }
  };
  bagla(); setInterval(bagla, 500);
})()`;

async function sayfaAc(browser, sorgu) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const cdp = await page.target().createCDPSession();
  await page.goto(`${SUNUCU}/yeni/film/?tavan=2${sorgu || ''}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(KAYITCI);
  await page.bringToFront();
  await page.waitForFunction('window.__fl && window.__fl.sahne()[0].durum === "hazir"', { timeout: 90000 });
  return { page, cdp };
}

/* cumle pencereleri DOM'dan okunur — rig sayilari tekrar yazmaz */
const pencereler = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.fl-soz')].map((e) => ({
    bas: +e.dataset.bas, son: +e.dataset.son, metin: e.textContent.trim().slice(0, 40) })));

const durum = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.fl-soz')].map((e) => {
    const s = getComputedStyle(e);
    return { op: +s.opacity, gor: s.visibility === 'visible' };
  }));

async function git(page, T) {
  await page.evaluate((t) => { scrollTo(0, window.__fl.konum(t)); window.__fl.atla(); }, T);
  await bekle(650);   /* yay otursun + .4s gecis bitsin */
}

async function taban(browser) {
  const { page } = await sayfaAc(browser, '');
  const sun = await page.evaluate(async (ms) => {
    const v = document.querySelector('.fl-sahne video');
    if (!v || !v.src) return null;
    const eskiAkis = window.__fl.akis; window.__fl.akis = 0;
    const sure = Math.max(1, v.duration - 0.2);
    window.__sun.length = 0;
    await new Promise((res) => {
      const t0 = performance.now();
      const adim = () => {
        const gecen = performance.now() - t0;
        if (gecen >= ms) return res();
        const faz = (gecen / 1000) % (2 * sure);
        const hedef = faz < sure ? faz : 2 * sure - faz;
        if (Math.abs(v.currentTime - hedef) > 1 / 48) v.currentTime = hedef;
        requestAnimationFrame(adim);
      };
      requestAnimationFrame(adim);
    });
    window.__fl.akis = eskiAkis;
    return window.__sun.slice();
  }, TABAN_SN * 1000);
  await page.close();
  if (!sun || sun.length < 2) return { sayi: null, gecerli: false, not: 'sunum alinamadi' };
  let sayi = 0;
  const s = [...sun].sort((a, b) => a - b);
  for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] > BOSLUK_ESIK_MS) sayi++;
  return { sayi, sure_sn: TABAN_SN, gecerli: sayi <= TABAN_TAVAN };
}

async function kosum(browser, kontakCek) {
  const { page } = await sayfaAc(browser, '');
  const P = await pencereler(page);
  const sonuc = [];
  for (let i = 0; i < P.length; i++) {
    const orta = (P[i].bas + P[i].son) / 2;
    /* GERIDEN GELME (kapi 4): once pencerenin 3 sn ONUNE, sonra icine —
       gorunum "oraya kaydirilinca" dogmali. */
    await git(page, Math.max(0, P[i].bas - 3));
    const once = await durum(page);
    await git(page, orta);
    const icinde = await durum(page);
    if (kontakCek) {
      fs.mkdirSync(KONTAK, { recursive: true });
      await page.screenshot({ path: path.join(KONTAK, `soz${i + 1}.jpg`), type: 'jpeg', quality: 72 });
    }
    /* pencerenin 3 sn ARKASI (kapi 2) */
    await git(page, Math.min(P[i].son + 3, (await page.evaluate(() => window.__fl.toplam)) - 0.2));
    const sonra = await durum(page);
    sonuc.push({
      cumle: P[i].metin,
      gorundu: icinde[i].op > 0.9 && icinde[i].gor,
      oncesinde_yok: !(once[i].op > 0.05 && once[i].gor),
      sonrasinda_yok: !(sonra[i].op > 0.05 && sonra[i].gor),
      tek: icinde.filter((d) => d.op > 0.05 && d.gor).length <= 1,
    });
  }
  /* GERI SARMA: son pencereden ilkine geri don — cumle 1 GERI GELMELI */
  await git(page, (P[0].bas + P[0].son) / 2);
  const geri = await durum(page);
  const geriGeldi = geri[0].op > 0.9 && geri[0].gor;
  await page.close();
  return { cumleler: sonuc, geri_sarmada_geldi: geriGeldi };
}

/* dusen kare kiyasi: cumle-1 penceresini kapsayan scrubda (0 -> 8 sn)
   sunum bosluklari, metinli vs ?soz=0 */
async function dusenKiyas(browser, sorgu) {
  const { page, cdp } = await sayfaAc(browser, sorgu);
  await page.evaluate(() => { scrollTo(0, 0); window.__fl.atla(); });
  await bekle(400);
  await page.evaluate(() => { window.__sun.length = 0; });
  const hedefPx = await page.evaluate(() => window.__fl.konum(8));
  const t0 = Date.now();
  while (Date.now() - t0 < 5000) {
    const y = await page.evaluate(() => scrollY);
    if (y >= hedefPx - 4) break;
    await jest(cdp, Math.min(600, hedefPx - y), 900);
  }
  const sun = await page.evaluate(() => window.__sun.slice());
  await page.close();
  let sayi = 0, toplam = 0;
  const s = [...sun].sort((a, b) => a - b);
  for (let i = 1; i < s.length; i++) { const d = s[i] - s[i - 1]; if (d > BOSLUK_ESIK_MS) { sayi++; toplam += d; } }
  return { dusen: sayi, toplam_ms: +toplam.toFixed(0), sunum_ornek: s.length };
}

(async () => {
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980', '--autoplay-policy=no-user-gesture-required',
      '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 600000,
  });
  const surum = await browser.version();
  console.log(`TARAYICI : ${TARAYICI} · ${surum}`);

  console.log('taban penceresi ...');
  const tb = await taban(browser);
  console.log(`  taban ${tb.sayi} → ${tb.gecerli ? 'sakin' : 'ORTAM GURULTULU'}\n`);

  const kosumlar = [];
  for (let i = 0; i < TEKRAR; i++) {
    const k = await kosum(browser, i === 0);
    kosumlar.push(k);
    const ozet = k.cumleler.map((c) => (c.gorundu && c.oncesinde_yok && c.sonrasinda_yok && c.tek ? '+' : 'X')).join('');
    console.log(`  [${i + 1}/${TEKRAR}] ${ozet} · geri-sarma ${k.geri_sarmada_geldi ? '+' : 'X'}`);
  }

  console.log('dusen kare kiyasi (cumle-1 penceresi, 0-8 sn) ...');
  const metinli = await dusenKiyas(browser, '');
  const metinsiz = await dusenKiyas(browser, '&soz=0');
  console.log(`  metinli ${metinli.dusen} (${metinli.toplam_ms} ms) · metinsiz ${metinsiz.dusen} (${metinsiz.toplam_ms} ms)`);
  await browser.close();

  const kapilar = {
    gorunurluk: kosumlar.every((k) => k.cumleler.every((c) => c.gorundu)) ? 'GECTI' : 'KALDI',
    pencere_disi: kosumlar.every((k) => k.cumleler.every((c) => c.oncesinde_yok && c.sonrasinda_yok)) ? 'GECTI' : 'KALDI',
    teklik: kosumlar.every((k) => k.cumleler.every((c) => c.tek)) ? 'GECTI' : 'KALDI',
    geri_sarma: kosumlar.every((k) => k.geri_sarmada_geldi) ? 'GECTI' : 'KALDI',
  };
  const hukum = !tb.gecerli ? 'ORTAM-GURULTULU (hukum verilmez)'
    : (Object.values(kapilar).every((x) => x === 'GECTI') ? 'GECTI' : 'KALDI');
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/olc-soz.cjs — TUR 5 hikaye metinleri kapilari. Pencereler DOM data-bas/son (kaynak TUR5-METIN-HARITASI.md). Dusen kiyasi RAPOR. Kontak: kontak-soz/soz1-6.jpg.',
    olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, tekrar: TEKRAR,
    taban_tavan: TABAN_TAVAN, taban: tb,
    hukum, kapilar, dusen_kiyasi: { metinli, metinsiz }, kosum: kosumlar,
  }, null, 1));
  console.log(`\nHUKUM: ${hukum} · ${JSON.stringify(kapilar)}\n→ ${CIKTI}`);
})().catch((e) => { console.error(e); process.exit(1); });
