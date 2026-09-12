#!/usr/bin/env node
'use strict';
/* test/panel-olcek.test.js — panel buyuyen koleksiyonla OLCEKLENIYOR mu
   node test/panel-olcek.test.js

   NEDEN VAR (Tur 2 · B6/B7, 10 Eyl 2026). Olculmustu: panel acilista
   TUM kayitlari cekiyordu (10.000 yazida 35,6 MiB) ve `list()` her
   kaydin TUM alanlarini pesin basiyordu (1.000 kayitta 14,5 MB HTML).
   Artik acilista DIZIN gelir; kayit acilinca getirilir ve cizilir.
   Kapi o sozlesmeyi VE sozlesmenin acabilecegi en pahali kusuru tutar:
   acilmamis kayit panelde yalniz slug/tarih/baslik tasiyan bir OZET —
   ozet bir dosyanin yerine yazilirsa yazinin govdesi sessizce silinir.

   TAKLIT DEGIL, GERCEK UCLAR. Gecici bir kokte gercek sozlesme +
   content.json + N kayit kurulur; `panel.js` ve `yayinla.js`in GERCEK
   handler'lari o koke karsi kosar (parola da gercek scrypt). Panel
   jsdom'da acilir, fetch'i dogrudan o handler'lara baglanir; yayin
   adaptoru GitHub yerine gecici koke yazar. Kayitlar depodaki gercek
   yazilardan turetilir — fikstur bicimi uydurulmaz. */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

/* Handler'lar her cagrida ISO zamanli bir satir basar; kapinin ciktisi
   okunur kalsin diye yalniz o satirlar susturulur. */
const asilLog = console.log;
console.log = (...a) => {
  if (typeof a[0] === 'string' && /^\d{4}-\d\d-\d\dT/.test(a[0])) return;
  asilLog(...a);
};

let gecti = 0, kaldi = 0;
function ol(ad, kosul, ayrinti) {
  console.log('  ' + (kosul ? 'ok ' : '!! ') + ad.padEnd(66) + ' ' + (ayrinti || ''));
  if (kosul) gecti++; else kaldi++;
}
let GECICI = null;
const bitir = () => {
  if (GECICI) try { fs.rmSync(GECICI, { recursive: true, force: true }); } catch (e) {}
  console.log(`\n  ${gecti} geçti · ${kaldi} kaldı\n`);
  process.exit(kaldi ? 1 : 0);
};

const KOK = path.join(__dirname, '..');
const N = 120;
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('\npanel-olcek — acilista dizin, kayit acilinca (B6/B7)\n');

/* ---- 1 · GECICI KOK ---- */
GECICI = fs.mkdtempSync(path.join(os.tmpdir(), 'qanat-panel-'));
const yaz = (goreli, icerik) => {
  const y = path.join(GECICI, goreli);
  fs.mkdirSync(path.dirname(y), { recursive: true });
  fs.writeFileSync(y, icerik);
};
const SOZ_YOL = path.join('yeni', 'src', 'veri', 'sayfalar.json');
yaz('content.json', fs.readFileSync(path.join(KOK, 'content.json')));
yaz(SOZ_YOL, fs.readFileSync(path.join(KOK, SOZ_YOL)));
const sozlesme = JSON.parse(fs.readFileSync(path.join(KOK, SOZ_YOL), 'utf8'));
const DOSYA_KOL = sozlesme.koleksiyon.filter((k) => k.depo === 'dosya');
const yazilar = DOSYA_KOL.find((k) => k.kaynak === 'posts');
for (const K of DOSYA_KOL) fs.mkdirSync(path.join(GECICI, K.klasor), { recursive: true });

const gercekKlasor = path.join(KOK, yazilar.klasor);
const gercek = fs.readdirSync(gercekKlasor).filter((a) => a.endsWith('.json'))
  .map((a) => JSON.parse(fs.readFileSync(path.join(gercekKlasor, a), 'utf8')));
