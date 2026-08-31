/* FILM · DONEN CIZGI BEKCISI (31 Agu 2026 gece, Enes)
   Kapi: "sitedeki mevcut efektle sure ve kalinlik degerleri yan yana
   yazilir, ayni olduklari gosterilir."
   KAYNAK: eski site index.html `.void .ring` (canli efektin kendisi).
   KOPYA: yeni/src/stil/film.css `.fl-halka`.
   Degerler kopyalandi (iki ayri yapi, ortak dosya yok) — bu bekci iki
   dosyayi da OKUR, sure/kalinlik/kuyruk/renk duraklarini yan yana basar
   ve ayrismislarsa kirmizi yakar: kopya sessizce eskiyemez.
   BILINCLI SAPMA (denetlenmez): drop-shadow parilti katmani filme
   alinmadi — kaynagin kendi lowfx kipiyle ayni gerekce (film.css notu). */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const eski = fs.readFileSync(path.join(KOK, '..', 'index.html'), 'utf8');
const film = fs.readFileSync(path.join(KOK, 'src', 'stil', 'film.css'), 'utf8');

/* conic duraklarini normalize et: renk degerlerini sirali listeye indir */
const conicRenkler = (m) => (m.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/g) || [])
  .map((r) => r.replace(/\s+/g, ''));

test('halka: sure, kalinlik, kuyruk ve renkler kaynakla ayni', () => {
  /* --- KAYNAK (eski .void .ring) --- */
  const kW = /--ring-w:var\(--t-ring-w,([^)]+)\)/.exec(eski)?.[1];
  const kS = /--ring-spd:var\(--t-ring-spd,([^)]+)\)/.exec(eski)?.[1];
  const kT = /--ring-tail:var\(--t-ring-tail,([^)]+)\)/.exec(eski)?.[1];
  const kConic = /\.void \.ring::before\{[\s\S]*?conic-gradient\(([\s\S]*?)\);/.exec(eski)?.[1];
  assert.ok(kW && kS && kT && kConic, 'kaynak .void .ring okunamadi — eski index.html degisti mi?');

  /* --- FILM (.fl-halka) --- */
  const fBlok = /\.fl-halka \{([\s\S]*?)\}/.exec(film)?.[1];
  const fW = /padding:\s*([^;]+);/.exec(fBlok || '')?.[1]?.trim();
  const fS = /animation:\s*fl-halka-don\s+([\d.]+s)\s+linear\s+infinite/.exec(film)?.[1];
  const fT = /calc\(100% - (\d+%)\)/.exec(film)?.[1];
  const fConic = /\.fl-halka::before \{[\s\S]*?conic-gradient\(([\s\S]*?)\);/.exec(film)?.[1];
  assert.ok(fW && fS && fT && fConic, 'film .fl-halka okunamadi');

  const kR = conicRenkler(kConic), fR = conicRenkler(fConic);
  /* YAN YANA — kapinin istedigi dokum */
  console.log('  DEGER        KAYNAK (.void .ring)   FILM (.fl-halka)');
  console.log(`  kalinlik     ${kW.padEnd(22)} ${fW}`);
  console.log(`  tur suresi   ${kS.padEnd(22)} ${fS}`);
  console.log(`  kuyruk       ${kT.padEnd(22)} ${fT}`);
  console.log(`  renkler      ${kR.join(' ')}`);
  console.log(`               ${fR.join(' ')}`);

  assert.strictEqual(fW, kW.trim(), 'kalinlik ayristi');
  assert.strictEqual(fS, kS.trim(), 'tur suresi ayristi');
  assert.strictEqual(fT, kT.trim(), 'kuyruk ayristi');
  assert.deepStrictEqual(fR, kR, 'conic renk duraklari ayristi');
  /* dil butunlugu: linear + sonsuz + reduce'ta durma + maske farki */
  assert.match(eski, /\.void \.ring::before\{animation:none\}/, 'kaynak reduce kurali');
  assert.match(film, /reduce\)\s*\{\s*\.fl-halka::before\s*\{\s*animation:\s*none/, 'film reduce kurali (cizgi durur)');
  assert.match(film, /mask-composite:\s*exclude/, 'maske farki dili');

  /* NABIZ ISIGI (1 Eyl, Enes): ibaredeki isik halkadan yalniz RENK ve
     RITIM alir — ritim = kaynak tur suresi. Ayrismasin. */
  const nS = /animation:\s*fl-nabiz\s+([\d.]+s)\s+ease-in-out\s+infinite/.exec(film)?.[1];
  assert.ok(nS, 'fl-nabiz animasyonu okunamadi');
  console.log(`  nabiz ritmi  ${kS.trim().padEnd(22)} ${nS}`);
  assert.strictEqual(nS, kS.trim(), 'nabiz ritmi kaynak tur suresinden ayristi');
  const nabizBlok = /\.fl-nabiz \{([^}]*)\}/.exec(film)?.[1] || '';
  assert.match(nabizBlok, /#ef233c/, 'nabiz rengi palet disi');
});
