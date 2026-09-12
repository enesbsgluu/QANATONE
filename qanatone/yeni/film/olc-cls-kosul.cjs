#!/usr/bin/env node
/* CLS AYKIRI DEGERININ KOSULU (TUR 3, 4 Eyl 2026).

   NEDEN VAR. 3/4 Eyl gecesi bir bulten yazisi tam supurmede UC KEZ ARKA
   ARKAYA CLS 0,1622 verdi, ayri uc kosumda 0 / 0 / 0,0013. Medyan gecti
   ama kapatilmadi: uc kez arka arkaya tekrarlayan aykiri deger gurultu
   degil, KOSULA baglidir. Bu arac kosulu arar — ayni sayfayi ayni kodla,
   ORTAMI degistirerek olcer ve hangi ortamin sicramayi dogurdugunu yazar.

   KOSULLAR (her biri ayri kol, hepsi ayni sayfada):
     sicak     onbellek sicak (sayfa iki kez yuklenir, IKINCISI olculur)
     soguk     onbellek kapali, her istek agdan
     font-gec  woff2 istekleri GECIKTIRILIR (FONT_GEC ms, varsayilan 900)
     font-yok  woff2 istekleri REDDEDILIR (yedek yazi tipiyle kalinir)
     yavas     Yavas 4G (400 kb/s, 400 ms RTT) + 4x islemci kisiti
     supur     supurmeli kosum: olc-chrome'un yaptigi gibi sayfa sonuna
               kadar kaydirilir (aykiri deger TAM SUPURMEDE gorulmustu)
   Kol adlari KOL env'iyle sinirlanabilir (virgullu).

   NE OLCULUR. Her kaymanin kaynak DORTGENLERI (once/sonra) ve toplam CLS.
   `hadRecentInput` olanlar CWV gibi ATLANIR. Cikti kol basina N kosum,
   medyan + en yuksek + kaynak listesi.

   KULLANIM (yerel-sun 8790 ayakta):
     node yeni/film/olc-cls-kosul.cjs
     SAYFA=/yeni/bulten/google-ads-maliyetleri-2026/ TEKRAR=5 node ...
   ENV: KOK · SAYFA · TEKRAR (3) · KOL · FONT_GEC (900) · TARAYICI ·
        KAPI (0.1) */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const KOK = (process.env.KOK || 'http://127.0.0.1:8790').replace(/\/$/, '');
const SAYFA = process.env.SAYFA || '/yeni/bulten/google-ads-maliyetleri-2026/';
const TEKRAR = Number(process.env.TEKRAR || 3);
const FONT_GEC = Number(process.env.FONT_GEC || 900);
const KAPI = Number(process.env.KAPI || 0.1);
const CIKTI = path.join(__dirname, 'olc-cls-kosul.json');
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'chrome';
const EXE = TARAYICILAR[TARAYICI] || TARAYICI;
const KOLLAR = (process.env.KOL || 'sicak,soguk,font-gec,font-yok,yavas,supur,supur-erken').split(',').map((x) => x.trim()).filter(Boolean);

const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[(s.length - 1) >> 1] : null; };
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/* CWV ile ayni sayim: hadRecentInput atlanir, oturum penceresi degil TOPLAM
   ve EN BUYUK PENCERE ikisi de tutulur (olc-chrome ile ayni yaklasim). */
