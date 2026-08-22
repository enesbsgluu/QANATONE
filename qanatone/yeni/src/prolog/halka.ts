/* ============================================================
   PROLOG · DURAK 2 — AMBLEMIN DOGUSU.

   Kamera daga yaklasirken Q halkasi dagin ETRAFINDA cizilerek dogar,
   kuyrugu sahnenin nehrine devreder, sonra kuculup navdaki yerine
   oturur. Kizil bu sahnede ILK KEZ gorunuyor: cizim boyunca tuval
   hafifce soner ki kizil carpsin.

   CIZIM NASIL YAPILIYOR. Halka bir DOLGU sekli; `stroke` ile
   cizilseydi konturu cizilirdi, kalem darbesi olmazdi. Onun yerine
   gercek dolgu bir MASKE ile aciliyor: maskede, halkanin OLCULEN orta
   cizgisi boyunca serit kalinliginda beyaz bir `stroke` var ve
   `stroke-dashoffset` ile ilerliyor. Yani gorunen sey logonun kendisi,
   aciliş ise kalemin gectigi yer.

   KUYRUK AYRI CIZILMIYOR. Logoda nehir kuyrugun icinden geciyor -
   kuyrugun orta cizgisi zaten olculmus nehir hatti. Maske yolu
   cemberi bitirince ayni hatta devam ediyor, yani "sahnenin nehri
   kuyruga donusuyor" derken cizilen sey birebir o hat.

   YERLESIM OLCULEREK GELIYOR (`sahne.json` -> durak2.yerlesim):
   halkanin ekrandaki merkezi ve yaricapi, zirvenin ve dagin
   izdusumunden p'nin dogrusal fonksiyonu olarak cikarildi. Mobil
   AYRI: dikey kesimde zirve ekranin disinda kaliyor (x = -1,04) ve
   dag kadraji zaten dolduruyor, orada halka KADRAJA oturuyor.

   HEDEF TAM CAKISMA DEGIL TANINMA (Enes, 23 Agu): logonun stilize
   ucgen zirveleri ile gercek Everest silueti ayni sey degil, olculen
   ~44 px fark BILEREK kapatilmadi.

   DUZEN OKUMASI YOK (H12): navdaki logonun yeri bir kez olculuyor,
   ilerlemede yalniz `transform` yaziliyor.
   ============================================================ */
import AMBLEM from './amblem.json';
import SAHNE from './sahne.json';

const D2 = (SAHNE as any).durak2;
const A = AMBLEM as any;
const KUTU = A.kutu as number;               /* 1254 */
/* Dagi cerceveleyen ic cember: olcegin ve hizalamanin dayanagi. */
const IC = A.ic_daire as { merkez: [number, number]; r: number };
/* Nava otururken hizalanan sey ic cember DEGIL amblemin gorunur
   sinir kutusu: navdaki logo amblemin tamamina bakiyor. Ikisi hem
   merkez hem olcek olarak farkli (merkezleri 114 px, olcekleri 2,6
   kat) - kare yakalayinca amblem navda 2,3 kat buyuk oturuyordu. */
const SN = A.sinir as { merkez: [number, number]; yari_yukseklik: number };

type Aralik = [number, number];
const ilerle = (p: number, [a, b]: Aralik) =>
  Math.min(1, Math.max(0, (p - a) / (b - a)));
const yumusat = (t: number) => t * t * (3 - 2 * t);
const kat = ([sabit, carpan]: [number, number], p: number) => sabit + carpan * p;

let kuruldu = false;

