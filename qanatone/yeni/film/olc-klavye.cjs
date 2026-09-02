#!/usr/bin/env node
/* KLAVYE TURU OLCUMU (GECE ZINCIRI TUR 9, 2 Eyl 2026) — erisilebilirlik
   kapisi: her sayfada, her gorunumde Tab ile tam tur atilir ve her durak
   yazilir. Kapi (MIMARI-DENETIM E1/E2/E4/E6 karsiligi):
     atlaVar      — ILK durak `.atla` atlama baglantisi mi (bugun YOK → kirmizi)
     kapaliMenu   — kapali mobil menu (.nv-m, #nvAc isaretsiz) tab sirasinda mi
     halkasiz     — :focus-visible ama halka yok (outline/box-shadow ne kendinde
                    ne de label[for] kardesinde; nav.css 134: #nvAc'nin halkasi
                    KARDES .nv-burger'da — bu yuzden halkaKardes de olculur)
     gorunmez     — durak gorunmuyor (checkVisibility opacity/visibility/c-v)
                    ve gorunur bir label kardesi de yok; kapali menu/balon
                    duraklari ayrica sayildigindan burada TEKRAR sayilmaz
     tuzak        — ayni ogede 3 ardisik Tab (odak tuzagi)
   GECTI = atlaVar && kapaliMenu==0 && halkasiz==0 && gorunmez==0 && tuzak==0.
   Ek (kapi degil): ilkIcerikDuragi (main icindeki ilk durak sirasi),
   kapaliBalon (#bitsay .on degilken icindeki dugmeler), halkaSupheli
   (halka var ama odaksiz halle AYNI — statik golge, yanlis yesil adayi),
   atlaBenzeri (`.atla` degil ama '#...' hedefli 'atla/skip' metinli baglanti).
   YONTEM: gercek tarayici (Brave — Chrome'da donanim hizlandirma kapali,
   rAF/IO olu, yanlis kirmizi), gercek Tab tusu (CDP), her sayfa taze sekme.
   Perde sessionStorage 'qanat-splash-seen'=1 ile atlanir (Perde.astro 78),
   prefers-reduced-motion:reduce emule edilir (animasyon beklenmez),
   bringToFront sart (:focus-visible klavye gecisinde arka sekmede yanlis).
   Kabuk VARSAYILAN ACIK: gercek sayfa olculur (ajan balonu dugmeleri E15
   kapsaminda); KABUK=0 ile ?kabuk=0.
   Gorunum: masa 1280x800 (isMobile:false) · tel 390x844 (isMobile+hasTouch;
   nav ≤980 mobil, .nv-m menusu kapali ama DOM'da → bugun 12-13 kapaliMenu).
   Bitis: body'ye donus ya da ilk duraga geri donus (tam tur); en cok MAKS Tab.
   KIRMIZI-ONCE oz-kontrol: ilk (sayfa,gorunum) turunda hic durak yoksa
   'odak tasinmiyor' → exit 2. Kasten kirmizi gormek icin KIRMIZI=odak
   (Tab keydown'u belge basinda yutulur → exit 2 gelmeli); KIRMIZI=atla
   (sahte .atla baglantisi enjekte edilir → atlaVar true'ya donmeli).
   CIKTI: JSON yeni/film/<CIKTI> (her durak dahil) · PNG yeni/film/kontak-tur9/
   klavye-<sayfa>-<gorunum>-<adim>.png (ilk durak + ilk halkasiz + ilk
   gorunmez; odaktaki oge MAGENTA kesikli cerceveyle isaretlenir, halka
   rengiyle karismasin) — PNG=0 kapatir.
   Kullanim: MSYS_NO_PATHCONV=1 SUNUCU=http://127.0.0.1:8790 \
     FILTRE='^/yeni/(hizmetler/|hizmet/seo/)?$' GORUNUM=masa,tel \
     CIKTI=olc-klavye-once.json node yeni/film/olc-klavye.cjs
   Cevre  : TARAYICI=brave|chrome · SUNUCU · SAYFA=/yeni/x/ (tek sayfa) ·
            FILTRE=regex · GORUNUM=masa,tel · KABUK=0 · MAKS=150 · PNG=0 ·
            KIRMIZI=odak|atla · CIKTI=dosya
   TUZAKLAR: (1) Git Bash '/yeni/...' degerli env'i yol donusumune sokar —
   MSYS_NO_PATHCONV=1 sart. (2) box-shadow≠none tanimi statik golgeyi de
   halka sayar; halkaSupheli bunun icin var, halkasiz listesine bakarken
   yanina oku. (3) .vh checkbox (#nvAc) 1 px'tir: gorunmez sayilmaz cunku
   label kardesi gorunur. (4) Brave'de Tab adres cubuguna gitmez (CDP
   dogrudan renderer'a) — yine de oz-kontrol her kosumda calisir. */
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
const DIST = path.join(__dirname, '..', '..', 'dist', 'yeni');
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-klavye.json');
const KONTAK = path.join(__dirname, 'kontak-tur9');
const KABUK = process.env.KABUK !== '0';
const MAKS = +(process.env.MAKS || 150);
const PNG = process.env.PNG !== '0';
const KIRMIZI = process.env.KIRMIZI || '';
const GORUNUMLER = {
  masa: { width: 1280, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  tel: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
};
const gorunumSecim = (process.env.GORUNUM || 'masa,tel').split(',').map((s) => s.trim()).filter(Boolean);
for (const g of gorunumSecim) if (!GORUNUMLER[g]) { console.error(`bilinmeyen gorunum: ${g} (masa|tel)`); process.exit(1); }
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const sayfalar = [];
(function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(_astro|font|img|varlik|film|deneme-react)$/.test(e.name)) gez(p); }
    else if (e.name === 'index.html') sayfalar.push('/yeni/' + path.relative(DIST, p).replace(/\\/g, '/').replace(/index\.html$/, ''));
  }
})(DIST);
const secim = process.env.SAYFA ? [process.env.SAYFA] : sayfalar.sort().filter((y) => !process.env.FILTRE || new RegExp(process.env.FILTRE).test(y));
const slug = (yol) => (yol.replace(/^\/yeni\/?/, '').replace(/\/$/, '').replace(/\//g, '-') || 'ana');

/* belge basinda: perde bayragi + tur durumu + (istenirse) kasten kirmizi */
const HAZIRLIK = (kirmizi) => {
  try { sessionStorage.setItem('qanat-splash-seen', '1'); } catch (e) {}
  window.__kl = { ilk: null, son: null, sonSay: 0, snap: new Map() };
  if (kirmizi === 'odak') document.addEventListener('keydown', (e) => { if (e.key === 'Tab') e.preventDefault(); }, true);
  if (kirmizi === 'atla') addEventListener('DOMContentLoaded', () => { const a = document.createElement('a'); a.className = 'atla'; a.href = '#main'; a.textContent = 'Icerige atla (SAHTE — KIRMIZI KONTROL)'; document.body.prepend(a); });
};
/* odaksiz hal fotografi: halkaSupheli icin (halka var ama odaksizken de vardi) */
const FOTO = () => {
  const w = window.__kl;
  for (const el of document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex],[contenteditable]')) {
    const c = getComputedStyle(el); w.snap.set(el, c.outlineStyle + '|' + c.outlineWidth + '|' + c.boxShadow);
  }
  return w.snap.size;
};
/* bir Tab sonrasi durak olcumu */
const ADIM = () => {
  const w = window.__kl;
  const el = document.activeElement;
  const body = !el || el === document.body || el === document.documentElement;
  const sec = (n) => { const p = []; let k = n; while (k && k !== document.body && p.length < 4) { p.unshift(k.tagName.toLowerCase() + (k.id ? '#' + k.id : '') + (typeof k.className === 'string' && k.className.trim() ? '.' + k.className.trim().split(/\s+/)[0] : '')); k = k.parentElement; } return p.join(' > '); };
  if (body) return { body: true, sec: 'body', ilkeDondu: false, ayni: 0 };
  const ayni = el === w.son ? w.sonSay + 1 : 1; w.son = el; w.sonSay = ayni;
  const ilkeDondu = w.ilk === el; if (!w.ilk) w.ilk = el;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const halkaVar = (n) => { const c = getComputedStyle(n); return (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) || c.boxShadow !== 'none'; };
  const gor = (n) => n.checkVisibility ? n.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true }) : true;
  /* kardes = label[for] VE sarmalayan label (tespit.css .ste-giris: halka
     kapsayicida, :focus-within) — 3 Eyl: input#steUrl halkasiz sayiliyordu */
  const labels = (el.id ? Array.from(document.querySelectorAll('label[for="' + CSS.escape(el.id) + '"]')) : [])
    .concat(el.closest && el.closest('label') && el.closest('label') !== el ? [el.closest('label')] : []);
  const nvAc = document.getElementById('nvAc');
  const bitsay = el.closest('#bitsay');
  const snapKey = cs.outlineStyle + '|' + cs.outlineWidth + '|' + cs.boxShadow;
  const halka = halkaVar(el);
  const metin = (el.getAttribute('aria-label') || el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return {
    body: false, sec: sec(el), metin, ilkeDondu, ayni,
    rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
    ekranIci: r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth,
    gorunur: gor(el), gorunurKardes: labels.some(gor),
    halka, halkaKardes: labels.some(halkaVar), halkaSupheli: halka && w.snap.get(el) === snapKey,
    fv: el.matches(':focus-visible'),
    kapaliMenu: !!el.closest('.nv-m') && !(nvAc && nvAc.checked),
    kapaliBalon: !!bitsay && !bitsay.classList.contains('on'),
    maindeMi: !!el.closest('main'), navdaMi: !!el.closest('nav,#nv'),
    atla: el.matches('.atla'),
    atlaBenzeri: el.tagName === 'A' && /^#./.test(el.getAttribute('href') || '') && /atla|skip/i.test(metin),
  };
};
/* PNG: odaktaki ogeyi magenta kesikli cerceveyle isaretle, cek, kaldir */
async function png(page, ad, rect) {
  if (!PNG) return null;
  fs.mkdirSync(KONTAK, { recursive: true });
  const dosya = path.join(KONTAK, ad);
  await page.evaluate((r) => { const d = document.createElement('div'); d.id = '__klIsaret'; d.style.cssText = `position:fixed;left:${r.x - 4}px;top:${r.y - 4}px;width:${r.w + 8}px;height:${r.h + 8}px;border:2px dashed #ff00ff;pointer-events:none;z-index:2147483647;box-sizing:border-box`; document.body.appendChild(d); }, rect);
  await page.screenshot({ path: dosya });
  await page.evaluate(() => { const d = document.getElementById('__klIsaret'); if (d) d.remove(); });
  return path.relative(__dirname, dosya).replace(/\\/g, '/');
}