const GOZLEM = () => {
  const w = { cls: 0, clsMax: 0, pencere: [], kaynak: [] };
  window.__cls = w;
  let bas = 0, son = 0, top = 0;
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        w.cls += e.value;
        if (!bas || e.startTime - son > 1000 || e.startTime - bas > 5000) { bas = e.startTime; top = 0; }
        son = e.startTime; top += e.value;
        if (top > w.clsMax) w.clsMax = top;
        if (e.value > 0.0005) w.kaynak.push({
          t: Math.round(e.startTime), v: +e.value.toFixed(4),
          ogeler: (e.sources || []).slice(0, 3).map((s) => ({
            el: s.node ? (s.node.tagName || '').toLowerCase() + (s.node.id ? '#' + s.node.id : '') + (s.node.className && typeof s.node.className === 'string' ? '.' + s.node.className.trim().split(/\s+/).slice(0, 2).join('.') : '') : '?',
            once: s.previousRect ? [s.previousRect.x, s.previousRect.y, s.previousRect.width, s.previousRect.height].map(Math.round) : null,
            sonra: s.currentRect ? [s.currentRect.x, s.currentRect.y, s.currentRect.width, s.currentRect.height].map(Math.round) : null,
          })),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) { w.hata = String(e); }
};

async function birKosum(browser, kol) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => { try { sessionStorage.setItem('qanat-splash-seen', '1'); sessionStorage.setItem('qanat-prolog-atlandi', '1'); } catch (e) {} });
  await p.evaluateOnNewDocument(GOZLEM);
  const cdp = await p.target().createCDPSession();

  if (kol === 'soguk') await p.setCacheEnabled(false);
  if (kol === 'font-gec' || kol === 'font-yok' || kol === 'supur-erken') {
    await p.setRequestInterception(true);
    p.on('request', async (r) => {
      if (/\.woff2?(\?|$)/i.test(r.url())) {
        if (kol === 'font-yok') return r.abort().catch(() => {});
        await bekle(kol === 'supur-erken' ? Math.max(FONT_GEC, 1500) : FONT_GEC);
        return r.continue().catch(() => {});
      }
      r.continue().catch(() => {});
    });
  }
  if (kol === 'yavas') {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  if (kol === 'sicak') { await p.goto(KOK + SAYFA, { waitUntil: 'networkidle0', timeout: 120000 }); await bekle(300); }

  const r = await p.goto(KOK + SAYFA, { waitUntil: 'load', timeout: 180000 });
  const durum = r ? r.status() : 0;
  /* 'supur-erken': BEKLEMEDEN supurmeye baslar ve fontlar GECIKTIRILIR.
     Hipotez: yazi tipi takasi belge geneline yayilir; bir yazinin ALTINA
     inmis okuyucuda kayma, ustundeki butun satirlarin biriken farkidir —
     tepede 27 px olan sicrama asagida yuzlerce px olur. Aykiri deger
     "tam supurmede" gorulmustu; bu kol tam o ani kurar. */
  if (kol !== 'supur-erken') await bekle(kol === 'yavas' ? 4000 : 1500);
  if (kol === 'supur' || kol === 'supur-erken') {
    /* olc-chrome'un supurmesiyle ayni: gercek girdi (CDP tekerlek) —
       girdi kaynakli kaymalar `hadRecentInput` ile zaten sayilmiyor,
       yani supurmenin KENDISI CLS uretmez; supurme SONRADAN yuklenen
       icerigi tetikler ve asil soru odur. */
    const toplam = await p.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
    let y = 0, tur = 0;
    while (y < toplam - 4 && tur++ < 60) {
      await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, yDistance: -Math.min(900, toplam - y), speed: 1400, gestureSourceType: 'mouse' });
      const ny = await p.evaluate(() => scrollY); if (ny <= y) break; y = ny;
    }
    await bekle(800);
  }
  const d = await p.evaluate(() => {
    const w = window.__cls;
    return { cls: +Math.max(w.cls, w.clsMax).toFixed(4), toplam: +w.cls.toFixed(4), enBuyukPencere: +w.clsMax.toFixed(4), kaynak: w.kaynak.slice(0, 5), hata: w.hata || null };
  });
  const fontlar = await p.evaluate(() => { try { return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight).slice(0, 8); } catch (e) { return ['?']; } });
  await ctx.close();
  return { kol, durum, ...d, yuklenenFont: fontlar.length };
}

(async () => {
  const browser = await pt.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] });
  const surum = await browser.version();
  console.log(`TARAYICI : ${TARAYICI} · ${surum} · ${KOK}${SAYFA} · tekrar ${TEKRAR} · kapi ${KAPI} · kollar ${KOLLAR.join(',')}`);
  const S = { _: 'yeni/film/olc-cls-kosul.cjs — ayni sayfa, degisen ORTAM: CLS aykiri degerinin kosulunu arar.', olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, sayfa: SAYFA, tekrar: TEKRAR, kapi: KAPI, font_gec_ms: FONT_GEC, kol: {} };
  let asan = [];
  for (const kol of KOLLAR) {
    const kosumlar = [];
    for (let i = 0; i < TEKRAR; i++) {
      const k = await birKosum(browser, kol);
      kosumlar.push(k);
      console.log(`  ${kol.padEnd(9)} #${i + 1}  CLS ${String(k.cls).padStart(7)}  (toplam ${k.toplam} · en buyuk pencere ${k.enBuyukPencere} · font ${k.yuklenenFont})  ${k.kaynak.length ? JSON.stringify(k.kaynak[0]).slice(0, 150) : ''}`);
    }
    const dizi = kosumlar.map((k) => k.cls);
    const m = medyan(dizi), enY = Math.max(...dizi);
    if (enY > KAPI) asan.push(kol);
    S.kol[kol] = { medyan: m, en_yuksek: enY, kosumlar };
    console.log(`  ${enY > KAPI ? 'ASTI ' : 'temiz'} ${kol}: medyan ${m} · en yuksek ${enY} (kapi ${KAPI})\n`);
  }
  await browser.close();
  S.asan = asan;
  fs.writeFileSync(CIKTI, JSON.stringify(S, null, 1));
  console.log(asan.length ? `KOSUL BULUNDU: ${asan.join(', ')} → ${CIKTI}` : `hicbir kol esigi asmadi → ${CIKTI}`);
})().catch((e) => { console.error(e); process.exit(3); });
