#!/usr/bin/env node
'use strict';
/* test/yayinla.test.js — netlify/functions/yayinla.js denetimi
   node test/yayinla.test.js
   Ağa hiç çıkmaz: GitHub adaptörü sahte, çağrı sayısı ve argümanları
   izleniyor. crypto.scryptSync gerçek — parola doğrulama gerçek yol. */

const crypto = require('crypto');
const { handlerOlustur, dogrula, DOSYA_YOLU } = require('../netlify/functions/yayinla.js');

let gecti = 0, kaldi = 0;
function ol(ad, kosul, ayrinti) {
  const isaret = kosul ? 'ok ' : '!! ';
  console.log('  ' + isaret + ad.padEnd(52) + ' ' + (ayrinti || ''));
  if (kosul) gecti++; else kaldi++;
}

function hashUret(parola) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(parola, salt, 64).toString('hex');
  return salt + ':' + hash;
}

const DOGRU_PAROLA = 'çok-gizli-panel-parolası-2026';
const HASH = hashUret(DOGRU_PAROLA);

/* console.log/error'ı yakalayıp geri veren yardımcı — parola/token
   loglara sızıyor mu diye satır satır bakmak için. */
function konsolYakala(fn) {
  const satirlar = [];
  const eskiLog = console.log, eskiErr = console.error;
  console.log = (...a) => satirlar.push(a.join(' '));
  console.error = (...a) => satirlar.push(a.join(' '));
  return fn().finally(() => { console.log = eskiLog; console.error = eskiErr; })
    .then(sonuc => ({ sonuc, satirlar }));
}

function sahteAdaptorKur() {
  const cagrilar = [];
  const adaptor = async (arg) => { cagrilar.push(arg); return { ok: true }; };
  return { adaptor, cagrilar };
}

const olay = (govde, method) => ({
  httpMethod: method || 'POST',
  body: govde === undefined ? undefined : JSON.stringify(govde)
});

