/* ============================================================
   PROLOG · 1. DURAK — ANA IS PARCACIGI TARAFI (ince kabuk).

   Bu dosya SAYFAYA INMEZ: `PRDag.astro` icindeki ada onu ancak
   hareket azaltma kapaliyken, sayfa YUKLENDIKTEN sonra ve bos bir
   anda `import()` ile ceker. J1/H3 tavanlari sayfanin `<script src>`
   ve satir ici baytini olcer; bu parca ikisine de girmez, tavani
   denetimde R14.

   BURADA SAHNE YOK. Sahnenin tamami `isci.ts` icinde, isci is
   parcaciginda, OffscreenCanvas uzerinde kosuyor. Sebep olculdu
   (Lighthouse mobil, ayni pencerede donusumlu, dort tur ortancasi):
       taban (B yaklasimi)          96 · LCP 2.499 · TBT   69
       yeni varliklar, 3B KAPALI    92 · LCP 3.039 · TBT   45
       yeni varliklar, 3B ANA IPTE  68 · LCP 3.322 · TBT  861
   3B'nin bedeli gorunen kare degil ANA IPIN MESGULIYETIYDI. Burada
   kalan is uc satir: `scrollY` oku, boyut degisince haber ver,
   goruse girip cikinca durdur/baslat.

   CUMLE DOKUSU BURADA CIZILIYOR. Marka fontu belgeye yuklu, isci
   ona erisemez; bir tuvale cizilip `ImageBitmap` olarak aktariliyor.
   Sifir bayt iner (yazi tipi zaten sayfada), keskinlik tam.

   YEDEK YOL: isci, OffscreenCanvas ya da WebGL2 yoksa — ya da isci
   bir hata donerse — `pr-gl` sinifi geri alinir; o anda CSS'teki
   `display:none` kalkar, yedi katman iner ve B yaklasimi (katmanli
   paralaks) calisir. Yani 3B yolunda gorseller SAYFADAN hic inmez
   (isci kendisi ceker), yedek yolda ise yalniz sayfadan iner:
   iki yol AYNI yedi dosyayi kullanir, ikisi ayni anda inmez.
   ============================================================ */
import VERI from './veri.json';

/* Cumle dokusu: tek satir, gercek sinirlardan olculmus tuval. */
async function sozBitmap(metin: string): Promise<ImageBitmap | null> {
  try {
    const st = getComputedStyle(document.documentElement);
    const aile = (st.getPropertyValue('--f-govde') || 'sans-serif').trim();
    const t = document.createElement('canvas');
    const c = t.getContext('2d')!;
    const boy = 300;
    const kur = () => {
      c.font = `600 ${boy}px ${aile}`;
      try { (c as any).letterSpacing = `${-0.03 * boy}px`; } catch { /* eski tarayici */ }
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
    };
    kur();
    /* TEK SATIR. Ilk deneme oraniyla (7,2) sariyordu ve iki satirlik
       blok kadrajin ucte birini kapliyordu; esik 15'e cikti, yani iki
       dilin cumlesi de tek satir kaliyor. */
    let satir = [metin];
    if (c.measureText(metin).width / boy > 15) {
      const kel = metin.split(' ');
      const o = Math.ceil(kel.length / 2);
      satir = [kel.slice(0, o).join(' '), kel.slice(o).join(' ')];
    }
    /* Tuval GERCEK sinirlardan olculuyor: `width` harfin optik solunu
       (`actualBoundingBoxLeft`) saymiyor, o yuzden ilk deneme "K"yi
       kenardan kesmisti. */
    const olc = satir.map((x) => c.measureText(x));
    const sol = Math.max(...olc.map((m) => m.actualBoundingBoxLeft));
    const sag = Math.max(...olc.map((m) => m.actualBoundingBoxRight));
    const ust = Math.max(...olc.map((m) => m.actualBoundingBoxAscent));
    const alt = Math.max(...olc.map((m) => m.actualBoundingBoxDescent));
    const pd = Math.round(boy * 0.10);
    const adim = boy * 1.08;
    t.width = Math.ceil(sol + sag) + pd * 2;
    t.height = Math.ceil(ust + alt + adim * (satir.length - 1)) + pd * 2;
    kur();
    c.fillStyle = '#fff';
    satir.forEach((x, i) => c.fillText(x, pd + sol, pd + ust + adim * i));
    return await createImageBitmap(t);
  } catch {
    return null;                       /* cumle 3B'de cikmaz, sahne kalir */
  }
}

