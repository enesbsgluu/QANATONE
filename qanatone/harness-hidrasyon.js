#!/usr/bin/env node
'use strict';
/* harness-hidrasyon.js — QANATONE statik sayfa hidrasyon kanıt döngüsü
   ---------------------------------------------------------------------
   node harness-hidrasyon.js

   NE ÖLÇER
     denetim.js'in "2 · çalışma zamanı" bölümü YALNIZ kaynağı (index.html)
     jsdom'da açıyor — orada TÜM bölümler zaten DOM'da olduğu için
     kabugu_tamamla() parse'ta hemen dönüyor, shell.html'e HİÇ dokunmuyor.
     "3 · yayın çıktısı" bölümü ise dist içindeki index.html dosyalarını betik ÇALIŞTIRMADAN
     (new JSDOM(html) — runScripts yok) statik metin/attribute olarak okuyor.
     İkisi arasında KÖR NOKTA var: dist/otomasyon/index.html'i GERÇEKTEN
     tarayıcı gibi açıp betiklerini çalıştıran hiçbir ölçüm yoktu.
     Bu dosya tam o kör noktayı ölçer: dist/otomasyon/index.html'i jsdom'da
     runScripts:'dangerously' ile açar, gerçek /shell.html'i fetch'letir,
     boot() bitmesini bekler, sonra:
       A) huni tarifini (kur=[100,50,0,0,0,10] → ₺500.000) kaydırıcı
          input event'leriyle sürer,
       B) window.__chanBuild / window.__tstRender bayraklarının VE onların
          bastığı içeriğin (kanal/söz bandı düğmeleri, söz metni) canlı
          DOM'da var olduğunu doğrular,
       C) ROUTER.boot() sonrası pathname ve görünen bölümün /otomasyon'da
          kaldığını (başka bir rotaya — "ai-ajan" belirtisi — atmadığını)
          doğrular; bu AYRI bir kök nedene bağlı olabilir, burada yalnız
          ÖLÇÜLÜR, çözülmez.

   NASIL ÇALIŞTIRILIR
     node build.js                # önce dist'i üret (bu dosya build.js'in
                                   #   ÜRETTİĞİ dosyaları okur, üretmez)
     node harness-hidrasyon.js

   ÇIKIŞ KODU
     0 = A ve B yeşil · 1 = A veya B kırmızı (C yalnız bilgi amaçlı, çıkış
     kodunu etkilemez — kök nedeni ayrı olabilir, bkz. yukarısı)
   --------------------------------------------------------------------- */

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const KOK = __dirname;
const DIST = path.join(KOK, 'dist');
const ORIGIN = 'https://qanatone.com';
const ROTA = 'otomasyon';   // /otomasyon — huni (#hsSec) burada gömülü basılıyor

let gecti = 0, kaldi = 0, bilgi = 0;
function ol(ad, kosul, ayrinti) {
  const isaret = kosul ? 'ok ' : '!! ';
  console.log('  ' + isaret + ad.padEnd(58) + ' ' + (ayrinti || ''));
  if (kosul) gecti++; else kaldi++;
}
function not(ad, ayrinti) {
  console.log('  ..  ' + ad.padEnd(58) + ' ' + (ayrinti || ''));
  bilgi++;
}

/* ---------- jsdom ortamı ----------
   denetim.js'teki ortam()/sahteCtx() ile AYNI mock'lar: jsdom'da olmayıp
   tarayıcıda olan API'ler (canvas, SVG geometrisi, IO/RO, matchMedia).
   Bilinçli kopya — bu bir test scaffolding'i, üretim şablon üreteci değil;
   tek doğruluk ilkesi üretim kodunun (build.js/kabugu_tamamla) TEK yol
   izlemesiyle ilgili, test ortam mock'ları bunun dışında.               */
