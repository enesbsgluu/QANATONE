#!/usr/bin/env node
/* ============================================================
   ALTYAZI TEMASI OLCUMU — v3 (4 Eyl 2026). v2 (2-3 Eyl) alt bant + tek
   olcek + sonumleme yapisini olcuyordu; tema Enes'in onayiyla yeniden
   kuruldu (perde kunyesi blogun parcasi, merkezden acilan kizil cizgi,
   satir maskesi, alt perde) — rig de yapiyla birlikte yeniden yazildi.
   Harita: TUR5-METIN-HARITASI.md (21 blok + 6 perde, vurus-harita.py).

   KAPILAR (talimattan; v2 kapilari KALIYOR + tema kapilari):
   1. 21 blogun her biri kendi araliginda GORUNUR — uc kosumda, TR ve
      EN AYRI AYRI. "Gorunur" artik dort parcanin hepsi: kunye opak +
      yerinde, cizgi scaleX 1, her satir maskeden cikmis (translateY 0).
   2. Hicbir iki blok ayni anda ekranda degil (teklik).
   3. Her pencere >= 3 sn (DOM'dan).
   4. YAPI: her blokta .fl-kunye + .fl-cizgi + >=1 .fl-satir; SOL USTTEKI
      SUREKLI KUNYE KALKTI (.fl-sozler > .fl-kunye = 0); kunye metni 6
      perdeyi SIRAYLA tasir (zaman sirasinda geri gitmez, 6 farkli).
   5. TASMA: blok viewport'a sigiyor, satir kutusu tasmiyor.
   6. Pencere disi gorunmez (once/sonra 3 sn); film sonuna dayanan son
      blokta "sonra" atlanir (yazilir).
   7. Geri sarma: son bloktan ilkine donunce blok 1 geri gelir.
   8. KAPLAMA <= %20 (kunye + cizgi DAHIL — konteyner kutusu) · MERKEZ
      ortulmuyor.
   9. TEMA STATIK: kunye 11,5 px / 600 / .16em / #ff4d63 ve satirlarin
      USTUNDE; cizgi 1 px, genislik <= min(%38, 260 px), transform-origin
      MERKEZ; satir kutusu overflow:hidden, gizli halde translateY >= %100
      (110); perde yukseklik %32 +- 1, taban rgba(3,4,6,.9), blok
      varken opak, yokken 0.
  10. TEMA DINAMIK (kare kare orneklenir): ikinci satir birinciden
      60-140 ms sonra oturur (hedef 90; rAF kuantizasyonu payi); cizgi
      acilirken MERKEZI sabit (|kayma| <= 1,5 px) — "merkezden acilir"
      lafla degil olcumle; kunye alttan gelir (ilk ornek ty > 0).
  11. HAREKET AZALTMA (CDP emulasyonu, motor acikken): kunye/cizgi/satir
      gecis suresi 0, gorunur halde ozdes donusum; metin ve perde
      GORUNUR KALIR; pencere disinda yine gizli.
  12. DUSEN KARE — TABAN DAMGALI: metinli / ?soz=0 pencereleri yan yana,
      3'er tekrar medyani; kapi: metinli <= metinsiz + beklenen taban
      (taban hizi x pencere suresi; olc-efekt ile ayni ilke). Taban
      ayni sinyalden (rVFC sunum boslugu > 100 ms, durgun seek dongusu).
   KIRMIZI-ONCE: (a) rig, eski yapiya karsi YALNIZ_SAYIM=1 ile kosuldu —
   yapi kapisi adiyla kirmizi; (b) her kosumda ?boz=soz kolu (gecikme 0
   + cizgi orijini sol + maske acik) blok 1'de olculur: gecikme, merkez
   ve maske kapilari KIRMIZIYA DONMEK ZORUNDA, donmezse yesillere
   guvenilmez (hukum KIRMIZI-YAKALANAMADI).

   Kullanim: node yeni/film/olc-soz.cjs   (once: node yerel-sun.cjs)
   Cevre   : TEKRAR=3 · DIL=tr,en · TARAYICI=brave · YALNIZ_SAYIM=1 */
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
const CIKTI = path.join(__dirname, 'olc-soz.json');
const KONTAK = path.join(__dirname, 'kontak-soz');
const TEKRAR = Number(process.env.TEKRAR || 3);
const DILLER = (process.env.DIL || 'tr,en').split(',');
const YALNIZ_SAYIM = process.env.YALNIZ_SAYIM === '1';
const BLOK_BEKLENEN = 21, PERDE_BEKLENEN = 6;
const BOSLUK_ESIK_MS = 100;
const TABAN_SN = Number(process.env.TABAN_SN ?? 10);
const TABAN_TAVAN = Number(process.env.TABAN_TAVAN ?? 1);
const KIYAS_TEKRAR = Number(process.env.KIYAS_TEKRAR || 3);

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const jest = (cdp, mesafe, hiz) => cdp.send('Input.synthesizeScrollGesture', {
  x: 720, y: 450, xDistance: 0, yDistance: -mesafe, speed: hiz, gestureSourceType: 'mouse', repeatCount: 0 });

