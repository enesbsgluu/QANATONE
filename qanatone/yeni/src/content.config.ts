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

export const collections = { hizmetler, yazilar, projeler };
