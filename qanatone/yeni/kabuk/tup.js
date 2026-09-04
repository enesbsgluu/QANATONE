/* HERO TUP ALANI — AYRI PARCA (4 Eyl 2026).
   Kaynak: eski site `tubesKur` 9077-9133. Govde `kabuk/efekt.js`ten BURAYA
   TASINDI; kabukta yalnizca uc satirlik bir tetik kaldi.

   NEDEN AYRILDI — iki sebep, ikisi de olculdu:
   1) YUK DAGILIMI. `#tubes` tuvali YALNIZ `SHHero.astro`da, yani iki
      sayfada (`/` ve `/en/`). Kod ise ortak kabukta duruyordu ve 65
      sayfanin hepsine iniyordu. K1 tavani (12.288 B) zaten 12.277 B ile
      doluydu; prolog duzeltmesi 366 B ekleyince tavan asildi. Dogru cevap
      tavani gevsetmek DEGIL, 63 sayfada olu duran yuku kaldirmakti.
   2) ZAMANLAMA. Kurulum eskiden `baslat()` icinde KOSULSUZ ve HEMEN
      kosuyordu — yani WebGL baglami + shader derlemesi tam prolog
      surerken. Olculdu (A/B, ayni derleme, tek degisken bu dosya):
        tubes ENGELLI : p95 8,5 ms · kacirilan 0 · takilma YOK · en uzun 33,4 ms
        tubes SERBEST : p95 16,7 ms · kacirilan 1 · 1 takilma · EN UZUN 399,8 ms
      Tek bir ~400 ms'lik donma. Bu dosya artik iki kapinin ardinda kurulur:
      hero yaklasmadan (IO dogus tetigi) ve prolog ekrandayken (fl-ana
      varken fl-devir-net yokken) kurulmaz; kurulum bosta yapilir.

   NOT: `/js/tubes.min.js` (775 KB) kesmeden 4 Eyl'e kadar 404 veriyordu —
   eski kok sitenin varligiydi ve build.js zincirden cikinca ciktida
   kalmamisti. Yani bu katman aylardir hic calismiyordu; ciktiya alininca
   bedeli de gorunur oldu. Ithal `.catch` ile yutulur: dosya yoksa sayfa
   calismaya devam eder, yalnizca tup alani olmaz. */
const R = document.documentElement;

export function kur() {
  const cv = document.querySelector('#tubes');
  if (!cv) return;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  if (R.classList.contains('t-notubes') || innerWidth < 900 || matchMedia('(pointer:coarse)').matches) return;
  const hero = cv.closest('section');
  if (!hero) return;

  /* ---- ZAMANDA AYIRMA (4 Eyl 2026, Enes: "klibi etkilemeden dogru
     zamanda calissin; ada mimarisine bu sebeple gectik") ----
     ONEMLI AYRIM: ada mimarisi KODU ve BUTCEYI ayirir, ANA IS PARCACIGINI
     ayirmaz. WebGL baglami + shader derlemesi hangi adada olursa olsun
     ayni thread'de kosar; olculdu, tek seferlik ~400 ms. Bu yuzden ayrim
     KODDA degil ZAMANDA yapiliyor.
     KAPI: film TAMAMEN bitene kadar hicbir sey kurulmaz. Sinyal filmin
     kendi yazdigi `<html data-film>`: 'bitti' (devir tamamlandi,
     siteyeGec), 'atlandi', 'hareket-azaltma', 'mobil'. Film KOSARKEN bu
     oznitelik YOKTUR — yani varligi "film artik ana is parcacigini
     kullanmiyor" demektir.
     Onceki kapi `fl-devir-net` idi ve YANLISTI: o sinif devir NETLESIRKEN
     dusuyor, yani tam el degisimi aninda — kurulumun en pahali oldugu an.
     Filmi olan sayfada oznitelik gelene kadar MutationObserver bekler
     (yoklama yok, atesle(n)mezse hicbir sey harcamaz). Filmsiz sayfada
     kapi zaten aciktir.
     Ustune 800 ms: `siteyeGec` sokumu 50 ms sonra yapiyor ve devir
     capraz gecisi bitiyor; kurulum o yerlesme bitince bosta kosar. */
  const filmli = !!document.querySelector('.fl-yapis, #fl-son');
  const filmBitti = () => !filmli || !!R.dataset.film;
  let yakin = false, mo = null;
  const dene = () => {
    if (!yakin || !filmBitti()) return;
    if (mo) { mo.disconnect(); mo = null; }
    setTimeout(() => {
      if (window.requestIdleCallback) requestIdleCallback(kurulum, { timeout: 4000 });
      else setTimeout(kurulum, 400);
    }, 800);
  };
  new IntersectionObserver((es, o) => {
    if (!es[0].isIntersecting) return;
    o.disconnect(); yakin = true;
    if (filmBitti()) return dene();
    mo = new MutationObserver(dene);
    mo.observe(R, { attributes: true, attributeFilter: ['data-film'] });
  }, { rootMargin: '300px' }).observe(hero);

  function kurulum() {
    import('/js/tubes.min.js').then((m) => {
      const F = m.default; if (typeof F !== 'function') return;
      const d = window.devicePixelRatio || 1; let app = null;
      try { Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => Math.min(d, 1.25) }); } catch (e) {}
      try { app = F(cv, { tubes: { colors: ['#ef233c', '#8f0f21', '#ffffff'], lights: { intensity: 180, colors: ['#ef233c', '#ff4d63', '#ffffff', '#5a0d18'] } } }); } catch (e) {}
      try { Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => d }); } catch (e) {}
      if (!app) return;
      cv.classList.add('on'); window.__tubes = app;
      const act = (on) => {
        try {
          if (app.pause && app.resume) { on ? app.resume() : app.pause(); return; }
          if (app.setPaused) { app.setPaused(!on); return; }
        } catch (e) {}
        cv.style.visibility = on ? '' : 'hidden';
      };
      new IntersectionObserver((es) => es.forEach((x) => act(x.isIntersecting)), { threshold: .02 }).observe(hero);
      document.addEventListener('visibilitychange', () => act(!document.hidden));
      hero.addEventListener('dblclick', (e) => {
        if (e.target.closest('a,button,input,label,textarea,select') || !app.tubes) return;
        const r = (n) => [...Array(n)].map(() => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
        app.tubes.setColors(r(3)); app.tubes.setLightsColors(r(4));
      });
    }).catch(() => {});
  }
}
