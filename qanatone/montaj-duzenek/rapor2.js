// ODAK RAPORU — tekrarli kosumlarin MEDYANI (tek kosum gurultulu)
const fs = require('fs'), path = require('path');
const KOK = __dirname;
const dosya = process.argv[2] || 'sonuc-odak.json';
const veri = JSON.parse(fs.readFileSync(path.join(KOK, dosya), 'utf8')).filter(r => !r.hata);

const ortanca = a => { if (!a.length) return null; const b=[...a].sort((x,y)=>x-y); const n=b.length;
  return +(n%2 ? b[(n-1)/2] : (b[n/2-1]+b[n/2])/2).toFixed(1); };
const aralik = a => a.length ? `${Math.min(...a)}–${Math.max(...a)}` : '';

const grup = {};
for (const r of veri){
  const taban = r.ad.replace(/#\d+$/,'');
  (grup[taban] ||= { ortam:r.ortam, q:r.q, kosum:[] }).kosum.push(r);
}

const SUP = ['hizli_ileri','hizli_geri','yavas_ileri'];
console.log('| yapilandirma | ortam | n | süpürme | sunulan fps (medyan) | atlama % medyan [en az–en çok] | max boşluk (medyan) | kare süresi p95 medyan (ms) | hazır ms medyan |');
console.log('|---|---|---:|---|---:|---|---:|---:|---:|');
for (const ad in grup){
  const g = grup[ad], o = g.ortam;
  const ort = `${o.en}×${o.boy} dsf${o.dsf} cpu${o.cpu}×`;
  const hazir = ortanca(g.kosum.map(r=>r.yukleme.hazirMs));
  for (const s of SUP){
    const v = g.kosum.map(r=>r.supurmeler[s]).filter(Boolean);
    const atl = v.map(x=>x.atlama_yuzde);
    console.log(`| ${ad} | ${ort} | ${g.kosum.length} | ${s} | ${ortanca(v.map(x=>x.sunulan_fps))} | **${ortanca(atl)}** [${aralik(atl)}] | ${ortanca(v.map(x=>x.max_bosluk_kare))} | ${ortanca(v.map(x=>x.kare_suresi_p95))} | ${s===SUP[0]?hazir:''} |`);
  }
}

console.log('\n### Gurultu (ayni yapilandirma, kosumlar arasi atlama % yayilimi)\n');
console.log('| yapilandirma | hizli_ileri atlama % kosumlari | yayilim puani |');
console.log('|---|---|---:|');
for (const ad in grup){
  const a = grup[ad].kosum.map(r=>r.supurmeler.hizli_ileri.atlama_yuzde);
  console.log(`| ${ad} | ${a.join(' · ')} | ${(Math.max(...a)-Math.min(...a)).toFixed(1)} |`);
}
