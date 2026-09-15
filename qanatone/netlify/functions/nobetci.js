/* netlify/functions/nobetci.js — ZAMANLANMIS NOBETCI (15 Eyl 2026).
   ---------------------------------------------------------------------
   NEDEN: bu sitede sorunlari simdiye kadar hep Enes buldu — deploy hic
   baslamadi (atlama isareti), GitHub anahtarinin suresi doldu ve panelden
   yayin durdu, IndexNow aylarca 403 verdi. Sistem bozuldugunu kendisi
   soylemiyordu.

   NE YAPAR (saatte bir, netlify.toml `schedule`):
   - baslica sayfalar 200 mu,
   - fonksiyonlar beklenen cevabi veriyor mu (panel 401, yayinla/mcp/a2a
     GET'e 405, imza dizini 200 — hicbiri kota harcamaz, diagnose BILEREK
     disarida: kisi basi kotasi var ve disariya istek atar),
   - son isaretsiz commit 30 dakikada canliya cikti mi (/surum.json),
   - GitHub anahtarinin bitmesine kac gun kaldi (yanit basligindan).
   Degerlendirme ../ortak/nobetci-kural.js'te (saf, test/nobetci.test.js).
   Durum Netlify Blobs `nobetci/durum`: panel.js panelin ustune bant cizer;
   yeni sorun, hatirlatma ve duzelme WhatsApp'a da DENENIR (WA_* varsa).

   SINIRLAR (durust):
   - Netlify'in kendisi coker ya da zamanlayici durursa bu fonksiyon da
     calismaz. Panel bandi bunu "X saattir olcum yok" diye gosterir ama
     bildirim gidemez. Dis bir izleme (UptimeRobot vb.) o boslugu kapatir —
     NETLIFY-KURULUM.md.
   - WhatsApp serbest metni yalniz son 24 saatte o numaradan mesaj geldiyse
     iletir. Kalici cozum onayli bir uyari sablonu: WA_UYARI_TEMPLATE (tek
     govde parametresi). Gonderim sonucu duruma yazilir, bant gosterir.
   - Blobs okunamazsa BILDIRIM GONDERILMEZ: onceki durum bilinmeden her saat
     ayni uyari gider (gurultu). Olcum yine loga yazilir.

   GIZLILIK: GitHub anahtari yalniz Authorization basliginda; suresi
   yanitin basligindan okunur, anahtarin kendisi hicbir yere yazilmaz. */
'use strict';

const { sorunlar, karar, jetonGun } = require('../ortak/nobetci-kural.js');
const { waHazir, waGonder } = require('../ortak/whatsapp.js');
const { KOK_ADRES } = require('./imza-dizini.js');
const { REPO } = require('./yayinla.js');   /* yayinin yazdigi depo = izlenen depo, tek kaynak */

const UA = { 'user-agent': 'qanatone-nobetci/1.0' };
const SAYFALAR = ['/', '/haber/', '/nedir/', '/hizmetler/', '/surum.json'];
const FONKSIYONLAR = [
  { ad: 'panel', yol: '/admin.html', beklenen: 401 },
  { ad: 'yayinla', yol: '/.netlify/functions/yayinla', beklenen: 405 },
  { ad: 'mcp', yol: '/mcp', beklenen: 405 },
  { ad: 'a2a', yol: '/a2a', beklenen: 405 },
  { ad: 'imza-dizini', yol: '/.well-known/http-message-signatures-directory', beklenen: 200 }
];

/* SURE BUTCESI: zamanlanmis fonksiyon 30 sn ile sinirli. Sirali dalgalar
   (sayfalar -> surum -> GitHub) en kotu durumda 3 x zaman asimi = sinirin
   ustu demekti; butun istekler AYNI ANDA atilir, her biri en cok 10 sn. */
const ZAMAN_ASIMI_MS = 10000;

async function getir(url, secenek = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { redirect: 'manual', ...secenek,
      headers: { ...UA, ...(secenek.headers || {}) }, signal: AbortSignal.timeout(ZAMAN_ASIMI_MS) });
    return { durum: r.status, ms: Date.now() - t0, r };
  } catch (e) {
    return { durum: 0, ms: Date.now() - t0,
      hata: (e && (e.name === 'TimeoutError' ? 'zaman aşımı' : e.message)) || 'ağ hatası' };
  }
}

