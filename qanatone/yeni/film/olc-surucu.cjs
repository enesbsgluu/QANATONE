#!/usr/bin/env node
/* SURUCU KAPISI (SOKUM VE TASIMA TURU, 4 Eyl 2026).
   Kural (Enes): "IO dogus tetigidir, kaydirma surucudur. Bolum gorununce
   bastan sona oynayan hicbir sahne kalmayacak."
   OLCUM: her sayfada her bolum (section / .blok / .sdsec / [data-sahne])
   kadraja getirilir, 120 ms sonra document.getAnimations() okunur:
     · timeline ScrollTimeline/ViewTimeline -> KAYDIRMA SURUCU (serbest)
     · DocumentTimeline + iterations sonlu + playState running ->
       "gorununce bastan sona oynayan" -> KIRMIZI (adi + secici yazilir)
     · DocumentTimeline + iterations Infinity -> DONGU (demo/halka/nabiz)
       -> ayri sayilir, kapiya girmez (sahne degil, sus)
   Kadraja girmeden once koşan animasyon (acilis: perde, hero yukselisi)
   sayfa basinda bir kez toplanip AYRILIR: onlar dogusla degil yuklemeyle
   oynar (kaynak davranisi). Film sayfasi haric (kendi tablosu).
   KIRMIZI-ONCE: ?boz=surucu kolu yok; rig'in kendi kirmizisi: sayfaya
   evaluate ile 600 ms'lik sonlu bir CSS animasyonu enjekte edilip bir
   bolume baglanir, o bolum kadraja getirilince yakalanmali.
   Kullanim: node yeni/film/olc-surucu.cjs   (once: node yerel-sun.cjs) */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const DIST = path.join(__dirname, '..', '..', 'dist', 'yeni');
const CIKTI = path.join(__dirname, 'olc-surucu.json');
const CHROME = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
const sayfalar = [];
(function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(_astro|font|img|varlik|film|deneme-react)$/.test(e.name)) gez(p); }
    else if (e.name === 'index.html') sayfalar.push('/yeni/' + path.relative(DIST, p).replace(/\\/g, '/').replace(/index\.html$/, ''));
  }
})(DIST);
const secim = process.env.SAYFA ? [process.env.SAYFA] : sayfalar.sort();
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const TARA = `(async (bozBolum) => {
  const sec = (el) => el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/)[0] : '');
  const anims = () => document.getAnimations().map((a) => {
    const t = a.timeline; const tl = t ? t.constructor.name : 'yok';
    const ef = a.effect; const tim = ef && ef.getTiming ? ef.getTiming() : {};
    const hedef = ef && ef.target ? sec(ef.target) : '?';
    /* kabuk gecisleri (nav stuck, footer, imlec) sahne degil: main disi hedef sayilmaz */
    const icerik = !!(ef && ef.target && ef.target.closest && ef.target.closest('main'));
    return { icerik, ad: a.animationName || a.id || (a.constructor && a.constructor.name) || '?', tl, iter: tim.iterations, sure: tim.duration, durum: a.playState, hedef, ps: ef && ef.pseudoElement || '', bas: a.startTime };
  });
  scrollTo(0, 0); await new Promise((r) => setTimeout(r, 300));
  const acilisL = anims().filter((a) => a.tl === 'DocumentTimeline' && a.icerik);
  const acilis = new Set(acilisL.map((a) => a.ad + '|' + a.hedef + a.ps));
  /* ISTISNA (Enes, 5 Eyl) — ad: gerekce */
  const ISTISNA = {
    'sus-gaspin': 'dugme huzmesi — saf dekor, gec dugmesi halkasiyla ayni sinif',
    'st-akis': 'logo seridi dokusu — yuklemede baslar, icerige anlam katmaz',
    'sh-': 'hero acilis koreografisi — yuklemeyle bir kez, kadraj tetigi degil',
    'amCW': 'pazar motoru / TradeSelf amblemi — dekor (MotorSahne ayri tur)',
    'amCCW': 'pazar motoru / TradeSelf amblemi — dekor',
    'kivGit': 'pazar motoru kivilcimlari — dekor (MotorSahne ayri tur)',
    'qtCar': 'platform sahnesi imlec yanip sonmesi — dekor',
    'blok-parla': 'ayrinti seridi parlamasi — kullanici etkilesimi (cip)',
    'kdIn': 'kadro ayrinti — kullanici etkilesimi',
    'CSSTransition': 'gecis — hover/etkilesim ya da kaydirma durumu, sahne degil',
  };
  const istisnaMi = (ad) => Object.keys(ISTISNA).find((k) => (k.endsWith('-') ? ad.startsWith(k) : ad === k));
  const istisnaGorulen = {};
  if (bozBolum) {
    const st = document.createElement('style'); st.textContent = '@keyframes olcBoz{from{opacity:.99}to{opacity:1}}';
    document.head.appendChild(st);
  }
  const bolumler = [...document.querySelectorAll('main section, main .blok, main .sdsec, main [data-sahne], footer')];
  const kirmizi = [], dongu = new Set(), kaydirma = new Set();
  let i = 0;
  for (const b of bolumler) {
    i++;
    if (bozBolum && i === bozBolum) { b.style.animation = 'olcBoz .6s linear 1'; }
    const t0 = document.timeline.currentTime;
    b.scrollIntoView({ block: 'start', behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 120));
    for (const a of anims()) {
      if (!a.icerik) continue;
      if (a.tl !== 'DocumentTimeline') { kaydirma.add(a.ad + '@' + a.hedef); continue; }
      const ist = istisnaMi(a.ad);
      if (ist) { istisnaGorulen[ist] = ISTISNA[ist]; continue; }
      /* GENIS TANIM (Enes, 5 Eyl): kadrajda hareket eden her sey — surekli
         donen sonsuz dongu (ne zaman baslamis olursa olsun) ya da girisle
         baslayan sonlu (startTime >= bolume gelis - 300 ms; bitmis olsa da) */
      const sonsuz = !isFinite(a.iter);
      if (sonsuz) { if (a.durum !== 'running') continue; }
      else if (a.bas === null || a.bas < t0 - 300) continue;
      const k = a.ad + '|' + a.hedef + a.ps;
      kirmizi.push({ bolum: sec(b), anim: a.ad, hedef: a.hedef + a.ps, sure: a.sure, sonsuz: !isFinite(a.iter) });
    }
  }
  const tekil = []; const g = new Set();
  for (const k of kirmizi) { const id = k.bolum + '|' + k.anim + '|' + k.hedef; if (!g.has(id)) { g.add(id); tekil.push(k); } }
  return { bolum: bolumler.length, kirmizi: tekil, dongu: [...dongu].slice(0, 12), kaydirma: [...kaydirma].length, acilis: acilis.size,
    /* ENVANTER: yuklemeyle (ilk ekranda) baslayanlar da adiyla — IO ile ilk ekranda tetiklenen demolar burada saklaniyordu */
    acilisListe: acilisL.map((a) => ({ anim: a.ad, hedef: a.hedef + a.ps, sonsuz: !isFinite(a.iter) })), istisna: istisnaGorulen };
})`;