async function tur(browser, yol, gorunum) {
  const t0 = Date.now();
  const page = await browser.newPage();
  await page.setViewport(GORUNUMLER[gorunum]);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(HAZIRLIK, KIRMIZI);
  await page.goto(SUNUCU + yol + (KABUK ? '' : '?kabuk=0'), { waitUntil: 'load', timeout: 60000 });
  await page.bringToFront();
  await bekle(4200); /* kabuk.js requestIdleCallback timeout 2500 + efekt.js 1500 ms boot: sekmede tab sirasi otursun */
  const fotoSayisi = await page.evaluate(FOTO);
  const adimlar = []; let bitis = null; let tuzak = null;
  const pngler = {};
  for (let i = 1; i <= MAKS; i++) {
    await page.keyboard.press('Tab');
    await bekle(70);
    const a = await page.evaluate(ADIM);
    if (a.body) { if (i === 1) continue; bitis = 'body'; break; }
    if (a.ilkeDondu && i > 1) { bitis = 'ilk'; break; }
    if (a.ayni >= 3) { tuzak = a.sec; bitis = 'tuzak'; break; }
    a.i = adimlar.length + 1; delete a.body; delete a.ilkeDondu;
    adimlar.push(a);
    const gorunmezMi = !a.gorunur && !a.gorunurKardes && !a.kapaliMenu && !a.kapaliBalon;
    const halkasizMi = a.fv && !a.halka && !a.halkaKardes;
    if (a.i === 1 || (halkasizMi && !pngler.halkasiz) || (gorunmezMi && !pngler.gorunmez)) {
      const p = await png(page, `klavye-${slug(yol)}-${gorunum}-${String(a.i).padStart(3, '0')}.png`, a.rect);
      if (a.i === 1) pngler.ilk = p; if (halkasizMi && !pngler.halkasiz) pngler.halkasiz = p; if (gorunmezMi && !pngler.gorunmez) pngler.gorunmez = p;
    }
  }
  if (!bitis) bitis = 'MAKS';
  await page.close();
  const kisa = (a) => ({ i: a.i, sec: a.sec, metin: a.metin });
  const gorunmez = adimlar.filter((a) => !a.gorunur && !a.gorunurKardes && !a.kapaliMenu && !a.kapaliBalon).map(kisa);
  const halkasiz = adimlar.filter((a) => a.fv && !a.halka && !a.halkaKardes).map(kisa);
  const halkaSupheli = adimlar.filter((a) => a.fv && a.halka && a.halkaSupheli && !a.halkaKardes).map(kisa);
  const icerik = adimlar.find((a) => a.maindeMi);
  const ilk = adimlar[0] || null;
  const r = {
    yol, gorunum, durak: adimlar.length, bitis, tuzak,
    ilkDurak: ilk ? kisa(ilk) : null,
    ilkIcerikDuragi: icerik ? icerik.i : null,
    atlaVar: !!(ilk && ilk.atla), atlaBenzeri: adimlar.filter((a) => a.atlaBenzeri).map(kisa),
    gorunmez, halkasiz, halkaSupheli,
    kapaliMenu: adimlar.filter((a) => a.kapaliMenu).length, kapaliMenuIlk: (adimlar.find((a) => a.kapaliMenu) || {}).i || null,
    kapaliBalon: adimlar.filter((a) => a.kapaliBalon).length,
    fvYok: adimlar.filter((a) => !a.fv).length,
    odakAdayi: fotoSayisi, png: pngler, sure: Date.now() - t0, adimlar,
  };
  r.kapi = { atlaVar: r.atlaVar, kapaliMenu: r.kapaliMenu === 0, halkasiz: r.halkasiz.length === 0, gorunmez: r.gorunmez.length === 0, tuzak: !r.tuzak };
  r.gecti = Object.values(r.kapi).every(Boolean);
  return r;
}

