/* Tek kaynak: kökteki content.json (panelin ürünü). Bu modül onu OKUR,
   kopyalamaz; koleksiyonlara girmeyen tekil alanlar (legal, ayarlar)
   buradan gelir. Derleme anında koşar — istemciye JS taşımaz (V1). */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/* import.meta.url derleme paketinde taşınıyor (SSR bundle) — yol
   çalışma dizininden çözülür: astro build `yeni/` içinde koşar. */
const adaylar = [resolve(process.cwd(), '../content.json'),
                 resolve(process.cwd(), 'content.json')];
const yol = adaylar.find(existsSync);
if (!yol) throw new Error('content.json bulunamadı: ' + adaylar.join(' | '));
export const icerik = JSON.parse(readFileSync(yol, 'utf8'));

export type Dil = 'tr' | 'en';
export const T = (v: unknown, dil: Dil = 'tr'): string =>
  typeof v === 'string' ? v : (v && ((v as any)[dil] || (v as any).tr)) || '';

/* SITENIN TEK KONAK KAYNAGI. Canonical, og:url, sitemap, JSON-LD ve
   Link basliklari HEPSI buradan turer — baska hicbir yerde konak elle
   yazilmaz (6 Eyl 2026'da 14 kopya vardi, hepsi buraya baglandi).
   BIRINCIL: www (Enes karari 6 Eyl). Harici DNS apex icin CNAME
   tasiyamadigindan apex tek yuk dengeleyici adresine sabitlenir ve CDN
   yonlendirmesinden yararlanamaz; DNS Natro'da kaldi cunku e-posta
   kayitlari orada. Bedeli: birincil alan adi bir alt alan adi.
   Apex 301 ile buraya duser (Netlify tarafinda). */
export const KOK = 'https://www.qanatone.com';

/* IC ADRESLERIN TEK NORMALIZE EDICISI (5 Eyl 2026).
   SEBEP (olculdu, uydurma degil): Netlify egik cizgili hali KANONIK sayar
   ve cizgisizi 301 ile oraya yollar. Site cizgisiz yaziyordu; sonuclari:
     · 64 canli adresin 63'u cizgisizken IKI HOP (301 + 200) — her sayfa
       gecisi fazladan bir tur atiyordu
     · HER SAYFA KENDINI PREFETCH EDIYORDU: /hizmetler/ sayfasi
       <link rel=prefetch href="/hizmetler"> basiyordu; Astro'nun "acik
       sayfayi atla" korumasi href (/hizmetler) ile location.pathname
       (/hizmetler/) tutmadigi icin devre disi kaliyordu. Yani tarayicinin
       prefetch onbelleginde, zaten acik olan sayfaya giden bir YONLENDIRME
       kaydi birikiyordu.
     · canonical de cizgisizi gosteriyordu: kanonik adres 301 veriyordu.

   NEDEN FONKSIYON, NEDEN 96 YERE ELLE '/' EKLENMEDI: adreslerin cogu
   `${B}${on}${r}` gibi DEGISKEN KUYRUKLU; hangi dalin bos oldugunu tek tek
   analiz etmek gerekirdi ve bos dal `//` uretirdi. Tek kapi hepsini cozer.

   SOZLESME: bos girdi -> '/', kanca/sorgu tasiyan adres DOKUNULMAZ (kanca
   sayfanin kendi icinde), uzantili son parca DOKUNULMAZ (varlik), mutlak
   adreste konak ayrilir (`https://x.com` -> `https://x.com/`, konagin
   `.com`u uzanti sanilmaz). Bekci: denetim H29. */
export const sl = (u: string): string => {
  if (!u) return '/';
  if (/[#?]/.test(u)) return u;
  const m = u.match(/^([a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/]+)(.*)$/);
  const kok = m ? m[1] : '';
  const yol = m ? m[2] : u;
  if (!yol) return kok + '/';
  if (yol.endsWith('/')) return kok + yol;
  if (/\.[a-zA-Z0-9]{2,6}$/.test(yol)) return kok + yol;
  return kok + yol + '/';
};

/* PAYLASIM KARTLARI · TEK KAYNAK (4 Eyl 2026).
   Iki uretec birden basiyor: `Temel.astro` og:image/twitter:image
   etiketlerini, `sema.mjs` yazi semasinin `image` alanini. Adlar iki
   yerde YAZILSAYDI ayrisirlardi — ve bu kez varsayim degil, YASANMIS:
   eski geri dusus `/og.png` ikisinde de elle yaziliydi, kesmede dosya
   ciktidan kalkinca meta etiketi de sema da 404 veren bir adresi
   ilan etmeye basladi ve hicbir kural gormedi.
   Olculdu: her iki dosya da 1200x630 JPEG (G3 ciktida ACIP dogrular). */
export const OG_KART = { tr: '/og-tr.jpg', en: '/og-en.jpg' } as const;

/* S1 sözleşmesi için üretici tarafı: description sözcük sınırında
   kesilir (140 hedef; tırnak gibi HTML kaçışları çıktıda şişirir —
   150 bir sayfada 168'e taştı, ölçüldü — 140 payıyla 165 tavanına sığar),
   title son ekini ancak sığıyorsa taşır. */
export const kes = (v: unknown, dil: Dil = 'tr', n = 140): string => {
  const m = T(v, dil);
  if (m.length <= n) return m;
  const k = m.slice(0, n);
  return k.slice(0, Math.max(k.lastIndexOf(' '), 60)).trimEnd() + '…';
};
export const basAd = (v: unknown, dil: Dil = 'tr'): string => {
  const m = T(v, dil);
  return m.length <= 60 ? `${m} — QANATONE` : m;
};

/* Panelden gelen tek satirlik HTML parcalari icin BEYAZ LISTE suzgeci.
   Once HER SEY kacar, sonra yalniz izin verilen etiketler geri acilir —
   kara liste degil. Anayasa madde 6: "set:html YALNIZ content.json yazi
   govdesi icin ve TEK yardimci fonksiyondan gecerek".
   Hero (em/b), S-K katman (em/b + span.thin), S-A akis (+ br) ve
   S-KU kurucu (+ p — biyografi panelden paragrafli geliyor) ayni
   fonksiyonu farkli izin kumesiyle cagirir; kume genisletmek bilincli
   bir karardir, kaza sonucu olamaz. `br` tek basina kapali etiket
   almadigi icin ayri ele alinir. */
export type Izin = 'em' | 'b' | 'br' | 'p' | 'span.thin';
export const suz = (m: unknown, izin: Izin[] = ['em', 'b']): string => {
  let t = String(m ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const i of izin) {
    if (i === 'br') {
      t = t.replace(/&lt;br\s*\/?&gt;/g, '<br>');
    } else if (i === 'span.thin') {
      t = t.replace(/&lt;span class="thin"&gt;/g, '<span class="thin">')
           .replace(/&lt;\/span&gt;/g, '</span>');
    } else {
      t = t.replace(new RegExp(`&lt;(\/?${i})&gt;`, 'g'), '<$1>');
    }
  }
  return t;
};