(async function main() {
  console.log('\nyayinla.js — parola korumalı yayın fonksiyonu denetimi\n');

  /* ---- dogrula(): izole parola karşılaştırması ---- */
  ol('dogrula: doğru parola kabul edilir', dogrula(DOGRU_PAROLA, HASH) === true);
  ol('dogrula: yanlış parola reddedilir', dogrula('yanlis-parola', HASH) === false);
  ol('dogrula: boş parola reddedilir', dogrula('', HASH) === false);
  ol('dogrula: eksik/bozuk hash reddedilir', dogrula(DOGRU_PAROLA, 'ayracsiz-hash') === false);
  ol('dogrula: hash yokken reddedilir', dogrula(DOGRU_PAROLA, undefined) === false);

  /* ---- 1) yanlış parola → 401, commit HİÇ çağrılmadı ---- */
  {
    process.env.PANEL_PAROLA_HASH = HASH;
    process.env.GITHUB_TOKEN = 'sahte-test-jetonu-aga-cikmiyor-gercek-degil-111';
    const { adaptor, cagrilar } = sahteAdaptorKur();
    const handler = handlerOlustur(adaptor);
    const basla = Date.now();
    const { sonuc: r, satirlar } = await konsolYakala(() =>
      handler(olay({ parola: 'yanlis-sifre', content: { a: 1 } })));
    const gecenMs = Date.now() - basla;
    const govde = JSON.parse(r.body);
    ol('yanlış parola: 401 dönüyor', r.statusCode === 401, String(r.statusCode));
    ol('yanlış parola: hangi parça yanlış söylenmiyor',
       govde.reason === 'giris reddedildi' && !/parola|hash/i.test(govde.reason), govde.reason);
    ol('yanlış parola: commit adaptörü HİÇ çağrılmadı', cagrilar.length === 0, String(cagrilar.length));
    ol('yanlış parola: ~300ms sabit gecikme var', gecenMs >= 280, gecenMs + 'ms');
    ol('yanlış parola: log satırlarında parola/hash geçmiyor',
       satirlar.every(s => !s.includes('yanlis-sifre') && !s.includes(HASH)), '');
  }

  /* ---- 2) doğru parola → adaptöre TEK commit çağrısı, doğru repo/yol/içerik ---- */
  {
    process.env.PANEL_PAROLA_HASH = HASH;
    process.env.GITHUB_TOKEN = 'sahte-test-jetonu-aga-cikmiyor-gercek-degil-111';
    const { adaptor, cagrilar } = sahteAdaptorKur();
    const handler = handlerOlustur(adaptor);
    const icerik = { settings: { whatsapp: '905000000000' }, projects: [] };
    const { sonuc: r, satirlar } = await konsolYakala(() =>
      handler(olay({ parola: DOGRU_PAROLA, content: icerik })));
    const govde = JSON.parse(r.body);
    ol('doğru parola: 200 ok dönüyor', r.statusCode === 200 && govde.ok === true, String(r.statusCode));
    ol('doğru parola: adaptöre tam bir kez çağrı yapıldı', cagrilar.length === 1, String(cagrilar.length));
    if (cagrilar.length === 1) {
      const c = cagrilar[0];
      ol('commit: repo doğru', c.repo === 'enesbsgluu/QANATONE', c.repo);
      /* KADEME 2: adaptör artık DOSYA LİSTESİ alıyor (çok dosya, tek
         commit). Yalnız content.json değiştiyse liste tek elemanlı. */
      ol('commit: tek dosya (yalnız content.json değişti)', c.dosyalar.length === 1, String(c.dosyalar.length));
      ol('commit: yol DOSYA_YOLU ile eşleşiyor (tek doğruluk kaynağı)', c.dosyalar[0].yol === DOSYA_YOLU, c.dosyalar[0].yol);
      ol('commit: içerik gövdedeki content.json ile eşleşiyor',
         JSON.parse(c.dosyalar[0].icerik).settings.whatsapp === '905000000000', c.dosyalar[0].icerik.slice(0, 40));
      ol('commit: token adaptöre iletiliyor (env\'den)', c.token === process.env.GITHUB_TOKEN, '');
    }
    ol('doğru parola: log satırlarında parola/token geçmiyor',
       satirlar.every(s => !s.includes(DOGRU_PAROLA) && !s.includes(process.env.GITHUB_TOKEN)), '');
  }

  /* ---- 3) token ve parola hiçbir yanıt gövdesinde geçmiyor ---- */
  {
    process.env.PANEL_PAROLA_HASH = HASH;
    process.env.GITHUB_TOKEN = 'sahte-test-jetonu-2-aga-cikmiyor-gercek-degil-222';
    const { adaptor } = sahteAdaptorKur();
    const handler = handlerOlustur(adaptor);
    const r1 = await handler(olay({ parola: 'baska-yanlis', content: {} }));
    const r2 = await handler(olay({ parola: DOGRU_PAROLA, content: { x: 1 } }));
    const gövdeMetni = r1.body + r2.body;
    ol('yanıt gövdelerinde parola geçmiyor', !gövdeMetni.includes(DOGRU_PAROLA) && !gövdeMetni.includes('baska-yanlis'), '');
    ol('yanıt gövdelerinde GITHUB_TOKEN geçmiyor', !gövdeMetni.includes(process.env.GITHUB_TOKEN), '');
  }

  /* ---- 4) commit adaptörü hata atarsa token/parola sızmadan 502 ---- */
  {
    process.env.PANEL_PAROLA_HASH = HASH;
    process.env.GITHUB_TOKEN = 'sahte-test-jetonu-3-aga-cikmiyor-gercek-degil-333';
    const patlayanAdaptor = async () => { throw new Error('github yazma basarisiz: 403 token=' + process.env.GITHUB_TOKEN); };
    const handler = handlerOlustur(patlayanAdaptor);
    const { sonuc: r, satirlar } = await konsolYakala(() =>
      handler(olay({ parola: DOGRU_PAROLA, content: { x: 1 } })));
    ol('adaptör hatasında 502 dönüyor', r.statusCode === 502, String(r.statusCode));
    ol('adaptör hatasında yanıt gövdesinde token yok', !r.body.includes(process.env.GITHUB_TOKEN), '');
    ol('adaptör hatasında log satırlarında token yok',
       satirlar.every(s => !s.includes(process.env.GITHUB_TOKEN)), '');
  }

  /* ---- 5) PANEL_PAROLA_HASH tanımsızsa fonksiyon KAPALI (503), açık değil ---- */
  {
    delete process.env.PANEL_PAROLA_HASH;
    process.env.GITHUB_TOKEN = 'sahte-test-jetonu-4-aga-cikmiyor-gercek-degil-444';
    const { adaptor, cagrilar } = sahteAdaptorKur();
    const handler = handlerOlustur(adaptor);
    const r = await handler(olay({ parola: DOGRU_PAROLA, content: { x: 1 } }));
    ol('PANEL_PAROLA_HASH yokken 503 (kapalı)', r.statusCode === 503, String(r.statusCode));
    ol('PANEL_PAROLA_HASH yokken commit çağrılmadı', cagrilar.length === 0, String(cagrilar.length));
    process.env.PANEL_PAROLA_HASH = HASH; // sonraki bloklar için geri koy
  }

  /* ---- 6) yalnız POST kabul edilir ---- */
  {
    const { adaptor, cagrilar } = sahteAdaptorKur();
    const handler = handlerOlustur(adaptor);
    const r = await handler(olay({ parola: DOGRU_PAROLA, content: {} }, 'GET'));
    ol('GET isteği 405 ile reddediliyor', r.statusCode === 405, String(r.statusCode));
    ol('GET isteğinde commit çağrılmadı', cagrilar.length === 0, String(cagrilar.length));
  }

  /* ---- 7) doğru parola ama içerik eksik ---- */
  {
    const { adaptor, cagrilar } = sahteAdaptorKur();
    const handler = handlerOlustur(adaptor);
    const r = await handler(olay({ parola: DOGRU_PAROLA }));
    ol('içerik eksikken 400 dönüyor', r.statusCode === 400, String(r.statusCode));
    ol('içerik eksikken commit çağrılmadı', cagrilar.length === 0, String(cagrilar.length));
  }

  /* ---- 8) KADEME 2: değişen kayıt dosyaları tek commit'te ---- */
  {
    process.env.PANEL_PAROLA_HASH = HASH;
    process.env.GITHUB_TOKEN = 'sahte-test-jetonu-3-aga-cikmiyor-gercek-degil-333';
    const { adaptor, cagrilar } = sahteAdaptorKur();
    const handler = handlerOlustur(adaptor);
    const r = await handler(olay({
      parola: DOGRU_PAROLA,
      content: { settings: {} },
      kayitlar: [{ klasor: 'icerik/haber', slug: 'yeni-yazi', kayit: { slug: 'yeni-yazi', date: '2026-09-09',
        title: { tr: 'Yeni yazı denemesi', en: 'New post test' }, lede: { tr: 'Giriş', en: 'Lede' } } }],
      silinen: [{ klasor: 'icerik/haber', slug: 'eski-yazi' }]
    }));
    ol('kayıt + silme: 200', r.statusCode === 200, String(r.statusCode));
    ol('kayıt + silme: TEK commit çağrısı', cagrilar.length === 1, String(cagrilar.length));
    const d = cagrilar.length === 1 ? cagrilar[0].dosyalar : [];
    ol('kayıt + silme: üç dosya (content + 1 yazı + 1 silme)', d.length === 3, String(d.length));
    const yeniYazi = d.find(x => /yeni-yazi\.json$/.test(x.yol));
    ol('kayıt yolu temel dizinden türüyor',
       !!yeniYazi && yeniYazi.yol === 'qanatone/icerik/haber/yeni-yazi.json', yeniYazi && yeniYazi.yol);
    const silme = d.find(x => /eski-yazi\.json$/.test(x.yol));
    ol('silme, içerik null ile bildiriliyor', !!silme && silme.icerik === null, '');
  }

  /* ---- 9) YOL GÜVENLİĞİ: klasör ve slug istemciden gelir ----
     Kapı paroladan geçiyor diye serbest bırakılamaz; hatalı bir panel
     sürümü ya da ele geçmiş bir oturum depoda başka dosyayı ezebilirdi. */
  {
    process.env.PANEL_PAROLA_HASH = HASH;
    process.env.GITHUB_TOKEN = 'sahte-test-jetonu-4-aga-cikmiyor-gercek-degil-444';
    const kotu = [
      ['sözleşmede olmayan klasör', { klasor: 'netlify/functions', slug: 'panel' }],
      ['üst dizine çıkan klasör', { klasor: '../..', slug: 'netlify' }],
      ['yol ayracı taşıyan slug', { klasor: 'icerik/haber', slug: '../../netlify.toml' }],
      ['boş slug', { klasor: 'icerik/haber', slug: '' }],
      ['büyük harfli slug', { klasor: 'icerik/haber', slug: 'Buyuk-Harf' }]
    ];
    for (const [ad, k] of kotu) {
      const { adaptor, cagrilar } = sahteAdaptorKur();
      const handler = handlerOlustur(adaptor);
      const r = await handler(olay({
        parola: DOGRU_PAROLA, content: { settings: {} },
        kayitlar: [{ klasor: k.klasor, slug: k.slug, kayit: {} }]
      }));
      ol('reddediliyor: ' + ad, r.statusCode === 400 && cagrilar.length === 0,
         r.statusCode + '/' + cagrilar.length);
    }
  }

  /* ---- 10) GORSELLER DOSYAYA (14 Eyl 2026) ----
     Panelin gorsel alani data URL uretir; icerige gomulu kalirsa derleme
     dusuyordu. Yayin ucu onu dosyaya cevirmeli, icerikte yol kalmali. */
  {
    process.env.PANEL_PAROLA_HASH = HASH;
    process.env.GITHUB_TOKEN = 'sahte-test-jetonu-5-aga-cikmiyor-gercek-degil-555';
    const PNG1 = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a9e40000000049454e44ae426082', 'hex');
    const url = 'data:image/png;base64,' + PNG1.toString('base64');
    const { adaptor, cagrilar } = sahteAdaptorKur();
    const handler = handlerOlustur(adaptor);
    const r = await handler(olay({
      parola: DOGRU_PAROLA,
      content: { projects: ['a', 'b'].map(s => ({ slug: s, name: 'İş ' + s, tag: { tr: 'Etiket', en: 'Tag' },
        text: { tr: 'Metin ' + s, en: 'Text ' + s }, image: url })), founder: { photo: url } },
      kayitlar: [{ klasor: 'icerik/haber', slug: 'gorselli', kayit: { slug: 'gorselli',
        title: { tr: 'Görselli deneme', en: 'Image test' }, lede: { tr: 'Görsel girişi', en: 'Image lede' }, image: url } }]
    }));
    const d = cagrilar.length === 1 ? cagrilar[0].dosyalar : [];
    const g = d.filter(x => /\/img\/yuklenen\//.test(x.yol));
    ol('gorsel: 200 ve TEK dosya (ayni bayt tek ad)', r.statusCode === 200 && g.length === 1, r.statusCode + '/' + g.length);
    ol('gorsel: base64 kodlamayla, bayt birebir',
       !!g[0] && g[0].kodlama === 'base64' && Buffer.from(g[0].icerik, 'base64').equals(PNG1), '');
    const yol = g[0] ? g[0].yol.replace(/^qanatone\//, '') : '?';
    const cj = d.find(x => /content\.json$/.test(x.yol));
    ol('gorsel: content.json\'da data URL yok, 3 alanda yol',
       !!cj && !/data:image/.test(cj.icerik) && cj.icerik.split(yol).length === 4, yol);
    const ky = d.find(x => /gorselli\.json$/.test(x.yol));
    ol('gorsel: kayit dosyasinda da yol', !!ky && ky.icerik.includes(yol) && !/data:/.test(ky.icerik), '');
    const gv = JSON.parse(r.body || '{}');
    ol('gorsel: yanit eslesmeyi tasiyor (panel taslagi tazelenir)',
       !!gv.gorseller && Object.values(gv.gorseller).includes(yol), '');
    for (const [ad, v] of [
      ['svg reddedilir', 'data:image/svg+xml;base64,' + Buffer.from('<svg onload="x()"/>').toString('base64')],
      ['imzasi tutmayan png reddedilir', 'data:image/png;base64,' + Buffer.from('bu bir png degil').toString('base64')],
      ['gorsel olmayan data reddedilir', 'data:text/html;base64,PGI+eDwvYj4=']]) {
      const s = sahteAdaptorKur();
      const r2 = await handlerOlustur(s.adaptor)(olay({ parola: DOGRU_PAROLA, content: { settings: { x: v } } }));
      ol('gorsel: ' + ad, r2.statusCode === 400 && s.cagrilar.length === 0, r2.statusCode + '/' + s.cagrilar.length);
    }
  }

  /* ---- 11) ICERIK SOZLESMESI (14 Eyl 2026) ----
     Derlemenin duzeltemedigi eksikler (EN alan, baslik tekrari) yayin
     ucunda Turkce gerekceyle reddedilir; bicimsiz slug turetilir.
     ILK SART: bugunku icerigin TAMAMI sozlesmeden gecmeli — gecmezse
     Enes'in her yayini reddedilir. */
  {
    process.env.PANEL_PAROLA_HASH = HASH;
    process.env.GITHUB_TOKEN = 'sahte-test-jetonu-6-aga-cikmiyor-gercek-degil-666';
    const fs = require('fs'), path = require('path');
    const { icerikSozlesmesi, sluglastir } = require('../netlify/functions/yayinla.js');
    const kok = path.join(__dirname, '..');
    const gercek = JSON.parse(fs.readFileSync(path.join(kok, 'content.json'), 'utf8'));
    const mevcutK = [];
    for (const kl of ['nedir', 'haber']) {
      const d = path.join(kok, 'icerik', kl);
      if (!fs.existsSync(d)) continue;
      for (const a of fs.readdirSync(d).filter(x => x.endsWith('.json')))
        mevcutK.push({ klasor: 'icerik/' + kl, slug: a.slice(0, -5), kayit: JSON.parse(fs.readFileSync(path.join(d, a), 'utf8')) });
    }
    const s0 = icerikSozlesmesi(JSON.parse(JSON.stringify(gercek)), mevcutK, new Map());
    ol('sozlesme: MEVCUT icerik (content.json + tum kayitlar) geciyor', s0.length === 0,
       s0.slice(0, 2).join(' | ') || (gercek.projects.length + ' proje · ' + mevcutK.length + ' kayit'));
    ol('sozlesme: Turkce slug turetilir', sluglastir('Kötü Slug Ç — İş') === 'kotu-slug-c-is', sluglastir('Kötü Slug Ç — İş'));
    const tam = (ad) => ({ name: ad, tag: { tr: 'Etiket', en: 'Tag' }, text: { tr: 'Metin ' + ad, en: 'Text ' + ad } });
    const c1 = { projects: [Object.assign(tam('Yeni İş'), { slug: 'Yeni İş' }), Object.assign(tam('Yeni İş 2'), { slug: 'yeni-is' })] };
    const s1 = icerikSozlesmesi(c1, [], new Map());
    ol('sozlesme: bicimsiz ve cakisan proje slug\'i duzeltilir',
       s1.length === 0 && c1.projects[0].slug === 'yeni-is' && c1.projects[1].slug === 'yeni-is-2', c1.projects.map(p => p.slug).join(','));
    const red = async (ad, govde, beklenen) => {
      const s = sahteAdaptorKur();
      const r = await handlerOlustur(s.adaptor)(olay(Object.assign({ parola: DOGRU_PAROLA }, govde)));
      const j = JSON.parse(r.body || '{}');
      ol('sozlesme reddi: ' + ad, r.statusCode === 400 && s.cagrilar.length === 0 && String(j.reason || '').includes(beklenen),
         r.statusCode + ' · ' + String(j.reason || '').slice(0, 70));
    };
    await red('EN etiketi bos proje', { content: { projects: [{ name: 'Tek Dil', slug: 'tek-dil',
      tag: { tr: 'Etiket' }, text: { tr: 'a', en: 'b' } }] } }, 'Tek Dil');
    await red('TR ve EN etiketi ayni proje', { content: { projects: [{ name: 'Ayni Dil', slug: 'ayni-dil',
      tag: { tr: 'SEO', en: 'SEO' }, text: { tr: 'Metin', en: 'Text' } }] } }, 'ayni');
    await red('iki projede ayni kisa anlatim', { content: { projects: ['Bir', 'Iki'].map(ad => ({ name: ad, slug: ad.toLowerCase(),
      tag: { tr: 'Etiket ' + ad, en: 'Tag ' + ad }, text: { tr: 'Aynı metin', en: 'Same text' } })) } }, 'baska bir projeyle');
    await red('EN basligi bos yazi', { content: { settings: {} }, kayitlar: [{ klasor: 'icerik/haber', slug: 'kisa',
      kayit: { slug: 'kisa', title: { tr: 'Kısa' }, lede: { tr: 'a', en: 'b' } } }] }, 'Kısa');
    if (mevcutK[0]) await red('baska yazinin basligini tasiyan yazi', { content: { settings: {} },
      kayitlar: [{ klasor: 'icerik/haber', slug: 'kopya-baslik', kayit: { slug: 'kopya-baslik',
        title: mevcutK[0].kayit.title, lede: { tr: 'a', en: 'b' } } }] }, 'ayni');
  }

  /* ---- 12) GITHUB HATASI GEREKCEYE CEVRILIR (14 Eyl 2026) ----
     Anahtarin suresi dolunca panel "commit basarisiz" diyordu. Durum kodu
     yonergeye cevrilmeli; hata mesaji (token tasiyabilir) yanita girmemeli. */
  {
    process.env.PANEL_PAROLA_HASH = HASH;
    process.env.GITHUB_TOKEN = 'sahte-test-jetonu-7-aga-cikmiyor-gercek-degil-777';
    for (const [kod, beklenen] of [['401', 'GITHUB_TOKEN yenilen'], ['403', 'yazma izni'], ['500', 'commit basarisiz']]) {
      const h = handlerOlustur(async () => {
        throw new Error('github /git/ref/heads/main -> ' + kod + ' token=' + process.env.GITHUB_TOKEN); });
      const r = await h(olay({ parola: DOGRU_PAROLA, content: { settings: {} } }));
      const j = JSON.parse(r.body || '{}');
      ol('github ' + kod + ' -> gerekce, token yok',
         r.statusCode === 502 && String(j.reason).includes(beklenen) && !r.body.includes(process.env.GITHUB_TOKEN),
         String(j.reason).slice(0, 60));
    }
  }

  delete process.env.PANEL_PAROLA_HASH;
  delete process.env.GITHUB_TOKEN;

  console.log(`\n  ${gecti} geçti · ${kaldi} kaldı\n`);
  console.log(kaldi === 0 ? '  yayinla.js kanıtlandı.' : '  yayinla.js KALDI.');
  process.exit(kaldi === 0 ? 0 : 1);
})();