(async () => {
  const browser = await pt.launch({ executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1320,900', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 600000 });
  const surum = await browser.version();
  console.log(`TARAYICI : ${TARAYICI} · ${surum} · ${secim.length} sayfa × ${gorunumSecim.join(',')} · kabuk ${KABUK ? 'acik' : 'kapali'}${KIRMIZI ? ' · KIRMIZI=' + KIRMIZI : ''} · ${SUNUCU}`);
  const sonuc = []; let ilkKosum = true;
  for (const yol of secim) for (const g of gorunumSecim) {
    const r = await tur(browser, yol, g);
    if (ilkKosum) {
      /* KIRMIZI-ONCE oz-kontrol: Tab odak tasimiyorsa duzenek kordur, olcum gecersiz */
      console.log(`OZ-KONTROL (${yol} ${g}): ${r.durak} durak, 1. durak ${r.ilkDurak ? r.ilkDurak.sec : '-'} → ${r.durak ? 'odak tasiniyor' : 'ODAK TASINMIYOR'}`);
      if (!r.durak) { await browser.close(); console.error('odak tasinmiyor — Tab hic durak uretmedi (tarayici/odak/CDP?) → exit 2'); process.exit(2); }
      ilkKosum = false;
    }
    sonuc.push(r);
    console.log(`${r.gecti ? 'ok   ' : 'KALDI'} ${yol.padEnd(26)} ${g.padEnd(4)} durak ${String(r.durak).padStart(3)} (${r.bitis}) · ilk: ${r.ilkDurak ? r.ilkDurak.sec.split(' > ').pop() + ' "' + r.ilkDurak.metin.slice(0, 18) + '"' : '-'} · icerik@${r.ilkIcerikDuragi} · atla ${r.atlaVar ? 'VAR' : 'yok'} · gorunmez ${r.gorunmez.length} · halkasiz ${r.halkasiz.length}${r.halkaSupheli.length ? ' (supheli ' + r.halkaSupheli.length + ')' : ''} · kapaliMenu ${r.kapaliMenu}${r.kapaliMenuIlk ? '@' + r.kapaliMenuIlk : ''} · kapaliBalon ${r.kapaliBalon} · tuzak ${r.tuzak || '-'} · ${(r.sure / 1000).toFixed(1)} s`);
    if (r.halkasiz.length) console.log(`      halkasiz: ${r.halkasiz.slice(0, 6).map((a) => a.i + ':' + a.sec.split(' > ').pop() + (a.metin ? '"' + a.metin.slice(0, 14) + '"' : '')).join(' · ')}${r.halkasiz.length > 6 ? ' …' : ''}`);
    if (r.gorunmez.length) console.log(`      gorunmez: ${r.gorunmez.slice(0, 6).map((a) => a.i + ':' + a.sec.split(' > ').pop()).join(' · ')}${r.gorunmez.length > 6 ? ' …' : ''}`);
  }
  await browser.close();
  fs.writeFileSync(CIKTI, JSON.stringify({ _: 'yeni/film/olc-klavye.cjs — klavye turu sayfa×gorunum: durak listesi + kapi (atlaVar · kapaliMenu · halkasiz · gorunmez · tuzak). Gercek Tab, Brave, kabuk ' + (KABUK ? 'acik' : 'kapali') + '.', olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, sunucu: SUNUCU, kirmizi: KIRMIZI || null, satir: sonuc }, null, 1));
  const k = sonuc.filter((s) => !s.gecti);
  console.log(`\nGECTI ${sonuc.length - k.length} / KALDI ${k.length} (${sonuc.length} satir)${k.length ? ' — ' + k.map((s) => s.yol + '@' + s.gorunum + '[' + Object.entries(s.kapi).filter(([, v]) => !v).map(([n]) => n).join(',') + ']').join(' ') : ''}\n→ ${CIKTI}`);
})().catch((e) => { console.error(e); process.exit(1); });
