/* IKI KAPI TEK SINYAL — kapi A ile kapi B ayrisirsa sessizce yanlis kiyas
   (5 Eyl 2026, "IKI KAPI" karari).

   NE OLCER: `olc-sayfa.cjs` (KAPI A — tam tarama, gerileme kapisi) ile
   `olc-soguk.cjs` (KAPI B — soguk giris, ziyaretci olcumu) ayni SINYALI
   olctugunu. Iki arac ayri dosya, cunku akislari farkli (A tek tarayicida
   59 sayfa, B her olcumde yeni tarayici). Ama olctukleri sey ayni olmali:
   takilma esigi, tek takilma tavani, toplam oran, kaydirma hizi/adimi ve
   TIK KESTIRIMI. Biri degisip oteki degismezse iki kapinin rakamlari
   KIYASLANAMAZ hale gelir ve bunu hicbir yer kirmizi yakmaz — "A'da 1
   kacirdi, B'de 2" cumlesi anlamini kaybeder.

   NEDEN TEST, NEDEN ORTAK MODUL DEGIL: olc-* araclari kasten kendi kendine
   yeter (tek dosya kopyalanip kosulabiliyor, film-olc kutuphanesi disinda
   bagimlilik yok). Ortak modul o kurali bozardi; drift'i test kapatir.

   KURAL YAZIMI: kaynak taranirken once YORUMLAR AYIKLANIR — bu dosyalarin
   yorumlarinda 50, 250, 900, 20 gibi sayilar tarihce/aciklama olarak geciyor;
   ayiklamadan bakan kural yanlis yesil de yanlis kirmizi da verir.

   Kosum: node --test yeni/test/olc-esik.test.mjs
   (dizin bicimi `node --test yeni/test/` Windows'ta yanlis kirmizi verir —
    dosya listesi ver, CLAUDE.md tuzaklar) */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const kok = dirname(fileURLToPath(import.meta.url));
const oku = (...p) => readFileSync(join(kok, '..', ...p), 'utf8');
/* /* ... *\/ ve // ... satirlarini at */
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const A = yorumsuz(oku('film', 'olc-sayfa.cjs'));
const B = yorumsuz(oku('film', 'olc-soguk.cjs'));

const sayi = (kaynak, ad) => {
  const m = kaynak.match(new RegExp(ad + '\\s*=\\s*(-?[0-9.]+)'));
  assert.ok(m, `${ad} kaynakta bulunamadi`);
  return Number(m[1]);
};

test('takilma sinyali iki kapida birebir ayni', () => {
  for (const ad of ['TAKILMA_ESIK', 'TEK_TAKILMA_MS', 'TOPLAM_ORAN']) {
    assert.equal(sayi(A, ad), sayi(B, ad), `${ad} A ve B'de farkli — iki kapinin rakamlari kiyaslanamaz`);
  }
});

test('kaydirma turu iki kapida birebir ayni (hiz ve adim)', () => {
  const hiz = (s) => { const m = s.match(/speed:\s*(\d+)/); assert.ok(m, 'speed bulunamadi'); return Number(m[1]); };
  const adim = (s) => { const m = s.match(/Math\.min\((\d+),\s*toplamPx/); assert.ok(m, 'adim bulunamadi'); return Number(m[1]); };
  assert.equal(hiz(A), hiz(B), 'kaydirma hizi ayrismis');
  assert.equal(adim(A), adim(B), 'kaydirma adimi ayrismis');
});

test('tik kestirimi iki kapida ayni yontem (200 rAF, ilk 5 atilir, %50-150 bandi)', () => {
  for (const [ad, s] of [['A', A], ['B', B]]) {
    assert.match(s, /n\s*<\s*200/, `${ad}: rAF ornek sayisi 200 degil`);
    assert.match(s, /\.slice\(5\)/, `${ad}: ilk 5 isinma karesi atilmiyor`);
    assert.match(s, /m0\s*\*\s*0\.5/, `${ad}: alt suzgec bandi 0,5 degil`);
    assert.match(s, /m0\s*\*\s*1\.5/, `${ad}: ust suzgec bandi 1,5 degil`);
  }
});

test('kacirilan kare formulu iki kapida ayni: round(p95/tik) - 1', () => {
  for (const [ad, s] of [['A', A], ['B', B]]) {
    assert.match(s, /Math\.round\([^)]*(kare_p95|p95\(ara\)\s*\/\s*tz\.tik_ms)[^)]*\)\s*-\s*1/,
      `${ad}: kacirilan kare formulu degismis`);
  }
});

test('kapi B esik TASIMAZ (olcum araci) — kapi A tasir', () => {
  assert.match(B, /esik:\s*null/, 'B bir esik kazanmis: kapi olduysa bu test ve olc-soguk kunyesi guncellenmeli');
  assert.match(A, /KACIRILAN_KAPI/, 'A kapi esigini kaybetmis');
});