export function kur(bolum: HTMLElement): () => void {
  if (kuruldu) return () => {};
  kuruldu = true;

  const mobil = matchMedia('(max-width: 760px)').matches;
  const Y = D2.yerlesim[mobil ? 'mobil' : 'masaustu'];
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'pr-amblem');
  svg.setAttribute('viewBox', `0 0 ${KUTU} ${KUTU}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  /* Maske: olculen orta cizgi + serit kalinligi. `kalinlik` logonun
     kendi seridinden geliyor (dis cember r - ic cember r), pay
     ekleniyor cunku serit ustte ince altta kalin - tek kalinlik
     ortalamadir, dar kalirsa kenarlarda tirtik birakirdi. */
  const mid = `pr-mask-${Math.round(KUTU)}`;
  const kalinlik = A.cizim.orta.kalinlik * 1.22;
  svg.innerHTML =
    `<defs><mask id="${mid}" maskUnits="userSpaceOnUse"` +
    ` x="0" y="0" width="${KUTU}" height="${KUTU}">` +
    `<path class="pr-kalem" d="${A.cizim.yol}" fill="none" stroke="#fff"` +
    ` stroke-width="${kalinlik.toFixed(1)}" stroke-linecap="round"` +
    ` stroke-linejoin="round"/></mask></defs>` +
    `<g mask="url(#${mid})">` +
    `<path class="pr-halka" d="${A.yol.halka}"/>` +
    `</g>` +
    `<g class="pr-ic">` +
    `<path class="pr-dag" d="${A.yol.dag}"/>` +
    `<path class="pr-nehir" d="${A.yol.nehir}"/>` +
    `</g>`;
  /* TUVALIN YANINA, `.pr` BOLUMUNE DEGIL. `.pr` uc ekran boyu bir
     RAY (300vh) ve belge akisinda; icine konan mutlak konumlu bir
     oge kaydirmayla birlikte kayar. Sahne ise `.pr-yapis` icinde
     viewport'a yapisik duruyor - amblem tuvalle AYNI katmanda
     olmali, yoksa hesaplanan viewport konumu ile durdugu yer
     kaydirma kadar ayrisir (kare yakalanip goruldu: halka 477 px
     yukarida duruyordu). */
  (bolum.querySelector('.pr-yapis') || bolum).appendChild(svg);

  const kalem = svg.querySelector<SVGPathElement>('.pr-kalem')!;
  const uzunluk = kalem.getTotalLength();
  kalem.style.strokeDasharray = `${uzunluk}`;
  kalem.style.strokeDashoffset = `${uzunluk}`;

  /* Navdaki logonun yeri BIR KEZ olculuyor. Yoksa (baska bir sayfa
     duzeni) amblem sahnede kalir, kaybolmaz. */
  const hedefOge = document.querySelector<HTMLElement>('.nv-logo i img');
  let hedef: { x: number; y: number; r: number } | null = null;
  const olcNav = () => {
    if (!hedefOge) { hedef = null; return; }
    const k = hedefOge.getBoundingClientRect();
    if (!k.width) { hedef = null; return; }
    hedef = {
      x: (k.left + k.width / 2) / innerWidth * 2 - 1,
      y: 1 - (k.top + k.height / 2) / innerHeight * 2,
      /* `r` her yerde IC cemberin yaricapi; navdaki hedef ise
         amblemin TAM yuksekligi. Ikisi arasindaki oranla ceviriyoruz
         ki navda amblem logonun boyuna otursun. */
      r: (k.height / innerHeight) * (IC.r / SN.yari_yukseklik),
    };
  };
  olcNav();

  let sonP = -1;
  const yaz = (p: number) => {
    if (p === sonP) return;
    sonP = p;
    const cizim = ilerle(p, D2.aralik.cizim as Aralik);
    const navP = yumusat(ilerle(p, D2.aralik.nav as Aralik));

    kalem.style.strokeDashoffset = `${uzunluk * (1 - cizim)}`;

    /* Sahneye kilitli yerlesim; nav evresinde navdaki yerine gider. */
    let mx = kat(Y.merkez_x, p), my = kat(Y.merkez_y, p), r = kat(Y.yaricap, p);
    if (hedef && navP > 0) {
      mx += (hedef.x - mx) * navP;
      my += (hedef.y - my) * navP;
      r += (hedef.r - r) * navP;
    }
    /* Normalize ekrandan piksele: 1,0 = ekran yarisi (yukseklik).
       OLCEK IC DAIREYE GORE, viewBox'a gore DEGIL: olculen `yaricap`
       dagin cerceveleneceği IC dairenin yaricapi (dag/daire orani
       0,833 oradan geliyor). viewBox yarisiyla olceklemek halkayi
       %42 yanlis buyutuyordu - kare yakalayinca goruldu.
       HIZALANAN NOKTA da viewBox merkezi degil IC DAIRE MERKEZI:
       ikisi 104 px ayri ve olcek buyudukce o fark buyuyor. */
    /* EKSENLER AYRI OLCEKTE. Normalize izdusumde x'in ±1'i ekran
       GENISLIGI, y'nin ±1'i ekran YUKSEKLIGI - ikisini ayni sayiyla
       carpmak halkayi yanlis yere koyuyordu (kare yakalayinca
       goruldu). Yaricap yukseklige baglaniyor: halka bir daire,
       ekranin dar kenari onu sinirlar. */
    /* Hizalanan nokta nav evresinde ic cemberden amblemin sinir
       kutusu merkezine kayiyor. */
    const ax = IC.merkez[0] + (SN.merkez[0] - IC.merkez[0]) * navP;
    const ay = IC.merkez[1] + (SN.merkez[1] - IC.merkez[1]) * navP;
    const yariX = innerWidth / 2;
    const yariY = innerHeight / 2;
    const px = yariX + mx * yariX;
    const py = yariY - my * yariY;
    const olcek = (r * yariY) / IC.r;
    svg.style.transform =
      `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`
      + ` scale(${olcek.toFixed(5)})`
      + ` translate(${(-ax).toFixed(1)}px, ${(-ay).toFixed(1)}px)`;
    svg.style.opacity = cizim > 0 ? '1' : '0';

    /* Ic parcalar (dag + nehir) yalniz nava giderken beliriyor:
       sahnede duran dag ve nehir GERCEK olanlar, logonunki onlarin
       uzerine binmemeli. */
    (svg.querySelector('.pr-ic') as SVGGElement).style.opacity = `${navP}`;

    /* Sahne soner ki kizil carpsin. */
    bolum.style.setProperty('--pr-sonuk',
      `${1 - (1 - D2.sonme.deger) * cizim * (1 - navP)}`);
  };

  addEventListener('resize', olcNav, { passive: true });
  (bolum as any).__amblem = yaz;
  return yaz;
}
