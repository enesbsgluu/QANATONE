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
     - AMBLEMIN DAGI VE NEHRI SAHNE EVRESINDE YOK, NAV EVRESINDE
       BELIRIYOR (23 Agu, ikinci duzeltme). Sahne boyunca amblem bos
       halkadir - sahnenin kendi dagi ve nehri zaten arkasinda duruyor,
       ustune ikincisini koymak o okumayi bozardi. Nav evresine
       girince ic cizim (beyaz zemin + kizil dag + beyaz nehir)
       yerine geliyor ve devir aninda amblem ile gercek nav logosu
       AYNI seyi gosteriyor. Sebep olculdu: ic cizim yokken devirde
       kutunun beyazi %0'dan %11,7'ye ziplayip ortalama isikliligi
       +16,4 birim degistiriyordu.

   NAVA "OTURUP KALMAK" NASIL: amblem nava tasinmiyor - kuculup
   navdaki logonun yerine geldiginde gercek nav logosu acilir, amblem
   kapanir. Boylece kaydirma devam ederken sahne katmani SIFIR
   maliyete iner (dagin icine inis boyunca hicbir sey cizilmiyor) ve
   navda duran sey sayfanin kendi logosudur.

   DUZEN OKUMASI KARE BASINA YOK (H12): navdaki logonun yeri
   kurulumda ve NAV EVRESINE GIRISTE birer kez olculur - toplam iki
   okuma, kaydirma boyunca sifir. Ikincisi sart: `.nv-bar` sayfa
   tepesinde 20 px, kaydirinca `stuck` ile 12 px ic bosluk tasiyor,
   yani yalniz kurulumda olcen bir hedef 8 px asagi dusuyordu.
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
  /* IC CIZIM - SAHNEDE YOK, NAV EVRESINDE BELIRIYOR.
     BEYAZ ZEMIN YOK: yeni marka varliginda (QANAT_LOGO-seffaf-2.png)
     ic alanlar beyaz DEGIL DELIK - opak beyaz piksel sayisi sifir.
     Gorunen tek ic sey kizil DAG; gok ve nehir bosluk kaliyor ve
     amblem sahnede buyukken oralardan sahnenin kendisi goruluyor.
     Kompozisyon olcumle dogrulandi: `halka + dag` maskesi yeni
     dosyanin alfa maskesiyle %99,50 uyusuyor (yalniz halka %97,84 -
     dag eksik kalir; nehri `evenodd` ile delmeye calismak %96,18 -
     nehrin dag disinda kalan kismi kizile boyanir).
     NEHIR AYRI CIZILMIYOR, cunku `isPointInFill` ile olculdu: nehir
     hem `halka`nin hem `dag`in ICINDE ZATEN DELIK. */
  const C = A.cizim2;
  svg.innerHTML =
    `<path class="pr-ck" d="${C.kuyruk.yol}" fill="none"` +
    ` stroke-width="${C.kuyruk.kalinlik}" stroke-linecap="round"/>` +
    `<path class="pr-cc" d="${C.cember.yol}" fill="none"` +
    ` stroke-width="${C.cember.kalinlik}" stroke-linecap="round"/>` +
    `<path class="pr-ic" d="${A.yol.dag}"/>` +
    `<path class="pr-dolgu" d="${A.yol.halka}"/>`;
  /* AMBLEM GOVDEYE EKLENIYOR, SAHNE YAPISINA DEGIL. `.pr-yapis`
     `position: sticky` ve YAPISIK ELEMAN KENDI YIGIN BAGLAMINI KURAR -
     icindeki hicbir `z-index` disari cikamaz. Amblem orada dururken
     CSS'e z-index 55 yazmak ise yaramiyordu: olculdu, nav evresinin
     son ~%15'inde ekranda kizil piksel 658'den 6'ya duSuyordu, cunku
     amblem hala `.nv-ic`in (zemin rgba(10,10,10,.92), masaustunde
     ustune blur(20px)) ARKASINDAYDI. Govdenin cocugu olunca kok yigin
     baglamina giriyor ve 55 > nav'in 50'si gercekten kazaniyor.
     `position: fixed` oldugu icin sahne yapisindan ayrilmasi konumu
     degistirmiyor - donusum zaten viewport koordinatinda yaziliyor. */
  document.body.appendChild(svg);

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

  /* AMBLEMIN KUTUSU CIZILEN SEYDEN OKUNUYOR, JSON'DAN DEGIL.
     `amblem.json`in `sinir` kutusu RASTERDEN olculmustu ve cizilen
     vektore dar degil GENIS geliyor: JSON 890,1x1006,4 birim, yolun
     kendi kutusu 876,6x996,8 (getBBox ile olculdu, 23 Agu). Aradaki
     %1 dogrudan oturma hatasina donuyordu. `getBBox` SVG'nin KENDI
     kullanici uzayinda calisir - belge duzeni okumasi degil - ve bir
     kez, kurulumda cagriliyor. JSON'daki `sinir` artik kunye ve
     yedek: yol cizilemezse eski sayiya donulur. */
  const kb = svg.querySelector<SVGGraphicsElement>('.pr-dolgu')!.getBBox();
  const kYuk = kb.height > 1 ? kb.height : A.sinir.yari_yukseklik * 2;
  const mX = kb.height > 1 ? kb.x + kb.width / 2 : A.sinir.merkez[0];
  const mY = kb.height > 1 ? kb.y + kb.height / 2 : A.sinir.merkez[1];

  /* HEDEF MERKEZ+OLCEK OLARAK TUTULUYOR (kose+otelemesi degil): ara
     degerde olcek ile merkez AYRI egrilerden geciyor, ikisini tek
     `x/y` otelemesinde tasimak olcegin egrisini merkeze sizdirirdi. */
  let hedef: { cx: number; cy: number; s: number } | null = null;
  const olcNav = () => {
    if (!navLogo) { hedef = null; return; }
    const k = navLogo.getBoundingClientRect();
    if (!k.height) { hedef = null; return; }
    /* Amblemin gorunur sinir kutusu navdaki logonun BOYUNA oturur.
       Genislik serbest kaliyor: raster logonun orani 0,8874, cizilen
       vektorunki 0,8794 - yuksekligi tutturunca genislik 25 px'lik
       hedefte 0,19 px dar kaliyor. Orani zorlamak amblemi ezerdi. */
    hedef = { cx: k.left + k.width / 2, cy: k.top + k.height / 2, s: k.height / kYuk };
  };
  olcNav();

  let sonP = -1, devredildi = false, navOlculdu = false;
  const yaz = (p: number) => {
    if (p === sonP) return;
    sonP = p;
    const kP = ilerle(p, AR.kuyruk as Aralik);
    const cP = ilerle(p, AR.cember as Aralik);
    const dP = yumusat(ilerle(p, AR.dolgu as Aralik));
    const nP = yumusat(ilerle(p, AR.nav as Aralik));
    const iP = yumusat(ilerle(p, AR.ic as Aralik));

    kuyruk.style.strokeDashoffset = `${uzKuyruk * (1 - kP)}`;
    cember.style.strokeDashoffset = `${uzCember * (1 - cP)}`;
    /* Cizgi sonerken gercek dolgu geliyor: cizim sirasinda kalinlik
       sabit (ucuz), son halde seridin kendi degisken kalinligi. */
    svg.style.setProperty('--cizgi', `${1 - dP}`);
    svg.style.setProperty('--dolgu', `${dP}`);
    /* Ic dag NAV EVRESININ ICINDE beliriyor: sahne evresinde amblem
       bos halka kalir - gok ve nehir orada bosluktur ve sahnenin
       kendisi goruluyor. Aralik `sahne.json`da, iki ucu da olculdu:
       amblem nav pilinin uzerine gelmeden ONCE tamamlaniyor (ortusme
       t=0,80 ile 0,90 arasinda basliyor), ve dagin okunabilecegi
       bir boydayken basliyor (t=0,42'de amblem ~180 px). */
    svg.style.setProperty('--ic', `${iP}`);

    /* HEDEF NAV EVRESINE GIRERKEN BIR KEZ YENIDEN OLCULUYOR. H12
       korunuyor: kare basina degil, EVREYE GIRISTE tek okuma.
       Sebep olculdu (23 Agu, dort genislik): `.nv-bar` sayfa
       tepesinde 20 px, kaydirinca `stuck` ile 12 px ic bosluk
       tasiyor. Kurulumda - yani sayfa TEPESINDE - okunan hedef, nav'a
       oturma aninda tam 8 px asagida kaliyordu: 360'ta 8,13 · 412'de
       8,11 · 768'de 8,15 · 1440'ta 8,05 px. Yanlis olan bir sayi
       degil, olcumun ANIYDI. */
    if (nP > 0) { if (!navOlculdu) { navOlculdu = true; olcNav(); } }
    else navOlculdu = false;

    /* Yerlesim: kuyrugu sahnenin nehir izine oturtan OLCULMUS
       donusum; nav evresinde navdaki logonun yerine gidiyor. */
    let s = kat(Y.olcek, p) * innerHeight;
    let tx = kat(Y.merkez_x, p) * innerWidth;
    let ty = kat(Y.merkez_y, p) * innerHeight;
    if (hedef && nP > 0 && s > 0) {
      /* OLCEK GEOMETRIK, MERKEZ DOGRUSAL. Dogrusal olcek olculdu ve
         kapatti: kuculme orani 33-44 kat, dogrusal ara deger evrenin
         TAM ORTASINDA amblemi hala hedefin 16,5-23,0 kati birakiyor,
         t=0,90'da bile 1,9-2,3 kat - yani gorunen kuculmenin hemen
         hepsi son cegrege sikisip ani bir cokme veriyordu (412'de
         128 px'lik evrenin son ~13 px'i). Geometrik ara deger her
         esit ilerleme diliminde AYNI orani uygular; nP=1'de sonuc
         birebir `hedef.s`. Merkez dogrusal kaliyor - onun yolu
         zaten dogruydu, degistirilen yalniz olcegin egrisi. */
      const cx = tx + mX * s;
      const cy = ty + mY * s;
      s *= Math.pow(hedef.s / s, nP);
      tx = cx + (hedef.cx - cx) * nP - mX * s;
      ty = cy + (hedef.cy - cy) * nP - mY * s;
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
    /* DEVIR TAM nP=1'DE. Eski esik 0,999 idi ve amblem hedefe
       VARMADAN kapaniyordu: `ilerle` 1'e kirpildigi ve `yumusat(1)`
       tam 1 ettigi icin nP=1 karesi her zaman olusuyor, orada olcek
       ve merkez birebir hedeftir. 0,999'da kalan artik olculmustu -
       genislikte 0,43-0,69 px, yukseklikte 0,74-0,99 px. */
    const bitti = nP >= 1;
    if (bitti !== devredildi) {
      devredildi = bitti;
      navLogo?.classList.toggle('nv-logo-bekle', !bitti);
      svg.style.display = bitti ? 'none' : '';
    }
  };

  /* HEDEF DEGISINCE YENIDEN OKU VE O KAREYI YENIDEN YAZ. `yaz` ayni
     `p` icin erken donuyor; taze olcumu ekrana tasimanin tek yolu
     son ilerlemeyi yeniden gecirmek. */
  const tazele = () => {
    olcNav();
    if (sonP >= 0) { const p = sonP; sonP = -1; yaz(p); }
  };
  addEventListener('resize', tazele, { passive: true });

  /* NAV'IN GECISI BITINCE. `.nv-bar` `stuck` sinifini alinca ic
     boslugu 20 -> 12 px'e 0,4 sn'de geciyor; sinif ANINDA degisiyor
     ama hedef 0,4 sn boyunca HAREKET HALINDE. Olculdu: tam o pencerede
     alinan tek okuma 412'de 2,83 px, digerlerinde 8,03-8,08 px yanlis
     hedef veriyordu - yani "bir kez olc" hangi ana denk gelirse o
     kadar hata. Gecis bitiminde okumak bu belirsizligi kapatiyor.
     Yalniz `padding-top` dinleniyor: `.nv-bar` dort kenar icin dort
     olay atiyor, `.nv-ic` ise kendi zemin/kenar gecisini yukari
     kabarciklandiriyor. */
  const bar = document.querySelector<HTMLElement>('.nv-bar');
  bar?.addEventListener('transitionend', (e) => {
    const t = e as TransitionEvent;
    if (t.target === bar && t.propertyName === 'padding-top') tazele();
  }, { passive: true });

  return yaz;
}
