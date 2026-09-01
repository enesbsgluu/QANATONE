/* FILM AYAR SABITLERI — TEK KAYNAK denetimi (30 Agu 2026, sertlestirme turu).

   NE OLCER: `pxsn / sert / sonum / tavan / akis / moment` sayilarinin TEK yerde
   (src/film/ayar.mjs) yazili kaldigini. Iki taraf da oradan okumali:
     · sahneler.ts  -> Film.astro `data-*` olarak DOM'a yazar,
     · motor.ts     -> `data-*` dustugunde kullandigi YEDEK.
   NEDEN: eskiden sayilar iki tarafta da elle yaziliydi; ayrisirsa DOM
   kazandigi icin motorun yedegi SESSIZCE eskirdi, hicbir yer kirmizi
   yakmazdi. Bu test o sessizligi bozar.

   KURAL YAZIMI: kaynak taranirken once YORUMLAR AYIKLANIR — bu dosyalarin
   yorumlarinda 450/120/1.5/0.08 sayilari tarihce olarak geciyor; ayiklamadan
   bakan kural yanlis kirmizi yakar.

   Kosum: node --test yeni/test/ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { AYAR } from '../src/film/ayar.mjs';

const kok = dirname(fileURLToPath(import.meta.url));
const oku = (...p) => readFileSync(join(kok, '..', ...p), 'utf8');
/* /* ... *\/ ve // ... satirlarini at: sayilar yorumda tarihce olarak geciyor */
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ADLAR = ['pxsn', 'sert', 'sonum', 'tavan', 'akis', 'moment', 'hizala'];

test('ayar.mjs alti ayari da tasiyor ve hepsi sonlu sayi', () => {
  for (const ad of ADLAR) {
    assert.equal(typeof AYAR[ad], 'number', ad + ' sayi degil');
    assert.ok(Number.isFinite(AYAR[ad]), ad + ' sonlu degil');
  }
});

/* fpsYedek bir AYAR degil, `data-fps` dustugunde devreye giren son care.
   Gercek kaynak kanon.json; yedek ondan SAPARSA burasi kirmizi yakar. */
test('fps yedegi kanon.json"un gercek fps"iyle ayni (sessizce eskiyemez)', () => {
  const kanon = JSON.parse(oku('src', 'film', 'kanon.json'));
  assert.equal(typeof AYAR.fpsYedek, 'number', 'fpsYedek yok');
  assert.equal(AYAR.fpsYedek, kanon.fps,
    'ayar.mjs fpsYedek=' + AYAR.fpsYedek + ' ama kanon.json fps=' + kanon.fps
    + ' — film yeniden encode edilmis, yedek guncellenmemis');
});

test('sahneler.ts disari acilan sabitleri AYAR"dan turetiyor (sayi yazmiyor)', () => {
  const s = yorumsuz(oku('src', 'film', 'sahneler.ts'));
  const bekle = { PX_SN: 'pxsn', SERTLIK: 'sert', SONUM: 'sonum', TAVAN: 'tavan', AKIS: 'akis', MOMENT: 'moment', HIZALA: 'hizala' };
  for (const [dis, ic] of Object.entries(bekle)) {
    const m = s.match(new RegExp('export const ' + dis + '\\s*=\\s*([^;]+);'));
    assert.ok(m, dis + ' disari acilmiyor');
    assert.equal(m[1].trim(), 'AYAR.' + ic,
      dis + ' artik AYAR.' + ic + ' olmali — sayi ELLE yazilmis: ' + m[1].trim());
  }
});

test('motor.ts yedek degerleri AYAR"dan okuyor (ciplak sayi yedegi yok)', () => {
  const s = yorumsuz(oku('src', 'film', 'motor.ts'));
  /* assert.match KULLANILMAZ: eslesmeyince butun dosyayi hata metnine
     basiyor (motor.ts 650 satir). Boolean + kisa mesaj. */
  assert.ok(/import\s*\{\s*AYAR\s*\}\s*from\s*'\.\/ayar\.mjs'/.test(s),
    'motor.ts ayar.mjs"i ithal etmiyor — yedek degerler yine elle yazilmis olabilir');
  /* oku(ad, ust, YEDEK[, alt]) — yedek AYAR.* olmali, sayi degil */
  const cagri = [...s.matchAll(/oku\(\s*'(\w+)'\s*,\s*[\d.]+\s*,\s*([^,)]+)/g)];
  assert.ok(cagri.length >= 4, 'oku() cagrilari bulunamadi (' + cagri.length + ')');
  for (const [, ad, yedek] of cagri) {
    assert.match(yedek.trim(), /^AYAR\.\w+$/,
      "oku('" + ad + "') yedegi ciplak sayi: " + yedek.trim() + ' — ayar.mjs"ten gelmeli');
  }
  /* hiz tavaninin varsayilani da ayni kaynaktan */
  const t = s.match(/const TAVAN_VARSAYILAN\s*=\s*([^;]+);/);
  assert.ok(t, 'TAVAN_VARSAYILAN bulunamadi');
  assert.equal(t[1].trim(), 'AYAR.tavan',
    'TAVAN_VARSAYILAN sayi yazmis: ' + t[1].trim());
  /* yay cozucusundeki geri dusme sertligi de */
  const k = s.match(/IZ\.sert\s*>\s*0\s*\?\s*IZ\.sert\s*:\s*([^;\s]+)/);
  assert.ok(k, 'yay cozucusundeki sertlik geri dusmesi bulunamadi');
  assert.equal(k[1].trim(), 'AYAR.sert',
    'cozucudeki sertlik geri dusmesi sayi yazmis: ' + k[1].trim());
});

test('Film.astro DOM"a ayni alti adi yaziyor (data-* zinciri kopmamis)', () => {
  const a = oku('src', 'parcalar', 'Film.astro');
  for (const [oz, ad] of [['data-pxsn', 'PX_SN'], ['data-sert', 'SERTLIK'],
    ['data-sonum', 'SONUM'], ['data-tavan', 'TAVAN'], ['data-akis', 'AKIS'], ['data-moment', 'MOMENT'], ['data-hizala', 'HIZALA']]) {
    assert.ok(a.includes(oz + '={' + ad + '}'), oz + ' artik ' + ad + ' yazmiyor');
  }
  assert.ok(/import\s*\{[^}]*\}\s*from\s*'\.\.\/film\/sahneler'/.test(a),
    'Film.astro sabitleri sahneler.ts"ten almiyor');
});
