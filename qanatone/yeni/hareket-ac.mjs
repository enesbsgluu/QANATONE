/* HAREKET ACMA DUGMESI · CSS YARISI (11 Eyl 2026).
   Enes'in arkadasi: Windows'ta animasyonlar kapali oldugu icin Chrome
   `prefers-reduced-motion: reduce` bildiriyordu ve site HER hareketi
   (prolog dahil) kapatiyordu — olculdu: ana sayfa, /hizmetler, /seo 0/0
   animasyon. Karar (Enes): tercihe VARSAYILAN olarak uyulur, ama bu
   ziyaretcilere "Animasyonlari ac" dugmesi cikar (Temel.astro).

   BU DONUSUM: derlemede, hareket azaltma medya blogundaki HER secici
   `hareket-ac` bayragina baglanir; bayrak yoksa durdurucu eskisi gibi
   calisir, bayrak varsa hic eslesmez ve site tam haliyle akar.
     .a .x::before      -> .a .x:where(:not(.hareket-ac *))::before
     html               -> html:where(:not(.hareket-ac))
   Anlami: "ozne, bayrakli <html>'in ICINDE DEGILSE". Bayrak <html>'de
   durdugu icin bayrak acikken hicbir oge bu kosulu saglamaz.
   BAYRAK OZNEYE EKLENIR, BASA DEGIL (11 Eyl 2026 — OLCULDU, ilk surum
   YANLISTI): ilk surum `:where(html:not(.hareket-ac)) .x` onekini
   yaziyordu. Astro bilesen stillerini PostCSS'ten SONRA kapsama aliyor
   (preprocessStyle once, kapsama sonra) ve onekin kendisine de
   `[data-astro-cid-..]` ekledi: `[data-astro-cid-x]:where(html:not(..))`
   — <html> o ozniteligi tasimadigi icin BUTUN bilesen durdurucular
   eslesmez oldu, hareket azaltmada /hizmetler kartlari yine kaydi
   (hz-gir, 9 kart; canli 0/0 iken yerel 0/9 finished). Sonek tek
   bilesige yazilir; Astro `:where()` ICINE dokunmuyor (ciktida olculdu),
   yani duz CSS'te, kapsamli stilde ve is:global'de ayni calisir.
   `:where()` OZGULLUGE SIFIR KATAR: H11 "durdurucu, hareketi veren
   seciciyle ayni ozgullukte" sozlesmesi bozulmaz (19 Agu S-P dersi).
   61 kaynak kuralini elle degistirmek yerine burada: yeni yazilan her
   azaltma kurali kendiliginden kapsanir, unutulamaz. Bekci HA1.

   KARISIK LISTE BOLUNUR: `@media (max-width:900px),(prefers-reduced-motion:
   reduce)` gibi bir blok bayragla butunuyle baglansaydi, dugmeye basan
   TELEFON kullanicisi masaustu suslerini gorurdu. Blok ikiye ayrilir:
   azaltmasiz parcalar oldugu gibi, azaltma parcasi korunmus kopyada.
   `no-preference` bloklari (hareketi yalniz tercih yokken ACAN) bu donusumun
   kapsaminda DEGIL — biri yazilirsa derleme burada durur (sessiz eksik
   yerine gurultulu kirmizi). */
export const BAYRAK = 'hareket-ac';
const AZALT = /\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i;
const TERCIHSIZ = /prefers-reduced-motion\s*:\s*no-preference/i;

/* ust duzey virgulle bol (parantez icindeki virgule dokunma) */
const bol = (p) => {
  const cikti = []; let derin = 0, parca = '';
  for (const c of p) {
    if (c === '(') derin++;
    if (c === ')') derin--;
    if (c === ',' && derin === 0) { cikti.push(parca.trim()); parca = ''; } else parca += c;
  }
  if (parca.trim()) cikti.push(parca.trim());
  return cikti;
};

const SONEK = `:where(:not(.${BAYRAK} *))`;
/* sozde-oge (::before vb.) sonekten SONRA gelmeli: `.x:where(..)::before` */
const SOZDE_OGE = /::?(before|after|first-line|first-letter|marker|placeholder|selection|backdrop|file-selector-button|-webkit-[\w-]+|-moz-[\w-]+)(?![\w-])/i;
const koru = (sec) => {
  const s = sec.trim();
  /* ozne = ust duzeydeki SON birlestiriciden (bosluk > + ~) sonraki bilesik;
     parantez, koseli ayrac ve tirnak icindekiler sayilmaz */
  let derin = 0, koseli = 0, tirnak = null, bas = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (tirnak) { if (c === tirnak && s[i - 1] !== '\\') tirnak = null; continue; }
    if (c === '"' || c === "'") tirnak = c;
    else if (c === '(') derin++;
    else if (c === ')') derin--;
    else if (c === '[') koseli++;
    else if (c === ']') koseli--;
    else if (!derin && !koseli && /[\s>+~]/.test(c)) bas = i + 1;
  }
  const on = s.slice(0, bas), ozne = s.slice(bas);
  /* ozne kok ogenin kendisiyse "icinde degil" her zaman dogru olurdu:
     kokte bayragin YOKLUGU sorulur */
  if (/^(html|:root)(?![\w-])/i.test(ozne)) return on + ozne.replace(/^(html|:root)/i, `$1:where(:not(.${BAYRAK}))`);
  const m = SOZDE_OGE.exec(ozne);
  const k = m ? m.index : ozne.length;
  return on + ozne.slice(0, k) + SONEK + ozne.slice(k);
};

export default function hareketAc() {
  return {
    postcssPlugin: 'qanatone-hareket-ac',
    AtRule: {
      media(at) {
        if (at.__hareketAc) return;
        if (TERCIHSIZ.test(at.params))
          throw at.error('prefers-reduced-motion: no-preference blogu — hareket-ac bayragi bunu kapsamiyor (yeni/hareket-ac.mjs)');
        if (!AZALT.test(at.params)) return;
        const parcalar = bol(at.params);
        const azalt = parcalar.filter((q) => AZALT.test(q));
        const diger = parcalar.filter((q) => !AZALT.test(q));
        let hedef = at;
        if (diger.length) {
          hedef = at.clone({ params: azalt.join(', ') });
          at.params = diger.join(', ');
          at.after(hedef);
        }
        at.__hareketAc = true; hedef.__hareketAc = true;
        hedef.walkRules((r) => {
          if (r.parent && r.parent.type === 'atrule' && /keyframes$/i.test(r.parent.name)) return;
          if (r.selector.includes(BAYRAK)) return;
          r.selectors = r.selectors.map(koru);
        });
      },
    },
  };
}
hareketAc.postcss = true;
