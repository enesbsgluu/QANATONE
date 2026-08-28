/* ============================================================
   FILM · SCROLL-SCRUB MOTORU (27 Agu 2026) — HIGGSFIELD-SCRUB-MOTORU.md
   §2'nin Astro'ya tasinmis hali. React tasinmadi, MEKANIZMA tasindi:

   - Blob destekli seek: klip once `fetch` ile INDIRILIR, Blob URL olarak
     videoya verilir; `currentTime` yazimi hic aga gitmez. ("hazir" = klip
     tamamen bellekte — yarim tamponla sarma kopar, montaj-duzenek §5.)
   - Seek birlestirme: kaydirma olaylari tek rAF'ta tek `currentTime`
     yazimina iner; hedef kare degismediyse yazim yok.
   - Tembel + SERI yukleme, YON VE HIZ DUYARLI: sira sabit degil, kaydirma
     yonune gore kurulur (ileri: +1,+2,-1 · geri: -1,-2,+1); hiz esigi
     asilinca (savurma) once komsu SINIRLAR, sonra uzaklar. AYNI ANDA TEK
     indirme (montaj-duzenek E13: iki paralel indirme yavas hatta bant
     bolup ilk karayi geciktirdi — "onden=1").
     NEDEN: sabit "+1,-1,+2" sirasi olculdu — mobil 4G'de GERI savurmada
     %34,4 atlama, kare p95 39,5 ms; ileri savurmada 4 sinirdan yalniz 1'i
     hazir klibe variyordu. Sira ileri yone gomuluydu.
   - Masaustu / mobil ayri kaynak (DOM'daki data-clip / data-mclip).
   - Tam kare poster: `video.poster` src'den ONCE yazilir; gercek kare
     boyanana kadar tarayici posteri tutar (siyah kutu yok).
   - iOS kilidi: ilk dokunusta sessiz play().pause().
   - Geri kaydirma birinci sinif PENCERE ICINDE (27 Agu 2026, Enes karari):
     eskiden inen klip HIC birakilmiyordu; olculdu, 40 sn gezilince 37,9 MiB
     blob birikiyor, film bastan sona gezilirse 200,8 MiB. Kapi artik toplam
     bayt degil BELLEK TAVANI oldugu icin madde su hale geldi: geceli +-PENCERE
     klip bellekte tutulur (o araliktaki geri kaydirma hala aninda), disari
     cikan blob revoke edilir ve durumu 'yok'a doner — geri gelinirse yeniden
     iner. Pencere disina cikan klip icin poster tekrar devreye girer.
   - Sokum: `sok()` Blob URL'leri revoke eder, dinleyicileri cozer.

   KARE BASINA DEGER FRAMEWORK'TEN GELMEZ (sert degismez #4): dogrudan
   DOM / `video.currentTime`. KAYDIRMADA DUZEN OKUMASI YOK: rayin yeri
   bir kez (ve resize'da) olculur, dongude yalniz `scrollY` okunur.

   SONUMLEME = YAY + SONUM (28 Agu 2026, Enes; 27 Agu'daki ustel yaklasma
   ve 28 Agu sabahki alt hiz tabani KALKTI). Iki durum tutulur: KONUM
   (gosterilenT) ve HIZ (v). Her fizik adiminda
       a = -k (x - hedef) - c v ;  v += a dt ;  x += v dt
   k = sertlik, c = sonum. Varsayilan KRITIK SONUM c = 2*sqrt(k): hedefe
   salinmadan ve teklemeden varir. Katsayilar ustten:
       ?sert=120 ?sonum=21.9  (URL) · data-sert / data-sonum (DOM)
       · __fl.sert = 120 ; __fl.sonum = 0 (0 = kritik, otomatik) (konsol)
   Uc aday sertlik (sahneler.ts SERTLIK_ADAY): 60 yumusak (oturma ~0,75 s)
   · 120 orta (~0,53 s) · 250 siki (~0,37 s). Oturma suresi ~5,8/sqrt(k).
   FIZIK SABIT ADIMLI (FIZIK_DT = 4 ms): kare suresi ne olursa olsun ayni
   adim sayisi/saniye; artan sure biriktirilir, cizim iki fizik durumu
   arasinda ara deger harmanlar (alfa = birikim / dt). 60 Hz ve 120 Hz'de
   egri AYNI (olcum: yeni/film/olc-birakma.cjs + node benzetimi).
   MOMENT DEVRI: kaydirma birakildiginda (hedef durdu) hedefin son gercek
   hizi yayin hizina devredilir — ama ASMAYACAK kadar: |v| <= sqrt(k)*|x-hedef|
   (kritik sonumlu yayda asma sarti v0 > w*d; bu sinirin altinda tek yonlu
   varis). Boylece kaydirma biraktiginda film aniden yavaslamaz, elin
   hiziyla sonumlenir. Hiz tavani (TAVAN) yayin hizina uygulanir.
   DURUSTA AKIS (28 Agu 2026, Enes): kaydirma birakilinca ve yay otururken
   film cok yavas ilerlemeye DEVAM eder (varsayilan AKIS = 0,08 film-sn /
   gercek-sn). Gerekce: film 24 fps; yayin son ~275 ms'si bir kareden kucuk
   hareket uretiyor, goruntu yaydan once donuyordu. NASIL: tek gercek kaynak
   scrollY kalir — motor sayfayi kendisi kaydirir (px birikimi, tam pikselde
   scrollBy). Kullanici girdisi (wheel/touch/key/pointer) gorulunce akis
   ANINDA durur ve girdi bittikten AKIS_BEKLE sonra yeniden baslar; boylece
   kontrol hep kullanicida, cakisma yok. Film sonunda durur. Ayar:
   ?akis=0.08 (URL) · data-akis · __fl.akis (0 = kapali).

   SINIR ON-SARMA + CIFT VIDEO (28 Agu 2026 gece, Enes): olculdu (olc-takilma),
   ileri okumadaki her sapma klip sinirinin SON karesindeydi (110-170 ms
   sunumsuz bosluk): komsu `visibility:hidden` iken devralinca ilk boyama +
   ilk rVFC bir-iki kare yiyordu. Simdi: gosterilen konum sinira ON_SAR_S
   (0,5 s) kala, YONDEKI komsu klip sinir karesine (ileri: 0, geri: son)
   on-sarilir ve `fl-onsar` sinifiyla BOYANIR — etkinin ALTINDA, gorunur.
   Devir aninda yalniz katman sirasi degisir (etkin ustte); display/
   visibility gecisi yok, ilk kare coktan kompozitorde. Sinirdan
   uzaklasinca (ya da devirden sonra) sinif kalkar: ayni anda en cok IKI
   video boyanir.

   YAVAS HAT PENCERESI (ayni tur): olculdu, yavas 4G 1x okumada sahne3->4
   sinirinda 2,57 s sunumsuz bosluk (klip inmemis). Etkin indirme hizi
   (son inen klibin bayt/inmeMs) YAVAS_MBIT altindaysa on-yukleme
   penceresi bir klip genisler (ON_PENCERE+1) ve tutma penceresi de
   onunla; sira zaten yondeki komsu ile baslar.

   SAHNE GECISI (dikis) — DEVRALMA (27 Agu 2026, Enes karari):
   Eskiden komsu klip sinir karesine on-sarilir ve el degisimi ANINDA
   yapilirdi. Geri savurmada bu, gorunur bir sicrama uretiyordu: klip
   pencere disina cikip yeniden indiginde son kareye sariliyor, ama scrub
   coktan klibin ortasinda oluyordu; ilk sunulan kare son kare, sonraki
   gercek konum -> masaustunde 120 karelik bosluk olculdu.
   Yeni kural: BIR KLIP, GERCEK SCRUB KONUMUNUN KARESINE OTURMADAN
   DEVRALMAZ. Devralana kadar onceki klibin son sunulan karesi ekranda
   kalir (poster degil — kesinti yok). Sinir karesine on-sarma yalniz
   HENUZ ETKIN OLMAYAN komsular icin gecerlidir; inen klip etkin sahne
   ise dogrudan gercek konuma sarilir.

   ACILIS KOPYASI (yalniz sahne1): tam klip inene kadar ilk saniyeleri
   tasiyan kucuk kopya oynatilir (ayni CRF/cozunurluk -> gecis gorunmez).
   Tam kopya inip AYNI kareye sarilinca tek sinif degisimiyle takas edilir.

   OLCUM YUZEYI: `window.__fl` — durum + istek/sunum kaydi (rVFC ile
   GERCEKTEN BOYANAN kare). yeni/film/olc.cjs bunu okur. Kayit kapaliyken
   maliyeti sifir (dizilere itilmez).
   ============================================================ */

