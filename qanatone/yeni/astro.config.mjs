import { defineConfig } from 'astro/config';

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
     tur maliyeti agir basti. */
  build: { inlineStylesheets: 'always' },
  trailingSlash: 'ignore',
  /* Faz 1 / J1: ic baglantilara prefetch — Astro'nun kucuk betigi,
     sayfa basina JS tavaninin icinde; olcusu yeni/denetim.js'te. */
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' }
});
