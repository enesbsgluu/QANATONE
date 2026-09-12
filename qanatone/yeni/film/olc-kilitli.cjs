#!/usr/bin/env node
/* KILITLI SAHNE KARE ALMA VE EGRI KIYASI (gece zinciri TUR 5, 3/4 Eyl 2026)
   ============================================================================
   SORUN: kaydirmayla surulen KILITLI (pin/sticky) sahnelerde yan yana kare
   yontemi calismiyor. kontak-tasarim.cjs bolumu kadraja getirip kare aliyor;
   kilitli sahnede "bolumun kadraja gelmesi" tek bir an degil, sahne o andan
   sonra KAYDIRMAYLA ilerliyor. Iki farkli scrollY ayni kareyi verebiliyor
   (3 Eyl: /hizmetler/seo %20 ve %40 kareleri BAYT-AYNI cikti, arac kendi
   "bayat yuzey" kirmizisini bastirdi).

   YONTEM (yazili, tekrar edilebilir):
     1. SAHNENIN KENDI ILERLEMESI OKUNUR, scrollY degil. Ortak gozlenebilir
        iki deger: (a) sira rozeti (eskide JS metni, yenide CSS sayaci —
        ::after icerigi textContent'e GIRMEZ, getComputedStyle ile okunur),
        (b) "sen" satirinin translateY'si (iki agacta da transform matrisi).
     2. Sahnenin ETKIN ARALIGI once taranarak bulunur: kaba adimlarla
        kaydirilir, ilerleme degerinin degistigi ilk ve son scrollY alinir.
        Formul iki agacta farkli (GSAP pin+scrub vs CSS view-timeline);
        aralik VARSAYILMAZ, olculur.
     3. Ilerleme p = 0..1 icin scrollY ikili aramayla bulunur, oraya
        kaydirilir, YERLESIM SETTLE edilir ve kare alinir.
     4. ESKI AGACTA SCRUB VAR (ScrollTrigger scrub:.5): kaydirmadan sonra
        deger zamanla yaklasir. Her adimda deger DURULANA kadar beklenir
        (iki okuma ayni), sabit bekleme yetmez.
     5. Kareler ayni ilerlemede yan yana konur; ayrica egri (p -> rozet,
        p -> oteleme) sayi olarak yazilir — goz karari yok.

   Kullanim:
     node yeni/film/olc-kilitli.cjs                (tirmanis, /hizmetler/seo)
     SAHNE=tirmanis ADIM=9 node yeni/film/olc-kilitli.cjs
   Cevre: SUNUCU · GENISLIK (1440) · ADIM (5) · TARAYICI                    */
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
const GENISLIK = +(process.env.GENISLIK || 1440);
const YUKSEKLIK = +(process.env.YUKSEKLIK || 900);
const ADIM = +(process.env.ADIM || 5);
const KARE = path.join(__dirname, 'kontak-tur9');
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const SAHNELER = {
  tirmanis: {
    eski: { yol: '/hizmetler/seo/', sahne: '#clStage', sen: '.clr.you', rozet: '.clpos' },
    yeni: { yol: '/yeni/hizmetler/seo/', sahne: '.clstage', sen: '.clr.you', rozet: '.clpos' },
  },
};
const AD = process.env.SAHNE || 'tirmanis';
const S = SAHNELER[AD];
if (!S) { console.error('bilinmeyen sahne: ' + AD); process.exit(1); }

/* sahnenin gozlenebilir ilerleme durumu */
const DURUM = (sen, rozet) => {
  const s = document.querySelector(sen), r = document.querySelector(rozet);
  if (!s) return null;
  const t = getComputedStyle(s).transform;
  const m = t && t !== 'none' ? t.match(/matrix\(([^)]+)\)/) : null;
  const ty = m ? Math.round(parseFloat(m[1].split(',')[5])) : 0;
  /* rozet: eskide metin dugumu, yenide CSS sayaci (::after) */
  /* Rozet iki agacta FARKLI mekanizmayla basiliyor: eskide JS metin dugumu,
     yenide CSS sayaci (`counter-reset` + `::after{content:'#' counter()}`).
     `getComputedStyle(el,'::after').content` sayaci COZMEZ, ham `"#" counter(
     clsira)` dizesini verir — ilk kosumda bes noktada sahte "ROZET AYRISMASI"
     uretti. Sayacin degeri `counterReset`ten okunur (hesaplanmis sayi). */
  let rz = r ? (r.textContent || '').trim() : '';
  if (!rz && r) {
    const c = getComputedStyle(r, '::after').content;
    if (c && /counter\(/.test(c)) {
      const n = (getComputedStyle(r).counterReset || '').match(/(-?\d+)/);
      rz = n ? '#' + n[1] : '';
    } else if (c && c !== 'none') rz = c.replace(/^"|"$/g, '');
  }
  return { ty, rz };
};