async function olc() {
  const TOKEN = process.env.GITHUB_TOKEN;
  const [sayfalar, fonksiyonlar, sg, g] = await Promise.all([
    Promise.all(SAYFALAR.map(async (yol) => {
      const x = await getir(KOK_ADRES + yol);
      return { yol, durum: x.durum, ms: x.ms, hata: x.hata };
    })),
    Promise.all(FONKSIYONLAR.map(async (f) => {
      const x = await getir(KOK_ADRES + f.yol);
      return { ad: f.ad, beklenen: f.beklenen, durum: x.durum, hata: x.hata };
    })),
    getir(KOK_ADRES + '/surum.json?n=' + Date.now()),
    TOKEN ? getir('https://api.github.com/repos/' + REPO + '/commits?sha=main&per_page=30', {
      headers: { authorization: 'Bearer ' + TOKEN, accept: 'application/vnd.github+json' } }) : null
  ]);

  let canli = null;
  if (sg.r && sg.durum === 200) { try { canli = (await sg.r.json()).commit || null; } catch (e) { /* bos */ } }

  const jeton = {};
  let yayin = {};
  if (!g) jeton.yok = true;
  else {
    jeton.durum = g.durum;
    if (g.r) jeton.gun = jetonGun(g.r.headers.get('github-authentication-token-expiration'), Date.now());
    if (g.durum === 200) {
      const liste = await g.r.json();
      yayin = { canli, commitler: liste.map((c) => ({ sha: c.sha,
        mesaj: c.commit && c.commit.message,
        tarih: c.commit && c.commit.committer && c.commit.committer.date })) };
      if (!canli) yayin.hata = '/surum.json okunamadı';
    } else if (g.durum !== 401 && g.durum !== 403) {
      yayin.hata = 'GitHub ' + (g.durum || g.hata);
    }
  }
  return { sayfalar, fonksiyonlar, yayin, jeton };
}

function waYuk(satirlar) {
  const TO = process.env.WA_TO;
  if (process.env.WA_UYARI_TEMPLATE) {
    /* sablon parametresi satir sonu tasiyamaz (Meta reddeder) — tek satir */
    return { messaging_product: 'whatsapp', to: TO, type: 'template', template: {
      name: process.env.WA_UYARI_TEMPLATE, language: { code: process.env.WA_LANG || 'tr' },
      components: [{ type: 'body', parameters: [
        { type: 'text', text: satirlar.join(' · ').replace(/\s+/g, ' ').slice(0, 1000) }] }] } };
  }
  return { messaging_product: 'whatsapp', to: TO, type: 'text',
    text: { body: ('QANATONE nöbetçi\n' + satirlar.join('\n')).slice(0, 4000) } };
}

function depoAc(event) {
  try {
    const b = require('@netlify/blobs');
    if (event && typeof b.connectLambda === 'function') b.connectLambda(event);
    return b.getStore({ name: 'nobetci' });
  } catch (e) { return null; }
}

exports.handler = async (event) => {
  const simdi = Date.now();
  const olcum = await olc();
  const s = sorunlar(olcum, simdi);

  const depo = depoAc(event);
  let onceki = null, depoHata = depo ? null : 'Blobs acilamadi';
  if (depo) { try { onceki = await depo.get('durum', { type: 'json' }); } catch (e) { depoHata = e.message; } }

  const { durum, satirlar } = karar(s, onceki, simdi);
  durum.olcum = {
    sayfa: olcum.sayfalar.map((p) => [p.yol, p.durum, p.ms]),
    fonksiyon: olcum.fonksiyonlar.map((f) => [f.ad, f.durum]),
    jetonGun: typeof olcum.jeton.gun === 'number' ? olcum.jeton.gun : null
  };
  durum.wa = (onceki && onceki.wa) || null;

  if (satirlar.length && !depoHata) {
    durum.wa = waHazir()
      ? { zaman: simdi, ...(await waGonder(waYuk(satirlar))) }
      : { zaman: simdi, ok: false, neden: 'WA_TOKEN / WA_PHONE_ID / WA_TO tanımlı değil' };
  }
  if (depo && !depoHata) { try { await depo.setJSON('durum', durum); } catch (e) { depoHata = e.message; } }

  console.log('nobetci:', s.length, 'sorun ·', satirlar.length, 'bildirim satiri ·',
    depoHata ? 'depo: ' + depoHata : 'depo ok', '·', s.map((x) => x.k).join(',') || 'temiz');
  return { statusCode: 200, body: JSON.stringify({ sorun: s.length, satir: satirlar.length, depo: !depoHata }) };
};

exports.olc = olc;         /* yerel duman testi: canli uclara gercek olcum */
exports.waYuk = waYuk;
exports.SAYFALAR = SAYFALAR;
exports.FONKSIYONLAR = FONKSIYONLAR;   /* test: listedeki her fonksiyonun dosyasi var mi */
