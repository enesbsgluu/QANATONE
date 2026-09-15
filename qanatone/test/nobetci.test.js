#!/usr/bin/env node
'use strict';
/* test/nobetci.test.js — nobetcinin KARARLARI dogru mu
   node test/nobetci.test.js

   NEDEN VAR. Nobetci (netlify/functions/nobetci.js) saatte bir olcer ve
   yalniz DURUM DEGISINCE konusur. Iki yonde de sessiz hata mumkun:
   - yanlis sessizlik: takili yayini "canlida" sayar, suresi dolan anahtari
     gormez -> izleme varken sorun yine Enes'e kalir;
   - yanlis gurultu: ayni sorunu her saat yollar -> bildirim okunmaz olur.
   Ag yok: kurallar saf (netlify/ortak/nobetci-kural.js), saat sabit. */

const fs = require('fs');
const path = require('path');
const K = require('../netlify/ortak/nobetci-kural.js');

let gecti = 0, kaldi = 0;
function ol(ad, kosul, ayrinti) {
  console.log('  ' + (kosul ? 'ok ' : '!! ') + ad.padEnd(58) + ' ' + (ayrinti || ''));
  if (kosul) gecti++; else kaldi++;
}
const bitir = () => {
  console.log(`\n  ${gecti} geçti · ${kaldi} kaldı\n`);
  process.exit(kaldi ? 1 : 0);
};

const KOK = path.join(__dirname, '..');
const SIMDI = Date.parse('2026-09-15T12:00:00Z');
const SAAT = 36e5;
const c = (sha, mesaj, dk) => ({ sha, mesaj, tarih: new Date(SIMDI - dk * 60e3).toISOString() });

console.log('\n  jeton suresi');
ol('14 gun kala -> 14', K.jetonGun('2026-09-29 12:00:00 UTC', SIMDI) === 14);
ol('bir saat once doldu -> negatif', K.jetonGun('2026-09-15 11:00:00 UTC', SIMDI) === -1);
ol('baslik yok (suresiz anahtar) -> null', K.jetonGun(null, SIMDI) === null);
ol('bozuk baslik -> null', K.jetonGun('yarin', SIMDI) === null);

console.log('\n  takili yayin');
ol('canli = son isaretsiz commit -> sorun yok',
  K.yayinSorunu([c('a1', 'icerik: haber', 40), c('a0', 'x [skip ci]', 50)], 'a1', SIMDI) === null);
const takili = K.yayinSorunu([c('a1', 'icerik: haber', 40), c('a0', 'x [skip ci]', 50)], 'a0', SIMDI);
ol('40 dk once itilen commit canlida degil -> kritik',
  !!takili && takili.seviye === 'kritik' && /a1/.test(takili.mesaj), takili && takili.mesaj);
ol('10 dk once itildi -> daha bekleniyor (pay 30 dk)',
  K.yayinSorunu([c('a1', 'yayin', 10), c('a0', 'y', 50)], 'a0', SIMDI) === null);
ol('HEAD isaretli, canli ondan onceki isaretsiz commit -> sorun yok',
  K.yayinSorunu([c('b2', 'not [skip ci]', 5), c('b1', 'yayin', 60), c('b0', 'z', 90)], 'b1', SIMDI) === null);
ol('elle derlenen isaretli HEAD canlida -> sorun yok',
  K.yayinSorunu([c('b2', 'not [skip ci]', 5), c('b1', 'yayin', 60)], 'b2', SIMDI) === null);
ol('butun commitler isaretli -> sorun yok',
  K.yayinSorunu([c('e1', 'a [skip ci]', 60), c('e0', 'b [ci skip]', 90)], 'eski', SIMDI) === null);
ol('[skip netlify] da isaret sayilir',
  K.yayinSorunu([c('d1', 'x [skip netlify]', 60), c('d0', 'y', 90)], 'd0', SIMDI) === null);
ol('canli commit 30 commitlik pencerenin disinda -> sorun',
  !!K.yayinSorunu([c('f1', 'yayin', 60)], 'cok-eski', SIMDI));

