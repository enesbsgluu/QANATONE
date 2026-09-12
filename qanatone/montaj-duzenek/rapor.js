// RAPOR — dosya boyu butcesi + supurme olcutleri, markdown tablo
const fs = require('fs'), path = require('path');
const KOK = __dirname, M = path.join(KOK, 'malzeme');

const SENTETIK_SN = 13;          // k1 5 sn + k2 8 sn
const ZINCIR_SN = +(process.argv[2] || 97.5);   // 10 klip + final bolumu, ort 6,5 sn varsayimi
const mb = b => +(b/1048576).toFixed(1);

function dizinBayt(d){ let t=0; for (const f of fs.readdirSync(d)) { const p=path.join(d,f); const s=fs.statSync(p); t += s.isDirectory()? dizinBayt(p) : s.size; } return t; }

console.log('## 1. AGIRLIK — sentetik olcum ve zincir kestirimi\n');
console.log(`Sentetik malzeme ${SENTETIK_SN} sn (312 kare, 24 fps). Zincir kestirimi ${ZINCIR_SN} sn kabulu ile.\n`);
console.log('| aday | varyant | 13 sn (MB) | sn basina (KB) | ' + ZINCIR_SN + ' sn zincir (MB) |');
console.log('|---|---|---:|---:|---:|');

const satir = [];
const vd = path.join(M,'video');
for (const f of fs.readdirSync(vd).sort()){
  if (!f.endsWith('.mp4')) continue;
  satir.push({ aday:'(b) video', ad:f, bayt: fs.statSync(path.join(vd,f)).size, klip: f.slice(0,2) });
}
const vGrup = {};
for (const s of satir){ const k = s.ad.replace(/^k\d_/,'').replace('.mp4',''); (vGrup[k] ||= 0); vGrup[k] += s.bayt; }
for (const k of Object.keys(vGrup)) console.log(`| (b) video | ${k} | ${mb(vGrup[k])} | ${Math.round(vGrup[k]/SENTETIK_SN/1024)} | ${mb(vGrup[k]/SENTETIK_SN*ZINCIR_SN)} |`);

const dd = path.join(M,'dizi');
for (const s of fs.readdirSync(dd).sort()){
  const p = path.join(dd,s);
  if (!fs.statSync(p).isDirectory()) continue;
  const klipler = fs.readdirSync(p);
  const bayt = dizinBayt(p);
  const sn = klipler.reduce((a,k)=> a + (k==='k1'?5:8), 0);
  console.log(`| (a) kare dizisi | ${s}${sn<SENTETIK_SN?' *(yalniz k1)*':''} | ${mb(bayt/sn*SENTETIK_SN)} | ${Math.round(bayt/sn/1024)} | ${mb(bayt/sn*ZINCIR_SN)} |`);
}

console.log('\n## 2. SUPURME OLCUTLERI\n');
let sonuc = [];
try { sonuc = JSON.parse(fs.readFileSync(path.join(KOK,'sonuc.json'),'utf8')); } catch(e){ console.log('_sonuc.json yok_'); process.exit(0); }

console.log('| yapilandirma | ortam | hazir (ms) | inen (MB) | supurme | istenen fps | **sunulan fps** | atlama % | max bosluk | gecikme p95 (kare) | kare suresi p50/p95 (ms) | uzun kare >50ms | cizim p95 (ms) |');
console.log('|---|---|---:|---:|---|---:|---:|---:|---:|---:|---|---:|---:|');
for (const r of sonuc){
  if (r.hata){ console.log(`| ${r.ad} | — | HATA: ${r.hata} |`); continue; }
  const o = r.ortam;
  const ort = `${o.en}x${o.boy} dsf${o.dsf} cpu${o.cpu}x ${o.ag}`;
  for (const s in r.supurmeler){
    const v = r.supurmeler[s];
    console.log(`| ${r.ad} | ${ort} | ${r.yukleme.hazirMs} | ${mb(r.yukleme.bayt)} | ${s} | ${v.istenen_fps} | **${v.sunulan_fps}** | ${v.atlama_yuzde} | ${v.max_bosluk_kare} | ${v.gecikme_p95} | ${v.kare_suresi_p50}/${v.kare_suresi_p95} | ${v.uzun_kare_50ms} | ${v.cizim_p95} |`);
  }
  const uy = (r.uyari||[]).filter(Boolean);
  if (uy.length) console.log(`| ↳ uyari | ${uy.join(' · ').slice(0,160)} |`);
}

console.log('\n## 3. KAPI — duzenek kendini dogruladi mi\n');
console.log('| yapilandirma | scrollTo sapmasi (adim) | kanit kareleri (bayt) |');
console.log('|---|---|---|');
for (const r of sonuc){
  if (r.hata) continue;
  const sap = Object.entries(r.supurmeler).map(([k,v])=>`${k}:${v.kapi.sapma}/${v.kapi.adim}`).join(' ');
  console.log(`| ${r.ad} | ${sap} | ${(r.kanit||[]).map(k=>k.ad+':'+k.bayt).join(' ')} |`);
}
