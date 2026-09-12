// ILK KARE — mobil tek film: ilk kare ne zaman BOYANIYOR, tam tampon ne zaman doluyor
const pt = require('puppeteer-core');
const http = require('http'), fs = require('fs'), path = require('path');
const KOK = __dirname, CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', PORT = 8936;
const MIME = { '.mp4':'video/mp4','.html':'text/html; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.avif':'image/avif' };

function sunucu(kok, port){ return new Promise(res => { const s = http.createServer((req,rp)=>{
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(kok, u==='/'?'/x.html':u);
  if (!f.startsWith(kok)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){ rp.writeHead(404); return rp.end('yok'); }
  const st=fs.statSync(f), mime=MIME[path.extname(f)]||'application/octet-stream', rng=req.headers.range;
  if (rng){ const m=/bytes=(\d*)-(\d*)/.exec(rng), a=m[1]?+m[1]:0, b=m[2]?+m[2]:st.size-1;
    rp.writeHead(206,{'Content-Type':mime,'Accept-Ranges':'bytes','Content-Range':`bytes ${a}-${b}/${st.size}`,'Content-Length':b-a+1,'Cache-Control':'no-store'});
    fs.createReadStream(f,{start:a,end:b}).pipe(rp); }
  else { rp.writeHead(200,{'Content-Type':mime,'Accept-Ranges':'bytes','Content-Length':st.size,'Cache-Control':'no-store'}); fs.createReadStream(f).pipe(rp); }
}); s.listen(port,'127.0.0.1',()=>res(s)); }); }

const AGLAR = {
  'wifi-sinirsiz': null,
  '4G-12Mbit':  { indir: 12e6/8, yukle: 3e6/8,   gecikme: 60 },
  '4G-yavas-4Mbit': { indir: 4e6/8, yukle: 1e6/8, gecikme: 150 },
};

const VIDEO_SAYFA = (yol, onyukle) => `<!doctype html><meta charset=utf-8><body style="margin:0;background:#000">
<video id=v src="${yol}" muted playsinline preload="${onyukle}" style="width:100%;height:100vh;object-fit:cover"></video>
<script>
const t0 = performance.now(); const v = document.getElementById('v');
window.IZ = { t0, loadedmetadata:null, loadeddata:null, ilkKare:null, tamTampon:null, sure:null, hata:null };
v.addEventListener('loadedmetadata', () => { IZ.loadedmetadata = performance.now()-t0; IZ.sure = v.duration; });
v.addEventListener('loadeddata',     () => { IZ.loadeddata = performance.now()-t0; });
v.addEventListener('error', () => IZ.hata = 'video error ' + (v.error && v.error.code));
if ('requestVideoFrameCallback' in v) v.requestVideoFrameCallback(() => { IZ.ilkKare = performance.now()-t0; });
// tam tampon: sarma guvenli hale geldigi an
const bak = setInterval(() => {
  if (!v.duration) return;
  let k = 0; for (let i=0;i<v.buffered.length;i++) k += v.buffered.end(i)-v.buffered.start(i);
  if (k >= v.duration - 0.15){ IZ.tamTampon = performance.now()-t0; clearInterval(bak); }
}, 50);
// ilk kareyi boyatmak icin: preload=metadata'da tarayici kare cozmez, tek kare istegi ver
v.addEventListener('loadedmetadata', () => { try { v.currentTime = 0.04; } catch(e){} }, { once:true });
</script>`;

