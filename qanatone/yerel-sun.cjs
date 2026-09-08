#!/usr/bin/env node
/* yerel-sun.cjs — YALNIZ yerel sunum icin statik sunucu (netlify dev'in
   hedefi). Yayinda kullanilmaz, derlemeye girmez.

   NEDEN VAR: netlify-cli 27.1.2'nin kendi statik sunucusu bu makinede
   ALT DIZIN isteklerine 403 donuyor (kok dosyalar 200) — /projeler/,
   /yeni/projeler/, hatta /yeni/img/... hepsi Forbidden. Statik sunum bu
   betige devredildi; netlify dev vekil olarak KALIYOR, yani _redirects,
   _headers ve netlify/functions gercek yayindaki gibi calisiyor.

   Dizin istegi index.html'e duser (Netlify'in davranisi) ve metin
   varliklar gzip'lenir — olcum duzeniyle ayni. */
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const KOK = path.join(__dirname, 'dist');
const PORT = +(process.env.YEREL_PORT || 8790);
const TIP = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.json':'application/json', '.xml':'application/xml', '.txt':'text/plain; charset=utf-8', '.md':'text/markdown; charset=utf-8',
  '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg',
  '.ico':'image/x-icon', '.woff2':'font/woff2', '.webmanifest':'application/manifest+json',
  /* video: MIME olmadan tarayici klibi oynatmaz (film adasi) */
  '.mp4':'video/mp4', '.m4v':'video/mp4', '.webm':'video/webm', '.avif':'image/avif' };
const GZIP = new Set(['.html','.js','.mjs','.css','.json','.xml','.txt','.md','.svg','.webmanifest']);

const coz = (u) => {
  const guvenli = path.normalize(path.join(KOK, decodeURIComponent(u.split('?')[0])));
  if (!guvenli.startsWith(KOK)) return null;                 /* disari cikma */
  for (const aday of [guvenli, path.join(guvenli, 'index.html'), guvenli + '.html'])
    try { if (fs.statSync(aday).isFile()) return aday; } catch {}
  return null;
};

/* _HEADERS UYGULANIR (gece zinciri tur 3, 2 Eyl): kok `_headers` dosyasi
   okunur, desen (`*` joker) eslesen yollara basliklar basilir — Netlify'in
   yaptigi gibi, sonraki blok oncekini ezer. Eslesmeyen: Netlify HTML
   varsayilani (max-age=0, must-revalidate + ETag -> 304). Boylece "ikinci
   sayfa bayti" olcumu yayindaki onbellek davranisini gorur; eskiden hepsi
   no-store idi ve her sayfa her seyi yeniden indiriyordu (olculdu: 616 KB). */
