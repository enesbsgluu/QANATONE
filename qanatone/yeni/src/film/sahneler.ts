/* FILM · SAHNE DIZISI — HIGGSFIELD-SCRUB-MOTORU.md §1'deki
   `scroll-scrub-scenes.ts`in karsiligi: doldurulan TEK dosya.
   MODUL SABITI (sert degismez #3): dizi burada `const`, kimligi
   derlemede donar; calisma zamaninda hicbir sey onu degistirmez.

   SAYILAR ELLE YAZILMIYOR: sure/kare/fps `kanon.json`dan gelir, o da
   ffprobe'dan (yeni/film/probe.cjs). Dosya adlari uretim hattinin
   (yeni/film/uret.cjs) bastigi adlarla birebir; poster ENCODE EDILMIS
   klibin ilk karesidir (sert degismez #1), web bicimi poster-web.cjs.

   Bu dosya YALNIZ derleme aninda okunur (Film.astro on-madde); tarayiciya
   inen sey DOM'daki data-* alanlaridir — kanon.json'un prozu pakete girmez.

   METIN YOK (bu tur iskelet): `metin` alani bilerek null. Klip <-> durak
   <-> metin eslemesi DEVIR §6 acik kalemi, Enes'le yerlesecek. */
import KANON from './kanon.json';
/* Boyutlar HAM kanondan DEGIL, uretim kunyesinden okunur: sahne1 kadraji
   duzeltildi (1144x804 -> 1284x716) ve mobil hat 540 satira indi; ikisi de
   kanon.json'daki ham olcuden farkli. Kunye uret.cjs'in ffprobe ile
   ciktidan okudugu gercek boyutu tasir. */
import URETIM from '../../film/uretim.json';

/* KAYDIRMA UZUNLUGU (px / film saniyesi) — DEVIR §6 ACIK KALEM.
   Kaynak: eski kod (montaj-duzenek/zincir.html `PX_PER_SN = 300`);
   yaklasikla kurulmadi. OLCULDU (27 Agu, 256,638 sn film):
     PX_SN=300 -> ray 76.991 px · masaustu 900 px ekranda 85,5 ekran boyu
     · saniyede 0,333 ekran · 1 ekran = 3,00 sn film
     · tekerlek centigi (100 px) = 0,33 sn = 8 kare
   Aday degerler: 200 (57 ekran, 1 ekran=4,5 sn) · 300 (suanki)
     · 450 (128 ekran, 1 ekran=2,0 sn).
   DENEME: ?pxsn=450 — motor URL degerini alir ve ray boyunu da yeniden
   yazar. Deger oturunca buraya yazilir.
   28 AGU (Enes): varsayilan 450. Ray 115.487 px; masaustu 900 px ekranda
   128 ekran boyu, 1 ekran = 2,0 sn film, tekerlek centigi (100 px) =
   0,22 sn = 5,3 kare. */
export const PX_SN = 450;

/* YAY + SONUM (28 Agu 2026, Enes) — kaydirmanin hedef konumu ile filmin
   gosterilen konumu arasinda kritik sonumlu yay (motor.ts basindaki not).
   SERTLIK k (1/s^2): oturma suresi ~5,8/sqrt(k). Uc aday:
     60  yumusak  ~0,75 s   (agir okuma, sinema hissi)
     120 orta     ~0,53 s   (VARSAYILAN)
     250 siki     ~0,37 s   (ele yapisik, hizli gezinme)
   SONUM c (1/s): 0 = kritik (2*sqrt(k)) otomatik; elle vermek yalniz deneme
   icin (c < 2*sqrt(k) salinir, c > asiri sonumlu surunur).
   DENEME: ?sert=250 ?sonum=0 (URL) · konsolda __fl.sert = 60. */
export const SERTLIK = 120;
export const SONUM = 0;
export const SERTLIK_ADAY = [60, 120, 250] as const;

/* DURUSTA AKIS (28 Agu 2026, Enes) — kaydirma birakilinca film bu tempoyla
   ilerlemeye devam eder (film-sn / gercek-sn). 0 = kapali. DENEME: ?akis=0.12 */
export const AKIS = 0.08;

/* HIZ TAVANI (28 Agu 2026, Enes) — gosterilen konum saniyede en cok bu
   kadar film-sn ilerler; daha hizli kaydirma yutulur, sayfadaki "atla"
   dugmesi (`__fl.atla()`) hedefe oturtur. 1x ve 1,5x olculdu, temiz
   (FILM-ISKELET-TURU 5. tur). 0 = tavan yok. DENEME: ?tavan=2 */
export const TAVAN = 1.5;

export const FPS: number = KANON.fps as number;
export const TOPLAM_SN: number = KANON.toplam_sn;

export interface Sahne {
  n: number;
  sure: number;        /* sn, ffprobe */
  kare: number;        /* toplam kare, ffprobe */
  bas: number;         /* zincirde baslangic saniyesi (onceki surelerin toplami) */
  gen: number; yuk: number;          /* masaustu klibin GERCEK cikti boyutu */
  mgen: number; myuk: number;        /* mobil klibin GERCEK cikti boyutu */
  clip: string; poster: string;
  mobileClip: string; mobilePoster: string;   /* sert degismez #2: mobileClip varsa mobilePoster zorunlu */
  /* ACILIS KOPYASI (yalniz sahne1): tam klibin ilk saniyeleri, BIREBIR ayni
     encode zinciriyle. Motor once bunu indirir -> ilk kare erken boyanir;
     tam kopya arkada inip ayni kareye sarilinca takas edilir. */
  acilis: { sn: number; clip: string; mobileClip: string; clip265: string; mobileClip265: string } | null;
  /* H.265 hatti (ana); tarayici canPlayType ile secer, yoksa H.264 (yedek) */
  clip265: string; mobileClip265: string;
  metin: null;
}

let bas = 0;
const KUNYE = new Map((URETIM.klip as any[]).map((k) => [k.n, k]));
export const SAHNELER: readonly Sahne[] = KANON.klip.map((k) => {
  const u = KUNYE.get(k.n);
  if (!u || !u.masaustu?.gen || !u.mobil?.gen || !u.h265?.masaustu) throw new Error(`film: sahne${k.n} uretim kunyesinde eksik (h264/h265) — once \`node yeni/film/uret.cjs\``);
  const s: Sahne = {
    n: k.n, sure: k.sure, kare: k.kare, bas: +bas.toFixed(3),
    gen: u.masaustu.gen, yuk: u.masaustu.yuk, mgen: u.mobil.gen, myuk: u.mobil.yuk,
    clip: `varlik/film/sahne${k.n}.mp4`,
    poster: `varlik/film/sahne${k.n}-poster.webp`,
    mobileClip: `varlik/film/sahne${k.n}-mobile.mp4`,
    mobilePoster: `varlik/film/sahne${k.n}-mobile-poster.webp`,
    clip265: `varlik/film/${u.h265.masaustu.dosya}`,
    mobileClip265: `varlik/film/${u.h265.mobil.dosya}`,
    acilis: u.acilis ? { sn: u.acilis.sn,
      clip: `varlik/film/${u.acilis.h264.masaustu.dosya}`, mobileClip: `varlik/film/${u.acilis.h264.mobil.dosya}`,
      clip265: `varlik/film/${u.acilis.h265.masaustu.dosya}`, mobileClip265: `varlik/film/${u.acilis.h265.mobil.dosya}` } : null,
    metin: null,
  };
  bas += k.sure;
  return s;
});
