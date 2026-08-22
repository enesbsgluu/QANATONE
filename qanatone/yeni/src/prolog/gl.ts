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
import { yedek, acildi } from './tani';

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
  } catch (e) {
    /* DUSUS DEGIL: sahne kalir, yalniz cumle tuvale cizilmez. Yine de
       sessiz kalmiyor — "cumle kayboldu" ayri bir belirti. */
    console.warn('[prolog] cumle dokusu cikmadi, sahne devam ediyor', e);
    return null;
  }
}

export async function baslat(bolum: HTMLElement) {
  const kk = document.documentElement.classList;
  const geriDon = () => kk.remove('pr-gl');
  const tuval = document.createElement('canvas');
  tuval.className = 'pr-tuval';
  const yapis = bolum.querySelector('.pr-yapis');
  /* UC AYRI KAPI, UC AYRI AD. Eskiden tek `if` idi ve hangisinin
     kapandigi hicbir yere yazilmiyordu — Safari ile Chrome'u ayirt
     etmeyi imkansiz kilan sey buydu. */
  if (!yapis) { yedek('sahne-yapisi-yok'); geriDon(); return; }
  if (typeof Worker === 'undefined') { yedek('worker-yok'); geriDon(); return; }
  if (!(tuval as any).transferControlToOffscreen) {
    yedek('offscreen-yok', `OffscreenCanvas=${typeof OffscreenCanvas}`);
    geriDon();
    return;
  }
  yapis.appendChild(tuval);

  /* Varyant sorgusu `<picture>`in `media`siyla AYNI olmali: iki
     varyantin kesimi, kutulari ve dosyalari farkli. */
  const varyant = matchMedia('(max-width: 760px)').matches ? 'mobil' : 'masaustu';
  /* CIZIM tavani URETIM tavanindan ayri ve VARYANTA BAGLI: mobilde
     1,5, masaustunde 2. Olculdu (412x892, CPU 4x, GPU senkronlu):
     DPR 2 -> 12,35 ms/kare (p95 28,6) · 1,5 -> 8,70 (p95 11,0).
     Mobilde tek gercek kaldirac piksel sayisi. `dpr_tavan` (uretim
     referansi) BILEREK dokunulmadi: onu dusurmek katman
     genisliklerini kucultup butun gorselleri yeniden urettirirdi. */
  const dprT = (VERI as any).dpr_cizim?.[varyant] ?? (VERI as any).dpr_tavan;
  const dpr = Math.min(window.devicePixelRatio || 1, dprT);
  const r = tuval.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) {
    yedek('tuval-olcusuz', `${r.width}x${r.height}`);
    tuval.remove(); geriDon(); return;
  }

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
    if (e.data.tip === 'hazir') { kk.add('pr-gl-hazir'); acildi(); baglan(); }
    else if (e.data.tip === 'hata') { yedek('isci-hatasi', e.data.mesaj); dur(); }
  };
  /* EN SESSIZ DALDI. Iscinin KENDISI yuklenemezse (404, yanlis MIME,
     CSP `worker-src`, module worker desteklenmiyor) buraya duser ve
     eskiden hicbir iz kalmazdi. `filename` ve `message` yaziliyor:
     yol hatasi mi, ayrıştırma hatasi mi, tek bakista ayrilsin. */
  isci.onerror = (e) => {
    const h = e as ErrorEvent;
    yedek('isci-yuklenmedi', `${h.message || 'onerror'} @ ${h.filename || isci.toString()}`);
    dur();
  };
}
