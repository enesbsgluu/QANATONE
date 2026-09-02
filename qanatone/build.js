#!/usr/bin/env node
/* build.js — QANATONE statik üreteç
   ---------------------------------------------------------------------
   NEDEN VAR
     Site tek dosyalık bir SPA: içerik JavaScript ile basılıyor. Googlebot
     JS çalıştırıyor ama AI tarayıcıları (GPTBot, ClaudeBot, PerplexityBot,
     Bytespider, Meta) ÇALIŞTIRMIYOR — ham HTML'i okuyup gidiyorlar.
     Ölçtük: JS kapalıyken /projeler içeriğinin %83'ü, /hizmetler'in %74'ü,
     /bulten listesinin %72'si görünmüyordu.

   NE YAPAR
     index.html'i jsdom'da açar, her rotaya gider, sitenin KENDİ render
     fonksiyonlarının ürettiği DOM'u olduğu gibi diske yazar. Yani içerik
     ham HTML'e gömülür.

   NEDEN JSDOM (regex ile şablon yazmak yerine)
     Tek kaynak ilkesi. Kartları, hizmet detaylarını, SSS'i Node tarafında
     yeniden yazsaydık aynı içeriğin iki ayrı üreteci olurdu ve biri
     ötekinden sapardı. Burada sayfayı sitenin kendisi üretiyor; üreteç
     sadece fotoğrafını çekiyor.
     BEDELİ: jsdom bir bağımlılık. `npm install` gerekiyor (package.json).

   NASIL ÇALIŞTIRILIR
     npm install && node build.js
     Netlify derleme komutu olarak da aynı satır yazılır.

   ÇIKTI
     hizmetler/index.html, hizmetler/<slug>/index.html, projeler/…,
     bulten/…, sss/, surec/, otomasyon/, sitemap.xml, robots.txt,
     bulten/rss.xml, <indexnow-anahtari>.txt
   --------------------------------------------------------------------- */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ORIGIN = 'https://qanatone.com';
const ROOT = __dirname;
const SRC  = path.join(ROOT, 'index.html');
/* ÇIKTI AYRI KLASÖRE. Bir kez üretecin çıktısı kaynağın üzerine yazıldı ve
   ikinci koşuda "önceden render edilmiş sayfayı yeniden render etme"
   durumuna düşüldü. Kaynak ile çıktı asla aynı yerde durmayacak.
   Netlify'da yayın klasörü: dist                                        */
const OUT  = path.join(ROOT, 'dist');
/* ── ARTIMLI DERLEME ────────────────────────────────────────────────────
   Sorun: her yayında 58 sayfanın hepsi yeniden basılıyordu (~100 sn).
   Tek bir bülten yazısı düzeltmek için bütün siteyi render etmek hem
   derleme dakikası hem bekleme demek — Bab İç Mimarlık'ta da aynı dert
   çıkmıştı.
   Çözüm: her rotanın GİRDİLERİNİN özeti alınıyor. Özet değişmediyse sayfa
   önbellekten kopyalanıyor, jsdom hiç açılmıyor.
   Girdiler = index.html'in özeti (kod değişirse her şey yeniden basılır,
   doğrusu bu) + her sayfada görünen ortak alanlar + o rotanın kendi verisi.
   Önbellek Netlify derlemeleri arasında eklentiyle taşınıyor
   (plugins/onbellek + netlify.toml). Önbellek yoksa tam derleme olur —
   yani en kötü durum bugünkü durum.                                    */
const CACHE = path.join(ROOT, '.onbellek');
const MANIFEST = path.join(CACHE, 'manifest.json');
const TAM = process.env.TAM_DERLEME === '1';   // elle tam derleme anahtarı
/* Buffer dogrudan hash'lenir. Onceden Buffer da JSON.stringify dalina
   dusuyordu: 783 KB'lik index.html icin ~4 MB'lik bir sayi dizisi metni
   uretiliyordu. Sonuc yine deterministikti ama bosunaydi. String ve nesne
   dallari degismedi -> artimli derleme imzalari (satir 489, 497) etkilenmez. */
const ozet = v => crypto.createHash('sha1')
  .update(Buffer.isBuffer(v) ? v : typeof v === 'string' ? v : JSON.stringify(v ?? null))
  .digest('hex').slice(0, 16);
/* Olduğu gibi kopyalanacaklar — üretecin dokunmadığı varlıklar */
/* _redirects BİLEREK listede yok: onu üretecin kendisi yazıyor (bilinen
   rotalar + 404). Kökte de bir kopya dursaydı hangisinin geçerli olduğu
   belirsizleşirdi.
   netlify/ de listede YOK: Netlify fonksiyonları KÖK dizindeki
   netlify/functions'tan derleniyor. Yayın klasörüne kopyalansaydı
   fonksiyon kaynak kodu /netlify/functions/diagnose.js adresinden
   herkese okunur hâle gelirdi — gereksiz bilgi ifşası.                */
/* admin.html LİSTEDE YOK (2026-08): panel statik dosya olarak yayına
   çıkarsa anonim 200 döner — ölçüldü, dönüyordu. Panel artık
   netlify/functions/panel.js'ten, Basic Auth kapısının ardından
   servis ediliyor; /admin.html adresi aşağıda zorlamalı yönlendirmeyle
   o fonksiyona bağlanıyor. Kaynakta duruyor, yayın çıktısında durmuyor. */
const KOPYA = ['img', 'js', '_headers', 'content.json', 'og.png'];
const BEKLE = 260;               // her rotadan sonra render'ın oturması için

/* ---------- yardımcılar ---------- */
const yaz = (rel, icerik) => {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, icerik);
  console.log(`  yazildi  ${rel}  (${Math.round(icerik.length / 1024)} KB)`);
};
const bugun = () => new Date().toISOString().slice(0, 10);

/* ---------- jsdom ortamı ----------
   Tarayıcıda olup jsdom'da olmayan ne varsa taklit ediliyor. Bunlar
   sitenin hatası değil, koşum ortamının eksiği: canvas, Path2D, SVG
   geometrisi, IntersectionObserver, ResizeObserver, matchMedia.        */
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
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}

