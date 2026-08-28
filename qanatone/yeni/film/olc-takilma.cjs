#!/usr/bin/env node
/* TAKILMA OLCUMU (28 Agu, Enes): tahmin degil kayit. Her SUNULAN karede (rVFC,
   gercek mediaTime) o anda ISTENEN film zamani (motorun kendi karesindeki
   gosterilenT, zamana gore ara deger) ile sunulan karenin film zamani
   (sahne.bas + mediaTime) arasindaki fark kaydedilir. |fark| > 100 ms olan
   her sunum listelenir; her birinin en yakin KLIP SINIRINA uzakligi yazilir.
   Sinirda kumeleniyorsa (|uzaklik| <= ESIK) devralma sorunu, daginiksa cozucu.
   Supurmeler: okuma 1x, gezinme 1.5x, savurma 3.3x (ileri+geri) — masaustu
   (40 s) ve mobil oykunme 4G/CPU4x (25 s). H.264 tek hat.
   Kullanim: node yeni/film/olc-takilma.cjs [kume-filtresi]   TARAYICI=brave|chrome
   Cikti: yeni/film/olcum/takilma/rapor.json + stdout tablolari */
const path = require('path'), fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const TARAYICILAR = { chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe' };
const TARAYICI = process.env.TARAYICI || 'brave';
const KOK = process.env.URL_KOK || 'http://127.0.0.1:8790/yeni/film/';
const CIKTI = path.join(__dirname, 'olcum', 'takilma'); fs.mkdirSync(CIKTI, { recursive: true });
const ESIK_MS = 100, SINIR_ESIK_S = 0.35;   /* sinir kumesi: sunulan zaman sinira bu kadar yakinsa */
const AG = { wifi: null, '4G-12Mbit': { latency: 60, downloadThroughput: 12e6 / 8, uploadThroughput: 3e6 / 8 }, '4G-yavas-4Mbit': { latency: 150, downloadThroughput: 4e6 / 8, uploadThroughput: 1e6 / 8 } };

const SURUCU = `
window.SUPUR = (T0, T1, ms) => new Promise((res) => {
  const F = window.__fl; F.sifirla(); F.kayit = true; const t0 = performance.now();
  const ad = () => { const u = Math.min(1, (performance.now() - t0) / ms); scrollTo(0, Math.round(F.konum(T0 + (T1 - T0) * u)));
    if (u < 1) requestAnimationFrame(ad); else setTimeout(() => { F.kayit = false; res({ istek: F.istek, sunum: F.sunum, sahne: F.sahne(), mbit: F.mbit ?? null, onPencere: F.onPencere ?? null, pencere: F.pencere ?? null, onsar: F.onsar ?? null }); }, 400); };
  requestAnimationFrame(ad);
});`;

function analiz(g, baslar, fps) {
  const istek = g.istek.filter((x) => x.T !== undefined).sort((a, b) => a.t - b.t);
  const sunum = g.sunum.filter((x) => x.g !== false && x.mt !== undefined).sort((a, b) => a.t - b.t);
  const sinirlar = baslar.slice(1);                     /* klip baslangiclari (film-sn), ilk 0 haric */
  const istenen = (t) => {                              /* t aninda istenen film zamani: ara deger */
    let lo = 0, hi = istek.length - 1; if (!istek.length) return null;
    if (t <= istek[0].t) return istek[0].T; if (t >= istek[hi].t) return istek[hi].T;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (istek[m].t <= t) lo = m; else hi = m; }
    const a = istek[lo], b = istek[hi]; const f = (t - a.t) / Math.max(1e-6, b.t - a.t); return a.T + (b.T - a.T) * f;
  };
  const kayit = [];
  for (const s of sunum) {
    const ist = istenen(s.t); if (ist === null) continue;
    const sun = baslar[s.n - 1] + s.mt;
    const fark = (sun - ist) * 1000;                    /* ms film zamani; eksi = sunulan geride */
    let enYakin = Infinity, sinirN = 0;
    sinirlar.forEach((b, i) => { const d = sun - b; if (Math.abs(d) < Math.abs(enYakin)) { enYakin = d; sinirN = i + 2; } });
    kayit.push({ t: +(s.t).toFixed(1), n: s.n, sunulan: +sun.toFixed(3), istenen: +ist.toFixed(3), fark_ms: +fark.toFixed(0), sinir_n: sinirN, sinira_s: +enYakin.toFixed(3) });
  }
  /* BOSLUK: iki sunum arasinda istek ilerledigi halde kare gelmemis (klip hazir degil /
     cozucu yetismedi). rVFC atesmedigi icin sapma kaydi dogmaz; burada olay olarak eklenir:
     boslugun sonunda istenen ile son sunulan arasindaki fark. */
  const bosluk = []; const N0 = kayit.length;
  for (let i = 1; i < N0; i++) {
    const a_ = kayit[i - 1], b_ = kayit[i];
    if (b_.t - a_.t > ESIK_MS && Math.abs(b_.istenen - a_.istenen) > ESIK_MS / 1000) {
      const fark = (a_.sunulan - istenen(b_.t - 1)) * 1000;
      if (Math.abs(fark) > ESIK_MS) bosluk.push({ t: +(b_.t - 1).toFixed(1), n: a_.n, sunulan: a_.sunulan, istenen: +istenen(b_.t - 1).toFixed(3), fark_ms: +fark.toFixed(0), sinir_n: a_.sinir_n, sinira_s: a_.sinira_s, bosluk_ms: +(b_.t - a_.t).toFixed(0) });
    }
  }
  kayit.push(...bosluk); kayit.sort((x, y) => x.t - y.t);
  const sapma = kayit.filter((k) => Math.abs(k.fark_ms) > ESIK_MS);
  /* ardisik sapmalar tek olaya toplanir (ayni sahne, <120 ms arayla) */
  const olay = [];
  for (const k of sapma) { const o = olay[olay.length - 1]; if (o && k.t - o.son_t < 120 && o.n === k.n) { o.son_t = k.t; o.adet++; o.max_ms = Math.max(o.max_ms, Math.abs(k.fark_ms)); if (Math.abs(k.sinira_s) < Math.abs(o.sinira_s)) o.sinira_s = k.sinira_s; if (k.bosluk_ms) o.bosluk_ms = Math.max(o.bosluk_ms || 0, k.bosluk_ms); } else olay.push({ bas_t: k.t, son_t: k.t, n: k.n, adet: 1, max_ms: Math.abs(k.fark_ms), isaret: Math.sign(k.fark_ms), sinir_n: k.sinir_n, sinira_s: k.sinira_s, sunulan: k.sunulan, bosluk_ms: k.bosluk_ms || 0 }); }
  const sinirda = olay.filter((o) => Math.abs(o.sinira_s) <= SINIR_ESIK_S).length;
  const abs = kayit.map((k) => Math.abs(k.fark_ms)).sort((a, b) => a - b);
  const p = (q) => (abs.length ? abs[Math.min(abs.length - 1, Math.floor(q * abs.length))] : null);
  return { sunulan_kare: kayit.length, fark_p50: p(.5), fark_p95: p(.95), fark_max: abs.length ? abs[abs.length - 1] : null,
    sapma_kare: sapma.length, sapma_yuzde: kayit.length ? +(100 * sapma.length / kayit.length).toFixed(1) : null,
    olay_adet: olay.length, olay_sinirda: sinirda, olay_daginik: olay.length - sinirda,
    hukum: olay.length === 0 ? 'sapma yok' : (sinirda / olay.length >= 0.7 ? 'SINIRDA KUMELI -> devralma' : (sinirda / olay.length <= 0.3 ? 'DAGINIK -> cozucu' : 'karisik')),
    olaylar: olay, kayit };
}

