#!/usr/bin/env node
/* YEDEK YAZI TIPI OLCU KALIBRASYONU (TUR 3, 4 Eyl 2026).

   NEDEN VAR. Olcu eslenmis yedegin `size-adjust` degeri OS/2 tablosunun
   `xAvgCharWidth` alanindan turetilirse yanlis cikiyor: o alan fontun
   kendi glif kumesi uzerinden hesaplanir ve iki fontun kumesi ayni degil.
   Olculdu (100 px, ornek dize): Uncut Sans 1703,8 px iken xAvg'den
   turetilen yedek 1733,5 px — %1,74 sisik, ve o fark satir sarmasini
   degistirip kaymayi geri getiriyordu.
   DOGRUSU: orani SAYFANIN KENDI METNIYLE olcmek. Bu betik gercek bir
   bulten yazisinin govde metnini alir, ayni punto ve ayni sarma
   genisliginde her aday yedekle cizdirir ve size-adjust'i olcumden
   turetir. Ciktisi dogrudan font.css'e yazilacak sayilardir.

   KULLANIM (yerel-sun 8790 ayakta):  node yeni/film/font-yedek-olc.cjs
   ENV: SAYFA · TARAYICI · KOK
   NOT: yalniz BU MAKINEDE KURULU yedekler olculebilir (Roboto yoksa
   'kurulu degil' yazar ve o satir xAvg turevinde birakilir). */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const KOK = (process.env.KOK || 'http://127.0.0.1:8790').replace(/\/$/, '');
const SAYFA = process.env.SAYFA || '/yeni/bulten/yapay-zeka-trafigi-tiklama-degil/';
const EXE = (process.env.TARAYICI === 'brave')
  ? 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
  : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
/* web fontun kendi olculeri (fontTools ile okundu, font.css'te yazili) */
const WEB = { upem: 1000, asc: 965, desc: 235, gap: 0 };
const ADAYLAR = [
  { ad: 'Segoe', local: ["local('Segoe UI')"] },
  { ad: 'Arial', local: ["local('Arial')", "local('Helvetica Neue')", "local('Liberation Sans')"] },
  { ad: 'Roboto', local: ["local('Roboto')", "local('Noto Sans')"] },
];

(async () => {
  const b = await pt.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await p.setCacheEnabled(false);
  const r = await p.goto(KOK + SAYFA, { waitUntil: 'networkidle0', timeout: 120000 });
  if (!r || r.status() !== 200) { console.error('durum', r && r.status()); process.exit(1); }
  await p.evaluate(() => document.fonts.ready);
  const olcum = await p.evaluate(async (adaylar) => {
    /* olculecek metin: sayfanin KENDI govdesi (glif dagilimi gercek) */
    const metin = (document.querySelector('.govde') || document.body).textContent
      .replace(/\s+/g, ' ').trim().slice(0, 4000);
    const kutu = document.createElement('div');
    kutu.style.cssText = 'position:absolute;left:-99999px;top:0;width:800px;font-size:16.5px;line-height:1.66;white-space:normal;';
    kutu.textContent = metin;
    document.body.appendChild(kutu);
    const cizgi = document.createElement('span');
    cizgi.style.cssText = 'position:absolute;left:-99999px;top:0;white-space:nowrap;font-size:200px;';
    cizgi.textContent = metin.slice(0, 300);
    document.body.appendChild(cizgi);
    const olc = async (aile) => {
      kutu.style.fontFamily = aile; cizgi.style.fontFamily = aile;
      await document.fonts.ready;
      return { yukseklik: Math.round(kutu.getBoundingClientRect().height * 100) / 100,
        genislik: Math.round(cizgi.getBoundingClientRect().width * 100) / 100 };
    };
    const web = await olc("'Uncut Sans'");
    const cikti = { web, aday: {} };
    for (const a of adaylar) {
      /* size-adjust'siz ham yuz: oran buradan cikar */
      const ad = 'Kalib' + a.ad;
      const kural = `@font-face{font-family:'${ad}';src:${a.local.join(',')}}`;
      const st = document.createElement('style'); st.textContent = kural; document.head.appendChild(st);
      await document.fonts.load(`16.5px '${ad}'`).catch(() => {});
      const m = await olc(`'${ad}'`);
      /* kurulu mu: yuz yuklenmediyse tarayici varsayilanina duser ve
         olcum baska bir fontu olcer — yuklendi mi diye bakilir */
      const kurulu = [...document.fonts].some((f) => f.family === ad && f.status === 'loaded');
      cikti.aday[a.ad] = { ...m, kurulu };
      st.remove();
    }
    kutu.remove(); cizgi.remove();
    return cikti;
  }, ADAYLAR);
  await b.close();

  console.log(`OLCUM  metin ${SAYFA} govdesi · 800 px sarma · 16,5/1,66 · cizgi 200 px`);
  console.log(`  Uncut Sans        genislik ${olcum.web.genislik} · sarilmis yukseklik ${olcum.web.yukseklik}`);
  const satirlar = [];
  for (const a of ADAYLAR) {
    const m = olcum.aday[a.ad];
    if (!m.kurulu) { console.log(`  ${a.ad.padEnd(17)} KURULU DEGIL — bu makinede kalibre edilemez`); continue; }
    const S = olcum.web.genislik / m.genislik;
    const asc = (WEB.asc / WEB.upem) / S, desc = (WEB.desc / WEB.upem) / S, gap = (WEB.gap / WEB.upem) / S;
    console.log(`  ${a.ad.padEnd(17)} genislik ${m.genislik} · yukseklik ${m.yukseklik}  ->  size-adjust ${(S * 100).toFixed(2)}%  ascent ${(asc * 100).toFixed(2)}%  descent ${(desc * 100).toFixed(2)}%  line-gap ${(gap * 100).toFixed(2)}%`);
    satirlar.push(`@font-face{font-family:'Uncut Yedek ${a.ad}';src:${a.local.join(',')};size-adjust:${(S * 100).toFixed(2)}%;ascent-override:${(asc * 100).toFixed(2)}%;descent-override:${(desc * 100).toFixed(2)}%;line-gap-override:${(gap * 100).toFixed(2)}%}`);
  }
  console.log('\nfont.css satirlari:');
  satirlar.forEach((s) => console.log(s));
  fs.writeFileSync(path.join(__dirname, 'font-yedek-olc.json'), JSON.stringify({ _: 'yeni/film/font-yedek-olc.cjs — yedek yuzun size-adjust/ascent/descent degerleri SAYFANIN KENDI METNIYLE olculur (xAvgCharWidth turevi %1,74 sasiyordu).', olcum: new Date().toISOString(), sayfa: SAYFA, web: olcum.web, aday: olcum.aday, satirlar }, null, 1));
})().catch((e) => { console.error(e); process.exit(3); });
