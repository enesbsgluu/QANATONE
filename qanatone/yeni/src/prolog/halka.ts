/* ============================================================
   PROLOG · DURAK 2 — AMBLEMIN DOGUSU (2. KURGU, 23 Agu).

   AKIS: nav basta BOS. Kamera nehri takip ederken sahnenin nehri
   kivrilip Q'nun KUYRUGUNA donusur; halka onun etrafinda KAPANIR;
   logo tamamlaninca kuculup navdaki yerine oturur ve ORADA KALIR;
   sonra dagin icine inis baslar.

   BIRINCI KURGUDAN NE DEGISTI VE NEDEN:
     - DAG SILUETINE HIZALANMA BIRAKILDI. Olcum kapatmisti: logonun
       uc simetrik sivri tepesi ile gercek Everest silueti ayni sey
       degil, kalan hata ~44 px ve p'ye duyarsizdi. Yeni kurguda
       cakisan sey NEHIR - ki logonun kuyrugu zaten nehir hattidir.
       Olculdu: kuyrugu sahnenin nehir izine oturtmanin hatasi
       masaustunde 28 px, mobilde 25 px (dagda 44 idi).
     - MASKE BIRAKILDI. Olculdu: `stroke-dashoffset` her degistiginde
       maskelenen dolgu bastan raster ediliyor, kare p95'ine 16,7 ms
       yaziyordu. Burada cizilen sey DOGRUDAN STROKE; maskelenen
       icerik yok, her karede yeniden cizilen sey yalnizca cizgi.
     - AMBLEMIN DAGI VE IC CIZIMI SAHNEDE HIC KULLANILMIYOR. Sahnede
       yalniz halka ve kuyruk var; amblemin kendi dagi ancak logo
       nava oturduktan SONRA, gercek nav logosuyla birlikte goruluyor.

   NAVA "OTURUP KALMAK" NASIL: amblem nava tasinmiyor - kuculup
   navdaki logonun yerine geldiginde gercek nav logosu acilir, amblem
   kapanir. Boylece kaydirma devam ederken sahne katmani SIFIR
   maliyete iner (dagin icine inis boyunca hicbir sey cizilmiyor) ve
   navda duran sey sayfanin kendi logosudur.

   DUZEN OKUMASI YOK (H12): navdaki logonun yeri bir kez olculur.
   ============================================================ */
import AMBLEM from './amblem.json';
import SAHNE from './sahne.json';

const A = AMBLEM as any;
const D2 = (SAHNE as any).durak2;
const KUTU = A.kutu as number;

type Aralik = [number, number];
const ilerle = (p: number, [a, b]: Aralik) =>
  Math.min(1, Math.max(0, (p - a) / (b - a)));
const yumusat = (t: number) => t * t * (3 - 2 * t);
const kat = ([sabit, carpan]: [number, number], p: number) => sabit + carpan * p;

let kuruldu = false;

