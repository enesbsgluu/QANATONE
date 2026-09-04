#!/usr/bin/env node
/* SURUCU KAPISI — GORUNURLUKTE CANLI (yeniden yazim, 3 Eyl 2026).
   Kural (Enes, 3 Eyl 2026, CLAUDE.md "Surec demolari gorunurlukte canli";
   4-5 Eyl'un "IO dogus tetigidir, kaydirma surucudur" kurali KALKTI):
   "akis/otomasyon demolari kaydirdikca ilerlemez; bolum kadraja girince
   kendi ritminde sonsuz doner, cikinca durur — eski sitenin #akis.aklive
   deseni. Kaydirma cizelgesine bagli kalan tek sey film/deste gibi
   kaydirmanin kendisini anlatan sahneler."
   DEMO KOKLERI (kapinin sozlesmesi: kok --akps:paused dogar, IO .akoynar
   verince running; her animasyonlu kural play-state'i --akps'ten okur):
     .sa-kart   ana sayfa akis seridi (SAAkis.astro + akis.css)
     .hd-demo   hizmet detay girisi (HizmetGovde.astro + demo-detay.css)
     .tsa       TradeSelf amblemi (ayni kapi; dekor ama kural ayni)
     .akis3     /otomasyon akis diyagrami (OtomasyonGovde.astro)
   OLCUM (her sayfa, her kok; yalniz CSSAnimation sayilir, gecisler degil):
     1. KADRAJ DISI (sayfa basi ya da sonu, kok hangisinde gorunmuyorsa)
        → 400 ms → kok.getAnimations({subtree:true}):
          · hicbiri ScrollTimeline/ViewTimeline tasimaz  (KIRMIZI: cizelge)
          · hepsi playState 'paused'                      (KIRMIZI: disarida oynuyor)
     2. KADRAJDA (scrollIntoView center/center) → 700 ms:
          · en az biri 'running'                          (KIRMIZI: kadrajda olu)
          · running olanlardan en az biri iterations=∞    (KIRMIZI: dongu yok)
          · yine cizelge yok
     3. TEKRAR KADRAJ DISI → 400 ms → hepsi 'paused'      (KIRMIZI: cikinca durmuyor)
     Kadrajdan cikarilamayan kok (sayfa kisa) 1/3'u atlar, notu yazilir.
     Animasyonsuz kok (.sa-tum gibi) sayilir, kirmizi degildir.
   H11 GECISI: prefers-reduced-motion:reduce emulasyonuyla sayfa yeniden
     yuklenir, her kok kadraja getirilir, running CSSAnimation 0 olmali.
   KIRMIZI-ONCE (rig'in kendi kirmizisi, ilk kokluk sayfada):
     (a) kok kadraj disindayken style --akps:running → adim 1 yakalamali
     (b) kok kadrajdayken bir alt animasyona JS ViewTimeline baglanir
         → adim 2 yakalamali; ikisi de geri alinir.
   Film sayfasi ve /film altinda hicbir sey olculmez (kendi tablosu).
   Kullanim: node yeni/film/olc-surucu.cjs   (once: node yerel-sun.cjs)
             SAYFA=/yeni/otomasyon/ node yeni/film/olc-surucu.cjs */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const DIST = path.join(__dirname, '..', '..', 'dist');
const CIKTI = path.join(__dirname, 'olc-surucu.json');
const CHROME = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
const KOKLER = '.sa-kart, .hd-demo, .tsa, .akis3';
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

