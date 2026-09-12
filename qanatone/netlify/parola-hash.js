#!/usr/bin/env node
/* netlify/parola-hash.js — YEREL koşulur, hiçbir dosyaya yazılmaz.
   stdin'den passphrase okur, "salt:hash" (scrypt, hex) basar. Çıktı
   Netlify > Environment variables içine PANEL_PAROLA_HASH olarak
   yapıştırılır — passphrase'in kendisi hiçbir yerde durmaz.

   Kullanım:
     node netlify/parola-hash.js
     (yaz, Enter, sonra Ctrl+D / Ctrl+Z)
   veya:
     echo "gizli parola" | node netlify/parola-hash.js
   --------------------------------------------------------------------- */
'use strict';

const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, terminal: false });
let girdi = '';
rl.on('line', satir => { girdi += satir; });
rl.on('close', () => {
  const parola = girdi.trim();
  if (!parola) { console.error('boş parola — çıktı üretilmedi'); process.exit(1); }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(parola, salt, 64).toString('hex');
  console.log(salt + ':' + hash);
});