console.log('\n  olcum -> sorun');
const temiz = {
  sayfalar: [{ yol: '/', durum: 200 }],
  fonksiyonlar: [{ ad: 'panel', beklenen: 401, durum: 401 }],
  yayin: { commitler: [c('a1', 'y', 40)], canli: 'a1' },
  jeton: { durum: 200, gun: 60 }
};
ol('her sey yolunda -> bos liste', K.sorunlar(temiz, SIMDI).length === 0);
const s1 = K.sorunlar({ ...temiz, sayfalar: [{ yol: '/haber/', durum: 0, hata: 'zaman aşımı' }] }, SIMDI);
ol('sayfa zaman asimi -> kritik, nedeni mesajda',
  s1.length === 1 && s1[0].seviye === 'kritik' && /zaman aşımı/.test(s1[0].mesaj), s1[0] && s1[0].mesaj);
const s2 = K.sorunlar({ ...temiz, fonksiyonlar: [{ ad: 'panel', beklenen: 401, durum: 200 }] }, SIMDI);
ol('panel sifresiz 200 donuyor -> kritik', s2.length === 1 && s2[0].k === 'fonksiyon:panel');
const j = (jeton) => K.sorunlar({ ...temiz, jeton }, SIMDI).filter((x) => x.k === 'jeton');
ol('anahtar 20 gun -> sessiz', j({ durum: 200, gun: 20 }).length === 0);
ol('anahtar 10 gun -> uyari', j({ durum: 200, gun: 10 })[0].seviye === 'uyari');
ol('anahtar 2 gun -> kritik', j({ durum: 200, gun: 2 })[0].seviye === 'kritik');
ol('anahtar doldu -> "doldu"', /doldu/.test(j({ durum: 200, gun: -1 })[0].mesaj));
ol('anahtar 401 -> kritik', j({ durum: 401 })[0].seviye === 'kritik');
ol('anahtar tanimsiz -> uyari', j({ yok: true })[0].seviye === 'uyari');
ol('GitHub olculemedi -> uyari, yayin hukmu verilmez',
  (() => { const s = K.sorunlar({ ...temiz, yayin: { hata: 'GitHub 502' } }, SIMDI);
    return s.length === 1 && s[0].k === 'yayin-olcum' && s[0].seviye === 'uyari'; })());

console.log('\n  bildirim karari (gurultu yok, sessizlik yok)');
const kr = [{ k: 'sayfa:/', seviye: 'kritik', mesaj: '/ açılmıyor (500)' }];
const r1 = K.karar(kr, null, SIMDI);
ol('yeni sorun -> hemen bildirilir', r1.satirlar.length === 1 && r1.satirlar[0].startsWith('SORUN: '));
const r2 = K.karar(kr, r1.durum, SIMDI + SAAT);
ol('1 saat sonra ayni sorun -> sessiz', r2.satirlar.length === 0);
const r3 = K.karar(kr, r2.durum, SIMDI + 6 * SAAT);
ol('6 saat sonra hala -> hatirlatma', r3.satirlar.length === 1 && r3.satirlar[0].startsWith('HÂLÂ SORUN'));
ol('ilk gorulme zamani korunur', r3.durum.sorunlar[0].ilk === SIMDI);
const r4 = K.karar([], r3.durum, SIMDI + 7 * SAAT);
ol('duzelince bir kez "DÜZELDİ"', r4.satirlar.length === 1 && r4.satirlar[0].startsWith('DÜZELDİ: '));
ol('sonra yine sessiz', K.karar([], r4.durum, SIMDI + 8 * SAAT).satirlar.length === 0);
const uy = [{ k: 'jeton', seviye: 'uyari', mesaj: '10 gün' }];
const u1 = K.karar(uy, null, SIMDI);
ol('uyari 7 saat sonra -> sessiz (gunde bir)', K.karar(uy, u1.durum, SIMDI + 7 * SAAT).satirlar.length === 0);
ol('uyari 24 saat sonra -> hatirlatma', K.karar(uy, u1.durum, SIMDI + 24 * SAAT).satirlar.length === 1);
ol('uyari kritige donerse -> hemen bildirilir',
  K.karar([{ k: 'jeton', seviye: 'kritik', mesaj: '2 gün' }], u1.durum, SIMDI + SAAT).satirlar.length === 1);

