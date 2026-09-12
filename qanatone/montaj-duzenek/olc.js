// OLCUM KOSUCUSU — her yapilandirma TEK BASINA, taze tarayici + taze sayfa
// (CPU cekismesi kaydi sessizce oldurur: kayitlar seri kosulur)
const pt = require('puppeteer-core');
const http = require('http'), fs = require('fs'), path = require('path');

const KOK = __dirname;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8932;

const MIME = { '.mp4':'video/mp4','.html':'text/html; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg',
               '.png':'image/png','.avif':'image/avif','.js':'text/javascript','.json':'application/json' };

function sunucu(kok, port){
  return new Promise(res => {
    const s = http.createServer((req, rp) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const f = path.join(kok, u === '/' ? '/duzenek.html' : u);
      if (!f.startsWith(kok) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ rp.writeHead(404); return rp.end('yok'); }
      const st = fs.statSync(f), mime = MIME[path.extname(f)] || 'application/octet-stream';
      const rng = req.headers.range;
      if (rng){
        const m = /bytes=(\d*)-(\d*)/.exec(rng);
        const a = m[1] ? +m[1] : 0, b = m[2] ? +m[2] : st.size-1;
        rp.writeHead(206, {'Content-Type':mime,'Accept-Ranges':'bytes','Content-Range':`bytes ${a}-${b}/${st.size}`,'Content-Length':b-a+1,'Cache-Control':'no-store'});
        fs.createReadStream(f,{start:a,end:b}).pipe(rp);
      } else {
        rp.writeHead(200, {'Content-Type':mime,'Accept-Ranges':'bytes','Content-Length':st.size,'Cache-Control':'no-store'});
        fs.createReadStream(f).pipe(rp);
      }
    });
    s.listen(port,'127.0.0.1',()=>res(s));
  });
}

/* ---------- olcut hesaplari ---------- */
const yuzde = (a,p) => { if(!a.length) return null; const b=[...a].sort((x,y)=>x-y); return +b[Math.min(b.length-1, Math.floor(p*b.length))].toFixed(2); };

function olcutler(g){
  const raf = g.raf, arali = [];
  for (let i=1;i<raf.length;i++) arali.push(raf[i]-raf[i-1]);
  const istekK = new Set(g.istek.map(r=>r.klip+'#'+r.kare));
  const sunumK = new Set(g.sunum.map(r=>r.klip+'#'+r.kare));
  let kesisim = 0; for (const k of istekK) if (sunumK.has(k)) kesisim++;

  // sunulan kareler arasi en buyuk sicrayis (klip ici, zaman sirali)
  let maxBosluk = 0;
  const perKlip = {};
  for (const s of g.sunum){ (perKlip[s.klip] ||= []).push(s.kare); }
  for (const k in perKlip){ const a=perKlip[k]; for(let i=1;i<a.length;i++) maxBosluk = Math.max(maxBosluk, Math.abs(a[i]-a[i-1])); }

  // gorsel gecikme: sunum aninda istenen kare ile sunulan kare farki
  const gecikme = [];
  let j = 0;
  const istekSirali = [...g.istek].sort((a,b)=>a.t-b.t);
  for (const s of [...g.sunum].sort((a,b)=>a.t-b.t)){
    while (j+1 < istekSirali.length && istekSirali[j+1].t <= s.t) j++;
    const r = istekSirali[j];
    if (r && r.klip === s.klip) gecikme.push(Math.abs(r.kare - s.kare));
  }
  const sure = raf.length > 1 ? (raf[raf.length-1]-raf[0])/1000 : 0;
  return {
    raf_sayi: raf.length, supurme_sn: +sure.toFixed(2),
    istenen_fps: sure ? +(istekK.size/sure).toFixed(1) : null,
    sunulan_fps: sure ? +(sunumK.size/sure).toFixed(1) : null,
    kare_suresi_p50: yuzde(arali,0.50), kare_suresi_p95: yuzde(arali,0.95),
    uzun_kare_50ms: arali.filter(x=>x>50).length,
    istenen_kare: istekK.size, sunulan_kare: sunumK.size,
    atlama_yuzde: istekK.size ? +(100*(1-kesisim/istekK.size)).toFixed(1) : null,
    max_bosluk_kare: maxBosluk,
    gecikme_p50: yuzde(gecikme,0.50), gecikme_p95: yuzde(gecikme,0.95),
    cizim_p50: yuzde(g.ciz,0.50), cizim_p95: yuzde(g.ciz,0.95),
  };
}

