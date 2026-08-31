/* ============================================================
   GECIS · ISINLANMA (prologu gec efekti — EFEKT B, 31 Agu 2026, Enes)

   "Videonun konumundan TAMAMEN bagimsiz, her an hazir bekleyen tam
   ekran katmani. His: merkeze dogru yogunlasan radyal yakinlasma izleri,
   kizil cizgilerin merkezde toplanmasi, kisa bir doygunluk, sonra site.
   Hedef ~400 ms. Sayfa dokuya cizilmez; bukme hissi ortu katmaninda."

   Kutuphanesiz: tek 2D canvas, ~90 radyal iz + merkez parlama.
   AYRI PARCA (motor emsali): sayfaya <script src> ile baglanmaz, J1
   tavanina girmez; Film.astro bosta `import()` ile isitir. Modul
   inmemisken tiklanirsa Film.astro sade sonumleme yoluna duser.

   Zamanlama: TOPLANMA_MS boyunca izler merkeze akar ve doygunluk
   buyur; tepe aninda (ekran tamamen ortuluyken) `tepe()` cagrilir —
   sayfanin altindaki takas o anda yapilir, gozle gorulmez. Sonra ortu
   SON_MS'de sonerek siteyi acar. Kareler `kareler`e itilir (dusen kare
   olcumu, olc-efekt.cjs okur). ============================================================ */

const TOPLANMA_MS = 250;
const SON_MS = 150;

export interface IsinlaSecenek {
  tepe: () => void;                 /* doygunluk aninda: asil gecis isi */
  bitti: () => void;                /* ortu tamamen sonunce */
  kareler?: number[];               /* rAF zaman kaydi (olcum) */
  execler?: number[];               /* kare basina cizim suresi ms (tani) */
}

/* ON ISITMA (iki asamada olculdu): (1) arka depo tahsisi ilk cizim
   karesine biniyordu; (2) detached on-tahsis YETMEDI — dusen kare efekt
   basi +50-58 ms'te tekrarladi: 2D canvas SAHNEYE girdikten birkac kare
   sonra GPU katmanina terfi ediyor, terfi karesi 41-49 ms. `hazirla()`
   tuvali gorunmez halde (opacity 0) sayfaya koyar ve birkac gercek kare
   cizdirir: tahsis + terfi bosta odenir, tiklamada katman sicak bekler
   ("her an hazir" sarti). */
