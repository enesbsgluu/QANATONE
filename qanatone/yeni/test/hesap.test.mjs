/* SEKTÖR PARA HESABI — port sadakati testi.
   Anayasa: "₺ hesap aritmetiği testli".

   Test şunu ölçer: `src/hesap.ts` ESKİ KAYNAKTAKİ formülle aynı sonucu
   veriyor mu. Bunun için eski `calc()` (kök index.html 10286) buraya
   SATIR SATIR, olduğu gibi kopyalandı — referans budur, benim yeniden
   yorumum değil. İkisi altı sektörün her biri için ve kaydırıcıların
   uçlarında karşılaştırılır.

   Koşum: node --test yeni/test/   (denetim.cjs de bunu koşar) */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sektorHesap, bicimKisa, REACH, LATE, BAND } from '../src/hesap.ts';

const kok = dirname(fileURLToPath(import.meta.url));
const icerik = JSON.parse(readFileSync(join(kok, '..', '..', 'content.json'), 'utf8'));
const sektorler = icerik.sectors || [];

/* ---- ESKİ KAYNAK, birebir (index.html 10285-10302) ---- */
const E_REACH = 0.55, E_LATE = 0.6, E_BAND = 0.3;
function eskiCalc(s, F) {
  const m = s.market || {};
  const ref = Math.max((s.finance || {}).budget || 40000, 1);
  const budget = Math.max(+F.budget || 0, 0);
  const scale = Math.min(1.8, Math.max(0.9, Math.pow(budget / ref, 0.2)));
  const cpc = Math.max((m.cpc || 12) * scale, 1);
  const leads = Math.round(budget / cpc * (m.lead || 0.04));
  const miss = Math.min(Math.max((+F.miss || 0) / 100, 0), 0.9);
  const close = m.close || 0.06;
  const ticket = Math.max(+F.ticket || 0, 0);
  const salesNow = leads * (1 - miss) * close;
  const back = leads * miss * E_REACH * E_LATE * close;
  const gain = back * ticket;
  return {
    leads, cpc, salesNow, salesAgent: salesNow + back,
    revNow: salesNow * ticket, lost: leads * miss * close * ticket,
    gain, gainLo: gain * (1 - E_BAND), gainHi: gain * (1 + E_BAND),
  };
}

test('katsayılar kaynaktaki değerlerde', () => {
  assert.equal(REACH, 0.55);
  assert.equal(LATE, 0.6);
  assert.equal(BAND, 0.3);
});

test('altı sektörün de başlangıç hesabı eski formülle birebir', () => {
  assert.ok(sektorler.length >= 6, 'content.json altı sektör taşımalı');
  for (const s of sektorler) {
    const e = eskiCalc(s, { ...(s.finance || {}) });
    const y = sektorHesap(s);
    assert.equal(y.talep, e.leads, s.k + ' · gelen talep');
    assert.equal(y.tiklamaMaliyeti, e.cpc, s.k + ' · tıklama maliyeti');
    assert.equal(y.ciroSimdi, e.revNow, s.k + ' · bugünkü ciro');
    assert.equal(y.kayip, e.lost, s.k + ' · yanıtsızın ciro karşılığı');
    assert.equal(y.kazanc, e.gain, s.k + ' · kazanç');
    assert.equal(y.kazancAlt, e.gainLo, s.k + ' · kazanç alt');
    assert.equal(y.kazancUst, e.gainHi, s.k + ' · kazanç üst');
  }
});

test('kaydırıcı uçlarında da birebir (bütçe/tutar/yanıtsız)', () => {
  const uclar = [
    { butce: 5000, tutar: 500, kacan: 0 },
    { butce: 500000, tutar: 300000, kacan: 70 },
    { butce: 120000, tutar: 45000, kacan: 38 },
  ];
  for (const s of sektorler) {
    for (const u of uclar) {
      const e = eskiCalc(s, { budget: u.butce, ticket: u.tutar, miss: u.kacan });
      const y = sektorHesap(s, u);
      assert.equal(y.talep, e.leads, `${s.k} · ${u.butce} · talep`);
      assert.equal(y.kazanc, e.gain, `${s.k} · ${u.butce} · kazanç`);
      assert.equal(y.ciroSimdi, e.revNow, `${s.k} · ${u.butce} · ciro`);
    }
  }
});

test('yanıtsız oran %90 üstünde kırpılır (kaynaktaki sınır)', () => {
  const s = sektorler[0];
  const a = sektorHesap(s, { kacan: 95 });
  const b = sektorHesap(s, { kacan: 90 });
  assert.equal(a.kacirma, 0.9);
  assert.equal(a.kazanc, b.kazanc);
});

test('para biçimi: bin ve milyon eşikleri', () => {
  assert.equal(bicimKisa(950, 'tr'), '₺950');
  assert.equal(bicimKisa(78669, 'tr'), '₺79 B');
  assert.equal(bicimKisa(1240000, 'tr'), '₺1,2 Mn');
  assert.equal(bicimKisa(1240000, 'en'), '$1.2M');
});
