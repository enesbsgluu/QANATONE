#!/usr/bin/env node
/* ============================================================
   TUR 5 v2 · ANLATI METNI OLCUMU (2 Eyl 2026 gece).
   Harita: TUR5-METIN-HARITASI.md (21 blok + 6 kunye, vurus-harita.py).

   KAPILAR (talimattan):
   1. 21 blogun her biri kendi araliginda GORUNUR — uc kosumda, TR ve
      EN AYRI AYRI (EN satirlari uzun).
   2. Hicbir iki VURUS ayni anda ekranda degil (kunyeler surekli
      katman, teklik hesabinin DISINDA — talimat onlari ayirdi).
   3. Her vurus penceresi >= 3 sn okunur (haritada pencere 3,6 sn —
      DOM'dan dogrulanir, elle sayi tasinmaz).
   4. Kunye katmani vuruslarla CAKISMIYOR (bounding-box kesisimi 0) ve
      dogru perdenin kunyesi gorunuyor, obur besi gorunmuyor.
   5. TASMA: gorunur blok viewport'a sigiyor (scrollWidth ve kutu).
   6. Pencere disi (once/sonra 3 sn) gorunmez; film sonuna dayanan son
      blokta "sonra" kontrolu ATLANIR (pencere disina cikacak yer yok)
      — atlandigi yazilir.
   7. Geri sarma: son bloktan ilkine donunce blok 1 geri gelir.
   RAPOR: metinli / ?soz=0 dusen kiyasi (taban damgali rig genelinde),
   kontak 21 kare (TR, kontak-soz/).
   KIRMIZI-ONCE: rig v2, 6-cumlelik ESKI yapiya karsi kosuldu — blok
   sayisi 6!=21 adiyla kirmizi.

   Kullanim: node yeni/film/olc-soz.cjs   (once: node yerel-sun.cjs)
   Cevre   : TEKRAR=3 · DIL=tr,en · TARAYICI=brave */
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
const DILLER = (process.env.DIL || 'tr,en').split(',');
const BLOK_BEKLENEN = 21, KUNYE_BEKLENEN = 6;
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

async function sayfaAc(browser, dil, sorgu) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const cdp = await page.target().createCDPSession();
  const on = dil === 'en' ? 'en/' : '';
  await page.goto(`${SUNUCU}/yeni/${on}film/?tavan=2${sorgu || ''}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(KAYITCI);
  await page.bringToFront();
  await page.waitForFunction('window.__fl && window.__fl.sahne()[0].durum === "hazir"', { timeout: 90000 });
  return { page, cdp };
}

/* bloklar/kunyeler DOM'dan — rig sayilari tekrar yazmaz */
const oku = (page) => page.evaluate(() => ({
  blok: [...document.querySelectorAll('.fl-soz:not(.fl-kunye):not(.fl-kaynak)')].map((e) => ({
    bas: +e.dataset.bas, son: +e.dataset.son, metin: e.textContent.trim().slice(0, 40) })),
  kunye: [...document.querySelectorAll('.fl-kunye')].map((e) => ({
    bas: +e.dataset.bas, son: +e.dataset.son, metin: e.textContent.trim().slice(0, 40) })),
  toplam: window.__fl.toplam,
}));

const durum = (page) => page.evaluate(() => {
  const al = (e) => {
    const s = getComputedStyle(e);
    const b = e.getBoundingClientRect();
    return { op: +s.opacity, gor: s.visibility === 'visible',
      kutu: { sol: b.left, ust: b.top, sag: b.right, alt: b.bottom },
      tasma: e.scrollWidth > e.clientWidth + 1 || b.left < 0 || b.right > innerWidth };
  };
  return {
    blok: [...document.querySelectorAll('.fl-soz:not(.fl-kunye):not(.fl-kaynak)')].map(al),
    kunye: [...document.querySelectorAll('.fl-kunye')].map(al),
  };
});

const gorunur = (d) => d.op > 0.9 && d.gor;
const azGorunur = (d) => d.op > 0.05 && d.gor;
const kesisir = (a, b) => !(a.sag <= b.sol || b.sag <= a.sol || a.alt <= b.ust || b.alt <= a.ust);

async function git(page, T) {
  await page.evaluate((t) => { scrollTo(0, window.__fl.konum(t)); window.__fl.atla(); }, T);
  await bekle(650);
}

async function taban(browser) {
  const { page } = await sayfaAc(browser, 'tr', '');
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

async function kosum(browser, dil, kontakCek) {
  const { page } = await sayfaAc(browser, dil, '');
  const Y = await oku(page);
  if (Y.blok.length !== BLOK_BEKLENEN || Y.kunye.length !== KUNYE_BEKLENEN) {
    await page.close();
    return { sayim: `blok:${Y.blok.length}!=${BLOK_BEKLENEN} kunye:${Y.kunye.length}!=${KUNYE_BEKLENEN}`, bloklar: [], geri_sarmada_geldi: false };
  }
  const bloklar = [];
  for (let i = 0; i < Y.blok.length; i++) {
    const B = Y.blok[i];
    const orta = (B.bas + B.son) / 2;
    await git(page, Math.max(0, B.bas - 3));
    const once = await durum(page);
    await git(page, orta);
    const ic = await durum(page);
    if (kontakCek) {
      fs.mkdirSync(KONTAK, { recursive: true });
      await page.screenshot({ path: path.join(KONTAK, `blok${String(i + 1).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 70 });
    }
    /* dogru kunye + kesisim, GORUNUR blok kutusuyla */
    const kunyeIdx = Y.kunye.findIndex((k) => orta >= k.bas && orta <= k.son);
    const kunyeDogru = kunyeIdx >= 0 && gorunur(ic.kunye[kunyeIdx])
      && ic.kunye.every((d, j) => j === kunyeIdx || !azGorunur(d));
    const cakisma = kunyeIdx >= 0 && gorunur(ic.blok[i]) && gorunur(ic.kunye[kunyeIdx])
      && kesisir(ic.blok[i].kutu, ic.kunye[kunyeIdx].kutu);
    /* film sonuna dayanan blokta sonra-kontrolu atlanir */
    const sonraT = B.son + 3;
    let sonrasindaYok = null;
    if (sonraT <= Y.toplam - 0.3) {
      await git(page, sonraT);
      const so = await durum(page);
      sonrasindaYok = !azGorunur(so.blok[i]);
    }
    bloklar.push({
      metin: B.metin, sure_sn: +(B.son - B.bas).toFixed(2),
      gorundu: gorunur(ic.blok[i]),
      oncesinde_yok: !azGorunur(once.blok[i]),
      sonrasinda_yok: sonrasindaYok,             /* null = atlandi (film sonu) */
      tek: ic.blok.filter(azGorunur).length <= 1,
      tasma: gorunur(ic.blok[i]) && ic.blok[i].tasma,
      kunye_dogru: kunyeDogru, kunye_cakisti: cakisma,
    });
  }
  await git(page, (Y.blok[0].bas + Y.blok[0].son) / 2);
  const geri = await durum(page);
  const geriGeldi = gorunur(geri.blok[0]);
  await page.close();
  return { bloklar, geri_sarmada_geldi: geriGeldi, sayim: 'tam' };
}

