/* DONEN CIZGI (SUS-HALKA) BEKCISI (31 Agu 2026 gece, Enes; TUR 9 3 Eyl 2026 tek uygulama)
   Kapi: "sitedeki mevcut efektle sure ve kalinlik degerleri yan yana
   yazilir, ayni olduklari gosterilir."
   KAYNAK: eski site index.html `.void .ring` (canli efektin kendisi).
   KOPYA: yeni/src/stil/temel.css `.sus-halka` — TUR 9'a kadar iki kopya
   vardi (hero.css .sus-halka + film.css .fl-halka) ve bu bekci yalniz
   filmi okuyordu; hero bekcisizdi (MIMARI T2). Simdi tek uygulama
   temel.css'te, bu bekci onu kaynakla kiyaslar VE kaynak agacinda ikinci
   bir kopya dogmasin diye `conic-gradient(from 0deg,` sayisini 1'e
   kilitler (ProjeDizin .mi-t::after `from 0deg at ...` imlec isigi,
   halka degil — virgul ayrimi onu disarida tutar).
   BILINCLI SAPMA (denetlenmez): film .duz varyanti parilti (drop-shadow)
   tasimaz — kaynagin kendi lowfx kipiyle ayni gerekce (film.css notu). */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const eski = fs.readFileSync(path.join(KOK, '..', 'index.html'), 'utf8');
const temel = fs.readFileSync(path.join(KOK, 'src', 'stil', 'temel.css'), 'utf8');
const film = fs.readFileSync(path.join(KOK, 'src', 'stil', 'film.css'), 'utf8');
const filmAstro = fs.readFileSync(path.join(KOK, 'src', 'parcalar', 'Film.astro'), 'utf8');
const heroAstro = fs.readFileSync(path.join(KOK, 'src', 'sahneler', 'SHHero.astro'), 'utf8');

/* conic duraklarini normalize et: renk degerlerini sirali listeye indir */
const conicRenkler = (m) => (m.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/g) || [])
  .map((r) => r.replace(/\s+/g, ''));

