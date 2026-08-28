#!/usr/bin/env node
/* FILM · OLCUM DUZENEGI — gercek Chrome (headless) + puppeteer-core, URETIM
   CIKTISI (dist/) sunulur; olculen sey yayina gidecek halin kendisi.
   Montaj-duzenek derslerini tasir: her yapilandirma TAZE tarayicida tek
   basina; surucu kendini dogrular (scrollTo sapmasi sayilir); "sunulan
   kare" rVFC'den (tahmin degil); video sarma olcutu gurultulu -> TEKRAR
   ile medyan.
   Olcumler:
     ilk kare      : sayfa basindan sahne1'in GERCEKTEN boyanan ilk karesine
     GERCEK KULLANIM HIZLARI (27 Agu, Enes — kapi bunlarin ustunden
     yeniden tanimlanacak, laboratuvar savurmasinin degil):
       okuma  1x   : W sn film W sn'de
       gezinme 1,5x: W sn film W/1,5 sn'de
       gezinme 2x  : W sn film W/2 sn'de
     savurma 3,3x  : W sn film W/3,3 sn'de (sert), ileri + geri — LABORATUVAR
                     ustu; TEORIK TABANI var: 60 Hz'de saniyede 60 kare
                     sunulabilir, 24 fps x 3,3 = 79 kare istenir -> %24
                     atlama kacinilmaz. Her supurmede taban ayrica yazilir.
     kodek         : her kume h265 (ana) ve h264 (yedek, ?kodek=h264) ile
                     ayri kosar; sayfa canPlayType ile seciyor, olcum ikisini
                     de zorlar.
     uzun gorev    : PerformanceObserver longtask (adet, en uzun), CLS
     kare suresi   : surucu rAF araligi p95
     bayt / blob   : agdan inen + bellekte tutulan klip bayti
   Kullanim: node yeni/film/olc.cjs [ad-filtresi]   (TEKRAR=3 varsayilan) */
const path = require('path');
const fs = require('fs');
const http = require('http');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const DIST = path.join(__dirname, '..', '..', 'dist');
const CIKTI = path.join(__dirname, 'olcum');
/* TARAYICI (28 Agu, Enes kurali): olcum tarayici + hizlandirma durumuyla
   kaydedilir, tek sayiya bakilmaz. TARAYICI=brave|chrome (varsayilan chrome).
   Hizlandirma: sayfadan WEBGL_debug_renderer_info ile GPU adi okunur
   (SwiftShader = yazilim, ANGLE (NVIDIA/Intel/...) = donanim). */
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'chrome';
const CHROME = TARAYICILAR[TARAYICI] || TARAYICI;
/* HEADLESS=0 -> gercek pencere (donanim hizlandirma headless'ta kapali kalabilir) */
const HEADLESS = process.env.HEADLESS === '0' ? false : 'new';
/* SUPUR=okuma-1x,gezinme-1.5x -> yalniz bu supurmeler */
const SUPUR_SEC = process.env.SUPUR ? process.env.SUPUR.split(',') : null;
const PORT = 8941;
const TEKRAR = Number(process.env.TEKRAR || 3);
const MIME = { '.mp4': 'video/mp4', '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json' };

function sunucu() {
  return new Promise((res) => {
    const s = http.createServer((req, rp) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      let f = path.join(DIST, u);
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!f.startsWith(DIST) || !fs.existsSync(f)) { rp.writeHead(404); return rp.end('yok'); }
      const st = fs.statSync(f), mime = MIME[path.extname(f)] || 'application/octet-stream', rng = req.headers.range;
      if (rng) {
        const m = /bytes=(\d*)-(\d*)/.exec(rng), a = m[1] ? +m[1] : 0, b = m[2] ? +m[2] : st.size - 1;
        rp.writeHead(206, { 'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1, 'Cache-Control': 'no-store' });
        fs.createReadStream(f, { start: a, end: b }).pipe(rp);
      } else {
        rp.writeHead(200, { 'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Content-Length': st.size, 'Cache-Control': 'no-store' });
        fs.createReadStream(f).pipe(rp);
      }
    });
    s.listen(PORT, '127.0.0.1', () => res(s));
  });
}

const AG = {
  wifi: null,
  '4G-12Mbit': { latency: 60, downloadThroughput: 12e6 / 8, uploadThroughput: 3e6 / 8 },
  '4G-yavas-4Mbit': { latency: 150, downloadThroughput: 4e6 / 8, uploadThroughput: 1e6 / 8 },
};
const yuzde = (a, p) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return +b[Math.min(b.length - 1, Math.floor(p * b.length))].toFixed(2); };
const medyan = (a) => yuzde(a.filter((x) => x !== null && x !== undefined), 0.5);

