#!/usr/bin/env node
/* PENCERE TARAMASI (30 Agu 2026, TUR 2) — tarayici acmaz, kayitli ham
   ornekleri yeniden okur. Amaci tek: "tepe hiz" sayisinin OLCUM
   PENCERESINE ne kadar bagli oldugunu gostermek.
   NEDEN: okuyucunun rAF'i ile motorun `tik()`i AYRI zamanlanir. Bir jank
   sonrasi okuyucu once kosarsa bayat konumu, bir sonraki karede taze
   konumu okur — arada 10 ms olculur ama konum 42 ms'lik hareket tasir.
   Tek-kare turevi bunu 4-6x abartir. Pencere buyudukce takma ad silinir.
   Motorun KENDI hizi (__fl.hizT, sabit 4 ms adimlardan) bu hatadan
   bagimsizdir; kiyas sutunu odur. */
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, 'olcum');
const J = JSON.parse(fs.readFileSync(path.join(D, 'tavan-sonum.json'), 'utf8'));

const tepe = (S, sut, W) => {
  let m = 0;
  for (let i = W; i < S.length; i++) {
    const dt = (S[i][0] - S[i - W][0]) / 1000;
    if (dt < 0.004) continue;
    const v = (S[i][sut] - S[i - W][sut]) / dt;
    if (v > m) m = v;
  }
  return m;
};

console.log('GOSTERILEN KONUM TUREVININ TEPESI — pencere buyudukce (film-sn/gercek-sn)\n');
console.log('kosum'.padEnd(24) + ' 1 kare   ~50ms   ~100ms  ~200ms  || motorun hizT tepesi');
console.log('-'.repeat(24) + '-+--------+-------+-------+-------++--------------------');
for (const r of J.sonuc) {
  const taban = r.ad.replace(/ #\d+$/, ''), tekrar = r.ad.match(/#(\d+)$/)[1];
  const dosya = path.join(D, 'tavan-sonum-ham-' + taban.replace(/[^a-z0-9]+/gi, '_') + '-' + tekrar + '.json');
  if (!fs.existsSync(dosya)) { console.log(r.ad.padEnd(24) + ' (ham yok: ' + path.basename(dosya) + ')'); continue; }
  const S = JSON.parse(fs.readFileSync(dosya, 'utf8'));
  /* ornek araligi medyani -> pencere uzunluklari */
  const dt = []; for (let i = 1; i < S.length; i++) dt.push(S[i][0] - S[i - 1][0]);
  dt.sort((a, b) => a - b); const med = dt[dt.length >> 1] || 8;
  const W = (ms) => Math.max(1, Math.round(ms / med));
  /* SURDURULEN HIZ: birakistan sonraki 2 sn'lik tek parcada
     toplam yer degistirme / gecen sure. Pencere uzun oldugu icin sinir
     kaymasinin (bir motor guncellemesi) payi 0,03'e iner — tavanin
     gercekten tuttugu bu sutunda gorulur. */
  let surdurulen = null;
  if (r.birakisMs !== null) {
    const a = S.find((s) => s[0] >= r.birakisMs + 100);
    const b = [...S].reverse().find((s) => s[0] <= Math.min(r.birakisMs + 2100, S[S.length - 1][0]));
    if (a && b && b[0] - a[0] > 500) surdurulen = (b[2] - a[2]) / ((b[0] - a[0]) / 1000);
  }
  console.log(r.ad.padEnd(24)
    + ' ' + tepe(S, 2, 1).toFixed(2).padStart(7)
    + ' ' + tepe(S, 2, W(50)).toFixed(2).padStart(7)
    + ' ' + tepe(S, 2, W(100)).toFixed(2).padStart(7)
    + ' ' + tepe(S, 2, W(200)).toFixed(2).padStart(7)
    + '  || ' + String(r.tepeHizT).padStart(6)
    + ' | surdurulen 2sn ' + (surdurulen === null ? '   —  ' : surdurulen.toFixed(3).padStart(6))
    + ' (dt med ' + med.toFixed(1) + ' ms)');
}
