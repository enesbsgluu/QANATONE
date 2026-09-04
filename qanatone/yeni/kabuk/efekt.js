/* KABUK EFEKTLERI — SOKUM VE TASIMA TURU (4 Eyl 2026, Enes karari).
   Eski sitenin uc rAF katmani BIREBIR tasindi (kaynak kok index.html):
     yildiz tuvali   `stars`    9236-9274   (30 kare/sn, IO yok — sabit tam ekran)
     bit damgasi     `wordmark` 11135-11261 (IO dogus tetigi + gorunurluk)
     ajan imleci     `bit`      9373-9555   (pointermove + rAF izleme)
   TASINAN sey TASARIM; kod eskiden kalan yardimcilari (LG, $, scrollToY,
   genislikDegisince, REDUCE/LOWFX) yerel karsiliklarla kurar. GSAP/Lenis
   YOK. Panel anahtarlari derlemede <html> sinifi/veri olur (Temel.astro):
   t-nostars · t-nograin · t-noagent · data-imlec-gizle · data-tur.

   YUKLEME: Temel.astro'daki satir ici tetik bosta `import()` eder —
   J1 disi (film motoruyla ayni desen), kendi tavani K1 (denetim).
   Uretim: node yeni/kabuk-derle.cjs -> public/varlik/kabuk.js (esbuild). */
const R = document.documentElement;
const REDUCE = matchMedia('(prefers-reduced-motion:reduce)').matches;
const LOW = R.classList.contains('lowfx');
const $ = (s) => document.querySelector(s);
const LG = () => (R.lang === 'en' ? 'en' : 'tr');
const scrollToY = (y) => scrollTo({ top: y, behavior: REDUCE ? 'auto' : 'smooth' });
/* adres cubugu dersi (kok denetim kurali): yalniz GENISLIK degisince */
const genislikDegisince = (() => {
  let son = innerWidth; const abone = [];
  addEventListener('resize', () => { const w = innerWidth; if (w === son) return; son = w; abone.forEach((f) => f()); }, { passive: true });
  return (f) => abone.push(f);
})();

/* =================== YILDIZLAR (kaynak 9236-9274) =================== */
function stars() {
  const cv = $('#stars'); if (!cv || LOW || REDUCE || R.classList.contains('t-nostars')) return;
  if (matchMedia('(pointer:coarse),(max-width:900px)').matches) return;   /* CSS zaten gizliyor */
  const cx = cv.getContext('2d'); let W, H, pts = [], spr = null;
  function sprite() {
    spr = document.createElement('canvas'); spr.width = spr.height = 6;
    const s = spr.getContext('2d');
    s.beginPath(); s.arc(3, 3, 2.2, 0, 7); s.fillStyle = '#fff'; s.fill();
  }
  function size() {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    const n = Math.min(120, Math.round(W * H / 16000));
    pts = [...Array(n)].map(() => ({ x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.1 + .25, s: Math.random() * .16 + .03, a: Math.random() * .5 + .15 }));
  }
  sprite(); size();
  let rt; genislikDegisince(() => { clearTimeout(rt); rt = setTimeout(size, 180); });
  let raf = null, pause = false, last = 0;
  document.addEventListener('visibilitychange', () => { pause = document.hidden; });
  function loop(now) {
    /* 30 kare/sn yeter: noktalar saniyede ~5px kayiyor, fark gorunmez */
    if (!pause && now - last > 32) {
      last = now;
      cx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.y -= p.s; if (p.y < -2) { p.y = H + 2; p.x = Math.random() * W; }
        cx.globalAlpha = p.a;
        const d = p.r * 2.6;
        cx.drawImage(spr, p.x - d / 2, p.y - d / 2, d, d);
      }
      cx.globalAlpha = 1;
    }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  window.__starsStop = () => { if (raf != null) { cancelAnimationFrame(raf); raf = null; } };
}

/* =================== FOOTER BIT DAMGASI (kaynak 11135-11261) ===================
   QANATONE yazisi bir kez cevrimdisi canvas'a cizilir, izgaraya
   orneklenir, her hucre bagimsiz bit olarak yeniden cizilir. Yazi tipi
   degisse de matris kendiliginden yeniden uretilir. Hareket: soldan saga
   acilis dalgasi, yavas tarama supurmesi, rastgele kirpisan bitler. */
