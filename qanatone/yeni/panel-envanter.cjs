#!/usr/bin/env node
/* PANEL ENVANTERI (TUR 4, 4 Eyl 2026) — "her alanin panelde yuvasi var mi?"

   NEDEN VAR. Panel kapisi (panel-kapi.cjs) YAZILAN alanin uretimde
   gorundugunu kanitlar; bu betik TERS soruyu sorar: uretilen sayfada duran
   bir metnin panelde KARSILIGI var mi? Ikisi ayri sorudur ve ikincisi
   sessizce kacar — Enes bir cumleyi degistirmek isteyip yerini bulamaz.

   YONTEM (kaynak tarama, uretilen HTML degil — cunku sorulan sey metnin
   NEREDEN geldigi):
     · her .astro'nun SABLON bolgesi (frontmatter ve <style>/<script> disi)
       taranir; JSX yorumlari da atlanir,
     · `{...}` ifadelerinin ICI dinamik sayilir; icinde m( / T( / icerik.
       / veri gecerse PANELDEN gelir,
     · duz metin dugumleri ve gorunur oznitelikler (aria-label, placeholder,
       title, alt) SABIT sayilir.
   Sabit metin her zaman kusur DEGIL: bir kismi teknik (ikon etiketi,
   yon oku), bir kismi zaten `m()` ile panele acilmis komsunun icinde.
   Bu yuzden cikti HUKUM degil ENVANTERDIR: dosya dosya sayilar + ilk
   ornekler; hangisinin panele acilacagi Enes'in karari.

   KULLANIM: node yeni/panel-envanter.cjs
   ENV: ESIK (kac karakterden kisa metin sayilmaz, varsayilan 3) */
const fs = require('fs');
const path = require('path');
const ESIK = Number(process.env.ESIK || 3);
const SRC = path.join(__dirname, 'src');
const CIKTI = path.join(__dirname, 'panel-envanter.json');

/* gorunur oznitelikler: ekranda ya da erisilebilirlik agacinda okunur */
const NITELIK = /\b(aria-label|placeholder|title|alt|aria-description|content)="([^"{}]{3,})"/g;
/* teknik/gorunmez kabul edilenler: yalniz noktalama, sayi, tek harf,
   URL, sinif benzeri, HTML varlik */
const TEKNIK = (t) => !t || t.length < ESIK || /^[\s\p{P}\p{S}0-9]+$/u.test(t)
  || /^(https?:|\/|#|\$\{|mailto:)/.test(t) || /^[a-z-]+$/.test(t) && !/[aeiouıöü]{2}/.test(t);

function sablon(kaynak) {
  /* frontmatter --- ... --- atlanir */
  let s = kaynak;
  if (s.startsWith('---')) { const i = s.indexOf('\n---', 3); if (i > 0) s = s.slice(i + 4); }
  /* style ve script bloklari cikarilir */
  s = s.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  /* JSX yorumlari {/* ... *\/} cikarilir */
  s = s.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');
  return s;
}

/* duz metin dugumleri: etiketler ve {ifade} bloklari disinda kalan metin */
function metinDugumleri(s) {
  const out = [];
  let derinlik = 0, buf = '', etiket = false, tirnak = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (etiket) {
      if (tirnak) { if (c === tirnak) tirnak = ''; }
      else if (c === '"' || c === "'") tirnak = c;
      else if (c === '{') derinlik++;
      else if (c === '}') derinlik--;
      else if (c === '>' && derinlik === 0) etiket = false;
      continue;
    }
    if (c === '<' && /[a-zA-Z/!]/.test(s[i + 1] || '')) { if (buf.trim()) out.push(buf.trim()); buf = ''; etiket = true; continue; }
    if (c === '{') { if (buf.trim()) out.push(buf.trim()); buf = ''; let d = 1; i++; while (i < s.length && d > 0) { if (s[i] === '{') d++; else if (s[i] === '}') d--; i++; } i--; continue; }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.map((t) => t.replace(/\s+/g, ' ').trim()).filter((t) => !TEKNIK(t));
}

const rapor = {};
(function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { gez(p); continue; }
    if (!e.name.endsWith('.astro')) continue;
    const rel = path.relative(SRC, p).replace(/\\/g, '/');
    const ham = fs.readFileSync(p, 'utf8');
    const s = sablon(ham);
    const sabitler = metinDugumleri(s);
    const nitelikler = [];
    let m; NITELIK.lastIndex = 0;
    while ((m = NITELIK.exec(s))) { const v = m[2].replace(/\s+/g, ' ').trim(); if (!TEKNIK(v)) nitelikler.push(`${m[1]}="${v}"`); }
    const mSayi = (ham.match(/\bm\(\s*'[a-zA-Z0-9_]+'/g) || []).length;
    if (sabitler.length || nitelikler.length || mSayi) {
      rapor[rel] = { panelli: mSayi, sabit_metin: sabitler.length, sabit_nitelik: nitelikler.length,
        ornek: sabitler.slice(0, 6), ornek_nitelik: nitelikler.slice(0, 4) };
    }
  }
})(SRC);

const sirali = Object.entries(rapor).sort((a, b) => (b[1].sabit_metin + b[1].sabit_nitelik) - (a[1].sabit_metin + a[1].sabit_nitelik));
let tS = 0, tN = 0, tP = 0;
console.log('DOSYA                                        panelli  sabit-metin  sabit-nitelik');
for (const [f, r] of sirali) {
  tS += r.sabit_metin; tN += r.sabit_nitelik; tP += r.panelli;
  if (r.sabit_metin + r.sabit_nitelik === 0) continue;
  console.log(`${f.padEnd(44)}${String(r.panelli).padStart(7)}${String(r.sabit_metin).padStart(13)}${String(r.sabit_nitelik).padStart(15)}`);
}
console.log(`\nTOPLAM: panelden okunan cagri ${tP} · sabit metin ${tS} · sabit gorunur nitelik ${tN}`);
console.log('EN COK SABIT TASIYAN UC DOSYANIN ORNEKLERI:');
for (const [f, r] of sirali.slice(0, 3)) console.log(`  ${f}\n    ${r.ornek.join(' | ').slice(0, 220)}`);
fs.writeFileSync(CIKTI, JSON.stringify({ _: 'yeni/panel-envanter.cjs — kaynak taramasi: hangi metin panelden geliyor, hangisi sabit. HUKUM DEGIL envanter.', olcum: new Date().toISOString(), toplam: { panelli: tP, sabit_metin: tS, sabit_nitelik: tN }, dosya: rapor }, null, 1));
console.log(`\n→ ${CIKTI}`);