test('halka: sure, kalinlik, kuyruk, parilti ve renkler kaynakla ayni (tek uygulama temel.css)', () => {
  /* --- KAYNAK (eski .void .ring) --- */
  const kW = /--ring-w:var\(--t-ring-w,([^)]+)\)/.exec(eski)?.[1];
  const kS = /--ring-spd:var\(--t-ring-spd,([^)]+)\)/.exec(eski)?.[1];
  const kT = /--ring-tail:var\(--t-ring-tail,([^)]+)\)/.exec(eski)?.[1];
  const kG = /--ring-glow:var\(--t-ring-glow,([^)]+)\)/.exec(eski)?.[1];
  const kConic = /\.void \.ring::before\{[\s\S]*?conic-gradient\(([\s\S]*?)\);/.exec(eski)?.[1];
  assert.ok(kW && kS && kT && kG && kConic, 'kaynak .void .ring okunamadi — eski index.html degisti mi?');

  /* --- TEK UYGULAMA (temel.css .sus-halka) --- */
  const blok = /\.sus-halka\{([\s\S]*?)\}/.exec(temel)?.[1] || '';
  const yW = /--halka-w:([^;]+);/.exec(blok)?.[1]?.trim();
  const yS = /--halka-spd:([^;]+);/.exec(blok)?.[1]?.trim();
  const yT = /--halka-kuyruk:([^;]+);/.exec(blok)?.[1]?.trim();
  const yG = /--halka-glow:([^;]+);/.exec(blok)?.[1]?.trim();
  const yConic = /\.sus-halka::before\{[\s\S]*?conic-gradient\(([\s\S]*?)\);/.exec(temel)?.[1];
  assert.ok(yW && yS && yT && yG && yConic, 'temel.css .sus-halka okunamadi');
  assert.match(blok, /padding:var\(--halka-w\)/, 'kalinlik degiskenden gelmiyor');
  assert.match(temel, /animation:sus-halka-don var\(--halka-spd\) linear infinite/, 'tur suresi degiskenden gelmiyor');
  assert.match(blok, /drop-shadow\(0 0 var\(--halka-glow\)/, 'parilti degiskenden gelmiyor');

  const kR = conicRenkler(kConic), yR = conicRenkler(yConic);
  /* YAN YANA — kapinin istedigi dokum */
  console.log('  DEGER        KAYNAK (.void .ring)   YENI (temel.css .sus-halka)');
  console.log(`  kalinlik     ${kW.padEnd(22)} ${yW}`);
  console.log(`  tur suresi   ${kS.padEnd(22)} ${yS}`);
  console.log(`  kuyruk       ${kT.padEnd(22)} ${yT}`);
  console.log(`  parilti      ${kG.padEnd(22)} ${yG}`);
  console.log(`  renkler      ${kR.join(' ')}`);
  console.log(`               ${yR.join(' ')}`);

  assert.strictEqual(yW, kW.trim(), 'kalinlik ayristi');
  assert.strictEqual(yS, kS.trim(), 'tur suresi ayristi');
  assert.strictEqual(yT, kT.trim(), 'kuyruk ayristi');
  assert.strictEqual(yG, kG.trim(), 'parilti ayristi');
  assert.deepStrictEqual(yR, kR, 'conic renk duraklari ayristi');
  /* dil butunlugu: linear + sonsuz + reduce'ta durma + maske farki */
  assert.match(eski, /\.void \.ring::before\{animation:none\}/, 'kaynak reduce kurali');
  assert.match(temel, /reduce\)\s*\{[\s\S]*?\.sus-halka::before\{animation:none\}/, 'yeni reduce kurali (cizgi durur)');
  assert.match(blok, /mask-composite:exclude/, 'maske farki dili');
  /* film varyanti: parilti yok, katman sabit */
  assert.match(temel, /\.sus-halka\.duz\{filter:none/, 'film .duz varyanti (parilti yok)');
  assert.match(temel, /\.sus-halka\.duz::before\{will-change:transform\}/, 'film .duz katman sabitleme');

  /* KOPYA DOGMASIN: her iki markup ortak sinifi kullanir, kaynak agacinda
     konik halka tek yerde. */
  assert.match(filmAstro, /class="sus-halka duz"/, 'Film.astro ortak sinifi kullanmiyor');
  assert.match(heroAstro, /class="sus-halka"/, 'SHHero.astro ortak sinifi kullanmiyor');
  assert.doesNotMatch(film, /\.fl-halka\s*\{/, 'film.css hala kendi kopyasini tasiyor');
  const kopyalar = [];
  (function gez(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) gez(p);
      else if (/\.(css|astro)$/.test(e.name)) {
        /* yorumlar ayiklanir (kural yazimi dersi: yorumdaki ornek metin kopya degildir) */
        const kod = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
        const n = (kod.match(/conic-gradient\(from 0deg,/g) || []).length;
        if (n) kopyalar.push(path.relative(KOK, p).replace(/\\/g, '/') + ':' + n);
      }
    }
  })(path.join(KOK, 'src'));
  console.log(`  konik halka  ${kopyalar.join(' ')}`);
  assert.deepStrictEqual(kopyalar, ['src/stil/temel.css:1'], 'konik halka kaynak agacinda TEK olmali (kopya dogdu)');

  /* NABIZ ISIGI (1 Eyl, Enes): ibaredeki isik halkadan yalniz RENK ve
     RITIM alir — ritim = kaynak tur suresi. Ayrismasin. */
  const nS = /animation:\s*fl-nabiz\s+([\d.]+s)\s+ease-in-out\s+infinite/.exec(film)?.[1];
  assert.ok(nS, 'fl-nabiz animasyonu okunamadi');
  console.log(`  nabiz ritmi  ${kS.trim().padEnd(22)} ${nS}`);
  assert.strictEqual(nS, kS.trim(), 'nabiz ritmi kaynak tur suresinden ayristi');
  const okBlok = /^\.fl-ipucu svg \{([^}]*)\}/m.exec(film)?.[1] || '';
  assert.match(okBlok, /#ef233c/, 'ok rengi palet disi (kirmizi olmali)');
  const oS = /animation:\s*fl-ok-kay\s+([\d.]+s)/.exec(okBlok)?.[1];
  assert.strictEqual(oS, kS.trim(), 'ok akis ritmi kaynak tur suresinden ayristi');
});
