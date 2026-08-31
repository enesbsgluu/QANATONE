#!/usr/bin/env node
/* FILM · HIZ TAVANI TARAMASI (31 Agu 2026, PROLOG-KAPANIS-v2 1. ve 2. adim)

   ENES'IN DEGISMEZ IKI KURALI (bu turun onceligi):
     "klibin hic takilmadan ilerlemesi ve dururken yag gibi kasmadan durmasi"
   Yani hiz kararlari bu ikisine feda EDILMEZ: bir tavan turu kisaltiyor ama
   takilma dogurUYORSA aday degildir. Sonumleme sabit tutulur (v2 sabiti) —
   bu tarama yalniz TAVAN oynatir, yay katsayilarina dokunmaz.

   GIRDI HATTI — SERT KURAL: butun kaydirma `Input.synthesizeScrollGesture`
   ile. Sayfa icinde `scrollTo` CAGRILMAZ; evaluate(scrollTo) surucuyu kendi
   ritmine sokup sahte esitlik uretiyor (bu tuzaga iki kez dusuldu).
   Tur cikis sarti da scrollY DEGIL film konumu: `hizala` birakista borcu
   sayfayi geri cekerek atiyor, scrollY'ye bagli surum zinciri 35/39'da
   bitirmisti.

   TAKILMA TANIMI — EVIN TANIMI: "sunumsuz bosluk". Ard arda SUNULAN iki
   video karesi (rVFC) arasindaki sure. Film ilerlerken (|hizT| > 0,05)
   bu sure ESIK'i asiyorsa takilmadir; sayisi ve TOPLAM suresi yazilir.
   Gizlenmez (v2 degismez 1).

   DURULAN NOKTALAR AYRI OLCULUR (v2 degismez 3): tur geneli iyi cikip tek
   bir noktanin kotu olmasi yanlis yesildir. Iki nokta: filmin BASI (acilis
   amblemi burada yasayacak) ve CEKIRDEK sahnesi.

   Cikti: film/olc-hiz.json
   Kullanim: node yeni/film/olc-hiz.cjs        (once: node yerel-sun.cjs)
   Cevre  : TAVANLAR=1.5,2,2.25,2.5 · TARAYICI=brave|chrome */
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
const CIKTI = path.join(__dirname, 'olc-hiz.json');
const TAVANLAR = (process.env.TAVANLAR || '1.5,2,2.25,2.5').split(',').map(Number);
const BOSLUK_ESIK_MS = 100;        /* sunumsuz bosluk esigi (ev tanimi) */
const TUR_SINIR_SN = 120;          /* v2 degismez 4 */
const P95_SINIR_MS = 20;           /* v2 degismez 2 */

/* Durulan noktalar: film saniyesi. Cekirdek sahne7'nin basi (kanon
   surelerinden turetilir, ELLE yazilmaz). */
const KANON = require('../src/film/kanon.json');
const basSn = (n) => KANON.klip.slice(0, n - 1).reduce((t, k) => t + k.sure, 0);
const DURAKLAR = [
  { ad: 'acilis (film basi)', T: 0.5 },
  { ad: 'cekirdek (sahne7)', T: +(basSn(7) + 1.5).toFixed(2) },
];

const KAYITCI = `(() => {
  window.__z = { kare: [], sunum: [], iz: [], calisiyor: false };
  let son = null;
  const dongu = () => {
    const simdi = performance.now();
    if (son !== null && __z.calisiyor) __z.kare.push(+(simdi - son).toFixed(2));
    son = simdi;
    if (__z.calisiyor) { const f = window.__fl; __z.iz.push({ t: +simdi.toFixed(1), T: +f.gosterilenT.toFixed(4), h: +f.hedefT.toFixed(4), v: +f.hizT.toFixed(4), n: f.etkin() }); }
    requestAnimationFrame(dongu);
  };
  requestAnimationFrame(dongu);
  /* SUNUM KAYDI: her GERCEKTEN boyanmis video karesi. Takilma bu izden
     cikar — rAF araligi degil, SUNULAN kare araligi. */
  const bagla = () => {
    for (const v of document.querySelectorAll('video')) {
      if (v.__bagli || !v.requestVideoFrameCallback) continue;
      v.__bagli = true;
      const f = (now, md) => { if (__z.calisiyor) __z.sunum.push({ t: +now.toFixed(1), mt: md.mediaTime }); v.requestVideoFrameCallback(f); };
      v.requestVideoFrameCallback(f);
    }
  };
  bagla(); setInterval(bagla, 1000);
  window.__zBasla = () => { __z.kare.length = 0; __z.sunum.length = 0; __z.iz.length = 0; __z.calisiyor = true; };
  window.__zBitir = () => { __z.calisiyor = false; return { kare: __z.kare, sunum: __z.sunum, iz: __z.iz }; };
})()`;