const KAYITCI = `(() => {
  window.__sun = [];
  const bagla = () => {
    for (const v of document.querySelectorAll('video')) {
      if (v.__bagli || !v.requestVideoFrameCallback) continue;
      v.__bagli = true;
      const f = (now) => { __sun.push(+now.toFixed(1)); v.requestVideoFrameCallback(f); };
      v.requestVideoFrameCallback(f);
    }
  };
  bagla(); setInterval(bagla, 500);
})()`;

async function sayfaAc(browser, dil, sorgu) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const cdp = await page.target().createCDPSession();
  const on = dil === 'en' ? 'en/' : '';
  await page.goto(`${SUNUCU}/yeni/${on}film/?tavan=2${sorgu || ''}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(KAYITCI);
  await page.bringToFront();
  await page.waitForFunction('window.__fl && window.__fl.sahne()[0].durum === "hazir"', { timeout: 90000 });
  return { page, cdp };
}

/* YAPI: bloklar DOM'dan — rig sayilari tekrar yazmaz */
const oku = (page) => page.evaluate(() => ({
  blok: [...document.querySelectorAll('.fl-soz:not(.fl-kaynak)')].map((e) => ({
    bas: +e.dataset.bas, son: +e.dataset.son,
    metin: [...e.querySelectorAll('.fl-satir')].map((s) => s.textContent.trim()).join(' ').slice(0, 40),
    kunye: e.querySelector('.fl-kunye')?.textContent.trim() || null,
    cizgi: e.querySelectorAll('.fl-cizgi').length, satir: e.querySelectorAll('.fl-satir').length })),
  perde: document.querySelectorAll('.fl-sozler .fl-perde').length,
  eskiKunye: document.querySelectorAll('.fl-sozler > .fl-kunye, .fl-soz.fl-kunye').length,
  toplam: window.__fl.toplam,
}));

/* yapi kapisi: sayim + parcalar + kunye sirasi */
function yapiKapisi(Y) {
  const kusur = [];
  if (Y.blok.length !== BLOK_BEKLENEN) kusur.push(`blok:${Y.blok.length}!=${BLOK_BEKLENEN}`);
  if (Y.eskiKunye) kusur.push(`eski-surekli-kunye:${Y.eskiKunye}`);
  if (Y.perde !== 1) kusur.push(`perde:${Y.perde}!=1`);
  Y.blok.forEach((b, i) => {
    if (!b.kunye) kusur.push(`b${i + 1}:kunye-yok`);
    if (b.cizgi !== 1) kusur.push(`b${i + 1}:cizgi:${b.cizgi}`);
    if (b.satir < 1) kusur.push(`b${i + 1}:satir-yok`);
  });
  /* kunye sirasi: zaman sirasinda 6 farkli metin, geri donmez */
  const sira = [];
  for (const b of Y.blok) if (b.kunye && sira[sira.length - 1] !== b.kunye) sira.push(b.kunye);
  const farkli = new Set(Y.blok.map((b) => b.kunye)).size;
  if (sira.length !== PERDE_BEKLENEN || farkli !== PERDE_BEKLENEN) kusur.push(`kunye-sirasi:${sira.length}/${farkli}!=${PERDE_BEKLENEN}`);
  return { gecti: kusur.length === 0, kusur, kunye_sirasi: sira };
}

const durum = (page) => page.evaluate(() => {
  const M = (el) => { const m = new DOMMatrixReadOnly(getComputedStyle(el).transform); return { x: m.m41, y: m.m42, sx: m.a }; };
  const al = (e) => {
    const s = getComputedStyle(e);
    const b = e.getBoundingClientRect();
    const kunye = e.querySelector('.fl-kunye'), cizgi = e.querySelector('.fl-cizgi');
    const satirlar = [...e.querySelectorAll('.fl-satir')];
    const ks = kunye && getComputedStyle(kunye), kb = kunye && kunye.getBoundingClientRect();
    const cs = cizgi && getComputedStyle(cizgi), cb = cizgi && cizgi.getBoundingClientRect();
    const satir = satirlar.map((sp) => {
      const ic = sp.firstElementChild; const sb = sp.getBoundingClientRect();
      return { overflow: getComputedStyle(sp).overflow, ty: ic ? M(ic).y : null, yuk: sb.height,
        ust: sb.top, alt: sb.bottom, sol: sb.left, sag: sb.right,
        tasma: ic ? ic.scrollWidth > sp.clientWidth + 1 : false,
        gecis: ic ? getComputedStyle(ic).transitionDuration : null };
    });
    return {
      gor: s.visibility === 'visible',
      kutu: { sol: b.left, ust: b.top, sag: b.right, alt: b.bottom },
      kaplama: +((b.width * b.height) / (innerWidth * innerHeight)).toFixed(4),
      merkez: b.left <= innerWidth / 2 && innerWidth / 2 <= b.right && b.top <= innerHeight / 2 && innerHeight / 2 <= b.bottom,
      tasma: e.scrollWidth > e.clientWidth + 1 || b.left < 0 || b.right > innerWidth,
      kunye: kunye ? { op: +ks.opacity, ty: M(kunye).y, boyut: ks.fontSize, renk: ks.color, agirlik: ks.fontWeight,
        aralik: ks.letterSpacing, ust: kb.top, alt: kb.bottom, sol: kb.left, sag: kb.right, gecis: ks.transitionDuration } : null,
      cizgi: cizgi ? { sx: M(cizgi).sx, gen: cizgi.offsetWidth, yuk: cizgi.offsetHeight, orijin: cs.transformOrigin,
        sol: cb.left, sag: cb.right, ust: cb.top, gecis: cs.transitionDuration } : null,
      satir,
    };
  };
  const perdeEl = document.querySelector('.fl-sozler .fl-perde');
  const ps = perdeEl && getComputedStyle(perdeEl), pb = perdeEl && perdeEl.getBoundingClientRect();
  return {
    blok: [...document.querySelectorAll('.fl-soz:not(.fl-kaynak)')].map(al),
    perde: perdeEl ? { op: +ps.opacity, oran: +(pb.height / innerHeight).toFixed(4), alt: pb.bottom, arka: ps.backgroundImage } : null,
    vh: innerHeight, vw: document.documentElement.clientWidth,
    herhangiGor: [...document.querySelectorAll('.fl-soz:not(.fl-kaynak)')].some((e) => getComputedStyle(e).visibility === 'visible'),
  };
});

const gorunur = (d) => d.gor && d.kunye && d.kunye.op > 0.9 && Math.abs(d.kunye.ty) < 0.5
  && d.cizgi && d.cizgi.sx > 0.99 && d.satir.length > 0 && d.satir.every((s) => s.ty !== null && Math.abs(s.ty) < 0.5);
const azGorunur = (d) => d.gor;
const kesisir = (a, b) => !(a.sag <= b.sol || b.sag <= a.sol || a.alt <= b.ust || b.alt <= a.ust);

/* tema statik kapisi — gorunur bloktan */
function temaStatik(d, vw) {
  const k = d.kunye, c = d.cizgi;
  const kusur = [];
  if (Math.abs(parseFloat(k.boyut) - 11.5) > 0.05) kusur.push(`kunye-punto:${k.boyut}`);
  if (k.renk !== 'rgb(255, 77, 99)') kusur.push(`kunye-renk:${k.renk}`);
  if (String(k.agirlik) !== '600') kusur.push(`kunye-agirlik:${k.agirlik}`);
  if (Math.abs(parseFloat(k.aralik) - 11.5 * 0.16) > 0.05) kusur.push(`kunye-aralik:${k.aralik}`);
  const ilkSatir = d.satir[0];
  if (!(k.alt <= ilkSatir.ust + 0.5)) kusur.push('kunye-satirin-ustunde-degil');
  if (!(c.ust >= k.alt - 0.5 && c.ust <= ilkSatir.ust + 0.5)) kusur.push('cizgi-kunye-ile-satir-arasinda-degil');
  if (c.yuk !== 1) kusur.push(`cizgi-yuk:${c.yuk}`);
  const blokGen = d.kutu.sag - d.kutu.sol;
  if (c.gen > 260.5 || c.gen > 0.38 * blokGen + 0.5) kusur.push(`cizgi-gen:${c.gen}/${blokGen}`);
  const ox = parseFloat(c.orijin);
  if (Math.abs(ox - c.gen / 2) > 0.6) kusur.push(`cizgi-orijin:${c.orijin}≠${c.gen / 2}`);
  if (d.satir.some((s) => s.overflow !== 'hidden')) kusur.push('satir-maske-yok');
  /* ortalanmis: blok merkezi DUZEN genisliginin (clientWidth — kaydirma
     cubugu haric; innerWidth cubugu icerir, ilk kosumda 7,6 px yanlis
     kirmizi verdi) merkezinde */
  const bm = (d.kutu.sol + d.kutu.sag) / 2;
  if (Math.abs(bm - vw / 2) > 1) kusur.push(`blok-ortalanmamis:${bm.toFixed(1)}`);
  return kusur;
}
/* gizli halin maske derinligi: satir ic span translateY >= satir yuksekligi (110%) */
const maskeGizli = (d) => d.satir.length > 0 && d.satir.every((s) => s.ty !== null && s.ty >= s.yuk * 0.99);

async function git(page, T) {
  await page.evaluate((t) => { scrollTo(0, window.__fl.konum(t)); window.__fl.atla(); }, T);
  await bekle(650);
}

/* DINAMIK ORNEKLEME: bloga girerken 1,1 sn boyunca kare kare — satir
   oturma anlari, cizgi merkezi, kunye ilk ty. Rig maliyeti: kare basina
   4-5 computed okuma; bu pencere dusen-kare kiyasindan AYRI. */
async function dinamik(page, i, B) {
  await git(page, Math.max(0, B.bas - 3));
  return page.evaluate(async (idx, t) => {
    const e = document.querySelectorAll('.fl-soz:not(.fl-kaynak)')[idx];
    const spans = [...e.querySelectorAll('.fl-satir > span')];
    const cizgi = e.querySelector('.fl-cizgi'), kunye = e.querySelector('.fl-kunye');
    const M = (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform);
    const ornek = [];
    scrollTo(0, window.__fl.konum(t)); window.__fl.atla();
    const t0 = performance.now();
    await new Promise((res) => {
      const f = () => {
        const now = performance.now() - t0;
        const cb = cizgi.getBoundingClientRect();
        ornek.push({ t: +now.toFixed(1), ty: spans.map((s) => +M(s).m42.toFixed(2)), csx: +M(cizgi).a.toFixed(4),
          cm: +((cb.left + cb.right) / 2).toFixed(2), cw: +cb.width.toFixed(2), kty: +M(kunye).m42.toFixed(2), kop: +getComputedStyle(kunye).opacity });
        if (now >= 1100) return res();
        requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    /* YARI YOL ANI: satirin ilk ornekteki ty'sinin (maske derinligi) yarisini
       gectigi ilk ornek. Oturma ani (|ty|<0,5 px) KULLANILMAZ — ilk kosumda
       olculdu: sarilan (iki gorsel satirlik) satir daha uzun yol alir, ayni
       egrinin kuyrugunda ayni mutlak esige daha gec varir, gecikme farki
       50 ms okunuyordu (EN b21). Yari yol ayni egride yukseklikten bagimsiz:
       fark = gecikmenin kendisi (rAF kuantizasyonu +-17 ms). */
    const otur = spans.map((_, j) => {
      const ilk = ornek[0].ty[j];
      if (!(ilk > 1)) return null;
      const o = ornek.find((s) => s.ty[j] <= ilk / 2);
      return o ? o.t : null;
    });
    const acilis = ornek.filter((s) => s.csx > 0.02 && s.csx < 0.98);
    const merkez0 = acilis.length ? acilis[0].cm : null;
    const kayma = acilis.length ? Math.max(...acilis.map((s) => Math.abs(s.cm - merkez0))) : null;
    const ilkK = ornek.find((s) => s.kop > 0.05);
    return { satir_otur_ms: otur, gecikme_ms: otur.length > 1 && otur[0] !== null && otur[1] !== null ? +(otur[1] - otur[0]).toFixed(1) : null,
      cizgi_orneksayi: acilis.length, cizgi_merkez_kayma_px: kayma, kunye_ilk_ty: ilkK ? ilkK.kty : null, kunye_ilk_ms: ilkK ? ilkK.t : null,
      ornek_sayisi: ornek.length };
  }, i, B.bas + 0.1);
}

async function taban(browser) {
  const { page } = await sayfaAc(browser, 'tr', '');
  const sun = await page.evaluate(async (ms) => {
    const v = document.querySelector('.fl-sahne video');
    if (!v || !v.src) return null;
    const eskiAkis = window.__fl.akis; window.__fl.akis = 0;
    const sure = Math.max(1, v.duration - 0.2);
    window.__sun.length = 0;
    await new Promise((res) => {
      const t0 = performance.now();
      const adim = () => {
        const gecen = performance.now() - t0;
        if (gecen >= ms) return res();
        const faz = (gecen / 1000) % (2 * sure);
        const hedef = faz < sure ? faz : 2 * sure - faz;
        if (Math.abs(v.currentTime - hedef) > 1 / 48) v.currentTime = hedef;
        requestAnimationFrame(adim);
      };
      requestAnimationFrame(adim);
    });
    window.__fl.akis = eskiAkis;
    return window.__sun.slice();
  }, TABAN_SN * 1000);
  await page.close();
  if (!sun || sun.length < 2) return { sayi: null, gecerli: false, not: 'sunum alinamadi' };
  let sayi = 0;
  const s = [...sun].sort((a, b) => a - b);
  for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] > BOSLUK_ESIK_MS) sayi++;
  return { sayi, sure_sn: TABAN_SN, hiz_sn: +(sayi / TABAN_SN).toFixed(3), gecerli: sayi <= TABAN_TAVAN };
}

async function kosum(browser, dil, kontakCek) {
  const { page } = await sayfaAc(browser, dil, '');
  const Y = await oku(page);
  const yapi = yapiKapisi(Y);
  if (!yapi.gecti) { await page.close(); return { yapi, bloklar: [], geri_sarmada_geldi: false, dinamik: [] }; }
  const bloklar = [];
  for (let i = 0; i < Y.blok.length; i++) {
    const B = Y.blok[i];
    const orta = (B.bas + B.son) / 2;
    await git(page, Math.max(0, B.bas - 3));
    const once = await durum(page);
    await git(page, orta);
    const ic = await durum(page);
    if (kontakCek) {
      fs.mkdirSync(KONTAK, { recursive: true });
      await page.screenshot({ path: path.join(KONTAK, `blok${String(i + 1).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 70 });
    }
    const sonraT = B.son + 3;
    let sonrasindaYok = null;
    if (sonraT <= Y.toplam - 0.3) {
      await git(page, sonraT);
      const so = await durum(page);
      sonrasindaYok = !azGorunur(so.blok[i]);
    }
    const g = gorunur(ic.blok[i]);
    bloklar.push({
      metin: B.metin, kunye: B.kunye, satir: B.satir, sure_sn: +(B.son - B.bas).toFixed(2),
      kaplama: ic.blok[i].kaplama, merkezde: ic.blok[i].merkez,
      gorundu: g,
      oncesinde_yok: !azGorunur(once.blok[i]),
      sonrasinda_yok: sonrasindaYok,             /* null = atlandi (film sonu) */
      tek: ic.blok.filter(azGorunur).length <= 1,
      tasma: g && (ic.blok[i].tasma || ic.blok[i].satir.some((s) => s.tasma)),
      tema_kusur: g ? temaStatik(ic.blok[i], ic.vw) : ['gorunmedi'],
      maske_gizli: maskeGizli(once.blok[i]),
      perde_ic: ic.perde ? +ic.perde.op.toFixed(3) : null,
      /* "once" ani (bas-3 sn) onceki blogun penceresine dusebilir (blok 1
         3,9'da biter, blok 2 5,3'te baslar): perde o an HAKLI olarak acik.
         Kapi: o anda hicbir blok yoksa perde 0 olmali; blok varsa 1. */
      perde_once: once.perde ? +once.perde.op.toFixed(3) : null,
      perde_once_ok: !!(once.perde && (once.herhangiGor ? once.perde.op > 0.99 : once.perde.op < 0.01)),
      perde_oran: ic.perde ? ic.perde.oran : null,
      perde_taban_ok: !!(ic.perde && /rgba\(3, 4, 6, 0\.9\)/.test(ic.perde.arka) && Math.abs(ic.perde.alt - ic.vh) < 1),
    });
  }
  /* dinamik ornekleme: cok satirli ilk/orta/son blok + tek satirli bir blok (cizgi/kunye icin) */
  const cokSatirli = Y.blok.map((b, i) => (b.satir >= 2 ? i : -1)).filter((i) => i >= 0);
  const secim = [...new Set([cokSatirli[0], cokSatirli[Math.floor(cokSatirli.length / 2)], cokSatirli[cokSatirli.length - 1]])].filter((i) => i !== undefined);
  const din = [];
  for (const i of secim) din.push({ blok: i + 1, ...(await dinamik(page, i, Y.blok[i])) });
  await git(page, (Y.blok[0].bas + Y.blok[0].son) / 2);
  const geri = await durum(page);
  const geriGeldi = gorunur(geri.blok[0]);
  await page.close();
  return { yapi, bloklar, dinamik: din, geri_sarmada_geldi: geriGeldi };
}