function ortam(html, url) {
  const hata = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => hata.push(String((e && e.message) || e)));
  const dom = new JSDOM(html, {
    url, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.innerWidth = 1440; w.innerHeight = 900; w.devicePixelRatio = 1;
      w.matchMedia = q => ({
        matches: false, media: q, addListener() {}, removeListener() {},
        addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; }
      });
      w.IntersectionObserver = class {
        constructor(c) { this.c = c; }
        observe(e) { this.c([{ target: e, isIntersecting: true, intersectionRatio: 1 }], this); }
        unobserve() {} disconnect() {} takeRecords() { return []; }
      };
      w.ResizeObserver = class {
        constructor(c) { this.c = c; }
        observe(e) { this.c([{ target: e, contentRect: { width: 1440, height: 400 } }], this); }
        unobserve() {} disconnect() {}
      };
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
      /* content.json derleme sırasında diskte ise onu ver: statik sayfa
         sitede görünenle birebir aynı olsun.                            */
      const cj = path.join(ROOT, 'content.json');
      const icerik = fs.existsSync(cj) ? JSON.parse(fs.readFileSync(cj, 'utf8')) : null;
      w.fetch = u => String(u).includes('content.json') && icerik
        ? Promise.resolve({ ok: true, json: () => Promise.resolve(icerik) })
        : Promise.reject(new Error('ag yok (derleme)'));
    }
  });
  return { dom, hata };
}

const dur = ms => new Promise(r => setTimeout(r, ms));

/* ---------- bir rotayı bas ----------
   Gezinme sitenin kendi yönlendiricisi üzerinden yapılıyor: bağlantıya
   tıklıyoruz. Böylece show() ne yapıyorsa aynısı oluyor, ayrı bir kod
   yolu doğmuyor.                                                       */
async function gez(w, d, secici) {
  const a = d.querySelector(secici);
  if (!a) throw new Error('baglanti bulunamadi: ' + secici);
  a.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  await dur(BEKLE);
}

/* Ham HTML'i temizle: açılış katmanı sınıfları statik çıktıda kalmasın,
   yoksa JS gelene kadar karşılama perdesi içeriğin üstünde durur.      */
function temizle(html) {
  return html
    .replace(/<html([^>]*?)class="([^"]*)"/,
      (m, a, c) => `<html${a}class="${c.split(/\s+/)
        .filter(x => x && !['boot-on', 'booting', 'bitcursor'].includes(x)).join(' ')}"`)
    .replace(/<html([^>]*?)class=""\s*/, '<html$1');
}

async function sayfa(rota, dil) {
  const ham = fs.readFileSync(SRC, 'utf8');
  /* Dili ADRESTEN veriyoruz: /en ile açılan sayfa sitenin kendi dil
     mantığını çalıştırır. Böylece EN çıktısı da TR gibi tek kaynaktan
     üretiliyor, ikinci bir çeviri yolu doğmuyor.                       */
  const kok = ORIGIN + (dil === 'en' ? '/en/' : '/');
  const { dom, hata } = ortam(ham, kok);
  const w = dom.window, d = w.document;
  await dur(500);                                  // boot() bitsin

  await rota.git(w, d);

  /* Rotaya ait olmayan bölümleri çıkar.
     Hepsini bırakınca 29 sayfanın hepsi aynı 21.000 karakteri taşıyordu:
     arama motoru için kopya içerik, sayfanın konusu belirsiz. Ziyaretçinin
     tarayıcıda gezinebilmesi için sitedeki kabugu_tamamla() eksikleri
     shell.html'den geri alıyor — bot onu çalıştırmadığı için ham HTML
     yalnız bu rotanın metnini taşıyor.
     #lead (kapanış çağrısı) her sayfada kalıyor: rota bölümü değil.     */
  const acik = [...d.querySelectorAll('section.pg.on')].map(s => s.id);
  const ana = d.querySelector('main');
  if (ana) [...ana.children].forEach(el => {
    if (el.tagName !== 'SECTION') return;
    if (el.classList.contains('on') || !el.classList.contains('pg')) return;
    el.remove();
  });
  const metin = acik.map(id => (d.getElementById(id).textContent || '')
    .replace(/\s+/g, ' ').trim()).join(' ');

  /* PERDE ÇALIŞMA ZAMANI KATMANIDIR — donmuş ara karesi çıktıya yazılmaz.
     jsdom'da açılış denetleyicisi koşuyor ve `#boot` içine satır içi stil
     yazıyor: harflere `transform:translateY(-64px);opacity:0`, izlere
     `stroke-dasharray:100 100;stroke-dashoffset:-100`. Dasharray değerleri
     UYDURMA — `getTotalLength` bu ortamda sabit 100 döndürüyor (yukarıdaki
     saplama), gerçek yol uzunlukları 142–176.
     Bugüne kadar görünmedi çünkü gerçek tarayıcıda aynı betik değerleri
     milisaniyeler içinde doğrusuyla eziyordu. Perde mobilde saf CSS'e
     geçince ezen kalmadı: CSS yalnız `opacity` animasyonluyor, dasharray'e
     dokunmuyor — izler yarım çizili donardı.
     Kaynakta YAZILI olan stiller (harflerdeki `--i`) korunuyor; yalnız
     çalışma zamanının yazdığı özellikler siliniyor. `<html>`den açılış
     sınıflarını temizleyen `temizle()` ile aynı gerekçe, aynı katman.   */
  const perde = d.getElementById('boot');
  if (perde) {
    const runtimeOzellik = ['stroke-dasharray', 'stroke-dashoffset',
                            'opacity', 'transform', 'will-change', '--p'];
    for (const el of [perde, ...perde.querySelectorAll('[style]')]) {
      for (const oz of runtimeOzellik) el.style.removeProperty(oz);
      if (!(el.getAttribute('style') || '').trim()) el.removeAttribute('style');
    }
  }

  const cikti = temizle(dom.serialize());
  dom.window.close();
  return { html: cikti, acik, metin: metin.length, hata, url: rota.url };
}

/* ---------- rota listesi ----------
   Slug listeleri index.html'in kendisinden okunuyor; elle liste tutmuyoruz
   ki içerik değişince üreteç geride kalmasın.                          */
