/* NAV KOREOGRAFISI — AYRI ADA (4 Eyl 2026, Enes; 7 Eyl 2026 genisletildi).
   IKI DAVRANIS, IKI BOLGE, TEK NOBETCI:

   1) PROLOG BOLGESI (film motoru kuruluyken, yani kokte `fl-js` varken):
      "siteye girince prolog VE nav; kaydirma
      baslayinca nav kaybolur; kisi geri kaydirirsa yani basa donerse nav
      geri gelir." Sinif `fl-nav-kalk` (film.css).
   2) GENEL (prolog disinda kalan HER SAYFA ve prolog bittikten sonrasi,
      7 Eyl 2026 — Enes: "nav bar sayfa asagi kaydirinca yok olsun, yukari
      kaydirinca geri ciksin. Bu nav barin KENDI hareketi olacak. Sayfa
      sayfa degil. Genel davranisi bu olacak. Daha premium bir kullanici
      deneyimi."): yon nobetcisi. Sinif `nv-gizli` (nav.css).
      Enes'in istisnasi birebir: "nav'in davranis hareketi prolog suresince
      gecerli degil, o kisimda zaten kaydirinca yok oluyor."

   NEDEN AYRI DOSYA — bedeli olculdu: koreografi `Film.astro`nun icindeydi
   ve oraya bir avuc satir eklemek film sayfasini J1 tavaninin USTUNE
   cikardi (11.351 B > 11.264 B). Enes'in kurali: "farkli adalarda olmalari
   ve birbirinin butcelerini yemiyor olmalari gerekiyor." Bu parca
   `/varlik/nav.js` olarak kendi butcesinde durur; hicbir sayfanin satir
   ici JS butcesine girmez.

   NEDEN `scrollY > 4` YETMIYORDU (prolog dali): film KENDI KENDINI
   ilerletiyor. Olculdu (bos sekme, headless, belge basindan kancali):
   sayfa scrollY 0 ile aciliyor (DOMContentLoaded 0, load 0), sonra
   t~996 ms'de her ~25 ms'de bir 1 px `scrollBy` basliyor. Yani esik
   ziyaretci hicbir sey yapmadan ilk saniyede asiliyordu ve nav
   kayboluyordu — Enes'in gordugu "nav hala gozukmuyor" tam olarak buydu.
   CARE: cekilme KULLANICI GIRDISINE bagli (wheel/touch/klavye). Pasif
   dinleyiciler, yalnizca bir bayrak; olcum yok, DUZEN OKUMASI YOK.
   GERI DONUS HISTEREZISLI: esik 4 px degil 140 px. Sebep olculdu — film
   ~40 px/sn ilerliyor; 4 px'te "basa dondu" hali bir saniye bile
   yasamadan yeniden asiliyordu. 140 px ziyaretcinin basa donusunu
   yakalar, filmin kendi ilerlemesi ise oraya ancak birkac saniyede varir.

   PROLOG SINIRI KAYDIRMA DEGERI DEGIL, DURUM SINIFIDIR (olculerek
   duzeltildi, 7 Eyl): once sinir `#fl-son`un `offsetTop`u sanilmisti;
   gercek tarayicida olculdu ve o deger sayfanin SONU cikti (121.343 ↔
   belge sonu 121.350), yani ana sayfada genel dal hicbir zaman
   calismayacakti. Filmin kendi durumu zaten kokte yaziyor: motor
   kurulunca `fl-js` eklenir, film bitince de atlanınca da (siteyeGec ve
   atlama yollarinin IKISI de) kaldirilir; mobil / hareket azaltma /
   oturumda bir kez atlanmis hallerde hic eklenmez. Kapi bu sinif.
   Yan kazanc: kaydirma isleyicisinde DUZEN OKUMASI (offsetTop) kalmadi.

   GENEL DALIN KENDI TUZAKLARI (adiyla):
   - KAYDIRMADA OLCUM YOK: isleyici yalnizca `scrollY` okur, bir sinif
     listesine bakar ve sinif degistirir.
   - OLU BOLGE 6 px: dokunmatik momentumun ve `scroll-behavior:smooth`un
     urettigi bir-iki piksellik salinim yon sanilip cubugu titretmesin.
   - UST BOLGE (<=90 px) HER ZAMAN ACIK: sayfanin basinda cubuk gizli
     kalirsa kullanici onu geri getirecek yon bulamaz.
   - MENU ACIKKEN GIZLENMEZ: tam ekran mobil menu (#nvAc) aciksa cubuk
     yerinde kalir; kapanis dugmesi onun icinde.
   - HAREKET AZALTMADA GENEL DAL HIC KURULMAZ: gizlenme islevsel de olsa
     bir harekettir; kullanici beyan ettiyse cubuk sabit durur. Prolog
     dali degismedi (kendi sozlesmesi film.css'te). */
const R = document.documentElement;

export function kur() {
  const filmVar = !!document.querySelector('.fl-yapis, #fl-son');
  const azalt = matchMedia('(prefers-reduced-motion:reduce)').matches;
  /* ne prolog ne de genel dal is gorecekse hic dinleyici kurma */
  if (!filmVar && azalt) return;

  const ESIK = 90, OLU = 6;
  let kullanici = false, kalkik = false, gizli = false;
  let sonY = scrollY;

  const bak = () => {
    const y = scrollY;

    if (R.classList.contains('fl-js')) {
      /* 1 · PROLOG BOLGESI */
      if (gizli) { gizli = false; R.classList.remove('nv-gizli'); }
      const kalk = kullanici && y > 140;
      if (kalk !== kalkik) { kalkik = kalk; R.classList.toggle('fl-nav-kalk', kalk); }
    } else {
      /* 2 · GENEL — yon nobetcisi */
      if (kalkik) { kalkik = false; R.classList.remove('fl-nav-kalk'); }
      if (!azalt) {
        const fark = y - sonY;
        const menuAcik = !!(document.getElementById('nvAc') || {}).checked;
        let ist = gizli;
        if (y <= ESIK || menuAcik) ist = false;
        else if (fark > OLU) ist = true;
        else if (fark < -OLU) ist = false;
        if (ist !== gizli) { gizli = ist; R.classList.toggle('nv-gizli', ist); }
      }
    }
    /* olu bolgenin icinde kalan hareket `sonY`yi ilerletmez: yoksa
       her kucuk adim yeni taban olur ve buyuk bir yon hic olusmaz */
    if (Math.abs(y - sonY) > OLU || y <= ESIK) sonY = y;
  };

  for (const olay of ['wheel', 'touchmove', 'keydown'])
    addEventListener(olay, () => { kullanici = true; bak(); }, { passive: true });
  addEventListener('scroll', bak, { passive: true });
  bak();
}