const yuzde = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))].toFixed(2); };
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const jest = (cdp, mesafe, hiz) => cdp.send('Input.synthesizeScrollGesture', {
  x: 720, y: 450, xDistance: 0, yDistance: -mesafe, speed: hiz, gestureSourceType: 'mouse', repeatCount: 0 });

/* TAKILMA: sunum izindeki ardisik bosluklar, film ILERLERKEN olanlar. */
function takilma(sunum, iz) {
  if (sunum.length < 2) return { sayi: 0, toplam_ms: 0, en_uzun_ms: 0, not: 'sunum izi bos' };
  const hizli = (t) => {                    /* o anda film ilerliyor muydu */
    let lo = 0, hi = iz.length - 1;
    if (!iz.length) return true;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (iz[m].t <= t) lo = m; else hi = m; }
    return Math.abs(iz[lo].v) > 0.05;
  };
  /* NEREDE takildigi da kaydedilir: evin teshis kurali — bosluklar klip
     SINIRINDA kumeleniyorsa devralma (el degisimi) sorunu, daginiksa
     cozucu/indirme. Sinira uzaklik film saniyesi cinsinden. */
  const sinirlar = [];
  { let t = 0; for (const k of KANON.klip) { if (t > 0) sinirlar.push(t); t += k.sure; } }
  const filmT = (t) => {                     /* o andaki gosterilen film zamani */
    let lo = 0, hi = iz.length - 1;
    if (!iz.length) return null;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (iz[m].t <= t) lo = m; else hi = m; }
    return iz[lo].T;
  };
  let sayi = 0, toplam = 0, enUzun = 0;
  const kayit = [];
  for (let i = 1; i < sunum.length; i++) {
    const d = sunum[i].t - sunum[i - 1].t;
    if (d > BOSLUK_ESIK_MS && hizli(sunum[i - 1].t)) {
      sayi++; toplam += d; if (d > enUzun) enUzun = d;
      const T = filmT(sunum[i - 1].t);
      let enYakin = Infinity;
      if (T != null) for (const b of sinirlar) if (Math.abs(T - b) < Math.abs(enYakin)) enYakin = T - b;
      kayit.push({ ms: +d.toFixed(0), T: T == null ? null : +T.toFixed(2), sinira_sn: Number.isFinite(enYakin) ? +enYakin.toFixed(2) : null });
    }
  }
  const sinirda = kayit.filter((k) => k.sinira_sn != null && Math.abs(k.sinira_sn) <= 0.35).length;
  return { sayi, toplam_ms: +toplam.toFixed(0), en_uzun_ms: +enUzun.toFixed(0),
    sinirda, daginik: sayi - sinirda,
    teshis: sayi === 0 ? 'takilma yok' : (sinirda / sayi >= 0.6 ? 'SINIRDA kumeleniyor -> devralma/indirme' : 'DAGINIK -> cozucu/kare butcesi'),
    ornek: kayit.slice(0, 8) };
}

