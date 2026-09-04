/* NAV KOREOGRAFISI — AYRI ADA (4 Eyl 2026, Enes).
   ISTENEN: "siteye girince prolog VE nav; kaydirma baslayinca nav
   kaybolur; kisi geri kaydirirsa yani basa donerse nav geri gelir."

   NEDEN AYRI DOSYA — bedeli olculdu: koreografi `Film.astro`nun icindeydi
   ve oraya bir avuc satir eklemek film sayfasini J1 tavaninin USTUNE
   cikardi (11.351 B > 11.264 B). Enes'in kurali: "farkli adalarda olmalari
   ve birbirinin butcelerini yemiyor olmalari gerekiyor." Bu parca
   `/varlik/nav.js` olarak kendi butcesinde durur; film sayfasinin JS
   butcesine girmez ve yalnizca film markup'i olan sayfada indirilir.

   NEDEN `scrollY > 4` YETMIYORDU: film KENDI KENDINI ilerletiyor.
   Olculdu (bos sekme, headless, belge basindan kancali): sayfa scrollY 0
   ile aciliyor (DOMContentLoaded 0, load 0), sonra t~996 ms'de her ~25
   ms'de bir 1 px `scrollBy` basliyor. Yani esik ziyaretci hicbir sey
   yapmadan ilk saniyede asiliyordu ve nav kayboluyordu — Enes'in gordugu
   "nav hala gozukmuyor" tam olarak buydu.
   CARE: cekilme KULLANICI GIRDISINE bagli (wheel/touch/klavye). Pasif
   dinleyiciler, yalnizca bir bayrak; olcum yok, DUZEN OKUMASI YOK.
   GERI DONUS HISTEREZISLI: esik 4 px degil 140 px. Sebep olculdu — film
   ~40 px/sn ilerliyor; 4 px'te "basa dondu" hali bir saniye bile
   yasamadan yeniden asiliyordu. 140 px ziyaretcinin basa donusunu
   yakalar, filmin kendi ilerlemesi ise oraya ancak birkac saniyede varir. */
const R = document.documentElement;

export function kur() {
  /* yalniz film markup'i olan sayfada anlamli: sinifin karsiligi film.css'te */
  if (!document.querySelector('.fl-yapis, #fl-son')) return;
  let kullanici = false, kalkik = false;
  const bak = () => {
    const kalk = kullanici && scrollY > 140;
    if (kalk !== kalkik) { kalkik = kalk; R.classList.toggle('fl-nav-kalk', kalk); }
  };
  for (const olay of ['wheel', 'touchmove', 'keydown'])
    addEventListener(olay, () => { kullanici = true; bak(); }, { passive: true });
  addEventListener('scroll', bak, { passive: true });
  bak();
}
