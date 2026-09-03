#!/usr/bin/env node
/* MOBIL/GENISLIK ANAYASA DENETIMI (gece zinciri 3/4 Eyl 2026, TUR 1-2)
   Eski site (kok) ile yeni kabugu AYNI genislikte yan yana olcer. Kare
   kiyasi kontak-tasarim.cjs'in isi; burada kareye girmeyen dort sinif:

     1. YATAY TASMA   documentElement.scrollWidth > goruntu alani
                      (kapi: sifir, her sayfa — CLS'in 3 Eyl'deki koku)
                      Sorumlu IKILI ARAMAYLA bulunur: cocuklari sirayla
                      gizleyip scrollWidth'in dustugu dala inilir.
     2. DOKUNMA HEDEFI  a/button/label/summary/input kutusu < 44 px
                      (yalniz gorunur ve tiklanabilir olanlar). Kaynakta
                      da kucukse SAPMA DEGIL (anayasa: eski hal dogru) —
                      rapor "kaynakta da" diye isaretler; yenide kucuk
                      olup eskide buyuk olan KIRMIZI.
     3. SABIT KATMAN  position:fixed ogelerin goruntu alanindan aldigi
                      dikey pay (mobilde nav + ipucu + imlec yigilir).
     4. BOLUM BOYU    ana bolumlerin (section) yukseklikleri eski/yeni.

   KIRMIZI-ONCE (kapi kendini once kirmiziya dondurur): ilk sayfada yeni
   agaca 1600 px genisliginde bir kutu ve 20x20 bir dugme enjekte edilir;
   1. ve 2. madde bunlari yakalamak ZORUNDA, yoksa arac hatali diye durur.

   Kullanim:
     node yeni/film/olc-mobil.cjs                 (390 px, TR+EN hepsi)
     GENISLIK=1440 node yeni/film/olc-mobil.cjs
     FILTRE='^/hizmetler' node yeni/film/olc-mobil.cjs
     CIKTI=olc-mobil-en.json node yeni/film/olc-mobil.cjs
   Cevre: SUNUCU (8790) · TARAYICI=brave|chrome · HEDEF=44 (dokunma esigi) */