async function kos(y) {
  const b = await pt.launch({ executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage();
  await p.setViewport(y.mobil ? { width: 412, height: 892, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
  const cdp = await p.createCDPSession(); await cdp.send('Network.enable');
  const ag = AG[y.ag]; await cdp.send('Network.emulateNetworkConditions', ag ? { offline: false, ...ag } : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  if (y.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: y.cpu });
  await p.evaluateOnNewDocument(SURUCU);
  await p.goto(KOK + '?kodek=h264&akis=0', { waitUntil: 'load', timeout: 120000 });   /* akis kapali: olcum surucusu tek kaynak */
  await p.waitForFunction('window.__fl && __fl.hazir', { timeout: 180000 });
  const baslar = await p.evaluate(() => [...document.querySelectorAll('.fl-sahne')].map((e) => Number(e.dataset.bas)));
  const fps = await p.evaluate(() => __fl.fps);
  const gpu = await p.evaluate(() => { try { const c = document.createElement('canvas'); const g = c.getContext('webgl'); const d = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(d.UNMASKED_RENDERER_WEBGL); } catch (e) { return '?'; } });
  const sonuc = { ad: y.ad, tarayici: TARAYICI, gpu, ag: y.ag, cpu: y.cpu, mobil: !!y.mobil, supur: [] };
  for (const s of y.supur) {
    /* baslangic konumuna KAYDIR, sonra atla: yay ters yolculuk yapmasin (ilk surumun kusuru) */
    await p.evaluate((T0) => { scrollTo(0, Math.round(__fl.konum(T0))); __fl.atla(); }, s.T0); await new Promise((r) => setTimeout(r, 700));
    const g = await p.evaluate((a, b_, ms) => SUPUR(a, b_, ms), s.T0, s.T1, s.ms);
    const a = analiz(g, baslar, fps);
    sonuc.supur.push({ ad: s.ad, hiz: s.hiz, film_sn: Math.abs(s.T1 - s.T0), mbit: g.mbit, onPencere: g.onPencere, pencere: g.pencere, onsar: g.onsar, sahne_inme: g.sahne.slice(0, 8).map((x) => `${x.n}:${x.durum}/${x.inmeMs}ms`).join(' '), ...a });
  }
  await b.close(); return sonuc;
}
const W = (m) => (m ? 25 : 40);
const supurler = (m) => [{ ad: 'okuma-1x', T0: 0, T1: W(m), ms: W(m) * 1000, hiz: 1 }, { ad: 'gezinme-1.5x', T0: 0, T1: W(m), ms: W(m) / 1.5 * 1000, hiz: 1.5 },
  { ad: 'savurma-3.3x', T0: 0, T1: W(m), ms: W(m) / 3.3 * 1000, hiz: 3.3 }, { ad: 'savurma-3.3x-geri', T0: W(m), T1: 0, ms: W(m) / 3.3 * 1000, hiz: 3.3 }];
const KUME = [{ ad: 'masaustu-wifi', ag: 'wifi', cpu: 1, supur: supurler(false) }, { ad: 'mobil-4G', ag: '4G-12Mbit', mobil: true, cpu: 4, supur: supurler(true) },
  { ad: 'mobil-4G-yavas', ag: '4G-yavas-4Mbit', mobil: true, cpu: 4, supur: supurler(true).slice(0, 3) }];
(async () => {
  const sec = process.argv[2]; const hepsi = [];
  for (const y of KUME) { if (sec && !y.ad.includes(sec)) continue; process.stdout.write(`>> ${y.ad} ... `); const r = await kos(y); hepsi.push(r); console.log(r.supur.map((s) => `${s.ad}: sapma ${s.sapma_kare}/${s.sunulan_kare} (${s.sapma_yuzde}%) olay ${s.olay_adet} sinirda ${s.olay_sinirda}`).join(' · ')); }
  fs.writeFileSync(path.join(CIKTI, (sec ? 'rapor-' + sec : 'rapor') + '.json'), JSON.stringify(hepsi, null, 1));
  console.log('\n| küme | süpürme | sunulan kare | fark p50/p95/max ms | >100 ms kare (%) | olay | sınırda (≤0,35 s) | dağınık | hüküm |');
  console.log('|---|---|---:|---|---:|---:|---:|---:|---|');
  for (const r of hepsi) for (const s of r.supur) console.log(`| ${r.ad} | ${s.ad} (mbit ${s.mbit} · ön ${s.onPencere} · önsar ${s.onsar}) | ${s.sunulan_kare} | ${s.fark_p50}/${s.fark_p95}/${s.fark_max} | ${s.sapma_kare} (${s.sapma_yuzde}%) | ${s.olay_adet} | ${s.olay_sinirda} | ${s.olay_daginik} | ${s.hukum} |`);
  console.log('\n== OLAYLAR (>100 ms) ==');
  for (const r of hepsi) for (const s of r.supur) for (const o of s.olaylar) console.log(`${r.ad} · ${s.ad} · t=${o.bas_t} ms · sahne${o.n} · ${o.adet} kare · max ${o.max_ms} ms (${o.isaret < 0 ? 'sunulan GERİDE' : 'sunulan İLERİDE'})${o.bosluk_ms ? ' · sunumsuz boşluk ' + o.bosluk_ms + ' ms' : ''} · sunulan ${o.sunulan} s · en yakın sınır sahne${o.sinir_n} başı, uzaklık ${o.sinira_s > 0 ? '+' : ''}${o.sinira_s} s`);
  console.log(`\nGPU: ${hepsi[0] && hepsi[0].gpu} · tarayıcı ${TARAYICI} headless · → yeni/film/olcum/takilma/rapor.json`);
})().catch((e) => { console.error('HATA', e); process.exit(1); });