if (!gercek.length) { ol('depoda turetilecek gercek yazi var', false, yazilar.klasor + ' bos'); bitir(); }
const t0 = Date.UTC(2026, 8, 1);
const sluglar = [];
for (let i = 0; i < N; i++) {
  const k = JSON.parse(JSON.stringify(gercek[i % gercek.length]));
  k.slug = 'olcek-' + String(i).padStart(4, '0');
  k.date = new Date(t0 - i * 864e5).toISOString().slice(0, 10);
  k.title = Object.assign({}, k.title, { tr: ((k.title && k.title.tr) || '') + ' · ' + i });
  sluglar.push(k.slug);
  yaz(path.join(yazilar.klasor, k.slug + '.json'), JSON.stringify(k, null, 2) + '\n');
}
const dosyadan = (slug) => fs.readFileSync(path.join(GECICI, yazilar.klasor, slug + '.json'), 'utf8');

/* ---- 2 · GERCEK HANDLER'LAR ---- */
process.env.LAMBDA_TASK_ROOT = GECICI;
const parola = crypto.randomBytes(12).toString('hex');
const tuz = crypto.randomBytes(16).toString('hex');
process.env.PANEL_PAROLA_HASH = tuz + ':' + crypto.scryptSync(parola, tuz, 64).toString('hex');
const panelFn = require(path.join(KOK, 'netlify', 'functions', 'panel.js'));
const yayinla = require(path.join(KOK, 'netlify', 'functions', 'yayinla.js'));
const ISARET = yayinla.OZET_ISARETI;
const YETKI = 'Basic ' + Buffer.from('enes:' + parola).toString('base64');
const cagir = (q, yetkili = true) => panelFn.handler({
  headers: yetkili ? { authorization: YETKI } : {}, queryStringParameters: q
});
const yazilanlar = [];
const yayinFn = yayinla.handlerOlustur(async ({ dosyalar }) => {
  for (const d of dosyalar) {
    yazilanlar.push(d);
    const y = path.join(GECICI, d.yol.replace(/^[^/]+\//, ''));   /* 'qanatone/' oneki */
    if (d.icerik === null) fs.rmSync(y, { force: true });
    else { fs.mkdirSync(path.dirname(y), { recursive: true }); fs.writeFileSync(y, d.icerik); }
  }
});

(async () => {
  /* ---- A · SUNUCU UCLARI ---- */
  const k401 = [await cagir({ dizin: '1' }, false), await cagir({ kayit: sluglar[0], kol: yazilar.ad }, false)];
  ol('uclar kapinin ardinda (parolasiz 401)', k401.every((r) => r.statusCode === 401),
     k401.map((r) => r.statusCode).join(' · '));

  const rd = await cagir({ dizin: '1' });
  const rk = await cagir({ kayitlar: '1' });
  const dz = ((JSON.parse(rd.body || '{}').dizin) || {})[yazilar.ad] || [];
  const bicimli = dz.length > 0 && dz.every((x) => Object.keys(x).join() === 'slug,date,title'
    && Object.keys(x.title || {}).join() === 'tr');
  const bd = Buffer.byteLength(rd.body || ''), bk = Buffer.byteLength(rk.body || '');
  ol('?dizin=1 · her kayit YALNIZ ozet (slug · tarih · baslik)',
     rd.statusCode === 200 && dz.length === N && bicimli,
     dz.length + '/' + N + ' · acilis ' + bk + ' B → ' + bd + ' B (' + Math.round(bd / N) + ' B/kayit)'
       + (bicimli ? '' : ' · ALANLAR: ' + Object.keys(dz[0] || {}).join()));
  const sirali = dz.every((x, i) => i === 0 || String(dz[i - 1].date) >= String(x.date));
  ol('?dizin=1 · kume dosyalarla ayni, sira tarih yeni→eski',
     sirali && dz.map((x) => x.slug).sort().join() === sluglar.slice().sort().join(),
     sirali ? 'sirali' : 'SIRA BOZUK');
  ol('?kayitlar=1 · butun kayitlar hala servis ediliyor (disa aktarma yolu)',
     rk.statusCode === 200 && ((JSON.parse(rk.body || '{}').kayitlar || {})[yazilar.ad] || []).length === N,
     rk.statusCode + ' · ' + bk + ' B');

  const hedef = sluglar[7];
  const rt = await cagir({ kayit: hedef, kol: yazilar.ad });
  ol('?kayit= · govde diskteki dosyanin kendisi (bayt-birebir)',
     rt.statusCode === 200 && rt.body === dosyadan(hedef), rt.statusCode + ' · ' + Buffer.byteLength(rt.body || '') + ' B');
  const red = [];
  for (const [q, beklenen] of [
    [{ kayit: '../content', kol: yazilar.ad }, 400],
    [{ kayit: '..\\content', kol: yazilar.ad }, 400],
    [{ kayit: 'Buyuk-Harf', kol: yazilar.ad }, 400],
    [{ kayit: hedef, kol: 'olmayan' }, 400],
    [{ kayit: hedef }, 400],
    [{ kayit: 'olmayan-kayit', kol: yazilar.ad }, 404]
  ]) {
    const r = await cagir(q);
    if (r.statusCode !== beklenen) red.push(JSON.stringify(q) + '→' + r.statusCode);
  }
  ol('?kayit= · klasor disina cikamaz, bilinmeyen kol/slug reddedilir',
     red.length === 0, red.length ? red.join(' | ') : '5 × 400 · 1 × 404');

  /* ---- B · PANEL (jsdom; fetch gercek handler'lara bagli) ---- */
  let JSDOM, VirtualConsole;
  try { ({ JSDOM, VirtualConsole } = require(path.join(KOK, 'node_modules', 'jsdom'))); }
  catch (e) { ol('jsdom bulundu', false, 'kok node_modules/jsdom yok — `npm i` gerekiyor'); bitir(); }
  const panelHtml = fs.readFileSync(path.join(KOK, 'admin.html'), 'utf8');

  async function panelAc(taslak) {
    const say = { veri: 0, dizin: 0, kayitlar: 0, kayit: 0 };
    const hatalar = [];
    let disa = null;
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => {
      const m = String((e && e.message) || e);
      if (!/Not implemented/.test(m)) hatalar.push(m.slice(0, 120));
    });
    vc.on('error', (...a) => hatalar.push(a.map(String).join(' ').slice(0, 120)));
    const dom = new JSDOM(panelHtml, {
      url: 'https://www.qanatone.com/admin.html',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      virtualConsole: vc,
      beforeParse(win) {
        if (taslak) win.localStorage.setItem('qanat-admin-draft', taslak);
        win.fetch = async (u, o) => {
          const url = new URL(String(u), 'https://www.qanatone.com/admin.html');
          const r = url.pathname.endsWith('/yayinla')
            ? await yayinFn({ httpMethod: 'POST', body: o && o.body })
            : await (() => {
                const q = Object.fromEntries(url.searchParams);
                for (const k of Object.keys(say)) if (k in q) say[k]++;
                return cagir(q);
              })();
          return { ok: r.statusCode === 200, status: r.statusCode, json: async () => JSON.parse(r.body) };
        };
        win.alert = () => {};
        win.confirm = () => true;
        win.URL.createObjectURL = () => 'blob:olcek';
        win.URL.revokeObjectURL = () => {};
        const AsilBlob = win.Blob;
        win.Blob = function (parcalar, secenek) { disa = parcalar.join(''); return new AsilBlob(parcalar, secenek); };
      }
    });
    const win = dom.window;
    const ev = (s) => win.eval(s);
    for (let i = 0; i < 400 && !ev('typeof seeded!=="undefined"&&seeded'); i++) await bekle(25);
    return { win, doc: win.document, say, hatalar, disa: () => disa, ev };
  }

  const P1 = await panelAc(null);
  const { win, doc, say, ev } = P1;
  const acildi = ev('typeof seeded!=="undefined"&&seeded') === true;
  ol('panel acildi', acildi, acildi ? '' : 'seeded=false · ' + P1.hatalar.slice(0, 2).join(' | '));
  if (!acildi) bitir();

  ol('B7 · acilis kayitlari CEKMIYOR (dizin 1 · kayit 0 · kayitlar 0)',
     say.dizin === 1 && say.kayit === 0 && say.kayitlar === 0, JSON.stringify(say));
  const ozetSay = ev('C.posts.filter(ozetMi).length');
  ol('B7 · acilista her kayit ozet', ozetSay === N && ev('C.posts.length') === N, ozetSay + '/' + N);
  ol('ozet isareti panelde ve yayin ucunda ayni', ev('OZET') === ISARET, ev('OZET') + ' = ' + ISARET);

  win.show('bulten');
  const ed = doc.querySelector('#ed');
  const kartSay = ed.querySelectorAll('.item').length;
  const alanSay = ed.querySelectorAll('.item [data-p], .item [data-src], .item .kg').length;
  const html = Buffer.byteLength(ed.innerHTML);
  /* Kart basina bayt da kapida: yapisal olcut (alan 0) basligin kendisinin
     sessizce buyumesini — ornegin govde onizlemesi — yakalamaz. */
  ol('B6 · sekme kayitlari KAPALI ciziyor (alan basilmiyor, ≤ 1 KB/kart)',
     kartSay === N && alanSay === 0 && html / N <= 1024,
     kartSay + ' kart · ' + alanSay + ' alan · ' + html + ' B (' + Math.round(html / N) + ' B/kart)');

  const ac = async (i) => {
    const b = ed.querySelector(`[data-ac="posts|${i}"]`);
    b.click();
    for (let k = 0; k < 300 && !(b.closest('.item') || {}).querySelector?.('.kg'); k++) await bekle(10);
    return ed.querySelector(`[data-ac="posts|${i}"]`).closest('.item');
  };

  const slug3 = ev('C.posts[3].slug');
  const kart3 = await ac(3);
  const disk3 = JSON.parse(dosyadan(slug3));
  const birebir = ev('JSON.stringify(C.posts[3])') === JSON.stringify(disk3);
  ol('B6/B7 · acilan kayit tek istekle geliyor, diskle birebir, yalniz o kart ciziliyor',
     say.kayit === 1 && birebir && ed.querySelectorAll('.kg').length === 1 && !!kart3.querySelector('[data-src]'),
     'kayit istegi ' + say.kayit + ' · acik kart ' + ed.querySelectorAll('.kg').length + (birebir ? ' · birebir' : ' · FARKLI'));

  ed.querySelector('[data-ac="posts|3"]').click();
  const kapandi = !kart3.querySelector('.kg');
  await ac(3);
  ol('B6 · kapat-ac yeniden istek atmiyor', kapandi && say.kayit === 1 && !!kart3.querySelector('.kg'),
     (kapandi ? 'kapandi' : 'KAPANMADI') + ' · kayit istegi ' + say.kayit);

  const baslik = kart3.querySelector('[data-p="posts.3.title.tr"]');
  baslik.value = 'Olcek duzenlemesi';
  baslik.dispatchEvent(new win.Event('input', { bubbles: true }));
  const f1 = win.kayitFarki();
  const d1 = f1.degisen[0] || {};
  ol('duzenleme · yalniz acilan kayit, TAM govdeyle, isaretsiz',
     f1.degisen.length === 1 && f1.silinen.length === 0 && d1.slug === slug3
       && JSON.stringify((d1.kayit || {}).body) === JSON.stringify(disk3.body) && !(ISARET in (d1.kayit || {})),
     f1.degisen.length + ' degisen · ' + f1.silinen.length + ' silinen');

  ed.querySelector('[data-mv="posts|5|1"]').click();
  const slug7 = ev('C.posts[7].slug');
  ed.querySelector('[data-del="posts|7"]').click();
  const f2 = win.kayitFarki();
  ol('acilmamis kaydi tasimak/silmek · ozet yayina girmiyor, silme dogru slugla',
     f2.degisen.length === 1 && f2.silinen.length === 1 && f2.silinen[0].slug === slug7
       && !f2.degisen.some((d) => ISARET in d.kayit),
     f2.degisen.length + ' degisen · silinen ' + ((f2.silinen[0] || {}).slug || '—'));

  /* IKINCI KILIT: panel ozeti gondermez, gonderse de yayin ucu reddeder. */
  const ozetKayit = JSON.parse(ev('JSON.stringify(C.posts[1])'));
  const icerikGercek = JSON.parse(fs.readFileSync(path.join(GECICI, 'content.json'), 'utf8'));
  const yazimOnce = yazilanlar.length;
  const rz = await yayinFn({ httpMethod: 'POST', body: JSON.stringify({ parola, content: icerikGercek,
    kayitlar: [{ klasor: yazilar.klasor, slug: ozetKayit.slug, kayit: ozetKayit }] }) });
  ol('yayinla.js ozet kaydi REDDEDIYOR (ikinci kilit)',
     !!ozetKayit[ISARET] && rz.statusCode === 400 && yazilanlar.length === yazimOnce,
     rz.statusCode + ' · ' + rz.body);

  await bekle(450);                       /* touch → taslak 340 ms geciktirmeli */
  const taslak = win.localStorage.getItem('qanat-admin-draft') || '';
  const tj = JSON.parse(taslak || '{}');
  ol('taslak yalniz degisen/silineni tasiyor, ozet yok',
     (tj.degisen || []).length === 1 && (tj.silinen || []).length === 1 && !taslak.includes('"' + ISARET + '"'),
     Buffer.byteLength(taslak) + ' B');

  win.show('yayin');
  doc.querySelector('#yayinParola').value = parola;
  const gidenOnce = yazilanlar.length;
  doc.querySelector('#bYayinla').click();
  const durum = () => doc.querySelector('#yayinDurum').textContent;
  for (let i = 0; i < 300 && !/yayınlandı|başarısız|reddedildi|hata|kapalı/.test(durum()); i++) await bekle(10);
  const giden = yazilanlar.slice(gidenOnce);
  const kayitDosyasi = giden.filter((d) => d.yol.includes('/' + yazilar.klasor + '/'));
  ol('yayin · content.json + 1 kayit + 1 silme, ozet yok',
     /yayınlandı/.test(durum()) && giden.length === 3 && kayitDosyasi.length === 2
       && !giden.some((d) => d.icerik && d.icerik.includes('"' + ISARET + '"')),
     durum() + ' · ' + giden.map((d) => path.basename(d.yol) + (d.icerik === null ? '(sil)' : '')).join(', '));

  win.show('bulten');
  const istekOnce = say.kayit;
  const slug10 = ev('C.posts[10].slug');
  await ac(10);
  ol('yayindan sonra acilmamis kayit SUNUCUDAN geliyor (TEMEL`e ozet yazilmadi)',
     say.kayit === istekOnce + 1 && ev('ozetMi(C.posts[10])') === false
       && ev('JSON.stringify(C.posts[10])') === JSON.stringify(JSON.parse(dosyadan(slug10))),
     'kayit istegi ' + istekOnce + '→' + say.kayit);
  const f3 = win.kayitFarki();
  ol('yayindan sonra fark sifir', f3.degisen.length === 0 && f3.silinen.length === 0,
     f3.degisen.length + ' / ' + f3.silinen.length);

  /* VARSAYILANA DON yayindan sonra yayindaki hale doner: eskiden acilistaki
     hale donuyordu ve silinen kayit "degisen" olarak geri geliyordu —
     ikinci yayin onu yeniden yaratirdi. */
  doc.querySelector('#bReset').click();
  const f4 = win.kayitFarki();
  const hayalet = ev('C.posts.some(x=>x.slug===' + JSON.stringify(slug7) + ')');
  ol('varsayilana don (yayindan sonra) · fark sifir, silinen geri gelmiyor',
     f4.degisen.length === 0 && f4.silinen.length === 0 && !hayalet && ev('C.posts.length') === N - 1,
     f4.degisen.length + ' / ' + f4.silinen.length + ' · ' + ev('C.posts.length') + ' kayit' + (hayalet ? ' · HAYALET' : ''));

  const topluOnce = say.kayitlar;
  doc.querySelector('#bExport').click();
  for (let i = 0; i < 300 && !P1.disa(); i++) await bekle(10);
  let ex = null;
  try { ex = JSON.parse(P1.disa()); } catch (e) {}
  const exP = (ex && ex.posts) || [];
  const exOzet = exP.filter((x) => x && x[ISARET]).length;
  const exGovde = exP.filter((x) => x && x.body && Array.isArray(x.body.tr)).length;
  ol('disa aktarma · eskisi gibi TAM (her kayit govdeli, ozet yok)',
     say.kayitlar === topluOnce + 1 && exP.length === N - 1 && exOzet === 0 && exGovde === N - 1,
     exP.length + ' kayit · ' + exGovde + ' govdeli · ' + exOzet + ' ozet · toplu istek ' + (say.kayitlar - topluOnce));

  ol('panel konsol hatasi yok', P1.hatalar.length === 0, P1.hatalar.slice(0, 2).join(' | ') || '0');

  /* ---- C · TASLAKLA YENIDEN ACILIS ----
     Taslak yayindan sonra tarayicida kalir. TEMEL bos kalsaydi yayinlanmis
     kayit ertesi acilista "degisti" gorunur, ikinci yayin onu bir daha
     gonderirdi; panel yalniz taslaktaki kayitlarin sunucu halini getirir. */
  const P2 = await panelAc(taslak);
  const f5 = P2.win.kayitFarki();
  ol('taslakla acilis · toplu cekim yok, yayinlanmis taslak "degisti" gorunmuyor',
     P2.say.kayitlar === 0 && P2.say.kayit === 1 && f5.degisen.length === 0 && f5.silinen.length === 0,
     JSON.stringify(P2.say) + ' · fark ' + f5.degisen.length + '/' + f5.silinen.length);
  ol('taslakla acilis · konsol hatasi yok', P2.hatalar.length === 0, P2.hatalar.slice(0, 2).join(' | ') || '0');
  ol('taslakla acilis · catisma yok', P2.ev('CATISMA.length') === 0, P2.ev('CATISMA.length') + '');

  /* ---- D · TASLAK TABANI (Enes, 10 Eyl 2026: canli panel "6 kayit degisti") ----
     Enes'in tarayicisinda kaynak kuralindan ONCE kalma taslak vardi; panel
     onu sessizce uyguluyordu (silinen kaynaklar + eski `strings.en.bkp`
     vaadi geri geliyordu). Bu bolum o taslagin SEKLINI kurar (yeni bicim,
     izsiz, bayat kayit + bayat metin) ve panelin artik onu uygulamadigini,
     catisma olarak sundugunu, secimin taslakta kaldigini olcer. */
  const icerikSimdi = JSON.parse(fs.readFileSync(path.join(GECICI, 'content.json'), 'utf8'));
  const bkpSunucu = JSON.stringify(((icerikSimdi.strings || {}).en || {}).bkp);
  const bayatIcerik = JSON.parse(JSON.stringify(icerikSimdi));
  bayatIcerik.strings = bayatIcerik.strings || {};
  bayatIcerik.strings.en = Object.assign({}, bayatIcerik.strings.en, { bkp: 'ESKI VAAT — with the source next to it' });
  const bayatKayit = [11, 12, 13].map((i) => {
    const k = JSON.parse(dosyadan(sluglar[i]));
    k.sources = [{ n: 'Eski kaynak', u: 'https://eski.example/x' }];
    return { kaynak: 'posts', klasor: yazilar.klasor, slug: sluglar[i], kayit: k };
  });
  const P3 = await panelAc(JSON.stringify({ icerik: bayatIcerik, degisen: bayatKayit, silinen: [] }));
  const f6 = P3.win.kayitFarki();
  const icFark = P3.ev('farkYollari(icerikKismi(C),icerikKismi(DEF)).length');
  ol('D1 · izsiz bayat taslak SESSIZCE UYGULANMIYOR (3 kayit + 1 metin catisma)',
     P3.ev('CATISMA.length') === 4 && f6.degisen.length === 0 && icFark === 0
       && P3.ev('cur') === 'taslak' && P3.doc.querySelectorAll('#ed [data-cz]').length === 8,
     P3.ev('CATISMA.length') + ' catisma · fark ' + f6.degisen.length + ' kayit / ' + icFark + ' alan · acilan sekme ' + P3.ev('cur'));

  P3.win.show('bulten');
  const ed3 = P3.doc.querySelector('#ed');
  ed3.querySelector('[data-ac="posts|0"]').click();
  for (let k = 0; k < 300 && !ed3.querySelector('.kg'); k++) await bekle(10);
  const slug0 = P3.ev('C.posts[0].slug');
  const b3 = ed3.querySelector('[data-p="posts.0.title.tr"]');
  b3.value += ' D';
  b3.dispatchEvent(new P3.win.Event('input', { bubbles: true }));
  P3.win.set('settings.email', 'olcek@ornek.test');
  await bekle(450);
  const durum3 = P3.doc.querySelector('#state').textContent;
  ol('D1 · Enes`in belirtisi: bir kayit duzenlenince "1 kayit", icerik ve catisma ayri',
     /· 1 kayıt · 1 alan değişti · 4 çakışma/.test(durum3), durum3);
  const t3 = P3.win.localStorage.getItem('qanat-admin-draft');
  const t3j = JSON.parse(t3);
  ol('D5 · taslak surum 3: her degisiklik sunucu izini tasiyor, catisma `bekleyen`de kaliyor',
     t3j.surum === 3 && (t3j.bekleyen || []).length === 4 && t3j.degisen.length === 1 && t3j.icerik.length === 1
       && !!t3j.degisen[0].h && !!t3j.icerik[0].h && !t3.includes('"' + ISARET + '"'),
     'degisen ' + t3j.degisen.length + ' · icerik ' + (t3j.icerik || []).length + ' · bekleyen ' + (t3j.bekleyen || []).length + ' · ' + Buffer.byteLength(t3) + ' B');

  P3.win.show('taslak');
  P3.doc.querySelector('[data-czt="s"]').click();
  await bekle(450);
  const t4j = JSON.parse(P3.win.localStorage.getItem('qanat-admin-draft'));
  ol('D1 · "hepsinde sunucudakini tut": catisma 0, bayat degerler yayin govdesinde YOK',
     P3.ev('CATISMA.length') === 0 && (t4j.bekleyen || []).length === 0
       && P3.win.kayitFarki().degisen.length === 1
       && P3.ev('JSON.stringify(((C.strings||{}).en||{}).bkp)') === bkpSunucu,
     'catisma ' + P3.ev('CATISMA.length') + ' · bekleyen ' + (t4j.bekleyen || []).length + ' · degisen ' + P3.win.kayitFarki().degisen.length);
  ol('D · konsol hatasi yok', P3.hatalar.length === 0, P3.hatalar.slice(0, 2).join(' | ') || '0');

  /* Cozulmemis catisma yeniden acilista da duruyor; tabani saglam iki
     degisiklik (kayit + metin) sessizce uygulaniyor. */
  const P5 = await panelAc(t3);
  ol('D5 · cozulmeyen catisma yeniden acilista GERI geliyor, tabani saglam olan sessizce uygulaniyor',
     P5.ev('CATISMA.length') === 4 && P5.ev('C.settings.email') === 'olcek@ornek.test'
       && P5.win.kayitFarki().degisen.length === 1,
     P5.ev('CATISMA.length') + ' catisma · email ' + P5.ev('C.settings.email') + ' · degisen ' + P5.win.kayitFarki().degisen.length);

  /* Sunucu, taslaktaki kaydi SONRADAN degistirir: taban artik tutmuyor. */
  const y0 = path.join(GECICI, yazilar.klasor, slug0 + '.json');
  const k0 = JSON.parse(fs.readFileSync(y0, 'utf8'));
  k0.lede = Object.assign({}, k0.lede, { tr: 'Sunucuda sonradan degisti' });
  fs.writeFileSync(y0, JSON.stringify(k0, null, 2) + '\n');
  const P4 = await panelAc(JSON.stringify(t4j));
  ol('D3 · tabani bayatlayan kayit catismaya dusuyor, tabani saglam metin SESSIZCE uygulaniyor',
     P4.ev('CATISMA.length') === 1 && P4.ev('CATISMA[0].slug') === slug0
       && P4.ev('C.settings.email') === 'olcek@ornek.test' && P4.win.kayitFarki().degisen.length === 0,
     P4.ev('CATISMA.length') + ' catisma (' + P4.ev('(CATISMA[0]||{}).slug') + ') · email ' + P4.ev('C.settings.email'));
  P4.win.show('taslak');
  P4.doc.querySelector('[data-cz="0|t"]').click();
  const f7 = P4.win.kayitFarki();
  ol('D4 · "taslagi uygula" secilince kayit yayina gidecek listeye giriyor',
     P4.ev('CATISMA.length') === 0 && f7.degisen.length === 1 && f7.degisen[0].slug === slug0
       && / D$/.test(f7.degisen[0].kayit.title.tr),
     'catisma ' + P4.ev('CATISMA.length') + ' · degisen ' + f7.degisen.length);

  bitir();
})().catch((e) => { ol('kapi calisti', false, String((e && e.stack) || e).slice(0, 240)); bitir(); });
