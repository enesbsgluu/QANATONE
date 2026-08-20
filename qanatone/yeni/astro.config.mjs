import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

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
  build: { inlineStylesheets: 'always' },

  trailingSlash: 'ignore',

  /* Faz 1 / J1: ic baglantilara prefetch — Astro'nun kucuk betigi,
     sayfa basina JS tavaninin icinde; olcusu yeni/denetim.js'te. */
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },

  integrations: [react()]
});