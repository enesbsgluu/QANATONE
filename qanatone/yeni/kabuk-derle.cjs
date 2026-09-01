#!/usr/bin/env node
/* KABUK MODULU DERLEME (4 Eyl 2026) — kabuk/efekt.js -> public/varlik/kabuk.js
   Astro'nun sayfa betigi zincirine SOKULMADI: her sayfaya hoisted modul +
   __vitePreload yardimcisi (~0,8 KB) binerdi ve J1'e girerdi. Film
   motoruyla ayni desen: satir ici tetik `import('/yeni/varlik/kabuk.js')`,
   dosya statik varlik (1 gun onbellek, _headers /yeni/varlik/*).
   Kosum: node yeni/kabuk-derle.cjs  (astro build'den ONCE) */
const path = require('path');
const fs = require('fs');
const { buildSync } = require(path.join(__dirname, 'node_modules', 'esbuild'));
const giris = path.join(__dirname, 'kabuk', 'efekt.js');
const cikti = path.join(__dirname, 'public', 'varlik', 'kabuk.js');
fs.mkdirSync(path.dirname(cikti), { recursive: true });
buildSync({ entryPoints: [giris], bundle: true, minify: true, format: 'esm', target: ['es2019'], outfile: cikti, legalComments: 'none' });
console.log(`kabuk.js ${fs.statSync(cikti).size} B (kaynak ${fs.statSync(giris).size} B)`);
