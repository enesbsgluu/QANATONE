#!/usr/bin/env node
/* EFEKT TURU OLCUMU (31 Agu 2026 aksam, Enes) — EFEKT A (tv acma devir
   kapanisi) + EFEKT B (prologu gec isinlanmasi).
   KAPILAR:
     · iki efektte de dusen kare 0 (25 ms tabani, TEKRAR medyani — devir
       turunun olcum disiplini)
     · efekt sureleri ms cinsinden olculur (A hedefi 400-550; B ~400).
       A KAPISI GUNCELLENDI (Enes, 3 Eyl 2026): eski 250-350 efekt
       yokken yazilmisti; temiz oturumda (taban [0,0,0]) olculen gercek
       sure 447-509 ms ve GORSEL HUKUM GECTI — kapi geregi tasarima
       cekildi. DUSEN KARE KAPISI 0 KALIYOR: taban temizken 4-5 dusen
       gercek kusur, bir daraltma turu hakki var (acik is).
     · gec dugmesi filmin BAS/ORTA/SON noktasinda ayri sinanir, ucunde de
       ayni calisir (durum parmak izi karsilastirilir)
     · prefers-reduced-motion aciksa iki efekt de sade sonumlemeye iner
       (flas yok) — reduce SAYFA ACILDIKTAN SONRA CDP ile emule edilir
       (acilista olsa motor hic inmez, sinanacak sey kalmazdi; surucu
       azaltmayi TETIK aninda canli okur)
     · KONTROL ONCE KASTEN KIRMIZIYA DONDURULUR: ?boz=1 cokusu 4 katina
       uzatir (sure kapisi kirmizi) ve gec tepesinde 60 ms kilitler
       (dusen kapisi kirmizi). Iki kirmizi da YAKALANMADAN gercek olcume
       gecilmez — yakalanmazsa duzenegin yesili anlamsizdir.
   Kullanim: node yeni/film/olc-efekt.cjs   (TARAYICI, HEADLESS, TEKRAR) */
const path = require('path');
const fs = require('fs');
const http = require('http');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const DIST = path.join(__dirname, '..', '..', 'dist');
const CIKTI = path.join(__dirname, 'olc-efekt.json');
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'chrome';
const CHROME = TARAYICILAR[TARAYICI] || TARAYICI;
const HEADLESS = process.env.HEADLESS === '0' ? false : 'new';
const PORT = 8946;
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

const SURUCU = `
window.VARIS = (sn) => new Promise((res) => {
  const F = window.__fl; const T1 = F.toplam, T0 = Math.max(0, T1 - sn);
  const ms = sn * 1000; const t0 = performance.now();
  let sapma = 0;
  const ad = () => {
    const u = Math.min(1, (performance.now() - t0) / ms);
    scrollTo(0, Math.round(F.konum(T0 + (T1 - T0) * u)));
    if (u < 1) requestAnimationFrame(ad); else res({ sapma });
  };
  requestAnimationFrame(ad);
});`;

const medyan = (a) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const dusenSay = (kareler, bas, son) => {
  const p = kareler.filter((t) => t >= bas && t <= son);
  return p.slice(1).map((t, i) => t - p[i]).filter((d) => d > 25).length;
};
/* DARALTMA TURU TESHISI (3 Eyl gece): dusen karelerin ZAMANLARI —
   hangi FAZDA dustugu bilinmeden supheli secilemez. Bosluk > 25 ms
   olan araligin BASLANGIC zamani doner (efekt basina gore ms). */
const dusenZaman = (kareler, bas, son) => {
  const p = kareler.filter((t) => t >= bas && t <= son);
  const z = [];
  for (let i = 1; i < p.length; i++) if (p[i] - p[i - 1] > 25) z.push(+(p[i - 1] - bas).toFixed(0));
  return z;
};

