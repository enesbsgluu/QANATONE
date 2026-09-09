import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';

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

const yazilar = defineCollection({
  loader: file('../content.json', {
    parser: t => JSON.parse(t).posts.map((p: any) => ({ id: p.slug, ...p }))
  })
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
  loader: file('../content.json', {
    parser: t => (JSON.parse(t).explainers || []).map((x: any) => ({ id: x.slug, ...x }))
  })
});

const haberler = defineCollection({
  loader: file('../content.json', {
    parser: t => (JSON.parse(t).news || []).map((x: any) => ({ id: x.slug, ...x }))
  })
});

export const collections = { hizmetler, yazilar, projeler, nedir, haberler };
