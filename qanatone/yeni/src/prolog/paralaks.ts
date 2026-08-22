/* ============================================================
   PROLOG · YEDEK YOLUN KENDI SURUCUSU.

   NEDEN VAR: B yolunun (katmanli paralaks) tek surucusu saf CSS idi -
   `@supports (animation-timeline: view())`. `animation-timeline`
   Safari ve iOS Safari'ye 26.0 ile geldi; 18.7 ve oncesinde blok HIC
   uygulanmiyor. Yani o cihazlarda 3B dusunce sahne paralaks bile
   yapmiyor, tek SABIT kare kaliyordu - ve bu, dususun kendisinden
   ayri, ikinci bir sessiz kusurdu.

   TEKRAR YOK: `@keyframes pr-kay` ve `pr-soz` TEK YERDE, prolog.css
   icinde. Burasi o kareleri yeniden yazmiyor; animasyonu `paused`
   baslatip her ogenin KENDI `animation-delay`ini negatife cekiyor -
   yani "animasyonun su anki noktasi" ilerlemeden geliyor. Kareler
   degisirse burasi kendiliginden dogru kalir.

   ATA DUGUMDE ILERLEME DEGISKENI YOK (araclar sahnesinde olculmus
   ders): tek bir `--p`yi sahne kokune yazmak her karede butun alt
   agacin stilini tazeliyor. Burada her oge kendi `animationDelay`ini
   aliyor - yedi kisa yazma, ata dugum yok.

   ARALIK GL YOLUYLA AYNI: `contain 0% contain 100%` karsiligi
   `(scrollY - ust) / (yukseklik - innerHeight)`. Ucuncu bir ilerleme
   tanimi dogmasin diye `gl.ts` ile birebir ayni formul.
   ============================================================ */

let kuruldu = false;

export function kur(bolum: HTMLElement): void {
  if (kuruldu) return;
  kuruldu = true;

  const ogeler = [
    ...bolum.querySelectorAll<HTMLElement>('.pr-sar'),
    ...bolum.querySelectorAll<HTMLElement>('.pr-soz'),
  ];
  if (!ogeler.length) return;
  /* Bu sinif olmadan CSS animasyonu hic baslamaz: JS inmeyen
     tarayicida taban (tek sabit kare) BOZULMADAN kalir. */
  bolum.classList.add('pr-js');

  /* KAYDIRMADA DUZEN OKUMASI YOK (H12): rayin yeri bir kez olculur,
     kaydirmada yalniz `scrollY` okunur. */
  let ust = 0, yol = 1;
  const olc = () => {
    const k = bolum.getBoundingClientRect();
    ust = k.top + scrollY;
    yol = Math.max(1, k.height - innerHeight);
  };

  let bekleyen = false;
  const yaz = () => {
    bekleyen = false;
    const p = Math.min(1, Math.max(0, (scrollY - ust) / yol));
    /* Animasyon suresi 1s; negatif gecikme onu p noktasina donduruyor. */
    for (const o of ogeler) o.style.animationDelay = `${-p}s`;
  };
  const tik = () => {
    if (bekleyen) return;
    bekleyen = true;
    requestAnimationFrame(yaz);
  };

  olc(); yaz();
  addEventListener('scroll', tik, { passive: true });
  addEventListener('resize', () => { olc(); tik(); }, { passive: true });
}