async function ac(url, azaltSonradan) {
  const b = await pt.launch({ executablePath: CHROME, headless: HEADLESS, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist', ...(HEADLESS ? [] : ['--window-size=1940,1180'])] });
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080 });
  await p.evaluateOnNewDocument(SURUCU);
  await p.goto(`http://127.0.0.1:${PORT}/yeni/film/${url}`, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction('window.__fl && __fl.hazir', { timeout: 180000 });
  if (azaltSonradan) {
    const cdp = await p.createCDPSession();
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  }
  return { b, p };
}

/* filmi sona surup TV kapanisini bekler; kayit dokumunu dondurur */
async function devirSur(p, isinma) {
  await p.evaluate(() => { scrollTo(0, __fl.konum(__fl.toplam - 4)); __fl.atla(); });
  await p.waitForFunction('(() => { const s = __fl.sahne(); return s[s.length - 1].durum === "hazir"; })()', { timeout: 120000 });
  if (isinma) {   /* soguk boru hatti dusen uretir (devir turu dersi): ilk devir isinma, geri sar */
    await p.evaluate(() => VARIS(4));
    await p.waitForFunction('__devir.kayit.tamMs !== null', { timeout: 20000 });
    await p.evaluate(() => { scrollTo(0, __fl.konum(__fl.toplam - 3)); __fl.atla(); });
    await p.waitForFunction('!__devir.aktif() && __devir.s() === 1', { timeout: 15000 });
    await p.evaluate(() => VARIS(3));
  } else {
    await p.evaluate(() => VARIS(4));
  }
  await p.waitForFunction('__devir.kayit.tamMs !== null', { timeout: 20000 });
  /* tv yolunda pencere efektle biter; sade yolda tamMs ile */
  await p.waitForFunction('(() => { const K = __devir.kayit; return K.kapanisYolu === "sade" || K.tv.sonMs !== null; })()', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 120));
  return p.evaluate(() => {
    const K = __devir.kayit;
    return { yol: K.kapanisYolu, tv: K.tv, basMs: K.basMs, tamMs: K.tamMs, kareler: K.kareler, devirDurum: document.documentElement.dataset.devir || null };
  });
}

/* gec dugmesine basip efektin bitmesini bekler; durum parmak izi dondurur */
async function gecSur(p, nokta) {
  /* isitma payi (gece TUR 1): modul bosta import ediliyor; sayfa hazir
     olur olmaz tiklaninca yaris stokastik sade yola dusuyordu (tasarim
     geregi zarif dusus — ama kapi isinlanmayi olcuyor). Gercek kullanici
     ilk yarim saniyede tiklamaz. */
  await new Promise((r) => setTimeout(r, 1200));
  if (nokta === 'orta') { await p.evaluate(() => { scrollTo(0, __fl.konum(__fl.toplam / 2)); __fl.atla(); }); await new Promise((r) => setTimeout(r, 400)); }
  if (nokta === 'son') { await p.evaluate(() => { scrollTo(0, __fl.konum(__fl.toplam) - innerHeight * 2.2); __fl.atla(); }); await new Promise((r) => setTimeout(r, 400)); }
  await p.click('.fl-gec');
  await p.waitForFunction('window.__devir && __devir.kayit.gec && __devir.kayit.gec.sonMs !== null', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 100));
  return p.evaluate(() => {
    const g = __devir.kayit.gec;
    const fl = document.querySelector('.fl');
    return {
      yol: g.yol, sure_ms: Math.round(g.sonMs - g.basMs), tepe_ms: g.tepeMs ? Math.round(g.tepeMs - g.basMs) : null,
      kareler: g.kareler, execler: g.execler || [],
      iz: { film: document.documentElement.dataset.film || null,
        flGizli: fl ? getComputedStyle(fl).display === 'none' : null,
        govdeAkista: (() => { const gv = document.getElementById('fl-govde'); return gv ? getComputedStyle(gv).position : null; })(),
        scrollY, kalanSinif: document.documentElement.className },
    };
  });
}