/* Bellek tavani: gecerli sahnenin +-PENCERE'si bellekte kalir. 3 -> en cok
   7 klip. Olculen klip basi ~1 MiB (CRF 28 native) ile tavan ~7 MiB. */
const PENCERE = 3;
/* sinira bu kadar kala yondeki komsu on-sarilir ve boyanir (s) */
const ON_SAR_S = 0.5;
/* etkin indirme hizi bunun altindaysa (Mbit/s) on-yukleme penceresi +1 */
const YAVAS_MBIT = 6;
/* On yukleme penceresi TUTMA penceresinden DAR: ikisi esit olursa sinirda
   inen klip, gecerli sahne bir adim kayinca hemen pencere disina dusup
   birakilir ve geri gelindiginde yeniden iner (indir-birak salinimi).
   Aradaki bir kliplik pay histerezis gorevi gorur. */
const ON_PENCERE_TABAN = PENCERE - 1;

/* Savurma esigi: iki rAF arasi kat edilen film saniyesi bunun ustundeyse
   kaydirma "savurma" sayilir ve on yukleme sirasi sinir-oncelikli kurulur.
   1x okuma temposunda kare basi ~1/fps sn ilerlenir; 3x bunun ustu. */
const SAVURMA_SN = 0.12;
/* Durusta akis: kullanici girdisinden sonra bu kadar bekle (ms), sonra ak. */
const AKIS_BEKLE_MS = 160;
/* Fizik adimi (s): sabit; kare suresinden bagimsiz. */
const FIZIK_DT = 0.004;
/* Bir karede en cok bu kadar birikim islenir (sekme arka plana dusup
   donunce yuzlerce adim kosmasin; kalan atilir, konum korunur). */