const DIZI_SAYFA = (set, klip, adet) => `<!doctype html><meta charset=utf-8><body style="margin:0;background:#000">
<canvas id=c width=608 height=1080 style="width:100%;height:100vh"></canvas>
<script>
const t0 = performance.now(); const x = document.getElementById('c').getContext('2d');
window.IZ = { ilkKare:null, tamTampon:null, bayt:0 };
const yol = i => 'malzeme/dizi/${set}/${klip}/k'+String(i).padStart(4,'0')+'.webp';
const im0 = new Image(); im0.src = yol(0);
im0.decode().then(() => { x.drawImage(im0,0,0,608,1080); IZ.ilkKare = performance.now()-t0; }).catch(()=>{});
const hepsi = [];
for (let i=0;i<${adet};i++){ const im = new Image(); im.src = yol(i);
  hepsi.push(new Promise(r => { im.onload = r; im.onerror = r; })); }
Promise.all(hepsi).then(() => {
  IZ.tamTampon = performance.now()-t0;
  IZ.bayt = performance.getEntriesByType('resource').filter(e=>e.name.includes('/dizi/')).reduce((a,e)=>a+(e.encodedBodySize||0),0);
});
</script>`;

async function olc(b, ad, html, agAd, mobil){
  fs.writeFileSync(path.join(KOK,'x.html'), html);
  const p = await b.newPage();
  await p.setViewport(mobil ? { width:412, height:892, deviceScaleFactor:2, isMobile:true, hasTouch:true } : { width:1440, height:900 });
  const cdp = await p.createCDPSession();
  await cdp.send('Network.enable');
  const ag = AGLAR[agAd];
  if (ag) await cdp.send('Network.emulateNetworkConditions', { offline:false, latency:ag.gecikme, downloadThroughput:ag.indir, uploadThroughput:ag.yukle });
  else    await cdp.send('Network.emulateNetworkConditions', { offline:false, latency:0, downloadThroughput:-1, uploadThroughput:-1 });
  let bayt = 0;
  cdp.on('Network.loadingFinished', e => { bayt += e.encodedDataLength || 0; });
  await p.goto(`http://127.0.0.1:${PORT}/x.html`, { waitUntil:'load', timeout:60000 });
  await p.waitForFunction('IZ.tamTampon !== null', { timeout: 180000 }).catch(()=>{});
  await new Promise(r=>setTimeout(r, 400));
  const iz = await p.evaluate(() => IZ);
  await p.close();
  const y = v => v === null || v === undefined ? null : +(v/1000).toFixed(2);
  return { ad, ag:agAd, ilk_kare_sn:y(iz.ilkKare), tam_tampon_sn:y(iz.tamTampon),
           meta_sn:y(iz.loadedmetadata), veri_sn:y(iz.loadeddata), bayt, hata:iz.hata||null };
}

(async () => {
  const srv = await sunucu(KOK, PORT);
  const b = await pt.launch({ executablePath:CHROME, headless:'new', args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
  const cikti = [];
  const filmler = [
    ['dikey 608x1080 g6',  'malzeme/dikey/tekfilm_608x1080_g6.mp4'],
    ['dikey 608x1080 g24', 'malzeme/dikey/tekfilm_608x1080_g24.mp4'],
    ['dikey 540x960 g6',   'malzeme/dikey/tekfilm_540x960_g6.mp4'],
    ['dikey 540x960 g24',  'malzeme/dikey/tekfilm_540x960_g24.mp4'],
    ['dikey 432x768 g24',  'malzeme/dikey/tekfilm_432x768_g24.mp4'],
  ];
  for (const agAd of (process.env.AGLAR || 'wifi-sinirsiz,4G-12Mbit,4G-yavas-4Mbit').split(',')){
    for (const [ad, yol] of filmler){
      for (const onyukle of (process.env.ONYUK || 'auto,metadata').split(',')){
        cikti.push(await olc(b, `${ad} · preload=${onyukle}`, VIDEO_SAYFA(yol, onyukle), agAd, true));
        fs.writeFileSync(path.join(KOK, process.env.CIKTI || 'ilkkare.json'), JSON.stringify(cikti,null,1));
      }
    }
    cikti.push(await olc(b, 'kare dizisi webp60-1280 (kiyas)', DIZI_SAYFA('webp60-1280','k1',120), agAd, true));
    fs.writeFileSync(path.join(KOK, process.env.CIKTI || 'ilkkare.json'), JSON.stringify(cikti,null,1));
  }
  console.log(JSON.stringify(cikti,null,1));
  await b.close(); srv.close();
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