export function kur(bolum: HTMLElement): (p: number) => void {
  if (kuruldu) return () => {};
  kuruldu = true;

  const mobil = matchMedia('(max-width: 760px)').matches;
  const Y = D2.yerlesim[mobil ? 'mobil' : 'masaustu'];
  const AR = D2.aralik;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'pr-amblem');
  svg.setAttribute('viewBox', `0 0 ${KUTU} ${KUTU}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  /* Kuyruk ve cember AYRI stroke: kurgu ikisini sirayla istiyor ve
     seridin kalinligi ikisinde ayni degil (olculdu: cemberde 248,5 px,
     kuyrukta medyan 154 - uca dogru 4 px'e kadar iniyor). */
  const C = A.cizim2;
  svg.innerHTML =
    `<path class="pr-ck" d="${C.kuyruk.yol}" fill="none"` +
    ` stroke-width="${C.kuyruk.kalinlik}" stroke-linecap="round"/>` +
    `<path class="pr-cc" d="${C.cember.yol}" fill="none"` +
    ` stroke-width="${C.cember.kalinlik}" stroke-linecap="round"/>` +
    `<path class="pr-dolgu" d="${A.yol.halka}"/>`;
  (bolum.querySelector('.pr-yapis') || bolum).appendChild(svg);

  const kuyruk = svg.querySelector<SVGPathElement>('.pr-ck')!;
  const cember = svg.querySelector<SVGPathElement>('.pr-cc')!;
  const uzKuyruk = kuyruk.getTotalLength();
  const uzCember = cember.getTotalLength();
  kuyruk.style.strokeDasharray = `${uzKuyruk}`;
  cember.style.strokeDasharray = `${uzCember}`;
  kuyruk.style.strokeDashoffset = `${uzKuyruk}`;
  cember.style.strokeDashoffset = `${uzCember}`;

  /* NAV BASTA BOS. Gizleyen sinifi bu modul koyuyor: prolog atlanirsa
     ya da modul hic inmezse nav normal acilir. */
  const navLogo = document.querySelector<HTMLElement>('.nv-logo i');
  navLogo?.classList.add('nv-logo-bekle');

  let hedef: { x: number; y: number; s: number } | null = null;
  const olcNav = () => {
    if (!navLogo) { hedef = null; return; }
    const k = navLogo.getBoundingClientRect();
    if (!k.height) { hedef = null; return; }
    /* Amblemin gorunur sinir kutusu navdaki logonun boyuna oturmali. */
    const s = k.height / (A.sinir.yari_yukseklik * 2);
    hedef = {
      x: k.left + k.width / 2 - A.sinir.merkez[0] * s,
      y: k.top + k.height / 2 - A.sinir.merkez[1] * s,
      s,
    };
  };
  olcNav();

  let sonP = -1, devredildi = false;
  const yaz = (p: number) => {
    if (p === sonP) return;
    sonP = p;
    const kP = ilerle(p, AR.kuyruk as Aralik);
    const cP = ilerle(p, AR.cember as Aralik);
    const dP = yumusat(ilerle(p, AR.dolgu as Aralik));
    const nP = yumusat(ilerle(p, AR.nav as Aralik));

    kuyruk.style.strokeDashoffset = `${uzKuyruk * (1 - kP)}`;
    cember.style.strokeDashoffset = `${uzCember * (1 - cP)}`;
    /* Cizgi sonerken gercek dolgu geliyor: cizim sirasinda kalinlik
       sabit (ucuz), son halde seridin kendi degisken kalinligi. */
    svg.style.setProperty('--cizgi', `${1 - dP}`);
    svg.style.setProperty('--dolgu', `${dP}`);

    /* Yerlesim: kuyrugu sahnenin nehir izine oturtan OLCULMUS
       donusum; nav evresinde navdaki logonun yerine gidiyor. */
    let s = kat(Y.olcek, p) * innerHeight;
    let tx = kat(Y.merkez_x, p) * innerWidth;
    let ty = kat(Y.merkez_y, p) * innerHeight;
    if (hedef && nP > 0) {
      s += (hedef.s - s) * nP;
      tx += (hedef.x - tx) * nP;
      ty += (hedef.y - ty) * nP;
    }
    svg.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`
      + ` scale(${s.toFixed(6)})`;
    svg.style.opacity = kP > 0 ? '1' : '0';

    /* Sahne soner ki kizil carpsin; nava giderken geri doner. */
    bolum.style.setProperty('--pr-sonuk',
      `${1 - (1 - D2.sonme.deger) * Math.max(kP, cP) * (1 - nP)}`);

    /* DEVIR: amblem navdaki yerine oturunca gercek nav logosu acilir
       ve amblem kapanir. Sahne katmani boylece sifir maliyete iner -
       dagin icine inis boyunca burada hicbir sey cizilmiyor. */
    const bitti = nP >= 0.999;
    if (bitti !== devredildi) {
      devredildi = bitti;
      navLogo?.classList.toggle('nv-logo-bekle', !bitti);
      svg.style.display = bitti ? 'none' : '';
    }
  };

  addEventListener('resize', olcNav, { passive: true });
  return yaz;
}