/* sayfa ici surucu: T0 -> T1 film saniyesi, ms surede; kendini dogrular */
const SURUCU = `
window.SUPUR = (T0, T1, ms) => new Promise((res) => {
  const F = window.__fl; const t0 = performance.now();
  let sapma = 0, adim = 0, sonN = -1; const raf = [], varis = [], takilma = [];
  let takBas = null;
  const ad = () => {
    const now = performance.now();
    raf.push(now);
    const u = Math.min(1, (now - t0) / ms);
    const y = Math.round(F.konum(T0 + (T1 - T0) * u));
    scrollTo(0, y); adim++;
    if (Math.abs(scrollY - y) > 1.5) sapma++;
    /* hedef() = scrub konumunun sahnesi. etkin() artik GOSTERILEN sahne
       (devralma: klip dogru kareye oturmadan ekrani almiyor); hazir varisi
       gosterilen uzerinden olcmek her zaman 'hazir' derdi — yanlis yesil. */
    const n = F.hedef ? F.hedef() : F.etkin(); const s = F.sahne()[n - 1];
    const hazir = s && s.durum === 'hazir';
    if (n !== sonN) { varis.push({ n, hazirdi: hazir }); sonN = n; }
    if (!hazir && takBas === null) takBas = now;
    if (hazir && takBas !== null) { takilma.push(Math.round(now - takBas)); takBas = null; }
    if (u < 1) requestAnimationFrame(ad);
    else { if (takBas !== null) takilma.push(Math.round(now - takBas)); res({ sapma, adim, raf, varis, takilma }); }
  };
  requestAnimationFrame(ad);
});
window.__uzun = []; window.__cls = 0;
try {
  new PerformanceObserver((l) => { for (const e of l.getEntries()) __uzun.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) __cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
} catch (e) {}
`;