function rotalar(w, d) {
  const C = w.__qanatExport ? w.__qanatExport() : {};
  const svc = (C.services || []).filter(s => s && s.slug && s.det).map(s => s.slug);
  const prj = (C.projects || []).filter(p => p && p.slug).map(p => p.slug);
  const pst = (C.posts || []).filter(p => p && p.slug).map(p => p.slug);
  return { svc, prj, pst };
}

/* Bir rotanın çıktısını etkileyen veriyi topla.
   Şüphede kalınca FAZLASINI koy: fazlası gereksiz yeniden basım, eksiği
   bayat sayfa demek. Bayat sayfa çok daha pahalı bir hata.            */
function rotaVerisi(rel, C) {
  const ortak = { s: C.strings, t: C.theme, st: C.settings, so: C.socials };
  const yol = rel.replace(/^en\//, '').replace(/\/?index\.html$/, '') || '/';
  const m = (re) => yol.match(re);
  let mm;
  if ((mm = m(/^hizmetler\/(.+)$/)))
    return { ...ortak, x: (C.services || []).find(v => v.slug === mm[1]) };
  if ((mm = m(/^projeler\/(.+)$/)))
    return { ...ortak, x: (C.projects || []).find(v => v.slug === mm[1]) };
  if ((mm = m(/^bulten\/(.+)$/)))
    return { ...ortak, x: (C.posts || []).find(v => v.slug === mm[1]) };
  if (yol === 'hizmetler')  return { ...ortak, x: C.services };
  if (yol === 'projeler')   return { ...ortak, x: C.projects };
  if (yol === 'sss')        return { ...ortak, x: C.faq };
  if (yol === 'surec')      return { ...ortak, x: C.steps };
  if (yol === 'otomasyon')  return { ...ortak, x: C.services };
  if (yol === 'bulten')     return { ...ortak,
    x: (C.posts || []).map(v => ({ s: v.slug, d: v.date, t: v.title, l: v.lede, g: v.tag })) };
  /* ana sayfa: üstünde ne varsa hepsi */
  return { ...ortak, x: [C.services, C.projects, C.sectors, C.testimonials, C.founder] };
}

/* ---------- DEVİR DOSYASI ----------
   Sohbet şişince yeni sohbete geçerken hep bir şeyler eksik kalıyordu:
   devir notu elle yazılıyor, elle yazılan her şey gibi bayatlıyordu.
   Artık ÜRETEÇ yazıyor. Dosya listesi gerçek diskten, damga gerçek
   kaynaktan, sayfa sayısı gerçek çıktıdan geliyor — yani eksik ya da
   yanlış olması mümkün değil.                                          */
function devir(bilgi) {
  const dosyalar = [];
  (function tara(d, on) {
    for (const f of fs.readdirSync(d).sort()) {
      if (['node_modules', 'dist', '.onbellek', '.git', '.veri'].includes(f)) continue;
      const p = path.join(d, f), rel = on + f;
      const st = fs.statSync(p);
      if (st.isDirectory()) {
        if (['img', 'js'].includes(rel)) {
          const ic = fs.readdirSync(p);
          const boy = ic.reduce((a, x) => a + fs.statSync(path.join(p, x)).size, 0);
          dosyalar.push([rel + '/', `${ic.length} dosya`, Math.round(boy / 1024) + ' KB', '']);
        } else tara(p, rel + '/');
      } else {
        /* DEVIR.md'nin kendi ozeti YAZILAMAZ: bu satir olusurken dosya
           henuz yazilmamis olur, diskte duran bir onceki derlemenin
           kalintisidir. Yani tablodaki tek satir hep bir derleme bayatti.
           Sessiz bir yalan yerine bos birakiyoruz. */
        const kendisi = rel === 'DEVIR.md';
        dosyalar.push([rel, kendisi ? 'bu dosya' : '', Math.round(st.size / 1024) + ' KB',
          kendisi ? '' : ozet(fs.readFileSync(p)).slice(0, 8)]);
      }
    }
  })(ROOT, '');

  const satir = ([a, b, c, d]) =>
    `| \`${a}\` | ${b} | ${c} | ${d ? '`' + d + '`' : ''} |`;

  const metin = `# DEVİR — QANATONE build ${bilgi.damga}

> **Bu dosyayı ÜRETEÇ yazdı** (\`build.js\`, her derlemede). Elle
> düzenleme — bir sonraki derlemede üzerine yazılır. Dosya listesi
> gerçek diskten, damga gerçek kaynaktan, sayfa sayısı gerçek çıktıdan.
>
> Üretim tarihi: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC

## Yeni sohbete geçerken

1. Bu dosyayı ve \`qanatone-build${bilgi.damga}-YAYIN.zip\` paketini ver.
2. Paket **tam** — aşağıdaki dosya listesi neyin içinde olduğunu gösteriyor.
3. Mimari, kurallar ve kararlar hafızada (\`/areas/qanatone.md\`) duruyor;
   burada YALNIZ paketin o anki fiziksel durumu var.

## Paketin içi

| dosya | | boyut | özet |
|---|---|---|---|
${dosyalar.map(satir).join('\n')}

## Üretim durumu

| | |
|---|---|
| build damgası | **${bilgi.damga}** |
| üretilen sayfa | ${bilgi.sayfa} (${bilgi.tr} TR + ${bilgi.en} EN) |
| sitemap URL | ${bilgi.url} |
| denetim suite | ${bilgi.denetim} |
| son derleme | ${bilgi.sn} sn (basılan ${bilgi.basilan}, önbellekten ${bilgi.atlanan}) |
| dist boyutu | ${bilgi.dist} MB |

## Çalıştırma

\`\`\`
npm install
node build.js          # üretir + denetim suite'ini koşar
npm test               # yalnız denetim
TAM_DERLEME=1 node build.js   # önbelleği yok say
\`\`\`

Netlify: build \`npm install && node build.js\` · publish \`dist\` ·
ortam değişkenleri INDEXNOW_KEY, WA_TOKEN, WA_PHONE_ID, WA_TO.

## Bu pakette OLMAYAN, dışarıdan gelenler

- \`content.json\` — panelden indirilen içerik. Yoksa \`index.html\`
  içindeki varsayılanlar kullanılır.
- \`og.png\` — 1200×630 sosyal paylaşım görseli, **hâlâ eksik**.
- \`node_modules/\` — \`npm install\` kurar.
- \`.onbellek/\` — artımlı derleme önbelleği, Netlify eklentisi taşır.
`;
  yaz2('DEVIR.md', metin);
}
/* DEVİR kaynak klasörüne yazılıyor (dist'e değil): pakete girmesi gerek */
const yaz2 = (rel, icerik) => {
  fs.writeFileSync(path.join(ROOT, rel), icerik);
  console.log(`  yazildi  ${rel}  (${Math.round(icerik.length / 1024)} KB)  [kaynak klasoru]`);
};

/* ---------- sitemap · robots · rss ---------- */
function sitemap(urls) {
  /* Her kaydın iki dildeki karşılığı hesaplanıyor. Eskiden EN alternatifi
     `?lang=en` diye yazılıyordu; sorgu dizesi sunucuda dosya değiştirmediği
     için o adres TÜRKÇE HTML döndürüyordu — yani hreflang yanlış bilgi
     veriyordu. Artık iki dilin de kendi dosyası var.                    */
  urls = urls.map(u => {
    const cip = u.loc.replace(ORIGIN, '').replace(/^\/en(?=\/|$)/, '') || '/';
    return { ...u, tr: ORIGIN + cip, en: ORIGIN + '/en' + (cip === '/' ? '/' : cip) };
  });
  yaz('sitemap.xml',
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.d}</lastmod>\n` +
      `    <priority>${u.p}</priority>\n` +
      `    <xhtml:link rel="alternate" hreflang="tr" href="${u.tr}"/>\n` +
      `    <xhtml:link rel="alternate" hreflang="en" href="${u.en}"/>\n  </url>`).join('\n') +
    '\n</urlset>\n');
}

function robots() {
  yaz('robots.txt',
    '# QANATONE\n' +
    'User-agent: *\nAllow: /\n' +
    /* GECE ZINCIRI TUR 6 (2 Eyl 2026) — Content Signals (Cloudflare/IETF
       taslagi): arama evet, AI cevaplarinda kullanim EVET (GEO satan site
       bunu reddedemez), egitim HAYIR (Enes'in politika karari). Ayni satir
       HTTP basligi olarak _headers'ta da var. */
    'Content-Signal: search=yes, ai-input=yes, ai-train=no\n' +
    '# shell.html bir SAYFA degil, tarayicinin gezinebilmesi icin gereken\n' +
    '# bolum iskeleti. Basliksiz, tekrar iceren bir parca — indekslenirse\n' +
    '# ince/kopya sayfa olarak gorunur.\n' +
    'Disallow: /shell.html\n' +
    '# Yonetim paneli: arama sonuclarinda gorunmesin.\n' +
    'Disallow: /admin.html\n' +
    'Disallow: /404.html\n\n' +
    '# Yapay zeka tarayicilari acikca davet ediliyor — GEO stratejisinin parcasi.\n' +
    '# Bu botlar JavaScript CALISTIRMIYOR; sayfalari build.js statik bastigi\n' +
    '# icin icerigi ham HTML\'de bulabiliyorlar.\n' +
    ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
     'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'meta-externalagent']
      .map(b => `User-agent: ${b}\nAllow: /`).join('\n\n') +
    `\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
}

function rss(posts, tr) {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  yaz('bulten/rss.xml',
    '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n' +
    `  <title>QANATONE Bülten</title>\n  <link>${ORIGIN}/bulten</link>\n` +
    '  <description>Yapay zeka, arama ve talep yonetiminde isine dokunan gelismeler.</description>\n' +
    '  <language>tr</language>\n' +
    posts.map(p => '  <item>\n' +
      `    <title>${esc(tr(p.title))}</title>\n` +
      `    <link>${ORIGIN}/bulten/${p.slug}</link>\n` +
      `    <guid>${ORIGIN}/bulten/${p.slug}</guid>\n` +
      `    <pubDate>${new Date(p.date + 'T09:00:00Z').toUTCString()}</pubDate>\n` +
      `    <description>${esc(tr(p.lede))}</description>\n  </item>`).join('\n') +
    '\n</channel></rss>\n');
}

/* ---------- IndexNow ----------
   Bing, Yandex, Naver, Seznam ve Yep bu protokolü okuyor; Google KATILMIYOR.
   Google tarafı sitemap + ic linkleme + Search Console ile ilerliyor —
   anlik indeksleme yolu Google'da kimsede yok, bu bir mimari eksigi degil.
   ChatGPT buyuk olcude Bing indeksini kullandigi icin buradan GEO'ya da
   dokunuyoruz.                                                          */
async function indexNow(urls) {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    console.log('\n  IndexNow: INDEXNOW_KEY tanimli degil — atlandi.');
    return;
  }
  yaz(`${key}.txt`, key + '\n');           // doğrulama dosyası
  if (process.env.CONTEXT && process.env.CONTEXT !== 'production') {
    console.log('  IndexNow: production disi derleme — ping atilmadi.');
    return;
  }
  try {
    const r = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        host: new URL(ORIGIN).host, key,
        keyLocation: `${ORIGIN}/${key}.txt`,
        urlList: urls.map(u => u.loc)
      })
    });
    console.log(`  IndexNow: ${urls.length} adres bildirildi — HTTP ${r.status}`);
  } catch (e) {
    console.log('  IndexNow: bildirilemedi —', e && e.message);
  }
}