(async () => {
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: 'new',
    args: ['--no-sandbox', '--window-size=' + (GENISLIK + 20) + ',' + (YUKSEKLIK + 100)],
  });
  const tara = async (K, etiket) => {
    const p = await browser.newPage();
    await p.setViewport({ width: GENISLIK, height: YUKSEKLIK, deviceScaleFactor: 1 });
    await p.evaluateOnNewDocument(() => {
      try { sessionStorage.setItem('qanat-splash-seen', '1'); sessionStorage.setItem('qanat-prolog-atlandi', '1'); } catch (e) {}
    });
    await p.goto(SUNUCU + K.yol, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    await bekle(1200);
    const kok = await p.evaluate((sel) => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { top: Math.round(r.top + scrollY), h: Math.round(r.height), docH: document.documentElement.scrollHeight };
    }, K.sahne);
    if (!kok) { console.error(etiket + ': sahne yok (' + K.sahne + ')'); await p.close(); return null; }
    /* DURULMA: scrub'li eski agacta deger zamanla yaklasir */
    const durul = async () => {
      let a = await p.evaluate(DURUM, K.sen, K.rozet);
      for (let i = 0; i < 24; i++) {
        await bekle(140);
        const b = await p.evaluate(DURUM, K.sen, K.rozet);
        if (a && b && a.ty === b.ty && a.rz === b.rz) return b;
        a = b;
      }
      return a;
    };
    const git = async (y) => { await p.evaluate((yy) => scrollTo(0, yy), y); return durul(); };
    /* 1) ETKIN ARALIK: kaba tarama */
    const bas = Math.max(0, kok.top - YUKSEKLIK * 1.4);
    const son = Math.min(kok.docH - YUKSEKLIK, kok.top + kok.h + YUKSEKLIK * 1.6);
    const iz = [];
    const N = 26;
    for (let i = 0; i <= N; i++) {
      const y = Math.round(bas + (son - bas) * i / N);
      iz.push({ y, ...(await git(y)) });
    }
    const ilk = iz.find((x) => x.ty !== iz[0].ty) || iz[0];
    const tersi = [...iz].reverse();
    const sonD = tersi.find((x) => x.ty !== tersi[0].ty) || tersi[0];
    const y0 = Math.max(bas, (iz.find((x) => x.ty === iz[0].ty && iz.indexOf(x) === iz.lastIndexOf(x)) || ilk).y);
    /* etkin aralik: ilk degisimden bir onceki nokta -> son degisimden bir sonraki */
    const dizi = iz.map((x) => x.ty);
    let a0 = 0; while (a0 < dizi.length - 1 && dizi[a0 + 1] === dizi[0]) a0++;
    let a1 = dizi.length - 1; while (a1 > 0 && dizi[a1 - 1] === dizi[dizi.length - 1]) a1--;
    const aralik = { y0: iz[a0].y, y1: iz[a1].y };
    /* 2) p = 0..1 orneklemesi + kare */
    const ornek = [];
    for (let i = 0; i < ADIM; i++) {
      const pOran = ADIM === 1 ? 0 : i / (ADIM - 1);
      const y = Math.round(aralik.y0 + (aralik.y1 - aralik.y0) * pOran);
      const d = await git(y);
      const dosya = path.join(KARE, `kilitli-${AD}-${etiket}-p${String(Math.round(pOran * 100)).padStart(3, '0')}.png`);
      const el = await p.$(K.sahne);
      await el.screenshot({ path: dosya });
      const md5 = require('crypto').createHash('md5').update(fs.readFileSync(dosya)).digest('hex').slice(0, 10);
      ornek.push({ p: +pOran.toFixed(2), y, ty: d ? d.ty : null, rz: d ? d.rz : '', md5, dosya: path.basename(dosya) });
    }
    await p.close();
    return { kok, aralik, iz: iz.map((x) => ({ y: x.y, ty: x.ty, rz: x.rz })), ornek };
  };

  const E = await tara(S.eski, 'eski');
  const Y = await tara(S.yeni, 'yeni');
  await browser.close();
  if (!E || !Y) process.exit(1);
  /* OZ-KONTROL: ayni agacta ornekler birbirinden farkli olmali (bayat yuzey) */
  const benzersiz = (o) => new Set(o.map((x) => x.md5)).size;
  const ozKontrol = benzersiz(E.ornek) === E.ornek.length && benzersiz(Y.ornek) === Y.ornek.length;
  console.log(`sahne ${AD} · ${GENISLIK}px · ${ADIM} ornek`);
  console.log(`etkin aralik: eski ${E.aralik.y0}-${E.aralik.y1} (${E.aralik.y1 - E.aralik.y0} px) · yeni ${Y.aralik.y0}-${Y.aralik.y1} (${Y.aralik.y1 - Y.aralik.y0} px)`);
  console.log('  p     eski(scrollY · sen · rozet)        yeni(scrollY · sen · rozet)        AYRISMA');
  const ayrisma = [];
  for (let i = 0; i < ADIM; i++) {
    const e = E.ornek[i], y = Y.ornek[i];
    const dTy = y.ty - e.ty;
    const rzFark = e.rz !== y.rz;
    if (Math.abs(dTy) > 8 || rzFark) ayrisma.push({ p: e.p, dTy, eskiRz: e.rz, yeniRz: y.rz });
    console.log(`  ${String(e.p).padEnd(5)} ${String(e.y).padStart(6)} · ty ${String(e.ty).padStart(5)} · ${(e.rz || '-').padEnd(4)}      ${String(y.y).padStart(6)} · ty ${String(y.ty).padStart(5)} · ${(y.rz || '-').padEnd(4)}      ty ${dTy > 0 ? '+' : ''}${dTy}${rzFark ? ' · ROZET' : ''}`);
  }
  console.log(`OZ-KONTROL (bayat yuzey): ${ozKontrol ? 'gecti' : 'KALDI — ayni agacta ayni kare iki kez'}`);
  console.log(`AYRISMA: ${ayrisma.length ? ayrisma.length + ' nokta' : 'yok'}`);
  const cikti = path.join(__dirname, `olc-kilitli-${AD}.json`);
  fs.writeFileSync(cikti, JSON.stringify({
    _: 'yeni/film/olc-kilitli.cjs — kilitli (pin/sticky) sahnede egri kiyasi: sahnenin KENDI ilerlemesi okunur, etkin aralik olculur, p=0..1 ornegi alinir, her adimda deger DURULANA kadar beklenir (eski agacta scrub var).',
    sahne: AD, genislik: GENISLIK, adim: ADIM, ozKontrol, eski: E, yeni: Y, ayrisma,
  }, null, 1));
  console.log('→ ' + cikti);
})();
