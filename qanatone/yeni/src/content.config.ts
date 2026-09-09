import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';

/* content.json panelin ürünüdür ve TEK kaynaktır: buradaki koleksiyon
   onu okur, kopyalamaz. Faz 0'da şema BİLEREK yok: alan sözleşmesi
   panel+denetim tarafında; zod katılaştırması Faz 1'de alan alan
   yapılır (ilk deneme: dilli alan şeması bir hizmette çakıldı — önce
   alan envanteri, sonra şema). */
const hizmetler = defineCollection({
  loader: file('../content.json', {
    parser: t => JSON.parse(t).services.map((s: any) => ({ id: s.slug, ...s }))
  })
});

/* KADEME 2 (9 Eyl 2026): BUYUYEN koleksiyonlar content.json'dan CIKTI,
   dosya basina bir kayda ayrildi — `icerik/<klasor>/<slug>.json`.
   NEDEN: duvarlar olculdu; taslak localStorage 1.447 yazida, `yayinla`
   POST govdesi 1.651 yazida cakiliyordu, ikisi de "butunu her seferinde
   butun olarak tasimak"tan. Panel artik DIZIN yukluyor (239 B/yazi) ve
   yayin yalniz DEGISEN dosyayi commit ediyor.
   `glob` dosya adini `id` yapar — dosya adi slug'dir, `params.slug`
   oradan gelir; kayit icindeki `slug` alani da duruyor (panel ve sema
   onu okuyor), ikisi T15'te esitlik olarak olculur.
   BOS KLASOR: `nedir` ve `haber` bugun bos; glob 0 kayit doner ve
   `kosullu` bayragi bolumu dort yuzeyde birden kapali tutar. Klasorde
   `.gitkeep` var cunku git bos dizin tasimaz — temiz klonda base
   bulunamazsa derleme duser.
   HIZMETLER ve PROJELER AYRILMADI: sayilari sabit (9 ve 7), olcekle
   buyumuyorlar; panelde de butun olarak duzenleniyorlar. */
const yazilar = defineCollection({
  loader: glob({ pattern: '*.json', base: '../icerik/yazilar' })
});

const projeler = defineCollection({
  loader: file('../content.json', {
    parser: t => JSON.parse(t).projects.map((p: any) => ({ id: p.slug, ...p }))
  })
});

/* NEDIR ve HABERLER (Enes, 9 Eyl 2026).
   - `nedir`  : "konu nedir, nasil calisir" yazilari. EVERGREEN — tarihli
                akisa ve RSS'e KARISMAZ; bulten haber, bu tanim.
   - `haberler`: genel haber bolumu, kronolojik.
   Ikisi de `posts` ile AYNI alan sozlesmesini tasir (slug/date/read/tag/
   title/lede/body/sources/image): panel editoru, dizin bileseni, govde
   ve sema tek koddan calissin diye. Ayri sekil secmek uc kopya bilesen
   demekti — sonradan fark edilen sapmanin en sik kaynagi.
   BOS BASLARLAR: icerik panelden gelecek. Bos koleksiyon bolumu
   YAYINA CIKARMAZ — `sayfalar.json`daki `kosullu` bayragi sayfayi,
   menuyu ve sitemap kaydini icerik gelene kadar bekletir; bos bir
   /nedir sayfasini Google'a sunmak ince icerik olurdu. */
const nedir = defineCollection({
  loader: glob({ pattern: '*.json', base: '../icerik/nedir' })
});

const haberler = defineCollection({
  loader: glob({ pattern: '*.json', base: '../icerik/haber' })
});

export const collections = { hizmetler, yazilar, projeler, nedir, haberler };