/* ---------- ana akış ---------- */
function kopyala(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(src)) kopyala(path.join(src, f), path.join(dst, f));
  } else { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); }
}

(async function main() {
  console.log('QANATONE statik uretec\n');
  const t0 = Date.now();

  /* ── 2a · ORTAK VARLIK AYRIŞTIRMA: ana betik dışarı ──────────────────
     Satır içi betik tarayıcının derleme önbelleğine giremez (V8 belgeli
     davranış): 58 sayfanın her biri aynı ~490 KB'lık ana betiği her
     gezinmede sıfırdan indirip ayrıştırıp DERLİYORDU. Dış + hash'li
     dosyada bir kez derlenir, sonraki sayfalarda önbellekten gelir
     (_headers: /varlik/* immutable — varlik/ ayrı klasör BİLEREK:
     js/*'a immutable bassak hash'siz gsap/lenis de kapsanır ve
     güncellenemez olurdu).
     KAYNAK DEĞİŞMEZ — tek dosya kuralı kaynak hakkındadır; ayrıştırma
     yalnız ÇIKTIDA. Ön-render de değişmez: jsdom kaynağı olduğu gibi
     açar (betik ESKİ yerinde satır içi koşar), dış referans yalnız diske
     yazılan HTML'e girer — içerik ham HTML'de kalır, GEO/SEO etkilenmez.
     Kesim çapası deterministik: src'siz + gövdesi 100 KB üzeri satır içi
     betik ANA BETİKTİR; tam BİR tane bulunmazsa derleme burada — dist'e
     dokunmadan — durur. Kaynağa işaret yorumu eklenmez, regex
     kırılganlığı yok.
     İçerik LF'e normalize: git blob LF, Windows çalışma kopyası CRLF —
     hash iki ortamda da AYNI dosya adını versin. Referans defer + belge
     sırasında eski yerinde: gsap → ScrollTrigger → lenis → app (defer
     koşum sırası belge sırasıdır); ana betik zaten içerikten sonra
     duruyordu, defer koşumu asla İLERİ almaz.                          */
  const ANA_ESIK = 100 * 1024;
  const anaAdaylar = html => [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .filter(m => Buffer.byteLength(m[1]) > ANA_ESIK);
  const anaAday = anaAdaylar(fs.readFileSync(SRC, 'utf8'));
  if (anaAday.length !== 1)
    throw new Error(`ana betik kesimi: 100 KB üzeri satır içi betik tam 1 olmalı, ` +
      `${anaAday.length} bulundu — çapa belirsiz, derleme DURDU (dist'e dokunulmadı)`);
  const anaBetik = anaAday[0][1].replace(/\r\n/g, '\n');
  const anaHash = crypto.createHash('sha256').update(anaBetik).digest('hex').slice(0, 10);
  const anaRef = `<script src="varlik/app.${anaHash}.js" defer></script>`;
  /* sayfa HTML'inde ana betiği dış referansla değiştir. Bulunamıyorsa ya
     da gövde kaynaktan sapmışsa (serialize farkı vb.) SESSİZ GEÇME — dur:
     sessiz atlanan sayfa ayrıştırılmamış 836 KB olarak yayına giderdi. */
  const anaAyristir = (html, ad) => {
    const a = anaAdaylar(html);
    if (a.length !== 1)
      throw new Error(`${ad}: çıktıda 100 KB üzeri satır içi betik ${a.length} adet (beklenen 1) — ayrıştırma güvensiz`);
    if (a[0][1].replace(/\r\n/g, '\n') !== anaBetik)
      throw new Error(`${ad}: çıktıdaki ana betik kaynaktakiyle denk değil — ayrıştırma güvensiz`);
    return html.slice(0, a[0].index) + anaRef + html.slice(a[0].index + a[0][0].length);
  };

  /* ── 2b · ORTAK VARLIK AYRIŞTIRMA: CSS dışarı ────────────────────────
     2a'nın stil eşi: 268 KB satır içi CSS her sayfada boyama engeliydi ve
     tarayıcı önbelleğine giremiyordu. Tam küme varlik/app.<hash>.css'e
     çıkar (_headers: /varlik/* immutable), sayfada yalnız İLK EKRAN
     kritik kümesi satır içi kalır; dış dosya preload+onload ile boyamayı
     ENGELLEMEDEN gelir, noscript yedeği render-blocking. KAYNAK DEĞİŞMEZ;
     ön-render kaynağı olduğu gibi açar (stil eski yerinde satır içi),
     ayrıştırma yalnız diske yazılan HTML'de. Kesim çapası deterministik:
     100 KB üzeri <style> tam BİR tane.
     Kritik küme elle seçilmez, ÖLÇÜLÜR: ön-render DOM'unda ilk ekran
     ağaçları (boot, menü, perde, hero, sabit katmanlar, sayfa başlığı)
     gezilip sınıf/kimlik kümesi çıkarılır; kural listesindeki HERHANGİ
     seçici kümeye dokunuyorsa ya da sınıfsız taban kuralıysa girer.
     @font-face/@property bütünüyle; MOBİL SAHNE BÜTÇESİ bloğu imzasından
     tanınıp BÜTÜN olarak; kritik gövdelerin andığı @keyframes'ler sona.
     Tavan 40 KB — aşarsa derleme dist'e dokunmadan durur (bekçi: 125). */
  const STIL_ESIK = 100 * 1024, KRITIK_TAVAN = 40 * 1024;
  const stilAdaylar = html => [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .filter(m => Buffer.byteLength(m[1]) > STIL_ESIK);
  const stilAday = stilAdaylar(fs.readFileSync(SRC, 'utf8'));
  if (stilAday.length !== 1)
    throw new Error(`stil kesimi: 100 KB üzeri <style> tam 1 olmalı, ` +
      `${stilAday.length} bulundu — çapa belirsiz, derleme DURDU (dist'e dokunulmadı)`);
  const tamCss = stilAday[0][1].replace(/\r\n/g, '\n');
  const cssHash = crypto.createHash('sha256').update(tamCss).digest('hex').slice(0, 10);
  const cssRef = `<link rel="preload" as="style" href="varlik/app.${cssHash}.css" ` +
    `onload="this.onload=null;this.rel='stylesheet'">` +
    `<noscript><link rel="stylesheet" href="varlik/app.${cssHash}.css"></noscript>`;
  function kritikTokenTopla(doc) {
    const S = new Set();
    /* #bit* bilerek yok: ajan imleci JS gelene kadar opacity:0 — ilk
       karenin parçası değil, kritiğe girmesi tavanı aşırıyordu. */
    const kokler = ['#boot', 'nav', '#mmenu', '.topfade', '#hero', '#stars', '#noise',
                    '#tubes', '.shead'];
    for (const kok of kokler) for (const el of doc.querySelectorAll(kok)) {
      for (const e of [el, ...el.querySelectorAll('*')]) {
        if (e.id) S.add('#' + e.id);
        if (e.classList) for (const c of e.classList) S.add('.' + c);
      }
    }
    return S;
  }
  function kritikCssUret(css, tok) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const kf = {};                              /* @keyframes adı → tam metin */
    const govdeler = [];                        /* animasyon adları buradan */
    const uygun = sel => {
      const s = sel.trim();
      if (!s) return false;
      if (!/[.#\[]/.test(s)) return true;       /* taban: yalnız etiket/sözde */
      const par = s.match(/[.#][A-Za-z0-9_-]+/g) || [];
      return par.length > 0 && par.some(p => tok.has(p));
    };
    const blokSonu = (txt, ac) => {             /* parantez SAYARAK — [^}]* tuzağı değil */
      let d = 1, k = ac + 1;
      for (; k < txt.length && d > 0; k++) { if (txt[k] === '{') d++; else if (txt[k] === '}') d--; }
      return k;
    };
    function isle(txt) {
      let out = '', i = 0;
      while (i < txt.length) {
        const ac = txt.indexOf('{', i);
        if (ac === -1) break;
        const bas = txt.slice(i, ac).trim();
        if (/^@(media|supports)/.test(bas)) {
          const k = blokSonu(txt, ac), ic = txt.slice(ac + 1, k - 1);
          if (ic.indexOf('backdrop-filter:none!important') > -1) {
            out += bas + '{' + ic + '}'; govdeler.push(ic);   /* mobil sahne bütçesi: bütün */
          } else {
            const alt = isle(ic);
            if (alt) out += bas + '{' + alt + '}';
          }
          i = k;
        } else if (/^@keyframes/.test(bas)) {
          const k = blokSonu(txt, ac);
          kf[bas.replace(/^@keyframes\s+/, '').trim()] = txt.slice(i, k);
          i = k;
        } else if (/^@(font-face|property)/.test(bas)) {
          const k = blokSonu(txt, ac);
          out += txt.slice(i, k); i = k;
        } else if (bas.startsWith('@')) {
          const kap = txt.indexOf(';', i); i = (kap === -1 ? txt.length : kap + 1);
        } else {
          const kap = txt.indexOf('}', ac);
          if (kap === -1) break;
          const kalan = bas.split(',').filter(uygun);
          if (kalan.length) {
            const gov = txt.slice(ac + 1, kap);
            out += kalan.map(s => s.trim()).join(',') + '{' + gov + '}';
            govdeler.push(gov);
          }
          i = kap + 1;
        }
      }
      return out;
    }
    let kritik = isle(css);
    const adlar = new Set();
    for (const g of govdeler)
      for (const m of g.matchAll(/animation(?:-name)?\s*:([^;}]+)/g))
        for (const parca of m[1].split(',')) {
          const ad = parca.trim().split(/\s+/).find(x => kf[x]);
          if (ad) adlar.add(ad);
        }
    for (const ad of adlar) kritik += kf[ad];
    /* satır sonu + girinti sıkıştırması: bildirimler ';' ile bittiğinden
       satırları birleştirmek güvenli; satır İÇİ boşluklara dokunulmaz */
    return kritik.replace(/\n\s*/g, '');
  }
  /* ön-render sırasında prefetchKur'un yarattığı link'ler DOM'a girer ve
     serileşirdi — statik sayfaya onlarca prefetch basmak her ziyarette o
     kadar sayfa indirtir. Çalışma zamanı zaten kendisi kurar; temizle. */
  const prefetchTemizle = html => html.replace(/<link rel="prefetch"[^>]*>/g, '');

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  let kn = 0;
  for (const k of KOPYA) {
    const src = path.join(ROOT, k);
    if (fs.existsSync(src)) { kopyala(src, path.join(OUT, k)); kn++; }
  }
  console.log(`  ${kn} varlik dist/ altina kopyalandi`);
  yaz(`varlik/app.${anaHash}.js`, anaBetik);
  yaz(`varlik/app.${cssHash}.css`, tamCss);
  console.log('');

  /* 1) slug listelerini siteden oku */
  const { dom: kesif } = ortam(fs.readFileSync(SRC, 'utf8'), ORIGIN + '/');
  await dur(500);
  const { svc, prj, pst } = rotalar(kesif.window, kesif.window.document);
  const C0 = kesif.window.__qanatExport();

  /* 2b: kritik küme ön-render DOM'undan ölçülür (yukarıdaki NEDEN'e bak) */
  const kritikCss = kritikCssUret(tamCss, kritikTokenTopla(kesif.window.document));
  const kritikBoy = Buffer.byteLength(kritikCss);
  if (kritikBoy > KRITIK_TAVAN)
    throw new Error(`kritik CSS ${kritikBoy} B > ${KRITIK_TAVAN} B tavanı — ` +
      `kesim daraltılmadan derleme sürmez (dist'e dokunulmadı)`);
  console.log(`  kritik CSS ${Math.round(kritikBoy / 1024)} KB satır içi · ` +
    `tam küme varlik/app.${cssHash}.css (${Math.round(Buffer.byteLength(tamCss) / 1024)} KB)`);
  const stilAyristir = (html, ad) => {
    const a = stilAdaylar(html);
    if (a.length !== 1)
      throw new Error(`${ad}: çıktıda 100 KB üzeri <style> ${a.length} adet (beklenen 1) — ayrıştırma güvensiz`);
    if (a[0][1].replace(/\r\n/g, '\n') !== tamCss)
      throw new Error(`${ad}: çıktıdaki stil kaynaktakiyle denk değil — ayrıştırma güvensiz`);
    return html.slice(0, a[0].index) + '<style>' + kritikCss + '</style>' + cssRef
         + html.slice(a[0].index + a[0][0].length);
  };

  /* content.json ZİNCİRİ — panel hiç yayınlamamışken bile geçerli bir
     varsayılan bas. 2026-08 canlıda ölçüldü: /content.json 404 dönüyordu
     (gövdesi Netlify'ın 257 KB'lık HTML 404 sayfası), çünkü dosya YALNIZ
     panelden gelirse kopyalanıyordu ve panel PANEL_PAROLA_HASH tanımsız
     olduğu için hiç yayın yapmamıştı. Sonuç: applyContent() panel
     verisiyle hiç koşmadı, panelden yönetilen her ayar üretimde ölüydü.
     ÖNCELİK KORUNUYOR: dosya kökte varsa (panel yayınlamış, commit gelmiş)
     KOPYA turu onu zaten dist'e koydu, buraya girilmez — panelin ürünü
     varsayılanı EZER, tersi değil.
     Varsayılan elle yazılmıyor: sitenin kendi sözlüğü (__qanatExport)
     basılıyor. İki üreteç doğurmamak için tek kaynak ilkesi burada da
     geçerli — DATA değişince bu dosya kendiliğinden güncel kalır.
     KAYNAK KLASÖRÜNE YAZILMIYOR: content.json panelin ürünüdür, pakette
     durmaz; bu yalnız yayın çıktısındaki kopyadır.                    */
  if (!fs.existsSync(path.join(OUT, 'content.json'))) {
    yaz('content.json', JSON.stringify(C0, null, 2));
    console.log('  (panel henuz yayinlamamis — varsayilan icerik basildi)');
  }

  kesif.window.close();
  console.log(`  ${svc.length} hizmet detayi · ${prj.length} proje · ${pst.length} yazi\n`);

  /* 2) rota tanimlari — gezinme sitenin kendi baglantilariyla */
  const liste = [
    { rel: 'index.html',      url: `${ORIGIN}/`,           p: '1.0', git: async () => {} },
    { rel: 'hizmetler/index.html', url: `${ORIGIN}/hizmetler`, p: '0.8',
      git: (w, d) => gez(w, d, 'a[data-r="hizmet"]') },
    { rel: 'projeler/index.html',  url: `${ORIGIN}/projeler`,  p: '0.8',
      git: (w, d) => gez(w, d, 'a[data-r="projeler"]') },
    { rel: 'otomasyon/index.html', url: `${ORIGIN}/otomasyon`, p: '0.8',
      git: (w, d) => gez(w, d, 'a[data-r="ajan"]') },
    { rel: 'surec/index.html',     url: `${ORIGIN}/surec`,     p: '0.8',
      git: (w, d) => gez(w, d, 'a[data-r="surec"]') },
    { rel: 'sss/index.html',       url: `${ORIGIN}/sss`,       p: '0.8',
      git: (w, d) => gez(w, d, 'a[data-r="sss"]') },
    { rel: 'bulten/index.html',    url: `${ORIGIN}/bulten`,    p: '0.8',
      git: (w, d) => gez(w, d, 'a[data-r="bulten"]') }
  ];
  svc.forEach(s => liste.push({
    rel: `hizmetler/${s}/index.html`, url: `${ORIGIN}/hizmetler/${s}`, p: '0.7',
    git: async (w, d) => { await gez(w, d, 'a[data-r="hizmet"]'); await gez(w, d, `[data-sd="${s}"]`); }
  }));
  prj.forEach(s => liste.push({
    rel: `projeler/${s}/index.html`, url: `${ORIGIN}/projeler/${s}`, p: '0.6',
    git: async (w, d) => { await gez(w, d, 'a[data-r="projeler"]'); await gez(w, d, `[data-pd="${s}"]`); }
  }));
  pst.forEach(s => liste.push({
    rel: `bulten/${s}/index.html`, url: `${ORIGIN}/bulten/${s}`, p: '0.7',
    git: async (w, d) => { await gez(w, d, 'a[data-r="bulten"]'); await gez(w, d, `[data-bp="${s}"]`); }
  }));

  /* 3) bas — once TR, sonra EN.
     EN cikti /en/... altina yaziliyor; sitenin fromLoc'u bu oneki taniyor. */
  const tumRotalar = [];
  for (const r of liste) tumRotalar.push({ ...r, dil: 'tr' });
  for (const r of liste) tumRotalar.push({
    ...r, dil: 'en',
    rel: 'en/' + r.rel,
    url: r.url.replace(ORIGIN, ORIGIN + '/en').replace(/\/en\/$/, '/en/')
  });

  const urls = [];
  let hataToplam = 0, enAz = Infinity, enAzRota = '', basilan = 0, atlanan = 0;

  const kaynakOzet = ozet(fs.readFileSync(SRC, 'utf8'));
  /* Uretecin kendisi de imzaya girer. Yoksa: build.js'in sablonu degisir,
     imza yalnizca index.html'e baktigi icin ayni kalir, 58 sayfa ESKI
     sablonuyla onbellekten kopyalanip yayina gider — ve derleme "temiz"
     gorunur. Bedeli: build.js'e dokunan her degisiklik tam derleme
     tetikler (~150 sn). Sessiz bayat ciktiya gore ucuz. */
  const uretecOzet = ozet(fs.readFileSync(__filename, 'utf8'));
  let eski = {};
  if (!TAM && fs.existsSync(MANIFEST)) {
    try { eski = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (e) { eski = {}; }
  }
  const yeni = {};

  for (const r of tumRotalar) {
    const imza = ozet([kaynakOzet, uretecOzet, r.rel, r.dil, rotaVerisi(r.rel, C0)]);
    yeni[r.rel] = imza;
    const onbellekli = path.join(CACHE, 'dist', r.rel);
    if (!TAM && eski[r.rel] === imza && fs.existsSync(onbellekli)) {
      kopyala(onbellekli, path.join(OUT, r.rel));
      atlanan++;
      const p0 = pst.find(x => r.rel.includes(x));
      urls.push({ loc: r.url, d: p0 ? (C0.posts.find(z => z.slug === p0) || {}).date || bugun() : bugun(),
                  p: r.p, dil: r.dil });
      continue;
    }
    const s = await sayfa(r, r.dil);
    yaz(r.rel, stilAyristir(prefetchTemizle(anaAyristir(s.html, r.rel)), r.rel));   /* 2a betik + 2b stil dışarı */
    basilan++;
    console.log(`           bolum:[${s.acik.join(',')}] · ham metin ${s.metin} karakter` +
                (s.hata.length ? `  !! ${s.hata.length} hata` : ''));
    hataToplam += s.hata.length;
    if (s.metin < enAz) { enAz = s.metin; enAzRota = r.url; }
    const p = pst.find(x => r.rel.includes(x));
    const tarih = p ? (C0.posts.find(z => z.slug === p) || {}).date || bugun() : bugun();
    urls.push({ loc: r.url, d: tarih, p: r.p, dil: r.dil });
  }

  /* 4) kabuk — statik sayfalardan çıkarılan bölümler buradan geri geliyor */
  {
    const ham = fs.readFileSync(SRC, 'utf8');
    const m = ham.match(/<main[^>]*>([\s\S]*?)<\/main>/);
    if (!m) throw new Error('kaynakta <main> bulunamadi');
    yaz('shell.html', m[1]);
  }

  /* 5) yönlendirme kuralları — üreteç yazıyor, elle tutulmuyor.
     ÖNCEKİ HALİ: tek satır `/*  /index.html  200`. Bu, OLMAYAN bir adresi de
     (/hizmetler/olmayan-sey) ana sayfayla ve HTTP 200 ile karşılıyordu.
     Arama motoru buna "yumuşak 404" diyor: bulunamayan sayfayı geçerli
     sanıp indeksliyor. Artık bilinen rotalar kendi statik dosyasına gidiyor,
     tanınmayan her adres gerçek 404 alıyor.                              */
  {
    /* HATA: burada `liste` (yalniz TR) kullaniliyordu. EN rotalari kurala
       girmedigi icin hepsi son satirdaki /* -> 404 kuralina dusuyordu —
       yani 29 Ingilizce sayfa yayinda 404 verecekti. tumRotalar sart.  */
    const bilinen = tumRotalar.map(r => {
      const yol = '/' + r.rel.replace(/\/?index\.html$/, '');
      return `${yol === '/' ? '/' : yol}  /${r.rel}  200`;
    });
    yaz('_redirects',
      '# Uretec yaziyor (build.js) — elle duzenleme.\n' +
      '# Bilinen rotalar kendi on-render edilmis dosyasina gider.\n' +
      bilinen.join('\n') +
      '\n\n# Panel kapisi: /admin.html artik statik dosya DEGIL, Basic Auth\n' +
      '# ardindaki fonksiyondan geliyor. 200! zorlamali — ileride dist e\n' +
      '# bir admin.html kopyasi sizarsa statik dosya kapiyi gecersiz\n' +
      '# kilardi; force bunu imkansiz yapar.\n' +
      '/admin.html  /.netlify/functions/panel  200!\n' +
      '\n# Taninmayan adres: gercek 404. Yumusak 404 uretmemek icin sart.\n' +
      '/*  /404.html  404\n');

    /* 404 sayfası: ana sayfanın kabuğu + kısa mesaj, noindex */
    const ham404 = fs.readFileSync(SRC, 'utf8')
      .replace(/<title>[\s\S]*?<\/title>/, '<title>Sayfa bulunamadi — QANATONE</title>')
      .replace('</head>', '<meta name="robots" content="noindex">\n</head>');
    /* 2a: 404 da ham kaynağın kopyası — ana betik burada da dışarı,
       yoksa tek başına 836 KB'lık ayrıştırılmamış bir sayfa kalırdı. */
    yaz('404.html', stilAyristir(prefetchTemizle(anaAyristir(ham404, '404.html')), '404.html'));
  }

  /* 6) yan dosyalar */
  console.log('');
  sitemap(urls);
  robots();
  const tr = v => (v && typeof v === 'object') ? (v.tr || v.en || '') : (v || '');
  rss(C0.posts || [], tr);
  await indexNow(urls);

  /* Önbelleği tazele: yalnız derleme hatasızsa yaz, yoksa bir sonraki
     derleme bozuk çıktıyı sağlam sanıp kopyalar.                       */
  if (!hataToplam) {
    fs.rmSync(CACHE, { recursive: true, force: true });
    fs.mkdirSync(path.join(CACHE, 'dist'), { recursive: true });
    for (const r of tumRotalar) {
      const kaynak = path.join(OUT, r.rel);
      if (fs.existsSync(kaynak)) kopyala(kaynak, path.join(CACHE, 'dist', r.rel));
    }
    fs.writeFileSync(MANIFEST, JSON.stringify(yeni, null, 0));
  }

  /* ── DENETİM: yayından ÖNCE ────────────────────────────────────────
     Her turda ayrı betik yazıp atmak yerine kalıcı suite koşuyor.
     Kural kalırsa derleme HATA ile biter, yani bozuk çıktı yayına gitmez.
     DENETIM_ATLA=1 ile geçilebilir — ama o zaman neyi atladığını bil.  */
  if (process.env.DENETIM_ATLA !== '1') {
    const { execFileSync } = require('child_process');
    console.log('\n  denetim suite kosuyor...');
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'test', 'denetim.js')],
        { stdio: 'inherit', cwd: ROOT });
    } catch (e) {
      console.error('\n  !! DENETIM KALDI — cikti yayina uygun degil.');
      process.exit(1);
    }
  }

  /* devir notu — denetimden SONRA, çünkü sonucunu da yazıyor */
  {
    const kaynak = fs.readFileSync(SRC, 'utf8');
    const dm = (kaynak.match(/__QBUILD='([^']+)'/) || [, '?'])[1];
    let distB = 0;
    (function say(d) { for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) say(p); else distB += fs.statSync(p).size; } })(OUT);
    devir({ damga: dm, sayfa: tumRotalar.length,
      tr: tumRotalar.filter(r => r.dil === 'tr').length,
      en: tumRotalar.filter(r => r.dil === 'en').length,
      url: urls.length, denetim: process.env.DENETIM_ATLA === '1' ? 'ATLANDI' : 'temiz',
      sn: Math.round((Date.now() - t0) / 1000), basilan, atlanan,
      dist: (distB / 1048576).toFixed(1) });
  }

  const sn = Math.round((Date.now() - t0) / 1000);
  console.log(`\n  ${tumRotalar.length} sayfa · ${urls.length} URL · ${sn} sn`);
  console.log(`  BASILAN ${basilan} · ONBELLEKTEN ${atlanan}` +
              (atlanan ? `  (~${Math.round(atlanan * 1.8)} sn kazanildi)` : ''));
  if (basilan) console.log(`  en az ham metin: ${enAz} karakter (${enAzRota})`);
  if (hataToplam) { console.error(`  !! toplam ${hataToplam} runtime hatasi`); process.exit(1); }
  /* Esik: en kisa gercek sayfa (EN proje detayi) 398 karakter. 250'nin
     altina dusen bir sayfa gercekten bos basilmis demektir.            */
  if (basilan && enAz < 250) { console.error('  !! bir sayfa neredeyse bos basildi'); process.exit(1); }
})();