/* ---------- tek yapilandirma ---------- */
async function kos(y){
  const b = await pt.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox','--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=1'] });
  const p = await b.newPage();
  const uyari = [];
  p.on('pageerror', e => uyari.push('sayfa hatasi: '+String(e).slice(0,120)));
  await p.setViewport({ width:y.en, height:y.boy, deviceScaleFactor:y.dsf||1, isMobile:!!y.mobil, hasTouch:!!y.mobil });
  const cdp = await p.createCDPSession();
  if (y.cpu && y.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: y.cpu });
  if (y.ag) { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline:false, latency:y.ag.gecikme, downloadThroughput:y.ag.indir, uploadThroughput:y.ag.yukle }); }

  const url = `http://127.0.0.1:${PORT}/duzenek.html?${new URLSearchParams(y.q).toString()}`;
  const tYuk = Date.now();
  await p.goto(url, { waitUntil:'load', timeout:60000 });
  await p.waitForFunction('window.OL && OL.hazir', { timeout: 120000 }).catch(()=>uyari.push('HAZIR OLMADI'));
  const hazir = await p.evaluate(() => ({ hazirMs: Math.round(OL.hazirMs), bayt: OL.bayt, uyari: OL.uyari }));

  const sonuc = { ad:y.ad, q:y.q, ortam:{ en:y.en, boy:y.boy, dsf:y.dsf||1, cpu:y.cpu||1, mobil:!!y.mobil, ag:y.ag?y.ag.ad:'sinirsiz' },
                  yukleme:{ ...hazir, duvarMs: Date.now()-tYuk }, supurmeler:{} };

  for (const s of [ {ad:'hizli_ileri', ms:5000, geri:false}, {ad:'hizli_geri', ms:5000, geri:true}, {ad:'yavas_ileri', ms:15000, geri:false} ]){
    await p.evaluate((geri) => { scrollTo(0, geri ? document.documentElement.scrollHeight : 0); }, s.geri);
    await new Promise(r=>setTimeout(r, 900));
    await p.evaluate(() => SIFIRLA());
    const kapi = await p.evaluate((ms,geri) => SUPUR(ms,geri), s.ms, s.geri);
    await new Promise(r=>setTimeout(r, 300));
    await p.evaluate(() => DUR());
    const g = await p.evaluate(() => ({ raf:OL.raf, istek:OL.istek, sunum:OL.sunum, ciz:OL.ciz, cozIsabetsiz:OL.cozIsabetsiz, cozBekleme:OL.cozBekleme }));
    const vk = await p.evaluate(() => {
      const v = [...document.querySelectorAll('video')];
      if (!v.length) return null;
      return v.map(x => { const q = x.getVideoPlaybackQuality ? x.getVideoPlaybackQuality() : null; return q ? { toplam:q.totalVideoFrames, dusen:q.droppedVideoFrames } : null; });
    });
    sonuc.supurmeler[s.ad] = { kapi, ...olcutler(g), cozIsabetsiz:g.cozIsabetsiz, cozBekleme:g.cozBekleme, videoKalite:vk };
  }
  // gorsel dogrulama: her yapilandirmadan uc durak karesi (duzenek kendini dogrular)
  const kd = path.join(KOK, 'kare-kanit'); fs.mkdirSync(kd, { recursive:true });
  const damga = [];
  for (const [ad, oran] of [['klip1',0.12],['3b',0.40],['ekran',0.80]]){
    await p.evaluate(o => scrollTo(0, o*(document.documentElement.scrollHeight-innerHeight)), oran);
    await new Promise(r=>setTimeout(r, 700));
    const png = await p.screenshot();
    const f = path.join(kd, `${y.ad}-${ad}.png`);
    fs.writeFileSync(f, png);
    damga.push({ ad, bayt: png.length });
  }
  sonuc.kanit = damga;
  sonuc.uyari = uyari.concat(hazir.uyari || []);
  await b.close();
  return sonuc;
}

/* ---------- yapilandirmalar ---------- */
const M = { en:1440, boy:900, dsf:1 };
const T = { en:412, boy:892, dsf:2, mobil:true, cpu:4 };
// gercekci mobil hat: 12 Mbit indirme, 60 ms gidis-donus
const AG4G = { ad:'4G-12Mbit', indir: 12e6/8, yukle: 3e6/8, gecikme: 60 };

