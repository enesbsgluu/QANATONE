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
      /* ek.mm: eşleşecek sorgu parçaları (ör. ['pointer:coarse']) — mobil
         eşleme kuralları için; verilmezse eski davranış (hepsi false). */
      w.matchMedia = q => ({ matches: !!(ek && ek.mm && ek.mm.some(x => q.includes(x))),
        media: q, addListener() {}, removeListener() {},
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
      /* ek.kur: kurala özgü ek kurulum (saplama, sayaç) — parse'tan önce */
      if (ek && ek.kur) ek.kur(w);
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

/* 2a — dist sayfaları ana betiği dış dosyadan alır (varlik/app.<hash>.js).
   jsdom dış kaynak yüklemez (resources ayarlı değil) — betik ÇALIŞTIRAN her
   dist ölçümü dosyayı diskten okuyup ESKİ yerine satır içi geri koyar:
   belge sırası ve koşum anı, ayrıştırma öncesi hâlle birebir. Referans
   yoksa HTML olduğu gibi döner — 3b hidrasyonu ölçer, paketleme sözleşmesi
   kural 113/114'ün işi; oradaki kırmızı buraya taşınmaz. */
function anaBetigiGeriGom(html) {
  const m = html.match(/<script src="(varlik\/app\.[0-9a-f]{10}\.js)" defer><\/script>/);
  if (!m) return html;
  const yol = path.join(DIST, m[1]);
  if (!fs.existsSync(yol)) return html;
  return html.slice(0, m.index) + '<script>' + fs.readFileSync(yol, 'utf8') + '</script>'
       + html.slice(m.index + m[0].length);
}

/* Mobil sahne bütçesi (120-123) — mobil eşlemeli, JS'SİZ statik ortam.
   jsdom medya sorgusunu KASKADDA değerlendirmez (ölçüldü: 390px pencerede
   max-width:900 bloğu hesaplanmış stile girmiyor) — bu yüzden eşleşen
   mobil @media blokları metinde AÇILIR (unwrap), eşleşmeyenler düşer,
   betikler sökülür. Kalan saf CSS'i jsdom sırayla/özgüllükle uygular;
   hesaplanmış stil gerçek "JS hiç koşmadan mobil" hâlidir. */
function mobilStatikDOM(html) {
  const W = 390, H = 844;
  const kosul = q => q.split(',').some(kol => {
    const ozler = [...kol.matchAll(/\(([^)]+)\)/g)].map(m => m[1].replace(/\s/g, '').toLowerCase());
    if (!ozler.length) return false;
    return ozler.every(oz => {
      if (oz === 'pointer:coarse' || oz === 'hover:none' || oz === 'any-pointer:coarse') return true;
      if (oz.startsWith('max-width:')) return W <= parseInt(oz.slice(10), 10);
      if (oz.startsWith('min-width:')) return W >= parseInt(oz.slice(10), 10);
      if (oz.startsWith('max-height:')) return H <= parseInt(oz.slice(11), 10);
      if (oz.startsWith('min-height:')) return H >= parseInt(oz.slice(11), 10);
      return false;   /* prefers-*, pointer:fine, hover:hover, bilinmeyen */
    });
  });
  const donustur = css => {
    let out = '', i = 0;
    while (i < css.length) {
      const m = css.slice(i).match(/@media([^{]*)\{/);
      if (!m) { out += css.slice(i); break; }
      out += css.slice(i, i + m.index);
      /* blok sonunu parantez SAYARAK bul — [^}]* iç bloğun ilk }'inde durur */
      let d = 1, k = i + m.index + m[0].length;
      for (; k < css.length && d > 0; k++) { if (css[k] === '{') d++; else if (css[k] === '}') d--; }
      const ic = css.slice(i + m.index + m[0].length, k - 1);
      if (kosul(m[1])) out += donustur(ic);   /* eşleşti: blok açılır */
      i = k;                                   /* eşleşmedi: blok düşer */
    }
    return out;
  };
  const jssiz = html.replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style([^>]*)>([\s\S]*?)<\/style>/g,
      (t, oz, css) => '<style' + oz + '>' + donustur(css.replace(/\/\*[\s\S]*?\*\//g, '')) + '</style>');
  return new JSDOM(jssiz).window;
}

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

  /* 96 · KVKK onayı ŞART — onaysız gönderim POST üretmez (2026-08).
     Bugün İKİ katman koruyor: kutudaki `required` (tarayıcı submit
     olayını hiç ateşlemez, kendi baloncuğunu kutunun yanında gösterir —
     Enes canlıda doğruladı) ve işleyicideki okTick kontrolü.
     Kural İKİNCİ katmanı ölçüyor, çünkü birincisi tarayıcının işi ve
     testte taklit edilemez: submit olayı ELLE tetikleniyor, yani native
     doğrulama atlanıyor — `required` bir gün kalkarsa ya da JS başka bir
     yerden submit ederse geriye kalan tek koruma budur. Bu kural onun
     bekçisi: onaysız POST yok, onaylıyken tam bir POST.
     Metin ölçülmüyor (panelden değişebilir), davranış ölçülüyor.
     SINIR: burası istemci tarafı. Netlify Forms sunucu tarafı doğrulama
     sunmadığı için hazırlanmış bir POST hiçbirine takılmaz — kural
     "onay zorlanıyor" demiyor, "formu kullanan kişi için şart" diyor.
     Kayıt tarafındaki gerçek: alan gelmediyse kayıtta yoktur. */
  {
    const { dom } = ortam(html, ORIGIN + '/');
    const w = dom.window, d = w.document;
    await dur(700);
    let post = 0;
    w.fetch = (u, o) => {                       /* boot bitti, sayacı tak */
      if (o && String(o.method).toUpperCase() === 'POST') post++;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    };
    const f = d.querySelector('#leadForm'), kutu = d.querySelector('#ldOk');
    const yaz = (sel, v) => { const e = d.querySelector(sel); if (e) e.value = v; };
    yaz('#ldName', 'Deneme Kullanici');
    yaz('#ldMail', 'deneme@ornek.com');
    yaz('#ldTel', '+90 500 000 00 00');
    if (kutu) kutu.checked = false;
    if (f) f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await dur(200);
    const onaysizDurdu = post === 0;
    if (kutu) kutu.checked = true;
    if (f) f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await dur(300);
    const onayliGecti = post === 1;
    ol('KVKK onayı şart: onaysız gönderim POST üretmiyor',
       !!kutu && kutu.hasAttribute('required') && onaysizDurdu && onayliGecti,
       `required=${!!kutu && kutu.hasAttribute('required')} onaysızPOST=${onaysizDurdu ? 0 : '>0'} onaylıPOST=${post}`);
    dom.window.close();
  }

  /* 98 · SINIF KURALI — dışarıdan gelen değer süzgeçsiz alana yazılmaz.
     Kaynak location.search ve document.referrer; ikisini de saldırgan tek
     bir hazırlanmış bağlantıyla TAMAMEN kontrol eder. Zincir kısa değil:
       adres → sessionStorage → gizli alan → Netlify kaydı →
       submission-created.js → WhatsApp gövdesi (Enes'in OKUYUP İŞLEM
       YAPTIĞI metin) → e-posta → fonksiyon logu → ileride panel.
     Satır sonu taşıyan tek bir parametre hem log satırı sahteciliği hem
     de şablon reddi (Meta çok satırlı parametreyi reddeder → her bildirim
     düşer) üretebilirdi. Kalıp bu yüzden dar ve kırpma YOK: uymayan değer
     atılır, çünkü kırpma bozuk veriyi geçerli gösterir.
     Kural İKİ yönü birden ölçüyor — yalnız yazarken süzmek yetmez:
     sessionStorage bizim kökenimize ait ama kökende koşan herhangi bir
     kod ona yazabilir, o yüzden OKURKEN de süzülüyor. İkinci yarı tam
     olarak bunu kanıtlıyor: depo elle zehirlenip gönderim tetikleniyor. */
  {
    const kotu = encodeURIComponent('<script>alert(1)</script>');
    const { dom } = ortam(html, ORIGIN + '/?utm_source=' + kotu +
      '&gclid=ABC123&utm_medium=eposta&bilinmeyen=x');
    const w = dom.window, d = w.document;
    await dur(700);
    let kayit = {};
    try { kayit = JSON.parse(w.sessionStorage.getItem('qanat-atif') || '{}') || {}; } catch (e) { kayit = {}; }
    const yazarkenSuzuldu = kayit.gclid === 'ABC123' && kayit.utm_medium === 'eposta'
      && !('utm_source' in kayit) && !('bilinmeyen' in kayit);
    const inilenVar = kayit.inilen_sayfa === '/';

    /* okuma yönü: depoyu ELLE zehirle, gönderimde alana ne yazılıyor? */
    /* Gönderilen GÖVDE ölçülüyor, DOM değil: başarılı gönderimden sonra
       done() formun içeriğini siliyor (f.textContent=''), yani alanlar
       okunmak istendiğinde artık yok. Zaten doğru ölçüm noktası da bu —
       kayda ne düştüğü, alanda ne yazdığı değil. */
    let post = 0, govde = '';
    w.fetch = (u, o) => {
      if (o && String(o.method).toUpperCase() === 'POST') { post++; govde = String(o.body || ''); }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    };
    try {
      w.sessionStorage.setItem('qanat-atif', JSON.stringify({
        gclid: 'satir\nsonlu deger', utm_source: 'temiz_deger',
        inilen_sayfa: '/hizmetler/seo', yonlendiren: 'ornek.com'
      }));
    } catch (e) {}
    const f = d.querySelector('#leadForm'), kutu = d.querySelector('#ldOk');
    const yaz = (sel, v) => { const e = d.querySelector(sel); if (e) e.value = v; };
    yaz('#ldName', 'Deneme Kullanici');
    yaz('#ldMail', 'deneme@ornek.com');
    yaz('#ldTel', '+90 500 000 00 00');
    if (kutu) kutu.checked = true;
    if (f) f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await dur(300);
    const gonderilen = new URLSearchParams(govde);
    const alan = ad => gonderilen.get(ad);
    const okurkenSuzuldu = alan('gclid') === '' && alan('utm_source') === 'temiz_deger'
      && alan('inilen_sayfa') === '/hizmetler/seo' && alan('yonlendiren') === 'ornek.com';
    ol('atıf değerleri kalıp süzgecinden geçiyor (yazarken + okurken)',
       yazarkenSuzuldu && inilenVar && okurkenSuzuldu && post === 1,
       `yazarken=${yazarkenSuzuldu} inilen=${kayit.inilen_sayfa || '-'} okurken=${okurkenSuzuldu} post=${post}`);
    dom.window.close();
  }

  /* 101 · gösterim tarafı: taranan alan adı ve KOTA MESAJI metin olarak
     basılır, adrese kodlanarak girer.
     2026-08 ÖLÇÜLDÜ (yama değil, önce ölçüm): dört nokta soruldu —
     (1) girdi anında ekrana yansımıyor, (2) #dgHost textContent ile
     basılıyor, (3) wa.me adresi encodeURIComponent'ten geçiyor,
     (4) sonuç ekranı paylaşılabilir adres üretmiyor. Yani bugün yansıyan
     XSS YOK. Kural bulguyu değil, bu DURUMU kilitliyor: sayfada 67
     innerHTML var; alan adı bir gün onlardan birine düşerse zincir
     depolanmış XSS'e kapanır ve bunu hiçbir şey söylemez.
     Kota mesajı da kapsamda: o da ekrana basılan bir metindir ve yanına
     bir bağlantı koyuyoruz — en kolay innerHTML'e kayacak yer orasıdır. */
  {
    const kotu = 'evil"><img src=x onerror=alert(1)>';
    const { dom } = ortam(html, ORIGIN + '/');
    const w = dom.window, d = w.document;
    await dur(700);
    w.fetch = () => Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({
      ok: true, host: kotu, finalUrl: 'https://' + kotu, score: 42, ms: 1200, kb: 100,
      items: [{ k: 'https', state: 'fail', v: '' }, { k: 'desc', state: 'fail', v: '25' }] }) });
    const url = d.querySelector('#dgUrl'), go = d.querySelector('#dgGo');
    if (url) url.value = 'ornek.com';
    if (go) go.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
    await dur(500);
    const dh = d.querySelector('#dgHost');
    const metinOlarak = !!dh && dh.children.length === 0 && dh.textContent.includes(kotu);
    const enjekteYok = !d.querySelector('img[onerror]') && !d.querySelector('#dgRes script');
    const waA = d.querySelector('#dgFix a[href*="wa.me"]');
    const href = waA ? waA.getAttribute('href') : '';
    const adresKodlu = !!href && !/["'<>]/.test(href) && href.includes(encodeURIComponent(kotu));

    /* kota mesajı yolu — aynı ölçüm, ikinci yüzey */
    w.fetch = () => Promise.resolve({ status: 429, ok: false, json: () => Promise.resolve({
      ok: false, reason: 'kota', kalan: 0, yenilenmeMs: Date.now() + 7 * 3600 * 1000 }) });
    if (go) go.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
    await dur(500);
    const err = d.querySelector('#dgErr');
    const kotaMetni = !!err && err.classList.contains('on')
      && /\d/.test(err.textContent) && err.querySelectorAll('script,img').length === 0;
    const kotaBag = err && err.querySelector('a[href^="https://wa.me/"]');
    const kotaKodlu = !!kotaBag && !/["'<>]/.test(kotaBag.getAttribute('href'));
    ol('gösterim: alan adı ve kota mesajı metin olarak, adres kodlanarak',
       metinOlarak && enjekteYok && adresKodlu && kotaMetni && kotaKodlu,
       `metin=${metinOlarak} enjekteYok=${enjekteYok} adresKodlu=${adresKodlu} kotaMetni=${kotaMetni} kotaCta=${kotaKodlu}`);
    dom.window.close();
  }

  /* 104 · FAZ 0 (+3) · DURUM EKRANI: TR ve EN'de var, aynı gösterim
     kapısından geçiyor.
     Yukarıdaki kural alan adını ve kota mesajını kilitliyordu; duvar
     ekranı ÜÇÜNCÜ yüzey ve en risklisi: taranan adresi, HTTP durumunu ve
     engel sağlayıcısını birlikte basıyor — üçü de karşı tarafın verdiği
     veriden besleniyor. Kapı genişliyor: bu metin de textContent'ten
     geçmeli, bağlantı kodlanmalı, skor bileşeni ekrana HİÇ basılmamalı.
     İKİ DİL ŞART: metin tek dilde yerleşirse EN ziyaretçi ya boş kutu ya
     Türkçe cümle görür — bu depoda /en/ ayrı dosya olduğu için sessizce
     yayına çıkar. Kural iki dilde de metin ürediğini ve ikisinin AYNI
     OLMADIĞINI ölçüyor (aynıysa çeviri değil kopyadır).                 */
  {
    const kotu = 'evil"><img src=x onerror=alert(1)>';
    const { dom } = ortam(html, ORIGIN + '/');
    const w = dom.window, d = w.document;
    await dur(700);
    const url = d.querySelector('#dgUrl'), go = d.querySelector('#dgGo');
    /* ÖLÇÜM ANINDA FOTOĞRAF ÇEK — `#dgErr` canlı bir elemandır ve her
       koşumda baştan kuruluyor. İlk yazımda eleman referansı saklanmıştı
       ve sonda okunduğunda İÇİNDE SON senaryonun içeriği vardı: 15 Eylül
       bağlantısı "yok" göründü, oysa duvar ekranında basılmıştı. Yanlış
       kırmızıydı ama aynı mekanizma yanlış yeşil de verebilirdi. */
    const cek = async (yanit) => {
      w.fetch = () => Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve(yanit) });
      if (url) url.value = 'ornek.com';
      if (go) go.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
      await dur(500);
      const e = d.querySelector('#dgErr');
      return {
        acik: !!e && e.classList.contains('on'),
        metin: e ? e.textContent.trim() : '',
        baglar: e ? [...e.querySelectorAll('a')].map(a => a.getAttribute('href') || '') : [],
        icErik: e ? e.querySelectorAll('img,script').length : -1,
        skorEkrani: d.querySelector('#dgRes').classList.contains('on')
      };
    };
    const duvar = {
      ok: false, durum: 'engel', saglayici: 'cloudflare', host: kotu,
      finalUrl: 'https://' + kotu, status: 403, bytes: 5269, redirects: 0,
      cdn: 'cloudflare', cfEylul: true
    };
    /* beşinci hâl AYRI ölçülüyor: metni yoksa bu ziyaretçi boş kutu görür */
    const red = {
      ok: false, durum: 'reddedildi', saglayici: null, host: 'ornek.com',
      finalUrl: 'https://ornek.com/', status: 403, bytes: 120, redirects: 0,
      cdn: 'bilinmiyor', cfEylul: false
    };

    const tr = await cek(duvar);
    const trRed = await cek(red);
    d.documentElement.lang = 'en';
    const en = await cek(duvar);
    const enRed = await cek(red);

    const acik = tr.acik;
    const durumBasildi = /403/.test(tr.metin) && tr.metin.includes(kotu);
    const enjekteYok = tr.icErik === 0 && trRed.icErik === 0
      && en.icErik === 0 && enRed.icErik === 0 && !d.querySelector('img[onerror]');
    const waBag = tr.baglar.filter(h => h.indexOf('https://wa.me/') === 0);
    const bagKodlu = waBag.length === 1 && !/["'<>]/.test(waBag[0]);
    const skorEkraniYok = !tr.skorEkrani && !trRed.skorEkrani;
    const ikiDil = tr.metin.length > 60 && en.metin.length > 60 && tr.metin !== en.metin;
    /* beşinci hâl iki dilde de metin üretiyor ve 403'ü söylüyor */
    const besinciHal = /403/.test(trRed.metin) && trRed.metin.length > 60
      && /403/.test(enRed.metin) && enRed.metin.length > 60 && trRed.metin !== enRed.metin
      && trRed.metin !== tr.metin && enRed.metin !== en.metin;

    /* METİN KURALI — araç KENDİ HÜKMÜ hakkında tereddüt etmez. Bir
       pazarlama ajansının aracında "ayıramadık / emin değiliz" demek
       ürünün kendisini zayıflatır. Ölçülen gerçek söylenir, konu sunucu
       sahibine devredilir. Sebebin sunucu tarafında olduğunu söylemek
       tereddüt DEĞİL kapsamdır, o yüzden yasak listesi dar tutuldu. */
    const TEREDDUT_TR = /ayıramadık|ayırt edemedik|emin değil|olabilir de olmayabilir|net değil|kesin (?:olarak )?bilemiyoruz|anlayamadık/i;
    const TEREDDUT_EN = /we (?:are not|aren't|were not|weren't) (?:sure|certain)|could not tell|couldn't tell|unable to tell|hard to say|we cannot determine/i;
    const dortEkran = [tr.metin, trRed.metin, en.metin, enRed.metin];
    const tereddutYok = !dortEkran.some(m => TEREDDUT_TR.test(m) || TEREDDUT_EN.test(m));

    /* 15 EYLÜL KAYNAĞI — yanlış sayfaya giden bir kaynak, kaynaksız
       iddiadan kötüdür. Bağlantı Temmuz 2026'daki ÜÇ KATEGORİLİ duyuruya
       gitmeli; 2025'in "Content Independence Day" yazısına değil. */
    const eylulBag = tr.baglar.filter(h => /cloudflare\.com/i.test(h));
    const kaynakDogru = eylulBag.length === 1
      && /^https:\/\/developers\.cloudflare\.com\/changelog\/post\/2026-07-01-ai-traffic-options\/?$/.test(eylulBag[0])
      && !/content-independence-day/i.test(eylulBag[0]);
    /* şartı sağlamayan ziyaretçi bu tarihi GÖRMEZ — reddedildi hâlinde
       cfEylul false, ne metin ne bağlantı çıkmalı */
    const eylulSizmadi = !/15 Eylül|15 September/i.test(trRed.metin)
      && !/15 Eylül|15 September/i.test(enRed.metin)
      && trRed.baglar.filter(h => /cloudflare\.com/i.test(h)).length === 0;

    ol('gösterim: durum ekranı TR ve EN (beş hâl), tereddüt yok, 15 Eylül kaynağı doğru',
       acik && durumBasildi && enjekteYok && bagKodlu && skorEkraniYok && ikiDil
       && besinciHal && tereddutYok && kaynakDogru && eylulSizmadi,
       `açık=${acik} durum=${durumBasildi} enjekteYok=${enjekteYok} bağKodlu=${bagKodlu} `
       + `skorYok=${skorEkraniYok} ikiDil=${ikiDil} beşinciHâl=${besinciHal} `
       + `tereddütYok=${tereddutYok} kaynak=${kaynakDogru ? 'doğru' : (eylulBag && eylulBag[0]) || 'yok'} `
       + `eylülSızmadı=${eylulSizmadi} · tr=${tr.metin.length}/${trRed.metin.length} en=${en.metin.length}/${enRed.metin.length}`);
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

  /* 117 · DESTE MOBİLDE BAĞLANMAZ (2026-08, Enes'in 58 sn'lik ekran kaydı,
     kare-fark analizi): dört büyük kaydırma donmasının DÖRDÜ de deste
     bölgesindeydi (2,1–4,7 sn donma + ışınlanma). deck() her kaydırma
     karesinde getBoundingClientRect okuyor; mobilde scale/opacity zaten
     hissedilmiyor, maliyeti hissediliyor. Kapı: innerWidth<=900 ||
     pointer:coarse → scroll dinleyicisi HİÇ eklenmez, ilk deck() çağrısı
     yapılmaz; sticky yığın kalır. Ölçüm İKİ TARAFLI tek kuralda: mobil
     eşlemede deck'e dokunan scroll dinleyicisi 0, masaüstü eşlemede 1 —
     masaüstü davranışı da aynı kuralla kilitli, iki yönde de regresyon
     yanar. gsap/ST/Lenis saplamayla veriliyor: jsdom dış betik yüklemez;
     ölçülen şey kütüphane değil, bağlanma KAPISI. */
  {
    const stub = w => {
      const yok = () => {};
      w.gsap = { registerPlugin: yok, to: yok, from: yok, set: yok, fromTo: yok,
                 ticker: { add: yok, remove: yok, lagSmoothing: yok } };
      w.ScrollTrigger = { create: () => ({}), config: yok, refresh: yok,
                          update: yok, getAll: () => [] };
      w.Lenis = class { on() {} raf() {} scrollTo() {} };
      const say = { deck: 0 };
      const eski = w.addEventListener.bind(w);
      w.addEventListener = (tip, fn, o) => {
        if (tip === 'scroll' && String(fn).indexOf('deck(') > -1) say.deck++;
        return eski(tip, fn, o);
      };
      w.__deckSay = say;
    };
    const olc = async (px, coarse) => {
      const { dom } = ortam(html, ORIGIN + '/',
        { w: px, mm: coarse ? ['pointer:coarse'] : [], kur: stub });
      await dur(1200);            /* boot(load) + karşılama + motion boot */
      const n = dom.window.__deckSay.deck;
      dom.window.close();
      return n;
    };
    const mobil = await olc(390, true);
    const masa = await olc(1440, false);
    ol('deste mobilde bağlanmaz (deck scroll dinleyicisi: mobil 0 · masaüstü 1)',
       mobil === 0 && masa === 1, `mobil=${mobil} masaüstü=${masa}`);
  }

  /* 118 · DESTE GÖRSELLERİ MOBİLDE EAGER + 640 TÜREV (aynı 58 sn'lik kayıt:
     kartlar arasında 2,1–4,7 sn donma). İki mekanizma: (1) `loading="lazy"`
     karta gelindiği anda indirme+çözme başlatıyor — tam kaydırma ortasında;
     mobilde deste görselleri EAGER olmalı ki iş açılışta, boştayken yapılsın.
     Masaüstü mevcut davranışı korur (ilk 2 eager, kalanı lazy) — orada
     sorun yok, kural onu da kilitler. (2) `imgk` 960px; kutu ~350 CSS px.
     640 türevi (`-k-640.webp`) çözülmüş bitmap'i tekrar düşürür. Türev
     AÇIK ALANDIR (`imgk6`): panelden eklenen projede alan yoksa imgk'ye
     düşer — 404 veren <source> <img>'e GERİ DÜŞMEZ, o yüzden ad türetme
     (replace) değil alan. content.json (kökte, panel yayını) da imgk6
     taşımalı: content dizileri DATA'yı BÜTÜN olarak ezer (üç kez yaşandı) —
     alan yalnız DATA'da kalırsa canlıda kaybolur. */
  {
    const olc = async (px, coarse) => {
      const { dom } = ortam(html, ORIGIN + '/',
        { w: px, mm: coarse ? ['pointer:coarse'] : [] });
      await dur(900);
      const d2 = dom.window.document;
      const img = [...d2.querySelectorAll('#prjDeck .dk img')];
      const kaynaklar = [...d2.querySelectorAll('#prjDeck picture source')]
        .map(s => s.getAttribute('srcset') || '');
      const DATA2 = dom.window.__qanatDefaults();
      dom.window.close();
      return { img, kaynaklar, DATA2 };
    };
    const m = await olc(390, true);
    const ms = await olc(1440, false);
    const mobilEager = m.img.length > 0 && m.img.every(i => !i.hasAttribute('loading'));
    const mobil640 = m.kaynaklar.length > 0 && m.kaynaklar.every(s => /-k-640\.webp$/.test(s));
    const masaEski = ms.img.length > 2
      && ms.img.every((i, x) => (x < 2) === !i.getAttribute('loading')
                             && (x < 2 || i.getAttribute('loading') === 'lazy'));
    /* disk + alan: DATA'da imgk taşıyan her proje imgk6 da taşır; dosya
       diskte ve -k orijinalinden KÜÇÜK (küçültme gerçekleşmiş). */
    const prj = (m.DATA2.projects || []).filter(p => p.imgk);
    const alanKusur = prj.filter(p => !p.imgk6 || !/-k-640\.webp$/.test(p.imgk6)).map(p => p.slug);
    const dosyaKusur = prj.filter(p => p.imgk6 &&
      (!fs.existsSync(path.join(KOK, p.imgk6)) || !fs.existsSync(path.join(KOK, p.imgk)) ||
       fs.statSync(path.join(KOK, p.imgk6)).size >= fs.statSync(path.join(KOK, p.imgk)).size))
      .map(p => p.slug);
    /* canlı zincir: kökteki content.json (panel yayını) da alanı taşımalı */
    const cj = path.join(KOK, 'content.json');
    let icerikKusur = [];
    if (fs.existsSync(cj)) {
      try {
        icerikKusur = (JSON.parse(fs.readFileSync(cj, 'utf8')).projects || [])
          .filter(p => p.imgk && !p.imgk6).map(p => p.slug);
      } catch (e) { icerikKusur = ['content.json ayrıştırılamadı']; }
    }
    ol('deste görselleri: mobil eager + 640 türev, masaüstü eski, alan zinciri tam',
       mobilEager && mobil640 && masaEski
         && prj.length > 0 && alanKusur.length === 0
         && dosyaKusur.length === 0 && icerikKusur.length === 0,
       `mobilEager=${mobilEager}(${m.img.length}) mobil640=${mobil640} masaEski=${masaEski}` +
       ` alan=${alanKusur.join(',') || 'tam'} dosya=${dosyaKusur.join(',') || 'tam'}` +
       ` content=${icerikKusur.join(',') || 'tam'}`);
  }

  /* 120 · İÇERİK GÖRÜNÜR DOĞAR (2026-08 mobil sahne bütçesi, Madde 1):
     .rv ve gözlemci-gecikmeli içerik aileleri opacity:0 doğup JS
     gözlemcisinden izin bekliyordu; hızlı savurmada gözlemci geç kalır,
     ekran boş görünür. Mobilde içerik JS HİÇ KOŞMADAN tam opak olmalı.
     Aile listesi sitenin KENDİ prefers-reduced-motion sözleşmesinden
     türedi (animasyonsuz içerik dürüstlüğünün tek kaynağı). Kaydırma-
     ilerleme bağlı sahneler (st/ai/fl: senkron, gözlemci yok), etkileşim
     durumları (menü, akordeon, sektör paneli) ve dekoratifler kapsam
     dışı. Ölçüm: mobil eşlemeli JS'siz statik DOM'da hesaplanmış stil —
     eleman statik yoksa sonda (probe) ile, CSS ölçülür, işaretleme değil. */
  {
    const w2 = mobilStatikDOM(html); const d2 = w2.document;
    const sonda = sec => {
      let el = d2.querySelector(sec);
      if (!el) {   /* seçici zincirini kur: '#tespit h2 .lt i' → iç içe */
        let ust = d2.body;
        for (const p of sec.split(/\s+/)) {
          const e = d2.createElement(p === 'i' ? 'i' : p === 'h2' ? 'h2' : 'div');
          if (p.startsWith('#')) e.id = p.slice(1);
          else if (p.startsWith('.')) e.className = p.slice(1).split('.').join(' ');
          ust.appendChild(e); ust = e;
        }
        el = ust;
      }
      return w2.getComputedStyle(el);
    };
    const aile = ['.rv', '#tespit h2 .lt i', '.tlsay', '.tlok', '.tcard', '.mfg',
                  '.szleak', '.szout', '.gnrow', '.kdrow', '.tpcard', '.mkfr',
                  '.mkhy', '.qtrow', '.qtreply', '.akq', '.aksum'];
    const kusur = aile.filter(sec => {
      const cs = sonda(sec);
      return cs.opacity !== '1' || (cs.transform && cs.transform !== 'none');
    });
    ol('mobil içerik görünür doğar (JS koşmadan .rv + gözlemci aileleri tam opak)',
       kusur.length === 0, kusur.join(',') || `${aile.length} aile tam`);
  }

  /* 121 · LOWFX DOKUNMATİK GERÇEĞİYLE AÇILIR (Madde 2): eski koşul
     (CORES 2-3 || MEM<=2 || eski Android) her iPhone'da DAİMA yanlıştı —
     Safari deviceMemory VERMEZ (varsayılan 4), iPhone çekirdeği 4+;
     sekiz kalemlik hafif-mod koruması mobilde hiç açılmıyordu. Koşula
     tahmin değil ölçüm eklendi: pointer:coarse || innerWidth<=900.
     İki taraflı kilit: mobil eşlemede html.lowfx VAR ve stars kurulumu
     KOŞMAZ (#stars'a getContext çağrısı yok); masaüstü eşlemede lowfx
     YOK ve stars koşar — masaüstü davranışı da aynı kuralla kilitli. */
  {
    const kaynakL = fs.readFileSync(SRC, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const tanim = /const COARSE=matchMedia\('\(pointer:coarse\)'\)\.matches\|\|innerWidth<=900/.test(kaynakL)
               && /const LOWFX=COARSE\|\|/.test(kaynakL);
    const stub = w => {
      const yok = () => {};
      w.gsap = { registerPlugin: yok, to: yok, from: yok, set: yok, fromTo: yok,
                 ticker: { add: yok, remove: yok, lagSmoothing: yok } };
      w.ScrollTrigger = { create: () => ({}), config: yok, refresh: yok,
                          update: yok, getAll: () => [] };
      w.Lenis = class { on() {} raf() {} scrollTo() {} };
      const eski = w.HTMLCanvasElement.prototype.getContext;
      w.__ctxKim = [];
      w.HTMLCanvasElement.prototype.getContext = function (t) {
        w.__ctxKim.push(this.id || ''); return eski.call(this, t);
      };
    };
    const olc = async (px, coarse) => {
      const { dom } = ortam(html, ORIGIN + '/',
        { w: px, mm: coarse ? ['pointer:coarse'] : [], kur: stub });
      await dur(1200);
      const s = { lowfx: dom.window.document.documentElement.classList.contains('lowfx'),
                  stars: dom.window.__ctxKim.includes('stars') };
      dom.window.close();
      return s;
    };
    const mob = await olc(390, true);
    const mas = await olc(1440, false);
    ol('lowfx dokunmatikte açık (mobil: lowfx+stars yok · masaüstü: lowfx\'siz+stars var)',
       tanim && mob.lowfx && !mob.stars && !mas.lowfx && mas.stars,
       `tanim=${tanim} mob=${mob.lowfx}/${mob.stars} mas=${mas.lowfx}/${mas.stars}`);
  }

  /* 122 · YILDIZ + TANECİK MOBİLDE STATİK GARANTİYLE YOK (Madde 3):
     kural 121 bunları JS yoluyla kapatır; betik geç kalsa ya da patlasa
     bile süs katmanı doğmamalı — JS'ten bağımsız CSS garantisi. Eski
     mobil blok #noise'u kapatıp #stars'ı opacity:.4'te BIRAKIYORDU. */
  {
    const w3 = mobilStatikDOM(html); const d3 = w3.document;
    const gor = id => {
      let el = d3.getElementById(id);
      if (!el) { el = d3.createElement('canvas'); el.id = id; d3.body.appendChild(el); }
      return w3.getComputedStyle(el).display;
    };
    const stars = gor('stars'), noise = gor('noise');
    ol('mobilde #stars ve #noise hesaplanmış display:none (JS\'siz)',
       stars === 'none' && noise === 'none', `stars=${stars} noise=${noise}`);
  }

  /* 123 · BACKDROP-FILTER MOBİLDE SIFIR (Madde 4): kaynakta 18
     backdrop-filter vardı (sabit menü zemini 20px blur dahil) — iOS'ta
     kaydırma başına en pahalı kompozit sınıfı. Mobil blokta kapsayıcı
     kapatma (evrensel, !important — gelecekte eklenen blur da ölür) +
     blur'a yaslanan panel yüzeylerine düz, okunur zemin (alfa ≥ .85).
     #bitsay/#bitback mobilde zaten display:none — sayılmaz. Çipler
     (.pill, .void, sthdr rozetleri) tek renkli sayfa zemini üstünde:
     tonları kalır, zemin şartı panellere. */
  {
    const kaynakB = fs.readFileSync(SRC, 'utf8');
    const sikB = kaynakB.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s/g, '');
    const kapsayici = sikB.includes(
      '*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}');
    const w4 = mobilStatikDOM(html); const d4 = w4.document;
    const alfa = sec => {
      let el = d4.querySelector(sec);
      if (!el) {
        let ust = d4.body;
        for (const p of sec.split(/\s+/)) {
          const e = d4.createElement('div');
          if (p.startsWith('#')) e.id = p.slice(1); else e.className = p.replace(/^\./, '');
          ust.appendChild(e); ust = e;
        }
        el = ust;
      }
      const m = (w4.getComputedStyle(el).backgroundColor || '').match(/rgba?\(([^)]+)\)/);
      if (!m) return 0;
      const par = m[1].split(',').map(x => parseFloat(x));
      return par.length === 4 ? par[3] : 1;
    };
    const yuzey = ['.navin', '.dkimg .yr', '.szbeat', '.mkhud', '#xcOv'];
    const ince = yuzey.filter(s => alfa(s) < 0.85);
    ol('mobilde backdrop-filter sıfır (kapsayıcı) + panel zeminleri opak (alfa ≥ .85)',
       kapsayici && ince.length === 0,
       `kapsayici=${kapsayici} ince=${ince.join(',') || 'yok'}`);
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
  /* 78 · mobil kaydırma sözleşmesi (2026-08, Enes'in telefon turu):
     Lenis yalnız innerWidth>880'de kuruluyor; scroll-behavior ise
     'html' üzerinde açık, 'html.lenis' ile kapanıyordu. Sonuç: yumuşak
     kaydırma SADECE mobilde aktifti, her programatik scrollTo animasyona
     dönüşüyor ve açılıştaki düzen değişikliği onu kesince sayfa rastgele
     bir noktada duruyordu. Üç şart birlikte kilitleniyor. */
  {
    const kaynakM = fs.readFileSync(SRC, 'utf8');
    const varsayilanAnlik = kaynakM.indexOf('html{scroll-behavior:' + 'auto') > -1
                         && kaynakM.indexOf('html{scroll-behavior:' + 'smooth') === -1;
    const geriYukleme = kaynakM.indexOf("history.scrollRestoration='manual'") > -1;
    const iSif = kaynakM.indexOf('if(!keep){');
    const govde = iSif > -1 ? kaynakM.slice(iSif, iSif + 260) : '';
    /* DİKKAT: yalnız "ikisi de geçiyor mu" diye bakmak YANLIŞ YEŞİL verir —
       eski kod da her iki dizgeyi taşıyordu, ama biri else dalındaydı
       (yani ikisinden yalnız BİRİ koşuyordu). Ayırt edici koşul: else yok. */
    const ikiliSifirlama = govde.indexOf('scrollTo(0,0)') > -1
                        && govde.indexOf('__lenis') > -1
                        && govde.indexOf('else scrollTo(0,0)') === -1;
    ol('mobil kaydırma sözleşmesi (varsayılan anlık + manual + ikili sıfırlama)',
       varsayilanAnlik && geriYukleme && ikiliSifirlama,
       `anlık=${varsayilanAnlik} manual=${geriYukleme} ikili=${ikiliSifirlama}`);
  }
  /* 79 · reveal ailesi kaydırmaya bağlı (2026-08, mobil diyagram boşluğu):
     .kdrow/.tpcard varsayılan opacity:0; görünürlük kutuya inen .in'e
     bağlı. .in yalnız IO'dan ve kurulum anındaki tek atışlık geometri
     kontrolünden geliyordu — IO tetiklenmezse içerik KALICI görünmez
     kalıyordu. Kaydırma bağlaması olmadan bu sınıf geri döner.
     2026-08 GÜNCELLENDİ (kural 108): şart HAM `resize` değil, GENİŞLİK
     KAPISI. Kuralın ilk hâli ham `resize` bağını arıyordu; o bağ mobilde
     adres çubuğu her oynadığında `tara()`yı uyandırıyor, kalan her kutu
     için getBoundingClientRect okutuyordu. Kuralın KORUDUĞU şey kaybolmuş
     değil: "kutu ekranın altında kaldı ve hiç açılmadı" hatasını yakalayan
     KAYDIRMA bağı, adres çubuğu değil. Kaydırma bağı zorunlu kalıyor,
     boyut bağı kapıdan geçmek zorunda.                                 */
  {
    /* YORUMLAR AYIKLANIR — pencere sabit bayt genişliğinde olduğu için
       yorum eklemek kuralı sessizce kaydırıyordu: 108 yamasının açıklama
       bloğu `genislikDegisince(taraKisitli)`yi 1400 baytlık pencerenin
       31 bayt dışına itti ve kural KOD değişmediği hâlde kırmızı yandı.
       Ölçülen şey artık yalnız kod.                                    */
    const kaynakR = fs.readFileSync(SRC, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const iT = kaynakR.indexOf('window.__tara=tara;');
    const pencere = iT > -1 ? kaynakR.slice(iT, iT + 1400) : '';
    const kaydirma = pencere.indexOf("addEventListener('scroll'") > -1;
    const boyut = pencere.indexOf('genislikDegisince(taraKisitli)') > -1;
    const hamYok = pencere.indexOf("addEventListener('resize'") === -1;
    const kisit = pencere.indexOf('requestAnimationFrame') > -1;
    ol('reveal ailesi kaydırmaya bağlı (tek atışlık değil)',
       iT > -1 && kaydirma && boyut && hamYok && kisit,
       `scroll=${kaydirma} genislikKapisi=${boyut} hamResizeYok=${hamYok} rAF=${kisit}`);
  }
  /* 80 · mobil pazar sahnesi yüksekliği (2026-08, motor taşması):
     .mkeng mobilde tek sütuna düşüyor, .mkact overflow:hidden — sahne
     yüksekliği sabit ve kısa olursa hipotez satırları alttan kesiliyor.
     İki şart: üst sınır ≥600px VE ekran yüksekliğine bağlı bir tavan
     (100vh) — yoksa .mkstage'in max-height'ı devreye girip yeniden
     kırpar. Sabit küçük bir clamp geri konursa kural düşer. */
  {
    const kaynakV = fs.readFileSync(SRC, 'utf8');
    const iV = kaynakV.indexOf('.mkview{height:clamp(', kaynakV.indexOf('@media(max-width:860px){\n  .mkrail'));
    const satir = iV > -1 ? kaynakV.slice(iV, kaynakV.indexOf('}', iV) + 1) : '';
    const ekranaBagli = satir.indexOf('100vh') > -1;
    const ustSinir = (satir.match(/,(\d+)px\)\}$/) || [, '0'])[1] * 1 >= 600;
    ol('mobil pazar sahnesi yüksekliği (ekrana bağlı + üst sınır ≥600px)',
       iV > -1 && ekranaBagli && ustSinir,
       `${satir || 'kural bulunamadı'} · vh=${ekranaBagli} ust=${ustSinir}`);
  }
  /* 81 · klasör telleri ölçülmüş kart merkezine hizalanır (2026-08):
     deliverStage teller için y=(100/n)*(i+.5) basıyor — kartların eşit
     yükseklikte ve aralıksız olduğu varsayımı. .tpcards flex sütun + gap
     taşıyor ve kart yükseklikleri içeriğe göre değişiyor, o yüzden telin
     ucu kartın ortasını ıskalıyordu (ölçümde 5.8 puana kadar sapma).
     Hizalama kodu ve kurulum turuna kaydı birlikte kilitleniyor. */
  {
    const kaynakT = fs.readFileSync(SRC, 'utf8');
    const hizalaVar = kaynakT.indexOf('const telHizala') > -1;
    const merkezOlcumu = kaynakT.indexOf('kr.top + kr.height / 2') > -1;
    const kurulumda = kaynakT.indexOf("'__telHizala'") > -1;
    ol('klasör telleri ölçülmüş kart merkezine hizalanır',
       hizalaVar && merkezOlcumu && kurulumda,
       `hizala=${hizalaVar} merkez=${merkezOlcumu} kurulumTuru=${kurulumda}`);
  }
  /* 82 · klasör telleri TEK BİRİMDE yaşar (2026-08, üç aşamada öğrenildi):
     1. hata: sabit dasharray:200 → uzun teller kesildi. 2. hata:
     getTotalLength (viewBox birimi) dasharray'e (non-scaling-stroke →
     cihaz pikseli) yazıldı → zoom'a bağlı kesilme. 3. teşhis: ölçüm CSS
     pikselinde, dash cihaz pikselinde — zoom oranı ikisini ayırıyor.
     KALICI İLKE: viewBox SVG'nin kendi piksel boyutuna eşitlenir (tek
     birim), non-scaling-stroke bu yollarda YASAK, uç gerçek nokta
     konumuna (kart sol kenarı) çizilir. Şartlar aşağıda. */
  {
    const kaynakD = fs.readFileSync(SRC, 'utf8');
    const iTH = kaynakD.indexOf('const telHizala');
    const bolge = iTH > -1 ? kaynakD.slice(iTH, iTH + 3400) : '';
    const tekBirim = bolge.indexOf("svg.setAttribute('viewBox'") > -1
                  && bolge.indexOf('getTotalLength') > -1
                  && bolge.indexOf('strokeDasharray') > -1;
    const ucNoktada = bolge.indexOf('kr.left - sr.left') > -1;
    const cssBlok = (kaynakD.match(/\.tpwires path\{[^}]*\}/) || [''])[0];
    const cihazUzayiYok = cssBlok.indexOf('non-scaling-stroke') === -1;
    const yedek = ((cssBlok.match(/stroke-dasharray:(\d+)/) || [, '0'])[1] * 1) >= 600;
    const oncelik = /\.tpbox\.in \.tpwires path\{stroke-dashoffset:0 !important\}/.test(kaynakD);
    ol('klasör telleri tek birimde (piksel viewBox + uç noktada + cihaz-uzayı yasak)',
       tekBirim && ucNoktada && cihazUzayiYok && yedek && oncelik,
       `tekBirim=${tekBirim} ucNoktada=${ucNoktada} cihazUzayiYok=${cihazUzayiYok} yedek=${yedek} oncelik=${oncelik}`);
  }
  /* 83 · animasyon hız sözleşmesi (2026-08): sahne pin'i mobilde de kurulur.
     Eskiden canPin innerWidth>880 taşıyordu → mobil, ekrandan geçen kısa
     pencerede scrub'lanıyor, GEO/TradeSelf sahneleri okunamadan bitiyordu.
     Pin'in mobilde güvenli olması ignoreMobileResize'a bağlı (adres çubuğu
     resize'ı pin'i bozmasın). İkisi birlikte kilitlenir. */
  {
    const kaynakP = fs.readFileSync(SRC, 'utf8');
    const iCP = kaynakP.indexOf('const canPin=');
    const cpSatir = iCP > -1 ? kaynakP.slice(iCP, kaynakP.indexOf(';', iCP)) : '';
    const mobildeAcik = iCP > -1 && cpSatir.indexOf('innerWidth') === -1;
    const resizeBagisik = kaynakP.indexOf('ignoreMobileResize:true') > -1;
    ol('sahne pin mobilde açık + ignoreMobileResize yapılandırılmış',
       mobildeAcik && resizeBagisik,
       `mobildeAcik=${mobildeAcik} resizeBagisik=${resizeBagisik}`);
  }
  /* 84 · proje kartları standart boyut — İKİ BİLEŞEN (2026-08):
     Bu sitede iki ayrı proje kartı var, ortak kodları yok:
       arşiv (/projeler) → projectsArchiveKur → .mi/.mi-t, masonry
       ana sayfa        → renderProjects     → .dk/.dkin, sticky deste
     İlk yazımda yalnız arşiv kilitlenmişti; belirti ana sayfada da
     vardı ve kural sessiz kaldı. Artık ikisi birden:
     ARŞİV: VH ritim dizisi yok, --vh atanmaz, CSS varsayılanı 220px.
     ANA SAYFA: .dkimg img MUTLAKA absolute — relative+height:100%
     iken görsel doğal yüksekliğiyle akışa katkı verip kart boyutunu
     kendi belirliyordu. Her ikisinde ilk kartlar eager. */
  {
    const kaynakK = fs.readFileSync(SRC, 'utf8');
    /* arşiv */
    const ritimYok = kaynakK.indexOf('VH[i%VH.length]') === -1
                  && !/setProperty\('--vh'/.test(kaynakK);
    const arsivVarsayilan = kaynakK.indexOf('height:var(--vh,220px)') > -1;
    const arsivEager = /i<3\?'decoding/.test(kaynakK);
    /* ana sayfa destesi */
    const dkKural = (kaynakK.match(/\.dkimg img\{[^}]*\}/) || [''])[0];
    const dkAkistanCikti = dkKural.indexOf('position:absolute') > -1
                        && dkKural.indexOf('inset:0') > -1;
    const dkEager = /i<2\?'decoding="async"'/.test(kaynakK);
    ol('proje kartları standart boyut — arşiv + ana sayfa destesi',
       ritimYok && arsivVarsayilan && arsivEager && dkAkistanCikti && dkEager,
       `arsiv[ritim=${ritimYok} varsayilan=${arsivVarsayilan} eager=${arsivEager}] ` +
       `deste[akistanCikti=${dkAkistanCikti} eager=${dkEager}]`);
  }
  /* 85 · hero halkası SÜREKLİ döner (2026-08, Enes'in düzeltilmiş kararı):
     Önce "taramalı" seçilmişti (tur at, sön, bekle) ve kural onu
     kilitliyordu. Enes canlıda görüp fikrini değiştirdi: kuyruklu kıvılcım
     DURMADAN dönsün. Kural da yeni sözleşmeyi kilitliyor.
     MARKUP EŞLEŞMESİ (Code'un yazdığı, korunuyor): kuralın ilk taslağı
     yalnız CSS metninde dizi arıyordu — ayrı bir .btn[data-t="cta1"]::after
     bloğu yazılmıştı ama hero butonunun sınıfı .void ve data-t iç span'de,
     yani kural HİÇBİR elemana inmeyen CSS'i yeşil sayıyordu. Bu yüzden
     buton gerçekten .void mü ve içinde .ring var mı diye bakılır.
     TEK HIZ KAYNAĞI: eski tasarımda tur/bekleme oranı iki yerde birden
     yaşıyordu (bölen + keyframe yüzdesi) ve ayrışırlarsa hız sessizce
     kayıyordu. Sürekli dönüşte bölen kalktı; kural bölenin geri
     gelmediğini ve keyframe'de sönme evresi olmadığını da ölçer. */
  {
    const kaynakT = fs.readFileSync(SRC, 'utf8');
    const iB = kaynakT.indexOf('<button class="void"');
    const btn = iB > -1 ? kaynakT.slice(iB, kaynakT.indexOf('</button>', iB)) : '';
    const markupBagli = /class="ring"/.test(btn) && /data-t="cta1"/.test(btn);
    const iKF = kaynakT.indexOf('@keyframes voidring');
    const kf = iKF > -1 ? kaynakT.slice(iKF, kaynakT.indexOf('}}', iKF) + 2) : '';
    const surekli = kf.indexOf('rotate(1turn)') > -1 && kf.indexOf('opacity:0') === -1;
    const tekHizKaynagi =
      /animation:voidring var\(--ring-spd\) linear infinite/.test(kaynakT)
      && !/voidring calc\(var\(--ring-spd\)\//.test(kaynakT);
    const korumalar = kaynakT.indexOf('@supports not ((-webkit-mask-composite:xor)') > -1
      && /prefers-reduced-motion:reduce\)\{\.void \.ring::before\{animation:none/.test(kaynakT);
    /* 2026-08: lowfx halkayı SUSTURMAMALI. Canlıda ölçüldü — Enes'in
       8 çekirdekli makinesinde lowfx açıktı (Chrome deviceMemory'yi ≤2
       bildiriyor) ve `html.lowfx .void .ring::before{animation:none}`
       yüzünden halka hiç dönmedi. Dönen şey bir sözde-elemanın
       transform'u: derleyici katmanında koşar. Pahalı olan drop-shadow
       parıltısıdır — lowfx onu kaldırır, animasyonu değil. */
    const lowfxSusturmuyor =
      kaynakT.indexOf('html.lowfx .void .ring::before{animation:none}') === -1
      && kaynakT.indexOf('html.lowfx .void .ring{filter:none}') > -1;
    ol('hero halkası: sürekli dönüş + markup bağlı + tek hız kaynağı + lowfx susturmuyor',
       markupBagli && surekli && tekHizKaynagi && korumalar && lowfxSusturmuyor,
       `markup=${markupBagli} surekli=${surekli} tekHiz=${tekHizKaynagi} korumalar=${korumalar} lowfx=${lowfxSusturmuyor}`);
  }
  /* 86 · will-change disiplini (2026-08, Performance kaydıyla ölçüldü):
     24,3 sn'lik kayıtta **Layerize 3.325 ms (%21,5)** çıktı — kompozitör
     zamanının beşte biri katman yönetiminde geçiyordu. Sebep kalıcı
     will-change bildirimleriydi; en kötüsü `.mi{will-change:...,filter}`,
     her arşiv kartına filtre destekli bir katman ayırtıyordu (kartlar
     hareket etmediği anlarda bile). will-change bir ipucu değil, peşin
     ödenen maliyettir: yalnız SÜREKLİ hareket eden elemanlarda durur.
     Üç şart: `filter` hiçbir will-change'de geçmez · toplam bildirim
     ≤10 · `.mi` bloğunda will-change yok. Yorumlar sayıma girmez —
     bu dosyadaki yorumlar CSS metni alıntılıyor. */
  {
    const kaynakW = fs.readFileSync(SRC, 'utf8');
    const stil = (kaynakW.match(/<style[^>]*>([\s\S]*?)<\/style>/) || [, ''])[1];
    const temiz = stil.replace(/\/\*[\s\S]*?\*\//g, '');
    const bildirimler = [...temiz.matchAll(/([^{}]+)\{[^}]*will-change\s*:\s*([^;}]+)/g)];
    const filtreYok = bildirimler.every(m => m[2].indexOf('filter') === -1);
    const sayiTamam = bildirimler.length <= 10;
    const miBlok = (temiz.match(/\.mi\{[^}]*\}/) || [''])[0];
    const miTemiz = miBlok.indexOf('will-change') === -1;
    ol('will-change disiplini (filter yok · ≤10 bildirim · .mi temiz)',
       filtreYok && sayiTamam && miTemiz,
       `filtreYok=${filtreYok} sayi=${bildirimler.length} miTemiz=${miTemiz}`);
  }
  /* 87 · GSAP gecikme koruması açık kalır (2026-08):
     `gsap.ticker.lagSmoothing(0)` Lenis belgelerinden kopyalanmış hazır
     satırdı ve GSAP'ın gecikme telafisini KAPATIYORDU: uzun bir kareden
     sonra GSAP açığı kapatmaya çalışıp bir sonraki kareyi de uzatıyor.
     ÖLÇÜM: elle kaydırma koşumları %15 → %9 → %8 gitti — o düşüş ayarın
     değil sayfa ısınmasının eseriydi, kontrol koşumu bunu çürüttü.
     Nedenselliği programlı kaydırma kurdu (Lenis.scrollTo, birebir aynı
     girdi, ayar dönüşümlü, iki bağımsız çift):
       (0)      → 19 ve 38 geç kare
       (500,33) → 10 ve 16 geç kare
     Kazanç mütevazı ama tekrarlanabilir; ayrıca GSAP'ın kendi
     varsayılanına dönüş. Biri `(0)`'a geri döndürürse bu kural yakalar. */
  {
    const kaynakL = fs.readFileSync(SRC, 'utf8');
    /* YORUMLAR AYIKLANIR: yukarıdaki açıklama ve index.html'deki yama
       yorumu eski `lagSmoothing(0)` satırını birebir alıntılıyor; ham
       aramada kural kendi belgesine takılıp yanlış kırmızı verir.
       (Bugün üçüncü kez yaşandı — bkz. kural 82 ve 86.) */
    const kod = kaynakL.replace(/\/\*[\s\S]*?\*\//g, '');
    const kapaliDegil = !/lagSmoothing\(\s*0\s*\)/.test(kod);
    const korumaVar = /gsap\.ticker\.lagSmoothing\(\s*500\s*,\s*33\s*\)/.test(kod);
    ol('GSAP gecikme koruması açık (lagSmoothing kapatılmamış)',
       kapaliDegil && korumaVar,
       `kapaliDegil=${kapaliDegil} korumaVar=${korumaVar}`);
  }
  /* 112 · TEK HAREKET MOTORU — Motion One gömüsü söküldü (2026-08).
     63.678 baytlık sarmalayıcı yalnız iki yerde kullanılıyordu (perde
     masaüstü girişi/çıkışı + kadro hover kartı) ve kendisi de altında
     WAAPI koşturuyordu; mobil onu HİÇ çalıştırmadığı hâlde her sayfa
     yüklemesinde ayrıştırıyordu (belgenin %7,1'i). Söküm sonrası aynı
     motor (Element.animate) boot içindeki anim()/kademe() yardımcıları
     üzerinden doğrudan çağrılıyor; raporların ortak "tek motor" hükmü.
     DİKKAT: sondaki On'lu bayrak (sahne motoru kapısı) AYRI bir şeydir,
     desen onu bilerek dışlar. Aranan adlar bu yoruma bitişik yazılmadı
     (kural 65 dersi: kaynağı tarayan kural kendi metnine takılır) —
     çalışma anında birleştiriliyor; SRC tarafında da yorumlar atılıyor. */
  {
    const kaynakM = fs.readFileSync(SRC, 'utf8');
    const kod = kaynakM.replace(/\/\*[\s\S]*?\*\//g, '');
    const mtn = '__mo' + 'tion';
    const tanimYok = !new RegExp('window\\.' + mtn + '\\s*=').test(kod);
    const cagriYok = !new RegExp('window\\.' + mtn + '\\s*[.)]').test(kod)
                  && !new RegExp('\\bM\\.ani' + 'mate\\(').test(kod);
    const yerliVar = /function anim\(/.test(kod) && /function kademe\(/.test(kod)
                  && /inr\.animate\(/.test(kod);
    ol('tek hareket motoru: Motion gömüsü yok, perde yerli WAAPI',
       tanimYok && cagriYok && yerliVar,
       `tanimYok=${tanimYok} cagriYok=${cagriYok} yerliVar=${yerliVar}`);
  }
  /* 108 · ADRES ÇUBUĞU YENİDEN KURULUM YAPTIRMAZ (2026-08 mobil kasma).
     Mobilde `resize` bir yeniden kurulum sinyali DEĞİL: adres çubuğu her
     açılıp kapandığında yalnız yükseklik oynar ve pencere `resize` atar.
     Bu tam olarak kaydırma YÖNÜ değişince olur (aşağı inerken çubuk
     gizlenir, yukarı çıkarken geri gelir) — Enes'in "yukarı çıkınca
     tekrar donuyor" belirtisinin mekanizması buydu.
     ÖLÇÜLDÜ (yama öncesi kaynak): yedi sistem ham `resize`e bağlıydı ve
     hepsi yüksekliğe DUYARSIZ iş yapıyordu — wordmark bit matrisini,
     harita 400×142 ızgarasını, yıldız noktalarını baştan üretmek;
     masonry'de kart başına offsetHeight okumak; tel ve kutu geometrisini
     yeniden ölçmek. ScrollTrigger bu tuzağa karşı zaten korunuyordu
     (`ST.config({ignoreMobileResize:true})`), gerisi korunmuyordu.
     Kural üç şeyi birden tutuyor, çünkü ikisi tek başına yanlış yeşil
     verir: kapı VAR ama kimse kullanmıyorsa, ya da kapı var ve biri
     yanına yeni bir ham bağ eklerse belirti geri gelir. Bu yüzden ham
     bağların tamamı sayılıyor ve YALNIZ bilinçli izinliler geçiyor;
     listede olmayan her yeni bağ kuralı kırmızıya düşürür ve metnini
     raporda gösterir. `visualViewport` resize'ı hiç kalmamalı: o zaten
     SADECE adres çubuğu ve klavye için ateşliyordu.                    */
  {
    const kaynakR = fs.readFileSync(SRC, 'utf8');
    /* YORUMLAR AYIKLANIR: index.html'deki yama yorumu `resize` sözcüğünü
       ve eski satırları anlatıyor; ham arama kendi belgesine takılır.
       (Kural 82, 86 ve 87'nin dersi — bu depoda dördüncü kez.)         */
    const kod = kaynakR.replace(/\/\*[\s\S]*?\*\//g, '');

    const kapiVar = /const\s+genislikDegisince\s*=/.test(kod);
    /* Kapı GENİŞLİĞE bakmalı. `innerWidth` layout genişliğidir: gerçek
       yön çevirme onu değiştirir, adres çubuğu ve parmakla yakınlaştırma
       değiştirmez. Yüksekliğe bakan bir kapı hiçbir şey çözmezdi.      */
    const kapiGenislik = /const\s+w\s*=\s*innerWidth;\s*if\s*\(\s*w\s*===\s*son\s*\)\s*return;/.test(kod);
    const vvYok = kod.indexOf("visualViewport.addEventListener('resize'") === -1;

    /* Bilinçli izinliler — her biri ya genişliğe zaten şartlı, ya da
       görünmezken/veri yokken anında dönüyor. Yeni bir satır eklemek
       serbest DEĞİL: buraya yazılması, yani gerekçelendirilmesi gerek. */
    const IZIN = [
      'const w=innerWidth',                          /* kapının kendisi */
      'innerWidth>980&&m&&m.classList.contains',      /* mobil menü kapanışı — zaten genişlik şartlı */
      'kbBekle',                                      /* hizmet detay kabloları (#sdBody) */
      'window.__stlvFit&&window.__stlvFit()',         /* hizmet detay hikâye kadrajı */
      'rt=setTimeout(fitQ,180)'                       /* söz bandı — offsetParent yoksa anında döner */
    ];
    const ham = [];
    const re = /addEventListener\(\s*'resize'/g;
    let m;
    while ((m = re.exec(kod))) {
      const parca = kod.slice(m.index, m.index + 190).replace(/\s+/g, '');
      if (IZIN.some(k => parca.indexOf(k.replace(/\s+/g, '')) > -1)) continue;
      ham.push(kod.slice(m.index, m.index + 58).replace(/\s+/g, ' '));
    }
    /* Kapı gerçekten KULLANILIYOR mu — korunan yedi sistem. Tanım satırı
       `genislikDegisince=(` olduğu için bu sayıma girmiyor.            */
    const abone = (kod.match(/genislikDegisince\(/g) || []).length;

    /* #wmk ayrıca GÖRÜNÜRLÜĞE bağlı: footer'da ve `.pg` damgası yok, yani
       hiçbir rotada gizlenmiyor. Eski hâli ziyaretçi sayfanın en üstünde
       dururken bile tuvali baştan inşa ediyordu. Görünmezken yalnız bayat
       işaretlenmeli, inşa kadraja girişte olmalı.                       */
    const wmkGorunurluk = /if\(!seen\)\{bayat=true;return;\}/.test(kod.replace(/\s+/g, ''))
                       && /if\(bayat\)\{bayat=false;stop\(\);boot\(\);return;\}/.test(kod.replace(/\s+/g, ''));

    ol('adres çubuğu (yalnız yükseklik) yeniden kurulum tetiklemiyor',
       kapiVar && kapiGenislik && vvYok && ham.length === 0 && abone >= 7 && wmkGorunurluk,
       `kapi=${kapiVar}/${kapiGenislik} vvYok=${vvYok} abone=${abone} wmkGorunurluk=${wmkGorunurluk}` +
       (ham.length ? ` · IZINSIZ HAM BAG=${ham.length}: ${ham.slice(0, 3).join(' | ')}` : ' · izinsiz ham bag yok'));
  }
  /* 109 · MOBİL DESTE KARTI: GÖRSEL KART BOYUTUNDA GELİR (2026-08).
     Belirti: ana sayfada proje kartları geçilirken mobilde takılma —
     kural 108'den (adres çubuğu) SONRA da sürdü, yani ayrı bir sebep.
     ÖLÇÜLDÜ: destenin dört görseli 1,07–1,70 MP (1600px genişlik) ve
     mobilde ~350×186 CSS'lik kutuya giriyor. Dosyalar küçük (546 KB
     toplam) — "indirme değil" elemesi bu yüzden doğruydu. Pahalı olan
     ÇÖZÜLMÜŞ BİTMAP: dört kart 33 MB RGBA. deviceMemory ≤2 bir telefonda
     tarayıcı bunları bellek baskısında atıp yeniden çözer; kartları
     geçerken VE yukarı dönünce yeniden takılmanın ikisi de buradan.
     Kural dört şeyi birden tutuyor, çünkü üçü tek başına yanlış yeşil
     verir:
       (a) alan var mı — `imgk` tanımlı mı;
       (b) DOSYA GERÇEKTEN VAR MI — `<picture>` içinde 404 veren bir
           `<source>` `<img>`e GERİ DÜŞMEZ, görsel tamamen kırılır.
           Bu kuralın asıl varlık sebebi bu satır;
       (c) KAZANÇ GERÇEK Mİ — kart görseli kaynaktan en az 2× daha az
           piksel taşımalı, yoksa alan doldurulmuş ama iş yapılmamış olur;
       (d) KIRILMA NOKTASI UYUYOR MU — `<source media>` ile filtreyi
           kapatan CSS aynı px'te olmalı. Ayrışırlarsa aradaki bantta ya
           gri pişmiş görsele filtre İKİNCİ KEZ uygulanır (kapkara kart)
           ya da renkli görsel filtresiz kalır.
     Ayrıca `<source>` yalnız alan varsa basılmalı: panelden eklenen yeni
     projede `imgk` olmaz, eski davranışa düşmesi gerekir.              */
  {
    const kaynakK = fs.readFileSync(SRC, 'utf8');
    const kod = kaynakK.replace(/\/\*[\s\S]*?\*\//g, '');

    /* webp başlığından ölçü — üç gövde biçimi de okunuyor */
    const olcu = p => {
      if (!fs.existsSync(p)) return null;
      const b = fs.readFileSync(p);
      if (b.slice(0, 4).toString() !== 'RIFF' || b.slice(8, 12).toString() !== 'WEBP') return null;
      const t = b.slice(12, 16).toString();
      if (t === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
      if (t === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
      if (t === 'VP8L') { const n = b.readUInt32LE(21); return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1]; }
      return null;
    };

    /* deste yalnız ilk DESTE_PROJE projeyi basıyor; kural ONLARI tutuyor */
    const mD = kod.match(/const\s+DESTE_PROJE\s*=\s*(\d+)/);
    const kacKart = mD ? +mD[1] : 4;
    const iP = kod.indexOf('projects:[');
    const pBlok = iP > -1 ? kod.slice(iP, kod.indexOf('\nposts:', iP) > -1 ? kod.indexOf('\nposts:', iP) : iP + 60000) : '';
    const kartlar = [...pBlok.matchAll(/slug:'([a-z0-9-]+)',image:'([^']+)'(,imgk:'([^']+)')?(,imgc:'([^']+)')?/g)]
      .slice(0, kacKart)
      .map(m => ({ slug: m[1], image: m[2], imgk: m[4] || null, imgc: m[6] || null }));

    /* CANLI ZİNCİR DE ÖLÇÜLÜYOR — bu satırlar kuralın ilk hâlinin
       kaçırdığı şey. `deepMerge` dizileri BÜTÜN OLARAK değiştiriyor
       (`if(Array.isArray(over))return copy(over)`), yani content.json'ın
       `projects`i DATA'yı tamamen eziyor. İlk yamada DATA'ya `imgk`
       yazıldı, kural yeşil yandı ve site `<picture>`ı HİÇ basmadı —
       tarayıcıda ölçülünce yakalandı. Bu depoda aynı sınıf üçüncü kez
       (KVKK metni, kurum tanımı, şimdi kart görseli): kaynağa yazmak
       yayına yazmak DEĞİLDİR. Kural artık iki tarafı da tutuyor.      */
    const cYol = path.join(KOK, 'content.json');
    let cProje = null;
    try { cProje = JSON.parse(fs.readFileSync(cYol, 'utf8')).projects || null; } catch (e) { cProje = null; }

    const eksikAlan = [], eksikDosya = [], zayif = [], canliEksik = [];
    const bak = (k, nereden, kayit) => {
      if (k.imgc) return;                   /* kendi kart görseli olan (bab logosu) muaf */
      if (!k.imgk) { kayit.push(k.slug); return; }
      const yK = olcu(path.join(KOK, k.imgk)), yB = olcu(path.join(KOK, k.image));
      if (!yK) { eksikDosya.push(nereden + ':' + k.imgk); return; }
      if (yB && (yB[0] * yB[1]) < (yK[0] * yK[1]) * 2) zayif.push(`${k.slug} ${yB[0]}x${yB[1]}→${yK[0]}x${yK[1]}`);
    };
    for (const k of kartlar) bak(k, 'DATA', eksikAlan);
    if (cProje) for (const p of cProje.slice(0, kacKart)) bak(p, 'content.json', canliEksik);

    /* `<source>` yalnız alan varsa — 404 tuzağına karşı tek koruma */
    const sartli = /p\.imgk&&!p\.imgc\s*\?/.test(kod.replace(/\s+/g, m => m.includes('\n') ? '' : m).replace(/\s/g, ''))
                || kod.replace(/\s/g, '').indexOf('p.imgk&&!p.imgc?') > -1;

    /* kırılma noktası: <source media> ile CSS aynı px */
    const mS = kod.match(/<source media="\(max-width:(\d+)px\)"/);
    /* Aynı kırılma noktasında YEDİ ayrı @media bloğu var; ilkine bakmak
       yanlış kırmızı verir. Hepsi taranıyor, biri hepsini taşıyorsa yeter.
       Blok sonu süslü parantez sayarak bulunuyor — sabit bayt penceresi
       yorum/kural eklendikçe kayıyordu (kural 79'un bu turdaki dersi).  */
    const css = kaynakK.replace(/\/\*[\s\S]*?\*\//g, '');
    const blok = i => {
      let d = 0, j = css.indexOf('{', i);
      for (let k = j; k < css.length; k++) {
        if (css[k] === '{') d++;
        else if (css[k] === '}') { d--; if (d === 0) return css.slice(i, k + 1).replace(/\s/g, ''); }
      }
      return '';
    };
    const isaret = mS ? '@media(max-width:' + mS[1] + 'px){' : null;
    const bloklar = [];
    if (isaret) for (let i = css.indexOf(isaret); i > -1; i = css.indexOf(isaret, i + 1)) bloklar.push(blok(i));
    const tasiyan = bloklar.filter(b =>
      b.indexOf('.dkimgimg{filter:none}') > -1 &&
      b.indexOf('.dkin:hover.dkimgimg{filter:none}') > -1 &&
      b.indexOf('.dkimg.yr{backdrop-filter:none}') > -1);
    const filtreKapali = tasiyan.length > 0;
    const bulanikKapali = tasiyan.length > 0;

    ol('mobil deste kartı: görsel kart boyutunda + kare başına filtre yok',
       kartlar.length > 0 && !!cProje && eksikAlan.length === 0 && canliEksik.length === 0 &&
       eksikDosya.length === 0 && zayif.length === 0 && sartli && !!mS && filtreKapali && bulanikKapali,
       `kart=${kartlar.length} kodEksik=${eksikAlan.join(',') || 'yok'} CANLI(content.json)Eksik=${cProje ? (canliEksik.join(',') || 'yok') : 'DOSYA YOK'}` +
       ` eksikDosya=${eksikDosya.join(',') || 'yok'}` +
       ` zayifKazanc=${zayif.join(' | ') || 'yok'} sartliSource=${sartli} kirilma=${mS ? mS[1] + 'px' : 'YOK'}` +
       ` filtreKapali=${filtreKapali} bulanikKapali=${bulanikKapali}`);
  }
  /* 110 · MOBİLDE PERDE SAF CSS, KÜTÜPHANEDEN ÖNCE DOĞAR (2026-08).
     Belirti: perde mobilde SIFIR KARE oynuyordu — açılıp hemen kapanmış
     gibi. Sebep animasyonun kendisi değil, SIRAYDI: `#boot`
     `html:not(.boot-on)` ile display:none duruyor ve o sınıfı ekleyen
     betik, 36 bin jetonluk satır içi motion kütüphanesinin ARDINDAN
     geliyordu. Kütüphane derlenirken ana iş parçacığı bloke; perde o
     süre boyunca HENÜZ DOĞMAMIŞ oluyor, ilk stil çözümü ancak blokaj
     bitince yapılıyordu. WAAPI de kompozitörde koşar — mesele motor
     değil, o motoru başlatacak betiğin ne zaman koştuğuydu.
     SÖZLEŞME (mobilde):
       (a) SIRA — görünürlüğü açan kapı motion kütüphanesinden ÖNCE;
       (b) TEK YER — `boot-on` yalnız o kapıda ekleniyor; iki yerde
           olsaydı biri kalkınca diğeri sessizce doğru görünmeye devam
           ederdi (yanlış yeşil);
       (c) KÜTÜPHANESİZ — giriş bloğu `!MOBIL` ile kapalı, yani mobilde
           ne `M.animate` ne `getTotalLength` (ikincisi altı SVG yolunda
           zorunlu yerleşim okutuyordu) ve çağrı o bloğun İÇİNDE kalıyor;
       (d) `.js` YOK — `#boot:not(.js)` kuralları girişi VE çıkış
           süpürmesini o sınıfın YOKLUĞUNDA taşıyor; çıkış dalı da
           bunu şart koşuyor;
       (e) ASGARİ SÜRE 2700 → 800 ms (masaüstü 2700'de kalıyor);
       (f) KIRILMA NOKTASI TEK — JS'teki matchMedia ile mobil perde
           @media bloğu aynı px. Ayrışırlarsa aradaki bantta perde iki
           zaman çizelgesinden birini yarım alır (kural 109(d)'nin dersi);
       (g) ÇİZELGE PENCEREYE SIĞIYOR MU — asıl yanlış yeşil koruması.
           Blok var diye hareket doğru olmuyor: masaüstü çizelgesi
           (harfler 1,41 sn'de oturuyor) 0,8 sn'lik pencereye sığmaz,
           perde harfler düşerken çekilir. En geç biten GİRİŞ animasyonu
           (gecikme + süre; harflerde `--i`nin en büyük değeriyle) MIN'i
           geçmemeli. Sonsuz `bsig` sayıma girmez — o oturma değil
           sürekli akış. */
  {
    const kaynakP = fs.readFileSync(SRC, 'utf8');
    const iKapi = kaynakP.indexOf('PERDE KAPISI');
    /* Motion sökümünden (kural 112) sonra sıra çapası kütüphane değil
       DENETLEYİCİNİN kendisi: kapı, perdeyi doğuran sınıfları hâlâ her
       şeyden önce eklemeli. Eski çapa (gömülü paket işareti) artık yok. */
    const iDenet = kaynakP.indexOf('Karşılama denetleyicisi');
    const siraDogru = iKapi > -1 && iDenet > -1 && iKapi < iDenet;

    const kodP = kaynakP.replace(/\/\*[\s\S]*?\*\//g, '');
    const sikis = kodP.replace(/\s/g, '');
    const tekYer = (sikis.match(/classList\.add\('boot-on'\)/g) || []).length === 1;
    const iBlok = sikis.indexOf('if(WA&&!RDC&&!MOBIL){');
    const kutuphanesiz = iBlok > -1;
    /* getTotalLength o bloğun İÇİNDE mi — perdenin BÖLGESİNE bakıyoruz
       (denetleyicinin başından ilerleme çubuğuna kadar), sayfanın geri
       kalanındaki çağrılar bu kuralın konusu değil. Bölgede tek çağrı
       olmalı ve `!MOBIL` kapısından SONRA gelmeli; kapıdan önceye ya da
       ikinci bir yere kayarsa mobilde yine koşar, (c) yeşil yanarken. */
    const iAnahtar = "varel=document.getElementById('boot'),R=document.documentElement;";
    const iDen = sikis.indexOf(iAnahtar, sikis.indexOf(iAnahtar) + 1);  /* 2. = denetleyici */
    const iBar = sikis.indexOf("varbar=document.getElementById('bootBar')");
    const bolge = iDen > -1 && iBar > iDen ? sikis.slice(iDen, iBar) : '';
    const gtlBolge = (bolge.match(/getTotalLength\(\)/g) || []).length;
    const gtlIcerde = gtlBolge === 1 && iBlok > iDen && iBlok < iBar
      && bolge.indexOf('getTotalLength()') + iDen > iBlok;
    const jsKalkiyor = /\}else\{el\.classList\.remove\('js'\);\}/.test(sikis);
    const cikisSarti = sikis.indexOf("if(RDC||!WA||!el.classList.contains('js')){") > -1;
    const mMIN = sikis.match(/varMIN=MOBIL\?(\d+):(\d+);/);
    const MIN = mMIN ? +mMIN[1] : null;
    const sureIndi = MIN !== null && MIN <= 800 && +mMIN[2] === 2700;

    /* kırılma noktası: JS'teki sayı ile perdeyi taşıyan @media aynı mı */
    const mJs = sikis.match(/__bootMobil=matchMedia\('\(max-width:(\d+)px\)'\)/);
    const pxJs = mJs ? +mJs[1] : null;
    const stilP = (kaynakP.match(/<style[^>]*>([\s\S]*?)<\/style>/) || [, ''])[1]
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const kesP = i => {                       /* parantez sayarak blok */
      let d = 0;
      for (let k = stilP.indexOf('{', i); k < stilP.length; k++) {
        if (stilP[k] === '{') d++;
        else if (stilP[k] === '}') { d--; if (d === 0) return stilP.slice(i, k + 1); }
      }
      return '';
    };
    let perdeBlok = '';
    if (pxJs) {
      const ara = new RegExp('@media\\s*\\(max-width:' + pxJs + 'px\\)\\s*\\{', 'g');
      let m;
      while ((m = ara.exec(stilP))) {
        const b = kesP(m.index);
        if (b.indexOf('#boot:not(.js) .bword span') > -1) { perdeBlok = b; break; }
      }
    }
    const kirilmaAyni = !!pxJs && perdeBlok !== '';

    /* (g) en geç biten giriş animasyonu */
    const iMax = Math.max(0, (kaynakP.match(/<span style="--i:\d+">/g) || []).length - 1);
    const sn = t => t.endsWith('ms') ? parseFloat(t) / 1000 : parseFloat(t);
    const gecikme = ifade => {                /* düz süre ya da calc(...) */
      const c = ifade.match(/calc\(([^)]*\([^)]*\))?[^)]*\)/);
      if (ifade.indexOf('calc(') === -1) {
        const t = ifade.match(/-?[\d.]+m?s/); return t ? sn(t[0]) : 0;
      }
      void c;
      const taban = ifade.match(/calc\(\s*(-?[\d.]+m?s)/);
      const adim = ifade.match(/var\(--i\)\s*\*\s*(-?[\d.]+m?s)/);
      return (taban ? sn(taban[1]) : 0) + (adim ? sn(adim[1]) * iMax : 0);
    };
    const kurallar = [...perdeBlok.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map(m => ({ sec: m[1].trim(), gov: m[2] }))
      .filter(r => r.sec.startsWith('#boot') && r.sec.indexOf('.out') === -1);
    let enGec = 0; let sigBase = 0;
    for (const r of kurallar) {
      const kisa = r.gov.match(/animation\s*:\s*([^;]+)/);
      if (kisa) {
        for (const parca of kisa[1].split(',')) {
          if (parca.indexOf('bsig') > -1) continue;      /* sonsuz akış */
          const t = parca.match(/-?[\d.]+m?s/g) || [];
          const sure = t[0] ? sn(t[0]) : 0, gec = t[1] ? sn(t[1]) : 0;
          if (r.sec.indexOf('.sig') > -1) sigBase = sure;
          if (sure + gec > enGec) enGec = sure + gec;
        }
        continue;
      }
      const d = r.gov.match(/animation-duration\s*:\s*([^;]+)/);
      const g = r.gov.match(/animation-delay\s*:\s*([^;]+)/);
      if (!d && !g) continue;
      /* yalnız gecikme yazan kural (.sig.s2/.s3) süresini temel
         kuraldan devralır — o yüzden sigBase ekleniyor. */
      const sure = d ? sn(d[1].trim()) : (r.sec.indexOf('.sig') > -1 ? sigBase : 0);
      const bit = sure + (g ? gecikme(g[1]) : 0);
      if (bit > enGec) enGec = bit;
    }
    const cizelgeSigiyor = enGec > 0 && MIN !== null && enGec <= MIN / 1000;

    /* (h) ÇIKTIDA DONMUŞ ARA KARE YOK — gerçek Chrome'da yakalandı,
       kaynağa bakan hiçbir şart görmüyordu. Ön derleme jsdom'da açılış
       denetleyicisini KOŞTURUYOR ve `#boot` içine satır içi stil yazıyor:
       izlere `stroke-dasharray:100 100;stroke-dashoffset:-100` — üstelik
       uydurma, çünkü `getTotalLength` o ortamda sabit 100 döndürüyor
       (gerçek yollar 142–176). Masaüstünde görünmüyordu: aynı betik
       değerleri milisaniyeler içinde doğrusuyla eziyordu. Perde saf CSS'e
       geçince ezen kalmıyor — CSS yalnız `opacity` animasyonluyor — ve
       izler yarım çizili donuyor. Kaynak temiz + kural yeşil + çıktı
       bozuk: tam olarak bu suite'in var oluş sebebi olan sınıf.
       `--i` KAYNAKTA yazılı, o kalmalı; kural onun silinmediğini de
       ölçüyor, yoksa "hepsini sil" düzeltmesi harfleri sıraya sokan
       değişkeni de götürür. */
    const dPerde = path.join(DIST, 'index.html');
    let ciktiTemiz = false, ciktiIVar = false, ciktiOzet = 'dist yok';
    if (fs.existsSync(dPerde)) {
      const dh = fs.readFileSync(dPerde, 'utf8');
      const a = dh.indexOf('<div id="boot"');
      const z = a > -1 ? dh.indexOf('</div>', dh.indexOf('</div>', a) + 1) : -1;
      const blokD = a > -1 ? dh.slice(a, dh.indexOf('<script', a)) : '';
      void z;
      const kirli = [...blokD.matchAll(/style="([^"]*)"/g)]
        .map(m => m[1])
        .filter(v => /stroke-dash|transform|will-change|(^|;)\s*opacity|--p\s*:/.test(v));
      ciktiTemiz = blokD !== '' && kirli.length === 0;
      ciktiIVar = /style="\s*--i:\s*\d+\s*;?\s*"/.test(blokD);
      ciktiOzet = `kirliStil=${kirli.length}${kirli.length ? ' örn:' + kirli[0].slice(0, 46) : ''} --iKorundu=${ciktiIVar}`;
    }

    ol('mobil perde: saf CSS · denetleyiciden önce doğuyor · çizelge asgari süreye sığıyor · çıktıda donmuş kare yok',
       siraDogru && tekYer && kutuphanesiz && gtlIcerde && jsKalkiyor && cikisSarti &&
       sureIndi && kirilmaAyni && cizelgeSigiyor && ciktiTemiz && ciktiIVar,
       `sira=${siraDogru} tekYer=${tekYer} kutuphanesiz=${kutuphanesiz} getTotalLengthIcerde=${gtlIcerde}` +
       ` jsKalkiyor=${jsKalkiyor} cikisSarti=${cikisSarti} MIN=${MIN}ms kirilma=${pxJs}px/${kirilmaAyni}` +
       ` enGecGiris=${enGec.toFixed(2)}s (--i max ${iMax}) sigiyor=${cizelgeSigiyor} · ${ciktiOzet}`);
  }
  /* 111 · MOBİLDE DESTE KARTINDA KALICI KATMAN + GÖLGE YOK (2026-08).
     Belirti: mobilde kart geçişleri takılıyordu — kural 108 (adres
     çubuğu) ve 109 (kart görseli) kapandıktan SONRA da sürdü.
     MEKANİZMA DOĞRULANDI, KURALIN ASIL TUTTUĞU ŞEY BU: gölge ölçeklenen
     elemanın KENDİSİNDE, ebeveyninde değil. `.dkin` tek bildirimde üçünü
     birden taşıyor — `transform:scale(var(--s,1))` + `will-change` +
     100px bulanıklı `box-shadow` — ve deck() de aynı elemana yazıyor
     (`it.querySelector('.dkin')` → `card.style.transform='scale(...)'`).
     will-change kalıcı bir kompozit katman ayırtıyor; gölge o katmanın
     İÇERİĞİ, dolayısıyla ölçek her değiştiğinde gölge yeni ölçekte
     baştan rasterleşiyor. Gölge EBEVEYNDE olsaydı mekanizma bambaşka
     olurdu (ölçeklenen katman gölgeyi hiç taşımaz, yeniden rasterleşme
     de olmaz), o yüzden kural "gölge var mı" değil "gölge ölçeklenen
     elemanda mı" ölçüyor.
     Beş şart: mobilde ikisi de kapalı · MASAÜSTÜ İKİSİNİ DE KORUYOR
     (talep mobildi; orada gölge tasarımın parçası) · deck() gerçekten
     `.dkin`e transform yazıyor · kırılma noktası destenin diğer mobil
     kurallarıyla aynı blok. */
  {
    const kaynakD = fs.readFileSync(SRC, 'utf8');
    const cssD = kaynakD.replace(/\/\*[\s\S]*?\*\//g, '');
    const sikisD = cssD.replace(/\s/g, '');

    /* masaüstü temel kuralı — üçü de duruyor mu */
    const temel = (cssD.match(/\n\.dkin\{[\s\S]*?\}/) || [''])[0].replace(/\s/g, '');
    const masaustuKoruyor = temel.indexOf('will-change:transform,opacity') > -1
                         && temel.indexOf('box-shadow:046px100px-50px#000') > -1
                         && temel.indexOf('transform:scale(var(--s,1))') > -1;

    /* mekanizma: ölçeği YAZAN eleman gerçekten .dkin mi */
    const olcekAyniEleman = sikisD.indexOf("constcard=it.querySelector('.dkin');") > -1
                         && sikisD.indexOf("card.style.transform='scale('") > -1;

    /* mobil blok — destenin diğer mobil kurallarıyla AYNI blokta */
    const kesD = i => {
      let d = 0;
      for (let k = cssD.indexOf('{', i); k < cssD.length; k++) {
        if (cssD[k] === '{') d++;
        else if (cssD[k] === '}') { d--; if (d === 0) return cssD.slice(i, k + 1).replace(/\s/g, ''); }
      }
      return '';
    };
    const araD = /@media\s*\(max-width:(\d+)px\)\s*\{/g;
    let mD2, destePx = null, mobilBlok = '';
    while ((mD2 = araD.exec(cssD))) {
      const b = kesD(mD2.index);
      if (b.indexOf('.dkimgimg{filter:none}') > -1) { destePx = +mD2[1]; mobilBlok = b; break; }
    }
    const katmanKalkti = /\.dkin\{[^}]*will-change:auto/.test(mobilBlok);
    const golgeKalkti = /\.dkin\{[^}]*box-shadow:none/.test(mobilBlok);

    ol('mobil deste kartı: ölçeklenen elemanda kalıcı katman + gölge yok (masaüstü korunuyor)',
       masaustuKoruyor && olcekAyniEleman && katmanKalkti && golgeKalkti && destePx === 900,
       `masaustuKoruyor=${masaustuKoruyor} olcekAyniEleman=${olcekAyniEleman}` +
       ` katmanKalkti=${katmanKalkti} golgeKalkti=${golgeKalkti} kirilma=${destePx}px`);
  }
  /* 88 · içerik dürüstlüğü kapısı (2026-08, mimari Faz 1 ön şartı):
     Kurucu bio'su yapılandırılmış veride Person olarak kodlanacak;
     yer tutucu bir metin şemaya yazıldığında yanlış beyan olur. Müşteri
     sözleri de Review olarak kodlanabilir — uydurma söz + şema, Google'ın
     yapılandırılmış veri politikasının doğrudan ihlali (cezası manuel
     işlem). Bu yüzden ikisi de kaynak seviyesinde kilitleniyor:
       · bio'da yer tutucu kalıbı geçmeyecek
       · sözler uydurma olduğu sürece bant KAPALI kalacak (testi.on:0)
       · kurucunun en az bir sameAs bağlantısı olacak (varlık eşleştirmesi)
     Sözler gerçekleriyle değişince Enes panelden açar; o gün bu kuralın
     `bantKapali` şartı düşer ve kural güncellenir — bilinçli kapı. */
  {
    const kaynakI = fs.readFileSync(SRC, 'utf8');
    const kod = kaynakI.replace(/\/\*[\s\S]*?\*\//g, '');
    const yerTutucuYok = kod.indexOf('Bu bölüm panelden düzenlenecek') === -1
                      && kod.indexOf('This section will be edited from the panel') === -1;
    const bantKapali = /testi:\{[^}]*on:0/.test(kod);
    const iF = kod.indexOf('founder:{');
    const fBlok = iF > -1 ? kod.slice(iF, iF + 3000) : '';
    const kurucuBagi = /links:\[\{label:'[^']+',url:'https?:\/\/[^']+'/.test(fBlok);
    const kurumBagi = /socials:\[\{label:'[^']+',url:'https?:\/\/[^']+'/.test(kod);
    /* GİZLEME GERÇEKTEN KAZANIYOR MU — kuralın ilk hâlinin kaçırdığı şey.
       `testi.on:0` yalnız ANAHTARI ölçer; bandın görünüp görünmediğini
       değil. İlk yamada dördü de yeşildi ama bant sitede duruyordu:
       `html.t-nosoz #sozband{display:none}` !important'sizdi ve
       `section.pg.on{display:block!important}` onu eziyordu. Etkiyi
       ölçmenin kaynak seviyesindeki karşılığı bu: kural !important
       taşımalı, yoksa sessizce ölü. */
    const gizlemeKazaniyor =
      /html\.t-nosoz\s+#sozband\s*\{[^}]*display\s*:\s*none\s*!important/.test(kod);
    ol('içerik dürüstlüğü (yer tutucu yok · uydurma bant kapalı · sameAs var)',
       yerTutucuYok && bantKapali && kurucuBagi && kurumBagi && gizlemeKazaniyor,
       `yerTutucuYok=${yerTutucuYok} bantKapali=${bantKapali} kurucuBagi=${kurucuBagi} kurumBagi=${kurumBagi} gizlemeKazaniyor=${gizlemeKazaniyor}`);
  }
  /* 89 · TradeSelf amblemi sözleşmesi (2026-08):
     Üç katman (dış dişli · beyin · iç dişli) ve dönüş yönleri.
     · YÖN: dış saat yönünün TERSİ (amCCW), iç saat yönünde (amCW).
       İkisi aynı yöne dönerse mekanik his kaybolur.
     · ORAN: diş sayıları Fourier ile ölçüldü — dış ~20, iç 12.
       Kavrayan dişlide periyot diş sayısıyla doğru orantılı:
       20 sn / 12 sn = 20/12. Süreler bu oranı korumalı.
     · DURMA: perde etkin değilken animasyon paused — görünmeyen dönmesin.
     · YAZI: amblemin içinde metin YOK (başlıkta zaten var, ayrıca
       ortadaki delik 34px, 58px'lik yazı sığmıyor); erişilebilirlik
       aria-label ile sağlanıyor. */
  {
    const kaynakA = fs.readFileSync(SRC, 'utf8');
    const kod = kaynakA.replace(/\/\*[\s\S]*?\*\//g, '');
    const uc = ['amDis', 'amBeyin', 'amIc'].every(k => kod.indexOf(k) > -1);
    const tersYon = /\.amDis\{[^}]*animation:amCCW\s+(\d+)s/.exec(kod);
    const icYon = /\.amIc\{[^}]*animation:amCW\s+(\d+)s/.exec(kod);
    const yonDogru = !!tersYon && !!icYon;
    const oran = yonDogru ? (+tersYon[1] / +icYon[1]) : 0;
    const oranDogru = Math.abs(oran - 20 / 12) < 0.02;
    const durur = kod.indexOf('.mkact.on .mkcore i{animation-play-state:running}') > -1;
    const etiket = kod.indexOf('role="img" aria-label=') > -1;
    ol('TradeSelf amblemi (ters yön · ölçülen oran · perde dışında durur)',
       uc && yonDogru && oranDogru && durur && etiket,
       `katman=${uc} yon=${yonDogru} oran=${oran.toFixed(3)}(hedef 1.667) durur=${durur} etiket=${etiket}`);
  }
  /* 90 · motor kabloları sözleşmesi (2026-08):
     Klasör tellerinde üç tur kaybettiren hataların hepsi burada baştan
     kilitleniyor.
     · viewBox JS'ten PİKSEL biriminde kurulur (`0 0 W H`) — tek birim,
       dönüşüm yok, zoom hepsini birlikte ölçekler
     · `non-scaling-stroke` YASAK — çizgiyi cihaz uzayında çizer, ölçüm
       CSS pikselinde; zoom'da ayrışırlar (tel hatasının asıl kökü)
     · konum `offsetLeft/offsetTop` ile ölçülür, `getBoundingClientRect`
       ile DEĞİL: kartlar açılmadan `translateX(-10px)` taşıyor, rect
       bunu içerir ve uçlar kayardı
     · ölçüm kaydırmada YOK — yalnız kurulum ve resize
     · sınıf adları `kb…` önekli: hipotez kartı `win` sınıfı alabiliyor,
       kablolara `win` demek çakışma olurdu (az kalsın yaşandı) */
  {
    const kaynakK = fs.readFileSync(SRC, 'utf8');
    const kod = kaynakK.replace(/\/\*[\s\S]*?\*\//g, '');
    /* bölge `const konum=` yardımcısından başlar — o, kabloKur'un ÜSTÜNDE
       tanımlı ve zincir toplama şartı orada yaşıyor. İlk yazımda bölge
       kabloKur'dan başlıyordu ve yardımcıyı hiç görmüyordu. */
    const iK = kod.indexOf('const konum=');
    const bolge = iK > -1 ? kod.slice(iK, iK + 3600) : '';
    const pikselViewBox = bolge.indexOf("setAttribute('viewBox','0 0 '+W+' '+H)") > -1;
    /* 14 Ağu — DÜZELTİLDİ: yalnız 'offsetLeft geçiyor mu' bakmak YETMEDİ.
       İlk sürüm el.offsetLeft'i DOĞRUDAN okuyordu; aynı yamada z-index için
       eklenen `.mkins,.mkcore,.mkhyps{position:relative}` satırı kartların
       offsetParent'ını .mkeng'den sütuna kaydırınca ölçüm sütuna göreye
       düştü ve kablolar 81px yukarıdan başladı. Artık offsetParent ZİNCİRİ
       toplanmalı — kural bunu arıyor. */
    const duzenOlcumu = bolge.indexOf('offsetLeft') > -1
                     && bolge.indexOf('getBoundingClientRect') === -1
                     && /n\.offsetParent/.test(bolge)
                     && bolge.indexOf('const konum=') > -1;
    /* çıkış kabloları TEK noktadan dağılmalı (Enes'in isteği) */
    const tekCikis = /const qx=cx\+R/.test(bolge) && /egri\(qx,qy/.test(bolge);
    const wireCss = (kod.match(/\.mkwire path\{[^}]*\}/) || [''])[0];
    const cihazUzayiYok = wireCss.indexOf('non-scaling-stroke') === -1;
    const ozelDegisken = wireCss.indexOf('var(--L') > -1;
    const kaydirmaYok = bolge.indexOf("addEventListener('scroll'") === -1;
    const onek = bolge.indexOf('class="kb') > -1;
    ol('motor kabloları (piksel viewBox · düzen ölçümü · cihaz-uzayı yasak)',
       iK > -1 && pikselViewBox && duzenOlcumu && tekCikis && cihazUzayiYok && ozelDegisken && kaydirmaYok && onek,
       `viewBox=${pikselViewBox} zincir=${duzenOlcumu} tekCikis=${tekCikis} nonScalingYok=${cihazUzayiYok} degisken=${ozelDegisken} kaydirmaYok=${kaydirmaYok} onek=${onek}`);
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
  /* @id → (düğüm imzası → o imzayı taşıyan sayfalar). Aynı kimliğin
     birden çok gövdesi varsa çelişki vardır. */
  const kimlikler = new Map();
  const adsizAlan = [];   /* 94 · name'i olmayan form alanları */
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
      let veri = null;
      try { veri = JSON.parse(x.textContent); } catch (e) { ldKotu++; continue; }
      /* KİMLİK TOPLAMA — sınıf kuralının verisi. Düğüm DOM'dan geliyor
         (script içeriği), ham metin regex'inden değil: bu suite'te üç kez
         yanlış yeşil ham metin taramasından geldi. */
      for (const dugum of (veri && veri['@graph']) || []) {
        const kimlik = dugum && dugum['@id'];
        if (!kimlik) continue;
        const imza = JSON.stringify(dugum);
        if (!kimlikler.has(kimlik)) kimlikler.set(kimlik, new Map());
        const govdeler = kimlikler.get(kimlik);
        if (!govdeler.has(imza)) govdeler.set(imza, []);
        govdeler.get(imza).push(yol);
      }
    }
    const g = (sel, at) => { const e = d.querySelector(sel); return e ? e.getAttribute(at) : null; };
    (kanon[g('link[rel=canonical]', 'href')] ||= []).push(yol);
    (baslik[(d.title || '').trim()] ||= []).push(yol);
    (aciklama[g('meta[name=description]', 'content') || ''] ||= []).push(yol);

    /* 94 · SINIF KURALI — name'i olmayan alan gönderimde HİÇ yer almaz.
       2026-08 BULUNDU: KVKK onay kutusunda name yoktu; kullanıcı ekranda
       onay veriyor, Netlify Forms kaydında teknik iz kalmıyordu. Belirti
       tek kutuydu, sınıf ise "adsız alan"; kural sınıfı kapatıyor, çünkü
       bir sonraki form (bülten) statik çıktıya girdiğinde aynı kapıdan
       geçecek. Netlify alanları DERLEME ANINDAKİ statik HTML'den tanıdığı
       için ölçüm çıktıda yapılıyor — kaynakta değil.
       Honeypot hariç: adı formun kendi netlify-honeypot özniteliğinden
       okunuyor, burada sabit yazılmıyor (form adı değişirse kural da
       kendiliğinden uyar). Düğmeler dışarıda: submit/button/reset/image
       gönderimde ad taşımak zorunda değil. */
    for (const fr of d.querySelectorAll('form')) {
      const tuzak = fr.getAttribute('netlify-honeypot') || '';
      for (const el of fr.querySelectorAll('input, select, textarea')) {
        const tip = (el.getAttribute('type') || '').toLowerCase();
        if (['submit', 'button', 'reset', 'image'].includes(tip)) continue;
        const ad = el.getAttribute('name') || '';
        if (ad && ad === tuzak) continue;
        if (!ad) adsizAlan.push(`${yol}:${fr.id || fr.getAttribute('name') || 'form'}` +
          `/${el.id || el.tagName.toLowerCase()}${tip ? '[' + tip + ']' : ''}`);
      }
    }

    const linkler = [...d.querySelectorAll('a[href^="/"]')]
      .map(a => (a.getAttribute('href') || '').split(/[?#]/)[0].replace(/\/$/, '') || '/');
    for (const l of new Set(linkler)) if (varOlan.has(l)) (gelen[l] ||= new Set()).add(yol);
    if (yol.startsWith('/en')) {
      enEn += linkler.filter(l => l.startsWith('/en')).length;
      enTr += linkler.filter(l => !l.startsWith('/en') && varOlan.has(l)).length;
    }
  }

  ol('statik çıktıda adsız form alanı yok (honeypot hariç)',
     adsizAlan.length === 0,
     adsizAlan.length ? `${adsizAlan.length} alan · ` + [...new Set(adsizAlan.map(x => x.split(':')[1]))].slice(0, 3).join(' ') : '');

  /* 95 · KVKK onay kaydı — iki alan da ÇIKTIDA olmalı.
     Netlify formu ön-render edilmiş HTML'den tarıyor; çalışma anında
     eklenen alan kayda hiç girmez (bugün iki kez bunun bedeli ödendi).
     G1 KALICI KARARI BURADA KİLİTLENİYOR: forma istemci zaman damgası
     EKLENMEZ. Gizli zaman alanı DOM'da durur, gönderen istediği değere
     çevirir; kayda kanıt gibi görünen ama uydurulabilir bir alan girer —
     kaydın kendisinden kötüsü, YANLIŞ GÜVEN veren kayıttır. Güvenilir
     zaman Netlify'ın sunucu tarafında yazdığı created_at'tir. Kural bu
     yüzden alanların varlığını DEĞİL, zaman alanının YOKLUĞUNU da ölçer:
     ileride "kanıt güçlensin" diye eklenmek istenirse kırmızı yanar ve
     tartışma koda değil bu yoruma döner. */
  {
    const oku = p => fs.existsSync(p) ? new JSDOM(fs.readFileSync(p, 'utf8')).window.document : null;
    const bak = d => {
      const fr = d && d.getElementById('leadForm');
      if (!fr) return { var: false, not: 'form yok' };
      const onay = fr.querySelector('input[type="checkbox"][name="kvkk_onay"]');
      const ozet = fr.querySelector('input[type="hidden"][name="kvkk_metin_ozet"]');
      const zaman = [...fr.querySelectorAll('[name]')]
        .map(e => e.getAttribute('name'))
        .filter(n => /zaman|time|tarih|_ts$|damga/i.test(n));
      return {
        var: !!onay && onay.getAttribute('value') === 'evet' && !!ozet && zaman.length === 0,
        not: `onay=${!!onay}/${onay ? onay.getAttribute('value') : '-'} ozet=${!!ozet} zamanAlani=${zaman.join(',') || 'yok'}`
      };
    };
    const tr = bak(oku(path.join(DIST, 'index.html')));
    const en = bak(oku(path.join(DIST, 'en', 'index.html')));
    ol('lead formu: onay + metin özeti alanları statik çıktıda (zaman alanı yok)',
       tr.var && en.var, `TR[${tr.not}] EN[${en.not}]`);
  }

  /* 97 · ATIF ALANLARI çıktıda ve İZİN LİSTESİYLE (2026-08):
     Talebin nereden geldiği hiçbir yerde kayıtlı değildi; reklam → talep
     zinciri kurulamıyordu. Alanlar gizli ve değerlerini JS dolduruyor,
     ama Netlify formu DERLEME ANINDAKİ statik HTML'den tanıdığı için
     alanların kendisi çıktıda DURMAK ZORUNDA — çalışma anında eklenen
     alan kayda hiç girmez (bu depoda iki kez yaşandı).
     Kural üç şey ölçüyor:
       1) izin listesinin TAMAMI çıktıda (eksik alan = sessizce kaybolan veri)
       2) listede olmayan atıf alanı YOK (izin listesi tek kapı; yenisi
          eklenmek istenirse buradan geçer, sessizce sızmaz)
       3) statik değerler BOŞ — bir değer çıktıya pişerse o sabit değer
          bütün ziyaretçilere atfedilir, yani kayıt topluca yalan söyler. */
  {
    const IZIN = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                  'gclid', 'fbclid', 'msclkid', 'inilen_sayfa', 'yonlendiren'];
    const atifMi = ad => /^utm_|^gclid$|^fbclid$|^msclkid$|^inilen_sayfa$|^yonlendiren$/.test(ad);
    const bak = p => {
      if (!fs.existsSync(p)) return { ok: false, not: 'sayfa yok' };
      const fr = new JSDOM(fs.readFileSync(p, 'utf8')).window.document.getElementById('leadForm');
      if (!fr) return { ok: false, not: 'form yok' };
      const gizli = [...fr.querySelectorAll('input[type="hidden"][name]')];
      const adlar = gizli.map(e => e.getAttribute('name')).filter(atifMi);
      const eksik = IZIN.filter(k => !adlar.includes(k));
      const fazla = adlar.filter(k => !IZIN.includes(k));
      const dolu = gizli.filter(e => atifMi(e.getAttribute('name')) && (e.getAttribute('value') || ''))
        .map(e => e.getAttribute('name'));
      return {
        ok: eksik.length === 0 && fazla.length === 0 && dolu.length === 0,
        not: `eksik=${eksik.join(',') || 'yok'} fazla=${fazla.join(',') || 'yok'} doluGelen=${dolu.join(',') || 'yok'}`
      };
    };
    const tr = bak(path.join(DIST, 'index.html'));
    const en = bak(path.join(DIST, 'en', 'index.html'));
    ol('atıf alanları statik çıktıda, izin listesiyle, değerleri boş',
       tr.ok && en.ok, `TR[${tr.not}] EN[${en.not}]`);
  }

  ol('mükerrer id yok', dupId === 0, String(dupId));
  ol('alt özelliği olmayan görsel yok', altYok === 0, String(altYok));
  ol('adsız bağlantı yok', adsizLink === 0, String(adsizLink));
  ol('her sayfada tam 1 h1', h1Kotu.length === 0, h1Kotu.slice(0, 4).join(' '));
  ol('viewport her sayfada', viewportYok === 0, String(viewportYok));
  ol('JSON-LD geçerli', ldKotu === 0, String(ldKotu));
  /* 107 · SINIF KURALI — AYNI `@id`, AYNI DÜĞÜM.
     Mevcut "JSON-LD geçerli" kuralı yalnız SÖZDİZİMİNE bakıyor: her
     sayfanın ld+json'u tek tek ayrıştırılabiliyorsa yeşil. Aynı kimliğin
     sayfadan sayfaya ÇELİŞMESİ onun göremediği bir hata sınıfı ve saha
     denetiminin bulduğu boşluk tam oradaydı.
     ÖLÇÜLDÜ (yama öncesi, 58 sayfa): dört kimlik çelişiyordu —
       · `/#org`            → 58 sayfada 58 FARKLI gövde
       · `/#site`           → 58 sayfada 2 gövde (inLanguage tr/en)
       · `/hizmetler#list`  → 2 sayfada 2 gövde (TR ve EN aynı kimliği
                              paylaşıyor, içerik farklı)
       · `/sss#faq`         → 2 sayfada 2 gövde (aynısı)
     Bilgi grafiği ve dil modelleri bir kurumu tek varlıkta birleştirirken
     tam bu alana bakar; 58 parçaya bölünmüş bir kurum tanımı tek bulguda
     bütün tanıtımı götürür.
     Kural TEK SAYFAYA BAKMAZ: 58 sayfanın hepsi karşılaştırılıyor, çünkü
     bu sınıf ancak sayfalar arası karşılaştırmayla görünür. */
  {
    const catisan = [...kimlikler.entries()].filter(([, g]) => g.size > 1);
    const ozet = catisan.slice(0, 4).map(([id, g]) => {
      const sayfa = [...g.values()].reduce((t, v) => t + v.length, 0);
      return `${id.replace('https://qanatone.com', '')}→${g.size} gövde/${sayfa} sayfa`;
    }).join(' · ');
    ol('şema: aynı @id\'yi taşıyan düğüm bütün sayfalarda birebir aynı',
       catisan.length === 0,
       `kimlik=${kimlikler.size} çatışan=${catisan.length}${ozet ? ' · ' + ozet : ''}`);
  }
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

  /* 91 · content.json zinciri (2026-08, canlıda ÖLÇÜLDÜ):
     `/content.json` üretimde 404 dönüyordu. Sebep tek bir eksik dosya
     değil, kapalı bir zincirdi: PANEL_PAROLA_HASH tanımsız → yayinla 503
     → panel bugüne kadar HİÇ yayın yapmadı → content.json hiç doğmadı →
     KOPYA listesindeki `existsSync` guard'ı sessizce atladı → sitede
     `applyContent()` panel verisiyle HİÇ koşmadı. Panelden yönetilen her
     ayar (gtm dahil) üretimde ölüydü ve HİÇBİR kural bunu görmüyordu:
     kaynak doğru, fonksiyon doğru, çıktı eksik. Klasik yanlış yeşil.
     SÖZLEŞME: panel hiç yayınlamamış olsa bile derleme geçerli bir
     varsayılan basar; panel yayınladığında onun dosyası bunun yerini
     alır. Kural ÇIKTIYI ölçer (kaynağı değil) — dosya var mı, JSON
     olarak ayrışıyor mu, omurga anahtarları duruyor mu. Boş bir `{}`
     de 200 dönerdi ama zinciri kanıtlamazdı, o yüzden omurga aranıyor. */
  {
    const cy = path.join(DIST, 'content.json');
    let veri = null, hata = '';
    if (!fs.existsSync(cy)) hata = 'dosya yok';
    else { try { veri = JSON.parse(fs.readFileSync(cy, 'utf8')); }
           catch (e) { hata = 'JSON ayrıştırılamadı'; } }
    const anahtar = (veri && typeof veri === 'object' && !Array.isArray(veri))
      ? Object.keys(veri) : [];
    const omurga = ['services', 'projects', 'posts', 'strings']
      .filter(k => anahtar.includes(k));
    ol('dist/content.json var ve geçerli JSON (varsayılan içerik)',
       !!veri && omurga.length === 4,
       hata || `${anahtar.length} anahtar · omurga ${omurga.length}/4`);
  }

  /* 113 · ORTAK BETİK AYRIŞTI (2a, 2026-08). Satır içi betik tarayıcının
     derleme önbelleğine giremez (V8 belgeli davranış): 58 sayfanın her biri
     aynı ~490 KB'lık ana betiği her gezinmede sıfırdan ayrıştırıp
     DERLİYORDU. build.js ana betiği ÇIKTIDA varlik/app.<hash>.js'e ayırır
     (kaynak tek dosya kalır, ön-render değişmez). Kesim çapası
     deterministik: src'siz + gövdesi 100 KB üzeri = ana betik; işaret
     yorumu yok, regex kırılganlığı yok. Kural iki sayfada DOM'dan ölçer
     (kök + iç sayfa — ham metin regex'i script kaynağına takılır, üç kez
     yaşandı): büyük satır içi blok kalmadı · referans defer'li ve lenis'ten
     SONRA (defer koşum sırası belge sırasıdır: gsap → ST → lenis → app) ·
     iki sayfa AYNI dosyaya işaret ediyor · dosya diskte ve varlik/ altında
     TEK · içerik kaynaktaki ana blokla bayt-denk (satır sonu normalize:
     git blob LF, Windows çalışma kopyası CRLF) · addaki hash içeriğin
     GERÇEK sha256'sının ilk 10 hex'i. */
  {
    const crypto = require('crypto');
    const ESIK = 100 * 1024;
    const kaynakBlok = [...fs.readFileSync(SRC, 'utf8')
      .matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
      .map(m => m[1]).filter(g => Buffer.byteLength(g) > ESIK);
    const bak = rel => {
      const p = path.join(DIST, rel);
      if (!fs.existsSync(p)) return { yok: true };
      const d = new JSDOM(fs.readFileSync(p, 'utf8')).window.document;
      const scr = [...d.querySelectorAll('script')];
      return {
        buyukIcli: scr.filter(x => !x.getAttribute('src')
          && Buffer.byteLength(x.textContent) > ESIK).length,
        iRef: scr.findIndex(x => /^varlik\/app\.[0-9a-f]{10}\.js$/.test(x.getAttribute('src') || '')),
        iLenis: scr.findIndex(x => (x.getAttribute('src') || '').endsWith('lenis.min.js')),
        get ad() { return this.iRef > -1 ? scr[this.iRef].getAttribute('src') : ''; },
        get defer() { return this.iRef > -1 && scr[this.iRef].hasAttribute('defer'); }
      };
    };
    const kok = bak('index.html'), ic = bak('hizmetler/index.html');
    let dosyaVar = false, tek = false, hashDogru = false, denk = false;
    const klasor = path.join(DIST, 'varlik');
    if (fs.existsSync(klasor)) {
      tek = fs.readdirSync(klasor).filter(f => /^app\.[0-9a-f]{10}\.js$/.test(f)).length === 1;
      if (kok.ad && fs.existsSync(path.join(DIST, kok.ad))) {
        dosyaVar = true;
        const icerik = fs.readFileSync(path.join(DIST, kok.ad), 'utf8');
        hashDogru = kok.ad === 'varlik/app.'
          + crypto.createHash('sha256').update(icerik).digest('hex').slice(0, 10) + '.js';
        denk = kaynakBlok.length === 1
          && kaynakBlok[0].replace(/\r\n/g, '\n') === icerik.replace(/\r\n/g, '\n');
      }
    }
    const sayfaTamam = s => !s.yok && s.buyukIcli === 0 && s.iRef > -1 && s.defer
      && s.iLenis > -1 && s.iRef > s.iLenis;
    ol('ortak betik ayrıştı: ana betik varlik/app.<hash>.js, sayfada gömü yok',
       kaynakBlok.length === 1 && sayfaTamam(kok) && sayfaTamam(ic) && kok.ad === ic.ad
         && dosyaVar && tek && hashDogru && denk,
       `kaynakBlok=${kaynakBlok.length} kök[gömü=${kok.yok ? '-' : kok.buyukIcli}` +
       ` ref=${kok.ad || 'yok'} defer=${kok.defer} lenisSonra=${kok.iRef > kok.iLenis}]` +
       ` iç[gömü=${ic.yok ? '-' : ic.buyukIcli} aynıAd=${kok.ad === ic.ad}]` +
       ` dosya=${dosyaVar} tek=${tek} hash=${hashDogru} denk=${denk}`);
  }

  /* 114 · SATIR İÇİ ENVANTER KİLİDİ (2a bekçisi). Ayrıştırmadan sonra
     sayfada ÇALIŞAN gömülü betik olarak yalnız bilinen dörtlü kalır:
     base document.write (~65 B) · perde kapısı (~1,8 KB) · karşılama
     denetleyicisi (~7 KB) · damga (~67 B). Her yuvaya kimlik imzası +
     üst tavan: listede olmayan ya da tavanı aşan HER gömü kırmızı —
     "küçük bir şey gömüvereyim" yarınki ayrıştırma vergisinin tohumudur,
     buradan geçemez; yeni gömü gerekiyorsa bu kural bilinçle güncellenir.
     ld+json gibi ÇALIŞTIRILMAYAN tipler envanter dışı (veri, betik değil).
     404.html da listede: ham kaynaktan yazılır, ayrıştırma onu da kapsar. */
  {
    const ENV = [
      ['base',  '<base href=',  200],
      ['perde', 'qanat-splash', 4096],
      ['boot',  '__bootMobil',  12288],
      ['damga', '__QBUILD',     200]
    ];
    const bak = rel => {
      const p = path.join(DIST, rel);
      if (!fs.existsSync(p)) return rel + ' yok';
      const d = new JSDOM(fs.readFileSync(p, 'utf8')).window.document;
      const calisan = [...d.querySelectorAll('script:not([src])')]
        .filter(x => { const t = x.getAttribute('type');
                       return !t || /javascript|^module$/.test(t); })
        .map(x => x.textContent);
      if (calisan.length !== ENV.length)
        return `${rel}: ${calisan.length} gömü (beklenen ${ENV.length})`;
      return ENV.map(([ad, imza, tavan], i) =>
        calisan[i].indexOf(imza) === -1 ? `${rel}:${ad} imzasız`
        : Buffer.byteLength(calisan[i]) > tavan
          ? `${rel}:${ad} ${Buffer.byteLength(calisan[i])}B>${tavan}B` : '')
        .filter(Boolean).join(' · ');
    };
    const kusur = ['index.html', 'hizmetler/index.html', '404.html'].map(bak).filter(Boolean);
    ol('satır içi envanter kilidi: yalnız bilinen dörtlü, tavan içinde',
       kusur.length === 0, kusur.join(' | ') || '3 sayfa × 4 gömü, tavanlar içinde');
  }

  /* 115 · SAYFA İNCELDİ (2a sonuç kilidi). Ayrıştırma öncesi
     dist/index.html 836.563 B idi; sonrası ÖLÇÜLDÜ: 346.918 B
     (gzip-9 81.243 B). Tavan = ölçüm + %10 pay = 381.610. Sayfa yeniden
     şişerse (betik geri gömülür, büyük varlık satır içine sızar) kural
     yanar; bilinçli büyüme bu sayıyı bilinçle günceller. */
  {
    const TAVAN = 381610;
    const p = path.join(DIST, 'index.html');
    const boy = fs.existsSync(p) ? fs.statSync(p).size : -1;
    ol('dist/index.html boyut tavanı (ana betik dışarıda)',
       boy > 0 && boy <= TAVAN, `${boy} B ≤ ${TAVAN} B`);
  }
}

/* =====================================================================
   3b · STATİK DOĞRUDAN YÜKLEME — dist sayfası GERÇEKTEN betikleriyle açılır
   ---------------------------------------------------------------------
   2026-08 BULUNDU: "2 · çalışma zamanı" YALNIZ kaynağı (index.html) açar —
   orada tüm bölümler zaten DOM'da olduğundan kabugu_tamamla() parse'ta
   hemen döner, shell.html'e hiç dokunmaz. "3 · yayın çıktısı" ise dist
   sayfalarını `new JSDOM(html)` ile SCRIPT ÇALIŞTIRMADAN okur — statik
   metin/attribute'a bakar. İkisi arasında kör nokta vardı: dist'teki bir
   sayfayı GERÇEK tarayıcı gibi açıp betiklerini çalıştıran hiçbir ölçüm
   yoktu. O yolda kabugu_tamamla'nın main.innerHTML'i baştan yazması (eski
   hâli) huni kaydırıcılarının dinleyicilerini koparıyordu, __chanBuild ve
   __tstRender gibi geç bayraklar hiç atanmıyordu — 69/0 yeşil, site
   çalışmıyordu. Kanıt döngüsü: ../harness-hidrasyon.js (aynı ortam()
   burada tekrar kullanılıyor, ikinci bir mock seti YOK).             */
async function statikDogrudanYukleme() {
  if (!fs.existsSync(DIST)) { bolum('3b · statik doğrudan yükleme (dist yok, atlandı)'); return; }
  bolum('3b · statik doğrudan yükleme (gerçek betik çalıştırma)');
  const ROTA = 'otomasyon';   // huni (#hsSec) burada gömülü basılıyor
  const otomasyonYolu = path.join(DIST, ROTA, 'index.html');
  const shellYolu = path.join(DIST, 'shell.html');
  if (!fs.existsSync(otomasyonYolu) || !fs.existsSync(shellYolu)) {
    ol('dist/otomasyon doğrudan yüklemede huni ₺500.000 verir (gerçek betik)', false, 'dist/otomasyon veya shell.html yok');
    return;
  }
  const otomasyonHtml = anaBetigiGeriGom(fs.readFileSync(otomasyonYolu, 'utf8'));
  const shellHtml = fs.readFileSync(shellYolu, 'utf8');
  const fetchMock = (u) => {
    const s = String(u);
    if (s.includes('shell.html')) return Promise.resolve({ ok: true, text: () => Promise.resolve(shellHtml) });
    return Promise.reject(new Error('ag yok (denetim — kasıtlı)'));
  };
  const { dom } = ortam(otomasyonHtml, ORIGIN + '/' + ROTA, { fetch: fetchMock });
  const w = dom.window, d = w.document;
  const t0 = Date.now();
  while (!w.__contentReady && Date.now() - t0 < 4000) await dur(40);
  await dur(200);

  const el = i => d.getElementById(i);
  const R = [0, 1, 2, 3, 4, 5].map(i => el('hsR' + i));
  let huniDogru = false, huniAyrinti = 'huni kaydırıcıları DOM\'da yok';
  if (R.every(x => x)) {
    const kur = [100, 50, 0, 0, 0, 10];
    R.forEach((r, i) => { r.value = String(kur[i]); r.dispatchEvent(new w.Event('input', { bubbles: true })); });
    await dur(120);
    const m = id => (el(id) || {}).textContent || '';
    huniDogru = m('hsPara') === '₺500.000';
    huniAyrinti = `hsLost=${m('hsLost')} hsPara=${m('hsPara')} hsParaY=${m('hsParaY')}`;
  }
  ol('dist/otomasyon doğrudan yüklemede huni ₺500.000 verir (gerçek betik)', huniDogru, huniAyrinti);

  ol('dist/otomasyon doğrudan yüklemede __chanBuild/__tstRender tanımlı',
     typeof w.__chanBuild === 'function' && typeof w.__tstRender === 'function',
     `chanBuild=${typeof w.__chanBuild} tstRender=${typeof w.__tstRender}`);

  const tbNavBtn = d.querySelectorAll('#tbNav button').length;
  const chanNodes = d.querySelectorAll('#chanNodes .cnode').length;
  ol('dist/otomasyon doğrudan yüklemede kabuktan gelen bölümler dolu (söz bandı + süreç hattı)',
     tbNavBtn > 0 && chanNodes > 0, `tbNav düğme=${tbNavBtn} chanNodes düğüm=${chanNodes}`);

  dom.window.close();

  /* 2026-08 BULUNDU (gece denetimi): eksik bölümler main'in SONUNA eklenince
     statik hizmet sayfasından ana sayfaya geçen ziyaretçi #lead formunu en
     ÜSTTE görüyordu; ayrıca flow/sizinti/hesap/tubes/projectsArchive gibi
     kurucular parse'ta bölümlerini bulamayınca kaydolmadan dönüyor, kabuk
     bölümü getirse de kimse onları çağıramıyordu (kadro görünmez, harita 0).
     İki kural: sıra + kayıt. Sayfa: hizmet detayı — kabuğa en muhtaç rota. */
  {
    const seoYolu = path.join(DIST, 'hizmetler', 'seo', 'index.html');
    if (!fs.existsSync(seoYolu)) {
      ol('dist/hizmetler/seo doğrudan yüklemede bölüm sırası: detay → kabuk → #lead', false, 'dist/hizmetler/seo yok');
      ol('dist/hizmetler/seo doğrudan yüklemede geç kurucular kayıtlı', false, 'dist/hizmetler/seo yok');
    } else {
      const seoHtml = anaBetigiGeriGom(fs.readFileSync(seoYolu, 'utf8'));
      const { dom: dom2 } = ortam(seoHtml, ORIGIN + '/hizmetler/seo', { fetch: fetchMock });
      const w2 = dom2.window, d2 = w2.document;
      const t1 = Date.now();
      while (!w2.__contentReady && Date.now() - t1 < 4000) await dur(40);
      await dur(300);

      /* 2026-08 GÜÇLENDİRİLDİ (üçüncü tur): "detay → kabuk → lead" kısmi
         iddiası, blokların iç içe geçme sırasındaki bozulmayı (sekpanel
         dipte, sektör seçimi en alta kaydırıyor) GÖRMÜYORDU. Artık dizinin
         TAMAMI kabuğun kanonik dizisiyle karşılaştırılıyor — kabuk kaynağın
         birebir kopyası olduğundan tek doğruluk kaynağı yine kabuk. */
      const kanonik = [...(new (require('jsdom').JSDOM)(shellHtml).window.document.querySelectorAll('body > section, section'))]
        .filter(x => x.parentElement && x.parentElement.tagName !== 'SECTION')
        .map(x => x.id).filter(Boolean);
      const dizi = [...d2.querySelectorAll('main > section')].map(x => x.id || '?');
      const ayni = dizi.length === kanonik.length && dizi.every((x, i) => x === kanonik[i]);
      const ilkFark = dizi.findIndex((x, i) => x !== kanonik[i]);
      ol('dist/hizmetler/seo doğrudan yüklemede main dizisi kabuğun kanonik dizisiyle birebir',
         ayni, ayni ? dizi.length + ' bölüm, sıra birebir'
                    : `ilk fark @${ilkFark}: beklenen=${kanonik[ilkFark]} gelen=${dizi[ilkFark]} (dizi ${dizi.length}/${kanonik.length})`);

      const gec = ['__flowBuild','__flowWire','__flowReveal','__szDraw',
                   '__hsRefresh','__tubesInit','__prjAllRender'];
      const eksik = gec.filter(a => typeof w2[a] !== 'function');
      ol('dist/hizmetler/seo doğrudan yüklemede geç kurucular kayıtlı',
         eksik.length === 0, eksik.length ? 'eksik: ' + eksik.join(',') : gec.length + ' kurucu tamam');

      dom2.window.close();
    }
  }

  /* 2026-08 (tur4, canlı Chrome turunda ölçülerek bulundu): kurulum turu
     bölüm GİZLİYKEN koştuğunda giriş animasyonları tetiklenmiyor, içerik
     DOM'da olduğu hâlde opacity:0'da kalıyordu — proje arşivi 7 kart
     görünmez, kadro 19 çipten 1'i görünür. İlke: içerik animasyonsuz da
     görünür. İki kural bunu ölçer. */
  {
    const cift = [
      ['projeler', path.join(DIST, 'projeler', 'index.html'), '/projeler',
       'dist/projeler doğrudan yüklemede tüm .mi kartları görünür',
       (w, d) => {
         const k = [...d.querySelectorAll('#msn .mi')];
         const gizli = k.filter(x => Number(w.getComputedStyle(x).opacity) < .99);
         return [k.length > 0 && gizli.length === 0,
                 `${k.length} kart, gizli=${gizli.length}`];
       }],
      ['ai-ajan', path.join(DIST, 'hizmetler', 'ai-ajan', 'index.html'), '/hizmetler/ai-ajan',
       'dist/hizmetler/ai-ajan doğrudan yüklemede kadro çipleri açık (.kdbox.in)',
       (w, d) => {
         const box = d.querySelector('.kdbox');
         const cip = d.querySelectorAll('.kdc').length;
         const acik = box && box.classList.contains('in');
         return [!!box && acik && cip > 1, `kdbox=${!!box} .in=${!!acik} çip=${cip}`];
       }]
    ];
    for (const [ad, yol, rota, baslik, olc] of cift) {
      if (!fs.existsSync(yol)) { ol(baslik, false, yol + ' yok'); continue; }
      const { dom: d3 } = ortam(anaBetigiGeriGom(fs.readFileSync(yol, 'utf8')), ORIGIN + rota, { fetch: fetchMock });
      const w3 = d3.window;
      const t = Date.now();
      while (!w3.__contentReady && Date.now() - t < 4000) await dur(40);
      await dur(400);
      /* jsdom'da clientWidth daima 0 döner; masonry layout() ilk satırda
         "bölüm gizliyken genişlik 0 gelir" bekçisine takılıp çıkar. Genişliği
         gerçekçi kılıp rota-açılış kancasını çağırıyoruz: kanca yoksa ya da
         kartları görünür kılmıyorsa kural kırmızı yanar. */
      Object.defineProperty(w3.Element.prototype, 'clientWidth',
        { configurable: true, get() { return 1200; } });
      Object.defineProperty(w3.HTMLElement.prototype, 'offsetHeight',
        { configurable: true, get() { return 300; } });
      if (ad === 'projeler' && typeof w3.__prjAllGiris === 'function') w3.__prjAllGiris();
      if (ad === 'ai-ajan' && typeof w3.__tara === 'function') w3.__tara();
      await dur(200);
      const [gecti, detay] = olc(w3, w3.document);
      ol(baslik, gecti, detay);
      d3.window.close();
    }
  }

  /* 116 · HİDRASYON DIŞ DOSYAYLA (2a). Yukarıdaki 3b ölçümleri app.js'i
     geri gömme yardımcısından geçiyor; bu kural AYRICA kanıt döngüsünün
     (../harness-hidrasyon.js) tamamını çocuk süreçte koşturur: dist
     sayfası dış ana betikle gerçekten hidre oluyor mu (huni ₺500.000,
     bayraklar, kabuk bölümleri). Harness dist sayfasında varlik/app.<hash>
     referansını ŞART koşar — ayrıştırılmamış (eski biçim) çıktıda kırmızı
     yanar; kuralın kırmızı tarafı böyle kanıtlandı. */
  {
    const { execFileSync } = require('child_process');
    let cikti = '', temiz = false;
    try {
      cikti = execFileSync(process.execPath, [path.join(KOK, 'harness-hidrasyon.js')],
        { stdio: 'pipe', cwd: KOK }).toString();
      temiz = true;
    } catch (e) {
      cikti = String(e.stdout || '') + String(e.stderr || '');
    }
    const m = cikti.match(/(\d+) geçti · (\d+) kaldı/);
    ol('hidrasyon kanıt döngüsü dış ana betikle temiz (harness-hidrasyon)',
       temiz, m ? `${m[1]} geçti · ${m[2]} kaldı`
                : (cikti.trim().split('\n').pop() || 'çıktı yok'));
  }

  /* 119 · AÇILIŞ TEK RENDER + İÇERİK ÖNCE (2026-08, röntgenin "1 no'lu
     tekrarlayıcısı"): renderAll açılışta İKİ kez koşuyordu — önce C=DATA
     ile, sonra content.json gelince applyContent ile bir daha. Artık
     içerik ÖNCE alınır (2,5 sn sigortalı yarış), C bir kez birleşir,
     renderAll BİR kez koşar. İkinci taraf KRİTİK ve bu kuralın asıl
     bekçiliği: content DATA'dan AYRIŞMIŞSA (ölçüldü: settings/legal/
     strings/projects dört anahtarda ayrık) tek render İÇERİĞİ basmalı —
     "aynıysa atla" tarzı bir kapı ekranda DATA bırakır, panelin yayını
     sessizce kaybolurdu (yanlış yeşilin dik âlâsı). İki senaryo tek
     kuralda: içerik geliyor → __renderN=1 VE DOM sentinel'i taşıyor;
     içerik gelmiyor → __renderN=1 VE DOM gömülü varsayılanı taşıyor. */
  {
    const anaYolu = path.join(DIST, 'index.html');
    const cjYolu = path.join(DIST, 'content.json');
    if (!fs.existsSync(anaYolu) || !fs.existsSync(cjYolu)) {
      ol('açılış tek render: içerik önce, renderAll bir kez (içerikli + içeriksiz)',
         false, 'dist/index.html veya dist/content.json yok');
    } else {
      const anaHtml = anaBetigiGeriGom(fs.readFileSync(anaYolu, 'utf8'));
      const sentinel = JSON.parse(fs.readFileSync(cjYolu, 'utf8'));
      if (sentinel.projects && sentinel.projects[0]) sentinel.projects[0].name = 'SENTINELX';
      const kos = async (icerikVer) => {
        const fm = (u) => {
          const s2 = String(u);
          if (s2.includes('shell.html'))
            return Promise.resolve({ ok: true, text: () => Promise.resolve(shellHtml) });
          if (s2.includes('content.json') && icerikVer)
            return Promise.resolve({ ok: true,
              json: () => Promise.resolve(JSON.parse(JSON.stringify(sentinel))) });
          return Promise.reject(new Error('ag yok (kural 119 — kasıtlı)'));
        };
        const { dom } = ortam(anaHtml, ORIGIN + '/', { fetch: fm });
        const w = dom.window;
        const t = Date.now();
        while (!w.__contentReady && Date.now() - t < 5000) await dur(40);
        await dur(300);
        const ad = (w.document.querySelector('#prjDeck .dk h3') || {}).textContent || '(yok)';
        const n = w.__renderN;
        dom.window.close();
        return { n, ad };
      };
      const a = await kos(true);
      const b = await kos(false);
      ol('açılış tek render: içerik önce, renderAll bir kez (içerikli + içeriksiz)',
         a.n === 1 && a.ad === 'SENTINELX' && b.n === 1
           && b.ad !== 'SENTINELX' && b.ad !== '(yok)',
         `içerikli[n=${a.n} ad=${a.ad}] içeriksiz[n=${b.n} ad=${b.ad}]`);
    }
  }
}

/* =====================================================================
   4 · GÜVENLİK — statik tarama
   ===================================================================== */
async function guvenlik() {
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

  /* yayinla.js — parola korumalı yayın hattı (bkz. test/yayinla.test.js
     davranışı ağa çıkmadan sahte adaptörle kanıtlıyor; burası yalnız
     kaynakta yapısal olarak doğru desenlerin durduğunu ölçüyor) */
  const yy = dosyalar['netlify/functions/yayinla.js'] || '';
  ol('yayinla: sabit parola/hash yok',
     !/PANEL_PAROLA_HASH\s*\|\|/.test(yy) && !/[0-9a-f]{32,}/i.test(yy), '');
  ol('yayinla: timingSafeEqual kullanılıyor', /timingSafeEqual/.test(yy), '');
  ol('yayinla: parola loglanmıyor',
     !/console\.(log|error|warn)\([^)]*\bparola\b/i.test(yy), '');

  /* 66 · yayinla.js'in GitHub Contents API'ye YAZDIĞI yol ile build.js'in
     diskten OKUDUĞU yol aynı dosyayı mı gösteriyor?
     GitHub Contents API yolu HER ZAMAN depo KÖKÜNE göredir. build.js'in
     ROOT'u ise kendi __dirname'i — Netlify'da bu, arayüzde ayarlı "Base
     directory" sayesinde depo kökünden FARKLI bir alt klasör olabilir.
     2026-08 BULUNDU: DOSYA_YOLU='content.json' depo KÖKÜNE yazıyordu,
     build.js ise <base>/content.json okuyordu — panel 200 dönüyor, commit
     atılıyor, denetim yeşil bitiyordu ama site hiç değişmiyordu (yanlış
     yeşil). Kural git'ten GERÇEK depo kökünü sorup DOSYA_YOLU'nu ona karşı
     doğruluyor — 'qanatone' burada sabit YAZILMIYOR, böylece depo yeniden
     düzenlenirse kural kendiliğinden güncel kalır (64/65'in kendi metnine
     takılma hatasını tekrarlamamak için: desen burada da yok, gerçek git
     durumuna karşı hesaplanıyor). */
  {
    const { execFileSync } = require('child_process');
    let depoKoku = null;
    try {
      depoKoku = execFileSync('git', ['rev-parse', '--show-toplevel'],
        { cwd: KOK, encoding: 'utf8' }).trim();
    } catch (e) { depoKoku = null; }
    const { DOSYA_YOLU } = require(path.join(KOK, 'netlify', 'functions', 'yayinla.js'));
    const depoGoreli = depoKoku !== null ? posixYol(path.relative(depoKoku, KOK)) : null;
    const beklenen = depoKoku !== null ? (depoGoreli ? depoGoreli + '/content.json' : 'content.json') : null;
    ol('yayinla yazdığı yol = build.js okuduğu yol (depo kökü üzerinden)',
       depoKoku !== null && DOSYA_YOLU === beklenen,
       `yazılan="${DOSYA_YOLU}" · build ROOT depo-göreli="${depoGoreli}" · beklenen="${beklenen}" · depoKöku=${depoKoku}`);
  }
  const ad = dosyalar['admin.html'] || '';
  const parolaAlani = (ad.match(/<input[^>]*id="yayinParola"[^>]*>/) || [''])[0];
  ol('admin.html: parola alanı password + autocomplete kapalı',
     /type="password"/.test(parolaAlani) && /autocomplete="off"/.test(parolaAlani),
     parolaAlani.slice(0, 70));
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

  /* 99 · teşhis aracı gövdeyi BELLEĞE ALMADAN sınırlıyor (2026-08):
     Eski kod `arrayBuffer()` ile yanıtın TAMAMINI belleğe alıp sonra
     `slice(0, MAX_BYTES)` yapıyordu — sınır tüketimi önlemiyor, yalnız
     sonucu kırpıyordu. 500 MB gövde sunan bir adres fonksiyonun belleğini
     o kadar şişirebiliyordu; burası herkese açık bir uç nokta.
     İKİ KATMAN ayrı ayrı ölçülüyor, çünkü biri tek başına yetmez:
       · Content-Length ön kontrolü ucuz ama YALAN söyleyebilir
       · akış sayacı chunked yanıtta (Content-Length yok) tek frendir
     Kural gerçek bir soket üzerinden ölçüyor: yerel sunucu sonsuz akıtıyor,
     grab bütçe dolunca kesmeli. Ağa çıkmaz, deterministiktir.
     safeUrl yerel adresi bilinçli reddettiği için handler üzerinden
     ölçülemez; grab doğrudan çağrılıyor (fonksiyon bu yüzden dışa veriliyor). */
  {
    const http = require('http');
    const D = require(path.join(KOK, 'netlify', 'functions', 'diagnose.js'));
    let onKontrol = null, akis = null, hata = '';
    try {
      const parca = Buffer.alloc(64 * 1024, 'a');
      const srv = http.createServer((req, res) => {
        let dur = false;
        const bitti = () => { dur = true; };
        req.on('close', bitti); res.on('close', bitti);
        if (req.url === '/buyuk') res.writeHead(200, { 'content-type': 'text/html', 'content-length': String(500 * 1024 * 1024) });
        else res.writeHead(200, { 'content-type': 'text/html' });     /* chunked */
        (function bas() {
          if (dur) return;
          if (res.write(parca)) setImmediate(bas); else res.once('drain', bas);
        })();
      });
      await new Promise(r => srv.listen(0, '127.0.0.1', r));
      const port = srv.address().port;
      onKontrol = await D.grab('http://127.0.0.1:' + port + '/buyuk', undefined, D.butceAc());
      akis = await D.grab('http://127.0.0.1:' + port + '/akis', undefined, D.butceAc());
      await new Promise(r => srv.close(r));
    } catch (e) { hata = String((e && e.message) || e).slice(0, 70); }
    const onKontrolTuttu = !!onKontrol && onKontrol.bytes === 0 && onKontrol.kesildi === true;
    /* aşım en fazla son parça kadar olabilir — "kırpıldı" değil "durduruldu" */
    const akisTuttu = !!akis && akis.kesildi === true
      && akis.bytes >= D.TOPLAM_BAYT && akis.bytes < D.TOPLAM_BAYT + 256 * 1024;
    ol('teşhis: gövde belleğe alınmadan sınırlanıyor (ön kontrol + akış sayacı)',
       onKontrolTuttu && akisTuttu,
       hata || `onKontrol=${onKontrol ? onKontrol.bytes : '-'}B akış=${akis ? akis.bytes : '-'}B bütçe=${D.TOPLAM_BAYT}B`);
  }

  /* 100 · kota SOYUT KİMLİK anahtarıyla çalışıyor, ham IP saklanmıyor.
     Üç şey birden kilitleniyor, çünkü üçü de sessizce bozulabilir:
       · KİMLİK yalnız Netlify'ın kendi başlığından. x-forwarded-for
         İSTEMCİ yazabilir; okunsaydı saldırgan her istekte başka değer
         yazıp sınırı tamamen atlardı. Kural XFF'i değiştirip anahtarın
         DEĞİŞMEDİĞİNİ ölçüyor.
       · TUZ ortamdan. Sabit/gömülü tuzla özet gizlilik SAĞLAMAZ: IPv4
         uzayı dört milyar adres, tamamı denenip özet geri çözülür. Kural
         aynı IP'nin farklı tuzlarla farklı anahtar ürettiğini ölçüyor —
         tuz gerçekten karışıma giriyor mu.
       · HAM IP hiçbir yerde durmuyor: ne anahtarda ne değerde.
     Depo sahte adaptörle veriliyor (yayinla.js deseni), ağa çıkılmaz. */
  {
    const D = require(path.join(KOK, 'netlify', 'functions', 'diagnose.js'));
    const IP = '203.0.113.77';
    /* kaynakta x-forwarded-for'a HİÇ bakılmıyor (yorumlar atılarak) */
    const kaynak = (dosyalar['netlify/functions/diagnose.js'] || '')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    const kaynaktaXffYok = !/x-forwarded-for/i.test(kaynak);
    let tuzKarisiyor = false, hamIpYok = false, xffYokSayiliyor = false;
    let ucuncuRed = false, basarisizYakmadi = false, depoTemiz = false, tuzsuzCalisti = false;
    const eskiTuz = process.env.KOTA_TUZ;
    try {
      const a1 = D.kimAnahtari(IP, 'tuz-bir');
      const a2 = D.kimAnahtari(IP, 'tuz-iki');
      tuzKarisiyor = a1 !== a2 && /^kim-[0-9a-f]{32}$/.test(a1);
      hamIpYok = !a1.includes(IP) && !a1.includes('203');
      /* XFF sahtelenirken kimlik değişmemeli */
      const k1 = D.istemciKimligi({ headers: { 'x-nf-client-connection-ip': IP, 'x-forwarded-for': '1.2.3.4' } });
      const k2 = D.istemciKimligi({ headers: { 'x-nf-client-connection-ip': IP, 'x-forwarded-for': '9.9.9.9' } });
      xffYokSayiliyor = k1 === IP && k2 === IP;
      const kutu = new Map();
      const depo = {
        async oku(k) { return kutu.has(k) ? JSON.parse(kutu.get(k)) : null; },
        async yaz(k, v) { kutu.set(k, JSON.stringify(v)); },
        async sil(k) { kutu.delete(k); }
      };
      process.env.KOTA_TUZ = 'denetim-tuzu';
      const h = D.handlerOlustur(depo);
      const olay = (ip, url) => ({ httpMethod: 'POST', headers: { 'x-nf-client-connection-ip': ip }, body: JSON.stringify({ url }) });
      /* geçersiz adres: analiz başarısız → hak yakmamalı */
      await h(olay('198.51.100.5', 'gecersiz adres!!'));
      const s1 = JSON.parse((await h(olay('198.51.100.5', 'example.com'))).body);
      basarisizYakmadi = s1.ok === true && s1.kalan === 1;
      await h(olay('198.51.100.5', 'example.com'));
      const r3 = await h(olay('198.51.100.5', 'example.com'));
      ucuncuRed = r3.statusCode === 429 && JSON.parse(r3.body).reason === 'kota';
      const hepsi = [...kutu.keys()].join(' ') + ' ' + [...kutu.values()].join(' ');
      depoTemiz = !hepsi.includes('198.51.100') && !hepsi.includes('denetim-tuzu');
      /* tuz yokken araç açık çalışmalı, depoya hiç yazmamalı */
      delete process.env.KOTA_TUZ;
      const kutu2 = new Map();
      const depo2 = { async oku() { return null; }, async yaz(k, v) { kutu2.set(k, v); }, async sil() {} };
      const eskiLog = console.log; console.log = () => {};
      const rt = await D.handlerOlustur(depo2)(olay('198.51.100.9', 'example.com'));
      console.log = eskiLog;
      tuzsuzCalisti = JSON.parse(rt.body).ok === true && kutu2.size === 0;
    } catch (e) {
    } finally {
      if (eskiTuz === undefined) delete process.env.KOTA_TUZ; else process.env.KOTA_TUZ = eskiTuz;
    }
    ol('kota: soyut kimlik anahtarı, ham IP yok, tuz ortamdan',
       tuzKarisiyor && hamIpYok && xffYokSayiliyor && kaynaktaXffYok
       && ucuncuRed && basarisizYakmadi && depoTemiz && tuzsuzCalisti,
       `tuz=${tuzKarisiyor} hamIpYok=${hamIpYok} xff=${xffYokSayiliyor}/${kaynaktaXffYok} ` +
       `ucuncuRed=${ucuncuRed} basarisizYakmadi=${basarisizYakmadi} depoTemiz=${depoTemiz} tuzsuz=${tuzsuzCalisti}`);
  }

  /* ---- FAZ 0 ortak koşucusu: teşhis fonksiyonunu AĞA ÇIKMADAN koştur.
     fetch fikstürden servis edilir; safeUrl'in DNS çözümü de sahtelenir,
     yoksa suite ağa bağımlı olur ve çevrimdışı makinede yanlış KIRMIZI
     yakar. İkisi de finally'de geri konur — global bırakılan bir stub
     sonraki kuralları sessizce zehirler.                                */
  async function fazSifirKos(yanitUret, url) {
    const D = require(path.join(KOK, 'netlify', 'functions', 'diagnose.js'));
    const dnsP = require('dns').promises;
    const eskiFetch = globalThis.fetch, eskiLookup = dnsP.lookup;
    const eskiTuz = process.env.KOTA_TUZ, eskiLog = console.log;
    const depo = { async oku() { return null; }, async yaz() {}, async sil() {} };
    try {
      dnsP.lookup = async () => [{ address: '93.184.216.34', family: 4 }];
      globalThis.fetch = yanitUret;
      delete process.env.KOTA_TUZ;
      console.log = () => {};
      const r = await D.handlerOlustur(depo)({
        httpMethod: 'POST',
        headers: { 'x-nf-client-connection-ip': '198.51.100.2' },
        body: JSON.stringify({ url: url || 'https://www.r10.net/' })
      });
      return { kod: r.statusCode, d: JSON.parse(r.body) };
    } catch (e) {
      return { kod: 0, d: {}, hata: String((e && e.message) || e).slice(0, 90) };
    } finally {
      globalThis.fetch = eskiFetch;
      dnsP.lookup = eskiLookup;
      console.log = eskiLog;
      if (eskiTuz === undefined) delete process.env.KOTA_TUZ; else process.env.KOTA_TUZ = eskiTuz;
    }
  }
  const fazSifirYanit = (durum, govde, ek) => async () =>
    new Response(govde, { status: durum, headers: Object.assign({ 'content-type': 'text/html; charset=utf-8' }, ek || {}) });

  /* 102 · FAZ 0 (+1) · DURUM KÖTÜYKEN KALEM PUANLANMIYOR, SKOR ÜRETİLMİYOR.
     2026-08 ÖLÇÜLDÜ (uydurma değil): r10.net'in Cloudflare challenge
     gövdesine karşı koşturulan analiz skor 44 üretti ve şu kalemleri
     YEŞİL yaptı — https · speed · weight · lang · viewport. Yani araç
     "siteniz 0,3 saniyede açılıyor, 5 KB" diyordu; site 1,24 MB ve araç
     onu HİÇ görmemişti. Engel sayfası küçük ve hızlı olduğu için ödül
     alıyordu. Bu YANLIŞ YEŞİL — deponun kendi kuralına göre yanlış
     kırmızıdan tehlikeli olan sınıf.
     İKİNCİ ÖLÇÜM, daha kötüsü: aynı adres aynı saat içinde İKİ FARKLI
     engel gövdesi döndürdü ve ikisi FARKLI puan aldı — "Just a moment"
     managed challenge 44, "Attention Required! | Cloudflare" WAF sayfası
     52. İki saat sonra hiç engel yoktu: 200 · 1,23 MB · 89. Yani üretilen
     sayı sitenin değil, o an hangi duvarın servis edildiğinin özelliği;
     kararlı bile değil. Kural bu yüzden tek bir sayıyı değil, SAYININ HİÇ
     ÜRETİLMEMESİNİ kilitliyor.
     Aşırı genelleme de eksik tespit kadar kötü: BEŞ hâl ayrı ayrı
     ölçülüyor, hiçbiri varsayılan olarak "engel" olmuyor.

     BEŞİNCİ HÂL — `reddedildi`. İlk yazımda imzasız bir 403 varsayılan
     olarak `engel` sayılıyordu; bu yanlış: imzasız 403 bir engel sistemi
     de olabilir, bir yetki ayarı da. `engel` iddiası YALNIZ imza varken
     kurulur, çünkü "AI tarayıcıları da aynı duvara çarpıyor" hükmü ancak
     o zaman doğrudur. İmza yoksa ölçülen gerçek söylenir ve konu sunucu
     sahibine devredilir.

     İMZA GÜCÜ AYRIMI — başlık imzası güçlü kanıt, gövde metni zayıf.
     `cf-mitigated` bir başlıktır, sunucu onu bilerek koyar; "Just a
     moment" sayfada tesadüfen geçebilecek bir metindir. Sıra:
       0 · 2xx muafiyeti (her şeyin üstünde)
       1 · başlık imzaları → engel
       2 · durum koduna özgü anlamlar (404/410, 5xx) → 3. adımı EZER
       3 · gövde metni imzaları → engel
       4 · hiçbiri yoksa → reddedildi
     Aşağıdaki dört negatif test bu sıranın kanıtıdır ve tek tek
     ölçülüyor: sıra bozulursa üçü birden düşer.                       */
  {
    const FIK = path.join(KOK, 'test', 'fikstur');
    let meta = null, govde = null, fikVar = false;
    try {
      meta = JSON.parse(fs.readFileSync(path.join(FIK, 'r10-cf-challenge.json'), 'utf8'));
      govde = fs.readFileSync(path.join(FIK, meta.govdeDosyasi));
      fikVar = govde.length === meta.bytes && meta.status === 403;
    } catch (e) {}

    const engel = fikVar ? await fazSifirKos(fazSifirYanit(meta.status, govde, {
      'cf-mitigated': meta.headers['cf-mitigated'],
      'server-timing': meta.headers['server-timing'],
      server: meta.headers.server
    })) : { d: {} };
    /* GÖVDE İMZASI YOLU: başlık imzası YOK, durum kodunun kendi anlamı da
       yok (403) — karar yalnız gövde metninden çıkmalı. Ölçülmüş gerçek
       sayfa: r10.net aynı saat içinde bunu da döndürdü ve üzerinde ne
       `cf-mitigated` ne `_cf_chl_opt` vardı.                            */
    const govdeEngeli = await fazSifirKos(fazSifirYanit(403,
      '<!DOCTYPE html><html lang="en-US"><head><title>Attention Required! | Cloudflare</title></head>'
      + '<body><div class="cf-error-details">Ray ID: a2b1f73f485d1537</div></body></html>',
      { server: 'cloudflare' }));

    /* ---- ZORUNLU NEGATİF TESTLER (sürüm 5) ---- */
    /* N1 · imzasız 403 → reddedildi, ASLA engel. Sürüm 1'in açığı buydu. */
    const imzasiz403 = await fazSifirKos(fazSifirYanit(403,
      '<html><body>Forbidden</body></html>', { server: 'nginx' }));
    /* N2 · "Just a moment" metni taşıyan 404 → bulunamadı. Durum kodunun
       kendi anlamı gövde metnini EZER; ezmeseydi her hata sayfasında
       geçen bir kelime adresi duvar ilan ederdi. */
    const metinli404 = await fazSifirKos(fazSifirYanit(404,
      '<html><body><h1>Just a moment</h1>sayfa yok</body></html>'));
    /* N3 · AYNI metni taşıyan 503 → sunucu hatası. İkisi aynı gövde, farklı
       kod: kararı verenin kod olduğunu kanıtlar. */
    const metinli503 = await fazSifirKos(fazSifirYanit(503,
      '<html><body><h1>Just a moment</h1>sayfa yok</body></html>'));
    /* N4 · 2xx MUAFİYETİ — her şeyin üstünde. `x-datadome` / `x-iinfo`
       o sağlayıcıların GEÇİRDİKLERİ trafikte de gider; 2xx'te engel
       sayılsalardı bu sağlayıcıları kullanan her SAĞLIKLI site duvar
       ekranı görür ve skoru hiç üretilmezdi — düzelttiğimiz hatanın ters
       yönü. Bu koşum normal skor üretmeli. */
    const korumaliAmaSaglikli = await fazSifirKos(fazSifirYanit(200,
      '<!DOCTYPE html><html lang="tr"><head><title>Yeterince uzun bir sayfa basligi burada</title>'
      + '<meta name="viewport" content="width=device-width"></head><body><h1>Bir</h1>'
      + '<p>Just a moment</p></body></html>',
      { 'x-datadome': 'protected', 'x-iinfo': '1-2-3', 'set-cookie': 'datadome=abc; Path=/' }));

    const bulunamadi = await fazSifirKos(fazSifirYanit(404, '<html><body>yok</body></html>'));
    const sunucu = await fazSifirKos(fazSifirYanit(503, '<html><body>arizali</body></html>'));
    const zamanAsimi = await fazSifirKos(async () => {
      const e = new Error('kesildi'); e.name = 'AbortError'; throw e;
    });

    const skorYok = o => o && o.score === undefined && o.items === undefined;
    const engelTuttu = fikVar && engel.d.durum === 'engel' && skorYok(engel.d)
      && engel.d.cdn === 'cloudflare' && engel.d.saglayici === 'cloudflare';
    const govdeEngeliTuttu = govdeEngeli.d.durum === 'engel' && skorYok(govdeEngeli.d);
    const bulunamadiTuttu = bulunamadi.d.durum === 'bulunamadi' && skorYok(bulunamadi.d);
    const sunucuTuttu = sunucu.d.durum === 'sunucu-hatasi' && skorYok(sunucu.d);
    const ulasilamadiTuttu = zamanAsimi.d.durum === 'ulasilamadi' && skorYok(zamanAsimi.d);
    /* negatif testlerin hükmü */
    const n1 = imzasiz403.d.durum === 'reddedildi' && skorYok(imzasiz403.d);
    const n2 = metinli404.d.durum === 'bulunamadi' && skorYok(metinli404.d);
    const n3 = metinli503.d.durum === 'sunucu-hatasi' && skorYok(metinli503.d);
    const n4 = korumaliAmaSaglikli.d.durum === 'saglikli'
      && typeof korumaliAmaSaglikli.d.score === 'number';
    ol('teşhis: 2xx dışında kalem puanlanmıyor, skor üretilmiyor (beş hâl, imza gücü sırası)',
       engelTuttu && govdeEngeliTuttu && bulunamadiTuttu && sunucuTuttu && ulasilamadiTuttu
       && n1 && n2 && n3 && n4,
       `fikstür=${fikVar} engel=${engel.d.durum || '-'}/${skorYok(engel.d)} `
       + `gövdeEngeli=${govdeEngeli.d.durum || '-'} bulunamadı=${bulunamadi.d.durum || '-'} `
       + `sunucu=${sunucu.d.durum || '-'} ulaşılamadı=${zamanAsimi.d.durum || '-'} · `
       + `N1 imzasız403=${imzasiz403.d.durum || '-'} N2 metinli404=${metinli404.d.durum || '-'} `
       + `N3 metinli503=${metinli503.d.durum || '-'} N4 xdatadome200=${korumaliAmaSaglikli.d.durum || '-'}`
       + `/${korumaliAmaSaglikli.d.score === undefined ? 'skorYok' : 'skor' + korumaliAmaSaglikli.d.score} · `
       + `duvarSkoru=${engel.d.score === undefined ? 'yok' : engel.d.score}`);
  }

  /* 103 · FAZ 0 (+2) · YANIT status/bytes/redirects/cdn/durum TAŞIYOR,
     cdn TANIMA LİSTESİNDEN geliyor.
     Bugün istemciye HTTP durumu hiçbir yerden ulaşmıyordu: S('status', …)
     çağrısında `v` parametresi hiç verilmemişti, yani doğru veri üretilse
     bile görünmezdi. Beş alan da eklendi.
     GÜVENLİK — `cdn` HAM BAŞLIK TAŞIMAZ: `server` / `cf-ray` saldırganın
     kontrolündedir, kötü niyetli bir sunucu `server: <script>…` gönderip
     dizeyi ekrana kadar taşıtabilir. Kural bunu gerçekten deniyor: ham
     dize yanıtın HİÇBİR yerinde geçmemeli, cdn sabit listeden bir değer
     olmalı. `redirects` de SAYI olmalı — URL listesi yeni bir saldırgan
     kontrollü dize sink'i açar ve bu turda gereği yok.                  */
  {
    const LISTE = ['cloudflare', 'fastly', 'cloudfront', 'akamai', 'bilinmiyor'];
    const KOTU = '<script>alert(1)</script>';
    const saglikli = await fazSifirKos(fazSifirYanit(200,
      '<!DOCTYPE html><html lang="tr"><head><title>Yeterince uzun bir sayfa basligi burada</title>'
      + '<meta name="viewport" content="width=device-width"></head><body><h1>Bir</h1></body></html>',
      { server: 'cloudflare' }));
    const kotuBaslik = await fazSifirKos(fazSifirYanit(403,
      '<html><body>engellendi</body></html>', { server: KOTU }));
    /* yönlendirme SAYI olarak dönmeli: iki hop takip edilen bir zincir */
    let hop = 0;
    const zincir = await fazSifirKos(async (u) => {
      if (hop++ < 2) return new Response('', { status: 302, headers: { location: 'https://ornek' + hop + '.com/' } });
      return new Response('<html><body>bitti</body></html>', { status: 403, headers: { server: 'fastly' } });
    });

    const s = saglikli.d, k = kotuBaslik.d, z = zincir.d;
    const alanlarVar = o => typeof o.status === 'number' && typeof o.bytes === 'number'
      && typeof o.redirects === 'number' && typeof o.cdn === 'string' && typeof o.durum === 'string';
    const saglikliTasiyor = alanlarVar(s) && s.status === 200 && s.durum === 'saglikli'
      && s.cdn === 'cloudflare' && typeof s.score === 'number';
    const engelTasiyor = alanlarVar(k) && k.status === 403;
    const listeden = LISTE.includes(k.cdn) && LISTE.includes(s.cdn) && LISTE.includes(z.cdn || '');
    const hamSizmadi = !JSON.stringify(k).includes('script') && !JSON.stringify(k).includes('alert');
    const yonlendirmeSayi = typeof z.redirects === 'number' && z.redirects === 2 && z.cdn === 'fastly';
    ol('teşhis: yanıt status/bytes/redirects/cdn/durum taşıyor, cdn tanıma listesinden',
       saglikliTasiyor && engelTasiyor && listeden && hamSizmadi && yonlendirmeSayi,
       `sağlıklı=${saglikliTasiyor} engel=${engelTasiyor} listeden=${listeden} `
       + `hamSızmadı=${hamSizmadi} yönlendirme=${z.redirects}(${typeof z.redirects}) cdn=${k.cdn}/${s.cdn}/${z.cdn}`);
  }

  /* ======================= FAZ 1 · YAPI KATMANI =======================
     KUSUR: `speed` tek bir soğuk isteğin süresini puanlıyordu ve skor bu
     yüzden tekrarlanabilir değildi. AYNI sağlıklı site üç kez ölçüldü:
     soğuk 1900 ms → 89 · ısınmış 505 ms → 93 · gecikmeli 4729 ms → 85.
     Ziyaretçi aracı iki kez çalıştırıp iki rakam görürse raporun geri
     kalanı ne kadar doğru olursa olsun tartışma orada biter.
     Süre bir BELİRTİ; sebepler belirlenimci ve hepsi elimizdeki tek
     fetch'ten okunabiliyor. `speed`'in 8 puanı yapı kalemlerine dağıtıldı,
     toplam yine 100.                                                    */

  /* 105 · FAZ 1 (+1) · YAPI KALEMLERİ ÖLÇÜLÜYOR, `speed` SÜREYE BAĞLI
     PUANLAMIYOR.
     Kural üç şeyi birden kilitliyor, çünkü üçü ayrı ayrı yanlış yeşil
     üretebilir:
       a) kalem VAR mı — `speed` gitti, sekiz yapı kalemi geldi, ağırlık
          toplamı yine 100 ve yeni kalemlerin payı tam 8;
       b) kalem GERÇEKTEN ölçüyor mu — iki uçtan gövde veriliyor (temiz /
          bozuk) ve sekiz kalemin sekizi de yön değiştirmeli. Sabit yeşil
          dönen bir kalem "ölçülüyor" değildir; bu depoda `status` kalemi
          tam olarak o hâle düştü ve bir tur boyunca kimse görmedi;
       c) EKRANA yalnız sayı çıkıyor mu — yazı tipi adları, görsel ve
          betik adresleri saldırganın kontrolündeki dizelerdir. Sayım
          güvenli, içerik değil. Ayrıca `ms` ekrandan kalkmalı: puana
          girmeyen ve bir düzeltmeye karşılık gelmeyen sayı gürültüdür. */
  {
    const D = require(path.join(KOK, 'netlify', 'functions', 'diagnose.js'));
    const YAPI = ['inline', 'blocking', 'fonts', 'imgdim', 'imgfmt', 'compress', 'cache', 'reqs'];
    const BAS = '<!DOCTYPE html><html lang="tr"><head>'
      + '<title>Yeterince uzun bir sayfa basligi burada</title>'
      + '<meta name="viewport" content="width=device-width">';

    /* TEMİZ UÇ — her yapı kalemi yeşil olmalı */
    const temiz = BAS + '<link rel="stylesheet" href="/s.css" media="print">'
      + '</head><body><h1>Bir</h1>'
      + '<img src="/a.webp" width="10" height="10" alt="a">'
      + '<a href="tel:+900000000000">ara</a><a href="mailto:a@b.com">yaz</a>'
      + '</body></html>';
    /* BOZUK UÇ — her yapı kalemi kırmızı olmalı */
    const govdeliBetik = '<script>var q=' + JSON.stringify('d'.repeat(6000)) + ';</' + 'script>';
    const engel = Array.from({ length: 6 }, (_, i) => `<link rel="stylesheet" href="/e${i}.css">`).join('')
      + '<script src="/b.js"></' + 'script>';
    const fontlar = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">'
      + '<style>' + Array.from({ length: 6 }, (_, i) =>
        `@font-face{font-family:F${i};src:url(/f${i}.woff2)}`).join('') + '</style>';
    const gorseller = Array.from({ length: 8 }, (_, i) => `<img src="/g${i}.jpg" alt="g">`).join('');
    const cokKaynak = Array.from({ length: 70 }, (_, i) => `<img src="/k${i}.jpg" alt="k">`).join('');
    const bozuk = BAS + engel + fontlar + '</head><body><h1>Bir</h1>'
      + govdeliBetik + gorseller + cokKaynak + '</body></html>';

    const IYI_BASLIK = { 'content-encoding': 'br', 'cache-control': 'public, max-age=31536000, immutable' };
    const KOTU_BASLIK = { 'cache-control': 'no-store' };

    const rT = await fazSifirKos(fazSifirYanit(200, temiz, IYI_BASLIK));
    const rB = await fazSifirKos(fazSifirYanit(200, bozuk, KOTU_BASLIK));
    const durumu = (o, k) => { const i = (o.items || []).find(x => x.k === k); return i ? i.state : '-'; };

    /* a) kalem varlığı + ağırlık dengesi */
    const anahtarlar = (rT.d.items || []).map(i => i.k);
    const speedGitti = !anahtarlar.includes('speed') && !(D.W && 'speed' in D.W);
    const yapiVar = YAPI.every(k => anahtarlar.includes(k));
    const agirlik = D.W || {};
    const toplamAgirlik = Object.keys(agirlik).reduce((t, k) => t + agirlik[k], 0);
    const yapiPayi = YAPI.reduce((t, k) => t + (agirlik[k] || 0), 0);
    const agirlikDengesi = toplamAgirlik === 100 && yapiPayi === 8;

    /* b) gerçekten ölçüyor mu — sekizinin sekizi de yön değiştirmeli */
    const temizYesil = YAPI.filter(k => durumu(rT.d, k) === 'ok');
    const bozukKirmizi = YAPI.filter(k => durumu(rB.d, k) === 'fail');
    const olcuyor = temizYesil.length === YAPI.length && bozukKirmizi.length === YAPI.length;

    /* c) yalnız SAYI — `v` ya boş ya rakam; hiçbir yerde dize yok.
       Adres/yazı tipi adı sızarsa bu ölçüm yakalar: gövdedeki bütün
       kaynak adları benzersiz ve aranabilir seçildi.                   */
    const yapiDegerleri = (rB.d.items || []).filter(i => YAPI.includes(i.k)).map(i => i.v);
    const yalnizSayi = yapiDegerleri.every(v => v === '' || /^\d+$/.test(String(v)));
    const yanitMetni = JSON.stringify(rB.d);
    const dizeSizmadi = !/fonts\.googleapis|\.woff2|\/g0\.jpg|\/e0\.css|\/b\.js|Inter/i.test(yanitMetni);
    const msPuanlanmiyor = rT.d.ms === undefined && !anahtarlar.includes('speed');

    /* c-2) EKRAN — gerçek sayfa, gerçek render. Kaynağa bakmak yetmez:
       bu suite'te üç kez yanlış yeşil kaynak taramasından geldi.       */
    let tileSayisi = 0, cevrilmemis = [], metaTemiz = false, duzeltmeVar = false, enCevrilmemis = [];
    {
      const kaynakHtml = fs.readFileSync(SRC, 'utf8');
      const { dom } = ortam(kaynakHtml, ORIGIN + '/');
      const w = dom.window, dd = w.document;
      await dur(700);
      const sahteYanit = {
        ok: true, host: 'ornek.com', finalUrl: 'https://ornek.com/', score: 61,
        kb: 120, status: 200, bytes: 122880, redirects: 0, cdn: 'bilinmiyor',
        durum: 'saglikli', cfEylul: false,
        items: (rB.d.items || []).map(i => ({ k: i.k, state: i.state, v: i.v }))
      };
      const cek = async () => {
        w.fetch = () => Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve(sahteYanit) });
        const inp = dd.querySelector('#dgUrl'), go = dd.querySelector('#dgGo');
        if (inp) inp.value = 'ornek.com';
        if (go) go.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
        await dur(500);
        return [...dd.querySelectorAll('#dgGrid .dgi')].map(el => ({
          etiket: (el.querySelector('.l') || {}).textContent || '',
          deger: (el.querySelector('.v') || {}).textContent || ''
        }));
      };
      const tr = await cek();
      tileSayisi = tr.length;
      /* çeviri denetimi YAPI kalemlerinde: `sitemap` gibi bazı eski
         kalemlerin İngilizce etiketi zaten anahtarın kendisidir ve o
         bilinçli — kural yeni kalemlerin etiketsiz kalmasını kilitliyor */
      const keyler = YAPI.slice();
      cevrilmemis = tr.filter(t => keyler.includes(t.etiket.trim())).map(t => t.etiket.trim());
      const meta = (dd.querySelector('#dgMeta') || {}).textContent || '';
      /* `ms` ekrandan kalktı: ne "Açılış"/"Load" kutusu ne saniye birimi */
      metaTemiz = !/Açılış|Load/i.test(meta) && !/\bsn\b/i.test(meta) && /KB/.test(meta);
      duzeltmeVar = dd.querySelectorAll('#dgFix .dgfl').length === 3
        && ![...dd.querySelectorAll('#dgFix .dgfl b')]
             .some(b => sahteYanit.items.some(i => i.k === b.textContent.trim()));
      dd.documentElement.lang = 'en';
      const en = await cek();
      enCevrilmemis = en.filter(t => keyler.includes(t.etiket.trim())).map(t => t.etiket.trim());
      dom.window.close();
    }
    const gosterimTemiz = tileSayisi === (rB.d.items || []).length
      && cevrilmemis.length === 0 && enCevrilmemis.length === 0 && metaTemiz && duzeltmeVar;

    /* PRIO — ayrı bir sabit liste. `speed` orada kalırsa ölü girdi olur,
       yeni kalemler eklenmezse öncelik sıralaması onları hiç göstermez. */
    const prioSatiri = (fs.readFileSync(SRC, 'utf8').match(/const PRIO=\[[\s\S]{0,400}?\];/) || [''])[0];
    const prioGuncel = !!prioSatiri && !/'speed'/.test(prioSatiri)
      && YAPI.every(k => prioSatiri.includes(`'${k}'`));

    ol('teşhis: yapı kalemleri ölçülüyor, speed süreye bağlı puanlamıyor',
       speedGitti && yapiVar && agirlikDengesi && olcuyor && yalnizSayi
       && dizeSizmadi && msPuanlanmiyor && gosterimTemiz && prioGuncel,
       `speedGitti=${speedGitti} yapıVar=${yapiVar} ağırlık=${toplamAgirlik}/yapı=${yapiPayi} `
       + `temizYeşil=${temizYesil.length}/8 bozukKırmızı=${bozukKirmizi.length}/8 `
       + `yalnızSayı=${yalnizSayi} dizeSızmadı=${dizeSizmadi} msYok=${msPuanlanmiyor} `
       + `ızgara=${tileSayisi} çevrilmemiş=${cevrilmemis.concat(enCevrilmemis).join(',') || 'yok'} `
       + `meta=${metaTemiz} düzeltme=${duzeltmeVar} PRIO=${prioGuncel}`);
  }

  /* 106 · FAZ 1 (+2) · BELİRLENİMCİLİK: AYNI GİRDİ → AYNI ÇIKTI.
     Bu turun asıl kazancı ve bilerek SINIF kuralı.
     Sabit fikstürü beş kez koşturmak neredeyse hiçbir şey kanıtlamaz —
     girdi inşa gereği aynı, çıktının aynı olması beklenen şey. Gerçek
     test AYNI gövdeyi FARKLI ölçülen süreyle vermektir: 120 ms'de ve
     3800 ms'de alınmış gibi. Puanlanan yük birebir aynı çıkmalı.
     Süreler bilerek eski `speed` bandının iki yakasından seçildi
     (band 1500/3500): temel commit'te biri `ok`, öteki `fail` üretir ve
     kural orada DÜŞER — kuralın kırmızı tarafı budur.
     YANIT İKİ BÖLGE: puanlanan yük (items/score/yapı) karşılaştırılır;
     teşhis bölgesi (`ms` ve zamana bağlı gözlemler) karşılaştırmanın
     DIŞINDADIR ve ekrana çıkmaz. Sınır kodda açıkça duruyor
     (`diagnose.TESHIS_ALANI`), tahmine bırakılmadı.
     ZAMAN TABANLI KORUMA YASAK: "ayrıştırma X ms'yi aşarsa vazgeç" gibi
     bir koruma aynı siteye makine yüküne göre farklı skor verirdi —
     düzelttiğimiz kusurun aynısı. Sınır girdi boyutundan gelir. */
  {
    const D = require(path.join(KOK, 'netlify', 'functions', 'diagnose.js'));
    const GOVDE = '<!DOCTYPE html><html lang="tr"><head>'
      + '<title>Yeterince uzun bir sayfa basligi burada</title>'
      + '<meta name="viewport" content="width=device-width">'
      + '<link rel="stylesheet" href="/a.css"><style>@font-face{font-family:F;src:url(/f.woff2)}</style>'
      + '</head><body><h1>Bir</h1><script>var q=1;</' + 'script>'
      + '<img src="/a.jpg" alt="a"><img src="/b.webp" width="4" height="4" alt="b">'
      + '<a href="tel:+900000000000">ara</a><a href="mailto:a@b.com">yaz</a></body></html>';

    /* YALNIZ BELGE isteği gecikir; robots/sitemap anında döner. Onları da
       geciktirmek 3800 ms'lik koşumda bütçeyi tüketip robots kalemini
       oynatırdı — o zaman ölçtüğümüz şey belirlenimcilik değil, zaman
       aşımı olurdu. */
    const gecikmeliKoscu = (msGec) => {
      let ilk = true;
      return async (hedef) => {
        const u = String(hedef);
        if (/robots\.txt$/i.test(u))
          return new Response('User-agent: *\nAllow: /\nSitemap: https://ornek.com/sitemap.xml\n',
            { status: 200, headers: { 'content-type': 'text/plain' } });
        if (/sitemap\.xml$/i.test(u)) return new Response('', { status: 200 });
        if (ilk) { ilk = false; await dur(msGec); }
        return new Response(GOVDE, { status: 200, headers: {
          'content-type': 'text/html; charset=utf-8',
          'content-encoding': 'br', 'cache-control': 'public, max-age=600' } });
      };
    };

    const hizli = await fazSifirKos(gecikmeliKoscu(120));
    const yavas = await fazSifirKos(gecikmeliKoscu(3800));
    const BOLGE = D.TESHIS_ALANI || 'teshis';
    const puanlanan = o => {
      const k = Object.assign({}, o || {});
      delete k[BOLGE];
      return JSON.stringify(k);
    };
    const okunanMs = o => ((o && o[BOLGE]) || {}).ms;
    /* deneyin kendisi geçerli mi: süreler GERÇEKTEN ayrıştıysa iddia
       sınanmış olur; ayrışmadıysa test hiçbir şey kanıtlamaz */
    const sureAyristi = Number(okunanMs(yavas.d)) - Number(okunanMs(hizli.d)) > 2000;
    const yukAyni = puanlanan(hizli.d) === puanlanan(yavas.d) && hizli.d.ok === true;
    const bolgeAyri = okunanMs(hizli.d) !== undefined && hizli.d.ms === undefined;

    /* ikincil, tek başına zayıf: aynı fikstür beş koşum */
    const besKosum = [];
    for (let i = 0; i < 5; i++) besKosum.push(puanlanan((await fazSifirKos(gecikmeliKoscu(0))).d));
    const besiAyni = besKosum.every(x => x === besKosum[0]);

    ol('teşhis: belirlenimcilik — aynı gövde, farklı süre, birebir aynı puanlanan yük',
       sureAyristi && yukAyni && bolgeAyri && besiAyni,
       `süreAyrıştı=${sureAyristi} (${okunanMs(hizli.d)} ms / ${okunanMs(yavas.d)} ms) `
       + `yükAynı=${yukAyni} teşhisBölgesiAyrı=${bolgeAyri} beşKoşum=${besiAyni} `
       + `skor=${hizli.d.score}/${yavas.d.score}`);
  }

  /* 92 · panel kapısı (2026-08, canlıda ÖLÇÜLDÜ: ADMIN 200 anonim):
     `admin.html` yayın çıktısında duruyordu ve hiçbir kimlik kontrolü
     yoktu. Bugüne kadarki etkisi sınırlıydı çünkü yayın ucu zaten 503'tü;
     PANEL_PAROLA_HASH tanımlandığı AN aynı açık yüzey ciddileşiyor —
     ikisi bu yüzden aynı turda hareket ediyor.
     SEÇİLEN YOL: sunucu tarafı kapı. Statik panel dist'ten çıkarıldı,
     /admin.html zorlamalı yönlendirmeyle (200!) panel fonksiyonuna
     düşüyor, fonksiyon HTTP Basic Auth ile aynı scrypt hash'ine karşı
     doğruluyor. Kimlik kanıtlanmadan panelin tek baytı gitmiyor.
     Kural DAVRANIŞI ölçer, deseni değil: fonksiyon gerçekten çağrılıp
     anonim/yanlış/doğru üç yol da koşturuluyor. Kaynakta 'Basic' geçmesi
     yeşil saymaya yetmez — bu suite'te üç kez yanlış yeşil o yoldan
     geldi. Statik kopyanın yokluğu da şart: kopya kalsaydı kapı
     dururken herkes yan kapıdan girerdi. */
  {
    const crypto = require('crypto');
    const eskiHash = process.env.PANEL_PAROLA_HASH;
    let statikYok = false, yonlendirme = false;
    let anonim = false, yanlisRed = false, dogruGecer = false, not = '';
    try {
      statikYok = !fs.existsSync(path.join(DIST, 'admin.html'));
      const rdY = path.join(DIST, '_redirects');
      const rd = fs.existsSync(rdY)
        ? fs.readFileSync(rdY, 'utf8').split('\n')
            .filter(l => l.trim() && !l.trim().startsWith('#')).join('\n')
        : '';
      yonlendirme = /^\/admin\.html\s+\/\.netlify\/functions\/panel\s+200!$/m.test(rd);

      const parola = 'denetim-kapi-parolasi';
      const tuz = crypto.randomBytes(16).toString('hex');
      process.env.PANEL_PAROLA_HASH =
        tuz + ':' + crypto.scryptSync(parola, tuz, 64).toString('hex');
      const { handler } = require(path.join(KOK, 'netlify', 'functions', 'panel.js'));
      const basic = p => 'Basic ' + Buffer.from('panel:' + p).toString('base64');

      const rA = await handler({ httpMethod: 'GET', headers: {} });
      anonim = rA.statusCode === 401 &&
        Object.keys(rA.headers || {}).some(k => k.toLowerCase() === 'www-authenticate');
      const rY = await handler({ httpMethod: 'GET', headers: { authorization: basic('yanlis') } });
      yanlisRed = rY.statusCode === 401;
      const rD = await handler({ httpMethod: 'GET', headers: { authorization: basic(parola) } });
      dogruGecer = rD.statusCode === 200 && String(rD.body).includes('id="yayinParola"');
      not = `anonim=${rA.statusCode} yanlis=${rY.statusCode} dogru=${rD.statusCode}`;
    } catch (e) {
      not = 'kapı yok/çalışmadı: ' + String((e && e.message) || e).slice(0, 60);
    } finally {
      if (eskiHash === undefined) delete process.env.PANEL_PAROLA_HASH;
      else process.env.PANEL_PAROLA_HASH = eskiHash;
    }
    ol('panel kapısı: statik panel yayında yok + kimliksiz geçilmiyor',
       statikYok && yonlendirme && anonim && yanlisRed && dogruGecer,
       `statikYok=${statikYok} yonlendirme=${yonlendirme} ${not}`);
  }

  /* 93 · saklanan hash'in BİÇİMİ doğrulanıyor (2026-08):
     dogrula() keylen'i saklanan hash'in UZUNLUĞUNDAN türetiyordu
     (`beklenen.length || 64`). scrypt'in son adımı 1 turluk PBKDF2'dir:
     kısa keylen çıktısı, uzun keylen çıktısının İLK BAYTLARIDIR. Yani
     ortam değişkenine kırpık bir hash düşerse (yapıştırırken satır
     kesildi, kopya eksik alındı) doğrulama sessizce ilk N bayta iner ve
     zayıflar — 401 vermez, hata vermez, KABUL EDER. Kırpılmış hash'i
     üretimde hiçbir belirti ele vermez; bu yüzden kural davranışı
     ölçüyor: tam biçim geçer, kırpığı DÜŞER. Tek geçerli biçim
     parola-hash.js'in ürettiğidir: 32 hex tuz + ':' + 128 hex (64 bayt). */
  {
    const crypto = require('crypto');
    let tamGecer = false, kirpikRed = false, tekHexRed = false, not = '';
    try {
      const { dogrula } = require(path.join(KOK, 'netlify', 'functions', 'yayinla.js'));
      const parola = 'denetim-bicim-parolasi';
      const tuz = crypto.randomBytes(16).toString('hex');
      const tam = crypto.scryptSync(parola, tuz, 64).toString('hex');
      tamGecer = dogrula(parola, tuz + ':' + tam) === true;
      /* 32 baytlık önek — eski kod bunu KABUL ediyordu */
      kirpikRed = dogrula(parola, tuz + ':' + tam.slice(0, 64)) === false;
      /* tek karakter eksik: Buffer.from(hex) sessizce kırpar */
      tekHexRed = dogrula(parola, tuz + ':' + tam.slice(0, 127)) === false;
      not = `tam=${tamGecer} kirpik=${kirpikRed} tekEksik=${tekHexRed}`;
    } catch (e) { not = String((e && e.message) || e).slice(0, 60); }
    ol('yayinla: hash biçimi doğrulanıyor (kırpık hash reddediliyor)',
       tamGecer && kirpikRed && tekHexRed, not);
  }
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
  await statikDogrudanYukleme();
  await guvenlik();          /* panel kapısı gerçekten çağrılıyor (92) */
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