/* Sayfa ici tarayici: boz = { disarida: i, cizelge: i } → i. koke rig kirmizisi */
const TARA = `(async (KOKLER, boz, reduce) => {
  const sec = (el) => el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  const uyku = (ms) => new Promise((r) => setTimeout(r, ms));
  const animlar = (kok) => kok.getAnimations({ subtree: true }).filter((a) => a instanceof CSSAnimation).map((a) => {
    const t = a.timeline; const tl = t ? t.constructor.name : 'yok';
    const tim = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
    return { ad: a.animationName, tl, sonsuz: !isFinite(tim.iterations), durum: a.playState,
      hedef: (a.effect && a.effect.target ? sec(a.effect.target) : '?') + (a.effect && a.effect.pseudoElement || '') };
  });
  const gorunuyor = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  /* kadraj disina cikar: once sayfa basi, olmadi sayfa sonu */
  const uzaklas = (el) => {
    scrollTo(0, 0); if (!gorunuyor(el)) return true;
    scrollTo(0, document.documentElement.scrollHeight); if (!gorunuyor(el)) return true;
    return false;
  };
  const kokler = [...document.querySelectorAll(KOKLER)];
  const sonuc = [];
  let i = 0;
  for (const kok of kokler) {
    i++;
    const k = { kok: sec(kok), anim: 0, dongu: 0, kirmizi: [], not: [] };
    /* --- 1. kadraj disi --- */
    const cikti = uzaklas(kok);
    if (boz && boz.disarida === i) kok.style.setProperty('--akps', 'running');
    if (cikti) {
      await uyku(400);
      for (const a of animlar(kok)) {
        if (a.tl !== 'DocumentTimeline') k.kirmizi.push('disarida cizelge ' + a.tl + ': ' + a.ad + '@' + a.hedef);
        else if (a.durum !== 'paused') k.kirmizi.push('kadraj disinda oynuyor: ' + a.ad + '@' + a.hedef + ' (' + a.durum + ')');
      }
    } else k.not.push('kadrajdan cikarilamadi (sayfa kisa) — 1/3 atlandi');
    if (boz && boz.disarida === i) kok.style.removeProperty('--akps');
    /* --- 2. kadrajda --- */
    kok.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    await uyku(700);
    let bozulan = null;
    if (boz && boz.cizelge === i && 'ViewTimeline' in window) {
      const ilk = kok.getAnimations({ subtree: true }).find((a) => a instanceof CSSAnimation);
      if (ilk) { bozulan = ilk; ilk.timeline = new ViewTimeline({ subject: kok }); await uyku(50); }
    }
    const icerde = animlar(kok);
    k.anim = icerde.length; k.dongu = icerde.filter((a) => a.sonsuz).length;
    k.adlar = [...new Set(icerde.map((a) => a.ad))].slice(0, 8);
    for (const a of icerde) if (a.tl !== 'DocumentTimeline') k.kirmizi.push('kadrajda cizelge ' + a.tl + ': ' + a.ad + '@' + a.hedef);
    if (icerde.length) {
      const kosan = icerde.filter((a) => a.durum === 'running');
      if (reduce) { if (kosan.length) k.kirmizi.push('reduced-motion altinda ' + kosan.length + ' animasyon kosuyor: ' + kosan.slice(0, 3).map((a) => a.ad).join(' ')); }
      else {
        if (!kosan.length) k.kirmizi.push('kadrajda olu: ' + icerde.length + ' animasyon, kosan 0 (' + icerde.slice(0, 3).map((a) => a.ad + '=' + a.durum).join(' ') + ')');
        else if (!kosan.some((a) => a.sonsuz)) k.kirmizi.push('kadrajda dongu yok: kosanlarin hepsi sonlu (' + kosan.slice(0, 3).map((a) => a.ad).join(' ') + ')');
      }
    } else if (!reduce) k.not.push('animasyonsuz kok');
    if (bozulan) { bozulan.timeline = document.timeline; }
    /* --- 3. tekrar kadraj disi --- */
    if (cikti && !reduce && icerde.length) {
      uzaklas(kok); await uyku(400);
      for (const a of animlar(kok))
        if (a.tl === 'DocumentTimeline' && a.durum !== 'paused') k.kirmizi.push('cikinca durmuyor: ' + a.ad + '@' + a.hedef + ' (' + a.durum + ')');
    }
    sonuc.push(k);
  }
  return sonuc;
})`;

