// PALET DISI ALAN KANITI — etki 'ters' (invert) ile: dikdortgen icinde etki YOK olmali
const pt = require('puppeteer-core');
const http = require('http'), fs = require('fs'), path = require('path');
const sharp = require('C:/projeler2/qanatone/yeni/node_modules/sharp');
const KOK = __dirname, CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', PORT = 8934;
const MIME = { '.mp4':'video/mp4','.html':'text/html; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.avif':'image/avif' };

function sunucu(kok, port){ return new Promise(res => { const s = http.createServer((req,rp)=>{
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(kok, u==='/'?'/duzenek.html':u);
  if (!f.startsWith(kok)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){ rp.writeHead(404); return rp.end('yok'); }
  const st=fs.statSync(f), mime=MIME[path.extname(f)]||'application/octet-stream', rng=req.headers.range;
  if (rng){ const m=/bytes=(\d*)-(\d*)/.exec(rng), a=m[1]?+m[1]:0, b=m[2]?+m[2]:st.size-1;
    rp.writeHead(206,{'Content-Type':mime,'Accept-Ranges':'bytes','Content-Range':`bytes ${a}-${b}/${st.size}`,'Content-Length':b-a+1});
    fs.createReadStream(f,{start:a,end:b}).pipe(rp); }
  else { rp.writeHead(200,{'Content-Type':mime,'Accept-Ranges':'bytes','Content-Length':st.size}); fs.createReadStream(f).pipe(rp); }
}); s.listen(port,'127.0.0.1',()=>res(s)); }); }

// terminal segmentindeki ekran dikdortgenleri (duzenek.html CIZELGE ile ayni)
const EKRAN = [[0.08,0.30,0.26,0.30],[0.62,0.24,0.30,0.36]];
const EN = 1200, BOY = 700;

async function ortalama(png, x, y, w, h){
  // DIKKAT: sharp .stats() boru hattini degil GIRDIYI olcer — once tampona yaz
  const kirp = await sharp(png).extract({ left:Math.round(x*EN), top:Math.round(y*BOY), width:Math.round(w*EN), height:Math.round(h*BOY) }).toBuffer();
  const st = await sharp(kirp).stats();
  return +(st.channels.slice(0,3).reduce((a,c)=>a+c.mean,0)/3).toFixed(1);
}

(async () => {
  const srv = await sunucu(KOK, PORT);
  const b = await pt.launch({ executablePath:CHROME, headless:'new', args:['--no-sandbox'] });
  const cikti = {};
  for (const [ad, q] of [
    ['kare',  { mod:'kare',  kset:'webp75-1280', palet:'evet', petki:'ters' }],
    ['video', { mod:'video', vset:'g6_1080p',    palet:'evet', petki:'ters' }],
    ['kare-paletsiz',  { mod:'kare',  kset:'webp75-1280', palet:'yok' }],
  ]){
    const p = await b.newPage();
    await p.setViewport({ width:EN, height:BOY });
    await p.goto(`http://127.0.0.1:${PORT}/duzenek.html?${new URLSearchParams(q)}`, { waitUntil:'load' });
    await p.waitForFunction('window.OL && OL.hazir', { timeout:120000 });
    await p.evaluate(() => scrollTo(0, 0.80*(document.documentElement.scrollHeight-innerHeight)));
    await new Promise(r=>setTimeout(r, 900));
    const f = path.join(KOK, `kanit-palet-${ad}.png`);
    fs.writeFileSync(f, await p.screenshot());
    cikti[ad] = {
      ekran1: await ortalama(f, EKRAN[0][0]+0.03, EKRAN[0][1]+0.05, EKRAN[0][2]-0.06, EKRAN[0][3]-0.10),
      ekran2: await ortalama(f, EKRAN[1][0]+0.03, EKRAN[1][1]+0.05, EKRAN[1][2]-0.06, EKRAN[1][3]-0.10),
      disari: await ortalama(f, 0.40, 0.62, 0.18, 0.28),
    };
    await p.close();
  }
  console.log(JSON.stringify(cikti, null, 1));
  await b.close(); srv.close();
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