function wordmark() {
  const cv = $('#wmk'); if (!cv) return;
  const cx = cv.getContext('2d');
  const WORD = 'QANATONE';
  const RDC = REDUCE;
  let TW = 0, TH = 0, dpr = 1, cell = 8, bits = [], gridCv = null, raf = null, t0 = 0, seen = false;
  /* koyu kizil -> tema kirmizisi -> acik mercan, yatay gecis */
  const PAL = (function () {
    const a = [141, 15, 32], b = [239, 35, 60], c = [255, 140, 154], out = [];
    for (let i = 0; i < 24; i++) {
      const t = i / 23, mid = t < .55, k = mid ? t / .55 : (t - .55) / .45;
      const p = mid ? a : b, q = mid ? b : c;
      out.push('rgb(' + Math.round(p[0] + (q[0] - p[0]) * k) + ',' + Math.round(p[1] + (q[1] - p[1]) * k) + ',' + Math.round(p[2] + (q[2] - p[2]) * k) + ')');
    }
    return out;
  })();
  function build() {
    const host = cv.parentElement; if (!host) return;
    const W = host.clientWidth; if (!W) return;
    dpr = Math.min(devicePixelRatio || 1, LOW ? 1 : 2);
    /* TUR 4 (2 Eyl 2026): willReadFrequently — getImageData GPU tuvalinden
       geri okumuyor; taze tarayicida ilk geri okuma 547 ms olculdu (CDP
       profil, b@kabuk.js), sicakta 31-67 ms. */
    const off = document.createElement('canvas'), oc = off.getContext('2d', { willReadFrequently: true });
    /* kaynak '800 Manrope' — Uncut Sans 700'de biter (sokum turu tipografi karari) */
    const font = (px) => '700 ' + px + 'px "Uncut Sans",system-ui,sans-serif';
    oc.font = font(100);
    const unit = oc.measureText(WORD).width || 560;
    const fs = Math.min(W * .92 / unit * 100, W * .20, 208);
    TW = Math.ceil(unit * fs / 100); TH = Math.ceil(fs * .82);
    off.width = TW; off.height = TH;
    oc.font = font(fs); oc.textAlign = 'left'; oc.textBaseline = 'middle';
    oc.fillStyle = '#fff'; oc.fillText(WORD, 0, TH / 2);
    const px = oc.getImageData(0, 0, TW, TH).data;
    cell = Math.max(5, Math.round(TH / 18));
    const cols = Math.ceil(TW / cell), rows = Math.ceil(TH / cell);
    cv.width = Math.round(TW * dpr); cv.height = Math.round(TH * dpr);
    cv.style.width = TW + 'px'; cv.style.height = TH + 'px';
    gridCv = document.createElement('canvas');
    gridCv.width = cv.width; gridCv.height = cv.height;
    const gc = gridCv.getContext('2d');
    gc.setTransform(dpr, 0, 0, dpr, 0, 0);
    bits = [];
    const s = cell - 1;
    for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
      let sum = 0, n = 0;
      const x1 = Math.min((gx + 1) * cell, TW), y1 = Math.min((gy + 1) * cell, TH);
      for (let y = gy * cell; y < y1; y += 2) for (let x = gx * cell; x < x1; x += 2) { sum += px[(y * TW + x) * 4 + 3]; n++; }
      const cov = n ? sum / (n * 255) : 0;
      const u = cols > 1 ? gx / (cols - 1) : 0;
      if (cov > .34) {
        bits.push({ x: gx * cell, y: gy * cell, u, a: .55 + Math.random() * .45, d: u * .6 + Math.random() * .45,
          c: PAL[Math.round(u * (PAL.length - 1))], k: -1 });
      } else {
        gc.fillStyle = 'rgba(255,255,255,' + (cov > .02 ? .045 : .016) + ')';
        gc.fillRect(gx * cell, gy * cell, s, s);
      }
    }
  }
  function draw(now) {
    if (!t0) t0 = now;
    const t = RDC ? 99 : (now - t0) / 1000;
    const s = cell - 1;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, TW, TH);
    cx.globalAlpha = 1;
    if (gridCv) cx.drawImage(gridCv, 0, 0, TW, TH);
    const sweep = RDC ? -9 : ((t * .13) % 1) * 1.26 - .13;
    for (let i = 0; i < bits.length; i++) {
      const b = bits[i], app = (t - b.d) / .55;
      if (app <= 0) continue;
      let a = b.a * (app < 1 ? app : 1);
      const dd = Math.abs(b.u - sweep);
      if (dd < .05) a = Math.min(1, a + (1 - dd / .05) * .8);
      if (!RDC && !LOW) {
        if (t > b.k) { if (Math.random() < .0012) b.k = t + .14; } else a = Math.min(1, a + .5);
      }
      cx.globalAlpha = a; cx.fillStyle = b.c;
      cx.fillRect(b.x, b.y, s, s);
    }
    cx.globalAlpha = 1;
    if (!RDC) raf = requestAnimationFrame(draw);
  }
  function start() { if (raf || RDC) return; raf = requestAnimationFrame(draw); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
  function boot() { kuruldu = true; build(); if (RDC) { t0 = 0; draw(performance.now()); } else { t0 = 0; if (seen) start(); } }
  /* TUR 4 (2 Eyl 2026): INSA KADRAJA YAKLASINCA (IO, 600 px pay), yuklemede
     DEGIL. Once yuklemede iki kez kuruluyordu (hemen + fonts.ready): altbilgi
     tuvali ilk boyamada gorunmezken 121 KB'lik sayfanin en uzun karesini
     (import.then 584-606 ms soguk, 50-67 ms sicak) o uretiyordu. Font sonra
     gelirse: kuruluysa ve kadrajdaysa yeniden kurulur, degilse bayat isaretlenir.
     Yeniden kurulumda stop() gerekmez: suren cizim dongusu yeni bitleri alir
     (boot t0'i sifirlar, giris yeniden oynar). */
  let kuruldu = false, rt, bayat = false;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!kuruldu) return; if (seen) boot(); else bayat = true; });
  /* uc kapi: yaklasma (ilk insa) + genislik (bayat isaretle) + gorunurluk (ciz/durdur) */
  genislikDegisince(() => { clearTimeout(rt); rt = setTimeout(() => { if (!seen || !kuruldu) { bayat = true; return; } boot(); }, 200); });
  if ('IntersectionObserver' in window) {
    const yakin = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting || kuruldu) return;
      yakin.disconnect(); bayat = false; boot();
    }), { rootMargin: '600px' });
    yakin.observe(cv);
    new IntersectionObserver((es) => es.forEach((e) => {
      seen = e.isIntersecting;
      if (!e.isIntersecting) { stop(); return; }
      if (!kuruldu || bayat) { bayat = false; boot(); return; }
      start();
    }), { threshold: .02 }).observe(cv);
  } else { seen = true; boot(); }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : (seen && start())));
}