const KURAL = (() => {
  try {
    const out = []; let cur = null;
    for (const ham of fs.readFileSync(path.join(__dirname, '_headers'), 'utf8').split(/\r?\n/)) {
      const l = ham.replace(/#.*$/, '').replace(/\s+$/, '');
      if (!l.trim()) continue;
      if (!/^\s/.test(l)) { cur = { re: new RegExp('^' + l.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'), h: {} }; out.push(cur); }
      else if (cur) { const i = l.indexOf(':'); if (i > 0) cur.h[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); }
    }
    return out;
  } catch (e) { return []; }
})();
const basliklar = (u) => { const h = {}; for (const k of KURAL) if (k.re.test(u)) Object.assign(h, k.h); return h; };

/* ---- GERCEK CIHAZ TESHISI (8 Eyl 2026) — YALNIZ YEREL, YAYINA GIRMEZ ----
   Enes: "mobilde zoom yapinca yine sayfa hata veriyor." Masaustu emulasyonu
   cokmeyi yeniden uretemedi (12 pinch kademesi, olcek 5'e kadar, sekme sag
   kaldi) — telefonun bellek tavanini taklit etmiyor. O yuzden olcum GERCEK
   CIHAZDA yapilir ve deney TEK DEGISKENLI olur:
     ?tani=1        -> sayfa bugunku haliyle, telemetri acik
     ?tani=1&bg=0   -> AYNI sayfa, yalniz `#bg` gizli (supheli katman yok)
   Ayni telefon, ayni tur, iki kol. Birinde cokup otekinde cokmuyorsa
   mekanizma KANITLANIR; ikisinde de cokuyorsa suphe duser.

   Telemetri her 500 ms'de bir OLCER ve `sendBeacon` ile buraya yollar —
   yani son paket COKMEDEN HEMEN ONCEKI durumdur: gorsel olcek, bellek,
   kaydirma konumu, dugum sayisi. Cokme kaydi kaybolmaz.
   Kayit dosyaya yazilir: yeni/film/_tani-cihaz.jsonl                     */
const TANI_KAYIT = path.join(__dirname, 'yeni', 'film', '_tani-cihaz.jsonl');
/* ERKEN PARCA — `<head>`'in EN BASINA girer, prolog ve hero kurulmadan once.
   9 Eyl: kol CSS'i onceden `</body>` sonunda uygulaniyordu, yani her kol
   sayfayi ONCE tam haliyle kurup SONRA katmani kaldiriyordu; ustelik prolog
   filmi her kolda ayri suruyordu. Ikisi de kollari birbirinden farkli
   BASLANGIC durumuna sokar — 8 Eyl'de tam bu yuzden (konum esitsizligi)
   yanlis kok sebep ilan edildi. Kol CSS'i + prolog atlama artik en basta.
   `&prolog=1` ile prolog bilerek acilabilir.                              */
const TANI_ERKEN = `<script>(function(){
 var q=location.search, m=/[?&]kol=([a-z0-9]+)/.exec(q);
 var kol=m?m[1]:(/[?&]bg=0/.test(q)?'bg-kapali':'taban');
 window.__taniKol=kol;
 /* HERO KOLLARI (9 Eyl): 8 Eyl'in bg deneyi HUKUMSUZ cikti — iki kol
    FARKLI KONUMLARDA zoom'lanmisti (y=1383 vs y=3906), yani degisken bg
    degil "hero'da mi zoom yapildi" idi. Enes'in kendi gozlemi de bunu
    soyluyor: "sadece ana sayfanin giris kisminda oluyor". Kollar artik
    HERO'YA OZGU katmanlari tek tek kaldiriyor; her tur AYNI YERDE
    (hero, y yaklasik 0) yapilmali — telemetri y yaziyor, sonra dogrulanir. */
 /* ZEMIN AYRIM KOLLARI (9 Eyl, ikinci tur): zemin tasimasi cokmeyi durdurdu
    ama IKI SEYI BIRDEN kaldirmisti, o yuzden hangisinin suclu oldugu
    bilinmiyor:
      A) KATMAN — #bg fixed oldugu icin ustundeki icerik belge boyu ayri
         kompozit katmana cikiyor (Overlap, 7,35 MP). #bgin ICERIGINDEN
         bagimsiz, yalniz position:fixed olmasindan.
      B) BOYAMA — .gridin mask-image'i + .orb gradyani fixed olduklari
         icin pinch'te her karede olcegin KARESIYLE yeniden rasterleniyor.
    bgbos ikisini ayirir: #bg yerinde kalir (Overlap SURER) ama ici
    bosalir (boyama BITER). Cokerse sebep A, cokmezse sebep B.
    Zemin o turda gorunmez — yalniz teshis kolu, yama degil. */
 var KOL={
  bgbos:'#bg>*{display:none!important}',
  grid:'#bg .grid{display:none!important}',
  gridmask:'#bg .grid{-webkit-mask-image:none!important;mask-image:none!important}',
  orb:'#bg .orb{display:none!important}',
  bg:'#bg{display:none!important}',
  atmo:'.sus-atmo{display:none!important}',
  eller:'.sus-eller{display:none!important}',
  halka:'.sus-halka,.sh-ic::before,.sh-ic::after{display:none!important}',
  durgun:'*,*::before,*::after{animation:none!important;transition:none!important}',
  cip:'#bg,.sus-atmo,.sus-eller{display:none!important}'
 };
 if(KOL[kol]){var st=document.createElement('style');st.setAttribute('data-tani-kol',kol);
   st.textContent=KOL[kol];(document.head||document.documentElement).appendChild(st);}
 /* prolog atlanir: kollar ayni baslangic durumundan zoom'lansin */
 if(!/[?&]prolog=1/.test(q)){try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}}
})();</script>`;

const TANI_BETIK = `<script>(function(){
 var kol=window.__taniKol||'taban';
 var kolTuttu=!!document.querySelector('style[data-tani-kol]')||kol==='taban';
 var t0=Date.now(), n=0, sonHata=null;
 /* COKME IMZASI (9 Eyl): "paket akisi kesildi" tek basina cokme kaniti DEGIL —
    sekme kapanmasi da oyle gorunuyor. Uc alan bunu ayirir:
      nav        navigation tipi; cokme sonrasi Safari'nin geri getirmesi
                 'reload'/'back_forward' olur, Enes'in actigi link 'navigate'
      yuklemeNo  ayni kolda kacinci yukleme — sessionStorage cokmede KORUNUR,
                 yani ayni kolda 2 gorunuyorsa arada bir yeniden yukleme oldu
      acilisOlcek acilista olcek zaten >1 ise onceki oturum cokmus demektir
                 (Safari zoom'u korur) — bu imzayla tur7'nin coktugu anlasildi
    Ayrica yuksekMs: olcek>=4'te gecirilen KUMULATIF sure. Tur ancak bu sure
    tabanin coktugu sureyi (6,6 sn) belirgin asarsa hukum verir; 9 sn'de
    "cokmedi" demek marj icinde kalir.                                       */
 var nav=''; try{var e=performance.getEntriesByType('navigation')[0]; nav=e?e.type:''}catch(e){}
 var yuklemeNo=1; try{var a='qanat-tani-'+kol; yuklemeNo=(+sessionStorage.getItem(a)||0)+1;
   sessionStorage.setItem(a,String(yuklemeNo))}catch(e){}
 var acilisOlcek=(window.visualViewport&&visualViewport.scale)||1;
 var yuksekMs=0, sonTik=Date.now(), sonOlcek=acilisOlcek;
 /* SURUM PARMAK IZI (9 Eyl): telefonun GERCEKTEN olculen surumu calistirdigi
    pakette gorunsun. "Olcum dogru, olculen surum yanlis" tuzagina iki kez
    dusuldu; halka yamasi sonrasi ayni riski tasiyor. halkaEn = .sus-halka
    ::before'un computed genisligi: 1009 = YAMASIZ, 563 = yamali (428 px
    genislikte). Kiyas ancak iki kosumda bu deger BEKLENEN olursa gecerlidir. */
 var halkaEn=null; try{var hh=document.querySelector('.sh-void .sus-halka')||document.querySelector('.sus-halka');
   if(hh)halkaEn=Math.round(parseFloat(getComputedStyle(hh,'::before').width))||null}catch(e){}
 /* zemin yamasi etkin mi: mobilde #bg gizli VE body'de kok zemin olmali */
 var zemin=null; try{var bb=document.getElementById('bg');
   zemin=(bb?(getComputedStyle(bb).display==='none'?'bg-gizli':'bg-acik'):'bg-yok')
     +(getComputedStyle(document.body).backgroundImage!=='none'?'+kok':'')}catch(e){}
 addEventListener('error',function(e){sonHata=String(e.message||e.type).slice(0,120)},true);
 function paket(sebep){
  var vv=window.visualViewport||{};
  var m=(performance&&performance.memory)||{};
  var simdi=Date.now();
  if(sonOlcek>=4)yuksekMs+=simdi-sonTik;      /* yuksek olcekte gecen sure birikir */
  sonTik=simdi; sonOlcek=vv.scale||1;
  return {kol:kol,sebep:sebep,n:++n,ms:simdi-t0,
   kolTuttu:kolTuttu, nav:nav, yuklemeNo:yuklemeNo, halkaEn:halkaEn, zemin:zemin,
   acilisOlcek:Number(acilisOlcek.toFixed(2)), yuksekMs:yuksekMs,
   heroda:(scrollY < innerHeight*1.2),
   olcek:vv.scale||null, vvEn:Math.round(vv.width||0), vvBoy:Math.round(vv.height||0),
   dpr:devicePixelRatio, en:innerWidth, boy:innerHeight, y:Math.round(scrollY),
   belge:document.documentElement.scrollHeight,
   dugum:document.getElementsByTagName('*').length,
   yigin:m.usedJSHeapSize?Math.round(m.usedJSHeapSize/1048576):null,
   tavan:m.jsHeapSizeLimit?Math.round(m.jsHeapSizeLimit/1048576):null,
   ua:navigator.userAgent.slice(0,110), bellek:navigator.deviceMemory||null,
   hata:sonHata};
 }
 function yolla(sebep){try{navigator.sendBeacon('/tani-kayit',JSON.stringify(paket(sebep)))}catch(e){}}
 yolla('acilis');
 setInterval(function(){yolla('tik')},500);
 addEventListener('pagehide',function(){yolla('pagehide')});
 addEventListener('visibilitychange',function(){if(document.hidden)yolla('gizlendi')});
 if(window.visualViewport)visualViewport.addEventListener('resize',function(){yolla('olcek')});
})();</script>`;

http.createServer((req, res) => {
  /* telemetri ucu — sendBeacon POST'u */
  if (req.method === 'POST' && req.url.split('?')[0] === '/tani-kayit') {
    let g = '';
    req.on('data', (d) => { if (g.length < 8192) g += d; });
    req.on('end', () => {
      try {
        fs.mkdirSync(path.dirname(TANI_KAYIT), { recursive: true });
        fs.appendFileSync(TANI_KAYIT, JSON.stringify({ t: new Date().toISOString(), veri: JSON.parse(g) }) + '\n');
      } catch (e) {}
      res.writeHead(204); res.end();
    });
    return;
  }
  const f = coz(req.url);
  if (!f) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('yok: ' + req.url); }
  const ext = path.extname(f).toLowerCase();
  const st = fs.statSync(f);
  const etag = '"' + st.size.toString(16) + '-' + Math.floor(st.mtimeMs).toString(16) + '"';
  const yol = decodeURIComponent(req.url.split('?')[0]);
  const ozel = basliklar(yol);
  if (req.headers['if-none-match'] === etag && !/[?&]tani=1/.test(req.url)) { res.writeHead(304, { etag, ...ozel }); return res.end(); }
  let buf = fs.readFileSync(f);
  /* TANI ENJEKSIYONU: yalniz `?tani=1` ile gelen HTML isteklerinde, yalniz
     bu yerel sunucuda. Etag/uzunluk enjeksiyondan SONRA hesaplanir. */
  if (ext === '.html' && /[?&]tani=1/.test(req.url)) {
    let html = buf.toString('utf8');
    /* ERKEN parca `<head>`'in en basina, GEC parca `</body>` oncesine.
       Erken parca yerlesemezse kosum hukumsuzdur — telemetri `kolTuttu`
       yazar, kor karsilastirma yapilmaz. */
    html = html.includes('<head>') ? html.replace('<head>', '<head>' + TANI_ERKEN)
                                   : TANI_ERKEN + html;
    /* `&sessiz=1`: kol CSS'i uygulanir ama TELEMETRI YOLLANMAZ. Headless on
       eleme kosumlarim gercek cihaz kaydini (_tani-cihaz.jsonl) kirletmesin —
       o dosyada yalniz Enes'in telefonundan gelen paketler dursun. */
    if (!/[?&]sessiz=1/.test(req.url)) {
      html = html.includes('</body>') ? html.replace('</body>', TANI_BETIK + '</body>')
                                      : html + TANI_BETIK;
    }
    buf = Buffer.from(html, 'utf8');
  }
  const h = { 'content-type': TIP[ext] || 'application/octet-stream', 'cache-control': 'no-store', etag, ...ozel };
  if (GZIP.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) {
    const g = zlib.gzipSync(buf, { level: 6 });
    res.writeHead(200, { ...h, 'content-encoding': 'gzip', 'content-length': g.length });
    return res.end(g);
  }
  res.writeHead(200, { ...h, 'content-length': buf.length });
  res.end(buf);
}).listen(PORT, '0.0.0.0', () => console.log('yerel-sun ' + PORT + ' -> ' + KOK));
