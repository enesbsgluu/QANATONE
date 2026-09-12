// ZINCIR OLCUMU — "biri oynarken sonraki iniyor" yavas hatta YETISIYOR MU
const pt = require('puppeteer-core');
const http = require('http'), fs = require('fs'), path = require('path');
const KOK = __dirname, CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', PORT = 8938;
const MIME = { '.mp4':'video/mp4','.html':'text/html; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png' };

function sunucu(kok, port){ return new Promise(res => { const s = http.createServer((req,rp)=>{
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(kok, u==='/'?'/zincir.html':u);
  if (!f.startsWith(kok)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){ rp.writeHead(404); return rp.end('yok'); }
  const st=fs.statSync(f), mime=MIME[path.extname(f)]||'application/octet-stream', rng=req.headers.range;
  if (rng){ const m=/bytes=(\d*)-(\d*)/.exec(rng), a=m[1]?+m[1]:0, b=m[2]?+m[2]:st.size-1;
    rp.writeHead(206,{'Content-Type':mime,'Accept-Ranges':'bytes','Content-Range':`bytes ${a}-${b}/${st.size}`,'Content-Length':b-a+1,'Cache-Control':'no-store'});
    fs.createReadStream(f,{start:a,end:b}).pipe(rp); }
  else { rp.writeHead(200,{'Content-Type':mime,'Accept-Ranges':'bytes','Content-Length':st.size,'Cache-Control':'no-store'}); fs.createReadStream(f).pipe(rp); }
}); s.listen(port,'127.0.0.1',()=>res(s)); }); }

const AGLAR = {
  'wifi':          null,
  '4G-12Mbit':     { indir: 12e6/8, yukle: 3e6/8, gecikme: 60 },
  '4G-yavas-4Mbit':{ indir: 4e6/8,  yukle: 1e6/8, gecikme: 150 },
};
const yuzde = (a,p) => { if(!a.length) return null; const b=[...a].sort((x,y)=>x-y); return +b[Math.min(b.length-1,Math.floor(p*b.length))].toFixed(2); };

async function kos(y){
  const b = await pt.launch({ executablePath:CHROME, headless:'new', args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage();
  const uyari = [];
  p.on('pageerror', e => uyari.push(String(e).slice(0,100)));
  await p.setViewport(y.mobil ? { width:412, height:892, deviceScaleFactor:2, isMobile:true, hasTouch:true } : { width:1440, height:900 });
  const cdp = await p.createCDPSession();
  await cdp.send('Network.enable');
  const ag = AGLAR[y.ag];
  await cdp.send('Network.emulateNetworkConditions', ag
    ? { offline:false, latency:ag.gecikme, downloadThroughput:ag.indir, uploadThroughput:ag.yukle }
    : { offline:false, latency:0, downloadThroughput:-1, uploadThroughput:-1 });
  if (y.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate:y.cpu });
  let bayt = 0;
  cdp.on('Network.loadingFinished', e => { bayt += e.encodedDataLength || 0; });

  const url = `http://127.0.0.1:${PORT}/zincir.html?${new URLSearchParams(y.q)}`;
  await p.goto(url, { waitUntil:'load', timeout:60000 });
  await p.waitForFunction('window.OL && OL.hazir', { timeout:180000 }).catch(()=>uyari.push('ILK DURAK HAZIR OLMADI'));
  const ilk = await p.evaluate(() => OL.ilkDurakHazirMs);

  await p.evaluate(() => SIFIRLA());
  const kapi = await p.evaluate(ms => SUPUR(ms, false), y.tempo_ms);
  await new Promise(r=>setTimeout(r, 500));
  await p.evaluate(() => DUR());
  const g = await p.evaluate(() => ({ raf:OL.raf, istek:OL.istek, sunum:OL.sunum, takilma:OL.takilma, varis:OL.varis, durakIz:OL.durakIz, birakilan:OL.birakilan, uyari:OL.uyari }));

  const raf = g.raf, arali = []; for (let i=1;i<raf.length;i++) arali.push(raf[i]-raf[i-1]);
  const istekK = new Set(g.istek.map(r=>r.durak+'#'+r.kare));
  const sunumK = new Set(g.sunum.map(r=>r.durak+'#'+r.kare));
  let kesisim = 0; for (const k of istekK) if (sunumK.has(k)) kesisim++;
  const takToplam = g.takilma.reduce((a,x)=>a+x.ms,0);

  await b.close();
  return {
    ad: y.ad, ag: y.ag, tempo_sn: y.tempo_ms/1000, onden: y.q.onden, kume: y.q.kume,
    ilk_durak_hazir_sn: +(ilk/1000).toFixed(2),
    takilma_adet: g.takilma.length,
    takilma_toplam_sn: +(takToplam/1000).toFixed(2),
    takilma_araliklari: g.takilma.map(x=>`${x.bas_durak}→${x.bit_durak}:${x.ms}ms`),
    varis_toplam: g.varis.length,
    varis_hazir: g.varis.filter(v=>v.hazirdi).length,
    hazirsiz_duraklar: g.varis.filter(v=>!v.hazirdi).map(v=>v.durak),
    durak_inme_sn_p50: yuzde(g.durakIz.map(x=>x.sure/1000),0.5),
    durak_inme_sn_p95: yuzde(g.durakIz.map(x=>x.sure/1000),0.95),
    inen_durak: g.durakIz.length, birakilan: g.birakilan,
    atlama_yuzde: istekK.size ? +(100*(1-kesisim/istekK.size)).toFixed(1) : null,
    istenen_kare: istekK.size, sunulan_kare: sunumK.size,
    kare_suresi_p95: yuzde(arali,0.95),
    kapi_sapma: kapi.sapma, bayt_mb: +(bayt/1048576).toFixed(1),
    uyari: uyari.concat(g.uyari||[]),
  };
}

const YAP = [];
// tempo: 50 sn'lik zincir kac saniyede geciliyor (40 = agir okuma, 20 = normal, 10 = hizli)
for (const ag of ['4G-12Mbit','4G-yavas-4Mbit'])
  for (const tempo of [40000, 20000, 10000])
    for (const onden of [1, 2])
      YAP.push({ ad:`mobil-${ag}-t${tempo/1000}-on${onden}`, ag, mobil:true, cpu:4, tempo_ms:tempo,
                 q:{ kume:'mobil', adet:10, onden, sn:5 } });
// masaustu kiyas
for (const ag of ['4G-12Mbit','4G-yavas-4Mbit'])
  for (const tempo of [40000, 20000])
    YAP.push({ ad:`masaustu-${ag}-t${tempo/1000}-on2`, ag, mobil:false, cpu:1, tempo_ms:tempo,
               q:{ kume:'masaustu', adet:10, onden:2, sn:5 } });

(async () => {
  const srv = await sunucu(KOK, PORT);
  const secim = process.argv[2];
  const liste = secim ? YAP.filter(y=>y.ad.includes(secim)) : YAP;
  const hepsi = [];
  for (const y of liste){
    process.stdout.write(`>> ${y.ad} ... `);
    try { const r = await kos(y); hepsi.push(r); console.log(`takilma ${r.takilma_adet} (${r.takilma_toplam_sn} sn) · atlama ${r.atlama_yuzde}%`); }
    catch(e){ console.log('HATA '+e.message); hepsi.push({ ad:y.ad, hata:e.message }); }
    fs.writeFileSync(path.join(KOK, process.env.CIKTI || 'sonuc-zincir.json'), JSON.stringify(hepsi,null,1));
  }
  srv.close();
  console.log('TAMAM ->', process.env.CIKTI || 'sonuc-zincir.json');
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