const path = require('path');
const fs = require('fs');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'brave';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const GENISLIK = +(process.env.GENISLIK || 390);
const YUKSEKLIK = +(process.env.YUKSEKLIK || (GENISLIK <= 500 ? 844 : 900));
const HEDEF = +(process.env.HEDEF || 44);
const KOK = path.join(__dirname, '..', '..', 'dist');
const CIKTI = path.join(__dirname, process.env.CIKTI || (GENISLIK <= 500 ? 'olc-mobil.json' : 'olc-mobil-masa.json'));
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---- sayfa ciftleri: dist/yeni altindaki her sayfanin kok karsiligi ---- */
const gez = (kok, d, out) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!/^(_astro|font|img|varlik|film|deneme-react|admin|js|css|gorsel-kaynak|video|_kare|kare)$/.test(e.name)) gez(kok, p, out);
    } else if (e.name === 'index.html') {
      out.push('/' + path.relative(kok, p).split(path.sep).join('/').replace(/index\.html$/, ''));
    }
  }
  return out;
};
const yeniSayfalar = gez(path.join(KOK, 'yeni'), path.join(KOK, 'yeni'), []);
const ciftler = yeniSayfalar
  .filter((y) => fs.existsSync(path.join(KOK, y.replace(/^\//, '').split('/').join(path.sep), 'index.html')))
  .filter((y) => !process.env.FILTRE || new RegExp(process.env.FILTRE).test(y))
  .sort();

/* ---- sayfada kosan olcum ---- */
const OLC = `(async (W, HEDEF, boz) => {
  const ad = (n) => !n ? '?' : n.tagName.toLowerCase()
    + (typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\\s+/).slice(0, 2).join('.') : '')
    + (n.id ? '#' + n.id : '');
  if (boz) {
    const d = document.createElement('div');
    d.style.cssText = 'width:1600px;height:8px';
    d.id = 'boz-tasma';
    document.body.appendChild(d);
    const b = document.createElement('button');
    b.style.cssText = 'width:20px;height:20px';
    b.id = 'boz-hedef';
    b.textContent = 'x';
    document.body.appendChild(b);
  }
  const sw = () => document.documentElement.scrollWidth;
  const tasma = Math.max(0, sw() - W);
  /* sorumlu: ikili arama — cocuklari gizleyip scrollWidth dusuyor mu */
  const yol = [];
  if (tasma > 0) {
    let kok = document.body;
    for (let d = 0; d < 9; d++) {
      let bulundu = null;
      for (const c of kok.children) {
        const eski = c.style.display;
        c.style.display = 'none';
        const s = sw();
        c.style.display = eski;
        if (s < sw() || s <= W) { bulundu = c; yol.push(ad(c) + '@' + s); break; }
      }
      if (!bulundu) break;
      kok = bulundu;
    }
  }
  /* DOKUNMA HEDEFLERI. Anahtar SINIF ADI DEGIL METIN: iki agacta siniflar
     yeniden adlandirildi (a.logo -> a.nv-logo), sinif anahtari her yeniden
     adlandirmayi sahte kirmizi yapiyordu (3 Eyl, ilk kosumda goruldu).
     Anahtar: etiket + eriimli ad (aria-label / metin / title / baglanti sonu). */
  const anahtar = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim().replace(/\\s+/g, ' ').slice(0, 28);
    const h = el.getAttribute('href') || '';
    return el.tagName.toLowerCase() + '|' + (t || h.replace(/[?#].*$/, '').replace(/\\/$/, '').split('/').pop() || 'anonim');
  };
  const kucuk = [];
  const tum = [];
  for (const el of document.querySelectorAll('a[href],button,summary,label,input:not([type=hidden]),select,textarea,[role=button]')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.left < -200 || r.top < -2000) continue;      /* ekran disi (atla bagi, honeypot) */
    /* gorsel olarak gizlenmis kumanda (mobil menu onay kutusu .vh): dokunma
       hedefi ONUN etiketi (label), kendisi degil — 1x1 sayilmaz */
    if (r.width <= 2 && r.height <= 2) continue;
    if (/inset\\(50%\\)/.test(cs.clipPath) || cs.clip === 'rect(0px, 0px, 0px, 0px)') continue;
    /* VARLIK KUMESI opaklige BAKMAZ: eski agac .rv (opacity 0) ile dogup
       IntersectionObserver ile aciliyor; uzun kosumda geri cagri gecikince
       eski footer baglari kumeden dusup yeni taraftakini "yeni oge" yapiyordu
       (3 Eyl, tek sayfa kosumu temizken 58 sayfalik tur kirliydi). Kume
       genis tutulur — yanlis KIRMIZI uretmez; opaklik yalniz "kucuk hedef"
       listesinde onemli (gorunmeyen oge dokunma hedefi degildir). */
    tum.push(anahtar(el));
    if (+cs.opacity === 0) continue;
    if (r.width < HEDEF - 0.5 || r.height < HEDEF - 0.5) {
      kucuk.push({ k: anahtar(el), ad: ad(el), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  /* sabit katmanlar */
  const sabit = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.height < 8 || r.width < 8) continue;
    if (r.top > innerHeight || r.bottom < 0) continue;
    if (+cs.opacity === 0) continue;
    sabit.push(ad(el) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  /* bolum boylari */
  const bolum = [...document.querySelectorAll('main > section, main > div > section, body > section')]
    .map((s) => (s.id || (typeof s.className === 'string' ? s.className.trim().split(/\\s+/)[0] : '') || '?') + ':' + Math.round(s.getBoundingClientRect().height));
  if (boz) { document.getElementById('boz-tasma')?.remove(); document.getElementById('boz-hedef')?.remove(); }
  return { tasma, yol, kucuk, tum, sabit, bolum, docH: document.documentElement.scrollHeight };
})`;

(async () => {
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: 'new',
    args: ['--no-sandbox', '--window-size=' + (GENISLIK + 20) + ',' + (YUKSEKLIK + 80)],
  });
  const olc = async (url, boz) => {
    const page = await browser.newPage();
    await page.setViewport({ width: GENISLIK, height: YUKSEKLIK, isMobile: GENISLIK <= 500, hasTouch: GENISLIK <= 500, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(() => {
      try {
        sessionStorage.setItem('qanat-splash-seen', '1');
        sessionStorage.setItem('qanat-prolog-atlandi', '1');
      } catch (e) {}
    });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(async () => {
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    });
    /* ESKI AGAC KENDINI CALISMA ANINDA KURAR (content.json fetch -> nav/footer/
       bolum render). Sabit bekleme UZUN KOSUMDA YETMEDI: tek sayfa kosumunda
       temiz cikan ayni sayfa, 116 yuklemelik turda eski footer'i yarim olcup
       alti baglantiyi "yeni oge" diye sahte kirmizi verdi (3 Eyl, iki kosum
       yan yana kondu). Olcut artik sure degil KARARLILIK: footer baglantisi
       sayisi iki okumada ayni kalana kadar beklenir; kalmazsa HUKUM DISI. */
    /* Olcut YAPISAL: footer'in "Sayfalar" sutunu (.fcol a) alti bagi tasimali.
       Yalnizca `footer a >= 5` yetmedi — WhatsApp/Instagram/hukuki baglari
       sutun dolmadan da o esigi gecirip yarim olcume izin veriyordu. */
    const dur = async () => page.evaluate(() => document.querySelectorAll('footer .fcol a').length);
    let kararli = false;
    for (let i = 0; i < 24; i++) {
      const a = await dur();
      await bekle(320);
      const b = await dur();
      if (a === b && b >= 6) { kararli = true; break; }
    }
    /* BELIRME TURU: eski agac `.rv{opacity:0}` ile dogar ve IntersectionObserver
       ekranda gorununce `.rv.in` yapar. Kaydirmadan olcunce ekran altindaki her
       oge opaklik 0 kalip kumeden dusuyor, yeni agacin ayni ogeleri "yeni oge"
       diye sahte kirmizi veriyordu (3 Eyl, alti footer bagi). Sayfa bir kez
       bastan sona gezilir, basa donulur, sonra olculur — gercek ziyaretcinin
       gordugu hal. IntersectionObserver kaydirmanin nasil yapildigina bakmaz. */
    await page.evaluate(async () => {
      const h = innerHeight;
      for (let y = 0; y < document.documentElement.scrollHeight; y += h) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 250));
    });
    await bekle(500);
    const r = await page.evaluate(`${OLC}(${GENISLIK}, ${HEDEF}, ${boz ? 'true' : 'false'})`);
    r.footerBag = await page.evaluate(() => document.querySelectorAll('footer .fcol a').length);
    r.kararli = kararli;
    await page.close();
    return r;
  };

  /* ---- KIRMIZI-ONCE ---- */
  const ilk = ('/yeni' + (ciftler[0] || '/')).replace(/\/+$/, '/');
  const kb = await olc(SUNUCU + ilk, true);
  const kk = { tasma: kb.tasma > 0, hedef: kb.kucuk.some((k) => /boz-hedef/.test(k.ad)) };
  console.log(`KIRMIZI KONTROL (${ilk} + 1600px kutu + 20x20 dugme): tasma ${kk.tasma ? 'YAKALANDI' : 'KACIRILDI'} · dokunma hedefi ${kk.hedef ? 'YAKALANDI' : 'KACIRILDI'}`);
  if (!kk.tasma || !kk.hedef) { console.error('KIRMIZI KONTROL BASARISIZ — olcum guvenilmez'); process.exit(2); }

  const sonuc = [];
  const kirmizi = [];
  const ham = [];
  /* SITE GENELI VARLIK KUMESI: kabuk ogeleri (nav, footer sutunu, menu) her
     sayfada aynidir. Eski agac bunlari calisma aninda kuruyor ve uzun turda
     bazi sayfalarda gec kaliyor — ayni bag bir sayfada gorulup obur sayfada
     gorulmeyince "yeni oge" diye sahte kirmizi doguyordu (3 Eyl: tek sayfa
     kosumu temiz, 58 sayfalik tur 20 sayfada kirli). Hukum kume BIRLESIMIYLE
     verilir: bir sayfada bile eski agacta gorulduyse, oge eskide VARDIR. */
  const eskiGenel = new Set();
  for (const eskiYol of ciftler) {
    /* `ciftler` dist/yeni'ye GORE: '/', '/hizmetler/'… — eski ayni yol, yeni '/yeni' onekli */
    const yol = ('/yeni' + eskiYol).replace(/\/+$/, '/');
    const [E, Y] = [await olc(SUNUCU + eskiYol, false), await olc(SUNUCU + yol, false)];
    /* DOKUNMA HEDEFI HUKMU (anayasa: kaynak dogru):
         · eskide de kucuk  -> sapma DEGIL (kaynagin kendi hali)
         · eskide BUYUK, yenide kucuk -> KIRMIZI (kuculmus)
         · eskide hic yok (yeni oge) -> rapor, hukum Enes'te (istisna 6 adayi) */
    for (const k of E.tum) eskiGenel.add(k);
    const eskiKucukK = new Set(E.kucuk.map((k) => k.k));
    const eskiTumK = new Set(E.tum);
    const kuculen = Y.kucuk.filter((k) => eskiTumK.has(k.k) && !eskiKucukK.has(k.k));
    const yeniOge = Y.kucuk.filter((k) => !eskiTumK.has(k.k));
    ham.push({ Ykucuk: Y.kucuk, EkucukK: [...eskiKucukK], EtumK: [...eskiTumK] });
    const kayit = {
      yol, eskiYol,
      tasma: { eski: E.tasma, yeni: Y.tasma, yol: Y.yol.slice(0, 4) },
      dokunma: { eski: E.kucuk.length, yeni: Y.kucuk.length, kuculen, yeniOge: yeniOge.slice(0, 8) },
      sabit: { eski: E.sabit, yeni: Y.sabit },
      docH: { eski: E.docH, yeni: Y.docH },
      bolum: { eski: E.bolum, yeni: Y.bolum },
    };
    if (Y.tasma > 0) kirmizi.push(`${yol} tasma ${Y.tasma}px [${Y.yol.slice(0, 2).join(' > ')}]`);
    /* TABAN DAMGASI: iki agacta da footer dolmus olmali, yoksa dokunma
       kiyasi anlamsiz (kume eksik) — satir hukum disi, tasma yine gecerli. */
    const hukumDisi = !E.kararli || !Y.kararli || E.footerBag < 5 || Y.footerBag < 5;
    if (hukumDisi) kayit.hukumDisi = `footer baglari e${E.footerBag}/y${Y.footerBag} kararli e${E.kararli}/y${Y.kararli}`;
    if (kuculen.length && !hukumDisi) kirmizi.push(`${yol} dokunma-kuculen ${kuculen.slice(0, 3).map((k) => k.ad + ':' + k.w + 'x' + k.h).join(' ')}`);
    if (hukumDisi) kirmizi.push(`${yol} HUKUM DISI (${kayit.hukumDisi})`);
    sonuc.push(kayit);
    const bayrak = Y.tasma > 0 || hukumDisi || kuculen.length ? 'KALDI' : 'ok   ';
    console.log(`${bayrak} ${yol.padEnd(42)} tasma e${E.tasma}/y${Y.tasma} · dokunma e${E.kucuk.length}/y${Y.kucuk.length}${kuculen.length ? ' KUCULEN ' + kuculen.length : ''}${yeniOge.length ? ' yeni' + yeniOge.length : ''} · boy e${E.docH}/y${Y.docH}`);
  }
  await browser.close();
  /* IKINCI GECIS: her sayfanin "yeni oge" listesi site geneli kumeyle suzulur;
     kalanlar gercekten yeni (atlama bagi, /hukuki, yeni bilesen markup'i). */
  for (let i = 0; i < sonuc.length; i++) {
    const h = ham[i];
    const suzulen = h.Ykucuk.filter((k) => !eskiGenel.has(k.k));
    sonuc[i].dokunma.yeniOge = suzulen.slice(0, 10);
    sonuc[i].dokunma.yeniOgeSayi = suzulen.length;
  }
  const rapor = {
    _: `yeni/film/olc-mobil.cjs — ${GENISLIK}x${YUKSEKLIK} anayasa denetimi: yatay tasma (kapi 0) · dokunma hedefi <${HEDEF}px (yenide fazla olan kirmizi) · sabit katman · bolum boylari`,
    olcum: new Date().toISOString(), tarayici: TARAYICI, genislik: GENISLIK, yukseklik: YUKSEKLIK, hedef: HEDEF,
    kirmizi_kontrol: kk, sayfa: sonuc, kirmizi,
  };
  fs.writeFileSync(CIKTI, JSON.stringify(rapor, null, 1));
  console.log(`\nHUKUM: ${kirmizi.length ? 'KALDI (' + kirmizi.length + ')' : 'GECTI'}`);
  for (const k of kirmizi.slice(0, 14)) console.log('  ' + k);
  console.log('→ ' + CIKTI);
  process.exit(kirmizi.length ? 1 : 0);
})();