async function tur(browser, tavan) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const cdp = await page.createCDPSession();
  const inen = { klip: 0, bayt: 0, onbellek: 0 };
  page.on('response', (r) => {
    if (!/\.mp4(\?|$)/.test(r.url())) return;
    const u = +(r.headers()['content-length'] || 0);
    if (u > 0) { inen.klip++; inen.bayt += u; if (r.fromCache && r.fromCache()) inen.onbellek++; }
  });
  /* HER KOSUM SOGUK BASLAR: onbellek temizlenmezse ikinci kosum
     birincinin indirdigini bedava buluyor ve takilma sayilari kosumlar
     arasinda kiyaslanamaz hale geliyor. Ilk ziyaretcinin kosulu budur. */
  await cdp.send('Network.clearBrowserCache').catch(() => {});
  await page.goto(`${SUNUCU}/yeni/film/?tavan=${tavan}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__fl && window.__fl.sahne()[0].durum === "hazir"', { timeout: 90000 });
  await page.evaluate(KAYITCI);
  await page.bringToFront();
  await bekle(500);

  /* ISINMA = YUKLEME TAMPONU (v2 4. adim). Ilk taramada takilmalarin
     buyuk kismi T=0..4 sn'deydi: tur, sahne1 hazir olur olmaz basliyor
     ama sahne2/3 daha inmemis oluyor. Urun tarafinda bu ani ACILIS
     AMBLEMI dolduracak ("amblem yasarken ilk klipler tamponlanir, ayri
     bir yukleme perdesi eklenmez"). Olcum de o anin karsiligini
     beklemeli, yoksa amblemin kapatacagi bir kusuru tavana yaziyoruz.
     ISINMA=0 ile kapatilir (tamponsuz halin karsilastirmasi icin). */
  const ISINMA_KLIP = Number(process.env.ISINMA ?? 3);
  let isinmaMs = 0;
  if (ISINMA_KLIP > 0) {
    const t = Date.now();
    await page.waitForFunction((k) => window.__fl.sahne().slice(0, k).every((s) => s.durum === 'hazir'),
      { timeout: 60000, polling: 200 }, ISINMA_KLIP).catch(() => {});
    isinmaMs = Date.now() - t;
  }
  const ray = await page.evaluate(() => ({ ...window.__fl.ray(), toplam: window.__fl.toplam, tavan: window.__fl.tavan }));

  /* TIPIK OTURUM (v2 8. adim): ilk 15 sn izleyip gecen ziyaretci */
  await page.evaluate(() => window.__zBasla());
  const t15 = Date.now();
  const turHiz = Math.round(tavan * ray.pxSn * 1.15);
  while (Date.now() - t15 < 15000) await jest(cdp, turHiz, turHiz);
  const tipikBayt = inen.bayt;

  /* --- TAM TUR: cikis sarti FILM KONUMU --- */
  const t0 = Date.now();
  let guvenlik = 0, bellekTepe = 0, borcTepe = 0;
  while (guvenlik++ < 1200) {
    const d = await page.evaluate(() => ({ T: window.__fl.gosterilenT, b: window.__fl.bellekMib(), g: Math.abs(window.__fl.geride()) }));
    if (d.b > bellekTepe) bellekTepe = d.b;
    if (d.g > borcTepe) borcTepe = d.g;
    if (d.T >= ray.toplam - 0.15) break;
    if ((Date.now() - t0) / 1000 > TUR_SINIR_SN * 2.2) break;   /* guvenlik: sinirin iki kati */
    await jest(cdp, turHiz, turHiz);
  }
  const turSn = (Date.now() - t0) / 1000;
  const g = await page.evaluate(() => window.__zBitir());

  const dizi = [];
  for (const k of g.iz) if (dizi[dizi.length - 1] !== k.n) dizi.push(k.n);
  const gorulen = [...new Set(dizi)].sort((a, b) => a - b);
  const geriAdim = [];
  for (let i = 1; i < dizi.length; i++) if (dizi[i] < dizi[i - 1]) geriAdim.push(`${dizi[i - 1]}→${dizi[i]}`);

  /* --- DURULAN NOKTALAR: her biri kendi p50/p95'i --- */
  const duraklar = [];
  for (const d of DURAKLAR) {
    /* noktaya GERCEK jestle git: once bir miktar geri, sonra ileri */
    const hedefPx = await page.evaluate((T) => Math.round(window.__fl.konum(T)), d.T);
    let koru = 0;
    while (koru++ < 400) {
      const y = await page.evaluate(() => scrollY);
      const fark = hedefPx - y;
      if (Math.abs(fark) < 40) break;
      await jest(cdp, Math.sign(fark) * Math.min(Math.abs(fark), 4000), 6000);
    }
    await bekle(2500);                                  /* yay otursun */
    await page.evaluate(() => window.__zBasla());
    await bekle(4000);                                  /* durulan noktada 4 sn kayit */
    const dg = await page.evaluate(() => window.__zBitir());
    duraklar.push({
      ad: d.ad, T: d.T,
      kare_p50: yuzde(dg.kare, 50), kare_p95: yuzde(dg.kare, 95),
      kare_sayisi: dg.kare.length,
      takilma: takilma(dg.sunum, dg.iz),
      gosterilen_T: dg.iz.length ? dg.iz[dg.iz.length - 1].T : null,
    });
  }

  /* --- GERI KAYDIRMA: kare suresi ileri yonle kiyaslanir --- */
  await page.evaluate(() => window.__zBasla());
  for (let i = 0; i < 14; i++) await jest(cdp, -3500, 5000);
  await bekle(2000);
  const gg = await page.evaluate(() => window.__zBitir());
  const geriDizi = [];
  for (const k of gg.iz) if (geriDizi[geriDizi.length - 1] !== k.n) geriDizi.push(k.n);

  await page.close();
  return {
    tavan, isinma_klip: ISINMA_KLIP, isinma_ms: isinmaMs, ray_px: Math.round(ray.rayPx), pxSn: ray.pxSn, toplam_sn: ray.toplam,
    alt_sinir_sn: +(ray.toplam / tavan).toFixed(1),
    tur_sn: +turSn.toFixed(1),
    tur_120_sinirinda: turSn <= TUR_SINIR_SN ? 'GECER' : 'ASIYOR',
    kare_p50: yuzde(g.kare, 50), kare_p95: yuzde(g.kare, 95),
    p95_20ms: (yuzde(g.kare, 95) ?? 999) <= P95_SINIR_MS ? 'GECER' : 'ASIYOR',
    ort_fps: +(1000 / (g.kare.reduce((a, b) => a + b, 0) / g.kare.length)).toFixed(1),
    takilma: takilma(g.sunum, g.iz),
    borc_tepe_sn: +borcTepe.toFixed(2),
    bellek_tepe_mib: bellekTepe,
    gorulen_sahne: gorulen.length, eksik: Array.from({ length: KANON.klip.length }, (_, i) => i + 1).filter((n) => !gorulen.includes(n)),
    sira_bozulmasi: geriAdim.length,
    tipik_oturum_mib: +(tipikBayt / 1048576).toFixed(1),
    tam_tur_mib: +(inen.bayt / 1048576).toFixed(1), tam_tur_istek: inen.klip,
    duraklar,
    geri: { kare_p50: yuzde(gg.kare, 50), kare_p95: yuzde(gg.kare, 95), takilma: takilma(gg.sunum, gg.iz),
      sahne_sirasi: geriDizi.slice(0, 12), geriye_sardi: geriDizi.length > 1 && geriDizi[geriDizi.length - 1] < geriDizi[0] },
  };
}

(async () => {
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980', '--autoplay-policy=no-user-gesture-required',
      '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 600000,
  });
  const bcdp = await browser.target().createCDPSession();
  const bilgi = await bcdp.send('SystemInfo.getInfo').catch(() => null);
  const surum = await browser.version();
  const gpu = bilgi && bilgi.gpu ? bilgi.gpu.featureStatus : null;
  const hizlandirma = gpu ? ['gpu_compositing', 'rasterization', 'video_decode', 'webgl'].map((x) => x + '=' + (gpu[x] || '?')).join(' · ') : 'alinamadi';
  console.log(`TARAYICI : ${TARAYICI} · ${surum}`);
  console.log(`HIZLANDIRMA: ${hizlandirma}`);
  console.log(`TAKILMA  : sunumsuz bosluk > ${BOSLUK_ESIK_MS} ms (film ilerlerken)`);
  console.log(`DURULAN  : ${DURAKLAR.map((d) => d.ad + ' @' + d.T + ' sn').join(' · ')}\n`);

  const TEKRAR = Number(process.env.TEKRAR || 1);
  const ortanca = (a) => { const s = [...a].filter((x) => x != null).sort((x, y) => x - y); return s.length ? +s[Math.floor(s.length / 2)].toFixed(2) : null; };
  const sonuc = [];
  for (const t of TAVANLAR) {
    process.stdout.write(`tavan ${t} · ${TEKRAR} kosum ...\n`);
    const kosumlar = [];
    for (let i = 0; i < TEKRAR; i++) {
      const k = await tur(browser, t);
      kosumlar.push(k);
      if (TEKRAR > 1) console.log(`  [${i + 1}/${TEKRAR}] isinma ${k.isinma_ms} ms · tur ${k.tur_sn} sn · p95 ${k.kare_p95} ms · takilma ${k.takilma.sayi} (${k.takilma.toplam_ms} ms)`);
    }
    /* ORTANCA — TEK KOSUM HUKUM VERMEZ. v2 kapisi p50/p95 icin ucun
       ortancasini istiyor; takilma sayisi daha da gurultulu: ilk tarama
       tavanla TEKDUZE bile artmadi (3 / 45 / 13 / 24), yani o sayi
       tavani degil kosumu olcuyordu. Butun kosumlar da yaziliyor —
       ortanca yayilimi gizlemesin. */
    const r = { ...kosumlar[0], kosum: TEKRAR };
    r.isinma_ms = ortanca(kosumlar.map((k) => k.isinma_ms));
    r.tur_sn = ortanca(kosumlar.map((k) => k.tur_sn));
    r.kare_p50 = ortanca(kosumlar.map((k) => k.kare_p50));
    r.kare_p95 = ortanca(kosumlar.map((k) => k.kare_p95));
    r.kare_p95_hepsi = kosumlar.map((k) => k.kare_p95);
    r.tur_120_sinirinda = r.tur_sn <= TUR_SINIR_SN ? 'GECER' : 'ASIYOR';
    r.p95_20ms = r.kare_p95 <= P95_SINIR_MS ? 'GECER' : 'ASIYOR';
    r.takilma = {
      sayi_ortanca: ortanca(kosumlar.map((k) => k.takilma.sayi)),
      sayi_hepsi: kosumlar.map((k) => k.takilma.sayi),
      toplam_ms_ortanca: ortanca(kosumlar.map((k) => k.takilma.toplam_ms)),
      toplam_ms_hepsi: kosumlar.map((k) => k.takilma.toplam_ms),
      sinirda_hepsi: kosumlar.map((k) => k.takilma.sinirda),
      en_uzun_ms: Math.max(...kosumlar.map((k) => k.takilma.en_uzun_ms)),
      ornek: kosumlar[0].takilma.ornek,
    };
    r.borc_tepe_sn = ortanca(kosumlar.map((k) => k.borc_tepe_sn));
    r.tipik_oturum_mib = ortanca(kosumlar.map((k) => k.tipik_oturum_mib));
    r.tam_tur_mib = ortanca(kosumlar.map((k) => k.tam_tur_mib));
    r.duraklar = kosumlar[0].duraklar.map((d, j) => ({
      ad: d.ad, T: d.T,
      kare_p50: ortanca(kosumlar.map((k) => k.duraklar[j].kare_p50)),
      kare_p95: ortanca(kosumlar.map((k) => k.duraklar[j].kare_p95)),
      takilma_hepsi: kosumlar.map((k) => k.duraklar[j].takilma.sayi),
    }));
    r.geri = {
      kare_p50: ortanca(kosumlar.map((k) => k.geri.kare_p50)),
      kare_p95: ortanca(kosumlar.map((k) => k.geri.kare_p95)),
      takilma_hepsi: kosumlar.map((k) => k.geri.takilma.sayi),
      geriye_sardi: kosumlar.every((k) => k.geri.geriye_sardi),
    };
    sonuc.push(r);
    console.log(`  ORTANCA tur ${r.tur_sn} sn (${r.tur_120_sinirinda}) · p50 ${r.kare_p50} / p95 ${r.kare_p95} ms (${r.p95_20ms}) · takilma ${r.takilma.sayi_ortanca} [${r.takilma.sayi_hepsi.join(',')}] · ${r.takilma.toplam_ms_ortanca} ms · borc tepe ${r.borc_tepe_sn} sn`);
    for (const d of r.duraklar) console.log(`    durulan · ${d.ad}: p50 ${d.kare_p50} / p95 ${d.kare_p95} ms · takilma [${d.takilma_hepsi.join(',')}]`);
    console.log(`    geri: p50 ${r.geri.kare_p50} / p95 ${r.geri.kare_p95} ms · takilma [${r.geri.takilma_hepsi.join(',')}] · sardi ${r.geri.geriye_sardi}`);
    console.log(`    bayt: tipik oturum (15 sn) ${r.tipik_oturum_mib} MiB · tam tur ${r.tam_tur_mib} MiB · bellek tepe ${r.bellek_tepe_mib} MiB`);
  }
  await browser.close();

  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/olc-hiz.cjs — hiz tavani taramasi. GERCEK girdi (Input.synthesizeScrollGesture), sayfa ici scrollTo YOK. Tur cikis sarti FILM KONUMU. Takilma = sunumsuz bosluk > 100 ms, film ilerlerken. Sonumleme sabit (v2 sabiti); yalniz tavan oynadi.',
    olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, hizlandirma,
    degismezler: { takilma_sifir: true, kare_p95_ms: P95_SINIR_MS, tur_sn: TUR_SINIR_SN },
    takilma_esigi_ms: BOSLUK_ESIK_MS, durulan_noktalar: DURAKLAR,
    aday: sonuc,
  }, null, 1));
  console.log(`\n→ ${CIKTI}`);
})().catch((e) => { console.error(e); process.exit(1); });
