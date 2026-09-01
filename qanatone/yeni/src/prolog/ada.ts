/* PROLOG ADASI — MODUL HALI (GECE TUR 2b, 1-2 Eyl 2026).
   Icerik PRDag.astro'nun <script> blogundan TASINDI, davranis ayni.
   NEDEN MODUL: prolog film sayfasina tasininca Astro'nun sayfa-bagli
   script chunk'i J1'i 11.355/10.240 B'a tasirdi. Motor emsali: sayfaya
   <script src> ile BAGLANMAYAN dinamik modul J1 disi; Film surucusu
   kurulumda `import()` eder. Oturum-gizleme (pr-atla) BURADA DEGIL:
   erken kosmali diye PRDag'in is:inline adasinda (yoksa tekrar
   ziyarette prolog bir kare gorunurdu). */
export function kur(): void {
  const yedek = (sebep: string, ek?: unknown) => {
    document.documentElement.dataset.prolog = sebep;
    console.warn('[prolog] yedek yol - ' + sebep, ek ?? '');
  };

  let gorulmus = false;
  try { gorulmus = sessionStorage.getItem('pr1') === '1'; } catch {}
  const bolum = document.querySelector<HTMLElement>('.pr');
  if (gorulmus || !bolum) {
    document.documentElement.classList.add('pr-atla');
    if (gorulmus) yedek('atla-oturum');
    return;
  }
  const gec = bolum.querySelector<HTMLElement>('.pr-gec');
  /* hedef: ana sayfada govde (.ana), film sayfasinda filmin kendisi (.fl) */
  const govde = document.querySelector<HTMLElement>('.ana, .fl');
  if (gec && govde) {
    gec.hidden = false;
    gec.addEventListener('click', () => {
      try { sessionStorage.setItem('pr1', '1'); } catch {}
      govde.scrollIntoView({ block: 'start' });
    });
  }
  if (!document.documentElement.classList.contains('pr-gl')) yedek('hareket-azaltma');
  if (!CSS.supports('animation-timeline', 'view()')
    && !matchMedia('(prefers-reduced-motion:reduce)').matches)
    import('./paralaks').then((m) => m.kur(bolum)).catch(() => {});
  if (document.documentElement.classList.contains('pr-gl')) {
    const ac = () => import('./gl').then((m) => m.baslat(bolum))
      .catch((e) => {
        document.documentElement.classList.remove('pr-gl');
        yedek('gl-modulu-inmedi', e);
      });
    if (document.readyState === 'complete')
      ((window as any).requestIdleCallback || ((g: any) => setTimeout(g, 200)))(ac, { timeout: 2000 });
    else addEventListener('load', ac, { once: true });
  }
}
