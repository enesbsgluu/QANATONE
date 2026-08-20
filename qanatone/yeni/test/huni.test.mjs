/* Huni aritmetiği testi — hesap.test.mjs ile aynı sözleşme (T1 kuralı
   koşar): eski hesapKur()'un formülü buraya SATIR SATIR bağımsız
   kopyalandı; src/huni.mjs ile varsayılanda, uçlarda ve rastgele
   olmayan sabit noktalarda karşılaştırılır. Yanlış taşınmış bir çarpan
   sessizdir — sayfa yayınlanır, rakam yanlıştır. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEG, huni, fmt } from '../src/huni.mjs';

/* Eski formülün bağımsız kopyası (kök hesapKur 10832-10850). */
function eskiHesap(T, p) {
  let kalan = T; const kademe = [T];
  p.forEach(y => { kalan = kalan * (1 - y / 100); kademe.push(kalan); });
  return { kademe, kacan: T - kalan };
}
const eskiDEG = [500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500,
  10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000, 150000,
  200000, 250000, 300000, 400000, 500000, 750000, 1000000, 1500000, 2000000];

test('DEG cetveli kaynakla birebir (29 kalem, varsayılan 13 → 25.000)', () => {
  assert.deepEqual(DEG, eskiDEG);
  assert.equal(DEG[13], 25000);
});

test('varsayılan girdi eski sayfanın bastığı rakamları verir', () => {
  /* kök markup 5222-5234: 60 → 49/38/27/23, kaçan 37, yıl 446,
     para ₺929.157, yıllık ₺11.149.884 (DEG[13]=25.000) */
  const { kademe, kacan } = huni(60, [18, 22, 30, 15]);
  assert.deepEqual(kademe.map(x => fmt(x)), ['60', '49', '38', '27', '23']);
  assert.equal(fmt(kacan), '37');
  assert.equal(fmt(kacan * 12), '446');
  assert.equal(fmt(kacan * DEG[13]), '929.157');
  assert.equal(fmt(kacan * DEG[13] * 12), '11.149.884');
});

test('uçlarda ve sabit noktalarda eski formülle birebir', () => {
  const noktalar = [
    [5, [0, 0, 0, 0]], [400, [60, 60, 60, 60]],
    [5, [60, 60, 60, 60]], [400, [0, 0, 0, 0]],
    [135, [7, 33, 12, 49]], [60, [18, 22, 30, 15]],
  ];
  for (const [T, p] of noktalar) {
    const y = huni(T, p), e = eskiHesap(T, p);
    assert.deepEqual(y.kademe, e.kademe, `kademe T=${T}`);
    assert.equal(y.kacan, e.kacan, `kacan T=${T}`);
  }
});

test('fmt eski toLocaleString çıktısıyla eş (tr nokta, en virgül)', () => {
  for (const n of [0, 7, 929157.2, 11149884, 2000000]) {
    assert.equal(fmt(n, 'tr'), Math.round(n).toLocaleString('tr-TR'));
    assert.equal(fmt(n, 'en'), Math.round(n).toLocaleString('en-US'));
  }
});
