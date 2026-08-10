#!/usr/bin/env node
/* test/denetim.js — QANATONE kalıcı denetim suite'i
   ---------------------------------------------------------------------
   NEDEN VAR
     Her turda ayrı bir betik yazıp çalıştırıp atıyorduk. Her tur farklı
     bir boyuta bakıyor, baktığımız boyut temiz çıkıyor, bakmadığımız
     sessizce bozuluyordu. "Her kontrolde yeni hata çıkıyor" bunun
     sonucuydu — kod sorunu değil, ÖLÇÜM sorunu.

     Bu dosya o bakışı kalıcı hâle getiriyor. Bugüne kadar bulunan her
     hata sınıfı burada bir kural. Yeni bir sınıf çıkarsa buraya BİR KEZ
     eklenir, sonsuza kadar bekçilik eder.

   NASIL ÇALIŞTIRILIR
     node test/denetim.js            → kaynak + (varsa) dist denetimi
     npm test                        → aynısı
     build.js sonunda otomatik koşar → test kalırsa YAYIN ÇIKMAZ

   ÇIKIŞ KODU
     0 = hepsi geçti · 1 = en az bir kural kaldı
   --------------------------------------------------------------------- */

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const KOK = path.join(__dirname, '..');
const SRC = path.join(KOK, 'index.html');
const DIST = path.join(KOK, 'dist');
const ORIGIN = 'https://qanatone.com';

/* Windows'ta path.relative ve path.join '\\' dondurur; rota ve rapor
   dizeleri HER ZAMAN posix'tir. 2026-08 yasandi: ilk Windows kosumu 59/2
   verdi — '/bulten\...' yollari varOlan kumesine girip '/'li href'lerle
   eslesemedi, BUTUN ic sayfalar oksuz sayildi (slice(0,4) yuzunden 4
   gorunuyordu). Linux'ta ayrac zaten '/' oldugu icin hata bizde HIC
   kirmizi yakmadi: ortam bagimli yanlis yesil. Donusum tek yerde. */
const posixYol = s => s.replace(/\\/g, '/');

/* ---------- küçük test koşucusu ---------- */
let gecti = 0, kaldi = 0;
const kayit = [];
function ol(ad, kosul, ayrinti) {
  if (kosul) { gecti++; kayit.push(['ok', ad, ayrinti]); }
  else { kaldi++; kayit.push(['KALDI', ad, ayrinti]); }
}
function bolum(ad) { kayit.push(['--', ad, '']); }

/* ---------- jsdom ortamı ---------- */
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
function ortam(html, url, ek) {
  const hata = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => hata.push(String((e && e.message) || e).slice(0, 160)));
  const dom = new JSDOM(html, {
    url, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.innerWidth = (ek && ek.w) || 1440; w.innerHeight = 900; w.devicePixelRatio = 1;
      w.onerror = (m) => hata.push('[onerror] ' + String(m).slice(0, 140));
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
      w.fetch = (u) => (ek && ek.fetch) ? ek.fetch(u) : Promise.reject(new Error('ag yok'));
    }
  });
  return { dom, hata };
}
const dur = ms => new Promise(r => setTimeout(r, ms));
const tikla = (w, d, sec) => {
  const a = d.querySelector(sec);
  if (a) a.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  return !!a;
};

/* =====================================================================
   1 · KAYNAK BÜTÜNLÜĞÜ — sözdizimi, CSS dengesi, çeviri
   ===================================================================== */