function sahteCtx() {
  const g = { addColorStop() {} }, yok = () => {};
  return new Proxy({}, {
    get(t, k) {
      if (/^create(Linear|Radial|Conic)Gradient$|^createPattern$/.test(k)) return () => g;
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData') return (x, y, w, h) =>
        ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
      if (typeof k === 'string' && k in t) return t[k];
      return yok;
    }, set(t, k, v) { t[k] = v; return true; }
  });
}
function ortam(html, url, fetchMock) {
  const hata = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => hata.push(String((e && e.message) || e).slice(0, 200)));
  const dom = new JSDOM(html, {
    url, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.innerWidth = 1440; w.innerHeight = 900; w.devicePixelRatio = 1;
      w.onerror = (m) => hata.push('[onerror] ' + String(m).slice(0, 160));
      w.matchMedia = q => ({ matches: false, media: q, addListener() {}, removeListener() {},
        addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
      w.IntersectionObserver = class { constructor(c) { this.c = c; }
        observe(e) { this.c([{ target: e, isIntersecting: true, intersectionRatio: 1 }], this); }
        unobserve() {} disconnect() {} takeRecords() { return []; } };
      w.ResizeObserver = class { constructor(c) { this.c = c; }
        observe(e) { this.c([{ target: e, contentRect: { width: 1440, height: 400 } }], this); }
        unobserve() {} disconnect() {} };
      w.Path2D = class { constructor() {} addPath() {} closePath() {} moveTo() {} lineTo() {}
        bezierCurveTo() {} quadraticCurveTo() {} arc() {} arcTo() {} ellipse() {} rect() {} roundRect() {} };
      w.SVGElement.prototype.getTotalLength = () => 100;
      w.SVGElement.prototype.getPointAtLength = l => ({ x: l, y: 0 });
      w.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 100, height: 100 });
      w.Element.prototype.getBoundingClientRect = function () {
        return { x: 0, y: 0, top: 0, left: 0, right: 1440, bottom: 400,
                 width: 1440, height: 400, toJSON() { return {}; } };
      };
      w.HTMLCanvasElement.prototype.getContext = t => (t === '2d' ? sahteCtx() : null);
      w.scrollTo = () => {};
      w.fetch = fetchMock;
    }
  });
  return { dom, hata };
}
const dur = ms => new Promise(r => setTimeout(r, ms));

/* window.__contentReady true olana dek bekle (boot() bitişinin damgası);
   yoksa sabit bir süre sonra vazgeç — sonsuz asılı kalmasın.            */
async function hazirOlBekle(w, limitMs) {
  const t0 = Date.now();
  while (!w.__contentReady && Date.now() - t0 < limitMs) await dur(40);
  return !!w.__contentReady;
}

