#!/usr/bin/env node
/* ANA SAYFA GIRISININ YAPISI — TESHIS ARACI, KAPI DEGIL (7 Eyl 2026).

   SORU (Enes): "brave'de kasmiyor chrome'da kasiyor, bu mimari bir hata."
   Iki tarayici da Chromium; ayni kod ayni motorda kosuyor. O halde fark ya
   TARAYICI YAPILANDIRMASINDA (GPU ozellik durumu) ya da bizim sayfamizin
   O yapilandirmada farkli bir yola dusmesinde.

   NEDEN BU ARAC ZAMANLAMA OLCMUYOR. Kare zamanlamasi (Kapi A) yabanci bir
   tarayici acikken hukumsuzdur — ayni GPU/kompozitor hattini paylasirlar
   (olculdu, [[qanatone-kapi-a-yuk-tuzagi]]). Enes siteyi Chrome'da
   incelerken makine hic temiz olmuyor. Bu arac YAPISAL sayilar cikarir:
   katman sayisi, katman alani, kompozit edilme SEBEBI, ayni anda kosan
   animasyon sayisi, GPU ozellik durumu. Bunlar makine mesgulken de ayni
   sayiyi verir — yani hukum verilebilir.

   OLCTUKLERI:
     · gpu        WebGL renderer kimligi (yazilim geri dususu burada
                  gorunur: SwiftShader / ANGLE Software / llvmpipe)
     · katman     CDP LayerTree: her kompozit katmanin boyu ve boyama
                  sayisi + KOMPOZIT SEBEBI (neden ayri katman oldu)
     · animasyon  document.getAnimations(): ayni anda kosan animasyon
                  sayisi ve hangileri ana iplikte (kompozit edilemeyen
                  ozellik animasyonlari stil/yerlesim isi uretir)
   Kapsam: yalniz ana sayfa GIRISI (hero), yalniz masaustu — Enes'in
   tarifi bu ("son 24 saatte sadece masaustu anasayfa giris kismini
   degistirdik").                                                       */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const YOL = process.env.SAYFA_YOL || '/';
const EN = Number(process.env.EN || 1920);
const BOY = Number(process.env.BOY || 1080);
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-katman.json');

/* prologu atla: hero'yu olcmek icin film katmaninin kalkmis olmasi gerek;
   kapiyi ZORLAMAZ, sitenin kendi atlama yolunu kullanir */
const ATLA = "try{sessionStorage.setItem('qanat-prolog-atlandi','1')}catch(e){}";

async function gpuDurumu(tarayici) {
  /* chrome://gpu ICERIGI SHADOW DOM'DA — innerText onu delmez, ilk yazimda
     bos dondu. Yerine tarayicinin KENDI kimligi sorulur: WebGL renderer
     dizesi yazilim geri dususunu acikca soyler (SwiftShader / ANGLE
     Software / llvmpipe). Kaynak dogrudan, ayristirma yok. */
  const p = await tarayici.newPage();
  try {
    await p.goto('data:text/html,<canvas id=c></canvas>', { waitUntil: 'domcontentloaded' });
    return await p.evaluate(() => {
      const c = document.getElementById('c');
      const bilgi = {};
      for (const tip of ['webgl2', 'webgl']) {
        const g = c.getContext(tip);
        if (!g) { bilgi[tip] = 'baglam YOK'; continue; }
        const d = g.getExtension('WEBGL_debug_renderer_info');
        bilgi[tip] = d ? `${g.getParameter(d.UNMASKED_VENDOR_WEBGL)} | ${g.getParameter(d.UNMASKED_RENDERER_WEBGL)}` : `${g.getParameter(g.VENDOR)} | ${g.getParameter(g.RENDERER)}`;
      }
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: false });
      bilgi.canvas2d_hizlandirilmis = !!(cv && cv.getContextAttributes && cv.getContextAttributes().willReadFrequently === false);
      return bilgi;
    });
  } catch (e) { return { hata: String(e).slice(0, 120) }; }
  finally { await p.close().catch(() => {}); }
}

