import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

/* KUNYE TARAYICIYA GITMIYOR (24 Agu). Prolog JSON'lari hem VERI hem
   KUNYE tasiyor: her blogun `_` alani o sayinin NEDEN o oldugunu
   yaziyor ve bu bilerek boyle - sayi ile gerekcesi ayni dosyada durur,
   ikisi birlikte degisir. Ama `_`yi calisma zamaninda okuyan HICBIR
   sey yok; parcaya girdigi yer yalnizca ziyaretcinin indirdigi bayt.
   OLCULDU: sahne.json minified 18.811 B, `_` soyulunca 5.152 B - yani
   %73'u proz. amblem.json'da 22.522 -> 19.891 B. Kunyeye her yeni blok
   eklendiginde halka parcasi buyuyordu ve 24 KB tavanini asti.
   Cozum kunyeyi kisaltmak DEGIL - belgeyi bayt ugruna budamak bu
   projede yanlis takas. Kunye kaynakta tam kaliyor, derlemede
   soyuluyor. Denetim iki tarafi da tutuyor: kaynakta `_` bulunmali,
   cikti parcasinda BULUNMAMALI. */
const kunyeyiSoy = () => ({
  name: 'qanatone-kunye-soy',
  enforce: 'pre',
  transform(kod, kimlik) {
    /* 2 Eyl 2026 (R23): sokum sonrasi tek aday src/prolog/amblem.json
       (nav logosu kaynagi, R19). Bugun onu ithal eden yok; desen, biri
       ithal ederse kunye prozunun pakete sizmamasi icin duruyor. */
    if (!/[\\/]src[\\/]prolog[\\/][^\\/]+\.json$/.test(kimlik)) return null;
    const soy = (o) => Array.isArray(o)
      ? o.map(soy)
      : (o && typeof o === 'object'
          ? Object.fromEntries(Object.entries(o)
              .filter(([k]) => !k.startsWith('_'))   /* 24 Agu: `_` ile BASLAYAN her anahtar kunyedir */
              .map(([k, v]) => [k, soy(v)]))
          : o);
    return { code: JSON.stringify(soy(JSON.parse(kod))), map: null };
  },
});

/* QANATONE yeni kabuk — Faz 0 (Astro kararı belgesi, 18 Ağu 2026).
   Mevcut site aynen yaşar; bu proje dist/yeni altına basar ve /yeni/*
   adresinden yayına çıkar. Kök adrese alma Faz 4'ün işi.
   Veri kaynağı TEK: kökteki content.json (panelin ürünü) Content
   Collections'a beslenir — iki üreteç doğurmama ilkesi burada da geçerli. */
export default defineConfig({
  site: 'https://qanatone.netlify.app',
  base: '/yeni',
  output: 'static',
  outDir: '../dist/yeni',

  /* CSS SATIR ICINE (19 Agu, hero turunda olculdu): Astro'nun 'auto'
     esigi ana sayfanin stilini (16 KB ham) disarida birakiyordu ve
     Lighthouse engelleyici zinciri FCP/LCP'ye 1.200 ms yaziyordu —
     6 KB'lik iki dosya icin iki tur. 'always' ile sifir engelleyici
     istek kaliyor; bedeli sayfa basina ~2 KB gzip fazladan HTML ve
     CSS'in sayfalar arasi onbelleklenememesi. Olcum ikisini de gordu,
     tur maliyeti agir basti.

     19 AGU · KARAR YENIDEN OLCULDU VE KORUNDU. Sebep: ana sayfanin gzip
     HTML'i 26,9 KB'a cikti ve TCP ilk tikanma penceresini asmanin bedeli
     olculmustu (bir tam RTT, S-A turu). Uc varyant ayni agactan derlenip
     ayri portlardan, kosum duzeyinde donusumlu olculdu:
       always : HTML 126,8 KB ham / 26,9 KB gzip · dis CSS yok
       auto   : HTML  73,7 KB ham / 15,9 KB gzip · dis CSS 53,2 KB (11,4 gzip)
       never  : auto ile BIREBIR AYNI cikti (CSS her halukarda esigi asiyor)
     Lighthouse mobil, 6 tur ortancasi:
       always -> LCP 1.924 ms · never -> LCP 2.042 ms  (+118 ms)
     HTML'i esigin altina indirmek bir RTT KAZANDIRIYOR ama engelleyici
     CSS istegi bir RTT + 11,4 KB transfer GERI ALIYOR; net sonuc satir
     icinin lehine.
     Sayfalar arasi taraf da olculdu (soguk ana sayfa + uc ic sayfa,
     4x CPU, 150 ms RTT): satir icinde ic sayfalar 12/12/10 KB iniyor,
     dis CSS'te 14/6/4 KB — sayfa basina ~6 KB kazanc. Gercek ama kucuk;
     LCP'nin olculdugu GIRIS sayfasi satir icini istiyor.
     SONUC: bayt tavaninin kaldiraci "CSS'i disari almak" DEGIL, "daha az
     CSS yazmak". H18 tavani (28 KB) bu yuzden duruyor. */
  /* GECE ZINCIRI TUR 3 (2 Eyl 2026) — ORTAK VARLIK AYRISTIRMA: 'always' ->
     'auto'. Olculdu (once): satir ici oran ort %65, ikinci sayfa agdan
     43-90 KB (yerel sunucu _headers'i uyguluyor). 'auto': 4 KB altindaki
     sayfaya ozgu stil satir ici kalir (kritik), ortak/buyuk stil hash'li
     _astro/*.css dosyasina cikar ve immutable onbellekten gelir. Sonuc
     ve LCP kiyasi olc-varlik-once/sonra.json + gece raporu. */
  build: { inlineStylesheets: 'auto' },

  trailingSlash: 'ignore',

  /* Faz 1 / J1: ic baglantilara prefetch — Astro'nun kucuk betigi,
     sayfa basina JS tavaninin icinde; olcusu yeni/denetim.js'te. */
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },

  integrations: [react()],

  /* 2 Eyl 2026 (R23 sokumu): prolog-ada manualChunks ve isci (worker)
     hatti kalkti — ada betigi ve isci paketi kaynaktan sokuldu, kod
     tabaninda worker kalmadi. */
  vite: { plugins: [kunyeyiSoy()] }
});