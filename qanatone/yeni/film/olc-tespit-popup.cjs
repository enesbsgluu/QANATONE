#!/usr/bin/env node
/* TESPIT ARACI ARAYUZ KAPISI (5 Eyl 2026).
   Uc sey olculur, ucu de GERCEK CHROME'da:
     1. Kalem popup'i aciliyor mu ve ICINDEKI DORT ALAN DOLU MU
        (rozet · ad · olculen · olcut · neden) — Enes: "tiklayinca pop up
        olarak acilip sebeplerini gercek bir sekilde ozetle belirtsin".
     2. Duvar yolunda ziyaretci GENEL mesaj degil DURUMA OZEL mesaj ve
        olculen gercekleri (HTTP kodu, saglayici) goruyor mu.
     3. KIRMIZI-ONCE: arayuzun TANIMADIGI bir `durum` gelince genel mesaja
        dusuyor mu — dusmuyorsa harita hic okunmuyor demektir ve 1-2'nin
        yesili anlamsizdir.

   FONKSIYON TAKLIT EDILIR (istek yakalanip sahte yanit donulur): kota
   harcanmaz, ag'a cikilmaz, yanit SABIT — kapi arayuzu olcer, agi degil.

   Kullanim: node yerel-sun.cjs &  ·  node yeni/film/olc-tespit-popup.cjs
*/
const path = require('path');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ADRES = process.env.ADRES || 'http://127.0.0.1:8790';
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/* Fonksiyonun GERCEK bicimi — alanlar diagnose.js'in dondugunun aynisi. */
const SAGLIKLI = {
  ok: true, host: 'ornek.com', finalUrl: 'https://ornek.com/', score: 71, kb: 640,
  kalan: 1, status: 200, bytes: 655360, redirects: 0, cdn: 'cloudflare',
  durum: 'saglikli', cfEylul: false,
  items: [
    { k: 'schema', state: 'fail', v: '', o: 'ld+json · microdata' },
    { k: 'alt', state: 'fail', v: '7', o: '0 · ≤2' },
    { k: 'weight', state: 'warn', v: '640', o: '≤500 · ≤1500 KB' },
    { k: 'title', state: 'ok', v: '48', o: '25-65 · 10-80' },
    { k: 'status', state: 'ok', v: '200', o: '2xx' },
    { k: 'whatsapp', state: 'ok', v: '', o: 'wa.me' },
  ],
};
const DUVAR = {
  ok: false, durum: 'engel', saglayici: 'cloudflare', host: 'ornek.com',
  finalUrl: 'https://ornek.com/', status: 403, bytes: 5300, redirects: 0,
  cdn: 'cloudflare', cfEylul: true,
};
const BILINMEYEN = { ok: false, durum: 'zart-zurt', host: 'ornek.com', status: 418 };

async function kol(tarayici, ad, yanit, is) {
  const s = await tarayici.newPage();
  await s.setViewport({ width: 1280, height: 900 });
  await s.setRequestInterception(true);
  s.on('request', (r) => {
    if (r.url().includes('/.netlify/functions/diagnose')) {
      return r.respond({ status: yanit.ok === false && yanit.durum === undefined ? 429 : 200,
        contentType: 'application/json', body: JSON.stringify(yanit) });
    }
    r.continue();
  });
  await s.goto(ADRES + '/', { waitUntil: 'networkidle2', timeout: 60000 });
  /* prolog masaustunde hero'yu tutuyor — tespit sahnesine gitmek icin gec */
  await s.evaluate(() => { try { sessionStorage.setItem('qanat-prolog-atlandi', '1'); } catch (e) {} });
  await s.reload({ waitUntil: 'networkidle2' });
  await bekle(800);
  await s.evaluate(() => document.getElementById('tespit').scrollIntoView({ block: 'center' }));
  await bekle(500);
  await s.evaluate(() => {
    document.getElementById('steUrl').value = 'ornek.com';
    document.getElementById('steForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });
  await bekle(1500);
  const c = await is(s);
  await s.close();
  return { ad, ...c };
}

(async () => {
  const tarayici = await pt.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-first-run', '--no-default-browser-check'] });
  const satir = [];

  /* 1 — POPUP */
  satir.push(await kol(tarayici, 'popup (fail kalemi)', SAGLIKLI, async (s) => {
    const once = await s.evaluate(() => {
      const d = document.getElementById('stePop');
      return { acikOnce: !!(d && d.open), dugme: document.querySelectorAll('.ste-kalem-ac').length };
    });
    await s.evaluate(() => document.querySelector('.ste-kalem.fail .ste-kalem-ac').click());
    await bekle(500);
    const p = await s.evaluate(() => {
      const d = document.getElementById('stePop');
      const al = (id) => { const e = document.getElementById(id); return e ? e.textContent.trim() : null; };
      const gor = (id) => { const e = document.getElementById(id); return e ? !e.hidden : false; };
      return { acik: !!(d && d.open), rozet: al('stePopRozet'), ad: al('stePopAd'),
        deger: gor('stePopDegerSatir') ? al('stePopDeger') : null,
        olcut: gor('stePopOlcutSatir') ? al('stePopOlcut') : null,
        neden: al('stePopNeden') };
    });
    const gecti = once.dugme === 6 && !once.acikOnce && p.acik && !!p.rozet && !!p.ad
      && !!p.olcut && !!p.neden && p.neden.length > 20;
    return { gecti, not: `dugme=${once.dugme} acik=${p.acik} rozet="${p.rozet}" ad="${p.ad}"`
      + ` olculen=${p.deger} olcut="${p.olcut}" neden=${p.neden ? p.neden.length + ' harf' : 'YOK'}` };
  }));

  /* 2 — DUVAR YOLU */
  satir.push(await kol(tarayici, 'duvar yolu (engel)', DUVAR, async (s) => {
    const m = await s.evaluate(() => document.getElementById('steDurum').textContent.trim());
    const gecti = !/tamamlanamad|could not be completed/i.test(m)
      && /403/.test(m) && /cloudflare/i.test(m);
    return { gecti, not: `mesaj="${m}"` };
  }));

  /* 3 — KIRMIZI-ONCE: taninmayan durum genel mesaja dusmeli */
  satir.push(await kol(tarayici, 'KIRMIZI-ONCE (bilinmeyen durum)', BILINMEYEN, async (s) => {
    const m = await s.evaluate(() => document.getElementById('steDurum').textContent.trim());
    const gecti = /tamamlanamad|could not be completed/i.test(m);
    return { gecti, not: `mesaj="${m}"` };
  }));

  await tarayici.close();
  for (const r of satir) console.log(`${r.gecti ? 'GECTI' : 'KALDI'}  ${r.ad.padEnd(30)} ${r.not}`);
  const kalan = satir.filter((r) => !r.gecti).length;
  console.log(`\nKAPI: ${satir.length - kalan}/${satir.length} gecti`);
  process.exit(kalan ? 2 : 0);
})().catch((e) => { console.error('DUZENEK HATASI:', e); process.exit(1); });