async function sayfaYapisi(tarayici) {
  const page = await tarayici.newPage();
  await page.evaluateOnNewDocument(ATLA);
  const cdp = await page.createCDPSession();

  const katmanlar = [];
  cdp.on('LayerTree.layerTreeDidChange', (e) => { katmanlar.length = 0; (e.layers || []).forEach((l) => katmanlar.push(l)); });

  await page.goto(`${SUNUCU}${YOL}`, { waitUntil: 'load', timeout: 45000 });
  /* hero yerlesip animasyonlar dogsun; kaydirma YOK — giris hali olculuyor */
  await new Promise((r) => setTimeout(r, 3500));
  /* LayerTree.enable NAVIGASYONDAN SONRA: acilis olayi ancak boyle yakalanir
     (ilk yazimda once acilmisti ve olay kacip katman 0 gorunmustu — rig
     hatasi, "katman yok" degil). */
  await cdp.send('LayerTree.enable');
  await new Promise((r) => setTimeout(r, 2500));

  /* kompozit sebepleri VE KATMANIN SAHIBI. "36,88 MP'lik bir Overlap
     katmani var" bir bulgu degil; bulgunun tamami "SU eleman yuzunden
     var"dir. backendNodeId -> gercek secici. */
  await cdp.send('DOM.enable').catch(() => {});
  await cdp.send('DOM.getDocument', { depth: -1 }).catch(() => {});
  const sebepli = [];
  for (const l of katmanlar.slice(0, 60)) {
    let sebep = [];
    try {
      const r = await cdp.send('LayerTree.compositingReasons', { layerId: l.layerId });
      sebep = r.compositingReasonIds || r.compositingReasons || [];
    } catch (e) {}
    let sahip = null;
    if (l.backendNodeId) {
      try {
        const d = await cdp.send('DOM.describeNode', { backendNodeId: l.backendNodeId });
        const n = d.node || {};
        const oz = {};
        for (let i = 0; i < (n.attributes || []).length; i += 2) oz[n.attributes[i]] = n.attributes[i + 1];
        sahip = (n.nodeName || '?').toLowerCase()
          + (oz.id ? '#' + oz.id : '')
          + (oz.class ? '.' + String(oz.class).trim().split(/\s+/).slice(0, 3).join('.') : '');
      } catch (e) { sahip = 'cozulemedi'; }
    }
    sebepli.push({
      sahip, en: Math.round(l.width), boy: Math.round(l.height),
      alan_mp: Number(((l.width * l.height) / 1e6).toFixed(2)),
      cizer: l.drawsContent, boyama: l.paintCount, sebep,
    });
  }

  const olcum = await page.evaluate(() => {
    const an = document.getAnimations();
    const ozet = an.map((a) => {
      const e = a.effect; const t = e && e.target;
      let ad = '?';
      if (t && t.tagName) ad = t.tagName.toLowerCase() + (t.id ? '#' + t.id : '') + (t.className && typeof t.className === 'string' ? '.' + t.className.trim().split(/\s+/).join('.') : '');
      let ozellikler = [];
      try { ozellikler = [...new Set(e.getKeyframes().flatMap((k) => Object.keys(k)))].filter((k) => !['offset', 'composite', 'computedOffset', 'easing'].includes(k)); } catch (err) {}
      return { ad: ad.slice(0, 70), durum: a.playState, zaman_cizelgesi: a.timeline && a.timeline.constructor ? a.timeline.constructor.name : '?', ozellikler };
    });
    const kosan = ozet.filter((o) => o.durum === 'running');
    /* kompozit EDILEMEYEN ozellik animasyonlari: her karede stil/yerlesim
       veya boyama isi uretir. transform/opacity/filter disi her sey. */
    const KOMPOZIT = new Set(['transform', 'opacity', 'filter', 'backdropFilter', 'rotate', 'scale', 'translate', 'offsetDistance']);
    const anaIplik = kosan.filter((o) => o.ozellikler.some((p) => !KOMPOZIT.has(p)));
    return {
      animasyon_toplam: an.length, animasyon_kosan: kosan.length,
      ana_iplikte: anaIplik.length, ana_iplik_ornek: anaIplik.slice(0, 12),
      kaydirma_cizelgeli: kosan.filter((o) => /Scroll|View/.test(o.zaman_cizelgesi)).length,
      kosan_ornek: kosan.slice(0, 18),
      data_film: document.documentElement.dataset.film || null,
      html_sinif: document.documentElement.className,
      dpr: devicePixelRatio, en: innerWidth, boy: innerHeight,
    };
  });

  await cdp.detach().catch(() => {});
  await page.close().catch(() => {});
  /* RIG DOGRULAMASI: bir sayfada SIFIR kompozit katman olamaz (en az kok
     kaydirma katmani vardir). Sifir gorurse arac bunu "katman yok" diye
     DEGIL, olculemedi diye yazar. */
  return { katmanlar: sebepli, katman_olculdu: sebepli.length > 0, ...olcum };
}

