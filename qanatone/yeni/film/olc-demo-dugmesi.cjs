#!/usr/bin/env node
/* DEMO DUGMESI KAPISI (5 Eyl 2026, Enes: "demo iste butonu hem mobilde hem
   masaustunde yonlendirme yapmiyor, buton bosta").

   OLCUT — "yonlendirme yapiyor" GOZ KARARI DEGIL, iki mutlak sayi:
     1. kancanin hedefi VAR mi: `document.getElementById(kanca)` != null
     2. tiklamadan sonra sayfa GERCEKTEN gitti mi: hedefin ekrandaki ust
        kenari |top| <= 60 px (scroll-margin-top 24 + kompozitor payi) ve
        kaydirma miktari > 200 px (yerinde saymayi yakalar)
   Iki kol: masaustu (1440x900) ve mobil (412x915) — belirti ikisinde de
   bildirildi, tek kolla hukum kurulmaz.

   KIRMIZI-ONCE: `--kirmizi` kolu tiklamadan ONCE hedefin id'sini bozar
   (eski `#cagri` hali). Kapi orada KIRMIZI yanmalidir; yanmiyorsa yesili
   anlamsizdir.

   Kullanim: node yerel-sun.cjs & ; node yeni/film/olc-demo-dugmesi.cjs
   Cevre   : ADRES=http://127.0.0.1:8790 */
const path = require('path');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ADRES = process.env.ADRES || 'http://127.0.0.1:8790';
const KIRMIZI = process.argv.includes('--kirmizi');
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const KOLLAR = [
  { ad: 'masaustu', vp: { width: 1440, height: 900 }, mobil: false },
  { ad: 'mobil', vp: { width: 412, height: 915, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true }, mobil: true },
];
const SAYFALAR = ['/', '/en/'];

(async () => {
  const tarayici = await pt.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-first-run', '--no-default-browser-check'] });
  const satirlar = [];
  for (const kol of KOLLAR) {
    for (const yol of SAYFALAR) {
      const s = await tarayici.newPage();
      await s.setViewport(kol.vp);
      if (kol.mobil) await s.setUserAgent('Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36');
      await s.evaluateOnNewDocument(() => {
        try { sessionStorage.setItem('qanat-prolog-atlandi', '1'); } catch (e) {}
      });
      await s.goto(ADRES + yol, { waitUntil: 'networkidle2', timeout: 60000 });
      await bekle(900);

      /* DUZENEK KUSURU IKI ADIMDA DUZELTILDI (5 Eyl 2026).
         Ilk yazim sayfanin BASINDA tikliyordu ve masaustunde 4/4 kirmizi
         veriyordu — SAHTE KIRMIZI. Masaustunde sayfanin basinda PROLOG
         FILMI duruyor (`.fl-ray`, olculdu: 121.464 px) ve govde (`.fl-govde`)
         film bitene kadar erisilebilir degil: `scrollIntoView` bile sayfayi
         oynatmiyor (olculdu: kaydirma 51 px, hedefUst sabit 10.959).
         Kullanici dugmeyi ANCAK prolog bittikten/gecildikten sonra goruyor;
         kapi da o durumu olcmeli. Prolog kapisi Film.astro'daki satir ici
         betikte: `sessionStorage['qanat-prolog-atlandi']==='1'` ise film hic
         kurulmaz — donen ziyaretcinin ayni oturumdaki hali. Kapi o anahtari
         gezinmeden ONCE yaziyor. Mobilde prolog zaten kapali (ayni betik,
         `(max-width:900px),(pointer:coarse)`), yani adim mobilde etkisiz. */
      await s.evaluate(() => {
        const h = document.querySelector('.sh-cta');
        if (h) h.scrollIntoView({ block: 'center' });
      });
      await bekle(1200);

      const olc = await s.evaluate(async (kirmizi) => {
        const btn = document.querySelector('.sh-cta .sh-btn');
        if (!btn) return { hata: '.sh-btn yok' };
        const kanca = (btn.getAttribute('href') || '').replace(/^#/, '');
        if (kirmizi) {                       /* eski `#cagri` halini taklit et */
          btn.setAttribute('href', '#cagri');
        }
        const k2 = (btn.getAttribute('href') || '').replace(/^#/, '');
        const hedef = k2 ? document.getElementById(k2) : null;
        const kadraj = btn.getBoundingClientRect();
        const heroGorunur = kadraj.top < innerHeight && kadraj.bottom > 0;
        const oncekiY = window.scrollY;
        btn.click();
        await new Promise((r) => setTimeout(r, 1400));
        const t = hedef ? hedef.getBoundingClientRect().top : null;
        return {
          metin: (btn.textContent || '').trim(), kanca: k2,
          heroGorunur, hedefVar: !!hedef,
          hedefUst: t === null ? null : Math.round(t),
          kaydirma: Math.round(window.scrollY - oncekiY),
          hash: location.hash,
        };
      }, KIRMIZI);

      const gecti = !olc.hata && olc.hedefVar && olc.hedefUst !== null
        && Math.abs(olc.hedefUst) <= 60 && olc.kaydirma > 200;
      satirlar.push({ kol: kol.ad, yol, ...olc, gecti });
      console.log(`${gecti ? 'GECTI' : 'KALDI'} ${kol.ad.padEnd(9)} ${yol.padEnd(6)}` +
        ` metin="${olc.metin || '-'}" kanca=#${olc.kanca || '-'} hedefVar=${olc.hedefVar}` +
        ` hedefUst=${olc.hedefUst} kaydirma=${olc.kaydirma}`);
      await s.close();
    }
  }
  await tarayici.close();
  const kalan = satirlar.filter((r) => !r.gecti).length;
  console.log(`\nKAPI: ${satirlar.length - kalan}/${satirlar.length} gecti` +
    (KIRMIZI ? '  (KIRMIZI-ONCE kolu: hepsi KALMALI)' : ''));
  process.exit(KIRMIZI ? (kalan === satirlar.length ? 0 : 3) : (kalan ? 2 : 0));
})().catch((e) => { console.error('DUZENEK HATASI:', e); process.exit(1); });