(async function main() {
  console.log('\nharness-hidrasyon — statik sayfa doğrudan yükleme kanıt döngüsü\n');
  console.log(`  rota: /${ROTA}  ·  dist: ${DIST}\n`);

  const otomasyonYolu = path.join(DIST, ROTA, 'index.html');
  const shellYolu = path.join(DIST, 'shell.html');
  if (!fs.existsSync(otomasyonYolu) || !fs.existsSync(shellYolu)) {
    console.error(`  !! dist eksik — önce 'node build.js' çalıştır.\n     aranan: ${otomasyonYolu}\n     aranan: ${shellYolu}`);
    process.exit(1);
  }
  let otomasyonHtml = fs.readFileSync(otomasyonYolu, 'utf8');
  const shellHtml = fs.readFileSync(shellYolu, 'utf8');

  /* 2a — dist sayfaları ana betiği dış dosyadan alır (varlik/app.<hash>.js).
     jsdom dış kaynak yüklemez (resources ayarlı değil); dosya diskten
     okunup ESKİ yerine satır içi geri konur — belge sırası ve koşum anı
     ayrıştırma öncesiyle birebir. Referans YOKSA bu harness kırmızıdır:
     ölçtüğü sözleşme "statik sayfa + DIŞ ana betik hidre olur"
     sözleşmesidir, eski gömülü biçim değil (denetim kural 116 buna yaslanır). */
  const ref = otomasyonHtml.match(/<script src="(varlik\/app\.[0-9a-f]{10}\.js)" defer><\/script>/);
  if (!ref) {
    console.error('  !! dist sayfasında varlik/app.<hash>.js referansı yok — ana betik ayrıştırması (2a) bekleniyordu.');
    process.exit(1);
  }
  const appYolu = path.join(DIST, ref[1]);
  if (!fs.existsSync(appYolu)) {
    console.error(`  !! ${ref[1]} diskte yok — sayfa referans veriyor, dosya eksik.`);
    process.exit(1);
  }
  otomasyonHtml = otomasyonHtml.slice(0, ref.index)
    + '<script>' + fs.readFileSync(appYolu, 'utf8') + '</script>'
    + otomasyonHtml.slice(ref.index + ref[0].length);

  const fetchMock = (u) => {
    const s = String(u);
    if (s.includes('shell.html')) return Promise.resolve({ ok: true, text: () => Promise.resolve(shellHtml) });
    if (s.includes('content.json')) return Promise.reject(new Error('ag yok (harness — kasıtlı, gömülü varsayılanlar ölçülüyor)'));
    return Promise.reject(new Error('ag yok (harness)'));
  };

  const { dom, hata } = ortam(otomasyonHtml, `${ORIGIN}/${ROTA}`, fetchMock);
  const w = dom.window, d = w.document;

  const hazir = await hazirOlBekle(w, 4000);
  ol('boot() tamamlandı (window.__contentReady)', hazir, hazir ? '' : '4000ms içinde gelmedi');
  await dur(200);   // renderAll içindeki guvenli() çağrılarının oturması

  /* ---- A) huni tarifi: statik /otomasyon doğrudan yüklemede ---- */
  console.log('\n  A · huni tarifi (kur=[100,50,0,0,0,10])');
  {
    const el = i => d.getElementById(i);
    const R = [0, 1, 2, 3, 4, 5].map(i => el('hsR' + i));
    if (R.every(x => x)) {
      const kur = [100, 50, 0, 0, 0, 10];
      R.forEach((r, i) => { r.value = String(kur[i]);
        r.dispatchEvent(new w.Event('input', { bubbles: true })); });
      await dur(120);
      const m = id => (el(id) || {}).textContent || '';
      ol('hsPara = ₺500.000 (statik /otomasyon doğrudan yükleme)',
         m('hsPara') === '₺500.000',
         `hsLost=${m('hsLost')} hsPara=${m('hsPara')} hsParaY=${m('hsParaY')}`);
    } else {
      ol('hsPara = ₺500.000 (statik /otomasyon doğrudan yükleme)', false,
         'huni kaydırıcıları DOM\'da yok: ' + R.map((x, i) => x ? '' : 'hsR' + i).filter(Boolean).join(','));
    }
  }

  /* ---- B) bayrak + içerik kanıtı: kabuktan gelen bölümlerin kurulumu ---- */
  console.log('\n  B · bayrak ve içerik kanıtı (kabuktan gelen bölümler)');
  {
    ol('window.__chanBuild tanımlı (süreç hattı, #surec)', typeof w.__chanBuild === 'function',
       typeof w.__chanBuild);
    ol('window.__tstRender tanımlı (söz bandı, #sozband)', typeof w.__tstRender === 'function',
       typeof w.__tstRender);
    const tbNavBtn = d.querySelectorAll('#tbNav button').length;
    const tbQ = ((d.getElementById('tbQ') || {}).textContent || '').trim();
    ol('söz bandı düğmeleri basılmış (#tbNav button > 0)', tbNavBtn > 0, `${tbNavBtn} düğme`);
    ol('söz bandı metni dolu (#tbQ boş değil)', tbQ.length > 0, tbQ.slice(0, 40) || '(boş)');
    const chanNodes = d.querySelectorAll('#chanNodes .cnode').length;
    ol('süreç hattı düğümleri basılmış (#chanNodes .cnode > 0)', chanNodes > 0, `${chanNodes} düğüm`);
  }

  /* ---- C) "yenileme ai-ajan'a atıyor" belirtisi — yalnız ölçüm ---- */
  console.log('\n  C · ROUTER.boot() sonrası rota (bilgi amaçlı — bu görevde çözülmüyor)');
  {
    const acikId = (d.querySelector('section.pg.on') || {}).id || '(yok)';
    const yol = w.location.pathname;
    const dogru = yol === `/${ROTA}` && acikId === 'ajan';
    not(`konum=${yol} · görünen bölüm=${acikId} · beklenen=/${ROTA}·ajan`,
        dogru ? 'eşleşiyor — bu harness\'ta belirti YOK' : 'UYUŞMUYOR — ayrı incelenmeli');
  }

  dom.window.close();

  console.log(`\n  ${gecti} geçti · ${kaldi} kaldı · ${bilgi} bilgi`);
  if (hata.length) console.log(`  runtime hataları: ${hata.slice(0, 5).join(' | ')}`);
  console.log(kaldi === 0 ? '  harness temiz.' : '  harness KIRMIZI.');
  process.exit(kaldi === 0 ? 0 : 1);
})();