export async function baslat(bolum: HTMLElement) {
  const kk = document.documentElement.classList;
  const geriDon = () => kk.remove('pr-gl');
  const tuval = document.createElement('canvas');
  tuval.className = 'pr-tuval';
  const yapis = bolum.querySelector('.pr-yapis');
  if (!yapis || !(tuval as any).transferControlToOffscreen || typeof Worker === 'undefined') {
    geriDon();
    return;
  }
  yapis.appendChild(tuval);

  /* Varyant sorgusu `<picture>`in `media`siyla AYNI olmali: iki
     varyantin kesimi, kutulari ve dosyalari farkli. */
  const varyant = matchMedia('(max-width: 760px)').matches ? 'mobil' : 'masaustu';
  const dpr = Math.min(window.devicePixelRatio || 1, (VERI as any).dpr_tavan);
  const r = tuval.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) { tuval.remove(); geriDon(); return; }

  try { await (document as any).fonts?.ready; } catch { /* yoksa sistem fontu */ }
  const soz = await sozBitmap((bolum.querySelector('.pr-soz')!.textContent || '').trim());

  const isci = new Worker(new URL('./isci.ts', import.meta.url), { type: 'module' });
  let bitti = false;
  const off = (tuval as any).transferControlToOffscreen();
  const cikart: Transferable[] = [off];
  if (soz) cikart.push(soz);
  isci.postMessage({
    tip: 'kur', tuval: off, varyant, kok: bolum.dataset.kok || '',
    dpr, gen: r.width, yuk: r.height, soz,
  }, cikart);

  function dur() {
    if (bitti) return;
    bitti = true;
    isci.terminate();
    tuval.remove();
    kk.remove('pr-gl-hazir');
    geriDon();
  }

  function baglan() {
    /* ILERLEME — KAYDIRMADA DUZEN OKUMASI YOK (H12). Rayin belge
       icindeki yeri BIR KEZ olculuyor; kaydirmada yalniz `scrollY`
       okunuyor, o da duzen zorlamiyor. Aralik CSS yedegiyle AYNI:
       `contain 0% contain 100%`. */
    let ust = 0, yol = 1;
    const olc = () => {
      const k = bolum.getBoundingClientRect();
      ust = k.top + scrollY;
      yol = Math.max(1, k.height - innerHeight);
    };
    const tik = () => isci.postMessage({
      tip: 'p', v: Math.min(1, Math.max(0, (scrollY - ust) / yol)),
    });
    olc(); tik();
    addEventListener('scroll', tik, { passive: true });
    addEventListener('resize', () => { olc(); tik(); }, { passive: true });
    new ResizeObserver((g) => {
      const b = g[0].contentRect;
      isci.postMessage({ tip: 'boyut', g: b.width, y: b.height, d: dpr });
    }).observe(tuval);
    /* Sahne goruste degilken TEK KARE cizilmiyor. Dokular
       BIRAKILMIYOR: yukari donunce sessizce CSS yedegine dusmek
       gorunur bir tutarsizlik olurdu. Bellek sayfa gizlenirken
       geri veriliyor. */
    new IntersectionObserver(
      (g) => isci.postMessage({ tip: 'oynat', a: g[0].isIntersecting }),
      { rootMargin: '10% 0px' },
    ).observe(bolum);
    addEventListener('pagehide', () => isci.postMessage({ tip: 'sok' }), { once: true });
  }

  isci.onmessage = (e) => {
    if (e.data.tip === 'hazir') { kk.add('pr-gl-hazir'); baglan(); }
    else if (e.data.tip === 'hata') { console.warn('[prolog] 3B kurulamadi', e.data.mesaj); dur(); }
  };
  isci.onerror = () => dur();
}
