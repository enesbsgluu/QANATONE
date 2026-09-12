// ZINCIR RAPORU
const fs = require('fs'), path = require('path');
const dosyalar = process.argv.slice(2);
const hepsi = [];
for (const d of dosyalar){ try { hepsi.push(...JSON.parse(fs.readFileSync(d,'utf8'))); } catch(e){ console.log('okunamadi', d); } }

console.log('| küme | ağ | tempo (50 sn zincir) | önden | ilk durak hazır | **hazır varış** | **takılma toplam** | durak inme p50/p95 | atlama % | kare süresi p95 | inen MB |');
console.log('|---|---|---:|---:|---:|---:|---:|---|---:|---:|---:|');
for (const r of hepsi){
  if (r.hata){ console.log(`| ${r.ad} | HATA: ${r.hata} |`); continue; }
  const tempoAd = r.tempo_sn >= 40 ? `${r.tempo_sn} sn (ağır)` : r.tempo_sn >= 20 ? `${r.tempo_sn} sn (normal)` : `${r.tempo_sn} sn (hızlı)`;
  console.log(`| ${r.kume} | ${r.ag} | ${tempoAd} | ${r.onden} | ${r.ilk_durak_hazir_sn} sn | **${r.varis_hazir}/${r.varis_toplam}** | **${r.takilma_toplam_sn} sn** | ${r.durak_inme_sn_p50}/${r.durak_inme_sn_p95} sn | ${r.atlama_yuzde} | ${r.kare_suresi_p95} ms | ${r.bayt_mb} |`);
  if ((r.uyari||[]).length) console.log(`| ↳ uyarı | ${r.uyari.join(' · ').slice(0,140)} |`);
}

console.log('\n### Hazır olmadan varılan duraklar\n');
for (const r of hepsi){
  if (r.hata) continue;
  console.log(`- ${r.ad}: hazırsız varış ${r.hazirsiz_duraklar.length ? 'durak ' + r.hazirsiz_duraklar.join(', ') : 'yok'} · takılma aralıkları ${r.takilma_araliklari.join(', ')||'yok'} · scrollTo sapması ${r.kapi_sapma}`);
}

// tuketim vs inme hizi
console.log('\n### Yetişiyor mu (durak inme süresi vs durakta geçirilen süre)\n');
console.log('| yapılandırma | durakta geçen sn | durak inme p50 | pay |');
console.log('|---|---:|---:|---|');
for (const r of hepsi){
  if (r.hata) continue;
  const durakta = r.tempo_sn / 10;
  const pay = r.durak_inme_sn_p50 ? (durakta / r.durak_inme_sn_p50) : null;
  console.log(`| ${r.ad} | ${durakta.toFixed(1)} | ${r.durak_inme_sn_p50} | ${pay ? (pay >= 1 ? `×${pay.toFixed(2)} ✓ yetişiyor` : `×${pay.toFixed(2)} ✗ geride`) : '—'} |`);
}