(async () => {
  const secim = (process.env.TARAYICILAR || 'brave,chrome').split(',');
  const sonuc = { _: 'olc-katman.cjs — YAPISAL teshis, kapi degil. Zamanlama olcmez; yabanci tarayici acikken de gecerlidir.', olcum: new Date().toISOString(), yol: YOL, pencere: `${EN}x${BOY}`, tarayici: {} };
  for (const ad of secim) {
    const exe = TARAYICILAR[ad];
    if (!exe || !fs.existsSync(exe)) { console.log(`${ad}: TARAYICI YOK`); continue; }
    const b = await pt.launch({ executablePath: exe, headless: false,
      args: ['--no-first-run', '--no-default-browser-check'],
      defaultViewport: { width: EN, height: BOY } });
    try {
      const gpu = await gpuDurumu(b);
      const yapi = await sayfaYapisi(b);
      sonuc.tarayici[ad] = { surum: await b.version(), gpu, ...yapi };
      console.log(`\n===== ${ad.toUpperCase()} · ${await b.version()} =====`);
      console.log(`pencere ${yapi.en}x${yapi.boy} dpr ${yapi.dpr} · data-film ${yapi.data_film} · html "${yapi.html_sinif}"`);
      console.log('GPU KIMLIGI:');
      for (const [k, v] of Object.entries(gpu)) console.log(`   ${k}: ${v}`);
      const kat = yapi.katmanlar;
      const alan = kat.reduce((t, k) => t + k.alan_mp, 0);
      console.log(`KATMAN: ${kat.length} adet · toplam ${alan.toFixed(2)} megapiksel${yapi.katman_olculdu ? '' : '  !! OLCULEMEDI (rig), "katman yok" DEGIL'}`);
      kat.sort((a, b2) => b2.alan_mp - a.alan_mp).slice(0, 12)
        .forEach((k) => console.log(`   ${String(k.en).padStart(5)}x${String(k.boy).padEnd(6)} ${String(k.alan_mp).padStart(6)} MP · cizer ${k.cizer ? 'E' : 'h'} · boyama ${k.boyama} · ${String(k.sahip).padEnd(28)} ${k.sebep.join(',').slice(0, 46)}`));
      console.log(`ANIMASYON: toplam ${yapi.animasyon_toplam} · kosan ${yapi.animasyon_kosan} · ANA IPLIKTE ${yapi.ana_iplikte} · kaydirma cizelgeli ${yapi.kaydirma_cizelgeli}`);
      yapi.ana_iplik_ornek.forEach((o) => console.log(`   ana iplik: ${o.ad} [${o.ozellikler.join(',')}]`));
    } finally { await b.close().catch(() => {}); }
  }
  fs.writeFileSync(CIKTI, JSON.stringify(sonuc, null, 1));
  console.log(`\n→ ${CIKTI}`);
})();