/* KIRMIZI KONTROL: ?boz=soz — gecikme 0 + cizgi orijini sol + maske acik.
   Uc kapi kirmiziya donmeli. */
async function kirmizi(browser) {
  const { page } = await sayfaAc(browser, 'tr', '&boz=soz');
  const Y = await oku(page);
  const i = Y.blok.findIndex((b) => b.satir >= 2);
  const d = await dinamik(page, i, Y.blok[i]);
  await git(page, Math.max(0, Y.blok[i].bas - 3));
  const once = await durum(page);
  await git(page, (Y.blok[i].bas + Y.blok[i].son) / 2);
  const ic = await durum(page);
  await page.close();
  const gecikmeKirmizi = !(d.gecikme_ms !== null && d.gecikme_ms >= 60 && d.gecikme_ms <= 140);
  const merkezKirmizi = !(d.cizgi_merkez_kayma_px !== null && d.cizgi_merkez_kayma_px <= 1.5);
  const maskeKirmizi = temaStatik(ic.blok[i], ic.vw).includes('satir-maske-yok') || !maskeGizli(once.blok[i]);
  return { blok: i + 1, gecikme_ms: d.gecikme_ms, cizgi_merkez_kayma_px: d.cizgi_merkez_kayma_px,
    gecikme_kirmizi: gecikmeKirmizi, merkez_kirmizi: merkezKirmizi, maske_kirmizi: maskeKirmizi,
    yakalandi: gecikmeKirmizi && merkezKirmizi && maskeKirmizi };
}