const FIZIK_TAVAN_S = 0.1;
/* Hiz tavaninin varsayilani (film-sn / gercek-sn). 1x okuma ve 1,5x
   gezinme olculdu, ikisi de temiz (FILM-ISKELET-TURU 5. tur); ustu yutulur. */
const TAVAN_VARSAYILAN = 1.5;
/* "geride" olayi esigi: gosterilen hedefin bu kadar film-sn gerisindeyse
   sayfa atla dugmesini gosterebilir. */
const GERIDE_SN = 1.0;

type Durum = 'yok' | 'iniyor' | 'hazir' | 'hata';

interface Sahne {
  n: number; el: HTMLElement; video: HTMLVideoElement;
  sure: number; kare: number; bas: number;
  url: string; poster: string;
  durum: Durum; blob: string | null; bayt: number; inmeMs: number;
  /* acilis kopyasi: ayri <video>, kendi blob'u; takas sonrasi birakilir */
  aVideo: HTMLVideoElement | null; aUrl: string | null; aSn: number;
  aBlob: string | null; aDurum: Durum; takas: boolean;
}

interface Iz {
  hazir: boolean; kayit: boolean; mobil: boolean; kodek: string;
  toplam: number; pxSn: number; fps: number;
  istek: { t: number; n: number; kare: number; T?: number; hedef?: number }[];
  sunum: { t: number; n: number; kare: number; g: boolean; mt: number }[];   /* mt: sunulan karenin gercek mediaTime'i (sn) */
  ilkKareMs: number | null;
  yon: number; hiz: number; pencere: number; onPencere: number; mbit: number | null; onsar: number;
  ray: () => { pxSn: number; rayPx: number; ekranBoyu: number; snBasinaEkran: number; birEkranSn: number };
  bellekMib: () => number;
  birakilan: number;
  hedef: () => number;        /* scrub konumunun sahnesi (etkin = GOSTERILEN) */
  sert: number;               /* yay sertligi k (1/s^2) */
  sonum: number;              /* sonum c (1/s); 0 = kritik (2*sqrt(k)), otomatik */
  tavan: number;              /* gosterilen hiz tavani, film-sn / gercek-sn (0 = kapali) */
  akis: number;               /* durusta akis temposu, film-sn / gercek-sn (0 = kapali) */
  akiyor: boolean;            /* su an motor sayfayi kendisi kaydiriyor mu */
  hedefT: number;             /* kaydirmanin istedigi film saniyesi */
  gosterilenT: number;        /* ekranda olan film saniyesi (harmanlanmis) */
  hizT: number;               /* yayin hizi, film-sn / gercek-sn */
  hedefHiz: number;           /* hedefin (kaydirmanin) son olculen hizi */
  atla: () => void;           /* gosterileni hedefe oturt (yutulan kaydirmayi atla) */
  geride: () => number;       /* hedef - gosterilen, film-sn */
  devir: number;              /* devralma sayisi */
  acilisMs: number | null;    /* acilis kopyasinin ilk karesi (sahne1) */
  acilisTakasMs: number | null;
  sahne: () => { n: number; durum: Durum; bayt: number; inmeMs: number }[];
  konum: (T: number) => number;
  etkin: () => number;
  sifirla: () => void;
}

let kuruldu = false;