/* =================== QANATONE AJANI (imlec, kaynak 9373-9555) =================== */
function bit() {
  const bit = $('#bit'), say = $('#bitsay'), msg = $('#bitmsg'), acts = $('#bitacts'), tip = $('#bittip');
  if (!bit || !say || REDUCE || R.classList.contains('t-noagent')) return;
  if (matchMedia('(pointer:coarse)').matches || innerWidth < 901) return;
  try { localStorage.removeItem('qanat-bit'); } catch (e) {}
  if (sessionStorage.getItem('qanat-bit') === 'off') { showBack(); return; }
  const NO_TOUR = R.dataset.tur === '0', NO_HIDE = R.dataset.imlecGizle === '0';

  const MSG = { tr: {
    hero: 'Buradan başlıyoruz: talep zaten var, mesele onu yakalayacak sistem.',
    ticker: 'Bunlar birlikte çalıştığımız markalar. Şerit kendi kendine akıyor.',
    spDeste: 'Her kart bir sistem. Üzerine tıkla, ne kurduğumuzu ve ne çıktığını gör.',
    prjall: 'Arşivin tamamı. Sektöre göre filtrele, ilgilendiğin işe gir.',
    sektor: 'Sektörünü seç — aşağıdaki her şey senin rakamlarına göre yeniden kurulur.',
    tespit: 'Adresini yaz, siteni gerçekten kontrol edelim. Kayıt istemiyoruz.',
    hizmet: 'Altı yetenek. Hepsini birden satmıyoruz — hangisi para kazandırıyorsa onu.',
    ajan: 'Akış burada çalışıyor: gelen talep ajandan geçiyor, sonuç elinde hazır duruyor.',
    surec: 'Beş aşama. Her birinde ne yaptığımız ve ne ölçtüğümüz belli.',
    sozler: 'Müşterilerin kendi cümleleri. Genel övgü değil, somut anlar.',
    kurucu: 'Perde arkasındaki kişi. İsmiyle duran birinin olması iyi işaret.',
    sss: 'Fiyat, süre, sözleşme — dürüst cevaplar.',
    iletisim: 'Önce ücretsiz kontrol, sonra tek bir görüşme. Uygun değilsek ilk biz söyleriz.' },
  en: {
    hero: 'This is where we start: demand already exists, the issue is catching it.',
    ticker: 'Brands we work with. The strip flows on its own.',
    spDeste: 'Each card is a system. Click to see what we built and what came out.',
    prjall: 'The full archive. Filter by sector and open the one you care about.',
    sektor: 'Pick your sector — everything below rebuilds for your numbers.',
    tespit: 'Type your domain and we run a real check. No sign-up.',
    hizmet: 'Six capabilities. We do not sell them all at once.',
    ajan: 'The flow runs here: demand enters, passes the agent, the outcome waits ready.',
    surec: 'Five stages. What we do and measure at each is defined.',
    sozler: 'Customers in their own words — specific moments, not generic praise.',
    kurucu: 'The person behind it. Someone standing here by name is a good sign.',
    sss: 'Pricing, timing, contracts — honest answers.',
    iletisim: 'A free check first, then one call. If we are not a fit, we say so.' } };
  const UI = { tr: { tour: 'Siteyi gezdir', next: 'Devam', stop: 'Bitir', close: 'Kapat', hide: 'İmleci kapat', done: 'Tur bitti. İyi geziler.' },
               en: { tour: 'Take the tour', next: 'Next', stop: 'End', close: 'Close', hide: 'Turn cursor off', done: 'Tour finished. Enjoy the rest.' } };
  /* kaynak listesi; SPA yok — bu sayfada var olan bolumler suzulur (visible) */
  const ALL = ['hero', 'ticker', 'spDeste', 'akis', 'prjall', 'sektor', 'tespit', 'hizmet', 'hizmetdetay', 'ajan', 'surec', 'sozler', 'kurucu', 'sss', 'iletisim'];
  let mx = innerWidth * .6, my = innerHeight * .5, px = mx, py = my, has = false, open = false,
      ax = 0, ay = 0, tour = false, ti = 0, typing = null, order = ALL.slice(), anchored = false;

  function visible() {
    return ALL.filter((id) => { const el = document.getElementById(id); return !!el && getComputedStyle(el).display !== 'none'; });
  }
  function active() {
    let best = 'hero', bd = 1e9;
    visible().forEach((id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - innerHeight / 2);
      if (r.bottom > 60 && r.top < innerHeight - 60 && d < bd) { bd = d; best = id; }
    });
    return best;
  }
  function type(t) {
    clearTimeout(typing); msg.textContent = ''; let i = 0;
    const step = () => { msg.textContent = t.slice(0, ++i); if (i < t.length) typing = setTimeout(step, 15 + Math.random() * 20); };
    step();
  }
  function buttons(list) {
    acts.innerHTML = '';
    list.forEach(([lab, fn, p]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = lab; if (p) b.className = p;
      b.onclick = (e) => { e.stopPropagation(); fn(); };
      acts.appendChild(b);
    });
  }
  function place() {
    const w = say.offsetWidth || 300, hh = say.offsetHeight || 140;
    let x = ax + 18, y = ay + 18;
    if (x + w > innerWidth - 14) x = ax - w - 18;
    if (y + hh > innerHeight - 14) y = Math.max(14, ay - hh - 18);
    say.style.transform = `translate(${x}px,${y}px)`;
  }
  function openSay() {
    ax = px; ay = py; open = true; anchored = true;
    const L = LG(), u = UI[L], id = tour ? order[ti] : active();
    say.classList.add('on'); bit.classList.add('open');
    type((MSG[L] || MSG.tr)[id] || (MSG[L] || MSG.tr).hero || '');
    buttons(tour
      ? [[u.next, () => { ti++; step(); }], [u.stop, endTour]]
      : (NO_TOUR ? [[u.close, closeSay], [u.hide, dismiss, 'q']]
                 : [[u.tour, startTour, 'p'], [u.close, closeSay], [u.hide, dismiss, 'q']]));
    requestAnimationFrame(place);
  }
  function closeSay() { open = false; say.classList.remove('on'); bit.classList.remove('open'); clearTimeout(typing); }
  function startTour() { tour = true; ti = 0; order = visible().filter((id) => (MSG[LG()] || MSG.tr)[id]); step(); }
  function step() {
    if (ti >= order.length) return endTour();
    const el = document.getElementById(order[ti]);
    if (!el) return (ti++, step());
    scrollToY(Math.max(0, el.getBoundingClientRect().top + scrollY - 90));
    setTimeout(openSay, 700);
  }
  function endTour() {
    tour = false;
    const u = UI[LG()];
    type(u.done); buttons([[u.close, closeSay]]);
    setTimeout(closeSay, 2200);
  }
  let booted = false;
  function dismiss() {
    closeSay(); bit.classList.remove('on');
    R.classList.remove('bitcursor');
    tip.classList.remove('on');
    try { sessionStorage.setItem('qanat-bit', 'off'); } catch (e) {}
    showBack();
  }
  function showBack() {
    if (document.getElementById('bitback')) return;
    const b = document.createElement('button');
    b.id = 'bitback'; b.className = 'kb-back'; b.type = 'button'; b.innerHTML = '<span></span>';
    b.setAttribute('aria-label', LG() === 'en' ? 'Bring the assistant back' : 'Ajanı geri getir');
    b.onclick = () => {
      try { sessionStorage.removeItem('qanat-bit'); } catch (e) {}
      if (!booted) { location.reload(); return; }
      b.classList.remove('on'); setTimeout(() => b.remove(), 420);
      bit.classList.add('on');
      if (!NO_HIDE) R.classList.add('bitcursor');
    };
    document.body.appendChild(b); requestAnimationFrame(() => b.classList.add('on'));
  }
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    has = true; anchored = false; mx = e.clientX; my = e.clientY;
    tip.classList.add('on');
  }, { passive: true });
  addEventListener('mouseover', (e) => {
    const t = e.target && e.target.closest && e.target.closest('a,button,input,summary,label,[role=button],.sc,.dk,.fnode');
    bit.classList.toggle('link', !!t);
  }, { passive: true });
  const HOT = 'a,button,input,textarea,select,label,summary,details,[role=button],' +
              '[tabindex]:not([tabindex="-1"]),canvas,svg,.sc,.dk,.fnode,#bitsay,#bitback';
  addEventListener('click', (e) => {
    const t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#bitsay,#bitback')) return;
    if (open) { closeSay(); return; }
    if (t.closest(HOT)) return;
    if (window.getSelection && String(window.getSelection()).length) return;
    openSay();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) closeSay(); });

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 16.7, 3); last = now;
    const gx = tour ? innerWidth * .82 : ((open && anchored) ? ax : (has ? mx : innerWidth * .6));
    const gy = tour ? innerHeight * .5 : ((open && anchored) ? ay : (has ? my : innerHeight * .5));
    px += (gx - px) * .2 * dt; py += (gy - py) * .2 * dt;
    bit.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px)`;
    if (has) tip.style.transform = `translate(${mx}px,${my}px)`;
    if (open) place();
    requestAnimationFrame(loop);
  }
  setTimeout(() => {
    booted = true;
    bit.classList.add('on');
    if (!NO_HIDE) R.classList.add('bitcursor');
    requestAnimationFrame(loop);
  }, 1500);
}

/* =================== HERO TUPLERI — AYRI PARCADA ===================
   Govde `kabuk/tup.js`e TASINDI (4 Eyl 2026). Sebep orada yazili, ozeti:
   `#tubes` yalniz SHHero'da (iki sayfa) ama kod 65 sayfaya iniyordu ve
   K1 tavani (12.288 B) 12.277 B ile zaten doluydu. Ayrica kurulum prolog
   surerken kosup ~400 ms'lik donma uretiyordu (A/B ile olculdu).
   Burada YALNIZ TETIK kalir: tuval yoksa parca hic indirilmez. */
function tubes() {
  if (!$('#tubes')) return;
  import('/varlik/tup.js').then((m) => m.kur()).catch(() => {});
}

export function baslat() {
  try { tubes(); } catch (e) {}
  try { stars(); } catch (e) {}
  try { wordmark(); } catch (e) {}
  try { bit(); } catch (e) {}
}