let hazir: HTMLCanvasElement | null = null;
export function hazirla(): void {
  if (hazir) return;
  const dpr = Math.min(1.5, devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = Math.round(innerWidth * dpr); c.height = Math.round(innerHeight * dpr);
  /* opacity 0 DEGIL .0001: sifir opakligi kompozitor hic yuklemiyor,
     41 ms'lik yukleme efektin 3. karesine biniyordu (ayni ders devir
     turunde govde icin de olculmustu) */
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:70;pointer-events:none;opacity:.0001';
  document.body.appendChild(c);
  const x = c.getContext('2d')!;
  let n = 0;
  const isit = () => {
    /* ISITMA EFEKTIN GERCEK CIZIM TURLERIYLE (olculdu: duz fillRect
       isitmasi 41 ms'lik sabit gap'i KALDIRMADI — exec 0,2-1,6 ms yani
       bizim cizim degil; sabit sure + ilk kullanimda olmasi shader
       derlemesini gosteriyor. lighter + stroke + radyal gradient burada
       bir kez cizilir ki derleme bosta yapilsin). */
    x.fillStyle = '#050505'; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = 'rgba(239,35,60,.5)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(c.width, c.height); x.stroke();
    const g = x.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, c.width / 2);
    g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(0.35, 'rgba(255,77,99,.5)'); g.addColorStop(1, 'rgba(239,35,60,0)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'source-over';
    if (++n < 5) requestAnimationFrame(isit);
    else { x.clearRect(0, 0, c.width, c.height); hazir = c; }
  };
  requestAnimationFrame(isit);
}

export function isinla(o: IsinlaSecenek): void {
  const vw = innerWidth, vh = innerHeight;
  /* DPR 1,5 tavani: efekt 400 ms'lik ortu, tam cozunurluk gereksiz */
  const dpr = Math.min(1.5, devicePixelRatio || 1);
  const c = hazir || document.createElement('canvas');
  hazir = null;
  if (c.width !== Math.round(vw * dpr) || c.height !== Math.round(vh * dpr)) {
    c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr);
  }
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:70;pointer-events:none';
  if (!c.isConnected) document.body.appendChild(c);
  const x = c.getContext('2d')!;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, vw, vh);
  const mx = vw / 2, my = vh / 2;
  const R = Math.hypot(mx, my);
  /* izler: aci + baslangic yaricapi + kalinlik; her kare merkeze akar */
  const N = 90;
  const iz: [number, number, number][] = [];
  for (let i = 0; i < N; i++) iz.push([Math.random() * 6.2832, R * (0.35 + 0.85 * Math.random()), 0.7 + Math.random() * 1.8]);
  const t0 = performance.now();
  let tepeOldu = false;
  const kare = (now: number) => {
    if (o.kareler && o.kareler.length < 200) o.kareler.push(now);
    const t = now - t0;
    const e0 = performance.now();
    if (t < TOPLANMA_MS) {
      const p = t / TOPLANMA_MS;
      x.clearRect(0, 0, vw, vh);
      /* zemin karariyor: izler okunur, site heniz gorunmuyor olmali */
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = `rgba(5,5,5,${(0.35 + 0.65 * p).toFixed(3)})`;
      x.fillRect(0, 0, vw, vh);
      /* radyal izler merkeze akar; kuyruk merkeze yaklastikca kisalir */
      x.globalCompositeOperation = 'lighter';
      const cek = Math.pow(1 - p, 1.7);          /* konum: merkeze hizlanan akis */
      for (const [a, r0, w] of iz) {
        const r1 = r0 * cek, r2 = Math.min(r0, r1 + r0 * 0.22 * (1 - p) + 8);
        const ca = Math.cos(a), sa = Math.sin(a);
        x.strokeStyle = `rgba(239,35,60,${(0.25 + 0.75 * p).toFixed(3)})`;
        x.lineWidth = w * (0.6 + p);
        x.beginPath();
        x.moveTo(mx + ca * r1, my + sa * r1);
        x.lineTo(mx + ca * r2, my + sa * r2);
        x.stroke();
      }
      /* merkez doygunluk: kizil -> beyaz cekirdek, tepe aninda ekrani orter */
      const g = x.createRadialGradient(mx, my, 0, mx, my, R * (0.12 + 1.05 * p * p));
      g.addColorStop(0, `rgba(255,255,255,${(0.9 * p).toFixed(3)})`);
      g.addColorStop(0.35, `rgba(255,77,99,${(0.85 * p).toFixed(3)})`);
      g.addColorStop(1, 'rgba(239,35,60,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, vw, vh);
      /* son %18: tam ortu (takasin gorunmez oldugu pencere) */
      if (p > 0.82) {
        x.globalCompositeOperation = 'source-over';
        x.fillStyle = `rgba(239,35,60,${((p - 0.82) / 0.18).toFixed(3)})`;
        x.fillRect(0, 0, vw, vh);
      }
      if (o.execler && o.execler.length < 200) o.execler.push(+(performance.now() - e0).toFixed(1));
      requestAnimationFrame(kare);
    } else if (!tepeOldu) {
      tepeOldu = true;
      /* tepe: ekran tamamen ortulu — asil gecis simdi */
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = '#ef233c'; x.fillRect(0, 0, vw, vh);
      o.tepe();
      /* sonis kompozitorde: cizim bitti, yalniz opacity iner */
      c.style.transition = `opacity ${SON_MS}ms ease-out`;
      requestAnimationFrame(() => { c.style.opacity = '0'; });
      setTimeout(() => { c.remove(); o.bitti(); }, SON_MS + 40);
      requestAnimationFrame(kare);               /* kare kaydi sonisi de kapsasin */
    } else if (c.isConnected) {
      requestAnimationFrame(kare);
    }
  };
  requestAnimationFrame(kare);
}