const YAP = [
  { ad:'M-video-g24-1080', ...M, q:{ mod:'video', vset:'g24_1080p', palet:'yok' } },
  { ad:'M-video-g12-1080', ...M, q:{ mod:'video', vset:'g12_1080p', palet:'yok' } },
  { ad:'M-video-g6-1080',  ...M, q:{ mod:'video', vset:'g6_1080p',  palet:'yok' } },
  { ad:'M-video-g1-1080',  ...M, q:{ mod:'video', vset:'g1_1080p',  palet:'yok' } },
  { ad:'M-video-g6-bekle', ...M, q:{ mod:'video', vset:'g6_1080p',  palet:'yok', sar:'bekle' } },
  { ad:'M-kare-webp75-1920', ...M, q:{ mod:'kare', kset:'webp75-1920', palet:'yok' } },
  { ad:'M-kare-webp75-1280', ...M, q:{ mod:'kare', kset:'webp75-1280', palet:'yok' } },
  { ad:'M-video-g6-palet', ...M, q:{ mod:'video', vset:'g6_1080p', palet:'evet' } },
  { ad:'M-kare-1280-palet', ...M, q:{ mod:'kare', kset:'webp75-1280', palet:'evet' } },

  { ad:'T-video-g24-720', ...T, q:{ mod:'video', vset:'g24_720p', palet:'yok' } },
  { ad:'T-video-g6-720',  ...T, q:{ mod:'video', vset:'g6_720p',  palet:'yok' } },
  { ad:'T-kare-webp60-1280', ...T, q:{ mod:'kare', kset:'webp60-1280', palet:'yok' } },
  { ad:'T-video-g6-palet', ...T, q:{ mod:'video', vset:'g6_720p', palet:'evet' } },
  { ad:'T-kare-1280-palet', ...T, q:{ mod:'kare', kset:'webp60-1280', palet:'evet' } },

  { ad:'A-video-g6-1080',  ...M, ag:AG4G, q:{ mod:'video', vset:'g6_1080p',  palet:'yok' } },
  { ad:'A-video-g24-1080', ...M, ag:AG4G, q:{ mod:'video', vset:'g24_1080p', palet:'yok' } },
  { ad:'A-kare-webp75-1280', ...M, ag:AG4G, q:{ mod:'kare', kset:'webp75-1280', palet:'yok' } },
  { ad:'A-kare-webp60-1280', ...M, ag:AG4G, q:{ mod:'kare', kset:'webp60-1280', palet:'yok' } },

  // capraz: cozunurluk mu, cihaz kisitlamasi mi? aynı GOP iki cozunurlukte, iki ortamda
  { ad:'X-M-video-g24-720',  ...M, q:{ mod:'video', vset:'g24_720p',  palet:'yok' } },
  { ad:'X-M-video-g6-720',   ...M, q:{ mod:'video', vset:'g6_720p',   palet:'yok' } },
  { ad:'X-T-video-g24-1080', ...T, q:{ mod:'video', vset:'g24_1080p', palet:'yok' } },
  { ad:'X-T-video-g6-1080',  ...T, q:{ mod:'video', vset:'g6_1080p',  palet:'yok' } },

  // sarma disiplini hipotezi: naif "her rAF sar" mi bogyor, cihaz mi?
  { ad:'Y-M-video-g24-720-bekle',  ...M, q:{ mod:'video', vset:'g24_720p',  palet:'yok', sar:'bekle' } },
  { ad:'Y-M-video-g24-1080-bekle', ...M, q:{ mod:'video', vset:'g24_1080p', palet:'yok', sar:'bekle' } },
  { ad:'Y-T-video-g24-720-hemen',  ...T, q:{ mod:'video', vset:'g24_720p',  palet:'yok' } },
  { ad:'Y-M-video-g24-720-cpu4',   ...M, cpu:4, q:{ mod:'video', vset:'g24_720p', palet:'yok' } },
];

// tekrarli tur: video sarma olcutu tek kosumda gurultulu (ayni yapilandirma 8% ve 37% verdi)
const PALETODAK = ['M-video-g6-palet','M-kare-1280-palet','T-video-g6-palet','T-kare-1280-palet',
                  'M-video-g6-1080','M-kare-webp75-1280','T-video-g6-720','T-kare-webp60-1280'];
const ODAK = [
  'M-video-g24-1080','M-video-g12-1080','M-video-g6-1080','M-video-g1-1080','M-video-g6-bekle',
  'X-M-video-g24-720','X-M-video-g6-720','Y-M-video-g24-720-bekle',
  'T-video-g24-720','T-video-g6-720',
  'M-kare-webp75-1280','T-kare-webp60-1280',
];

(async () => {
  const srv = await sunucu(KOK, PORT);
  const secim = process.argv[2];
  const tekrar = +(process.env.TEKRAR || 1);
  let taban = secim === 'PALET' ? PALETODAK.map(a => YAP.find(y => y.ad === a))
            : secim === 'ODAK' ? ODAK.map(a => YAP.find(y => y.ad === a))
            : secim ? YAP.filter(y => secim.split(',').some(k => y.ad.includes(k))) : YAP;
  if (taban.some(x => !x)) throw new Error('ODAK listesinde bilinmeyen ad');
  const liste = [];
  for (let t = 1; t <= tekrar; t++) for (const y of taban) liste.push({ ...y, ad: y.ad + (tekrar>1 ? '#'+t : '') });
  const hepsi = [];
  for (const y of liste){
    process.stdout.write(`>> ${y.ad} ... `);
    try { const r = await kos(y); hepsi.push(r); console.log('bitti'); }
    catch (e){ console.log('HATA ' + e.message); hepsi.push({ ad:y.ad, hata:e.message }); }
    fs.writeFileSync(path.join(KOK, process.env.CIKTI || 'sonuc.json'), JSON.stringify(hepsi, null, 1));
    await new Promise(r=>setTimeout(r, 700));
  }
  srv.close();
  console.log('TAMAM ->', path.join(KOK,'sonuc.json'));
})();