export function baslat(bolum: HTMLElement): () => void {
  if (kuruldu) return () => {};
  kuruldu = true;

  const kok = bolum.dataset.kok || '';
  const fps = Number(bolum.dataset.fps);
  /* KAYDIRMA UZUNLUGU (px / film saniyesi) — sonumleme gibi ustten
     ayarlanabilir: ?pxsn=450 (URL) > data-pxsn (DOM) > sahneler.ts.
     Ray yuksekligi CSS'ten geldigi icin URL ile ezilince ray da yeniden
     yazilir (asagida --fl-pxsn). */
  const pxSn = (() => {
    const u = Number(new URLSearchParams(location.search).get('pxsn'));
    const d = Number(bolum.dataset.pxsn);
    if (u >= 50 && u <= 2000) {
      bolum.style.setProperty('--fl-pxsn', String(u));   /* ray boyu da degissin */
      return u;
    }
    return d;
  })();
  /* Hat secimi: H13/H6 ile ayni esik (900 px). Kaynak farki yalniz CRF/GOP
     (mobil betik 720p tavanini zaten 716 satirla asmiyor). */
  const mobil = matchMedia('(max-width: 900px)').matches;
  /* KODEK: TEK HAT H.264 (Enes, 28 Agu). H.265 KAPANDI: Chromium'un HEVC
     yolu (Chrome + Brave, olculdu 5. ve 6. tur) hedef kare anahtar kareden
     uzaksa sonraki anahtar kareye yapisiyor; GOP 8'de %25, GOP 4'te %75
     atlama. canPlayType 'probably' bunu gormuyordu (yanlis yesil). Secim
     sabit; ?kodek=h265 yalniz OLCUM icin zorlar, urun yolunda kullanilmaz. */
  const KODEK = (() => {
    const z = new URLSearchParams(location.search).get('kodek');
    return z === 'h265' ? 'h265' : 'h264';
  })();
  const kaynakYolu = (el: HTMLElement, h264: string, h265: string) =>
    KODEK === 'h265' && el.dataset[h265] ? el.dataset[h265]! : el.dataset[h264]!;
  /* yay katsayilari: URL > DOM > varsayilan (sahneler.ts). sonum 0 = kritik. */
  const oku = (ad: string, ust: number, vars: number) => {
    const u = new URLSearchParams(location.search).get(ad);
    if (u !== null && Number(u) >= 0 && Number(u) <= ust) return Number(u);
    const d = bolum.dataset[ad];
    return d !== undefined && Number(d) >= 0 ? Number(d) : vars;
  };
  const SERT = oku('sert', 5000, 120);
  const SONUM = oku('sonum', 1000, 0);
  const AKIS = oku('akis', 5, 0.08);
  /* hiz tavani: URL > DOM > varsayilan; 0 = kapali */
  const TAVAN = (() => {
    const u = new URLSearchParams(location.search).get('tavan');
    if (u !== null && Number(u) >= 0 && Number(u) <= 20) return Number(u);
    const d = bolum.dataset.tavan;
    return d !== undefined && Number(d) >= 0 ? Number(d) : TAVAN_VARSAYILAN;
  })();
  const ray = bolum.querySelector<HTMLElement>('.fl-ray')!;
  const yeni = performance.now();

  const S: Sahne[] = [...bolum.querySelectorAll<HTMLElement>('.fl-sahne')].map((el) => ({
    n: Number(el.dataset.n), el, video: el.querySelector('video')!,
    sure: Number(el.dataset.sure), kare: Number(el.dataset.kare), bas: Number(el.dataset.bas),
    url: kok + '/' + (mobil ? kaynakYolu(el, 'mclip', 'mclip265') : kaynakYolu(el, 'clip', 'clip265')),
    poster: kok + '/' + (mobil ? el.dataset.mposter : el.dataset.poster),
    durum: 'yok', blob: null, bayt: 0, inmeMs: 0,
    aVideo: el.querySelector<HTMLVideoElement>('.fl-acilis'),
    aUrl: (() => { const a = el.querySelector<HTMLElement>('.fl-acilis'); return a ? kok + '/' + (mobil ? kaynakYolu(a, 'macilis', 'macilis265') : kaynakYolu(a, 'acilis', 'acilis265')) : null; })(),
    aSn: Number(el.querySelector<HTMLElement>('.fl-acilis')?.dataset.asn || 0),
    aBlob: null, aDurum: 'yok', takas: false,
  }));
  const son = S[S.length - 1];
  const toplam = son.bas + son.sure;

  const IZ: Iz = {
    hazir: false, kayit: false, mobil, kodek: KODEK, toplam, pxSn, fps,
    istek: [], sunum: [], ilkKareMs: null,
    yon: 1, hiz: 0, pencere: PENCERE, onPencere: ON_PENCERE_TABAN, mbit: null, onsar: 0,
    hedef: () => S[i].n, devir: 0, acilisMs: null, acilisTakasMs: null,
    sert: SERT, sonum: SONUM, tavan: TAVAN, akis: AKIS, akiyor: false, hedefT: 0, gosterilenT: 0, hizT: 0, hedefHiz: 0,
    atla: () => { atlaIstek = true; tik(); },
    geride: () => IZ.hedefT - IZ.gosterilenT,
    ray: () => ({ pxSn, rayPx: Math.round(toplam * pxSn), ekranBoyu: +(toplam * pxSn / innerHeight).toFixed(1),
      snBasinaEkran: +(pxSn / innerHeight).toFixed(3), birEkranSn: +(innerHeight / pxSn).toFixed(2) }),
    bellekMib: () => +(S.reduce((a, x) => a + (x.blob ? x.bayt : 0), 0) / 1048576).toFixed(1),
    sahne: () => S.map((s) => ({ n: s.n, durum: s.durum, bayt: s.bayt, inmeMs: s.inmeMs })),
    konum: (T) => ust + (T / toplam) * yol,
    etkin: () => (etkin ? etkin.n : 0),
    sifirla: () => { IZ.istek = []; IZ.sunum = []; },
  };
  (window as any).__fl = IZ;

  /* --- ray olcumu: dongu DISINDA --- */
  let ust = 0, yol = 1;
  const olc = () => {
    const k = ray.getBoundingClientRect();
    ust = k.top + scrollY;
    yol = Math.max(1, k.height - innerHeight);
  };

  /* --- boyanan kare kaydi (rVFC): tahmin degil, sunulan kare --- */
  const izle = (s: Sahne) => {
    const v = s.video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: (now: number, md: { mediaTime: number }) => void) => void };
    if (!v.requestVideoFrameCallback) return;
    const f = (now: number, md: { mediaTime: number }) => {
      if (IZ.ilkKareMs === null && s === S[0]) IZ.ilkKareMs = Math.round(now - yeni);
      /* `g`: bu kare EKRANDA MIYDI. Yerlesik ama gorunmez komsu klipler de
         rVFC atesler; onlari sunulmus saymak "max bosluk"u kirletirdi. */
      if (IZ.kayit) IZ.sunum.push({ t: now, n: s.n, kare: Math.round(md.mediaTime * fps), g: s === etkin, mt: md.mediaTime });
      v.requestVideoFrameCallback!(f);
    };
    v.requestVideoFrameCallback(f);
  };

  /* --- yukleme: seri kuyruk, mesafeye gore --- */
  let i = 0;
  let etkin: Sahne | null = null;
  let inen: Sahne | null = null;
  let dokunuldu = false;

  const kareSn = (k: number) => (k + 0.5) / fps;
  /* scrub konumunun o klipteki kare numarasi — "gercek konum" tek yerde tanimli */
  const kareNo = (s: Sahne, T: number) => Math.min(s.kare - 1, Math.max(0, Math.floor((T - s.bas) * fps)));
  let sonT2 = 0;                        /* son hesaplanan film saniyesi */
  const sar = (v: HTMLVideoElement, t: number) => new Promise<void>((res) => {
    if (Math.abs(v.currentTime - t) < 0.5 / fps) return res();
    v.addEventListener('seeked', () => res(), { once: true });
    v.currentTime = t;
  });

  /* --- acilis kopyasi: kucuk, once iner, ilk kareyi erken boyar --- */
  async function acilisYukle(s: Sahne) {
    if (!s.aVideo || !s.aUrl || s.aDurum !== 'yok') return;
    s.aDurum = 'iniyor'; inen = s;          /* tek indirme kuyruguna gir */
    try {
      const r = await fetch(s.aUrl);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const b = await r.blob();
      s.aBlob = URL.createObjectURL(b);
      const v = s.aVideo;
      v.poster = s.poster;
      const av = v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: (now: number) => void) => void };
      if (av.requestVideoFrameCallback) av.requestVideoFrameCallback((now) => {
        if (IZ.acilisMs === null) IZ.acilisMs = Math.round(now - yeni);
        if (IZ.ilkKareMs === null && s === S[0]) IZ.ilkKareMs = IZ.acilisMs;   /* BOYANAN kare, loadeddata degil */
      });
      await new Promise<void>((res, rej) => {
        const z = setTimeout(() => rej(new Error('acilis zaman asimi')), 20000);
        const bit = (f: () => void) => { clearTimeout(z); f(); };
        v.addEventListener('loadeddata', () => bit(res), { once: true });
        v.addEventListener('error', () => bit(() => rej(new Error('acilis error'))), { once: true });
        v.src = s.aBlob!;
        v.load();
      });
      s.aDurum = 'hazir';
    } catch (e) {
      s.aDurum = 'hata';
      acilisBirak(s);
      console.warn('[film] acilis inmedi', e);
    }
    inen = null;
    sira();
    tik();
  }
  const acilisBirak = (s: Sahne) => {
    if (s.aBlob) { s.aVideo!.removeAttribute('src'); s.aVideo!.load(); URL.revokeObjectURL(s.aBlob); s.aBlob = null; }
  };
  /* tam kopya AYNI kareye oturunca takas — tek sinif degisimi, gecis gorunmez */
  const acilisTakas = (s: Sahne) => {
    if (s.takas || !s.aVideo || s.durum !== 'hazir') return;
    s.takas = true;
    s.el.classList.add('fl-acilis-bitti');
    if (IZ.acilisTakasMs === null) IZ.acilisTakasMs = Math.round(performance.now() - yeni);
    acilisBirak(s);
  };

  async function yukle(s: Sahne) {
    s.durum = 'iniyor'; inen = s;
    const t0 = performance.now();
    try {
      const r = await fetch(s.url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const b = await r.blob();
      s.bayt = b.size;
      s.blob = URL.createObjectURL(b);
      const v = s.video;
      v.poster = s.poster;            /* posterden once src yok: siyah kutu yok */
      izle(s);
      await new Promise<void>((res, rej) => {
        /* zaman asimi: kaynak bir sekilde altimizdan cekilirse (pencere,
           sokum, tarayici) bu promise sonsuza kadar beklemesin — `inen`
           kilitlenirse motor bir daha hicbir klip indiremez. */
        const zaman = setTimeout(() => rej(new Error('loadeddata zaman asimi')), 30000);
        const bit = (f: () => void) => { clearTimeout(zaman); f(); };
        v.addEventListener('loadeddata', () => bit(res), { once: true });
        v.addEventListener('error', () => bit(() => rej(new Error('video error ' + (v.error && v.error.code)))), { once: true });
        v.src = s.blob!;
        v.load();
      });
      if (dokunuldu) await v.play().then(() => v.pause()).catch(() => {});
      /* ON-SARMA: klip ETKIN SAHNE ise sinir karesi YANLIS hedeftir — scrub
         coktan iceride olabilir; dogrudan gercek konuma sarilir. Degilse
         girilecegi taraftaki sinir karesi (el degisimi seek beklemesin). */
      await sar(v, kareSn(S.indexOf(s) === i ? kareNo(s, sonT2) : (S.indexOf(s) < i ? s.kare - 1 : 0)));
      s.durum = 'hazir';
      s.inmeMs = Math.round(performance.now() - t0);
      /* etkin indirme hizi -> yavas hatta pencere genisler (kucuk kliplerde gurultulu; 200 KB alti sayilmaz) */
      if (s.bayt > 200000 && s.inmeMs > 0) {
        IZ.mbit = +((s.bayt * 8) / (s.inmeMs / 1000) / 1e6).toFixed(2);
        const yavas = IZ.mbit < YAVAS_MBIT;
        IZ.onPencere = ON_PENCERE_TABAN + (yavas ? 1 : 0);
        IZ.pencere = PENCERE + (yavas ? 1 : 0);
      }
      /* inerken pencere kaymis olabilir: kendi kontrolunu simdi yapar
         (budaP inen klibe dokunmuyor, dokunursa kilitleniyor) */
      if (Math.abs(S.indexOf(s) - i) > IZ.pencere) birak(s);
    } catch (e) {
      s.durum = 'hata';
      console.warn('[film] sahne ' + s.n + ' inmedi', e);
    }
    inen = null;
    if (s === S[0]) IZ.hazir = true;
    sira();
    tik();
  }

  /* --- kayan pencere: disari cikan blob revoke ---
     INIYOR olani ASLA birakma: `yukle()` icinde `loadeddata` bekleniyor;
     src kaldirilirsa o olay hic gelmez, `error` de gelmeyebilir -> promise
     cozulmez, `inen` dolu kalir ve motor KILITLENIR. Olculdu (27 Agu):
     mobil-4G kumesi savurmada durdu, 12 dk ilerleme yok. Inen klip
     bitisinde kendi pencere kontrolunu yapar (asagida). */
  const birak = (s: Sahne) => {
    if (!s.blob || s.durum === 'iniyor') return;
    s.video.removeAttribute('src');
    s.video.load();                   /* dekoderi de birak, yalniz URL'yi degil */
    URL.revokeObjectURL(s.blob);
    s.blob = null;
    s.durum = 'yok';                  /* geri gelinirse yeniden iner */
    IZ.birakilan++;
  };
  const budaP = () => {
    for (let k = 0; k < S.length; k++) {
      if (Math.abs(k - i) <= IZ.pencere) continue;
      birak(S[k]);
    }
  };

  /* --- on yukleme sirasi: YON ve HIZ duyarli ---
     Yon: son iki karede filmin ilerledigi yon (+1 ileri, -1 geri).
     Hiz: savurmada once komsu SINIRLAR alinir (el degisimi orada olur),
     agir okumada ise derinlemesine tek yon beslenir. */
  const oncelik = (): number[] => {
    const y = IZ.yon >= 0 ? 1 : -1;
    return IZ.hiz > SAVURMA_SN
      ? [i, i + y, i - y, i + 2 * y]             /* savurma: iki yon de sinirda hazir olsun */
      : [i, i + y, i + 2 * y, i - y];            /* okuma: gidilen yone derinlemesine */
  };

  const sira = () => {
    if (inen) return;
    const s0 = S[i];
    if (s0.aVideo && s0.aDurum === 'yok' && s0.durum !== 'hazir') { acilisYukle(s0); return; }
    for (const k of oncelik()) {
      if (Math.abs(k - i) > IZ.onPencere) continue; /* on yukleme penceresi disina indirme yok (yavas hatta +1) */
      const s = S[k];
      if (s && s.durum === 'yok') { yukle(s); return; }
    }
  };

  /* --- DEVRALMA: klip gercek konuma oturmadan gosterilmez ---
     `etkin` = EKRANDA olan sahne; `S[i]` = scrub konumunun sahnesi. Ikisi
     ayrisabilir: aday hazir degilse ya da henuz dogru kareye sarilmadiysa
     onceki klip ekranda kalir (poster degil, son sunulan kare). */
  const devral = (s: Sahne, T: number) => {
    if (s === etkin || s.durum !== 'hazir') return;
    const v = s.video;
    if (v.seeking) return;                                   /* kare henuz gelmedi */
    if (Math.abs(v.currentTime - kareSn(kareNo(s, T))) > 1.5 / fps) return;
    IZ.devir++;
    etkinYap(s);
  };

  /* --- etkin sahne ve komsular --- */
  const etkinYap = (s: Sahne) => {
    const eski = etkin;
    etkin = s;
    const dokun = (x: Sahne | undefined) => {
      if (!x) return;
      const komsu = Math.abs(x.n - s.n) === 1;
      x.el.classList.toggle('fl-etkin', x === s);
      x.el.classList.toggle('fl-komsu', komsu);
      if (x === s) x.el.classList.remove('fl-onsar');
    };
    if (eski) { dokun(eski); dokun(S[S.indexOf(eski) - 1]); dokun(S[S.indexOf(eski) + 1]); }
    const j = S.indexOf(s);
    dokun(s); dokun(S[j - 1]); dokun(S[j + 1]);
  };

  /* --- SINIR ON-SARMA: yondeki komsuyu sinir karesine sar ve boya (cift video) --- */
  let onsarli: Sahne | null = null;
  const onSar = (T: number) => {
    const y = IZ.yon >= 0 ? 1 : -1;
    const k = S[i + y];
    const uzak = y > 0 ? (S[i + 1] ? S[i + 1].bas - T : Infinity) : T - S[i].bas;
    const aday = k && k.durum === 'hazir' && uzak <= ON_SAR_S ? k : null;
    if (onsarli && onsarli !== aday) { if (onsarli !== etkin) onsarli.el.classList.remove('fl-onsar'); onsarli = null; }
    if (!aday) return;
    const v = aday.video, hedef = kareSn(y > 0 ? 0 : aday.kare - 1);
    if (!v.seeking && Math.abs(v.currentTime - hedef) > 0.5 / fps) v.currentTime = hedef;   /* sinir karesi */
    if (onsarli !== aday) { aday.el.classList.add('fl-onsar'); onsarli = aday; IZ.onsar++; }
  };

  /* aday sahneyi YERLESIK yapar (kod cozucu ayakta) ama gostermez —
     gosterim yalniz devral() ile, dogru kareye oturunca. */
  const yerlestir = (s: Sahne) => {
    s.el.classList.add('fl-komsu');
    const j = S.indexOf(s);
    for (const x of [S[j - 1], S[j + 1]]) if (x && x !== etkin) x.el.classList.add('fl-komsu');
  };

  /* --- kaydirma dongusu: tek rAF, tek yazim --- */
  let bekleyen = false;
  let sonT: number | null = null;
  let sonKareMs = 0;
  let ilkKareGecti = false;
  let atlaIstek = false;
  let gerideydi = false;
  /* yay durumu: x (konum), v (hiz); onceki fizik durumu (harman icin); birikim */
  let yx = 0, yv = 0, yxOnce = 0, birikim = 0;
  /* durusta akis: son kullanici girdisi ani, kaydirma px birikimi, bizim scrollBy'imizin dogurdugu scroll olayini ayirt etme */
  let sonGirdi = 0, akisPx = 0;
  let hedefOnce = 0, hedefHiz = 0, hedefDurdu = 0;   /* hedef hizi ve kac fizik adimidir durdugu */
  const kare = () => {
    bekleyen = false;
    const simdi = performance.now();
    const dt = sonKareMs ? Math.min(100, simdi - sonKareMs) : 16.7;
    sonKareMs = simdi;

    /* --- DURUSTA AKIS: kullanici sessizse sayfayi kendimiz kaydiririz (tek kaynak scrollY) --- */
    IZ.akiyor = false;
    if (IZ.akis > 0 && ilkKareGecti && simdi - sonGirdi > AKIS_BEKLE_MS && !document.hidden) {
      const sonPx = ust + yol;                                   /* rayin sonu */
      if (scrollY < sonPx - 1) {
        akisPx += IZ.akis * pxSn * (dt / 1000);                  /* film-sn/sn -> px/sn */
        const tam = Math.floor(akisPx);
        if (tam >= 1) { akisPx -= tam; scrollBy(0, Math.min(tam, sonPx - scrollY)); }
        IZ.akiyor = true;
        tik();                                                   /* akis surdukce dongu surer */
      }
    } else akisPx = 0;
    const p = Math.min(1, Math.max(0, (scrollY - ust) / yol));
    const hedefT = Math.min(toplam - 1e-3, p * toplam);
    IZ.hedefT = hedefT;

    /* SONUMLEME: gosterilen konum hedefe ustel yaklasir. Katsayi 60 Hz'e
       gore tanimli; kare suresine gore duzeltilir ki his ekran tazeleme
       hizindan bagimsiz olsun. sonum = 1 -> aninda (kapali). */
    if (!ilkKareGecti || atlaIstek) {            /* acilista atlama yok; atla = hedefe otur */
      yx = yxOnce = hedefT; yv = 0; birikim = 0; hedefOnce = hedefT; hedefHiz = 0;
      IZ.gosterilenT = hedefT; ilkKareGecti = true; atlaIstek = false;
    } else {
      /* --- SABIT ADIMLI YAY: birikimi 4 ms'lik adimlarla tuket --- */
      const k = IZ.sert > 0 ? IZ.sert : 120;
      const c = IZ.sonum > 0 ? IZ.sonum : 2 * Math.sqrt(k);   /* 0 = kritik sonum */
      const w = Math.sqrt(k);
      birikim = Math.min(FIZIK_TAVAN_S, birikim + dt / 1000);
      /* hedef hizi: bu karede hedefin kat ettigi yol / kare suresi */
      const dtS = dt / 1000;
      const hz = dtS > 0 ? (hedefT - hedefOnce) / dtS : 0;
      const hedefHareketli = Math.abs(hedefT - hedefOnce) > 1e-6;
      if (hedefHareketli) { hedefHiz = hz; hedefDurdu = 0; }
      hedefOnce = hedefT;
      while (birikim >= FIZIK_DT) {
        birikim -= FIZIK_DT;
        yxOnce = yx;
        if (!hedefHareketli) {
          hedefDurdu++;
          /* MOMENT DEVRI: hedef yeni durdu (ilk adim) -> hedefin son hizini
             devral, asmayacak sinirla: |v| <= w * |d| (kritik sonumlu yay). */
          if (hedefDurdu === 1 && hedefHiz !== 0) {
            const d = hedefT - yx, yon = Math.sign(d);
            if (yon !== 0 && Math.sign(hedefHiz) === yon) {
              const sinir = w * Math.abs(d);
              const aday = Math.min(Math.abs(hedefHiz), sinir);
              if (aday > Math.abs(yv)) yv = yon * aday;
            }
            hedefHiz = 0;
          }
        }
        const a = -k * (yx - hedefT) - c * yv;
        yv += a * FIZIK_DT;
        if (IZ.tavan > 0 && Math.abs(yv) > IZ.tavan) yv = Math.sign(yv) * IZ.tavan;   /* hiz tavani: ustu yutulur */
        yx += yv * FIZIK_DT;
        /* oturma: yarim kareden yakin ve hiz kucuk -> tam hedef, hiz sifir (tekleme yok) */
        if (Math.abs(yx - hedefT) < 0.5 / fps && Math.abs(yv) < 0.02) { yx = hedefT; yv = 0; }
      }
      /* CIZIM: iki fizik durumu arasinda ara deger (alfa = birikim / dt) */
      const alfa = birikim / FIZIK_DT;
      IZ.gosterilenT = yxOnce + (yx - yxOnce) * alfa;
      IZ.hizT = yv; IZ.hedefHiz = hedefHiz;
    }
    const T = IZ.gosterilenT;
    /* hedefe oturmadiysa dongu kendi kendini surdurur — kaydirma olayi
       bitmis olsa da sonumleme tamamlanir. */
    if (Math.abs(hedefT - T) > 0.5 / fps) tik();
    /* geride kalma olayi: yalniz esik gecislerinde (kare basina olay yok) */
    const geride = Math.abs(hedefT - T) > GERIDE_SN;
    if (geride !== gerideydi) { gerideydi = geride; bolum.dispatchEvent(new CustomEvent('fl-geride', { detail: { geride: geride ? hedefT - T : 0 } })); }
    while (i < S.length - 1 && T >= S[i + 1].bas) i++;
    while (i > 0 && T < S[i].bas) i--;
    const s = S[i];
    /* yon + hiz: film saniyesi cinsinden, kare basina — duzen okumasi yok */
    if (sonT !== null) {
      const d = T - sonT;
      if (d !== 0) IZ.yon = d > 0 ? 1 : -1;
      IZ.hiz = Math.abs(d);
    }
    sonT = T;
    sonT2 = T;
    if (s !== etkin) { yerlestir(s); budaP(); }
    onSar(T);
    sira();
    if (s.durum === 'hazir') {
      const k = kareNo(s, T);
      const hedef = kareSn(k);
      if (Math.abs(s.video.currentTime - hedef) > 0.5 / fps) s.video.currentTime = hedef;
      if (IZ.kayit) IZ.istek.push({ t: performance.now(), n: s.n, kare: k, T, hedef: hedefT });   /* T/hedef: sonumleme olcumu (olc-birakma) motorun kendi karesinden okur */
      devral(s, T);                                  /* yazimdan SONRA: ayni karede otursun */
      if (s.aVideo && !s.takas && s === etkin) acilisTakas(s);
    } else if (s.aVideo && s.aDurum === 'hazir' && !s.takas) {
      /* tam kopya yok, acilis var: acilis kendi araliginda surulur */
      const k = Math.min(Math.round(s.aSn * fps) - 1, Math.max(0, Math.floor((T - s.bas) * fps)));
      const hedef = kareSn(k);
      if (Math.abs(s.aVideo.currentTime - hedef) > 0.5 / fps) s.aVideo.currentTime = hedef;
      if (s !== etkin) etkinYap(s);            /* acilis ekrani devralabilir */
    }
  };
  const tik = () => {
    if (bekleyen) return;
    bekleyen = true;
    requestAnimationFrame(kare);
  };
  const boyut = () => { olc(); tik(); };
  const kilitAc = () => {
    dokunuldu = true;
    const v = etkin && etkin.video;
    if (v && v.src) v.play().then(() => v.pause()).catch(() => {});
  };

  /* kullanici girdisi: akisi durdurur (scroll olayi sayilmaz — bizim scrollBy da scroll dogurur) */
  const girdi = () => { sonGirdi = performance.now(); akisPx = 0; tik(); };
  for (const ad of ['wheel', 'touchstart', 'touchmove', 'keydown', 'pointerdown'] as const) addEventListener(ad, girdi, { passive: true });
  olc();
  etkinYap(S[0]);
  kare();
  addEventListener('scroll', tik, { passive: true });
  addEventListener('resize', boyut, { passive: true });
  addEventListener('touchstart', kilitAc, { once: true, passive: true });

  /* --- sokum --- */
  return function sok() {
    removeEventListener('scroll', tik);
    for (const ad of ['wheel', 'touchstart', 'touchmove', 'keydown', 'pointerdown'] as const) removeEventListener(ad, girdi);
    removeEventListener('resize', boyut);
    removeEventListener('touchstart', kilitAc);
    for (const s of S) {
      if (s.blob) { s.durum = 'hazir'; birak(s); }   /* 'iniyor' kilidini asarak sok */
      s.durum = 'yok';
    }
    delete (window as any).__fl;
    kuruldu = false;
  };
}