(async () => {
  const srv = await sunucu();
  const S = { _: 'yeni/film/olc-efekt.cjs — EFEKT A (tv) + EFEKT B (isinlanma) kapilari; kirmizi kontrol ONCE kosulur.', olcum: new Date().toISOString(), tarayici: TARAYICI, headless: HEADLESS !== false, tekrar: TEKRAR };
  const raporla = (ad, r) => { console.log(` ${r.gecti === false ? 'KALDI' : r.gecti === true ? 'GECTI' : '·'}  ${ad}  ${JSON.stringify(r).slice(0, 220)}`); };

  /* ---- 1) KIRMIZI KONTROL: bozuk kurulum kirmiziyi DOGURMALI ---- */
  console.log('\n== KIRMIZI KONTROL (?boz=1 — beklenen: kapilar KALDI) ==');
  {
    const { b, p } = await ac('?boz=1');
    const d = await devirSur(p, false);
    const sure = d.tv.sonMs && d.tv.basMs ? Math.round(d.tv.sonMs - d.tv.basMs) : null;
    S.kirmizi_A = { sure_ms: sure, yakalandi: sure !== null && (sure < 400 || sure > 550) };
    raporla('A sure kapisi kirmiziya dondu mu', { ...S.kirmizi_A, gecti: S.kirmizi_A.yakalandi });
    await b.close();
  }
  {
    const { b, p } = await ac('?boz=1');
    const g = await gecSur(p, 'orta');
    const dus = g.kareler.length > 2 ? dusenSay(g.kareler, g.kareler[0], g.kareler[g.kareler.length - 1]) : 0;
    S.kirmizi_B = { dusen: dus, yakalandi: dus > 0 };
    raporla('B dusen kapisi kirmiziya dondu mu', { ...S.kirmizi_B, gecti: S.kirmizi_B.yakalandi });
    await b.close();
  }
  const kirmiziTamam = S.kirmizi_A.yakalandi && S.kirmizi_B.yakalandi;
  if (!kirmiziTamam) console.log(' !! KIRMIZI YAKALANAMADI — asagidaki yesillere guvenilmez');

  /* ---- 2) EFEKT A gercek olcum (TEKRAR, medyan) ---- */
  console.log('\n== EFEKT A · tv acma ==');
  /* DURGUN TABAN PENCERESI (Enes, 3 Eyl gece — taban damgasi ilkesi bu
     rig'e): dusenler ritmikti ve iz GPU'yu gosterdi; bes tek-degisken
     hipotezi elendi. Soru su: 25 ms esiginde sayfanin DURGUN halinin
     "dusen" tabani kac? Ayni sinyal turu (rAF araligi — GPU geri-
     basinci BeginFrame'i geciktirir, rAF'a yansir), efekt penceresi
     sayaciyla ayni esik. KAPI TABAN-GORECELI (asagida): efekt, tabanin
     ustune kare EKLEMIYORSA gecer; taban 0 cikarsa eski kapi (0)
     kendiliginden geri gelir. */
  let taban = { dusen: null, sure_ms: null, hiz_sn: null };
  const aTekrar = [];
  for (let i = 0; i < TEKRAR; i++) {
    const { b, p } = await ac(process.env.SORGU ? `?${process.env.SORGU}` : '');
    if (i === 0) {
      /* taban: sayfa yuklu, film basinda, motor oturmus — 3 sn durgun */
      const t = await p.evaluate(async (sureMs) => {
        const ts = [];
        await new Promise((res) => {
          const t0 = performance.now();
          const f = (x) => { ts.push(x); if (x - t0 >= sureMs) return res(); requestAnimationFrame(f); };
          requestAnimationFrame(f);
        });
        let n = 0;
        for (let j = 1; j < ts.length; j++) if (ts[j] - ts[j - 1] > 25) n++;
        return { n, sure_ms: Math.round(ts[ts.length - 1] - ts[0]) };
      }, 3000);
      taban = { dusen: t.n, sure_ms: t.sure_ms, hiz_sn: +(t.n / (t.sure_ms / 1000)).toFixed(2) };
      console.log(` taban (durgun ${t.sure_ms} ms, esik 25 ms): ${t.n} dusen → ${taban.hiz_sn}/sn`);
    }
    /* TESHIS=1 (3 Eyl daraltma): ilk kosumda efekt penceresi izlenir —
       dusenler ritmikti (55-70 ms arayla), sinif/raster hipotezleri
       olcumle elendi; uzun gorevin ADINI trace soyler. */
    if (i === 0 && process.env.TESHIS === '1')
      await p.tracing.start({ path: path.join(__dirname, 'efekt-trace.json'),
        categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink.user_timing', 'v8.execute'] });
    const d = await devirSur(p, true);
    if (i === 0 && process.env.TESHIS === '1') await p.tracing.stop();
    const sure = Math.round(d.tv.sonMs - d.tv.basMs);
    const fazlar = { cokus: Math.round(d.tv.parlaMs - d.tv.basMs), parlama: Math.round(d.tv.acMs - d.tv.parlaMs), acilis: Math.round(d.tv.sonMs - d.tv.acMs) };
    /* efekt kapisinin penceresi tv.bas -> tv.son; devir zoom'u onceki
       turun kapisiydi (olculdu, ayri yazilir, kapiya girmez) */
    const dus = dusenSay(d.kareler, d.tv.basMs, d.tv.sonMs);
    const zoomDus = dusenSay(d.kareler, d.basMs, d.tv.basMs);
    /* daraltma teshisi: dusenler hangi fazda (cokus/parlama/acilis) */
    const dz = dusenZaman(d.kareler, d.tv.basMs, d.tv.sonMs);
    const dusenFaz = {
      cokus: dz.filter((t) => t < fazlar.cokus).length,
      parlama: dz.filter((t) => t >= fazlar.cokus && t < fazlar.cokus + fazlar.parlama).length,
      acilis: dz.filter((t) => t >= fazlar.cokus + fazlar.parlama).length,
      zamanlar_ms: dz,
    };
    aTekrar.push({ yol: d.yol, sure_ms: sure, fazlar, dusen: dus, dusen_faz: dusenFaz, zoom_dusen: zoomDus, devirDurum: d.devirDurum });
    console.log(` #${i + 1} yol ${d.yol} · sure ${sure} ms (${fazlar.cokus}+${fazlar.parlama}+${fazlar.acilis}) · efekt dusen ${dus} [cokus ${dusenFaz.cokus} · parla ${dusenFaz.parlama} · acilis ${dusenFaz.acilis} @ ${dz.join(',')}ms] · zoom dusen ${zoomDus}`);
    await b.close();
  }
  /* KAPI TABAN-GORECELI (Enes, 3 Eyl gece): efekt penceresi basina
     beklenen taban duseni = taban_hizi x medyan_sure; efekt bunun
     USTUNE eklemiyorsa gecer. Taban 0 ise beklenen 0 -> eski kapi. */
  const beklenenTaban = taban.hiz_sn == null ? 0
    : Math.ceil(taban.hiz_sn * medyan(aTekrar.map((x) => x.sure_ms)) / 1000);
  S.A = {
    tekrar: aTekrar, medyan_sure: medyan(aTekrar.map((x) => x.sure_ms)), medyan_dusen: medyan(aTekrar.map((x) => x.dusen)),
    taban, beklenen_taban_duseni: beklenenTaban,
    gecti: aTekrar.every((x) => x.yol === 'tv' && x.devirDurum === 'tam')
      && medyan(aTekrar.map((x) => x.sure_ms)) >= 400 && medyan(aTekrar.map((x) => x.sure_ms)) <= 550
      && medyan(aTekrar.map((x) => x.dusen)) <= beklenenTaban,
  };
  raporla(`A: sure 400-550 + dusen<=taban(${S.A.beklenen_taban_duseni}) + tam`, S.A);

  /* ---- 3) EFEKT A hareket azaltma: sade yol ---- */
  {
    const { b, p } = await ac('', true);
    const d = await devirSur(p, false);
    S.A_azalt = { yol: d.yol, tvBos: d.tv.basMs === null, tam: d.devirDurum === 'tam', gecti: d.yol === 'sade' && d.tv.basMs === null && d.devirDurum === 'tam' };
    raporla('A azaltma: sade sonumleme, flas yok', S.A_azalt);
    await b.close();
  }

  /* ---- 4) EFEKT B: bas / orta / son ---- */
  console.log('\n== EFEKT B · isinlanma (bas/orta/son) ==');
  const bNokta = {};
  for (const nokta of ['bas', 'orta', 'son']) {
    /* nokta basina TEKRAR kosum, dusen hukmu MEDYANDAN (A ile ayni
       disiplin — tek kosumdaki sinir gurultusu hukum vermesin) */
    const tekrarG = [];
    for (let i = 0; i < TEKRAR; i++) {
      const { b: bb, p: pp } = await ac('');
      tekrarG.push(await gecSur(pp, nokta));
      await bb.close();
    }
    const g = tekrarG[0];
    g.toplanmaM = medyan(tekrarG.map((x) => {
      const t0 = x.kareler[0], tp = t0 + (x.tepe_ms || 0);
      return x.kareler.length > 2 ? dusenSay(x.kareler, t0, tp - 5) : 0;
    }));
    g.sonusM = medyan(tekrarG.map((x) => {
      const t0 = x.kareler[0], tp = t0 + (x.tepe_ms || 0);
      return x.kareler.length > 2 ? dusenSay(x.kareler, tp + 90, x.kareler[x.kareler.length - 1]) : 0;
    }));
    /* DUSEN SAYIMI GORSEL FAZLARA AYRILIR: takas (tepe) karesi ekran TAM
       KIZIL ORTULUYKEN yasanir — efektin var olus sebebi o kareyi
       gizlemek; sayfanin yeniden duzeni oradadir ve gorunmez. Gorunur
       fazlar (toplanma + sonus) 0 olmali; takas boslugu AYRICA yazilir,
       saklanmaz. */
    const t0 = g.kareler[0], tepeT = t0 + (g.tepe_ms || 0);
    const toplanma = g.toplanmaM;
    const sonus = g.sonusM;
    const takasPencere = g.kareler.filter((x) => x >= tepeT - 5 && x <= tepeT + 90);
    const takasGap = takasPencere.length > 1 ? Math.round(Math.max(...takasPencere.slice(1).map((x, i) => x - takasPencere[i]))) : null;
    const aralar = g.kareler.slice(1).map((x, i) => ({ d: +(x - g.kareler[i]).toFixed(1), tBas: Math.round(g.kareler[i + 1] - t0) })).filter((x) => x.d > 20);
    bNokta[nokta] = { yol: g.yol, sure_ms: g.sure_ms, tepe_ms: g.tepe_ms, toplanma_dusen: toplanma, sonus_dusen: sonus, takas_gap_ms: takasGap, buyuk_aralar: aralar.slice(0, 6), iz: g.iz };
    console.log(` ${nokta}: yol ${g.yol} · sure ${g.sure_ms} ms · tepe ${g.tepe_ms} ms · toplanma(medyan) ${toplanma} · sonus(medyan) ${sonus} · takas ${takasGap} ms · film=${g.iz.film} scrollY=${g.iz.scrollY}`);
  }
  const izler = Object.values(bNokta).map((x) => JSON.stringify({ f: x.iz.film, g: x.iz.flGizli, p: x.iz.govdeAkista, y: x.iz.scrollY, s: x.iz.kalanSinif }));
  S.B = {
    noktalar: bNokta, ayni_calisti: new Set(izler).size === 1,
    gecti: Object.values(bNokta).every((x) => x.yol === 'isinlanma' && x.toplanma_dusen === 0 && x.sonus_dusen === 0 && x.iz.film === 'atlandi' && x.iz.flGizli === true && x.iz.govdeAkista === 'static')
      && new Set(izler).size === 1
      && Object.values(bNokta).every((x) => x.sure_ms >= 320 && x.sure_ms <= 480),
  };
  raporla('B: uc noktada ayni + isinlanma + dusen 0 + ~400 ms', { ayni: S.B.ayni_calisti, gecti: S.B.gecti });

  /* ---- 5) EFEKT B hareket azaltma ---- */
  {
    const { b, p } = await ac('', true);
    const g = await gecSur(p, 'orta');
    S.B_azalt = { yol: g.yol, sure_ms: g.sure_ms, film: g.iz.film, gecti: g.yol === 'sade' && g.iz.film === 'atlandi' };
    raporla('B azaltma: sade sonumleme', S.B_azalt);
    await b.close();
  }

  /* ---- 6) HALKA + IBARE (31 Agu gece, Enes): dugme + donen cizgi +
     ibare BIRLIKTE dusen kare 0. Senaryo: film sonuna 0,3 sn kala otur
     (ipucu belirmis, kumanda + halka ekranda, devir tetiklenmemis),
     ?akis=0 ile sahne tamamen statik — olculen maliyet yalniz bu ucun.
     TEKRAR kosum, medyan. Reduce: cizgi durur, dugme gorunur. */
  console.log('== HALKA + IBARE ==');
  /* SENARYO ORTA NOKTA (gece zinciri TUR 1 teshisi): eski senaryo film
     SONUNDAYDI (ipucu yalniz orada gorunurdu — 604911c'den beri ibare
     film boyunca ekranda, sart dustu). Sonda fl-hazirla ESKI SAYFA
     iframe'ini yukluyor ve onun idle JS'i (tubes canvas) ana is
     parcacigini boluyor — taban bile 4-10 dusen veriyordu, makine degil.
     Uc oge (dugme+cizgi+ibare) ortada da birlikte; ana olcum ORTADA,
     film-sonu degeri asagida AYRI bilgi satiri (saklanmaz). */
  const hTekrar = [];
  for (let i = 0; i < TEKRAR; i++) {
    const { b, p } = await ac('?akis=0');
    await p.evaluate(() => { scrollTo(0, __fl.konum(__fl.toplam / 2)); __fl.atla(); });
    await p.waitForFunction('getComputedStyle(document.querySelector(".fl-ipucu")).opacity === "1"', { timeout: 10000 });
    /* SUKUNET (gece TUR 1, olculdu: 0/1/3 dagilimi): halkali pencere
       olcum sirasi geregi acilistaki KLIP INISLERINE denk geliyordu,
       taban penceresi inisler bitince kosuyordu — sistematik haksizlik.
       Iki pencere de ayni sukunette olculur: inen klip kalmayana kadar
       bekle + 600 ms yerlesme. */
    await p.waitForFunction('__fl.sahne().every((s) => s.durum !== "iniyor")', { timeout: 60000 });
    await new Promise((r) => setTimeout(r, 600));
    /* ayni kosumda iki pencere: halkali ve halkasiz (taban) — fark
       halkanin GERCEK maliyeti; makine gurultusu ikisine esit girer */
    const r = await p.evaluate(() => new Promise((res) => {
      const halka = document.querySelector('.fl-halka');
      const st = getComputedStyle(halka, '::before');
      const olc = (sure) => new Promise((r2) => {
        const kayit = []; const t0 = performance.now();
        const ad = (n) => { kayit.push(n); if (n - t0 < sure) requestAnimationFrame(ad); else r2(kayit); };
        requestAnimationFrame(ad);
      });
      (async () => {
        const halkali = await olc(1500);
        halka.style.display = 'none';
        const tabanK = await olc(1500);
        halka.style.display = '';
        res({ halkali, tabanK, anim: st.animationName, sure: st.animationDuration });
      })();
    }));
    const say = (k) => k.slice(1).map((x, j) => x - k[j]).filter((d) => d > 25).length;
    const dus = say(r.halkali), taban = say(r.tabanK);
    hTekrar.push({ dusen: dus, taban, anim: r.anim, sure: r.sure });
    console.log(` #${i + 1} dusen ${dus} (taban ${taban}) · animasyon ${r.anim} ${r.sure}`);
    await b.close();
  }
  {
    const { b, p } = await ac('?akis=0', true);
    await p.evaluate(() => { scrollTo(0, __fl.konum(__fl.toplam - 0.3)); __fl.atla(); });
    await new Promise((r) => setTimeout(r, 300));
    const rz = await p.evaluate(() => {
      const halka = document.querySelector('.fl-halka');
      const gec = document.querySelector('.fl-gec');
      const st = getComputedStyle(halka, '::before');
      const sg = getComputedStyle(gec);
      return { anim: st.animationName, gecGorunur: sg.display !== 'none' && sg.visibility === 'visible' };
    });
    S.halka_azalt = { ...rz, gecti: rz.anim === 'none' && rz.gecGorunur };
    raporla('halka azaltma: cizgi durdu, dugme gorunur', S.halka_azalt);
    await b.close();
  }
  /* BILGI: film sonunda ayni olcum (iframe idle yuku gorunur kalsin) */
  {
    const { b, p } = await ac('?akis=0');
    await p.evaluate(() => { scrollTo(0, __fl.konum(__fl.toplam - 0.3)); __fl.atla(); });
    await new Promise((r) => setTimeout(r, 600));
    const r2 = await p.evaluate(() => new Promise((res) => {
      const halka = document.querySelector('.fl-halka');
      const olc = (sure) => new Promise((r3) => { const k = []; const t0 = performance.now();
        const ad = (n) => { k.push(n); if (n - t0 < sure) requestAnimationFrame(ad); else r3(k); };
        requestAnimationFrame(ad); });
      (async () => { const a = await olc(1500); halka.style.display = 'none'; const b2 = await olc(1500); halka.style.display = ''; res({ a, b2 }); })();
    }));
    const say = (k) => k.slice(1).map((x, j) => x - k[j]).filter((d) => d > 25).length;
    S.halka_filmsonu_bilgi = { dusen: say(r2.a), taban: say(r2.b2), not: 'iframe (eski sayfa) yuklu — idle JS yuku; ana olcum ortada' };
    console.log(` bilgi (film sonu, iframe yuklu): dusen ${S.halka_filmsonu_bilgi.dusen} · taban ${S.halka_filmsonu_bilgi.taban}`);
    await b.close();
  }
  S.halka = {
    tekrar: hTekrar, medyan_dusen: medyan(hTekrar.map((x) => x.dusen)),
    medyan_taban: medyan(hTekrar.map((x) => x.taban)),
    gecti: medyan(hTekrar.map((x) => x.dusen)) === 0 && hTekrar.every((x) => x.anim === 'fl-halka-don' && x.sure === '3.6s'),
  };
  raporla('halka: birlikte dusen 0 + CSS animasyon 3.6s', S.halka);

  /* ---- 7) IBARE (1 Eyl, Enes): surekli yasar + ok dongusel akar ----
     Kapilar: uc ilerleme noktasinda da ekranda (bas/orta/son) · ok
     animasyonu computed'da (animationName none degil) · devirde sonme
     ani ms cinsinden (transitionend kaydi) · reduce'ta ok durur, metin
     kalir. */
  console.log('== IBARE ==');
  {
    const { b, p } = await ac('?akis=0');
    const noktaOku = () => p.evaluate(() => {
      const el = document.querySelector('.fl-ipucu');
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      const nb = getComputedStyle(el.querySelector('svg'));
      const gec = document.querySelector('.fl-gec');
      const gr = gec.getBoundingClientRect();
      const gst = getComputedStyle(gec);
      /* merkez LAYOUT genisligine gore (clientWidth): gercek pencerede
         scrollbar innerWidth'i sisirir, ibare ~7 px "kayik" gorunurdu */
      const cw = document.documentElement.clientWidth;
      return { ekranda: r.top > 0 && r.bottom < innerHeight && st.visibility === 'visible' && +st.opacity > 0.9,
        altOrta: Math.abs((r.left + r.right) / 2 - cw / 2) < 3 && r.bottom > innerHeight * 0.8,
        okAnim: nb.animationName, okSure: nb.animationDuration, metin: el.textContent.trim(),
        /* hiza: dikey merkez farki (pozitif = ibare dugmenin ALTINDA) + yazi kimligi */
        hiza_px: +(((r.top + r.bottom) / 2) - ((gr.top + gr.bottom) / 2)).toFixed(1),
        yazi: { ibare: { aile: st.fontFamily, punto: st.fontSize }, gec: { aile: gst.fontFamily, punto: gst.fontSize } } };
    });
    const noktalar = {};
    for (const [ad, konum] of [['bas', 0], ['orta', 0.5], ['son', 0.98]]) {
      await p.evaluate((k) => { scrollTo(0, __fl.konum(__fl.toplam * k)); __fl.atla(); }, konum);
      await new Promise((r) => setTimeout(r, 250));
      noktalar[ad] = await noktaOku();
      const N = noktalar[ad];
      console.log(` ${ad}: ekranda ${N.ekranda} · altOrta ${N.altOrta} · nabiz ${N.okAnim} ${N.okSure} · hiza +${N.hiza_px} px altta`);
    }
    /* devirde sonme ani: son klip hazir olsun, sona oturt (atla devri
       ayni karede tetikler — tanida dogrulandi), transitionend kaydi */
    await p.waitForFunction('(() => { const s = __fl.sahne(); return s[s.length - 1].durum === "hazir"; })()', { timeout: 120000 });
    await p.evaluate(() => { scrollTo(0, __fl.konum(__fl.toplam)); __fl.atla(); });
    await p.waitForFunction('__devir.kayit.ibareSonduMs !== null', { timeout: 20000 });
    const sonme = await p.evaluate(() => ({
      sonme_ms: Math.round(__devir.kayit.ibareSonduMs - __devir.kayit.basMs),
      opaklik: getComputedStyle(document.querySelector('.fl-ipucu')).opacity,
    }));
    console.log(` devirde sonme: +${sonme.sonme_ms} ms (devir basindan) · sonrasi opaklik ${sonme.opaklik}`);
    await b.close();
    const y = noktalar.bas.yazi;
    console.log(` yazi yan yana — ibare: ${y.ibare.aile} ${y.ibare.punto} · gec: ${y.gec.aile} ${y.gec.punto}`);
    S.ibare = { noktalar, sonme, hiza_px: noktalar.bas.hiza_px, yazi: y,
      /* hiza kapisi: dugmenin BIR TIK ALTINDA (pozitif fark, 2-14 px
         bandi) — sayi ayrica raporlanir; yazi ailesi + punto esit */
      gecti: Object.values(noktalar).every((x) => x.ekranda && x.altOrta && x.okAnim === 'fl-ok-kay' && x.okSure === '3.6s')
        && noktalar.bas.hiza_px > 2 && noktalar.bas.hiza_px < 14
        && y.ibare.aile === y.gec.aile && y.ibare.punto === y.gec.punto
        && sonme.sonme_ms !== null && sonme.opaklik === '0' };
    raporla('ibare: ekranda + nabiz 3.6s + hiza bir tik altta + yazi esit + devirde sondu', { gecti: S.ibare.gecti, hiza_px: noktalar.bas.hiza_px, sonme_ms: sonme.sonme_ms });
  }
  {
    const { b, p } = await ac('?akis=0', true);
    const rz = await p.evaluate(() => {
      const el = document.querySelector('.fl-ipucu');
      const ok = getComputedStyle(el.querySelector('svg'));
      const st = getComputedStyle(el);
      return { okAnim: ok.animationName, gorunur: st.visibility === 'visible' && +st.opacity > 0.9, metin: el.textContent.trim() };
    });
    S.ibare_azalt = { ...rz, gecti: rz.okAnim === 'none' && rz.gorunur && rz.metin.length > 0 };
    raporla('ibare azaltma: ok durdu, metin kaldi', S.ibare_azalt);
    await b.close();
  }

  S.hukum = kirmiziTamam && S.A.gecti && S.A_azalt.gecti && S.B.gecti && S.B_azalt.gecti && S.halka.gecti && S.halka_azalt.gecti && S.ibare.gecti && S.ibare_azalt.gecti ? 'GECTI' : 'KALDI';
  srv.close();
  fs.writeFileSync(CIKTI, JSON.stringify(S, null, 1));
  console.log(`\n=> ${S.hukum}\n→ ${CIKTI}`);
  process.exit(S.hukum === 'GECTI' ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
