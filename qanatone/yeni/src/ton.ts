/* Kart/demo ton çifti — kaynak `HUE` (kök index.html 6889) ve
   `__akisRender`ın --tA/--tB kuralı (7069). Şerit (SAAkis) ve hizmet
   detay demosu (HizmetGovde) AYNI diziden okur — kopya değil bağ:
   hizmetin tonu her iki yerde de hizmet SIRASINDAN türer, kart ile
   detay aynı hizmette aynı tonu gösterir. */
export const HUE: [number, number][] = [
  [350, 10], [14, 332], [326, 356], [28, 2], [300, 338], [358, 20],
];
export const ton = (i: number): string => {
  const h = HUE[i % HUE.length][0];
  return `--tA:hsl(${h} 72% 30%);--tB:hsl(${h} 85% 56%)`;
};