console.log('\n  panel bandi');
ol('temiz ve taze -> bant yok', K.bantHtml({ zaman: SIMDI, sorunlar: [] }, SIMDI) === '');
ol('hic olcum yok -> gri bilgi bandi', /henüz ölçüm/.test(K.bantHtml(null, SIMDI)));
ol('4 saattir olcum yok -> "durmuş olabilir"',
  /4 saattir/.test(K.bantHtml({ zaman: SIMDI - 4 * SAAT, sorunlar: [] }, SIMDI)));
const kotu = K.bantHtml({ zaman: SIMDI, sorunlar: [{ k: 'x', seviye: 'kritik', mesaj: '<img src=x onerror=alert(1)>' }] }, SIMDI);
ol('mesaj kacisli (HTML enjekte edilemez)', !/<img/.test(kotu) && /&lt;img/.test(kotu));
ol('kritik -> kirmizi', /#b3001b/.test(kotu));
ol('yalniz uyari -> koyu sari',
  /#8a5a00/.test(K.bantHtml({ zaman: SIMDI, sorunlar: [{ k: 'j', seviye: 'uyari', mesaj: 'm' }] }, SIMDI)));
ol('WhatsApp gitmediyse bant nedenini soyler',
  /WhatsApp uyarısı gönderilemedi: \(#131047\)/.test(K.bantHtml({ zaman: SIMDI,
    sorunlar: [{ k: 'x', seviye: 'kritik', mesaj: 'm' }], wa: { ok: false, neden: '(#131047) pencere' } }, SIMDI)));

console.log('\n  bandin panele yerlesmesi');
ol('<body ...> ardina girer',
  K.bantEkle('<html><body class="x"><p>', 'B') === '<html><body class="x">B<p>');
ol('bant bossa govde birebir ayni', K.bantEkle('<body><p>', '') === '<body><p>');
const admin = fs.readFileSync(path.join(KOK, 'admin.html'), 'utf8');
const ekli = K.bantEkle(admin, '<div id="nobetciBant"></div>');
const ib = ekli.indexOf('<div id="nobetciBant">');
ol('gercek admin.html: bant <body> icinde, bir kez',
  ib > ekli.search(/<body[^>]*>/i) && ekli.split('id="nobetciBant"').length === 2 && ekli.length === admin.length + 28);

console.log('\n  sozlesme');
const N = require('../netlify/functions/nobetci.js');
const yok = N.FONKSIYONLAR.filter((f) => !fs.existsSync(path.join(KOK, 'netlify', 'functions', f.ad + '.js')));
ol('izlenen her fonksiyonun dosyasi var', yok.length === 0, yok.map((f) => f.ad).join(','));
const toml = fs.readFileSync(path.join(KOK, 'netlify.toml'), 'utf8');
ol('netlify.toml zamanlamasi duruyor (yoksa nobetci hic kosmaz)',
  /\[functions\."nobetci"\]\s*schedule\s*=\s*"@hourly"/.test(toml));
const eskiEnv = { to: process.env.WA_TO, t: process.env.WA_UYARI_TEMPLATE };
process.env.WA_TO = '900000000000';
delete process.env.WA_UYARI_TEMPLATE;
const metin = N.waYuk(['SORUN: a', 'UYARI: b']);
ol('sablonsuz -> serbest metin', metin.type === 'text' && metin.text.body === 'QANATONE nöbetçi\nSORUN: a\nUYARI: b');
process.env.WA_UYARI_TEMPLATE = 'nobetci_uyari';
const sab = N.waYuk(['SORUN: a', 'x'.repeat(2000)]);
const p = sab.template.components[0].parameters[0].text;
ol('sablon parametresi tek satir, <=1000', sab.type === 'template' && !/\n/.test(p) && p.length <= 1000);
if (eskiEnv.to === undefined) delete process.env.WA_TO; else process.env.WA_TO = eskiEnv.to;
if (eskiEnv.t === undefined) delete process.env.WA_UYARI_TEMPLATE; else process.env.WA_UYARI_TEMPLATE = eskiEnv.t;

bitir();