function kaynakBut() {
  bolum('1 · kaynak bütünlüğü');
  const s = fs.readFileSync(SRC, 'utf8');
  const { execFileSync } = require('child_process');
  const bl = [...s.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  let kotu = 0;
  bl.forEach((b, i) => {
    const p = path.join(require('os').tmpdir(), `qtest${i}.js`);
    fs.writeFileSync(p, b);
    /* execFile: kabuk yok, dosya adı argüman olarak gidiyor (komut enjeksiyonu yolu kapalı) */
    try { execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' }); }
    catch (e) { kotu++; }
  });
  ol('gömülü scriptler sözdizimi temiz', kotu === 0, `${bl.length - kotu}/${bl.length}`);

  const css = (s.match(/<style[^>]*>([\s\S]*?)<\/style>/) || [, ''])[1]
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const a = (css.match(/\{/g) || []).length, b = (css.match(/\}/g) || []).length;
  ol('CSS süslü parantez dengeli', a === b, `${a}/${b}`);

  const govde = s.slice(s.indexOf('<body>'));
  const anahtar = new Set([...govde.matchAll(/data-t="([^"]+)"/g)].map(m => m[1]));
  const en = s.slice(s.indexOf('const TR={},EN={'), s.indexOf('function setLang'));
  const eksik = [...anahtar].filter(k => !new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*["\'`]').test(en));
  ol('EN sözlüğünde eksik data-t yok', eksik.length === 0, `${anahtar.size} anahtar, eksik ${eksik.length} ${eksik.slice(0, 4)}`);

  /* 2026-08 bulundu: onbellek imzasi yalnizca index.html'e bakiyordu.
     build.js'in sablonu degistiginde imza ayni kaliyor, 58 sayfa eski
     sablonla onbellekten servis ediliyor ve derleme temiz gorunuyordu.
     Bu kural o kapiyi kapali tutuyor. */
  const ub = fs.readFileSync(path.join(KOK, 'build.js'), 'utf8');
  const imzaSatiri = (ub.match(/const imza = ozet\(\[[^\]]*\]\)/) || [''])[0];
  ol('önbellek imzası üreteci kapsıyor',
    /uretecOzet/.test(imzaSatiri) &&
    /uretecOzet\s*=\s*ozet\(fs\.readFileSync\(__filename/.test(ub),
    imzaSatiri.replace('const imza = ', '').slice(0, 52));

  const kf = new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]));
  const kullanilmayan = [...kf].filter(k =>
    !new RegExp('animation[^;}]*\\b' + k + '\\b').test(css) && !s.includes("'" + k + "'"));
  ol('kullanılmayan @keyframes yok', kullanilmayan.length === 0, kullanilmayan.slice(0, 4).join(','));

  /* rAF döngüsünde düzen okuma — tarihî 1 numaralı hata */
  const okuma = /getBoundingClientRect|offsetWidth|offsetHeight|offsetTop|clientWidth|clientHeight|getComputedStyle|scrollTop|scrollHeight/;
  const dongu = [...new Set([...s.matchAll(/requestAnimationFrame\(\s*(\w+)\s*\)/g)].map(m => m[1]))];
  const supheli = [];
  for (const ad of dongu) {
    const m = new RegExp('function\\s+' + ad + '\\s*\\([^)]*\\)\\s*\\{').exec(s);
    if (!m) continue;
    let i = m.index + m[0].length - 1, d = 0, j = i;
    for (; j < s.length; j++) { if (s[j] === '{') d++; else if (s[j] === '}') { d--; if (!d) break; } }
    const gov = s.slice(i, j);
    /* Sayfanın kendi kaydırma çubuğunu değil, yalnız KARE BAŞINA okumayı arıyoruz;
       tek seferlik kurulum fonksiyonları bu listeye zaten girmiyor.        */
    if (okuma.test(gov) && /requestAnimationFrame\(\s*\w+\s*\)/.test(gov)) supheli.push(ad);
  }
  ol('rAF döngüsünde düzen okuması yok', supheli.length === 0, supheli.join(','));
  return s;
}

/* =====================================================================
   2 · ÇALIŞMA ZAMANI — rotalar, iki dil, mobil, dayanıklılık
   ===================================================================== */
async function calisma() {
  bolum('2 · çalışma zamanı');
  const html = fs.readFileSync(SRC, 'utf8');
  const ROTA = ['home', 'projeler', 'hizmet', 'ajan', 'surec', 'sss', 'bulten'];

  for (const [ad, url, dil] of [['TR', ORIGIN + '/', 'tr'], ['EN', ORIGIN + '/en', 'en']]) {
    const { dom, hata } = ortam(html, url);
    const w = dom.window, d = w.document;
    await dur(700);
    let bos = [];
    for (const r of ROTA) {
      tikla(w, d, `a[data-r="${r}"]`); await dur(70);
      const acik = [...d.querySelectorAll('section.pg.on')];
      const metin = acik.map(x => (x.textContent || '').replace(/\s+/g, ' ').trim()).join(' ');
      if (!acik.length || metin.length < 60) bos.push(r);
    }
    /* hizmet ve proje detayları */
    tikla(w, d, 'a[data-r="hizmet"]'); await dur(80);
    const sd = [...d.querySelectorAll('[data-sd]')].map(x => x.dataset.sd);
    for (const s of [...new Set(sd)]) { tikla(w, d, `[data-sd="${s}"]`); await dur(70); }
    tikla(w, d, 'a[data-r="projeler"]'); await dur(80);
    const pd = [...new Set([...d.querySelectorAll('[data-pd]')].map(x => x.dataset.pd))];
    for (const p of pd) { tikla(w, d, `[data-pd="${p}"]`); await dur(70); }

    ol(`${ad} · tüm rotalar dolu`, bos.length === 0, bos.join(','));
    ol(`${ad} · runtime hata yok`, hata.length === 0, hata.slice(0, 2).join(' | '));
    ol(`${ad} · dil doğru`, d.documentElement.lang === dil, d.documentElement.lang);
    dom.window.close();
  }

  /* mobil */
  {
    const { dom, hata } = ortam(html, ORIGIN + '/', { w: 390 });
    const w = dom.window, d = w.document;
    await dur(700);
    const b = d.querySelector('#burger'), m = d.querySelector('#mmenu');
    let acildi = false, kapandi = false;
    if (b && m) {
      /* Menü açık sınıfı 'open' (burger düğmesi 'on' alır) — ilk yazımda
         'on' aramıştım ve kural yanlış yere kırmızı yandı. Testin kendi
         hatası da bir hatadır: yanlış alarm, gerçek alarmı değersizleştirir. */
      b.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      await dur(120);
      acildi = m.classList.contains('open') && d.body.style.overflow === 'hidden';
      const a = m.querySelector('a[data-r]');
      if (a) { a.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); await dur(120); }
      kapandi = !m.classList.contains('open') && d.body.style.overflow === '';
    }
    ol('mobil menü açılıp kapanıyor', acildi && kapandi, `açıldı:${acildi} kapandı:${kapandi}`);
    ol('mobil · runtime hata yok', hata.length === 0, hata.slice(0, 2).join(' | '));
    dom.window.close();
  }

  /* bozuk content.json dayanıklılığı */
  {
    const { dom, hata } = ortam(html, ORIGIN + '/');
    const w = dom.window, d = w.document;
    await dur(700);
    const once = hata.length;
    try { w.__qanatApply({ projects: 'dizi degil', services: [{}] }); } catch (e) {}
    await dur(300);
    ol('bozuk içerik siteyi çökertmiyor', hata.length === once && !!d.querySelector('#nav'),
       `yeni hata ${hata.length - once}`);
    dom.window.close();
  }

  /* DİL KAPSAMI — EN modunda Türkçe kalan öznitelik var mı?
     applyStrings uzun süre yalnız innerHTML yazdı; placeholder ve
     aria-label markup'ta ne yazıyorsa öyle kaldı, yani İngilizce sayfada
     form ipuçları ve ekran okuyucu etiketleri Türkçeydi. Kural bunun
     sessizce geri gelmesini engelliyor.
     Özel isimler (kişi adı, marka) doğal olarak çevrilmez — onlar için
     ISTISNA listesi var.                                              */
  {
    const { dom } = ortam(html, ORIGIN + '/');
    const w = dom.window, d = w.document;
    await dur(700);
    const en = d.querySelector('#en');
    if (en) en.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await dur(500);
    const TRHARF = /[çğıöşüÇĞİÖŞÜ]/;
    const TRKELIME = /\b(ve|için|ile|bir|bu|olan|yaz|gör|iste|senin|nasıl|hangi|talep|adın|soyadın|numaran|mesaj|gönder|kabul|sitenin|adresi|örn|yüzdesi|sayısı|menü|kapat|geri|ileri)\b/i;
    const ISTISNA = [/^Enes/, /QANATONE/, /^TradeSelf/];
    const supheli = v => !!v && (TRHARF.test(v) || TRKELIME.test(v)) && !ISTISNA.some(r => r.test(v));
    const kalan = [];
    for (const [sec, at] of [['[placeholder]', 'placeholder'], ['[aria-label]', 'aria-label'],
                             ['[title]', 'title'], ['img[alt]', 'alt']]) {
      for (const e of d.querySelectorAll(sec)) {
        const v = e.getAttribute(at);
        if (supheli(v)) kalan.push(`${at}="${String(v).slice(0, 30)}"`);
      }
    }
    ol('EN modunda Türkçe öznitelik kalmıyor', kalan.length === 0,
       [...new Set(kalan)].slice(0, 4).join(' '));
    const govde = (d.querySelector('#lead') || {}).textContent || '';
    ol('EN modunda demo formu İngilizce', !TRHARF.test(govde.replace(/Enes[^\s]*/g, '')),
       govde.replace(/\s+/g, ' ').slice(0, 60));
    dom.window.close();
  }

  /* hero dönüşüm yolu — birincil çağrı sessizce kopmasın */
  {
    const { dom } = ortam(html, ORIGIN + '/');
    const w = dom.window, d = w.document;
    await dur(700);
    const cta = [...d.querySelectorAll('#hero a, #hero button')];
    const demo = d.querySelector('#hero a[data-r="lead"]');
    ol('hero\'da 2 eylem çağrısı var', cta.length === 2, String(cta.length));
    ol('hero demo düğmesi forma bağlı', !!demo && /#lead$/.test(demo.getAttribute('href') || ''),
       demo ? demo.getAttribute('href') : 'düğme yok');
    if (demo) {
      demo.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
      await dur(350);
      ol('demo düğmesi sayfadan atmıyor', !!d.querySelector('#hero.pg.on') && !!d.querySelector('#leadForm'),
         w.location.pathname + w.location.hash);
    }
    dom.window.close();
  }

  /* kendi rakamınla huni — ₺ ayağı (2026-08 eklendi)
     Kayıp adetle soyut kalıyordu; para eklendi. Kural üç şeyi tutuyor:
     eleman var, aritmetik doğru (sıralı yüzde + ₺ çarpımı), CTA formda. */
  {
    const { dom } = ortam(html, ORIGIN + '/');
    const w = dom.window, d = w.document;
    await dur(700);
    const el = i => d.getElementById(i);
    ol('huni: ₺ kaydırıcısı ve çıktısı var',
       !!el('hsR5') && !!el('hsV5') && !!el('hsPara') && !!el('hsParaY'), '');
    const R = [0, 1, 2, 3, 4, 5].map(i => el('hsR' + i));
    if (R.every(x => x)) {
      /* 100 talep, %50 cevapsız, gerisi 0, iş değeri 10.000₺ →
         kaçan 50 · ay 500.000 · yıl 6.000.000 (tr-TR biçimi) */
      const kur = [100, 50, 0, 0, 0, 10];
      R.forEach((r, i) => { r.value = String(kur[i]);
        r.dispatchEvent(new w.Event('input', { bubbles: true })); });
      await dur(120);
      const m = id => (el(id) || {}).textContent || '';
      ol('huni aritmetiği doğru (₺ dahil)',
         m('hsLost') === '50' && m('hsPara') === '₺500.000' && m('hsParaY') === '₺6.000.000',
         `${m('hsLost')} · ${m('hsPara')} · ${m('hsParaY')}`);
    } else ol('huni aritmetiği doğru (₺ dahil)', false, 'kaydırıcı eksik');
    const hcta = d.querySelector('#hsSec a.btn');
    ol('huni CTA demo formuna bağlı',
       !!hcta && /#lead$/.test(hcta.getAttribute('href') || '') && !!el('lead'),
       hcta ? hcta.getAttribute('href') : 'düğme yok');
    dom.window.close();
  }

  /* güvenlik: postMessage origin */
  {
    const { dom } = ortam(html, ORIGIN + '/');
    const w = dom.window, d = w.document;
    await dur(700);
    const oku = () => (d.querySelector('#waMain') || {}).href || '';
    const once = oku();
    w.dispatchEvent(new w.MessageEvent('message', {
      origin: 'https://saldirgan.example',
      data: { type: 'qanat-preview', content: { settings: { whatsapp: '900000000000', waMessage: 'X' } } }
    }));
    await dur(200);
    const yabanci = oku() === once;
    w.dispatchEvent(new w.MessageEvent('message', {
      origin: w.location.origin,
      data: { type: 'qanat-preview', content: { settings: { whatsapp: '905551112233', waMessage: 'P' } } }
    }));
    await dur(200);
    ol('yabancı origin postMessage reddediliyor', yabanci, '');
    ol('panel önizlemesi (aynı origin) çalışıyor', /905551112233/.test(oku()), '');
    dom.window.close();
  }
}

/* =====================================================================
   3 · YAYIN ÇIKTISI — dist/ varsa
   ===================================================================== */
function ciktiDenetimi() {
  if (!fs.existsSync(DIST)) { bolum('3 · yayın çıktısı (dist yok, atlandı)'); return; }
  bolum('3 · yayın çıktısı');
  /* huni ₺ bloğu botun gördüğü HAM HTML'de olmalı (bot JS çalıştırmaz).
     İLK YAZIMDA İKİ HATA VARDI, ikisi de bu suite'in kendi kurallarının
     ihlaliydi: (1) ana sayfaya bakıyordum — huni /otomasyon'da;
     (2) ham metin regex'i kullanıyordum — <script> kaynağındaki 'hsPara'
     elementmiş gibi eşleşip YANLIŞ YEŞİL veriyordu. DOM'dan ölç. */
  {
    const oku = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    const dom = h => h ? new JSDOM(h).window.document : null;   // betik ÇALIŞTIRILMIYOR
    const say = d => d && ['hsSec', 'hsR5', 'hsPara', 'hsParaY']
      .every(i => d.getElementById(i));
    const dTR = dom(oku(path.join(DIST, 'otomasyon', 'index.html')));
    const dEN = dom(oku(path.join(DIST, 'en', 'otomasyon', 'index.html')));
    ol('huni ₺ bloğu statik çıktıda (/otomasyon TR+EN, DOM)',
       say(dTR) && say(dEN),
       dTR && dTR.getElementById('hsPara') ? dTR.getElementById('hsPara').textContent : 'yok');
    /* ana sayfada OLMAMALI — script kaynağı elementmiş gibi sayılmasın */
    const dAna = dom(oku(path.join(DIST, 'index.html')));
    ol('huni ana sayfa DOM\'unda değil (yanlış yeşil tuzağı)',
       !!dAna && !dAna.getElementById('hsSec'), '');
  }
  /* 63 · katman sahnesi — B kararı (2026-08): sahne durdu, tek rötuş
     02 'Görünürlük' → 'Kanal' (EN 'Channel'; marka: qanat = kanal).
     Kural yapıyı (4 kart) ve karara bağlanan adı kilitler; ad bilinçli
     değişirse bu kural da bilinçli güncellenir. */
  {
    const oku2 = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    const dom2 = h => h ? new JSDOM(h).window.document : null;
    const kart = d => d ? [...d.querySelectorAll('#ktSec .ktcard h3')].map(x => x.textContent.trim()) : [];
    const tr = kart(dom2(oku2(path.join(DIST, 'index.html'))));
    const en = kart(dom2(oku2(path.join(DIST, 'en', 'index.html'))));
    ol('katman sahnesi: 4 kart + 02 Kanal (TR+EN)',
       tr.length === 4 && en.length === 4 && tr[1] === 'Kanal' && en[1] === 'Channel',
       `${tr[1] || '-'} · ${en[1] || '-'}`);
  }
  /* 64 · dil geçidi heavy'nin SON adımı olmalı (2026-08 yarışı):
     ertelenmiş heavy vitrini TR href'lerle yeniden basar; ardında geçit
     yoksa EN sayfada TR bağlantı kalır ve bu YALNIZ bazen yakalanır.
     Çıktı kuralı (EN→EN) belirtiyi tutar; bu kural sebebi kilitler. */
  {
    const kaynakS = fs.readFileSync(SRC, 'utf8');
    /* regex burada kendi etiketindeki paranteze takıldı — sıra kontrolü
       indexOf ile: flowWire satırı → ≤600 karakter içinde heavy geçidi */
    const iF = kaynakS.indexOf("if(window.__flowWire)setTimeout(window.__flowWire,120);");
    const iG = kaynakS.indexOf("guvenli(baglantilariDilleUyumla,'baglanti dili (heavy)')");
    ol('dil geçidi heavy sonunda (yarış kilidi)',
       iF > -1 && iG > iF && iG - iF < 600, iF + '→' + iG);
  }
  const sayfalar = [];
  (function tara(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) tara(p);
      else if (f === 'index.html') sayfalar.push(p);
    }
  })(DIST);
  const rotaYap = rel => '/' + posixYol(rel).replace(/\/?index\.html$/, '');
  const yolu = p => p === path.join(DIST, 'index.html') ? '/' : rotaYap(path.relative(DIST, p));
  /* 62 · ayni donusum iki platformun urettigi bicimde de ayni rotayi vermeli
     (path.win32.relative bicimi Linux'ta simule ediliyor — kural her yerde kosar) */
  ol('rota üretimi Windows ayracında da posix',
     rotaYap('bulten\\google-ads-maliyetleri-2026\\index.html') === '/bulten/google-ads-maliyetleri-2026'
     && rotaYap('hizmetler/seo/index.html') === '/hizmetler/seo',
     rotaYap('bulten\\google-ads-maliyetleri-2026\\index.html'));

  let dupId = 0, altYok = 0, adsizLink = 0, h1Kotu = [], ldKotu = 0, viewportYok = 0;
  const kanon = {}, baslik = {}, aciklama = {}, gelen = {};
  const varOlan = new Set(sayfalar.map(yolu));
  let enEn = 0, enTr = 0;

  for (const p of sayfalar) {
    const yol = yolu(p);
    const s = fs.readFileSync(p, 'utf8');
    const d = new JSDOM(s).window.document;           // betik ÇALIŞTIRILMIYOR: botun gördüğü
    const ids = [...d.querySelectorAll('[id]')].map(e => e.id);
    dupId += new Set(ids.filter(i => ids.filter(x => x === i).length > 1)).size;
    altYok += [...d.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length;
    adsizLink += [...d.querySelectorAll('a[href]')]
      .filter(a => !a.textContent.trim() && !a.querySelector('img,svg') && !a.getAttribute('aria-label')).length;
    const h1 = d.querySelectorAll('h1').length;
    if (h1 !== 1) h1Kotu.push(`${yol}:${h1}`);
    if (!d.querySelector('meta[name=viewport]')) viewportYok++;
    for (const x of d.querySelectorAll('script[type="application/ld+json"]')) {
      try { JSON.parse(x.textContent); } catch (e) { ldKotu++; }
    }
    const g = (sel, at) => { const e = d.querySelector(sel); return e ? e.getAttribute(at) : null; };
    (kanon[g('link[rel=canonical]', 'href')] ||= []).push(yol);
    (baslik[(d.title || '').trim()] ||= []).push(yol);
    (aciklama[g('meta[name=description]', 'content') || ''] ||= []).push(yol);

    const linkler = [...d.querySelectorAll('a[href^="/"]')]
      .map(a => (a.getAttribute('href') || '').split(/[?#]/)[0].replace(/\/$/, '') || '/');
    for (const l of new Set(linkler)) if (varOlan.has(l)) (gelen[l] ||= new Set()).add(yol);
    if (yol.startsWith('/en')) {
      enEn += linkler.filter(l => l.startsWith('/en')).length;
      enTr += linkler.filter(l => !l.startsWith('/en') && varOlan.has(l)).length;
    }
  }

  ol('mükerrer id yok', dupId === 0, String(dupId));
  ol('alt özelliği olmayan görsel yok', altYok === 0, String(altYok));
  ol('adsız bağlantı yok', adsizLink === 0, String(adsizLink));
  ol('her sayfada tam 1 h1', h1Kotu.length === 0, h1Kotu.slice(0, 4).join(' '));
  ol('viewport her sayfada', viewportYok === 0, String(viewportYok));
  ol('JSON-LD geçerli', ldKotu === 0, String(ldKotu));
  ol('mükerrer canonical yok', Object.values(kanon).every(v => v.length === 1),
     Object.entries(kanon).filter(([, v]) => v.length > 1).map(([k]) => k).slice(0, 2).join(' '));
  ol('mükerrer meta description yok', Object.values(aciklama).every(v => v.length === 1),
     Object.entries(aciklama).filter(([, v]) => v.length > 1).map(([k]) => k.slice(0, 30)).slice(0, 2).join(' | '));
  /* Başlık çifti TR/EN proje adlarında doğal olarak aynı; onları hreflang çözüyor.
     Kural yalnız AYNI DİL içinde mükerrer başlığa bakıyor.                */
  const ayniDil = Object.values(baslik).filter(v =>
    v.filter(x => x.startsWith('/en')).length > 1 || v.filter(x => !x.startsWith('/en')).length > 1);
  ol('aynı dilde mükerrer title yok', ayniDil.length === 0, ayniDil.slice(0, 2).map(v => v.join(',')).join(' | '));

  ol('EN sayfalar EN\'e bağlanıyor', enTr === 0 && enEn > 0, `EN→EN ${enEn} · EN→TR ${enTr}`);
  const oksuz = [...varOlan].filter(p => !gelen[p]);
  ol('öksüz sayfa yok', oksuz.length === 0, oksuz.slice(0, 4).join(' '));

  /* yan dosyalar */
  const sm = fs.existsSync(path.join(DIST, 'sitemap.xml')) ? fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8') : '';
  const loc = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  ol('sitemap sayfa sayısıyla örtüşüyor', loc.length === sayfalar.length, `${loc.length}/${sayfalar.length}`);
  ol('sitemap\'te ?lang=en kalıntısı yok', !sm.includes('?lang=en'), '');
  const rd = fs.existsSync(path.join(DIST, '_redirects')) ? fs.readFileSync(path.join(DIST, '_redirects'), 'utf8') : '';
  const kural = rd.split('\n').filter(l => l.trim() && !l.startsWith('#') && l.trim().endsWith('200'))
    .map(l => l.split(/\s+/)[0]);
  ol('her sayfanın yönlendirme kuralı var', [...varOlan].every(p => kural.includes(p)),
     [...varOlan].filter(p => !kural.includes(p)).slice(0, 3).join(' '));
  ol('404 kuralı var', /\/\*\s+\/404\.html\s+404/.test(rd), '');
  ol('404.html üretilmiş', fs.existsSync(path.join(DIST, '404.html')), '');
  const rb = fs.existsSync(path.join(DIST, 'robots.txt')) ? fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8') : '';
  ol('shell.html taramadan çıkarılmış', rb.includes('Disallow: /shell.html'), '');
  ol('admin.html taramadan çıkarılmış', rb.includes('Disallow: /admin.html'), '');
  ol('fonksiyon kaynağı yayında değil', !fs.existsSync(path.join(DIST, 'netlify')), '');
}

/* =====================================================================
   4 · GÜVENLİK — statik tarama
   ===================================================================== */
function guvenlik() {
  bolum('4 · güvenlik');
  const dosyalar = {};
  (function tara(d, derinlik) {
    if (derinlik > 3) return;
    for (const f of fs.readdirSync(d)) {
      if (['node_modules', 'dist', '.onbellek', 'img', 'js', '.git'].includes(f)) continue;
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) tara(p, derinlik + 1);
      else if (/\.(js|html|json|toml|yml)$/.test(f) && !/qanat-tek-dosya/.test(f))
        dosyalar[posixYol(path.relative(KOK, p))] = fs.readFileSync(p, 'utf8');
    }
  })(KOK, 0);

  /* 65 · posix haritaya path.join anahtariyla bakilamaz — bu dosyanin
     kendisi denetleniyor: 'dosyalar[' ile 'path.join' BITISIK gorunurse
     kirmizi. (Desen bu yorumda bile bitisik yazilamaz — ilk iki deneme
     kuralin kendi metnine takildi: once includes() dizesi, sonra yorum.) */
  const benimKaynak = fs.readFileSync(__filename, 'utf8');
  /* desen calisma aninda birlesir; yoksa kuralin KENDISI desene eslesip
     kendine kirmizi yakiyordu (kosulmadan yakalandi) */
  const yasakDesen = 'dosyalar[' + 'path.join';
  ol('güvenlik haritasına posix anahtarla bakılıyor',
     !benimKaynak.includes(yasakDesen), '');

  const sirKalip = /(bearer\s+[A-Za-z0-9._-]{20,}|sk-[A-Za-z0-9]{24,}|ghp_[A-Za-z0-9]{28,}|xox[baprs]-[A-Za-z0-9-]{12,})/i;
  const sirli = Object.entries(dosyalar).filter(([, s]) => sirKalip.test(s)).map(([p]) => p);
  ol('gömülü sır yok', sirli.length === 0, sirli.join(' '));

  const idx = dosyalar['index.html'] || '';
  ol('postMessage origin doğrulaması var', /ayniKaynak|e\.origin\s*===\s*location\.origin/.test(idx), '');
  ol('dış CDN betiği yok', !/<script[^>]+src=["']https?:\/\//.test(idx), '');
  /* harita anahtarlari posixYol'dan geciyor; arama da posix olmali.
     2026-08: Windows'ta path.join '\\' uretti, anahtar bulunamadi, IKI
     SSRF kurali birden dustu — korumalar kaynakta durdugu halde.
     Ayni sinifin ucuncu ornegi: yazici duzeltilmis, okuyucu taranmamisti. */
  const dg = dosyalar['netlify/functions/diagnose.js'] || '';
  ol('SSRF: yönlendirme elle takip ediliyor', dg.includes("redirect: 'manual'"), '');
  ol('SSRF: özel IP denetimi var', /isPrivate/.test(dg), '');
  /* Yorum satırlarını AT: ilk yazımda `hd.includes(...)` kullanmıştım ve
     başlık silinmiş olmasına rağmen aynı kelime yorumda geçtiği için kural
     yeşil kaldı. Yanlış YEŞİL, yanlış kırmızıdan tehlikelidir — bir daha
     olmasın diye kural artık gerçek başlık satırını arıyor.            */
  const hd = fs.existsSync(path.join(KOK, '_headers'))
    ? fs.readFileSync(path.join(KOK, '_headers'), 'utf8')
        .split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).join('\n')
    : '';
  for (const b of ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy'])
    ol(`güvenlik başlığı: ${b}`, new RegExp('^\\s+' + b + '\\s*:\\s*\\S', 'm').test(hd), '');
}

/* =====================================================================
   5 · TASARIM — ölçülebilir olanlar
   ===================================================================== */
function tasarim(s) {
  bolum('5 · tasarım (ölçülebilir)');
  const css = (s.match(/<style[^>]*>([\s\S]*?)<\/style>/) || [, ''])[1];
  const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const kars = (a, bg) => { const x = L(a), y = L(bg); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const uz = a => [0, 1, 2].map(() => Math.round(255 * a + 5 * (1 - a)));
  for (const [ad, re] of [['--tx2', /--tx2:rgba\(255,255,255,([\d.]+)\)/],
                          ['--tx3', /--tx3:rgba\(255,255,255,([\d.]+)\)/],
                          ['--tx4', /--tx4:rgba\(255,255,255,([\d.]+)\)/]]) {
    const m = css.match(re);
    const o = m ? kars(uz(parseFloat(m[1])), [5, 5, 5]) : 0;
    ol(`kontrast AA: ${ad}`, o >= 4.5, o.toFixed(2) + ':1');
  }
  ol('prefers-reduced-motion bloğu var', /prefers-reduced-motion/.test(css),
     String((css.match(/prefers-reduced-motion/g) || []).length));
  ol(':focus-visible kuralı var', /:focus-visible/.test(css),
     String((css.match(/:focus-visible/g) || []).length));
  const tb = css.match(/\.tbnav button\{([^}]*)\}/);
  ol('dokunma hedefi ≥24px', !!tb && /width:24px/.test(tb[1]) && /height:24px/.test(tb[1]), tb ? '' : 'kural yok');
}

/* =====================================================================
   ana akış
   ===================================================================== */
(async function main() {
  console.log('QANATONE denetim suite\n');
  const s = kaynakBut();
  await calisma();
  ciktiDenetimi();
  guvenlik();
  tasarim(s);

  console.log('');
  for (const [tip, ad, ayr] of kayit) {
    if (tip === '--') { console.log(`\n  ${ad}`); continue; }
    const im = tip === 'ok' ? '  ok  ' : '  !!  ';
    console.log(im + ad.padEnd(44) + (ayr || ''));
  }
  console.log(`\n  ${gecti} geçti · ${kaldi} kaldı`);
  if (kaldi) { console.error('\n  DENETİM KALDI — yayın çıkmamalı.'); process.exit(1); }
  console.log('  denetim temiz.');
})();
