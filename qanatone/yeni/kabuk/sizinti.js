/* SIZINTI TANECIKLERI (sokum ve tasima turu, 4 Eyl 2026) — kaynak
   sizintiKur 9803-9944: 130 tanecik, tohumlu rastgele (98765), huni
   geometrisi LY/LW, yukaridan asagi akis; sizan tanecikler kavsaktan
   disari dagilir, tipa kapaninca (kaynak kapali/geri esikleri) kizil
   olarak akisa doner. SURUCU KAYDIRMA (Enes, 5 Eyl): taneciklerin akisi
   zaman degil ILERLEME (--szt) — kaydirmayla akar, durunca durur; surekli
   rAF yok, scroll olayinda tek kare. Duvarlar, baglar ve cikan kume CANVAS'TA DEGIL —
   OtomasyonGovde'nin SVG'si ve CSS'i cizer (scrub); burada yalniz akan
   tanecikler. ILERLEME P: CSS --szt (kaydirma cizelgesi; pinli sahne)
   computed'dan okunur — duzen okumasi degil, stil degeri. IO dogus
   tetigi: gorunmezken rAF durur. Azaltmada tek kare cizilir, dongu yok.
   Yukleme: OtomasyonGovde satir ici tetik (IO) -> dinamik ithal (J1 disi).
   Uretim: kabuk-derle.cjs -> public/varlik/sizinti.js */
const CL = (v) => Math.max(0, Math.min(1, v));
const LY = [.10, .34, .58, .80], LW = [.60, .44, .28, .15];
const kat = (t) => Math.min(2, Math.floor(t * 3));
const genis = (t) => { const k = kat(t), u = t * 3 - k; return LW[k] + (LW[k + 1] - LW[k]) * u; };
const yKon = (t) => { const k = kat(t), u = t * 3 - k; return LY[k] + (LY[k + 1] - LY[k]) * u; };

export function baslat() {
  const cv = document.getElementById('szCv'); if (!cv || cv.__kur) return; cv.__kur = 1;
  const st = cv.closest('.szstage'); const cx = cv.getContext('2d'); if (!st || !cx) return;
  const RDC = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const N = 130, PT = []; let s = 98765;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < N; i++) PT.push({ o: rnd(), x: rnd() * 2 - 1, k: (rnd() * 4) | 0, sz: rnd() < .62, h: .36 + rnd() * .5, ch: (rnd() * 5) | 0, gr: rnd() });
  let W = 0, H = 0, DPR = 1, RAF = null, olcuBayat = true;
  const size = () => {
    if (!olcuBayat) return W > 0;
    olcuBayat = false;
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    DPR = Math.min(2, devicePixelRatio || 1);
    W = Math.round(r.width); H = Math.round(r.height);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return true;
  };
  const ilerleme = () => { const v = parseFloat(getComputedStyle(st).getPropertyValue('--szt')); return isNaN(v) ? 1 : CL(v); };
  const render = () => {
    if (!size()) return;
    const p = ilerleme();
    cx.clearRect(0, 0, W, H);
    if (CL(p / .10) <= 0) return;
    const kapali = (k) => p > .52 + k * .055;
    const geri = (k) => CL((p - (.52 + k * .055)) / .12);
    for (let i = 0; i < N; i++) {
      const q = PT[i];
      const u = ((p * 3.2 * q.h) + q.o) % 1;   /* ilerlemeyle akis: kilitli pencerede ~3 tur */
      const donmus = q.sz && q.gr < geri(q.k);
      const sizar = q.sz && !donmus;
      const kav = (q.k + 1) / 4, bit = sizar ? kav : 1;
      if (u > bit) {
        if (!sizar) continue;
        const dd = (u - bit) / (1 - bit);
        if (dd > .55) continue;
        const y = yKon(kav) * H + dd * H * .16, w = genis(kav) * W / 2, sol = q.k % 2 === 0;
        const x = W / 2 + (sol ? -w - dd * W * .16 : w + dd * W * .16);
        cx.globalAlpha = (1 - dd / .55) * .5; cx.fillStyle = 'rgba(255,255,255,.5)';
        cx.beginPath(); cx.arc(x, y, 1.8, 0, 6.283); cx.fill(); cx.globalAlpha = 1;
        continue;
      }
      const y = yKon(u) * H, w = genis(u) * W / 2;
      const x = W / 2 + q.x * w * .8;
      cx.fillStyle = donmus ? 'rgba(255,90,110,.95)' : 'rgba(255,255,255,.72)';
      cx.beginPath(); cx.arc(x, y, donmus ? 2.3 : 1.9, 0, 6.283); cx.fill();
    }
    void kapali;
  };
  /* scroll -> tek kare (rAF kisitli); gorunmezken dinleyici yok */
  const kare = () => { RAF = null; render(); };
  const iste = () => { if (!RAF) RAF = requestAnimationFrame(kare); };
  let bagli = false;
  const basla = () => { render(); if (RDC || bagli) return; bagli = true; addEventListener('scroll', iste, { passive: true }); };
  const dur = () => { if (!bagli) return; bagli = false; removeEventListener('scroll', iste); if (RAF) { cancelAnimationFrame(RAF); RAF = null; } };
  let son = innerWidth;
  addEventListener('resize', () => { const w = innerWidth; if (w === son) return; son = w; olcuBayat = true; iste(); }, { passive: true });
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? basla() : dur())), { threshold: .03 }).observe(st);
  else basla();
  document.addEventListener('visibilitychange', () => (document.hidden ? dur() : basla()));
}
