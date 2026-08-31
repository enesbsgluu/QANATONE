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
/* Ayar sabitleri: derleme (bu dosya) ile tarayici (motor.ts) TEK kaynaktan okur. */
import { AYAR, SERTLIK_ADAY } from './ayar.mjs';

/* AYAR SABITLERI TEK KAYNAKTAN (30 Agu 2026, sertlestirme turu):
   bes sayinin kendisi de gerekceleri de artik `ayar.mjs`ta. Asagidaki
   disari acilan adlar Film.astro'nun ithal ettigi adlardir; deger
   YAZMAZLAR, TASIRLAR. motor.ts ayni dosyadan kendi YEDEK degerlerini
   okur — boylece DOM'a yazilan sayi ile motorun yedegi ayrisamaz. */
export const PX_SN = AYAR.pxsn;
export const SERTLIK = AYAR.sert;
export const SONUM = AYAR.sonum;
export const TAVAN = AYAR.tavan;
export const AKIS = AYAR.akis;
export const MOMENT = AYAR.moment;
export const HIZALA = AYAR.hizala;
export { SERTLIK_ADAY };

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