async function dusenKiyas(browser, sorgu) {
  const { page, cdp } = await sayfaAc(browser, 'tr', sorgu);
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

  const diller = {};
  for (const dil of DILLER) {
    console.log(`== ${dil.toUpperCase()} · ${TEKRAR} kosum ==`);
    const kosumlar = [];
    for (let i = 0; i < TEKRAR; i++) {
      const k = await kosum(browser, dil, dil === 'tr' && i === 0);
      kosumlar.push(k);
      if (k.sayim !== 'tam') { console.log(`  [${i + 1}] SAYIM KIRMIZI: ${k.sayim}`); continue; }
      const oz = k.bloklar.map((b) => (b.gorundu && b.oncesinde_yok && b.sonrasinda_yok !== false && b.tek && !b.tasma && b.kunye_dogru && !b.kunye_cakisti ? '+' : 'X')).join('');
      console.log(`  [${i + 1}] ${oz} · geri ${k.geri_sarmada_geldi ? '+' : 'X'}`);
    }
    const tam = kosumlar.every((k) => k.sayim === 'tam');
    diller[dil] = {
      kosum: kosumlar,
      kapilar: !tam ? { sayim: 'KALDI' } : {
        sayim: 'GECTI',
        gorunurluk: kosumlar.every((k) => k.bloklar.every((b) => b.gorundu)) ? 'GECTI' : 'KALDI',
        pencere_disi: kosumlar.every((k) => k.bloklar.every((b) => b.oncesinde_yok && b.sonrasinda_yok !== false)) ? 'GECTI' : 'KALDI',
        teklik: kosumlar.every((k) => k.bloklar.every((b) => b.tek)) ? 'GECTI' : 'KALDI',
        okunur_3sn: kosumlar[0].bloklar.every((b) => b.sure_sn >= 3) ? 'GECTI' : 'KALDI',
        tasma: kosumlar.every((k) => k.bloklar.every((b) => !b.tasma)) ? 'GECTI' : 'KALDI',
        kunye: kosumlar.every((k) => k.bloklar.every((b) => b.kunye_dogru && !b.kunye_cakisti)) ? 'GECTI' : 'KALDI',
        geri_sarma: kosumlar.every((k) => k.geri_sarmada_geldi) ? 'GECTI' : 'KALDI',
      },
    };
  }

  console.log('dusen kare kiyasi (blok-1 penceresi, 0-8 sn) ...');
  const metinli = await dusenKiyas(browser, '');
  const metinsiz = await dusenKiyas(browser, '&soz=0');
  console.log(`  metinli ${metinli.dusen} (${metinli.toplam_ms} ms) · metinsiz ${metinsiz.dusen} (${metinsiz.toplam_ms} ms)`);
  await browser.close();

  const hepsi = Object.values(diller).every((d) => Object.values(d.kapilar).every((x) => x === 'GECTI'));
  const hukum = !tb.gecerli ? 'ORTAM-GURULTULU (hukum verilmez)' : (hepsi ? 'GECTI' : 'KALDI');
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/olc-soz.cjs v2 — 21 blok + 6 kunye kapilari, TR+EN ayri. Pencereler DOM data-bas/son (kaynak TUR5-METIN-HARITASI.md). Dusen kiyasi RAPOR. Kontak: kontak-soz/blok01-21.jpg (TR).',
    olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, tekrar: TEKRAR,
    taban_tavan: TABAN_TAVAN, taban: tb,
    hukum, diller, dusen_kiyasi: { metinli, metinsiz },
  }, null, 1));
  console.log(`\nHUKUM: ${hukum}`);
  for (const [dil, d] of Object.entries(diller)) console.log(`  ${dil}: ${JSON.stringify(d.kapilar)}`);
  console.log(`→ ${CIKTI}`);
})().catch((e) => { console.error(e); process.exit(1); });
