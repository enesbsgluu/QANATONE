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
  trailingSlash: 'ignore'
});
