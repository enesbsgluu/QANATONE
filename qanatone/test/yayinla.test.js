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
      ol('commit: yol DOSYA_YOLU ile eşleşiyor (tek doğruluk kaynağı)', c.yol === DOSYA_YOLU, c.yol);
      ol('commit: içerik gövdedeki content.json ile eşleşiyor',
         JSON.parse(c.icerik).settings.whatsapp === '905000000000', c.icerik.slice(0, 40));
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

  delete process.env.PANEL_PAROLA_HASH;
  delete process.env.GITHUB_TOKEN;

  console.log(`\n  ${gecti} geçti · ${kaldi} kaldı\n`);
  console.log(kaldi === 0 ? '  yayinla.js kanıtlandı.' : '  yayinla.js KALDI.');
  process.exit(kaldi === 0 ? 0 : 1);
})();