(async () => {
  const browser = await pt.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1460,980'], defaultViewport: null, protocolTimeout: 300000 });
  const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900 });
  /* kirmizi kontrol: ilk sayfada 2. bolume sonlu animasyon enjekte */
  await page.goto(SUNUCU + secim[0], { waitUntil: 'load' }); await bekle(800);
  const kr = await page.evaluate(TARA + '(2)');
  const yakalandi = kr.kirmizi.some((k) => k.anim === 'olcBoz');
  console.log(`KIRMIZI KONTROL (${secim[0]} · 2. bolume 600 ms sonlu animasyon): ${yakalandi ? 'YAKALANDI' : 'YAKALANAMADI'}`);
  const sonuc = [];
  for (const yol of secim) {
    await page.goto(SUNUCU + yol, { waitUntil: 'load' }); await bekle(800);
    const r = await page.evaluate(TARA + '(0)');
    sonuc.push({ yol, ...r });
    console.log(`${r.kirmizi.length ? 'KALDI' : 'ok   '} ${yol.padEnd(34)} bolum ${r.bolum} · kaydirma ${r.kaydirma} · dongu ${r.dongu.length}${r.kirmizi.length ? ' · KIRMIZI ' + r.kirmizi.slice(0, 3).map((k) => `${k.bolum}:${k.anim}@${k.hedef}`).join(' ') : ''}`);
  }
  await browser.close();
  const gecti = yakalandi && sonuc.every((s) => s.kirmizi.length === 0);
  const istisnalar = {}; for (const s of sonuc) Object.assign(istisnalar, s.istisna || {});
  console.log('ISTISNALAR (adiyla, gerekcesiyle): ' + Object.entries(istisnalar).map(([k, v]) => `${k}: ${v}`).join(' · '));
  fs.writeFileSync(CIKTI, JSON.stringify({ _: 'yeni/film/olc-surucu.cjs — surucu kapisi: bolum gorununce oynayan sonlu DocumentTimeline animasyonu = kirmizi; view/scroll timeline serbest; sonsuz dongu ayri (sus).', olcum: new Date().toISOString(), kirmizi_kontrol: { yakalandi }, hukum: gecti ? 'GECTI' : 'KALDI', istisnalar, sayfa: sonuc }, null, 1));
  console.log(`\nHUKUM: ${gecti ? 'GECTI' : 'KALDI'}\n→ ${CIKTI}`);
  process.exit(gecti ? 0 : 2);
})().catch((e) => { console.error(e); process.exit(1); });