/* HAREKET AZALTMA (CDP emulasyonu; motor acik — CSS @media dali olculur) */
async function azaltma(browser) {
  const { page, cdp } = await sayfaAc(browser, 'tr', '');
  const Y = await oku(page);
  const i = Y.blok.findIndex((b) => b.satir >= 2);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await bekle(100);
  await git(page, (Y.blok[i].bas + Y.blok[i].son) / 2);
  const ic = await durum(page);
  await git(page, Math.max(0, Y.blok[i].bas - 3));
  const dis = await durum(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await page.close();
  const b = ic.blok[i];
  const sifir = (s) => s.split(',').every((x) => parseFloat(x) === 0);
  const gecisSifir = b.kunye && sifir(b.kunye.gecis) && sifir(b.cizgi.gecis) && b.satir.every((s) => sifir(s.gecis));
  return { blok: i + 1, gecis_sifir: gecisSifir, gorunur: gorunur(b), perde_op: ic.perde?.op,
    disinda_gizli: !azGorunur(dis.blok[i]), perde_dis_op: dis.perde?.op,
    gecti: !!(gecisSifir && gorunur(b) && ic.perde?.op > 0.99 && !azGorunur(dis.blok[i]) && dis.perde?.op < 0.01) };
}

async function viOkunurluk(browser) {
  const { page } = await sayfaAc(browser, 'tr', '');
  const s = await page.evaluate(async () => {
    const f = window.__fl;
    const eskiAkis = f.akis; f.akis = 0;
    const bloklar = [...document.querySelectorAll('.fl-soz:not(.fl-kaynak)')];
    const vi = bloklar.filter((e) => +e.dataset.bas >= 228);
    const basPx = f.konum(Math.max(0, Math.min(...vi.map((e) => +e.dataset.bas)) - 2));
    const sonT = f.toplam - 0.05;
    scrollTo(0, basPx); f.atla();
    await new Promise((r) => setTimeout(r, 700));
    const sure = vi.map(() => 0);
    await new Promise((res) => {
      let son = performance.now();
      const adim = () => {
        const simdi = performance.now();
        const dt = simdi - son; son = simdi;
        vi.forEach((e, i) => { if (e.classList.contains('fl-soz-gor')) sure[i] += dt; });
        if (f.gosterilenT >= sonT) return res();
        scrollBy(0, Math.max(1, 900 * dt / 1000));
        requestAnimationFrame(adim);
      };
      requestAnimationFrame(adim);
    });
    f.akis = eskiAkis;
    return vi.map((e, i) => ({ metin: e.querySelector('.fl-satir')?.textContent.trim().slice(0, 30), gorunur_ms: +sure[i].toFixed(0) }));
  });
  await page.close();
  return { vuruslar: s, gecti: s.length === 5 && s.every((v) => v.gorunur_ms >= 3000) };
}

async function dusenKiyas(browser, sorgu) {
  const { page, cdp } = await sayfaAc(browser, 'tr', sorgu);
  await page.evaluate(() => { scrollTo(0, 0); window.__fl.atla(); });
  await bekle(400);
  await page.evaluate(() => { window.__sun.length = 0; });
  const hedefPx = await page.evaluate(() => window.__fl.konum(8));
  const t0 = Date.now();
  while (Date.now() - t0 < 5000) {
    const y = await page.evaluate(() => scrollY);
    if (y >= hedefPx - 4) break;
    await jest(cdp, Math.min(600, hedefPx - y), 900);
  }
  const sun = await page.evaluate(() => window.__sun.slice());
  await page.close();
  let sayi = 0, toplam = 0;
  const s = [...sun].sort((a, b) => a - b);
  for (let i = 1; i < s.length; i++) { const d = s[i] - s[i - 1]; if (d > BOSLUK_ESIK_MS) { sayi++; toplam += d; } }
  return { dusen: sayi, toplam_ms: +toplam.toFixed(0), sunum_ornek: s.length, pencere_ms: s.length ? +(s[s.length - 1] - s[0]).toFixed(0) : 0 };
}

(async () => {
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980', '--autoplay-policy=no-user-gesture-required',
      '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 600000,
  });
  const surum = await browser.version();
  console.log(`TARAYICI : ${TARAYICI} · ${surum}`);

  if (YALNIZ_SAYIM) {
    /* kirmizi-once (a): yapi kapisi tek basina */
    const { page } = await sayfaAc(browser, 'tr', '');
    const Y = await oku(page); await page.close(); await browser.close();
    const y = yapiKapisi(Y);
    console.log(`YAPI: ${y.gecti ? 'GECTI' : 'KALDI'} ${y.kusur.join(' ')}`);
    process.exit(y.gecti ? 0 : 2);
  }

  console.log('taban penceresi ...');
  const tb = await taban(browser);
  console.log(`  taban ${tb.sayi} (${tb.hiz_sn}/sn) → ${tb.gecerli ? 'sakin' : 'ORTAM GURULTULU'}\n`);

  console.log('KIRMIZI KONTROL (?boz=soz — gecikme/merkez/maske kirmiziya donmeli) ...');
  const kr = await kirmizi(browser);
  console.log(`  blok ${kr.blok}: gecikme ${kr.gecikme_ms} ms → ${kr.gecikme_kirmizi ? 'KIRMIZI' : 'yesil!'} · merkez kayma ${kr.cizgi_merkez_kayma_px} px → ${kr.merkez_kirmizi ? 'KIRMIZI' : 'yesil!'} · maske → ${kr.maske_kirmizi ? 'KIRMIZI' : 'yesil!'}`);
  if (!kr.yakalandi) console.log('  !! KIRMIZI YAKALANAMADI — asagidaki yesillere guvenilmez');

  const diller = {};
  for (const dil of DILLER) {
    console.log(`\n== ${dil.toUpperCase()} · ${TEKRAR} kosum ==`);
    const kosumlar = [];
    for (let i = 0; i < TEKRAR; i++) {
      const k = await kosum(browser, dil, dil === 'tr' && i === 0);
      kosumlar.push(k);
      if (!k.yapi.gecti) { console.log(`  [${i + 1}] YAPI KIRMIZI: ${k.yapi.kusur.join(' ')}`); continue; }
      const oz = k.bloklar.map((b) => (b.gorundu && b.oncesinde_yok && b.sonrasinda_yok !== false && b.tek && !b.tasma && !b.tema_kusur.length && b.maske_gizli ? '+' : 'X')).join('');
      console.log(`  [${i + 1}] ${oz} · geri ${k.geri_sarmada_geldi ? '+' : 'X'} · dinamik ${k.dinamik.map((d) => `b${d.blok} gecikme ${d.gecikme_ms}ms kayma ${d.cizgi_merkez_kayma_px}px`).join(' | ')}`);
      const kusurlu = k.bloklar.filter((b) => b.tema_kusur.length);
      if (kusurlu.length) console.log('     tema kusur: ' + kusurlu.map((b, j) => `${k.bloklar.indexOf(b) + 1}:${b.tema_kusur.join(',')}`).slice(0, 5).join(' '));
    }
    const yapiTam = kosumlar.every((k) => k.yapi.gecti);
    const her = (f) => kosumlar.every((k) => k.bloklar.every(f));
    const dinHer = (f) => kosumlar.every((k) => k.dinamik.length > 0 && k.dinamik.every(f));
    diller[dil] = {
      kosum: kosumlar,
      kapilar: !yapiTam ? { yapi: 'KALDI' } : {
        yapi: 'GECTI',
        gorunurluk: her((b) => b.gorundu) ? 'GECTI' : 'KALDI',
        pencere_disi: her((b) => b.oncesinde_yok && b.sonrasinda_yok !== false) ? 'GECTI' : 'KALDI',
        teklik: her((b) => b.tek) ? 'GECTI' : 'KALDI',
        okunur_3sn: kosumlar[0].bloklar.every((b) => b.sure_sn >= 3) ? 'GECTI' : 'KALDI',
        tasma: her((b) => !b.tasma) ? 'GECTI' : 'KALDI',
        kaplama_20: her((b) => b.kaplama <= 0.20) ? 'GECTI' : 'KALDI',
        merkez: her((b) => !b.merkezde) ? 'GECTI' : 'KALDI',
        tema_statik: her((b) => !b.tema_kusur.length) ? 'GECTI' : 'KALDI',
        maske: her((b) => b.maske_gizli) ? 'GECTI' : 'KALDI',
        perde: her((b) => b.perde_ic > 0.99 && b.perde_once_ok && Math.abs(b.perde_oran - 0.32) <= 0.01 && b.perde_taban_ok) ? 'GECTI' : 'KALDI',
        gecikme_90: dinHer((d) => d.gecikme_ms !== null && d.gecikme_ms >= 60 && d.gecikme_ms <= 140) ? 'GECTI' : 'KALDI',
        cizgi_merkezden: dinHer((d) => d.cizgi_orneksayi >= 3 && d.cizgi_merkez_kayma_px <= 1.5) ? 'GECTI' : 'KALDI',
        kunye_alttan: dinHer((d) => d.kunye_ilk_ty !== null && d.kunye_ilk_ty > 0) ? 'GECTI' : 'KALDI',
        geri_sarma: kosumlar.every((k) => k.geri_sarmada_geldi) ? 'GECTI' : 'KALDI',
      },
    };
  }

  console.log('\nhareket azaltma (CDP emulasyonu, motor acik) ...');
  const az = await azaltma(browser);
  console.log(`  blok ${az.blok}: gecis 0 ${az.gecis_sifir} · gorunur ${az.gorunur} · perde ${az.perde_op} · disinda gizli ${az.disinda_gizli} → ${az.gecti ? 'GECTI' : 'KALDI'}`);

  console.log('VI okunurluk (900 px/s surus) ...');
  const vi = await viOkunurluk(browser);
  console.log(`  ${vi.vuruslar.map((v) => v.gorunur_ms + 'ms').join(' · ')} → ${vi.gecti ? 'GECTI' : 'KALDI'}`);

  console.log(`dusen kare kiyasi (blok 1-2 penceresi, 0-8 sn; ${KIYAS_TEKRAR} tekrar, taban damgali) ...`);
  const metinli = [], metinsiz = [];
  for (let i = 0; i < KIYAS_TEKRAR; i++) {
    metinli.push(await dusenKiyas(browser, ''));
    metinsiz.push(await dusenKiyas(browser, '&soz=0'));
    console.log(`  #${i + 1} metinli ${metinli[i].dusen} (${metinli[i].toplam_ms} ms / pencere ${metinli[i].pencere_ms} ms) · metinsiz ${metinsiz[i].dusen} (${metinsiz[i].toplam_ms} ms / ${metinsiz[i].pencere_ms} ms)`);
  }
  const pencereSn = medyan(metinli.map((m) => m.pencere_ms)) / 1000;
  const beklenenTaban = tb.hiz_sn == null ? 0 : Math.ceil(tb.hiz_sn * pencereSn);
  const dusenKapi = {
    metinli_medyan: medyan(metinli.map((m) => m.dusen)), metinsiz_medyan: medyan(metinsiz.map((m) => m.dusen)),
    pencere_sn: +pencereSn.toFixed(2), beklenen_taban_duseni: beklenenTaban,
  };
  dusenKapi.gecti = dusenKapi.metinli_medyan <= dusenKapi.metinsiz_medyan + beklenenTaban;
  console.log(`  medyan metinli ${dusenKapi.metinli_medyan} · metinsiz ${dusenKapi.metinsiz_medyan} · beklenen taban ${beklenenTaban} → ${dusenKapi.gecti ? 'GECTI' : 'KALDI'}`);
  await browser.close();

  const hepsi = Object.values(diller).every((d) => Object.values(d.kapilar).every((x) => x === 'GECTI')) && vi.gecti && az.gecti && dusenKapi.gecti;
  const hukum = !tb.gecerli ? 'ORTAM-GURULTULU (hukum verilmez)' : (!kr.yakalandi ? 'KIRMIZI-YAKALANAMADI (yesillere guvenilmez)' : (hepsi ? 'GECTI' : 'KALDI'));
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/olc-soz.cjs v3 — ALTYAZI TEMASI: 21 blok (kunye+cizgi+satir maskesi+alt perde), TR+EN ayri. Pencereler DOM data-bas/son. Dusen kiyasi TABAN DAMGALI kapi. Kontak: kontak-soz/blok01-21.jpg (TR).',
    olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, tekrar: TEKRAR,
    taban_tavan: TABAN_TAVAN, taban: tb, kirmizi_kontrol: kr,
    hukum, diller, azaltma: az, vi_okunurluk: vi,
    dusen_kiyasi: { kapi: dusenKapi, metinli, metinsiz },
  }, null, 1));
  console.log(`\nHUKUM: ${hukum}`);
  for (const [dil, d] of Object.entries(diller)) console.log(`  ${dil}: ${JSON.stringify(d.kapilar)}`);
  console.log(`→ ${CIKTI}`);
})().catch((e) => { console.error(e); process.exit(1); });