async function kos(y) {
  const b = await pt.launch({ executablePath: CHROME, headless: HEADLESS, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist', ...(HEADLESS ? [] : ['--window-size=1460,1000'])] });
  const p = await b.newPage();
  const uyari = [];
  p.on('pageerror', (e) => uyari.push(String(e).slice(0, 120)));
  p.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') uyari.push(m.text().slice(0, 120)); });
  await p.setViewport(y.mobil ? { width: 412, height: 892, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
  const cdp = await p.createCDPSession();
  await cdp.send('Network.enable');
  const ag = AG[y.ag];
  await cdp.send('Network.emulateNetworkConditions', ag ? { offline: false, ...ag } : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  if (y.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: y.cpu });
  let bayt = 0;
  cdp.on('Network.loadingFinished', (e) => { bayt += e.encodedDataLength || 0; });
  await p.evaluateOnNewDocument(SURUCU);

  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:${PORT}/yeni/film/${y.kodek ? '?kodek=' + y.kodek : ''}`, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction('window.__fl && __fl.hazir', { timeout: 180000 }).catch(() => uyari.push('SAHNE 1 HAZIR OLMADI'));
  await p.waitForFunction('window.__fl && __fl.ilkKareMs !== null', { timeout: 20000 }).catch(() => uyari.push('ILK KARE BOYANMADI'));
  const ilk = await p.evaluate(() => ({ ilkKareMs: __fl.ilkKareMs, mobil: __fl.mobil, toplam: __fl.toplam,
    acilisMs: __fl.acilisMs ?? null, acilisTakasMs: __fl.acilisTakasMs ?? null,
    kodek: __fl.kodek ?? null, sonum: __fl.sonum ?? null, sert: __fl.sert ?? null, tavan: __fl.tavan ?? null, pxSn: __fl.pxSn ?? null }));
  /* tarayici + hizlandirma kaydi */
  const tarayici = await p.evaluate(() => {
    let gpu = 'yok';
    try { const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl');
      const d = g && g.getExtension('WEBGL_debug_renderer_info'); gpu = d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : (g ? 'uzanti yok' : 'webgl yok'); } catch (e) { gpu = 'hata'; }
    return { ua: navigator.userAgent, gpu, hizlandirma: /swiftshader|llvmpipe|software/i.test(gpu) ? 'YAZILIM' : 'donanim',
      hz: (navigator.hardwareConcurrency || null), dpr: devicePixelRatio };
  });
  if (y.kodek && ilk.kodek !== y.kodek) uyari.push(`KODEK ZORLANAMADI: istenen ${y.kodek}, sayfa ${ilk.kodek}`);
  fs.mkdirSync(CIKTI, { recursive: true });
  await p.screenshot({ path: path.join(CIKTI, `${y.ad}-ilk.png`) });

  const sonuc = { ad: y.ad, ag: y.ag, mobil: !!y.mobil, cpu: y.cpu, ilk_kare_ms: ilk.ilkKareMs, hat: ilk.mobil ? 'mobil' : 'masaustu',
    kodek: ilk.kodek, sonum: ilk.sonum, sert: ilk.sert, tavan: ilk.tavan, pxSn: ilk.pxSn,
    tarayici: { ad: TARAYICI, headless: !!HEADLESS, ...tarayici },
    acilis_ms: ilk.acilisMs, acilis_takas_ms: ilk.acilisTakasMs, supur: [] };
  for (const s of y.supur) {
    if (SUPUR_SEC && !SUPUR_SEC.includes(s.ad)) continue;
    /* her supurme hedefe oturmus konumdan baslar (tavan gerisinde kalan
       onceki supurme bir sonrakini kirletmesin) */
    await p.evaluate(() => { __fl.atla && __fl.atla(); });
    await new Promise((r2) => setTimeout(r2, 400));
    await p.evaluate(() => { __fl.sifirla(); __uzun.length = 0; __cls = 0; __fl.kayit = true; });
    const r = await p.evaluate((a, b, ms) => SUPUR(a, b, ms), s.T0, s.T1, s.ms);
    await new Promise((r2) => setTimeout(r2, 300));
    const g = await p.evaluate(() => { __fl.kayit = false; return { istek: __fl.istek, sunum: __fl.sunum, uzun: __uzun.slice(), cls: __cls, sahne: __fl.sahne(),
      bellekMib: __fl.bellekMib ? __fl.bellekMib() : null, birakilan: __fl.birakilan ?? null, pencere: __fl.pencere ?? null,
      devir: __fl.devir ?? null }; });
    const istekK = new Set(g.istek.map((x) => x.n + '#' + x.kare)), sunumK = new Set(g.sunum.map((x) => x.n + '#' + x.kare));
    let kesisim = 0; for (const k of istekK) if (sunumK.has(k)) kesisim++;
    /* max bosluk: ardisik sunulan kareler arasi en buyuk kare farki (ayni sahnede) */
    let maxBosluk = 0;
    const gorunen = g.sunum.filter((x) => x.g !== false);   /* eski kayitlarda alan yok -> hepsi sayilir */
    for (let i = 1; i < gorunen.length; i++) if (gorunen[i].n === gorunen[i - 1].n) maxBosluk = Math.max(maxBosluk, Math.abs(gorunen[i].kare - gorunen[i - 1].kare));
    const arali = []; for (let i = 1; i < r.raf.length; i++) arali.push(r.raf[i] - r.raf[i - 1]);
    /* TEORIK TABAN: bu supurmede rAF kac kez atesledi (= kac kare
       sunulabilirdi) / kac ayri kare istendi. 1x-2x'te taban 0'dir;
       ustundeki her atlama gercek maliyet. 3,3x'te taban ~%24. */
    const tabanAtlama = istekK.size ? +Math.max(0, 100 * (1 - r.raf.length / istekK.size)).toFixed(1) : 0;
    sonuc.supur.push({
      ad: s.ad, hiz: s.hiz, film_sn: s.T1 - s.T0, sure_sn: s.ms / 1000,
      taban_atlama_yuzde: tabanAtlama,
      raf_adet: r.raf.length,
      atlama_yuzde: istekK.size ? +(100 * (1 - kesisim / istekK.size)).toFixed(1) : null,
      istenen: istekK.size, sunulan: sunumK.size, max_bosluk_kare: maxBosluk,
      varis: r.varis.length, varis_hazir: r.varis.filter((v) => v.hazirdi).length,
      takilma_adet: r.takilma.length, takilma_toplam_ms: r.takilma.reduce((a, x) => a + x, 0),
      kare_suresi_p50: yuzde(arali, 0.5), kare_suresi_p95: yuzde(arali, 0.95),
      uzun_gorev_adet: g.uzun.length, uzun_gorev_max_ms: g.uzun.length ? Math.max(...g.uzun) : 0,
      cls: +g.cls.toFixed(4), sapma: r.sapma, adim: r.adim,
      bellek_mib: g.bellekMib,
      birakilan: g.birakilan,
      devir: g.devir,
      inen_toplam_mib: +(g.sahne.reduce((a, x) => a + x.bayt, 0) / 1048576).toFixed(1),
    });
    if (s.kare) await p.screenshot({ path: path.join(CIKTI, `${y.ad}-${s.ad}.png`) });
  }
  sonuc.bayt_mib = +(bayt / 1048576).toFixed(1);
  sonuc.uyari = uyari;
  await b.close();
  return sonuc;
}

/* W = olculen film penceresi (sn). 40 sn = sahne1..6 (masaustu), 25 sn mobil. */
const okuma = (W) => ({ ad: 'okuma-1x', T0: 0, T1: W, ms: W * 1000, hiz: 1 });
const gez15 = (W) => ({ ad: 'gezinme-1.5x', T0: 0, T1: W, ms: (W / 1.5) * 1000, hiz: 1.5 });
const gez2 = (W) => ({ ad: 'gezinme-2x', T0: 0, T1: W, ms: (W / 2) * 1000, hiz: 2 });
const gez2g = (W) => ({ ad: 'gezinme-2x-geri', T0: W, T1: 0, ms: (W / 2) * 1000, hiz: 2 });
const sert = (W) => ({ ad: 'sert-3.3x', T0: 0, T1: W, ms: (W / 3.3) * 1000, hiz: 3.3, kare: true });
const geri = (W) => ({ ad: 'sert-3.3x-geri', T0: W, T1: 0, ms: (W / 3.3) * 1000, hiz: 3.3 });
/* her kume iki kodekle: h265 ana (sayfanin sectigi), h264 yedek (zorlanir) */
const KUME = [
  { ad: 'masaustu-wifi', ag: 'wifi', cpu: 1, supur: [okuma(40), gez15(40), gez2(40), gez2g(40), sert(40), geri(40)] },
  { ad: 'mobil-4G', ag: '4G-12Mbit', mobil: true, cpu: 4, supur: [okuma(25), gez15(25), gez2(25), gez2g(25), sert(25), geri(25)] },
  { ad: 'mobil-4G-yavas', ag: '4G-yavas-4Mbit', mobil: true, cpu: 4, supur: [okuma(25), gez15(25)] },
];
const YAP = KUME.flatMap((k) => [
  { ...k, ad: k.ad + '-h265', kodek: 'h265' },
  { ...k, ad: k.ad + '-h264', kodek: 'h264' },
]);

(async () => {
  const srv = await sunucu();
  const secim = process.argv[2];
  const liste = secim ? YAP.filter((y) => y.ad.includes(secim)) : YAP;
  const hepsi = [];
  for (const y of liste) {
    const turlar = [];
    for (let t = 0; t < TEKRAR; t++) {
      process.stdout.write(`>> ${y.ad} #${t + 1} ... `);
      try { const r = await kos(y); turlar.push(r); console.log(`ilk kare ${r.ilk_kare_ms} ms · ${r.supur.map((s) => `${s.ad} atlama ${s.atlama_yuzde}%`).join(' · ')}`); }
      catch (e) { console.log('HATA ' + e.message); }
    }
    if (!turlar.length) continue;
    /* medyan ozet */
    const oz = { ad: y.ad, ag: y.ag, hat: turlar[0].hat, kodek: turlar[0].kodek, sonum: turlar[0].sonum, tavan: turlar[0].tavan, pxSn: turlar[0].pxSn,
      tarayici: turlar[0].tarayici, tekrar: turlar.length,
      acilis_ms: medyan(turlar.map((r) => r.acilis_ms)), acilis_takas_ms: medyan(turlar.map((r) => r.acilis_takas_ms)),
      ilk_kare_ms: { medyan: medyan(turlar.map((r) => r.ilk_kare_ms)), aralik: [Math.min(...turlar.map((r) => r.ilk_kare_ms)), Math.max(...turlar.map((r) => r.ilk_kare_ms))] },
      bayt_mib: medyan(turlar.map((r) => r.bayt_mib)), supur: [], uyari: [...new Set(turlar.flatMap((r) => r.uyari))] };
    for (let i = 0; i < y.supur.length; i++) {
      if (SUPUR_SEC && !SUPUR_SEC.includes(y.supur[i].ad)) continue;
      const s = turlar.map((r) => r.supur.find((x) => x.ad === y.supur[i].ad)).filter(Boolean);
      if (!s.length) continue;
      const m = (k) => medyan(s.map((x) => x[k]));
      const ar = (k) => [Math.min(...s.map((x) => x[k])), Math.max(...s.map((x) => x[k]))];
      oz.supur.push({ ad: y.supur[i].ad, hiz: y.supur[i].hiz, film_sn: s[0].film_sn, sure_sn: s[0].sure_sn,
        taban_atlama_yuzde: m('taban_atlama_yuzde'), sunulan: m('sunulan'), istenen: m('istenen'),
        atlama_yuzde: m('atlama_yuzde'), atlama_aralik: ar('atlama_yuzde'), max_bosluk_kare: m('max_bosluk_kare'),
        varis: s[0].varis, varis_hazir: m('varis_hazir'), takilma_toplam_ms: m('takilma_toplam_ms'),
        kare_suresi_p95: m('kare_suresi_p95'), uzun_gorev_adet: m('uzun_gorev_adet'), uzun_gorev_max_ms: m('uzun_gorev_max_ms'),
        cls: m('cls'), sapma: Math.max(...s.map((x) => x.sapma)),
        bellek_mib: m('bellek_mib'), inen_toplam_mib: m('inen_toplam_mib'), birakilan: m('birakilan') });
    }
    hepsi.push({ ozet: oz, turlar });
    fs.mkdirSync(CIKTI, { recursive: true });
    fs.writeFileSync(path.join(CIKTI, process.env.CIKTI_AD || 'sonuc.json'), JSON.stringify(hepsi, null, 1));
  }
  srv.close();
  if (hepsi.length) { const t = hepsi[0].ozet.tarayici; console.log(`\nTARAYICI: ${t.ad} headless=${t.headless} · GPU: ${t.gpu} (${t.hizlandirma}) · tavan ${hepsi[0].ozet.tavan} · pxsn ${hepsi[0].ozet.pxSn} · sonum ${hepsi[0].ozet.sonum}`); }
  console.log('\n| küme | kodek | ilk kare ms | süpürme | hız | film/süre sn | taban atlama % | **atlama %** [aralık] | sunulan/istenen | max boşluk | hazır varış | takılma ms | kare p95 ms | uzun görev | CLS | bellek MiB |');
  console.log('|---|---|---:|---|---:|---|---:|---:|---:|---:|---|---:|---:|---|---:|---:|');
  for (const { ozet: o } of hepsi)
    for (const s of o.supur)
      console.log(`| ${o.ad.replace(/-h26[45]$/, '')} | ${o.kodek} | ${o.ilk_kare_ms.medyan} | ${s.ad} | ${s.hiz}× | ${s.film_sn}/${s.sure_sn.toFixed(1)} | ${s.taban_atlama_yuzde} | **${s.atlama_yuzde}** [${s.atlama_aralik.join('–')}] | ${s.sunulan}/${s.istenen} | ${s.max_bosluk_kare} | ${s.varis_hazir}/${s.varis} | ${s.takilma_toplam_ms} | ${s.kare_suresi_p95} | ${s.uzun_gorev_adet}/${s.uzun_gorev_max_ms} | ${s.cls} | ${s.bellek_mib} |`);
  /* YENI KAPI (27 Agu 2026, Enes): toplam bayt degil uc olcu. */
  console.log('\n== KAPI ==');
  console.log('| küme | 4G ilk kare < 1500 ms | savurmada sınır hazırlığı 4/4 | bellek tavanı |');
  console.log('|---|---|---|---|');
  for (const { ozet: o } of hepsi) {
    const dortG = o.ag !== 'wifi';
    const ilk = o.ilk_kare_ms.medyan;
    const sav = o.supur.filter((x) => x.ad.startsWith('sert'));
    const hazirTam = sav.length ? sav.every((x) => x.varis_hazir >= x.varis) : null;
    const bellek = Math.max(...o.supur.map((x) => x.bellek_mib || 0));
    console.log(`| ${o.ad} | ${dortG ? `${ilk} ms ${ilk < 1500 ? 'GEÇTİ' : 'KALDI'}` : `${ilk} ms (4G değil)`} | ${hazirTam === null ? '—' : sav.map((x) => `${x.ad} ${x.varis_hazir}/${x.varis}`).join(' · ') + (hazirTam ? ' GEÇTİ' : ' KALDI')} | ${bellek} MiB |`);
  }
  for (const { ozet: o } of hepsi) if (o.uyari.length) console.log(`UYARI ${o.ad}: ${o.uyari.join(' | ')}`);
  console.log('→ yeni/film/olcum/sonuc.json');
})().catch((e) => { console.error('HATA', e); process.exit(1); });