(async () => {
  const browser = await pt.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1460,980'], defaultViewport: null, protocolTimeout: 300000 });
  const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900 });
  /* PROLOG ATLANMIS OTURUM (3/4 Eyl 2026): ana sayfanin onunde film var ve
     film etkinken govde `.fl-govde` icinde SABIT duruyor — kaydirma govdeyi
     oynatmadigi icin bolum kadrajdan hic cikmiyor, kapi "cikinca durmuyor"
     diyordu. Bu kapi GOVDENIN surucusunu olcer; filmin kendi katmani ayri
     (FM1/olc-devir). Film ONDEYKEN govde demolarinin durmasi ayri bir kural
     ve film.css'te duruyor (html.fl-ana:not(.fl-devir-net) .akoynar). */
  await page.evaluateOnNewDocument(() => {
    try { sessionStorage.setItem('qanat-splash-seen', '1'); sessionStorage.setItem('qanat-prolog-atlandi', '1'); } catch (e) {}
  });
  const kos = (boz, reduce) => page.evaluate(`${TARA}(${JSON.stringify(KOKLER)}, ${JSON.stringify(boz)}, ${reduce ? 'true' : 'false'})`);
  const sonuc = [];
  let kirmiziOnce = null;
  for (const yol of secim) {
    if (/\/film\//.test(yol)) continue;
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await page.goto(SUNUCU + yol, { waitUntil: 'load' }); await bekle(800);
    /* KIRMIZI-ONCE: ilk kokluk sayfada, 1. koke iki bozma */
    if (!kirmiziOnce) {
      const n = await page.evaluate((s) => document.querySelectorAll(s).length, KOKLER);
      if (n) {
        const kr = await kos({ disarida: 1, cizelge: 1 }, false);
        const k1 = kr[0] || { kirmizi: [] };
        kirmiziOnce = { yol,
          disarida: k1.kirmizi.some((x) => /kadraj disinda oynuyor/.test(x)),
          cizelge: k1.kirmizi.some((x) => /kadrajda cizelge ViewTimeline/.test(x)) };
        console.log(`KIRMIZI KONTROL (${yol} · 1. kok ${k1.kok}): disarida-running ${kirmiziOnce.disarida ? 'YAKALANDI' : 'YAKALANAMADI'} · ViewTimeline ${kirmiziOnce.cizelge ? 'YAKALANDI' : 'YAKALANAMADI'}`);
        await page.goto(SUNUCU + yol, { waitUntil: 'load' }); await bekle(800);
      }
    }
    const r = await kos(null, false);
    let rd = [];
    if (r.length) {
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.goto(SUNUCU + yol, { waitUntil: 'load' }); await bekle(800);
      rd = await kos(null, true);
    }
    const kirmizi = [];
    for (const k of r) for (const x of k.kirmizi) kirmizi.push(k.kok + ': ' + x);
    for (const k of rd) for (const x of k.kirmizi) kirmizi.push(k.kok + ' [H11]: ' + x);
    sonuc.push({ yol, kok: r.length, kirmizi, kokler: r, reduced: rd.map((k) => ({ kok: k.kok, kirmizi: k.kirmizi })) });
    const donen = r.filter((k) => k.dongu > 0).length;
    console.log(`${kirmizi.length ? 'KALDI' : 'ok   '} ${yol.padEnd(34)} kok ${r.length} · donen ${donen}${kirmizi.length ? ' · KIRMIZI ' + kirmizi.slice(0, 3).join(' | ') : ''}`);
  }
  await browser.close();
  const yakalandi = !!(kirmiziOnce && kirmiziOnce.disarida && kirmiziOnce.cizelge);
  const gecti = yakalandi && sonuc.every((s) => s.kirmizi.length === 0);
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/olc-surucu.cjs — surucu kapisi (3 Eyl 2026 kurali): demo koku kadraj disinda paused, kadrajda running + sonsuz dongu, cikinca paused, ViewTimeline/ScrollTimeline yok; reduced-motion altinda kosan 0.',
    olcum: new Date().toISOString(), kokler: KOKLER, kirmizi_kontrol: kirmiziOnce, hukum: gecti ? 'GECTI' : 'KALDI', sayfa: sonuc }, null, 1));
  console.log(`\nHUKUM: ${gecti ? 'GECTI' : 'KALDI'}${kirmiziOnce ? '' : ' (kirmizi-once kosulamadi: kokluk sayfa yok)'}\n→ ${CIKTI}`);
  process.exit(gecti ? 0 : 2);
})().catch((e) => { console.error(e); process.exit(1); });
